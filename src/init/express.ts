import * as http from 'http'

import bodyParser from 'body-parser'
import express from 'express'

import { config } from '../configs/config'
import { Connector } from '../connectors/connector.interface'
import { AppLogger } from '../utils/logger.util'

const logger = AppLogger(__filename)

let httpServer: http.Server

export const startExpress = async (connectors: Connector[]): Promise<void> => {
	const app = express()

	app.use(bodyParser.json())

	app.get('/', (_req, res) => {
		res.status(200).send(`Hello from ${config.SERVICE_NAME}`)
	})

	const healthCheckHandler = async (
		_req: express.Request,
		res: express.Response,
	): Promise<void> => {
		try {
			const ready = (
				await Promise.all(connectors.map((connector) => connector.isReady()))
			).every(Boolean)
			if (ready) {
				res.status(200).json({ status: 'ok' })
			} else {
				res.status(503).json({ status: 'not_ready' })
			}
		} catch (err) {
			logger.error('healthCheck', 'Health check failed', err)
			res.status(503).json({ status: 'error' })
		}
	}

	app.get('/ready', healthCheckHandler)
	app.get('/live', healthCheckHandler)

	httpServer = app.listen(config.EXPRESS_PORT, config.EXPRESS_HOST, () => {
		logger.info(
			'startExpress',
			`Health server started in env ${process.env.NODE_ENV} on http://${config.EXPRESS_HOST}:${config.EXPRESS_PORT}`,
		)
	})
}

export const stopExpress = async (cb: () => Promise<void>): Promise<void> => {
	await new Promise<void>((resolve, reject) => {
		try {
			if (!httpServer) {
				cb().then(() => resolve()).catch(reject)
				return
			}
			httpServer.close(async () => {
				logger.info('stopExpress', 'Health server closed')
				try {
					await cb()
					resolve()
				} catch (err) {
					reject(err)
				}
			})
		} catch (err) {
			logger.error('stopExpress', 'Error stopping express', err)
			reject(err)
		}
	})
}
