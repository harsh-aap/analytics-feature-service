import { Response } from 'express'

import {
	APP_CONTEXT_KEY,
	GAME_CONTEXT_KEY,
	PARTNER_TO_TOAST_CONTEXT_KEY,
	TOAST_TO_PARTNER_CONTEXT_KEY,
} from '../constants/baseConfig.constant'
import {
	IAppJWTModel,
	IGameJWTModel,
	IPartnerToToastJWTModel,
	IToastToPartnerJWTModel,
} from '../models/jwt.model'

export const getAppContext = (res: Response): IAppJWTModel => {
	const appContext: IAppJWTModel = res.locals[APP_CONTEXT_KEY] || {}
	return appContext
}
// this will be
export const getGameContext = (res: Response): IGameJWTModel => {
	const gameContext: IGameJWTModel = res.locals[GAME_CONTEXT_KEY] || {}
	return gameContext
}
// this will be used by the toast for the context of partner.
// Like Toast will use this to get the context of the call by freewin.
export const getPartnerToToastContext = (res: Response): IPartnerToToastJWTModel => {
	const partnerContext: IPartnerToToastJWTModel = res.locals[PARTNER_TO_TOAST_CONTEXT_KEY] || {}
	return partnerContext
}
// this will be used by the partner for the context of toast.
// Like freewin will use this to get the context of the call by toast.
export const getToastToPartnerContext = (res: Response): IToastToPartnerJWTModel => {
	const toastContext: IToastToPartnerJWTModel = res.locals[TOAST_TO_PARTNER_CONTEXT_KEY] || {}
	return toastContext
}
