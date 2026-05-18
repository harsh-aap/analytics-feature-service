import { AxiosRequestConfig } from 'axios'
import * as CircuitBreaker from 'opossum'

import { internalCodesType } from './internalCode.model'

export interface IFallbackResponse {
	data: string
}

export interface ICircuitBreakerRequestOptions extends CircuitBreaker.Options {
	onFallback?: (apiReq: AxiosRequestConfig, error: Error) => IFallbackResponse
	name: string
}

export interface IHeaderType {
	[key: string]: string
}

export enum HTTP_METHOD {
	GET = 'GET',
	POST = 'POST',
	PUT = 'PUT',
	DELETE = 'DELETE',
}

// FIXME - need to add internalCode in this interface and also add logic to retun the same
export interface IErrorResponseBody {
	message?: string
	details?: unknown
	internalCode?: internalCodesType
}

export interface IResponse {
	success: boolean
	error?: IErrorResponseBody
	data?: unknown
	status?: number
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	headers?: Record<string, any>
	internalCode?: string
	response?: unknown
	errorCode?: number | string
}

export interface IRetryConfig {
	attempts: number
	delayInMs: number
	multiple: number
}

export interface IRequestOptions {
	url: string
	body?: object
	headers?: IHeaderType
	params?: object
	breakerOptions?: ICircuitBreakerRequestOptions
	retry?: IRetryConfig
	timeout?: number
}
