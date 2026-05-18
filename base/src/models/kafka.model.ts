import { KafkaJS } from '@confluentinc/kafka-javascript'

type EachBatchPayload = KafkaJS.EachBatchPayload
type EachMessagePayload = KafkaJS.EachMessagePayload
type KafkaMessage = KafkaJS.KafkaMessage
type Message = KafkaJS.Message
type TopicMessages = KafkaJS.TopicMessages

export type MessageType = Omit<Message, 'value' | 'timestamp'> & {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value: Record<string, any>
	timestamp: string
	schemaVersionId?: string
}

export type TopicMessagesType = {
	[K in keyof TopicMessages]: K extends 'messages' ? MessageType[] : TopicMessages[K]
}

export type DecodedMessage = Omit<KafkaMessage, 'key' | 'value' | 'timestamp'> & {
	key: string | null
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value: Record<string, any>
	timestamp: string
	schemaVersionId?: string
}

export type ConsumerEachMessagePayload = Omit<EachMessagePayload, 'message'> & {
	message: DecodedMessage
}

export type EachMessageFunction = (payload: ConsumerEachMessagePayload) => Promise<void>

export type ConsumerEachBatchPayload = Omit<EachBatchPayload, 'batch'> & {
	batch: Omit<EachBatchPayload['batch'], 'messages'> & { messages: DecodedMessage[] }
}

export type EachBatchFunction = (payload: ConsumerEachBatchPayload) => Promise<void>
