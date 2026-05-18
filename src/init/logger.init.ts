import { ELogLevel, ENodeEnvironment, Logger, isProductionEnv } from 'tst-base'

import { config } from '../configs/config'

export const initializeLogger = (): void => {
	Logger.initializeLogger({
		sentryDSN: isProductionEnv() ? config.SENTRY_DSN : undefined,
		env:
			{
				development: ENodeEnvironment.DEVELOPMENT,
				staging: ENodeEnvironment.STAGING,
				production: ENodeEnvironment.PRODUCTION,
			}[process.env.NODE_ENV || 'development'] || ENodeEnvironment.DEVELOPMENT,
		logFolder: 'logs',
		logLevel: ELogLevel[config.LOG_LEVEL as keyof typeof ELogLevel],
		serviceName: config.SERVICE_NAME,
		sendErrorsToSentry: true,
	})
}
