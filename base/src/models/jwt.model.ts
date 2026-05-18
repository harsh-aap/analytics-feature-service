/* eslint-disable @typescript-eslint/naming-convention */
import { APP_LANGUAGE, DEVICE_TYPES, GAME_NAME } from './base.model'
import { CURRENCY_CODES } from '../constants/currency.constant'
/**
 * Represents a ToastJWT object.
 *
 * @property {string} uid - user id.
 * @property {string} un - username.
 * @property {string} pp - profile picture(avatar).
 * @property {string} did - device id.
 * @property {APP_LANGUAGE} loc - locale.
 * @property {string[]} sg - segments.
 * @property {DEVICE_TYPES} dt - device type.
 * @property {string} appv - app version.
 * @property {GAME_NAME} gn - game name.
 * @property {string} osv - OS version.
 * @property {string} pn - package name.
 */
export type AppJWT = {
	uid: string
	un: string
	pp: string
	did: string
	loc: APP_LANGUAGE
	sg: string[]
	dt: DEVICE_TYPES
	appv: string
	gn: GAME_NAME
	osv: string
	pn: string
	isG?: boolean // isGuest from super app token
}

export type IAppJWTModel = {
	userId: string
	username: string
	profilePicture: string
	deviceId: string
	locale: APP_LANGUAGE
	segments: string[]
	deviceType: DEVICE_TYPES
	appVersion: string
	gameName: GAME_NAME
	osVersion: string
	packageName: string
}

export type ISuperAppJWTModel = {
	userId: string
	username: string
	profilePicture: string
	deviceId: string
	locale: APP_LANGUAGE
	segments: string[]
	deviceType: DEVICE_TYPES
	appVersion: string
	osVersion: string
	packageName: string
	isGuest?: boolean
}

export enum APP_JWT_MODEL {
	userId = 'userId',
	username = 'username',
	profilePicture = 'profilePicture',
	deviceId = 'deviceId',
	locale = 'locale',
	segements = 'segements',
	deviceType = 'deviceType',
	appVersion = 'appVersion',
	gameName = 'gameName',
	osVersion = 'osVersion',
	packageName = 'packageName',
	isGuest = 'isGuest',
}

/**
 * Represents a GameJWT object.
 * @property {string} pid - Partner ID.
 * @property {string} uid - User ID.
 * @property {GAME_NAME} gn - Game name.
 * @property {DEVICE_TYPES} dt - Device type.
 * @property {string} guid - Game user ID.
 * @property {string} appv - App version.
 * @property {string} did - Device ID.
 * @property {string} un - Username.
 * @property {string} pp - Profile picture.
 * @property {number} webv - Web version.
 */
export interface GameJWTOverrides {
	lobby?: {
		currencyCode: CURRENCY_CODES
	}
}

export type GameJWT = {
	pid: string
	uid: string
	gn: GAME_NAME
	dt: DEVICE_TYPES
	guid: string
	appv?: number
	did?: string
	un?: string
	pp?: string
	webv?: number
	ovr?: GameJWTOverrides
	parp?: string
}
export type IGameJWTModel = {
	partnerId: string
	partnerUserId: string
	gameName: GAME_NAME
	deviceType: DEVICE_TYPES
	gameUserId: string
	appVersion?: string
	deviceId?: string
	username?: string
	profilePicture?: string
	webVersion?: number
	overrides?: GameJWTOverrides
	partnerParams?: string
}
export enum GAME_JWT_MODEL {
	partnerId = 'partnerId',
	partnerUserId = 'partnerUserId',
	gameName = 'gameName',
	deviceType = 'deviceType',
	gameUserId = 'gameUserId',
	appVersion = 'appVersion',
	deviceId = 'deviceId',
	username = 'username',
	profilePicture = 'profilePicture',
	webVersion = 'webVersion',
	overrides = 'overrides',
	partnerParams = 'partnerParams',
}

// Partner is Freewin in our case.

export type ToastToPartnerJWT = {
	pid: string
	uid: string
	gn: GAME_NAME
}

export type IToastToPartnerJWTModel = {
	partnerId: string
	partnerUserId: string
	gameName: GAME_NAME
}

export enum TOAST_TO_PARTNER_JWT_MODEL {
	partnerId = 'partnerId',
	partnerUserId = 'partnerUserId',
	gameName = 'gameName',
}

/**
 * Represents a ToastJWT object.
 *
 * @property {string} pid - Partner ID.
 * @property {string} uid - User ID.
 * @property {string} pp - Profile picture.
 * @property {string} un - Username.
 * @property {string} dId - device Id
 * @property {string} gn - game name
 * @property {string} dt - deviceType.
 * @property {string} appv - appVersion.
 */
export type PartnerToToastJWT = {
	pid: string
	uid: string
	gn: GAME_NAME
	dt: DEVICE_TYPES
	appv?: string
	did?: string
	un?: string
	pp?: string
}

// Partner is Freewin in our case.

export type IPartnerToToastJWTModel = {
	partnerId: string
	userId: string
	gameName: GAME_NAME
	deviceType: DEVICE_TYPES
	appVersion?: string
	deviceId?: string
	username?: string
	profilePicture?: string
}

export enum PARTNER_TO_TOAST_JWT_MODEL {
	partnerId = 'partnerId',
	userId = 'userId',
	gameName = 'gameName',
	deviceType = 'deviceType',
	appVersion = 'appVersion',
	deviceId = 'deviceId',
	username = 'username',
	profilePicture = 'profilePicture',
}
