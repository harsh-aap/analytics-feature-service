/**
 * GAME_END_REASON:
 * An enum that represents various reasons for a game to end. It includes:
 * - Credit cases: WIN
 * - No credit or lose cases: LOSE, USER_LEFT, DISCONNECTION, SKIP_TURN_EXHAUSTED
 * - Refund cases: DRAW
 */
export enum USER_GAME_END_REASON {
	// * credit cases
	WIN = 'WIN',

	// * no credit cases || lose cases
	LOSE = 'LOSE',
	USER_LEFT = 'USER_LEFT',
	DISCONNECTION = 'DISCONNECTION',
	SKIP_TURN_EXHAUSTED = 'SKIP_TURN_EXHAUSTED',

	// * refund cases
	DRAW = 'DRAW',
	TOURNAMENT_GAME_END = 'TOURNAMENT_GAME_END',
}

/**
 * REGISTRATION_ENUMS:
 * An enum that represents different states of game registration. It includes:
 * - Initial statuses: WAITING_FOR_MATCH, MATCH_IN_PROGRESS
 * - Refund cases: MATCH_NOT_FOUND, REGISTRATION_CANCELLED
 */
export enum REGISTRATION_ENUMS {
	// * initial status
	WAITING_FOR_MATCH = 'WAITING_FOR_MATCH',
	MATCH_IN_PROGRESS = 'MATCH_IN_PROGRESS',

	// * refund cases
	MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',
	REGISTRATION_CANCELLED = 'REGISTRATION_CANCELLED',
	REGISTRATION_IN_PROGRESS = 'REGISTRATION_IN_PROGRESS',
}

/**
 * REGISTRATION_REFUND_ENUMS:
 * An enum that represents different types of refunds for a registration. It includes:
 * - Refund cases: REFUND_DUE_TO_INCOMPLETE_MATCH
 */
export enum REGISTRATION_REFUND_ENUMS {
	REFUND_DUE_TO_INCOMPLETE_MATCH = 'REFUND_DUE_TO_INCOMPLETE_MATCH',
}

/**
 * REGISTRATION_STATUS:
 * A type that combines both USER_GAME_END_REASON and REGISTRATION_ENUMS,
 * representing all possible states of a game registration from start to finish.
 */
export type REGISTRATION_STATUS = USER_GAME_END_REASON | REGISTRATION_ENUMS

/**
 * GAME_END_ENUMS:
 * An enum that represents various reasons for a game to end. It includes:
 * - OPPONENT_LEAVE_GAME, OPPONENT_SKIP_TURN, OPPONENT_DISCONNECTED, DRAW, GAME_OVER
 */
export enum GAME_END_ENUMS {
	OPPONENT_LEAVE_GAME = 'OPPONENT_LEAVE_GAME',
	OPPONENT_SKIP_TURN = 'OPPONENT_SKIP_TURN',
	OPPONENT_DISCONNECTED = 'OPPONENT_DISCONNECTED',
	DRAW = 'DRAW',
	GAME_OVER = 'GAME_OVER',
}

export enum DEBIT_TYPE {
	GAME_REGISTRATION = 'GAME_REGISTRATION',
}
export enum CREDIT_TYPE {
	GAME_END = 'GAME_END',
	REFUND_DUE_TO_DRAW = 'REFUND_DUE_TO_DRAW',
	REFUND_DUE_TO_CANCELLED_REGISTRATION = 'REFUND_DUE_TO_CANCELLED_REGISTRATION',
	REFUND_DUE_TO_MATCH_NOT_FOUND = 'REFUND_DUE_TO_MATCH_NOT_FOUND',
}

export enum GAME_END_TYPE {
	DRAW = 'DRAW',
	WIN = 'WIN',
	LOSE = 'LOSE',
}
