const {test}=require('node:test'),assert=require('node:assert/strict')
const {load,platform}=require('./commerce-integration.test.cjs')
const q={gift_code:'rose',quantity:1,mode:'direct',recipient_id:12,price_version:'a'.repeat(64),commission_version:0,total_diamonds:10,available_diamonds:'10.5',policy_version:'v1',can_submit:true,blockers:[]}
const cap={purchase_enabled:true,purchase_supported:true,quote_supported:true,recipient_eligible:true,max_quantity:2,max_diamonds:20,daily_diamonds:100,policy_version:'v1',blockers:[]}
function setup(){const u=platform();u.store.client_profile={id:1};const calls=[],d={quoteGift:async()=>({...q}),purchaseGift:async(...args)=>{calls.push(['post',...args]);throw new Error('lost response')},readGiftPurchaseByKey:async key=>{calls.push(['get',key]);throw {statusCode:404}},readGiftPurchase:async no=>{calls.push(['no',no]);return {purchase_no:no,payment_status:'paid',amount_diamonds:10,blockers:[]}},login:async()=> 'fresh-secret-code',key:()=> 'fixture-original'};const a=load('src/utils/giftCheckout.ts',u);return {u,calls,d,a}}
test('mutating a quoted object or exceeding daily cap cannot dispatch a charge',async()=>{
 const {calls,d,a}=setup(),c=a.createGiftCheckout(d);const quoted=await c.quote(q,cap);quoted.total_diamonds=1;await assert.rejects(c.pay(quoted,cap));assert.equal(calls.length,0)
 const c2=a.createGiftCheckout(d),fresh=await c2.quote(q,{...cap,daily_diamonds:5});await assert.rejects(c2.pay(fresh,{...cap,daily_diamonds:5}));assert.equal(calls.length,0)
})
test('explicitly unlimited daily cap permits the same diamond purchase contract',async()=>{
 const {calls,d,a}=setup(),c=a.createGiftCheckout(d),unlimited={...cap,daily_diamonds:null}
 const quoted=await c.quote(q,unlimited);await assert.rejects(c.pay(quoted,unlimited),/lost response/)
 assert.equal(calls.length,1);assert.equal(calls[0][0],'post')
})
test('local iOS refusal before dispatch never creates an unknown financial journal',async()=>{
 const u=platform();u.store.client_profile={id:1};u.login=options=>options.success({code:'fresh'})
 const api={'@/utils/purchaseAvailability':{getClientPlatform:()=> 'ios',isIOSPurchaseEnabled:()=>false}},a=load('src/utils/giftCheckout.ts',u,api),c=a.createGiftCheckout()
 const qp=c.quote(q,cap);u.calls[0].success({statusCode:200,data:q});const quoted=await qp;await assert.rejects(c.pay(quoted,cap));assert.equal(u.calls.length,1);assert.equal(c.recovery(),null)
})
test('lost response persists original key before POST; 404 never clears or replays; restored controller queries GET only',async()=>{
 const {u,calls,d,a}=setup(),c=a.createGiftCheckout(d)
 const quote=await c.quote(q,cap);await assert.rejects(c.pay(quote,cap));
 assert.equal(c.recovery().state,'unknown');assert.equal(c.recovery().idempotency_key,'fixture-original');assert.equal(calls.length,1)
 assert.ok(!JSON.stringify(u.store).includes('fresh-secret-code'))
 await assert.rejects(c.pay(quote,cap));assert.equal(calls.length,1)
 const restored=a.createGiftCheckout(d);await assert.rejects(restored.recover());assert.deepEqual(calls[1],['get','fixture-original']);assert.equal(restored.recovery().state,'unknown')
 d.readGiftPurchaseByKey=async()=>({purchase_no:'original',payment_status:'paid',amount_diamonds:10,blockers:[]});await restored.recover();assert.equal(restored.recovery().state,'paid')
})
test('supported cannot enable; quote checks decimal, recipient, limits; hide/relogin/login race cannot submit',async()=>{
 const {u,calls,d,a}=setup();const c=a.createGiftCheckout(d)
 await assert.rejects(c.quote(q,{...cap,purchase_enabled:false}));assert.equal(calls.length,0)
 let quote=await c.quote(q,cap);c.invalidate();await assert.rejects(c.pay(quote,cap));assert.equal(calls.length,0)
 const c2=a.createGiftCheckout(d);quote=await c2.quote(q,cap);d.login=async()=>{u.store.token='new-session';return 'fresh'};await assert.rejects(c2.pay(quote,cap));assert.equal(calls.length,0)
 const c3=a.createGiftCheckout(d);d.quoteGift=async()=>({...q,available_diamonds:'9.999999999999999999'});quote=await c3.quote(q,cap);await assert.rejects(c3.pay(quote,cap));assert.equal(calls.length,0)
})
