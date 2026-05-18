import { StatusCodes } from '../constants/httpStatusCodes.constant'
import * as loggerConstants from '../logger/constant'

export type ILoggerConfig = {
	env: loggerConstants.ENodeEnvironment
	isRunningInKubernetes?: boolean
	logFolder: string
	logLevel: loggerConstants.ELogLevel
	newRelicLicenseKey?: string
	sentryDSN?: string
	serviceName: string
	sentryTags?: { [key: string]: string }
	sendErrorsToSentry?: boolean
	logSize?: number
	release?: string // Release version for tracking deployments (e.g., "1.0.0", "commit-abc123")
}

export type ILogMessage = {
	logType: loggerConstants.ELogType
	fileName?: string
	functionName?: string
	requestId: string
	message?: string
	reqOrigin?: string
	reqUrl?: string
	reqRemoteAddr?: string
	reqBody?: string
	reqQuery?: string
	reqUserAgent?: string
	resContentLength?: number
	resTime?: number
	code?: StatusCodes
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	error?: any // ! it should be unknown
	env?: loggerConstants.ENodeEnvironment
	level?: loggerConstants.ELogLevel | string
	serviceName?: string
	timestamp?: string
	errorCode?: string
	// Fields from ApiError
	statusCode?: number
	errorData?: string // Stringified data from ApiError
	errorDetails?: string // Stringified details from ValidationError
	internalCode?: string
	errMsg?: string
	stack?: string
	errorConstructorName?: string
	transaction?: string // Request path for Sentry transaction tracking
	[key: string]: string | undefined | number
}
