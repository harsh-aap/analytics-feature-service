import { ErrorObject, ValidateFunction } from 'ajv'
import { NextFunction, Request, Response } from 'express'
import _ from 'lodash'

import { ELogType } from '../../logger/constant'
import { Logger } from '../../logger/logger'
import { getRequestId } from '../../utils/logger.util'
import { ValidationError } from '../errors/validation.error'
import { RequestParts, requestPartToValidatedRequestPart } from '../utils/request.util'

export const formatError = (errors: ErrorObject[]): { [key: string]: string } => {
	return errors.reduce(
		(acc, error) => {
			const field = error.instancePath
				? error.instancePath.substring(1)
				: error.params?.missingProperty
			if (error.keyword !== 'anyOf') {
				if (Object.keys(acc).includes(field)) {
					acc[field] += `, ${error.params.allowedValue}`
				} else if (error.keyword === 'const') {
					acc[field] = `${error.message}, ${error.params.allowedValue}`
				} else {
					acc[field] = `${error.message}`
				}
			}
			return acc
		},
		{} as { [key: string]: string },
	)
}

export const validateRequest = (
	reqPartsValidator: Partial<Record<RequestParts, ValidateFunction>>,
	shouldLogError: boolean = true,
) => {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			let errorDetails: { [key: string]: string } = {}

			const keys = Object.keys(reqPartsValidator) as RequestParts[]

			keys.forEach((key) => {
				const validateFn = reqPartsValidator[key]!
				const deepClone = _.cloneDeep(req[key]) as object
				const isValid = validateFn(deepClone)
				if (!isValid) {
					errorDetails = { ...errorDetails, ...formatError(validateFn.errors || []) }
				}
				res.locals[requestPartToValidatedRequestPart[key]] = deepClone
			})

			if (!_.isEmpty(errorDetails)) {
				const err = new ValidationError(errorDetails)
				if (shouldLogError) {
					Logger.error(
						ELogType.APP_LOG,
						__filename,
						validateRequest.name,
						`${err.message}, details: ${JSON.stringify(err.details)}`,
						undefined,
						getRequestId(res),
					)
				}
				next(err)
			} else {
				next()
			}
		} catch (error) {
			next(error)
		}
	}
}
