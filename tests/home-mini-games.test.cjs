const test=require('node:test'),assert=require('node:assert/strict')
const {homeHarness}=require('./home-reference-harness.cjs')
const {harness,nodes}=require('./commerce-sfc-harness.cjs')
const vue=require('vue')
function category(games,storage={},fail=false){
 const life={load:[],show:[]};const h=harness({'vue':vue,'@dcloudio/uni-app':{onLoad:f=>life.load.push(f),onShow:f=>life.show.push(f),onShareAppMessage(){},onShareTimeline(){}},'@/api/catalog':{getCatalogNavigation:async()=>{if(fail)throw Error('offline');return {games}}},'@/api/boss':{getPackages:async()=>[]},'@/utils/feedback':{toast(){},getErrorMessage:()=>''},'@/components/MainBottomTabs.vue':{default:{}},'@/components/ProductCover.vue':{default:{}}})
 Object.assign(h.storage,storage);h.uni.removeStorageSync=k=>delete h.storage[k];h.uni.getSystemInfoSync=()=>({statusBarHeight:20})
 const C=h.load('src/pages/shop/category/index.vue').default;const scope=vue.effectScope();const draw=scope.run(()=>C.setup({}, {expose(){}}));
 return {h,life,scope,tree:()=>nodes(draw({},[])),text:()=>nodes(draw({},[])).filter(n=>typeof n.children==='string').map(n=>n.children).join('|')}
}
test('mini-game poster always opens catalogue with explicit intent, never customer service or another game',async t=>{
 for(const games of [[],[{id:2,name:'三角洲行动',code:'delta-force',groups:[]}],[{id:18,name:'小游戏陪玩',code:'steam',groups:[]}]]){
 const h=homeHarness({guest:true,games});t.after(()=>h.scope.stop());await h.load();h.storage['catalog:requested-game-id']=2;h.state.goSteamGames()
 assert.deepEqual(h.calls.at(-1),['/pages/shop/category/index']);assert.equal(h.storage['catalog:requested-game-kind'],'mini-games');assert.equal(h.storage['catalog:requested-game-id'],games[0]?.id===18?18:undefined)
 h.state.goCustomerService();assert.deepEqual(h.calls.at(-1),['/pages/client/customer-service/index'])
 }
})
test('catalogue does not masquerade the first game as missing mini-games; selecting another game is explicit',async t=>{
 const s=category([{id:2,name:'三角洲行动',code:'delta-force',groups:[]}],{'catalog:requested-game-kind':'mini-games'});t.after(()=>s.scope.stop());s.life.load[0]();await s.life.show[0]()
 assert.match(s.text(),/小游戏服务暂未上架，请选择其他游戏/);assert.equal(s.tree().filter(n=>n.props?.class==='game-tab active').length,0);assert.equal(s.h.storage['catalog:requested-game-kind'],undefined)
 s.tree().find(n=>n.props?.class?.includes('game-tab')&&n.props?.onTap).props.onTap();assert.doesNotMatch(s.text(),/小游戏服务暂未上架/)
 const active=s.tree().filter(n=>n.props?.class==='game-tab active');assert.equal(active.length,1);assert.ok(nodes(active[0]).some(n=>n.children==='三角洲行动'))
})
test('catalogue resolves mini-games from real directory instead of stale id and preserves empty categories',async t=>{
 const s=category([{id:2,name:'三角洲行动',code:'delta-force',groups:[]},{id:18,name:'小游戏陪玩',code:'steam',groups:[]}],{'catalog:requested-game-kind':'mini-games','catalog:requested-game-id':2});t.after(()=>s.scope.stop());s.life.load[0]();await s.life.show[0]()
 assert.match(s.text(),/该游戏暂未配置套餐分类/);assert.doesNotMatch(s.text(),/小游戏服务暂未上架/)
 const active=s.tree().filter(n=>n.props?.class==='game-tab active');assert.equal(active.length,1);assert.ok(nodes(active[0]).some(n=>n.children==='小游戏陪玩'))
})
