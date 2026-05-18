export interface IZKConfig {
	maxRetries: number
	promiseTimeout: number
	timeoutInterval: number
	zkConnectionString: string
}

export enum EPropLevel {
	BASE = 0,
	SERVICE = 1,
	BASE_ZK = 2,
	SERVICE_ZK = 3,
}
