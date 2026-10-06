const { test } = require('node:test')
const assert = require('node:assert/strict')
const vue = require('vue')
const { homeHarness, source } = require('./home-reference-harness.cjs')
test('three approved banners remain available offline, with activity rules and display-only brand', async t => {
 const h=homeHarness({guest:true,packageFail:true,catalogFail:true});t.after(()=>h.scope.stop());await h.load()
 const banners=vue.unref(h.state.heroBanners)
 assert.deepEqual(Array.from(banners,b=>b.id),['national-bounty','club-welcome','arena-s7'])
 assert.deepEqual(Array.from(banners,b=>b.image),['/images/home-redesign/national-bounty-2026.jpg','/images/home-redesign/club-welcome.jpg','/images/home-redesign/arena-s7-utopia.jpg'])
 h.state.handleHeroBannerTap(banners[0].target);assert.equal(h.calls.at(-1)[0],'/pages/client/national-bounty/index')
 const before=h.calls.length;h.state.handleHeroBannerTap(banners[1].target);assert.equal(h.calls.length,before)
 assert.doesNotMatch(source,/getPackages|goShopDetail|package-22/)
})
test('Arena banner selects the real Arena game even when another game comes first',async t=>{
 for(const game of [{id:73,name:'暗区突围无限',code:'aqtw'},{id:91,name:'战术射击',code:'arena-breakout-infinite'}]){
  const h=homeHarness({guest:true,games:[{id:12,name:'小游戏',code:'steam'},game]});t.after(()=>h.scope.stop());await h.load()
  h.state.handleHeroBannerTap('arena');assert.equal(h.storage['catalog:requested-game-id'],game.id);assert.equal(h.calls.at(-1)[0],'/pages/shop/category/index')
 }
})
test('Arena loading does not misroute; missing game or failed API opens customer service',async t=>{
 for(const options of [{games:[{id:12,name:'小游戏',code:'steam'}]},{catalogFail:true}]){
  const h=homeHarness({guest:true,...options});t.after(()=>h.scope.stop());await h.load()
  h.state.catalogLoading.value=true;h.state.handleHeroBannerTap('arena');assert.deepEqual(h.calls.at(-1),['toast','服务加载中，请稍后再试'])
  h.state.catalogLoading.value=false;h.state.handleHeroBannerTap('arena');assert.equal(h.calls.at(-1)[0],'/pages/client/customer-service/index');assert.equal(h.calls.at(-1)[1].scene,'arena');assert.equal(h.storage['catalog:requested-game-id'],undefined)
 }
})
test('failed local banner keeps a readable fallback and working destination',async t=>{
 const h=homeHarness({guest:true});t.after(()=>h.scope.stop());await h.load();const banner=vue.unref(h.state.heroBanners)[0]
 h.state.handleHeroImageError(banner);assert.equal(vue.unref(h.state.heroBanners).length,3)
 const html=await h.html();assert.match(html,/hero-slide__fallback/);assert.match(html,/国庆赏金赛，查看活动规则/);assert.doesNotMatch(html,/src="\/images\/home-redesign\/national-bounty-2026.jpg"/)
 h.state.handleHeroBannerTap(banner.target);assert.equal(h.calls.at(-1)[0],'/pages/client/national-bounty/index')
})
test('home retains order notice and existing user destinations',async t=>{
 const h=homeHarness({guest:true});t.after(()=>h.scope.stop());await h.load();assert.match(await h.html(),/下单须知/)
 h.state.goOrderNotice();assert.equal(h.calls.at(-1)[0],'/pages/boss/order-notice/index')
 for(const tab of ['query','players','profile']){h.state.handleMainTabSelect(tab);assert.equal(h.calls.at(-1)[1],tab)}
})
