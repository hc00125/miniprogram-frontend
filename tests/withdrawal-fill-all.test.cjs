const { test } = require('node:test')
const assert = require('node:assert/strict')
const { setup } = require('./diamond-withdrawal-harness.cjs')
test('全部提现截断到一位小数且不超过余额', async t => {
  for (const [balance, expected] of [[1198.39,'1198.3'],[1198.35,'1198.3'],[1198.3,'1198.3'],[10,'10'],[0.09,'0'],[0,'0'],[10.19,'10.1']]) {
    const f = await setup(t,{balance})
    f.all()
    f.input(1,'测试');f.input(2,'test')
    if(Number(expected) >= 0.1) {
      await f.tap()
      assert.equal(f.calls.request.find(c=>c.method==='POST').data.amount,Number(expected),`balance=${balance}`)
      assert.match(f.calls.confirm[0][0],new RegExp(`提现${Number(expected).toFixed(1).replace('.', '\\.')}鱼干`))
    } else { assert.equal(f.button().props.disabled,true);assert.match(f.text(),/最低/); }
    assert.ok(Number(expected) <= balance)
  }
})
test('禁提或欠款时不填入金额', async t => {
  for(const options of [{allowed:false},{debt:1}]) {
    const f=await setup(t,{balance:1198.39,...options})
    f.all();assert.equal(f.button().props.disabled,true)
    assert.doesNotMatch(f.text(),/预计折合人民币/)
    assert.equal(f.calls.request.filter(c=>c.method==='POST').length,0)
  }
})
