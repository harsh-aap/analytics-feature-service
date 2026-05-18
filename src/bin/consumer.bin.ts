import 'reflect-metadata'

if (!process.env.SERVICE_NAME) {
	throw new Error('required env variable: SERVICE_NAME not found')
}

const allowedEnvs = ['development', 'staging', 'production'] as const
if (
	!process.env.NODE_ENV ||
	!allowedEnvs.includes(process.env.NODE_ENV as (typeof allowedEnvs)[number])
) {
	throw new Error(`process.env.NODE_ENV should be one of: ${allowedEnvs.join(', ')}`)
}


async function startService(): Promise<void> {
	if (process.env.NODE_ENV === 'production' && process.env.NEW_RELIC_LICENSE_KEY) {
		try {
			await import('newrelic')
			// eslint-disable-next-line no-console
			console.log('New Relic initialized')
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error('Failed to initialize New Relic:', error)
			process.exit(1)
		}
	}

	// Loading consumer.init triggers Consumer.init() at module-load time,
	// matching the reference event-service bootstrap pattern.
	await import('../init/consumer.init')
}

startService().catch((error) => {
	// eslint-disable-next-line no-console
	console.error('Failed to start service:', error)
	process.exit(1)
})
