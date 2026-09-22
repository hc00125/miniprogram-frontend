// Synthetic transport only; never invokes production or WeChat payments.
const fs=require('node:fs'),path=require('node:path')
const {test}=require('node:test'),assert=require('node:assert/strict')
const {load,platform}=require('./commerce-integration.test.cjs')
test('v1 capability uses customer JWT, missing enabled stays false, decimal quote remains exact',async()=>{
 const u=platform(), a=load('src/api/giftCommerce.ts',u)
 let p=a.readGiftCapabilities(12)
 assert.equal(u.calls[0].header.Authorization,'Bearer fixture-client')
 assert.deepEqual(u.calls[0].data,{recipient_id:12})
 u.calls[0].success({statusCode:200,data:{purchase_supported:true,inventory_transfer_supported:true}})
 assert.equal((await p).purchase_enabled,false)
 p=a.quoteGift({gift_code:'rose',quantity:2,mode:'direct',recipient_id:12})
 assert.equal(u.calls[1].url,'https://fixture.invalid/api/gifts/quotes/')
 u.calls[1].success({statusCode:200,data:{gift_code:'rose',quantity:2,mode:'direct',recipient_id:12,price_version:'a'.repeat(64),total_diamonds:20,available_diamonds:'20.000000000000000001',commission_version:0,policy_version:'v1',can_submit:true,blockers:[]}})
 assert.equal((await p).available_diamonds,'20.000000000000000001')
 assert.equal(a.hasDiamonds('19.999999999999999999',20),false)
 assert.equal(a.hasDiamonds('20.000000000000000001',20),true)
 assert.equal(a.hasDiamonds('9007199254740993.5',20),true)
 assert.equal(a.hasDiamonds('1e3',20),false)
})
test('platform header and iOS local kill switch guard only new purchases, never original GET recovery',async()=>{
 const u=platform(),a=load('src/api/giftCommerce.ts',u,{'@/utils/purchaseAvailability':{getClientPlatform:()=> 'ios',isIOSPurchaseEnabled:()=>false}})
 const blocked=Promise.resolve().then(()=>a.purchaseGift({gift_code:'rose',quantity:1,mode:'inventory',price_version:'a'.repeat(64)},'original','fresh'));const rejected=assert.rejects(blocked);await new Promise(setImmediate);if(u.calls.length)u.calls[0].success({statusCode:200,data:{purchase_no:'p',payment_status:'paid',amount_diamonds:1,blockers:[]}});await rejected
 assert.equal(u.calls.length,0)
 const p=a.readGiftPurchaseByKey('original');assert.equal(u.calls[0].header['X-Client-Platform'],'ios');u.calls[0].success({statusCode:200,data:{purchase_no:'p',payment_status:'unknown',amount_diamonds:1,blockers:[]}});await p
})
test('purchase exact allowlist and original-key GET; all lots/records preserve server DTO',async()=>{
 const u=platform(),a=load('src/api/giftCommerce.ts',u)
 const q={gift_code:'rose',quantity:1,mode:'direct',recipient_id:12,price_version:'a'.repeat(64),commission_version:0,total_diamonds:10,available_diamonds:'10.5',policy_version:'v1',can_submit:true,blockers:[]}
 let p=a.purchaseGift(q,'original&key','fresh-code')
 assert.deepEqual(u.calls[0].data,{gift_code:'rose',quantity:1,mode:'direct',recipient_id:12,price_version:'a'.repeat(64),commission_version:0,idempotency_key:'original&key',code:'fresh-code'})
 u.calls[0].success({statusCode:200,data:{purchase_no:'p',payment_status:'unknown',amount_diamonds:10,blockers:[]}});assert.equal((await p).payment_status,'unknown')
 p=a.readGiftPurchaseByKey('original&key');assert.match(u.calls[1].url,/by-key\/\?idempotency_key=original%26key$/);assert.equal(u.calls[1].method,'GET')
 u.calls[1].success({statusCode:404,data:{detail:'not found'}});await assert.rejects(p);assert.equal(u.calls.length,2)
 const fixtures={inventory:{lot_id:1,gift_code:'rose',name:'Rose',remaining:2,available:0,status:'frozen'},'purchase-records':{purchase_no:'p',payment_status:'paid',amount_diamonds:10,blockers:[]},sent:{transfer_no:'t',gift_code:'rose',quantity:1,status:'delivered',created_at:'2026-09-22T00:00:00Z'},received:{transfer_no:'t',gift_code:'rose',quantity:1,status:'delivered',created_at:'2026-09-22T00:00:00Z'},earnings:{id:1,status:'frozen',monetary_accrual:false,blockers:['ACCRUAL_BASIS_UNCONFIRMED'],net_amount:'0.00',available_amount:'0.00'}}
 for(const [kind,item] of Object.entries(fixtures)){p=a.readGiftRecords(kind,2);const c=u.calls.at(-1);assert.equal(c.method,'GET');assert.equal(c.data.page,2);assert.ok(c.url.endsWith('/gifts/'+kind+'/'));c.success({statusCode:200,data:{count:21,next:null,previous:'untrusted-link',results:[item]}});assert.deepEqual((await p).results,[item])}
 assert.equal(a.earningLabel(fixtures.earnings),'待计提（尚未形成可提现收益）')
})
