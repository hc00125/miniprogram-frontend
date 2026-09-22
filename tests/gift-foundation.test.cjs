const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.join(__dirname, '..')
function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', 'uni', code)(id => deps[id] || require(id), mod, mod.exports, deps.uni)
  return mod.exports
}
exports.load = load

test('intent bounds totals, clears on close/account switch, rejects late replies and never auto-submits after recharge', () => {
  const { createGiftIntent } = load('src/utils/giftIntent.ts')
  const intent = createGiftIntent()
  intent.open('account-a', { id: 'player-1', name: '固定陪玩' })
  intent.select({ code: 'rose', name: '玫瑰', price_diamonds: 12 }, 5)
  intent.setQuantity(3)
  assert.equal(intent.snapshot().total_diamonds, 36)
  assert.equal(intent.setQuantity(0), false)
  assert.equal(intent.setQuantity(6), false)
  assert.equal(intent.setQuantity(1.5), false)
  const stamp = intent.stamp()
  intent.rechargeReturned()
  assert.equal(intent.snapshot().quantity, 3)
  assert.equal(intent.snapshot().needs_confirmation, true)
  assert.equal(intent.accepts(stamp), false)
  assert.equal(intent.snapshot().recipient.id, 'player-1')
  intent.syncAccount('account-b')
  assert.equal(intent.snapshot().recipient, null)
  assert.equal(intent.snapshot().gift, null)
  assert.equal(intent.accepts(stamp), false)
  intent.open('account-b', { id: 'player-2', name: '乙' })
  const fresh = intent.stamp()
  intent.close()
  assert.equal(intent.accepts(fresh), false)
  assert.equal(intent.snapshot().account_id, '')
})

test('catalog uses raw JSON read-only response, no admin credentials or fabricated fallback', async () => {
  let request
  const api = load('src/api/gifts.ts', { '@/utils/request': { BASE_URL: 'https://example.invalid/api' }, uni: { request: options => { request = options } } })
  const pending = api.getGiftCatalog()
  assert.equal(request.url, 'https://example.invalid/api/gifts/catalog/')
  assert.equal(request.method, 'GET')
  assert.equal(request.header.Authorization, undefined)
  request.success({ statusCode: 200, data: { results: [{ code: 'rose', name: '玫瑰', image_url: '', price_diamonds: 12, description: '' }], count: 1, next: null, previous: null } })
  assert.equal((await pending).results[0].price_diamonds, 12)
  const failed = api.getGiftCatalog()
  request.success({ statusCode: 404, data: {} })
  await assert.rejects(failed)
  assert.deepEqual(await api.getGiftCapabilities(), { purchase_enabled: false, inventory_send_enabled: false })
  assert.throws(() => api.parseGiftCatalog({ results: [{ code: 'x', name: 'X', image_url: '', price_diamonds: 1.2, description: '' }], count: 1, next: null, previous: null }))
})
