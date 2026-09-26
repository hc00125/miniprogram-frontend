const {test}=require('node:test')
const assert=require('node:assert/strict')
const {homeHarness,descriptor}=require('./home-reference-harness.cjs')
const games=[{id:5,name:'暗区突围无限',icon_url:'https://images.invalid/game.png',groups:[]}]
const players=[{id:91,name:'测试技术陪',avatar_url:'https://images.invalid/a.png',player_type:{name:'技术陪'},is_online:true},{id:92,name:'测试娱乐陪',avatar_url:'https://images.invalid/b.png',player_type:{name:'娱乐陪'},is_online:false}]
test('homepage follows approved reference order with real wallet and two-column recipient cards, excluding unlaunched modules',async t=>{
 const h=homeHarness({games,players,balance:'123.4'});t.after(()=>h.scope.stop());await h.load();const html=await h.html()
 let previous=-1
 for(const label of ['hero-section','选择游戏','我的钻石','陪玩推荐']){const at=html.indexOf(label);assert.ok(at>previous,'visible section follows reference: '+label);previous=at}
 assert.match(html,/暗区突围无限/);assert.match(html,/123\.4/);assert.match(html,/充值钻石/)
 assert.equal((html.match(/class="player-card"/g)||[]).length,2)
 for(const id of [91,92])assert.ok(html.includes('data-recipient-id="'+id+'"'))
 assert.match(descriptor.styles[0].content,/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
 assert.doesNotMatch(html,/冠名|包天|通报|热门套餐|订单进度|暂未开放/)
 h.state.goFeaturedGame();assert.equal(h.storage['catalog:requested-game-id'],5);assert.deepEqual(h.calls.at(-1),['/pages/shop/category/index'])
 h.state.goRecharge();assert.deepEqual(h.calls.at(-1),['/pages/client/recharge/index'])
})

test('homepage recommendation filters keep true recipient identities and a four-card limit',async t=>{
 const rows=[...players,...Array.from({length:5},(_,i)=>({...players[0],id:100+i,name:'技术夹具'+i}))]
 const h=homeHarness({players:rows,games});t.after(()=>h.scope.stop());await h.load()
 assert.equal(h.state.featuredPlayers.value.length,4)
 h.state.activePlayerType.value='娱乐陪';const html=await h.html()
 assert.equal((html.match(/class="player-card"/g)||[]).length,1);assert.match(html,/测试娱乐陪/);assert.doesNotMatch(html,/测试技术陪/)
 h.state.openPlayerDetail(players[1]);assert.equal(h.calls.at(-1)[0],'/pages/player/detail/index');assert.equal(h.calls.at(-1)[1].playerId,92)
 h.state.openPlayerDetail({...players[1],can_be_designated:false});assert.equal(h.calls.at(-1)[0],'toast')
})
test('guest homepage does not fetch private balance or invent zero and recharge goes to login',async t=>{
 const h=homeHarness({guest:true,games});t.after(()=>h.scope.stop());await h.load();const html=await h.html()
 assert.match(html,/登录后查看余额/);assert.equal(h.calls.filter(c=>c[0]==='wallet-read').length,0)
 h.state.goRecharge();assert.deepEqual(h.calls.at(-1),['/pages/client/login/index'])
})
test('wallet failure is an explicit retry state and real zero remains zero',async t=>{
 let failed=true;const h=homeHarness({walletRead:async()=>{if(failed)throw Error('offline');return {balance_diamonds:'0'}}});t.after(()=>h.scope.stop());await h.load()
 assert.match(await h.html(),/加载失败 · 点击重试/);assert.equal(h.state.walletOverview.value,null)
 failed=false;await h.state.loadWallet();assert.equal(h.state.walletBalance.value,'0');assert.doesNotMatch(await h.html(),/加载失败/)
})
test('restricted recharge keeps existing account gate and public homepage remains readable',async t=>{
 const h=homeHarness({games,profile:{account_status:'banned'}});t.after(()=>h.scope.stop());await h.load();assert.match(await h.html(),/账户受限/)
 h.state.goRecharge();assert.equal(h.calls.at(-1)[0],'restriction-modal');assert.ok(!h.calls.some(c=>c[0]==='/pages/client/recharge/index'))
})
for(const change of ['hide','switch','expire'])test('late wallet read cannot refill homepage after '+change,async t=>{
 let resolve;const h=homeHarness({walletRead:()=>new Promise(done=>resolve=done)});t.after(()=>h.scope.stop());const pending=h.load()
 await new Promise(setImmediate)
 if(change==='hide')h.hide()
 if(change==='switch')h.storage.token='different-fixture-session'
 if(change==='expire'){h.storage.token='';h.events['session-expired']('token')}
 resolve({balance_diamonds:'98765.4'});await pending
 assert.equal(h.state.walletOverview.value,null);assert.doesNotMatch(await h.html(),/98765\.4/)
})
test('catalogue and recommendation errors are not mislabeled as real empty data',async t=>{
 const h=homeHarness({catalogFail:true,playerFail:true,guest:true});t.after(()=>h.scope.stop());await h.load();const html=await h.html()
 assert.match(html,/游戏加载失败，点击重试/);assert.match(html,/陪玩加载失败，点击重试/)
 assert.doesNotMatch(html,/暂无已上架游戏|暂无可推荐的陪玩|暗区突围无限|冠名|包天/)
})
