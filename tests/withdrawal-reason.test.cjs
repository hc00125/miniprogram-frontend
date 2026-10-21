const {test}=require('node:test')
const assert=require('node:assert/strict')
const {setup}=require('./diamond-withdrawal-harness.cjs')
test('0.1鱼干可提交，各项失败均有明确原因',async t=>{
 const f=await setup(t,{balance:100})
 f.input(0,'0.1');assert.match(f.text(),/收款人/)
 f.input(1,'测试');assert.match(f.text(),/收款账号/)
 f.input(2,'test');assert.equal(f.button().props.disabled,false)
 for(const [amount,reason] of [['0.09',/最低/],['101',/余额/],['1.11',/小数/],['Infinity',/有效/]]) {
  f.input(0,amount);assert.equal(f.button().props.disabled,true);assert.match(f.text(),reason)
 }
 const debt=await setup(t,{debt:1});debt.input(0,'0.1');assert.match(debt.text(),/欠款/)
 const restricted=await setup(t,{allowed:false});restricted.input(0,'0.1');assert.match(restricted.text(),/暂不能提现/)
 f.input(0,'0.1');await f.tap()
 assert.deepEqual(f.calls.request.find(c=>c.method==='POST').data,{amount:0.1,payment_method:'wechat',account_name:'测试',account_no:'test',request_note:''})
 assert.deepEqual(f.calls.success,['提现申请已提交，等待财务审核'])
 assert.match(f.calls.confirm[0][0],/折合人民币¥0.01/)
})
