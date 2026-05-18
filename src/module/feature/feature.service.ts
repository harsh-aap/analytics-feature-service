import { inject, injectable } from 'inversify'

import { BuilderRegistry } from './builders'
import { BusinessName } from './constants'
import { IngestedEvent } from './models'
import { FeatureKey, FeatureRepository } from './repositories/feature.repository'
import { TYPES } from '../../ioc/types'
import { AppLogger } from '../../utils/logger.util'

const logger = AppLogger(__filename)

export class NoUserKeyError extends Error {
	constructor(eventId: string) {
		super(`event_id=${eventId} has neither user_id nor anonymous_id`)
		this.name = 'NoUserKeyError'
	}
}

/**
 * FeatureService is the thin orchestrator the consumer calls per event:
 *   1. derive (user_key, business_name) — both required to upsert
 *   2. ask BuilderRegistry to build the merged update
 *   3. ask FeatureRepository to apply it as one Mongo upsert
 *
 * Validation is done by FeatureValidator in the consumer; by the time we
 * arrive here the event already passed AJV.
 */
@injectable()
export class FeatureService {
	@inject(TYPES.BuilderRegistry)
	private readonly registry: BuilderRegistry

	@inject(TYPES.FeatureRepository)
	private readonly repo: FeatureRepository

	/**
	 * Resolve the document key for a user. Prefer user_id when authenticated
	 * — that way pre-login activity (anonymous_id) and post-login activity
	 * (user_id) collapse into the same feature doc once the user signs in.
	 *
	 * NOTE: We do NOT merge the historical anonymous-id doc into the user-id
	 * doc on login here; that's a deliberate decision to keep this service
	 * write-only and out of the merge-conflict business. A separate "stitch"
	 * job can take care of identity resolution offline.
	 */
	private resolveKey(event: IngestedEvent): FeatureKey {
		if (!event.user_id && !event.anonymous_id) {
			throw new NoUserKeyError(event.event_id)
		}
		const user_key = event.user_id || event.anonymous_id || ''
		return {
			user_key,
			business_name: event.business_name as BusinessName,
			user_id: event.user_id,
			anonymous_id: event.anonymous_id,
		}
	}

	async process(event: IngestedEvent): Promise<void> {
		const key = this.resolveKey(event)
		const update = this.registry.build(event)
		await this.repo.upsertFeatures(key, update)
		logger.debug(
			'process',
			`feature upsert ok user_key=${key.user_key}, business=${key.business_name}, event_type=${event.event_type}, event_id=${event.event_id}`,
		)
	}
}
