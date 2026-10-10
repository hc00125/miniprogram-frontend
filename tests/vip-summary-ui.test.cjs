const test = require('node:test'), assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vue = require('vue')
const { parse } = require('@vue/compiler-sfc'), { renderToString } = require('@vue/server-renderer')
const { harness, nodes } = require('./commerce-sfc-harness.cjs')
const root = path.join(__dirname, '..'), tick = () => new Promise(setImmediate)
const tier = (name = '黄金', badge_color = 'gold') => ({ id: 3, code: badge_color, name, min_consumption: '500.00', min_growth_diamonds: 5000, benefits: ['专属等级徽章', '真实接口权益'], feature_codes: [], badge_color })
const profile = (extra = {}) => ({
  id: 7, nickname: '真实资料测试', player_status: 'none', cumulative_consumption_diamonds: 99999,
  vip: { cumulative_consumption: '800.02', growth_diamonds: 8000.2, current_tier: tier(), next_tier: tier('钻石', 'diamond'), remaining_to_next: '1199.98', remaining_growth_diamonds: 11999.8, progress_percent: 40 }, ...extra
})
function card(props) {
  const calls = [], h = harness({ '@/utils/nav': { go: (...args) => calls.push(args) } })
  const C = h.load('src/components/VipSummaryCard.vue').default, scope = vue.effectScope()
  const draw = scope.run(() => C.setup(props, { expose() {} }))
  const tree = () => nodes(draw({}, [])), text = () => tree().filter(n => typeof n.children === 'string').map(n => n.children).join('|')
  return { C, calls, scope, tree, text, action: id => tree().find(n => n.props?.['data-action'] === id) }
}
function page(options = {}) {
  const calls = [], unmount = []
  let h
  const mocks = {
    vue: { ...vue, onUnmounted: f => unmount.push(f) },
    '@/api/player': {}, '@/api/client': {},
    '@/api/wallet': { getWalletOverview: async () => { calls.push(['wallet-read']); return options.walletRead ? options.walletRead() : { balance_diamonds: options.balance ?? 321.5 } } },
    '@/utils/client': {
      getClientProfile: () => options.cached ?? h.storage.client_profile,
      syncClientProfile: async () => { calls.push(['profile-read']); return options.profileRead ? options.profileRead() : options.profile ?? profile() },
      normalizeAvatarUrl: value => value || '', setPlayerOnlineStatus() {}, saveClientProfile() {}, shouldUploadAvatarUrl: () => false
    },
    '@/utils/storage': { getStorage: key => h.storage[key], clearPlayerAuth() {} },
    '@/utils/sessionExpiry': { SESSION_EXPIRED_EVENT: 'session:expired' },
    '@/utils/nav': { go: (...args) => calls.push(args), goMain: (...args) => calls.push(['tab', ...args]), replace: (...args) => calls.push(['replace', ...args]) },
    '@/utils/feedback': { toast: message => calls.push(['toast', message]), success: message => calls.push(['success', message]), getErrorMessage: (error, fallback) => error.message || fallback },
    '@/utils/accountRestriction': { getAccountRestrictionView: () => ({ restricted: false, status: 'active' }) },
    '@/utils/uiIcons': { uiIcons: {} },
    '@/components/MainBottomTabs.vue': { default: { render: () => null } },
    '@/components/ThemePicker.vue': { default: { render: () => null } }
  }
  h = harness(mocks)
  h.storage.token = options.guest ? '' : 'vip-profile-fixture-session'
  h.storage.client_profile = options.cached ?? null
  const C = h.load(options.file || 'src/pages/client/profile/index.vue').default, scope = vue.effectScope()
  const draw = scope.run(() => C.setup({}, { expose() {} }))
  const vnode = () => draw({}, []), tree = () => nodes(vnode())
  async function html() {
    const app = vue.createSSRApp({ render: vnode })
    app.config.globalProperties.$appThemeStyle = ''
    return renderToString(app)
  }
  return { h, calls, scope, tree, vnode, html, show: async () => { for (const f of h.hooks.show) await f(); await tick() }, dispose: () => { unmount.forEach(f => f()); scope.stop() } }
}

test('VIP summary uses actual profile growth, tier, remaining growth and benefits, and retains the growth-records route', () => {
  const c = card({ profile: profile() })
  assert.match(c.text(), /黄金/); assert.match(c.text(), /8,000\.2/); assert.match(c.text(), /11,999\.8/)
  assert.match(c.text(), /钻石/); assert.match(c.text(), /真实接口权益/); assert.doesNotMatch(c.text(), /99,999/)
  assert.match(c.tree()[0].props.class, /vip-card--gold/)
  const action = c.action('growth-records'), event = { stopped: false, stopPropagation() { this.stopped = true } }
  action.props.onTap(event)
  assert.equal(event.stopped, true); assert.deepEqual(c.calls, [['/pages/client/growth-records/index']])
  c.scope.stop()
})

test('VIP summary falls back to cumulative growth when no VIP snapshot exists and treats an explicit zero growth as zero', () => {
  for (const [value, amount] of [
    [profile({ vip: null, cumulative_consumption_diamonds: 2468.1 }), '2,468.1'],
    [profile({ vip: { ...profile().vip, growth_diamonds: 0 }, cumulative_consumption_diamonds: 2468.1 }), '0']
  ]) {
    const c = card({ profile: value })
    const spend = c.tree().find(n => n.props?.class === 'vip-spend')
    assert.equal(nodes(spend).filter(n => typeof n.children === 'string').map(n => n.children).join(''), `成长钻石 💎${amount}`)
    if (!value.vip) { assert.match(c.text(), /鼠鼠/); assert.match(c.tree()[0].props.class, /vip-card--mouse/) }
    c.scope.stop()
  }
})

test('VIP summary clamps progress to the track and handles the highest tier without inventing a next level', () => {
  for (const [percent, expected] of [[-30, 0], [145, 100], [40, 40]]) {
    const c = card({ profile: profile({ vip: { ...profile().vip, progress_percent: percent } }) })
    assert.equal(c.tree().find(n => n.props?.class === 'vip-progress-bar').props.style.width, `${expected}%`)
    c.scope.stop()
  }
  const c = card({ profile: profile({ vip: { ...profile().vip, current_tier: tier('至尊', 'supreme'), next_tier: null, progress_percent: 100 } }) })
  assert.match(c.text(), /已达到当前最高头衔/); assert.doesNotMatch(c.text(), /距离/)
  assert.match(c.tree()[0].props.class, /vip-card--supreme/)
  c.scope.stop()
})

test('VIP summary reacts to profile changes and preserves separate gold, diamond and supreme level colors', () => {
  const props = vue.reactive({ profile: profile() }), c = card(props)
  const styles = parse(fs.readFileSync(path.join(root, 'src/components/VipSummaryCard.vue'), 'utf8')).descriptor.styles.map(s => s.content).join('\n')
  const backgrounds = []
  for (const [name, color, growth] of [['黄金', 'gold', 8000.2], ['钻石', 'diamond', 22000], ['至尊', 'supreme', 300000]]) {
    props.profile = profile({ vip: { ...profile().vip, current_tier: tier(name, color), growth_diamonds: growth } })
    assert.match(c.text(), new RegExp(name)); assert.match(c.tree()[0].props.class, new RegExp(`vip-card--${color}`))
    backgrounds.push(styles.match(new RegExp(`\\.vip-card--${color}\\s*\\{[^}]*background:\\s*([^;]+)`))[1])
  }
  assert.equal(new Set(backgrounds).size, 3)
  assert.match(c.text(), /300,000/); assert.doesNotMatch(c.text(), /8,000\.2/)
  c.scope.stop()
})

test('my page renders the actual VIP summary immediately below the wallet while spendable balance and growth stay distinct', async () => {
  const p = page()
  await p.show()
  const html = await p.html(), children = p.vnode().children.filter(n => typeof n.type === 'string' || typeof n.type === 'object')
  const walletIndex = children.findIndex(n => typeof n.props?.class === 'string' && n.props.class.includes('wallet-entry-card'))
  assert.ok(walletIndex >= 0)
  assert.equal(children[walletIndex + 1].type.props.profile.required, true)
  assert.equal(children[walletIndex + 1].props.profile.id, 7)
  assert.ok(html.indexOf('wallet-entry-card') < html.indexOf('data-section="vip-summary"'))
  assert.match(html, /可用钻石/); assert.match(html, /321\.5/); assert.match(html, /8,000\.2/); assert.match(html, /黄金/)
  assert.deepEqual(p.calls.filter(c => c[0].endsWith('-read')), [['profile-read'], ['wallet-read']])
  p.dispose()
})

test('guest and pending profile loads expose neither cached VIP identity nor a fabricated zero growth card', async () => {
  const guest = page({ guest: true, cached: profile() })
  await guest.show()
  const html = await guest.html()
  assert.match(html, /游客模式/); assert.doesNotMatch(html, /vip-summary|8,000\.2|真实资料测试/)
  assert.equal(guest.calls.length, 0); guest.dispose()
  let resolveProfile
  const loading = page({ profileRead: () => new Promise(resolve => { resolveProfile = resolve }) })
  const pending = loading.show()
  await tick(); assert.doesNotMatch(await loading.html(), /vip-summary|成长钻石/)
  resolveProfile(profile()); await pending
  assert.match(await loading.html(), /vip-summary/); loading.dispose()
})

test('my page refresh replaces the VIP snapshot and expiry removes both growth and wallet identity until a new login', async () => {
  let current = profile(), balance = 321.5
  const p = page({ profileRead: () => current, walletRead: () => ({ balance_diamonds: balance }) })
  await p.show()
  current = profile({ nickname: '更新资料', vip: { ...profile().vip, current_tier: tier('钻石', 'diamond'), growth_diamonds: 22000 } }); balance = 17
  await p.show()
  let html = await p.html()
  assert.match(html, /更新资料/); assert.match(html, /22,000/); assert.doesNotMatch(html, /8,000\.2|321\.5/)
  p.h.events['session:expired']('admin_token')
  assert.match(await p.html(), /22,000/)
  delete p.h.storage.token
  p.h.events['session:expired']('token')
  html = await p.html()
  assert.match(html, /游客模式/); assert.doesNotMatch(html, /vip-summary|22,000|更新资料/)
  assert.ok(p.h.events['session:expired'])
  p.dispose(); assert.equal(p.h.events['session:expired'], undefined)
})

test('account retains the real exclusive KOOK room details without duplicating the moved VIP summary', async () => {
  const snapshot = profile({ vip: { ...profile().vip, private_kook_room: { status: 'active', room_number: '24680' } } })
  const p = page({ file: 'src/pages/client/account/index.vue', profile: snapshot, cached: snapshot })
  await p.show()
  const html = await p.html()
  assert.match(html, /专属KOOK房间/); assert.match(html, /24680/); assert.match(html, /已配置/)
  assert.doesNotMatch(html, /vip-summary|vip-spend|累计钻石记录/)
  p.dispose()
})
