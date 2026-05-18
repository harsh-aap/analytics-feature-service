// eslint-disable-next-line max-classes-per-file
import axios, { AxiosError, AxiosInstance } from 'axios'

interface errorContext {
	message: string

	url?: string

	method?: string

	status?: number

	statusText?: string

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data?: { [key: string]: any }

	headers?: { [key: string]: string }
	errorName: string
}
export class AxiosCustomError extends Error {
	message: string

	url?: string

	method?: string

	status?: number

	statusText?: string

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data?: { [key: string]: any }

	headers?: { [key: string]: string }

	errorName: string

	error: unknown

	constructor(
		public context: errorContext,
		error: unknown,
	) {
		super(context.message)
		this.message = context.message
		this.url = context.url
		this.method = context.method
		this.status = context.status
		this.statusText = context.statusText
		this.data = context.data
		this.headers = context.headers
		this.errorName = context.errorName
		this.error = error
	}
}
export const mapCustomAxiosError = (error: unknown): AxiosCustomError | unknown => {
	if (error instanceof AxiosError) {
		// Extract relevant information from the AxiosError
		const { response, message, config } = error
		const logInfo: errorContext = {
			message,
			url: config?.url,
			method: config?.method,
			status: response?.status,
			statusText: response?.statusText,
			data: response?.data,
			headers: error.config?.headers,
			errorName: error.name,
		}
		return new AxiosCustomError(logInfo, error)
	}
	return error
}

class TStAxios {
	private axiosInstance: AxiosInstance

	constructor() {
		this.axiosInstance = axios.create({
			timeout: 5000,
			headers: {
				'Content-Type': 'application/json',
			},
		})
		this.axiosInstance.interceptors.response.use(
			(response) => {
				return response
			},
			(error) => {
				const customError = mapCustomAxiosError(error)
				return Promise.reject(customError)
			},
		)
	}

	getAxiosInstance(): AxiosInstance {
		return this.axiosInstance as AxiosInstance
	}
}

export const tstAxios = new TStAxios()
