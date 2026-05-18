import { AxiosRequestConfig } from 'axios'
import { backOff } from 'exponential-backoff'
import { StatusCodes } from 'http-status-codes'
import _ from 'lodash'

import { executeCircuitBreakerRequest } from './circuitBreaker'
import { AxiosCustomError, tstAxios } from './tstAxios'
import { ApiError } from '../api'
import { ELogType, Logger } from '../logger'
import {
	HTTP_METHOD,
	ICircuitBreakerRequestOptions,
	IRequestOptions,
	IResponse,
} from '../models/request.model'

const executeRequest = async (
	axiosRequestOptions: AxiosRequestConfig,
	breakerOptions?: ICircuitBreakerRequestOptions,
): Promise<IResponse> => {
	try {
		const axiosInstance = tstAxios.getAxiosInstance()
		const response = !_.isEmpty(breakerOptions)
			? await executeCircuitBreakerRequest(axiosRequestOptions, breakerOptions)
			: await axiosInstance(axiosRequestOptions)

		return {
			success: response.data?.success,
			data: response.data?.data,
			error: response.data?.error,
			status: response.status,
			headers: response.headers,
			response: response.data,
		}
	} catch (error: unknown) {
		if (error instanceof AxiosCustomError) {
			const errorCode = error.data?.code || error.context?.data?.code
			Logger.debug(
				ELogType.HTTP_API_LOG,
				'',
				'executeRequest',
				`Request failed: ${axiosRequestOptions.url} error: ${JSON.stringify(error.context)} code: ${errorCode}`,
				error,
			)
			return {
				success: error.data?.success,
				data: error.data?.data,
				error: error.data?.error,
				status: error.status,
				headers: error.headers,
				errorCode,
			}
		}
		Logger.error(
			ELogType.HTTP_API_LOG,
			'',
			'executeRequest',
			`Request failed: ${axiosRequestOptions.url}`,
			error,
		)
		return {
			success: false,
			data: {},
			error: { message: 'Oops!, Something went wrong', details: error },
			status: StatusCodes.INTERNAL_SERVER_ERROR,
		}
	}
}

const tstRequest = async (
	requestOptions: IRequestOptions,
	reqType: HTTP_METHOD,
): Promise<IResponse> => {
	const {
		url,
		body,
		headers = {},
		params = {},
		retry = { attempts: 0, delayInMs: 1000, multiple: 1 },
		breakerOptions,
		timeout = 10000,
	} = requestOptions
	const axiosRequestOptions: AxiosRequestConfig = {
		url,
		method: reqType,
		data: body,
		headers,
		timeout,
		params,
	}

	if (retry.attempts > 0) {
		return backOff(() => executeRequest(axiosRequestOptions, breakerOptions), {
			numOfAttempts: retry.attempts,
			startingDelay: retry.delayInMs,
			timeMultiple: retry.multiple,
			jitter: 'full',
		})
	}
	return executeRequest(axiosRequestOptions, breakerOptions)
}

export const postRequest = async (requestOptions: IRequestOptions): Promise<IResponse> => {
	try {
		const response: IResponse = await tstRequest(requestOptions, HTTP_METHOD.POST)
		return response
	} catch (error) {
		Logger.error(
			ELogType.HTTP_API_LOG,
			'',
			'postRequest',
			`Request failed: ${requestOptions.url}`,
			error,
		)
		throw error
	}
}

export const getRequest = async (requestOptions: IRequestOptions): Promise<IResponse> => {
	try {
		const response: IResponse = await tstRequest(requestOptions, HTTP_METHOD.GET)
		return response
	} catch (error) {
		Logger.error(
			ELogType.HTTP_API_LOG,
			'',
			'getRequest',
			`Request failed: ${requestOptions.url}`,
			error,
		)
		throw new ApiError('Request failed', StatusCodes.INTERNAL_SERVER_ERROR, undefined, error)
	}
}

export const putRequest = async (requestOptions: IRequestOptions): Promise<IResponse> => {
	try {
		const response: IResponse = await tstRequest(requestOptions, HTTP_METHOD.PUT)
		return response
	} catch (error) {
		Logger.error(
			ELogType.HTTP_API_LOG,
			'',
			'putRequest',
			`Request failed: ${requestOptions.url}`,
			error,
		)
		throw new ApiError('Request failed', StatusCodes.INTERNAL_SERVER_ERROR, undefined, error)
	}
}

export const deleteRequest = async (requestOptions: IRequestOptions): Promise<IResponse> => {
	try {
		const response: IResponse = await tstRequest(requestOptions, HTTP_METHOD.DELETE)
		return response
	} catch (error) {
		Logger.error(
			ELogType.HTTP_API_LOG,
			'',
			'deleteRequest',
			`Request failed: ${requestOptions.url}`,
			error,
		)
		throw new ApiError('Request failed', StatusCodes.INTERNAL_SERVER_ERROR, undefined, error)
	}
}
