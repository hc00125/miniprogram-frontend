const { test } = require('node:test')
const assert = require('node:assert/strict')
const { harness } = require('./commerce-sfc-harness.cjs')

const retryable = () => ({ statusCode: 400, code: 'WECHAT_LOGIN_RETRYABLE', detail: '微信登录凭证失效，请重新支付', wechat_code: 40029 })
const paid = () => ({ status: 'paid', order_no: 'original-order', payment_no: 'payment-1', balance_diamonds: 50 })
function walletFixture(post) {
  const calls = [], logins = []
  const h = harness({ '@/utils/request': { default: { post: async (url, data) => {
    calls.push({ url, data })
    return post(calls.length, data)
  } } } })
  h.uni.login = options => {
    const code = `fresh-code-${logins.length + 1}`
    logins.push(code)
    options.success({ code })
  }
  return { api: h.load('src/api/wallet.ts'), calls, logins, h }
}

test('real wallet API refreshes login after explicit recoverable error on the original order', async () => {
  const f = walletFixture(attempt => { if (attempt === 1) throw retryable(); return paid() })
  assert.equal((await f.api.payOrderWithBalance('original-order')).status, 'paid')
  assert.deepEqual(f.calls, [
    { url: '/pay/balance/create', data: { order_no: 'original-order', code: 'fresh-code-1' } },
    { url: '/pay/balance/create', data: { order_no: 'original-order', code: 'fresh-code-2' } }
  ])
  assert.equal(f.logins.length, 2)
})

test('recoverable login failures stop after three POSTs and retain the actual error', async () => {
  const error = retryable()
  const f = walletFixture(() => { throw error })
  await assert.rejects(f.api.payOrderWithBalance('original-order'), e => e.code === error.code && e.wechat_code === 40029 && e.detail === error.detail)
  assert.equal(f.calls.length, 3)
  assert.equal(new Set(f.logins).size, 3)
})

for (const error of [
  { statusCode: 400, code: 'WECHAT_ACCOUNT_MISMATCH', detail: '当前微信账号与订单账号不符' },
  { statusCode: 400, code: 'WECHAT_CONFIG_INVALID', detail: '微信支付配置异常' },
  { statusCode: 400, code: 'SOME_UNKNOWN_ERROR', detail: '未知错误' },
  { statusCode: 400, wechat_code: 40029, detail: 'invalid code' },
  { errMsg: 'request:fail timeout' },
  { statusCode: 504, detail: 'Gateway Timeout' }
]) {
  test(`real API never auto-reposts ${error.code || error.wechat_code || error.errMsg || error.statusCode}`, async () => {
    const f = walletFixture(() => { throw error })
    await assert.rejects(f.api.payOrderWithBalance('original-order'))
    assert.equal(f.calls.length, 1)
    assert.equal(f.logins.length, 1)
  })
}

for (const status of ['paid', 'processing', 'unknown', 'failed']) {
  test(`real API returns ${status} without repeating the POST`, async () => {
    const f = walletFixture(() => ({ ...paid(), status }))
    assert.equal((await f.api.payOrderWithBalance('original-order')).status, status)
    assert.equal(f.calls.length, 1)
  })
}

test('legacy 40163 still refreshes credentials, with a maximum of three POSTs', async () => {
  const f = walletFixture(() => { throw { statusCode: 400, wechat_code: 40163, detail: 'code been used' } })
  await assert.rejects(f.api.payOrderWithBalance('original-order'), e => e.wechat_code === 40163)
  assert.equal(f.calls.length, 3)
  assert.equal(new Set(f.logins).size, 3)
})

test('a repeated login code is never submitted twice', async () => {
  const f = walletFixture(() => { throw retryable() })
  f.h.uni.login = args => args.success({ code: 'same-code' })
  await assert.rejects(f.api.payOrderWithBalance('original-order'), e => e.code === 'WECHAT_LOGIN_CODE_NOT_REFRESHED')
  assert.equal(f.calls.length, 1)
})

test('backend 409 ORDER_PAYMENT_PENDING is uncertainty, never an ordinary retryable error', async () => {
  const f = walletFixture(() => { throw { statusCode: 409, status: 'unknown', code: 'ORDER_PAYMENT_PENDING', detail: '付款结果待核验，请查询原订单，不要重复付款' } })
  await assert.rejects(f.api.payOrderWithBalance('original-order'), e => e.balancePaymentUncertain === true)
  assert.equal(f.calls.length, 1)
})

test('5xx is an uncertain write even if its body contains a login retry code', async () => {
  const f = walletFixture(() => { throw { ...retryable(), statusCode: 502 } })
  await assert.rejects(f.api.payOrderWithBalance('original-order'), e => e.balancePaymentUncertain === true)
  assert.equal(f.calls.length, 1)
})
