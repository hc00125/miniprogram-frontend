const test=require('node:test'),assert=require('node:assert/strict')
const {setup,row,tick}=require('./announcements-harness.cjs')
const upgrade={id:'vip_upgrade:1',kind:'vip_upgrade',boss_name:'升级老板',boss_avatar_url:'https://example.test/boss.png',from_tier_name:'初级',to_tier_name:'高级',occurred_at:'2026-10-08T10:00:00+00:00',text:'恭喜老板「升级老板」从「初级」升级为「高级」'}
for(const home of [false,true]) test(`real parser and ${home?'home':'popular page'} render gift plus upgrade without fake recipient`,async()=>{
 const s=setup(home?'src/components/HomeAnnouncements.vue':'src/pages/client/popular-announcements/index.vue',home?{active:true}:{})
 try{
  if(!home){s.life.load[0]({});s.life.show[0]()}
  const r=s.requests.find(r=>r.data.kind==='popular');assert.ok(r,'must request unified popular feed')
  s.respond(r,[upgrade,row('gift')]);if(home)s.respond(s.requests.find(r=>r.data.kind==='patronage'),[])
  await tick();for(const text of ['升级老板','初级','高级','玫瑰'])assert.ok(s.text().includes(text),text)
  assert.ok(!s.action('image-player-vip_upgrade:1'));assert.ok(!s.text().includes('加载失败'))
  if(!home){s.action('record').props.onTap();assert.equal(s.calls.filter(c=>c[0]==='/pages/player/detail/index').length,0)}
 }finally{s.close()}
})
test('popular parser rejects fabricated recipient shape and legacy all rejects upgrade',()=>{
 const s=setup('src/pages/client/popular-announcements/index.vue');try{
 const {parseAnnouncements}=s.h.load('src/api/announcements.ts');const page=r=>({count:1,page:1,page_size:20,results:[r]})
 assert.equal(parseAnnouncements(page(upgrade),'popular',1,20).results[0].to_tier_name,'高级')
 assert.throws(()=>parseAnnouncements(page(upgrade),'all',1,20))
 assert.throws(()=>parseAnnouncements(page({...upgrade,to_tier_name:''}),'popular',1,20))
 assert.throws(()=>parseAnnouncements(page(row('patronage')),'popular',1,20))
 }finally{s.close()}
})
