import { GetClusterCredentialsCommand, RedshiftClient } from '@aws-sdk/client-redshift'
import { Pool, PoolConfig, QueryConfig, QueryResult, QueryResultRow } from 'pg'

import { ELogType, Logger } from '../../logger'
import { assert } from '../../utils/assertion.util'

const connectionErrorMessage = 'failed to establish connection with redshift'
export interface RedshiftClusterConfig {
	host: string
	port: number
	database: string
	// For IAM authentication
	useIamAuth?: boolean
	clusterIdentifier?: string
	dbUser?: string // Database user name in Redshift (must be associated with the IAM identity)
	region?: string
	// IAM credential settings
	credentialDurationSeconds?: number // Default: 3600 (1 hour)
	credentialRefreshPercentage?: number // Default: 0.8 (80% - refresh before expiration)
	// Reconnection settings
	maxRetryAttempts?: number // Default: 3
	reconnectBaseDelayMs?: number // Default: 1000 (1 second)
	reconnectMaxDelayMs?: number // Default: 10000 (10 seconds)
	reconnectJitterPercentage?: number // Default: 0.5 (50%)
	// For password authentication (fallback)
	user?: string
	password?: string
	max?: number
	idleTimeoutMillis?: number
	connectionTimeoutMillis?: number
	ssl?: boolean | { rejectUnauthorized?: boolean; ca?: string }
}

// Re-export pg types for convenience
export type { QueryConfig, QueryResult, QueryResultRow }

/**
 * RedshiftDb class for Redshift clusters using PostgreSQL connection pool
 * Note: Redshift clusters are PostgreSQL-compatible and support persistent connections.
 * This implementation uses a connection pool for better performance and connection management.
 */
export class RedshiftDb {
	private pool?: Pool

	private iamConfig: RedshiftClusterConfig | null = null

	private originalConfig: PoolConfig | RedshiftClusterConfig | null = null

	private credentialRefreshTimer: NodeJS.Timeout | null = null

	private credentialDurationSeconds: number

	private credentialRefreshPercentage: number

	private maxRetryAttempts: number

	private reconnectBaseDelayMs: number

	private reconnectMaxDelayMs: number

	private reconnectJitterPercentage: number

	private isReconnecting = false

	constructor() {
		// Set defaults
		this.credentialDurationSeconds = 3600 // 1 hour
		this.credentialRefreshPercentage = 0.8 // 80%
		this.maxRetryAttempts = 3
		this.reconnectBaseDelayMs = 1000 // 1 second
		this.reconnectMaxDelayMs = 10000 // 10 seconds
		this.reconnectJitterPercentage = 0.5 // 50%
	}

	private async getIamCredentials(
		clusterIdentifier: string,
		dbUser: string,
		database: string,
		region: string,
		durationSeconds: number,
	): Promise<{ user: string; password: string }> {
		const fnName = 'getIamCredentials'
		try {
			const redshiftClient = new RedshiftClient({ region })
			const command = new GetClusterCredentialsCommand({
				ClusterIdentifier: clusterIdentifier,
				DbUser: dbUser,
				DbName: database,
				DurationSeconds: durationSeconds,
				AutoCreate: false,
			})

			const response = await redshiftClient.send(command)

			if (!response.DbUser || !response.DbPassword) {
				throw new Error('Failed to get IAM credentials from Redshift')
			}

			Logger.info(
				ELogType.POSTGRES_LOG,
				__filename,
				fnName,
				`IAM credentials obtained for user: ${response.DbUser}, valid for ${command.input.DurationSeconds}s`,
			)

			return {
				user: response.DbUser,
				password: response.DbPassword,
			}
		} catch (error) {
			Logger.error(
				ELogType.POSTGRES_LOG,
				__filename,
				fnName,
				'Failed to get IAM credentials',
				error,
			)
			throw error
		}
	}

	private isAuthenticationError(error: unknown): boolean {
		if (!error || typeof error !== 'object') {
			return false
		}

		const errorMessage = (error as Error).message?.toLowerCase() || ''
		const errorCode = (error as { code?: string }).code || ''

		// Common PostgreSQL/Redshift authentication error patterns
		const authErrorPatterns = [
			'password authentication failed',
			'authentication failed',
			'invalid password',
			'password expired',
			'connection terminated',
			'28p01', // PostgreSQL error code for invalid password
			'28000', // PostgreSQL error code for invalid authorization
		]

		return (
			authErrorPatterns.some((pattern) => errorMessage.includes(pattern)) ||
			errorCode === '28P01' ||
			errorCode === '28000'
		)
	}

	private calculateBackoffDelay(attemptNumber: number): number {
		// Exponential backoff: baseDelay * 2^attemptNumber
		const exponentialDelay = this.reconnectBaseDelayMs * 2 ** (attemptNumber - 1)

		// Add jitter: random value between 0 and jitterPercentage of delay
		const jitter = Math.random() * exponentialDelay * this.reconnectJitterPercentage

		return Math.min(exponentialDelay + jitter, this.reconnectMaxDelayMs)
	}

	private async sleep(ms: number): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(resolve, ms)
		})
	}

	private async closeExistingPool(): Promise<void> {
		if (!this.pool) {
			return
		}

		try {
			await this.pool.end()
		} catch (closeError) {
			Logger.debug(
				ELogType.POSTGRES_LOG,
				__filename,
				'closeExistingPool',
				'Error closing old pool during reconnect',
				closeError,
			)
		}
		this.pool = undefined
	}

	private async attemptReconnection(attempt: number): Promise<void> {
		const fnName = 'attemptReconnection'
		const delay = this.calculateBackoffDelay(attempt)
		Logger.info(
			ELogType.POSTGRES_LOG,
			__filename,
			fnName,
			`Reconnection attempt ${attempt}/${this.maxRetryAttempts} after ${delay}ms delay`,
		)

		// eslint-disable-next-line no-await-in-loop
		await this.sleep(delay)

		// eslint-disable-next-line no-await-in-loop
		await this.closeExistingPool()

		if (!this.originalConfig) {
			throw new Error('Original config is missing')
		}

		// eslint-disable-next-line no-await-in-loop
		await this.connect(this.originalConfig)

		Logger.info(
			ELogType.POSTGRES_LOG,
			__filename,
			fnName,
			`Reconnection successful on attempt ${attempt}`,
		)
	}

	private async reconnectWithRetry(): Promise<void> {
		const fnName = 'reconnectWithRetry'
		if (!this.originalConfig || this.isReconnecting) {
			return
		}

		this.isReconnecting = true

		try {
			for (let attempt = 1; attempt <= this.maxRetryAttempts; attempt += 1) {
				try {
					// eslint-disable-next-line no-await-in-loop
					await this.attemptReconnection(attempt)
					this.isReconnecting = false
					return
				} catch (error) {
					Logger.warn(
						ELogType.POSTGRES_LOG,
						__filename,
						fnName,
						`Reconnection attempt ${attempt}/${this.maxRetryAttempts} failed`,
						error,
					)

					if (attempt === this.maxRetryAttempts) {
						Logger.error(
							ELogType.POSTGRES_LOG,
							__filename,
							fnName,
							`Failed to reconnect after ${this.maxRetryAttempts} attempts`,
							error,
						)
						throw error
					}
				}
			}
		} finally {
			this.isReconnecting = false
		}
	}

	private async createPoolWithCredentials(iamConfig: RedshiftClusterConfig): Promise<PoolConfig> {
		const credentials = await this.getIamCredentials(
			iamConfig.clusterIdentifier!,
			iamConfig.dbUser!,
			iamConfig.database,
			iamConfig.region!,
			this.credentialDurationSeconds,
		)

		return {
			host: iamConfig.host,
			port: iamConfig.port,
			database: iamConfig.database,
			user: credentials.user,
			password: credentials.password,
			max: iamConfig.max || 10,
			idleTimeoutMillis: iamConfig.idleTimeoutMillis || 30000,
			connectionTimeoutMillis: iamConfig.connectionTimeoutMillis || 10000,
			ssl: iamConfig.ssl !== undefined ? iamConfig.ssl : true,
		}
	}

	private async refreshCredentials(): Promise<void> {
		const fnName = 'refreshCredentials'
		if (!this.iamConfig) {
			return
		}

		try {
			Logger.info(
				ELogType.POSTGRES_LOG,
				__filename,
				fnName,
				'Refreshing IAM credentials before expiration',
			)

			// Get new credentials
			const newPoolConfig = await this.createPoolWithCredentials(this.iamConfig)

			// Close old pool
			const oldPool = this.pool
			if (oldPool) {
				await oldPool.end()
			}

			// Create new pool with fresh credentials
			this.pool = new Pool(newPoolConfig)
			this.setupPoolEventHandlers()

			// Test the new connection
			const poolClient = await this.pool.connect()
			poolClient.release()

			Logger.info(
				ELogType.POSTGRES_LOG,
				__filename,
				fnName,
				'Credentials refreshed successfully, new pool created',
			)

			// Schedule next refresh (refresh at 80% of credential lifetime)
			this.scheduleCredentialRefresh()
		} catch (error) {
			Logger.error(
				ELogType.POSTGRES_LOG,
				__filename,
				fnName,
				'Failed to refresh credentials, will retry on next query',
				error,
			)
			// Don't throw - let queries handle the error and trigger reconnection
		}
	}

	private scheduleCredentialRefresh(): void {
		// Clear existing timer
		if (this.credentialRefreshTimer) {
			clearTimeout(this.credentialRefreshTimer)
		}

		// Refresh at configured percentage of credential lifetime to avoid expiration
		const refreshDelay =
			this.credentialDurationSeconds * this.credentialRefreshPercentage * 1000

		this.credentialRefreshTimer = setTimeout(() => {
			this.refreshCredentials().catch((error) => {
				Logger.error(
					ELogType.POSTGRES_LOG,
					__filename,
					'scheduleCredentialRefresh',
					'Error in scheduled credential refresh',
					error,
				)
			})
		}, refreshDelay)

		Logger.debug(
			ELogType.POSTGRES_LOG,
			__filename,
			'scheduleCredentialRefresh',
			`Credential refresh scheduled in ${refreshDelay / 1000}s (${this.credentialRefreshPercentage * 100}% of ${this.credentialDurationSeconds}s lifetime)`,
		)
	}

	private setupPoolEventHandlers(): void {
		const fnName = 'setupPoolEventHandlers'
		if (!this.pool) {
			return
		}

		this.pool.on('error', (err) => {
			Logger.error(
				ELogType.POSTGRES_LOG,
				__filename,
				fnName,
				`Redshift client error, message: ${err.message}, stack: ${err.stack}`,
			)
		})

		this.pool.on('connect', () => {
			Logger.info(ELogType.POSTGRES_LOG, __filename, fnName, `Redshift client connected`)
		})

		// Removed 'acquire' event logging - too verbose, fires on every pool connection acquisition
		// Removed 'remove' event logging - too verbose, fires on every pool connection removal
	}

	private applyIamConfigSettings(iamConfig: RedshiftClusterConfig): void {
		this.credentialDurationSeconds =
			iamConfig.credentialDurationSeconds ?? this.credentialDurationSeconds
		this.credentialRefreshPercentage =
			iamConfig.credentialRefreshPercentage ?? this.credentialRefreshPercentage
		this.maxRetryAttempts = iamConfig.maxRetryAttempts ?? this.maxRetryAttempts
		this.reconnectBaseDelayMs = iamConfig.reconnectBaseDelayMs ?? this.reconnectBaseDelayMs
		this.reconnectMaxDelayMs = iamConfig.reconnectMaxDelayMs ?? this.reconnectMaxDelayMs
		this.reconnectJitterPercentage =
			iamConfig.reconnectJitterPercentage ?? this.reconnectJitterPercentage
	}

	private async createPoolConfig(
		config: PoolConfig | RedshiftClusterConfig,
	): Promise<PoolConfig> {
		const iamConfig = config as RedshiftClusterConfig
		if (iamConfig.useIamAuth && iamConfig.clusterIdentifier && iamConfig.dbUser) {
			if (!iamConfig.region) {
				throw new Error('region is required for IAM authentication')
			}

			this.iamConfig = { ...iamConfig }
			this.applyIamConfigSettings(iamConfig)
			const poolConfig = await this.createPoolWithCredentials(iamConfig)
			this.scheduleCredentialRefresh()
			return poolConfig
		}

		this.iamConfig = null
		return config as PoolConfig
	}

	private async initializePool(poolConfig: PoolConfig): Promise<void> {
		await this.closeExistingPool()
		this.pool = new Pool(poolConfig)
		this.setupPoolEventHandlers()

		const poolClient = await this.pool.connect()
		assert(poolClient, new Error(connectionErrorMessage))
		poolClient.release()
	}

	async connect(config: PoolConfig | RedshiftClusterConfig): Promise<void> {
		const fnName = 'connect'
		try {
			this.originalConfig = config
			const poolConfig = await this.createPoolConfig(config)
			await this.initializePool(poolConfig)
		} catch (error) {
			Logger.error(ELogType.POSTGRES_LOG, __filename, fnName, connectionErrorMessage, error)
			throw error
		}
	}

	async preparedQuery<R extends QueryResultRow>(
		queryConfig: QueryConfig,
	): Promise<QueryResult<R>> {
		const fnName = 'preparedQuery'
		if (!this.pool) {
			throw new Error('Redshift connection pool not initialized. Call connect() first.')
		}

		try {
			return await this.pool.query<R>(queryConfig)
		} catch (error) {
			// Check if this is an authentication error
			if (this.isAuthenticationError(error)) {
				Logger.warn(
					ELogType.POSTGRES_LOG,
					__filename,
					fnName,
					'Authentication error detected, attempting automatic reconnection',
					error,
				)

				// Attempt to reconnect with retry
				try {
					await this.reconnectWithRetry()

					// Retry the query after successful reconnection
					Logger.info(
						ELogType.POSTGRES_LOG,
						__filename,
						fnName,
						'Retrying query after successful reconnection',
					)
					return await this.pool.query<R>(queryConfig)
				} catch (reconnectError) {
					Logger.error(
						ELogType.POSTGRES_LOG,
						__filename,
						fnName,
						'Failed to reconnect after authentication error',
						reconnectError,
					)
					throw reconnectError
				}
			}

			// Re-throw non-authentication errors
			throw error
		}
	}

	disconnect(): void {
		// Clear credential refresh timer
		if (this.credentialRefreshTimer) {
			clearTimeout(this.credentialRefreshTimer)
			this.credentialRefreshTimer = null
		}

		// Clear configs
		this.iamConfig = null
		this.originalConfig = null
		this.isReconnecting = false

		// Close pool
		if (this.pool) {
			this.pool.end()
		}
	}

	async isReady(): Promise<boolean> {
		try {
			if (!this.pool) {
				return false
			}
			const result = await this.pool.query('SELECT 1')
			return result.rows[0]['?column?'] === 1
		} catch (error) {
			return false
		}
	}
}
