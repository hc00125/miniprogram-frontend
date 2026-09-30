const { test } = require('node:test')
const assert = require('node:assert/strict')
const { harness } = require('./commerce-sfc-harness.cjs')
const catalog = () => ({contract_version:'1.0',purchase_enabled:false,player:{id:7,name:'陪玩',avatar_url:'',hourly_rate_yuan:'50.00'},commission_rate:'0.25',packages:[{code:'day',kind:'naming',name:'日冠',duration_days:1,amount_yuan:'188.00',amount_diamonds:'1880.0',available:true,blockers:[]},{code:'day_pass',kind:'day_pass',name:'包天',duration_days:null,amount_yuan:null,amount_diamonds:null,available:false,blockers:['HOURLY_RATE_UNSET'],bonus_naming_days:7}]})
const quote = () => ({contract_version:'1.0',player_id:7,package_code:'day',amount_yuan:'188.00',amount_diamonds:'1880.0',commission_rate:'0.25',platform_amount_yuan:'47.00',player_amount_yuan:'141.00',price_version:'a'.repeat(64),available_diamonds:'2000.0',can_submit:false,blockers:['PURCHASE_NOT_ENABLED']})
test('quote is authenticated read-only POST; exact prices survive and malformed quotes fail closed',async()=>{
 const h=apiHarness();let sent;h.uni.request=o=>{sent=o;o.success({statusCode:200,data:quote()})};const q=await h.api.getPatronageQuote(7,'day');assert.equal(sent.method,'POST');assert.equal(sent.url,'https://fixture.invalid/api/patronage/quotes/');assert.deepEqual(sent.data,{player_id:7,package_code:'day'});assert.equal(q.amount_yuan,'188.00');assert.equal(q.can_submit,false)
 for(const modify of [v=>v.available_diamonds=2000,v=>v.price_version='',v=>v.can_submit='true',v=>v.player_amount_yuan='-1']){const v=quote();modify(v);assert.throws(()=>h.api.parsePatronageQuote(v),/响应/)}
 delete h.storage.token;await assert.rejects(h.api.getPatronageQuote(7,'day'),/登录/)
})
const crown = (id=1) => ({id,boss_name:`老板${id}`,boss_avatar_url:'',package_name:'周冠',starts_at:'2026-09-01T00:00:00+08:00',expires_at:'2026-10-01T00:00:00+08:00',source:'purchase'})
const record = () => ({purchase_no:'PN1',idempotency_key:'key',price_version:'a'.repeat(64),player_id:7,player_name:'陪玩',package_code:'day',package_name:'日冠',amount_yuan:'188.00',amount_diamonds:'1880.0',payment_status:'unknown',created_at:'2026-09-01T00:00:00Z',paid_at:null,starts_at:null,expires_at:null,bonus_naming_days:0,blockers:[]})
test('crowns are multiple, expired/future/invalid dates never displayed',async()=>{
 const h=apiHarness();h.uni.request=o=>o.success({statusCode:200,data:{results:[crown(1),{...crown(2),source:'day_pass_bonus'},{...crown(3),expires_at:'2026-09-02T00:00:00Z'},{...crown(4),starts_at:'2027-01-01T00:00:00Z'},{...crown(5),expires_at:'bad'}]}})
 const r=await h.api.getPatronageCrowns(7,Date.parse('2026-09-20T00:00:00Z'));assert.deepEqual(r.map(v=>v.id),[1,2]);assert.equal(r[1].source,'day_pass_bonus')
})
test('records are client-only paginated GET, statuses remain distinct and unknown is never paid',async()=>{
 const h=apiHarness();let sent;h.uni.request=o=>{sent=o;o.success({statusCode:200,data:{count:1,next:'https://evil.invalid',previous:null,results:[record()]}})}
 const r=await h.api.getPatronageRecords(2);assert.equal(sent.url,'https://fixture.invalid/api/patronage/records/');assert.deepEqual(sent.data,{page:2});assert.equal(r.results[0].payment_status,'unknown');assert.equal(h.api.patronagePaymentLabel('unknown'),'支付结果待确认');assert.equal(h.api.patronagePaymentLabel('paid'),'已支付');assert.notEqual(h.api.patronagePaymentLabel('created'),'已支付')
 assert.throws(()=>h.api.parsePatronageRecords({count:1,next:null,previous:null,results:[{...record(),payment_status:'success'}]}),/响应/)
 delete h.storage.token;await assert.rejects(h.api.getPatronageRecords(),/登录/)
})
test('late responses cannot cross sessions and server failures reject without retry',async()=>{
 const h=apiHarness();let sent,calls=0;h.uni.request=o=>{sent=o;calls++};const pending=h.api.getPatronageCatalog(7);h.storage.token='different-session';sent.success({statusCode:200,data:catalog()});await assert.rejects(pending,/登录/);assert.equal(calls,1)
 const p=h.api.getPatronageCatalog(7);sent.success({statusCode:503,data:{detail:'暂不可用'}});await assert.rejects(p);assert.equal(calls,2)
})
function apiHarness(){const h=harness({'@/utils/sessionExpiry':{getClientSessionGeneration:()=> '0',handleSessionExpiry:()=>null}});return {...h,api:h.load('src/api/patronage.ts')}}
test('catalog reads exact contract, uses client token, preserves decimal strings and unavailable package',async()=>{
 const h=apiHarness();h.storage.admin_token='must-not-use';let sent
 h.uni.request=o=>{sent=o;o.success({statusCode:200,data:catalog()})}
 const result=await h.api.getPatronageCatalog(7)
 assert.equal(sent.url,'https://fixture.invalid/api/patronage/catalog/');assert.equal(sent.method,'GET');assert.deepEqual(sent.data,{player_id:7});assert.equal(sent.header.Authorization,'Bearer fixture-session-a')
 assert.equal(result.packages[0].amount_diamonds,'1880.0');assert.equal(result.packages[1].amount_diamonds,null);assert.equal(result.purchase_enabled,false)
})
test('strict catalog rejects non-string/nonfinite amounts, wrong version and ambiguous booleans',async()=>{
 for(const modify of [v=>v.packages[0].amount_diamonds=1880,v=>v.packages[0].amount_yuan='NaN',v=>v.packages[0].amount_yuan='1e3',v=>v.packages[0].amount_diamonds=null,v=>v.contract_version='2.0',v=>v.purchase_enabled='false',v=>v.commission_rate='25',v=>v.player.id=0]){
  const h=apiHarness(),v=catalog();modify(v);h.uni.request=o=>o.success({statusCode:200,data:v});await assert.rejects(h.api.getPatronageCatalog(7),/响应/)
 }
 const h=apiHarness(),v=catalog();v.commission_rate='0';v.packages[0].amount_diamonds='900719925474099312345.10';h.uni.request=o=>o.success({statusCode:200,data:v});const r=await h.api.getPatronageCatalog(7);assert.equal(r.commission_rate,'0');assert.equal(r.packages[0].amount_diamonds,'900719925474099312345.10')
 assert.equal(h.api.patronageRateLabel('0.25'),'25%');assert.equal(h.api.patronageRateLabel('0'),'0%');assert.equal(h.api.patronageRateLabel('0.0025'),'0.25%')
})
