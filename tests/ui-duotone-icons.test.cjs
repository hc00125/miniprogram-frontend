const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('vue')
const { parse } = require('@vue/compiler-sfc')
const { compile } = require('@vue/compiler-dom')
const { renderToString } = require('@vue/server-renderer')
const root = path.join(__dirname, '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
const descriptor = () => parse(read('src/pages/client/profile/index.vue')).descriptor
function icons() {
  const filename = 'src/utils/uiIcons.ts'
  assert.ok(fs.existsSync(path.join(root, filename)), 'fixed local icon mapping must exist')
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(read(filename), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports })
  return module.exports.uiIcons
}
function page() {
  const calls = []
  const mocks = {
    vue: { ...vue, onUnmounted() {} },
    '@dcloudio/uni-app': { onShow() {} },
    '@/components/MainBottomTabs.vue': {},
    '@/utils/uiIcons': { uiIcons: fs.existsSync(path.join(root, 'src/utils/uiIcons.ts')) ? icons() : {} },
    '@/api/player': {}, '@/api/wallet': {},
    '@/utils/accountRestriction': { getAccountRestrictionView: () => ({ restricted: false }) },
    '@/utils/client': { normalizeAvatarUrl: x => x },
    '@/utils/diamonds': { formatDiamonds: String },
    '@/utils/feedback': { toast: x => calls.push(['toast', x]) },
    '@/utils/nav': { go: x => calls.push(['go', x]), goMain: x => calls.push(['tab', x]) },
    '@/utils/storage': {}, '@/utils/sessionExpiry': { SESSION_EXPIRED_EVENT: 'expired' }
  }
  const names = 'profile,isLoggedIn,onlineUpdating,refreshing,walletOverview,walletLoadFailed,displayAvatarUrl,displayName,displayInitial,profileIdText,accountRestriction,walletBalance,canAcceptOrders,isPlayerOnline,playerRatingText,statusText,statusClass,playerActionTitle,playerActionSub,playerCenterTitle,playerCenterSub,playerEmptyTitle,playerEmptySub,handleHeroTap,retryWalletOverview,goRecharge,goWallet,openLogin,switchMainTab,togglePlayerOnline,handlePlayerAction,handlePlayerCenterAction,handleManualRefresh,handleService,handleSettings,handleMainTabSelect,go'
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(descriptor().scriptSetup.content + '\nmodule.exports = {' + names + '}', { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports, require: n => mocks[n], uni: { $on() {}, $off() {} } })
  return { state: { ...module.exports, uiIcons: mocks['@/utils/uiIcons'].uiIcons }, calls }
}
test('reference homepage retains approved local pictograms in game, balance and navigation', async () => {
  const { homeHarness } = require('./home-reference-harness.cjs')
  const h = homeHarness({ games: [{ id: 1, name: '实际游戏', icon_url: '', groups: [] }] })
  await h.load(); const html = await h.html()
  for (const name of ['order','diamond-light','chevron']) assert.ok(html.includes('/icons/duotone/' + name + '.png'))
  assert.ok(html.includes('选择游戏') && html.includes('我的钻石'))
  h.scope.stop()
})
test('fixed resources contain real transparent PNGs and original token-colored SVGs; native tab states remain complete', () => {
  const map = icons()
  assert.deepEqual(Object.keys(map).sort(), 'order query grab reviews apply notification terms support feedback settings guest chevron fish shield microphone cart home back clock verification payment diamond diamondLight income incomeRed expense expenseRed refund refundRed adjustment adjustmentRed backfill backfillRed room feedbackLight warningLight'.split(' ').sort())
  const theme = read('src/styles/theme.scss')
  const deep = theme.match(/\$green-deep:\s*(#[0-9a-f]+)/)[1]
  const soft = theme.match(/\$green-soft:\s*(#[0-9a-f]+)/)[1]
  for (const [name, url] of Object.entries(map)) {
    const basename = name.replace(/[A-Z]/g, c => '-' + c.toLowerCase())
    assert.equal(url, '/icons/duotone/' + basename + '.png')
    const png = fs.readFileSync(path.join(root, 'static', url))
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.equal(png.readUInt32BE(16), 96); assert.equal(png.readUInt32BE(20), 96)
    assert.equal(png[25], 6, 'RGBA transparent output')
    const svg = read('design/icons/' + basename + '.svg')
    const red = name.endsWith('Red'), light = ['back','diamondLight','feedbackLight'].includes(name), warning = name === 'warningLight'
    const mono = ['settings','guest','chevron','income','expense','refund','adjustment','backfill'].includes(name)
    const colors = red ? ['#a13d35'] : warning ? ['#fff5f5'] : light ? [soft] : mono ? [deep] : [deep,soft]
    assert.doesNotMatch(svg, /<text|<image|gradient|filter|https?:\/\/(?!www.w3.org)/)
    assert.deepEqual([...new Set(svg.match(/#[0-9a-f]{6}/g))].sort(), colors.sort(), name + ' keeps its approved semantic palette')
  }
  const tabs = JSON.parse(read('src/pages.json')).tabBar.list
  assert.equal(tabs.length, 5)
  for (const tab of tabs) for (const key of ['iconPath', 'selectedIconPath']) assert.ok(fs.existsSync(path.join(root, 'static', tab[key])))
})
test('real profile handlers retain login gates, pending/rejected/paused behavior and all routes', () => {
  const { state: p, calls } = page()
  p.handlePlayerAction(); assert.equal(calls.at(-1)[1], '/pages/client/login/index')
  p.isLoggedIn.value = true
  p.profile.value = { player_status: 'pending' }; p.handlePlayerAction(); assert.equal(calls.at(-1)[0], 'toast')
  p.profile.value = { player_status: 'rejected' }; p.handlePlayerAction(); assert.equal(calls.at(-1)[1], '/pages/player/apply/index')
  p.profile.value = { player_status: 'approved', player: { can_accept_orders: false } }; p.handlePlayerAction(); assert.equal(calls.at(-1)[1], '/pages/client/settings/index')
  p.profile.value.player.can_accept_orders = true; p.handlePlayerAction(); assert.equal(calls.at(-1)[1], '/pages/player/grab/index')
  p.handlePlayerCenterAction(); assert.equal(calls.at(-1)[1], '/pages/player/my-orders/index')
  p.handleService(); assert.equal(calls.at(-1)[1], '/pages/legal/privacy/index')
  p.handleSettings(); assert.equal(calls.at(-1)[1], '/pages/client/settings/index')
  p.switchMainTab('order'); assert.deepEqual(calls.at(-1), ['tab', 'order'])
  const template = descriptor().template.content
  assert.match(template, /v-if="isLoggedIn && profile\?\.player_status === 'approved'" class="list-item" @tap="go\('\/pages\/player\/kook-binding\/index'\)"/)
  assert.match(template, /@tap="go\('\/pages\/client\/customer-service\/index'\)"/)
  assert.match(template, /@tap="go\('\/pages\/client\/complaints\/index'\)"/)
})
async function renderProfile(state) {
  const render = new Function('Vue', compile(descriptor().template.content, { mode: 'function', prefixIdentifiers: true, isCustomElement: t => ['view','text','image'].includes(t) }).code)(vue)
  const app = vue.createSSRApp({ setup: () => state, render })
  app.component('MainBottomTabs', { render: () => null })
  return renderToString(app)
}
test('profile real SFC renders local pictograms across guest, application and approved states', async () => {
  for (const status of ['guest','none','pending','rejected','approved','paused']) {
    const { state } = page()
    const approved = ['approved','paused'].includes(status)
    state.isLoggedIn.value = status !== 'guest'
    state.profile.value = status === 'guest' ? null : { player_status: approved ? 'approved' : status, player: approved ? { can_accept_orders: status !== 'paused' } : null }
    const html = await renderProfile(state)
    assert.ok(html.includes('/icons/duotone/order.png'), 'order pictogram must replace character tile')
    for (const name of ['query','grab','terms','support','feedback','settings']) assert.ok(html.includes('/icons/duotone/' + name + '.png'), name)
    assert.equal(html.includes('/icons/duotone/reviews.png'), approved)
    assert.equal(html.includes('/icons/duotone/apply.png'), !approved)
    assert.equal(html.includes('/icons/duotone/notification.png'), approved)
    assert.equal(html.includes('wallet-entry-card'), status !== 'guest')
    assert.equal(html.includes('接单已暂停') || html.includes('接单权限已暂停'), status === 'paused')
    assert.ok(!/class="(?:quick-icon|list-icon)[^"]*">[点查抢评陪通服客诉设]</.test(html))
    state.walletLoadFailed.value = true
    const failed = await renderProfile(state)
    if (status !== 'guest') assert.ok(failed.includes('加载失败 · 点击重试'))
  }
})
