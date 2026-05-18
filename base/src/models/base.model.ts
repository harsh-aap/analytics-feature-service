export enum DEVICE_TYPES {
	ANDROID = 'android',
	IOS = 'ios',
	WEB = 'web',
}

export enum GAME_NAME {
	GIN_RUMMY = 'gin-rummy',
	BLACKJACK = 'blackjack',
	BLACKJACK_TOURNAMENT = 'blackjack-tournament',
	BLACKJACK_ROYALE = 'blackjack-royale',
	BASKETBALL = 'basketball',
	BINGO = 'bingo',
	PINFALL = 'pinfall',
	PINFALL_MANIC = 'pinfall-manic',
	CRASH = 'crash',

	SUPERAPP = 'superapp', // for us - superapp, not a game but keeping here for compatibility with feature store, event service etc.
}

export const ASYNC_GAMES = [GAME_NAME.PINFALL, GAME_NAME.PINFALL_MANIC]

export const GAME_NAME_TO_GAME_DISPLAY_NAME = {
	[GAME_NAME.GIN_RUMMY]: 'Gin Rummy',
	[GAME_NAME.BLACKJACK]: '21 Hustle',
	[GAME_NAME.BLACKJACK_TOURNAMENT]: 'Blackjack Tournament',
	[GAME_NAME.BASKETBALL]: 'Basketball',
	[GAME_NAME.BLACKJACK_ROYALE]: '21 Royale',
	[GAME_NAME.BINGO]: 'Bingo',
	[GAME_NAME.PINFALL]: 'Pinfall',
	[GAME_NAME.PINFALL_MANIC]: 'Pinfall Manic',
	[GAME_NAME.CRASH]: 'Crash',

	[GAME_NAME.SUPERAPP]: 'Carnival', // for us - superapp, not a game but keeping here for compatibility with feature store, event service etc.
}

export enum APP_LANGUAGE {
	ENGLISH = 'en',
	HINDI = 'hi',
}
