import api from '@/utils/request'

function isTestEntry(name: string): boolean {
  const n = (name || '').trim().toLowerCase()
  if (!n) return true
  return n.startsWith('test') || n.startsWith('group_')
}

export interface BossPackageSpec {
  id: number | string
  name: string
  price: number
  description?: string
  guarantee_amount?: string
  required_player_type_id?: number | null
  required_player_type_name?: string | null
  required_player_type_priority?: number | null
  sort_order?: number
  is_active?: boolean
}

export interface BossPackage {
  id: number
  name: string
  player_count: number
  base_price: number
  description?: string
  is_custom: boolean
  group_id: number | null
  group_name: string | null
  cover_url?: string
  image_url?: string
  thumb_url?: string
  picture_url?: string
  detail_images?: string[]
  product_type?: 'normal' | 'guarantee' | 'escort' | string
  specs?: BossPackageSpec[]
  price?: number
  original_price?: number
  market_price?: number
  sold_count?: number
  sales_count?: number
  sales?: number
  order_count?: number
  sort_order?: number
  is_active?: boolean
  is_frontend_preset?: boolean
}

export interface BossAddon {
  id: number
  name: string
  price_per_player: number
  priority: number
}

export interface PlayerType {
  id: number
  name: string
  priority: number
  price_extra?: number
}

export interface OnlinePlayer {
  id: number
  name: string
  type_id: number
  type_name: string
  type_priority?: number
  price_extra: number
  avg_rating: number
  rating_count?: number
  total_orders: number
  status: string
  is_online?: boolean
  avatar_url?: string
  bio?: string
  audio_intro_url?: string
  audio_intro_title?: string
  can_be_designated?: boolean
  player_type?: {
    id: number
    name: string
    priority?: number
    price_extra: number
  }
}

export interface PlayerListParams {
  type_id?: number
  is_online?: boolean
  search?: string
  ordering?: string
}

export interface PackageGroup {
  id: number
  name: string
  sort_order: number
}

export interface BossOrderListItem {
  order_no: string
  package_name: string
  item_count?: number
  status: string
  total_price_per_hour: number
  total_amount: number
  paid: boolean
  created_at: string
  kook_room_number?: string
  order_type?: 'normal' | 'renewal' | string
  renewal_count?: number
  renewal_booked_hours?: number
  renewal_paid_amount?: number
  total_booked_hours?: number
  pending_renewal_order_no?: string | null
  can_renew?: boolean
}

export interface OrderCreateItemPayload {
  package_id: number
  spec_id?: number | null
  quantity?: number
  spec_display_name?: string | null
  image_url?: string | null
  description?: string | null
}

export interface OrderCreatePayload {
  boss_wechat: string
  game_id?: string | null
  package_id?: number | null
  spec_id?: number | null
  quantity?: number
  items?: OrderCreateItemPayload[]
  required_players?: number
  addon_details?: { addon_id: number; count: number }[] | null
  designated_players?: number[] | null
  boss_note?: string | null
  booked_hours?: number
}

export interface RenewalCreateResult {
  order_no: string
  parent_order_no: string
  renewal_index: number
  booked_hours: number
  total_amount: number
  status: string
  created: boolean
  message: string
}

export interface OrderDesignationItem {
  id: number
  player_id: number
  player_name: string
  player_type: string
  avatar_url?: string | null
  is_online: boolean
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
  status_text: string
  extra_amount: number
  invited_at: string
  responded_at?: string | null
  expires_at: string
  can_release: boolean
}

export interface OrderRatingRecord {
  id: number
  player_id: number
  player_name: string
  rating: number
  comment: string
  created_at: string
}

export interface OrderRatingStatus {
  order_no: string
  rated_player_ids: number[]
  remaining_player_ids: number[]
  all_rated: boolean
  results: OrderRatingRecord[]
}

export const guaranteeSpecs: BossPackageSpec[] = [
  { id: 'tv-888', name: '电视台保底 888w', price: 58, guarantee_amount: '888w', sort_order: 1 },
  { id: 'tv-1088', name: '电视台保底 1088w', price: 68, guarantee_amount: '1088w', sort_order: 2 },
  { id: 'tv-1288', name: '电视台保底 1288w', price: 88, guarantee_amount: '1288w', sort_order: 3 },
  { id: 'tv-1488', name: '电视台保底 1488w', price: 98, guarantee_amount: '1488w', sort_order: 4 },
  { id: 'tv-1688', name: '电视台保底 1688w', price: 128, guarantee_amount: '1688w', sort_order: 5 },
  { id: 'tv-2688', name: '电视台保底 2688w', price: 188, guarantee_amount: '2688w', sort_order: 6 },
  { id: 'tv-3988', name: '电视台保底 3988w', price: 288, guarantee_amount: '3988w', sort_order: 7 },
  { id: 'tv-5888', name: '电视台保底 5888w', price: 399, guarantee_amount: '5888w', sort_order: 8 },
  { id: 'tv-10001', name: '电视台保底 10001w', price: 688, guarantee_amount: '10001w', sort_order: 9 }
]

function normalizePackageFromApi(pkg: BossPackage): BossPackage {
  const specs = [...(pkg.specs || [])]
    .filter(spec => spec.is_active !== false)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
  return {
    ...pkg,
    specs,
    player_count: Math.max(1, Number(pkg.player_count || 1)),
    base_price: Math.max(0, Number(pkg.base_price ?? pkg.price ?? 0))
  }
}

function normalizeBossOrderDisplay(order: any) {
  if (!order) return order
  const rawGameId = order.game_id_raw ?? order.game_id ?? ''
  const rawPackageName = order.package_name_raw ?? order.package_name ?? ''
  const room = String(order.kook_room_number || '').trim()
  return {
    ...order,
    game_id: rawGameId,
    package_name: rawPackageName,
    game_id_raw: rawGameId,
    package_name_raw: rawPackageName,
    kook_room_display: room ? `KOOK房间：${room}` : ''
  }
}

export function getPackages() {
  return api.get<BossPackage[]>('/boss/packages').then(list => {
    const filtered = list
      .filter(p => p.is_active !== false)
      .filter(p => !isTestEntry(p.name))
      .map(normalizePackageFromApi)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || a.id - b.id)
    const firstGroupId = filtered.find(p => p.group_id !== null)?.group_id ?? null
    if (firstGroupId !== null) {
      filtered.forEach(p => {
        if (p.group_id === null) {
          p.group_id = firstGroupId
          p.group_name = ''
        }
      })
    }
    return filtered
  })
}

export function getPackageGroups() {
  return api.get<PackageGroup[]>('/boss/package-groups').then(list => list.filter(g => !isTestEntry(g.name)))
}

export function getAddons() { return api.get<BossAddon[]>('/boss/addons') }
export function getPlayerTypes() { return api.get<PlayerType[]>('/boss/player-types').then(list => list.filter(t => !isTestEntry(t.name))) }
export function getOnlinePlayers() { return api.get<OnlinePlayer[]>('/boss/online-players') }
export function getPlayerList(params: PlayerListParams = {}) { return api.get<OnlinePlayer[]>('/player/list', params) }
export function createOrder(payload: OrderCreatePayload) { return api.post<{ order_no: string }>('/boss/order', payload) }
export function createRenewal(orderNo: string, units = 1) { return api.post<RenewalCreateResult>(`/boss/order/${orderNo}/renew`, { units }) }
export function getOrder(orderNo: string) { return api.get<any>(`/boss/order/${orderNo}`).then(normalizeBossOrderDisplay) }
export function getMyBossOrders() { return api.get<BossOrderListItem[]>('/boss/orders/me') }
export function cancelOrder(orderNo: string, reason?: string) { return api.post(`/boss/order/${orderNo}/cancel`, { reason }) }
export function pauseBossOrder(orderNo: string) { return api.post(`/boss/order/${orderNo}/pause`) }
export function resumeBossOrder(orderNo: string) { return api.post(`/boss/order/${orderNo}/resume`) }
export function ratePlayer(orderNo: string, player_id: number, rating: number, comment?: string | null) { return api.post(`/boss/order/${orderNo}/ratings`, { player_id, rating, comment }) }
export function getOrderRatings(orderNo: string) { return api.get<OrderRatingStatus>(`/boss/order/${orderNo}/ratings`) }
export function getOrderDesignations(orderNo: string) { return api.get<{ order_no: string; results: OrderDesignationItem[] }>(`/boss/order/${orderNo}/designations`) }
export function releaseOrderDesignation(orderNo: string, designationId: number) { return api.post<{ message: string; designation: OrderDesignationItem }>(`/boss/order/${orderNo}/designation/${designationId}/release`) }
