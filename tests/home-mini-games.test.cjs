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

function catalogueApi(packages, order) {
 const h=harness({'@/utils/request':{default:{get:async path=>path==='/boss/packages'?packages:order}},'@/api/pay':{reconcileVirtualCheckoutByOrder:async()=>{throw Error('Unexpected payment reconciliation')}}})
 return h.load('src/api/boss.ts')
}
const hourlyPackage=(name,id=37)=>({id,name,game_service_name:'暗区突围',group_id:1,group_name:'大神包时',selling_mode:'public',product_type:'normal',base_price:30,player_count:1,sort_order:id,is_active:true,description:`${name}陪玩，按小时计费。`,detail_text:`暗区突围${name}陪玩服务，单人服务，按小时计费。每小时300钻石。`,specs:[{id:109,price:30,name:'1小时',required_player_type_id:10,is_active:true}]})

test('catalogue displays six hourly tier names while preserving server prices and identity',async()=>{
 const oldNames=['娱乐mini','技术mini','娱乐pro','技术pro','金牌','明星'],newNames=['娱乐陪','技术陪','情绪陪','银牌','金牌','魔王']
 const prices=[30,40,50,65,80,100],typeIds=[10,2,12,13,3,4]
 const raw=oldNames.map((name,i)=>({...hourlyPackage(name,37+i),base_price:prices[i],detail_text:`暗区突围${name}陪玩服务。每小时${prices[i]*10}钻石。`,specs:[{id:109+i,price:prices[i],name:'1小时',required_player_type_id:typeIds[i],is_active:true}]}))
 const snapshot=structuredClone(raw),shown=await catalogueApi(raw).getPackages()
 assert.deepEqual(shown.map(p=>p.name),newNames)
 for(let i=0;i<shown.length;i++){
  assert.equal(shown[i].id,raw[i].id);assert.equal(shown[i].base_price,prices[i]);assert.deepEqual(shown[i].specs,raw[i].specs)
  assert.equal(shown[i].description,`${newNames[i].endsWith('陪')?newNames[i].slice(0,-1):newNames[i]}陪玩，按小时计费。`)
  assert.match(shown[i].detail_text,new RegExp(`每小时${prices[i]*10}钻石`));assert.doesNotMatch(shown[i].detail_text,/mini|pro|明星|陪陪玩/)
 }
 assert.deepEqual(raw,snapshot,'display normalization must not mutate server data')
})

test('tier compatibility leaves current names, unrelated products, designated services and old orders intact',async()=>{
 const rows=[...['娱乐陪','技术陪','情绪陪','银牌','金牌','魔王'].map((name,i)=>hourlyPackage(name,100+i)),
  ...[{game_service_name:'三角洲行动'},{group_name:'女陪'},{selling_mode:'player_designated'},{product_type:'guarantee'},{name:'娱乐mini 特别版'},{name:'constructor'}].map((extra,i)=>({...hourlyPackage('娱乐mini',110+i),...extra}))]
 assert.deepEqual(await catalogueApi(rows).getPackages(),rows)
 const order={package_name:'娱乐mini',package_name_raw:'娱乐mini',paid:true,status:'已完成'}
 const result=await catalogueApi([],order).getOrder('old-order')
 assert.equal(result.package_name,'娱乐mini');assert.equal(result.package_name_raw,'娱乐mini')
})
