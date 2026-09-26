// Local compiled JS setup/render smoke: fixture-only APIs, not a WeChat device or live checkout.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),vue=require('vue')
const root=path.join(__dirname,'../dist/build/mp-weixin'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),tick=()=>new Promise(setImmediate)
const checkout='pages/shop/checkout/index',hall='pages/player/grab/index'
for(const page of [checkout,hall])for(const ext of ['js','json','wxml','wxss'])assert.ok(fs.statSync(path.join(root,page+'.'+ext)).size,`${page}.${ext}`)
const app=JSON.parse(read('app.json'));assert.ok(app.pages.includes(checkout));assert.ok(app.pages.includes(hall));assert.ok(!app.pages.some(p=>p.includes('surcharge-foundation-test')))
assert.match(read(checkout+'.wxml'),/data-action="surcharge-input"/);assert.match(read(checkout+'.wxml'),/整单额外加价（选填）/)
assert.match(read(checkout+'.wxss'),/surcharge-choice/);assert.match(read(hall+'.wxml'),/每人加价净收益/);assert.match(read(hall+'.wxss'),/surcharge-reward/)
const quotes=[],creates=[],surchargeCreates=[],routes=[],store={token:'fixture-only-token',client_profile:{id:7,openid:'fixture-openid',nickname:'fixture-name'}},hooks={},events={}
const index={getStorageSync:k=>store[k],$on:(k,f)=>events[k]=f,$off:k=>delete events[k]}
const vendor={...vue,index,onLoad:f=>hooks.load=f,onShow:f=>hooks.show=f,onHide:f=>hooks.hide=f,onUnload:f=>hooks.unload=f,e:Object.assign,t:String,o:x=>x,p:x=>x,f:(a,fn)=>a.map(fn),_export_sfc:c=>c}
const overrides={
 uiIcons:{uiIcons:{diamond:'/icons/duotone/diamond.png'}},commerceRelease:{commerceRelease:{orderSurchargeQuoteSupported:true}},
 surchargePresentation:{parseWholeOrderAmount:v=>v===''||v==='0'?{amount:0,valid:true}:/^[1-9]\d*$/.test(v)?{amount:Number(v),valid:true}:{amount:null,valid:false}},
 surchargeQuote:{quoteOrderSurcharge:p=>new Promise(resolve=>quotes.push({p,resolve}))},surchargeCheckoutIntent:{makeSurchargeIntent:()=>({state:()=>null,create:async(p,q)=>{surchargeCreates.push([p,q]);return {order_no:'fixture-order',checkout:{idempotency_key:'fixture-original-key'}}},refresh:async()=>{},close(){}})},storage:{getStorage:k=>store[k]||'',setStorage:(k,v)=>store[k]=v,SESSION_CHANGED_EVENT:'auth-session-changed'},
 sessionExpiry:{SESSION_EXPIRED_EVENT:'session-expired'},boss:{getPackages:async()=>[{id:11,player_count:3,base_price:4,specs:[],name:'编译产物隔离商品'}],createOrder:async p=>{creates.push(p);return {order_no:'fixture-created'}}},
 orderBatch:{createCartOrderBatch:async()=>({})},serviceListings:{createSharedListingOrder:async()=>({})},client:{getClientProfile:()=>store.client_profile,syncClientProfile:async()=>store.client_profile},
 diamonds:{diamondsFrom:(a,y)=>String(Number(y)*10),formatDiamonds:x=>String(x)},feedback:{getErrorMessage:e=>e?.detail||e?.message||'失败',toast(){},success(){}},nav:{go(){},goMain(){},replace:(p,v)=>routes.push([p,v])},
 serviceBilling:{isHourlyService:()=>false,MAX_SERVICE_HOURS:24,normalizeServiceHours:()=>1},shopCart:{getShopCart:async()=>[]}
}
let Comp
vm.runInNewContext(read(checkout+'.js'),{require:p=>p.includes('vendor')?vendor:overrides[path.basename(p,'.js')]||{},wx:{createPage:c=>Comp=c},console,setTimeout,clearTimeout})
assert.ok(Comp?.setup)
const scope=vue.effectScope(),draw=scope.run(()=>Comp.setup({},{emit(){}})),render=()=>draw({},[])
function vals(o,out=[]){if(o&&typeof o==='object'){for(const v of Object.values(o))vals(v,out)}else if(typeof o==='string')out.push(o);return out}
function event(action,name){const tag=read(checkout+'.wxml').match(new RegExp('<[^>]+data-action="'+action+'"[^>]*>'))?.[0];assert.ok(tag,action);return tag.match(new RegExp(name+'="\\{\\{(\\w+)\\}\\}"'))?.[1]}
;(async()=>{
 await hooks.load({packageId:'11'});await tick();const input=event('surcharge-input','bindinput'),submit=event('submit-order','bindtap')
 render()[input]({detail:{value:'3'}});await new Promise(r=>setTimeout(r,330));assert.equal(quotes.length,1);assert.equal(quotes[0].p.surcharge_diamonds,3)
 quotes[0].resolve({base_amount_diamonds:'40.0',total_amount_diamonds:'43.0',required_players:3,surcharge:{amount_diamonds:3,per_person_gross_diamonds:'1.00',per_person_commission_diamonds:'0.25',per_person_net_diamonds:'0.75'},can_submit:false,blockers:['SURCHARGE_LIFECYCLE_UNAVAILABLE']});await tick();assert.ok(vals(render()).includes('43.0'));assert.ok(vals(render()).some(x=>x.includes('0.75')))
 render()[submit]();assert.equal(creates.length,0)
 const gameTag=read(checkout+'.wxml').match(/<input[^>]+placeholder="请输入游戏ID或队伍码"[^>]+>/)?.[0];assert.ok(gameTag)
 const gameHandler=gameTag.match(/bindinput="\{\{(\w+)\}\}"/)?.[1];assert.ok(gameHandler)
 render()[gameHandler]({detail:{value:'fixture-room'}})
 render()[input]({detail:{value:'3'}});await new Promise(r=>setTimeout(r,330));assert.equal(quotes.length,2)
 quotes[1].resolve({contract_version:'surcharge-v2',quote_version:'a'.repeat(64),base_amount_yuan:'4.00',surcharge_amount_yuan:'0.30',total_amount_yuan:'4.30',base_amount_diamonds:'40.0',total_amount_diamonds:'43.0',required_players:3,surcharge:{amount_diamonds:3,per_person_gross_diamonds:'1.00',per_person_commission_diamonds:'0.25',per_person_net_diamonds:'0.75'},can_submit:true,blockers:[]});await tick()
 render()[submit]();await tick();assert.equal(surchargeCreates.length,1);assert.equal(creates.length,0);assert.equal(routes[0][1].key,'fixture-original-key')
 hooks.hide();assert.ok(!vals(render()).includes('43.0'));scope.stop()
 console.log('PASS compiled checkout setup/render: false blocked, true creates original key once, hide clears; checkout/hall JS JSON WXML WXSS; synthetic fixture only')
})().catch(e=>{console.error(e);process.exitCode=1})
