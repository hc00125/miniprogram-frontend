const {test} = require('node:test')
const assert = require('node:assert/strict')
const vue = require('vue')
const {harness} = require('./commerce-sfc-harness.cjs')
const tick = () => new Promise(setImmediate)

function mountPaidPage(status = 'paid', orderStatus = '待接单') {
  const hooks = {load: [], show: [], hide: [], unload: []}, routes = []
  const order = {order_no: 'navigation-order', status: orderStatus, checkout: {
    idempotency_key: 'navigation-key', payment_status: status, attempt_id: status === 'created' ? null : 'fixed-attempt',
    base_amount_yuan: '15.00', surcharge_amount_yuan: '10.00', total_amount_yuan: '25.00',
    total_amount_diamonds: '250.0', surcharge: {required_players: 1}, refund: null,
  }}
  const intent = {state: () => ({key: 'navigation-key', submitted: status !== 'created', status, required_players: 1}),
    refresh: async () => order, close() {}}
  const h = harness({
    '@dcloudio/uni-app': {onLoad: f => hooks.load.push(f), onShow: f => hooks.show.push(f), onHide: f => hooks.hide.push(f), onUnload: f => hooks.unload.push(f)},
    '@/utils/surchargeCheckoutIntent': {makeSurchargeIntent: () => intent},
    '@/utils/commerceRelease': {commerceRelease: {orderSurchargeQuoteSupported: true}},
    '@/utils/client': {getClientProfile: () => ({id: 1})},
    '@/utils/storage': {getStorage: () => 'session', SESSION_CHANGED_EVENT: 'changed'},
    '@/utils/sessionExpiry': {SESSION_EXPIRED_EVENT: 'expired'},
    '@/utils/feedback': {confirm: async () => true, getErrorMessage: e => e.message},
    '@/utils/nav': {replace: (path, params) => routes.push([path, params])},
  })
  const scope = vue.effectScope()
  scope.run(() => h.load('src/pages/boss/surcharge-payment/index.vue').default.setup({}, {expose() {}}))
  hooks.load.forEach(f => f({key: 'navigation-key'}))
  return {hooks, routes, scope, order}
}

test('verified paid combined order navigates once to the original waiting page', async () => {
  const page = mountPaidPage()
  try {
    page.hooks.show.forEach(f => f()); await tick()
    assert.deepEqual(page.routes, [['/pages/boss/waiting/index', {orderNo: 'navigation-order'}]])
  } finally {page.scope.stop()}
})

test('unknown or cancelled combined order never navigates as paid', async () => {
  for (const [status, orderStatus] of [['unknown', '待支付'], ['paid', '已取消']]) {
    const page = mountPaidPage(status, orderStatus)
    try {page.hooks.show.forEach(f => f()); await tick(); assert.deepEqual(page.routes, [])}
    finally {page.scope.stop()}
  }
})

test('hidden-page late paid query never navigates', async () => {
  const page = mountPaidPage()
  try {
    page.hooks.show.forEach(f => f()); page.hooks.hide.forEach(f => f()); await tick()
    assert.deepEqual(page.routes, [])
  } finally {page.scope.stop()}
})

test('paid order details do not bounce back to the combined payment page', async () => {
  const fs = require('node:fs'), path = require('node:path')
  const source = fs.readFileSync(path.join(__dirname, '../src/pages/boss/payment/index.vue'), 'utf8')
  const body = source.slice(source.indexOf('async function fetchOrder()'), source.indexOf('async function refreshPaymentStatus('))
  const routes = [], orderInfo = vue.ref(null)
  const bindings = {orderNo: vue.ref('paid-order'), loading: vue.ref(false), loadError: vue.ref(''), orderInfo,
    getOrder: async () => ({order_no: 'paid-order', paid: true, status: '已完成', checkout: {
      contract_version: 'surcharge-v2', payment_status: 'paid', surcharge: {amount_diamonds: 100}}}),
    replace: (...args) => routes.push(args), syncPaymentClock() {}, isPaid: vue.ref(true), payError: vue.ref(null),
    clearPendingPaymentState() {}, shouldPollPaymentStatus: vue.ref(false), scheduleConfirmationRefresh() {},
    fetchRatingStatus: async () => {}, getErrorMessage: e => e.message}
  const run = new Function(...Object.keys(bindings), `${body}; return fetchOrder()`)
  assert.equal(await run(...Object.values(bindings)), true)
  assert.deepEqual(routes, [])
})
