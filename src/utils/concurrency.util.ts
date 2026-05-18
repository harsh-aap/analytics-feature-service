/**
 * Tiny p-limit-style bounded promise pool. Same implementation as event-service
 * — duplicated here intentionally to keep each service free of cross-service
 * imports.
 *
 * Usage:
 *   const limit = pLimit(200)
 *   await Promise.all(messages.map(m => limit(() => process(m))))
 */
export type Limiter = <T>(fn: () => Promise<T>) => Promise<T>

export const pLimit = (concurrency: number): Limiter => {
	if (!Number.isFinite(concurrency) || concurrency <= 0) {
		throw new Error(`pLimit: concurrency must be a positive integer, got ${concurrency}`)
	}

	let activeCount = 0
	const queue: Array<() => void> = []

	const next = (): void => {
		activeCount -= 1
		if (queue.length > 0) {
			const resume = queue.shift()
			resume?.()
		}
	}

	return <T>(fn: () => Promise<T>): Promise<T> => {
		return new Promise<T>((resolve, reject) => {
			const run = (): void => {
				activeCount += 1
				fn()
					.then((value) => {
						resolve(value)
						next()
					})
					.catch((err) => {
						reject(err)
						next()
					})
			}

			if (activeCount < concurrency) {
				run()
			} else {
				queue.push(run)
			}
		})
	}
}
