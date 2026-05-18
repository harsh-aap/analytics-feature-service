import _ from 'lodash'
import { Odin, configReader } from 'tst-base'

import serviceConfig from './service.json'

/**
 * Coerce comma-separated strings (from env vars) and JSON arrays (from Odin)
 * into a typed string[]. Trim entries and drop empties so badly-spaced env
 * values don't poison Set lookups downstream.
 */
const toStringArray = (raw: unknown): string[] => {
	if (Array.isArray(raw)) {
		return raw.map((s) => String(s).trim()).filter(Boolean)
	}
	if (typeof raw === 'string' && raw.length > 0) {
		return raw
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean)
	}
	return []
}

const toBool = (raw: unknown): boolean => {
	if (typeof raw === 'boolean') return raw
	if (typeof raw === 'string') return raw.toLowerCase() === 'true'
	return Boolean(raw)
}

/**
 * Parse "ecommerce:ecommerce-events,saas:saas-events" → { ecommerce: ... }.
 * Identical contract to the Go ingestion-service / event-service so the three
 * services stay in sync from one shared env value.
 */
const toBusinessTopicsMap = (raw: unknown): Record<string, string> => {
	const out: Record<string, string> = {}
	if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
		for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
			if (typeof v === 'string' && v.length > 0) out[k] = v
		}
		return out
	}
	if (typeof raw === 'string' && raw.length > 0) {
		raw.split(',').forEach((pair) => {
			const trimmed = pair.trim()
			const idx = trimmed.indexOf(':')
			if (idx <= 0 || idx === trimmed.length - 1) return
			const business = trimmed.slice(0, idx).trim()
			const topic = trimmed.slice(idx + 1).trim()
			if (business && topic) out[business] = topic
		})
	}
	return out
}

class Config {
	get SERVICE_NAME(): string {
		return configReader('SERVICE_NAME', _.toString)
	}

	get LOG_LEVEL(): string {
		return configReader('LOG_LEVEL', _.toString)
	}

	get EXPRESS_HOST(): string {
		return configReader('EXPRESS_HOST', _.toString)
	}

	get EXPRESS_PORT(): number {
		return configReader('EXPRESS_PORT', _.toNumber)
	}

	get ODIN_ROOT_CONFIG_PATH(): string {
		return configReader('ODIN_ROOT_CONFIG_PATH', _.toString)
	}

	get ZK_CONFIG(): {
		MAX_RETRIES: number
		PROMISE_TIMEOUT: number
		TIMEOUT_INTERVAL: number
		CONNECTION_STRING: string
	} {
		return {
			MAX_RETRIES: configReader('ZK_CONFIG_MAX_RETRIES', _.toNumber),
			PROMISE_TIMEOUT: configReader('ZK_CONFIG_PROMISE_TIMEOUT', _.toNumber),
			TIMEOUT_INTERVAL: configReader('ZK_CONFIG_TIMEOUT_INTERVAL', _.toNumber),
			// Read directly from env — configReader throws on empty string, but
		// an empty CONNECTION_STRING is valid (means ZK/Odin is disabled).
		CONNECTION_STRING: process.env.ZK_CONFIG_CONNECTION_STRING || '',
		}
	}

	get KAFKA(): {
		BROKERS: string[]
		CLUSTER_ARN: string
		REGION: string
	} {
		// Use individual env vars whenever either KAFKA_CLUSTER_ARN or
		// KAFKA_BROKERS is set (k8s configmap / local .env pattern).
		// Fall back to configReader('KAFKA') only when neither is present,
		// i.e. a staging environment where the full object comes from Odin/ZK.
		const clusterArn = process.env.KAFKA_CLUSTER_ARN || ''
		const envBrokers = process.env.KAFKA_BROKERS || ''
		if (clusterArn || envBrokers) {
			return {
				BROKERS: toStringArray(envBrokers),
				CLUSTER_ARN: clusterArn,
				REGION: process.env.KAFKA_REGION || 'ap-south-1',
			}
		}
		return configReader('KAFKA')
	}

	/**
	 * businessName → Kafka topic map. MUST mirror ingestion-service +
	 * event-service so this consumer subscribes to every topic events can
	 * arrive on.
	 */
	get BUSINESS_TOPICS(): Record<string, string> {
		return configReader('BUSINESS_TOPICS', toBusinessTopicsMap)
	}

	get EVENT_TOPICS(): string[] {
		const map = this.BUSINESS_TOPICS
		return Array.from(new Set(Object.values(map))).filter(Boolean)
	}

	get DLQ_TOPIC(): string {
		return configReader('DLQ_TOPIC', _.toString)
	}

	get CONSUMER_GROUP_ID(): string {
		return configReader('CONSUMER_GROUP_ID', _.toString)
	}

	get PARTITIONS_CONCURRENCY(): number {
		return configReader('PARTITIONS_CONCURRENCY', _.toNumber)
	}

	get MAX_IN_FLIGHT(): number {
		return configReader('MAX_IN_FLIGHT', _.toNumber)
	}

	get HEARTBEAT_INTERVAL_MS(): number {
		return configReader('HEARTBEAT_INTERVAL_MS', _.toNumber)
	}

	get MONGO(): {
		HOST: string
		PORT: number
		DATABASE: string
		USER: string
		PASSWORD: string
		COLLECTION: string
		MIN_POOL: number
		MAX_POOL: number
	} {
		// Each field independently falls back to env so a developer can override
		// just MONGO_PASSWORD without redefining the whole block.
		const odinMongo = (Odin.getValue('MONGO') ?? {}) as Record<string, unknown>
		return {
			HOST: process.env.MONGO_HOST || (odinMongo.HOST as string) || 'localhost',
			PORT: Number(process.env.MONGO_PORT || (odinMongo.PORT as number) || 27017),
			DATABASE: process.env.MONGO_DATABASE || (odinMongo.DATABASE as string) || 'features',
			USER: process.env.MONGO_USER || (odinMongo.USER as string) || '',
			PASSWORD: process.env.MONGO_PASSWORD || (odinMongo.PASSWORD as string) || '',
			COLLECTION:
				process.env.MONGO_COLLECTION ||
				(odinMongo.COLLECTION as string) ||
				'user_features',
			MIN_POOL: Number(process.env.MONGO_MIN_POOL || (odinMongo.MIN_POOL as number) || 5),
			MAX_POOL: Number(process.env.MONGO_MAX_POOL || (odinMongo.MAX_POOL as number) || 100),
		}
	}

	get REDIS(): {
		HOST: string
		PORT: number
		PASSWORD: string
		DATABASE: number
	} {
		const envHost = process.env.REDIS_HOST
		if (envHost) {
			return {
				HOST: envHost,
				PORT: Number(process.env.REDIS_PORT || 6379),
				PASSWORD: process.env.REDIS_PASSWORD || '',
				DATABASE: Number(process.env.REDIS_DATABASE || 0),
			}
		}
		return configReader('REDIS')
	}

	get IDEMPOTENCY_ENABLED(): boolean {
		return configReader('IDEMPOTENCY_ENABLED', toBool)
	}

	get IDEMPOTENCY_TTL_SECONDS(): number {
		return configReader('IDEMPOTENCY_TTL_SECONDS', _.toNumber)
	}

	get SENTRY_DSN(): string {
		return process.env.SENTRY_DSN || Odin.getValue('SENTRY_DSN') || ''
	}

	get NEW_RELIC_LICENSE_KEY(): string {
		return process.env.NEW_RELIC_LICENSE_KEY || Odin.getValue('NEW_RELIC_LICENSE_KEY') || ''
	}
}

export const config = new Config()
Odin.initOdin(serviceConfig)
