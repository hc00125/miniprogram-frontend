const { test } = require('node:test')
const assert = require('node:assert/strict')
const { setup, tick, unpaid, paid, deferred } = require('./order-balance-payment-harness.cjs')

test('explicit login failure releases loading before toast without waiting for a slow order read', async t => {
  const slowRead = deferred()
  const f = await setup(t, {
    post: () => { throw { statusCode: 400, code: 'WECHAT_LOGIN_RETRYABLE', detail: '微信登录凭证失效，请重新支付' } },
    getOrder: count => count === 1 ? unpaid() : slowRead.promise
  })
  t.after(() => slowRead.resolve(unpaid()))
  f.tap()
  await tick()
  assert.equal(f.calls.post.length, 3)
  assert.equal(f.payButton()?.props.disabled, false)
  assert.doesNotMatch(f.calls.toast.at(-1).button || '', /正在/)
  assert.equal(f.calls.toast.at(-1).disabled, false)
  assert.match(f.text(), /微信登录凭证失效，请重新支付/)
})

test('failed balance response shows an error and restores payment instead of claiming a deduction', async t => {
  const f = await setup(t, { post: () => ({ ...paid(), status: 'failed', detail: '钻石支付失败，请重新支付' }) })
  f.tap()
  await tick()
  assert.equal(f.calls.post.length, 1)
  assert.equal(f.calls.success.length, 0)
  assert.equal(f.payButton()?.props.disabled, false)
  assert.match(f.text(), /钻石支付失败，请重新支付/)
  assert.match(f.text(), /当前可用 💎150/)
  assert.doesNotMatch(f.text(), /微信付款已完成|钻石已扣除|钻石支付结果正在确认/)
})

test('confirmation dialog and login share one payment lock with a neutral busy label', async t => {
  const confirmation = deferred(), response = deferred()
  const f = await setup(t, { confirm: () => confirmation.promise, post: () => response.promise })
  const pay = f.payButton().props.onTap
  pay(); pay()
  await tick()
  assert.equal(f.calls.confirm.length, 1)
  assert.equal(f.calls.post.length, 0)
  assert.equal(f.payButton()?.props.disabled, true)
  confirmation.resolve(true)
  await tick()
  assert.equal(f.calls.post.length, 1)
  assert.match(f.payButton()?.children, /正在确认钻石支付/)
  pay()
  await tick()
  assert.equal(f.calls.post.length, 1)
  response.resolve({ ...paid(), status: 'failed' })
  await tick()
})

test('POST timeout stops loading but only permits status refresh, including after reopening', async t => {
  const f = await setup(t, { post: () => { throw { errMsg: 'request:fail timeout' } } })
  const pay = f.payButton().props.onTap
  pay()
  await tick()
  assert.equal(f.calls.post.length, 1)
  assert.equal(f.calls.login.length, 1)
  assert.equal(f.payButton(), undefined)
  assert.equal(f.calls.success.length, 0)
  assert.match(f.text(), /钻石支付结果正在确认/)
  pay()
  await tick()
  assert.equal(f.calls.post.length, 1)
  const restored = await setup(t, { storage: f.h.storage })
  assert.equal(restored.payButton(), undefined)
})

test('normal paid response and authoritative order refresh show successful payment', async t => {
  const f = await setup(t, { getOrder: count => count === 1 ? unpaid() : { ...unpaid(), paid: true, status: '待开打' } })
  f.tap()
  await tick()
  assert.equal(f.calls.post.length, 1)
  assert.equal(f.calls.success.length, 1)
  assert.match(f.text(), /支付成功，等待开打/)
  assert.equal(f.payButton(), undefined)
  assert.equal(f.h.storage.virtual_payment_confirmation_pending, undefined)
})

test('actual SFC plus wallet API recover with a fresh code and pay the same order', async t => {
  const f = await setup(t, {
    post: attempt => { if (attempt === 1) throw { statusCode: 400, code: 'WECHAT_LOGIN_RETRYABLE', detail: '微信登录凭证失效，请重新支付' }; return paid() },
    getOrder: count => count === 1 ? unpaid() : { ...unpaid(), paid: true, status: '待开打' }
  })
  f.tap()
  await tick()
  assert.equal(f.calls.success.length, 1)
  assert.deepEqual(f.calls.post.map(x => x.data), [
    { order_no: 'original-order', code: 'fresh-code-1' },
    { order_no: 'original-order', code: 'fresh-code-2' }
  ])
})

test('after exhausted login retries the enabled button can explicitly retry the original order', async t => {
  let isPaid = false
  const f = await setup(t, {
    post: attempt => { if (attempt <= 3) throw { statusCode: 400, code: 'WECHAT_LOGIN_RETRYABLE', detail: '微信登录凭证失效，请重新支付' }; isPaid = true; return paid() },
    getOrder: () => isPaid ? { ...unpaid(), paid: true, status: '待开打' } : unpaid()
  })
  f.tap(); await tick()
  assert.equal(f.calls.post.length, 3)
  assert.equal(f.payButton().props.disabled, false)
  f.tap(); await tick()
  assert.equal(f.calls.post.length, 4)
  assert.equal(f.calls.success.length, 1)
  assert.ok(f.calls.post.every(x => x.data.order_no === 'original-order'))
})

for (const status of ['processing', 'unexpected-status']) {
  test(`${status} response cannot claim payment or expose another debit`, async t => {
    const f = await setup(t, { post: () => ({ ...paid(), status }) })
    const pay = f.payButton().props.onTap
    pay(); await tick(); pay(); await tick()
    assert.equal(f.calls.post.length, 1)
    assert.equal(f.payButton(), undefined)
    assert.equal(f.calls.success.length, 0)
    assert.match(f.text(), /钻石支付结果正在确认/)
    assert.doesNotMatch(f.text() + f.calls.toast.map(x => x.text).join('|'), /钻石已扣除|微信付款已完成/)
  })
}

test('wx.login failure before any POST releases the button without an uncertain-payment lock', async t => {
  const f = await setup(t, { login: args => args.fail({ errMsg: 'login:fail timeout' }) })
  f.tap(); await tick()
  assert.equal(f.calls.post.length, 0)
  assert.equal(f.payButton().props.disabled, false)
  assert.equal(f.h.storage.virtual_payment_confirmation_pending, undefined)
  assert.match(f.text(), /login:fail timeout/)
})

test('identity mismatch stays an error, not an automatic login retry', async t => {
  const f = await setup(t, { post: () => { throw { statusCode: 400, code: 'WECHAT_ACCOUNT_MISMATCH', detail: '当前微信账号与订单账号不符' } } })
  f.tap(); await tick()
  assert.equal(f.calls.post.length, 1)
  assert.equal(f.calls.login.length, 1)
  assert.equal(f.payButton().props.disabled, false)
  assert.match(f.text(), /当前微信账号与订单账号不符/)
})

test('declining confirmation releases the lock without login or payment', async t => {
  const f = await setup(t, { confirm: () => false })
  f.tap(); await tick()
  assert.equal(f.calls.post.length, 0)
  assert.equal(f.calls.login.length, 0)
  assert.equal(f.payButton().props.disabled, false)
})

test('actual backend 409 unknown response enters persistent confirmation-only mode', async t => {
  const f = await setup(t, { post: () => { throw { statusCode: 409, status: 'unknown', code: 'ORDER_PAYMENT_PENDING', detail: '付款结果待核验，请查询原订单，不要重复付款' } } })
  const pay = f.payButton().props.onTap
  pay(); await tick(); pay(); await tick()
  assert.equal(f.calls.post.length, 1)
  assert.equal(f.payButton(), undefined)
  assert.match(f.text(), /钻石支付结果正在确认/)
  const restored = await setup(t, { storage: f.h.storage })
  assert.equal(restored.payButton(), undefined)
})

test('uncertain order A survives order B uncertainty and B authoritative completion', async t => {
  const uncertain = () => { throw { errMsg: 'request:fail timeout' } }
  const a = await setup(t, { orderNo: 'order-A', post: uncertain })
  a.tap(); await tick()
  const b = await setup(t, { orderNo: 'order-B', storage: a.h.storage, post: uncertain })
  b.tap(); await tick()
  const reopened = await setup(t, { orderNo: 'order-A', storage: b.h.storage })
  assert.equal(reopened.payButton(), undefined)
  assert.match(reopened.text(), /钻石支付结果正在确认/)
  const paidB = await setup(t, { orderNo: 'order-B', storage: b.h.storage,
    getOrder: () => ({ ...unpaid(), order_no: 'order-B', paid: true, status: '待开打' }) })
  const aAfterB = await setup(t, { orderNo: 'order-A', storage: paidB.h.storage })
  assert.equal(aAfterB.payButton(), undefined)
  aAfterB.tap(); await tick()
  assert.equal(aAfterB.calls.post.length, 0)
})

test('legacy single-order confirmation migrates without losing its lock when another order fails', async t => {
  const legacy = { virtual_payment_confirmation_pending: { orderNo: 'legacy-A', paymentNo: '', createdAt: 1, kind: 'balance' } }
  const b = await setup(t, { orderNo: 'order-B', storage: legacy, post: () => { throw { errMsg: 'request:fail timeout' } } })
  b.tap(); await tick()
  const a = await setup(t, { orderNo: 'legacy-A', storage: b.h.storage })
  assert.equal(a.payButton(), undefined)
})

test('actual payment SFC treats unknown as unconfirmed, persists the lock and never submits again', async t => {
  const f = await setup(t, { post: () => ({ ...paid(), status: 'unknown' }) })
  f.tap()
  await tick()
  assert.equal(f.calls.post.length, 1)
  assert.equal(f.calls.success.length, 0)
  assert.doesNotMatch(f.text() + f.calls.toast.map(x => x.text).join('|'), /钻石已扣除|微信付款已完成|微信已付款|微信收银台已经返回成功/)
  assert.match(f.text(), /钻石支付结果.*确认|正在确认钻石支付/)
  assert.equal(f.payButton(), undefined)
  await f.refresh()
  f.tap()
  await tick()
  assert.equal(f.calls.post.length, 1)
  const restored = await setup(t, { storage: f.h.storage })
  assert.equal(restored.payButton(), undefined)
  assert.doesNotMatch(restored.text(), /微信付款已完成|钻石已扣除/)
})
