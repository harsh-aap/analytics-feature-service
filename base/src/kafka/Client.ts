/* eslint-disable complexity */
import { KafkaJS } from '@confluentinc/kafka-javascript'

import { ELogType } from '../logger'
import { Logger } from '../logger/logger'
import { baseConfig } from '../odin/baseConfig'

type KafkaConfig = KafkaJS.KafkaConfig

class KafkaClient {
	private kafka: KafkaJS.Kafka

	constructor(serviceName: string, config: KafkaConfig) {
		if (config.brokers.length === 0) {
			throw new Error('brokers is required to initialize KafkaClient!')
		}

		const defaultKafkaClientConfig: Omit<KafkaConfig, 'brokers'> =
			baseConfig.kafka_default_client_config

		const kafkaLogger: KafkaJS.Logger = {
			info: () => {},
			warn: () => {},
			debug: () => {},
			error: (message: string, extra?: object) => {
				const logPayload = { message, ...extra }
				if (Logger.shouldSuppress(logPayload)) {
					Logger.info(
						ELogType.KAFKA_LOG,
						'kafka.ts',
						'some method inside kafka',
						JSON.stringify(logPayload),
					)
					return
				}
				if (Logger.shouldWarn(logPayload)) {
					Logger.warn(
						ELogType.KAFKA_LOG,
						'kafka.ts',
						'some method inside kafka',
						JSON.stringify(logPayload),
					)
					return
				}
				Logger.error(
					ELogType.KAFKA_LOG,
					'kafka.ts',
					'some method inside kafka',
					JSON.stringify(logPayload),
				)
			},
			namespace: () => kafkaLogger,
			setLogLevel: () => {},
		}

		const sasl = config?.sasl ?? defaultKafkaClientConfig.sasl

		this.kafka = new KafkaJS.Kafka({
			kafkaJS: {
				clientId:
					config?.clientId ??
					`${serviceName}-${Math.random().toString(36).substring(2, 8)}`,
				brokers: config?.brokers ?? [],
				ssl: config?.ssl ?? defaultKafkaClientConfig.ssl,
				...(sasl ? { sasl } : {}),
				connectionTimeout:
					config?.connectionTimeout ?? defaultKafkaClientConfig.connectionTimeout,
				requestTimeout: config?.requestTimeout ?? defaultKafkaClientConfig.requestTimeout,
				enforceRequestTimeout:
					config?.enforceRequestTimeout ?? defaultKafkaClientConfig.enforceRequestTimeout,
				retry: config?.retry ?? defaultKafkaClientConfig.retry,
				logLevel: KafkaJS.logLevel.ERROR,
				logger: kafkaLogger,
			},
		})
	}

	get client(): KafkaJS.Kafka {
		return this.kafka
	}
}

export { KafkaClient, KafkaConfig }
