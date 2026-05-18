export const baseConfig = {
	sqs_default_queue_attributes_map: {
		DelaySeconds: '0',
		MaximumMessageSize: '262144',
		MessageRetentionPeriod: '86400',
		VisibilityTimeout: '30',
		ReceiveMessageWaitTimeSeconds: '20',
	},
	sqs_default_consumer_config: {
		alwaysAcknowledge: true,
		batchSize: 1,
		pollingWaitTimeMs: 5000,
		pollingCompleteWaitTimeMs: 0,
		shouldDeleteMessages: true,
		terminateVisibilityTimeout: true,
		visibilityTimeout: 30,
		heartbeatInterval: 12,
		waitTimeSeconds: 20,
		authenticationErrorTimeout: 10000,
	},
	kafka_default_client_config: {
		ssl: false,
		connectionTimeout: 1000,
		requestTimeout: 30000,
		enforceRequestTimeout: true,
		retry: {
			retries: 5,
		},
	},
	kafka_default_consumer_config: {
		sessionTimeout: 60000,
		rebalanceTimeout: 90000,
		heartbeatInterval: 5000,
		metadataMaxAge: 30000,
		allowAutoTopicCreation: false,
		maxBytesPerPartition: 1048576,
		maxBytes: 1048576,
		minBytes: 1,
		maxWaitTimeInMs: 20000,
		retry: {
			retries: 5,
		},
		maxInFlightRequests: undefined,
	},
	kafka_default_producer_config: {
		retry: {
			retries: 5,
		},
		metadataMaxAge: 30000,
		allowAutoTopicCreation: false,
		idempotent: true,
	},
	kafka_default_admin_config: {
		retry: {
			retries: 5,
		},
	},
	in_memory_cache_config: {
		stdTTL: 10,
		checkperiod: 120,
		useClones: true,
		maxKeys: 1000,
	},
	segmentation_redis_config: {
		socket: {
			host: 'localhost',
			port: 6379,
		},
		database: 9,
	},
	// Superapp Kafka schema version ID - can be overridden via ZK keys (SUPERAPP_KAFKA_SCHEMA_VERSION_ID)
	// Update in base ZK keys to change across all services
	superapp_kafka_schema_version_id: '744fb7ad-7bc1-4e81-aa09-0dad92691697', // Default non-prod value
}
