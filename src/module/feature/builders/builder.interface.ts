import { IngestedEvent } from '../models'

/**
 * A FeatureUpdate is the partial Mongo update operator block that one builder
 * contributes for one event. The registry merges every builder's contribution
 * into a single update doc so we apply exactly one upsert per event.
 *
 * We deliberately model it as plain objects (not full Mongo UpdateFilter
 * types) because:
 *   - Each builder only ever sets a handful of fields.
 *   - Mongo's UpdateFilter generic gets noisy with deep partials.
 *   - The repository tightens the type when it constructs the final update.
 */
export interface FeatureUpdate {
	$setOnInsert?: Record<string, unknown>
	$set?: Record<string, unknown>
	$inc?: Record<string, number>
	$max?: Record<string, number>
	$min?: Record<string, number>
	$addToSet?: Record<string, unknown>
}

/**
 * BuilderName is a closed enum so the BuilderRegistry log line is stable
 * across builds. Add new entries here as you add builders.
 */
export type BuilderName =
	| 'core'
	| 'purchase'
	| 'cart'
	| 'signup'
	| 'login'
	| 'search'

export interface IFeatureBuilder {
	readonly name: BuilderName
	supports(event: IngestedEvent): boolean
	build(event: IngestedEvent): FeatureUpdate
}

/**
 * Merge the partial updates from every builder into one update doc.
 * Conflicts are resolved by the operator semantics:
 *   - $setOnInsert / $set: last writer wins per field. Builders should not
 *     fight here — fields are partitioned by domain.
 *   - $inc: summed.
 *   - $max / $min: combined via Math.{max,min}.
 *   - $addToSet: each value pushed under its key.
 */
export const mergeUpdates = (updates: FeatureUpdate[]): FeatureUpdate => {
	const out: FeatureUpdate = {}

	for (const u of updates) {
		if (u.$setOnInsert) {
			out.$setOnInsert = { ...(out.$setOnInsert ?? {}), ...u.$setOnInsert }
		}
		if (u.$set) {
			out.$set = { ...(out.$set ?? {}), ...u.$set }
		}
		if (u.$inc) {
			const merged = { ...(out.$inc ?? {}) }
			for (const [k, v] of Object.entries(u.$inc)) {
				merged[k] = (merged[k] ?? 0) + v
			}
			out.$inc = merged
		}
		if (u.$max) {
			const merged = { ...(out.$max ?? {}) }
			for (const [k, v] of Object.entries(u.$max)) {
				merged[k] = merged[k] !== undefined ? Math.max(merged[k], v) : v
			}
			out.$max = merged
		}
		if (u.$min) {
			const merged = { ...(out.$min ?? {}) }
			for (const [k, v] of Object.entries(u.$min)) {
				merged[k] = merged[k] !== undefined ? Math.min(merged[k], v) : v
			}
			out.$min = merged
		}
		if (u.$addToSet) {
			out.$addToSet = { ...(out.$addToSet ?? {}), ...u.$addToSet }
		}
	}

	return out
}
