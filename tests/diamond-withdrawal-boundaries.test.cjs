const {test}=require('node:test'),assert=require('node:assert/strict')
const {setup,tick,receipt,deferred}=require('./diamond-withdrawal-harness.cjs')
const posts=f=>f.calls.request.filter(c=>c.method==='POST')
const pending=f=>Object.values(f.storage).filter(v=>v?.state==='pending')
for(const [balance,amount] of [['12.999999999999999999','12'],['1.000000000000000001','1'],['00012.99','12']]) {
 test(`diamond boundary: decimal-string all ${balance} deducts only ${amount}`,async t=>{
  const f=await setup(t,{balance});f.method(4);f.all();await f.tap()
  assert.equal(posts(f)[0].data.amount,amount)
  assert.match(f.calls.confirm[0][0],new RegExp(`扣${amount}鱼干，到账${amount}钻石`))
 })
}
test('diamond boundary: all below one explicitly explains retained remainder and never posts',async t=>{
 const f=await setup(t,{balance:'0.99'});f.method(4);f.all();await f.tap()
 assert.match(f.calls.toast.join('|'),/不足1鱼干.*余数保留/)
 assert.equal(posts(f).length,0);assert.equal(f.button().props.disabled,true)
})
for(const amount of ['1.9','1.0','0','-1','NaN','Infinity','1e2','9007199254740992',' 1','01']) {
 test(`diamond boundary: manual ${amount} is rejected without rounding`,async t=>{
  const f=await setup(t);f.method(4);f.input(0,amount);await f.tap()
  assert.equal(posts(f).length,0);assert.match(f.calls.toast.at(-1),/整数.*最低/)
 })
}
for(const options of [{allowed:false},{debt:1}]) {
 test(`diamond boundary: permission ${JSON.stringify(options)} blocks conversion`,async t=>{
  const f=await setup(t,options);f.method(4);f.input(0,'1');await f.tap()
  assert.equal(posts(f).length,0);assert.match(f.calls.toast.at(-1),/欠款|暂不能提现/)
 })
}
test('diamond boundary: native WeChat random bytes create lowercase v4 UUID',async t=>{
 const f=await setup(t,{nativeUUID:true});f.method(4);f.input(0,'1');await f.tap()
 assert.equal(posts(f)[0].data.request_id,'03142536-4758-497a-8b9c-adbecfe0f102')
})
test('diamond boundary: storage failure aborts before any POST and releases busy state',async t=>{
 const f=await setup(t,{storageFail:true});f.method(4);f.input(0,'1');await f.tap()
 assert.equal(posts(f).length,0);assert.equal(f.button().props.disabled,false)
 assert.match(f.calls.toast.at(-1),/storage full/)
})
for(const fields of [{status:'processing'},{payment_method:'wechat'},{target_profile_id:42},{actor_user_id:null},{diamond_amount:1.5},{diamond_amount:null},{request_id:'wrong'},{diamond_balance_after:null}]) {
 test(`diamond boundary: unconfirmed or foreign DTO ${JSON.stringify(fields)} cannot claim success or discard key`,async t=>{
  const f=await setup(t,{transport:c=>c.method==='POST'?receipt({...c.data,...fields}):undefined})
  f.method(4);f.input(0,'2');await f.tap()
  assert.equal(f.calls.success.length,0);assert.equal(pending(f).length,1);assert.equal(f.button().props.disabled,false)
  assert.match(f.calls.toast.at(-1),/结果尚未确认/)
 })
}
test('diamond boundary: fractional existing wallet snapshot is rendered without truncation and cash history remains cash',async t=>{
 const f=await setup(t,{history:[receipt({request_id:'31a05346-a523-4fd3-8fe5-eabecb86f609',transfer_no:'must-hide'}),{...receipt(),withdrawal_no:'cash-1',payment_method:'wechat',status_text:'已打款',payment_method_text:'微信',diamond_amount:null,account_name:'现金收款人',account_no_masked:'wx***',transfer_no:'cash-transfer'}]})
 f.tree().find(n=>n.type==='view'&&n.children==='提现记录').props.onTap()
 assert.match(f.text(),/12.5 钻石/);assert.doesNotMatch(f.text(),/must-hide/)
 assert.match(f.text(),/现金收款人 · wx\*\*\*/);assert.match(f.text(),/cash-transfer/);assert.match(f.text(),/已兑换/)
})
test('diamond boundary: late POST success after account switch updates neither new overview nor new consumption profile',async t=>{
 const gate=deferred();let original
 const f=await setup(t,{transport:c=>{if(c.method==='POST'){original=c.data;return gate.promise}}})
 f.method(4);f.input(0,'2');const running=f.tap();await tick()
 f.storage.token='session-B';f.storage.client_profile={id:42,player:{id:12}};f.uni.$emit('auth-session-changed');await f.refresh()
 const reads=f.calls.request.length
 gate.resolve(receipt(original));await running
 assert.equal(f.calls.request.length,reads);assert.equal(f.calls.saved.length,0);assert.equal(f.calls.success.length,0)
 assert.equal(pending(f).length,1)
})
test('diamond boundary: late recovery 404 never sends old amount using newly logged-in token',async t=>{
 const gate=deferred();let recoverWait=false
 const f=await setup(t,{transport:c=>c.method==='POST'?{error:{errMsg:'offline'}}:c.url.includes('/withdrawals/diamond/')&&recoverWait?gate.promise:undefined})
 f.method(4);f.input(0,'2');await f.tap();recoverWait=true
 const running=f.tap();await tick()
 f.storage.token='session-B';f.storage.client_profile={id:42,player:{id:12}};f.uni.$emit('auth-session-changed');await f.refresh()
 gate.resolve({error:{statusCode:404,detail:'未找到'}});await running
 assert.equal(posts(f).length,1);assert.equal(pending(f).length,1)
})
test('diamond boundary: malformed persistent UUID is not normalized, overwritten or posted',async t=>{
 const bad={player_id:11,profile_id:41,amount:'2',request_id:'31A05346-a523-4fd3-8fe5-eabecb86f609',request_note:'',state:'pending'}
 const f=await setup(t,{storage:{token:'session-A',client_profile:{id:41,player:{id:11}},'diamond_withdrawal_pending:41:11':bad}})
 f.method(4);f.input(0,'1');await f.tap()
 assert.equal(posts(f).length,0);assert.deepEqual(pending(f),[bad]);assert.match(f.calls.toast.at(-1),/存储异常/)
})
test('diamond boundary: receipt actor identity must match previous receipt identity for this profile/player',async t=>{
 const f=await setup(t,{storage:{token:'session-A',client_profile:{id:41,player:{id:11}},'diamond_withdrawal_actor:41:11':999}})
 f.method(4);f.input(0,'1');await f.tap()
 assert.equal(f.calls.success.length,0);assert.equal(pending(f).length,1)
})
test('diamond boundary: decline confirmation performs no POST and persists no pending key',async t=>{
 const f=await setup(t,{confirm:()=>false});f.method(4);f.input(0,'1');await f.tap()
 assert.equal(posts(f).length,0);assert.equal(pending(f).length,0);assert.equal(f.button().props.disabled,false)
})
test('diamond boundary: real iOS purchase-disabled classifier does not route conversion through external payment',async t=>{
 const f=await setup(t,{iosDisabled:true});f.method(4);f.input(0,'1');await f.tap()
 assert.equal(posts(f).length,1)
 assert.equal(posts(f)[0].url,'/player/earnings/withdrawals')
 assert.equal(posts(f)[0].header['X-Client-Platform'],'ios')
 assert.deepEqual(f.calls.success,['已到账1钻石'])
 assert.ok(f.calls.request.every(c=>!c.url.startsWith('/pay/')&&!c.url.includes('/recharge/')))
})
