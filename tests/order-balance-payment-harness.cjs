const vue = require('vue')
const { harness, nodes } = require('./commerce-sfc-harness.cjs')
const tick = () => new Promise(setImmediate)
const unpaid = () => ({ order_no: 'original-order', paid: false, status: '待支付', payment_phase: 'open', can_start_payment: true, payment_remaining_seconds: 600, total_amount_diamonds: 100 })
const paid = () => ({ status: 'paid', order_no: 'original-order', payment_no: 'payment-1', balance_diamonds: 50 })
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b }); return { promise, resolve, reject } }
async function setup(t, options = {}) {
  const life = { load: [], show: [], unload: [] }
  const orderNo = options.orderNo || 'original-order'
  const calls = { post: [], login: [], confirm: [], toast: [], success: [], getOrder: [] }
  const wallet = {}
  let f
  const h = harness({
    '@dcloudio/uni-app': { onLoad: fn => life.load.push(fn), onShow: fn => life.show.push(fn), onUnload: fn => life.unload.push(fn) },
    '@/components/orders/OrderSurchargeHost.vue': { default: { render() { return null } } },
    '@/utils/purchaseAvailability': { isIOSDevice: () => true, getClientPlatform: () => 'ios' },
    '@/utils/request': { default: {
      post: async (url, data) => {
        calls.post.push({ url, data })
        return options.post ? options.post(calls.post.length, data) : paid()
      },
      get: async () => ({ balance_diamonds: 150 })
    } },
    '@/api/boss': { getOrder: async () => { calls.getOrder.push(orderNo); return options.getOrder ? options.getOrder(calls.getOrder.length) : { ...unpaid(), order_no: orderNo } }, getOrderRatings: async () => ({ results: [] }) },
    '@/api/wallet': wallet,
    '@/api/pay': {},
    '@/utils/virtual-payment': {},
    '@/utils/nav': {},
    '@/utils/feedback': {
      getErrorMessage: (error, fallback) => error?.detail || error?.errMsg || error?.message || fallback,
      confirm: async (...args) => { calls.confirm.push(args); return options.confirm ? options.confirm() : true },
      toast: text => calls.toast.push({ text, button: f?.payButton()?.children, disabled: f?.payButton()?.props.disabled }),
      success: text => calls.success.push(text)
    }
  })
  h.uni.login = args => {
    const code = `fresh-code-${calls.login.length + 1}`
    calls.login.push(code)
    if (options.login) options.login(args, code)
    else args.success({ code })
  }
  h.uni.setStorageSync = (key, value) => { h.storage[key] = structuredClone(value) }
  h.uni.removeStorageSync = key => { delete h.storage[key] }
  if (options.storage) Object.assign(h.storage, structuredClone(options.storage))
  Object.assign(wallet, h.load('src/api/wallet.ts'))
  const component = h.load('src/pages/boss/payment/index.vue').default
  const scope = vue.effectScope()
  const draw = scope.run(() => component.setup({}, { expose() {} }))
  const tree = () => nodes(draw({}, []))
  const text = () => tree().filter(n => typeof n.children === 'string').map(n => n.children).join('|')
  const payButton = () => tree().find(n => n.type === 'button' && /使用 .*支付|正在确认钻石支付|正在扣除可用钻石/.test(n.children))
  f = { h, calls, tree, text, payButton, life, tap: () => payButton()?.props.onTap(), refresh: () => life.show[0]() }
  t.after(() => { life.unload.forEach(fn => fn()); scope.stop() })
  life.load.forEach(fn => fn({ orderNo }))
  await f.refresh()
  return f
}
module.exports = { setup, tick, unpaid, paid, deferred }
