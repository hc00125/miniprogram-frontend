import { BASE_URL } from '@/utils/request'
import { handleSessionExpiry } from '@/utils/sessionExpiry'

export interface SurchargeRecord {
  surcharge_no: string; payment_status: string; amount_diamonds: number; refunded_diamonds: number; created_at: string
}
export interface OrderSurchargeRead {
  order_no: string; required_players: number; eligible: boolean; can_submit: boolean
  structurally_eligible: boolean; blockers: string[]; disabled_reason: string
  paid_diamonds: number; processing_diamonds: number; refunded_diamonds: number
  amount_options_diamonds: number[]; min_amount_diamonds: number | null; max_amount_diamonds: number | null
  records: SurchargeRecord[]; count: number; next: string | null; previous: string | null
}
const integer = (v: unknown, min = 0) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min
const text = (v: unknown) => typeof v === 'string' && !!v.trim()
function parseStatus(value: unknown, orderNo: string): OrderSurchargeRead {
  const d = value as OrderSurchargeRead
  if (!d || d.order_no !== orderNo || !integer(d.required_players, 1)
    || !['eligible', 'can_submit', 'structurally_eligible'].every(k => typeof (d as any)[k] === 'boolean')
    || !Array.isArray(d.blockers) || !d.blockers.every(x => typeof x === 'string') || typeof d.disabled_reason !== 'string'
    || ![d.paid_diamonds, d.processing_diamonds, d.refunded_diamonds, d.count].every(x => integer(x))
    || !Array.isArray(d.amount_options_diamonds) || !d.amount_options_diamonds.every(x => integer(x, 1))
    || ![d.min_amount_diamonds, d.max_amount_diamonds].every(x => x === null || integer(x, 1))
    || ![d.next, d.previous].every(x => x === null || typeof x === 'string')
    || !Array.isArray(d.records) || !d.records.every(r => r && text(r.surcharge_no)
      && ['created', 'processing', 'unknown', 'paid', 'failed', 'partially_refunded', 'refunded'].includes(r.payment_status)
      && integer(r.amount_diamonds, 1) && integer(r.refunded_diamonds) && r.refunded_diamonds <= r.amount_diamonds && text(r.created_at))) throw new Error('加价状态格式无效')
  return d
}
/** Confirmed foundation GET only; no speculative POST or automatic replay. */
export async function readOrderSurcharge(orderNo: string, page = 1): Promise<OrderSurchargeRead> {
  if (!text(orderNo) || !integer(page, 1)) throw new Error('订单或页码无效')
  const path = `/boss/orders/${encodeURIComponent(orderNo)}/surcharge/`
  const token = String(uni.getStorageSync('token') || '')
  if (!token) throw { code: 'LOGIN_REQUIRED', detail: '请先登录' }
  return new Promise((resolve, reject) => uni.request({
    url: `${BASE_URL.replace(/\/$/, '')}${path}`, method: 'GET', data: { page }, header: { Authorization: `Bearer ${token}` },
    success: res => {
      if (token !== String(uni.getStorageSync('token') || '')) { reject({ code: 'STALE_SESSION', handled: true }); return }
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try { resolve(parseStatus(res.data, orderNo)) } catch (error) { reject(error) }
      } else {
        const data = res.data && typeof res.data === 'object' ? res.data : { detail: '加价状态读取失败' }
        reject(handleSessionExpiry(res.statusCode, data, path, 'token', token) || { ...data as any, statusCode: res.statusCode })
      }
    }, fail: reject
  }))
}
