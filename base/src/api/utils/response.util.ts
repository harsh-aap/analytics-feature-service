import { Response } from 'express'

import { IResponse } from '../../models/request.model'

export class ResponseUtil {
	private static sendResponse<T extends object | undefined | unknown>(
		res: Response,
		success: boolean,
		statusCode: number,
		data: T,
		message?: string,
		details?: unknown,
		internalCode?: string,
	): void {
		const responseObject: IResponse = {
			success,
			internalCode,
			data,
			...(message && {
				error: {
					message,
					details,
				},
			}),
		}
		res.status(statusCode).json(responseObject)
	}

	static sendSuccess<T extends object | undefined | unknown>(
		res: Response,
		data: T,
		statusCode: number = 200,
		internalCode?: string,
	): void {
		this.sendResponse(res, true, statusCode, data, undefined, undefined, internalCode)
	}

	static sendError(
		res: Response,
		message: string,
		data: unknown,
		statusCode: number = 500,
		details?: unknown,
		internalCode?: string,
	): void {
		this.sendResponse(res, false, statusCode, data, message, details, internalCode)
	}
}
