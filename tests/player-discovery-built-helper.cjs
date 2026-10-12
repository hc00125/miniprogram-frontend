// Pure post-build verification helper. No node:test registrations.
// Executes the actual compressed page/API/request JS with synthetic uni transport.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const vue = require('vue')
const { fixturePlayer, plain, root } = require('./player-discovery-harness.cjs')
function builtPage() {
  const dist = path.join(root, 'dist/build/mp-weixin')
  const requests = [], feedback = [], routes = [], timers = new Map(), showHooks = [], cache = new Map(), events = new Map()
  let component, draw, timerId = 0
  const uni = {
    request: request => requests.push(request),
    getStorageSync: key => ({ token: 'synthetic-built-client', admin_token: 'synthetic-built-admin' })[key],
    getDeviceInfo: () => ({ platform: 'android' }), getSystemInfoSync: () => ({ platform: 'android' }),
    showToast: value => feedback.push(plain(value)),
    navigateTo: value => routes.push(['navigateTo', value.url]),
    switchTab: value => routes.push(['switchTab', value.url]),
    $on: (event, callback) => events.set(event, callback), $off: event => events.delete(event)
  }
  const vendor = { ...vue, index: uni, onShow: callback => showHooks.push(callback),
    e: Object.assign, f: (items, callback) => Array.from(items, (item, index) => callback(item, index, index)),
    o: callback => callback, t: String, n: vue.normalizeClass, p: value => value, s: value => value,
    _export_sfc: value => value }
  class FixedDate extends Date { static now() { return 1791723600000 } }
  function load(filename) {
    filename = path.resolve(filename)
    if (filename === path.join(dist, 'common/vendor.js')) return vendor
    if (filename === path.join(dist, 'api/pay.js')) return { reconcileVirtualCheckoutByOrder() { throw Error('Unexpected payment call') } }
    assert.ok(filename.startsWith(dist + path.sep), 'compiled loader stays within candidate dist')
    if (!cache.has(filename)) {
      const module = { exports: {} }; cache.set(filename, module.exports)
      vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
        module, exports: module.exports, require: name => load(path.resolve(path.dirname(filename), name)),
        wx: { createPage: value => { component = value } }, console, Date: FixedDate,
        Math: Object.assign(Object.create(Math), { random: () => 0 }),
        setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id },
        clearTimeout: id => timers.delete(id), getCurrentPages: () => []
      }, { filename })
      cache.set(filename, module.exports)
    }
    return cache.get(filename)
  }
  load(path.join(dist, 'pages/player/list/index.js'))
  assert.ok(component?.setup, 'compiled page must register with wx.createPage')
  const renderer = vue.createRenderer({ createElement: () => ({}), createText: () => ({}), createComment: () => ({}), insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {}, parentNode: () => null, nextSibling: () => null })
  const app = renderer.createApp({ setup() { draw = component.setup({}); return {} }, render: () => null }); app.mount({})
  async function flush() { await Promise.resolve(); await Promise.resolve(); await vue.nextTick() }
  async function settle(index, data = [], statusCode = 200) { requests[index].success({ statusCode, data }); await flush() }
  const wxml = fs.readFileSync(path.join(dist, 'pages/player/list/index.wxml'), 'utf8')
  function button(label) {
    const matches = [...wxml.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)].filter(match => match[2] === label)
    assert.equal(matches.length, 1, `Unique built button ${label}`)
    const binding = matches[0][1].match(/(?:bindtap|catchtap)="\{\{([^}]+)\}\}"/)
    assert.ok(binding, `Built button ${label} has an event binding`)
    return binding[1]
  }
  function bound(attribute, marker) {
    const tag = [...wxml.matchAll(/<[^>]+>/g)].find(match => match[0].includes(marker))?.[0]
    assert.ok(tag, `Built tag ${marker}`)
    const expression = tag.match(new RegExp(attribute + '="\\{\\{([^}]+)\\}\\}"'))?.[1]
    assert.ok(expression, `Built ${attribute} binding for ${marker}`)
    return expression
  }
  function value(expression, data = draw()) {
    return expression.split('.').reduce((target, key) => target[key], data)
  }
  async function runTimers() { const pending = [...timers.entries()]; for (const [id, timer] of pending) { timers.delete(id); timer.callback() }; await flush() }
  return { dist, requests, feedback, routes, timers, events, button, bound, value, wxml, show: () => showHooks[0](), draw: () => draw({ $appThemeStyle: '' }, []), settle, flush, runTimers, unmount: () => app.unmount() }
}
async function verifyBuild() {
  const h = builtPage(), observations = []
  try {
    const randomBinding = h.button('随机陪玩'), qualityBinding = h.button('推荐陪玩')
    const refreshBinding = h.bound('bindtap', 'loading="'), inputBinding = h.bound('bindinput', 'search-input')
    h.show()
    const seed = h.requests[0].data.shuffle_key
    assert.equal(h.requests[0].method, 'GET'); assert.match(h.requests[0].url, /\/api\/player\/list$/)
    assert.deepEqual(plain(h.requests[0].data), { discovery: 'random', shuffle_key: seed }); assert.match(seed, /^[A-Za-z0-9_-]{1,64}$/)
    await h.settle(0, [fixturePlayer(1)])
    h.draw()[qualityBinding]()
    assert.deepEqual(plain(h.requests[1].data), { discovery: 'quality' })
    await h.settle(1, [fixturePlayer(2)])
    h.draw()[randomBinding]()
    assert.equal(h.requests[2].data.shuffle_key, seed)
    await h.settle(2, [fixturePlayer(3)])
    h.draw()[refreshBinding]()
    const nextSeed = h.requests[3].data.shuffle_key
    assert.notEqual(nextSeed, seed); assert.match(nextSeed, /^[A-Za-z0-9_-]{1,64}$/)
    assert.equal(h.draw()[h.bound('loading', 'loading="')], true)
    await h.settle(3, [fixturePlayer(4)])
    assert.equal(h.feedback.at(-1).title, '刷新成功')
    h.draw()[inputBinding]({ detail: { value: '  测试搜索  ' } }); await h.runTimers()
    assert.deepEqual(plain(h.requests[4].data), { discovery: 'random', shuffle_key: nextSeed, search: '测试搜索' })
    h.draw()[qualityBinding]()
    assert.deepEqual(plain(h.requests[5].data), { discovery: 'quality', search: '测试搜索' })
    await h.settle(5, [fixturePlayer(22), fixturePlayer(21)])
    await h.settle(4, [fixturePlayer(99)])
    const collectionKey = h.wxml.match(/wx:for="\{\{([^}]+)\}\}" wx:for-item="player"/)[1]
    const keyField = h.wxml.match(/wx:for-item="player" wx:key="([^"]+)"/)[1]
    assert.deepEqual(Array.from(h.draw()[collectionKey], row => row[keyField]), [22, 21])
    const rows = h.draw()[collectionKey], rowData = { player: rows[0] }
    const giftPropsBinding = h.bound('u-p', '<gift-host ')
    assert.deepEqual(plain(h.value(giftPropsBinding, rowData)), { compact: true, 'persistent-entry': true, 'recipient-id': 22, 'recipient-name': '测试陪玩22' })
    const patronageBinding = h.button('冠名/包天')
    h.value(patronageBinding, rowData)()
    assert.deepEqual(h.routes.at(-1), ['navigateTo', '/pages/client/patronage/index?playerId=22'])
    const serviceBinding = h.bound('catchtap', 'class="club-btn ')
    h.value(serviceBinding, rowData)()
    assert.deepEqual(h.routes.at(-1), ['navigateTo', '/pages/player/detail/index?playerId=22'])
    const ratingField = h.wxml.match(/class="rating-tag [^"]*">\{\{player\.([^}]+)\}\}/)[1]
    assert.equal(rows[0][ratingField], '★ 4.8 · 2条评价')
    h.draw()[refreshBinding]()
    assert.equal(Object.hasOwn(h.requests[6].data, 'shuffle_key'), false)
    h.unmount(); await h.settle(6, [fixturePlayer(77)])
    assert.equal(h.feedback.length, 1); assert.equal(h.events.size, 0)
    assert.deepEqual(Array.from(h.draw()[collectionKey], row => row[keyField]), [22, 21])
    observations.push({ randomBinding, qualityBinding, refreshBinding, inputBinding, collectionKey, keyField, giftPropsBinding, patronageBinding, serviceBinding, ratingField })
    return { status: 'passed', fixture_data: true, commands_are_not_live_requests: true,
      assertions: 'compiled button events -> real compiled API/request -> synthetic uni.request; seed, search, stale reply, unmount and preserved card/business entries verified',
      bindings: observations[0], artifacts: ['pages/player/list/index.js', 'pages/player/list/index.wxml', 'pages/player/list/index.json', 'pages/player/list/index.wxss', 'api/boss.js', 'utils/request.js'].map(relative => ({ path: path.join(h.dist, relative), sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(h.dist, relative))).digest('hex') })) }
  } finally { h.unmount() }
}
module.exports = { builtPage, verifyBuild }
