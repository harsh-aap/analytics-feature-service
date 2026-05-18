/* eslint-disable no-shadow */
export enum EOSSignals {
	SIGINT = 'SIGINT',
	SIGTERM = 'SIGTERM',
	EXIT = 'exit',
}

export const exitSignals: NodeJS.Signals[] = [EOSSignals.SIGINT, EOSSignals.SIGTERM]
