import api from '@/utils/request'

/**
 * API contracts for the static-composition designated-player flow.
 *
 * The server owns all money calculations.  Client-side state only carries the
 * group configuration and the user's chosen compatible offer for each player.
 */

export type CompositionSkuStatus = 'ready' | 'missing_binding' | 'not_configured' | 'unavailable'

export interface DesignatedOfferSpec {
  id: number | string
  name: string
  display_name?: string | null
  price?: number
  required_player_type_id?: number | null
  required_player_type_name?: string | null
  required_player_type_priority?: number | null
  player_count?: number
  is_active?: boolean
}

export interface DesignatedOfferPackage {
  id: number
  name: string
  player_count: number
  package_family_id?: number | null
  package_family_code?: string | null
  package_family_name?: string | null
  base_price?: number
  cover_url?: string
  image_url?: string
  description?: string
  specs?: DesignatedOfferSpec[]
}

export interface PlayerOffer {
  id: number | string
  player_id: number
  player_name?: string | null
  player_type_id?: number | null
  player_type_name?: string | null
  designated_billing_type_id?: number | null
  designated_billing_type_name?: string | null
  designated_billing_type_priority?: number | null
  package_family_id?: number | null
  package_family_code?: string | null
  package_family_name?: string | null
  is_active?: boolean
  is_available?: boolean
  sort_order?: number
  is_compatible?: boolean
  unavailable_reason?: string | null
  package_family?: {
    id: number | string
    code?: string | null
    name?: string | null
    packages?: DesignatedOfferPackage[]
  } | null
  package?: DesignatedOfferPackage | null
  packages?: DesignatedOfferPackage[]
}

export interface PlayerOffersResult {
  player_id: number
  offers: PlayerOffer[]
}

export interface DesignatedDraftPlayerInput {
  player_id: number
  player_offer_id?: number | string | null
  package_id?: number | null
  spec_id?: number | string | null
}

export interface DesignatedDraftPayload {
  /** Kept for backward-compatible server aliases; base_spec_id is authoritative. */
  package_id?: number | null
  base_package_id?: number | null
  base_spec_id: number | string
  required_players?: number
  booked_hours: number
  designated_player_ids: number[]
  designated_offers?: DesignatedDraftPlayerInput[]
}

export interface DesignatedPricingLine {
  id?: string | number
  kind?: 'designated' | 'public' | string
  line_type?: 'designated' | 'public' | string
  source?: 'designated' | 'public' | string
  player_id?: number | null
  player_ids?: number[]
  player_name?: string | null
  names?: string[]
  player_names?: string[]
  name?: string | null
  player_type_name?: string | null
  title?: string | null
  quantity?: number
  player_count?: number
  unit_price?: number
  unit_price_per_hour?: number
  price_per_hour?: number
  total_price_per_hour?: number
  amount?: number
  amount_per_hour?: number
  detail?: string | null
}

export interface CompositionSku {
  id?: number | string
  composition_key?: string
  sku_code?: string
  name?: string
  status?: CompositionSkuStatus | string
  is_configured?: boolean
  is_available?: boolean
  virtual_product_id?: string | null
  virtual_package_spec_id?: number | string | null
  virtual_goods_price_fen?: number | null
  virtual_product_binding?: {
    status?: string
    is_configured?: boolean
    product_id?: string | null
    message?: string | null
  } | null
  unavailable_reason?: string | null
}

export interface DesignatedQuote {
  lines: DesignatedPricingLine[]
  total_price_per_hour?: number
  total_amount?: number
  booked_hours?: number
  composition_sku?: CompositionSku | null
  compositionSku?: CompositionSku | null
  can_submit?: boolean
  configuration_error?: string | null
  message?: string | null
}

export interface DesignatedDraft {
  id: number | string
  status?: string
  base_package_id?: number | null
  base_spec_id?: number | string | null
  required_players?: number
  booked_hours?: number
  designated_player_ids?: number[]
  quote?: DesignatedQuote | null
  pricing?: DesignatedQuote | null
}

export interface DesignatedDraftResult {
  draft: DesignatedDraft
  quote?: DesignatedQuote | null
}

export interface SubmitDesignatedDraftPayload {
  boss_wechat: string
  game_id: string
  boss_note?: string | null
}

export interface SubmitDesignatedDraftResult {
  order_no: string
  status?: string
  message?: string
  quote?: DesignatedQuote | null
}

function normalizeOffers(payload: PlayerOffersResult | PlayerOffer[] | { results?: PlayerOffer[]; data?: PlayerOffer[] }, playerId: number): PlayerOffersResult {
  if (Array.isArray(payload)) return { player_id: playerId, offers: payload }
  const source = payload as PlayerOffersResult & { results?: PlayerOffer[]; data?: PlayerOffer[] }
  return { player_id: Number(source.player_id || playerId), offers: source.offers || source.results || source.data || [] }
}

function normalizeDraftResult(payload: DesignatedDraftResult | DesignatedDraft): DesignatedDraftResult {
  const raw = payload as DesignatedDraftResult & DesignatedDraft & { data?: DesignatedDraftResult }
  if (raw.data?.draft) return raw.data
  if (raw.draft) return raw
  return { draft: raw, quote: raw.quote || raw.pricing || null }
}

/** Offers assigned by operations to a player.  This intentionally does not expose arbitrary shop products. */
export function getPlayerDesignatedOffers(playerId: number, packageFamilyId?: number | null) {
  return api.get<PlayerOffersResult | PlayerOffer[] | { results?: PlayerOffer[]; data?: PlayerOffer[] }>(`/catalog/players/${playerId}/offers`, {
    active_only: true,
    ...(packageFamilyId ? { package_family_id: packageFamilyId } : {})
  })
    .then(payload => normalizeOffers(payload, playerId))
}

export function createDesignatedDraft(payload: DesignatedDraftPayload) {
  return api.post<DesignatedDraftResult | DesignatedDraft>('/boss/designated-drafts', payload).then(normalizeDraftResult)
}

export function updateDesignatedDraft(draftId: number | string, payload: DesignatedDraftPayload) {
  return api.put<DesignatedDraftResult | DesignatedDraft>(`/boss/designated-drafts/${draftId}`, payload).then(normalizeDraftResult)
}

export function quoteDesignatedDraft(draftId: number | string) {
  return api.post<DesignatedQuote | DesignatedDraftResult>(`/boss/designated-drafts/${draftId}/quote`).then((payload) => {
    const raw = payload as DesignatedQuote & DesignatedDraftResult
    return raw.quote || raw.draft?.quote || raw.draft?.pricing || raw
  })
}

export function submitDesignatedDraft(draftId: number | string, payload: SubmitDesignatedDraftPayload) {
  return api.post<SubmitDesignatedDraftResult>(`/boss/designated-drafts/${draftId}/submit`, payload)
}
