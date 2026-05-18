# feature-service

High-concurrency Kafka consumer that builds a **per-user feature store** in MongoDB from the events produced by [`ingestion-service`](../ingestion-service) (and any other backend services that publish to the same topics).

`feature-service` runs **in parallel** with [`event-service`](../event-service):

```
                        ┌─► event-service   (fan-out to CleverTap / AppsFlyer / Branch)
ingestion-service  ──┐  │
backend services   ──┼──┴─► feature-service (this service: aggregate features → MongoDB)
                     │
                     └─► topic "<business>-events"  (one topic per business_name)
```

Both services subscribe to the **same** `BUSINESS_TOPICS` map but with **different consumer groups**, so every event is processed by both services independently.

## What it stores

For every `(user_key, business_name)` pair we maintain a single MongoDB document in the `user_features` collection:

```jsonc
{
  "_id": "...",
  "user_key": "user_123",            // user_id when present, else anonymous_id
  "user_id": "user_123",
  "anonymous_id": "anon-abc",
  "business_name": "ecommerce",
  "first_seen_ts": 1714824000000,    // $setOnInsert
  "last_seen_ts": 1714827600000,     // $max
  "total_events": 42,                // $inc
  "event_counts": { "purchase": 3, "page_view": 30, ... },
  "last_event_type": "purchase",
  "last_brand": "...",
  "last_platform": "web",
  "last_source": "website",
  // Per-event-type signals filled in by individual builders:
  "lifetime_value": 199.97,
  "purchase_count": 3,
  "currencies": ["USD", "EUR"],
  "last_purchase_at": 1714827600000,
  "cart_adds_count": 7,
  "last_cart_at": ...,
  "signed_up_at": ..., "signup_method": ...,
  "login_count": ..., "last_login_at": ...,
  "search_count": ..., "last_search_query": ...
}
```

The document is updated atomically in a single MongoDB upsert per event, mixing `$setOnInsert` / `$set` / `$max` / `$inc` / `$addToSet` so we never lose updates under concurrent writes for the same user.

## Architecture

For each consumed message the service:

1. Decodes the Kafka payload (plain JSON from the Go producer; tst-base's `SchemaRegistry.decodeMessage` falls back to JSON automatically).
2. Validates the event against an AJV base schema (must have `event_id`, `event_type`, `business_name`, `anonymous_id`, `event_ts_ms`). Invalid messages go to the `features.dlq` topic.
3. Skips re-deliveries via Redis (`idempotency:<event_id>` TTL) — **this is required** because `$inc` updates are not idempotent. In production keep `IDEMPOTENCY_ENABLED=true`.
4. Resolves the `(user_key, business_name)` document key.
5. Runs every applicable `FeatureBuilder` (always-on `CoreBuilder` + per-event-type builders) and merges them into a single `UpdateFilter`.
6. Performs one `updateOne(..., { upsert: true })` against MongoDB.
7. Marks the event as processed in Redis.

Failures in any of those steps log the error and forward the original message to the DLQ.

## High concurrency

- `partitionsConsumedConcurrently` (default `8`) — N partitions handled in parallel per process.
- Per-process bounded promise pool (default `200`) prevents a slow Mongo node from wedging unrelated partitions.
- Single-document atomic upsert per event — no need for application-level locks even when the same user emits many events on different partitions, because each partition serialises events for one user (key = `user_id || anonymous_id` from the producer).
- MongoDB connection pool sized via `MONGO_MAX_POOL` (default `100`).
- Forward-compatible event schema: unknown `event_type`s still flow through the always-on `CoreBuilder` and update `last_seen_ts`, `total_events`, and `event_counts.<type>`.

## Adding a new feature builder

1. Create a new file in [`src/module/feature/builders/`](src/module/feature/builders/) implementing `IFeatureBuilder` (`name`, `supports(event)`, `build(event)`).
2. Bind it in [`src/ioc/bindings.ts`](src/ioc/bindings.ts) and add a TYPES symbol in [`src/ioc/types.ts`](src/ioc/types.ts).
3. Add it to the active list in [`src/module/feature/builders/registry.ts`](src/module/feature/builders/registry.ts).

The `BuilderRegistry.merge` step combines all `$set` / `$inc` / `$max` / `$addToSet` / `$setOnInsert` operators, so a new builder cannot accidentally overwrite another builder's update.

## Local development

1. From `ingestion-service/`: `make kafka-up` (boots Kafka in Docker).
2. Start MongoDB locally (`docker run -p 27017:27017 mongo:7`) and Redis if you keep idempotency enabled.
3. From `feature-service/`: copy `.env.example` to `.env`, fill in Mongo credentials if needed, then `yarn install && yarn dev`.
4. Send a test event to ingestion-service (`POST /v1/events`) and watch the consumer logs.

Inspect the resulting feature doc:

```sh
mongosh mongodb://localhost:27017/features --eval 'db.user_features.findOne()'
```

## Logging

- `tst-base`'s `Logger` (winston-based) emits structured JSON with service name and module info.
- `LOG_LEVEL=DEBUG` enables per-event traces; `INFO` is sane for production.
- Errors with structured stack info go to Sentry when `SENTRY_DSN` is set.
