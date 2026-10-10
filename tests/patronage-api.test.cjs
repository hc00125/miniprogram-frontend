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
function apiHarness(sessionOverrides={}){const h=harness({'@/utils/sessionExpiry':{getClientSessionGeneration:()=> '0',handleSessionExpiry:()=>null,...sessionOverrides}});return {...h,api:h.load('src/api/patronage.ts')}}
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
const wallCrown=(id=1)=>({...crown(id),starts_at:new Date(Date.now()-60_000).toISOString(),expires_at:new Date(Date.now()+3_600_000).toISOString()})
const wall=()=>({contract_version:'1.0',count:2,results:[
 {player:{id:7,name:'陪玩甲',avatar_url:'https://fixture.invalid/player-7.png',type_name:'技术陪'},crowns:[wallCrown(1)]},
 {player:{id:9,name:'陪玩乙',avatar_url:'',type_name:''},crowns:[{...wallCrown(2),source:'day_pass_bonus'}]}
]})
test('wall summary is exactly one public GET and projects only public player/crown fields',async()=>{
 const h=apiHarness(),payload=wall(),calls=[];h.storage.admin_token='never-send-admin'
 payload.openid='private-root';payload.results[0].player.contact_wechat='private-contact';payload.results[0].player.openid='private-player';payload.results[0].crowns[0].idempotency_key='private-key';payload.results[0].crowns[0].boss_id=100
 h.uni.request=o=>{calls.push(o);o.success({statusCode:200,data:payload})}
 const entries=await h.api.getPatronageWallSummary()
 assert.equal(calls.length,1);assert.equal(calls[0].method,'GET');assert.equal(calls[0].url,'https://fixture.invalid/api/patronage/wall/');assert.equal(calls[0].data,undefined)
 assert.deepEqual(calls[0].header,{},'even logged-in wall reads must not send client or administrator credentials')
 assert.deepEqual(entries.map(entry=>entry.player.id),[7,9]);assert.equal(entries[1].crowns[0].source,'day_pass_bonus')
 assert.deepEqual(Object.keys(entries[0]),['player','crowns']);assert.deepEqual(Object.keys(entries[0].player),['id','name','avatar_url','type_name'])
 assert.deepEqual(Object.keys(entries[0].crowns[0]),['id','boss_name','boss_avatar_url','package_name','starts_at','expires_at','source'])
 assert.ok(!JSON.stringify(entries).includes('private-'));assert.equal(calls.length,1,'summary must not perform any per-player crown reads')
 delete h.storage.token;await h.api.getPatronageWallSummary();assert.deepEqual(calls[1].header,{},'anonymous wall must not fall back to administrator credentials')
})
test('only HTTP 404 returns the summary-not-deployed sentinel result; null/empty 200 stays an error',async()=>{
 for(const body of [null,{detail:'Not found.'}]){
  const h=apiHarness();let count=0;h.uni.request=o=>{count++;o.success({statusCode:404,data:body})}
  assert.equal(await h.api.getPatronageWallSummary(),null);assert.equal(count,1)
 }
 for(const data of [null,undefined,{},[],{contract_version:'1.0',count:0},false]){
  const h=apiHarness();let count=0;h.uni.request=o=>{count++;o.success({statusCode:200,data})}
  await assert.rejects(h.api.getPatronageWallSummary(),/响应/);assert.equal(count,1)
 }
 const h=apiHarness();h.uni.request=o=>o.success({statusCode:200,data:{contract_version:'1.0',count:0,results:[]}})
 assert.deepEqual(await h.api.getPatronageWallSummary(),[],'a complete empty wall is distinct from an undeployed endpoint')
 h.uni.request=o=>o.success({statusCode:404,data:{detail:'Not found.'}});await assert.rejects(h.api.getPatronageCatalog(7),error=>error.detail==='Not found.','other existing endpoint errors must retain their old rejection objects')
})
test('wall summary rejects malformed contracts, pagination, duplicate players and malformed crowns without retries',async()=>{
 const changes=[
  v=>v.contract_version='2.0',v=>delete v.contract_version,v=>v.count='2',v=>v.count=1,v=>v.count=3,v=>v.count=-1,
  v=>v.results={},v=>v.results[0]=null,v=>v.results[0].player=[],v=>v.results[0].player.id=0,v=>v.results[0].player.id=1.5,
  v=>v.results[0].player.id=Number.MAX_SAFE_INTEGER+1,v=>v.results[0].player.id='7',v=>v.results[0].player.name=null,
  v=>v.results[0].player.avatar_url=3,v=>delete v.results[0].player.type_name,v=>v.results[1].player.id=v.results[0].player.id,
  v=>v.results[0].crowns=[],v=>v.results[0].crowns=null,v=>v.results[0].crowns[0]=null,v=>v.results[0].crowns[0].id=0,
  v=>v.results[0].crowns[0].boss_name=7,v=>v.results[0].crowns[0].boss_avatar_url=null,v=>v.results[0].crowns[0].package_name=false,
  v=>v.results[0].crowns[0].source='admin',v=>v.results[0].crowns[0].starts_at='bad',v=>v.results[0].crowns[0].expires_at='bad',
  v=>v.results[0].crowns[0].expires_at=v.results[0].crowns[0].starts_at,
  v=>v.results[0].crowns.push({...v.results[0].crowns[0],boss_name:'conflicting identity'}),
  v=>v.results[1].crowns=[{...v.results[0].crowns[0]}],
  ...['next','previous','page','page_size','total_pages','has_more','pagination'].map(key=>v=>v[key]=null)
 ]
 for(const change of changes){
  const h=apiHarness(),data=wall();change(data);let calls=0;h.uni.request=o=>{calls++;o.success({statusCode:200,data})}
  await assert.rejects(h.api.getPatronageWallSummary(),/响应/);assert.equal(calls,1,'invalid summaries must not retry or fall back to per-player reads')
 }
})
test('wall rechecks expiry/future rights, deduplicates identical grants and validates expired rows before filtering',async()=>{
 const h=apiHarness(),payload=wall(),now=Date.now()
 payload.results[0].crowns.push({...payload.results[0].crowns[0]},
  {...wallCrown(3),starts_at:new Date(now-120_000).toISOString(),expires_at:new Date(now-60_000).toISOString()},
  {...wallCrown(4),starts_at:new Date(now+60_000).toISOString(),expires_at:new Date(now+120_000).toISOString()})
 payload.results[1].crowns=[{...wallCrown(5),starts_at:new Date(now-120_000).toISOString(),expires_at:new Date(now-60_000).toISOString()}]
 h.uni.request=o=>o.success({statusCode:200,data:payload})
 const entries=await h.api.getPatronageWallSummary();assert.deepEqual(entries.map(entry=>entry.player.id),[7]);assert.deepEqual(entries[0].crowns.map(grant=>grant.id),[1])
 payload.results[1].crowns[0].boss_name=null
 await assert.rejects(h.api.getPatronageWallSummary(),/响应/,'an expired malformed row must not be silently skipped')
})
test('public wall transport rejects errors without expiring the client; other endpoints retain their original expiry contract',async()=>{
 for(const status of [400,401,403,500,503]){
  const calls=[],body={detail:'fixture server error'},h=apiHarness({handleSessionExpiry:(...args)=>{calls.push(args);return null}});let requests=0
  h.uni.request=o=>{requests++;o.success({statusCode:status,data:body})}
  await assert.rejects(h.api.getPatronageWallSummary(),error=>error===body);assert.equal(requests,1)
  assert.deepEqual(calls,[],'a credential-free wall response must not invalidate the client session')
 }
 const calls=[],expiryError=new Error('fixture session expired'),body={detail:'expired'},h=apiHarness({handleSessionExpiry:(...args)=>{calls.push(args);return expiryError}})
 h.uni.request=o=>o.success({statusCode:401,data:body})
 await assert.rejects(h.api.getPatronageWallSummary(),error=>error===body);assert.equal(calls.length,0)
 await assert.rejects(h.api.getPatronageCatalog(7),error=>error===expiryError)
 assert.deepEqual(calls,[[401,body,'/patronage/catalog/','token','fixture-session-a']])
 let requests=0;h.uni.request=o=>{requests++;o.fail({errMsg:'fixture unavailable'})};await assert.rejects(h.api.getPatronageWallSummary(),/网络/);assert.equal(requests,1)
})
test('wall late responses cannot cross changed client tokens or same-token session generations, including 404',async()=>{
 for(const kind of ['token','generation'])for(const statusCode of [200,404]){
  let generation='0',sent,calls=0
  const h=apiHarness({getClientSessionGeneration:()=>generation});h.uni.request=o=>{sent=o;calls++}
  const pending=h.api.getPatronageWallSummary()
  if(kind==='token')h.storage.token='fixture-session-b';else generation='1'
  sent.success({statusCode,data:statusCode===200?wall():null})
  await assert.rejects(pending,/登录状态已改变/);assert.equal(calls,1)
 }
})
