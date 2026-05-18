import Ajv, { ErrorObject, ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import { injectable } from 'inversify'

import { IngestedEvent, baseEventSchema } from './models'

export interface ValidationResult {
	ok: boolean
	errors?: ErrorObject[]
	event?: IngestedEvent
}

/**
 * feature-service only validates the base event shape — every per-event-type
 * concern is handled by the FeatureBuilder for that event_type. This keeps
 * the validator hot-path tiny (one compiled validator, one call per event).
 */
@injectable()
export class FeatureValidator {
	private ajv: Ajv

	private baseValidator: ValidateFunction

	constructor() {
		// allErrors: surface every problem so DLQ messages have full context.
		this.ajv = new Ajv({ allErrors: true, strict: false })
		addFormats(this.ajv)
		this.baseValidator = this.ajv.compile(baseEventSchema)
	}

	validate(raw: unknown): ValidationResult {
		if (!raw || typeof raw !== 'object') {
			return {
				ok: false,
				errors: [
					{
						instancePath: '',
						schemaPath: '#',
						keyword: 'type',
						params: { type: 'object' },
						message: 'event payload must be an object',
					} as ErrorObject,
				],
			}
		}
		if (!this.baseValidator(raw)) {
			return { ok: false, errors: this.baseValidator.errors ?? undefined }
		}
		return { ok: true, event: raw as IngestedEvent }
	}
}
