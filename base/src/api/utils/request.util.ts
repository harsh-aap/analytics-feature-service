import { NextFunction, Request, Response } from 'express'

export const requestPartToValidatedRequestPart = Object.freeze({
	body: 'validatedBody',
	params: 'validatedParams',
	query: 'validatedQuery',
	headers: 'validatedHeaders',
})

export type RequestParts = keyof typeof requestPartToValidatedRequestPart

export type ValidatedRequestParts = (typeof requestPartToValidatedRequestPart)[RequestParts]

// eslint-disable-next-line @typescript-eslint/ban-types
export type CustomRequest<T extends Partial<Record<ValidatedRequestParts, object>> = {}> = Request &
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	T & { _user: any }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asyncHandler = <T extends Record<string, any>>(
	fn: (req: Request, res: Response<unknown, T>, next: NextFunction) => Promise<void>,
) => {
	return (req: Request, res: Response<unknown, T>, next: NextFunction): Promise<void> => {
		return fn(req, res, next).catch(next)
	}
}
