import { BASE_URL } from '@/utils/request'
import { handleSessionExpiry, getClientSessionGeneration } from '@/utils/sessionExpiry'

export type PatronageCode = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'day_pass'
export interface PatronagePackage {
  code: PatronageCode; kind: 'naming' | 'day_pass'; name: string; duration_days: number | null
  amount_yuan: string | null; amount_diamonds: string | null; available: boolean; blockers: string[]; bonus_naming_days?: number
}
export interface PatronageCatalog {
  contract_version: '1.0'; purchase_enabled: boolean; commission_rate: string
  player: { id: number; name: string; avatar_url: string; hourly_rate_yuan: string | null } | null
  packages: PatronagePackage[]
}
export interface PatronageQuote {
  contract_version: '1.0'; player_id: number; package_code: PatronageCode; amount_yuan: string; amount_diamonds: string
  commission_rate: string; platform_amount_yuan: string; player_amount_yuan: string; price_version: string
  available_diamonds: string; can_submit: boolean; blockers: string[]
}
export function parsePatronageQuote(value: unknown): PatronageQuote {
  const v = object(value)
  if (typeof v.price_version !== 'string' || !/^[a-f0-9]{64}$/.test(v.price_version)) invalid()
  return { contract_version: version(v.contract_version), player_id: integer(v.player_id, 1), package_code: code(v.package_code),
    amount_yuan: amount(v.amount_yuan), amount_diamonds: amount(v.amount_diamonds), commission_rate: rate(v.commission_rate),
    platform_amount_yuan: amount(v.platform_amount_yuan), player_amount_yuan: amount(v.player_amount_yuan), price_version: v.price_version,
    available_diamonds: amount(v.available_diamonds), can_submit: bool(v.can_submit), blockers: blockers(v.blockers) }
}
export async function getPatronageQuote(playerId: number, packageCode: PatronageCode): Promise<PatronageQuote> {
  // Contractual read-only calculation: a quote never starts a purchase.
  const result = parsePatronageQuote(await request('POST', 'quotes', { player_id: integer(playerId, 1), package_code: code(packageCode) }, true))
  if (result.player_id !== playerId || result.package_code !== packageCode) invalid()
  return result
}
export interface PatronageCrown { id: number; boss_name: string; boss_avatar_url: string; package_name: string; starts_at: string; expires_at: string; source: 'purchase' | 'day_pass_bonus' }
export interface PatronageRecord {
  purchase_no: string; idempotency_key: string; price_version: string; player_id: number; player_name: string; package_code: PatronageCode; package_name: string
  amount_yuan: string; amount_diamonds: string; payment_status: 'created' | 'processing' | 'unknown' | 'paid' | 'failed'
  created_at: string; paid_at: string | null; starts_at: string | null; expires_at: string | null; bonus_naming_days: number; blockers: string[]
}
export interface PatronageRecords { count: number; next: string | null; previous: string | null; results: PatronageRecord[] }
function validDate(value: any): boolean { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) }
function date(value: any): string { if (!validDate(value)) invalid(); return value }
function optionalDate(value: any): string | null { return value === null ? null : date(value) }
export async function getPatronageCrowns(playerId: number, now = Date.now()): Promise<PatronageCrown[]> {
  const v = object(await request('GET', 'crowns', { player_id: integer(playerId, 1) }))
  return list(v.results).filter(raw => {
    const c = object(raw)
    return validDate(c.starts_at) && validDate(c.expires_at) && Date.parse(c.starts_at) <= now && Date.parse(c.expires_at) > now
  }).map(raw => {
    if (!['purchase', 'day_pass_bonus'].includes(raw.source)) invalid()
    return { id: integer(raw.id, 1), boss_name: text(raw.boss_name), boss_avatar_url: text(raw.boss_avatar_url), package_name: text(raw.package_name), starts_at: date(raw.starts_at), expires_at: date(raw.expires_at), source: raw.source }
  })
}
const paymentLabels = { created: '待支付', processing: '支付处理中', unknown: '支付结果待确认', paid: '已支付', failed: '支付失败' }
export function patronagePaymentLabel(status: PatronageRecord['payment_status']): string { return paymentLabels[status] || '状态待确认' }
export function parsePatronageRecords(value: unknown): PatronageRecords {
  const v = object(value)
  return { count: integer(v.count), next: v.next === null ? null : text(v.next), previous: v.previous === null ? null : text(v.previous), results: list(v.results).map(raw => {
    const r = object(raw)
    if (!Object.prototype.hasOwnProperty.call(paymentLabels, r.payment_status)) invalid()
    const identity = parsePatronagePurchaseInput(r)
    if (!text(r.purchase_no).trim() || (r.payment_status === 'paid') !== (r.paid_at !== null)) invalid()
    if (r.payment_status === 'paid' && (!validDate(r.starts_at) || !validDate(r.expires_at) || Date.parse(r.expires_at) <= Date.parse(r.starts_at))) invalid()
    return { purchase_no: text(r.purchase_no), idempotency_key: identity.idempotency_key, price_version: identity.price_version, player_id: integer(r.player_id, 1), player_name: text(r.player_name), package_code: code(r.package_code), package_name: text(r.package_name),
      amount_yuan: amount(r.amount_yuan), amount_diamonds: amount(r.amount_diamonds), payment_status: r.payment_status,
      created_at: date(r.created_at), paid_at: optionalDate(r.paid_at), starts_at: optionalDate(r.starts_at), expires_at: optionalDate(r.expires_at), bonus_naming_days: integer(r.bonus_naming_days), blockers: blockers(r.blockers) }
  }) }
}
export async function getPatronagePending(page = 1): Promise<PatronageRecords> {
  const result = parsePatronageRecords(await request('GET', 'purchases/pending', { page: integer(page, 1) }, true))
  if (result.count < result.results.length || (!result.count && result.next !== null)) invalid()
  return result
}
export async function getPatronageRecords(page = 1): Promise<PatronageRecords> {
  // Ignore absolute pagination URLs: never send credentials to response-controlled origins.
  return parsePatronageRecords(await request('GET', 'records', { page: integer(page, 1) }, true))
}
export interface PatronagePurchaseInput {
  player_id: number; package_code: PatronageCode; price_version: string; idempotency_key: string; code?: string
}
export type PatronagePaymentTransport = (method: 'GET' | 'POST', endpoint: string, data: object) => Promise<unknown>
export function parsePatronagePurchaseInput(value: unknown): PatronagePurchaseInput {
  const v = object(value)
  if (typeof v.price_version !== 'string' || !/^[a-f0-9]{64}$/.test(v.price_version)) invalid()
  return { player_id: integer(v.player_id, 1), package_code: code(v.package_code), price_version: v.price_version,
    idempotency_key: transactionKey(v.idempotency_key), ...(v.code === undefined ? {} : { code: text(v.code) }) }
}
function transactionKey(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) invalid()
  return value // Never trim, normalize or replace the original key.
}
export function parsePatronagePurchase(value: unknown): PatronageRecord {
  const v = object(value)
  if (v.success === false || v.error != null) invalid()
  const result = parsePatronageRecords({ count: 1, next: null, previous: null, results: [v] }).results[0]
  if (!result.purchase_no.trim() || (result.payment_status === 'paid') !== (result.paid_at !== null)) invalid()
  return result
}
/** GET data is query-encoded by uni.request; callers must confirm a gated quote. */
export function createPatronagePaymentAdapter(transport: PatronagePaymentTransport = (method, endpoint, data) => request(method, endpoint, data, true)) {
  return {
    async purchase(input: PatronagePurchaseInput): Promise<PatronageRecord> {
      const data = parsePatronagePurchaseInput(input)
      const result = parsePatronagePurchase(await transport('POST', 'purchases', data))
      if (result.player_id !== data.player_id || result.package_code !== data.package_code || result.idempotency_key !== data.idempotency_key || result.price_version !== data.price_version) invalid()
      return result
    },
    async byKey(key: string): Promise<PatronageRecord> {
      const result = parsePatronagePurchase(await transport('GET', 'purchases/by-key', { idempotency_key: transactionKey(key) }))
      if (result.idempotency_key !== key) invalid()
      return result
    }
  }
}
export function patronageSession() { return String(uni.getStorageSync('token') || '') }
// This namespace is not covered by the shared helper's client-token prefixes.
// Explicitly bind client credentials; never fall back to an administrator token.
async function request(method: 'GET' | 'POST', endpoint: string, data?: object, authenticated = false): Promise<unknown> {
  const sentToken = patronageSession(), sentGeneration = getClientSessionGeneration()
  if (authenticated && !sentToken) throw new Error('请先登录后查看')
  const path = `/patronage/${endpoint}/`
  return new Promise((resolve, reject) => uni.request({
    url: `${BASE_URL.replace(/\/$/, '')}${path}`, method, data,
    header: sentToken ? { Authorization: `Bearer ${sentToken}` } : {},
    success: res => {
      if (sentToken !== patronageSession() || sentGeneration !== getClientSessionGeneration()) { reject(new Error('登录状态已改变，请刷新')); return }
      if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data)
      else {
        const body = res.data && typeof res.data === 'object' ? res.data : { detail: '冠名服务暂不可用，请稍后重试' }
        reject(handleSessionExpiry(res.statusCode, body, path, 'token', sentToken) || body)
      }
    }, fail: () => reject(new Error('网络异常，请稍后重试'))
  }))
}
const codes = ['day', 'week', 'month', 'quarter', 'year', 'day_pass']
function invalid(): never { throw new Error('冠名服务响应异常，请稍后重试') }
function object(value: any): any { if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(); return value }
function text(value: any): string { if (typeof value !== 'string') invalid(); return value }
function bool(value: any): boolean { if (typeof value !== 'boolean') invalid(); return value }
function integer(value: any, min = 0): number { if (!Number.isSafeInteger(value) || value < min) invalid(); return value }
function amount(value: any): string { if (typeof value !== 'string' || !/^(0|[1-9]\d*)(\.\d+)?$/.test(value)) invalid(); return value }
function optionalAmount(value: any): string | null { return value === null ? null : amount(value) }
function rate(value: any): string { if (!/^(0(\.\d+)?|1(\.0+)?)$/.test(amount(value))) invalid(); return value }
function list(value: any): any[] { if (!Array.isArray(value)) invalid(); return value }
function blockers(value: any): string[] { return list(value).map(text) }
function code(value: any): PatronageCode { if (!codes.includes(value)) invalid(); return value }
function version(value: any): '1.0' { if (value !== '1.0') invalid(); return value }
export function patronageRateLabel(value: string): string {
  const [whole, fraction = ''] = rate(value).split('.')
  const digits = fraction.padEnd(2, '0')
  const head = `${whole}${digits.slice(0, 2)}`.replace(/^0+(?=\d)/, '')
  const tail = digits.slice(2).replace(/0+$/, '')
  return `${head}${tail ? `.${tail}` : ''}%`
}
export function parsePatronageCatalog(value: unknown): PatronageCatalog {
  const v = object(value)
  const player = v.player === null ? null : object(v.player)
  return {
    contract_version: version(v.contract_version), purchase_enabled: bool(v.purchase_enabled), commission_rate: rate(v.commission_rate),
    player: player === null ? null : { id: integer(player.id, 1), name: text(player.name), avatar_url: text(player.avatar_url), hourly_rate_yuan: optionalAmount(player.hourly_rate_yuan) },
    packages: list(v.packages).map(raw => {
      const p = object(raw), packageCode = code(p.code), available = bool(p.available)
      if (p.kind !== (packageCode === 'day_pass' ? 'day_pass' : 'naming')) invalid()
      return { code: packageCode, kind: p.kind, name: text(p.name), duration_days: p.duration_days === null ? null : integer(p.duration_days, 1),
        amount_yuan: available ? amount(p.amount_yuan) : optionalAmount(p.amount_yuan),
        amount_diamonds: available ? amount(p.amount_diamonds) : optionalAmount(p.amount_diamonds), available, blockers: blockers(p.blockers),
        ...(p.bonus_naming_days === undefined ? {} : { bonus_naming_days: integer(p.bonus_naming_days) }) }
    })
  }
}
export async function getPatronageCatalog(playerId?: number): Promise<PatronageCatalog> {
  if (playerId !== undefined) integer(playerId, 1)
  return parsePatronageCatalog(await request('GET', 'catalog', playerId === undefined ? {} : { player_id: playerId }))
}
