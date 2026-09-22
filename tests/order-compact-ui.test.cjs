const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { parse } = require('@vue/compiler-sfc')
const { baseParse } = require('@vue/compiler-dom')
const root = path.join(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'src/pages/boss/query/index.vue'), 'utf8')
const descriptor = parse(source).descriptor
const css = fs.readFileSync(path.join(root, 'src/pages/boss/query/index.scss'), 'utf8')
const ast = baseParse(descriptor.template.content)
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('vue')
function page() {
  const calls = []
  let token = 'test-token'
  const mocks = {
    vue,
    '@dcloudio/uni-app': { onShow() {} },
    '@/components/MainBottomTabs.vue': {},
    '@/api/boss': { getMyBossOrders: async () => [] },
    '@/utils/diamonds': { diamondsFrom: (diamonds, fallback) => Number(diamonds ?? fallback), formatDiamonds: String },
    '@/utils/format': { formatDateTime: value => value },
    '@/utils/feedback': { success() {}, toast() {}, getErrorMessage: String },
    '@/utils/nav': { go: (...args) => calls.push(args), relaunch: (...args) => calls.push(args), navigateToTab: value => calls.push(value) },
    '@/utils/storage': { getStorage: () => token },
    '@/utils/shopCart': { getShopCartCount: async () => 0 }
  }
  const names = 'activeTab, cartCount, isLoggedIn, orders, loaded, refreshing, payCount, readyCount, runningCount, cartSummaryText, tabs, filteredOrders, orderCover, coverStatusKey, actionText, stageHint, orderDisplayDiamonds, renewalPaidDiamonds, diamond, formatOrderTime, openOrder, openCart, handleManualRefresh, handleMainTabSelect, goMain'
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(descriptor.scriptSetup.content + '\nmodule.exports = { ' + names + ' }', { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports, require: name => mocks[name] })
  return { state: module.exports, calls, logout: () => { token = '' } }
}

// Regression coverage executes original handlers; layout assertions above are not device tests.
test('all existing status actions, cart login guard, renewal amount and tab filtering remain intact', () => {
  const { state: p, calls, logout } = page()
  const cases = [
    ['待接单', 'waiting', '查看接单'], ['待支付', 'payment', '去支付'],
    ['待开打', 'in-progress', '等待开打'], ['进行中', 'in-progress', '服务进度'],
    ['已完成', 'payment', '查看详情'], ['已取消', 'payment', '查看订单']
  ]
  for (const [status, route, label] of cases) {
    p.openOrder({ order_no: 'fixture-order', status })
    assert.equal(calls.at(-1)[0], '/pages/boss/' + route + '/index')
    assert.equal(calls.at(-1)[1].orderNo, 'fixture-order')
    assert.equal(p.actionText(status), label)
  }
  p.openCart(); assert.equal(calls.at(-1)[0], '/pages/shop/cart/index')
  logout(); p.openCart(); assert.equal(calls.at(-1)[0], '/pages/client/login/index')
  p.goMain('order'); assert.equal(calls.at(-1)[0], '/pages/boss/home/index'); assert.equal(calls.at(-1)[1].tab, 'order')
  p.orders.value = cases.map(([status]) => ({ status }))
  p.activeTab.value = '待支付'; assert.equal(p.filteredOrders.value.length, 1)
  p.activeTab.value = 'all'; assert.equal(p.filteredOrders.value.length, 6)
  assert.equal(p.orderDisplayDiamonds({ total_amount_diamonds: 150, renewal_paid_amount_diamonds: 30 }), 180)
})

test('real template renders empty/full cart and logged-out states without dropping controls', async () => {
  const { compile } = require('@vue/compiler-dom')
  const { renderToString } = require('@vue/server-renderer')
  const render = new Function('Vue', compile(descriptor.template.content, { mode: 'function', prefixIdentifiers: true, isCustomElement: tag => ['view', 'text', 'image', 'scroll-view'].includes(tag) }).code)(vue)
  for (const [loggedIn, count, label] of [[true, 0, '购物车为空'], [true, 3, '去结算'], [false, 0, '去登录']]) {
    const { state } = page()
    state.isLoggedIn.value = loggedIn; state.cartCount.value = count; state.loaded.value = true
    const app = vue.createSSRApp({ setup: () => state, render })
    app.component('MainBottomTabs', { render: () => null })
    const html = await renderToString(app)
    assert.ok(html.includes(label))
    assert.equal(html.includes('cart-entry-card--compact'), count === 0)
    assert.equal(html.includes('cart-entry-sub'), count > 0)
    assert.ok(html.includes('refresh-btn'))
    assert.ok(html.includes(loggedIn ? '暂无点单记录' : '请先微信登录'))
  }
})
function nodes(node) { return [node, ...(node.children || []).flatMap(nodes)] }
function hasClass(node, name) { return node.props?.some(p => p.name === 'class' && p.value?.content.split(' ').includes(name)) }
function element(name, tree = ast) { return nodes(tree).find(n => hasClass(n, name)) }
function block(name) { return css.match(new RegExp('\\.' + name + ' \\{([^}]+)\\}'))?.[1] || '' }
function tap(node) { return node.props?.find(p => p.type === 7 && p.name === 'on' && p.arg?.content === 'tap') }

test('header is compact and empty cart remains discoverable without a large promo block', () => {
  assert.ok(!element('hero-eyebrow'), 'remove duplicate English heading')
  assert.ok(!element('hero-sub'), 'remove repeated order explanation')
  assert.match(block('query-hero'), /padding: 16rpx 24rpx/)
  assert.doesNotMatch(block('query-hero'), /min-height: 200rpx/)
  const cart = element('cart-entry-card')
  assert.ok(cart.props.some(p => p.name === 'bind' && p.arg?.content === 'class' && p.exp.content.includes('cartCount === 0')))
  assert.equal(tap(cart).exp.content, 'openCart')
  assert.equal(tap(element('cart-entry-btn')).exp.content, 'openCart')
  assert.match(block('cart-entry-card--compact'), /padding: 10rpx 20rpx/)
  assert.match(descriptor.template.content, /购物车为空/)
  const refresh = element('refresh-btn')
  assert.equal(tap(refresh).exp.content, 'handleManualRefresh')
  for (const name of ['loading', 'disabled']) assert.ok(refresh.props.some(p => p.name === 'bind' && p.arg?.content === name && p.exp.content === 'refreshing'))
})

test('order tab renders a small left cover, readable package/spec title and right status with amount', () => {
  const pages = JSON.parse(fs.readFileSync(path.join(root, 'src/pages.json'), 'utf8'))
  assert.equal(pages.tabBar.list.find(t => t.text === '订单').pagePath, 'pages/boss/query/index')
  const head = element('order-head')
  assert.ok(element('order-cover', head), 'thumbnail belongs in horizontal product row, not a banner')
  assert.ok(element('order-title', head), 'existing package_name (including its spec text) stays visible')
  assert.ok(element('cover-status', element('order-amount', head)), 'status belongs in top-right amount column')
  assert.match(block('order-cover'), /width: 112rpx/)
  assert.match(block('order-cover'), /height: 112rpx/)
  assert.match(block('order-cover'), /flex-shrink: 0/)
  assert.doesNotMatch(block('cover-status'), /position: absolute/)
  assert.match(block('order-title'), /overflow-wrap: anywhere/)
  const body = element('order-body')
  const children = body.children.filter(n => n.type === 1)
  assert.ok(hasClass(children.at(-1), 'order-actions'), 'all actions stay at the card bottom')
  assert.ok(element('order-no', element('order-meta')), 'order number is secondary metadata below product')
  assert.match(block('order-no'), /font-size: 20rpx/)
  const buttons = nodes(element('order-actions')).filter(n => n.tag === 'button')
  assert.equal(buttons.length, 2)
  assert.deepEqual(buttons.map(b => tap(b).exp.content), ["goMain('order')", 'openOrder(order)'])
  assert.ok(buttons.every(b => tap(b).modifiers.includes('stop')))
  assert.match(descriptor.template.content, /actionText\(order.status\)/)
  assert.match(descriptor.template.content, /diamond\(orderDisplayDiamonds\(order\)\)/)
  assert.match(descriptor.template.content, /renewalPaidDiamonds\(order\) > 0/)
})
