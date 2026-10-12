const { test } = require('node:test')
const assert = require('node:assert/strict')
const vue = require('vue')
const { harness, nodes } = require('./commerce-sfc-harness.cjs')

async function roomPage(t) {
  const hooks = { load: [], mounted: [], unmounted: [] }, calls = []
  let order
  const h = harness({
    vue: { ...vue, onMounted: fn => hooks.mounted.push(fn), onUnmounted: fn => hooks.unmounted.push(fn) },
    '@dcloudio/uni-app': { onLoad: fn => hooks.load.push(fn) },
    '@/api/player': {
      getPlayerOrder: async () => order,
      confirmPlayerRoomEntry: async number => {
        calls.push(number)
        order = { ...order, players: [{ ...order.players[0], room_join_status: 'confirmed', can_confirm_room_join: false }] }
        return { message: '已确认入房' }
      }
    },
    '@/api/orderCancellation': {},
    '@/utils/diamonds': { diamondsFrom: value => value, formatDiamonds: String },
    '@/utils/format': { formatDuration: String },
    '@/utils/storage': { getStorage: key => key === 'token' ? 'fixture-room-session' : key === 'player' ? { id: 9 } : null },
    '@/utils/feedback': { confirm: async () => true, getErrorMessage: error => error.message, success() {}, toast() {} },
    '@/utils/nav': { goMain() {}, replace() {}, backToRoute() {} },
    '@/utils/client': { isApprovedPlayer: async () => true }
  })
  const scope = vue.effectScope()
  const page = h.load('src/pages/player/order-detail/index.vue').default
  const render = scope.run(() => page.setup({}, { expose() {} }))
  const draw = () => nodes(render({ $appThemeStyle: '' }, []))
  const hasClass = (node, name) => String(node.props?.class || '').split(/\s+/).includes(name)
  const find = name => draw().find(node => hasClass(node, name))
  t.after(() => { hooks.unmounted.forEach(fn => fn()); scope.stop() })
  function setOrder(status, allowed = true, joinStatus = 'pending') {
    order = { order_no: 'fixture-room-order', status, booked_hours: 1, total_amount_diamonds: 300,
      players: [{ id: 9, name: '测试陪玩', can_confirm_room_join: allowed, room_join_status: joinStatus }] }
  }
  setOrder('待接单')
  hooks.load[0]({ orderNo: order.order_no })
  await hooks.mounted[0]()
  return { calls, find, async show(status, allowed, joinStatus) {
    setOrder(status, allowed, joinStatus)
    await find('tiny-link').props.onTap()
  } }
}

test('actual player SFC shows arrival guidance before payment and gates room confirmation by status and server permission', async t => {
  const page = await roomPage(t)
  for (const status of ['待接单', '待支付']) {
    await page.show(status, true)
    assert.ok(page.find('room-entry-card'), status + ' shows the arrival card')
    assert.ok(page.find('room-entry-tip'), status + ' shows arrival guidance')
    assert.equal(page.find('room-entry-btn'), undefined, status + ' cannot confirm even if a stale server flag allows it')
  }
  for (const status of ['待开打', '进行中']) {
    await page.show(status, false)
    assert.equal(page.find('room-entry-btn'), undefined, status + ' requires server permission')
    await page.show(status, true)
    assert.ok(page.find('room-entry-btn'), status + ' permits confirmation when the server allows it')
  }
  for (const status of ['已完成', '已取消']) {
    await page.show(status, true)
    assert.equal(page.find('room-entry-btn'), undefined, status + ' cannot confirm')
  }
  assert.equal(page.calls.length, 0)
})

test('actual player room-confirm handler blocks stale taps and duplicate confirmed arrival', async t => {
  const page = await roomPage(t)
  await page.show('待开打', true)
  const confirmArrival = page.find('room-entry-btn').props.onTap
  await page.show('待支付', true)
  await confirmArrival()
  assert.equal(page.calls.length, 0, 'an old button handler cannot bypass the payment-stage gate')
  await page.show('待开打', true)
  await confirmArrival()
  assert.deepEqual(page.calls, ['fixture-room-order'])
  assert.ok(page.find('room-entry-success'))
  assert.equal(page.find('room-entry-btn'), undefined)
  await confirmArrival()
  assert.equal(page.calls.length, 1, 'confirmed arrival is not submitted twice')
  for (const status of ['confirmed', 'late_confirmed']) {
    await page.show('进行中', true, status)
    assert.equal(page.find('room-entry-btn'), undefined, status + ' remains ineligible despite a stale allow flag')
    await confirmArrival()
    assert.equal(page.calls.length, 1)
  }
})
