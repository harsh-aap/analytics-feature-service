import _ from 'lodash'

import { CacheContext } from '../dbs/redis/cache.context'
import { RedisDb } from '../dbs/redis/redis.db'
import { ELogType, Logger } from '../logger'
import { configReader } from '../utils'

export interface BaseUserSegment {
	userId: string
	segments: string[]
	updatedAt: Date
}

export class SegmentationClient {
	private static cacheContext: CacheContext

	private static redisDb: RedisDb

	public static async connect(): Promise<void> {
		this.redisDb = new RedisDb()

		await this.redisDb.connect({
			mode: 'standalone',
			config: configReader('segmentation_redis_config'),
		})
		this.cacheContext = new CacheContext()
		this.cacheContext.passRedisDb(this.redisDb)
	}

	public static async disconnect(): Promise<void> {
		await this.redisDb.disconnect()
	}

	public static async isReady(): Promise<boolean> {
		return this.redisDb.isReady()
	}

	/**
	 * returns the user segmentations
	 * @param userId
	 * @returns { userId: string, segments: string[], updatedAt: Date }
	 */
	static async getUserSegmentations(userId: string): Promise<BaseUserSegment> {
		try {
			const key = `segmentation:${userId}`
			const value = await this.cacheContext.getString(key)
			return value ? JSON.parse(value) : { userId, segments: [], updatedAt: null }
		} catch (error) {
			Logger.error(
				ELogType.CACHE_LOG,
				__filename,
				this.getUserSegmentations.name,
				'Error fetching user segmentations',
				error,
			)
			throw error
		}
	}

	/**
	 * check if the user has a specific segment
	 * @param userId
	 * @param segment
	 * @returns { boolean }
	 */
	static async checkUserSegmentation(userId: string, segment: string): Promise<boolean> {
		try {
			const segmentation = await this.getUserSegmentations(userId)
			if (_.isArray(segmentation?.segments)) {
				return segmentation?.segments?.includes(segment)
			}
			return false
		} catch (error) {
			Logger.error(
				ELogType.CACHE_LOG,
				__filename,
				this.checkUserSegmentation.name,
				'Error checking user segmentation',
				error,
			)
			throw error
		}
	}

	/**
	 * check if the user has
	 * @param userId
	 * @param segments
	 * @returns { { [key: string]: boolean } }
	 */
	static async checkUserSegmentations(
		userId: string,
		segments: string[],
	): Promise<{ [key: string]: boolean }> {
		try {
			const result: { [key: string]: boolean } = {}
			const segmentation = await this.getUserSegmentations(userId)
			if (_.isArray(segmentation?.segments)) {
				segments.forEach((segment) => {
					result[segment] = segmentation?.segments?.includes(segment)
				})
			}
			return result
		} catch (error) {
			Logger.error(
				ELogType.CACHE_LOG,
				__filename,
				this.checkUserSegmentations.name,
				'Error checking user segmentations',
				error,
			)
			throw error
		}
	}

	/**
	 * set the user segmentation in the cache
	 * @param userId
	 * @param segments
	 * @returns { void }
	 */
	static async setUserSegmentations(userId: string, segments: string[]): Promise<void> {
		try {
			const key = `segmentation:${userId}`
			const value = JSON.stringify({ userId, segments, updatedAt: new Date() })
			await this.cacheContext.setString(key, value)
		} catch (error) {
			Logger.error(
				ELogType.CACHE_LOG,
				__filename,
				this.setUserSegmentations.name,
				'Error setting user segmentations',
				error,
			)
			throw error
		}
	}
}
