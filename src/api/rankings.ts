import { BASE_URL } from '@/utils/request'
import { normalizeDiamonds } from '@/utils/diamonds'

export type RankingBoard = 'boss' | 'player'
export type RankingPeriod = 'day' | 'week' | 'month'
export interface RankingEntry { id: string; rank: number; name: string; avatar_url: string; value: number }
export type RankingResult = { available: false } | {
  available: true; board: RankingBoard; period: RankingPeriod; period_start: string; period_end: string; updated_at: string; results: RankingEntry[]
}
const configuredPath = (import.meta as ImportMeta & { env?: { VITE_RANKINGS_API_PATH?: string } }).env?.VITE_RANKINGS_API_PATH?.trim() || ''
function invalid(): never { throw new Error('榜单数据异常，请稍后重试') }
function timestamp(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) }
function metricValue(value: unknown, board: RankingBoard): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) invalid()
  if (board === 'player') { if (!Number.isSafeInteger(value)) invalid(); return value }
  try { return normalizeDiamonds(value) } catch { return invalid() }
}
function avatar(value: unknown): string {
  if (typeof value !== 'string' || /[\\\s]/.test(value)) return ''
  if (/^https:\/\/[^/]+\//.test(value)) return value
  if (/^\/(?!\/)/.test(value)) return `${BASE_URL.replace(/\/api\/?$/, '')}${value}`
  return ''
}
export function parseRankings(value: unknown, board: RankingBoard, period: RankingPeriod): RankingResult {
  if (!value || typeof value !== 'object') invalid()
  const v = value as Record<string, unknown>
  if (v.available === false) return { available: false }
  if (v.available !== true || v.board !== board || v.period !== period || !timestamp(v.period_start) || !timestamp(v.period_end) || !timestamp(v.updated_at)
    || Date.parse(v.period_start) >= Date.parse(v.period_end) || !Array.isArray(v.results) || v.results.length > 50) invalid()
  const ids = new Set<string>(); let lastRank = 0; let lastValue = Infinity
  const results = v.results.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object') invalid()
    const row = entry as Record<string, unknown>
    const amount = metricValue(row.value, board)
    if (typeof row.id !== 'string' || !row.id.trim() || ids.has(row.id) || typeof row.name !== 'string' || !row.name.trim()
      || !Number.isSafeInteger(row.rank) || Number(row.rank) < 1 || Number(row.rank) < lastRank
      || amount > lastValue) invalid()
    ids.add(row.id); lastRank = Number(row.rank); lastValue = amount
    return { id: row.id, rank: lastRank, name: row.name, avatar_url: avatar(row.avatar_url), value: lastValue }
  })
  return { available: true, board, period, period_start: v.period_start, period_end: v.period_end, updated_at: v.updated_at, results }
}
export async function getRankings(board: RankingBoard, period: RankingPeriod): Promise<RankingResult> {
  if (!['boss', 'player'].includes(board) || !['day', 'week', 'month'].includes(period)) invalid()
  // Opt in only after the backend implements the agreed contract. Never fetch or infer rankings from lifetime totals.
  if (!configuredPath) return { available: false }
  if (!/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/?$/.test(configuredPath)) throw new Error('榜单加载失败，请稍后重试')
  return new Promise((resolve, reject) => uni.request({
    url: `${BASE_URL.replace(/\/$/, '')}${configuredPath}`, method: 'GET', data: { board, period }, timeout: 15000,
    success: res => {
      if (res.statusCode !== 200) { reject(new Error('榜单加载失败，请稍后重试')); return }
      try { resolve(parseRankings(res.data, board, period)) } catch (error) { reject(error) }
    },
    fail: () => reject(new Error('榜单加载失败，请稍后重试'))
  }))
}
