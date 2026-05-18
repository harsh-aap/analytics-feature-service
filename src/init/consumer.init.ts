/* eslint-disable max-statements */
import { inject, injectable } from 'inversify'
import { CacheContext, getIsoTimestamp, signalHandler } from 'tst-base'

import { startExpress, stopExpress } from './express'
import { initializeLogger } from './logger.init'
import { config } from '../configs/config'
import { Connector } from '../connectors/connector.interface'
import { KafkaConnector } from '../connectors/kafka.connector'
import { MongoConnector } from '../connectors/mongo.connector'
import { OdinConnector } from '../connectors/odin.connector'
import { RedisConnector } from '../connectors/redis.connector'
import { setUpBindings } from '../ioc/bindings'
import { container } from '../ioc/container'
import { TYPES } from '../ioc/types'
import { FeatureConsumer } from '../module/feature/async/consumer'
import { FeatureRepository } from '../module/feature/repositories/feature.repository'
import { AppLogger } from '../utils/logger.util'

const logger = AppLogger(__filename)

@injectable()
export class Consumer {
	@inject(TYPES.FeatureConsumer)
	private readonly featureConsumer: FeatureConsumer

	@inject(TYPES.FeatureRepository)
	private readonly featureRepo: FeatureRepository

	@inject(TYPES.OdinConnector)
	private readonly odinConnector: OdinConnector

	@inject(TYPES.KafkaConnector)
	private readonly kafkaConnector: KafkaConnector

	@inject(TYPES.RedisConnector)
	private readonly redisConnector: RedisConnector

	@inject(TYPES.MongoConnector)
	private readonly mongoConnector: MongoConnector

	@inject(TYPES.CacheContext)
	private readonly cacheContext: CacheContext

	private connectors: Connector[]

	static async init(): Promise<void> {
		setUpBindings(container)
		container.bind(Consumer).toSelf()
		const consumer = container.get(Consumer)
		await consumer.setup()

		signalHandler(consumer.teardown.bind(consumer))
	}

	private async setup(): Promise<void> {
		try {
			initializeLogger()
			logger.info('setup', 'Starting feature-service setup')

			// Odin must come first so subsequent config reads see zk values.
			await this.odinConnector.connect()

			this.connectors = [this.kafkaConnector, this.mongoConnector, this.redisConnector]
			await Promise.all(this.connectors.map((c) => c.connect()))

			// Bring the cache context online if idempotency is on. The
			// IdempotencyService short-circuits when the flag is off so we
			// only pay this cost when needed.
			if (config.IDEMPOTENCY_ENABLED) {
				this.cacheContext.passRedisDb(container.get(TYPES.RedisDb))
			}

			// Indexes are idempotent — running this on every boot is the
			// cheapest way to keep the schema in sync with code.
			await this.featureRepo.ensureIndexes()

			await startExpress([...this.connectors, this.odinConnector])
			await this.featureConsumer.start()

			logger.info('setup', 'feature-service setup complete')
		} catch (err) {
			try {
				logger.error('setup', 'feature-service setup failed', err)
			} catch (loggingErr) {
				// eslint-disable-next-line no-console
				console.error(`[${getIsoTimestamp()}] Error in setup`, err)
				// eslint-disable-next-line no-console
				console.error(`[${getIsoTimestamp()}] Error logging in setup`, loggingErr)
			} finally {
				process.exit(1)
			}
		}
	}

	/**
	 * Graceful shutdown:
	 *  1. Close Express health server (k8s starts routing traffic away).
	 *  2. Disconnect Kafka consumer (stops accepting new messages).
	 *  3. Wait a grace period for in-flight upserts to drain.
	 *  4. Disconnect remaining connectors (Mongo, Redis, Odin).
	 */
	private async teardown(): Promise<void> {
		await stopExpress(async () => {
			logger.info('teardown', 'health server closed, draining consumer')

			try {
				logger.info('teardown', 'disconnecting Kafka consumer')
				await this.kafkaConnector.disconnect()

				const gracePeriodMs = 20_000
				logger.info(
					'teardown',
					`waiting ${gracePeriodMs}ms for in-flight upserts to settle`,
				)
				await new Promise<void>((resolve) => {
					setTimeout(() => resolve(), gracePeriodMs)
				})

				const remaining = this.connectors.filter((c) => c !== this.kafkaConnector)
				await Promise.allSettled(
					remaining.map(async (c) => {
						try {
							await c.disconnect()
						} catch (err) {
							logger.error(
								'teardown',
								`error disconnecting ${c.constructor.name}`,
								err,
							)
						}
					}),
				)

				this.odinConnector.disconnect()
				logger.info('teardown', 'graceful shutdown complete')
			} catch (err) {
				logger.error('teardown', 'error during graceful shutdown', err)
				throw err
			}
		})
	}
}

Consumer.init().catch((err) => {
	// eslint-disable-next-line no-console
	console.error('Failed to start feature-service:', err)
	process.exit(1)
})
