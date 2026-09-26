const test=require('node:test'),assert=require('node:assert/strict')
const {homeHarness}=require('./home-reference-harness.cjs')
const fs=require('node:fs'),path=require('node:path'),vue=require('vue'),{parse}=require('@vue/compiler-sfc'),{compile}=require('@vue/compiler-dom'),{renderToString}=require('@vue/server-renderer')
async function renderPage(file,state){const d=parse(fs.readFileSync(path.join(__dirname,'..',file),'utf8')).descriptor;const render=new Function('Vue',compile(d.template.content,{mode:'function',prefixIdentifiers:true,isCustomElement:()=>true}).code)(vue);return renderToString(vue.createSSRApp({setup:()=>state,render}))}
for(const page of ['list','detail'])test(`陪玩${page}在线徽章不再读取接单开关`,async()=>{
 const player={id:1,name:'fixture',is_online:false,presence_online:true}
 const state={player,players:[player],filteredPlayers:[player],filters:[],activeFilter:'全部',ratings:[],ratingSummary:{average_rating:0,rating_count:0,total_orders:0},refreshing:false,searchFocused:false,searchKeyword:'',searchSummary:'',loaded:true,emptyText:'',canDesignate:false,openingProduct:false,isPlaying:false,starText:()=>'',formatReviewDate:()=>''}
 for(const name of ['goMain','handleManualRefresh','fetchPlayers','clearSearch','openPlayerDetail','handleMainTabSelect','toggleAudio','openPlayerProduct','goBack'])state[name]=()=>{}
 const html=await renderPage(`src/pages/player/${page}/index.vue`,state);assert.match(html,/>在线</);assert.match(html,/休息中/)
})

test('首页在线徽章取自动活跃状态而不是手动接单开关',async()=>{
 const h=homeHarness({guest:true,players:[{id:1,name:'活动测试',type_name:'技术陪',avatar_url:'/fixture.png',is_online:false,presence_online:true}]})
 await h.load();const html=await h.html();assert.match(html,/>在线</);assert.doesNotMatch(html,/>离线</)
 assert.equal(h.state.players.value[0].is_online,false);h.scope.stop()
})
