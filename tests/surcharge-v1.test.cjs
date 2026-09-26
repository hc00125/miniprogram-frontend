const {test}=require('node:test'),assert=require('node:assert/strict'),vue=require('vue')
const {harness,nodes}=require('./commerce-sfc-harness.cjs')
const {load,platform}=require('./commerce-integration.test.cjs')
test('surcharge host states server limits and missing spendable quote despite server can_submit; no total balance fallback',async()=>{
 const d={order_no:'original',required_players:2,eligible:true,can_submit:true,structurally_eligible:true,blockers:['ALLOCATION_UNCONFIRMED'],disabled_reason:'',paid_diamonds:0,processing_diamonds:0,refunded_diamonds:0,amount_options_diamonds:[10,20],min_amount_diamonds:10,max_amount_diamonds:20,records:[],count:0,next:null,previous:null}
 const h=harness({ '@/utils/commerceRelease': {commerceRelease:{orderSurchargeReadSupported:true}},'@/api/commerceRead':{readOrderSurcharge:async()=>d}}),C=h.load('src/components/orders/OrderSurchargeHost.vue').default,scope=vue.effectScope(),props={orderNo:'original'},draw=scope.run(()=>C.setup(props,{expose(){}})),tree=()=>nodes(draw(props,[]))
 h.hooks.show[0]();await tree().find(n=>n.props?.['data-action']==='refresh').props.onTap({stopPropagation(){}})
 const text=tree().filter(n=>typeof n.children==='string').map(n=>n.children).join(' ')
 assert.match(text,/尚无可用余额报价/);assert.match(text,/ALLOCATION_UNCONFIRMED/);assert.match(text,/10 至 20 钻石/);assert.match(text,/整单额外加价，不是每人加价/);assert.ok(!text.includes('可用余额 0'));scope.stop()
})
test('real surcharge record action performs one original-detail GET and hides late result',async()=>{
 const reads=[],h=harness({ '@/utils/commerceRelease': {commerceRelease:{orderSurchargeReadSupported:true}},'@/api/commerceRead':{readOrderSurcharge:async()=>({order_no:'original',required_players:2,eligible:false,can_submit:false,disabled_reason:'',blockers:[],paid_diamonds:0,processing_diamonds:10,refunded_diamonds:0,amount_options_diamonds:[],records:[{surcharge_no:'s',payment_status:'unknown',amount_diamonds:10}],count:1,next:null,previous:null})},'@/api/surchargeCommerce':{readSurchargePayment:(...args)=>new Promise(resolve=>reads.push({args,resolve}))}})
 const C=h.load('src/components/orders/OrderSurchargeHost.vue').default,scope=vue.effectScope(),props={orderNo:'original'},draw=scope.run(()=>C.setup(props,{expose(){}})),tree=()=>nodes(draw(props,[]))
 h.hooks.show[0]();await tree().find(n=>n.props?.['data-action']==='refresh').props.onTap({stopPropagation(){}})
 const click=tree().find(n=>n.props?.['data-action']==='query-surcharge');assert.ok(click);click.props.onTap();assert.deepEqual(reads[0].args,['original','s']);h.hooks.hide[0]();reads[0].resolve({surcharge_no:'s',payment_status:'paid',blockers:[]});await new Promise(setImmediate);assert.ok(!tree().some(n=>typeof n.children==='string'&&n.children.includes('已付款')));scope.stop()
})
test('surcharge status detail and original-key reads encode segments and use only client JWT',async()=>{
 const u=platform(),a=load('src/api/surchargeCommerce.ts',u),dto={surcharge_no:'s',payment_status:'unknown',amount_diamonds:10,refunded_diamonds:0,blockers:['ALLOCATION_UNCONFIRMED']}
 let p=a.readSurchargePayment('原/单','s/?');assert.ok(u.calls[0].url.endsWith('/boss/orders/%E5%8E%9F%2F%E5%8D%95/surcharge/s%2F%3F/'));u.calls[0].success({statusCode:200,data:dto});assert.deepEqual(await p,dto)
 p=a.readSurchargeByKey('原/单','key&?');assert.ok(u.calls[1].url.endsWith('/surcharge/by-key/?idempotency_key=key%26%3F'));assert.equal(u.calls[1].header.Authorization,'Bearer fixture-client');assert.equal(u.calls[1].method,'GET');u.calls[1].success({statusCode:404,data:{detail:'not found'}});await assert.rejects(p);assert.equal(u.calls.length,2)
})
