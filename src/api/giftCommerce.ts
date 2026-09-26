import { BASE_URL } from '@/utils/request'
import { getClientPlatform, isIOSPurchaseEnabled } from '@/utils/purchaseAvailability'
import { handleSessionExpiry } from '@/utils/sessionExpiry'

export const integer = (v: unknown, min = 0): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string')
export const decimal = (v: unknown): v is string => typeof v === 'string' && /^(0|[1-9]\d*)(\.\d+)?$/.test(v)
/** Compare integer charge to the integer part of a nonnegative decimal as strings.
 * No parseInt/Number roundoff, truncation of displayed balances or BigInt runtime requirement. */
export function hasDiamonds(balance: unknown, amount: number) {
  if (!decimal(balance) || !integer(amount)) return false
  const whole = balance.split('.')[0], charge = String(amount)
  return whole.length > charge.length || (whole.length === charge.length && whole >= charge)
}
export async function commerceRequest<T>(path: string, method: 'GET' | 'POST', data: unknown, parse: (value: any) => T): Promise<T> {
  const platform = getClientPlatform()
  if (method === 'POST' && path === '/gifts/purchases/' && platform === 'ios' && !isIOSPurchaseEnabled()) throw { code: 'IOS_PURCHASE_DISABLED', detail: 'iOS端虚拟支付当前未启用' }
  const token = String(uni.getStorageSync('token') || '')
  if (!token) throw { code: 'LOGIN_REQUIRED', detail: '请先登录' }
  return new Promise((resolve, reject) => uni.request({
    url: `${BASE_URL.replace(/\/$/, '')}${path}`, method, data,
    header: { Authorization: `Bearer ${token}`, 'X-Client-Platform': platform },
    success: res => {
      if (token !== String(uni.getStorageSync('token') || '')) { reject({ code: 'STALE_SESSION', handled: true }); return }
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try { resolve(parse(res.data)) } catch (e) { reject(e) }
      } else {
        const body = res.data && typeof res.data === 'object' ? res.data : { detail: '请求失败' }
        reject(handleSessionExpiry(res.statusCode, body, path, 'token', token) || { ...body as any, statusCode: res.statusCode })
      }
    }, fail: reject
  }))
}
export interface Capabilities {
  contract_version?: string; catalog_read: boolean; records_read: boolean; inventory_read: boolean
  purchase_supported: boolean; quote_supported: boolean; purchase_enabled: boolean
  inventory_transfer_enabled: boolean; inventory_quote_supported: boolean
  recipient_eligible: boolean | null; max_quantity: number | null; max_diamonds: number | null
  daily_diamonds: number | null; policy_version: string | null; blockers: string[]
}
export function readGiftCapabilities(recipientId?: number): Promise<Capabilities> {
  if (recipientId !== undefined && !integer(recipientId, 1)) return Promise.reject(new Error('收礼人无效'))
  return commerceRequest('/gifts/capabilities/', 'GET', recipientId === undefined ? {} : { recipient_id: recipientId }, d => {
    if (!d || typeof d !== 'object') throw new Error('能力格式无效')
    return { contract_version: d.contract_version, catalog_read: d.catalog_read === true, records_read: d.records_read === true,
      inventory_read: d.inventory_read === true, purchase_supported: d.purchase_supported === true, quote_supported: d.quote_supported === true,
      purchase_enabled: d.purchase_enabled === true, inventory_transfer_enabled: d.inventory_transfer_enabled === true,
      inventory_quote_supported: d.inventory_quote_supported === true, recipient_eligible: typeof d.recipient_eligible === 'boolean' ? d.recipient_eligible : null,
      max_quantity: integer(d.max_quantity, 1) ? d.max_quantity : null, max_diamonds: integer(d.max_diamonds, 1) ? d.max_diamonds : null,
      daily_diamonds: integer(d.daily_diamonds, 1) ? d.daily_diamonds : null, policy_version: typeof d.policy_version === 'string' ? d.policy_version : null,
      blockers: strings(d.blockers) && (d.daily_diamonds === null || integer(d.daily_diamonds,1)) ? d.blockers : ['CAPABILITY_UNCONFIRMED'] }
  })
}
export interface GiftSelection { gift_code: string; quantity: number; mode: 'direct' | 'inventory'; recipient_id?: number | null }
export interface GiftQuote extends GiftSelection {
  price_version: string; total_diamonds: number; available_diamonds: string
  commission_version: number | null; policy_version: string; can_submit: boolean; blockers: string[]
}
function selection(s: GiftSelection) {
  if (!s || typeof s.gift_code !== 'string' || !s.gift_code || !integer(s.quantity, 1)
    || !['direct','inventory'].includes(s.mode) || (s.mode === 'direct' && !integer(s.recipient_id, 1))
    || (s.mode === 'inventory' && s.recipient_id != null)) throw new Error('礼物选择无效')
  return { gift_code: s.gift_code, quantity: s.quantity, mode: s.mode, ...(s.mode === 'direct' ? { recipient_id: s.recipient_id } : {}) }
}
export function quoteGift(s: GiftSelection): Promise<GiftQuote> {
  const request = selection(s)
  return commerceRequest('/gifts/quotes/', 'POST', request, d => {
    if (!d || d.gift_code !== s.gift_code || d.quantity !== s.quantity || d.mode !== s.mode
      || (d.recipient_id ?? null) !== (s.recipient_id ?? null) || !/^[a-f0-9]{64}$/.test(d.price_version)
      || !integer(d.total_diamonds) || !decimal(d.available_diamonds)
      || !(d.commission_version === null || integer(d.commission_version)) || (s.mode === 'direct' && !integer(d.commission_version))
      || typeof d.policy_version !== 'string' || !d.policy_version || typeof d.can_submit !== 'boolean' || !strings(d.blockers)) throw new Error('报价格式无效')
    return d
  })
}

export interface Purchase { gift_name?: string; image_url?: string; quantity?: number; mode?: string; recipient_name?: string | null; created_at?: string; purchase_no: string; payment_status: string; amount_diamonds: number; blockers: string[] }
const statuses = ['created','processing','unknown','paid','failed','cancelled','partially_refunded','refunded']
export function parsePurchase(d: any): Purchase {
  if (!d || typeof d.purchase_no !== 'string' || !d.purchase_no || !statuses.includes(d.payment_status)
    || !integer(d.amount_diamonds) || !strings(d.blockers)) throw new Error('购买记录格式无效')
  return d
}
function validKey(key: string) { if (typeof key !== 'string' || !key.trim() || key.length > 100) throw new Error('原交易键无效'); return encodeURIComponent(key) }
export function purchaseGift(q: GiftQuote, key: string, code: string): Promise<Purchase> {
  validKey(key)
  if (!/^[a-f0-9]{64}$/.test(q.price_version) || (!code && q.total_diamonds !== 0) || (q.mode === 'direct' && !integer(q.commission_version))) throw new Error('请重新报价确认')
  return commerceRequest('/gifts/purchases/', 'POST', { ...selection(q), price_version: q.price_version,
    ...(q.mode === 'direct' ? { commission_version: q.commission_version } : {}), idempotency_key: key, code }, parsePurchase)
}
export function readGiftPurchaseByKey(key: string) { return commerceRequest(`/gifts/purchases/by-key/?idempotency_key=${validKey(key)}`, 'GET', {}, parsePurchase) }
export function readGiftPurchase(no: string) {
  if (!no) throw new Error('原购买单号缺失')
  return commerceRequest(`/gifts/purchases/${encodeURIComponent(no)}/`, 'GET', {}, parsePurchase)
}
export interface Lot { image_url?: string; created_at?: string; lot_id: number; gift_code: string; name: string; remaining: number; available: number; status: string }
export interface Transfer { image_url?: string; transfer_no: string; gift_code: string; gift_name?: string; sender_name?: string; recipient_name?: string; quantity: number; status: string; created_at: string }
export interface Earning { gift_name?: string; sender_name?: string; quantity?: number; image_url?: string; credited_at?: string | null; earnings_eligible?: boolean; id: number; status: string; monetary_accrual: boolean; blockers: string[]; net_amount: string; available_amount: string; currency?: string; wallet_destination?: string; credited_amount?: string; debt_offset_amount?: string }
export interface InventorySelection { gift_code: string; quantity: number; recipient_id: number }
export interface InventoryQuote extends InventorySelection {
  commission_version: number; available_quantity: number; payment_diamonds: 0
  policy_version: string; can_submit: boolean; blockers: string[]
}
function inventorySelection(s: InventorySelection) {
  if (!s || typeof s.gift_code !== 'string' || !s.gift_code || !integer(s.quantity,1) || !integer(s.recipient_id,1)) throw new Error('库存赠送选择无效')
  return {gift_code:s.gift_code,quantity:s.quantity,recipient_id:s.recipient_id}
}
export function quoteInventorySend(s: InventorySelection): Promise<InventoryQuote> {
  const request = inventorySelection(s)
  return commerceRequest('/gifts/inventory/quotes/', 'POST', request, d => {
    if (!d || d.gift_code !== request.gift_code || d.quantity !== request.quantity || d.recipient_id !== request.recipient_id
      || !integer(d.commission_version,1) || !integer(d.available_quantity) || d.payment_diamonds !== 0
      || typeof d.policy_version !== 'string' || !d.policy_version || typeof d.can_submit !== 'boolean' || !strings(d.blockers)
      || (d.can_submit && (d.available_quantity < d.quantity || d.blockers.length))) throw new Error('库存报价格式无效；禁止提交')
    return {...d,blockers:[...d.blockers]}
  })
}
function parseTransfer(d: any): Transfer {
  if (!d || typeof d.transfer_no !== 'string' || !d.transfer_no || typeof d.gift_code !== 'string' || !d.gift_code
    || !integer(d.quantity,1) || !['created','processing','unknown','delivered','failed','reversed','cancelled'].includes(d.status)
    || typeof d.created_at !== 'string' || !Number.isFinite(Date.parse(d.created_at))) throw new Error('赠送记录格式无效')
  return d
}
export function sendInventoryGift(q: InventoryQuote, key: string): Promise<Transfer> {
  validKey(key)
  if (!integer(q.commission_version,1) || q.payment_diamonds !== 0) throw new Error('请重新确认库存赠送')
  const request=inventorySelection(q)
  return commerceRequest('/gifts/transfers/', 'POST', {...request,commission_version:q.commission_version,idempotency_key:key}, d => {
    const result=parseTransfer(d)
    if(result.gift_code!==request.gift_code || result.quantity!==request.quantity)throw new Error('赠送记录与原意图不一致')
    return result
  })
}
export function readInventorySendByKey(key: string): Promise<Transfer> {
  return commerceRequest(`/gifts/transfers/by-key/?idempotency_key=${validKey(key)}`, 'GET', {}, parseTransfer)
}
export interface RecordPage { count: number; next: string | null; previous: string | null; results: (Lot | Purchase | Transfer | Earning)[] }
export type RecordKind = 'inventory' | 'purchase-records' | 'sent' | 'received' | 'earnings'
export function readGiftRecords(kind: RecordKind, page = 1): Promise<RecordPage> {
  if (!['inventory','purchase-records','sent','received','earnings'].includes(kind) || !integer(page, 1)) throw new Error('记录类型或页码无效')
  return commerceRequest(`/gifts/${kind}/`, 'GET', { page }, d => {
    if (!d || !integer(d.count) || !Array.isArray(d.results) || ![d.next,d.previous].every(x => x === null || typeof x === 'string')) throw new Error('分页格式无效')
    for (const r of d.results) {
      let valid = false
      if (kind === 'purchase-records') { parsePurchase(r); valid = true }
      if (kind === 'inventory') valid = r && integer(r.lot_id,1) && typeof r.gift_code === 'string' && typeof r.name === 'string' && integer(r.remaining) && integer(r.available) && r.available <= r.remaining && ['active','frozen','revoked'].includes(r.status)
      if (kind === 'sent' || kind === 'received') valid = r && typeof r.transfer_no === 'string' && typeof r.gift_code === 'string' && integer(r.quantity,1) && typeof r.status === 'string' && typeof r.created_at === 'string'
      if (kind === 'earnings') valid = r && integer(r.id,1) && typeof r.status === 'string' && typeof r.monetary_accrual === 'boolean' && strings(r.blockers) && decimal(r.net_amount) && decimal(r.available_amount)
      if (!valid) throw new Error('记录格式无效')
    }
    return d
  })
}
export function earningLabel(e: Earning) {
  if (!e.monetary_accrual) return '待计提（尚未形成可提现收益）'
  if (e.currency === 'fish' && e.wallet_destination === 'player_wallet' && decimal(e.credited_amount)) {
    const debt = decimal(e.debt_offset_amount) && /[1-9]/.test(e.debt_offset_amount) ? `；抵扣待抵扣余额 ${e.debt_offset_amount} 鱼干` : ''
    return `净收益 ${e.net_amount} 鱼干；已入钱包 ${e.credited_amount} 鱼干${debt}`
  }
  return `已计提 ${e.net_amount}；可用 ${e.available_amount}（服务端金额）`
}
export function paymentLabel(status: string, amountDiamonds?: number) {
  if (status === 'paid' && amountDiamonds === 0) return '已完成（免费）'
  return ({ created:'已创建，待核对',processing:'付款确认中，勿重复支付',unknown:'付款结果未知，请人工核对，勿重复支付',paid:'已付款',failed:'未完成',cancelled:'已取消',partially_refunded:'部分退回',refunded:'已退回' } as Record<string,string>)[status] || '状态待核对'
}
