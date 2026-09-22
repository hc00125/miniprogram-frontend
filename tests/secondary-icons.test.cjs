const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('vue')
const { parse } = require('@vue/compiler-sfc')
const { baseParse, compile } = require('@vue/compiler-dom')
const { renderToString } = require('@vue/server-renderer')
const root = path.join(__dirname, '..')
const read = p => fs.readFileSync(path.join(root, p), 'utf8')
function icons() {
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(read('src/utils/uiIcons.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports })
  return module.exports.uiIcons
}
function fragment(page, cls) {
  const template = parse(read('src/pages/' + page + '/index.vue')).descriptor.template.content
  let found
  function walk(n) {
    if (n.props?.some(p => p.name === 'class' && p.value?.content.split(' ').includes(cls))) found ||= n.loc.source
    n.children?.forEach(walk)
  }
  walk(baseParse(template)); assert.ok(found, cls)
  return found
}
async function render(page, cls, state = {}) {
  const source = fragment(page, cls)
  const render = new Function('Vue', compile(source, { mode: 'function', prefixIdentifiers: true, isCustomElement: t => ['view','text','image','scroll-view'].includes(t) }).code)(vue)
  return renderToString(vue.createSSRApp({ setup: () => ({ uiIcons: icons(), ...state }), render }))
}
test('player SFC semantic icons preserve notice count, income label and voice controls', async () => {
  const notice = await render('player/my-orders', 'notice-entry', { orderNoticeAvailable: 3, subscribing: false, enableOrderNotice() {} }); asset(notice, 'notification'); assert.match(notice, /3 次提醒授权/)
  const wallet = await render('player/my-orders', 'wallet-entry', { go() {} }); asset(wallet, 'fish'); assert.match(wallet, /鱼干收益中心/)
  const source = parse(read('src/pages/player/profile-settings/index.vue')).descriptor.template.content
  assert.match(source, /uiIcons\.terms/); assert.match(source, /uiIcons\.shield/)
  for (const playing of [false, true]) {
    const audio = await render('player/profile-settings', 'audio-card', { form: { audio_intro_url: 'voice.m4a' }, isPlaying: playing, toggleAudio() {}, removeAudio() {} }); asset(audio, 'microphone'); assert.ok(audio.includes(playing ? '暂停' : '试听')); assert.match(audio, /移除/)
  }
  const tags = await render('player/apply', 'hero-tags'); for (const key of ['apply', 'microphone', 'order']) asset(tags, key)
  asset(await render('player/apply', 'audio-icon'), 'microphone')
  for (const page of ['player/my-orders','player/profile-settings','player/apply']) assert.doesNotMatch(parse(read('src/pages/' + page + '/index.vue')).descriptor.template.content, />[铃鱼服护声证单]</)
})
test('shop SFC keeps home/cart/badge and designated product visibility without fake more action', async () => {
  for (const designated of [false, true]) {
    const bar = await render('shop/detail', 'bottom-bar', { product: {}, isPlayerServiceProduct: designated, cartCount: 102, goHome() {}, openCart() {}, openSpecPopup() {} })
    asset(bar, 'home'); assert.equal(bar.includes('/icons/duotone/cart.png'), !designated)
    assert.equal(bar.includes('99+'), !designated); assert.ok(bar.includes(designated ? '立即指定' : '立即购买'))
  }
  asset(await render('shop/detail', 'hero-float--left', { goBack() {} }), 'back')
  asset(await render('shop/detail', 'recommend-cart'), 'cart')
  asset(await render('shop/cart', 'empty-icon'), 'cart')
  const source = parse(read('src/pages/shop/detail/index.vue')).descriptor.template.content
  assert.doesNotMatch(source, /•••|🛒|⌂/); assert.match(source, /@tap="goBack"/)
  assert.match(source, /class="recommend-card" @tap="openProduct\(item.id\)"/)
})
test('all seven real SFCs preserve business scripts, directives, button markup and interpolations byte-for-byte', () => {
  const hash = s => require('node:crypto').createHash('sha256').update(s).digest('hex')
  const contracts = require('./secondary-icons-contracts.json')
  for (const [page, expected] of Object.entries(contracts)) {
    const d = parse(read('src/pages/' + page + '/index.vue')).descriptor
    const bindings = [], buttons = [], expressions = []
    function walk(n) {
      if (n.type === 5) expressions.push(n.content.content)
      if (n.tag === 'button') buttons.push(n.loc.source)
      for (const p of n.props || []) if (p.type === 7 && !(p.name === 'bind' && p.arg?.content === 'src' && p.exp?.content.startsWith('uiIcons.'))) bindings.push(p.loc.source)
      n.children?.forEach(walk)
    }
    walk(baseParse(d.template.content))
    assert.deepEqual({ script: hash(d.scriptSetup.content.replace("\nimport { uiIcons } from '@/utils/uiIcons'", '')), bindings: hash(JSON.stringify(bindings)), buttons: hash(JSON.stringify(buttons)), expressions: hash(JSON.stringify(expressions)) }, expected, page)
  }
})
test('real profile settings script still enforces approval and plays/pauses the selected audio', async () => {
  const hooks = {}, calls = [], module = { exports: {} }
  let approved = false
  const context = { onPlay(fn) { hooks.play = fn }, onPause(fn) { hooks.pause = fn }, onStop() {}, onEnded() {}, onError() {}, play() { calls.push('play'); hooks.play() }, pause() { calls.push('pause'); hooks.pause() } }
  const mocks = {
    vue: { ...vue, onBeforeUnmount() {} },
    '@dcloudio/uni-app': { onShow(fn) { hooks.show = fn } },
    '@/utils/uiIcons': { uiIcons: icons() }, '@/api/client': {},
    '@/api/player': { async getPlayerProfileSettings() { calls.push('load'); return { player: { bio: '介绍', audio_intro_url: 'voice.m4a' } } } },
    '@/utils/client': { isApprovedPlayer: async () => approved },
    '@/utils/nav': { replace: url => calls.push(url) },
    '@/utils/feedback': { toast: text => calls.push(text) }
  }
  const script = parse(read('src/pages/player/profile-settings/index.vue')).descriptor.scriptSetup.content
  vm.runInNewContext(ts.transpileModule(script + '\nmodule.exports = { form, isPlaying, toggleAudio }', { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports, require: n => mocks[n], uni: { createInnerAudioContext: () => context } })
  await hooks.show(); assert.ok(calls.includes('/pages/player/apply/index')); assert.ok(!calls.includes('load'))
  approved = true; await hooks.show(); assert.ok(calls.includes('load'))
  module.exports.toggleAudio(); assert.equal(context.src, 'voice.m4a'); assert.equal(module.exports.isPlaying.value, true)
  module.exports.toggleAudio(); assert.equal(module.exports.isPlaying.value, false); assert.deepEqual(calls.slice(-2), ['play','pause'])
})
function asset(html, name) { assert.ok(html.includes('/icons/duotone/' + name + '.png'), name + ' pictogram missing'); assert.match(html, /mode="aspectFit"/) }
test('support SFC renders shared support pictograms and preserves official contact branding', async () => {
  const html = await render('client/customer-service', 'contact-list', { contacts: [{id: 1, name: '人工客服', wechat_id: 'support'}], copyWechat() {} })
  asset(html, 'support'); assert.doesNotMatch(html, />客</)
  const official = await render('client/customer-service', 'official-card', { officialEnabled: true })
  assert.match(official, /open-type="contact"/); assert.match(official, />微</)
  const recharge = await render('client/recharge', 'support-icon'); asset(recharge, 'support'); assert.doesNotMatch(recharge, />客</)
})
