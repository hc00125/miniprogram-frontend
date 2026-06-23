import api from '@/utils/request'
/** 过滤后端残留的测试数据（名称以 test / group_ 开头，或纯英文 slug 的条目） */
function isTestEntry(name: string): boolean {
  const n = (name || '').trim().toLowerCase()
  if (!n) return true
  if (n.startsWith('test') || n.startsWith('group_')) return true
  if (/^[a-z0-9_\-]+$/.test(n)) return true
  return false
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
  price_extra: number
  avg_rating: number
  total_orders: number
  status: string
  is_online?: boolean
  avatar_url?: string
  bio?: string
  player_type?: {
    id: number
    name: string
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
  status: string
  total_price_per_hour: number
  total_amount: number
  paid: boolean
  created_at: string
}

export interface OrderCreatePayload {
  boss_wechat: string
  game_id?: string | null
  package_id: number
  required_players?: number
  addon_details?: { addon_id: number; count: number }[] | null
  designated_players?: number[] | null
  boss_note?: string | null
  booked_hours?: number
}

export function getPackages() {
  return api.get<BossPackage[]>('/boss/packages').then(list => {
    const filtered = list.filter(p => !isTestEntry(p.name))
    // group_id 为 null 的套餐归入第一个有效分组，避免被分类过滤器排除
    const firstGroupId = filtered.find(p => p.group_id !== null)?.group_id ?? null
    if (firstGroupId !== null) {
      filtered.forEach(p => {
        if (p.group_id === null) { p.group_id = firstGroupId; p.group_name = '' }
      })
    }
    return filtered
  })
}

export function getPackageGroups() {
  return api.get<PackageGroup[]>('/boss/package-groups').then(list => list.filter(g => !isTestEntry(g.name)))
}

export function getAddons() {
  return api.get<BossAddon[]>('/boss/addons')
}

export function getPlayerTypes() {
  return api.get<PlayerType[]>('/boss/player-types').then(list => list.filter(t => !isTestEntry(t.name)))
}

export function getOnlinePlayers() {
  return api.get<OnlinePlayer[]>('/boss/online-players')
}

/**
 * 陪玩师列表（含自己），支持 type_id / is_online / search / ordering 筛选
 */
export function getPlayerList(params: PlayerListParams = {}) {
  return api.get<OnlinePlayer[]>('/player/list', params)
}

export function createOrder(payload: OrderCreatePayload) {
  return api.post<{ order_no: string }>('/boss/order', payload)
}

export function getOrder(orderNo: string) {
  return api.get<any>(`/boss/order/${orderNo}`)
}

export function cancelOrder(orderNo: string) {
  return api.post(`/boss/order/${orderNo}/cancel`)
}

export function pauseOrder(orderNo: string) {
  return api.post(`/boss/order/${orderNo}/pause`)
}

export function resumeOrder(orderNo: string) {
  return api.post(`/boss/order/${orderNo}/resume`)
}

export function confirmSelfPayment(orderNo: string, actual_amount: number) {
  return api.post(`/boss/order/${orderNo}/self-confirm-payment`, { actual_amount })
}

export function ratePlayer(orderNo: string, player_id: number, rating: number, comment: string | null) {
  return api.post(`/boss/order/${orderNo}/rate`, { player_id, rating, comment })
}

export function queryBossOrders(bossWechat: string) {
  return api.get<BossOrderListItem[]>(`/boss/orders/${encodeURIComponent(bossWechat)}/`)
}

export function getMyBossOrders() {
  return api.get<BossOrderListItem[]>('/boss/orders/me')
}
