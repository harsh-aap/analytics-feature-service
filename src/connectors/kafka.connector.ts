import { injectable } from 'inversify'
import { KafkaService } from 'tst-base'

import { Connector } from './connector.interface'
import { config } from '../configs/config'
import { AppLogger } from '../utils/logger.util'

const logger = AppLogger(__filename)

@injectable()
export class KafkaConnector implements Connector {
	connect = async (): Promise<void> => {
		try {
			if (await KafkaService.producerIsReady()) {
				logger.info('connect', 'Kafka already connected, skipping init')
				return
			}
			// Use clusterArn (MSK IAM auth) whenever it is set — works in any
			// NODE_ENV. Fall back to plain brokers for local dev where no ARN
			// is configured.
			const useBrokers = !config.KAFKA.CLUSTER_ARN
			await KafkaService.initializeClient(
				config.SERVICE_NAME,
				useBrokers
					? { brokers: config.KAFKA.BROKERS }
					: { clusterArn: config.KAFKA.CLUSTER_ARN },
				config.KAFKA.REGION,
			)
		} catch (err) {
			if ((err as Error).message === 'Client already initialized') {
				logger.info('connect', 'Kafka client already initialized, skipping')
			} else {
				logger.error('connect', 'Kafka client initialization failed', err)
				throw err
			}
		}

		// Producer is needed for DLQ writes; this service is mostly a consumer.
		try {
			await KafkaService.initializeProducer({})
		} catch (err) {
			if ((err as Error).message?.includes('already initialized')) {
				logger.info('connect', 'Kafka producer already initialized, skipping')
			} else {
				logger.error('connect', 'Kafka producer initialization failed', err)
				throw err
			}
		}
		logger.info('connect', 'Kafka connected')
	}

	disconnect = async (): Promise<void> => {
		try {
			await KafkaService.disconnectProducer()
			await KafkaService.disconnectConsumer()
			logger.info('disconnect', 'Kafka disconnected')
		} catch (err) {
			logger.error('disconnect', 'Kafka disconnection failed', err)
			throw err
		}
	}

	isReady = async (): Promise<boolean> => KafkaService.producerIsReady()
}
