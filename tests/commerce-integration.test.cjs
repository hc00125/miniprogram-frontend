// All credentials/data in this file are synthetic fixtures; no live API/payment.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const root = path.join(__dirname, '..')
function load(file, uni, overrides = {}) {
  const mod = { exports: {} }
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  new Function('require', 'module', 'exports', 'uni', 'getCurrentPages', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(id => overrides[id] || (id === '@/utils/purchaseAvailability' ? {getClientPlatform:()=> 'android',isIOSPurchaseEnabled:()=>true} : id === '@/utils/request' ? { BASE_URL: 'https://fixture.invalid/api' } : id.startsWith('@/') ? load('src/' + id.slice(2) + '.ts', uni, overrides) : require(id)), mod, mod.exports, uni, () => [])
  return mod.exports
}
function platform() { const store = { token: 'fixture-client', admin_token: 'fixture-admin' }, calls = [], events = []; return { store, calls, events, getStorageSync: k => store[k], setStorageSync: (k,v) => { store[k]=v }, removeStorageSync: k => { delete store[k] }, $emit: (...e) => events.push(e), showModal() {}, request: x => calls.push(x) } }
const status = order => ({ order_no: order, required_players: 2, eligible: false, can_submit: false, structurally_eligible: true, blockers: ['POLICY_UNCONFIRMED'], disabled_reason: '规则尚未确认', paid_diamonds: 0, processing_diamonds: 0, refunded_diamonds: 0, amount_options_diamonds: [], min_amount_diamonds: null, max_amount_diamonds: null, records: [], count: 0, next: null, previous: null })
test('confirmed surcharge GET binds client JWT and encodes original order; rejects malformed money', async () => {
  const uni = platform(), api = load('src/api/commerceRead.ts', uni)
  const p = api.readOrderSurcharge('原/单?', 1)
  assert.equal(uni.calls[0].url, 'https://fixture.invalid/api/boss/orders/%E5%8E%9F%2F%E5%8D%95%3F/surcharge/')
  assert.equal(uni.calls[0].header.Authorization, 'Bearer fixture-client')
  assert.equal(uni.calls[0].method, 'GET')
  uni.calls[0].success({ statusCode: 200, data: status('原/单?') })
  assert.equal((await p).can_submit, false)
  const bad = api.readOrderSurcharge('x'); uni.calls[1].success({ statusCode: 200, data: { ...status('x'), paid_diamonds: 0.2 } }); await assert.rejects(bad)
})
test('read errors expire only the customer session; late success/failure and ordinary permission errors never leak or replay', async () => {
  const uni = platform(), api = load('src/api/commerceRead.ts', uni)
  let p = api.readOrderSurcharge('a'); uni.calls[0].success({ statusCode: 403, data: { code: 'POLICY_UNCONFIRMED' } }); await assert.rejects(p); assert.equal(uni.store.token, 'fixture-client')
  p = api.readOrderSurcharge('a'); uni.store.token = 'fixture-new'; uni.calls[1].success({ statusCode: 401, data: {} }); await assert.rejects(p); assert.equal(uni.store.token, 'fixture-new')
  p = api.readOrderSurcharge('a'); uni.store.token = 'fixture-other'; uni.calls[2].success({ statusCode: 200, data: status('a') }); await assert.rejects(p)
  p = api.readOrderSurcharge('a'); uni.calls[3].success({ statusCode: 403, data: { code: 'token_not_valid' } }); await assert.rejects(p); assert.equal(uni.store.token, undefined); assert.equal(uni.store.admin_token, 'fixture-admin'); assert.equal(uni.calls.length, 4)
  await assert.rejects(api.readOrderSurcharge('a')); assert.equal(uni.calls.length, 4)
})
test('account scoped durable recovery records whitelist nonsecret fields and cannot replace unresolved original intent', () => {
  const uni = platform(), journal = load('src/utils/commerceRecovery.ts', uni)
  journal.saveRecovery('account-a', { kind: 'gift', idempotency_key: 'fixture-key', business_no: '', state: 'unknown', code: 'DO_NOT_STORE', token: 'DO_NOT_STORE', recipient_id: 12 })
  assert.equal(journal.getRecovery('account-b', 'gift'), null)
  const saved = journal.getRecovery('account-a', 'gift')
  assert.equal(saved.idempotency_key, 'fixture-key'); assert.equal(saved.code, undefined)
  assert.ok(!JSON.stringify(uni.store).includes('DO_NOT_STORE'))
  assert.throws(() => journal.saveRecovery('account-a', { kind: 'gift', idempotency_key: 'new-key', business_no: '', state: 'unknown' }))
  assert.throws(() => journal.clearRecovery('account-a', 'gift'))
  journal.saveRecovery('account-a', { ...saved, business_no: 'original', state: 'paid' })
  journal.clearRecovery('account-a', 'gift'); assert.equal(journal.getRecovery('account-a', 'gift'), null)
})
exports.load = load; exports.platform = platform; exports.status = status
