// Executes the actual SFC, API modules and request parser; only platform/child boundaries are injected.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),vue=require('vue')
const {parse,compileScript}=require('@vue/compiler-sfc'),{compile}=require('@vue/compiler-dom'),{renderToString}=require('@vue/server-renderer')
const root=path.join(__dirname,'..')
function detailHarness(respond){
 const hooks={},calls=[],cache={}
 const uni={getStorageSync:()=>'', $on(){},$off(){},navigateBack(){},request(o){calls.push(o.url);Promise.resolve().then(()=>respond(o.url.replace('https://api.huc125.cn/api',''))).then(r=>o.success(r),e=>o.fail(e))}}
 const mocks={vue,'@dcloudio/uni-app':{onLoad:f=>hooks.load=f,onShow:f=>hooks.show=f},'@/api/pay':{},
 '@/utils/sessionExpiry':{handleSessionExpiry:()=>null},'@/utils/accountRestriction':{showAccountRestrictionModal:async()=>{}},
 '@/utils/purchaseAvailability':{getClientPlatform:()=> 'android',isIOSExemptRequest:()=>false,isIOSPurchaseEnabled:()=>true,isPurchaseCreationRequest:()=>false},
 '@/utils/feedback':{toast:x=>calls.push(['toast',x]),getErrorMessage:(e,d)=>e.detail||d},'@/utils/nav':{go:(...a)=>calls.push(['go',...a])},
 '@/components/gifts/GiftHost.vue':{default:{}},'@/components/PatronageCrowns.vue':{default:{}}}
 function load(name){
  if(mocks[name])return mocks[name];if(cache[name])return cache[name]
  const file=path.join(root,'src',name.replace('@/', '')+'.ts')
  const source=fs.readFileSync(file,'utf8').replace(/import\.meta\.env/g,'({})')
  return cache[name]=run(source)
 }
 function run(source){const m={exports:{}};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:m,exports:m.exports,require:load,uni,console,setTimeout});return m.exports}
 const source=fs.readFileSync(path.join(root,'src/pages/player/detail/index.vue'),'utf8'),d=parse(source).descriptor
 const state=run(compileScript(d,{id:'player-detail-test'}).content).default.setup({},{expose(){}})
 const render=new Function('Vue',compile(d.template.content,{mode:'function',prefixIdentifiers:true,isCustomElement:t=>['view','text','image','scroll-view','button'].includes(t)}).code)(vue)
 async function html(){const app=vue.createSSRApp({setup:()=>({...state}),render});app.component('GiftHost',{render:()=>null});app.component('PatronageCrowns',{render:()=>null});return renderToString(app)}
 return {state,calls,hooks,html,async open(id){hooks.load({playerId:String(id)});await hooks.show()}}
}
module.exports={detailHarness}
