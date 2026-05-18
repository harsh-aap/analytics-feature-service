import { NextFunction, Request, Response } from 'express'

import { APP_CONTEXT_KEY, TOAST_HEADER_PREFIX } from '../../constants/baseConfig.constant'
import { APP_JWT_MODEL } from '../../models/jwt.model' // Adjust the import path as necessary

export const appContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
	const _appContext: Record<string, string> = {}

	Object.values(APP_JWT_MODEL).forEach((headerKey) => {
		const tstHeaderKey = `${TOAST_HEADER_PREFIX}${headerKey}`
		const headerValue = req.headers[tstHeaderKey.toLowerCase()] // Headers are case-insensitive and typically lowercase
		if (headerValue) {
			_appContext[headerKey] = Array.isArray(headerValue)
				? headerValue.join(',')
				: headerValue
		}
	})

	res.locals[APP_CONTEXT_KEY] = _appContext
	next()
}
