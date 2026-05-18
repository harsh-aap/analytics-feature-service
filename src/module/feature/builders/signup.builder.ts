import { injectable } from 'inversify'

import { BuilderName, FeatureUpdate, IFeatureBuilder } from './builder.interface'
import { EVENT_TYPES } from '../constants'
import { IngestedEvent } from '../models'

/**
 * Signup is a one-time event per user, so signed_up_at uses $setOnInsert and
 * $min so a replay never overwrites the original signup time. We also store
 * the signup_method on first sight only.
 */
@injectable()
export class SignupFeatureBuilder implements IFeatureBuilder {
	readonly name: BuilderName = 'signup'

	supports(event: IngestedEvent): boolean {
		return event.event_type === EVENT_TYPES.USER_SIGNUP
	}

	build(event: IngestedEvent): FeatureUpdate {
		// $min keeps the earliest signup timestamp even if Kafka replays a
		// later signup event for the same user. signup_method uses $set so a
		// signup that arrives after an earlier anonymous event still records
		// the method (it might be missing if we used $setOnInsert).
		const update: FeatureUpdate = {
			$min: { signed_up_at: event.event_ts_ms },
		}
		if (event.method) {
			update.$set = { signup_method: event.method }
		}
		return update
	}
}
