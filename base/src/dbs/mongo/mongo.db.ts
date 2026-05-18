import { Collection, Db, Document, MongoClient, MongoClientOptions, ObjectId } from 'mongodb'

type MongoConnectionConfig = {
	host: string
	port: number
	database: string
	user: string
	password: string
}

export class MongoDb {
	private _client: MongoClient

	private _db: Db

	async connect(
		connectionConfig: MongoConnectionConfig,
		options?: MongoClientOptions,
	): Promise<void> {
		const connectionString = `mongodb://${connectionConfig.user}:${connectionConfig.password}@${connectionConfig.host}:${connectionConfig.port}`
		this._client = new MongoClient(connectionString, options)
		await this._client.connect()
		this._db = this._client.db(connectionConfig.database)
	}

	getDb(): Db {
		if (!this._db) {
			throw new Error('Call connect first!')
		}
		return this._db
	}

	getCollection<T extends Document>(collectionName: string): Collection<T> {
		return this.getDb().collection<T>(collectionName)
	}

	getClient(): MongoClient {
		if (!this._client) {
			throw new Error('Call connect first!')
		}
		return this._client
	}

	async disconnect(): Promise<void> {
		if (this._client) {
			await this._client.close()
		}
	}

	async isReady(): Promise<boolean> {
		try {
			const result = await this._client.db().command({ ping: 1 })
			return result.ok === 1
		} catch {
			return false
		}
	}
}

export type WithMongoId<T> = Omit<T, 'id'> & { _id: ObjectId }
export type WithStringId<T> = Omit<T, '_id'> & { id: string }

export const mongoIdToString = <T extends { _id?: ObjectId }>(doc: T): WithStringId<T> => {
	const { _id, ...rest } = doc
	return {
		id: _id?.toHexString() || '',
		...rest,
	}
}
