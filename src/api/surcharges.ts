/** Frontend-only read contract. No network adapter until backend paths, DTO,
 * authentication and shared coin consumption are verified. No write exports.
 * Proposed route: existing boss/orders root + encodeURIComponent(orderNo)
 * + /surcharge/; trailing slash and exact prefix still need alignment.
 * Commission belongs to the internal order_surcharge PlayerGiftConfig;
 * the frontend never computes commission, currency conversion or allocation.
 */
export interface SurchargeCapabilities {
  status_query_enabled: boolean
  payment_enabled: boolean
}
export type SurchargePaymentStatus = 'created' | 'processing' | 'unknown' | 'paid' | 'failed'
/** Display inputs must originate from authenticated server data for this session
 * and order. These are a proposed view model, not a verified backend wire DTO. */
export interface SurchargeReadState {
  account_id: string
  session_key: string
  order_no: string
  eligible: boolean
  blocked_reason: string
  payment_status: SurchargePaymentStatus | null
  surcharge_no: string | null
}
export function getSurchargeCapabilities(): SurchargeCapabilities {
  return { status_query_enabled: false, payment_enabled: false }
}
export async function getOrderSurchargeStatus(orderNo: string) {
  if (typeof orderNo !== 'string' || !orderNo.trim()) throw new Error('订单号不能为空')
  // Unavailable is NOT an empty history, failed payment or zero paid amount.
  return { order_no: orderNo, available: false as const, reason_code: 'CONTRACT_UNCONFIRMED' as const,
    message: '加价状态查询尚未接入，请返回原订单查询；勿重复支付' }
}
