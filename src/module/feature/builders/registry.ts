import { inject, injectable } from 'inversify'

import { FeatureUpdate, IFeatureBuilder, mergeUpdates } from './builder.interface'
import { TYPES } from '../../../ioc/types'
import { AppLogger } from '../../../utils/logger.util'
import { IngestedEvent } from '../models'

const logger = AppLogger(__filename)

/**
 * BuilderRegistry collects every IFeatureBuilder, asks the ones that
 * `supports(event)` for their FeatureUpdate, and merges them into one update
 * doc. The repository then applies that as a single Mongo upsert.
 *
 * Order in `active` only matters for $set conflicts (last writer wins): keep
 * the always-on CoreFeatureBuilder first so domain builders can override
 * core fields if they ever need to.
 */
@injectable()
export class BuilderRegistry {
	@inject(TYPES.CoreFeatureBuilder)
	private readonly core: IFeatureBuilder

	@inject(TYPES.PurchaseFeatureBuilder)
	private readonly purchase: IFeatureBuilder

	@inject(TYPES.CartFeatureBuilder)
	private readonly cart: IFeatureBuilder

	@inject(TYPES.SignupFeatureBuilder)
	private readonly signup: IFeatureBuilder

	@inject(TYPES.LoginFeatureBuilder)
	private readonly login: IFeatureBuilder

	@inject(TYPES.SearchFeatureBuilder)
	private readonly search: IFeatureBuilder

	private active: IFeatureBuilder[] = []

	initialize(): void {
		this.active = [this.core, this.purchase, this.cart, this.signup, this.login, this.search]
		logger.info(
			'initialize',
			`BuilderRegistry initialised with: [${this.active.map((b) => b.name).join(', ')}]`,
		)
	}

	build(event: IngestedEvent): FeatureUpdate {
		const updates: FeatureUpdate[] = []
		for (const builder of this.active) {
			if (!builder.supports(event)) continue
			try {
				updates.push(builder.build(event))
			} catch (err) {
				// A buggy builder shouldn't take the whole event down; log and
				// skip its contribution so the remaining builders still run.
				logger.error(
					'build',
					`builder ${builder.name} failed for event_id=${event.event_id}, type=${event.event_type}`,
					err,
				)
			}
		}
		return mergeUpdates(updates)
	}
}
