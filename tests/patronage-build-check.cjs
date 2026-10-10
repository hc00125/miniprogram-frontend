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
assert.match(wxml,/7小时仅为计价说明/);assert.match(wxml,/时薪 × 7小时/);assert.match(wxml,/同老板同陪玩续购累加/)
assert.match(wxml,/赠送一周冠名（7天），按同一规则累加/)
assert.match(read('pages/client/patronage/index.wxss'),/\.purchase-button[^}]*width:100%/)
assert.match(read('pages/client/patronage/index.wxss'),/safe-area-inset-bottom/)
for(const host of ['pages/player/list/index','pages/boss/home/index']){assert.match(read(host+'.wxml'),/<patronage-crowns/);assert.ok(JSON.parse(read(host+'.json')).usingComponents['patronage-crowns'])}
assert.match(read('pages/player/service-management/index.wxml'),/<patronage-service-duration-settings/);assert.match(read('components/PatronageServiceDurationSettings.wxml'),/0.5小时/)
const crownsWxml=read('components/PatronageCrowns.wxml'),crownsStyles=read('components/PatronageCrowns.wxss')
const tickerTag=crownsWxml.match(/<view[^>]*class="crown-track\b[^>]*>/)?.[0]
assert.ok(tickerTag,'compact crowns must compile to a continuous text track')
assert.doesNotMatch(crownsWxml,/<swiper\b|<swiper-item\b/,'the subtitle ticker must not switch whole swiper pages')
assert.match(tickerTag,/aria-hidden="true"/,'cloned visual text must not repeat its full parent label')
for(const selector of ['crown-plaque','crown-viewport','crown-track'])assert.match(crownsStyles,new RegExp('\\.'+selector+'[^}]*\\bheight:[1-9]\\d*(?:\\.\\d+)?rpx'),'compact crowns need a fixed positive height')
assert.match(crownsWxml,/<view[^>]*class="crown-viewport[^>]*><view[^>]*class="crown-track/,'continuous track needs a regular clipped view with explicit bounds')
function rule(selector){const match=crownsStyles.match(new RegExp('\\.'+selector+'(?:\\.[\\w-]+)*\\{([^}]+)\\}'));assert.ok(match,`${selector} must have native styles`);return match[1]}
const viewportStyle=rule('crown-viewport'),crownStyle=rule('plaque-crown'),rotationStyle=rule('rotation-icon')
for(const declaration of ['position:absolute','left:40rpx','right:32rpx','height:60rpx','overflow:hidden'])assert.ok(viewportStyle.includes(declaration),`viewport needs ${declaration}`)
assert.match(rule('crown-plaque'),/position:relative/)
const trackStyle=rule('crown-track')
for(const declaration of ['display:inline-flex','flex-wrap:nowrap','width:max-content','white-space:nowrap','animation-name:crown-marquee','animation-timing-function:linear','animation-iteration-count:infinite'])assert.ok(trackStyle.includes(declaration),`the subtitle track needs ${declaration}`)
assert.match(crownsStyles,/@keyframes crown-marquee[\w-]*\{/);assert.match(crownsStyles,/transform:translate(?:X)?\(-50%(?:,0)?\)/,'two equal copies must move left by exactly one content group')
assert.match(rule('crown-copy'),/flex-shrink:0/)
for(const selector of ['plaque-boss','plaque-package']){assert.match(rule(selector),/white-space:nowrap/);assert.doesNotMatch(rule(selector),/ellipsis|max-width/,'full real names/packages must flow through the viewport')}
for(const [style,side] of [[crownStyle,'left'],[rotationStyle,'right']]){assert.match(style,/position:absolute/);assert.ok(style.includes(`${side}:10rpx`),'crown and pause must keep their own outside bounds')}
function rpx(style,property){const match=style.match(new RegExp('(?:^|;)'+property+':(\\d+(?:\\.\\d+)?)rpx'));assert.ok(match,`${property} needs an explicit native length`);return Number(match[1])}
assert.ok(rpx(crownStyle,'left')+rpx(crownStyle,'width')<=rpx(viewportStyle,'left'),'viewport starts after the crown')
assert.ok(rpx(rotationStyle,'right')+rpx(rotationStyle,'width')<=rpx(viewportStyle,'right'),'viewport ends before the pause icon')
assert.match(read('pages/player/detail/index.wxml'),/<patronage-crowns/);assert.match(read('pages/player/detail/index.wxml'),/<gift-host/)
assert.match(read('pages/client/profile/index.wxml'),/冠名 \/ 包天记录/)
assert.ok(fs.existsSync(path.join(root,'utils/patronagePaymentIntent.js')),'real controller must be in the purchase dependency graph')
assert.match(read('api/patronage.js'),/purchases\/pending/);assert.doesNotMatch(read('api/patronage.js'),/requestPayment|requestVirtualPayment/)
for(const file of ['index','records'])assert.match(read(`pages/client/patronage/${file}.wxml`),/暂不提供自助退款/)
const record=(key,status='paid')=>({purchase_no:'PN-'+key,idempotency_key:key,price_version:'a'.repeat(64),player_id:7,player_name:'陪玩甲',package_code:'day',package_name:'日冠',amount_yuan:'188.00',amount_diamonds:'1880.0',payment_status:status,created_at:'2026-09-29T00:00:00Z',paid_at:status==='paid'?'2026-09-29T00:01:00Z':null,starts_at:status==='paid'?'2026-09-29T00:01:00Z':null,expires_at:status==='paid'?'2026-09-30T00:01:00Z':null,bonus_naming_days:0,blockers:[]})
function load(file,options={}){
 const hooks={},events={},calls=[],requests=[],modals=[],emitted=[],storage={token:options.anonymous?'':'fixture-token',client_profile:{id:1}},cache={}
 const realm=vm.createContext({console,getCurrentPages:()=>[]})
 if(options.missingFlatMap)vm.runInContext('delete Array.prototype.flatMap',realm)
 function transportValue(value){realm.__transportJson=JSON.stringify(value);try{return vm.runInContext('JSON.parse(__transportJson)',realm)}finally{delete realm.__transportJson}}
 let C,enabled=options.enabled!==false,status='paid',pendingCount=0
 const index={getStorageSync:k=>storage[k],setStorageSync:(k,v)=>storage[k]=JSON.parse(JSON.stringify(v)),removeStorageSync:k=>delete storage[k],$on:(name,f)=>events[name]=f,$off:name=>delete events[name],$emit:(name,...args)=>events[name]?.(...args),showModal:o=>modals.push(o),login:o=>o.success({code:'fixture-code'}),request:o=>{
  requests.push(o);assert.ok(o.url.startsWith('https://fixture.invalid/api/patronage/'))
  const endpoint=o.url.split('/patronage/')[1]
  if(options.anonymous)assert.ok(!o.header.Authorization,'guest crown reads must work without a token')
  else assert.equal(o.header.Authorization,'Bearer fixture-token')
  if(options.timeout&&endpoint==='purchases/'){o.fail({errMsg:'fixture timeout'});return}
  const c=catalog();c.purchase_enabled=enabled
  c.packages.push({code:'year',name:'年冠',kind:'naming',duration_days:365,amount_yuan:'9999.00',amount_diamonds:'99990.0',available:true,blockers:[]})
  const data=endpoint==='catalog/'?c:endpoint==='quotes/'?{...quote(),service_hours:'26.5',hourly_amount_yuan:'7.09',hourly_amount_diamonds:'70.9',service_terms_source:'player_override',service_terms_version:'2026-10-table-v1',can_submit:enabled,blockers:enabled?[]:['PURCHASE_NOT_ENABLED']}:
   endpoint==='purchases/pending/'?{count:pendingCount,next:pendingCount?'https://evil.invalid':null,previous:null,results:[]}:
   endpoint==='records/'?{count:1,next:null,previous:null,results:[record('record-key','unknown')]}:endpoint==='crowns/'?{results:options.crowns||[]}:record(o.data.idempotency_key,status)
  o.success({statusCode:200,data:transportValue(data)})
 }}
 const vendor={...vue,s: x => x || '',index,onLoad:f=>hooks.load=f,onShow:f=>hooks.show=f,onHide:f=>hooks.hide=f,onUnload:f=>hooks.unload=f,onUnmounted(){},_export_sfc:x=>x,e:Object.assign,t:String,o:x=>x,p:x=>x,f:(items,fn)=>items.map(fn)}
 function module(file){
  if(cache[file])return cache[file]
  if(file==='common/vendor.js')return vendor
  if(file==='utils/request.js')return {BASE_URL:'https://fixture.invalid/api'}
  if(file==='utils/nav.js')return {go:(...args)=>calls.push(args)}
  if(file==='utils/purchaseAvailability.js')return {getClientPlatform:()=>options.ios?'ios':'android',isIOSPurchaseEnabled:()=>!options.ios}
  const exports={};cache[file]=exports
  const execute=vm.runInContext('(function(require,exports,wx){'+read(file)+'\n})',realm,{filename:file})
  execute(name=>module(path.posix.normalize(path.posix.join(path.posix.dirname(file),name))),exports,{createPage:c=>C=c,createComponent:c=>C=c})
  return exports
 }
 module(file+'.js');const scope=vue.effectScope(),render=scope.run(()=>C.setup(options.props||{}, {expose(){},emit:(...args)=>emitted.push(args)})),draw=()=>render({},{})
 function tag(action){return read(file+'.wxml').match(new RegExp('<button[^>]*data-action="'+action+'"[^>]*>'))[0]}
 return {hooks,events,calls,scope,requests,modals,emitted,storage,crownApi:()=>module('api/patronage.js'),arrayPrototype:()=>vm.runInContext('Array.prototype',realm),setStatus:v=>status=v,setPending:v=>pendingCount=v,setEnabled:v=>enabled=v,render:draw,text:()=>JSON.stringify(draw(),(_,v)=>typeof v==='function'?'[event]':v),disabled(action){const key=tag(action).match(/disabled="{{(\w+)}}"/)[1];return draw()[key]},tap(action){const key=tag(action).match(/bindtap="{{(\w+)}}"/)[1];return draw()[key]()}}
}
async function confirm(page,action='purchase'){
 const task=page.tap(action);await tick();assert.ok(page.modals.length);page.modals.at(-1).success({confirm:true});await task
}
async function run(){
 for(const options of [{enabled:false},{ios:true}]){
  const page=load('pages/client/patronage/index',options);page.hooks.load({playerId:'7'});await page.hooks.show();assert.equal(page.disabled('purchase'),true);await page.tap('purchase');assert.equal(page.modals.length,0);assert.equal(page.requests.filter(o=>o.url.endsWith('/purchases/')).length,0);page.scope.stop()
 }
 const page=load('pages/client/patronage/index');page.hooks.load({playerId:'7'});await page.hooks.show();assert.equal(page.disabled('purchase'),false);assert.match(page.text(),/2000.0/);assert.match(page.text(),/26.5/);assert.match(page.text(),/70.9/);assert.match(page.text(),/365天（1年）/)
 const task=page.tap('purchase');await tick();await page.tap('purchase');assert.equal(page.modals.length,1);assert.match(page.modals[0].content,/26.5 小时/);page.modals[0].success({confirm:true});await task
 const posts=()=>page.requests.filter(o=>o.url.endsWith('/purchases/'));assert.equal(posts().length,1);assert.equal(page.requests.at(-1).url.endsWith('/by-key/'),true);assert.equal(page.requests.at(-1).data.idempotency_key,posts()[0].data.idempotency_key);assert.match(page.text(),/购买成功/)
 await confirm(page,'buy-again');assert.equal(posts().length,2);assert.notEqual(posts()[0].data.idempotency_key,posts()[1].data.idempotency_key);assert.equal(Object.keys(page.storage).filter(k=>k.includes(':archive:')).length,1)
 page.tap('support');assert.equal(JSON.stringify(page.calls[0]),JSON.stringify(['/pages/client/customer-service/index']));page.hooks.hide();assert.doesNotMatch(page.text(),/2000.0/);page.scope.stop()
 const recovery=load('pages/client/patronage/index',{timeout:true});recovery.hooks.load({playerId:'7'});await recovery.hooks.show();await confirm(recovery);assert.doesNotMatch(recovery.text(),/购买成功/);const original=recovery.requests.find(o=>o.url.endsWith('/purchases/')).data.idempotency_key
 recovery.hooks.hide();await recovery.hooks.show();assert.equal(recovery.disabled('purchase'),true);await recovery.tap('recover');assert.match(recovery.text(),/购买成功/);assert.equal(recovery.requests.at(-1).data.idempotency_key,original);assert.equal(recovery.requests.filter(o=>o.url.endsWith('/purchases/')).length,1);recovery.scope.stop()
 const blocked=load('pages/client/patronage/index');blocked.setPending(30);blocked.hooks.load({playerId:'7'});await blocked.hooks.show();assert.equal(blocked.disabled('purchase'),true);await blocked.tap('purchase');assert.equal(blocked.modals.length,0);blocked.scope.stop()
 const records=load('pages/client/patronage/records');await records.hooks.show();assert.match(records.text(),/支付结果待确认/);assert.match(records.text(),/PN-record-key/);records.tap('support');records.events['session:expired']('token');assert.doesNotMatch(records.text(),/PN-record-key/);records.scope.stop()
 const now=Date.now(),crown=(id)=>({id,boss_name:`真实老板${id}`,boss_avatar_url:'https://fixture.invalid/boss.png',package_name:id===1?'年冠':'周冠',starts_at:new Date(now-60000).toISOString(),expires_at:new Date(now+60000).toISOString(),source:'purchase'})
 const crownControl=crownsWxml.match(/<view[^>]*data-action="crowns-toggle"[^>]*>/)[0]
 const tapKey=crownControl.match(/catchtap="{{(\w+)}}"/)[1],ariaKey=crownControl.match(/aria-label="{{(\w+)}}"/)[1],trackStyleKey=tickerTag.match(/style="{{(\w+)}}"/)[1]
 const copiesKey=crownsWxml.match(/<view[^>]*wx:for="{{(\w+)}}"[^>]*wx:for-item="copy"/)[1],itemsKey=crownsWxml.match(/<view[^>]*wx:for="{{copy\.(\w+)}}"[^>]*wx:for-item="crown"/)[1]
 const bossKey=crownsWxml.match(/<text[^>]*class="plaque-boss[^>]*>{{crown\.(\w+)}}/)[1],packageKey=crownsWxml.match(/<text[^>]*class="plaque-package[^>]*>{{crown\.(\w+)}}/)[1]
 const nodeFlatMap=Array.prototype.flatMap
 for(const missingFlatMap of [false,true])for(const rows of [[crown(1)],[crown(1),crown(2)]]){
  const host=load('components/PatronageCrowns',{props:{playerId:7,compact:true},crowns:rows,anonymous:true,missingFlatMap});await host.hooks.show()
  const parsed=await host.crownApi().getPatronageCrowns(7)
  assert.equal(Object.getPrototypeOf(parsed),host.arrayPrototype(),'the actual API parser must return an array from the same isolated JS realm')
  assert.equal(typeof parsed.flatMap,missingFlatMap?'undefined':'function','the legacy regression must exercise a genuinely missing built-in on API results')
  const data=host.render();assert.match(data[trackStyleKey],/animation-play-state:running/);assert.equal(data[copiesKey].length,2)
  const expected=rows.map(r=>[r.boss_name,r.package_name])
  assert.equal(JSON.stringify(data[copiesKey].map(copy=>copy[itemsKey].map(r=>[r[bossKey],r[packageKey]]))),JSON.stringify([expected,expected]))
  const duration=data[trackStyleKey].match(/animation-duration:([\d.]+s)/)[1]
  for(const name of rows.map(r=>r.boss_name))assert.ok(data[ariaKey].includes(`感谢 ${name} 老板冠名`))
  assert.match(host.text(),/感谢/);assert.match(host.text(),/谢谢老板的支持/);assert.match(host.text(),/祝老板玩得开心/);assert.deepEqual(host.emitted.at(-1),['active-change',true])
  data[tapKey]();assert.match(host.render()[trackStyleKey],/animation-play-state:paused/);assert.match(host.render()[ariaKey],/滚动已暂停，点击继续/)
  host.render()[tapKey]();assert.match(host.render()[trackStyleKey],/animation-play-state:running/);assert.ok(host.render()[trackStyleKey].includes(`animation-duration:${duration}`),'pause/resume must preserve the same animation rather than restarting a new interval');assert.equal(host.calls.length,0)
  host.hooks.hide();assert.deepEqual(host.emitted.at(-1),['active-change',false]);host.scope.stop()
 }
 assert.equal(Array.prototype.flatMap,nodeFlatMap,'legacy compatibility checks must not mutate the Node process prototype')
 console.log('PASS actual WeChat setup/render + compiled API/controller: enabled confirmation, double tap, POST→GET, explicit new key/archive, timeout original-key recovery, disabled/iOS/count gates, records, support, privacy cleanup, routes/5 tabs/styles. No live network or real funds.')
 console.log('PASS compiled subtitle crown ticker in normal and isolated no-flatMap realms: actual API/parser arrays, two complete seamless copies of one/two bosses, full names/packages/thanks, pause/resume, hide cleanup, and native viewport/leftward-keyframe/icon bounds. Native motion still needs user visual review.')
}
run().catch(error=>{console.error(error);process.exitCode=1})
