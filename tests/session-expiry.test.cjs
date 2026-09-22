const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function harness(route = 'pages/client/profile/index') {
  const storage = new Map([['token', 'expired'], ['client_profile', { nickname: '旧昵称' }], ['player', {}], ['admin_token', 'admin-valid']])
  const requests = [], modals = [], routes = [], events = []
  const uni = {
    getStorageSync: key => storage.get(key) || '',
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: key => storage.delete(key),
    request: options => requests.push(options),
    showModal: options => modals.push(options),
    showToast: () => {},
    $emit: (...args) => events.push(args),
    redirectTo: options => routes.push(options.url),
    switchTab: options => routes.push(options.url),
    reLaunch: options => routes.push(options.url)
  }
  const cache = {}
  const purchase = { getClientPlatform: () => 'android', isIOSExemptRequest: () => false, isIOSPurchaseEnabled: () => true }
  function load(name) {
    if (name.endsWith('/purchaseAvailability')) return purchase
    if (name.endsWith('/accountRestriction')) return { showAccountRestrictionModal: () => {} }
    if (cache[name]) return cache[name].exports
    const filename = path.join(__dirname, '../src', name.replace('@/', '') + '.ts')
    const source = fs.readFileSync(filename, 'utf8').replace('import.meta.env.VITE_BASE_URL', 'undefined')
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2018 } }).outputText
    const module = { exports: {} }; cache[name] = module
    vm.runInNewContext(js, { module, exports: module.exports, require: load, uni, getCurrentPages: () => [{ route, options: {} }], setTimeout, console })
    return module.exports
  }
  const api = load('@/utils/request').api
  function respond(index, statusCode = 403, data = { detail: '身份认证信息未提供。' }) {
    requests[index].success({ statusCode, data })
  }
  return { storage, requests, modals, routes, events, api, respond, load }
}

test('client过期403清理用户缓存并提供明确重登入口，保留独立管理员凭证', async () => {
  const h = harness()
  const result = h.api.get('/client/wallet/overview').catch(e => e)
  h.respond(0)
  const error = await result
  assert.equal(h.storage.has('token'), false)
  assert.equal(h.storage.has('client_profile'), false)
  assert.equal(h.storage.get('admin_token'), 'admin-valid')
  assert.equal(error.handled, true)
  assert.equal(h.modals.length, 1)
  assert.equal(h.modals[0].content, '登录已过期，请重新登录')
  h.modals[0].success({ confirm: true })
  assert.equal(h.routes[0], '/pages/client/login/index')
})

test('真实权限403不能登出', async () => {
  for (const url of ['/player/orders', '/boss/orders', '/client/profile']) {
    const h = harness()
    const p = h.api.get(url).catch(e => e)
    h.respond(0, 403, { detail: '没有权限执行此操作。', code: 'permission_denied' })
    assert.equal((await p).handled, undefined)
    assert.equal(h.storage.get('token'), 'expired')
    assert.equal(h.modals.length, 0)
  }
})

test('并发401/403只提示一次，取消后不弹循环；所有请求均不自动重放', async () => {
  const h = harness()
  const promises = [h.api.get('/client/profile'), h.api.get('/client/wallet/overview'), h.api.post('/pay/create', { order: 1 }), h.api.post('/player/withdrawals', {}), h.api.post('/boss/orders', {})].map(p => p.catch(e => e))
  h.requests.forEach((_, i) => h.respond(i, i === 0 ? 401 : 403))
  await Promise.all(promises)
  assert.equal(h.modals.length, 1)
  h.modals[0].success({ confirm: false })
  assert.equal(h.routes.length, 0)
  const p = h.api.get('/client/profile').catch(e => e); h.respond(5); await p
  assert.equal(h.modals.length, 1)
  assert.equal(h.requests.length, 6)
})

test('旧请求失效响应不能清除重登后的新凭证', async () => {
  const h = harness()
  const p = h.api.get('/client/profile').catch(e => e)
  h.storage.set('token', 'new-session')
  h.respond(0); await p
  assert.equal(h.storage.get('token'), 'new-session')
  assert.equal(h.modals.length, 0)
})

test('登录接口失败保留明确错误，不循环重登', async () => {
  const h = harness()
  const p = h.api.post('/client/wechat-login', {}).catch(e => e)
  h.respond(0, 401, { detail: '微信登录凭证已失效' })
  assert.equal((await p).handled, undefined)
  assert.equal(h.modals.length, 0)
})

test('重登成功恢复原安全读页面并允许下次过期提示；登录页实际消费返回目标', async () => {
  const h = harness()
  const p = h.api.get('/client/profile').catch(e => e); h.respond(0); await p
  h.modals[0].success({ confirm: true })
  h.storage.set('token', 'new')
  assert.equal(h.load('@/utils/sessionExpiry').finishSessionLogin(), '/pages/client/profile/index')
  assert.equal(h.storage.has('session_login_return'), false)
  const next = h.api.get('/client/profile').catch(e => e); h.respond(1); await next
  assert.equal(h.modals.length, 2)
  const login = fs.readFileSync(path.join(__dirname, '../src/pages/client/login/index.vue'), 'utf8')
  assert.match(login, /replace\(finishSessionLogin\(\)\)/)
})

test('个人中心收到过期事件立即清空昵称和余额显示，统一提示不重复toast', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/pages/client/profile/index.vue'), 'utf8')
  const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '')
  const listeners = {}
  const js = ts.transpileModule(script + '\n;globalThis.state = {profile, isLoggedIn, walletOverview, walletLoadFailed}', { compilerOptions: { target: ts.ScriptTarget.ES2018 } }).outputText
  const ctx = { ref: value => ({ value }), computed: fn => ({ get value() { return fn() } }), onShow: () => {}, onUnmounted: () => {}, SESSION_EXPIRED_EVENT: 'session:expired', uni: { $on: (event, fn) => listeners[event] = fn, $off: () => {} } }
  vm.runInNewContext(js, ctx)
  ctx.state.profile.value = { nickname: '旧昵称' }
  ctx.state.isLoggedIn.value = true
  ctx.state.walletOverview.value = { balance_diamonds: 900 }
  assert.equal(typeof listeners['session:expired'], 'function')
  listeners['session:expired']('token')
  assert.equal(ctx.state.isLoggedIn.value, false)
  assert.equal(ctx.state.profile.value, null)
  assert.equal(ctx.state.walletOverview.value, null)
  assert.equal(ctx.state.walletLoadFailed.value, false)
  assert.doesNotMatch(source, /toast\('登录状态已失效/)
})

module.exports = { harness }

test('钱包与收益页重登恢复原安全读页面；支付页不恢复财务操作', async () => {
  for (const route of ['pages/client/wallet/index', 'pages/player/earnings/index', 'pages/boss/payment/index']) {
    const h = harness(route)
    const p = h.api.get('/client/profile').catch(e => e); h.respond(0); await p
    h.modals[0].success({ confirm: true })
    assert.equal(h.load('@/utils/sessionExpiry').finishSessionLogin(), route.includes('/payment/') ? '/pages/client/profile/index' : '/' + route)
  }
})

test('过期后迟到的成功读取不能回填旧资料或余额', async () => {
  const h = harness()
  const first = h.api.get('/client/profile').catch(e => e)
  const second = h.api.get('/client/wallet/overview').catch(e => e)
  h.respond(0); await first
  h.respond(1, 200, { balance_diamonds: 99 })
  const result = await second
  assert.equal(result.handled, true)
  assert.equal(result.balance_diamonds, undefined)
})
