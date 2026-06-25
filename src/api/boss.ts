import api from '@/utils/request'
/** 过滤后端残留的测试数据（名称以 test / group_ 开头，或纯英文 slug 的条目） */
function isTestEntry(name: string): boolean {
  const n = (name || '').trim().toLowerCase()
  if (!n) return true
  if (n.startsWith('test') || n.startsWith('group_')) return true
  if (/^[a-z0-9_\-]+$/.test(n)) return true
  return false
}

const GROUP_RECOMMEND = '推荐套餐'
const GROUP_BASIC = '基础陪玩套餐'
const GROUP_FUN = '趣味单'
const GROUP_SPECIAL = '特色单'

export interface BossPackageSpec {
  id: number | string
  name: string
  price: number
  description?: string
  guarantee_amount?: string
  sort_order?: number
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

const frontendPresetPackages: BossPackage[] = [
  {
    id: -6606,
    name: '六套六弹',
    player_count: 1,
    base_price: 60,
    description: '推荐套餐 · 6套6弹配置',
    is_custom: false,
    group_id: -10,
    group_name: GROUP_RECOMMEND,
    product_type: 'normal',
    sort_order: 6606,
    is_active: true,
    is_frontend_preset: true
  },
  {
    id: -8801,
    name: '暗区突围端游保底单',
    player_count: 1,
    base_price: 58,
    description: '电视台保底明细可选，按规格下单',
    is_custom: false,
    group_id: -40,
    group_name: GROUP_SPECIAL,
    product_type: 'guarantee',
    specs: guaranteeSpecs,
    sort_order: 8801,
    is_active: true,
    is_frontend_preset: true
  }
]

function assignProductGroup(pkg: BossPackage): BossPackage {
  const name = pkg.name || ''
  if (name === '六套六弹') return { ...pkg, group_id: -10, group_name: GROUP_RECOMMEND }
  if (name.includes('体验单') || name.includes('猛攻单') || name.includes('体验')) {
    return { ...pkg, group_id: -20, group_name: GROUP_BASIC }
  }
  if (name.includes('趣味')) return { ...pkg, group_id: -30, group_name: GROUP_FUN }
  if (
    pkg.product_type === 'guarantee' ||
    pkg.product_type === 'escort' ||
    name.includes('保底') ||
    name.includes('护航') ||
    name.includes('大金') ||
    name.includes('清图') ||
    name.includes('课程') ||
    name.includes('收集')
  ) {
    return { ...pkg, group_id: -40, group_name: GROUP_SPECIAL }
  }
  return pkg
}

function patchPackagePreset(pkg: BossPackage): BossPackage {
  if (pkg.name === '暗区突围端游保底单') {
    return assignProductGroup({
      ...pkg,
      product_type: pkg.product_type || 'guarantee',
      base_price: Number(pkg.base_price || pkg.price || guaranteeSpecs[0].price),
      specs: pkg.specs?.length ? pkg.specs : guaranteeSpecs
    })
  }
  if (pkg.name === '六套六弹') {
    return assignProductGroup({
      ...pkg,
      product_type: pkg.product_type || 'normal',
      player_count: pkg.player_count || 1,
      base_price: Number(pkg.base_price || pkg.price || 60),
      description: pkg.description || '推荐套餐 · 6套6弹配置'
    })
  }
  return assignProductGroup(pkg)
}

function mergeFrontendPresets(source: BossPackage[]) {
  const byName = new Set(source.map(item => item.name))
  const missingPresets = frontendPresetPackages.filter(item => !byName.has(item.name))
  return [...source.map(patchPackagePreset), ...missingPresets]
}

export function getPackages() {
  return api.get<BossPackage[]>('/boss/packages').then(list => {
    const filtered = mergeFrontendPresets(list.filter(p => !isTestEntry(p.name)))
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
