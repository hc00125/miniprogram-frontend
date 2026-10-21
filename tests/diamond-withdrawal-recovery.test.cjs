const {test} = require('node:test'), assert = require('node:assert/strict')
const {setup, receipt, deferred, tick} = require('./diamond-withdrawal-harness.cjs')
// Selected observed fields from the isolated PostgreSQL race (2026-10-17).
// Kept inline so this regression runs after checkout without private task artifacts.
const observedReceipt = {withdrawal_no:'WD20261017204237134B0FF5', amount:2, status:'paid', status_text:'已兑换', payment_method:'diamonds', payment_method_text:'提现为钻石', account_name:'', account_no_masked:'', request_id:'a0deaa5c-5906-4327-8e47-7d62ac0761df', diamond_amount:2, diamond_balance_after:2.5, target_profile_id:1, actor_user_id:1, paid_at:'2026-10-17T20:42:37.824730+08:00', created_at:'2026-10-17T20:42:37.825143+08:00'}
const pg = {
  keys:['a0deaa5c-5906-4327-8e47-7d62ac0761df','4bae9aeb-4e8c-4350-b083-9ad22c8337ef'],
  get_while_first_uncommitted:{status:404,body:{detail:'兑换收据不存在'}},
  same_key_retry_while_first_uncommitted:{status:409,body:{detail:'余额正在变更，请稍后使用原request_id恢复或重试；本次事务已回滚'}},
  first_commit:{status:201,body:observedReceipt}, original_recovery_after_commit:{status:200,body:observedReceipt}
}
const pending = f => Object.values(f.storage).find(v => v?.state === 'pending')
const posts = f => f.calls.request.filter(c => c.method === 'POST')

test('diamond recovery FD-RECOVERY-001: lost original POST, hide/show GET404 and PG409 retain key until original committed GET200', async t => {
  let committed = false
  const f = await setup(t, {balance:'20.75', storage:{token:'review', client_profile:{id:1, player:{id:1}}}, transport:c => {
    if (c.method === 'POST') {
      if (posts(f).length === 1) return {error:{errMsg:'request:fail timeout'}}
      return {error:{statusCode:pg.same_key_retry_while_first_uncommitted.status, ...pg.same_key_retry_while_first_uncommitted.body}}
    }
    if (c.url.includes('/withdrawals/diamond/')) return committed ? pg.original_recovery_after_commit.body : {error:{statusCode:pg.get_while_first_uncommitted.status, ...pg.get_while_first_uncommitted.body}}
  }})
  // Deterministic UUID only; SFC, API/request, helper, storage and observed PG DTOs are real.
  let generated = 0
  f.load('src/utils/diamondWithdrawal.ts').createDiamondRequestId = async () => pg.keys[generated++]
  f.method(4); f.input(0,'2'); await f.tap()
  const original = structuredClone(pending(f))
  assert.equal(original.request_id, pg.keys[0])
  assert.equal(posts(f)[0].storage['diamond_withdrawal_pending:1:1'].request_id, pg.keys[0])
  f.hooks.hide.forEach(fn => fn()); await f.refresh()
  assert.deepEqual(pending(f), original)
  await f.tap()
  assert.equal(posts(f)[1].data.request_id, pg.keys[0])
  assert.equal(pending(f)?.request_id, pg.keys[0], 'A rollback of the retry is not resolution of the original transaction')
  assert.deepEqual(pending(f), original)
  assert.equal(f.button().props.disabled, false)
  assert.match(f.text(), /恢复原兑换请求/)
  f.input(0,'9'); await f.tap()
  assert.ok(posts(f).every(c => c.data.request_id === pg.keys[0] && c.data.amount === '2'))
  assert.equal(generated, 1)
  assert.equal(f.calls.confirm.length, 1)
  committed = true
  f.hooks.hide.forEach(fn => fn()); await f.refresh()
  assert.equal(pending(f), undefined)
  assert.deepEqual(f.calls.success, ['已到账2钻石'])
  assert.equal(posts(f).length, 3, 'Committed receipt recovery is GET-only, not another debit')
  assert.equal(f.storage['diamond_withdrawal_actor:1:1'], pg.first_commit.body.actor_user_id)
})

for (const statusCode of [400, 403, 409, 423]) {
  test(`diamond recovery FD-RECOVERY-001: retry HTTP${statusCode} retains full original request across hide/show and persistent reopening until matching receipt`, async t => {
    let attempts = 0
    const f = await setup(t, {transport:c => {
      if (c.method === 'POST') return ++attempts === 1 ? {error:{errMsg:'request:fail timeout'}} : {error:{statusCode, detail:'原请求结果未知，仅本次重试被拒绝'}}
    }})
    f.method(4); f.input(0,'3'); f.input(1,'原备注'); await f.tap()
    const original = structuredClone(pending(f)), originalPayload = posts(f)[0].data
    f.hooks.hide.forEach(fn => fn()); await f.refresh()
    await f.tap()
    assert.deepEqual(pending(f), original)
    assert.deepEqual(posts(f)[1].data, originalPayload)
    assert.equal(f.calls.success.length, 0)
    // HTTP423 is already handled by the existing restriction modal, not a toast.
    if (statusCode === 423) assert.equal(f.calls.toast.at(-1), '')
    else assert.match(f.calls.toast.at(-1), /仅本次重试被拒绝/)
    assert.match(f.text(), /恢复原兑换请求/)
    assert.equal(f.button().props.disabled, false)
    const reopened = await setup(t, {storage:f.storage, transport:c => c.url.includes('/withdrawals/diamond/') ? receipt(originalPayload) : undefined})
    assert.equal(posts(reopened).length, 0)
    assert.equal(pending(reopened), undefined)
    assert.deepEqual(reopened.calls.success, ['已到账3钻石'])
    assert.equal(pending(f).request_id, original.request_id, 'Independent page storage snapshot remains unchanged')
  })
  test(`diamond recovery FD-RECOVERY-001: first POST HTTP${statusCode} is not an original-key non-execution receipt`, async t => {
    const f = await setup(t, {transport:c => c.method === 'POST' ? {error:{statusCode, amount:['当前尝试拒绝']}} : undefined})
    f.method(4); f.input(0,'2'); await f.tap()
    const original = structuredClone(pending(f))
    assert.ok(original)
    f.input(0,'7'); await f.tap()
    assert.deepEqual(pending(f), original)
    assert.equal(posts(f).length, 2)
    assert.deepEqual(posts(f)[1].data, posts(f)[0].data)
    assert.equal(f.calls.confirm.length, 1)
    assert.equal(f.calls.success.length, 0)
  })
}

for (const error of [{statusCode:400, detail:'恢复失败'}, {statusCode:403, detail:'权限变化'}, {statusCode:409, detail:'正在变更'}, {statusCode:423, detail:'账号受限'}, {statusCode:500, detail:'服务失败'}, {errMsg:'request:fail offline'}]) {
  test(`diamond recovery FD-RECOVERY-001: GET failure ${JSON.stringify(error)} never releases original or sends replacement POST`, async t => {
    let failGet = false
    const f = await setup(t, {transport:c => {
      if (c.method === 'POST') return {error:{errMsg:'request:fail timeout'}}
      if (failGet && c.url.includes('/withdrawals/diamond/')) return {error}
    }})
    f.method(4); f.input(0,'2'); await f.tap()
    const original = structuredClone(pending(f))
    failGet = true
    f.hooks.hide.forEach(fn => fn()); await f.refresh(); await f.tap()
    assert.deepEqual(pending(f), original)
    assert.equal(posts(f).length, 1)
    assert.equal(f.calls.success.length, 0)
    assert.equal(f.button().props.disabled, false)
  })
}

for (const mismatch of [{amount:3}, {request_id:'31a05346-a523-4fd3-8fe5-eabecb86f609'}, {target_profile_id:42}, {actor_user_id:72}, {status:'processing'}]) {
  test(`diamond recovery FD-RECOVERY-001: GET200 mismatch ${JSON.stringify(mismatch)} retains pending until own matching completed receipt`, async t => {
    let originalPayload, valid = false
    const f = await setup(t, {storage:{token:'session-A', client_profile:{id:41, player:{id:11}}, 'diamond_withdrawal_actor:41:11':71}, transport:c => {
      if (c.method === 'POST') {originalPayload = c.data; return {error:{errMsg:'request:fail timeout'}}}
      if (c.url.includes('/withdrawals/diamond/')) return receipt({...originalPayload, ...(valid ? {} : mismatch)})
    }})
    f.method(4); f.input(0,'2'); await f.tap()
    const original = structuredClone(pending(f))
    await f.tap()
    assert.deepEqual(pending(f), original)
    assert.equal(f.calls.success.length, 0)
    assert.match(f.calls.toast.at(-1), /结果尚未确认/)
    valid = true; await f.tap()
    assert.equal(pending(f), undefined)
    assert.deepEqual(f.calls.success, ['已到账2钻石'])
    assert.equal(posts(f).length, 1)
  })
}

test('diamond recovery FD-RECOVERY-001: a late first rejection cannot erase the original key while the shown page is recovering it', async t => {
  const gate = deferred(); let attempts = 0
  const f = await setup(t, {transport:c => c.method === 'POST' ? (++attempts === 1 ? gate.promise : {error:{statusCode:403, detail:'本次重试拒绝'}}) : undefined})
  f.method(4); f.input(0,'2'); const running = f.tap(); await tick()
  const original = structuredClone(pending(f))
  // The hidden original POST remains pending while the shown page retries its persisted key.
  f.hooks.hide.forEach(fn => fn()); await f.refresh(); await f.tap()
  assert.deepEqual(pending(f), original)
  gate.resolve({error:{statusCode:400, amount:['本次原POST响应拒绝']}}); await running
  assert.deepEqual(pending(f), original)
  assert.equal(posts(f).length, 2)
  assert.deepEqual(posts(f)[1].data, posts(f)[0].data)
  assert.equal(f.calls.confirm.length, 1)
})

for (const statusCode of [400, 403, 423]) {
  test(`diamond recovery FD-RECOVERY-001: cash HTTP${statusCode} keeps cash rules and does not manufacture diamond pending or affect another actor`, async t => {
    const foreign = {player_id:12, profile_id:42, request_id:'31a05346-a523-4fd3-8fe5-eabecb86f609', amount:'2', request_note:'', state:'pending'}
    const f = await setup(t, {storage:{token:'session-A', client_profile:{id:41, player:{id:11}}, 'diamond_withdrawal_pending:42:12':foreign}, transport:c => c.method === 'POST' ? {error:{statusCode, detail:'现金提现拒绝'}} : undefined})
    f.input(0,'0.1'); f.input(1,'现金本人'); f.input(2,'cash-account'); await f.tap()
    assert.equal(posts(f).length, 1)
    assert.deepEqual(posts(f)[0].data, {amount:0.1, payment_method:'wechat', account_name:'现金本人', account_no:'cash-account', request_note:''})
    assert.deepEqual(f.storage['diamond_withdrawal_pending:42:12'], foreign)
    assert.equal(f.storage['diamond_withdrawal_pending:41:11'], undefined)
    assert.doesNotMatch(f.text(), /恢复原兑换请求|原兑换.*结果待确认/)
    if (statusCode === 423) assert.equal(f.calls.toast.at(-1), '')
    else assert.match(f.calls.toast.at(-1), /现金提现拒绝/)
    assert.equal(f.button().props.disabled, false)
  })
}

test('diamond recovery FD-RECOVERY-001: matching receipt clears pending so cash minimum and all truncation work normally again', async t => {
  let originalPayload
  const f = await setup(t, {transport:c => {
    if (c.method === 'POST' && c.data.payment_method === 'diamonds') {originalPayload = c.data; return {error:{errMsg:'request:fail timeout'}}}
    if (c.url.includes('/withdrawals/diamond/')) return receipt(originalPayload)
  }})
  f.method(4); f.input(0,'2'); await f.tap(); await f.tap()
  assert.equal(pending(f), undefined)
  f.method(0); f.all()
  f.input(1,'现金本人'); f.input(2,'cash-account'); await f.tap()
  assert.equal(posts(f)[1].data.amount, 12.9)
  f.input(0,'0.1'); f.input(1,'现金本人'); f.input(2,'cash-account'); await f.tap()
  assert.equal(posts(f)[2].data.amount, 0.1)
  assert.equal(posts(f)[2].data.payment_method, 'wechat')
  assert.equal(posts(f)[2].data.request_id, undefined)
  assert.deepEqual(f.calls.success, ['已到账2钻石', '提现申请已提交，等待财务审核', '提现申请已提交，等待财务审核'])
  assert.doesNotMatch(f.text(), /恢复原兑换请求|原兑换.*结果待确认/)
})
