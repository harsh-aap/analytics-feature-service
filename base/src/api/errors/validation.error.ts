import { ApiError } from './api.error'
import { StatusCodes } from '../../constants/httpStatusCodes.constant'

export class ValidationError extends ApiError {
	details: unknown

	constructor(details: unknown, status: StatusCodes = StatusCodes.BAD_REQUEST) {
		super('Validation error', status)
		this.details = details
		Object.setPrototypeOf(this, ValidationError.prototype)
	}
}
