import { BASE_URL } from '@/utils/request'

export type AnnouncementKind = 'patronage' | 'gift' | 'vip_upgrade'
export type AnnouncementFilter = 'patronage' | 'gift' | 'all' | 'popular'
export interface Announcement {
  id: string; kind: AnnouncementKind; boss_name: string; player_id: number; player_name: string
  item_name: string; quantity: number; occurred_at: string; text: string
  boss_avatar_url?: string; player_avatar_url?: string; item_image_url?: string
  from_tier_name?: string; to_tier_name?: string
}
export interface AnnouncementPage { count: number; page: number; page_size: number; results: Announcement[] }

function invalid(): never { throw new Error('通报数据异常，请重试') }
function positive(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) > 0 }
function text(value: unknown): value is string { return typeof value === 'string' && Boolean(value.trim()) }
function imageUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const url = value.trim()
  if (!/^(https?:\/\/[^/\s]+\/|\/(?!\/))/.test(url) || /[\\\s]/.test(url)) return ''
  return url.startsWith('/') ? `${BASE_URL.replace(/\/api\/?$/, '')}${url}` : url
}
export function parseAnnouncements(value: unknown, kind: AnnouncementFilter, page: number, pageSize: number): AnnouncementPage {
  const v = value as AnnouncementPage
  if (!v || !Number.isSafeInteger(v.count) || v.count < 0 || v.page !== page || v.page_size !== pageSize || !Array.isArray(v.results)) invalid()
  const expected = Math.min(pageSize, Math.max(0, v.count - (page - 1) * pageSize))
  if (v.results.length !== expected) invalid()
  const ids = new Set<string>()
  const results = v.results.map(r => {
    const allowed = kind === 'popular' ? ['gift', 'vip_upgrade'] : kind === 'all' ? ['gift', 'patronage'] : [kind]
    if (!r || !allowed.includes(r.kind) || !text(r.id) || !new RegExp(`^${r.kind}:[1-9][0-9]*$`).test(r.id) || ids.has(r.id)
      || (r.kind === 'vip_upgrade' ? !text(r.from_tier_name) || !text(r.to_tier_name) : !positive(r.player_id) || !positive(r.quantity) || !text(r.player_name) || !text(r.item_name))
      || !text(r.boss_name) || !text(r.text) || !text(r.occurred_at)
      || !/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(r.occurred_at) || !Number.isFinite(Date.parse(r.occurred_at))) invalid()
    ids.add(r.id)
    if (r.kind === 'vip_upgrade') return { id: r.id, kind: r.kind, boss_name: r.boss_name,
      boss_avatar_url: imageUrl(r.boss_avatar_url), from_tier_name: r.from_tier_name, to_tier_name: r.to_tier_name,
      occurred_at: r.occurred_at, text: r.text, player_id: 0, player_name: '', item_name: r.to_tier_name!, quantity: 1 }
    return { id: r.id, kind: r.kind, boss_name: r.boss_name, player_id: r.player_id, player_name: r.player_name,
      item_name: r.item_name, quantity: r.quantity, occurred_at: r.occurred_at, text: r.text,
      ...('boss_avatar_url' in r ? { boss_avatar_url: imageUrl(r.boss_avatar_url) } : {}),
      ...('player_avatar_url' in r ? { player_avatar_url: imageUrl(r.player_avatar_url) } : {}),
      ...('item_image_url' in r ? { item_image_url: imageUrl(r.item_image_url) } : {}) }
  })
  return { count: v.count, page, page_size: pageSize, results }
}

export async function getAnnouncements(kind: AnnouncementFilter, page = 1, pageSize = 20): Promise<AnnouncementPage> {
  if (!['all', 'patronage', 'gift', 'popular'].includes(kind) || !positive(page) || !positive(pageSize) || pageSize > 50) invalid()
  return new Promise((resolve, reject) => uni.request({
    url: `${BASE_URL.replace(/\/$/, '')}/announcements/`, method: 'GET',
    data: { kind, page, page_size: pageSize }, timeout: 15000,
    success: res => {
      if (res.statusCode !== 200) { reject(new Error('通报加载失败，请重试')); return }
      try { resolve(parseAnnouncements(res.data, kind, page, pageSize)) } catch (error) { reject(error) }
    },
    fail: () => reject(new Error('通报加载失败，请重试'))
  }))
}
