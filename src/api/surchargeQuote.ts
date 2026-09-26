import { BASE_URL } from '@/utils/request'
import { getClientPlatform } from '@/utils/purchaseAvailability'
import { handleSessionExpiry } from '@/utils/sessionExpiry'
import type { OrderCreatePayload } from '@/api/boss'

/** Implemented v2 quote only; it cannot create an order or debit a wallet. */
export type SurchargeQuoteRequest = OrderCreatePayload & { surcharge_diamonds: number }
export interface SurchargeQuote {
  contract_version: 'surcharge-v2'; base_amount_yuan: string; surcharge_amount_yuan: string; total_amount_yuan: string
  base_amount_diamonds: string; total_amount_diamonds: string; required_players: number; quote_version: string
  surcharge: { policy_version: 'surcharge-v2-fixed25-equal1'; commission_rate: '25.00'; amount_diamonds: number
    amount_yuan: string; required_players: number; amount_step_diamonds: number; per_person_gross_diamonds: string
    per_person_commission_diamonds: string; per_person_net_diamonds: string }
  can_submit: boolean; blockers: string[]
}
const urlPath = '/boss/order/quote'
const safeInt = (n: unknown, min = 0) => typeof n === 'number' && Number.isSafeInteger(n) && n >= min
const two = (s: unknown) => typeof s === 'string' && /^(?:0|[1-9]\d*)\.\d{2}$/.test(s)
const one = (s: unknown) => typeof s === 'string' && /^(?:0|[1-9]\d*)\.\d$/.test(s)
const cents = (s: string) => BigInt(s.replace('.', ''))
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
export const requiredSurchargeStep = (players: number) => players / gcd(25, players)
/** Check server-provided surcharge arithmetic; never synthesize a price. */
export function validSurchargeSnapshot(s: SurchargeQuote['surcharge'], players: number): boolean {
  if (!safeInt(players, 1) || !s || s.policy_version !== 'surcharge-v2-fixed25-equal1'
    || s.commission_rate !== '25.00' || !safeInt(s.amount_diamonds)
    || s.required_players !== players || s.amount_step_diamonds !== requiredSurchargeStep(players)
    || !two(s.amount_yuan) || ![s.per_person_gross_diamonds,s.per_person_commission_diamonds,s.per_person_net_diamonds].every(two)) return false
  return s.amount_diamonds % s.amount_step_diamonds === 0
    && cents(s.amount_yuan) === BigInt(s.amount_diamonds) * BigInt(10)
    && cents(s.per_person_gross_diamonds) * BigInt(players) === BigInt(s.amount_diamonds) * BigInt(100)
    && cents(s.per_person_commission_diamonds) * BigInt(4) === cents(s.per_person_gross_diamonds)
    && cents(s.per_person_gross_diamonds) - cents(s.per_person_commission_diamonds) === cents(s.per_person_net_diamonds)
}
function parse(value: unknown, request: SurchargeQuoteRequest): SurchargeQuote {
  const d = value as SurchargeQuote
  if (!d || d.contract_version !== 'surcharge-v2' || !/^[a-f0-9]{64}$/.test(d.quote_version)
    || !safeInt(d.required_players, 1) || ![d.base_amount_yuan,d.surcharge_amount_yuan,d.total_amount_yuan].every(two)
    || !one(d.base_amount_diamonds) || !one(d.total_amount_diamonds)
    || !validSurchargeSnapshot(d.surcharge, d.required_players)
    || d.surcharge.amount_diamonds !== request.surcharge_diamonds
    || typeof d.can_submit !== 'boolean' || !Array.isArray(d.blockers) || !d.blockers.every(x => typeof x === 'string')) throw new Error('加价报价格式无效')
  if (cents(d.base_amount_yuan) + cents(d.surcharge_amount_yuan) !== cents(d.total_amount_yuan)
    || cents(d.surcharge.amount_yuan) !== cents(d.surcharge_amount_yuan)
    || cents(d.surcharge.amount_yuan) !== BigInt(d.surcharge.amount_diamonds) * BigInt(10)
    || cents(d.surcharge.per_person_gross_diamonds) * BigInt(d.required_players) !== BigInt(d.surcharge.amount_diamonds) * BigInt(100)
    || cents(d.surcharge.per_person_commission_diamonds) * BigInt(4) !== cents(d.surcharge.per_person_gross_diamonds)
    || cents(d.base_amount_yuan) !== BigInt(d.base_amount_diamonds.replace('.', ''))
    || cents(d.total_amount_yuan) !== BigInt(d.total_amount_diamonds.replace('.', ''))
    || cents(d.surcharge.per_person_gross_diamonds) - cents(d.surcharge.per_person_commission_diamonds) !== cents(d.surcharge.per_person_net_diamonds)) throw new Error('加价报价格式无效')
  return d
}
export function quoteOrderSurcharge(payload: SurchargeQuoteRequest): Promise<SurchargeQuote> {
  if (!safeInt(payload.surcharge_diamonds)) return Promise.reject(new Error('整单加价必须为非负整数钻石'))
  const token = String(uni.getStorageSync('token') || '')
  if (!token) return Promise.reject(new Error('请先登录'))
  return new Promise((resolve, reject) => uni.request({
    url: `${BASE_URL.replace(/\/$/, '')}${urlPath}`, method: 'POST', data: payload,
    header: { Authorization: `Bearer ${token}`, 'X-Client-Platform': getClientPlatform() },
    success: res => {
      if (token !== String(uni.getStorageSync('token') || '')) { reject(new Error('登录状态已变化，请重新报价')); return }
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try { resolve(parse(res.data, payload)) } catch (error) { reject(error) }
      } else {
        const data = res.data && typeof res.data === 'object' ? res.data : {detail:'加价报价失败'}
        reject(handleSessionExpiry(res.statusCode, data, urlPath, 'token', token) || {...data as any, statusCode:res.statusCode})
      }
    }, fail: reject
  }))
}
