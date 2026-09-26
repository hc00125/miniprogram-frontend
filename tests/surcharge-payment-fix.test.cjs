const {test}=require('node:test')
const a=require('node:assert/strict')
const vue=require('vue')
const {harness,nodes}=require('./commerce-sfc-harness.cjs')
const tick=()=>new Promise(setImmediate)
const base={contract_version:'surcharge-v2',quote_version:'a'.repeat(64),base_amount_yuan:'4.00',surcharge_amount_yuan:'0.30',total_amount_yuan:'4.30',base_amount_diamonds:'40.0',total_amount_diamonds:'43.0',required_players:3,surcharge:{policy_version:'surcharge-v2-fixed25-equal1',commission_rate:'25.00',amount_diamonds:3,amount_yuan:'0.30',required_players:3,amount_step_diamonds:3,per_person_gross_diamonds:'1.00',per_person_commission_diamonds:'0.25',per_person_net_diamonds:'0.75'},can_submit:true,blockers:[]}
const key='checkout_fixed_account_7'
const checkout=(status='created',attempt=null,patch={})=>({...base,idempotency_key:key,payment_status:status,attempt_id:attempt,...patch})
const order=(status='created',attempt=null,patch={})=>({order_no:'order-7',status:'待支付',total_price:4,checkout:checkout(status,attempt,patch)})
const record=(patch={})=>({key,quote_version:base.quote_version,total_amount_yuan:'4.30',surcharge_diamonds:3,required_players:3,order_no:'order-7',status:'created',submitted:false,verified:false,attempt_id:null,...patch})
function mount(storage={token:'session-one',client_profile:{id:7},['surcharge:v2:checkout:7']:record()}){
 const hooks={},requests=[],logins=[],modals=[],h=harness({'@dcloudio/uni-app':{onLoad:f=>hooks.load=f,onShow:f=>hooks.show=f,onHide:f=>hooks.hide=f,onUnload:f=>hooks.unload=f},'@/utils/commerceRelease':{commerceRelease:{orderSurchargeQuoteSupported:true}},'@/utils/purchaseAvailability':{getClientPlatform:()=> 'android',isIOSPurchaseEnabled:()=>true},'@/utils/request':{BASE_URL:'https://fixture.invalid/api'}})
 h.uni.getStorageSync=k=>storage[k];h.uni.setStorageSync=(k,v)=>storage[k]=v;h.uni.request=o=>requests.push(o);h.uni.login=o=>logins.push(o);h.uni.showModal=o=>{modals.push(o);o.success({confirm:true})};h.uni.$on=(k,f)=>h.events[k]=f;h.uni.$off=k=>delete h.events[k]
 const C=h.load('src/pages/boss/surcharge-payment/index.vue').default,scope=vue.effectScope(),render=scope.run(()=>C.setup({},{expose(){}}))
 const action=name=>nodes(render({},[])).find(n=>n.props?.['data-action']===name)
 const text=()=>nodes(render({},[])).filter(n=>typeof n.children==='string').map(n=>n.children).join('|')
 return {h,storage,hooks,requests,logins,modals,scope,action,text,async open(reply=order()){hooks.load({key});hooks.show();await tick();a.equal(requests.at(-1).method,'GET');requests.at(-1).success({statusCode:200,data:reply});await tick()},async begin(){const p=action('confirm-combined-payment').props.onTap();await tick();logins.at(-1).success({code:'wx-short-code'});await tick();return p}}
}
function api(){const h=harness({'@/utils/sessionExpiry':{handleSessionExpiry:()=>null},'@/utils/purchaseAvailability':{getClientPlatform:()=> 'android',isIOSPurchaseEnabled:()=>true}}),requests=[];h.uni.request=o=>requests.push(o);return {h,requests,quote:h.load('src/api/surchargeQuote.ts'),checkout:h.load('src/api/surchargeCheckout.ts')}}
test('FE-PAY-01 fixed step validates zero, 2/3/5/6 players and precise large integers',async()=>{
 for(const [n,d,step,gross,fee,net] of [[5,0,1,'0.00','0.00','0.00'],[5,1,1,'0.20','0.05','0.15'],[2,2,2,'1.00','0.25','0.75'],[3,3,3,'1.00','0.25','0.75'],[6,6,6,'1.00','0.25','0.75'],[3,99999999999,3,'33333333333.00','8333333333.25','24999999999.75']]){
  const money=x=>`${x/100n}.${String(x%100n).padStart(2,'0')}`
  const q={...base,required_players:n,surcharge_amount_yuan:money(BigInt(d)*10n),total_amount_yuan:money(400n+BigInt(d)*10n),total_amount_diamonds:`${40n+BigInt(d)}.0`,surcharge:{...base.surcharge,required_players:n,amount_diamonds:d,amount_yuan:money(BigInt(d)*10n),amount_step_diamonds:step,per_person_gross_diamonds:gross,per_person_commission_diamonds:fee,per_person_net_diamonds:net}}
  let m=api(),p=m.quote.quoteOrderSurcharge({surcharge_diamonds:d});m.requests[0].success({statusCode:200,data:q});a.equal((await p).surcharge.amount_step_diamonds,step)
  m=api();p=m.quote.quoteOrderSurcharge({surcharge_diamonds:d});m.requests[0].success({statusCode:200,data:{...q,surcharge:{...q.surcharge,amount_step_diamonds:step+1}}});await a.rejects(p,/报价格式/)
 }
})
test('FE-PAY-02/03 checkout validates complete snapshot and positive attempt combos; zero cash remains untouched',async()=>{
 const m=api();for(const c of [{surcharge:{...base.surcharge,required_players:2}},{surcharge:{...base.surcharge,commission_rate:'24.00'}},{surcharge:{...base.surcharge,per_person_net_diamonds:'9.99'}},{surcharge:{...base.surcharge,amount_step_diamonds:1}},{surcharge:{...base.surcharge,per_person_gross_diamonds:'2.00'}},{surcharge:{...base.surcharge,policy_version:'other'}},{payment_status:'created',attempt_id:'unexpected'},...['processing','unknown','paid','failed'].map(payment_status=>({payment_status,attempt_id:null}))]){
  a.throws(()=>m.checkout.validateCheckout({...order(),checkout:{...checkout(),...c}},key),/格式/)
 }
 a.doesNotThrow(()=>m.checkout.validateCheckout(order('paid','attempt-1'),key))
 // This parser handles only positive surcharge; cash-only orders continue through the legacy payment path.
 a.throws(()=>m.checkout.validateCheckout({...order(),checkout:{...checkout(),surcharge:{...base.surcharge,amount_diamonds:0},payment_status:'paid',attempt_id:null}},key),/格式/)
})
test('FE-PAY-04 paid POST requires matching by-key GET before verified completion and new explicit purchase',async t=>{
 const m=mount();t.after(()=>m.scope.stop());await m.open();const op=m.begin();await tick();a.equal(m.requests.length,2);a.equal(m.storage['surcharge:v2:checkout:7'].submitted,true)
 m.requests[1].success({statusCode:200,data:{order_no:'order-7',amount:'4.30',checkout:checkout('paid','attempt-1')}});await tick()
 a.notEqual(m.storage['surcharge:v2:checkout:7'].status,'paid');a.equal(m.requests[2].method,'GET')
 m.requests[2].success({statusCode:200,data:order('paid','attempt-1')});await op
 a.equal(m.storage['surcharge:v2:checkout:7'].verified,true);a.match(m.text(),/服务端确认已完成合计付款/)
 const controller=m.h.load('src/utils/surchargeCheckoutIntent.ts').makeSurchargeIntent(()=>({account:'7',token:m.storage.token}))
 const created=controller.create({surcharge_diamonds:3},base);a.equal(m.requests.at(-1).method,'POST');a.notEqual(m.storage['surcharge:v2:checkout:7'].key,key)
 m.requests.at(-1).fail(new Error('isolated create stopped'));await a.rejects(created)
})
test('FE-PAY-04 POST paid then GET timeout retains key across reopening without success',async t=>{
 const storage={token:'session-one',client_profile:{id:7},['surcharge:v2:checkout:7']:record()};const m=mount(storage);t.after(()=>m.scope.stop());await m.open();const op=m.begin();await tick();m.requests[1].success({statusCode:200,data:{order_no:'order-7',amount:'4.30',checkout:checkout('paid','attempt-1')}});await tick();m.requests[2].fail(new Error('timeout'));await op
 a.equal(storage['surcharge:v2:checkout:7'].key,key);a.equal(storage['surcharge:v2:checkout:7'].verified,false);a.doesNotMatch(m.text(),/服务端确认已完成合计付款/)
 m.hooks.hide();const again=mount(storage);t.after(()=>again.scope.stop());await again.open(order('created',null));a.equal(again.action('confirm-combined-payment'),undefined);a.equal(again.logins.length,0)
})
test('FE-PAY-05 malformed POST then GET created cannot replay across reopen and same-account relogin',async t=>{
 const storage={token:'session-one',client_profile:{id:7},['surcharge:v2:checkout:7']:record()};const m=mount(storage);t.after(()=>m.scope.stop());await m.open();const op=m.begin();await tick();m.requests[1].success({statusCode:200,data:{order_no:'order-7',amount:'4.30',checkout:checkout()}});await op
 a.equal(storage['surcharge:v2:checkout:7'].submitted,true);a.equal(m.action('confirm-combined-payment'),undefined)
 const read=m.action('read-original-key').props.onTap();await tick();m.requests[2].success({statusCode:200,data:order()});await read;a.equal(m.action('confirm-combined-payment'),undefined)
 m.hooks.hide();storage.token='session-two';const again=mount(storage);t.after(()=>again.scope.stop());await again.open();a.equal(again.action('confirm-combined-payment'),undefined);a.equal(again.requests.filter(r=>r.method==='POST').length,0)
})
test('FE-PAY-05 storage write failure prevents even first payment POST',async t=>{
 const m=mount();t.after(()=>m.scope.stop());await m.open();m.h.uni.setStorageSync=()=>{throw new Error('storage unavailable')};const op=m.begin();await tick();await op;a.equal(m.requests.filter(r=>r.method==='POST').length,0);const again=m.action('confirm-combined-payment').props.onTap();await tick();m.logins.at(-1).success({code:'wx-short-code'});await again;a.equal(m.requests.filter(r=>r.method==='POST').length,0)
})
test('FE-PAY-05 lost create response with explicit unsubmitted marker permits first manual payment; legacy record remains locked',async t=>{
 const storage={token:'session-one',client_profile:{id:7},['surcharge:v2:checkout:7']:record({order_no:'',status:'unknown'})};const m=mount(storage);t.after(()=>m.scope.stop());await m.open();a.ok(m.action('confirm-combined-payment'))
 m.hooks.hide();storage['surcharge:v2:checkout:7']=record({submitted:undefined,verified:undefined,attempt_id:undefined});const older=mount(storage);t.after(()=>older.scope.stop());await older.open();a.equal(older.action('confirm-combined-payment'),undefined)
})
test('FE-PAY-02 coherent forged headcount with original total and quote hash cannot replace confirmed quote',async t=>{
 const m=mount();t.after(()=>m.scope.stop());await m.open()
 const alternate={...base.surcharge,required_players:1,amount_step_diamonds:1,per_person_gross_diamonds:'3.00',per_person_commission_diamonds:'0.75',per_person_net_diamonds:'2.25'}
 const read=m.action('read-original-key').props.onTap();await tick();m.requests.at(-1).success({statusCode:200,data:order('created',null,{surcharge:alternate})});await read
 a.equal(m.action('confirm-combined-payment'),undefined)
 a.equal(m.storage['surcharge:v2:checkout:7'].status,'created')
})
test('FE-PAY-02/05 forged key, quote, amount or attempt cannot replace persistent original; returned object mutation is isolated',async t=>{
 const m=mount();t.after(()=>m.scope.stop());await m.open();const apiObj=m.h.load('src/api/surchargeCheckout.ts')
 const p=apiObj.readSurchargeOrderByKey(key);m.requests.at(-1).success({statusCode:200,data:order()});const external=await p;external.checkout.total_amount_yuan='999.00';a.equal(m.storage['surcharge:v2:checkout:7'].total_amount_yuan,'4.30')
 for(const patch of [{idempotency_key:'other-key'},{quote_version:'b'.repeat(64)},{total_amount_yuan:'9.99'},{surcharge:{...base.surcharge,required_players:2}}]){
  const old=JSON.stringify(m.storage['surcharge:v2:checkout:7']);const read=m.action('read-original-key').props.onTap();await tick();m.requests.at(-1).success({statusCode:200,data:order('created',null,patch)});await read;a.equal(JSON.stringify(m.storage['surcharge:v2:checkout:7']),old);a.equal(m.action('confirm-combined-payment'),undefined)
 }
})
test('FE-PAY-05 caller mutation of a delivered GET object cannot change confirmation or payer snapshot',async t=>{
 const m=mount();t.after(()=>m.scope.stop());const reply=order();await m.open(reply)
 reply.checkout.total_amount_yuan='9.99';reply.checkout.surcharge={...reply.checkout.surcharge,required_players:1}
 const op=m.begin();await tick();a.equal(m.requests.filter(r=>r.method==='POST').length,1)
 a.equal(m.requests[1].data.order_no,'order-7');a.equal(m.storage['surcharge:v2:checkout:7'].total_amount_yuan,'4.30')
 m.requests[1].success({statusCode:200,data:{order_no:'order-7',amount:'4.30',checkout:checkout('processing','attempt-1')}})
 await tick();m.requests[2].success({statusCode:200,data:order('processing','attempt-1')});await op
 a.equal(m.storage['surcharge:v2:checkout:7'].required_players,3)
})
test('FE-PAY-03 legacy zero-surcharge cash paid/null stays in the original order flow',async()=>{
 const h=harness({'@/utils/request':{default:{get:async()=>({order_no:'cash-0',paid:true,status:'已完成',checkout:{contract_version:'surcharge-v2',payment_status:'paid',attempt_id:null,surcharge:{amount_diamonds:0}}})}},'@/api/pay':{reconcileVirtualCheckoutByOrder:async()=>{throw new Error('paid cash must not reconcile')}}})
 const result=await h.load('src/api/boss.ts').getOrder('cash-0')
 a.equal(result.checkout.payment_status,'paid');a.equal(result.checkout.attempt_id,null)
})
test('FE-PAY-05 POST timeout and legal unknown followed by created GET never dispatch twice',async t=>{
 for(const mode of ['timeout','unknown']){
  const storage={token:'session-one',client_profile:{id:7},['surcharge:v2:checkout:7']:record()}
  const m=mount(storage);t.after(()=>m.scope.stop());await m.open()
  const op=m.begin();await tick()
  if(mode==='timeout')m.requests[1].fail(new Error('timeout'))
  else {m.requests[1].success({statusCode:200,data:{order_no:'order-7',amount:'4.30',checkout:checkout('unknown','attempt-1')}});await tick();m.requests[2].success({statusCode:200,data:order('created',null)})}
  await op
  if(mode==='timeout') {const read=m.action('read-original-key').props.onTap();await tick();m.requests[2].success({statusCode:200,data:order()});await read}
  a.equal(storage['surcharge:v2:checkout:7'].key,key);a.equal(storage['surcharge:v2:checkout:7'].submitted,true)
  a.equal(m.action('confirm-combined-payment'),undefined);a.equal(m.requests.filter(r=>r.method==='POST').length,1)
  m.hooks.hide();const reopened=mount(storage);t.after(()=>reopened.scope.stop());await reopened.open(order())
  a.equal(reopened.action('confirm-combined-payment'),undefined);a.equal(reopened.requests.filter(r=>r.method==='POST').length,0)
 }
})
test('FE-PAY-04 POST attempt A and GET paid attempt B never verify or release original key',async t=>{
 const m=mount();t.after(()=>m.scope.stop());await m.open()
 const op=m.begin();await tick();m.requests[1].success({statusCode:200,data:{order_no:'order-7',amount:'4.30',checkout:checkout('paid','attempt-A')}})
 await tick();m.requests[2].success({statusCode:200,data:order('paid','attempt-B')});await op
 a.equal(m.storage['surcharge:v2:checkout:7'].key,key);a.equal(m.storage['surcharge:v2:checkout:7'].verified,false)
 a.doesNotMatch(m.text(),/服务端确认已完成合计付款/)
})
test('FE-PAY-05 trusted GET attempt stays bound; later different attempt cannot overwrite record',async t=>{
 const m=mount();t.after(()=>m.scope.stop());await m.open()
 let p=m.action('read-original-key').props.onTap();await tick();m.requests.at(-1).success({statusCode:200,data:order('unknown','attempt-1')});await p
 a.equal(m.storage['surcharge:v2:checkout:7'].attempt_id,'attempt-1')
 p=m.action('read-original-key').props.onTap();await tick();m.requests.at(-1).success({statusCode:200,data:order('paid','attempt-2')});await p
 a.equal(m.storage['surcharge:v2:checkout:7'].attempt_id,'attempt-1');a.equal(m.storage['surcharge:v2:checkout:7'].verified,false)
 a.equal(m.action('confirm-combined-payment'),undefined)
})
