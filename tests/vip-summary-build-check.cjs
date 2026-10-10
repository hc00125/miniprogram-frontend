// Exercise the shipped VIP component and verify its native profile-page mount.
// Only navigation is mocked; diamond formatting and the compiled render are real.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const assert = require('node:assert/strict'), vue = require('vue')
const root = path.join(__dirname, '../dist/build/mp-weixin')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
const card = 'components/VipSummaryCard', profile = 'pages/client/profile/index', account = 'pages/client/account/index'
for (const ext of ['js', 'json', 'wxml', 'wxss']) assert.ok(fs.statSync(path.join(root, `${card}.${ext}`)).size)
const xml = read(card + '.wxml'), profileXml = read(profile + '.wxml'), accountXml = read(account + '.wxml')
assert.ok(JSON.parse(read(profile + '.json')).usingComponents['vip-summary-card'], 'profile must register the shipped card')
assert.ok(!JSON.parse(read(account + '.json')).usingComponents?.['vip-summary-card'], 'account must not mount a duplicate VIP summary')
const mount = profileXml.match(/<vip-summary-card\b[^>]*>/)?.[0]
assert.ok(mount && /wx:if=/.test(mount) && /u-p=/.test(mount), 'native card needs its authenticated profile gate and prop binding')
assert.ok(profileXml.indexOf('wallet-entry-card') < profileXml.indexOf(mount), 'VIP must follow the diamond wallet')
assert.ok(profileXml.indexOf(mount) < profileXml.indexOf('guest-card'), 'VIP must be the section directly after the wallet, before guest/player sections')
assert.doesNotMatch(accountXml, /data-section="vip-summary"|class="vip-card\b|<vip-summary-card\b/)
assert.match(accountXml, /vip-room-card/)
for (const theme of ['mouse', 'bronze', 'silver', 'gold', 'platinum', 'emerald', 'diamond', 'glory', 'brilliant', 'dream', 'elegant', 'supreme']) {
  assert.ok(read(card + '.wxss').includes(`vip-card--${theme}`), `shipped VIP palette must retain ${theme}`)
}
const action = xml.match(/<view\b[^>]*data-action="growth-records"[^>]*>/)?.[0]
assert.ok(action, 'growth records needs a native action')
const actionKey = action.match(/(?:catch|bind)tap="{{(\w+)}}"/)?.[1]
assert.ok(actionKey, 'growth-records must bind a compiled event')
const progressTag = xml.match(/<view\b[^>]*class="vip-progress-bar[^>]*>/)?.[0]
const progressKey = progressTag?.match(/style="{{'width:' \+ (\w+)}}"/)?.[1]
assert.ok(progressKey, 'native progress bar needs the actual progress style')

const calls = [], cache = {}
const vendor = { ...vue, s: value => value || '', e: Object.assign, t: String, n: value => value,
  o: value => value, p: value => value, f: (items, fn) => items.map(fn), _export_sfc: value => value }
let Component
function load(name) {
  if (name === 'common/vendor.js') return vendor
  if (name === 'utils/nav.js') return { go: (...args) => calls.push(args) }
  if (cache[name]) return cache[name]
  const exports = {}; cache[name] = exports
  vm.runInNewContext(read(name), { exports, console,
    require: other => load(path.posix.normalize(path.posix.join(path.posix.dirname(name), other))),
    wx: { createComponent: value => Component = value } }, { filename: name })
  return exports
}
load(card + '.js')
const props = vue.reactive({ profile: { nickname: '测试老板', player_status: 'none', cumulative_consumption_diamonds: 50,
  vip: { growth_diamonds: 10100300, current_tier: { name: '至臻鼠鼠', badge_color: 'supreme', benefits: ['至臻鼠鼠专属头衔', '专属KOOK房间'] },
    progress_percent: 100, remaining_growth_diamonds: 0, next_tier: null } } })
const scope = vue.effectScope()
try {
  const render = scope.run(() => Component.setup(props, { expose() {} }))
  const draw = () => render({}, {}), text = () => JSON.stringify(draw(), (_, value) => typeof value === 'function' ? '[event]' : value)
  assert.match(text(), /至臻鼠鼠/)
  assert.match(text(), /10,100,300/)
  assert.match(text(), /专属KOOK房间/)
  assert.ok(JSON.stringify(draw()[progressKey]).includes('100%'))
  draw()[actionKey]()
  assert.equal(JSON.stringify(calls), JSON.stringify([['/pages/client/growth-records/index']]))
  props.profile = { nickname: '测试老板', player_status: 'none', cumulative_consumption_diamonds: 1234.5,
    vip: { growth_diamonds: 0, current_tier: { name: '鼠鼠', badge_color: 'mouse', benefits: [] },
      progress_percent: -3, remaining_growth_diamonds: 100, next_tier: { name: '青铜鼠鼠' } } }
  assert.ok(!text().includes('1,234.5'), 'explicit zero growth must not fall back to cumulative consumption')
  assert.ok(JSON.stringify(draw()[progressKey]).includes('0%'))
  assert.match(text(), /青铜鼠鼠/)
  props.profile.vip.progress_percent = 130
  assert.ok(JSON.stringify(draw()[progressKey]).includes('100%'), 'progress must remain bounded')
  props.profile = { nickname: '旧资料', player_status: 'none', cumulative_consumption_diamonds: 1234.5 }
  assert.match(text(), /1,234.5/)
  assert.match(text(), /鼠鼠/)
  assert.ok(!text().includes('至臻鼠鼠'), 'replacing profile must replace the old VIP snapshot')
} finally { scope.stop() }
console.log('PASS shipped VIP summary: profile mount after wallet, no duplicate account card, KOOK retained, all palettes, actual growth values/fallback/progress and growth-record navigation. No live requests or window actions.')
