import { injectable } from 'inversify'

import { BuilderName, FeatureUpdate, IFeatureBuilder } from './builder.interface'
import { EVENT_TYPES } from '../constants'
import { IngestedEvent } from '../models'

@injectable()
export class CartFeatureBuilder implements IFeatureBuilder {
	readonly name: BuilderName = 'cart'

	supports(event: IngestedEvent): boolean {
		return event.event_type === EVENT_TYPES.ADD_TO_CART
	}

	build(event: IngestedEvent): FeatureUpdate {
		const update: FeatureUpdate = {
			$inc: { cart_adds_count: 1 },
			$max: { last_cart_at: event.event_ts_ms },
		}
		if (event.product_id) {
			update.$set = { last_product_added: event.product_id }
		}
		return update
	}
}
