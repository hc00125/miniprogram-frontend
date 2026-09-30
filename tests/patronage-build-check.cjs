// Run actual WeChat-compiled page, API parser and journal. Only platform/HTTP are fixtures.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),vue=require('vue')
const {catalog,quote}=require('./patronage-harness.cjs')
const root=path.join(__dirname,'../dist/build/mp-weixin'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),tick=()=>new Promise(setImmediate)
const app=JSON.parse(read('app.json'))
assert.equal(app.pages[0],'pages/boss/home/index');assert.equal(app.tabBar.list.length,5)
for(const file of ['pages/client/patronage/index','pages/client/patronage/records','components/PatronageCrowns'])for(const ext of ['js','json','wxml','wxss'])assert.ok(fs.statSync(path.join(root,`${file}.${ext}`)).size)
for(const file of ['pages/client/patronage/index','pages/client/patronage/records'])assert.ok(app.pages.includes(file))
const wxml=read('pages/client/patronage/index.wxml'),purchaseButton=wxml.match(/<button[^>]*data-action="purchase"[^>]*>/)[0]
assert.match(purchaseButton,/disabled="{{\w+}}"/);assert.doesNotMatch(purchaseButton,/disabled="{{true}}"/);assert.match(purchaseButton,/bindtap/)
assert.match(wxml,/8小时仅为计价说明/);assert.match(wxml,/0.5元步长/);assert.match(wxml,/同老板同陪玩续购累加/)
assert.match(wxml,/赠送一周冠名（7天），按同一规则累加/)
assert.match(read('pages/client/patronage/index.wxss'),/\.purchase-button[^}]*width:100%/)
assert.match(read('pages/client/patronage/index.wxss'),/safe-area-inset-bottom/)
assert.match(read('pages/player/detail/index.wxml'),/<patronage-crowns/);assert.match(read('pages/player/detail/index.wxml'),/<gift-host/)
assert.match(read('pages/client/profile/index.wxml'),/冠名 \/ 包天记录/)
assert.ok(fs.existsSync(path.join(root,'utils/patronagePaymentIntent.js')),'real controller must be in the purchase dependency graph')
assert.match(read('api/patronage.js'),/purchases\/pending/);assert.doesNotMatch(read('api/patronage.js'),/requestPayment|requestVirtualPayment/)
for(const file of ['index','records'])assert.match(read(`pages/client/patronage/${file}.wxml`),/暂不提供自助退款/)
const record=(key,status='paid')=>({purchase_no:'PN-'+key,idempotency_key:key,price_version:'a'.repeat(64),player_id:7,player_name:'陪玩甲',package_code:'day',package_name:'日冠',amount_yuan:'188.00',amount_diamonds:'1880.0',payment_status:status,created_at:'2026-09-29T00:00:00Z',paid_at:status==='paid'?'2026-09-29T00:01:00Z':null,starts_at:status==='paid'?'2026-09-29T00:01:00Z':null,expires_at:status==='paid'?'2026-09-30T00:01:00Z':null,bonus_naming_days:0,blockers:[]})
function load(file,options={}){
 const hooks={},events={},calls=[],requests=[],modals=[],storage={token:'fixture-token',client_profile:{id:1}},cache={}
 let C,enabled=options.enabled!==false,status='paid',pendingCount=0
 const index={getStorageSync:k=>storage[k],setStorageSync:(k,v)=>storage[k]=JSON.parse(JSON.stringify(v)),removeStorageSync:k=>delete storage[k],$on:(name,f)=>events[name]=f,$off:name=>delete events[name],$emit:(name,...args)=>events[name]?.(...args),showModal:o=>modals.push(o),login:o=>o.success({code:'fixture-code'}),request:o=>{
  requests.push(o);assert.ok(o.url.startsWith('https://fixture.invalid/api/patronage/'));assert.equal(o.header.Authorization,'Bearer fixture-token')
  const endpoint=o.url.split('/patronage/')[1]
  if(options.timeout&&endpoint==='purchases/'){o.fail({errMsg:'fixture timeout'});return}
  const c=catalog();c.purchase_enabled=enabled
  c.packages.push({code:'year',name:'年冠',kind:'naming',duration_days:365,amount_yuan:'9999.00',amount_diamonds:'99990.0',available:true,blockers:[]})
  const data=endpoint==='catalog/'?c:endpoint==='quotes/'?{...quote(),can_submit:enabled,blockers:enabled?[]:['PURCHASE_NOT_ENABLED']}:
   endpoint==='purchases/pending/'?{count:pendingCount,next:pendingCount?'https://evil.invalid':null,previous:null,results:[]}:
   endpoint==='records/'?{count:1,next:null,previous:null,results:[record('record-key','unknown')]}:record(o.data.idempotency_key,status)
  o.success({statusCode:200,data})
 }}
 const vendor={...vue,index,onLoad:f=>hooks.load=f,onShow:f=>hooks.show=f,onHide:f=>hooks.hide=f,onUnload:f=>hooks.unload=f,onUnmounted(){},_export_sfc:x=>x,e:Object.assign,t:String,o:x=>x,p:x=>x,f:(items,fn)=>items.map(fn)}
 function module(file){
  if(cache[file])return cache[file]
  if(file==='common/vendor.js')return vendor
  if(file==='utils/request.js')return {BASE_URL:'https://fixture.invalid/api'}
  if(file==='utils/nav.js')return {go:(...args)=>calls.push(args)}
  if(file==='utils/purchaseAvailability.js')return {getClientPlatform:()=>options.ios?'ios':'android',isIOSPurchaseEnabled:()=>!options.ios}
  const exports={};cache[file]=exports
  vm.runInNewContext(read(file),{require:name=>module(path.posix.normalize(path.posix.join(path.posix.dirname(file),name))),wx:{createPage:c=>C=c,createComponent:c=>C=c},console,exports,getCurrentPages:()=>[]},{filename:file})
  return exports
 }
 module(file+'.js');const scope=vue.effectScope(),render=scope.run(()=>C.setup({}, {expose(){}})),draw=()=>render({},{})
 function tag(action){return read(file+'.wxml').match(new RegExp('<button[^>]*data-action="'+action+'"[^>]*>'))[0]}
 return {hooks,events,calls,scope,requests,modals,storage,setStatus:v=>status=v,setPending:v=>pendingCount=v,setEnabled:v=>enabled=v,render:draw,text:()=>JSON.stringify(draw(),(_,v)=>typeof v==='function'?'[event]':v),disabled(action){const key=tag(action).match(/disabled="{{(\w+)}}"/)[1];return draw()[key]},tap(action){const key=tag(action).match(/bindtap="{{(\w+)}}"/)[1];return draw()[key]()}}
}
async function confirm(page,action='purchase'){
 const task=page.tap(action);await tick();assert.ok(page.modals.length);page.modals.at(-1).success({confirm:true});await task
}
async function run(){
 for(const options of [{enabled:false},{ios:true}]){
  const page=load('pages/client/patronage/index',options);page.hooks.load({playerId:'7'});await page.hooks.show();assert.equal(page.disabled('purchase'),true);await page.tap('purchase');assert.equal(page.modals.length,0);assert.equal(page.requests.filter(o=>o.url.endsWith('/purchases/')).length,0);page.scope.stop()
 }
 const page=load('pages/client/patronage/index');page.hooks.load({playerId:'7'});await page.hooks.show();assert.equal(page.disabled('purchase'),false);assert.match(page.text(),/2000.0/);assert.match(page.text(),/365天（1年）/)
 const task=page.tap('purchase');await tick();await page.tap('purchase');assert.equal(page.modals.length,1);page.modals[0].success({confirm:true});await task
 const posts=()=>page.requests.filter(o=>o.url.endsWith('/purchases/'));assert.equal(posts().length,1);assert.equal(page.requests.at(-1).url.endsWith('/by-key/'),true);assert.equal(page.requests.at(-1).data.idempotency_key,posts()[0].data.idempotency_key);assert.match(page.text(),/购买成功/)
 await confirm(page,'buy-again');assert.equal(posts().length,2);assert.notEqual(posts()[0].data.idempotency_key,posts()[1].data.idempotency_key);assert.equal(Object.keys(page.storage).filter(k=>k.includes(':archive:')).length,1)
 page.tap('support');assert.equal(JSON.stringify(page.calls[0]),JSON.stringify(['/pages/client/customer-service/index']));page.hooks.hide();assert.doesNotMatch(page.text(),/2000.0/);page.scope.stop()
 const recovery=load('pages/client/patronage/index',{timeout:true});recovery.hooks.load({playerId:'7'});await recovery.hooks.show();await confirm(recovery);assert.doesNotMatch(recovery.text(),/购买成功/);const original=recovery.requests.find(o=>o.url.endsWith('/purchases/')).data.idempotency_key
 recovery.hooks.hide();await recovery.hooks.show();assert.equal(recovery.disabled('purchase'),true);await recovery.tap('recover');assert.match(recovery.text(),/购买成功/);assert.equal(recovery.requests.at(-1).data.idempotency_key,original);assert.equal(recovery.requests.filter(o=>o.url.endsWith('/purchases/')).length,1);recovery.scope.stop()
 const blocked=load('pages/client/patronage/index');blocked.setPending(30);blocked.hooks.load({playerId:'7'});await blocked.hooks.show();assert.equal(blocked.disabled('purchase'),true);await blocked.tap('purchase');assert.equal(blocked.modals.length,0);blocked.scope.stop()
 const records=load('pages/client/patronage/records');await records.hooks.show();assert.match(records.text(),/支付结果待确认/);assert.match(records.text(),/PN-record-key/);records.tap('support');records.events['session:expired']('token');assert.doesNotMatch(records.text(),/PN-record-key/);records.scope.stop()
 console.log('PASS actual WeChat setup/render + compiled API/controller: enabled confirmation, double tap, POST→GET, explicit new key/archive, timeout original-key recovery, disabled/iOS/count gates, records, support, privacy cleanup, routes/5 tabs/styles. No live network or real funds.')
}
run().catch(error=>{console.error(error);process.exitCode=1})
