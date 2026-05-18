import { KafkaJS } from '@confluentinc/kafka-javascript'
import { backOff } from 'exponential-backoff'

import { KafkaClient } from './Client'
import { ELogType } from '../logger/constant'
import { Logger } from '../logger/logger'
import { baseConfig } from '../odin/baseConfig'

const FILENAME = 'kafka/Producer.ts'

type ProducerConfig = KafkaJS.ProducerConfig
type Message = KafkaJS.Message
type RecordMetadata = KafkaJS.RecordMetadata
type TopicMessages = KafkaJS.TopicMessages

class Producer {
	private producer: ReturnType<KafkaJS.Kafka['producer']>

	private isConnected: boolean = false

	private maxPublishAttempts: number = 5

	constructor(
		private kafka: KafkaClient,
		config: ProducerConfig & {
			acks?: number
			timeout?: number
			compression?: KafkaJS.CompressionTypes
		},
	) {
		const defaultProducerConfig: Omit<ProducerConfig, 'groupId'> =
			baseConfig.kafka_default_producer_config
		const maxInFlightRequests =
			config.maxInFlightRequests ?? defaultProducerConfig.maxInFlightRequests
		this.producer = this.kafka.client.producer({
			kafkaJS: {
				acks: config.acks ?? -1,
				timeout: config.timeout ?? 30000,
				compression: config.compression ?? KafkaJS.CompressionTypes.None,
				retry: config.retry ?? defaultProducerConfig.retry,
				metadataMaxAge: config.metadataMaxAge ?? defaultProducerConfig.metadataMaxAge,
				allowAutoTopicCreation: defaultProducerConfig.allowAutoTopicCreation,
				idempotent: config.idempotent ?? defaultProducerConfig.idempotent,
				...(maxInFlightRequests != null ? { maxInFlightRequests } : {}),
			},
		})
	}

	async connect(): Promise<void> {
		try {
			await this.producer.connect()
			this.isConnected = true
		} catch (error) {
			this.isConnected = false
			throw error
		}
	}

	async disconnect(): Promise<void> {
		try {
			await this.producer.disconnect()
		} finally {
			this.isConnected = false
		}
	}

	async send(topic: string, messages: Message[]): Promise<RecordMetadata[]> {
		return backOff(
			() => {
				return this.producer.send({
					topic,
					messages,
				})
			},
			{
				retry: (e, attemptNumber) => {
					if (attemptNumber === this.maxPublishAttempts) {
						Logger.error(
							ELogType.KAFKA_LOG,
							FILENAME,
							this.send.name,
							`Error in sending message to topic: ${topic}, for attempt: ${attemptNumber}, messages: ${JSON.stringify(
								messages,
							)}`,
							e,
						)
					}
					return true
				},
				jitter: 'full',
				startingDelay: 0,
				maxDelay: 10000,
				numOfAttempts: this.maxPublishAttempts,
			},
		)
	}

	async sendBatch(topicMessages: TopicMessages[]): Promise<RecordMetadata[]> {
		return backOff(
			() => {
				return this.producer.sendBatch({
					topicMessages,
				})
			},
			{
				retry: (e, attemptNumber) => {
					if (attemptNumber === this.maxPublishAttempts) {
						Logger.error(
							ELogType.KAFKA_LOG,
							FILENAME,
							this.sendBatch.name,
							`Error in sending batch message to topic: ${topicMessages[0]?.topic ?? 'unknown'}, for attempt: ${attemptNumber}`,
							e,
						)
					}
					return true
				},
				jitter: 'full',
				startingDelay: 0,
				maxDelay: 10000,
				numOfAttempts: this.maxPublishAttempts,
			},
		)
	}

	async isReady(): Promise<boolean> {
		return this.isConnected
	}
}

export { Producer, ProducerConfig, Message, TopicMessages }
