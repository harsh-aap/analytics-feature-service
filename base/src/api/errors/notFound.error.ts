import { ApiError } from './api.error'
import { StatusCodes } from '../../constants/httpStatusCodes.constant'

export class NotFoundError extends ApiError {
	constructor(resource: string) {
		super(`${resource} not found`, StatusCodes.NOT_FOUND)
		Object.setPrototypeOf(this, NotFoundError.prototype)
	}
}
