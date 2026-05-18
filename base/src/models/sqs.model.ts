import { CreateQueueRequest, QueueAttributeName } from '@aws-sdk/client-sqs'
import { ConsumerOptions } from 'sqs-consumer'

export { Message as SqsMessage } from '@aws-sdk/client-sqs'

export type QueueConfig = CreateQueueRequest
export type QueueAttributesMap = Partial<Record<QueueAttributeName, string>>

export type ConsumerConfig = Omit<ConsumerOptions, 'queueUrl' | 'sqs' | 'region'>

export type QueueAndDLQ = {
	actionName: string
	queueAttributes?: QueueAttributesMap
	shouldCreateDLQ: boolean
	DLQAttributes?: QueueAttributesMap
	maxReceiveCount?: number
}
