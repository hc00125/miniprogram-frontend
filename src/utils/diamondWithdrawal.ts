import type { WithdrawalItem, DiamondWithdrawalCreatePayload } from '@/api/earnings'

export interface DiamondActor { player_id: number; profile_id: number }
export interface PendingDiamondWithdrawal extends DiamondActor {
  request_id: string
  amount: string
  request_note: string
  state: 'pending'
}
export const diamondPendingKey = (actor: DiamondActor) => `diamond_withdrawal_pending:${actor.profile_id}:${actor.player_id}`

export async function createDiamondRequestId(): Promise<string> {
  const crypto = (globalThis as any).crypto
  if (crypto?.randomUUID) return crypto.randomUUID()
  let bytes: Uint8Array
  if (crypto?.getRandomValues) bytes = crypto.getRandomValues(new Uint8Array(16))
  else {
    const native = (globalThis as any).wx
    if (!native?.getRandomValues) throw new Error('当前环境无法生成安全请求编号，请升级微信后重试')
    bytes = await new Promise<Uint8Array>((resolve, reject) => native.getRandomValues({
      length: 16, success: (r: any) => resolve(new Uint8Array(r.randomValues)), fail: reject
    }))
  }
  if (bytes.length !== 16) throw new Error('请求编号生成失败，请重试')
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`
}

export function persistDiamondWithdrawal(pending: PendingDiamondWithdrawal) {
  const key = diamondPendingKey(pending)
  uni.setStorageSync(key, pending)
  const saved = uni.getStorageSync(key)
  if (saved?.request_id !== pending.request_id || saved?.amount !== pending.amount) throw new Error('无法保存兑换请求，请检查设备存储后重试')
}

export function readDiamondWithdrawal(actor: DiamondActor): PendingDiamondWithdrawal | null {
  const saved = uni.getStorageSync(diamondPendingKey(actor))
  if (!saved) return null
  if (saved.player_id !== actor.player_id || saved.profile_id !== actor.profile_id || saved.state !== 'pending' ||
      typeof saved.request_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(saved.request_id) ||
      typeof saved.amount !== 'string' || !/^[1-9]\d*$/.test(saved.amount) || !Number.isSafeInteger(Number(saved.amount))) {
    throw new Error('原兑换请求存储异常，请联系客服核对，勿重复新建')
  }
  return saved
}

export function diamondPayload(pending: PendingDiamondWithdrawal): DiamondWithdrawalCreatePayload {
  return { payment_method: 'diamonds', amount: pending.amount, request_id: pending.request_id, request_note: pending.request_note }
}

export function completeDiamondWithdrawal(pending: PendingDiamondWithdrawal, receipt: WithdrawalItem) {
  const actorKey = `diamond_withdrawal_actor:${pending.profile_id}:${pending.player_id}`
  const knownActor = uni.getStorageSync(actorKey)
  if (receipt.payment_method !== 'diamonds' || receipt.status !== 'paid' || receipt.request_id !== pending.request_id ||
      Number(receipt.amount) !== Number(pending.amount) || receipt.target_profile_id !== pending.profile_id ||
      !Number.isSafeInteger(receipt.actor_user_id) || Number(receipt.actor_user_id) < 1 ||
      (knownActor && knownActor !== receipt.actor_user_id) ||
      !Number.isSafeInteger(receipt.diamond_amount) || Number(receipt.diamond_amount) < 1 ||
      typeof receipt.diamond_balance_after !== 'number' || !Number.isFinite(receipt.diamond_balance_after)) {
    throw new Error('兑换结果尚未确认，请恢复原兑换请求，勿重复新建')
  }
  uni.setStorageSync(actorKey, receipt.actor_user_id)
  const key = diamondPendingKey(pending)
  if (uni.getStorageSync(key)?.request_id === pending.request_id) uni.removeStorageSync(key)
  return receipt
}
