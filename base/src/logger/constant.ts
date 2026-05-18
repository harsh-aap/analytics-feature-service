/* eslint-disable no-shadow */
export const MAX_SINGLE_FIELD_SIZE = 2048
export const MAX_MESSAGE_SIZE = 16384

export enum ELogType {
	APP_LOG = 'app-log',
	CIRCUIT_BREAKER_LOG = 'circuit-break-log',
	CONFIG_CHANGE_LOG = 'config-change-log',
	HTTP_API_LOG = 'http-api-log',
	INTERNAL_LOG = 'internal-log',
	KAFKA_LOG = 'kafka-log',
	MONGO_LOG = 'mongo-log',
	POSTGRES_LOG = 'postgres-log',
	REDIS_LOG = 'redis-log',
	S3_LOG = 's3-log',
	SNS_LOG = 'sns-log',
	SQS_LOG = 'sqs-log',
	STARTUP_LOG = 'startup-log',
	TERMINATE_LOG = 'terminate-log',
	THIRD_PARTY_API_LOG = 'third-party-api-log',
	WEBSOCKET_EVENT_LOG = 'websocket-event-log',
	ODIN_LOG = 'odin-log',
	CACHE_LOG = 'cache-log',
}

export enum ENodeEnvironment {
	DEVELOPMENT = 'development',
	TEST = 'test',
	STAGING = 'staging',
	PRODUCTION = 'production',
}

export enum ELogLevel {
	INFO = 'info',
	DEBUG = 'debug',
	ERROR = 'error',
	WARN = 'warning',
}
