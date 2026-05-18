import { Request, Response } from 'express'

import { baseConfig } from '../constants'
import { ELogType, Logger } from '../logger'

export const customLogger = (
	logType: ELogType,
	fileName: string,
): {
	debug: (fnName: string, message: string, error?: unknown, requestId?: string) => void
	info: (fnName: string, message: string, error?: unknown, requestId?: string) => void
	error: (fnName: string, message: string, error?: unknown, requestId?: string) => void
	warn: (fnName: string, message: string, error?: unknown, requestId?: string) => void
} => {
	return {
		debug: (fnName: string, message: string, error?: unknown, requestId?: string): void => {
			Logger.debug(logType, fileName, fnName, message, error, requestId)
		},
		info: (fnName: string, message: string, error?: unknown, requestId?: string): void => {
			Logger.info(logType, fileName, fnName, message, error, requestId)
		},
		error: (fnName: string, message: string, error?: unknown, requestId?: string): void => {
			Logger.error(logType, fileName, fnName, message, error, requestId)
		},
		warn: (fnName: string, message: string, error?: unknown, requestId?: string): void => {
			Logger.warn(logType, fileName, fnName, message, error, requestId)
		},
	}
}

export const getRequestIdFromHeader = (req: Request): string => {
	return req.headers[baseConfig.REQUEST_ID_HEADER] as string
}

export const getRequestId = (res: Response): string => {
	return res.get(baseConfig.REQUEST_ID_HEADER) as string
}

export const getXForwardedFor = (req: Request): string | undefined => {
	return req.get(baseConfig.FORWARDED_FOR_HEADER)
}
