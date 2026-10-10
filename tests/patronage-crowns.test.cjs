const {test}=require('node:test'), assert=require('node:assert/strict'), vue=require('vue')
const {setup,tick}=require('./patronage-harness.cjs')
const file='src/components/PatronageCrowns.vue'
const crown=(id=1)=>({id,boss_name:`老板${id}`,boss_avatar_url:'',package_name:id===1?'日冠':'周冠',starts_at:'2026-10-01T00:00:00Z',expires_at:'2026-11-01T00:00:00Z',source:'purchase'})
const track=p=>p.tree().find(n=>n.props?.class==='crown-track')
const styleValue=(p,property)=>{const style=track(p).props.style;return typeof style==='string'?style.match(new RegExp(property+':([^;]+)'))?.[1]:style[property.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]}
const tapEvent=()=>({stopped:false,stopPropagation(){this.stopped=true}})

test('thank-you plaque renders real names and packages when the runtime has no Array.flatMap',async()=>{
 const rows=[{...crown(),boss_name:'企鹅',package_name:'年冠'}]
 Object.defineProperty(rows,'flatMap',{value:undefined})
 const p=setup(file,{getPatronageCrowns:async()=>rows},{playerId:7,compact:true})
 try{
  await p.life.show[0]()
  assert.match(p.text(),/企鹅/);assert.match(p.text(),/年冠/)
  assert.match(p.text(),/感谢/);assert.match(p.text(),/谢谢老板的支持/)
  assert.equal(p.tree().filter(n=>n.props?.class==='crown-copy').length,2)
  assert.equal(styleValue(p,'animation-play-state'),'running')
  assert.equal(p.tree().some(n=>['swiper','swiper-item'].includes(n.type)),false)
 }finally{p.scope.stop()}
})

test('a single real crown continuously scrolls complete thanks copy with its package and pauses at its current position',async()=>{
 const row={...crown(),boss_avatar_url:'https://example.test/boss.png'}
 const p=setup(file,{getPatronageCrowns:async()=>[row]},{playerId:7,compact:true})
 await p.life.show[0]()
 assert.equal(styleValue(p,'animation-play-state'),'running')
 assert.equal(p.tree().filter(n=>n.props?.class==='crown-copy').length,2)
 assert.match(p.action('crowns-toggle').props['aria-label'],/日冠/)
 assert.match(p.action('crowns-toggle').props['aria-label'],/感谢 老板1 老板冠名/)
 assert.equal(p.action('crowns-toggle').props.role,'button')
 assert.match(p.text(),/感谢/);assert.match(p.text(),/谢谢老板的支持/);assert.match(p.text(),/祝老板玩得开心/)
 assert.equal(p.tree().filter(n=>n.props?.class==='plaque-boss').length,2)
 assert.equal(p.tree().filter(n=>n.props?.class==='plaque-package').length,2)
 assert.deepEqual(p.emitted.at(-1),['active-change',true])
 const image=p.tree().find(n=>n.props?.src===row.boss_avatar_url)
 assert.ok(image);image.props.onError()
 assert.equal(p.tree().find(n=>n.props?.src===row.boss_avatar_url),undefined)
 assert.match(p.text(),/老/)
 assert.ok(p.tree().some(n=>n.props?.src==='/icons/patronage/pause-gold.png'))
 const event=tapEvent();p.action('crowns-toggle').props.onTap(event)
 const duration=styleValue(p,'animation-duration')
 assert.equal(event.stopped,true);assert.deepEqual(p.calls,[]);assert.equal(styleValue(p,'animation-play-state'),'paused')
 assert.match(p.action('crowns-toggle').props['aria-label'],/滚动已暂停，点击继续/)
 p.action('crowns-toggle').props.onTap(tapEvent())
 assert.equal(styleValue(p,'animation-play-state'),'running');assert.equal(styleValue(p,'animation-duration'),duration)
 p.scope.stop()
})

test('every real boss appears in each seamless marquee copy, and tap pauses without opening player detail',async()=>{
 const p=setup(file,{getPatronageCrowns:async()=>[crown(1),crown(2)]},{playerId:7,compact:true})
 await p.life.show[0]()
 assert.ok(track(p));assert.equal(p.tree().some(n=>['swiper','swiper-item'].includes(n.type)),false)
 assert.equal(styleValue(p,'animation-play-state'),'running')
 assert.equal(p.tree().filter(n=>n.props?.class==='plaque-line').length,4)
 for(const name of ['老板1','日冠','老板2','周冠'])assert.ok(p.action('crowns-toggle').props['aria-label'].includes(name))
 const copies=p.tree().filter(n=>n.props?.class==='crown-copy')
 assert.equal(copies.length,2);assert.deepEqual(copies[0].children,copies[1].children)
 assert.equal(track(p).props['aria-hidden'],'true','the full plaque label should be announced once rather than repeating cloned copy')
 assert.match(p.action('crowns-toggle').props['aria-label'],/滚动中，点击暂停/)
 assert.ok(p.tree().some(n=>n.props?.src==='/icons/patronage/pause-gold.png'))
 const event=tapEvent();p.action('crowns-toggle').props.onTap(event)
 assert.equal(event.stopped,true);assert.equal(styleValue(p,'animation-play-state'),'paused')
 assert.match(p.action('crowns-toggle').props['aria-label'],/滚动已暂停，点击继续/)
 assert.ok(p.tree().some(n=>n.props?.src==='/icons/patronage/play-gold.png'))
 p.action('crowns-toggle').props.onTap(tapEvent())
 assert.equal(styleValue(p,'animation-play-state'),'running');assert.deepEqual(p.calls,[])
 assert.equal(p.action('patronage-entry'),undefined);p.scope.stop()
})

test('detail variant keeps complete crown records and its package entry without thank-you slides',async()=>{
 const row={...crown(),boss_name:'真实完整老板姓名',source:'day_pass_bonus'}
 const p=setup(file,{getPatronageCrowns:async()=>[row]},{playerId:7,compact:false})
 await p.life.show[0]()
 assert.equal(track(p),undefined);assert.equal(p.action('crowns-toggle'),undefined)
 assert.match(p.text(),/真实完整老板姓名/);assert.match(p.text(),/日冠/);assert.match(p.text(),/包天赠送/)
 assert.match(p.text(),/到期 2026-11-01/);assert.doesNotMatch(p.text(),/感谢/)
 assert.equal(p.tree().some(n=>n.props?.class==='crown-copy'),false)
 p.action('patronage-entry').props.onTap()
 assert.deepEqual(p.calls,[['/pages/client/patronage/index',{playerId:7}]])
 p.scope.stop()
})

test('failed or empty crowns clear decoration and retry cannot bubble to player navigation',async()=>{
 let mode='active'
 const p=setup(file,{getPatronageCrowns:async()=>{if(mode==='fail')throw Error('503');return mode==='empty'?[]:[crown()]}},{playerId:7,compact:true})
 await p.life.show[0]();assert.ok(p.action('crowns-toggle'))
 mode='fail';const refreshing=p.life.show[0]()
 assert.equal(p.action('crowns-toggle'),undefined);assert.deepEqual(p.emitted.at(-1),['active-change',false])
 await refreshing;assert.equal(p.action('crowns-toggle'),undefined);assert.ok(p.action('crowns-retry'))
 mode='active';const event=tapEvent();await p.action('crowns-retry').props.onTap(event)
 assert.equal(event.stopped,true);assert.ok(p.action('crowns-toggle'));assert.deepEqual(p.calls,[])
 mode='empty';await p.life.show[0]()
 assert.equal(p.action('crowns-toggle'),undefined);assert.equal(p.action('crowns-retry'),undefined)
 assert.deepEqual(p.emitted.at(-1),['active-change',false]);p.scope.stop()
})

test('a late prior player response cannot decorate the replacement player',async()=>{
 const requests=[],props=vue.reactive({playerId:7,compact:true})
 const p=setup(file,{getPatronageCrowns:id=>new Promise((resolve,reject)=>requests.push({id,resolve,reject}))},props)
 const oldShow=p.life.show[0]()
 props.playerId=8;await tick()
 assert.deepEqual(requests.map(r=>r.id),[7,7,8])
 assert.deepEqual(p.emitted.at(-1),['active-change',false])
 requests[0].resolve([{...crown(),boss_name:'旧老板'}]);requests[1].resolve([{...crown(),boss_name:'旧老板'}])
 await oldShow;await tick()
 assert.equal(p.action('crowns-toggle'),undefined);assert.equal(p.emitted.some(e=>e[1]===true),false)
 requests[2].resolve([{...crown(2),boss_name:'新老板'}]);await tick()
 assert.match(p.text(),/新老板/);assert.doesNotMatch(p.text(),/旧老板/)
 assert.deepEqual(p.emitted.at(-1),['active-change',true])
 props.playerId=0;await tick()
 assert.equal(p.action('crowns-toggle'),undefined);assert.deepEqual(p.emitted.at(-1),['active-change',false])
 assert.equal(requests.length,3);p.scope.stop()
})

for(const hook of ['hide','unload','unmount'])test(`${hook} clears crown decoration and ignores a delayed response`,async()=>{
 let hold=false,resolve
 const p=setup(file,{getPatronageCrowns:()=>hold?new Promise(r=>resolve=r):Promise.resolve([crown(1),crown(2)])},{playerId:7,compact:true})
 await p.life.show[0]();p.action('crowns-toggle').props.onTap(tapEvent())
 assert.equal(styleValue(p,'animation-play-state'),'paused')
 hold=true;const loading=p.life.show[0]();p.life[hook][0]()
 const afterHide=p.emitted.length
 assert.equal(p.action('crowns-toggle'),undefined);assert.deepEqual(p.emitted.at(-1),['active-change',false])
 resolve([crown()]);await loading
 assert.equal(p.action('crowns-toggle'),undefined);assert.equal(p.emitted.length,afterHide)
 if(hook==='hide'){
  hold=false;await p.life.show[0]()
  assert.equal(styleValue(p,'animation-play-state'),'running');assert.deepEqual(p.emitted.at(-1),['active-change',true])
 }
 p.scope.stop()
})

test('real API filters expired or future crowns before a compact host can emit decoration',async()=>{
 const p=setup(file,{}, {playerId:7,compact:true}),now=Date.now()
 p.h.uni.request=o=>o.success({statusCode:200,data:{results:[
  {...crown(),starts_at:new Date(now-2000).toISOString(),expires_at:new Date(now-1000).toISOString()},
  {...crown(2),starts_at:new Date(now+1000).toISOString(),expires_at:new Date(now+2000).toISOString()}
 ]}})
 await p.life.show[0]()
 assert.equal(p.action('crowns-toggle'),undefined);assert.deepEqual(p.emitted.at(-1),['active-change',false])
 assert.equal(p.emitted.some(e=>e[1]===true),false);p.scope.stop()
})
