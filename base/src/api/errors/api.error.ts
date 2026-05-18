import { StatusCodes } from '../../constants/httpStatusCodes.constant'
import { internalCodesType } from '../../models/internalCode.model'

export class ApiError extends Error {
	status: number

	data: unknown

	error: unknown

	internalCode?: internalCodesType

	sendToSentry?: boolean

	constructor(
		message: string,
		status: StatusCodes,
		data?: unknown,
		error?: unknown,
		internalCode?: internalCodesType,
		sendToSentry?: boolean,
	) {
		super(message)
		this.status = status
		this.data = data
		this.error = error
		this.internalCode = internalCode
		this.sendToSentry = sendToSentry

		Object.setPrototypeOf(this, ApiError.prototype)
		Error.captureStackTrace(this, this.constructor)

		if (error && (error instanceof Error || (typeof error === 'object' && 'stack' in error))) {
			const currentStack = this?.stack ?? ''
			const errorStack = error?.stack ?? ''

			const firstLine = currentStack.split('\n')[0]

			this.stack = `${firstLine}\n${errorStack}`
		}
	}
}
