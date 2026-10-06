const { test } = require('node:test'), assert = require('node:assert/strict'), vue = require('vue')
const { harness, nodes } = require('./commerce-sfc-harness.cjs')
const cap = { catalog_read: true, purchase_enabled: true, purchase_supported: true, quote_supported: true }
function mount(read = async () => cap) {
  const requests = [], navigation = [], notices = []
  const h = harness({ '@/api/giftCommerce': { readGiftCapabilities: id => { requests.push(id); return read(id) } } })
  Object.assign(h.uni, { navigateTo: o => navigation.push(o.url), showToast: o => notices.push(o.title) })
  const C = h.load('src/components/gifts/GiftHost.vue').default, scope = vue.effectScope()
  const props = vue.reactive({ recipientId: 12, recipientName: '甲', compact: true, persistentEntry: true })
  const draw = scope.run(() => C.setup(props, { expose() {} })), tree = () => nodes(draw(props, []))
  return { ...h, props, scope, tree, requests, navigation, notices, button: () => tree().find(n => n.props?.['data-action'] === 'open-gift'), tap: () => tree().find(n => n.props?.['data-action'] === 'open-gift').props.onTap({ stopPropagation() {} }) }
}
test('persistent card entry stays visible for guests; login occurs only on tap, without capability calls', async () => {
  const h = mount(); delete h.storage.token; delete h.storage.client_profile
  try {
    for (const f of [...h.hooks.show, ...h.hooks.mounted]) await f()
    assert.equal(h.button().children, '送礼物'); assert.deepEqual(h.requests, [])
    await h.tap(); assert.deepEqual(h.navigation, ['/pages/client/login/index']); assert.deepEqual(h.requests, [])
    assert.ok(!h.tree().some(n => n.props?.recipient)); h.hooks.hide[0](); assert.equal(h.button(), undefined)
  } finally { h.scope.stop() }
})
test('persistent entry checks only the tapped recipient; capability failure retains retry and cannot open sheet', async () => {
  let fail = true; const h = mount(async () => { if (fail) throw new Error('offline'); return cap })
  try {
    for (const f of [...h.hooks.show, ...h.hooks.mounted]) await f()
    assert.deepEqual(h.requests, [])
    await h.tap(); assert.equal(h.button().children, '送礼物'); assert.deepEqual(h.notices, ['礼物暂不可用，请稍后重试'])
    assert.ok(!h.tree().some(n => n.props?.recipient))
    fail = false; await h.tap(); assert.deepEqual(h.requests, [12, 12]); assert.ok(h.tree().some(n => n.props?.recipient?.id === '12'))
  } finally { h.scope.stop() }
})
test('persistent entry retains read-only capability gates', async () => {
  const h = mount(async () => ({ ...cap, purchase_enabled: false }))
  try { await h.tap(); assert.equal(h.button().children, '查看礼物'); assert.ok(h.tree().some(n => n.props?.recipient?.id === '12')) } finally { h.scope.stop() }
})
for (const action of ['hide', 'recipient', 'session']) test(`pending persistent entry discards response after ${action}`, async () => {
  let finish; const h = mount(() => new Promise(resolve => { finish = resolve }))
  try {
    const pending = h.tap(); assert.equal(h.button().props.disabled, true)
    await h.tap(); assert.deepEqual(h.requests, [12])
    if (action === 'hide') h.hooks.hide[0]()
    if (action === 'recipient') h.props.recipientId = 34
    if (action === 'session') h.storage.token = 'new-session'
    finish(cap); await pending
    assert.ok(!h.tree().some(n => n.props?.recipient)); assert.deepEqual(h.notices, [])
  } finally { h.scope.stop() }
})
