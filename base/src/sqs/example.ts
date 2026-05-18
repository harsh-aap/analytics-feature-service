import { ConsumerConfig } from './Consumer'
import { SQSService } from './Service'
import { ELogLevel, ELogType, ENodeEnvironment } from '../logger'
import { Logger } from '../logger'

const FILENAME = 'sqs/test.ts'

// eslint-disable-next-line max-lines-per-function
const run = async (): Promise<void> => {
	Logger.initializeLogger({
		sentryDSN:
			'https://f93d4e5987488969bd18f844466f1e1d@o4507260372713472.ingest.us.sentry.io/4507260374351872',
		env: ENodeEnvironment.DEVELOPMENT,
		logFolder: 'logs',
		logLevel: ELogLevel.DEBUG,
		serviceName: 'MySQSTest',
	})

	SQSService.initializeService({ region: 'ap-south-1' }, true, true)
	await SQSService.createQueues(
		[
			{
				actionName: 'test',
				queueAttributes: {
					VisibilityTimeout: '60',
					MessageRetentionPeriod: '86400', // 1 day
				},
				shouldCreateDLQ: true,
				DLQAttributes: {
					VisibilityTimeout: '60',
					MessageRetentionPeriod: '1209600', // send 14 for DLQ
				},
				maxReceiveCount: 3,
			},
		],
		'test-service',
	)

	// await SQSService.publishMessage(
	// 	'test',
	// 	JSON.stringify({ id: 1, body: `Hello from test-queue` }),
	// )
	await SQSService.publishMessageBatch('test', [
		JSON.stringify({ id: 2, body: `Hello again from test-queue` }),
		JSON.stringify({ id: 3, body: `Hello again again from test-queue` }),
	])
	// setInterval(() => {
	//     SQSService.publishMessageBatch('test-queue', [
	//         { "id": 1, "body": `Hello from test-queue` },
	//         { "id": 2, "body": `Hello again from test-queue` }
	//     ])
	// }, 25 * 1000)

	const consumerConfig: ConsumerConfig = {
		pollingWaitTimeMs: 20 * 1000,
		terminateVisibilityTimeout: true,
		waitTimeSeconds: 20,
		batchSize: 2,
		handleMessage: async (message) => {
			const body = JSON.parse(message.Body!)
			// should add some validation for body...
			Logger.info(
				ELogType.APP_LOG,
				FILENAME,
				'test_function',
				`waiting 10 secs(simulating processing delay) processing id: ${body.id}`,
			)
			await new Promise((resolve) => {
				setTimeout(resolve, 10 * 1000)
			})
			return message
		},
		handleMessageBatch: async (messages) => {
			Logger.info(
				ELogType.APP_LOG,
				FILENAME,
				'test_function',
				`batch processing messages: ${messages.length}`,
			)

			messages.map(async (message) => {
				// Use multi threads/processes to process in parallel
				const body = JSON.parse(message.Body!)
				// should add some validation for body...
				Logger.info(
					ELogType.APP_LOG,
					FILENAME,
					'test_function',
					`waiting 10 secs(simulating processing delay) processing id:, ${body.id}, body: ${body.body}`,
				)
				await new Promise((resolve) => {
					setTimeout(resolve, 10 * 1000)
				})
				// throw new Error('meine error phenka hai')
				return message
			})
			return messages
		},
		// return message if successfully processed(so it gets deleted), else throw error
		// If both(handleMessageBatch and handleMessage) are set, handleMessageBatch overrides handleMessage.
	}

	await SQSService.subscribe('test-service_test', consumerConfig)

	SQSService.startConsumers()
}

if (require.main === module) {
	run()
}
