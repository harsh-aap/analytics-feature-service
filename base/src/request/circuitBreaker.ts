import { AxiosRequestConfig } from 'axios'
import * as lodash from 'lodash'
import CircuitBreaker from 'opossum'

import { tstAxios } from './tstAxios'
import { ELogType, Logger } from '../logger'
import { ICircuitBreakerRequestOptions, IFallbackResponse } from '../models/request.model'
import { Odin } from '../odin/Odin'

type ICircuitBreakerInstance = {
	breaker: CircuitBreaker
	breakerOptions: CircuitBreaker.Options
}

const circuitBreakerRegistry: Map<string, ICircuitBreakerInstance> = new Map()

const defaultFallbackResponse = (): IFallbackResponse => {
	return {
		data: 'Sorry, the request could not be fulfilled right now. Kindly try after sometime',
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const axiosRequestWrapper = async (requestOptions: AxiosRequestConfig): Promise<any> => {
	const axiosConfig: AxiosRequestConfig = {
		method: requestOptions?.method,
		url: requestOptions?.url,
	}
	if (requestOptions?.data) {
		axiosConfig.data = requestOptions.data
	}
	if (requestOptions?.params) {
		axiosConfig.timeout = requestOptions.params
	}
	if (requestOptions?.headers) {
		axiosConfig.headers = requestOptions.headers
	}
	if (requestOptions?.timeout) {
		axiosConfig.timeout = requestOptions.timeout
	}
	const response = await tstAxios.getAxiosInstance()(axiosConfig)
	return response
}

enum CircuitBreakerStates {
	CLOSED = 'closed',
	OPEN = 'open',
	HALF_OPEN = 'halfOpen',
	WARMING_UP = 'warmingUp',
	SHUT_DOWN = 'shutDown',
}

const updateCircuitBreakerRegistry = (name: string, config: ICircuitBreakerInstance): void => {
	circuitBreakerRegistry.set(name, config)
}

const logCircuitBreakerStateChange = (name: string, state: CircuitBreakerStates): void => {
	const message = `Circuit Breaker ${name} changed state to ${state}`
	if (state === CircuitBreakerStates.OPEN) {
		Logger.error(
			ELogType.CIRCUIT_BREAKER_LOG,
			'CircuitBreaker.ts',
			'logCircuitBreakerStateChange',
			message,
		)
	} else {
		Logger.info(
			ELogType.CIRCUIT_BREAKER_LOG,
			'CircuitBreaker.ts',
			'logCircuitBreakerStateChange',
			message,
		)
	}
}

const retrieveCircuitBreaker = (name: string): CircuitBreaker => {
	const defaultCircuitBreakerConfig: CircuitBreaker.Options = Odin.getValue('CB_CONFIG') || {
		timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
		errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
		resetTimeout: 3000, // After 30 seconds, try again.
	}
	const circuitBreakerInstance = circuitBreakerRegistry.get(name)

	if (circuitBreakerInstance) {
		return circuitBreakerInstance.breaker
	}

	const breaker = new CircuitBreaker(axiosRequestWrapper, defaultCircuitBreakerConfig)
	breaker.on('open', () => logCircuitBreakerStateChange(name, CircuitBreakerStates.OPEN))
	breaker.on('close', () => logCircuitBreakerStateChange(name, CircuitBreakerStates.CLOSED))
	breaker.on('halfOpen', () => logCircuitBreakerStateChange(name, CircuitBreakerStates.HALF_OPEN))
	updateCircuitBreakerRegistry(name, {
		breaker,
		breakerOptions: defaultCircuitBreakerConfig,
	})

	return breaker
}

export const executeCircuitBreakerRequest = async (
	req: AxiosRequestConfig,
	breaker: ICircuitBreakerRequestOptions,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
	const requestUrl = req.url || ''
	if (lodash.isEmpty(requestUrl)) {
		throw Error('Request URL is required')
	}
	const breakerName = breaker.name || requestUrl
	const circuitBreaker = retrieveCircuitBreaker(breakerName)
	if (breaker.onFallback) {
		circuitBreaker.fallback((apiReq: AxiosRequestConfig, error: Error) => {
			if (breaker.onFallback) {
				breaker.onFallback(apiReq, error)
			}
		})
	} else {
		circuitBreaker.fallback(defaultFallbackResponse)
	}
	return circuitBreaker.fire(req)
}
