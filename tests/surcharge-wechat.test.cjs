const {test} = require('node:test')
const a = require('node:assert/strict')
const vue = require('vue')
const {harness, nodes} = require('./commerce-sfc-harness.cjs')
const tick = () => new Promise(setImmediate)
const key = 'checkout_wechat_7'
const quote = {contract_version:'surcharge-v2',quote_version:'a'.repeat(64),base_amount_yuan:'15.00',surcharge_amount_yuan:'10.00',total_amount_yuan:'25.00',base_amount_diamonds:'150.0',total_amount_diamonds:'250.0',required_players:1,surcharge:{policy_version:'surcharge-v2-fixed25-equal1',commission_rate:'25.00',amount_diamonds:100,amount_yuan:'10.00',required_players:1,amount_step_diamonds:1,per_person_gross_diamonds:'100.00',per_person_commission_diamonds:'25.00',per_person_net_diamonds:'75.00'},can_submit:true,blockers:[]}
const order = (paid=false) => ({order_no:'wechat-order',status:paid?'待接单':'待支付',total_price:15,checkout:{...quote,idempotency_key:key,payment_status:paid?'paid':'created',attempt_id:paid?'one-capture':null}})
function mount({platform='android', nativeSucceeds=true, creationLost=false, closedOnCancel=false, expireOnCancel=false, retryCreationLost=false, legacyCancelled=false, confirmHandler=async()=>true, cancelReplyLost=false, cancelRejected=false, iosPurchaseEnabled=true} = {}) {
  const calls=[], routes=[], hooks={}, events={}, storage={token:'buyer-token',client_profile:{id:7},'surcharge:v2:checkout:7':{key,quote_version:quote.quote_version,total_amount_yuan:'25.00',surcharge_diamonds:100,required_players:1,order_no:'wechat-order',status:'created',submitted:false,verified:false,attempt_id:null}}
  let paid=false, credited=false, cashierClosed=legacyCancelled, paymentNo='recharge-fixed', retryFrom='', legacyNormalized=false, cancelled=false
  if(legacyCancelled)Object.assign(storage['surcharge:v2:checkout:7'],{status:'unknown',submitted:true,payment_method:'wechat',recharge_no:paymentNo})
  const h = harness({
    '@dcloudio/uni-app':{onLoad:f=>hooks.load=f,onShow:f=>hooks.show=f,onHide:f=>hooks.hide=f,onUnload:f=>hooks.unload=f},
    '@/utils/commerceRelease':{commerceRelease:{orderSurchargeQuoteSupported:true}},
    '@/utils/purchaseAvailability':{getClientPlatform:()=>platform,isIOSPurchaseEnabled:()=>iosPurchaseEnabled},
    '@/utils/nav':{replace:(...args)=>routes.push(args)},
    '@/utils/feedback':{confirm:confirmHandler,getErrorMessage:e=>e.message||e.detail||'failed'},
    '@/utils/virtual-payment':{requestWechatVirtualPayment:async(params, options)=>{
      calls.push(['native',params]); if(!nativeSucceeds || closedOnCancel && calls.filter(c=>c[0]==='native').length===1){cashierClosed=closedOnCancel;throw {errCode:-2,errMsg:'cancel'}}
      credited=true; return options.query(params.payment_no)
    }},
  })
  Object.assign(h.uni, {getStorageSync:k=>storage[k],setStorageSync:(k,v)=>storage[k]=v,
    $on:(k,f)=>events[k]=f,$off:k=>delete events[k],login:o=>{calls.push(['login']);o.success({code:'fresh-'+calls.length})},
    request:o=>{
      calls.push([o.method,o.url,o.data,o.header])
      let data
      if(o.url.includes('/boss/order/by-key')) {
        data=order(paid)
        if(expireOnCancel && cashierClosed){data.status='已取消';data.checkout.payment_status='failed'}
        if(legacyCancelled){data.status='已取消';data.checkout.payment_status=legacyNormalized?'failed':'created'}
        if(cancelled){data.status='已取消';data.checkout.payment_status='failed'}
      }
      else if(o.url.endsWith('/pay/wechat/virtual/create')) {
        if(creationLost){o.fail(new Error('create response lost'));return}
        if(o.data.retry_from_payment_no){
          a.equal(o.data.retry_from_payment_no,'recharge-fixed');a.equal(cashierClosed,true)
          retryFrom=o.data.retry_from_payment_no;paymentNo='recharge-retry';cashierClosed=false
          if(retryCreationLost){o.fail(new Error('retry reply lost'));return}
        }
        data={payment_no:paymentNo,retry_from_payment_no:retryFrom,checkout_order_no:'wechat-order',order_no:'wechat-order',amount:'25.00',mode:'short_series_coin',signData:JSON.stringify({outTradeNo:paymentNo,buyQuantity:250,currencyType:'CNY'}),paySig:'offline-signature',signature:'offline-user-signature',wechat_coin_units:250,wechat_coin_units_per_yuan:10,status:'paying'}
      } else if(o.url.includes('/query-order/')){
        legacyNormalized=legacyCancelled
        data={found:true,payment_no:paymentNo,retry_from_payment_no:retryFrom,checkout_order_no:'wechat-order',order_no:'wechat-order',amount:'25.00',status:credited?'credited':cashierClosed?'closed':'paying',retry_allowed:cashierClosed&&!expireOnCancel&&!legacyCancelled,order_status:legacyCancelled||expireOnCancel&&cashierClosed?'已取消':'待支付'}
      }
      else if(o.url.includes('/finalize/')){paid=true;data={order_no:'wechat-order',amount:'25.00',status:'paid',checkout:order(true).checkout}}
      else if(o.url.endsWith('/boss/order')){data=order();data.order_no='manual-new-order';data.checkout.idempotency_key=o.data.idempotency_key}
      else if(o.url.endsWith('/boss/order/wechat-order/cancel')){
        if(cancelRejected){o.success({statusCode:409,data:{detail:'付款结果待确认，请先查询'}});return}
        cancelled=true
        if(cancelReplyLost){o.fail(new Error('cancel reply lost'));return}
        data={order_no:'wechat-order',status:'已取消'}
      }
      else throw new Error('Unexpected request '+o.url)
      o.success({statusCode:200,data})
    },
  })
  const scope=vue.effectScope(), render=scope.run(()=>h.load('src/pages/boss/surcharge-payment/index.vue').default.setup({},{expose(){}}))
  const action=name=>nodes(render({},[])).find(n=>n.props?.['data-action']===name)
  return {h,hooks,storage,calls,routes,scope,action,text:()=>nodes(render({},[])).map(n=>typeof n.children==='string'?n.children:'').join('\n'),async open(){hooks.load({key});hooks.show();await tick()},credit(){credited=true}}
}

test('real combined page and controller reuse coin checkout, then verified by-key GET navigates', async t => {
  const m=mount();t.after(()=>m.scope.stop());await m.open()
  a.ok(m.action('select-wechat'), 'WeChat payment option must be available')
  m.action('select-wechat').props.onTap()
  await m.action('confirm-combined-payment').props.onTap();await tick()
  a.equal(m.calls.filter(c=>c[1]?.endsWith?.('/pay/wechat/virtual/create')).length,1)
  a.equal(m.calls.filter(c=>c[0]==='native').length,1)
  a.equal(m.calls.filter(c=>c[1]?.includes?.('/finalize/')).length,1)
  a.equal(m.calls.filter(c=>c[1]?.endsWith?.('/pay/balance/create')).length,0)
  a.equal(m.storage['surcharge:v2:checkout:7'].verified,true)
  a.deepEqual(m.routes,[['/pages/boss/waiting/index',{orderNo:'wechat-order'}]])
  a.ok(m.calls.filter(c=>c[0]==='login').length>=2, 'fresh code for coin capture')
})

test('cashier cancellation stays on original order and cannot switch to a second debit', async t => {
  const m=mount({nativeSucceeds:false});t.after(()=>m.scope.stop());await m.open()
  a.ok(m.action('select-wechat'));m.action('select-wechat').props.onTap()
  await m.action('confirm-combined-payment').props.onTap();await tick()
  a.deepEqual(m.routes,[]);a.equal(m.action('confirm-combined-payment'),undefined)
  a.equal(m.storage['surcharge:v2:checkout:7'].key,key)
  a.equal(m.calls.filter(c=>c[1]?.includes?.('/finalize/')).length,0)
})

test('lost cashier creation reply is recovered by original order without another recharge POST', async t => {
  const m=mount({creationLost:true});t.after(()=>m.scope.stop());await m.open()
  a.ok(m.action('select-wechat'));m.action('select-wechat').props.onTap()
  await m.action('confirm-combined-payment').props.onTap();await tick()
  m.hooks.hide();m.credit();m.hooks.show();await tick();await tick()
  a.equal(m.calls.filter(c=>c[1]?.endsWith?.('/pay/wechat/virtual/create')).length,1)
  a.equal(m.calls.filter(c=>c[0]==='native').length,0)
  a.equal(m.storage['surcharge:v2:checkout:7'].verified,true)
  a.deepEqual(m.routes,[['/pages/boss/waiting/index',{orderNo:'wechat-order'}]])
})

test('confirmed CLOSED cashier cancellation allows manual retry on the same business order after reopening', async t => {
  const m=mount({closedOnCancel:true});t.after(()=>m.scope.stop());await m.open()
  m.action('select-wechat').props.onTap()
  await m.action('confirm-combined-payment').props.onTap();await tick()
  a.ok(m.action('retry-wechat-payment'), 'confirmed cancellation must restore a payment button')
  a.equal(m.storage['surcharge:v2:checkout:7'].submitted,true)
  a.equal(m.calls.filter(c=>c[0]==='native').length,1, 'never reopen cashier automatically')
  m.hooks.hide();m.hooks.show();await tick();await tick()
  const retry=m.action('retry-wechat-payment');a.ok(retry, 'old persistent payment intent must recover')
  await Promise.all([retry.props.onTap(),retry.props.onTap()]);await tick()
  const creates=m.calls.filter(c=>c[1]?.endsWith?.('/pay/wechat/virtual/create'))
  a.equal(creates.length,2);a.equal(creates[1][2].retry_from_payment_no,'recharge-fixed')
  a.equal(m.calls.filter(c=>c[0]==='native').length,2)
  a.equal(m.calls.filter(c=>c[1]?.includes?.('/finalize/')).length,1)
  a.equal(m.calls.filter(c=>c[1]?.endsWith?.('/boss/order')).length,0)
  a.equal(m.storage['surcharge:v2:checkout:7'].key,key)
  a.equal(m.storage['surcharge:v2:checkout:7'].recharge_no,'recharge-retry')
  a.equal(m.storage['surcharge:v2:checkout:7'].verified,true)
  a.deepEqual(m.routes,[['/pages/boss/waiting/index',{orderNo:'wechat-order'}]])
})

test('server-confirmed expired unpaid order ends recovery lock and can return to order detail', async t => {
  const m=mount({closedOnCancel:true,expireOnCancel:true});t.after(()=>m.scope.stop());await m.open()
  m.action('select-wechat').props.onTap()
  await m.action('confirm-combined-payment').props.onTap();await tick()
  a.equal(m.storage['surcharge:v2:checkout:7'].cancelled_verified,true)
  a.equal(m.storage['surcharge:v2:checkout:7'].submitted,true)
  a.equal(m.action('retry-wechat-payment'),undefined)
  a.equal(m.action('confirm-combined-payment'),undefined)
  a.equal(m.calls.filter(c=>c[1]?.includes?.('/finalize/')).length,0)
  const detail=m.action('view-cancelled-order');a.ok(detail);detail.props.onTap()
  a.deepEqual(m.routes,[['/pages/boss/payment/index',{orderNo:'wechat-order'}]])
  const next=m.h.load('src/utils/surchargeCheckoutIntent.ts').makeSurchargeIntent(()=>({account:'7',token:'buyer-token'}))
  const created=await next.create({package_id:1,surcharge_diamonds:100},quote)
  a.equal(created.order_no,'manual-new-order');a.notEqual(next.state().key,key)
  a.equal(m.calls.filter(c=>c[0]==='native').length,1, 'new order does not auto-pay')
})

test('lost retry response recovers replacement recharge without another create or cashier launch', async t => {
  const m=mount({closedOnCancel:true,retryCreationLost:true});t.after(()=>m.scope.stop());await m.open()
  m.action('select-wechat').props.onTap();await m.action('confirm-combined-payment').props.onTap();await tick()
  await m.action('retry-wechat-payment').props.onTap();await tick()
  a.equal(m.storage['surcharge:v2:checkout:7'].retry_from_payment_no,'recharge-fixed')
  m.hooks.hide();m.hooks.show();await tick();await tick()
  a.equal(m.storage['surcharge:v2:checkout:7'].recharge_no,'recharge-retry')
  a.equal(m.storage['surcharge:v2:checkout:7'].retry_from_payment_no,undefined)
  a.equal(m.calls.filter(c=>c[1]?.endsWith?.('/pay/wechat/virtual/create')).length,2)
  a.equal(m.calls.filter(c=>c[0]==='native').length,1)
  a.equal(m.action('retry-wechat-payment'),undefined);a.deepEqual(m.routes,[])
})

test('old cancelled business order with a stale created checkout is reconciled instead of permanently locking shopping', async t => {
  const m=mount({legacyCancelled:true});t.after(()=>m.scope.stop());await m.open();await tick()
  a.equal(m.storage['surcharge:v2:checkout:7'].cancelled_verified,true)
  a.ok(m.action('view-cancelled-order'))
  a.equal(m.calls.filter(c=>c[1]?.includes?.('/query-order/')).length,1)
  a.equal(m.calls.filter(c=>c[1]?.endsWith?.('/pay/wechat/virtual/create')).length,0)
  a.equal(m.calls.filter(c=>c[0]==='native').length,0)
})

test('unpaid combined order exposes manual cancel, submits once and verifies by original key before leaving', async t => {
  const m=mount();t.after(()=>m.scope.stop());await m.open()
  const button=m.action('cancel-order');a.ok(button,'unpaid combined checkout must expose manual cancel')
  a.equal(button.props.disabled,false)
  await Promise.all([button.props.onTap(),button.props.onTap()]);await tick()
  const cancels=m.calls.filter(c=>c[1]?.endsWith?.('/boss/order/wechat-order/cancel'))
  a.equal(cancels.length,1);a.equal(cancels[0][0],'POST')
  a.equal(cancels[0][3].Authorization,'Bearer buyer-token')
  a.equal(m.storage['surcharge:v2:checkout:7'].cancelled_verified,true)
  a.equal(m.storage['surcharge:v2:checkout:7'].key,key)
  a.deepEqual(m.routes,[['/pages/boss/payment/index',{orderNo:'wechat-order'}]])
  a.equal(m.calls.filter(c=>c[0]==='login'||c[0]==='native'||c[1]?.includes?.('/pay/')).length,0)
})

test('confirmed closed cashier offers manual order cancellation without a second payment', async t => {
  const m=mount({closedOnCancel:true});t.after(()=>m.scope.stop());await m.open()
  m.action('select-wechat').props.onTap();await m.action('confirm-combined-payment').props.onTap();await tick()
  const button=m.action('cancel-order');a.ok(button);a.equal(button.props.disabled,false)
  await button.props.onTap();await tick()
  a.equal(m.calls.filter(c=>c[1]?.endsWith?.('/boss/order/wechat-order/cancel')).length,1)
  a.equal(m.calls.filter(c=>c[1]?.endsWith?.('/pay/wechat/virtual/create')).length,1)
  a.equal(m.calls.filter(c=>c[0]==='native').length,1)
  a.equal(m.calls.filter(c=>c[1]?.includes?.('/finalize/')).length,0)
  a.equal(m.storage['surcharge:v2:checkout:7'].cancelled_verified,true)
})

test('unconfirmed cashier keeps cancel visible but disabled with its specific reason', async t => {
  const m=mount({nativeSucceeds:false});t.after(()=>m.scope.stop());await m.open()
  m.action('select-wechat').props.onTap();await m.action('confirm-combined-payment').props.onTap();await tick()
  const button=m.action('cancel-order');a.ok(button);a.equal(button.props.disabled,true)
  a.match(m.text(),/付款结果尚未确认，请先查询付款状态/)
  await button.props.onTap()
  a.equal(m.calls.filter(c=>c[1]?.endsWith?.('/cancel')).length,0)
})

for(const decision of ['decline','hide','session-change'])test(`cancel confirmation ${decision} never submits an order cancellation`, async t => {
  let resolveConfirm
  const m=mount({confirmHandler:()=>new Promise(r=>resolveConfirm=r)});t.after(()=>m.scope.stop());await m.open()
  const pending=m.action('cancel-order').props.onTap();await tick()
  if(decision==='hide')m.hooks.hide()
  if(decision==='session-change')m.storage.token='new-session'
  resolveConfirm(decision!=='decline');await pending
  a.equal(m.calls.filter(c=>c[1]?.endsWith?.('/cancel')).length,0)
  a.deepEqual(m.routes,[])
})

test('lost cancellation response is resolved by original-key readback without resubmitting', async t => {
  const m=mount({cancelReplyLost:true});t.after(()=>m.scope.stop());await m.open()
  await m.action('cancel-order').props.onTap();await tick()
  a.equal(m.calls.filter(c=>c[1]?.endsWith?.('/cancel')).length,1)
  a.equal(m.storage['surcharge:v2:checkout:7'].cancelled_verified,true)
  a.deepEqual(m.routes,[['/pages/boss/payment/index',{orderNo:'wechat-order'}]])
})

test('server rejection does not report cancellation or unlock a new order', async t => {
  const m=mount({cancelRejected:true});t.after(()=>m.scope.stop());await m.open()
  await m.action('cancel-order').props.onTap();await tick()
  a.notEqual(m.storage['surcharge:v2:checkout:7'].cancelled_verified,true)
  a.deepEqual(m.routes,[]);a.match(m.text(),/付款结果待确认，请先查询/)
})

test('iOS purchase-disabled guard still permits cancellation of an existing unpaid order', async t => {
  const m=mount({platform:'ios',iosPurchaseEnabled:false});t.after(()=>m.scope.stop());await m.open()
  await m.action('cancel-order').props.onTap();await tick()
  a.equal(m.calls.filter(c=>c[1]?.endsWith?.('/cancel')).length,1)
  a.equal(m.storage['surcharge:v2:checkout:7'].cancelled_verified,true)
  a.equal(m.calls.filter(c=>c[0]==='native'||c[0]==='login').length,0)
})
