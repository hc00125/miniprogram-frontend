export type RecoveryKind = 'gift' | 'inventory_send' | 'surcharge'
export interface CommerceRecovery {
  kind: RecoveryKind; idempotency_key: string; business_no: string
  state: 'processing' | 'unknown' | 'paid' | 'delivered' | 'failed'
}
const pending = (r: CommerceRecovery) => ['processing', 'unknown'].includes(r.state)
function key(account: string, kind: RecoveryKind) {
  if (!account || !['gift', 'inventory_send', 'surcharge'].includes(kind)) throw new Error('恢复账号或类型无效')
  return `commerce:recovery:v1:${encodeURIComponent(account)}:${kind}`
}
function clean(value: CommerceRecovery): CommerceRecovery {
  if (!value || typeof value.idempotency_key !== 'string' || !value.idempotency_key.trim()
    || typeof value.business_no !== 'string' || !['processing', 'unknown', 'paid', 'delivered', 'failed'].includes(value.state)) throw new Error('恢复记录无效，请联系平台核对原交易')
  // Deliberate allowlist: never persist tokens, wx.login code or request payloads.
  return { kind: value.kind, idempotency_key: value.idempotency_key, business_no: value.business_no, state: value.state }
}
export function getRecovery(account: string, kind: RecoveryKind): CommerceRecovery | null {
  const value = uni.getStorageSync(key(account, kind))
  if (!value) return null
  const result = clean(value)
  if (result.kind !== kind) throw new Error('恢复记录不匹配，请联系平台核对原交易')
  return result
}
export function saveRecovery(account: string, value: CommerceRecovery) {
  const storageKey = key(account, value.kind), record = clean(value), previous = getRecovery(account, value.kind)
  if (previous && pending(previous) && (previous.idempotency_key !== record.idempotency_key
    || (previous.business_no && previous.business_no !== record.business_no))) throw new Error('原交易尚未确认，只能查询原单')
  uni.setStorageSync(storageKey, record)
  // Persist before issuing a write. Storage failure must block submission.
  const saved = getRecovery(account, value.kind)
  if (JSON.stringify(saved) !== JSON.stringify(record)) throw new Error('恢复记录保存失败，禁止提交')
}
export function clearRecovery(account: string, kind: RecoveryKind) {
  const previous = getRecovery(account, kind)
  if (previous && pending(previous)) throw new Error('原交易尚未确认，不可清除恢复记录')
  uni.removeStorageSync(key(account, kind))
}
