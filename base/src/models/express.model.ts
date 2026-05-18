import { APP_LANGUAGE, DEVICE_TYPES, GAME_NAME } from './base.model'

export interface IRequestContext {
	app: {
		userId: string
		version: number
		gameName: GAME_NAME
		locale: APP_LANGUAGE
		deviceId: string
		deviceType: DEVICE_TYPES
	}
	ipAddress: string
	requestId: string
}
