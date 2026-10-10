// Exercise shipped WeChat setup/render and its WXML event bindings. API/platform boundaries are fixtures.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),vue=require('vue')
const root=path.join(__dirname,'../dist/build/mp-weixin'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),tick=()=>new Promise(setImmediate)
const wall='pages/client/patronage-wall/index',entryPages=['pages/client/rankings/index','pages/client/patronage-announcements/index']
const app=JSON.parse(read('app.json'))
assert.equal(app.pages[0],'pages/boss/home/index');assert.equal(app.tabBar.list.length,5)
assert.ok(app.pages.includes(wall),'wall must be a registered ordinary page')
assert.ok(app.tabBar.list.every(tab=>tab.pagePath!==wall),'wall must not replace a tab')
assert.equal(JSON.parse(read(wall+'.json')).navigationBarTitleText,'冠名榜单')
for(const file of [wall,...entryPages])for(const ext of ['js','json','wxml','wxss'])assert.ok(fs.statSync(path.join(root,`${file}.${ext}`)).size)
const xml=read(wall+'.wxml'),styles=read(wall+'.wxss')
assert.match(styles,/\.wall-card[^}]*border:[^}]*var\(--ui-gold/)
assert.match(styles,/\.crown-list[^}]*flex-wrap:wrap/)
assert.match(styles,/\.crown-tag text[^}]*overflow-wrap:anywhere/)
assert.match(styles,/safe-area-inset-bottom/)
const rootTag=xml.match(/<view\b[^>]*class="patronage-wall-page[^>]*>/)[0],styleKey=rootTag.match(/style="{{(\w+)}}"/)[1]
const loopKey=xml.match(/wx:for="{{(\w+)}}"[^>]*wx:for-item="entry"/)[1]
function tag(source,action){const match=source.match(new RegExp('<(?:button|view)[^>]*data-action="'+action+'"[^>]*>'));assert.ok(match,`missing ${action} native action`);return match[0]}
function eventKey(source,action){const match=tag(source,action).match(/(?:bind|catch)tap="{{(\w+)}}"/);assert.ok(match,`${action} must bind a compiled event`);return match[1]}
function rowEvent(source,className){const match=source.match(new RegExp('<button[^>]*class="'+className+'[^>]*>'));assert.ok(match,`missing ${className}`);return match[0].match(/(?:bind|catch)tap="{{entry\.(\w+)}}"/)[1]}
function stateKey(action){return tag(xml,action).match(/wx:(?:if|elif)="{{(\w+)}}"/)[1]}
const serviceKey=rowEvent(xml,'service-button'),patronageKey=rowEvent(xml,'patronage-button'),loadingKey=stateKey('loading'),errorKey=stateKey('error'),emptyKey=stateKey('empty')
assert.match(tag(xml,'loading'),/wx:if=/);assert.match(tag(xml,'error'),/wx:elif=/);assert.match(tag(xml,'empty'),/wx:elif=/)
assert.ok(xml.indexOf(tag(xml,'loading'))<xml.indexOf(tag(xml,'error'))&&xml.indexOf(tag(xml,'error'))<xml.indexOf(tag(xml,'empty')))
const state=data=>data[loadingKey]?'loading':data[errorKey]?'error':data[emptyKey]?'empty':'list'
function load(file){
 const hooks={load:[],show:[],hide:[],unload:[],unmount:[]},calls=[],requests=[],cache={};let C
 const vendor={...vue,s:x=>x||'',index:{setNavigationBarTitle:o=>calls.push(['title',o.title])},
  onLoad:f=>hooks.load.push(f),onShow:f=>hooks.show.push(f),onHide:f=>hooks.hide.push(f),onUnload:f=>hooks.unload.push(f),onBeforeUnmount:f=>hooks.unmount.push(f),
  _export_sfc:x=>x,e:Object.assign,t:String,n:x=>x,o:x=>x,p:x=>x,f:(items,fn)=>items.map(fn)}
 function module(name){
  if(cache[name])return cache[name]
  if(name==='common/vendor.js')return vendor
  if(name==='utils/nav.js')return {go:(...args)=>calls.push(args)}
  if(name==='api/patronageWall.js')return {loadPatronageWall:options=>new Promise((resolve,reject)=>requests.push({options,resolve,reject}))}
  if(name==='api/rankings.js')return {getRankings:async()=>({available:true,results:[]})}
  if(name==='api/announcements.js')return {getAnnouncements:async()=>({count:0,results:[]})}
  const exports={};cache[name]=exports
  vm.runInNewContext(read(name),{exports,require:other=>module(path.posix.normalize(path.posix.join(path.posix.dirname(name),other))),wx:{createPage:c=>C=c},console},{filename:name})
  return exports
 }
 module(file+'.js');const scope=vue.effectScope(),render=scope.run(()=>C.setup({}, {expose(){}})),theme='--ui-gold:#94651e;--ui-primary:#316eb8;'
 const draw=()=>render({$appThemeStyle:theme},{})
 return {hooks,calls,requests,scope,theme,draw,text:()=>JSON.stringify(draw(),(_,v)=>typeof v==='function'?'[event]':v)}
}
const fixtures=[
 {player:{id:12,name:'第一位陪玩',type_name:'技术陪',avatar_url:'https://fixture.invalid/player-12.png'},crowns:[{id:101,boss_name:'年冠老板',package_name:'年冠',boss_avatar_url:'https://fixture.invalid/boss-101.png'}]},
 {player:{id:34,name:'第二位陪玩',type_name:'娱乐陪',avatar_url:''},crowns:[{id:102,boss_name:'甲老板',package_name:'季冠',boss_avatar_url:''},{id:103,boss_name:'乙老板',package_name:'月冠',boss_avatar_url:''}]}
]
async function main(){
 for(const file of entryPages){
  const page=load(file),source=read(file+'.wxml'),key=eventKey(source,'open-patronage-wall')
  assert.match(tag(source,'open-patronage-wall'),/button/)
  page.draw()[key]()
  assert.equal(JSON.stringify(page.calls.at(-1)),JSON.stringify(['/pages/client/patronage-wall/index']))
  assert.equal(page.requests.length,0,'entry navigation must not start a crown purchase or wall load')
  page.scope.stop()
 }
 const page=load(wall),draw=page.draw
 try{
  assert.equal(draw()[styleKey],page.theme,'native page must receive the active app theme')
  const task=page.hooks.show[0]();assert.equal(draw()[loadingKey],true);assert.equal(draw()[loopKey],undefined)
  const request=page.requests.at(-1);assert.equal(request.options.isCurrent(),true)
  request.options.onProgress(1,2)
  const progress=xml.match(/class="load-progress[^>]*>{{(\w+)}} \/ {{(\w+)}}/)
  assert.deepEqual([draw()[progress[1]],draw()[progress[2]]],['1','2'])
  request.resolve(fixtures);await task
  const data=draw(),rows=data[loopKey]
  assert.equal(!!data[loadingKey],false);assert.equal(rows.length,2)
  for(const value of ['第一位陪玩','第二位陪玩','年冠老板','年冠','甲老板','季冠','乙老板','月冠'])assert.ok(page.text().includes(value),`actual compiled wall must show ${value}`)
  rows[1][serviceKey]();assert.equal(JSON.stringify(page.calls.at(-1)),JSON.stringify(['/pages/player/detail/index',{playerId:34}]))
  rows[1][patronageKey]();assert.equal(JSON.stringify(page.calls.at(-1)),JSON.stringify(['/pages/client/patronage/index',{playerId:34}]))
  const refreshKey=eventKey(xml,'refresh'),refresh=draw()[refreshKey]()
  assert.equal(draw()[loadingKey],true);assert.equal(draw()[loopKey],undefined)
  page.requests.at(-1).reject(Error('503'));await refresh
  assert.equal(draw()[errorKey],true);assert.equal(state(draw()),'error','the native conditional chain must show the error rather than an empty wall')
  const retry=draw()[eventKey(xml,'retry')]();page.requests.at(-1).resolve([]);await retry
  assert.equal(draw()[emptyKey],true);assert.equal(state(draw()),'empty')
  const late=page.hooks.show[0](),last=page.requests.at(-1);page.hooks.hide[0]()
  assert.equal(last.options.isCurrent(),false);last.resolve(fixtures);await late
  assert.equal(draw()[loopKey],undefined);assert.ok(!page.text().includes('年冠老板'),'hidden page must ignore late wall data')
 }finally{page.scope.stop()}
 console.log('PASS shipped wall JS + WXML: loading/progress→complete names/packages, second-row service/patronage IDs, error/retry/empty and stale-hide cleanup, app theme, native ordinary-page registration/5 tabs, and both entry routes. No live network or window actions.')
}
main().catch(error=>{console.error(error);process.exitCode=1})
