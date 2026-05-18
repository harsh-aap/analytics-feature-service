import { inject, injectable } from 'inversify'
import { CacheContext } from 'tst-base'

import { config } from '../../configs/config'
import { TYPES } from '../../ioc/types'
import { AppLogger } from '../../utils/logger.util'

const logger = AppLogger(__filename)

/**
 * Redis-backed dedup keyed on event_id. Critical for feature-service because
 * the upserts use $inc / $addToSet — those are NOT idempotent under Kafka
 * redelivery. With this in place, replaying a partition only updates last_*
 * timestamps and pushes counters forward by zero.
 *
 * Cheap: one round-trip per event when on, zero when off.
 */
@injectable()
export class IdempotencyService {
	@inject(TYPES.CacheContext)
	private readonly cache: CacheContext

	private get enabled(): boolean {
		return config.IDEMPOTENCY_ENABLED
	}

	private buildKey(eventId: string): string {
		return `feature:idempotency:${eventId}`
	}

	async isProcessed(eventId: string): Promise<boolean> {
		if (!this.enabled || !eventId) return false
		try {
			const result = await this.cache.getString(this.buildKey(eventId))
			return result !== null
		} catch (error) {
			if (error instanceof Error && error.message?.includes('client is closed')) {
				logger.warn(
					'isProcessed',
					'Redis closed during shutdown, treating as not processed',
				)
				return false
			}
			throw error
		}
	}

	async markProcessed(eventId: string): Promise<void> {
		if (!this.enabled || !eventId) return
		try {
			await this.cache.setStringWithExpire(
				this.buildKey(eventId),
				'1',
				config.IDEMPOTENCY_TTL_SECONDS,
			)
		} catch (error) {
			if (error instanceof Error && error.message?.includes('client is closed')) {
				logger.warn('markProcessed', 'Redis closed during shutdown, skipping cache set')
				return
			}
			throw error
		}
	}
}
