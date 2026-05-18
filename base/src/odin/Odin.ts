/* eslint-disable no-prototype-builtins */
import _ from 'lodash'

import { baseConfig } from './baseConfig'
import { ZKClient } from './ZkClient'
import * as loggerConstants from '../logger/constant'
import { Logger } from '../logger/logger'
import * as configModel from '../models/odin.model'

export class Odin {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private static props: { [key: string]: any } = {}

	private static propLevel: { [key: string]: number } = {}

	private static zkClient: ZKClient

	static initOdin(serviceConfig: { [key: string]: unknown } & { basePropKeys: string[] }): void {
		if (_.isNil(serviceConfig)) {
			Logger.debug(
				loggerConstants.ELogType.ODIN_LOG,
				'Odin',
				'initOdin',
				'Service configuration is not defined',
			)
			return
		}
		Object.keys(serviceConfig).forEach((key) => {
			if (serviceConfig.hasOwnProperty(key)) {
				Odin.props[key] = serviceConfig[key]
				Odin.propLevel[key] = configModel.EPropLevel.SERVICE
			}
		})
		Odin.loadBaseProps(serviceConfig.basePropKeys)
	}

	static async loadDynamicProps(config: {
		rootConfigPath: string
		serviceName: string
		zkConfig: configModel.IZKConfig
	}): Promise<void> {
		Logger.debug(
			loggerConstants.ELogType.ODIN_LOG,
			'Odin',
			'loadDynamicProps',
			'Loading dynamic properties from Zookeeper',
		)
		try {
			Odin.zkClient = new ZKClient(
				config.serviceName,
				config.zkConfig,
				config.rootConfigPath,
				Odin.setDynamicProps,
			)
			await Odin.zkClient.initializeZookeeperClient()
		} catch (error) {
			Logger.error(
				loggerConstants.ELogType.ODIN_LOG,
				'Odin',
				'loadDynamicProps',
				`Error loading dynamic properties: ${(error as Error).message}`,
			)
			throw error
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	static getValue(key: string): any {
		if (!_.isString(key)) {
			Logger.error(
				loggerConstants.ELogType.ODIN_LOG,
				'Odin',
				'getValue',
				'Key must be a string',
			)
			throw new Error('Key must be a string')
		}
		const value = Odin.props[key]
		return value
	}

	private static loadBaseProps(basePropKeys?: string[]): void {
		if (_.isNil(basePropKeys) || _.isNil(baseConfig) || !_.isArray(basePropKeys)) {
			Logger.debug(
				loggerConstants.ELogType.ODIN_LOG,
				'Odin',
				'loadBaseProps',
				'Base properties or basePropKeys are not defined or basePropKeys is not an array',
			)
			return
		}
		basePropKeys.forEach((key) => {
			if (baseConfig.hasOwnProperty(key)) {
				const value = baseConfig[key as keyof typeof baseConfig]
				Odin.props[key] = value
				Odin.propLevel[key] = configModel.EPropLevel.BASE
				Logger.debug(
					loggerConstants.ELogType.ODIN_LOG,
					'Odin',
					'loadBaseProps',
					`Loaded base property: ${key} with value: ${_.isString(value) ? value : JSON.stringify(value)}`,
				)
			}
		})
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private static setDynamicProps(key: string, value: any, isBase: boolean): void {
		if (!_.isString(key) || !_.isBoolean(isBase)) {
			Logger.debug(
				loggerConstants.ELogType.ODIN_LOG,
				'Odin',
				'setDynamicProps',
				'Key is not a string or isBase is not a boolean',
			)
			return
		}
		const currentLevel = isBase
			? configModel.EPropLevel.BASE_ZK
			: configModel.EPropLevel.SERVICE_ZK

		if (!Odin.propLevel.hasOwnProperty(key) || Odin.propLevel[key] <= currentLevel) {
			Odin.props[key] = value
			Odin.propLevel[key] = currentLevel
			Logger.debug(
				loggerConstants.ELogType.ODIN_LOG,
				'Odin',
				'setDynamicProps',
				`Set dynamic property: ${key} with value: ${_.isString(value) ? value : JSON.stringify(value)} at level: ${currentLevel}`,
			)
		}
	}

	static disconnect(): void {
		return this.zkClient.disconnect()
	}

	static isReady(): Promise<boolean> {
		return this.zkClient && this.zkClient.isReady()
	}
}
