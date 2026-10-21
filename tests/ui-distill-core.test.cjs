const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const vue=require('vue'),{parse,compileScript}=require('@vue/compiler-sfc'),{compile}=require('@vue/compiler-dom')
const {setup,tick,catalog,quote}=require('./patronage-harness.cjs')
const {harness,nodes}=require('./commerce-sfc-harness.cjs')
const root=path.join(__dirname,'..'),source=p=>fs.readFileSync(path.join(root,p),'utf8')
const purchase='src/pages/client/patronage/index.vue'
const scriptHashes={"src/pages/client/patronage/index.vue": "16ed66bfaa52795ef191df4f3df998f061230483883d59270e750085dabf6d34", "src/pages/client/patronage/records.vue": "d4ef1e422107f91f79d55cf53e710a04121559cd5f92de0a9741a7127000e4e8", "src/pages/boss/in-progress/index.vue": "5baa9d108900cf7029aa4b462e355041768a53ed70b914c0a2c956dde485c4fb", "src/pages/boss/payment/index.vue": "62c829788c245dfd98007e2ce38b67d663442a4c6f44a5bf8c974b762805b847", "src/pages/player/order-detail/index.vue": "9b9638addf8e9e135b0ca67a0cf8bd5a3cf532ca4f5c78d54ed3c65126c49eb7", "src/components/PatronageCrowns.vue": "709731b413b8833d4d705010181a63f8be4224c15cf7135b877ad87c5f321005", "src/components/gifts/GiftHost.vue": "cefb5e61e6e6c0802803a334362eff994cb90b05bf438e243a10697b82739d34", "src/components/gifts/GiftGrid.vue": "88515c3a13b0a95e2bb5f6fdcffd9ea815782823fb9fae3073ddd3c425e78074", "src/components/gifts/GiftSheet.vue": "01e58ca2cd123ec0492a4fd5adbd253b9f938a512c8dd26a430454b1858e7d72", "src/components/gifts/GiftInventorySend.vue": "6df2cc68a5bdb4581beeffb177d9932d54caa3f64e05bea403e1628815dd5e97", "src/components/gifts/GiftLiveSheet.vue": "41986db155af134a3d16ea4b0fdfb7303e98c360af25e3ea3ec22a294f18cf46"}
function drawTemplate(file,values={}) {
 const d=parse(source(file)).descriptor
 const code=compile(d.template.content,{mode:'function',isCustomElement:t=>['view','text','image','scroll-view','input','button','textarea'].includes(t)}).code
 const render=new Function('Vue',code)({...vue,resolveComponent:name=>name,withDirectives:v=>v})
 const defaults={$appThemeStyle:'',uiIcons:{},diamond:String,formatHours:String,stepClass:()=>'',stepIcon:()=>'',playerRoomText:()=>'',renewalItemDiamonds:String,formatRoomTime:String,statusClass:()=>'',copyText:()=>{},backToRoute:()=>{},handleRenewal:()=>{},saveKookRoom:()=>{}}
 const ctx=new Proxy({...defaults,...values},{has:(_,k)=>!String(k).startsWith('_') && !['Vue','Number','String','Math'].includes(k),get:(o,k)=>k===Symbol.unscopables?undefined:o[k]})
 const tree=nodes(render(ctx,[]));return {tree,text:tree.filter(n=>typeof n.children==='string').map(n=>n.children).join('|')}
}
test('core orders: service renewal explanation removed, paid totals and renewal data retained',()=>{
 const p=drawTemplate('src/pages/boss/in-progress/index.vue',{orderInfo:{paid:true,status:'进行中',can_renew:true,renewal_count:2,players:[],required_players:1},canShowRenewal:true,paidRenewals:[{order_no:'R1',renewal_index:1,booked_hours:2,status:'已完成'}],renewalOptions:[1,2],baseHours:1,renewalUnits:1,renewalDiamonds:100,totalPaidDiamonds:888,paidDiamonds:555,renewalPaidDiamonds:333,originalHoursText:'1小时',renewalHoursText:'2小时',totalHoursText:'3小时',missingSlots:[],overduePlayers:[]})
 assert.doesNotMatch(p.text,/续单会生成独立支付订单|陪玩接单后10分钟内实际入房/)
 for(const value of ['888','555','333','续单记录','3小时'])assert.ok(p.text.includes(value),value)
 assert.ok(p.tree.find(n=>n.props?.class==='renewal-btn').props.onTap)
 assert.match(section('user-guide','renew-replace'),/独立支付订单/)
})
test('core orders: payment SFC keeps amount, countdown and handlers without rate and timeout essay',async t=>{
 const p=await require('./order-balance-payment-harness.cjs').setup(t)
 assert.doesNotMatch(p.text(),/人民币1元对应10钻石|倒计时结束后将停止发起新支付|微信即时支付和已有钻石支付均保留/)
 assert.match(p.text(),/100/);assert.match(p.text(),/10:00/);assert.equal(p.payButton().props.disabled,false);assert.equal(typeof p.payButton().props.onTap,'function')
 assert.match(section('user-guide','match-pay'),/确认未付款后才自动取消/);assert.match(section('user-guide','match-pay'),/iOS充值人民币1元到账7钻石/)
})
test('core orders: player detail removes standing cancel/KOOK rules but preserves current consequence and inputs',()=>{
 const p=drawTemplate('src/pages/player/order-detail/index.vue',{orderInfo:{status:'待开打',players:[],kook_room_number:'TC1',total_amount_diamonds:300},canCancelOrder:true,noFaultEligible:false,canEditKookRoom:true,paidRenewals:[],roomInput:'TC1'})
 assert.doesNotMatch(p.text,/超过免罚次数后按人民币|多个陪玩接同一单时|取消后将暂停接单，暂停时长/)
 assert.match(p.text,/按拒单处理/);assert.ok(p.tree.find(n=>n.type==='input'&&n.props?.maxlength==='100'))
 assert.equal(typeof p.tree.find(n=>n.props?.class==='save-room-btn').props.onTap,'function')
 assert.match(section('player-guide','finish-exit'),/20 \/ 50 \/ 100/);assert.match(section('player-guide','wait-room'),/共用KOOK房间号/)
})
test('core gifts: plain-language capability, price and pending recovery without standing rule essays',()=>{
 const p=drawTemplate('src/components/gifts/GiftLiveSheet.vue',{recipient:{name:'甲'},cap:{purchase_enabled:true,inventory_quote_supported:true,blockers:[]},browseOnly:false,mode:'direct',catalog:[],quote:{total_diamonds:10,available_diamonds:'10.50',blockers:[]},selected:{price_diamonds:10},quantity:1,hasDiamonds:()=>true,paymentLabel:s=>s})
 assert.doesNotMatch(p.text,/购买使用钻石；背包赠送不重复扣钻|按服务端限制报价，付款时再次校验|服务端报价/)
 assert.match(p.text,/10 钻石/);assert.match(p.text,/10.50/)
 const pending=drawTemplate('src/components/gifts/GiftLiveSheet.vue',{recipient:{name:'甲'},cap:{inventory_quote_supported:false,blockers:[]},pending:true,originalNo:'G-original',recover:()=>{},paymentLabel:s=>s})
 assert.doesNotMatch(pending.text,/库存专用报价尚未提供/);assert.match(pending.text,/G-original/);assert.match(pending.text,/结果未知|结果待确认|待核对/)
 assert.ok(pending.tree.find(n=>n.props?.['data-action']==='recover'));assert.equal(pending.tree.find(n=>n.props?.['data-action']==='pay'),undefined)
 const stock=drawTemplate('src/components/gifts/GiftInventorySend.vue',{recipient:{name:'甲'},items:[],quote:null})
 assert.doesNotMatch(stock.text,/使用已有礼物，不扣钻石；收到的礼物/)
 assert.match(section('user-guide','gifts'),/不重复扣钻/);assert.match(section('user-guide','gifts'),/付款时再次校验/)
})
test('core crowns: actual SFC still renders multiple supporters, without exclusivity explanation',async()=>{
 const p=setup('src/components/PatronageCrowns.vue',{getPatronageCrowns:async()=>[{id:1,boss_name:'甲',package_name:'日冠',expires_at:'2099-10-21',source:'purchase'},{id:2,boss_name:'乙',package_name:'周冠',expires_at:'2099-10-22',source:'purchase'}]},{playerId:7})
 await p.life.show[0]();assert.doesNotMatch(p.text(),/多人可同时冠名|不独占、不锁单/);assert.match(p.text(),/甲/);assert.match(p.text(),/乙/);assert.ok(p.action('patronage-entry'));p.scope.stop()
})
test('core player arrival: one short instruction, real room status and confirmation action stay',()=>{
 const p=drawTemplate('src/pages/player/order-detail/index.vue',{orderInfo:{status:'待开打',players:[]},myOrderPlayer:{},roomEntryVisible:true,canConfirmRoomEntry:true,roomJoinStatus:'pending',roomJoinStatusText:'等待确认',handleConfirmRoomEntry:()=>{}})
 assert.doesNotMatch(p.text,/实际进入老板的游戏或KOOK房间后，请按订单提示|请仅在实际进入游戏或KOOK房间后点击/)
 assert.match(p.text,/接单后10分钟内实际入房/);assert.match(p.text,/付款后再开打/);assert.ok(p.tree.find(n=>n.props?.class==='room-entry-btn'))
})
test('core safety: every owned Vue SFC compiles; scripts stay byte-identical except two approved blocker literals',()=>{
 for(const [file,hash] of Object.entries(scriptHashes)){
  const d=parse(source(file));assert.deepEqual(d.errors,[],file);assert.ok(compileScript(d.descriptor,{id:'core-protected'}).content)
  let script=d.descriptor.scriptSetup.content
  if(file===purchase)script=script.replace("'请先刷新交易状态'", "'请先核对服务端未决交易'").replace("'有交易待确认，暂不能购买'", "'服务端存在未决交易，禁止新购'")
  assert.equal(crypto.createHash('sha256').update(script).digest('hex'),hash,file)
 }
})
test('core surfaces: neutral flat sections replace nested tinted cards',()=>{
 const postcss=require('postcss')
 const value=(file,selector,prop)=>{let value;for(const s of parse(source(file)).descriptor.styles)postcss.parse(s.content).walkRules(r=>{if(r.selector.split(',').map(x=>x.trim()).includes(selector))r.walkDecls(prop,d=>value=d.value)});return value}
 assert.equal(value(purchase,'.intro-card','background'),'var(--ui-surface, #fff)')
 assert.equal(value('src/pages/client/patronage/records.vue','.record-card','box-shadow'),'none')
 assert.equal(value('src/components/PatronageCrowns.vue','.crown-row','background'),'transparent')
 assert.equal(value('src/pages/boss/in-progress/index.vue','.renewal-summary view','background'),'transparent')
 assert.equal(value('src/pages/player/order-detail/index.vue','.cancel-policy-card','background'),'transparent')
 assert.equal(value('src/components/gifts/GiftLiveSheet.vue','.sheet','box-sizing'),'border-box')
})
test('core recovery: zero remote pending cannot erase local unknown or enable another purchase',async()=>{
 const p=setup(purchase,{getPatronageCatalog:async()=>({...catalog(),purchase_enabled:true}),getPatronageQuote:async()=>({...quote(),can_submit:true,blockers:[]}),getPatronagePending:async()=>({count:0,next:null,previous:null,results:[]})}),requests=[]
 p.h.uni.showModal=o=>o.success({confirm:true});p.h.uni.login=o=>o.success({code:'fixture-only'})
 p.h.uni.request=o=>{requests.push(o);if(o.method==='POST')o.fail({errMsg:'timeout'});else o.success({statusCode:404,data:{detail:'not found'}})}
 p.life.load[0]({playerId:'7'});await p.life.show[0]();await p.action('purchase').props.onTap()
 const journal=()=>Object.entries(p.h.storage).find(([k])=>k.startsWith('patronage:'))[1],key=journal().idempotency_key
 p.life.hide[0]();await p.life.show[0]();assert.doesNotMatch(p.text(),/未决交易 0/);assert.match(p.text(),/待确认|待核对/)
 assert.equal(p.action('purchase').props.disabled,true);assert.equal(p.action('buy-again'),undefined);await p.action('recover').props.onTap()
 assert.equal(requests.filter(x=>x.method==='POST').length,1);assert.equal(requests.at(-1).data.idempotency_key,key);assert.equal(journal().idempotency_key,key);assert.equal(journal().payment_status,'unknown');p.scope.stop()
})
test('core pending states: current purchase blocker uses plain language for null and unseen positive totals',async()=>{
 for(const total of [null,21]){
  const p=setup(purchase,{getPatronageCatalog:async()=>({...catalog(),purchase_enabled:true}),getPatronageQuote:async()=>({...quote(),can_submit:true,blockers:[]}),getPatronagePending:async()=>{if(total===null)throw Error('暂时无法读取交易');return {count:total,next:'next-page',previous:null,results:[]}}})
  p.life.load[0]({playerId:'7'});await p.life.show[0]();assert.doesNotMatch(p.text(),/服务端|未决/);assert.equal(p.action('purchase').props.disabled,true)
  if(total)assert.match(p.text(),/21 笔交易待确认/);else assert.match(p.text(),/交易尚未核对/)
  p.scope.stop()
 }
})
test('core cancellation: actual SFC confirmation keeps preview consequences and rejection never submits',async()=>{
 for(const noFault of [false,true]){
  const life={mount:[],unmount:[],load:[]},modals=[],writes=[],order={order_no:'O-original',status:'待开打',paid:true,booked_hours:2,total_amount_diamonds:300,players:[{id:9,name:'甲'}]}
  const preview={no_fault:noFault,no_fault_reason:'匹配等待超过15分钟',replacement_text:'等待补位',stage_text:'服务中退出',booked_hours:2,used_free_chance:false,fine_rmb:20,fine_fish:200}
  const h=harness({vue:{...vue,onMounted:f=>life.mount.push(f),onUnmounted:f=>life.unmount.push(f)},'@dcloudio/uni-app':{onLoad:f=>life.load.push(f)},'@/api/player':{getPlayerOrder:async()=>order},'@/api/orderCancellation':{getPlayerCancellationPreview:async no=>{assert.equal(no,'O-original');return preview},cancelPlayerOrder:async(...a)=>{writes.push(a);return {no_fault:noFault,debt_fish:0}}},'@/utils/storage':{getStorage:k=>k==='token'?'fixture-only':{id:9}},'@/utils/client':{isApprovedPlayer:async()=>true},'@/utils/nav':{replace(){},goMain(){},backToRoute(){}},'@/utils/feedback':{getErrorMessage:e=>e.message,success(){},toast(){},confirm:async()=>false}})
  h.uni.showModal=o=>modals.push(o)
  const scope=vue.effectScope(),C=h.load('src/pages/player/order-detail/index.vue').default,draw=scope.run(()=>C.setup({}, {expose(){}}))
  try{
   life.load[0]({orderNo:'O-original'});await life.mount[0]();const button=()=>nodes(draw({},[])).find(n=>String(n.props?.class).includes('club-btn--danger'))
   const rejected=button().props.onTap();await tick();if(noFault)assert.match(modals[0].content,/不会暂停接单、罚款或消耗免罚机会/);else{assert.match(modals[0].content,/暂停接单：2小时/);assert.match(modals[0].content,/本次罚款 ¥20（200鱼干）/)}
   modals[0].success({confirm:false});await rejected;assert.equal(writes.length,0)
   const accepted=button().props.onTap();await tick();modals[1].success({confirm:true,content:'真实原因'});await accepted;assert.deepEqual(writes,[['O-original','真实原因']])
  }finally{life.unmount.forEach(f=>f());scope.stop()}
 }
})
const help=()=>harness().load('src/content/help.ts').helpArticles
const section=(article,id)=>help().find(x=>x.id===article).sections.find(x=>x.id===id).paragraphs.join('|')
test('core patronage: compact real SFC retains quote, actions and zero-pending local recovery',async()=>{
 const p=setup(purchase,{getPatronageCatalog:async()=>({...catalog(),purchase_enabled:true}),getPatronageQuote:async()=>({...quote(),can_submit:true,blockers:[]}),getPatronagePending:async()=>({count:0,next:null,previous:null,results:[]})})
 p.life.load[0]({playerId:'7'});await p.life.show[0]()
 assert.doesNotMatch(p.text(),/冠名展示有效期与包含服务时长独立|支持多位老板同时冠名|服务端未决交易 0|暂不提供自助退款|付款成功后生效；同老板/)
 assert.match(p.text(),/1880.0/);assert.match(p.text(),/2000.0/)
 assert.equal(p.action('purchase').props.disabled,false);assert.equal(typeof p.action('purchase').props.onTap,'function')
 p.action('support').props.onTap();assert.deepEqual(p.calls[0],['/pages/client/customer-service/index']);p.scope.stop()
 assert.match(section('user-guide','patronage'),/24小时/);assert.match(section('user-guide','patronage'),/不独占、不锁单/)
 assert.match(section('recharge-refund','patronage-refund'),/暂不提供自助退款/)
})
test('core patronage records: no repeated refund essay, real amounts and unknown state remain',async()=>{
 const p=setup('src/pages/client/patronage/records.vue',{getPatronageRecords:async()=>({count:1,next:null,previous:null,results:[{purchase_no:'PN-real-fixture',player_name:'甲',package_name:'日冠',amount_diamonds:'1880.0',payment_status:'unknown',created_at:'2026-10-01',blockers:[]}]})})
 await p.life.show[0]();assert.doesNotMatch(p.text(),/暂不提供自助退款|支付结果以服务端为准/);assert.match(p.text(),/1880.0|PN-real-fixture/);assert.match(p.text(),/结果待确认/);assert.ok(p.action('refresh'));assert.ok(p.action('support'));p.scope.stop()
})

const {baseParse}=require('@vue/compiler-dom');
function templateContract(s){const ast=baseParse(parse(s).descriptor.template.content);let controls=[],interpolations=[];function visit(n,anc=[]){if(n.type===5)interpolations.push(n.content.content);if(n.type===1){const props=n.props.map(p=>p.type===6?[p.name,p.value?.content]:[p.name,p.arg?.content,p.exp?.content,p.modifiers.map(x=>x.content||x)]);if(['button','input','textarea'].includes(n.tag)||n.props.some(p=>p.type===7&&['on','model'].includes(p.name)))controls.push({tag:n.tag,props,anc});const cond=n.props.filter(p=>p.type===7&&['if','else-if','else','for'].includes(p.name)).map(p=>[p.name,p.arg?.content,p.exp?.content,p.modifiers.map(x=>x.content||x)]);n.children.forEach(c=>visit(c,[...anc,...cond]));}else if(n.children)n.children.forEach(c=>visit(c,anc));}visit(ast);return {controls,interpolations};}

const frozenTemplateContracts={"src/pages/client/patronage/index.vue": {"controls_sha256": "4943c944476545e88bf0606e0169d776eb60284ba74d587a343a6c4f23baccea", "control_count": 11, "removed_display_expressions": ["selected.name", "pendingCount === null ? '未决交易尚未核对，暂不能新购' : `服务端未决交易 ${pendingCount} 笔`"], "added_display_expressions": ["pendingCount === null ? '交易尚未核对，暂不能购买' : `有 ${pendingCount} 笔交易待确认，暂不能购买`"], "preserved_interpolations_sha256": "ca24876bce359b2edb36ec8a80597676e95c1dc860aaab777a6d8a0cea5d4a26", "preserved_interpolation_count": 24}, "src/pages/client/patronage/records.vue": {"controls_sha256": "c95e36c477d44e16e514a96f2272bd2b3c45971356f105da0b5d63188d345b61", "control_count": 5, "removed_display_expressions": [], "added_display_expressions": [], "preserved_interpolations_sha256": "bba9f7d30538aebc2a483c8b743b3ab7f21ed87918347d444a708a55499b10db", "preserved_interpolation_count": 15}, "src/pages/boss/in-progress/index.vue": {"controls_sha256": "dc1892e8206e7da7ed019d1d6d375414a05345f8d3d06cfa95b251b6c94f820a", "control_count": 10, "removed_display_expressions": ["orderInfo.can_renew ? '续单会生成独立支付订单，可使用已有钻石或微信即时支付；成功后时长自动计入本订单。' : '当前订单暂不能创建新续单，请刷新状态或先处理待支付续单。'"], "added_display_expressions": [], "preserved_interpolations_sha256": "968c463a506a116521d94cbc2b6863677e6362de5ffa4d0d267dbb573865b5cd", "preserved_interpolation_count": 52}, "src/pages/boss/payment/index.vue": {"controls_sha256": "651798a25b0bfd27ee1caee775526027b4512524c837f85de28663a69d2dcce3", "control_count": 20, "removed_display_expressions": ["paymentWindowNotice"], "added_display_expressions": ["serverConfirming ? '正在核验付款，请勿重复支付' : '请在倒计时内完成付款'"], "preserved_interpolations_sha256": "8ddc72788ba997cf907cdf7377f11040c9c1b2c4e49300a3ec3fe425f163d50d", "preserved_interpolation_count": 69}, "src/pages/player/order-detail/index.vue": {"controls_sha256": "7f34c6e489ac2f96de0adeb7968f6edbe69b41f68f9886749f3f31c9814979d4", "control_count": 14, "removed_display_expressions": ["orderInfo?.status === '进行中' ? '服务中退出按近3天一次免罚机会计算。' : '进队前取消按每天一次免罚机会计算。'"], "added_display_expressions": ["noFaultEligible ? '本次不计拒单；退出前请核对确认提示。' : '退出前请核对本次暂停接单和罚款。'"], "preserved_interpolations_sha256": "0f815d9ede8aa4bb6a2e7cad540a1c16a1c4b8bb11861f0629cdff5160e8291c", "preserved_interpolation_count": 42}, "src/components/PatronageCrowns.vue": {"controls_sha256": "2eb0d85f1deaad7ffa6c4f8910bcae62ec86616dfbe39901cbe935447617a7dc", "control_count": 5, "removed_display_expressions": [], "added_display_expressions": [], "preserved_interpolations_sha256": "62b1ff91505e5efe9ca694accca4f4b78212f6ab1fba672c331cc4f080a754fe", "preserved_interpolation_count": 7}, "src/components/gifts/GiftHost.vue": {"controls_sha256": "2bfb02dcc6c745412a22b7a8577a3e5ead0a9ef028ace23e1db58cc7cf241bd4", "control_count": 3, "removed_display_expressions": [], "added_display_expressions": [], "preserved_interpolations_sha256": "6837e42afa31425ba479776ce667fd0f9d6d381c1264cc7c9aa3e41c31d142a2", "preserved_interpolation_count": 1}, "src/components/gifts/GiftGrid.vue": {"controls_sha256": "a762ea5b8eaef4fe6b6ed576460712ab2dd0b4ac767bf4a266b32f4b7e4778c8", "control_count": 2, "removed_display_expressions": [], "added_display_expressions": [], "preserved_interpolations_sha256": "98d745570c1827ccfc506134788935b5565786b834235767d28b76e2e87b33ba", "preserved_interpolation_count": 3}, "src/components/gifts/GiftSheet.vue": {"controls_sha256": "a90c3fcd37fb9ce6ccc711ccbe5d151c9b48ffb26b3f99ece4a13db6a35bcc98", "control_count": 10, "removed_display_expressions": [], "added_display_expressions": [], "preserved_interpolations_sha256": "f242210291467d4a4e57fcfa8cc61ca92e22dc5dc124262b062da05a9bc84157", "preserved_interpolation_count": 6}, "src/components/gifts/GiftInventorySend.vue": {"controls_sha256": "8b25141b487bf3879bc7f362a47f4c8b601583a7f9f6b84cbec3bfeb69d04682", "control_count": 11, "removed_display_expressions": [], "added_display_expressions": [], "preserved_interpolations_sha256": "13869323d00d5b2b02fc55b920ce327805da14c96c786b4b428c0dbee190c2ac", "preserved_interpolation_count": 12}, "src/components/gifts/GiftLiveSheet.vue": {"controls_sha256": "e6a4ce8fe98e9d14d496700f3d47bfe40b1ef08a334d6abca71f9ea5ce2c485b", "control_count": 18, "removed_display_expressions": ["cap.blockers.join(' · ') || (cap.purchase_enabled ? '按服务端限制报价，付款时再次校验' : '服务端未开放购买')"], "added_display_expressions": ["cap.blockers.join(' · ') || (cap.purchase_enabled ? '' : '购买暂未开放')"], "preserved_interpolations_sha256": "72c179dd11427d632b6f5512bec668dcb0e502f0358d43120666ed82764d8f24", "preserved_interpolation_count": 12}}
test('core safety: frozen controls/ancestor gates, bindings and business interpolations are intact',()=>{
 const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')
 for(const [file,expected] of Object.entries(frozenTemplateContracts)){
  const actual=templateContract(source(file));assert.equal(hash(actual.controls),expected.controls_sha256,file+' controls and ancestor gates')
  const originalExpressions=actual.interpolations.filter(x=>!expected.added_display_expressions.includes(x))
  assert.equal(hash(originalExpressions),expected.preserved_interpolations_sha256,file+' all original non-copy expressions')
 }
})
