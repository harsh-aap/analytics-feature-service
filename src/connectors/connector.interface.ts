export interface Connector {
	connect(): Promise<void> | void

	disconnect(): Promise<void> | void

	isReady(): Promise<boolean> | boolean
}
