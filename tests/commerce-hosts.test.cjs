// Synthetic platform and deferred responses only. Executes actual SFC setup/render.
const { test } = require('node:test'), assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), vue = require('vue')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { renderToString } = require('@vue/server-renderer')
const root = path.join(__dirname, '..')
const {harness,nodes}=require('./commerce-sfc-harness.cjs')
const status = { order_no:'original', required_players:2, eligible:false, can_submit:false, disabled_reason:'规则尚未确认', paid_diamonds:20, processing_diamonds:3, refunded_diamonds:2, amount_options_diamonds:[], records:[{surcharge_no:'old',payment_status:'unknown',amount_diamonds:3,refunded_diamonds:0,created_at:'fixture'}], next:null, previous:null, count:1 }
test('real surcharge host shows confirmed money separately; unknown reads original only; hide/expiry discards late response', async () => {
  const requests=[]
  const h = harness({ '@/utils/commerceRelease': {commerceRelease:{orderSurchargeReadSupported:true}}, '@/api/commerceRead': { readOrderSurcharge: (...args) => new Promise((resolve,reject)=>requests.push({args,resolve,reject})) } })
  const Host=h.load('src/components/orders/OrderSurchargeHost.vue').default, scope=vue.effectScope(), props=vue.reactive({orderNo:'original'})
  const draw=scope.run(()=>Host.setup(props,{expose(){}})), tree=()=>nodes(draw(props,[]))
  await h.hooks.show[0](); const refresh=tree().find(n=>n.props?.['data-action']==='refresh'); refresh.props.onTap({stopPropagation(){}})
  assert.equal(requests.length,1); requests[0].resolve(status); await new Promise(setImmediate)
  assert.ok(tree().some(n=>n.children==='已到账加价 20 钻石'))
  assert.ok(tree().some(n=>n.children==='确认中 3 钻石（未计入到账）'))
  assert.ok(!tree().some(n=>n.children==='确认支付'))
  tree().find(n=>n.props?.['data-action']==='refresh').props.onTap({stopPropagation(){}}); h.hooks.hide[0]()
  requests[1].resolve({...status,paid_diamonds:999}); await new Promise(setImmediate)
  assert.ok(!tree().some(n=>String(n.children).includes('999')))
  await h.hooks.show[0](); tree().find(n=>n.props?.['data-action']==='refresh').props.onTap({stopPropagation(){}})
  h.storage.token='fixture-session-b'; h.storage.client_profile={id:2}; h.events['session:expired']('token')
  requests[2].resolve(status); await new Promise(setImmediate)
  assert.ok(!tree().some(n=>n.children==='已到账加价 20 钻石')); scope.stop()
})
test('real gift host defaults hidden without server capability and never fetches speculative inventory', async () => {
  let calls=0
  const h=harness({ '@/utils/commerceRelease': {commerceRelease:{orderSurchargeReadSupported:true}}, '@/api/gifts': { getGiftCapabilities: async()=>({purchase_enabled:false,inventory_send_enabled:false}), getGiftCatalog:async()=>{calls++;throw new Error('not requested')} } })
  const Host=h.load('src/components/gifts/GiftHost.vue').default
  const html=await renderToString(vue.createSSRApp(Host,{recipientId:12,recipientName:'真实姓名'}))
  assert.ok(!html.includes('送礼物')); assert.equal(calls,0)
})
test('production pages mount gift and surcharge hosts without changing existing service controls', () => {
  for(const page of ['player/list','player/detail']) {
    const source=fs.readFileSync(path.join(root,'src/pages',page,'index.vue'),'utf8')
    assert.match(source,/<GiftHost\b/); assert.match(source,/openPlayer(?:Detail|Product)/)
  }
  for(const page of ['boss/waiting','boss/query','boss/payment','boss/in-progress']) {
    assert.match(fs.readFileSync(path.join(root,'src/pages',page,'index.vue'),'utf8'),/<OrderSurchargeHost\b/)
  }
})
test('gift sheet rejects fractional or unsafe available diamonds rather than presenting a fabricated spendable unit', async () => {
  const h=harness(), Sheet=h.load('src/components/gifts/GiftSheet.vue').default
  for (const amount of [1.5, Number.MAX_SAFE_INTEGER+1, NaN]) {
    const html=await renderToString(vue.createSSRApp(Sheet,{open:true,accountId:'fixture',recipient:{id:'1',name:'模拟'},balanceDiamonds:amount}))
    assert.match(html,/余额暂不可用/)
  }
})
test('surcharge host account switch and same-account relog clear visible data; failed read is not an empty history', async () => {
  const requests=[], h=harness({ '@/utils/commerceRelease': {commerceRelease:{orderSurchargeReadSupported:true}}, '@/api/commerceRead': { readOrderSurcharge: (...args)=>new Promise((resolve,reject)=>requests.push({args,resolve,reject})) } })
  const Host=h.load('src/components/orders/OrderSurchargeHost.vue').default,scope=vue.effectScope(),props=vue.reactive({orderNo:'original'})
  const draw=scope.run(()=>Host.setup(props,{expose(){}})),tree=()=>nodes(draw(props,[])),click=()=>tree().find(n=>n.props?.['data-action']==='refresh').props.onTap({stopPropagation(){}})
  await h.hooks.show[0]();click();requests[0].resolve(status);await new Promise(setImmediate)
  h.storage.token='same-account-new-login';await h.hooks.show[0]();assert.ok(!tree().some(n=>n.children==='已到账加价 20 钻石'))
  click();requests[1].reject(new Error('fixture network failure'));await new Promise(setImmediate)
  assert.ok(tree().some(n=>typeof n.children==='string'&&n.children.includes('读取失败')));assert.ok(!tree().some(n=>n.children==='暂无加价记录'))
  h.storage.token='other-account';h.storage.client_profile={id:2};await h.hooks.show[0]();click();requests[2].resolve({...status,records:[],count:0});await new Promise(setImmediate)
  assert.ok(tree().some(n=>n.children==='暂无加价记录'))
  props.orderNo='changed';assert.ok(!tree().some(n=>n.children==='暂无加价记录'));scope.stop()
})
exports.harness=harness; exports.nodes=nodes
