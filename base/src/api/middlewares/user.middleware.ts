import { NextFunction, Response } from 'express'
import _ from 'lodash'

import { StatusCodes } from '../../constants/httpStatusCodes.constant'
import { ApiError } from '../errors/api.error'
import { CustomRequest } from '../utils/request.util'

export const validateUser = (
	// eslint-disable-next-line @typescript-eslint/ban-types
	req: CustomRequest<{}>,
	res: Response,
	next: NextFunction,
): void => {
	try {
		if (req.path.startsWith('/api-docs')) {
			return next()
		}
		// eslint-disable-next-line no-underscore-dangle
		const userContext = req.body?._userContext
		if (userContext) {
			req._user = _.cloneDeep(userContext)
			return next()
		}
		throw new ApiError('Unauthorized Request', StatusCodes.UNAUTHORIZED)
	} catch (error) {
		return next(error)
	}
}
