import { CURRENCY_CODES } from '../constants/currency.constant'
import { GAME_END_ENUMS, USER_GAME_END_REASON } from '../models/registration.model'

export const getWinnerGameEndType = (): USER_GAME_END_REASON => {
	return USER_GAME_END_REASON.WIN
}

export const getLoserGameEndType = (gameEndType: GAME_END_ENUMS): USER_GAME_END_REASON => {
	let playerGameEndType: USER_GAME_END_REASON = USER_GAME_END_REASON.LOSE
	switch (gameEndType) {
		case GAME_END_ENUMS.OPPONENT_LEAVE_GAME:
			playerGameEndType = USER_GAME_END_REASON.USER_LEFT
			break
		case GAME_END_ENUMS.OPPONENT_SKIP_TURN:
			playerGameEndType = USER_GAME_END_REASON.SKIP_TURN_EXHAUSTED
			break
		case GAME_END_ENUMS.OPPONENT_DISCONNECTED:
			playerGameEndType = USER_GAME_END_REASON.DISCONNECTION
			break
		default:
			break
	}
	return playerGameEndType
}

export const isFreeGame = (entryFee: number, entryFeeCurrencyCode: CURRENCY_CODES): boolean => {
	return (
		entryFee === 0 ||
		[CURRENCY_CODES.PLAY_COINS, CURRENCY_CODES.GEMS].includes(entryFeeCurrencyCode)
	)
}
