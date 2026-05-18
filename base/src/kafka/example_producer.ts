/* eslint-disable max-statements */

import dayjs from 'dayjs'

import { KafkaService } from './Service'
import { ELogLevel, ENodeEnvironment } from '../logger/constant'
import { Logger } from '../logger/logger'

// process.env.NODE_ENV = 'staging'
const TOPIC = 'test-avro'
const run = async (): Promise<void> => {
	Logger.initializeLogger({
		env: ENodeEnvironment.DEVELOPMENT,
		logFolder: 'logs',
		logLevel: ELogLevel.DEBUG,
		serviceName: 'MyKafkaService',
	})

	const brokers = ['localhost:10010', 'localhost:10011', 'localhost:10012']
	await KafkaService.initializeClient('MyKafkaService', {
		brokers,
		requestTimeout: 20000,
		connectionTimeout: 3000,
		// clusterArn:
		// 	'arn:aws:kafka:ap-south-1:975049924333:cluster/staging-kafka-test-cluster/c21dfefa-0f20-48bb-bb30-82ba2a2d380f-2',
	})
	console.log('====>> client created!')

	// const admin = new Admin(KafkaService.kafka, {})
	// console.log('====>> admin created!')
	// await admin.connect()
	// console.log('====>> admin connected!')
	// await admin.createTopics([
	// 	{ topic: 'user-events', numPartitions: 3, replicationFactor: 2 },
	// 	{ topic: 'gin-rummy', numPartitions: 3, replicationFactor: 2 },
	// ])
	// console.log('====>> topic created!')
	// const topics = await admin.listTopics()
	// console.log('====>> fetched topics', topics)
	// await admin.resetOffsets({
	// 	groupId: 'test-group',
	// 	topic: 'user-events',
	// 	earliest: true,
	// })
	// await admin.disconnect()
	// console.log('====>> admin disconnected!')

	await KafkaService.initializeProducer({})
	await Promise.all(
		Array.from({ length: 5 }).map(async () => {
			// return KafkaService.publishMessage(TOPIC, [
			// 	{
			// 		key: '1',
			// 		value: {
			// 			f1: 'full Name',
			// 			f2: 1,
			// 		},
			// 		timestamp: dayjs().valueOf().toString(),
			// 		schemaVersionId: '12c4b43a-2767-4f2a-b541-b95e1d3fe979',
			// 	},
			// ])
			return KafkaService.publishBatchMessage([
				{
					topic: TOPIC,
					messages: [
						{
							key: '1',
							value: {
								f1: 'full Name',
								f2: 198,
								f3: 'without schema version id',
							},
							timestamp: dayjs().valueOf().toString(),
						},
						{
							key: '2',
							value: {
								f1: 'full Name',
								f2: 100,
							},
							timestamp: dayjs().valueOf().toString(),
							schemaVersionId: '12c4b43a-2767-4f2a-b541-b95e1d3fe979',
						},
					],
				},
			])
		}),
	)
	await KafkaService.disconnectProducer()
}

if (require.main === module) {
	run()
}
