import { injectable } from 'inversify'

import { BuilderName, FeatureUpdate, IFeatureBuilder } from './builder.interface'
import { EVENT_TYPES } from '../constants'
import { IngestedEvent } from '../models'

/**
 * PurchaseFeatureBuilder maintains revenue and order signals on the user.
 * Tracks lifetime_value, purchase count, last order, and the set of currencies
 * the user has paid in (useful for personalisation & fraud signals).
 */
@injectable()
export class PurchaseFeatureBuilder implements IFeatureBuilder {
	readonly name: BuilderName = 'purchase'

	supports(event: IngestedEvent): boolean {
		return event.event_type === EVENT_TYPES.PURCHASE
	}

	build(event: IngestedEvent): FeatureUpdate {
		const update: FeatureUpdate = {
			$inc: { purchase_count: 1 },
			$max: { last_purchase_at: event.event_ts_ms },
		}

		// Mongo $inc panics if you try to increment by a non-number, so guard
		// explicitly. Missing prices are normal for free tiers / refunds.
		if (typeof event.price === 'number' && Number.isFinite(event.price)) {
			update.$inc = { ...update.$inc, lifetime_value: event.price }
		}

		const $set: Record<string, unknown> = {}
		if (event.order_id) $set.last_order_id = event.order_id
		if (event.payment_method) $set.last_payment_method = event.payment_method
		if (Object.keys($set).length > 0) update.$set = $set

		if (event.currency) {
			update.$addToSet = { currencies: event.currency }
		}
		return update
	}
}
