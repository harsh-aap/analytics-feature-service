/**
 * Minimal AJV schema applied to every event before any builder runs. Anything
 * that doesn't pass goes straight to the DLQ — feature-service shouldn't try
 * to "fix" malformed input. We accept additional properties for forward
 * compatibility; the per-builder code only looks at fields it cares about.
 */
export const baseEventSchema = {
	type: 'object',
	additionalProperties: true,
	properties: {
		event_id: { type: 'string', minLength: 1 },
		event_type: { type: 'string', minLength: 1 },
		business_name: {
			type: 'string',
			minLength: 1,
			// No enum — brands are config-driven (BUSINESS_TOPICS). Adding a brand
			// is an env-var change + restart with no rebuild required.
		},
		user_id: { type: 'string', nullable: true },
		anonymous_id: { type: 'string', minLength: 1 },
		event_ts_ms: { type: 'integer', minimum: 0 },
	},
	required: ['event_id', 'event_type', 'business_name', 'anonymous_id', 'event_ts_ms'],
}
