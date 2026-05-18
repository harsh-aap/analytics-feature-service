// eslint-disable-next-line @typescript-eslint/naming-convention
export enum ERR_CODES {
	ASSERTION_ERROR = 'ERR_ASSERTION',
	VALIDATION_ERROR = 'ERR_VALIDATION',
	DATABASE_ERROR = 'ERR_DB',
	USER_ERROR = 'ERR_USER',
	INTERNAL_ERROR = 'ERR_INTERNAL',
	JOI_VALIDATION_ERROR = 'ValidationError',
}
export interface ITstError extends Error {
	code?: ERR_CODES
}
