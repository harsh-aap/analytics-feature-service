import { Pool, PoolConfig, QueryConfig, QueryResult, QueryResultRow } from 'pg'

import { ELogType, Logger } from '../../logger'
import { assert } from '../../utils/assertion.util'

const connectionErrorMessage = 'failed to establish connecction with postgres'
export class PostgresDb {
	private pool: Pool

	async connect(config: PoolConfig): Promise<void> {
		const fnName = 'connect'
		try {
			if (!this.pool) {
				this.pool = new Pool(config)
			}

			this.pool.on('error', (err) => {
				Logger.error(
					ELogType.POSTGRES_LOG,
					__filename,
					fnName,
					`Postgres client error, message: ${err.message}, stack: ${err.stack}`,
				)
			})

			this.pool.on('connect', () => {
				Logger.info(ELogType.POSTGRES_LOG, __filename, fnName, `Postgres client connected`)
			})

			this.pool.on('acquire', () => {
				Logger.debug(ELogType.POSTGRES_LOG, __filename, fnName, `Postgres client acquired`)
			})

			this.pool.on('remove', () => {
				Logger.debug(ELogType.POSTGRES_LOG, __filename, fnName, `Postgres client removed`)
			})

			const poolClient = await this.pool.connect()
			assert(poolClient, new Error(connectionErrorMessage))
		} catch (error) {
			Logger.error(ELogType.POSTGRES_LOG, __filename, fnName, connectionErrorMessage, error)
			throw error
		}
	}

	async preparedQuery<R extends QueryResultRow>(
		queryConfig: QueryConfig,
	): Promise<QueryResult<R>> {
		return this.pool.query<R>(queryConfig)
	}

	disconnect(): void {
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
