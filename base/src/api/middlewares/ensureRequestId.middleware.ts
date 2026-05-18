import { NextFunction, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

import { REQUEST_ID_HEADER } from '../../constants/baseConfig.constant'

// Middleware to ensure requestId exists in the request headers
export const ensureRequestId = (req: Request, res: Response, next: NextFunction): void => {
	const requestId = req.headers[`${REQUEST_ID_HEADER}`] || uuidv4()
	res.set(`${REQUEST_ID_HEADER}`, requestId)
	next()
}
