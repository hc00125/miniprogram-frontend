const test=require('node:test'),assert=require('node:assert/strict'),{detailHarness}=require('./player-detail-harness.cjs')
for(const [label,response] of [['HTML route 404',{statusCode:404,data:'<html>Page not found</html>'}],['server 500',{statusCode:500,data:{detail:'server error'}}],['generic JSON 404',{statusCode:404,data:{detail:'Not found'}}],['timeout',null]]){
 test(`detail ${label} is load error with retry, never unavailable`,async()=>{
  const h=detailHarness(async()=>{if(!response)throw {errMsg:'request:fail timeout'};return response});await h.open(127)
  const html=await h.html();assert.match(html,/详情加载失败，请重试/);assert.match(html,/重新加载/);assert.doesNotMatch(html,/陪玩师不存在或已下架/)
 })
}
test('only explicit business unavailable JSON renders unavailable',async()=>{
 const h=detailHarness(async()=>({statusCode:404,data:{code:'PLAYER_UNAVAILABLE',detail:'陪玩师不存在或已下架'}}));await h.open(127)
 assert.match(await h.html(),/陪玩师不存在或已下架/);assert.doesNotMatch(await h.html(),/详情加载失败，请重试/)
})
test('retry uses same ID through real API and request; success loads ratings and service navigation',async()=>{
 let fail=true
 const h=detailHarness(async p=>{
  if(p==='/player/127/detail')return fail?{statusCode:503,data:{}}:{statusCode:200,data:{id:127,name:'测试陪玩',is_online:true,can_be_designated:true}}
  if(p==='/player/127/ratings')return {statusCode:200,data:{results:[],summary:{rating_count:0}}}
  if(p==='/catalog/players/127/products')return {statusCode:200,data:{player_id:127,products:[{id:42,specs:[{id:1}]}]}}
  throw Error('unexpected '+p)
 });await h.open(127);fail=false;await h.state.fetchPlayer()
 assert.equal(h.state.player.value.id,127);assert.doesNotMatch(await h.html(),/详情加载失败|不存在或已下架/)
 await h.state.openPlayerProduct();assert.equal(h.calls.filter(x=>x==='https://api.huc125.cn/api/player/127/detail').length,2)
 assert(h.calls.some(x=>Array.isArray(x)&&x[0]==='go'&&x[1]==='/pages/shop/detail/index'&&x[2].packageId===42&&x[2].playerId===127))
})
