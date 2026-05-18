import {
	KafkaClient as AWSKafkaClient,
	GetBootstrapBrokersCommand,
	GetBootstrapBrokersCommandOutput,
} from '@aws-sdk/client-kafka'
import { KafkaJS } from '@confluentinc/kafka-javascript'
import { generateAuthToken } from 'aws-msk-iam-sasl-signer-js'

import { KafkaClient, KafkaConfig } from './Client'
import { Consumer, ConsumerConfig, ConsumerRunConfig, ConsumerSubscribeTopics } from './Consumer'
import { Producer, ProducerConfig } from './Producer'
import { SchemaRegistry } from './SchemaRegistry'
import { ELogType } from '../logger/constant'
import { Logger } from '../logger/logger'
import {
	DecodedMessage,
	EachBatchFunction,
	EachMessageFunction,
	MessageType,
	TopicMessagesType,
} from '../models/kafka.model'
import { isDevelopmentEnv } from '../utils/env.util'

type RecordMetadata = KafkaJS.RecordMetadata

const FILENAME = 'kafka/Service.ts'

export class KafkaService {
	static kafka: KafkaClient

	private static producer: Producer | undefined

	private static consumer: Consumer | undefined

	private static serviceName: string

	private static schemaRegistry: SchemaRegistry

	static async initializeClient(
		serviceName: string,
		config: Omit<KafkaConfig, 'brokers' | 'sasl' | 'ssl'> &
			({ clusterArn: string } | { brokers: string[] }),
		region: string = 'ap-south-1',
	): Promise<void> {
		if (KafkaService.kafka) {
			Logger.debug(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.initializeClient.name,
				`Client already initialized`,
			)
			throw Error('Client already initialized')
		}
		try {
			Logger.debug(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.initializeClient.name,
				`Initializing KafkaClient with  serviceName: ${serviceName}, config: ${JSON.stringify(config)}, region: ${region}`,
			)
			this.serviceName = serviceName
			if ('clusterArn' in config && config.clusterArn.length !== 0) {
				const brokers = await KafkaService.getBootstrapBrokers(config.clusterArn, region)
				if (brokers.length === 0) {
					throw new Error(
						'No brokers found for the given clusterArn. Please check the clusterArn and try again.',
					)
				}
				KafkaService.kafka = new KafkaClient(serviceName, {
					...config,
					brokers,
					ssl: true,
					sasl: {
						mechanism: 'oauthbearer',
						oauthBearerProvider:
							async (): Promise<KafkaJS.OauthbearerProviderResponse> => {
								const authTokenResponse = await generateAuthToken({ region })
								return {
									value: authTokenResponse.token,
									principal: 'kafka',
									lifetime: authTokenResponse.expiryTime,
								}
							},
					},
				})
			} else if ('brokers' in config && config.brokers.length !== 0) {
				KafkaService.kafka = new KafkaClient(serviceName, { ...config, ssl: false })
			} else {
				throw new Error(
					'Either clusterArn or brokers must be provided to initialize KafkaClient',
				)
			}
			this.schemaRegistry = new SchemaRegistry(region)
		} catch (error) {
			Logger.error(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.initializeClient.name,
				`Error in initializing KafkaClient with  serviceName: ${serviceName}, config: ${JSON.stringify(config)}, region: ${region}`,
				error,
			)
			throw error
		}
	}

	static async initializeProducer(producerConfig: ProducerConfig): Promise<void> {
		if (!KafkaService.kafka) {
			throw new Error(
				'Client not initialized. Please initialize the client before initializing the producer.',
			)
		}
		if (!KafkaService.producer) {
			Logger.debug(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.initializeProducer.name,
				`Initializing producer with producerConfig: ${JSON.stringify(producerConfig)}`,
			)
			KafkaService.producer = new Producer(KafkaService.kafka, producerConfig)
			await KafkaService.producer.connect()
		} else {
			Logger.debug(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.initializeProducer.name,
				`Producer already initialized.`,
			)
		}
	}

	static async initializeConsumer(consumerConfig: ConsumerConfig): Promise<void> {
		if (!KafkaService.kafka) {
			throw new Error(
				'Client not initialized. Please initialize the client before initializing the consumer.',
			)
		}
		if (!KafkaService.consumer) {
			Logger.debug(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.initializeConsumer.name,
				`Initializing consumer with consumerConfig: ${JSON.stringify(consumerConfig)}`,
			)
			KafkaService.consumer = new Consumer(KafkaService.kafka, consumerConfig)
			await KafkaService.consumer.connect()
		} else {
			Logger.debug(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.initializeConsumer.name,
				`Consumer already initialized.`,
			)
		}
	}

	static async getBootstrapBrokers(
		clusterArn: string,
		region: string = 'ap-south-1',
	): Promise<string[]> {
		try {
			const client = new AWSKafkaClient({ region })
			const command = new GetBootstrapBrokersCommand({ ClusterArn: clusterArn })

			const data: GetBootstrapBrokersCommandOutput = await client.send(command)
			if (!isDevelopmentEnv()) {
				return data.BootstrapBrokerStringSaslIam?.split(',') ?? []
			}
			return data?.BootstrapBrokerStringPublicSaslIam?.split(',') ?? []
		} catch (err) {
			Logger.error(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.getBootstrapBrokers.name,
				'Error fetching brokers from AWS MSK:',
				err,
			)
			throw err
		}
	}

	static async disconnectProducer(): Promise<void> {
		try {
			Logger.debug(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.disconnectProducer.name,
				`Disconnecting producer`,
			)
			await KafkaService.producer?.disconnect()
		} catch (error) {
			Logger.error(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.disconnectProducer.name,
				`Error in disconnecting producer`,
				error,
			)
			throw error
		}
	}

	static async publishMessage(topic: string, messages: MessageType[]): Promise<RecordMetadata[]> {
		try {
			if (!KafkaService.producer) {
				throw new Error(
					'Producer not initialized. Please initialize the producer before publishing a message.',
				)
			}
			Logger.debug(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.publishMessage.name,
				`Publishing message to topic: ${topic}`,
			)

			return await KafkaService.producer.send(
				topic,
				await this.schemaRegistry.encodeMessages(messages),
			)
		} catch (error) {
			Logger.error(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.publishMessage.name,
				`Error in publishing message to topic: ${topic}`,
				error,
			)
			throw error
		}
	}

	static async publishBatchMessage(topicMessages: TopicMessagesType[]): Promise<void> {
		try {
			if (!KafkaService.producer) {
				throw new Error(
					'Producer not initialized. Please initialize the producer before publishing a batch of messages.',
				)
			}
			Logger.debug(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.publishBatchMessage.name,
				`Publishing batch of messages to topics: ${topicMessages?.map((topicMessage) => topicMessage.topic).join(', ')}`,
			)

			const bufferedTopicMessages = await Promise.all(
				topicMessages.map(async (topicMessage) => ({
					...topicMessage,
					messages: await this.schemaRegistry.encodeMessages(topicMessage.messages),
				})),
			)
			await KafkaService.producer.sendBatch(bufferedTopicMessages)
		} catch (error) {
			Logger.error(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.publishBatchMessage.name,
				`Error in publishing batch of messages to topics: ${topicMessages?.map((topicMessage) => topicMessage.topic).join(', ')}`,
				error,
			)
			throw error
		}
	}

	static pauseConsumer(): void {
		KafkaService.consumer?.pause()
	}

	static resumeConsumer(): void {
		KafkaService.consumer?.resume()
	}

	static async disconnectConsumer(): Promise<void> {
		try {
			Logger.debug(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.disconnectConsumer.name,
				`Disconnecting consumer`,
			)
			await KafkaService.consumer?.disconnect()
		} catch (error) {
			Logger.error(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.disconnectConsumer.name,
				`Error in disconnecting consumer`,
				error,
			)
			throw error
		}
	}

	/**
	 * Starts consuming messages from subscribed topics.
	 *
	 * @param subscription - Topics to subscribe to
	 * @param config - Consumer run configuration with either eachMessage or eachBatch handler
	 *
	 * @remarks
	 * **IMPORTANT**: In @confluentinc/kafka-javascript, the eachBatch handler's batch size
	 * never exceeds 1 message per batch (unlike kafkajs which could batch multiple messages).
	 * This is a known limitation of the Confluent library. If you need to process messages
	 * in batches, consider using eachMessage with manual batching logic, or be aware that
	 * eachBatch will be called once per message.
	 *
	 * See: https://docs.confluent.io/kafka-clients/javascript/current/migration.html#semantic-and-per-method-changes
	 */
	static async startConsumer(
		subscription: ConsumerSubscribeTopics,
		config: Omit<ConsumerRunConfig, 'eachMessage' | 'eachBatch'> & {
			eachMessage?: EachMessageFunction
			eachBatch?: EachBatchFunction
		},
	): Promise<void> {
		try {
			if (!KafkaService.consumer) {
				throw new Error(
					'Consumer not initialized. Please initialize the consumer before consuming messages.',
				)
			}
			if (!config.eachMessage && !config.eachBatch) {
				throw new Error('eachMessage or eachBatch is required to consume messages.')
			}
			Logger.debug(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.startConsumer.name,
				`Consuming messages`,
			)
			await KafkaService.consumer.subscribe(subscription)
			await KafkaService.consumer.run({
				...config,
				eachMessage: config.eachMessage
					? async (payload): Promise<void> => {
							let decodedMessage: DecodedMessage
							try {
								decodedMessage = await this.schemaRegistry.decodeMessage(
									payload.message,
								)
							} catch (decodeError) {
								Logger.error(
									ELogType.KAFKA_LOG,
									FILENAME,
									'eachMessage',
									`Failed to decode message — skipping (topic: ${payload.topic}, partition: ${payload.partition}, offset: ${payload.message.offset})`,
									decodeError,
								)
								return
							}
							await config.eachMessage?.({ ...payload, message: decodedMessage })
						}
					: undefined,
				// NOTE: In @confluentinc/kafka-javascript, batch size is always 1
				// This is a known limitation - see JSDoc above for details
				eachBatch: config.eachBatch
					? async (payload): Promise<void> => {
							const decodedMessages = await Promise.all(
								payload.batch.messages.map(async (message) => {
									try {
										return await this.schemaRegistry.decodeMessage(message)
									} catch (decodeError) {
										Logger.error(
											ELogType.KAFKA_LOG,
											FILENAME,
											'eachBatch',
											`Failed to decode message — skipping (topic: ${payload.batch.topic}, partition: ${payload.batch.partition}, offset: ${message.offset})`,
											decodeError,
										)
										return null
									}
								}),
							)
							await config.eachBatch?.({
								...payload,
								batch: {
									...payload.batch,
									messages: decodedMessages.filter(
										(m) => m !== null,
									) as DecodedMessage[],
								},
							})
						}
					: undefined,
			})
		} catch (error) {
			Logger.error(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.startConsumer.name,
				`Error in consuming messages, input: ${JSON.stringify(subscription)}`,
				error,
			)
			throw error
		}
	}

	static async producerIsReady(): Promise<boolean> {
		return KafkaService.producer?.isReady() ?? false
	}

	static async consumerIsReady(): Promise<boolean> {
		return KafkaService.consumer?.isReady() ?? false
	}
}
