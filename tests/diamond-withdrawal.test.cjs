const {test} = require('node:test'), assert = require('node:assert/strict')
const {setup, tick, receipt, deferred} = require('./diamond-withdrawal-harness.cjs')
const pendingValues = f => Object.values(f.storage).filter(v=>v?.state === 'pending')
const posts = f => f.calls.request.filter(c=>c.method==='POST')
const recovery = f => f.calls.request.filter(c=>c.url.includes('/withdrawals/diamond/'))
test('diamond: actual SFC selects integer conversion, floors only all and switches cash validation dynamically', async t => {
  const f = await setup(t)
  assert.match(f.text(), /微信/)
  const picker = f.tree().find(n=>n.type==='picker')
  assert.ok(picker.props.range.includes('提现为钻石'))
  f.method(picker.props.range.indexOf('提现为钻石'))
  assert.equal(f.tree().filter(n=>n.type==='input').length,2)
  f.all()
  assert.match(f.text(), /扣12鱼干，到账12钻石/)
  assert.doesNotMatch(f.text(), /预计折合人民币/)
  assert.equal(f.button().props.disabled,false)
  f.input(0,'1.9')
  assert.equal(f.button().props.disabled,true)
  assert.match(f.text(),/整数/)
  f.method(0)
  assert.match(f.text(),/收款人/)
  assert.match(f.text(),/预计折合人民币/)
})
test('diamond: confirmation lock persists UUID before real API POST, uses returned completed DTO and refreshes own two scopes', async t => {
  const gate = deferred()
  const f = await setup(t, { confirm: () => gate.promise, history: [receipt({ request_id:'31a05346-a523-4fd3-8fe5-eabecb86f609', diamond_amount:7 })], transport: c => c.method === 'POST' ? receipt({...c.data, diamond_amount:7}) : undefined })
  f.method(4); f.all(); f.tap(); f.tap(); await tick()
  assert.equal(f.calls.confirm.length,1)
  assert.match(f.calls.confirm[0][0],/扣12鱼干，到账12钻石/)
  assert.match(f.calls.confirm[0][0],/本人钻石钱包/)
  assert.equal(f.button().props.disabled,true)
  gate.resolve(true); await tick(); await tick()
  const posts = f.calls.request.filter(c=>c.method==='POST')
  assert.equal(posts.length,1)
  assert.equal(posts[0].url,'/player/earnings/withdrawals')
  assert.deepEqual(Object.keys(posts[0].data).sort(),['amount','payment_method','request_id','request_note'])
  assert.equal(posts[0].data.amount,'12')
  assert.match(posts[0].data.request_id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.ok(Object.values(posts[0].storage).some(v=>v?.request_id === posts[0].data.request_id && v.amount === '12' && v.player_id === 11 && v.profile_id === 41))
  assert.deepEqual(f.calls.success,['已到账7钻石'])
  assert.match(f.text(),/兑换7钻石/)
  assert.match(f.text(),/已兑换/)
  assert.match(f.text(),/本人钻石钱包/)
  assert.doesNotMatch(f.text(),/收款账号|转账流水|折合人民币/)
  assert.equal(f.calls.saved.at(-1).wallet.balance_diamonds,12.5)
  assert.equal(f.calls.request.filter(c=>c.url.endsWith('/overview')).length,2)
  assert.ok(!Object.values(f.storage).some(v=>v?.request_id === posts[0].data.request_id))
})
test('diamond: lost POST response survives reopening and onShow restores original key via GET, not a second debit', async t => {
  const f = await setup(t, { transport: c => c.method === 'POST' ? {error:{errMsg:'request:fail timeout'}} : undefined })
  f.method(4);f.all();await f.tap();await tick()
  const original = posts(f)[0].data
  assert.equal(pendingValues(f).length,1)
  assert.equal(f.button().props.disabled,false)
  assert.match(f.text(),/恢复.*兑换/)
  const reopened = await setup(t, {storage:f.storage, transport:c=>c.url.includes('/withdrawals/diamond/') ? receipt(original) : undefined})
  assert.equal(recovery(reopened).length,1)
  assert.equal(recovery(reopened)[0].url,`/player/earnings/withdrawals/diamond/${original.request_id}`)
  assert.equal(posts(reopened).length,0)
  assert.deepEqual(reopened.calls.success,['已到账12钻石'])
  assert.equal(pendingValues(reopened).length,0)
})
test('diamond: uncertain 500, offline recovery and rejected retry keep key; explicit missing GET allows only same original POST', async t => {
  let mode='post500'
  const f = await setup(t,{transport:c=> {
    if(c.method === 'POST') return mode === 'reject' ? {error:{statusCode:400,amount:['可提现余额不足']}} : mode === 'success' ? receipt(c.data) : {error:{statusCode:500,detail:'服务暂不可用'}}
    if(c.url.includes('/withdrawals/diamond/')) return mode === 'offline' ? {error:{errMsg:'request:fail offline'}} : mode === 'get500' ? {error:{statusCode:500,detail:'恢复失败'}} : {error:{statusCode:404,detail:'未找到'}}
  }})
  f.method(4); f.input(0,'3'); await f.tap()
  const original = posts(f)[0].data
  assert.equal(pendingValues(f).length,1)
  for(const m of ['offline','get500']) {mode=m; await f.tap(); assert.equal(posts(f).length,1);assert.equal(pendingValues(f)[0].request_id,original.request_id);assert.equal(f.button().props.disabled,false)}
  mode='reject';f.input(0,'9');await f.tap()
  assert.equal(posts(f).length,2)
  assert.deepEqual(posts(f)[1].data,original)
  // A 400 about this retry cannot prove the earlier 500 did not commit.
  assert.equal(pendingValues(f)[0].request_id,original.request_id)
  assert.match(f.calls.toast.at(-1),/余额不足/)
  assert.equal(f.calls.success.length,0)
  mode='success';f.input(0,'2');await f.tap()
  assert.deepEqual(posts(f)[2].data,original)
  assert.equal(pendingValues(f).length,0)
  assert.deepEqual(f.calls.success,['已到账3钻石'])
})
test('diamond: account switch clears old form and pending UI; delayed old confirmations never use new token', async t => {
  const gate=deferred(), f=await setup(t,{confirm:()=>gate.promise})
  f.method(4);f.input(0,'3'); const running=f.tap();await tick()
  f.storage.token='session-B';f.storage.client_profile={id:42,player:{id:12}}
  f.uni.$emit('auth-session-changed');await f.refresh()
  gate.resolve(true);await running
  assert.equal(posts(f).length,0)
  f.method(4)
  assert.equal(f.button().props.disabled,true)
  assert.doesNotMatch(f.text(),/扣3鱼干/)
  f.input(0,'2');await f.tap()
  assert.equal(posts(f).length,1)
  assert.equal(posts(f)[0].header.Authorization,'Bearer session-B')
  assert.equal(posts(f)[0].data.amount,'2')
})
test('diamond: old pending belongs only to original player/profile and relogin restores same key with fresh token', async t => {
  const f=await setup(t,{transport:c=>c.method==='POST'?{error:{errMsg:'request:fail timeout'}}:undefined})
  f.method(4);f.input(0,'3');await f.tap()
  const original=posts(f)[0].data
  f.storage.token='session-B';f.storage.client_profile={id:42,player:{id:12}}
  f.uni.$emit('auth-session-changed');await f.refresh();f.method(4)
  assert.equal(recovery(f).length,0)
  assert.equal(f.button().props.disabled,true)
  assert.equal(pendingValues(f).length,1)
  f.storage.token='session-A-fresh';f.storage.client_profile={id:41,player:{id:11}}
  f.uni.$emit('auth-session-changed');await f.refresh()
  assert.equal(recovery(f).length,1)
  assert.match(recovery(f)[0].header.Authorization,/session-A-fresh$/)
  assert.equal(recovery(f)[0].url,`/player/earnings/withdrawals/diamond/${original.request_id}`)
  assert.equal(posts(f).length,1)
})
test('diamond: a pending request saved while confirmation is open cannot be overwritten by another page', async t => {
  const gate=deferred(), f=await setup(t,{confirm:()=>gate.promise})
  f.method(4);f.input(0,'2');const running=f.tap();await tick()
  const pending={player_id:11,profile_id:41,amount:'3',request_id:'31a05346-a523-4fd3-8fe5-eabecb86f609',request_note:'original',state:'pending'}
  f.storage['diamond_withdrawal_pending:41:11']=pending
  gate.resolve(true);await running
  assert.equal(posts(f).length,0)
  assert.equal(pendingValues(f)[0].request_id,pending.request_id)
  assert.match(f.text(),/恢复原兑换请求/)
  await f.tap()
  assert.equal(posts(f).length,1)
  assert.equal(posts(f)[0].data.amount,'3')
  assert.equal(posts(f)[0].data.request_id,pending.request_id)
})
test('diamond: hide during confirmation cancels old work and restores an interactive empty page', async t => {
  const gate=deferred(), f=await setup(t,{confirm:()=>gate.promise})
  f.method(4);f.input(0,'2');const running=f.tap();await tick()
  f.hooks.hide.forEach(fn=>fn());await f.refresh()
  gate.resolve(true);await running
  assert.equal(posts(f).length,0)
  f.method(4);f.input(0,'1')
  assert.equal(f.button().props.disabled,false)
})
test('diamond: first approved-player synchronization may populate cached player before loading overview', async t => {
  const f=await setup(t,{storage:{token:'session-A',client_profile:{id:41}},approved:s=>{s.client_profile.player={id:11};return true}})
  f.method(4);f.input(0,'1')
  assert.equal(f.button().props.disabled,false)
  assert.match(f.text(),/12.99/)
})
test('diamond: switching away during cash confirmation also prevents posting an old amount to the new token actor', async t => {
  const gate=deferred(), f=await setup(t,{confirm:()=>gate.promise})
  f.input(0,'0.1');f.input(1,'旧收款人');f.input(2,'old-account')
  const running=f.tap();await tick()
  f.storage.token='session-B';f.storage.client_profile={id:42,player:{id:12}};f.uni.$emit('auth-session-changed');await f.refresh()
  gate.resolve(true);await running
  assert.equal(posts(f).length,0)
})
test('diamond: late old receipt cannot erase a newer unresolved request recovered by another page',async t=>{
 const gate=deferred();let original
 const f=await setup(t,{transport:c=>{if(c.method==='POST'){original=c.data;return gate.promise}}})
 f.method(4);f.input(0,'2');const running=f.tap();await tick()
 const newer={player_id:11,profile_id:41,amount:'3',request_id:'31a05346-a523-4fd3-8fe5-eabecb86f609',request_note:'newer pending',state:'pending'}
 f.storage['diamond_withdrawal_pending:41:11']=newer
 gate.resolve(receipt(original));await running
 assert.deepEqual(pendingValues(f),[newer])
 assert.match(f.text(),/恢复原兑换请求/)
})
