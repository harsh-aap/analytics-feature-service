import {
	MessageAttributeValue,
	SendMessageBatchCommand,
	SendMessageBatchCommandOutput,
	SendMessageCommand,
	SendMessageCommandOutput,
} from '@aws-sdk/client-sqs'

import { SQSClient } from './Client'
import { ELogType, Logger } from '../logger'

const FILENAME = 'sqs/Producer.ts'

export class Producer {
	private sqs: SQSClient

	private isOpen: boolean

	/**
	 * Constructs an instance of the Producer class.
	 * @param {SQSClient} sqs - An instance of the SQSClient.
	 */
	constructor(sqs: SQSClient) {
		this.sqs = sqs
		this.isOpen = true
	}

	/**
	 * Publishes a message to the specified queue.
	 * @param {string} queueName - The name of the queue.
	 * @param {string} message - The message to publish.
	 * @param {string} messageAttributes - The message metadata to publish, e.g, requestId.
	 * @returns A promise that resolves when the message is published.
	 */
	async publishMessage(
		queueName: string,
		// FIXME - make this to accept json/record and put the stringify in params itself, also putr the parse in consumer code of base, so that the consumers will directly get object and not need to stringify everywhere, basically make it json both when sending and receiving from caller's perspective
		message: string,
		messageAttributes: Record<string, MessageAttributeValue>,
	): Promise<SendMessageCommandOutput> {
		this.checkIfOpen()
		try {
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'publishMessage',
				`Publishing message to: ${queueName}`,
			)
			const queueUrl = await this.sqs.getQueueURL(queueName)
			const params = {
				MessageBody: message,
				QueueUrl: queueUrl,
				MessageAttributes: messageAttributes,
			}

			const command = new SendMessageCommand(params)
			const response = this.sqs.client.send(command)
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'publishMessage',
				`Published message to: ${queueName}`,
			)
			return await response
		} catch (err) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'publishMessage',
				`Error publishing message to: ${queueName}`,
				err,
			)
			throw err
		}
	}

	/**
	 * Publishes a batch of messages to the specified queue.
	 * @param {string} queueName - The name of the queue.
	 * @param {string[]} messages - The messages to publish.
	 * @returns A promise that resolves when the messages are published.
	 */
	async publishMessageBatch(
		queueName: string,
		messages: string[],
	): Promise<SendMessageBatchCommandOutput> {
		this.checkIfOpen()
		try {
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'publishMessageBatch',
				`Publishing messages: ${messages} to queue: ${queueName}`,
			)
			const queueUrl = await this.sqs.getQueueURL(queueName)
			const params = {
				Entries: messages.map((message, index) => ({
					Id: index.toString(),
					MessageBody: message,
				})),
				QueueUrl: queueUrl,
			}
			const command = new SendMessageBatchCommand(params)
			const response = this.sqs.client.send(command)
			Logger.debug(
				ELogType.SQS_LOG,
				FILENAME,
				'publishMessageBatch',
				`Published messages: ${messages} to queue: ${queueName}`,
			)
			return await response
		} catch (err) {
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'publishMessageBatch',
				`Error publishing messages: ${messages} to queue: ${queueName}`,
				err,
			)
			throw err
		}
	}

	/**
	 * Closes the Producer, preventing further message publishing.
	 */
	async close(): Promise<void> {
		Logger.debug(ELogType.SQS_LOG, FILENAME, 'close', 'Closing SQS Producer')
		this.isOpen = false
		// Note: We don't close the SQS client here as it might be shared with other components
		Logger.debug(ELogType.SQS_LOG, FILENAME, 'close', 'SQS Producer closed successfully')
	}

	private checkIfOpen(): void {
		if (!this.isOpen) {
			const error = new Error('Cannot perform operation: Producer is closed')
			Logger.error(
				ELogType.SQS_LOG,
				FILENAME,
				'checkIfOpen',
				'Attempted to use closed Producer',
				error,
			)
			throw error
		}
	}

	isReady(): boolean {
		return this.isOpen
	}
}
