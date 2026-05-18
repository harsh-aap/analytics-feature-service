import * as Redis from 'ioredis'
import { createClient } from 'redis'

export interface PipelineMap {
	start: number
	end: number
	pipeline: Redis.Pipeline
	keys: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValueType = string | Buffer | number | any[]

export type RedisCommandArg = [string, ValueType[]]

export interface IRedisServer {
	port: number
	host: string
	password: string
}
export interface IRedisConfig extends IRedisServer {
	clusterEnabled: boolean
	cluster: IRedisServer[]
	db: number
	prefix: string
	authEnabled: boolean
}

export interface redlockConfig {
	driftFactor: number
	retryCount: number
	retryDelay: number
	retryJitter: number
}

export type RedisConfig = {
	clusterEnabled: boolean
	cluster: Redis.ClusterNode[]
	host: string
	port: number
	password: string
	db: number
	prefix: string
	authEnabled: boolean
	readOnly?: boolean
}

export type IRedisClient = ReturnType<typeof createClient>

export interface RedisJSONArray extends Array<RedisJSON> {}
export interface RedisJSONObject {
	[key: string]: RedisJSON
	[key: number]: RedisJSON
}
export type RedisJSON = null | boolean | number | string | Date | RedisJSONArray | RedisJSONObject
type Types = string | number
export type H_SETObject = Record<string | number, Types>
