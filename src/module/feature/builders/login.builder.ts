import { injectable } from 'inversify'

import { BuilderName, FeatureUpdate, IFeatureBuilder } from './builder.interface'
import { EVENT_TYPES } from '../constants'
import { IngestedEvent } from '../models'

@injectable()
export class LoginFeatureBuilder implements IFeatureBuilder {
	readonly name: BuilderName = 'login'

	supports(event: IngestedEvent): boolean {
		return event.event_type === EVENT_TYPES.USER_LOGIN
	}

	build(event: IngestedEvent): FeatureUpdate {
		const update: FeatureUpdate = {
			$inc: { login_count: 1 },
			$max: { last_login_at: event.event_ts_ms },
		}
		if (event.method) {
			update.$set = { last_login_method: event.method }
		}
		return update
	}
}
