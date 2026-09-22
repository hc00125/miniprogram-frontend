const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('vue')
const { parse } = require('@vue/compiler-sfc')
const { compile } = require('@vue/compiler-dom')
const root = path.join(__dirname, '..')
const descriptor = parse(fs.readFileSync(path.join(root, 'src/pages/boss/query/index.vue'), 'utf8')).descriptor
// The six main Order.STATUS_CHOICES, verified read-only against the backend model.
const statuses = ['待接单', '待支付', '待开打', '进行中', '已完成', '已取消']
function evaluate(source, imports = {}) {
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { module, exports: module.exports, require: name => {
      assert.ok(name in imports, `Unexpected dependency: ${name}`)
      return imports[name]
    } })
  return module.exports
}
function page() {
  let token = 'fixture-token'
  let response = []
  let failure = false
  let onShow
  const calls = []
  const imports = {
    vue,
    '@dcloudio/uni-app': { onShow: callback => { onShow = callback } },
    '@/components/MainBottomTabs.vue': {},
    '@/api/boss': { getMyBossOrders: async () => { if (failure) throw new Error('offline'); return response } },
    '@/utils/diamonds': evaluate(fs.readFileSync(path.join(root, 'src/utils/diamonds.ts'), 'utf8')),
    '@/utils/format': { formatDateTime: value => value },
    '@/utils/feedback': { success() {}, toast() {}, getErrorMessage: String },
    '@/utils/nav': { go: (...args) => calls.push(args), relaunch: (...args) => calls.push(args), navigateToTab: value => calls.push(value) },
    '@/utils/storage': { getStorage: () => token },
    '@/utils/shopCart': { getShopCartCount: async () => 0 }
  }
  const names = 'activeTab, cartCount, isLoggedIn, orders, loaded, refreshing, payCount, readyCount, runningCount, cartSummaryText, tabs, filteredOrders, orderCover, coverStatusKey, actionText, stageHint, orderDisplayDiamonds, renewalPaidDiamonds, diamond, formatOrderTime, openOrder, openCart, handleManualRefresh, refreshCenter, handleMainTabSelect, goMain, go'
  const state = evaluate(descriptor.scriptSetup.content + '\nmodule.exports = { ' + names + ' }', imports)
  return { state, calls, setResponse: value => { response = value }, setFailure: value => { failure = value }, setToken: value => { token = value }, show: () => onShow() }
}
const render = new Function('Vue', compile(descriptor.template.content, {
  mode: 'function', prefixIdentifiers: true, isCustomElement: () => true
}).code)(vue)
function nodes(node) { return node && typeof node === 'object' ? [node, ...(Array.isArray(node.children) ? node.children.flatMap(nodes) : [])] : [] }
function elements(state, className) {
  return nodes(render(vue.proxyRefs(state), [])).filter(node => node.props?.class?.split(' ').includes(className))
}
function text(node) { return Array.isArray(node.children) ? node.children.map(text).join('') : String(node.children ?? '') }

test('each rendered category filters exactly and All preserves the same orders collection', () => {
  const { state: p } = page()
  p.isLoggedIn.value = true
  p.orders.value = statuses.map((status, i) => ({ status, order_no: `order-${i}`, refund_status: 'refunded' }))
  p.orders.value.push({ status: '已退款', order_no: 'refund-only' })
  for (const [index, tab] of elements(p, 'tab').entries()) {
    tab.props.onTap()
    const key = ['all', ...statuses][index]
    if (key === 'all') assert.equal(p.filteredOrders.value, p.orders.value)
    else assert.deepEqual(Array.from(p.filteredOrders.value, order => order.status), [key])
    assert.equal(p.tabs.value[index].count, p.filteredOrders.value.length)
    assert.equal(elements(p, 'order-card').length, p.filteredOrders.value.length)
  }
  assert.deepEqual([p.payCount.value, p.readyCount.value, p.runningCount.value], [1, 1, 1])
})

test('selection survives refresh and onShow while logout retains the existing reset', async () => {
  const { state: p, setResponse, setToken, setFailure, show } = page()
  setResponse([{ status: '已取消', order_no: 'cancelled' }])
  await p.refreshCenter()
  elements(p, 'tab').at(-1).props.onTap()
  setResponse([{ status: '待支付', order_no: 'payment' }])
  await p.handleManualRefresh()
  assert.equal(p.activeTab.value, '已取消')
  assert.equal(p.tabs.value.at(-1).count, 0)
  assert.equal(p.filteredOrders.value.length, 0)
  assert.equal(p.refreshing.value, false)
  setResponse([{ status: '已取消', order_no: 'new-cancelled' }])
  show()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(p.activeTab.value, '已取消')
  assert.equal(p.filteredOrders.value[0].order_no, 'new-cancelled')
  setFailure(true)
  await p.handleManualRefresh()
  assert.equal(p.activeTab.value, '已取消')
  assert.equal(p.filteredOrders.value[0].order_no, 'new-cancelled')
  setToken('')
  await p.refreshCenter()
  assert.equal(p.isLoggedIn.value, false)
  assert.equal(p.activeTab.value, 'all')
  assert.equal(p.orders.value.length, 0)
  assert.equal(p.cartCount.value, 0)
  assert.ok(p.tabs.value.every(tab => tab.count === 0))
  assert.equal(elements(p, 'tabs').length, 0)
  setToken('new-fixture-token'); setFailure(false)
  await p.refreshCenter()
  assert.equal(p.isLoggedIn.value, true)
  assert.equal(p.activeTab.value, 'all')
})

test('real card status, diamond totals and tap routes remain unchanged for every category', () => {
  const { state: p, calls } = page()
  p.isLoggedIn.value = true
  const routes = ['waiting', 'payment', 'in-progress', 'in-progress', 'payment', 'payment']
  const keys = ['pending', 'paying', 'ready', 'running', 'done', 'cancel']
  const labels = ['查看接单', '去支付', '等待开打', '服务进度', '查看详情', '查看订单']
  for (const [i, status] of statuses.entries()) {
    const order = { status, order_no: `order-${i}`, total_amount_diamonds: 150, renewal_paid_amount_diamonds: 30 }
    p.orders.value = [order]
    elements(p, 'tab')[i + 1].props.onTap()
    assert.equal(text(elements(p, 'cover-status')[0]), status)
    assert.ok(elements(p, 'cover-status')[0].props.class.includes(`cover-status--${keys[i]}`))
    assert.equal(text(elements(p, 'amount-value')[0]), '180')
    assert.equal(text(elements(p, 'amount-renewal-note')[0]), '含续单 💎30')
    const card = elements(p, 'order-card')[0]
    card.props.onTap()
    assert.equal(calls.at(-1)[0], `/pages/boss/${routes[i]}/index`)
    assert.equal(calls.at(-1)[1].orderNo, order.order_no)
    const actions = nodes(elements(p, 'order-actions')[0]).filter(node => node.type === 'button')
    let stopped = 0
    actions[1].props.onTap({ stopPropagation: () => stopped++ })
    assert.equal(stopped, 1)
    assert.equal(text(actions[1]), labels[i])
    assert.equal(calls.at(-1)[0], `/pages/boss/${routes[i]}/index`)
    actions[0].props.onTap({ stopPropagation() {} })
    assert.equal(calls.at(-1)[0], '/pages/boss/home/index')
    assert.equal(calls.at(-1)[1].tab, 'order')
  }
  assert.equal(p.orderDisplayDiamonds({ total_amount: '12.35', renewal_paid_amount: '2.00' }), 143.5)
})

test('all category controls wrap visibly without shrinking their hit area or hiding overflow', () => {
  const { state: p } = page()
  p.isLoggedIn.value = true
  assert.equal(elements(p, 'tabs')[0].type, 'view')
  const postcss = require('postcss')
  const css = postcss.parse(fs.readFileSync(path.join(root, 'src/pages/boss/query/index.scss'), 'utf8'))
  const rules = selector => Object.fromEntries(css.nodes.find(rule => rule.selector === selector).nodes.filter(n => n.type === 'decl').map(n => [n.prop, n.value]))
  const container = rules('.tabs'), tab = rules('.tab')
  assert.equal(container.display, 'flex')
  assert.equal(container['flex-wrap'], 'wrap')
  assert.equal(container['white-space'], undefined)
  assert.equal(container.overflow, undefined)
  assert.equal(tab['flex-shrink'], '0')
  assert.ok(parseFloat(tab['min-height']) >= 80)
  assert.ok(parseFloat(tab['font-size']) >= 25)
  assert.equal(tab['white-space'], 'nowrap')
})

test('zero-count categories remain explicit and tappable in the real template', () => {
  const { state: p } = page()
  p.isLoggedIn.value = true
  p.loaded.value = true
  const tabs = elements(p, 'tab')
  assert.equal(tabs.length, 7)
  assert.equal(elements(p, 'tab-count').length, 7)
  for (const [index, tab] of tabs.entries()) {
    assert.equal(text(tab), `${['全部', ...statuses][index]}0`)
    assert.equal(tab.props.disabled, undefined)
    tab.props.onTap()
    assert.equal(p.activeTab.value, ['all', ...statuses][index])
    assert.equal(p.filteredOrders.value.length, 0)
    assert.equal(elements(p, 'active').length, 1)
    assert.equal(elements(p, 'empty-card').length, 1)
  }
})

test('tabs include all six backend main statuses exactly once plus one All, and cancelled counts are strict', () => {
  const { state: p } = page()
  p.orders.value = statuses.flatMap((status, index) => Array.from({ length: index + 1 }, (_, n) => ({ status, order_no: `${index}-${n}` })))
  p.orders.value.push({ status: '已退款', order_no: 'not-a-main-status' }, { status: '已取消 ', order_no: 'not-exact' })
  assert.deepEqual(Array.from(p.tabs.value, tab => tab.key), ['all', ...statuses])
  assert.deepEqual(Array.from(p.tabs.value, tab => tab.label), ['全部', ...statuses])
  assert.equal(p.tabs.value[0].count, p.orders.value.length)
  for (const [index, status] of statuses.entries()) {
    assert.equal(p.tabs.value.find(tab => tab.key === status).count, index + 1)
  }
  p.activeTab.value = '已取消'
  assert.equal(p.filteredOrders.value.length, 6)
  assert.ok(p.filteredOrders.value.every(order => order.status === '已取消'))
})
