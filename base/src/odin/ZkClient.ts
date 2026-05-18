import _ from 'lodash'
import * as zookeeper from 'node-zookeeper-client'

import { createZkPath, getChildNode, removeLeadingSlash } from './util'
import * as loggerConstants from '../logger/constant'
import { Logger } from '../logger/logger'
import * as configModel from '../models/odin.model'

const basePath = 'base'

export class ZKClient {
	private zkClient: zookeeper.Client | undefined

	private zkConnected: boolean = false

	private zkReconnectionTimeout: NodeJS.Timeout | undefined

	constructor(
		private serviceName: string,
		private zkConfig: configModel.IZKConfig,
		private rootPath: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		private setProps: (key: string, value: any, isBase: boolean) => void,
	) {
		// Check if the Zookeeper connection string is defined
		if (
			_.isNil(this.serviceName) ||
			_.isEmpty(this.zkConfig?.zkConnectionString) ||
			_.isEmpty(this.rootPath)
		) {
			Logger.error(
				loggerConstants.ELogType.ODIN_LOG,
				'ZookeeperClient',
				'constructor',
				'ZK connection string is not defined. Skipping creating zkClient.',
			)
		}
	}

	disconnect(): void {
		if (this.zkClient) {
			this.zkClient.close()
		}
	}

	// Method to initialize the Zookeeper client
	// eslint-disable-next-line max-lines-per-function
	async initializeZookeeperClient(): Promise<void> {
		// Create the Zookeeper client
		try {
			this.zkClient = zookeeper.createClient(this.zkConfig?.zkConnectionString, {
				retries: this.zkConfig.maxRetries || 5,
				spinDelay: 0,
				sessionTimeout: this.zkConfig.promiseTimeout || 30000,
			})
			// Promise to handle the Zookeeper client connection
			const zkClientConnectedPromise = new Promise((resolve, reject) => {
				this.zkClient?.once('connected', async () => {
					try {
						Logger.debug(
							loggerConstants.ELogType.ODIN_LOG,
							'ZookeeperClient',
							'initializeZookeeperClient',
							'Connected to the zookeeper ensemble',
						)
						this.zkConnected = true
						await this.loadDynamicConfig(
							createZkPath(this.rootPath, basePath),
							'',
							true,
						)
						await this.loadDynamicConfig(
							createZkPath(this.rootPath, this.serviceName),
							'',
						)
						resolve(true)
					} catch (error) {
						Logger.error(
							loggerConstants.ELogType.ODIN_LOG,
							'ZookeeperClient',
							'initializeZookeeperClient',
							`Failed to load config after zk client connection: ${(error as Error).stack}`,
						)
						reject(error)
					}
				})
			})

			// Handle state changes of the Zookeeper client
			this.zkClient.on('state', (state) => {
				Logger.debug(
					loggerConstants.ELogType.CONFIG_CHANGE_LOG,
					'ZookeeperClient',
					'initializeZookeeperClient',
					`Zookeeper state change occurred! value of state ->  ${JSON.stringify(state)}`,
				)
				if (state === zookeeper.State.SYNC_CONNECTED) {
					Logger.debug(
						loggerConstants.ELogType.CONFIG_CHANGE_LOG,
						'ZookeeperClient',
						'initializeZookeeperClient',
						'Zookeeper client state changed to CONNECTED.',
					)
				} else if (
					state === zookeeper.State.DISCONNECTED ||
					state === zookeeper.State.EXPIRED
				) {
					Logger.debug(
						loggerConstants.ELogType.CONFIG_CHANGE_LOG,
						'ZookeeperClient',
						'initializeZookeeperClient',
						'Zookeeper client state changed to DISCONNECTED or EXPIRED.',
					)
					this.zkConnected = false
					this.reconnectClient()
				}
			})

			// Connect the Zookeeper client
			this.zkClient.connect()
			await zkClientConnectedPromise
		} catch (error) {
			Logger.error(
				loggerConstants.ELogType.CONFIG_CHANGE_LOG,
				'ZookeeperClient',
				'constructor',
				`Failed to initialize Zookeeper client: ${error}`,
			)
			throw error
		}
	}

	// Method to reconnect the Zookeeper client
	private reconnectClient(): void {
		this.initializeZookeeperClient()
	}

	// Method to load the config from Zookeeper
	private async loadDynamicConfig(
		configPath: string = this.rootPath,
		childPath: string = '',
		isBaseConfig: boolean = false,
	): Promise<void> {
		// Get the children of the config path
		if (!this.zkConnected) {
			Logger.error(
				loggerConstants.ELogType.CONFIG_CHANGE_LOG,
				'ZookeeperClient',
				'loadDynamicConfig',
				'Zookeeper client is not connected.',
			)
			return
		}
		await new Promise((resolve, reject) => {
			const fullPath = createZkPath(configPath, childPath)
			this.zkClient?.getChildren(
				fullPath,
				(event) => {
					Logger.info(
						loggerConstants.ELogType.CONFIG_CHANGE_LOG,
						'ZookeeperClient',
						'loadConfig',
						`Got watcher event: ${JSON.stringify(event)}`,
					)
					if (event && event.path) {
						this.loadChild(
							configPath,
							getChildNode(configPath, event.path),
							isBaseConfig,
						) // reload only the changed child
					}
				},
				async (error, children) => {
					if (error) {
						Logger.error(
							loggerConstants.ELogType.CONFIG_CHANGE_LOG,
							'ZookeeperClient',
							'loadConfig',
							`Failed to list children of ${configPath} due to: ${error}`,
						)
						return reject(new Error(`Failed to list children of ${configPath}`))
					}

					// Load each child of the config path
					if (children && Array.isArray(children)) {
						for (let index = 0; index < children.length; index += 1) {
							const child = children[index]
							if (child) {
								const currChildPath = createZkPath(childPath, child)
								// eslint-disable-next-line no-await-in-loop
								await this.loadDynamicConfig(
									configPath,
									currChildPath,
									isBaseConfig,
								)
								// eslint-disable-next-line no-await-in-loop
								await this.loadChild(configPath, currChildPath, isBaseConfig)
							}
						}
					}
					return resolve(children)
				},
			)
		})
	}

	// Method to load a child of the config path
	private async loadChild(
		configPath: string,
		child: string,
		isBaseConfig: boolean = false,
	): Promise<void> {
		if (!child || child.trim() === '') {
			Logger.debug(
				loggerConstants.ELogType.CONFIG_CHANGE_LOG,
				'ZookeeperClient',
				'loadChild',
				'Invalid child name provided',
			)
			return
		}
		// Check if the client is connected
		if (!this.zkConnected) {
			Logger.error(
				loggerConstants.ELogType.CONFIG_CHANGE_LOG,
				'ZookeeperClient',
				'loadChild',
				'Zookeeper client is not connected.',
			)
			return
		}

		await new Promise((resolve, reject) => {
			// Get the data of the child
			this.zkClient?.getData(
				createZkPath(configPath, child),
				async (event) => {
					Logger.info(
						loggerConstants.ELogType.CONFIG_CHANGE_LOG,
						'ZookeeperClient',
						'loadChild',
						`Got watcher event: ${JSON.stringify(event)}`,
					)
					if (event && event.path) {
						await this.loadChild(
							configPath,
							getChildNode(configPath, event.path),
							isBaseConfig,
						) // reload the changed child
					}
				},
				(error, data) => {
					if (error) {
						Logger.error(
							loggerConstants.ELogType.CONFIG_CHANGE_LOG,
							'ZookeeperClient',
							'loadChild',
							`Failed to get data of ${child} due to: ${error}`,
						)
						return reject(new Error(`Failed to get data of ${child}`))
					}

					// Store the data of the child
					const value = this.formatChildValue(data)
					this.setProps(removeLeadingSlash(child), value, isBaseConfig)
					return resolve({ child, value })
				},
			)
		})
	}

	private formatChildValue = (data: Buffer): string | number | boolean | undefined => {
		if (data) {
			const dataStr = data.toString('utf8')
			let value

			try {
				// Try to parse as JSON
				value = JSON.parse(dataStr)
			} catch {
				// If it's not JSON, check if it's a boolean
				if (dataStr.toLowerCase() === 'true') {
					value = true
				} else if (dataStr.toLowerCase() === 'false') {
					value = false
				} else {
					// If it's not a boolean, check if it's a number
					const numberValue = Number(dataStr)
					if (!Number.isNaN(numberValue) && dataStr.trim() !== '') {
						value = numberValue
					} else {
						// If it's not a number, treat it as a string
						value = dataStr
					}
				}
			}
			return value
		}
		return undefined
	}

	async isReady(): Promise<boolean> {
		try {
			await new Promise((resolve) => {
				if (!this.zkClient) {
					throw new Error('zk not connected')
				}
				this.zkClient.getChildren('/', (error) => {
					if (error) {
						throw new Error('zk not ready')
					} else {
						return resolve(true)
					}
				})
			})
			return true
		} catch {
			return false
		}
	}
}
