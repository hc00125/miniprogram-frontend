// Isolated real Django JsonResponse bytes -> production TS parser -> actual SFC.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const {setup,tick}=require('./announcements-harness.cjs')
const dir=process.argv[2];assert.ok(dir,'pass actual isolated Django response directory')
;(async()=>{
 for(const home of [false,true]){
  const s=setup(home?'src/components/HomeAnnouncements.vue':'src/pages/client/popular-announcements/index.vue',home?{active:true}:{})
  try{
   if(!home){s.life.load[0]({kind:'patronage'});s.life.show[0]()}
   for(const r of s.requests){const data=JSON.parse(fs.readFileSync(path.join(dir,`${r.data.kind}-${r.data.page_size}.json`),'utf8'));r.success({statusCode:200,data})}
   await tick();const data=JSON.parse(fs.readFileSync(path.join(dir,`popular-${home?10:20}.json`),'utf8'))
   assert.ok(data.results.some(r=>r.kind==='gift'));assert.ok(data.results.some(r=>r.kind==='vip_upgrade'))
   for(const r of data.results){assert.ok(s.text().includes(r.boss_name));if(r.kind==='vip_upgrade'){assert.ok(s.text().includes(r.from_tier_name));assert.ok(s.text().includes(r.to_tier_name));assert.equal(s.action(`image-player-${r.id}`),undefined)}else assert.ok(s.text().includes(r.item_name))}
   assert.ok(!s.text().includes('加载失败'));assert.ok(s.requests.every(r=>r.method==='GET'&&!r.header?.Authorization))
   console.log(`PASS Django PG actual JSON -> TS/parser -> ${home?'homepage':'popular page'}: ${data.results.length} records, both types, no writes`)
  }finally{s.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1})
