import { NextFunction, Request, Response } from 'express'

import { GAME_CONTEXT_KEY, TOAST_HEADER_PREFIX } from '../../constants/baseConfig.constant'
import { GAME_JWT_MODEL } from '../../models/jwt.model' // Adjust the import path as necessary

export const gameContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
	const _gameContext: Record<string, string> = {}

	Object.values(GAME_JWT_MODEL).forEach((headerKey) => {
		const tstHeaderKey = `${TOAST_HEADER_PREFIX}${headerKey}`
		const headerValue = req.headers[tstHeaderKey.toLowerCase()] // Headers are case-insensitive and typically lowercase
		if (headerValue) {
			_gameContext[headerKey] = Array.isArray(headerValue)
				? headerValue.join(',')
				: headerValue
		}
	})

	res.locals[GAME_CONTEXT_KEY] = _gameContext
	next()
}
