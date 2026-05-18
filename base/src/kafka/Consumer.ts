import { KafkaJS } from '@confluentinc/kafka-javascript'

import { KafkaClient } from './Client'
import { baseConfig } from '../odin/baseConfig'

type ConsumerConfig = KafkaJS.ConsumerConfig & {
	groupInstanceId?: string
}
type ConsumerRunConfig = KafkaJS.ConsumerRunConfig
type ConsumerSubscribeTopics = KafkaJS.ConsumerSubscribeTopics

class Consumer {
	private consumer: ReturnType<KafkaJS.Kafka['consumer']>

	private isConnected: boolean = false

	private subscribeConfig: ConsumerSubscribeTopics | null = null

	// eslint-disable-next-line complexity
	constructor(
		private kafka: KafkaClient,
		config: ConsumerConfig,
	) {
		const defaultConsumerConfig: Omit<KafkaJS.ConsumerConfig, 'groupId'> =
			baseConfig.kafka_default_consumer_config
		this.consumer = this.kafka.client.consumer({
			kafkaJS: {
				groupId: config.groupId,
				partitionAssigners: config.partitionAssigners ?? [
					KafkaJS.PartitionAssigners.roundRobin,
				],
				sessionTimeout: config.sessionTimeout ?? defaultConsumerConfig.sessionTimeout,
				rebalanceTimeout: config.rebalanceTimeout ?? defaultConsumerConfig.rebalanceTimeout,
				heartbeatInterval:
					config.heartbeatInterval ?? defaultConsumerConfig.heartbeatInterval,
				metadataMaxAge: config.metadataMaxAge ?? defaultConsumerConfig.metadataMaxAge,
				allowAutoTopicCreation: defaultConsumerConfig.allowAutoTopicCreation,
				maxBytesPerPartition:
					config.maxBytesPerPartition ?? defaultConsumerConfig.maxBytesPerPartition,
				maxBytes: config.maxBytes ?? defaultConsumerConfig.maxBytes,
				minBytes: config.minBytes ?? defaultConsumerConfig.minBytes,
				maxWaitTimeInMs: config.maxWaitTimeInMs ?? defaultConsumerConfig.maxWaitTimeInMs,
				retry: config.retry ?? defaultConsumerConfig.retry,
				...((config.maxInFlightRequests ?? defaultConsumerConfig.maxInFlightRequests)
					? {
							maxInFlightRequests:
								config.maxInFlightRequests ??
								defaultConsumerConfig.maxInFlightRequests,
						}
					: {}),
				fromBeginning: config.fromBeginning ?? false,
				autoCommit: config.autoCommit ?? true,
				autoCommitInterval: config.autoCommitInterval ?? 5000,
			},
			// librdkafka native config: static group membership (KIP-345)
			...(config.groupInstanceId ? { 'group.instance.id': config.groupInstanceId } : {}),
		})
	}

	async connect(): Promise<void> {
		try {
			await this.consumer.connect()
			this.isConnected = true
		} catch (error) {
			this.isConnected = false
			throw error
		}
	}

	async disconnect(): Promise<void> {
		try {
			await this.consumer.disconnect()
		} finally {
			this.isConnected = false
		}
	}

	async subscribe(subscription: ConsumerSubscribeTopics): Promise<void> {
		this.subscribeConfig = subscription
		return this.consumer.subscribe(subscription)
	}

	async run(config: ConsumerRunConfig): Promise<void> {
		await this.consumer.run(config)
	}

	pause(): void {
		if (!this.subscribeConfig) {
			throw new Error(
				'Cannot pause consumer: No active subscription. Call subscribe() before pause().',
			)
		}
		this.consumer.pause(
			this.subscribeConfig.topics.map((topic) => ({ topic: topic.toString() })),
		)
	}

	resume(): void {
		if (!this.subscribeConfig) {
			throw new Error(
				'Cannot resume consumer: No active subscription. Call subscribe() before resume().',
			)
		}
		this.consumer.resume(
			this.subscribeConfig.topics.map((topic) => ({ topic: topic.toString() })),
		)
	}

	async isReady(): Promise<boolean> {
		return this.isConnected
	}
}

export { Consumer, ConsumerConfig, ConsumerSubscribeTopics, ConsumerRunConfig }
