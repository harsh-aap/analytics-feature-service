import { ELogType } from '../logger/constant'
import { Logger } from '../logger/logger'
import { isProductionEnv } from '../utils/env.util'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const newrelic = require('newrelic')

export const bgTransactionWrapper = async <T>(
	name: string,
	group: string,
	handle: () => Promise<T>,
): Promise<{ trError?: Error; trResult?: T }> => {
	const response: { trError?: Error; trResult?: T } = {}
	try {
		let result: T
		if (isProductionEnv()) {
			result = await newrelic.startBackgroundTransaction(
				name,
				group,
				async (): Promise<T> => {
					const transaction = newrelic.getTransaction()
					try {
						const resultInner: T = await handle()
						return resultInner
					} catch (error) {
						newrelic.noticeError(error as Error)
						Logger.error(
							ELogType.HTTP_API_LOG,
							'bgTransactionWrapper',
							'errorHandler',
							'bgTransactionWrapper error',
							error,
							'',
						)
						throw error
					} finally {
						transaction.end()
					}
				},
			)
			response.trResult = result
			return response
		}
		result = await handle()
		response.trResult = result
		return response
	} catch (error) {
		Logger.error(
			ELogType.HTTP_API_LOG,
			'bgTransactionWrapper',
			'errorHandler',
			'bgTransactionWrapper error',
			error,
			'',
		)
		throw error
	}
}

export const recordMetric = (metricName: string, value: number) => {
	if (isProductionEnv()) {
		newrelic.recordMetric(metricName, value)
	}
}

// usage:

// await bgTransactionWrapper<void>(
//     "send_otp", // method name
//     "user_consumer", // service name
//     async () => send_sms(payload, messageId),
// )
