import * as sentry from '@sentry/node'
import { NextFunction, Request, Response } from 'express'
import * as mongodb from 'mongodb'

import { StatusCodes } from '../../constants'
import { ELogType } from '../../logger/constant'
import { Logger } from '../../logger/logger'
import { allInternalCodes } from '../../models/internalCode.model'
import { getRequestId } from '../../utils'
import { ApiError } from '../errors/api.error'
import { TooManyRequestsError } from '../errors/tooManyRequests.error'
import { ValidationError } from '../errors/validation.error'
import { ResponseUtil } from '../utils/response.util'

const FILENAME = 'error.middleware.ts'
const FUNCTION_NAME = 'errorHandler'

/**
 * Helper function to log errors with common parameters
 */
const logWithContext = (
	level: 'error' | 'warn',
	message: string,
	err: unknown,
	requestId: string,
	sendToSentry: boolean,
	transaction: string,
): void => {
	const logFn = level === 'error' ? Logger.error : Logger.warn
	logFn(
		ELogType.HTTP_API_LOG,
		FILENAME,
		FUNCTION_NAME,
		message,
		err,
		requestId,
		sendToSentry,
		transaction,
	)
}

const handleMongoDBError = (
	err: mongodb.MongoServerError,
	reqPath: string,
	requestId: string,
): void => {
	const isConflict = err.code === 11000

	// Extract detailed error information for debugging
	const errorDetails: Record<string, unknown> = {
		code: err.code,
		codeName: err.codeName,
		errorInfo: err.errInfo,
		...(err.keyPattern && { keyPattern: err.keyPattern }),
		...(err.keyValue && { keyValue: err.keyValue }),
	}

	let message: string
	if (isConflict) {
		// For duplicate key errors, include which field caused the conflict
		const keyInfo = err.keyValue ? JSON.stringify(err.keyValue) : 'unknown'
		const indexInfo = err.keyPattern ? JSON.stringify(err.keyPattern) : ''
		message = `MongoDB Error [CONFLICT]: Duplicate key error, Route: ${reqPath}, Key: ${keyInfo}${indexInfo ? `, Index: ${indexInfo}` : ''}`
	} else if (err.errmsg) {
		message = `MongoDB Error: ${err.errmsg}, Route: ${reqPath}, Details: ${JSON.stringify(errorDetails)}`
	} else {
		message = `MongoDB Error Route: ${reqPath}, Details: ${JSON.stringify(errorDetails)}`
	}

	logWithContext('error', message, err, requestId, !isConflict, reqPath)
}

/**
 * Logs the error based on error type and status code
 */
const logError = (err: unknown, reqPath: string, requestId: string): void => {
	// Handle MongoDB errors
	if (err instanceof mongodb.MongoServerError) {
		handleMongoDBError(err, reqPath, requestId)
		return
	}

	// Handle non-ApiError instances
	if (!(err instanceof ApiError)) {
		logWithContext(
			'error',
			`Route: ${reqPath}, Message: ${err instanceof Error ? err.message : 'Unknown error'}`,
			err,
			requestId,
			true,
			reqPath,
		)
		return
	}

	// Handle ApiError instances
	const { status, message } = err
	const baseLogMessage = `Route: ${reqPath}, Message: ${message}`

	// ValidationError - log as warning with details
	if (err instanceof ValidationError) {
		const validationDetails =
			typeof err.details === 'object' ? JSON.stringify(err.details) : err.details
		logWithContext(
			'warn',
			`${baseLogMessage}, validation error detail: ${validationDetails}`,
			err,
			requestId,
			false,
			reqPath,
		)
		return
	}

	// Internal code errors - log as warning
	if (err.internalCode && allInternalCodes.includes(err.internalCode)) {
		logWithContext('warn', message, err, requestId, false, reqPath)
		return
	}

	// 4xx = client errors (business logic) - don't send to Sentry
	// 5xx = server errors (technical) - send to Sentry
	const sendToSentry = status >= 500
	logWithContext('error', baseLogMessage, err, requestId, sendToSentry, reqPath)
}

/**
 * Sends appropriate error response based on error type
 */
const sendErrorResponse = (
	res: Response,
	err: unknown,
	_reqPath: string,
	_requestId: string,
): void => {
	let statusCode = StatusCodes.INTERNAL_SERVER_ERROR
	let data: unknown = null
	let message = 'internal_server_error'

	// Handle MongoDB duplicate key errors
	if (err instanceof mongodb.MongoServerError) {
		statusCode = err.code === 11000 ? StatusCodes.CONFLICT : StatusCodes.INTERNAL_SERVER_ERROR
		message = err.code === 11000 ? 'Document Already exists' : 'Oops! Something went wrong'
	}

	if (err instanceof ApiError) {
		statusCode = err.status
		data = err.data
		message = err.message
	}

	if (err instanceof ValidationError) {
		return ResponseUtil.sendError(res, message, data, statusCode, err.details)
	}

	if (err instanceof TooManyRequestsError) {
		if (err.retryAfterSeconds) {
			res.setHeader('Retry-After-Seconds', err.retryAfterSeconds)
		}
		return ResponseUtil.sendError(res, message, data, statusCode)
	}

	return ResponseUtil.sendError(res, message, data, statusCode)
}

export const errorHandler = (
	err: Error,
	req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	const requestId = getRequestId(res)
	const { path: reqPath } = req

	try {
		sendErrorResponse(res, err, reqPath, requestId)
	} catch (error) {
		sentry.captureException(error, {
			level: 'error',
			extra: {
				requestId,
				reqPath,
				err,
			},
		})
	}

	try {
		logError(err, reqPath, requestId)
	} catch (error) {
		sentry.captureException(error, {
			level: 'error',
			extra: {
				requestId,
				reqPath,
				err,
			},
		})
	}
}
