import { inject, injectable } from 'inversify'
import { ELogType, Logger, RedisDb } from 'tst-base'

import { Connector } from './connector.interface'
import { config } from '../configs/config'
import { TYPES } from '../ioc/types'

@injectable()
export class RedisConnector implements Connector {
	@inject(TYPES.RedisDb)
	private readonly redisDb: RedisDb

	connect = async (): Promise<void> => {
		// Redis backs the idempotency cache. With $inc/$max upserts, replaying
		// a Kafka batch without dedup would silently double-count features —
		// so production should leave IDEMPOTENCY_ENABLED=true.
		if (!config.IDEMPOTENCY_ENABLED) {
			Logger.info(
				ELogType.REDIS_LOG,
				'redis.connector.ts',
				'connect',
				'Idempotency disabled, skipping Redis connection',
			)
			return
		}
		try {
			await this.redisDb.connect({
				mode: 'standalone',
				config: {
					socket: {
						host: config.REDIS.HOST,
						port: config.REDIS.PORT,
					},
					...(config.REDIS.PASSWORD ? { password: config.REDIS.PASSWORD } : {}),
					database: config.REDIS.DATABASE,
				},
			})
			Logger.info(ELogType.REDIS_LOG, 'redis.connector.ts', 'connect', 'Redis connected')
		} catch (err) {
			Logger.error(
				ELogType.REDIS_LOG,
				'redis.connector.ts',
				'connect',
				'Redis connection failed',
				err,
			)
			throw err
		}
	}

	disconnect = async (): Promise<void> => {
		if (!config.IDEMPOTENCY_ENABLED) return
		try {
			await this.redisDb.disconnect()
			Logger.info(
				ELogType.REDIS_LOG,
				'redis.connector.ts',
				'disconnect',
				'Redis disconnected',
			)
		} catch (err) {
			Logger.error(
				ELogType.REDIS_LOG,
				'redis.connector.ts',
				'disconnect',
				'Redis disconnection failed',
				err,
			)
			throw err
		}
	}

	isReady = async (): Promise<boolean> => {
		if (!config.IDEMPOTENCY_ENABLED) return true
		return this.redisDb.isReady()
	}
}
