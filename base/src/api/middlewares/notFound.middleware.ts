import { HttpStatusCode } from 'axios'
import { Request, Response } from 'express'

import { ResponseUtil } from '../utils/response.util'

// 404 Not Found Middleware
export const notFoundMiddleware = (req: Request, res: Response): void => {
	ResponseUtil.sendError(res, 'Resource not found', {}, HttpStatusCode.NotFound)
}
