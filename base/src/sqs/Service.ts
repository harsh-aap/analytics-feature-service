import { ChangeMessageVisibilityCommandOutput, MessageAttributeValue } from '@aws-sdk/client-sqs'

import { SQSClient, SQSClientConfig } from './Client'
import { Consumer } from './Consumer'
import { getDLQName, getQueueName } from './helper'
import { Producer } from './Producer'
import { ELogType, Logger } from '../logger'
import { ConsumerConfig, QueueAndDLQ } from '../models/sqs.model'

const FILENAME = 'sqs/service.ts'

/**
 * SQSService is a singleton class that manages AWS SQS operations.
 */
export class SQSService {
	private static sqs: SQSClient

	private static producer: Producer

	private static consumer: Consumer

	private static serviceName: string

	/**
	 * Initializes the SQSService instance.
	 * @param {SQSClientConfig} clientConfig - The configuration for the SQS client.
	 * @param {boolean} initializeConsumer - Whether to initialize the consumer.
	 * @param {boolean} initializeProducer - Whether to initialize the producer.
	 */
	static initializeService(
		clientConfig: SQSClientConfig,
		serviceName: string,
		initializeConsumer: boolean,
		initializeProducer: boolean,
	): void {
		if (!SQSService.sqs) {
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'initializeService',
				`Initializing SQS service with clientConfig: ${JSON.stringify(clientConfig)}`,
			)
			SQSService.sqs = new SQSClient(clientConfig)
			SQSService.serviceName = serviceName
			if (initializeProducer && !SQSService.producer) {
				SQSService.producer = new Producer(SQSService.sqs)
			}
			if (initializeConsumer && !SQSService.consumer) {
				SQSService.consumer = new Consumer(SQSService.sqs)
			}
		} else {
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'initializeService',
				`SQS service already initialized. Returning existing instance.`,
			)
		}
	}

	/**
	 * Disconnects the SQSService instance and cleans up resources.
	 * @returns {Promise<void>}
	 */
	static async disconnect(): Promise<void> {
		try {
			Logger.debug(ELogType.SQS_LOG, FILENAME, 'disconnect', 'Disconnecting SQS service')

			if (SQSService.consumer) {
				await SQSService.consumer.stopConsumers()
				Logger.debug(
					ELogType.SQS_LOG,
					FILENAME,
					'disconnect',
					'SQS consumer stopped and nullified',
				)
			}

			if (SQSService.producer) {
				await SQSService.producer.close()
				Logger.debug(
					ELogType.SQS_LOG,
					FILENAME,
					'disconnect',
					'SQS producer closed and nullified',
				)
			}

			if (SQSService.sqs) {
				SQSService.sqs.client.destroy()
				Logger.debug(
					ELogType.SQS_LOG,
					FILENAME,
					'disconnect',
					'SQS client destroyed and nullified',
				)
			}

			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'disconnect',
				'SQS service disconnected successfully',
			)
		} catch (error) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'disconnect',
				`Error disconnecting SQS service: ${(error as Error).message}`,
			)
			throw error
		}
	}

	/**
	 * Fetches the specified queues.
	 * @param {String[]} queueNames - The queue names to fetch.
	 * @returns {Promise<String[]>} A promise that resolves with queue urls on success.
	 */
	public static getQueueUrls = async (queueNames: string[]): Promise<string[]> => {
		if (!SQSService.sqs) {
			throw new Error(
				'SQS service not initialized. Please initialize the service before fetching queues.',
			)
		}
		try {
			return await Promise.all(
				queueNames.map((queueName) =>
					SQSService.sqs.getQueueURL(getQueueName(SQSService.serviceName, queueName)),
				),
			)
		} catch (error) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'getQueueUrls',
				`Error fetching queues ${queueNames.length > 0 && queueNames.toString()}`,
				error,
			)
			throw error
		}
	}

	/**
	 * Creates the specified queues and their corresponding dead-letter queues.
	 * @param {QueueAndDLQ[]} queues - The queues to create.
	 * @param {string} serviceName - The name of the service using SQSService.
	 * @returns {Promise<void>} A promise that resolves when all queues are created.
	 */
	static createQueues = async (queues: QueueAndDLQ[]): Promise<void> => {
		if (!SQSService.sqs) {
			throw new Error(
				'SQS service not initialized. Please initialize the service before creating queues.',
			)
		}
		try {
			await Promise.all(
				queues.map(async (queue) => {
					const queueName = getQueueName(SQSService.serviceName, queue.actionName)
					Logger.debug(
						ELogType.SQS_LOG,
						FILENAME,
						'createQueues',
						`Creating queue ${queueName}`,
					)
					await SQSService.sqs.createQueue({
						QueueName: queueName,
						Attributes: queue.queueAttributes,
					})
					Logger.debug(
						ELogType.SQS_LOG,
						FILENAME,
						'createQueues',
						`Created queue ${queueName}`,
					)

					if (queue.shouldCreateDLQ) {
						const DLQName = getDLQName(SQSService.serviceName, queue.actionName)
						Logger.debug(
							ELogType.SQS_LOG,
							FILENAME,
							'createQueues',
							`Creating DLQ ${DLQName} for queue ${queueName}`,
						)
						await SQSService.sqs.createQueue({
							QueueName: DLQName,
							Attributes: queue.DLQAttributes,
						})
						Logger.debug(
							ELogType.SQS_LOG,
							FILENAME,
							'createQueues',
							`Created DLQ ${DLQName} for queue ${queueName}`,
						)

						Logger.debug(
							ELogType.SQS_LOG,
							FILENAME,
							'createQueues',
							`Attaching DLQ ${DLQName} to queue ${queueName} with maxReceiveCount ${queue.maxReceiveCount}`,
						)
						await SQSService.sqs.attachDLQToSourceQueue(
							DLQName,
							queueName,
							queue.maxReceiveCount,
						)
						Logger.debug(
							ELogType.SQS_LOG,
							FILENAME,
							'createQueues',
							`Attached DLQ ${DLQName} to queue ${queueName} with maxReceiveCount ${queue.maxReceiveCount}`,
						)
					}
				}),
			)
		} catch (error) {
			Logger.error(ELogType.SQS_LOG, FILENAME, 'createQueues', `Error creating queues`, error)
			throw error
		}
	}

	/**
	 * Publishes a message to the specified queue.
	 * @param {string} actionName - The name of the queue.
	 * @param {string} message - The message to publish.
	 * @param {Record<string, MessageAttributeValue>} messageAttributes - The message metadata to publish, e.g., requestId.
	 * @returns {Promise<void>} A promise that resolves when the message is published.
	 */
	static async publishMessage(
		actionName: string,
		message: string,
		messageAttributes: Record<string, MessageAttributeValue>,
	): Promise<void> {
		const queueName = getQueueName(SQSService.serviceName, actionName)
		try {
			if (!SQSService.producer) {
				throw new Error(
					'Producer not initialized. Please initialize the producer before publishing message.',
				)
			}
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'publishMessage',
				`Publishing message to: ${queueName}`,
			)
			await SQSService.producer.publishMessage(queueName, message, messageAttributes)
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'publishMessage',
				`Published message to: ${queueName} successfully`,
			)
		} catch (error) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'publishMessage',
				`Error in publishing message to: ${queueName}`,
				error,
			)
			throw error
		}
	}

	/**
	 * Publishes multiple messages to the specified queue.
	 * @param {string} actionName - The name of the queue.
	 * @param {string[]} messages - The messages to publish.
	 * @returns {Promise<void>} A promise that resolves when all messages are published.
	 */
	static async publishMessageBatch(actionName: string, messages: string[]): Promise<void> {
		const queueName = getQueueName(SQSService.serviceName, actionName)
		try {
			if (!SQSService.producer) {
				throw new Error(
					'Producer not initialized. Please initialize the producer before publishing messages.',
				)
			}
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'publishMessageBatch',
				`Publishing ${messages.length} messages to: ${queueName}`,
			)
			await SQSService.producer.publishMessageBatch(queueName, messages)
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'publishMessageBatch',
				`Published ${messages.length} messages to: ${queueName} successfully`,
			)
		} catch (error) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'publishMessageBatch',
				`Error in publishing ${messages.length} messages to: ${queueName}`,
				error,
			)
			throw error
		}
	}

	/**
	 * Subscribes to a given queue with the provided consumer configuration.
	 * @param {string} queueName - The name of the queue to subscribe to.
	 * @param {ConsumerConfig} consumerConfig - The configuration for the consumer.
	 * @throws {Error} If an error occurs during subscription.
	 * @returns {Promise<void>} A promise that resolves when the subscription is successful.
	 */
	static async subscribe(queueName: string, consumerConfig: ConsumerConfig): Promise<void> {
		try {
			if (!SQSService.consumer) {
				throw new Error(
					'Consumer not initialized. Please initialize the consumer before starting it.',
				)
			}
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'subscribe',
				`Subscribing to queue: ${queueName}`,
			)
			await SQSService.consumer.subscribe(queueName, consumerConfig)
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'subscribe',
				`Subscribed to queue: ${queueName} successfully`,
			)
		} catch (error) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'subscribe',
				`Error in subscribing to queue: ${queueName}`,
				error,
			)
			throw error
		}
	}

	static changeMessageVisibility(
		queueName: string,
		receiptHandle: string,
		visibilityTimeoutInSeconds: number,
	): Promise<ChangeMessageVisibilityCommandOutput> {
		return this.sqs.changeMessageVisibility(
			queueName,
			receiptHandle,
			visibilityTimeoutInSeconds,
		)
	}

	/**
	 * Starts all consumers.
	 * @throws {Error} If an error occurs while starting the consumers.
	 * @returns {Promise<void>} A promise that resolves when all consumers have started.
	 */
	static async startConsumers(): Promise<void> {
		try {
			if (!SQSService.consumer) {
				throw new Error(
					'Consumer not initialized. Please initialize the consumer before starting it.',
				)
			}
			Logger.debug(ELogType.SQS_LOG, FILENAME, 'startConsumers', `Starting consumers`)
			await SQSService.consumer.startConsumers()
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'startConsumers',
				`Started consumers successfully`,
			)
		} catch (error) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'startConsumers',
				`Error in starting consumers`,
				error,
			)
			throw error
		}
	}

	/**
	 * Stops all consumers.
	 * @throws {Error} If an error occurs while stopping the consumers.
	 * @returns {Promise<void>} A promise that resolves when all consumers have stopped.
	 */
	static async stopConsumers(): Promise<void> {
		try {
			if (!SQSService.consumer) {
				throw new Error(
					'Consumer not initialized. Please initialize the consumer before stopping it.',
				)
			}
			Logger.debug(ELogType.SQS_LOG, FILENAME, 'stopConsumers', `Stopping consumers`)
			await SQSService.consumer.stopConsumers()
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'stopConsumers',
				`Stopped consumers successfully`,
			)
		} catch (error) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'stopConsumers',
				`Error in stopping consumers`,
				error,
			)
			throw error
		}
	}

	static consumerIsReady(): boolean {
		return this.consumer.isReady()
	}

	static producerIsReady(): boolean {
		return this.producer.isReady()
	}
}

export { MessageAttributeValue as SqsMessageAttributeValue }
