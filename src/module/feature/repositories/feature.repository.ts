import { inject, injectable } from 'inversify'
import { MongoDb, mongodb } from 'tst-base'

import { config } from '../../../configs/config'
import { TYPES } from '../../../ioc/types'
import { AppLogger } from '../../../utils/logger.util'
import { FeatureUpdate } from '../builders/builder.interface'
import { BusinessName } from '../constants'
import { UserFeatureDocument } from '../models'

const logger = AppLogger(__filename)

export interface FeatureKey {
	user_key: string
	business_name: BusinessName
	user_id?: string
	anonymous_id?: string
}

/**
 * Tiny repository wrapping the user_features Mongo collection. It owns:
 *   - the unique compound index on (user_key, business_name),
 *   - one optimised upsert helper that converts a FeatureUpdate into a real
 *     Mongo UpdateFilter and runs updateOne with upsert: true.
 *
 * Keeping the Mongo specifics here means builders never import the driver,
 * and we can swap the storage engine later without touching the pipeline.
 */
@injectable()
export class FeatureRepository {
	@inject(TYPES.MongoDb)
	private readonly mongoDb: MongoDb

	private collection(): mongodb.Collection<UserFeatureDocument> {
		return this.mongoDb.getCollection<UserFeatureDocument>(config.MONGO.COLLECTION)
	}

	async ensureIndexes(): Promise<void> {
		const coll = this.collection()
		// Unique on (user_key, business_name): one feature doc per user per
		// business. The compound also accelerates the upsert filter lookup.
		await coll.createIndex(
			{ user_key: 1, business_name: 1 },
			{ name: 'user_key_business_name_unique', unique: true },
		)
		// Useful for listing recently active users per business in dashboards.
		await coll.createIndex(
			{ business_name: 1, last_seen_ts: -1 },
			{ name: 'business_last_seen' },
		)
		logger.info('ensureIndexes', 'user_features indexes ensured')
	}

	/**
	 * Upsert one event's worth of feature updates. Atomic per document, so
	 * concurrent events for the same (user_key, business_name) do not lose
	 * updates as long as each one is a single updateOne call.
	 */
	async upsertFeatures(key: FeatureKey, update: FeatureUpdate): Promise<void> {
		// Always seed identity-ish fields on insert so we can join feature
		// docs back to events even if the first event was anonymous.
		const seed: Record<string, unknown> = {
			user_key: key.user_key,
			business_name: key.business_name,
		}
		if (key.user_id) seed.user_id = key.user_id
		if (key.anonymous_id) seed.anonymous_id = key.anonymous_id

		const finalUpdate: mongodb.UpdateFilter<UserFeatureDocument> = {}
		// Merge our identity seed with whatever the builders set on insert.
		// Mongo will reject duplicate keys across $set / $setOnInsert, so we
		// build $setOnInsert as the union and let $set carry the per-event
		// fields (which are not duplicated below).
		finalUpdate.$setOnInsert = { ...seed, ...(update.$setOnInsert ?? {}) }
		if (update.$set) finalUpdate.$set = update.$set
		if (update.$inc) finalUpdate.$inc = update.$inc
		if (update.$max) finalUpdate.$max = update.$max
		if (update.$min) finalUpdate.$min = update.$min
		if (update.$addToSet) finalUpdate.$addToSet = update.$addToSet

		await this.collection().updateOne(
			{ user_key: key.user_key, business_name: key.business_name },
			finalUpdate,
			{ upsert: true },
		)
	}
}
