import { BusinessName } from '../constants'

/**
 * IngestedEvent mirrors the wire shape produced by ingestion-service
 * (see ingestion-service/internal/domain/event.go). We deliberately keep this
 * permissive: every concrete event_type lives behind its own builder and pulls
 * out the optional fields it cares about. The base contract every event must
 * meet is enforced by AJV in `feature.validator.ts`.
 *
 * NB: We could pull this from event-service, but the two services are
 * independent runtime processes, so we duplicate the shape rather than create
 * a cross-service runtime dependency.
 */
export interface IngestedEvent {
	// ── Required core ─────────────────────────────────────────────
	event_id: string
	event_type: string
	business_name: BusinessName
	anonymous_id: string
	event_ts_ms: number

	// ── Optional core ─────────────────────────────────────────────
	user_id?: string
	session_id?: string
	brand?: string
	platform?: 'web' | 'mobile' | 'shopify' | 'saas' | 'csv'
	source?: string
	env?: string  // server-stamped by ingestion-service: prod | uat | test

	// ── Web ───────────────────────────────────────────────────────
	page_url?: string
	referrer?: string
	user_agent?: string
	browser?: string
	browser_version?: string
	os?: string
	screen_resolution?: string
	viewport_size?: string
	utm_source?: string
	utm_medium?: string
	utm_campaign?: string
	utm_term?: string

	// ── Mobile ────────────────────────────────────────────────────
	screen_name?: string
	device_model?: string
	os_version?: string
	app_version?: string
	network_type?: string
	carrier?: string
	locale?: string
	advertising_id?: string

	// ── SaaS ──────────────────────────────────────────────────────
	org_id?: string
	workspace_id?: string
	plan_type?: string
	feature_name?: string
	subscription_id?: string
	api_version?: string
	trial_days_remaining?: number

	// ── Shopify ───────────────────────────────────────────────────
	shop_domain?: string
	shopify_order_id?: string
	shopify_customer_id?: string
	variant_id?: string
	fulfillment_status?: string
	shopify_event_type?: string
	tags?: string

	// ── Identity ──────────────────────────────────────────────────
	method?: string

	// ── Navigation ────────────────────────────────────────────────
	element_id?: string
	element_type?: string

	// ── Commerce ──────────────────────────────────────────────────
	failure_reason?: string
	product_id?: string
	product_name?: string
	category?: string
	price?: number
	currency?: string
	quantity?: number
	cart_id?: string
	order_id?: string
	discount?: number
	payment_method?: string

	// ── Search ────────────────────────────────────────────────────
	query?: string
	results_count?: number

	// ── Custom ────────────────────────────────────────────────────
	custom_event_name?: string
	custom_properties?: Record<string, unknown>

	// ── Ad attribution ────────────────────────────────────────────
	click_id?: string
	ad_platform?: string
	campaign_id?: string
	ad_group_id?: string
	ad_id?: string

	// ── GA4 cross-device matching ─────────────────────────────────
	ga_client_id?: string
	ga_session_id?: string

	// Allow forward-compatible fields without losing TS support.
	[key: string]: unknown
}
