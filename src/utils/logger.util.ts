import path from 'path'

import { ELogType, customLogger } from 'tst-base'

const getFileName = (fullPath: string): string => path.basename(fullPath)

export const AppLogger = (filePath: string): ReturnType<typeof customLogger> =>
	customLogger(ELogType.APP_LOG, getFileName(filePath))
