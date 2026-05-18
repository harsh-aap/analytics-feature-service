import _ from 'lodash'
import NodeCache from 'node-cache'

import { ELogType, Logger } from '../logger'
import { baseConfig } from '../odin/baseConfig'

export class InMemoryCacheWrapper {
	private _cache: NodeCache

	public initialise(cacheConfig: NodeCache.Options): void {
		this._cache = new NodeCache({ ...baseConfig.in_memory_cache_config, ...cacheConfig })
	}

	public async getValue<T>(
		key: NodeCache.Key,
		fetchFn: () => Promise<T>,
		customCacheDuration?: number,
	): Promise<T> {
		try {
			let cachedValue = this._cache.get<T>(key)
			if (!_.isUndefined(cachedValue)) {
				return cachedValue
			}
			cachedValue = await fetchFn()
			this._cache.set(key, cachedValue, customCacheDuration as number)
			return cachedValue
		} catch (error) {
			Logger.error(
				ELogType.CACHE_LOG,
				__filename,
				'getValue',
				`Error fetching value from cache, key: ${key}, error: ${error}`,
			)
			return Promise.reject(error)
		}
	}

	public async isReady(): Promise<boolean> {
		return this._cache !== undefined && this._cache !== null
	}

	public async disconnect(): Promise<void> {
		try {
			this._cache.flushAll()
			this._cache.close()
		} catch (error) {
			Logger.error(
				ELogType.CACHE_LOG,
				__filename,
				'disconnect',
				`Error disconnecting from cache, error: ${error}`,
			)
		}
	}
}
