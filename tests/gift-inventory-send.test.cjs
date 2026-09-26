// Real SFC + controller + API parser. Only uni/HTTP are synthetic.
const {test}=require('node:test'),assert=require('node:assert/strict'),vue=require('vue')
const {harness,nodes}=require('./commerce-sfc-harness.cjs')
const tick=()=>new Promise(setImmediate)
const cap={catalog_read:true,records_read:true,inventory_read:true,purchase_enabled:true,purchase_supported:true,quote_supported:true,inventory_transfer_enabled:true,inventory_quote_supported:true,recipient_eligible:true,max_quantity:20,max_diamonds:200,daily_diamonds:1000,policy_version:'v1',blockers:[]}
const choice={gift_code:'rose',quantity:1,recipient_id:12}
const quote={...choice,commission_version:1,available_quantity:3,payment_diamonds:0,policy_version:'v1',can_submit:true,blockers:[]}
const sent={transfer_no:'GT-original',gift_code:'rose',quantity:1,status:'delivered',created_at:'2026-09-23T15:00:00Z'}
function setup(){
 const h=harness(),calls=[];h.uni.setStorageSync=(k,v)=>{h.storage[k]=structuredClone(v)};h.uni.removeStorageSync=k=>delete h.storage[k]
 h.uni.request=r=>calls.push(r);h.uni.login=()=>{throw new Error('Stock must not request WeChat payment/login')}
 return {h,calls}
}
const reply=(r,data,statusCode=200)=>r.success({statusCode,data})
test('inventory uses exact stock quote, no purchase/login, confirms by original-key GET',async()=>{
 const {h,calls}=setup(),c=h.load('src/utils/giftInventorySend.ts').createInventorySend()
 let promise=c.quote(choice,cap);assert.match(calls[0].url,/\/inventory\/quotes\/$/);assert.deepEqual(calls[0].data,choice);reply(calls[0],quote);const q=await promise
 promise=c.send(q,cap);assert.match(calls[1].url,/\/gifts\/transfers\/$/);assert.equal(calls[1].data.commission_version,1);assert.equal(calls[1].data.recipient_id,12);const originalKey=calls[1].data.idempotency_key
 assert.equal(c.recovery().state,'unknown');reply(calls[1],sent);await tick()
 assert.equal(calls[2].method,'GET');assert.ok(calls[2].url.endsWith(encodeURIComponent(originalKey)));reply(calls[2],sent)
 assert.equal((await promise).status,'delivered');assert.equal(c.recovery().state,'delivered');assert.equal(calls.length,3)
})
test('timeout keeps original key across rebuild and only GET recovery; 404 never releases retry',async()=>{
 const {h,calls}=setup(),c=h.load('src/utils/giftInventorySend.ts').createInventorySend()
 let promise=c.quote(choice,cap);reply(calls[0],quote);const q=await promise
 promise=c.send(q,cap);calls[1].fail(new Error('synthetic timeout'));await assert.rejects(promise)
 const key=c.recovery().idempotency_key,c2=h.load('src/utils/giftInventorySend.ts').createInventorySend()
 await assert.rejects(c2.quote(choice,cap));promise=c2.recover();assert.equal(calls[2].method,'GET');reply(calls[2],{detail:'not found'},404);await assert.rejects(promise)
 assert.equal(c2.recovery().idempotency_key,key);assert.equal(c2.recovery().state,'unknown')
 promise=c2.recover();reply(calls[3],sent);assert.equal((await promise).status,'delivered');assert.equal(calls.filter(r=>r.url.endsWith('/transfers/')).length,1)
})
test('changed confirmation and closed panel prevent stock POST',async()=>{
 const {h,calls}=setup(),c=h.load('src/utils/giftInventorySend.ts').createInventorySend()
 let promise=c.quote(choice,cap);reply(calls[0],quote);let q=await promise;q.quantity=2;await assert.rejects(c.send(q,cap));assert.equal(calls.length,1)
 promise=c.quote(choice,cap);reply(calls[1],quote);q=await promise;c.invalidate();await assert.rejects(c.send(q,cap));assert.equal(calls.length,2)
})
test('stock quote rejects a response that attempts to charge diamonds',async()=>{
 const {h,calls}=setup(),a=h.load('src/api/giftCommerce.ts');const promise=a.quoteInventorySend(choice)
 reply(calls[0],{...quote,payment_diamonds:1});await assert.rejects(promise)
})
test('real inventory panel selects owned gift, quotes, sends and updates stock without a money request',async()=>{
 const {h,calls}=setup(),C=h.load('src/components/gifts/GiftInventorySend.vue').default,scope=vue.effectScope(),props={recipient:{id:'12',name:'固定收礼人'}}
 const draw=scope.run(()=>C.setup(props,{expose(){},emit(){}})),tree=()=>nodes(draw(props,[])),button=a=>tree().find(n=>n.props?.['data-action']===a)
 reply(calls[0],cap);await tick();reply(calls[1],{count:1,next:null,previous:null,results:[{lot_id:1,gift_code:'rose',name:'玫瑰',remaining:3,available:3,status:'active'}]});await tick()
 assert.ok(button('select-stock'));button('select-stock').props.onTap();let promise=button('quote-stock').props.onTap();reply(calls[2],quote);await promise;await tick()
 assert.ok(tree().some(n=>typeof n.children==='string'&&n.children.includes('不扣钻石')))
 promise=button('send-stock').props.onTap();reply(calls[3],sent);await tick();assert.equal(calls[4].method,'GET');reply(calls[4],sent);await tick()
 const refresh=calls[5];assert.match(refresh.url,/\/gifts\/inventory\/$/);reply(refresh,{count:1,next:null,previous:null,results:[{lot_id:1,gift_code:'rose',name:'玫瑰',remaining:2,available:2,status:'active'}]});await promise;await tick()
 assert.ok(tree().some(n=>typeof n.children==='string'&&n.children.includes('赠送成功')));assert.ok(calls.every(r=>!r.url.includes('/purchases/')));scope.stop()
})
test('live gift host mounts the stock panel for the fixed recipient',async()=>{
 const h=harness({'@/api/giftCommerce':{readGiftCapabilities:async()=>cap},'@/api/gifts':{getGiftCatalog:async()=>({results:[],next:null,previous:null})},'@/utils/giftCheckout':{createGiftCheckout:()=>({invalidate(){},recovery:()=>null}),giftGate(){}}})
 const C=h.load('src/components/gifts/GiftLiveSheet.vue').default,scope=vue.effectScope(),props={recipient:{id:'12',name:'固定收礼人'}},draw=scope.run(()=>C.setup(props,{expose(){},emit(){}})),tree=()=>nodes(draw(props,[]))
 await tick();const button=tree().find(n=>n.props?.['data-action']==='open-stock');assert.ok(button);button.props.onTap()
 assert.ok(tree().some(n=>typeof n.type==='object' && n.props?.recipient?.id==='12' && typeof n.props.onClose==='function'));scope.stop()
})
test('income label names the existing fish wallet rather than a separate withdrawable balance',()=>{
 const {h}=setup(),a=h.load('src/api/giftCommerce.ts');const label=a.earningLabel({id:1,status:'available',monetary_accrual:true,blockers:[],net_amount:'15.00',available_amount:'0.00',currency:'fish',wallet_destination:'player_wallet',credited_amount:'15.00',debt_offset_amount:'0.00'})
 assert.match(label,/15.00.*鱼干/);assert.match(label,/已入钱包/);assert.doesNotMatch(label,/可用 0.00/)
})
