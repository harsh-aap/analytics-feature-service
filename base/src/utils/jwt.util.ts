import { Request, Response } from 'express'
import _ from 'lodash'

import { getRequestId } from './logger.util'
import { AuthConstants } from '../constants'
import {
	FORWARDED_FOR_HEADER,
	REQUEST_ID_HEADER,
	TOAST_HEADER_PREFIX,
} from '../constants/baseConfig.constant'

export const setAuthHeader = (res: Response, token: string): void => {
	res.set(AuthConstants.AUTHORIZATION_HEADER_KEY, `${AuthConstants.BEARER} ${token}`)
}

export const getAuthToken = (req: Request): string => {
	if (!req.headers?.authorization) {
		return ''
	}
	const authHeader = String(req.headers?.authorization)
	if (!authHeader) {
		return ''
	}
	const splittedAuthHeader = authHeader.split(' ')

	return _.get(splittedAuthHeader, ['1'], '')
}
export type AccType = Record<string, string>

export const getContextAsHeader = <JWTModel>(
	context: JWTModel,
	model: Record<string, string>,
	metaHeaders?: Record<string, string>,
): AccType => {
	const headerKeys = Object.keys(model)
	const headers: AccType = {}
	_.reduce(
		headerKeys,
		(requestHeader, headerKey) => {
			if (context[headerKey as keyof JWTModel]) {
				const formattedHeaderKey = _.toLower(`${TOAST_HEADER_PREFIX}${headerKey}`)
				// eslint-disable-next-line no-param-reassign
				requestHeader[formattedHeaderKey] = _.toString(context[headerKey as keyof JWTModel])
			}

			return requestHeader
		},
		headers,
	)
	if (!_.isEmpty(metaHeaders)) {
		return { ...headers, ...metaHeaders }
	}
	return headers
}

export const getXForwardedForFromRequest = (req: Request): string => {
	return (req.headers && (req.headers['x-forwarded-for'] as string)) || ''
}

export const getMetaHeaders = (req: Request, res: Response): Record<string, string> => {
	const requestId = getRequestId(res)
	const forwardedHeader = getXForwardedForFromRequest(req)
	return { [REQUEST_ID_HEADER]: requestId, [FORWARDED_FOR_HEADER]: forwardedHeader }
}

export const getTokenAsHeader = (token: string): Record<string, string> => {
	return { [AuthConstants.AUTHORIZATION_HEADER_KEY]: `Bearer ${token}` }
}

/*
const appHeaders = getContextAsHeader<IAppJWTModel>(appContext, APP_JWT_MODEL)
const gameHeaders = getContextAsHeader<IGameJWTModel>(
	gameContext,
	GAME_JWT_MODEL,
)
*/
