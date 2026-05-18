/* eslint-disable max-statements */

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
	console.log('====>> client initialized!')

	await KafkaService.initializeConsumer({ groupId: 'test-group' })
	console.log('====>> consumer initialized!')
	KafkaService.startConsumer(
		{ topics: [TOPIC] },
		{
			eachMessage: async (payload) => {
				const { topic, partition, message, heartbeat, pause } = payload
				const heartbeatInterval = setInterval(() => {
					heartbeat()
				}, 5000)
				try {
					console.log('====>> message', message)
					console.log('====>> message.value', message.value)
					console.log('====>> message.value.f1', message.value.f1)
					console.log('====>> message.value.f2', message.value.f2)
				} catch (error) {
					console.error(error)
				} finally {
					clearInterval(heartbeatInterval)
				}
			},
			// // NOTE: eachBatch is considered advanced use case, before implementing understand commitOffset and how session timeouts and heartbeats are connected
			// eachBatch: async (payload) => {
			// 	console.log('====>> payload', payload)
			// 	const { batch } = payload
			// 	console.log('====>> batch', batch)
			// 	console.log('====>> batch.messages', batch.messages)
			// 	console.log('====>> batch.messages[0]', batch.messages[0])
			// 	console.log('====>> batch.messages[0].value', batch.messages[0].value)
			// 	console.log('====>> batch.messages[0].value.f1', batch.messages[0].value.f1)
			// 	console.log('====>> batch.messages[0].value.f2', batch.messages[0].value.f2)
			// 	// console.log('====>> messages', messages)
			// },
		},
	)
}

if (require.main === module) {
	run()
}
