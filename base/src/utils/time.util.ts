import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

// Extend Day.js with timezone support
dayjs.extend(utc)
dayjs.extend(timezone)

// PST/PDT timezone (America/Los_Angeles handles both automatically)
const PST_TIMEZONE = 'America/Los_Angeles'

/**
 * Get current timestamp in milliseconds (UTC)
 * Use this for consistent timestamp generation across all services
 */
export const getCurrentTimestamp = (): number => {
	return Date.now()
}

/**
 * Get current timestamp in PST/PDT timezone as milliseconds
 * Use this when you need timezone-aware current time
 */
export const getCurrentTimestampPST = (): number => {
	return dayjs().tz(PST_TIMEZONE).valueOf()
}

export const getIsoTimestamp = (): string => {
	return dayjs().toISOString()
}

export function getStartOfDayTimestampSuperApp(timestamp: number = Date.now()): number {
	return dayjs(timestamp).tz(PST_TIMEZONE).startOf('day').valueOf()
}

export function getEndOfDayTimestampSuperApp(timestamp: number = Date.now()): number {
	return dayjs(timestamp).tz(PST_TIMEZONE).endOf('day').valueOf()
}

export function getSecondsUntilEndOfDaySuperApp(): number {
	const now = Date.now()
	const endOfDay = getEndOfDayTimestampSuperApp(now)
	const secondsUntilEnd = Math.ceil((endOfDay - now) / 1000)
	return Math.max(1, secondsUntilEnd)
}

export function getExpireAtWithJitterSuperApp(timestamp: number = Date.now()): Date {
	const endOfToday = dayjs(timestamp).tz(PST_TIMEZONE).endOf('day')
	const jitterSeconds = Math.floor(Math.random() * 11)
	const expireAt = endOfToday.add(jitterSeconds, 'second').toDate()
	return expireAt
}

export function isTimestampTodaySuperApp(
	timestamp: number,
	referenceTimestamp: number = Date.now(),
): boolean {
	const referenceDayStart = getStartOfDayTimestampSuperApp(referenceTimestamp)
	const timestampDayStart = getStartOfDayTimestampSuperApp(timestamp)
	return timestampDayStart === referenceDayStart
}

export function isLastTimestampTodaySuperApp(
	timestamps: number[],
	currentTimestamp: number = Date.now(),
): boolean {
	if (timestamps.length === 0) {
		return false
	}
	const lastTimestamp = timestamps[timestamps.length - 1]
	return isTimestampTodaySuperApp(lastTimestamp, currentTimestamp)
}

export function getTodayDateStringSuperApp(timestamp: number = Date.now()): string {
	return dayjs(timestamp).tz(PST_TIMEZONE).format('YYYY-MM-DD')
}
