import {
	SQSClient as AWSSQSClient,
	ChangeMessageVisibilityCommand,
	ChangeMessageVisibilityCommandOutput,
	CreateQueueCommand,
	CreateQueueCommandOutput,
	GetQueueAttributesCommand,
	GetQueueAttributesCommandOutput,
	GetQueueUrlCommand,
	QueueAttributeName,
	SQSClientConfig,
	SetQueueAttributesCommand,
	SetQueueAttributesCommandOutput,
} from '@aws-sdk/client-sqs'

import { ELogType, Logger } from '../logger'
import { QueueAttributesMap, QueueConfig } from '../models/sqs.model'
import { baseConfig } from '../odin/baseConfig'

const FILENAME = 'sqs/Client.ts'

class SQSClient {
	private awsSqsClient: AWSSQSClient

	private queueURLsCache: Map<string, string> = new Map()

	/**
	 * Constructs a new instance of the client.
	 * @param {SQSClientConfig} config - The configuration for the AWS SQS client.
	 */
	constructor(config: SQSClientConfig) {
		this.awsSqsClient = new AWSSQSClient(config)
	}

	/**
	 * Creates a new SQS queue with the given configuration.
	 * @param {QueueConfig} config - The configuration for the new queue.
	 * @returns A promise that resolves when the queue is created.
	 */
	public async createQueue(config: QueueConfig): Promise<CreateQueueCommandOutput> {
		try {
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'createQueue',
				`Creating queue ${config.QueueName}`,
			)
			const configAttributes = config.Attributes ?? {}
			if (!config.QueueName) {
				throw new Error('QueueName is required')
			}
			const defaultQueueAttributesMap: QueueAttributesMap =
				baseConfig.sqs_default_queue_attributes_map
			const queueConfig: QueueConfig = {
				QueueName: config.QueueName,
				Attributes: {
					DelaySeconds:
						configAttributes.DelaySeconds ?? defaultQueueAttributesMap.DelaySeconds,
					MaximumMessageSize:
						configAttributes.MaximumMessageSize ??
						defaultQueueAttributesMap.MaximumMessageSize,
					MessageRetentionPeriod:
						configAttributes.MessageRetentionPeriod ??
						defaultQueueAttributesMap.MessageRetentionPeriod,
					VisibilityTimeout:
						configAttributes.VisibilityTimeout ??
						defaultQueueAttributesMap.VisibilityTimeout,
					ReceiveMessageWaitTimeSeconds:
						configAttributes.ReceiveMessageWaitTimeSeconds ??
						defaultQueueAttributesMap.ReceiveMessageWaitTimeSeconds,
				},
			}
			const command = new CreateQueueCommand(queueConfig)

			const response = await this.awsSqsClient.send(command)
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'createQueue',
				`Created queue ${config.QueueName}`,
			)
			return response
		} catch (err) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'createQueue',
				`Error creating queue ${config.QueueName}`,
				err,
			)
			throw err
		}
	}

	/**
	 * Retrieves the attributes of the specified queue.
	 * @param {string} queueName - The name of the queue.
	 * @param {QueueAttributesName[]} attributeNames - The names of the attributes to retrieve.
	 * @returns A promise that resolves with the attributes of the queue.
	 */
	private async getQueueAttributes(
		queueName: string,
		attributeNames: QueueAttributeName[],
	): Promise<GetQueueAttributesCommandOutput> {
		Logger.debug(
			ELogType.SQS_LOG,
			FILENAME,
			'getQueueAttributes',
			`Getting queue attributes ${JSON.stringify(attributeNames)} for ${queueName}`,
		)
		const queueUrl = await this.getQueueURL(queueName)
		const command = new GetQueueAttributesCommand({
			QueueUrl: queueUrl,
			AttributeNames: attributeNames,
		})
		Logger.debug(
			ELogType.SQS_LOG,
			FILENAME,
			'getQueueAttributes',
			`Got queue attributes ${JSON.stringify(attributeNames)} for ${queueName}`,
		)
		return this.awsSqsClient.send(command)
	}

	/**
	 * Sets the attributes of the specified queue.
	 * @param {string} queueName - The name of the queue.
	 * @param {QueueAttributesMap} attributes - The attributes to set.
	 * @returns A promise that resolves when the attributes are set.
	 */
	private async setQueueAttributes(
		queueName: string,
		attributes: QueueAttributesMap,
	): Promise<SetQueueAttributesCommandOutput> {
		Logger.debug(
			ELogType.SQS_LOG,
			FILENAME,
			'setQueueAttributes',
			`Setting queue attributes ${JSON.stringify(attributes)} for ${queueName}`,
		)
		const queueUrl = await this.getQueueURL(queueName)
		const command = new SetQueueAttributesCommand({
			QueueUrl: queueUrl,
			Attributes: attributes,
		})
		Logger.debug(
			ELogType.SQS_LOG,
			FILENAME,
			'setQueueAttributes',
			`Set queue attributes ${JSON.stringify(attributes)} for ${queueName}`,
		)
		return this.awsSqsClient.send(command)
	}

	/**
	 * Attaches a dead-letter queue to the specified source queue.
	 * @param {string} DLQName - The name of the dead-letter queue.
	 * @param {string} sourceQueueName - The name of the source queue.
	 * @param {number} [maxReceiveCount=5] - The maximum number of times a message can be received before it is sent to the dead-letter queue. Default is 3.
	 * @returns A promise that resolves when the dead-letter queue is attached.
	 */
	async attachDLQToSourceQueue(
		DLQName: string,
		sourceQueueName: string,
		maxReceiveCount: number = 5,
	): Promise<void> {
		try {
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'attachDLQToSourceQueue',
				`Attaching DLQ ${DLQName} to source queue ${sourceQueueName}`,
			)
			const DLQAttributes = await this.getQueueAttributes(DLQName, ['QueueArn'])!
			const dlqArn = DLQAttributes.Attributes!.QueueArn

			await this.setQueueAttributes(sourceQueueName, {
				RedrivePolicy: JSON.stringify({
					deadLetterTargetArn: dlqArn,
					maxReceiveCount, // After maxReceiveCount reties send message to DLQ
				}),
			})
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'attachDLQToSourceQueue',
				`Attached DLQ ${DLQName} to source queue ${sourceQueueName}`,
			)
		} catch (err) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'attachDLQToSourceQueue',
				`Error attaching DLQ ${DLQName} to source queue ${sourceQueueName}`,
				err,
			)
			throw err
		}
	}

	/**
	 * Returns the underlying AWS SQS client.
	 * @returns The AWS SQS client.
	 */
	get client(): AWSSQSClient {
		return this.awsSqsClient
	}

	/**
	 * Retrieves the URL of the specified queue.
	 * @param {string} queueName - The name of the queue.
	 * @returns A promise that resolves with the URL of the queue.
	 */
	async getQueueURL(queueName: string): Promise<string> {
		try {
			if (this.queueURLsCache.has(queueName)) {
				Logger.debug(
					ELogType.SQS_LOG,
					FILENAME,
					'getQueueURL',
					`Got queue URL for ${queueName} in cache`,
				)
				return this.queueURLsCache.get(queueName)!
			}
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'getQueueURL',
				`Getting queue URL for ${queueName}`,
			)
			const command = new GetQueueUrlCommand({ QueueName: queueName })
			const response = await this.awsSqsClient.send(command)
			this.queueURLsCache.set(queueName, response.QueueUrl!)
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'getQueueURL',
				`Got queue URL for ${queueName}`,
			)
			return response.QueueUrl!
		} catch (err) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'getQueueURL',
				`Error getting queue URL ${queueName}`,
				err,
			)
			throw err
		}
	}

	async changeMessageVisibility(
		queueName: string,
		receiptHandle: string,
		visibilityTimeoutInSeconds: number,
	): Promise<ChangeMessageVisibilityCommandOutput> {
		const command = new ChangeMessageVisibilityCommand({
			QueueUrl: await this.getQueueURL(queueName),
			ReceiptHandle: receiptHandle,
			VisibilityTimeout: visibilityTimeoutInSeconds,
		})
		return this.awsSqsClient.send(command)
	}
}

export { SQSClient, SQSClientConfig }
