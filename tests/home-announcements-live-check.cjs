// Read-only captured HTTP JSON -> real TS parser -> real SFC setup/render.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const {setup,tick}=require('./announcements-harness.cjs')
const {homeHarness}=require('./home-reference-harness.cjs')
const snapshots=process.argv[2];assert.ok(snapshots,'pass directory of actual anonymous GET responses')
;(async()=>{
 for(const [route,kind,file,title] of [['popular-announcements','popular','popular-20','热门广播'],['patronage-announcements','patronage','patronage-20','冠名通报']]){
  const data=JSON.parse(fs.readFileSync(path.join(snapshots,file+'.json'),'utf8'));assert.ok(data.count>0,'positive real data required')
  const s=setup(`src/pages/client/${route}/index.vue`);try{
   s.life.load[0]({kind:'all'});s.life.show[0]();const req=s.requests[0];assert.equal(req.data.kind,kind);assert.equal(req.data.page,data.page);assert.equal(req.data.page_size,data.page_size)
   req.success({statusCode:200,data});await tick();assert.equal(s.tree().filter(n=>n.props?.['data-action']==='record').length,data.results.length)
   assert.ok(s.text().includes(title));for(const row of data.results){assert.ok(s.text().includes(row.boss_name));assert.ok(s.text().includes(row.kind==='vip_upgrade'?row.to_tier_name:row.item_name));assert.ok((kind==='popular'?['gift','vip_upgrade']:[kind]).includes(row.kind))}
   assert.ok(!s.text().includes('加载失败'));assert.ok(s.requests.every(r=>r.method==='GET'&&!r.header?.Authorization));console.log(`PASS actual HTTP JSON -> TS parser -> ${route}: count=${data.count}, rendered=${data.results.length}, GET-only`)
  }finally{s.close()}
 }
 const data=JSON.parse(fs.readFileSync(path.join(snapshots,'catalog.json'),'utf8'));const home=homeHarness({guest:true,games:data.games});try{
  await home.load();home.state.goSteamGames();assert.deepEqual(home.calls.at(-1),['/pages/shop/category/index']);assert.equal(home.storage['catalog:requested-game-kind'],'mini-games');assert.equal(home.state.steamGame.value,null);console.log('PASS actual catalogue: no mini-game configured; entry opens catalogue with explicit missing-game intent, never another game or customer service')
 }finally{home.scope.stop()}
})().catch(e=>{console.error(e);process.exitCode=1})
