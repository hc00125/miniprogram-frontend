/** Exact display-only view models. No wire DTO is inferred here. */
export function parseWholeOrderAmount(value: string): { valid: boolean; amount: number | null } {
  if (value === '' || value === '0') return { valid: true, amount: 0 }
  if (!/^[1-9]\d*$/.test(value)) return { valid: false, amount: null }
  const amount = Number(value)
  return Number.isSafeInteger(amount) ? { valid: true, amount } : { valid: false, amount: null }
}

/** Only the implemented v2 available-orders DTO may enter the hall. */
export interface HallSurchargeView {
  policy_version: string; commission_rate: string; required_players: number
  paid_diamonds: number; pending_diamonds: number; refunded_diamonds: number
  per_person_net_diamonds: string; blockers: string[]; earnings_withdrawable: boolean
}
export function hallSurcharge(order: { required_players: number; surcharge?: HallSurchargeView | null }): { wholeOrderDiamonds: number; netDiamonds: string } | null {
  const s = order?.surcharge
  if (!Number.isSafeInteger(order?.required_players) || order.required_players < 1 || !s
    || s.policy_version !== 'surcharge-v2-fixed25-equal1' || s.commission_rate !== '25.00'
    || s.required_players !== order.required_players
    || !Number.isSafeInteger(s.paid_diamonds) || s.paid_diamonds < 1
    || !Number.isSafeInteger(s.pending_diamonds) || s.pending_diamonds < 0
    || !Number.isSafeInteger(s.refunded_diamonds) || s.refunded_diamonds < 0
    || s.earnings_withdrawable !== false
    || !Array.isArray(s.blockers) || s.blockers.length !== 0
    || typeof s.per_person_net_diamonds !== 'string' || !/^(?:0|[1-9]\d*)\.\d{2}$/.test(s.per_person_net_diamonds)
    || BigInt(s.paid_diamonds) * BigInt(75) !== BigInt(s.per_person_net_diamonds.replace('.', '')) * BigInt(order.required_players)) return null
  return { wholeOrderDiamonds: s.paid_diamonds, netDiamonds: s.per_person_net_diamonds }
}
