import { RedisClientOptions, RedisClusterOptions, createClient } from 'redis'

import { ELogType, Logger } from '../../logger'
import { IRedisClient } from '../../models/redis.model'

type clientOptions = {
	mode: 'standalone'
	config: RedisClientOptions
}
type clusterOptions = {
	mode: 'cluster'
	config: RedisClusterOptions
}

export type redisOptions = clientOptions | clusterOptions

export class RedisDb {
	private client: IRedisClient

	connect = async (options: redisOptions): Promise<void> => {
		try {
			if (options.mode === 'cluster') {
				throw new Error('not implemented')
			}
			this.client = createClient(options.config)

			this.client.on('ready', () => {
				Logger.info(ELogType.REDIS_LOG, 'RedisDB', 'connect', 'Redis Client Ready')
			})

			this.client.on('error', (error) => {
				Logger.error(ELogType.REDIS_LOG, 'RedisDB', 'connect', 'Redis Client error', error)
			})
			await this.client.connect()
		} catch (error) {
			Logger.error(
				ELogType.REDIS_LOG,
				'RedisDB',
				'connect',
				'Failed to connect to Redis',
				error,
			)
			throw error
		}
	}

	getRedis = (): IRedisClient => {
		if (!this.client) {
			throw new Error('Redis client not initialized')
		}
		return this.client
	}

	duplicate = (): IRedisClient => {
		return this.getRedis().duplicate()
	}

	disconnect = async (): Promise<void> => {
		if (this.client) {
			await this.client.quit()
		}
	}

	isReady = async (): Promise<boolean> => {
		try {
			if (!this.client) {
				return false
			}
			const ping = await this.client.ping()
			return ping === 'PONG'
		} catch {
			return false
		}
	}
}
