// Resolve the shipped profile page's actual WXML keys against its compiled JS.
// Storage/session data is isolated; only API, navigation and native platform calls are mocked.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const assert = require('node:assert/strict'), vue = require('vue')
const { baseParse } = require('@vue/compiler-dom')
const root = path.join(__dirname, '../dist/build/mp-weixin')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
const pagePath = 'pages/client/profile/index', vipPath = 'components/VipSummaryCard'
const pageXml = read(pagePath + '.wxml'), vipXml = read(vipPath + '.wxml')
const all = node => [node, ...(node.children || []).flatMap(all)]
const attr = (node, name) => node.props?.find(p => p.name === name)?.value?.content
const hasClass = (node, name) => (attr(node, 'class') || '').split(' ').includes(name)
const one = (tree, predicate, message) => { const node = all(tree).find(predicate); assert.ok(node, message); return node }
const field = (value, label) => { const match = value?.match(/^{{(\w+)}}$/); assert.ok(match, label); return match[1] }
const textField = node => { const child = node.children?.find(n => n.type === 5); assert.ok(child, 'dynamic native text'); return field(`{{${child.content.content}}}`, 'text binding') }
const pageTree = baseParse(pageXml), vipTree = baseParse(vipXml)
const guest = one(pageTree, n => hasClass(n, 'guest-card'), 'guest card')
const wallet = one(pageTree, n => hasClass(n, 'wallet-entry-card'), 'wallet card')
const vip = one(pageTree, n => n.tag === 'vip-summary-card', 'VIP component')
const grid = one(pageTree, n => hasClass(n, 'quick-grid'), 'quick entries')
const quick = grid.children.filter(n => hasClass(n, 'quick-item'))
assert.equal(quick.length, 4)
const status = one(quick[2], n => hasClass(n, 'quick-status'), 'grab status')
const fourthTitle = one(quick[3], n => hasClass(n, 'quick-title'), 'player-center title')
const walletValue = one(wallet, n => n.tag === 'text' && n.children?.some(c => c.type === 5), 'wallet amount')
const fields = {
  guest: field(attr(guest, 'wx:if'), 'guest condition'), wallet: field(attr(wallet, 'wx:if'), 'wallet condition'),
  vip: field(attr(vip, 'wx:if'), 'VIP condition'), vipProps: field(attr(vip, 'u-p'), 'VIP props'),
  status: field(attr(status, 'wx:if'), 'grab-status condition'), statusText: textField(status),
  title: textField(fourthTitle), walletValue: textField(walletValue),
  grabIcon: field(attr(one(quick[2], n => n.tag === 'image', 'grab icon'), 'src'), 'grab icon binding'),
  centerIcon: field(attr(one(quick[3], n => n.tag === 'image', 'player-center icon'), 'src'), 'center icon binding'),
  grabAction: field(attr(quick[2], 'bindtap'), 'grab navigation'), centerAction: field(attr(quick[3], 'bindtap'), 'player-center navigation')
}
const vipSpend = one(vipTree, n => hasClass(n, 'vip-spend'), 'growth amount')
const vipSpendField = textField(vipSpend)
const record = one(vipTree, n => attr(n, 'data-action') === 'growth-records', 'growth record action')
const recordField = field(attr(record, 'catchtap'), 'growth record navigation')
assert.ok(JSON.parse(read(pagePath + '.json')).usingComponents['vip-summary-card'])

const storage = new Map(), calls = [], show = [], unmount = [], events = new Map(), components = {}, cache = {}
const snapshot = {
  id: 7, nickname: '编译检查老板', player_status: 'approved', account_status: 'active',
  cumulative_consumption_diamonds: 50,
  vip: { cumulative_consumption: '1010030.00', growth_diamonds: 10100300,
    current_tier: { name: '至臻鼠鼠', badge_color: 'supreme', benefits: ['专属KOOK房间'], feature_codes: [], min_consumption: '0.00' },
    next_tier: null, remaining_to_next: '0.00', remaining_growth_diamonds: 0, progress_percent: 100 },
  player: { id: 99, name: '编译检查陪玩', type_name: '技术陪', is_online: false, presence_online: true,
    can_accept_orders: true, total_orders: 7, avg_rating: 5, rating_count: 1 }
}
const platform = {
  getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, structuredClone(value)), removeStorageSync: key => storage.delete(key),
  $on: (name, fn) => { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(fn) },
  $off: (name, fn) => events.get(name)?.delete(fn), $emit: (name, ...args) => events.get(name)?.forEach(fn => fn(...args)),
  showToast: options => calls.push(['toast', options.title])
}
const vendor = { ...vue, index: platform, onShow: fn => show.push(fn), onUnmounted: fn => unmount.push(fn),
  _export_sfc: value => value, e: Object.assign, t: String, n: value => value, s: value => value || '',
  o: value => value, p: value => value, f: (items, fn) => items.map(fn) }
const api = {
  'api/client.js': { getClientProfileApi: async () => { calls.push(['profile-read']); return structuredClone(snapshot) } },
  'api/wallet.js': { getWalletOverview: async () => { calls.push(['wallet-read']); return { balance_diamonds: 123.5 } } },
  'api/player.js': { updatePlayerOnlineStatus: async () => { throw Error('unexpected online mutation') } }
}
let Page
function load(name) {
  if (name === 'common/vendor.js') return vendor
  if (name === 'utils/nav.js') return { go: (...args) => calls.push(args), goMain: (...args) => calls.push(['tab', ...args]) }
  if (api[name]) return api[name]
  if (cache[name]) return cache[name]
  const exports = {}; cache[name] = exports
  vm.runInNewContext(read(name), { exports, console, setTimeout, clearTimeout, getCurrentPages: () => [],
    require: other => load(path.posix.normalize(path.posix.join(path.posix.dirname(name), other))),
    wx: { createPage: value => Page = value, createComponent: value => components[name] = value } }, { filename: name })
  return exports
}
load(pagePath + '.js'); load(vipPath + '.js')
const scope = vue.effectScope(), render = scope.run(() => Page.setup({}, { expose() {} }))
const draw = () => render({ $appThemeStyle: '--ui-text:#243E5D' }, {})
const tick = () => new Promise(setImmediate)
const showPage = async () => { for (const fn of show) await fn(); await tick() }
function assertVisibleText(value, expected) {
  assert.equal(typeof value, 'string', 'native text must bind a string')
  assert.equal(value, expected)
  assert.doesNotMatch(value, /\/icons\/|^(true|false)$/)
}
function assertGuest(data) {
  assert.equal(Boolean(data[fields.guest]), true)
  assert.equal(Boolean(data[fields.wallet]), false)
  assert.equal(Boolean(data[fields.vip]), false)
  assert.equal(data[fields.vipProps], undefined)
  assert.equal(Boolean(data[fields.status]), false)
  assertVisibleText(data[fields.title], '登录后申请')
  assert.equal(data[fields.grabIcon], '/icons/themes/mist/grab.png')
  assert.equal(data[fields.centerIcon], '/icons/themes/mist/apply.png')
}
async function main() {
  try {
    await showPage(); assertGuest(draw())
    assert.ok(!calls.some(c => c[0] === 'profile-read' || c[0] === 'wallet-read'), 'guests make no profile/wallet reads')
    storage.set('token', 'isolated-profile-fixture-session')
    await showPage()
    let data = draw()
    assert.equal(Boolean(data[fields.guest]), false)
    assert.equal(Boolean(data[fields.wallet]), true)
    assert.equal(Boolean(data[fields.vip]), true)
    assertVisibleText(data[fields.walletValue], '123.5')
    assert.equal(data[fields.vipProps].profile.id, 7)
    assert.equal(data[fields.vipProps].profile.vip.growth_diamonds, 10100300)
    assert.equal(Boolean(data[fields.status]), false)
    assertVisibleText(data[fields.title], '我的接单与评价')
    assert.equal(data[fields.grabIcon], '/icons/themes/mist/grab.png')
    assert.equal(data[fields.centerIcon], '/icons/themes/mist/reviews.png')
    assert.equal(calls.filter(c => c[0] === 'profile-read').length, 1)
    assert.equal(calls.filter(c => c[0] === 'wallet-read').length, 1)
    data[fields.grabAction](); data[fields.centerAction]()
    assert.equal(JSON.stringify(calls.slice(-2)), JSON.stringify([['/pages/player/grab/index'], ['/pages/player/my-orders/index']]))
    const vipProps = vue.reactive(data[fields.vipProps])
    const vipRender = scope.run(() => components[vipPath + '.js'].setup(vipProps, { expose() {} }))
    const vipData = vipRender({}, {})
    assertVisibleText(vipData[vipSpendField], '10,100,300')
    assert.equal(vipSpend.children.map(node => node.type === 2 ? node.content : node.type === 5 ? vipData[node.content.content] : '').join(''), '成长钻石 💎10,100,300')
    vipData[recordField]()
    assert.equal(JSON.stringify(calls.at(-1)), JSON.stringify(['/pages/client/growth-records/index']))
    snapshot.player.can_accept_orders = false
    await showPage(); data = draw()
    assert.equal(Boolean(data[fields.status]), true)
    assertVisibleText(data[fields.statusText], '接单已暂停')
    assertVisibleText(data[fields.title], '我的接单与评价')
    storage.delete('token'); platform.$emit(load('utils/sessionExpiry.js').SESSION_EXPIRED_EVENT, 'token')
    assertGuest(draw())
    const priorReads = calls.filter(c => c[0] === 'profile-read' || c[0] === 'wallet-read').length
    await showPage(); assertGuest(draw())
    assert.equal(calls.filter(c => c[0] === 'profile-read' || c[0] === 'wallet-read').length, priorReads)
    console.log('PASS shipped profile JS + matching WXML: guest/login/expiry gates, VIP props, separate wallet/growth, quick-entry text/icons/status/navigation and growth-record target. Only isolated fixture sessions; no live requests or window actions.')
  } finally { unmount.forEach(fn => fn()); scope.stop() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
