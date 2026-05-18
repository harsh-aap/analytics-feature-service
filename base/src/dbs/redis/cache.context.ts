import { RedisDb } from './redis.db'
import { H_SETObject, IRedisClient, RedisJSON } from '../../models/redis.model'

export class CacheContext {
	private _db: IRedisClient

	isReady: () => Promise<boolean> | boolean

	passRedisDb(db: RedisDb): void {
		this._db = db.getRedis()
		this.isReady = db.isReady
	}

	// * keys specific operations
	async delete(key: string): Promise<number> {
		return this._db.del(key)
	}

	async SetExpire(key: string, seconds: number): Promise<void> {
		await this._db.expire(key, seconds)
	}

	// * string operations
	async setString(key: string, value: string): Promise<string | null> {
		return this._db.set(key, value)
	}

	async getString(key: string): Promise<string | null> {
		return this._db.get(key)
	}

	async setStringWithExpire(key: string, value: string, seconds: number): Promise<string | null> {
		return this._db.set(key, value, {
			EX: seconds,
		})
	}

	// * JSON operations
	/**
	 * default path is '$', root path full json set.
	 * To modify a specific key, use the path as `$.key`.
	 * To modify a nested key, use the path as `$.key1.key2`.
	 * To modify an array index, use the path as `$.key[0]`.
	 * To modify multiple keys, use the path as `$['key1', 'key2']`.
	 */
	async jsonSet(key: string, value: RedisJSON, path = '$'): Promise<'OK' | null> {
		return this._db.json.set(key, path, value)
	}

	async multi(
		commands: Array<{
			key: string
			value: RedisJSON
			path: string
		}>,
	): Promise<Array<unknown>> {
		const multi = this._db.multi()
		commands.forEach((command) => {
			multi.json.set(command.key, command.path, command.value)
		})
		return multi.exec()
	}

	async jsonDelete(key: string): Promise<number> {
		return this.delete(key)
	}

	/**
	 * default path is '$', retrieve full GameData json.
	 * To access a specific key, use the path as `$.key`.
	 * To access a nested key, use the path as `$.key1.key2`.
	 * To access an array index, use the path as `$.key[0]`.
	 * To access multiple keys, use the path as `$['key1', 'key2']`.
	 */
	async jsonGet(key: string, path = '$'): Promise<RedisJSON | null> {
		return this._db.json.get(key, {
			path,
		})
	}

	// * HASH operations
	async hashGetOneKey(hashKey: string, key: string): Promise<string | undefined> {
		return this._db.hGet(hashKey, key)
	}

	async hashSetIfNotExist(hashKey: string, key: string, value: string): Promise<boolean> {
		return this._db.hSetNX(hashKey, key, value)
	}

	async hasGetAllKeys(hashKey: string): Promise<Record<string, string>> {
		return this._db.hGetAll(hashKey)
	}

	async hashSet(hashKey: string, key: string, value: string): Promise<number> {
		return this._db.hSet(hashKey, key, value)
	}

	async hashMSet(hashKey: string, keyValue: H_SETObject): Promise<number> {
		return this._db.hSet(hashKey, keyValue)
	}

	async hashDeleteKey(hashKey: string, key: string): Promise<number> {
		return this._db.hDel(hashKey, key)
	}

	async hashDeleteAllKeys(key: string): Promise<number> {
		return this.delete(key)
	}
}
