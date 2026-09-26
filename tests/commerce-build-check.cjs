// Post-build verification with synthetic uni platform; not a WeChat device test.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),vue=require('vue')
const root=path.join(__dirname,'..','dist/build/mp-weixin'), read=p=>fs.readFileSync(path.join(root,p),'utf8'), tick=()=>new Promise(setImmediate)
function values(v,out=[]){if(v && typeof v==='object'){for(const x of Object.values(v))values(x,out)}else if(typeof v==='string')out.push(v);return out}
function event(file,action,name='bindtap') {const tag=read(file+'.wxml').match(new RegExp('<[^>]+data-action="'+action+'"[^>]*>'))?.[0];assert.ok(tag,action);return tag.match(new RegExp(name+'="\\{\\{(\\w+)\\}\\}"'))[1]}
function runtime(file,deps={},store={token:'synthetic-client',client_profile:{id:1}}){
 let Component;const hooks={},events={}
 const vendor={...vue,index:{getStorageSync:k=>store[k],$on:(k,f)=>events[k]=f,$off:k=>delete events[k]},onShow:f=>hooks.show=f,onHide:f=>hooks.hide=f,onUnload:f=>hooks.unload=f,e:Object.assign,t:String,o:x=>x,p:x=>x,f:(a,fn)=>a.map(fn),_export_sfc:c=>c}
 vm.runInNewContext(read(file+'.js'),{require:p=>p.includes('vendor')?vendor:deps[Object.keys(deps).find(k=>p.includes(k))] || {SESSION_EXPIRED_EVENT:'session:expired'},wx:{createComponent:c=>Component=c,createPage:c=>Component=c},console})
 const scope=vue.effectScope();return{scope,hooks,events,store,setup:props=>{const draw=scope.run(()=>Component.setup(props,{emit(){}}));return()=>draw(props,[])}}
}
async function main(){
 const app=JSON.parse(read('app.json'));assert.equal(app.pages[0],'pages/boss/home/index');assert.ok(app.pages.includes('pages/client/gifts/index'))
 for(const [page,component] of [['player/list','gift-host'],['player/detail','gift-host'],...['boss/waiting','boss/query','boss/payment','boss/in-progress'].map(p=>[p,'order-surcharge-host'])]){
  assert.ok(JSON.parse(read('pages/'+page+'/index.json')).usingComponents[component],page)
  assert.ok(read('pages/'+page+'/index.wxml').includes('<'+component),page)
 }
 for(const component of ['gifts/GiftHost','gifts/GiftLiveSheet','gifts/GiftGrid','orders/OrderSurchargeHost','orders/OrderSurchargeSheet'])for(const ext of ['js','json','wxml','wxss'])assert.ok(fs.statSync(path.join(root,'components',component+'.'+ext)).size)
 for(const ext of ['js','json','wxml','wxss'])assert.ok(fs.statSync(path.join(root,'pages/client/gifts/index.'+ext)).size)
 assert.ok(JSON.parse(read('components/gifts/GiftHost.json')).usingComponents['gift-live-sheet'])
 assert.ok(read('pages/client/profile/index.js').includes('/pages/client/gifts/index'))
 const requests=[],f='components/orders/OrderSurchargeHost',h=runtime(f,{commerceRelease:{commerceRelease:{orderSurchargeReadSupported:true}},commerceRead:{readOrderSurcharge:(...args)=>new Promise(resolve=>requests.push({args,resolve}))}}),props=vue.reactive({orderNo:'original/订单'}),render=h.setup(props),refresh=event(f,'refresh','catchtap')
 h.hooks.show();render()[refresh]();assert.deepEqual(Array.from(requests[0].args),['original/订单',1])
 requests[0].resolve({order_no:props.orderNo,required_players:2,paid_diamonds:8,processing_diamonds:2,refunded_diamonds:1,disabled_reason:'规则待确认',blockers:[],records:[{surcharge_no:'same-original',payment_status:'unknown',amount_diamonds:2}],previous:null,next:null,amount_options_diamonds:[]})
 await tick();let out=render();const vs=values(out);assert.ok(vs.includes('8'));assert.ok(vs.includes('2'));assert.ok(vs.includes('same-original'));assert.ok(vs.some(x=>x.includes('未知')));assert.ok(Object.values(out).some(x=>x?.['read-state']?.eligible===false))
 out[refresh]();h.hooks.hide();requests[1].resolve({paid_diamonds:999});await tick();assert.ok(!values(render()).includes('999'));h.scope.stop()
 // Execute actual compiled live gift render: quote decimal -> one explicit pay -> GET only unknown recovery.
 const calls=[],gift='components/gifts/GiftLiveSheet',quote={total_diamonds:10,available_diamonds:'10.50',can_submit:true,blockers:[]};let journal=null
 const controller={invalidate(){},recovery:()=>journal,quote:async()=>{calls.push('quote');return quote},pay:async()=>{calls.push('pay');journal={state:'unknown',business_no:'same-purchase'};return {purchase_no:'same-purchase',payment_status:'unknown'}},recover:async()=>{calls.push('get');return {purchase_no:'same-purchase',payment_status:'unknown'}}}
 const g=runtime(gift,{giftCheckout:{createGiftCheckout:()=>controller,giftGate(){}},giftCommerce:{readGiftCapabilities:async()=>({catalog_read:true,purchase_enabled:true,purchase_supported:true,quote_supported:true,max_quantity:2,max_diamonds:20,blockers:[]}),hasDiamonds:()=>true,paymentLabel:s=>s},'/api/gifts.js':{getGiftCatalog:async()=>({results:[{code:'rose',name:'玫瑰',price_diamonds:10}],next:null,previous:null})}}),gp={recipient:{id:'12',name:'固定收礼人'}},gr=g.setup(gp)
 await tick();const select=read(gift+'.wxml').match(/bindselect="\{\{(\w+)\}\}"/)[1];gr()[select]({code:'rose',name:'玫瑰',price_diamonds:10});await gr()[event(gift,'quote')]();assert.ok(values(gr()).includes('10.50'));assert.deepEqual(calls,['quote']);await gr()[event(gift,'pay')]();assert.ok(values(gr()).includes('same-purchase'));assert.equal(gr()[event(gift,'pay')],undefined);await gr()[event(gift,'recover')]();assert.deepEqual(calls,['quote','pay','get']);g.scope.stop()
 // Records page really executes authenticated numbered batch GET and discards hidden result.
 const rr=[],page='pages/client/gifts/index',r=runtime(page,{giftCommerce:{readGiftRecords:(...args)=>new Promise(resolve=>rr.push({args,resolve}))},giftCheckout:{createGiftCheckout:()=>({recovery:()=>null,invalidate(){}})}}),rd=r.setup({})
 r.hooks.show();assert.deepEqual(Array.from(rr[0].args),['inventory',1]);r.hooks.hide();rr[0].resolve({results:[{lot_id:999,name:'late'}],count:1,next:null,previous:null});await tick();assert.ok(!values(rd()).some(x=>x.includes('late')));r.scope.stop()
 // Actual local release support: no per-order request and no visible refresh action.
 const releaseExports={};vm.runInNewContext(read('utils/commerceRelease.js'),{exports:releaseExports});assert.equal(releaseExports.commerceRelease.orderSurchargeReadSupported,false)
 const hidden=runtime(f,{commerceRelease:releaseExports,commerceRead:{readOrderSurcharge(){throw new Error('must not request')}}}),hiddenRender=hidden.setup({orderNo:'old'});hidden.hooks.show();assert.equal(hiddenRender()[refresh],undefined);hidden.scope.stop()
 const readonlyCap={contract_version:'1.0-readonly',catalog_read:true,purchase_enabled:false,purchase_supported:false,quote_supported:false,blockers:['READ_ONLY_RELEASE']}
 const ro=runtime(gift,{giftCheckout:{createGiftCheckout:()=>({invalidate(){},recovery:()=>null}),giftGate(){throw new Error('readonly')}},giftCommerce:{readGiftCapabilities:async()=>readonlyCap},'/api/gifts.js':{getGiftCatalog:async()=>({results:[],next:null,previous:null})}}),roRender=ro.setup(gp);await tick();const roOut=roRender();assert.equal(roOut[event(gift,'quote')],undefined);assert.equal(roOut[event(gift,'pay')],undefined);assert.equal(roOut[event(gift,'buy-inventory')],undefined);assert.ok(values(roOut).includes('暂无上架礼物，请管理员配置'));assert.ok(values(roOut).some(x=>x.includes('固定收礼人')));assert.match(read(gift+'.wxml'),/当前仅浏览，购买\/赠送未开放/);ro.scope.stop()
 const host='components/gifts/GiftHost',rh=runtime(host,{giftCommerce:{readGiftCapabilities:async()=>readonlyCap}}),rhr=rh.setup({recipientId:12,recipientName:'对象'});await rh.hooks.show();assert.ok(values(rhr()).includes('查看礼物'));rh.scope.stop()
 const forbidden=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(p.endsWith('.js')&&fs.readFileSync(p,'utf8').includes('??'))forbidden.push(p)}}walk(root);assert.deepEqual(forbidden,[])
 console.log('PASS: six production host mounts; registered authenticated gifts page/profile entry; five component bundles; compiled surcharge unknown/hide, live gift decimal quote/explicit pay/GET recovery, records hide; no ??; synthetic platform only')
}
main().catch(e=>{console.error(e);process.exitCode=1})
