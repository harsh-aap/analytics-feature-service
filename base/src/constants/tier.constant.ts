/**
 * Tier system configuration constants.
 * All monetary values are stored in cents (1 USD = 100 cents).
 *
 * Tier 0: No deposits
 * Tier 1: At least 1 deposit, lifetime GMV < $500
 * Tier 2: Lifetime GMV >= $500
 * Tier 3: Lifetime GMV >= $2,000
 * Tier 4: Lifetime GMV >= $5,000
 * Tier 5: Lifetime GMV >= $10,000
 */

export enum TIER_SEGMENT {
	TIER_0 = 'TIER_0',
	TIER_1 = 'TIER_1',
	TIER_2 = 'TIER_2',
	TIER_3 = 'TIER_3',
	TIER_4 = 'TIER_4',
	TIER_5 = 'TIER_5',
}

export const TIER_THEME_AND_LABEL_MAP: Record<TIER_SEGMENT, { theme: string; label: string }> = {
	TIER_0: {
		theme: 'WOOD',
		label: 'Entry Pass',
	},
	TIER_1: {
		theme: 'BRONZE',
		label: 'Showtime Pass',
	},
	TIER_2: {
		theme: 'SILVER',
		label: 'VIP Pass',
	},
	TIER_3: {
		theme: 'GOLD',
		label: 'Backstage Pass',
	},
	TIER_4: {
		theme: 'PLATINUM',
		label: 'Platinum Pass',
	},
	TIER_5: {
		theme: 'DIAMOND',
		label: 'All Access',
	},
}

/** Minimum lifetime GMV (cents) required to unlock a tier. Tiers 0 and 1 have no GMV threshold. */
export const TIER_LIFETIME_THRESHOLDS: Record<number, number> = {
	2: 500, // TEST: $5 (prod: $500)
	3: 2_000, // TEST: $20 (prod: $2,000)
	4: 5_000, // TEST: $50 (prod: $5,000)
	5: 10_000, // TEST: $100 (prod: $10,000)
}

/** Minimum weekly GMV (cents) required to retain a tier during Sunday maintenance. */
export const TIER_WEEKLY_QUOTAS: Record<number, number> = {
	0: 0, // no quota
	1: 200, // TEST: $20 (prod: $200)
	2: 750, // TEST: $7.50 (prod: $750)
	3: 1_500, // TEST: $15 (prod: $1,500)
	4: 3_000, // TEST: $30 (prod: $3,000)
	5: 6_000, // TEST: $60 (prod: $6,000)
}

/** Grace weeks available per tier before a downgrade is applied. */
export const TIER_GRACE_WEEKS: Record<number, number> = {
	0: 0,
	1: 0,
	2: 1,
	3: 1,
	4: 1,
	5: 1,
}

const MS_PER_DAY = 86_400_000
const MS_PER_MINUTE = 60_000
/** Number of days before Sunday within which a new upgrade is protected from that Sunday's maintenance. */
export const LATE_WEEK_UPGRADE_PROTECTION_DAYS = 3
export const LATE_WEEK_UPGRADE_PROTECTION_MS = 5 * MS_PER_MINUTE // TEST: 5 mins (prod: LATE_WEEK_UPGRADE_PROTECTION_DAYS * MS_PER_DAY)

/** Maps TIER_SEGMENT to its numeric tier level. */
export const TIER_SEGMENT_TO_NUMBER: Record<TIER_SEGMENT, number> = {
	[TIER_SEGMENT.TIER_0]: 0,
	[TIER_SEGMENT.TIER_1]: 1,
	[TIER_SEGMENT.TIER_2]: 2,
	[TIER_SEGMENT.TIER_3]: 3,
	[TIER_SEGMENT.TIER_4]: 4,
	[TIER_SEGMENT.TIER_5]: 5,
}

/** Maps numeric tier level to TIER_SEGMENT. */
export const TIER_NUMBER_TO_SEGMENT: Record<number, TIER_SEGMENT> = {
	0: TIER_SEGMENT.TIER_0,
	1: TIER_SEGMENT.TIER_1,
	2: TIER_SEGMENT.TIER_2,
	3: TIER_SEGMENT.TIER_3,
	4: TIER_SEGMENT.TIER_4,
	5: TIER_SEGMENT.TIER_5,
}

/** Ordered list of all tier segments from lowest to highest. */
export const ALL_TIERS_ORDERED: TIER_SEGMENT[] = [
	TIER_SEGMENT.TIER_0,
	TIER_SEGMENT.TIER_1,
	TIER_SEGMENT.TIER_2,
	TIER_SEGMENT.TIER_3,
	TIER_SEGMENT.TIER_4,
	TIER_SEGMENT.TIER_5,
]

/** Bonus credited to the user when they unlock a new tier (one-time per upgrade). */
export const TIER_UNLOCK_BONUS_CENTS: Record<number, number> = {
	2: 500, // $5.00
	3: 1000, // $10.00
	4: 1500, // $15.00
	5: 1500, // $15.00
}

/** Bonus credited when the user meets their weekly GMV quota for their current tier. */
export const TIER_WEEKLY_BONUS_CENTS: Record<number, number> = {
	2: 500, // $5.00
	3: 1000, // $10.00
	4: 1500, // $15.00
	5: 1500, // $15.00
}

export type TierBenefit = { title: string; description: string }

/** Static benefits displayed per tier in the profile UI. */
export const TIER_BENEFITS: Record<TIER_SEGMENT, TierBenefit[]> = {
	[TIER_SEGMENT.TIER_0]: [
		{ title: 'Spin the wheel', description: '' },
		{ title: 'Basic cash lobby', description: '' },
		{ title: 'Free hourly gems', description: '' },
	],
	[TIER_SEGMENT.TIER_1]: [
		{ title: 'Daily missions', description: '' },
		{ title: 'Lobby unlocked', description: '' },
		{ title: 'Withdrawal limit', description: '$200' },
		{ title: 'Priority support', description: '' },
		{ title: 'Daily cash drop', description: '' },
		{ title: 'Spin the wheel', description: '' },
	],
	[TIER_SEGMENT.TIER_2]: [
		{ title: 'Lobby unlocked', description: '' },
		{ title: 'Spin the wheel & Daily missions', description: '' },
		{ title: 'Weekly rewards', description: '$200' },
		{ title: 'Tier reached rewards', description: '$10' },
		{ title: 'Withdrawal limit increase', description: '$500' },
		{ title: 'Priority support', description: '' },
	],
	[TIER_SEGMENT.TIER_3]: [
		{ title: 'Lobby unlocked', description: '' },
		{ title: 'Spin the wheel & Daily missions', description: '' },
		{ title: 'Weekly rewards', description: '$300' },
		{ title: 'Tier reached rewards', description: '$150' },
		{ title: 'Withdrawal limit increase', description: '$700' },
		{ title: 'Priority support', description: '' },
	],
	[TIER_SEGMENT.TIER_4]: [
		{ title: 'Lobby unlocked', description: '' },
		{ title: 'Weekly rewards', description: '$400' },
		{ title: 'Spin the wheel & Daily missions', description: '' },
		{ title: 'Tier reached rewards', description: '$200' },
		{ title: 'Withdrawal limit increase', description: '$900' },
		{ title: 'Priority support', description: '' },
	],
	[TIER_SEGMENT.TIER_5]: [
		{ title: 'Lobby unlocked', description: '' },
		{ title: 'Spin the wheel & Daily missions', description: '' },
		{ title: 'Weekly rewards', description: '$500' },
		{ title: 'Tier reached rewards', description: '$300' },
		{ title: 'Withdrawal limit increase', description: '$1000' },
		{ title: 'Priority support', description: '' },
	],
}
