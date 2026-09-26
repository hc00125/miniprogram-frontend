// Pure helper: actual homepage SFC/script/template; only API/platform/child boundaries are injected.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),vue=require('vue')
const {parse,compileScript}=require('@vue/compiler-sfc')
const {compile}=require('@vue/compiler-dom')
const {renderToString}=require('@vue/server-renderer')
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/pages/boss/home/index.vue'),'utf8')
const descriptor=parse(source).descriptor
const render=new Function('Vue',compile(descriptor.template.content,{mode:'function',prefixIdentifiers:true,isCustomElement:t=>['view','text','image','scroll-view','swiper','swiper-item'].includes(t)}).code)(vue)
function homeHarness(options={}){
 const hooks={show:[],hide:[]},events={},calls=[],storage={token:options.guest?'':'home-fixture-token',client_profile:options.guest?null:{id:7,...options.profile}}
 const uni={getStorageSync:k=>storage[k],setStorageSync:(k,v)=>storage[k]=v,removeStorageSync:k=>delete storage[k],$on:(k,f)=>events[k]=f,$off:k=>delete events[k]}
 const mocks={vue,'@dcloudio/uni-app':{onShow:f=>hooks.show.push(f),onHide:f=>hooks.hide.push(f),onShareAppMessage(){},onShareTimeline(){}},
  '@/api/boss':{getPackages:async()=>{if(options.packageFail)throw Error('offline');return options.packages||[]},getPlayerList:async()=>{if(options.playerFail)throw Error('offline');return options.players||[]}},
  '@/api/catalog':{getCatalogNavigation:async()=>{if(options.catalogFail)throw Error('offline');return {games:options.games||[]}}},
  '@/api/wallet':{getWalletOverview:async()=>{calls.push(['wallet-read']);if(options.walletRead)return options.walletRead();if(options.walletFail)throw Error('offline');return {balance_diamonds:options.balance??123.4}}},
  '@/components/MainBottomTabs.vue':{default:{}},'@/components/gifts/GiftHost.vue':{default:{}},
  '@/utils/uiIcons':{uiIcons:{order:'/icons/duotone/order.png',diamondLight:'/icons/duotone/diamond-light.png',chevron:'/icons/duotone/chevron.png',query:'/icons/duotone/query.png'}},
  '@/utils/nav':{go:(...args)=>calls.push(args),goMain:tab=>calls.push(['tab',tab]),navigateToTab:tab=>calls.push(['tab',tab])},
  '@/utils/client':{getClientProfile:()=>storage.client_profile},
  '@/utils/storage':{getStorage:k=>storage[k],SESSION_CHANGED_EVENT:'session-changed'},
  '@/utils/sessionExpiry':{SESSION_EXPIRED_EVENT:'session-expired'},
  '@/utils/accountRestriction':{getAccountRestrictionView:p=>({restricted:p?.account_status==='banned',reason:'账户受限'}),showAccountRestrictionModal:async()=>calls.push(['restriction-modal'])},
  '@/utils/diamonds':{diamondsFrom:(d,y)=>d??y*10,formatDiamonds:String},'@/utils/feedback':{toast:x=>calls.push(['toast',x])}}
 const compiled=compileScript(descriptor,{id:'home-reference'}),module={exports:{}}
 vm.runInNewContext(ts.transpileModule(compiled.content,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,uni,require:n=>{if(!(n in mocks))throw Error('Missing mock '+n);return mocks[n]}})
 const scope=vue.effectScope(),state=scope.run(()=>module.exports.default.setup({},{expose(){}}))
 async function html(){const app=vue.createSSRApp({setup:()=>({...state}),render});app.component('MainBottomTabs',{render:()=>null});app.component('GiftHost',{props:['recipientId','recipientName'],render(){return vue.h('button',{'data-recipient-id':this.recipientId,'data-recipient-name':this.recipientName},'送礼物')}});return renderToString(app)}
 return {state,scope,storage,calls,hooks,events,html,load:async()=>{for(const f of hooks.show)await f()},hide:()=>hooks.hide.forEach(f=>f())}
}
module.exports={homeHarness,source,descriptor}
