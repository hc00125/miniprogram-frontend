const {test}=require('node:test');const assert=require('node:assert/strict');
const {setup,catalog,quote}=require('./patronage-harness.cjs');
const {helpSection}=require('./help-content-harness.cjs');
test('day pass shows seven pricing hours with server total, keeps bonus and no automatic timer',async()=>{
 const c=catalog();c.packages.find(x=>x.code==='day_pass').amount_yuan='280.00';c.packages.find(x=>x.code==='day_pass').amount_diamonds='2800.0';
 const p=setup('src/pages/client/patronage/index.vue',{getPatronageCatalog:async()=>c,getPatronageQuote:async(id,code)=>({...quote(),package_code:code,amount_yuan:code==='day_pass'?'280.00':'188.00',amount_diamonds:code==='day_pass'?'2800.0':'1880.0'})});
 p.life.load[0]({playerId:'7'});await p.life.show[0]();await p.action('package-day_pass').props.onTap();
 const rules=helpSection('user-guide','patronage');
 assert.match(rules,/7小时/);assert.match(p.text(),/2800.0 钻/);assert.doesNotMatch(p.text(),/8小时|8 × 0.85/);assert.match(p.text(),/赠送一周冠名/);assert.match(rules,/赠送一周冠名（7天）/);assert.match(rules,/不自动计时/);assert.match(rules,/不限制服务时长/);p.scope.stop();
});
