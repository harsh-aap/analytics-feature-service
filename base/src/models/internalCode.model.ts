enum INTERNAL_CODE_PREFIXES {
	WALLET,
	VPA,
	WITHDRAWAL,
	REWARD_PROCESSING,
	USER,
}

const walletPrefix = (code: string): string =>
	`${INTERNAL_CODE_PREFIXES[INTERNAL_CODE_PREFIXES.WALLET]}-${code}`
const vpaPrefix = (code: string): string =>
	`${INTERNAL_CODE_PREFIXES[INTERNAL_CODE_PREFIXES.VPA]}-${code}`
const withdrawalPrefix = (code: string): string =>
	`${INTERNAL_CODE_PREFIXES[INTERNAL_CODE_PREFIXES.WITHDRAWAL]}-${code}`
const rewardProcessingPrefix = (code: string): string =>
	`${INTERNAL_CODE_PREFIXES[INTERNAL_CODE_PREFIXES.REWARD_PROCESSING]}-${code}`
const userPrefix = (code: string): string =>
	`${INTERNAL_CODE_PREFIXES[INTERNAL_CODE_PREFIXES.USER]}-${code}`

export const internalCodes = {
	WALLET: {
		// NOTE - Put all WALLET codes here
		NOT_ENOUGH_BALANCE: walletPrefix('0001'),
	},

	VPA: {
		// NOTE - Put all VPA codes here
		INVALID_VPA: vpaPrefix('0001'),
	},

	WITHDRAWAL: {
		// NOTE - Put all WITHDRAWAL codes here
		IN_PROCESS_PLEASE_WAIT_BEFORE_RETRYING: withdrawalPrefix('0001'),
		CANNOT_WITHDRAW_BELOW_LOWER_LIMIT: withdrawalPrefix('0002'),
		CANNOT_WITHDRAW_ABOVE_UPPER_LIMIT: withdrawalPrefix('0003'),
		ORDER_EXPIRED_IN_CREATED_STATUS: withdrawalPrefix('0004'),
		FAILED_TO_QUEUE_PAYOUT_AT_PAYMENT_GATEWAY: withdrawalPrefix('0005'),
		RESERVATION_FAILED_DUE_SYSTEM_FAILURE: withdrawalPrefix('0006'),
		ORDER_YET_TO_REACH_EXPECTED_STATE: withdrawalPrefix('0007'),
		DISABLED: withdrawalPrefix('0008'),
	},

	REWARD_PROCESSING: {
		GAME_END_USER_ROAD_BREAKDOWN_REWARD_ALREADY_PROCESSED: rewardProcessingPrefix('0001'),
		ROAD_CONFIG_EXHAUSTED_NEW_ROAD_IS_NEEDED: rewardProcessingPrefix('0002'),
	},
	USER: {
		OTP_VERIFICATION_FAILED: userPrefix('0001'),
		USER_DISABLED: userPrefix('0002'),
		TOO_MANY_OTP_REQUESTS: userPrefix('0003'),
	},
}

export const allInternalCodes = Object.values(internalCodes).flatMap((category) =>
	Object.values(category),
)

export type internalCodesType = {
	// eslint-disable-next-line max-len
	[Category in keyof typeof internalCodes]: (typeof internalCodes)[Category][keyof (typeof internalCodes)[Category]]
}[keyof typeof internalCodes]
