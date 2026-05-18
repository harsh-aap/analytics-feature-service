import { internalCodesType } from '../../models/internalCode.model'

export class AsyncError extends Error {
	internalCode?: internalCodesType

	data: unknown

	error: unknown

	constructor(
		message: string,
		internalCode?: internalCodesType,
		data?: unknown,
		error?: unknown,
	) {
		super(message)
		this.internalCode = internalCode
		this.data = data
		this.error = error

		Object.setPrototypeOf(this, AsyncError.prototype)
		Error.captureStackTrace(this, this.constructor)

		if (error && (error instanceof Error || (typeof error === 'object' && 'stack' in error))) {
			const currentStack = this?.stack ?? ''
			const errorStack = error?.stack ?? ''

			const firstLine = currentStack.split('\n')[0]

			this.stack = `${firstLine}\n${errorStack}`
		}
	}
}
