/**
 * Source-of-truth event types this service knows how to specialise on.
 * Adding a new value here is purely additive: builders can opt-in via
 * supports() and unknown event_types still flow through the always-on
 * CoreFeatureBuilder.
 */
export const EVENT_TYPES = {
	PAGE_VIEW: 'page_view',
	SCREEN_VIEW: 'screen_view',
	PURCHASE: 'purchase',
	ADD_TO_CART: 'add_to_cart',
	USER_SIGNUP: 'user_signup',
	USER_LOGIN: 'user_login',
	SEARCH: 'search',
	CUSTOM: 'custom',
} as const

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]

/**
 * BusinessName must stay in sync with ingestion-service's domain.BusinessName
 * Go enum and event-service's BUSINESS_NAMES const. Adding a new business is
 * a coordinated change across all three services.
 */
/**
 * BusinessName is intentionally a plain string — brand membership is validated
 * at runtime by ingestion-service (BUSINESS_TOPICS env map) not at build time.
 * Adding a brand requires only an env-var change + service restart, no rebuild.
 */
export type BusinessName = string

/**
 * Reasons why a message ends up on the features.dlq topic.
 */
export enum DLQReason {
	DECODE_FAILED = 'decode_failed',
	VALIDATION_FAILED = 'validation_failed',
	NO_USER_KEY = 'no_user_key',
	UPSERT_FAILED = 'upsert_failed',
	PROCESSING_ERROR = 'processing_error',
}
