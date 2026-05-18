/* eslint-disable no-console */

import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import stringify from 'json-stringify-safe'
import _ from 'lodash'
import * as winston from 'winston'
import WinstonSentry from 'winston-transport-sentry-node'

import * as loggerConstants from './constant'
import { defaultSanitizer, fieldsToSanitize } from './helper'
import * as loggerModel from '../models/logger.model'
import { isDevelopmentEnv, isProductionEnv } from '../utils/env.util'

// Local type for Kafka log entries (replaces kafkajs LogEntry)
type KafkaLogPayload = { message?: string; error?: string; [key: string]: unknown }

dayjs.extend(utc)
dayjs.extend(timezone)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nr: any

if (isProductionEnv()) {
	import('newrelic')
		.then((module) => {
			nr = module
		})
		.catch((err) => {
			console.error('Failed to load NewRelic:', err)
		})
}
const defaultOfSendErrorsToSentry: boolean = true
export class Logger {
	private static logger: winston.Logger

	private static transports: { [key: string]: winston.transport } = {}

	private static sendErrorsToSentry: boolean = defaultOfSendErrorsToSentry

	static config: loggerModel.ILoggerConfig

	public static initializeLogger(config: loggerModel.ILoggerConfig): void {
		Logger.config = config
		Logger.sendErrorsToSentry = config.sendErrorsToSentry ?? defaultOfSendErrorsToSentry
		Logger.createLogger()
		if (_.isNil(Logger.logger)) {
			throw new Error('Failed to create logger')
		}
	}

	public static debug(
		logType: loggerConstants.ELogType,
		fileName: string,
		functionName: string,
		message: string,
		error?: unknown | string,
		requestId?: string,
		sendToSentry?: boolean,
		transaction?: string,
	): void {
		Logger.log(
			loggerConstants.ELogLevel.DEBUG,
			logType,
			fileName,
			functionName,
			message,
			error,
			requestId,
			sendToSentry,
			transaction,
		)
	}

	public static info(
		logType: loggerConstants.ELogType,
		fileName: string,
		functionName: string,
		message: string,
		error?: unknown | string,
		requestId?: string,
		sendToSentry?: boolean,
		transaction?: string,
	): void {
		Logger.log(
			loggerConstants.ELogLevel.INFO,
			logType,
			fileName,
			functionName,
			message,
			error,
			requestId,
			sendToSentry,
			transaction,
		)
	}

	public static warn(
		logType: loggerConstants.ELogType,
		fileName: string,
		functionName: string,
		message: string,
		error?: unknown | string,
		requestId?: string,
		sendToSentry?: boolean,
		transaction?: string,
	): void {
		Logger.log(
			loggerConstants.ELogLevel.WARN,
			logType,
			fileName,
			functionName,
			message,
			error,
			requestId,
			sendToSentry,
			transaction,
		)
	}

	public static error(
		logType: loggerConstants.ELogType,
		fileName: string,
		functionName: string,
		message: string,
		error?: unknown | string,
		requestId?: string,
		sendToSentry: boolean = this.sendErrorsToSentry,
		transaction?: string,
	): void {
		Logger.log(
			loggerConstants.ELogLevel.ERROR,
			logType,
			fileName,
			functionName,
			message,
			error,
			requestId,
			sendToSentry,
			transaction,
		)
	}

	/**
	 * Determines if error should be sent to Sentry
	 * Priority: explicit parameter > error object property > default (undefined = send for errors)
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private static shouldSendToSentry(sendToSentry?: boolean, error?: any): boolean {
		// If explicitly set, use that value
		if (sendToSentry !== undefined) {
			return sendToSentry
		}
		// Check if error object has sendToSentry property
		if (error && typeof error === 'object' && 'sendToSentry' in error) {
			return !!error.sendToSentry
		}
		// Default: allow sending to Sentry (sendToSentry will be true)
		return true
	}

	/**
	 * Safely extracts a field from error object with try-catch wrapper
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private static safeExtract(extractor: () => void): void {
		try {
			extractor()
		} catch {
			// Silently ignore extraction failures
		}
	}

	/**
	 * Safely stringifies a value, handling objects and primitives
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private static safeStringify(value: any, fallback: string): string {
		try {
			return typeof value === 'object' ? stringify(value) : String(value)
		} catch {
			return fallback
		}
	}

	/**
	 * Extracts additional fields from ApiError instances
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private static extractErrorFields(error?: any): Partial<loggerModel.ILogMessage> {
		const additionalFields: Partial<loggerModel.ILogMessage> = {}
		if (!error || typeof error !== 'object') {
			return additionalFields
		}

		// Extract status code
		this.safeExtract(() => {
			if ('status' in error && typeof error.status === 'number') {
				additionalFields.statusCode = error.status
			}
		})

		// Extract data from ApiError
		this.safeExtract(() => {
			if ('data' in error && error.data !== undefined && error.data !== null) {
				additionalFields.errorData = this.safeStringify(
					error.data,
					'[Unable to stringify error data]',
				)
			}
		})

		// Extract details from ValidationError
		this.safeExtract(() => {
			if ('details' in error && error.details !== undefined && error.details !== null) {
				additionalFields.errorDetails = this.safeStringify(
					error.details,
					'[Unable to stringify error details]',
				)
			}
		})

		// Extract internal code
		this.safeExtract(() => {
			if ('internalCode' in error && error.internalCode) {
				additionalFields.internalCode = String(error.internalCode)
			}
		})

		// Extract error constructor name
		this.safeExtract(() => {
			if (error instanceof Error) {
				additionalFields.errorConstructorName = error.constructor.name
			}
		})

		return additionalFields
	}

	private static log(
		level: loggerConstants.ELogLevel,
		logType: loggerConstants.ELogType,
		fileName: string, // usually the file name
		functionName: string, // usually the function name
		message: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		error?: Error | any, // unknown | string, // ! it should be unknown
		requestId?: string,
		sendToSentry?: boolean,
		transaction?: string,
	): void {
		if (!Logger.logger) {
			console.log({
				level,
				logType,
				fileName,
				functionName,
				message,
				error,
				requestId,
				transaction,
			})
			return
		}
		try {
			const { message: errMsg, stack: errStack } = error ?? {}
			const additionalFields = Logger.extractErrorFields(error)

			const logMessage: loggerModel.ILogMessage = Logger.sanitizeLogMessage({
				logType,
				fileName,
				functionName,
				requestId: requestId || '', // Add default value ''
				message,
				...(errMsg ? { errMsg } : {}),
				stack: errStack,
				...additionalFields,
				...(transaction ? { transaction } : {}),
			})

			// Add metadata to control Sentry - thread-safe approach
			// The Sentry transport will check this metadata via filter
			const logOptions = {
				...logMessage,
				sendToSentry: Logger.shouldSendToSentry(sendToSentry, error),
			}

			Logger.logger.log(level, logOptions)

			// TODO: add check to see if nr is initialized properly
			try {
				if (nr && error instanceof Error) {
					nr.noticeError(error, logMessage as NonNullable<unknown>)
				}
			} catch {
				/* empty */
			}
		} catch (e) {
			// TODO: send to new relic in case if error
			// console.log({ level, logType, fileName, functionName, message, error, requestId })
			console.log(`LOGGER [${level.toUpperCase()}] ERROR `, e)
		}
	}

	public static stream = {
		write: (message: string): void => {
			try {
				if (_.isNil(Logger.logger)) {
					Logger.createLogger()
				}
				const { logLevel } = Logger.config
				Logger.transports.console.level = logLevel
				// Logger.transports.file.level = logLevel
				const parsedLogMessage: loggerModel.ILogMessage = JSON.parse(message)
				const logMessage: loggerModel.ILogMessage =
					Logger.sanitizeLogMessage(parsedLogMessage)
				Logger.logger.log('info', logMessage)
			} catch (error) {
				console.log('LOGGER [STREAM] ERROR ', error)
			}
		},
	}

	private static sanitizeLogMessage(
		logMessage: loggerModel.ILogMessage,
	): loggerModel.ILogMessage {
		const sanitizedLogMessage: loggerModel.ILogMessage = _.cloneDeep(logMessage)
		fieldsToSanitize.forEach((field) =>
			defaultSanitizer(logMessage, field, sanitizedLogMessage, Logger.config.logSize),
		)
		return sanitizedLogMessage
	}

	// private static getLogFormat = (): winston.Logform.Format => {
	// 	return winston.format.printf((info: winston.Logform.TransformableInfo): string => {
	// 		try {
	// 			const logMessage = JSON.parse(info.message)
	// 			return constructLogMessage(info, logMessage, Logger.config)
	// 		} catch (error) {
	// 			console.log(error)
	// 		}
	// 		return constructLogMessage(info, {} as loggerModel.ILogMessage, Logger.config)
	// 	})
	// }

	// private static getSentryLogFormat = (customTags: {
	// 	[key: string]: string
	// }): winston.Logform.Format => {
	// 	return winston.format.printf((info: winston.Logform.TransformableInfo): string => {
	// 		try {
	// 			// eslint-disable-next-line no-param-reassign
	// 			info.tags = { ...info.tags, ...customTags }
	// 			const logMessage = JSON.parse(info.message)
	// 			return constructLogMessage(info, logMessage, Logger.config)
	// 		} catch (error) {
	// 			console.log(error)
	// 		}
	// 		return constructLogMessage(info, {} as loggerModel.ILogMessage, Logger.config)
	// 	})
	// }

	private static createLogger(): void {
		const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
			let parsedMessage = message
			try {
				parsedMessage = JSON.parse(message as unknown as string)
			} catch {
				parsedMessage = message
			}

			const output = {
				timestamp,
				level,
				message: parsedMessage,
				...metadata,
			}
			return JSON.stringify(output)
		})
		// const timestampFormat = () => dayjs().tz('Asia/Kolkata').format('YYYY-MM-DDTHH:mm:ss.SSSZ')

		const options = {
			console: {
				level: Logger.config.logLevel,
				handleExceptions: true,
				format: winston.format.combine(
					winston.format.splat(),
					winston.format.timestamp({
						format: () => dayjs().tz('Asia/Kolkata').format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
					}),
					customFormat,
					...(isDevelopmentEnv()
						? [winston.format.prettyPrint({ depth: 5, colorize: true })]
						: []),
				),
			},
			sentry: {
				level: loggerConstants.ELogLevel.ERROR,
				sentry: {
					dsn: Logger.config.sentryDSN,
					serverName: Logger.config.serviceName,
					attachStacktrace: true,
					environment: Logger.config.env,
					maxValueLength: 1024,
					...(Logger.config.release && { release: Logger.config.release }),
				},
				format: winston.format.combine(winston.format.splat(), winston.format.timestamp()),
				silent: false,
			},
		}

		// Create Sentry transport with custom format that filters based on sendToSentry metadata
		const sentryTransport = new WinstonSentry(options.sentry)
		sentryTransport.format = winston.format.combine(
			// Filter out logs that have sendToSentry = false (thread-safe)
			winston.format((info) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				return (info as any).sendToSentry ? info : false
			})(),
			// Format the error message for better Sentry grouping
			// eslint-disable-next-line complexity
			winston.format((info) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const infoAny = info as any

				// Create a descriptive message that combines all relevant info
				const sentryMessage = [
					infoAny.logType && `[${infoAny.logType}]`,
					infoAny.fileName && `File: ${infoAny.fileName}`,
					infoAny.functionName && `Function: ${infoAny.functionName}`,
					infoAny.message,
					infoAny.errMsg && `Error: ${infoAny.errMsg}`,
				]
					.filter(Boolean)
					.join(' | ')

				// Override the message with the descriptive one
				// This will be used as the event title in Sentry
				infoAny.message = infoAny.message || sentryMessage || 'Unknown Error'

				// Add tags for better filtering in Sentry
				infoAny.tags = {
					...infoAny.tags,
					logType: infoAny.logType,
					fileName: infoAny.fileName,
					functionName: infoAny.functionName,
					...(infoAny.errorConstructorName && {
						errorType: infoAny.errorConstructorName,
					}),
					...(infoAny.statusCode && { statusCode: String(infoAny.statusCode) }),
					...(infoAny.internalCode && { internalCode: infoAny.internalCode }),
					...(Logger.config.release && { release: Logger.config.release }),
				}

				// Set fingerprint for better grouping
				infoAny.fingerprint = [
					infoAny.fileName,
					infoAny.functionName,
					infoAny.errorConstructorName || 'Error',
				].filter(Boolean)

				return infoAny
			})(),
			winston.format.splat(),
			winston.format.timestamp(),
		)

		Logger.transports = {
			console: new winston.transports.Console(options.console),
			sentry: sentryTransport,
		}

		const transports =
			isDevelopmentEnv() || !Logger.sendErrorsToSentry
				? [Logger.transports.console]
				: [Logger.transports.console, Logger.transports.sentry]

		Logger.logger = winston.createLogger({
			levels: winston.config.syslog.levels,
			level: Logger.config.logLevel,
			transports,
			exitOnError: false,
		})
	}

	private static readonly SUPPRESSED_ERRORS = [
		'The group is rebalancing',
		'Response Heartbeat',
		'Rebalance is in progress',
		'Member leaving group',
	]

	private static readonly WARNING_ERRORS = [
		'Connection timeout',
		'Request timed out',
		'Broker not available',
	]

	/**
	 * Determines if a log entry should be suppressed
	 */
	public static shouldSuppress(log: KafkaLogPayload): boolean {
		const message = log?.message || ''
		const error = log?.error || ''

		return this.SUPPRESSED_ERRORS.some(
			(suppressedMsg) => message.includes(suppressedMsg) || error.includes(suppressedMsg),
		)
	}

	/**
	 * Determines if a log entry should be downgraded to a warning
	 */
	public static shouldWarn(log: KafkaLogPayload): boolean {
		const message = log?.message || ''
		const error = log?.error || ''

		return this.WARNING_ERRORS.some(
			(warnMsg) => message.includes(warnMsg) || error.includes(warnMsg),
		)
	}
}
