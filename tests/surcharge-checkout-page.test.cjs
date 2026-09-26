const {test}=require('node:test'),assert=require('node:assert/strict'),vue=require('vue')
const {harness,nodes}=require('./commerce-sfc-harness.cjs')
const tick=()=>new Promise(setImmediate)
function mount(){const quotes=[],creates=[],hooks={load:[],show:[],hide:[],unload:[]},storage={token:'buyer-token',client_profile:{id:7,openid:'fixture-openid',nickname:'测试昵称'}}
 const h=harness({'@dcloudio/uni-app':{onLoad:f=>hooks.load.push(f),onShow:f=>hooks.show.push(f),onHide:f=>hooks.hide.push(f),onUnload:f=>hooks.unload.push(f)},'@/api/boss':{getPackages:async()=>[{id:11,player_count:3,base_price:4,specs:[],name:'测试商品'}],getPlayerServiceProducts:async()=>({products:[]}),createOrder:async p=>{creates.push(p);return {order_no:'fixture-created'}}},'@/api/orderBatch':{createCartOrderBatch:async()=>({})},'@/api/serviceListings':{createSharedListingOrder:async()=>({})},'@/api/surchargeQuote':{quoteOrderSurcharge:p=>new Promise((resolve,reject)=>quotes.push({p,resolve,reject}))},'@/utils/commerceRelease':{commerceRelease:{orderSurchargeQuoteSupported:true}},'@/utils/client':{getClientProfile:()=>storage.client_profile,syncClientProfile:async()=>storage.client_profile},'@/utils/storage':{getStorage:k=>storage[k]||'',setStorage:(k,v)=>storage[k]=v,SESSION_CHANGED_EVENT:'auth-session-changed'},'@/utils/feedback':{getErrorMessage:e=>e.detail||e.message,toast:()=>{},success:()=>{}},'@/utils/nav':{go(){},goMain(){},replace(){}},'@/utils/shopCart':{getShopCart:async()=>[]}})
 h.uni.getStorageSync=k=>storage[k];h.uni.$on=(k,f)=>h.events[k]=f;h.uni.$off=k=>delete h.events[k]
 const C=h.load('src/pages/shop/checkout/index.vue').default,scope=vue.effectScope(),draw=scope.run(()=>C.setup({},{expose(){}})),tree=()=>nodes(draw({},[]));return {h,hooks,storage,scope,tree,quotes,creates}}
const fixture={contract_version:'surcharge-v2',base_amount_yuan:'4.00',surcharge_amount_yuan:'0.30',total_amount_yuan:'4.30',base_amount_diamonds:'40.0',total_amount_diamonds:'43.0',required_players:3,quote_version:'a'.repeat(64),surcharge:{policy_version:'surcharge-v2-fixed25-equal1',commission_rate:'25.00',amount_diamonds:3,amount_yuan:'0.30',required_players:3,amount_step_diamonds:3,per_person_gross_diamonds:'1.00',per_person_commission_diamonds:'0.25',per_person_net_diamonds:'0.75'},can_submit:false,blockers:['SURCHARGE_LIFECYCLE_UNAVAILABLE']}
test('actual checkout SFC optional zero preserves legacy create; positive quote shows separate exact server amounts but cannot create',async()=>{
 const m=mount();await m.hooks.load[0]({packageId:'11'});await tick();const action=a=>m.tree().find(n=>n.props?.['data-action']===a)
 assert.ok(action('surcharge-input'));assert.equal(m.quotes.length,0)
 action('surcharge-input').props.onInput({detail:{value:'3'}});await new Promise(r=>setTimeout(r,350));assert.equal(m.quotes.length,1);assert.equal(m.quotes[0].p.surcharge_diamonds,3);assert.equal(m.quotes[0].p.package_id,11)
 m.quotes[0].resolve(fixture);await tick();const text=m.tree().filter(n=>typeof n.children==='string').map(n=>n.children).join('|');assert.match(text,/43.0/);assert.match(text,/0.75/);assert.match(text,/钻石等值/);assert.doesNotMatch(text,/0.75 鱼干/)
 await action('submit-order').props.onTap();assert.equal(m.creates.length,0)
 action('surcharge-input').props.onInput({detail:{value:''}});const game=m.tree().find(n=>n.props?.placeholder==='请输入游戏ID或队伍码');assert.ok(game);game.props['onUpdate:modelValue']('测试房间');await action('submit-order').props.onTap();assert.equal(m.creates.length,1);assert.ok(!Object.hasOwn(m.creates[0],'surcharge_diamonds'));m.scope.stop()
})
test('actual checkout discards pending quote on hide and same-account re-login; no auto submit on show',async()=>{
 const m=mount();await m.hooks.load[0]({packageId:'11'});await tick();let action=a=>m.tree().find(n=>n.props?.['data-action']===a)
 action('surcharge-input').props.onInput({detail:{value:'3'}});await new Promise(r=>setTimeout(r,350));m.hooks.hide[0]();m.quotes[0].resolve(fixture);await tick();assert.doesNotMatch(m.tree().map(n=>n.children).join(' '),/0.75/)
 m.hooks.show[0]();m.storage.token='same-account-new-login';m.h.events['auth-session-changed']();assert.doesNotMatch(m.tree().map(n=>n.children).join(' '),/43.0/);assert.equal(m.creates.length,0);m.scope.stop()
})
test('checkout debounces selection, ignores older reply, and shows backend equal-split step rejection',async()=>{
 const m=mount();await m.hooks.load[0]({packageId:'11'});await tick();const input=()=>m.tree().find(n=>n.props?.['data-action']==='surcharge-input').props.onInput
 input()({detail:{value:'0'}});await new Promise(r=>setTimeout(r,320));assert.equal(m.quotes.length,0)
 input()({detail:{value:'3'}});input()({detail:{value:'6'}});await new Promise(r=>setTimeout(r,320));assert.equal(m.quotes.length,1);assert.equal(m.quotes[0].p.surcharge_diamonds,6)
 input()({detail:{value:'1'}});await new Promise(r=>setTimeout(r,320));m.quotes[0].resolve(fixture);await tick();assert.doesNotMatch(m.tree().map(n=>n.children).join(' '),/0.75/)
 m.quotes[1].reject({code:'SURCHARGE_NOT_DIVISIBLE',detail:'3人均分须为3钻的整数倍',amount_step_diamonds:3});await tick();assert.match(m.tree().map(n=>n.children).join(' '),/3人均分须为3钻的整数倍/);assert.equal(m.creates.length,0)
 input()({detail:{value:'1.5'}});assert.match(m.tree().map(n=>n.children).join(' '),/非负整数钻石/);assert.equal(m.quotes.length,2);m.scope.stop()
})
