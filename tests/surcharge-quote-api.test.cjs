const {test}=require('node:test'),assert=require('node:assert/strict')
const {harness}=require('./commerce-sfc-harness.cjs')
function api(){const calls=[],h=harness({'@/utils/sessionExpiry':{handleSessionExpiry:()=>null}});h.uni.request=o=>calls.push(o);return {calls,h,client:h.load('src/api/surchargeQuote.ts')}}
const payload={boss_wechat:'fixture-openid',game_id:'fixture-room',package_id:11,spec_id:12,quantity:1,required_players:3,addon_details:null,boss_note:null,booked_hours:1,surcharge_diamonds:3}
const response={contract_version:'surcharge-v2',base_amount_yuan:'4.00',surcharge_amount_yuan:'0.30',total_amount_yuan:'4.30',base_amount_diamonds:'40.0',total_amount_diamonds:'43.0',required_players:3,quote_version:'a'.repeat(64),surcharge:{policy_version:'surcharge-v2-fixed25-equal1',commission_rate:'25.00',amount_diamonds:3,amount_yuan:'0.30',required_players:3,amount_step_diamonds:3,per_person_gross_diamonds:'1.00',per_person_commission_diamonds:'0.25',per_person_net_diamonds:'0.75'},can_submit:false,blockers:['SURCHARGE_LIFECYCLE_UNAVAILABLE']}
test('real implemented v2 quote uses exact no-slash URL and current client JWT, parses decimal strings and no money POST',async()=>{
 const {calls,client}=api(),p=client.quoteOrderSurcharge(payload)
 assert.equal(calls.length,1);assert.equal(calls[0].url,'https://fixture.invalid/api/boss/order/quote');assert.equal(calls[0].method,'POST');assert.equal(calls[0].header.Authorization,'Bearer fixture-session-a');assert.deepEqual(calls[0].data,payload)
 calls[0].success({statusCode:200,data:response});assert.deepEqual(await p,response)
})
test('real quote parser rejects fake headcount/money/commission/policy/version and stale session',async()=>{
 for(const bad of [{required_players:2},{total_amount_diamonds:43},{quote_version:'short'},{surcharge:{...response.surcharge,required_players:1}},{surcharge:{...response.surcharge,commission_rate:'16.00'}},{surcharge:{...response.surcharge,per_person_net_diamonds:0.75}}]){
  const {calls,client}=api(),p=client.quoteOrderSurcharge(payload);calls[0].success({statusCode:200,data:{...response,...bad}});await assert.rejects(p,/报价格式/)
 }
 const {calls,h,client}=api(),p=client.quoteOrderSurcharge(payload);h.storage.token='relogin-same-account';calls[0].success({statusCode:200,data:response});await assert.rejects(p,/登录状态已变化/)
})
test('v2 quote propagates step rejection without estimating or rounding; zero legacy payload remains optional',async()=>{
 const {calls,client}=api(),p=client.quoteOrderSurcharge({...payload,surcharge_diamonds:1});calls[0].success({statusCode:400,data:{code:'SURCHARGE_NOT_DIVISIBLE',detail:'须为3钻的整数倍',amount_step_diamonds:3}});await assert.rejects(p,e=>e.code==='SURCHARGE_NOT_DIVISIBLE'&&e.amount_step_diamonds===3)
 const z=client.quoteOrderSurcharge({...payload,surcharge_diamonds:0});calls[1].success({statusCode:200,data:{...response,surcharge:{...response.surcharge,amount_diamonds:0,amount_yuan:'0.00',per_person_gross_diamonds:'0.00',per_person_commission_diamonds:'0.00',per_person_net_diamonds:'0.00'},surcharge_amount_yuan:'0.00',total_amount_yuan:'4.00',total_amount_diamonds:'40.0',can_submit:true,blockers:[]}});assert.equal((await z).surcharge.amount_diamonds,0)
})
