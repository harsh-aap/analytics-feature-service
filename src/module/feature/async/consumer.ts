/* eslint-disable max-statements */
import { inject, injectable } from 'inversify'
import { ConsumerEachMessagePayload, KafkaService } from 'tst-base'

import { config } from '../../../configs/config'
import { TYPES } from '../../../ioc/types'
import { Limiter, pLimit } from '../../../utils/concurrency.util'
import { AppLogger } from '../../../utils/logger.util'
import { BuilderRegistry } from '../builders'
import { DLQReason } from '../constants'
import { FeatureService, NoUserKeyError } from '../feature.service'
import { FeatureValidator } from '../feature.validator'
import { IdempotencyService } from '../idempotency.service'

const logger = AppLogger(__filename)

@injectable()
export class FeatureConsumer {
	@inject(TYPES.FeatureValidator)
	private readonly validator: FeatureValidator

	@inject(TYPES.FeatureService)
	private readonly featureService: FeatureService

	@inject(TYPES.BuilderRegistry)
	private readonly registry: BuilderRegistry

	@inject(TYPES.IdempotencyService)
	private readonly idempotency: IdempotencyService

	private limiter: Limiter

	/**
	 * Subscribe to every topic in BUSINESS_TOPICS (deduplicated). The same
	 * consumer-group ID across pods round-robins partitions; the same group
	 * is reused across topics so a pod owns whole partitions of e.g.
	 * ecommerce-events end to end.
	 */
	async start(): Promise<void> {
		this.limiter = pLimit(config.MAX_IN_FLIGHT)
		this.registry.initialize()

		const topics = config.EVENT_TOPICS
		if (topics.length === 0) {
			throw new Error(
				'BUSINESS_TOPICS is empty; refusing to start consumer with no topics to subscribe to',
			)
		}

		await KafkaService.initializeConsumer({ groupId: config.CONSUMER_GROUP_ID })
		await KafkaService.startConsumer(
			{ topics },
			{
				partitionsConsumedConcurrently: config.PARTITIONS_CONCURRENCY,
				eachMessage: this.handle.bind(this),
			},
		)

		logger.info(
			'start',
			`Consumer started: groupId=${config.CONSUMER_GROUP_ID}, topics=[${topics.join(',')}], partitionConcurrency=${config.PARTITIONS_CONCURRENCY}, maxInFlight=${config.MAX_IN_FLIGHT}`,
		)
	}

	private async handle(payload: ConsumerEachMessagePayload): Promise<void> {
		const heartbeat = setInterval(() => {
			payload.heartbeat().catch((err) => {
				logger.warn('handle', 'heartbeat failed', err)
			})
		}, config.HEARTBEAT_INTERVAL_MS)

		try {
			await this.limiter(() => this.dispatch(payload))
		} finally {
			clearInterval(heartbeat)
		}
	}

	private async dispatch(payload: ConsumerEachMessagePayload): Promise<void> {
		const { topic, partition, message } = payload
		try {
			if (!message?.value) {
				logger.warn('dispatch', `empty message at ${topic}/${partition}@${message?.offset}`)
				return
			}

			const raw = message.value as unknown
			const validation = this.validator.validate(raw)
			if (!validation.ok || !validation.event) {
				logger.warn(
					'dispatch',
					`validation failed at ${topic}/${partition}@${message.offset}: ${JSON.stringify(validation.errors)}`,
				)
				await this.toDLQ(payload, DLQReason.VALIDATION_FAILED, {
					errors: validation.errors,
				})
				return
			}

			const event = validation.event

			// Idempotency must run BEFORE upsert. With $inc / $addToSet ops,
			// applying the same event twice would silently double counters.
			if (await this.idempotency.isProcessed(event.event_id)) {
				logger.debug('dispatch', `event already processed, skipping: ${event.event_id}`)
				return
			}

			logger.debug(
				'dispatch',
				`event received: id=${event.event_id}, type=${event.event_type}, business=${event.business_name}, topic=${topic}, partition=${partition}, offset=${message.offset}`,
			)

			try {
				await this.featureService.process(event)
			} catch (err) {
				if (err instanceof NoUserKeyError) {
					logger.warn('dispatch', err.message)
					await this.toDLQ(payload, DLQReason.NO_USER_KEY, {
						event_id: event.event_id,
					})
					return
				}
				logger.error(
					'dispatch',
					`upsert failed for event_id=${event.event_id}, type=${event.event_type}`,
					err,
				)
				await this.toDLQ(payload, DLQReason.UPSERT_FAILED, {
					event_id: event.event_id,
					error: (err as Error)?.message,
				})
				return
			}

			// Mark as processed only after a successful upsert so a Mongo
			// failure → restart still results in the event being applied.
			await this.idempotency.markProcessed(event.event_id)
		} catch (err) {
			logger.error(
				'dispatch',
				`unexpected error processing ${topic}/${partition}@${message?.offset}`,
				err,
			)
			await this.toDLQ(payload, DLQReason.PROCESSING_ERROR, {
				error: (err as Error)?.message,
			})
		}
	}

	private async toDLQ(
		payload: ConsumerEachMessagePayload,
		reason: DLQReason,
		extra: Record<string, unknown> = {},
	): Promise<void> {
		try {
			await KafkaService.publishMessage(config.DLQ_TOPIC, [
				{
					value: {
						originalTopic: payload.topic,
						originalPartition: payload.partition,
						originalOffset: payload.message?.offset ?? null,
						originalKey: payload.message?.key ?? null,
						originalValue: payload.message?.value ?? null,
						reason,
						service: config.SERVICE_NAME,
						ts: Date.now(),
						...extra,
					},
					timestamp: new Date().getTime().toString(),
				},
			])
		} catch (err) {
			// DLQ writes themselves can fail (broker down). Log and move on;
			// blocking the consumer on DLQ availability would only make the
			// outage worse.
			logger.error('toDLQ', `failed to publish DLQ message (reason=${reason})`, err)
		}
	}
}
