const {test}=require('node:test'), assert=require('node:assert/strict'), vue=require('vue')
const {harness,nodes}=require('./commerce-sfc-harness.cjs')
const load=()=>harness().load('src/utils/surchargePresentation.ts')
test('optional whole-order input accepts zero and exact positive integers but refuses invalid or unsafe values',()=>{
 const {parseWholeOrderAmount}=load()
 assert.deepEqual(parseWholeOrderAmount(''),{valid:true,amount:0})
 assert.deepEqual(parseWholeOrderAmount('0'),{valid:true,amount:0})
 assert.deepEqual(parseWholeOrderAmount('75'),{valid:true,amount:75})
 for(const text of ['01','+1','-1','1.5','1e2',' 2','9007199254740992']) assert.equal(parseWholeOrderAmount(text).valid,false,text)
})
test('hall adapter trusts only effective paid v2 server snapshot, never recalculates by accepted headcount',()=>{
 const {hallSurcharge}=load()
 const paid={policy_version:'surcharge-v2-fixed25-equal1',commission_rate:'25.00',required_players:3,paid_diamonds:12,pending_diamonds:0,refunded_diamonds:0,per_person_net_diamonds:'3.00',blockers:[],earnings_withdrawable:false}
 const base={required_players:3,current_players:1,surcharge:paid}
 assert.deepEqual(hallSurcharge(base),{wholeOrderDiamonds:12,netDiamonds:'3.00'})
 assert.deepEqual(hallSurcharge({...base,current_players:2,normal_commission_percent:90}),{wholeOrderDiamonds:12,netDiamonds:'3.00'})
 for(const surcharge of [null,{...paid,paid_diamonds:0,pending_diamonds:12},{...paid,blockers:['SURCHARGE_REFUND_REQUIRES_REVIEW']},{...paid,policy_version:'legacy'},{...paid,required_players:2},{...paid,per_person_net_diamonds:'NaN'}]) assert.equal(hallSurcharge({...base,surcharge}),null)
})
test('real player grab SFC renders only verified paid surcharge for 1/3 and 2/3; no paid DTO preserves old UI',async()=>{
 const fs=require('node:fs'),path=require('node:path'),{parse}=require('@vue/compiler-sfc'),{baseParse,compile}=require('@vue/compiler-dom'),{renderToString}=require('@vue/server-renderer')
 const src=fs.readFileSync(path.join(__dirname,'../src/pages/player/grab/index.vue'),'utf8'),ast=baseParse(parse(src).descriptor.template.content)
 let card;function walk(n){if(n.props?.some(p=>p.name==='class'&&p.value?.content.split(' ').includes('order-card')))card ||= n.loc.source;n.children?.forEach(walk)}walk(ast);assert.ok(card)
 const render=new Function('Vue',compile(card,{mode:'function',prefixIdentifiers:true,isCustomElement:t=>['view','text','image'].includes(t)}).code)(vue)
 async function html(order,verified=true){return renderToString(vue.createSSRApp({setup:()=>({orders:[order],commerceRelease:{orderSurchargeHallContractVerified:verified},hallSurcharge:load().hallSurcharge,formatPublishedAt:()=> '发布于刚才',orderPlayerTypeText:()=> '不限类型',bossNote:()=>'',grab(){}}),render}))}
 const paid={policy_version:'surcharge-v2-fixed25-equal1',commission_rate:'25.00',required_players:3,paid_diamonds:12,pending_diamonds:0,refunded_diamonds:0,per_person_net_diamonds:'3.00',blockers:[],earnings_withdrawable:false},base={order_no:'fixture-order',required_players:3,current_players:1,can_grab:true,boss_note:'',surcharge:paid}
 for(const count of [1,2]){const result=await html({...base,current_players:count,normal_commission_percent:count===1?16:90});assert.match(result,/整单加价 12 钻石/);assert.match(result,/每人加价净收益 3.00 钻石等值/);assert.match(result,new RegExp(`${count}\\/3人`));assert.doesNotMatch(result,/鱼干|已到账/)}
 for(const surcharge of [undefined,{...paid,paid_diamonds:0,pending_diamonds:12},{...paid,blockers:['SURCHARGE_REFUND_REQUIRES_REVIEW']},{...paid,per_person_net_diamonds:'NaN'}]){const result=await html({...base,surcharge});assert.doesNotMatch(result,/整单加价|每人加价净收益/);assert.match(result,/立即抢单/)}
})
