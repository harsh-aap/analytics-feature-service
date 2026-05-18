import { ApiError } from './api.error'
import { StatusCodes } from '../../constants/httpStatusCodes.constant'
import { internalCodesType } from '../../models/internalCode.model'

export class TooManyRequestsError extends ApiError {
	retryAfterSeconds: number | undefined

	constructor(
		retryAfterSeconds?: number,
		data?: unknown,
		error?: unknown,
		internalCode?: internalCodesType,
	) {
		super(
			'Too many requests, please try again in some time',
			StatusCodes.TOO_MANY_REQUESTS,
			data,
			error,
			internalCode,
		)
		this.retryAfterSeconds = retryAfterSeconds
		Object.setPrototypeOf(this, TooManyRequestsError.prototype)
	}
}
