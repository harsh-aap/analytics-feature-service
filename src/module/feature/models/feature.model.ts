import { mongodb } from 'tst-base'

import { BusinessName } from '../constants'

/**
 * UserFeatureDocument is the shape stored in the `user_features` Mongo
 * collection. The document is keyed by (user_key, business_name) — see
 * FeatureRepository.ensureIndexes() for the unique index.
 *
 * Every field except _id, user_key, business_name, first_seen_ts, and
 * last_seen_ts is optional: a user may have only ever fired one event type.
 *
 * Adding a new feature field is a one-line change here plus a builder that
 * fills it in. We never delete fields — old data may still rely on them.
 *
 * Extends Document so it satisfies the mongodb driver's `T extends Document`
 * constraint without sacrificing named-field typing.
 */
export interface UserFeatureDocument extends mongodb.Document {
	user_key: string
	user_id?: string
	anonymous_id?: string
	business_name: BusinessName

	// Lifecycle
	first_seen_ts: number
	last_seen_ts: number

	// Generic counters — populated by CoreFeatureBuilder for every event.
	total_events: number
	event_counts?: Record<string, number>
	last_event_id?: string
	last_event_type?: string
	last_brand?: string
	last_platform?: string
	last_source?: string

	// Commerce — populated by PurchaseFeatureBuilder.
	purchase_count?: number
	lifetime_value?: number
	currencies?: string[]
	last_purchase_at?: number
	last_order_id?: string
	last_payment_method?: string

	// Cart — populated by CartFeatureBuilder.
	cart_adds_count?: number
	last_cart_at?: number
	last_product_added?: string

	// Identity — populated by Signup / Login builders.
	signed_up_at?: number
	signup_method?: string
	login_count?: number
	last_login_at?: number
	last_login_method?: string

	// Search — populated by SearchFeatureBuilder.
	search_count?: number
	last_search_at?: number
	last_search_query?: string
}
