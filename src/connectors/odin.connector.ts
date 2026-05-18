import { injectable } from 'inversify'
import { Odin } from 'tst-base'

import { Connector } from './connector.interface'
import { config } from '../configs/config'
import { AppLogger } from '../utils/logger.util'

const logger = AppLogger(__filename)

@injectable()
export class OdinConnector implements Connector {
	connect = async (): Promise<void> => {
		// In dev we run entirely off `.env` and never touch Zookeeper.
		if (!config.ZK_CONFIG.CONNECTION_STRING) {
			logger.info('connect', 'No ZK connection string configured, skipping Odin')
			return
		}
		try {
			await Odin.loadDynamicProps({
				rootConfigPath: config.ODIN_ROOT_CONFIG_PATH,
				serviceName: config.SERVICE_NAME,
				zkConfig: {
					maxRetries: config.ZK_CONFIG.MAX_RETRIES,
					promiseTimeout: config.ZK_CONFIG.PROMISE_TIMEOUT,
					timeoutInterval: config.ZK_CONFIG.TIMEOUT_INTERVAL,
					zkConnectionString: config.ZK_CONFIG.CONNECTION_STRING,
				},
			})
			logger.info('connect', 'Odin connected')
		} catch (err) {
			logger.error('connect', 'Odin connection failed', err)
			throw err
		}
	}

	disconnect = (): void => {
		try {
			if (!config.ZK_CONFIG.CONNECTION_STRING) return
			Odin.disconnect()
			logger.info('disconnect', 'Odin disconnected')
		} catch (err) {
			logger.error('disconnect', 'Odin disconnect failed', err)
		}
	}

	isReady = async (): Promise<boolean> => {
		if (!config.ZK_CONFIG.CONNECTION_STRING) return true
		return Odin.isReady()
	}
}
