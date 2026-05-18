import { Logger } from './logger'
import { ENodeEnvironment, ELogLevel, ELogType } from './constant'

// process.env.NODE_ENV = 'production'

Logger.initializeLogger({
	env: ENodeEnvironment.PRODUCTION,
	logFolder: 'logs',
	logLevel: ELogLevel.INFO,
	serviceName: 'MyExpressApp',
})

Logger.debug(ELogType.HTTP_API_LOG, 'testServer.ts', 'init_function', 'Hello, World!', '', '1234')
Logger.info(
	ELogType.HTTP_API_LOG,
	'testServer.ts',
	'init_function',
	JSON.stringify({
		id: 'this is id',
		id2: 'and this is id2, how do u do?',
		foo1: 'foobar',
		foo2: 'foobar foobar  foobar',
		foo3: 'foobar foobar  foobar   foobar',
	}),
	'',
	'1234',
)
Logger.warn(ELogType.HTTP_API_LOG, 'testServer.ts', 'init_function', 'Hello, World!', '', '1234')
Logger.error(
	ELogType.HTTP_API_LOG,
	'testServer.ts',
	'init_function',
	'Hello, World!',
	new Error('jabardast h ye error!'),
	'1234',
)
