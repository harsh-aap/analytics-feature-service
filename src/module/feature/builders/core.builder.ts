import { injectable } from 'inversify'

import { BuilderName, FeatureUpdate, IFeatureBuilder } from './builder.interface'
import { IngestedEvent } from '../models'

/**
 * CoreFeatureBuilder is always-on: it runs for every event regardless of type.
 * Captures lifecycle (first/last seen), generic counters, and the most recent
 * identity / device / source signals. New event types automatically get
 * counted in `event_counts.<event_type>` without any builder changes.
 */
@injectable()
export class CoreFeatureBuilder implements IFeatureBuilder {
	readonly name: BuilderName = 'core'

	supports(_event: IngestedEvent): boolean {
		return true
	}

	build(event: IngestedEvent): FeatureUpdate {
		const ts = event.event_ts_ms
		const $set: Record<string, unknown> = {
			last_event_id: event.event_id,
			last_event_type: event.event_type,
		}
		// We only $set fields that are present on the event so we don't blow
		// away previously-set values with empty strings.
		if (event.user_id) $set.user_id = event.user_id
		if (event.anonymous_id) $set.anonymous_id = event.anonymous_id
		if (event.brand) $set.last_brand = event.brand
		if (event.platform) $set.last_platform = event.platform
		if (event.source) $set.last_source = event.source

		return {
			$setOnInsert: { first_seen_ts: ts },
			$set,
			$inc: {
				total_events: 1,
				[`event_counts.${event.event_type}`]: 1,
			},
			$max: { last_seen_ts: ts },
		}
	}
}
