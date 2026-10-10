// Execute actual WeChat artifacts; only platform/vendor and transport boundaries are replaced.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),vue=require('vue')
const root=path.join(__dirname,'../dist/build/mp-weixin')
const component='components/HomeAnnouncements',page='pages/client/announcements/index'
const home=fs.readFileSync(path.join(root,'pages/boss/home/index.wxml'),'utf8')
assert.ok(home.indexOf('<home-announcements')>home.indexOf('hero-section'))
assert.ok(home.indexOf('<home-announcements')<home.indexOf('game-section'))
const homeConfig=JSON.parse(fs.readFileSync(path.join(root,'pages/boss/home/index.json'),'utf8'))
assert.equal(homeConfig.usingComponents['home-announcements'],'../../../components/HomeAnnouncements')
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'))
assert.equal(app.pages[0],'pages/boss/home/index');assert.ok(app.pages.includes(page));assert.equal(app.tabBar.list.length,5)
assert.match(fs.readFileSync(path.join(root,component+'.wxss'),'utf8'),/\.announcements[^}]*flex-direction:column/)
for(const name of [component,page])for(const ext of ['js','json','wxml','wxss'])assert.ok(fs.statSync(path.join(root,name+'.'+ext)).size)
const hooks={load:[],show:[],hide:[],unload:[],unmount:[]},requests=[],calls=[],cache=new Map(),timers=new Map();let seq=0,defined
const vendor={...vue,s: x => x || '',index:{request:o=>requests.push(o),setNavigationBarTitle:o=>calls.push(['title',o.title])},
 onLoad:f=>hooks.load.push(f),onShow:f=>hooks.show.push(f),onHide:f=>hooks.hide.push(f),onUnload:f=>hooks.unload.push(f),onBeforeUnmount:f=>hooks.unmount.push(f),
 _export_sfc:x=>x,f:(a,fn)=>a.map(fn),e:Object.assign,o:x=>x,t:String,n:x=>x}
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file)
 if(file===path.join(root,'common/vendor.js'))return vendor
 if(file===path.join(root,'utils/request.js'))return {BASE_URL:'https://fixture.invalid/api'}
 if(file===path.join(root,'utils/nav.js'))return {go:(...a)=>calls.push(a)}
 const module={exports:{}};cache.set(file,module.exports)
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,exports:module.exports,require:x=>load(path.resolve(path.dirname(file),x)),wx:{createComponent:c=>defined=c,createPage:c=>defined=c},setTimeout:(fn,ms)=>{const id=++seq;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id)}, {filename:file})
 return module.exports
}
const tick=()=>new Promise(setImmediate)
const item=kind=>({id:kind+':1',kind,boss_name:'测试老板',player_id:7,player_name:'测试陪玩',item_name:kind==='gift'?'玫瑰':'周冠',quantity:1,occurred_at:'2026-09-30T12:00:00+08:00',text:kind==='gift'?'测试老板赠送测试陪玩玫瑰×1':'测试老板为测试陪玩开通周冠'})
function respond(r,rows=[item(r.data.kind==='popular'?'gift':r.data.kind)]){r.success({statusCode:200,data:{count:rows.length,page:r.data.page,page_size:r.data.page_size,results:rows}})}
;(async()=>{
 load(path.join(root,component+'.js'));const props=vue.reactive({active:true}),scope=vue.effectScope(),render=scope.run(()=>defined.setup(props))
 requests.forEach(r=>respond(r,r.data.kind==='popular'?[{...item('gift'),quantity:99,boss_avatar_url:'https://fixture.invalid/boss.png',player_avatar_url:'https://fixture.invalid/player.png',item_image_url:'https://fixture.invalid/gift.png'},{...item('gift'),id:'gift:2'}]:[item('patronage')]));await tick()
 let view=render(props,[]);assert.equal(view.a.length,2)
 const wxml=fs.readFileSync(path.join(root,component+'.wxml'),'utf8'),tapKey=wxml.match(/bindtap="\{\{card\.(\w+)\}\}"/)[1],autoplayKey=wxml.match(/autoplay="\{\{card\.(\w+)\}\}"/)[1]
 const gift=view.a.find(c=>Object.values(c).includes('open-gift')),patronage=view.a.find(c=>Object.values(c).includes('open-patronage'))
 for(const value of ['热门广播','测试老板','测试陪玩','玫瑰','99','boss.png','player.png','gift.png'])assert.ok(JSON.stringify(gift).includes(value))
 assert.equal(gift[autoplayKey],true);assert.equal(patronage[autoplayKey],false)
 gift[tapKey]();assert.equal(calls.at(-1)[0],'/pages/client/popular-announcements/index');patronage[tapKey]();assert.equal(calls.at(-1)[0],'/pages/client/patronage-announcements/index')
 if(process.argv[2]){
  props.active=false;props.active=true
  for(const r of requests.slice(-2)){const data=JSON.parse(fs.readFileSync(path.join(process.argv[2],r.data.kind+'-10.json'),'utf8'));r.success({statusCode:200,data})}
  await tick();const body=JSON.stringify(render(props,[]));const data=JSON.parse(fs.readFileSync(path.join(process.argv[2],'popular-10.json'),'utf8'))
  assert.ok(data.results.some(r=>r.kind==='vip_upgrade'));assert.ok(data.results.some(r=>r.kind==='gift'))
  for(const r of data.results){assert.ok(body.includes(r.boss_name));assert.ok(body.includes(r.kind==='vip_upgrade'?r.to_tier_name:r.item_name))}
  console.log('PASS compiled homepage consumes real isolated Django gift+upgrade JSON')
 }
 props.active=false;assert.equal(timers.size,0);assert.ok(render(props,[]).a.every(card=>card[autoplayKey]===false));props.active=true;const pending=requests.slice(2);props.active=false;pending.forEach(r=>respond(r));await tick();assert.equal(timers.size,0)
 hooks.unmount.forEach(f=>f());scope.stop()
 load(path.join(root,page+'.js'));const scope2=vue.effectScope(),renderPage=scope2.run(()=>defined.setup({}))
 hooks.load[0]({kind:'gift'});hooks.show[0]();respond(requests.at(-1));await tick()
 assert.ok(JSON.stringify(renderPage({},[])).includes('玫瑰'))
 const pageWxml=fs.readFileSync(path.join(root,page+'.wxml'),'utf8')
 const tabsKey=pageWxml.match(/wx:for="\{\{(\w+)\}\}" wx:for-item="tab"/)[1],tabTap=pageWxml.match(/bindtap="\{\{tab\.(\w+)\}\}"/)[1]
 function tabAction(label){return renderPage({},[])[tabsKey].find(t=>Object.values(t).includes('filter-'+label))[tabTap]()}
 tabAction('all');const allRequest=requests.at(-1);assert.equal(allRequest.data.kind,'all')
 respond(allRequest,[{...item('gift'),boss_avatar_url:'https://fixture.invalid/boss.png',player_avatar_url:'https://fixture.invalid/player.png',item_image_url:'https://fixture.invalid/gift.png'},item('patronage')]);await tick()
 const body=JSON.stringify(renderPage({},[]));for(const value of ['boss.png','player.png','gift.png','玫瑰','周冠'])assert.ok(body.includes(value))
 tabAction('patronage');assert.equal(requests.at(-1).data.kind,'patronage');respond(requests.at(-1),[]);await tick();assert.ok(!JSON.stringify(renderPage({},[])).includes('玫瑰'))
 assert.ok(pageWxml.includes('record-avatars')&&pageWxml.includes('item-image')&&!pageWxml.includes('等级晋升'))
 hooks.hide[0]();scope2.stop();assert.ok(requests.every(r=>r.method==='GET'&&!r.header?.Authorization))
 for(const [route,kind,title,snapshot] of [['popular-announcements','popular','热门广播','popular-20'],['patronage-announcements','patronage','冠名通报','patronage-20']]){
  const name='pages/client/'+route+'/index';assert.ok(app.pages.includes(name));for(const ext of ['js','json','wxml','wxss'])assert.ok(fs.statSync(path.join(root,name+'.'+ext)).size)
  const xml=fs.readFileSync(path.join(root,name+'.wxml'),'utf8');assert.ok(xml.includes(title));assert.ok(!xml.includes('feed-tabs'));assert.ok(!xml.includes('filter-all'))
  const start={load:hooks.load.length,show:hooks.show.length,hide:hooks.hide.length};load(path.join(root,name+'.js'));const scope3=vue.effectScope(),draw=scope3.run(()=>defined.setup({}));hooks.load[start.load]({kind:'all'});hooks.show[start.show]();const request=requests.at(-1);assert.equal(request.data.kind,kind)
  if(process.argv[2]){const data=JSON.parse(fs.readFileSync(path.join(process.argv[2],snapshot+'.json'),'utf8'));assert.ok(data.count>0);request.success({statusCode:200,data});await tick();const body=JSON.stringify(draw({},[]));for(const r of data.results){assert.ok(body.includes(r.kind==='vip_upgrade'?r.to_tier_name:r.item_name));if(r.kind==='vip_upgrade')assert.ok(body.includes(r.from_tier_name))};console.log('PASS compiled independent '+route+' with actual HTTP JSON: '+data.results.length+' records')}
  else {respond(request);await tick();assert.ok(JSON.stringify(draw({},[])).includes(item(kind==='popular'?'gift':kind).item_name))}
  hooks.hide[start.hide]();scope3.stop()
 }
 assert.ok(requests.every(r=>r.method==='GET'&&!r.header?.Authorization))
 console.log('PASS: homepage independent entries + legacy feed compatibility + compiled independent fixed filters/titles + actual JSON when supplied + GET-only')
})().catch(e=>{console.error(e);process.exitCode=1})
