import { getPatronagePending, createPatronagePaymentAdapter, parsePatronagePurchaseInput, parsePatronageQuote, type PatronagePurchaseInput, type PatronageQuote, type PatronageRecord } from '@/api/patronage'

export interface PatronageIntentSession { accountId: string; loginGeneration: string }
export interface PatronageIntent extends Omit<PatronagePurchaseInput, 'code'> {
  version: 1; account_id: string; amount_yuan: string; amount_diamonds: string
  dispatch_started: boolean; payment_status: 'prepared' | PatronageRecord['payment_status']
  purchase_no: string | null; confirmed_by_key: boolean
}
interface Dependencies {
  // Host must supply a non-secret generation changed on logout/relogin, not a token.
  session: () => PatronageIntentSession
  storage?: { get(key: string): unknown; set(key: string, value: PatronageIntent): void }
  newKey: () => string
  adapter?: ReturnType<typeof createPatronagePaymentAdapter>
  pending?: typeof getPatronagePending
}
/** Durable account journal. Dispatch facts never roll back; only an explicit new
 * purchase after read-only server verification may archive and replace the slot. */
export function createPatronagePaymentIntent(deps: Dependencies) {
  const storage = deps.storage || { get: (key: string) => uni.getStorageSync(key), set: (key: string, value: PatronageIntent) => uni.setStorageSync(key, value) }
  const owner = { ...deps.session() }
  const storageKey = `patronage:payment-intent:v1:${encodeURIComponent(owner.accountId)}`
  let approved: string | null = null
  let active = true
  let seen: PatronageIntent | null = null
  function isCurrent() {
    const current = deps.session()
    if (!owner.accountId || !owner.loginGeneration || current.accountId !== owner.accountId || current.loginGeneration !== owner.loginGeneration) active = false
    return active
  }
  function session() {
    if (!isCurrent()) { approved = null; throw new Error('页面已关闭或登录状态已变化，请重新打开') }
  }
  function clean(raw: unknown): PatronageIntent {
    const v = raw as PatronageIntent
    const fail = (): never => { throw new Error('原交易恢复记录异常，请联系平台核对') }
    if (!v || typeof v !== 'object' || Array.isArray(v) || v.version !== 1 || v.account_id !== owner.accountId) fail()
    const input = parsePatronagePurchaseInput(v)
    const money = (n: unknown) => typeof n === 'string' && /^(0|[1-9]\d*)(\.\d+)?$/.test(n)
    if (!money(v.amount_yuan) || !money(v.amount_diamonds) || !['prepared', 'created', 'processing', 'unknown', 'paid', 'failed'].includes(v.payment_status)
      || (v.dispatch_started !== undefined && typeof v.dispatch_started !== 'boolean') || typeof v.confirmed_by_key !== 'boolean'
      || !(v.purchase_no === null || (typeof v.purchase_no === 'string' && Boolean(v.purchase_no.trim())))) fail()
    const started = v.dispatch_started === undefined ? true : v.dispatch_started
    if ((!started && (v.payment_status !== 'prepared' || v.purchase_no !== null || v.confirmed_by_key))
      || (v.confirmed_by_key && (!['paid', 'failed'].includes(v.payment_status) || v.purchase_no === null))) fail()
    // Allowlist only. Tokens/login codes and arbitrary payloads never enter this journal.
    return { version: 1, account_id: owner.accountId, player_id: input.player_id, package_code: input.package_code,
      price_version: input.price_version, idempotency_key: input.idempotency_key, amount_yuan: v.amount_yuan, amount_diamonds: v.amount_diamonds,
      dispatch_started: started, payment_status: started && v.payment_status === 'prepared' ? 'unknown' : v.payment_status,
      purchase_no: v.purchase_no, confirmed_by_key: v.confirmed_by_key }
  }
  function read(): PatronageIntent | null {
    session()
    const value = storage.get(storageKey)
    const next = value === undefined || value === null || value === '' ? null : clean(value)
    if (seen && (!next || next.idempotency_key !== seen.idempotency_key || (seen.dispatch_started && !next.dispatch_started))) throw new Error('原交易恢复记录丢失或回退，请联系平台核对')
    seen = next
    return next ? { ...next } : null
  }
  function save(value: PatronageIntent) {
    session()
    const safe = clean(value)
    storage.set(storageKey, safe)
    if (JSON.stringify(read()) !== JSON.stringify(safe)) throw new Error('原交易保存失败，禁止提交')
  }
  function result(record: PatronageRecord, original: PatronageIntent, byKey: boolean) {
    session()
    const latest = read()
    const decimal = (v: string) => v.includes('.') ? v.replace(/0+$/, '').replace(/\.$/, '') : v
    if (!latest || latest.idempotency_key !== original.idempotency_key || record.player_id !== latest.player_id
      || record.idempotency_key !== latest.idempotency_key || record.price_version !== latest.price_version
      || record.package_code !== latest.package_code || decimal(record.amount_yuan) !== decimal(latest.amount_yuan)
      || decimal(record.amount_diamonds) !== decimal(latest.amount_diamonds)
      || (latest.purchase_no !== null && latest.purchase_no !== record.purchase_no)) throw new Error('响应与原交易不匹配')
    if (['paid', 'failed'].includes(latest.payment_status) && record.payment_status !== latest.payment_status) throw new Error('原交易状态冲突，请联系平台核对')
    const next: PatronageIntent = { ...latest, dispatch_started: true, payment_status: record.payment_status, purchase_no: record.purchase_no,
      confirmed_by_key: latest.confirmed_by_key || (byKey && ['paid', 'failed'].includes(record.payment_status)) }
    save(next)
    return record
  }
  return {
    snapshot() { return isCurrent() ? read() : null },
    // The page invalidates synchronously on hide/unload/session expiry.
    invalidate() { active = false; approved = null },
    prepare(raw: PatronageQuote): PatronageIntent {
      session()
      approved = null
      const q = parsePatronageQuote(raw), existing = read()
      if (existing) {
        if (existing.player_id !== q.player_id || existing.package_code !== q.package_code || existing.price_version !== q.price_version
          || existing.amount_yuan !== q.amount_yuan || existing.amount_diamonds !== q.amount_diamonds) throw new Error('原交易已存在，只能查询原交易')
        approved = q.can_submit && q.blockers.length === 0 ? JSON.stringify(existing) : null
        return existing
      }
      const value: PatronageIntent = { version: 1, account_id: owner.accountId, player_id: q.player_id, package_code: q.package_code,
        price_version: q.price_version, idempotency_key: deps.newKey(), amount_yuan: q.amount_yuan, amount_diamonds: q.amount_diamonds,
        dispatch_started: false, payment_status: 'prepared', purchase_no: null, confirmed_by_key: false }
      save(value); approved = q.can_submit && q.blockers.length === 0 ? JSON.stringify(value) : null
      return { ...value }
    },
    async startNew(raw: PatronageQuote): Promise<PatronageIntent> {
      session()
      approved = null
      const original = read(), q = parsePatronageQuote(raw)
      if (!original || (original.dispatch_started && !original.confirmed_by_key)) throw new Error('原交易尚未确认，只能查询原交易')
      const pending = await (deps.pending || getPatronagePending)()
      session()
      if (pending.count !== 0 || pending.next !== null || pending.results.length) throw new Error('服务端仍有未决交易，请先核对')
      if (JSON.stringify(read()) !== JSON.stringify(original)) throw new Error('原交易已变化，请重新核对')
      const archiveKey = `${storageKey}:archive:${encodeURIComponent(original.idempotency_key)}`
      storage.set(archiveKey, original)
      if (JSON.stringify(clean(storage.get(archiveKey))) !== JSON.stringify(original)) throw new Error('原交易归档失败，禁止新购')
      const next: PatronageIntent = { version: 1, account_id: owner.accountId, player_id: q.player_id, package_code: q.package_code,
        price_version: q.price_version, idempotency_key: deps.newKey(), amount_yuan: q.amount_yuan, amount_diamonds: q.amount_diamonds,
        dispatch_started: false, payment_status: 'prepared', purchase_no: null, confirmed_by_key: false }
      if (next.idempotency_key === original.idempotency_key || storage.get(`${storageKey}:archive:${encodeURIComponent(next.idempotency_key)}`)) throw new Error('新交易标识重复，禁止提交')
      clean(next)
      seen = null // Only this explicit, audited path may rotate the account slot.
      save(next)
      approved = q.can_submit && q.blockers.length === 0 ? JSON.stringify(next) : null
      return { ...next }
    },
    async dispatch(code?: string): Promise<PatronageRecord> {
      session()
      const original = read()
      if (!original || original.dispatch_started) throw new Error('原交易只能查询，不可重复提交')
      if (!deps.adapter) throw new Error('购买尚未开放，未发起付款')
      if (!approved || JSON.stringify(original) !== approved) throw new Error('请重新报价并确认原交易')
      const sent: PatronageIntent = { ...original, dispatch_started: true, payment_status: 'unknown' }
      save(sent) // Synchronous, read-back verified BEFORE the potentially money-moving call.
      approved = null
      return result(await deps.adapter.purchase({ player_id: sent.player_id, package_code: sent.package_code,
        price_version: sent.price_version, idempotency_key: sent.idempotency_key, ...(code === undefined ? {} : { code }) }), sent, false)
    },
    async recover(): Promise<PatronageRecord> {
      session()
      const original = read()
      if (!original) throw new Error('没有原交易可查询')
      const adapter = deps.adapter || createPatronagePaymentAdapter()
      return result(await adapter.byKey(original.idempotency_key), original, true)
    }
  }
}
