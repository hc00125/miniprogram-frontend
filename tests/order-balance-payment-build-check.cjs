// Execute built wallet + request modules; replace only WeChat platform I/O.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict')
const root = path.resolve(__dirname, '../dist/build/mp-weixin')
function fixture(respond) {
  const calls = [], codes = [], cache = new Map()
  const uni = {
    getStorageSync: key => key === 'token' ? 'synthetic-offline-user-token' : '',
    getSystemInfoSync: () => ({ platform: 'android', system: 'Android' }),
    login: options => { const code = `offline-login-${codes.length}`; codes.push(code); options.success({ code }) },
    request: options => { calls.push(options); respond(options, calls.length) }
  }
  const vendor = { index: uni }
  function load(file) {
    file = path.resolve(file)
    if (file === path.join(root, 'common/vendor.js')) return vendor
    if (cache.has(file)) return cache.get(file)
    const module = { exports: {} }; cache.set(file, module.exports)
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), { module, exports: module.exports,
      require: name => load(path.resolve(path.dirname(file), name)), setTimeout, clearTimeout, console }, { filename: file })
    return module.exports
  }
  return { api: load(path.join(root, 'api/wallet.js')), calls, codes }
}
;(async () => {
  const recovering = fixture((request, n) => request.success(n === 1
    ? { statusCode: 400, data: { code: 'WECHAT_LOGIN_RETRYABLE', wechat_code: '40163', detail: '登录凭证失效' } }
    : { statusCode: 200, data: { status: 'paid', order_no: 'original' } }))
  assert.equal((await recovering.api.payOrderWithBalance('original')).status, 'paid')
  assert.equal(recovering.calls.length, 2)
  assert.equal(new Set(recovering.codes).size, 2)
  assert.ok(recovering.calls.every(r => r.method === 'POST' && r.url.endsWith('/pay/balance/create') && r.data.order_no === 'original'))
  for (const statusCode of [409, 502]) {
    const pending = fixture(request => request.success({ statusCode, data: { code: 'ORDER_PAYMENT_PENDING', status: 'unknown' } }))
    await assert.rejects(pending.api.payOrderWithBalance('original'), e => e.balancePaymentUncertain === true)
    assert.equal(pending.calls.length, 1)
  }
  const timeout = fixture(request => request.fail({ errMsg: 'request:fail timeout' }))
  await assert.rejects(timeout.api.payOrderWithBalance('original'), e => e.balancePaymentUncertain === true)
  assert.equal(timeout.calls.length, 1)
  console.log('PASS: built wallet + actual request normalization; login retry on original order, HTTP409/502/transport uncertainty, zero live network')
})().catch(error => { console.error(error); process.exitCode = 1 })
