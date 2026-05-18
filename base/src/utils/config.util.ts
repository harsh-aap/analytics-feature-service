import _ from 'lodash'

import { Odin } from '../odin'

export const configReader = <T>(key: string, transform: (value: string) => T = _.identity): T => {
	const value = process.env[key] || Odin.getValue(key)
	if (!_.isNumber(value) && !_.isBoolean(value) && _.isEmpty(value)) {
		throw new Error(`No value found for key: ${key}`)
	}

	return transform(value)
}
