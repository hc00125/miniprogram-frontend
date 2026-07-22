import type { CompositionSku, DesignatedPricingLine, DesignatedQuote } from '@/api/designated'
import { getStorage, removeStorage, setStorage } from '@/utils/storage'

export const DESIGNATED_DRAFT_STORAGE_KEY = 'designated_group_draft'
export const MAX_DESIGNATED_GROUP_PLAYERS = 3

export interface DraftPlayerOfferSelection {
  player_offer_id?: number | string | null
  package_id?: number | null
  package_name?: string | null
  spec_id?: number | string | null
  spec_name?: string | null
  package_family_id?: number | null
  package_family_name?: string | null
}

export interface DesignatedDraftPlayer extends DraftPlayerOfferSelection {
  id: number
  name: string
  avatar_url?: string
  type_id?: number | null
  type_name?: string | null
  type_priority?: number | null
  billing_type_id?: number | null
  billing_type_name?: string | null
  is_online?: boolean
}

export interface DesignatedGroupDraft {
  version: 1
  draft_id?: number | string | null
  source?: 'shop' | 'player' | 'resume'
  package_id?: number | null
  package_name?: string | null
  package_family_id?: number | null
  package_family_name?: string | null
  base_spec_id?: number | string | null
  base_spec_name?: string | null
  base_player_type_id?: number | null
  base_player_type_name?: string | null
  required_players: number
  booked_hours: number
  players: DesignatedDraftPlayer[]
  quote?: DesignatedQuote | null
  composition_sku?: CompositionSku | null
  pricing_lines?: DesignatedPricingLine[]
  quote_error?: string | null
  updated_at: number
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizePlayer(input: DesignatedDraftPlayer | null | undefined): DesignatedDraftPlayer | null {
  if (!input || !asNumber(input.id)) return null
  return {
    ...input,
    id: asNumber(input.id),
    type_id: asNumber(input.type_id) || null,
    type_priority: asNumber(input.type_priority) || null,
    billing_type_id: asNumber(input.billing_type_id) || null,
    package_id: asNumber(input.package_id) || null,
    package_family_id: asNumber(input.package_family_id) || null,
    is_online: input.is_online === true
  }
}

export function createEmptyDesignatedDraft(): DesignatedGroupDraft {
  return {
    version: 1,
    required_players: 1,
    booked_hours: 1,
    players: [],
    quote: null,
    composition_sku: null,
    pricing_lines: [],
    quote_error: null,
    updated_at: Date.now()
  }
}

export function normalizeDesignatedDraft(raw: unknown): DesignatedGroupDraft {
  const base = createEmptyDesignatedDraft()
  if (!raw || typeof raw !== 'object') return base
  const source = raw as Partial<DesignatedGroupDraft>
  const seen = new Set<number>()
  const players = (Array.isArray(source.players) ? source.players : [])
    .map(item => normalizePlayer(item))
    .filter((item): item is DesignatedDraftPlayer => Boolean(item && !seen.has(item.id) && (seen.add(item.id), true)))
    .slice(0, MAX_DESIGNATED_GROUP_PLAYERS)

  return {
    ...base,
    ...source,
    version: 1,
    package_id: asNumber(source.package_id) || null,
    package_family_id: asNumber(source.package_family_id) || null,
    base_spec_id: source.base_spec_id ?? null,
    base_player_type_id: asNumber(source.base_player_type_id) || null,
    required_players: Math.max(1, Math.min(MAX_DESIGNATED_GROUP_PLAYERS, Math.floor(asNumber(source.required_players, 1)))),
    booked_hours: Math.max(1, Math.min(24, Math.floor(asNumber(source.booked_hours, 1)))),
    players,
    pricing_lines: Array.isArray(source.pricing_lines) ? source.pricing_lines : [],
    updated_at: asNumber(source.updated_at, Date.now())
  }
}

export function getDesignatedDraft() {
  return normalizeDesignatedDraft(getStorage<DesignatedGroupDraft>(DESIGNATED_DRAFT_STORAGE_KEY))
}

export function saveDesignatedDraft(draft: DesignatedGroupDraft) {
  const normalized = normalizeDesignatedDraft({ ...draft, updated_at: Date.now() })
  setStorage(DESIGNATED_DRAFT_STORAGE_KEY, normalized)
  return normalized
}

export function clearDesignatedDraft() {
  removeStorage(DESIGNATED_DRAFT_STORAGE_KEY)
}

export function draftFingerprint(draft: DesignatedGroupDraft) {
  return JSON.stringify({
    package_id: draft.package_id,
    base_spec_id: draft.base_spec_id,
    required_players: draft.required_players,
    booked_hours: draft.booked_hours,
    players: draft.players.map(player => ({
      id: player.id,
      offer: player.player_offer_id || null,
      package: player.package_id || null,
      spec: player.spec_id || null
    }))
  })
}
