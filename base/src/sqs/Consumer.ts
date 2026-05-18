import { Consumer as SQSConsumer } from 'sqs-consumer'

import { ELogType, Logger } from '../logger'
import { SQSClient } from './Client'
import { ConsumerConfig } from '../models/sqs.model'
import { baseConfig as defaultConfigs } from '../odin/baseConfig'

const FILENAME = 'sqs/Consumer.ts'

class Consumer {
	private sqs: SQSClient

	private consumers: SQSConsumer[] = [] // Will need to store map{queueName: consumer} if stop and start for individual consumers is needed

	/**
	 * Constructs an instance of the Consumer class.
	 * @param {SQSClient} sqs - An instance of the SQSClient.
	 */
	constructor(sqs: SQSClient) {
		this.sqs = sqs
	}

	/**
	 * Creates a consumer configuration object based on the provided consumerConfig.
	 * If a property is not provided in consumerConfig, it falls back to the default configuration.
	 *
	 * @param consumerConfig - The consumer configuration object.
	 * @returns The created consumer configuration object.
	 */
	// eslint-disable-next-line complexity
	private static createConfig(consumerConfig: ConsumerConfig): ConsumerConfig {
		const defaultConsumerConfig: ConsumerConfig = defaultConfigs.sqs_default_consumer_config
		return {
			messageAttributeNames: consumerConfig.messageAttributeNames ?? undefined,
			batchSize: consumerConfig.batchSize ?? defaultConsumerConfig.batchSize,
			visibilityTimeout:
				consumerConfig.visibilityTimeout ?? defaultConsumerConfig.visibilityTimeout,
			waitTimeSeconds:
				consumerConfig.waitTimeSeconds ?? defaultConsumerConfig.waitTimeSeconds,
			authenticationErrorTimeout:
				consumerConfig.authenticationErrorTimeout ??
				defaultConsumerConfig.authenticationErrorTimeout,
			pollingWaitTimeMs:
				consumerConfig.pollingWaitTimeMs ?? defaultConsumerConfig.pollingWaitTimeMs,
			pollingCompleteWaitTimeMs:
				consumerConfig.pollingCompleteWaitTimeMs ??
				defaultConsumerConfig.pollingCompleteWaitTimeMs,
			terminateVisibilityTimeout:
				consumerConfig.terminateVisibilityTimeout ??
				defaultConsumerConfig.terminateVisibilityTimeout,
			heartbeatInterval:
				consumerConfig.heartbeatInterval ?? defaultConsumerConfig.heartbeatInterval,
			handleMessageTimeout:
				consumerConfig.handleMessageTimeout ?? defaultConsumerConfig.handleMessageTimeout,
			shouldDeleteMessages:
				consumerConfig.shouldDeleteMessages ?? defaultConsumerConfig.shouldDeleteMessages,
			alwaysAcknowledge:
				consumerConfig.alwaysAcknowledge ?? defaultConsumerConfig.alwaysAcknowledge,
			...(Object.hasOwn(consumerConfig, 'handleMessage') && {
				handleMessage: consumerConfig.handleMessage,
			}),
			...(Object.hasOwn(consumerConfig, 'handleMessageBatch') && {
				handleMessageBatch: consumerConfig.handleMessageBatch,
			}),
			messageSystemAttributeNames: consumerConfig.messageSystemAttributeNames ?? undefined,
		}
	}

	/**
	 * Adds event listeners to the SQS consumer.
	 *
	 * @param consumer - The SQS consumer instance.
	 */
	private static addEventListeners(consumer: SQSConsumer): void {
		consumer.on('error', (err, message) => {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'addEventListeners',
				`Error: ${err} on message: ${JSON.stringify(message)}`,
			)
			if (consumer.status.isRunning === false) {
				consumer.start()
			}
		})

		consumer.on('processing_error', (err, message) => {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'addEventListeners',
				`Processing error: ${err} on message: ${JSON.stringify(message)}`,
			)
			if (consumer.status.isRunning === false) {
				consumer.start()
			}
		})

		consumer.on('timeout_error', (err, message) => {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'addEventListeners',
				`Timeout error: ${err} on message: ${JSON.stringify(message)}`,
			)
			if (consumer.status.isRunning === false) {
				consumer.start()
			}
		})

		consumer.on('started', () => {
			Logger.debug(ELogType.SQS_LOG, FILENAME, 'addEventListeners', `Consumer started`)
		})

		consumer.on('stopped', () => {
			Logger.debug(ELogType.SQS_LOG, FILENAME, 'addEventListeners', `Consumer stopped`)
		})
	}

	/**
	 * Subscribes to the specified queue.
	 * @param {string} queueName - The name of the queue.
	 * @param {ConsumerConfig} consumerConfig - The configuration for the consumer.
	 * @returns A promise that resolves when subscription is successful.
	 */
	async subscribe(queueName: string, consumerConfig: ConsumerConfig): Promise<void> {
		try {
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'subscribe',
				`Subscribing to queue: ${queueName}`,
			)
			if (!consumerConfig.handleMessage && !consumerConfig.handleMessageBatch) {
				throw new Error('Either handleMessage or handleMessageBatch must be provided')
			}
			const queueUrl = await this.sqs.getQueueURL(queueName)
			const config = Consumer.createConfig(consumerConfig)
			const consumer = SQSConsumer.create({
				...config,
				queueUrl,
				sqs: this.sqs.client,
			})

			Consumer.addEventListeners(consumer)

			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'subscribe',
				`Subscribed to queue: ${queueName}`,
			)
			this.consumers.push(consumer)
		} catch (err) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'subscribe',
				`Error subscribing to queue: ${queueName}`,
				err,
			)
			throw err
		}
	}

	/**
	 * Starts all the subscribed consumers.
	 * @returns A promise that resolves when all the consumers are started.
	 */
	public async startConsumers(): Promise<void> {
		try {
			Logger.debug(ELogType.SQS_LOG, FILENAME, 'startConsumers', `Starting consumers`)
			Promise.all(
				this.consumers.map((consumer) => {
					if (!consumer.status.isRunning) {
						return consumer.start()
					}
					return null
				}),
			)
			Logger.debug(ELogType.SQS_LOG, FILENAME, 'startConsumers', `Started consumers`)
		} catch (err) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'startConsumers',
				`Error starting consumers`,
				err,
			)
			throw err
		}
	}

	/**
	 * Stops all the consumers.
	 * @returns A promise that resolves when all the consumers are stopped.
	 */
	public async stopConsumers(): Promise<void> {
		try {
			Logger.debug(ELogType.SQS_LOG, FILENAME, 'stopConsumers', `Stopping consumers`)
			await Promise.all(
				this.consumers.map((consumer) => {
					return consumer.stop()
				}),
			)
			Logger.debug(ELogType.SQS_LOG, FILENAME, 'stopConsumers', `Stopped consumers`)
		} catch (err) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'stopConsumers',
				`Error stopping consumers`,
				err,
			)
			throw err
		}
	}

	/**
	 * Returns the status of the consumers.
	 * @returns A promise that resolves with the status of the consumers.
	 */
	public async stats(): Promise<{
		total: number
		running: number
		stopped: number
		polling: number
	}> {
		try {
			Logger.debug(ELogType.SQS_LOG, FILENAME, 'stats', `Getting consumer stats`)
			const stats = {
				total: this.consumers.length,
				running: 0,
				stopped: 0,
				polling: 0,
			}
			this.consumers.forEach((consumer) => {
				if (consumer.status.isRunning) {
					stats.running += 1
					if (consumer.status.isPolling) {
						stats.polling += 1
					}
				} else {
					stats.stopped += 1
				}
			})
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'stats',
				`Got consumer stats, ${JSON.stringify(stats)}`,
			)
			return stats
		} catch (err) {
			Logger.error(ELogType.SQS_LOG, FILENAME, 'stats', `Error getting consumer stats`, err)
			throw err
		}
	}

	isReady(): boolean {
		return this.consumers.every((consumer) => consumer.status.isRunning)
	}
}

export { Consumer }
