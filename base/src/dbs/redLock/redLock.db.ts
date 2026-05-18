import Redis from 'ioredis'
import RedlockLib, { Lock, Options } from 'redlock'

import { ELogType, Logger } from '../../logger'

export type RedlockRedisConfig = {
	host: string
	port: number
	password: string
	db: number
	tls?: boolean
	connectionTimeout?: number
}

export class Redlock {
	private redlock: RedlockLib

	private redisClient: Redis

	public async initRedlock(
		config: RedlockRedisConfig,
		settings: Partial<Options> = {},
	): Promise<RedlockLib> {
		return new Promise((resolve, reject) => {
			try {
				this.redisClient = new Redis({
					host: config.host,
					port: config.port,
					password: config.password,
					db: config.db,
					...(config.tls ? { tls: {} } : {}),
					connectTimeout: config.connectionTimeout,
					retryStrategy: (times: number): number | null => {
						if (times > 3) {
							return null // Stop retrying after 3 attempts
						}
						return Math.min(times * 1000, 3000) // Exponential backoff
					},
				})

				this.redisClient.on('ready', () => {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					this.redlock = new RedlockLib([this.redisClient as any], {
						driftFactor: 0.01,
						retryCount: 3,
						retryDelay: 200,
						retryJitter: 200,
						...settings,
					})

					this.redlock.on('clientError', (err) => {
						Logger.error(
							ELogType.INTERNAL_LOG,
							'redlock.db.ts',
							this.initRedlock.name,
							'REDLOCK_ERROR',
							err as Error,
						)
					})

					resolve(this.redlock)
				})

				this.redisClient.on('error', (err) => {
					Logger.error(
						ELogType.INTERNAL_LOG,
						'redlock.db.ts',
						this.initRedlock.name,
						'REDIS_CONNECTION_ERROR',
						err as Error,
					)
					reject(err)
				})
			} catch (error) {
				Logger.error(
					ELogType.INTERNAL_LOG,
					'redlock.db.ts',
					this.initRedlock.name,
					'REDLOCK_INITIALIZATION_ERROR',
					error as Error,
				)
				reject(error)
			}
		})
	}

	private getRedlock(): RedlockLib {
		if (!this.redlock) {
			throw new Error('Redlock not initialized. Call initRedlock first.')
		}
		return this.redlock
	}

	public async disconnect(): Promise<void> {
		if (this.redlock) {
			await this.redlock.quit()
		}
	}

	public async acquire(resource: string[], ttl: number): Promise<Lock> {
		if (ttl <= 0) {
			throw new Error('Lock duration must be greater than 0')
		}

		return this.getRedlock().acquire(resource, ttl)
	}

	public async release(lock: Lock): Promise<void> {
		if (!lock) {
			return
		}

		try {
			this.getRedlock().release(lock)
		} catch (error) {
			Logger.error(
				ELogType.INTERNAL_LOG,
				'redlock.db.ts',
				this.release.name,
				'error in releasing redlock',
				error,
			)
		}
	}

	public async isReady(): Promise<boolean> {
		return this.redisClient.status === 'ready'
	}
}

export { Lock, Options }
