// Exercise shipped WeChat setup/render and WXML bindings. Only API/platform boundaries are fixtures.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),vue=require('vue')
const root=path.join(__dirname,'../dist/build/mp-weixin'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),tick=()=>new Promise(setImmediate)
const wall='pages/client/patronage-wall/index',panel='components/PatronageWallPanel',ranking='pages/client/rankings/index',announcements='pages/client/patronage-announcements/index'
const app=JSON.parse(read('app.json'))
assert.equal(app.pages[0],'pages/boss/home/index');assert.equal(app.tabBar.list.length,5)
assert.ok(app.pages.includes(wall),'wall must be a registered ordinary page')
assert.ok(app.tabBar.list.every(tab=>tab.pagePath!==wall),'wall must not replace a tab')
assert.equal(JSON.parse(read(wall+'.json')).navigationBarTitleText,'冠名榜单')
for(const file of [wall,panel,ranking,announcements])for(const ext of file===wall?['js','json','wxml']:['js','json','wxml','wxss'])assert.ok(fs.statSync(path.join(root,`${file}.${ext}`)).size)
for(const host of [wall,ranking]){
 assert.match(read(host+'.wxml'),/<patronage-wall-panel\b/,'both wall hosts must use the shipped shared panel')
 assert.equal(JSON.parse(read(host+'.json')).usingComponents['patronage-wall-panel'],'../../../components/PatronageWallPanel')
}
const xml=read(panel+'.wxml'),styles=read(panel+'.wxss')
assert.match(styles,/\.wall-card[^}]*border:[^}]*var\(--ui-gold/)
assert.match(styles,/\.crown-list[^}]*flex-wrap:wrap/)
assert.match(styles,/\.crown-tag text[^}]*overflow-wrap:anywhere/)
assert.match(styles,/safe-area-inset-bottom/)
assert.match(styles,/\.patronage-wall-panel--embedded[^}]*min-height:0[^}]*padding:0[^}]*background:transparent/,'inline panel must not add a full-screen empty gap')
const rootTag=xml.match(/<view\b[^>]*patronage-wall-panel[^>]*>/)[0],styleKey=rootTag.match(/style="{{(\w+)}}"/)[1]
const loopKey=xml.match(/wx:for="{{(\w+)}}"[^>]*wx:for-item="entry"/)[1]
function tag(source,action){const match=source.match(new RegExp('<(?:button|view)[^>]*data-action="'+action+'"[^>]*>'));assert.ok(match,`missing ${action} native action`);return match[0]}
function eventKey(source,action){const match=tag(source,action).match(/(?:bind|catch)tap="{{(\w+)}}"/);assert.ok(match,`${action} must bind a compiled event`);return match[1]}
function rowEvent(source,className){const match=source.match(new RegExp('<button[^>]*class="'+className+'[^>]*>'));assert.ok(match,`missing ${className}`);return match[0].match(/(?:bind|catch)tap="{{entry\.(\w+)}}"/)[1]}
function stateKey(action){return tag(xml,action).match(/wx:(?:if|elif)="{{(\w+)}}"/)[1]}
const serviceKey=rowEvent(xml,'service-button'),patronageKey=rowEvent(xml,'patronage-button'),loadingKey=stateKey('loading'),errorKey=stateKey('error'),emptyKey=stateKey('empty'),updatingKey=stateKey('updating'),partialErrorKey=stateKey('partial-error')
assert.match(tag(xml,'loading'),/wx:if=/);assert.match(tag(xml,'error'),/wx:elif=/);assert.match(tag(xml,'empty'),/wx:elif=/)
assert.ok(xml.indexOf(tag(xml,'loading'))<xml.indexOf(tag(xml,'error'))&&xml.indexOf(tag(xml,'error'))<xml.indexOf(tag(xml,'empty')))
const state=data=>data[loadingKey]?'loading':data[errorKey]?'error':data[emptyKey]?'empty':'list'
function load(file,props={}){
 const hooks={load:[],show:[],hide:[],unload:[],mount:[],unmount:[]},calls=[],requests=[],rankingRequests=[],cache={};let C
 const vendor={...vue,s:x=>x||'',index:{setNavigationBarTitle:o=>calls.push(['title',o.title])},
  onLoad:f=>hooks.load.push(f),onShow:f=>hooks.show.push(f),onHide:f=>hooks.hide.push(f),onUnload:f=>hooks.unload.push(f),onMounted:f=>hooks.mount.push(f),onBeforeUnmount:f=>hooks.unmount.push(f),
  _export_sfc:x=>x,e:Object.assign,t:String,n:x=>x,o:x=>x,p:x=>x,f:(items,fn)=>items.map(fn)}
 function module(name){
  if(cache[name])return cache[name]
  if(name==='common/vendor.js')return vendor
  if(name==='utils/nav.js')return {go:(...args)=>calls.push(args)}
  if(name==='api/patronageWall.js')return {loadPatronageWall:options=>new Promise((resolve,reject)=>requests.push({options,resolve,reject}))}
  if(name==='api/rankings.js')return {getRankings:async(...args)=>{rankingRequests.push(args);return {available:true,results:[]}}}
  if(name==='api/announcements.js')return {getAnnouncements:async()=>({count:0,results:[]})}
  const exports={};cache[name]=exports
  vm.runInNewContext(read(name),{exports,require:other=>module(path.posix.normalize(path.posix.join(path.posix.dirname(name),other))),wx:{createPage:c=>C=c,createComponent:c=>C=c},console,Date,setTimeout,clearTimeout},{filename:name})
  return exports
 }
 module(file+'.js');const scope=vue.effectScope(),render=scope.run(()=>C.setup(props,{expose(){}})),theme='--ui-gold:#94651e;--ui-primary:#316eb8;'
 const draw=()=>render({$appThemeStyle:theme},{})
 return {hooks,calls,requests,rankingRequests,scope,theme,draw,text:()=>JSON.stringify(draw(),(_,v)=>typeof v==='function'?'[event]':v)}
}
const activeWindow=()=>({starts_at:new Date(Date.now()-60000).toISOString(),expires_at:new Date(Date.now()+3600000).toISOString()})
const fixtures=[
 {player:{id:12,name:'第一位陪玩',type_name:'技术陪',avatar_url:'https://fixture.invalid/player-12.png'},crowns:[{id:101,boss_name:'年冠老板',package_name:'年冠',boss_avatar_url:'https://fixture.invalid/boss-101.png',...activeWindow()}]},
 {player:{id:34,name:'第二位陪玩',type_name:'娱乐陪',avatar_url:''},crowns:[{id:102,boss_name:'甲老板',package_name:'季冠',boss_avatar_url:'',...activeWindow()},{id:103,boss_name:'乙老板',package_name:'月冠',boss_avatar_url:'',...activeWindow()}]}
]
async function checkRanking(){
 const page=load(ranking),source=read(ranking+'.wxml'),panelTag=source.match(/<patronage-wall-panel\b[^>]*>/)[0]
 const visibleKey=panelTag.match(/wx:if="{{(\w+)}}"/)[1]
 const panelPropsKey=panelTag.match(/u-p="{{(\w+)}}"/)[1]
 const boardTag=source.match(/<button\b[^>]*wx:for="{{(\w+)}}"[^>]*wx:for-item="tab"[^>]*class="[^>]*board-tab[^>]*>/)[0]
 const boardKey=boardTag.match(/wx:for="{{(\w+)}}"/)[1],actionKey=boardTag.match(/data-action="{{tab\.(\w+)}}"/)[1],tapKey=boardTag.match(/bindtap="{{tab\.(\w+)}}"/)[1],pressedKey=boardTag.match(/aria-pressed="{{tab\.(\w+)}}"/)[1]
 try{
  const task=page.hooks.show[0]();await task
  const data=page.draw(),tabs=data[boardKey]
  assert.equal(data[panelPropsKey].embedded,true,'ranking crown tab must pass the native embedded component property')
  assert.equal(JSON.stringify(tabs.map(tab=>tab[actionKey])),JSON.stringify(['board-patronage','board-boss','board-player']))
  assert.equal(tabs[0][pressedKey],true);assert.equal(data[visibleKey],true,'opening rankings must immediately display the crown panel')
  assert.equal(page.rankingRequests.length,0,'default crowns must not make a boss/player ranking request')
  assert.equal(page.calls.length,0,'switching ranking tabs must remain on the same page')
  await tabs[1][tapKey]();assert.equal(page.draw()[visibleKey],false)
  assert.equal(JSON.stringify(page.rankingRequests.at(-1)),JSON.stringify(['boss','day']))
  await page.draw()[boardKey][2][tapKey]();assert.equal(JSON.stringify(page.rankingRequests.at(-1)),JSON.stringify(['player','day']))
  const before=page.rankingRequests.length;await page.draw()[boardKey][0][tapKey]()
  assert.equal(page.draw()[visibleKey],true);assert.equal(page.rankingRequests.length,before)
  assert.equal(page.calls.length,0,'the crown tab is not a link to another page')
 }finally{page.scope.stop()}
 const news=load(announcements),key=eventKey(read(announcements+'.wxml'),'open-patronage-wall')
 try{
  news.draw()[key]()
  assert.equal(JSON.stringify(news.calls.at(-1)),JSON.stringify(['/pages/client/patronage-wall/index']))
  assert.equal(news.requests.length,0,'announcement navigation must not start a purchase or wall fetch')
 }finally{news.scope.stop()}
}
async function checkPanel(embedded){
 const page=load(panel,{embedded}),draw=page.draw
 try{
  assert.equal(draw()[styleKey],page.theme,'native panel must receive the active app theme')
  assert.ok(page.text().includes(embedded?'冠名陪玩':'冠名榜单'))
  const task=page.hooks.show[0]();page.hooks.mount[0]()
  assert.equal(page.requests.length,1,'onShow followed by mount must not start a duplicate scan')
  assert.equal(draw()[loadingKey],true);assert.equal(draw()[loopKey],undefined)
  const request=page.requests.at(-1);assert.equal(request.options.isCurrent(),true);assert.equal(request.options.forceRefresh,false)
  request.options.onProgress(1,2)
  const progress=xml.match(/class="load-progress[^>]*>{{(\w+)}} \/ {{(\w+)}}/)
  assert.deepEqual([draw()[progress[1]],draw()[progress[2]]],['1','2'])
  request.options.onUpdate([fixtures[0]],{completed:1,total:2})
  assert.equal(draw()[loadingKey],false);assert.equal(!!draw()[updatingKey],true)
  assert.equal(draw()[loopKey].length,1,'the first real crown card must appear before all players finish')
  assert.match(page.text(),/已找到/);assert.match(page.text(),/年冠老板/)
  request.resolve(fixtures);await task
  const data=draw(),rows=data[loopKey]
  assert.equal(!!data[loadingKey],false);assert.equal(!!data[updatingKey],false);assert.equal(rows.length,2)
  for(const value of ['第一位陪玩','第二位陪玩','年冠老板','年冠','甲老板','季冠','乙老板','月冠'])assert.ok(page.text().includes(value),`actual compiled wall must show ${value}`)
  rows[1][serviceKey]();assert.equal(JSON.stringify(page.calls.at(-1)),JSON.stringify(['/pages/player/detail/index',{playerId:34}]))
  rows[1][patronageKey]();assert.equal(JSON.stringify(page.calls.at(-1)),JSON.stringify(['/pages/client/patronage/index',{playerId:34}]))
  const refresh=draw()[eventKey(xml,'refresh')]()
  assert.equal(draw()[loadingKey],true);assert.equal(draw()[loopKey],undefined)
  const partial=page.requests.at(-1);assert.equal(partial.options.forceRefresh,true,'explicit refresh must bypass the TTL cache')
  partial.options.onUpdate([fixtures[0]],{completed:1,total:2});partial.reject(Error('503'));await refresh
  assert.equal(!!draw()[partialErrorKey],true);assert.equal(draw()[loopKey].length,1)
  assert.equal(!!draw()[errorKey],false);assert.equal(!!draw()[emptyKey],false);assert.match(page.text(),/年冠老板/)
  const retryPartial=draw()[eventKey(xml,'retry-partial')]();assert.equal(page.requests.at(-1).options.forceRefresh,true)
  page.requests.at(-1).resolve([]);await retryPartial
  assert.equal(draw()[emptyKey],true);assert.equal(state(draw()),'empty')
  const failed=draw()[eventKey(xml,'refresh')]();page.requests.at(-1).reject(Error('503'));await failed
  assert.equal(draw()[errorKey],true);assert.equal(state(draw()),'error','the native conditional chain must show an error rather than an empty wall')
  const retry=draw()[eventKey(xml,'retry')]();assert.equal(page.requests.at(-1).options.forceRefresh,true);page.requests.at(-1).resolve([]);await retry
  assert.equal(draw()[emptyKey],true);assert.equal(state(draw()),'empty')
  for(const lifecycle of ['hide','unload','unmount']){
   const late=page.hooks.show[0](),last=page.requests.at(-1);page.hooks[lifecycle][0]()
   assert.equal(last.options.isCurrent(),false)
   last.options.onUpdate(fixtures,{completed:2,total:2});last.options.onProgress(2,2);last.resolve(fixtures);await late
   assert.equal(draw()[loopKey],undefined);assert.ok(!page.text().includes('年冠老板'),`${lifecycle} must ignore late wall data`)
   const before=page.requests.length;await draw()[eventKey(xml,'refresh')]();assert.equal(page.requests.length,before,'inactive panel must not start new scans')
  }
 }finally{page.scope.stop()}
}
async function checkExpiry(){
 const real={now:Date.now,setTimeout:global.setTimeout,clearTimeout:global.clearTimeout},timers=new Map()
 let now=Date.parse('2026-10-11T04:00:00Z'),id=0,page
 const starts_at=new Date(now-1000).toISOString(),expires=ms=>new Date(now+ms).toISOString()
 Date.now=()=>now
 global.setTimeout=(fn,delay)=>{const key=++id;timers.set(key,{fn,at:now+delay});return key}
 global.clearTimeout=key=>timers.delete(key)
 async function advance(ms){
  const target=now+ms
  for(let runs=0;;runs++){
   const due=[...timers].filter(([,v])=>v.at<=target).sort((a,b)=>a[1].at-b[1].at)[0]
   if(!due)break
   assert.ok(runs<10,'shipped wall must not busy-poll')
   now=due[1].at;timers.delete(due[0]);due[1].fn();await tick()
  }
  now=target;await tick()
 }
 try{
  page=load(panel,{embedded:true});page.hooks.mount[0]()
  const rights=fixtures.map((entry,index)=>({...entry,crowns:entry.crowns.map((crown,j)=>({...crown,starts_at,expires_at:expires(index===0?1000:j===0?2000:3000)}))}))
  page.requests[0].resolve(rights);await tick();assert.equal(page.draw()[loopKey].length,2)
  await advance(1000);assert.equal(page.draw()[loopKey].length,1);assert.ok(!page.text().includes('年冠老板'))
  page.draw()[loopKey][0][serviceKey]();assert.equal(JSON.stringify(page.calls.at(-1)),JSON.stringify(['/pages/player/detail/index',{playerId:34}]))
  await advance(1000);assert.ok(!page.text().includes('甲老板'));assert.match(page.text(),/乙老板/)
  await advance(1000);assert.equal(page.draw()[emptyKey],true);assert.equal(page.draw()[loopKey],undefined)
  assert.equal(page.requests.length,1,'compiled expiry must not perform another API read');assert.equal(timers.size,0)
  page.hooks.hide[0]();const reload=page.hooks.show[0]();page.requests.at(-1).resolve(rights.map(entry=>({...entry,crowns:entry.crowns.map(crown=>({...crown,expires_at:new Date(now+1000).toISOString()}))})));await reload
  assert.equal(timers.size,1);page.hooks.hide[0]();assert.equal(timers.size,0)
 }finally{
  if(page){page.hooks.unmount[0]();page.scope.stop()}
  Date.now=real.now;global.setTimeout=real.setTimeout;global.clearTimeout=real.clearTimeout
 }
 console.log('PASS compiled wall expiry: per-boss boundaries, player/count/empty removal, correct remaining service ID, one local timer, no extra API read, hide cleanup.')
}
async function main(){
 await checkRanking()
 await checkExpiry()
 for(const embedded of [false,true])await checkPanel(embedded)
 const mounted=load(panel,{embedded:true})
 try{
  mounted.hooks.mount[0]();assert.equal(mounted.requests.length,1,'a crown tab mounted after page onShow must still load')
  await mounted.hooks.show[0]();assert.equal(mounted.requests.length,1,'mount followed by first onShow must not duplicate the in-flight scan')
  mounted.requests[0].resolve(fixtures);await tick();assert.equal(mounted.draw()[loopKey].length,2)
  mounted.hooks.hide[0]();const reshow=mounted.hooks.show[0]();assert.equal(mounted.requests.length,2,'later hide→show must still request the fresh or cached wall')
  mounted.requests[1].resolve(fixtures);await reshow;assert.equal(mounted.draw()[loopKey].length,2)
 }finally{mounted.hooks.unmount[0]();mounted.scope.stop()}
 console.log('PASS shipped shared crown panel JS + WXML: partial cards before scan completion, names/packages, second-row service/patronage IDs, partial-error preservation, force refresh/retry/empty, mount/show deduplication, hide/unload/unmount stale cleanup, theme/native styles, ordinary page/5 tabs, default inline crown→boss/player ranking tabs, and announcement standalone entry. No live network or window actions.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
