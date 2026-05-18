import { GetSchemaVersionCommand, GlueClient } from '@aws-sdk/client-glue'
import { KafkaJS } from '@confluentinc/kafka-javascript'
import { Schema, Type } from 'avsc'
import { backOff } from 'exponential-backoff'
import _ from 'lodash'

import { InMemoryCacheWrapper } from '../cache/InMemoryCacheWrapper'
import { Logger } from '../logger'
import { ELogType } from '../logger/constant'
import { DecodedMessage, MessageType } from '../models/kafka.model'
import { assert, isDevelopmentEnv } from '../utils'

type KafkaMessage = KafkaJS.KafkaMessage
type Message = KafkaJS.Message

const FILENAME = 'kafka/schemaRegistry.ts'

// Hardcoded schemas for schema version IDs that are not in Glue registry.
// Types are pre-compiled once at module load to avoid repeated Type.forSchema() calls.
// Add entries here when a schema is known but missing from Glue.
const HARDCODED_SCHEMA_TYPES: Map<string, Type> = new Map(
	(
		[
			[
				'629b7c3c-5c7e-41bd-812d-6dd7fe3deac9',
				{
					name: 'BlackjackEvent',
					namespace: 'com.toast.events',
					type: 'record',
					fields: [
						{
							name: 'timestamp',
							type: { logicalType: 'timestamp-millis', type: 'long' },
						},
						{
							name: 'event_name',
							type: {
								name: 'EventType',
								symbols: [
									'poolMatched',
									'poolCreated',
									'playerWon',
									'playerRegistered',
									'playerMatched',
									'playerMatchFailed',
									'playerGameStarted',
									'playerGameEnded',
									'leaveMMRequested',
									'setUpTurnPlayed',
									'gameTurnPlayed',
									'slotResolution',
									'playerDisconnected',
									'playerReconnected',
									'userCreated',
									'setUpTurnPlayedV2',
								],
								type: 'enum',
							},
						},
						{ default: null, name: 'game_name', type: ['null', 'string'] },
						{ default: null, name: 'pool_id', type: ['null', 'string'] },
						{ default: null, name: 'toast_user_id', type: ['null', 'string'] },
						{ default: null, name: 'partner_id', type: ['null', 'string'] },
						{ default: null, name: 'partner_user_id', type: ['null', 'string'] },
						{ default: null, name: 'match_id', type: ['null', 'string'] },
						{
							default: null,
							name: 'opponent_ids',
							type: ['null', { items: 'string', type: 'array' }],
						},
						{ default: null, name: 'process_start_time', type: ['null', 'long'] },
						{ default: null, name: 'process_end_time', type: ['null', 'long'] },
						{ default: null, name: 'player_count', type: ['null', 'long'] },
						{ default: null, name: 'unmatched_players', type: ['null', 'long'] },
						{ default: null, name: 'end_time', type: ['null', 'long'] },
						{ default: null, name: 'duration', type: ['null', 'long'] },
						{ default: null, name: 'win_amount', type: ['null', 'double'] },
						{ default: null, name: 'win_amount_currency', type: ['null', 'string'] },
						{ default: null, name: 'registration_id', type: ['null', 'string'] },
						{ default: null, name: 'time_to_next_match', type: ['null', 'long'] },
						{ default: null, name: 'entry_fee', type: ['null', 'double'] },
						{ default: null, name: 'entry_fee_currency', type: ['null', 'string'] },
						{
							default: null,
							name: 'lobby_type',
							type: [
								'null',
								{
									name: 'LobbyType',
									symbols: ['free', 'premium', 'free_2_win'],
									type: 'enum',
								},
							],
						},
						{ default: null, name: 'lobby_id', type: ['null', 'string'] },
						{ default: null, name: 'is_win', type: ['null', 'boolean'] },
						{ default: null, name: 'game_end_reason', type: ['null', 'string'] },
						{ default: null, name: 'result', type: ['null', 'string'] },
						{ default: null, name: 'loss_amount', type: ['null', 'double'] },
						{ default: null, name: 'loss_amount_currency', type: ['null', 'string'] },
						{
							default: null,
							name: 'opponent_partner_user_id',
							type: ['null', 'string'],
						},
						{ default: null, name: 'opponent_partner_id', type: ['null', 'string'] },
						{ default: null, name: 'card_dealt', type: ['null', 'string'] },
						{ default: null, name: 'slot_chosen', type: ['null', 'int'] },
						{
							default: null,
							name: 'slot_cards',
							type: ['null', { items: 'string', type: 'array' }],
						},
						{ default: null, name: 'sum_total_of_slot', type: ['null', 'int'] },
						{ default: null, name: 'aces_in_the_slot', type: ['null', 'int'] },
						{ default: null, name: 'turn_number', type: ['null', 'int'] },
						{ default: null, name: 'time_taken_for_turn', type: ['null', 'int'] },
						{
							default: null,
							name: 'user_screen_background',
							type: ['null', 'boolean'],
						},
						{ default: null, name: 'this_turn_skipped', type: ['null', 'boolean'] },
						{ default: null, name: 'current_skip_count', type: ['null', 'int'] },
						{ default: null, name: 'current_sum', type: ['null', 'int'] },
						{ default: null, name: 'opponent_current_sum', type: ['null', 'int'] },
						{ default: null, name: 'is_ace_active', type: ['null', 'boolean'] },
						{
							default: null,
							name: 'is_opponent_ace_active',
							type: ['null', 'boolean'],
						},
						{ default: null, name: 'user_action', type: ['null', 'string'] },
						{ default: null, name: 'slot_number', type: ['null', 'int'] },
						{ default: null, name: 'user1_id', type: ['null', 'string'] },
						{ default: null, name: 'user1_partner_user_id', type: ['null', 'string'] },
						{ default: null, name: 'user1_partner_id', type: ['null', 'string'] },
						{ default: null, name: 'user2_id', type: ['null', 'string'] },
						{ default: null, name: 'user2_partner_user_id', type: ['null', 'string'] },
						{ default: null, name: 'user2_partner_id', type: ['null', 'string'] },
						{ default: null, name: 'user1_cards', type: ['null', 'int'] },
						{ default: null, name: 'user2_cards', type: ['null', 'int'] },
						{ default: null, name: 'user1_sum', type: ['null', 'int'] },
						{ default: null, name: 'user2_sum', type: ['null', 'int'] },
						{ default: null, name: 'is_user1_ace_active', type: ['null', 'boolean'] },
						{ default: null, name: 'is_user2_ace_active', type: ['null', 'boolean'] },
						{ default: null, name: 'slot_winner', type: ['null', 'string'] },
						{
							default: null,
							name: 'winner_by_disconnection',
							type: ['null', 'boolean'],
						},
						{ default: null, name: 'is_final_slot', type: ['null', 'boolean'] },
						{ default: null, name: 'disconnect_reason', type: ['null', 'string'] },
						{ default: null, name: 'disconnection_count', type: ['null', 'int'] },
						{ default: null, name: 'reconnection_count', type: ['null', 'int'] },
						{ default: null, name: 'partner_margin', type: ['null', 'double'] },
						{ default: null, name: 'glicko_rating', type: ['null', 'int'] },
						{ default: null, name: 'cost', type: ['null', 'double'] },
						{ default: null, name: 'user_rtp', type: ['null', 'double'] },
						{
							default: null,
							name: 'opponent_rtps',
							type: ['null', { items: 'double', type: 'array' }],
						},
						{ default: null, name: 'user_rating', type: ['null', 'double'] },
						{
							default: null,
							name: 'opponent_ratings',
							type: ['null', { items: 'double', type: 'array' }],
						},
						{
							default: null,
							name: 'opponent_wilson_score',
							type: ['null', { items: 'double', type: 'array' }],
						},
						{ default: null, name: 'toast_opponent_id', type: ['null', 'string'] },
						{ default: null, name: 'user_won_slot', type: ['null', 'boolean'] },
						{ default: null, name: 'user_cards', type: ['null', 'int'] },
						{ default: null, name: 'opponent_cards', type: ['null', 'int'] },
						{ default: null, name: 'user_sum', type: ['null', 'int'] },
						{ default: null, name: 'opponent_sum', type: ['null', 'int'] },
						{ default: null, name: 'is_user_ace_active', type: ['null', 'boolean'] },
						{ name: 'lobby_format', type: ['null', 'string'], default: null },
						{ name: 'rank', type: ['null', 'int'], default: null },
						{
							name: 'opponent_scores',
							type: ['null', { type: 'array', items: 'double' }],
							default: null,
						},
						{
							name: 'toast_opponent_ids',
							type: ['null', { type: 'array', items: 'string' }],
							default: null,
						},
						{
							name: 'opponent_partner_user_ids',
							type: ['null', { type: 'array', items: 'string' }],
							default: null,
						},
						{
							name: 'opponent_partner_ids',
							type: ['null', { type: 'array', items: 'string' }],
							default: null,
						},
						{ name: 'num_players', type: ['null', 'int'], default: null },
						{ name: 'user_wilson_score', type: ['null', 'double'], default: null },
						{ name: 'player_age_days', type: ['null', 'int'], default: null },
						{ name: 'user_lrtp', type: ['null', 'double'], default: null },
						{
							name: 'opponent_lrtps',
							type: ['null', { type: 'array', items: 'double' }],
							default: null,
						},
						{ name: 'lrtp_state', type: ['null', 'string'], default: null },
						{ name: 'matchmaking_version', type: ['null', 'string'], default: null },
						{ name: 'rtp_bucket_range', type: ['null', 'string'], default: null },
						{
							name: 'original_rtp_bucket_range',
							type: ['null', 'string'],
							default: null,
						},
						{ name: 'user_rtp_norm_factor', type: ['null', 'double'], default: null },
						{ name: 'user_skill_percentile', type: ['null', 'double'], default: null },
						{
							name: 'opponent_skill_percentiles',
							type: ['null', { type: 'array', items: ['null', 'double'] }],
							default: null,
						},
					],
				} as unknown as Schema,
			],
		] as [string, Schema][]
	).map(([id, schema]) => [id, Type.forSchema(schema)]),
)

export class SchemaRegistry {
	private glueClient: GlueClient

	private inMemoryCacheWrapper: InMemoryCacheWrapper

	private maxFetchSchemaAttempts: number = 5

	// Map to track in-flight schema fetch requests to prevent duplicate calls
	private inFlightRequests: Map<string, Promise<Type>> = new Map()

	// Set to track schema IDs that are permanently unavailable (EntityNotFoundException)
	// Avoids repeated Glue API calls for the same missing schema
	private notFoundSchemas: Set<string> = new Set()

	// CONSTANTS PICKED FROM HERE: https://github.com/awslabs/aws-glue-schema-registry/blob/d35d527b65299dbfce20c6f4f086a4f5555cb9e8/common/src/main/java/com/amazonaws/services/schemaregistry/utils/AWSSchemaRegistryConstants.java#L52
	private HEADER_VERSION_BYTE = 3

	// CONSTANTS PICKED FROM HERE: https://github.com/awslabs/aws-glue-schema-registry/blob/d35d527b65299dbfce20c6f4f086a4f5555cb9e8/common/src/main/java/com/amazonaws/services/schemaregistry/utils/AWSSchemaRegistryConstants.java#L52
	private COMPRESSION_BYTE = 0

	private SCHEMA_VERSION_ID_LENGTH = 16

	private SCHEMA_VERSION_ID_START_INDEX = 2

	constructor(region: string) {
		this.glueClient = new GlueClient({ region })
		this.inMemoryCacheWrapper = new InMemoryCacheWrapper()
		this.inMemoryCacheWrapper.initialise({
			stdTTL: 1000 * 60 * 60 * 10, // 10 hours
		})
	}

	private async fetchSchema(schemaVersionId: string): Promise<Schema> {
		try {
			const command = new GetSchemaVersionCommand({
				SchemaVersionId: schemaVersionId,
			})

			const response = await this.glueClient.send(command)
			const schemaDefinition = JSON.parse(response?.SchemaDefinition ?? '{}')
			if (_.isEmpty(schemaDefinition)) {
				throw new Error(`Schema not found`)
			}

			return schemaDefinition
		} catch (error) {
			Logger.error(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.fetchSchema.name,
				`Error in fetching schema for schemaVersionId: ${schemaVersionId}`,
				error,
			)
			throw error
		}
	}

	private shouldRetrySchemaFetch(
		schemaVersionId: string,
		error: Error & { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } },
		attemptNumber: number,
	): boolean {
		// Log retry attempts, but only log final failure at max attempts
		if (attemptNumber === this.maxFetchSchemaAttempts) {
			Logger.error(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.fetchSchema.name,
				`Failed to fetch schema after ${attemptNumber} attempts for schemaVersionId: ${schemaVersionId}`,
				error,
			)
		}

		return this.isRetryableError(error)
	}

	private isRetryableError(
		error: Error & { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } },
	): boolean {
		const errorName = error?.name || ''
		const httpStatusCode = error?.$metadata?.httpStatusCode || 0

		// EntityNotFoundException means the schema genuinely doesn't exist — not retryable
		const nonRetryableErrorNames = ['EntityNotFoundException', 'AccessDeniedException']
		if (nonRetryableErrorNames.includes(errorName)) {
			return false
		}

		const retryableErrorNames = [
			'ThrottlingException',
			'ServiceUnavailableException',
			'InternalServiceException',
		]

		const retryableStatusCodes = [429, 500, 502, 503, 504]

		return (
			retryableErrorNames.includes(errorName) || retryableStatusCodes.includes(httpStatusCode)
		)
	}

	async fetchSchemaType(schemaVersionId: string): Promise<Type> {
		// Check hardcoded schemas first — Type already pre-compiled, no Glue call needed
		const hardcodedType = HARDCODED_SCHEMA_TYPES.get(schemaVersionId)
		if (hardcodedType) {
			return hardcodedType
		}

		// Short-circuit for permanently missing schemas — no Glue call needed
		if (this.notFoundSchemas.has(schemaVersionId)) {
			throw new Error(`Schema not found (cached): ${schemaVersionId}`)
		}

		// Check if there's already an in-flight request for this schema
		const existingRequest = this.inFlightRequests.get(schemaVersionId)
		if (existingRequest) {
			Logger.debug(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.fetchSchemaType.name,
				`Waiting for existing request for schemaVersionId: ${schemaVersionId}`,
			)
			return existingRequest
		}

		// Create a new request with retry logic
		const requestPromise = backOff(
			async () => {
				const schema = await this.inMemoryCacheWrapper.getValue(schemaVersionId, () =>
					this.fetchSchema(schemaVersionId),
				)

				return Type.forSchema(schema)
			},
			{
				retry: this.shouldRetrySchemaFetch.bind(this, schemaVersionId),
				jitter: 'full',
				startingDelay: 1000, // Start with 1 second delay
				maxDelay: 10000, // Max 10 seconds delay
				numOfAttempts: this.maxFetchSchemaAttempts,
			},
		)

		// Store the promise in the in-flight requests map
		this.inFlightRequests.set(schemaVersionId, requestPromise)

		// Clean up the in-flight request when it completes (success or failure)
		requestPromise
			.finally(() => {
				this.inFlightRequests.delete(schemaVersionId)
			})
			.catch((error: Error & { name?: string }) => {
				// Cache permanently missing schemas to avoid repeated Glue calls
				if (error?.name === 'EntityNotFoundException') {
					this.notFoundSchemas.add(schemaVersionId)
				}
				// Other errors are handled by the caller
			})

		return requestPromise
	}

	async encodeMessages(messages: MessageType[]): Promise<Message[]> {
		assert(_.isArray(messages), 'messages must be an array')
		try {
			if (isDevelopmentEnv()) {
				return messages.map((message) => ({
					...message,
					value: Buffer.from(JSON.stringify(message.value), 'utf-8'),
				}))
			}
			const schemaTypes = await Promise.all(
				[...new Set(messages.map((message) => message.schemaVersionId))].map(
					async (schemaVersionId) => {
						if (!schemaVersionId) {
							return {}
						}
						return {
							[schemaVersionId]: await this.fetchSchemaType(schemaVersionId),
						}
					},
				),
			)
			const schemaTypeMap = schemaTypes.reduce((acc, schema) => {
				return { ...acc, ...schema }
			}, {})

			return messages.map((message) => {
				// NOTE: this is required for easier upgrade of base, to be able to produce old messages
				if (!message.schemaVersionId) {
					return {
						...message,
						value: Buffer.from(JSON.stringify(message.value), 'utf-8'),
					}
				}
				const uuidBuffer = Buffer.alloc(this.SCHEMA_VERSION_ID_LENGTH)
				Buffer.from(message.schemaVersionId.replace(/-/g, ''), 'hex').copy(uuidBuffer)

				const encodedValue = schemaTypeMap[message.schemaVersionId].toBuffer(message.value)

				return {
					...message,
					value: Buffer.concat([
						Buffer.from([this.HEADER_VERSION_BYTE]), // 1-byte version
						Buffer.from([this.COMPRESSION_BYTE]), // 1-byte compression
						uuidBuffer, // 16-byte schema version uuid
						encodedValue, // AVRO-encoded message
					]),
				}
			})
		} catch (error) {
			Logger.error(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.encodeMessages.name,
				`Error in encoding messages`,
				error,
			)
			throw error
		}
	}

	async decodeMessage(message: KafkaMessage): Promise<DecodedMessage> {
		try {
			const key = message.key?.toString('utf-8')
			if (_.isNil(message.value)) {
				return { ...message, key } as unknown as DecodedMessage
			}
			const headerVersion = message.value[0] // First byte is version
			// const compressionByte = message.value[1] // Second byte is compression

			// NOTE: this is required for backward compatibility with old messages in kafka..
			// TODO: Remove this after all the old messages are consumed/deleted from kafka.. that is anytime after Jan 2025
			if (headerVersion !== Buffer.from([this.HEADER_VERSION_BYTE])[0]) {
				return {
					...message,
					key,
					value: JSON.parse(message.value.toString('utf-8')),
				} as unknown as DecodedMessage
			}

			const schemaVersionIdBuffer = message.value.subarray(
				this.SCHEMA_VERSION_ID_START_INDEX,
				this.SCHEMA_VERSION_ID_START_INDEX + this.SCHEMA_VERSION_ID_LENGTH,
			)
			const schemaVersionId = Buffer.concat([schemaVersionIdBuffer])
				.toString('hex')
				.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')

			const type = await this.fetchSchemaType(schemaVersionId)

			return {
				...message,
				key: message.key?.toString('utf-8') || null,
				value: type.fromBuffer(
					message.value.subarray(
						this.SCHEMA_VERSION_ID_START_INDEX + this.SCHEMA_VERSION_ID_LENGTH,
					),
				),
				schemaVersionId,
			}
		} catch (error) {
			Logger.error(
				ELogType.KAFKA_LOG,
				FILENAME,
				this.decodeMessage.name,
				`Error in decoding message`,
				error,
			)
			throw error
		}
	}
}
