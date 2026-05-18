/* eslint-disable no-param-reassign */
import _ from 'lodash'
import * as winston from 'winston'

// constants
import { ELogType, MAX_SINGLE_FIELD_SIZE } from './constant'
import { EMPTY_STRING } from '../constants/immutable.constant'
import * as loggerModel from '../models/logger.model'

export function trimLogMessage(str: string | number | undefined, maxlen: number): string {
	if (_.isNumber(str)) {
		return str.toString()
	}
	if (_.isNil(str)) {
		return EMPTY_STRING
	}
	if (_.isEmpty(str)) {
		return EMPTY_STRING
	}
	if (str.length <= maxlen) {
		return str
	}
	return str.substring(0, maxlen)
}

export function defaultSanitizer(
	logMessage: loggerModel.ILogMessage,
	key: string,
	sanitizedLogMessage: loggerModel.ILogMessage,
	logSize?: number,
): loggerModel.ILogMessage {
	const value = logMessage[key]
	// Check if value exists (not null/undefined) and handle numbers separately
	// _.isEmpty(0) returns true, but we want to log numeric 0 values
	if (!_.isNil(value) && (_.isNumber(value) || !_.isEmpty(value))) {
		sanitizedLogMessage[key] = trimLogMessage(value, logSize || MAX_SINGLE_FIELD_SIZE)
	}
	return sanitizedLogMessage
}

// eslint-disable-next-line complexity
export function constructLogMessage(
	info: winston.Logform.TransformableInfo,
	logMessage: loggerModel.ILogMessage,
	config: loggerModel.ILoggerConfig,
): string {
	const reqOriginMsg: string = logMessage.reqOrigin ? `${logMessage.reqOrigin} ` : ''
	const logTypeMsg: string = `${logMessage.logType} `
	const requestIdMsg: string = `${logMessage.requestId} `
	const reqRemoteAddrMsg: string = logMessage.reqRemoteAddr ? `${logMessage.reqRemoteAddr} ` : ''
	const reqUrlMsg: string = logMessage.reqUrl ? `${logMessage.reqUrl} ` : ''
	const reqBodyMsg: string =
		!_.isNil(logMessage.reqBody) && !_.isEmpty(logMessage.reqBody)
			? `${logMessage.reqBody} `
			: ' '
	const reqQueryMsg: string =
		!_.isNil(logMessage.reqQuery) && !_.isEmpty(logMessage.reqQuery)
			? `${logMessage.reqQuery} `
			: ' '
	const reqUserAgentMsg: string = logMessage.reqUserAgent ? `${logMessage.reqUserAgent} ` : ''
	const resContentLengthMsg: string = logMessage.resContentLength
		? `${logMessage.resContentLength} `
		: ''
	const resTimeMsg: string = `${logMessage.resTime || ''}`
	const baseMsg: string = `${info.timestamp} ${config.serviceName} ${info.level} ${config.env} `
	const infoMsg: string = `${logMessage.fileName} ${logMessage.functionName} `
	const dataMsg: string = `${logMessage.message} `
	const codeMsg: string = logMessage.code ? `${logMessage.code} ` : ''
	const errMsg: string = logMessage.error ? `${logMessage.error}` : ''
	if (logMessage.logType === ELogType.HTTP_API_LOG) {
		return `${baseMsg}${logTypeMsg}${requestIdMsg}${reqOriginMsg}${reqRemoteAddrMsg}${reqUrlMsg}${reqBodyMsg}${reqQueryMsg}${codeMsg}${reqUserAgentMsg}${resContentLengthMsg}${resTimeMsg}${infoMsg}${dataMsg}${errMsg}`
	}
	return `${baseMsg}${logTypeMsg}${requestIdMsg}${reqQueryMsg}${reqBodyMsg}${infoMsg}${dataMsg}${codeMsg}${errMsg}`
}

export const fieldsToSanitize = [
	'fileName',
	'functionName',
	'requestId',
	'message',
	'reqOrigin',
	'reqRemoteAddr',
	'reqUrl',
	'reqBody',
	'reqQuery',
	'reqUserAgent',
	'resContentLength',
	'resTime',
	'errMsg',
	'errorData',
	'errorDetails',
	'internalCode',
]

// eslint-disable-next-line complexity
export const constructJsonLogMessage = (
	info: winston.Logform.TransformableInfo,
	logMessage: loggerModel.ILogMessage,
	config: loggerModel.ILoggerConfig,
): object => {
	const baseLog = {
		timestamp: info.timestamp,
		serviceName: config.serviceName,
		level: info.level,
		env: config.env,
		logType: logMessage.logType,
		requestId: logMessage.requestId,
		fileName: logMessage.fileName,
		functionName: logMessage.functionName,
		message: logMessage.message,
		code: logMessage.code || undefined,
		error: logMessage.error || undefined,
	}

	if (logMessage.logType === ELogType.HTTP_API_LOG) {
		return {
			...baseLog,
			reqOrigin: logMessage.reqOrigin || undefined,
			reqRemoteAddr: logMessage.reqRemoteAddr || undefined,
			reqUrl: logMessage.reqUrl || undefined,
			reqBody: logMessage.reqBody || undefined,
			reqQuery: logMessage.reqQuery || undefined,
			reqUserAgent: logMessage.reqUserAgent || undefined,
			resContentLength: logMessage.resContentLength || undefined,
			resTime: logMessage.resTime || undefined,
		}
	}

	return baseLog
}
