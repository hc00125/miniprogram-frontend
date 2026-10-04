const {test}=require('node:test'),assert=require('node:assert/strict'),vue=require('vue')
const {harness,nodes}=require('./commerce-sfc-harness.cjs')
test('patronage old link shows departure and never enables or submits a new purchase',async()=>{
 const {setup,catalog}=require('./patronage-harness.cjs'),c=catalog()
 c.player.is_archived=true;c.player.name='原昵称（已离开）';c.packages.forEach(x=>{x.available=false;x.blockers=['PLAYER_UNAVAILABLE']})
 const p=setup('src/pages/client/patronage/index.vue'),requests=[]
 p.h.uni.request=o=>{requests.push(o);o.success({statusCode:200,data:o.url.endsWith('/pending/')?{count:0,next:null,previous:null,results:[]}:c})}
 p.life.load[0]({playerId:'7'});await p.life.show[0]()
 assert.match(p.text(),/该陪玩已离开/)
 assert.equal(p.action('purchase').props.disabled,true)
 await p.action('purchase').props.onTap()
 assert.ok(requests.every(o=>o.method==='GET'));p.scope.stop()
})

test('old player link loads departed detail and has no new business actions',async()=>{
 const life={load:[],show:[]},calls=[]
 const departed={id:77,name:'原昵称',is_archived:true,is_online:true,can_be_designated:true}
 const h=harness({vue:{...vue,onBeforeUnmount:()=>{}},'@dcloudio/uni-app':{onLoad:f=>life.load.push(f),onShow:f=>life.show.push(f)},
 '@/api/boss':{getPlayerList:async()=>[],getPublicPlayerDetail:async id=>{calls.push(['detail',id]);return departed},getPlayerServiceProducts:async()=>{calls.push(['buy']);return {products:[]}}},
 '@/api/player':{getPublicPlayerRatings:async()=>({results:[]})},'@/utils/feedback':{toast:()=>{},getErrorMessage:()=>''},'@/utils/nav':{go:(...a)=>calls.push(a)},
 '@/components/gifts/GiftHost.vue':{default:{name:'GiftHost'}},'@/components/PatronageCrowns.vue':{default:{name:'PatronageCrowns'}}})
 const scope=vue.effectScope(),C=h.load('src/pages/player/detail/index.vue').default
 const draw=scope.run(()=>C.setup({}, {expose(){}}))
 life.load.forEach(f=>f({playerId:'77'}));await Promise.all(life.show.map(f=>f()))
 const tree=nodes(draw({},[])),text=tree.filter(n=>typeof n.children==='string').map(n=>n.children).join('|')
 assert.deepEqual(calls,[['detail',77]])
 assert.match(text,/原昵称/);assert.match(text,/已离开/)
 assert.ok(!tree.some(n=>n.type?.name==='GiftHost'))
 const buy=tree.find(n=>n.props?.class==='order-btn');if(buy){assert.equal(buy.props.disabled,true);await buy.props.onTap()}
 assert.equal(calls.length,1);scope.stop()
})
