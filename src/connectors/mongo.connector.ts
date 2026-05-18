import { inject, injectable } from 'inversify'
import { MongoDb } from 'tst-base'

import { Connector } from './connector.interface'
import { config } from '../configs/config'
import { TYPES } from '../ioc/types'
import { AppLogger } from '../utils/logger.util'

const logger = AppLogger(__filename)

/**
 * Wraps tst-base's MongoDb with feature-service-specific config.
 *
 * The pool sizing matters: each consumed event triggers exactly one upsert,
 * so peak Mongo concurrency = MAX_IN_FLIGHT × number of running pods. Set
 * MONGO_MAX_POOL accordingly to avoid head-of-line blocking on the driver.
 */
@injectable()
export class MongoConnector implements Connector {
	@inject(TYPES.MongoDb)
	private readonly mongoDb: MongoDb

	connect = async (): Promise<void> => {
		try {
			await this.mongoDb.connect(
				{
					host: config.MONGO.HOST,
					port: config.MONGO.PORT,
					database: config.MONGO.DATABASE,
					user: config.MONGO.USER,
					password: config.MONGO.PASSWORD,
				},
				{
					minPoolSize: config.MONGO.MIN_POOL,
					maxPoolSize: config.MONGO.MAX_POOL,
					// DocumentDB does not support retryable writes — must be false.
					retryWrites: false,
				},
			)
			logger.info(
				'connect',
				`Mongo connected at ${config.MONGO.HOST}:${config.MONGO.PORT}/${config.MONGO.DATABASE} (pool=${config.MONGO.MIN_POOL}-${config.MONGO.MAX_POOL})`,
			)
		} catch (err) {
			logger.error('connect', 'Mongo connection failed', err)
			throw err
		}
	}

	disconnect = async (): Promise<void> => {
		try {
			await this.mongoDb.disconnect()
			logger.info('disconnect', 'Mongo disconnected')
		} catch (err) {
			logger.error('disconnect', 'Mongo disconnection failed', err)
			throw err
		}
	}

	isReady = async (): Promise<boolean> => {
		try {
			return await this.mongoDb.isReady()
		} catch {
			return false
		}
	}
}
