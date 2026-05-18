import path from 'path'

import { ELogType, Logger } from '../logger'

const fileName = path.basename(__filename)
const logger = {
	info: (fnName: string, message: string): void => {
		Logger.info(ELogType.TERMINATE_LOG, fileName, fnName, message)
	},
	error: (fnName: string, message: string, error?: unknown): void => {
		Logger.error(ELogType.TERMINATE_LOG, fileName, fnName, message, error)
	},
}

export const signalHandler = (
	teardownFn: () => Promise<void>,
	signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'],
	gracePeriodMs = 30000,
): void => {
	let isShuttingDown = false

	const teardown = async (signal: string): Promise<void> => {
		try {
			if (isShuttingDown) {
				logger.info('teardown', `Shutdown already in progress, ignoring ${signal}`)
				return
			}

			isShuttingDown = true
			logger.info('teardown', `Received ${signal}. Beginning teardown process...`)

			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => {
					reject(new Error(`Grace period of ${gracePeriodMs}ms exceeded.`))
				}, gracePeriodMs)
			})

			await Promise.race([teardownFn(), timeoutPromise])
			logger.info('teardown', `Teardown completed successfully.`)
			process.exit(0)
		} catch (error) {
			if (error instanceof Error && error.message.includes('Grace period')) {
				logger.error('teardown', 'Forcing exit', error)
			} else {
				logger.error('teardown', 'Error during teardown', error)
			}
			process.exit(1)
		} finally {
			logger.info('teardown', 'Teardown process finished. Exiting...')
			process.exit(1)
		}
	}

	process.on('uncaughtException', (err) => {
		logger.error('signalHandler', 'Uncaught Exception:', err)
	})
	process.on('unhandledRejection', (reason, promise) => {
		logger.error(
			'signalHandler',
			`Unhandled Rejection at: ${promise.toString()} with reason: ${reason}`,
		)
		promise
			.then((value) => {
				logger.error(
					'signalHandler',
					`Unhandled Rejection at: ${typeof value === 'object' ? JSON.stringify(value) : value} with reason: ${reason}`,
				)
			})
			.catch((error) => {
				logger.error('signalHandler', 'Unhandled error in unhandledRejection:', error)
			})
	})
	signals.forEach((signal) => {
		process.on(signal, () => {
			teardown(signal).catch((error) => {
				logger.error('signalHandler', 'Unhandled error in teardown:', error)
				process.exit(1)
			})
		})
	})

	process.on('exit', (code) => {
		logger.info('signalHandler', `Process exit with code: ${code}`)
	})
}
