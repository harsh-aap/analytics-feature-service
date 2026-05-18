export const isDevelopmentEnv = (): boolean => {
	return process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging'
}

export const isProductionEnv = (): boolean => {
	return process.env.NODE_ENV === 'production'
}

export const isStagingEnv = (): boolean => {
	return process.env.NODE_ENV === 'staging'
}
