import { KafkaJS } from '@confluentinc/kafka-javascript'

import { KafkaClient } from './Client'
import { ELogType } from '../logger/constant'
import { Logger } from '../logger/logger'
import { baseConfig } from '../odin/baseConfig'

type AdminConfig = KafkaJS.AdminConfig
type FetchOffsetsPartition = KafkaJS.FetchOffsetsPartition
type GroupDescriptions = KafkaJS.GroupDescriptions
type GroupOverview = KafkaJS.GroupOverview
type ITopicConfig = KafkaJS.ITopicConfig
type PartitionOffset = KafkaJS.PartitionOffset

class Admin {
	private admin: ReturnType<KafkaJS.Kafka['admin']>

	constructor(
		private kafka: KafkaClient,
		config: AdminConfig,
	) {
		const defaultAdminConfig: AdminConfig = baseConfig.kafka_default_admin_config
		this.admin = this.kafka.client.admin({
			kafkaJS: {
				retry: config.retry ?? defaultAdminConfig.retry,
			},
		})
	}

	async connect(): Promise<void> {
		await this.admin.connect()
	}

	async disconnect(): Promise<void> {
		await this.admin.disconnect()
	}

	async listTopics(): Promise<string[]> {
		return this.admin.listTopics()
	}

	async createTopics(topics: ITopicConfig[]): Promise<boolean> {
		return this.admin.createTopics({
			// validateOnly: false,
			// waitForLeaders: true,
			timeout: 30000,
			topics,
		})
	}

	async deleteTopics(topics: string[]): Promise<void> {
		return this.admin.deleteTopics({
			topics,
			timeout: 30000,
		})
	}

	async describeGroups(groups: string[]): Promise<GroupDescriptions> {
		return this.admin.describeGroups(groups)
	}

	async listGroups(): Promise<{ groups: GroupOverview[]; errors?: unknown[] }> {
		const result = await this.admin.listGroups()
		// The Confluent library may return additional error information
		// Log any errors that occurred during the listGroups operation
		if ('errors' in result && Array.isArray(result.errors) && result.errors.length > 0) {
			Logger.warn(
				ELogType.KAFKA_LOG,
				'Admin.ts',
				'listGroups',
				`Encountered errors while listing groups: ${JSON.stringify(result.errors)}`,
			)
		}
		return {
			groups: result.groups,
			...('errors' in result && result.errors ? { errors: result.errors as unknown[] } : {}),
		}
	}

	async fetchTopicOffsets(topic: string): Promise<
		(PartitionOffset & {
			high: string
			low: string
		})[]
	> {
		return this.admin.fetchTopicOffsets(topic)
	}

	async fetchOffsets(groupId: string): Promise<
		{
			topic: string
			partitions: FetchOffsetsPartition[]
		}[]
	> {
		return this.admin.fetchOffsets({ groupId })
	}
}

export { Admin, AdminConfig, ITopicConfig }
