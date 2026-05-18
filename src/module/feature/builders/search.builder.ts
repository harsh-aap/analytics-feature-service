import { injectable } from 'inversify'

import { BuilderName, FeatureUpdate, IFeatureBuilder } from './builder.interface'
import { EVENT_TYPES } from '../constants'
import { IngestedEvent } from '../models'

@injectable()
export class SearchFeatureBuilder implements IFeatureBuilder {
	readonly name: BuilderName = 'search'

	supports(event: IngestedEvent): boolean {
		return event.event_type === EVENT_TYPES.SEARCH
	}

	build(event: IngestedEvent): FeatureUpdate {
		const update: FeatureUpdate = {
			$inc: { search_count: 1 },
			$max: { last_search_at: event.event_ts_ms },
		}
		if (event.query) {
			update.$set = { last_search_query: event.query }
		}
		return update
	}
}
