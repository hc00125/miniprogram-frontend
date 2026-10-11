const { test } = require('node:test')
const assert = require('node:assert/strict')
const vue = require('vue')
const { harness, nodes } = require('./commerce-sfc-harness.cjs')
const tick = async () => { await new Promise(setImmediate); await vue.nextTick() }
const epoch = Date.parse('2026-10-11T04:00:00Z')
const crown = (id, expires) => ({ id, boss_name: `老板${id}`, boss_avatar_url: `https://fixture.invalid/boss-${id}.png`, package_name: '日冠', source: 'purchase', starts_at: new Date(epoch - 1000).toISOString(), expires_at: new Date(epoch + expires).toISOString() })
const entry = (id, crowns) => ({ player: { id, name: `陪玩${id}`, avatar_url: `https://fixture.invalid/player-${id}.png`, type_name: '技术陪' }, crowns })

// Fake only the local wall clock/timers; compile and mount the actual SFC on Vue's
// renderer so real onMounted/onBeforeUnmount and render effects run normally.
function clock(t) {
  const real = { now: Date.now, setTimeout: global.setTimeout, clearTimeout: global.clearTimeout }
  let now = epoch, next = 0
  const timers = new Map(), delays = []
  Date.now = () => now
  global.setTimeout = (callback, delay) => { const id = ++next; delays.push(delay); timers.set(id, { callback, at: now + delay }); return id }
  global.clearTimeout = id => timers.delete(id)
  t.after(() => { Date.now = real.now; global.setTimeout = real.setTimeout; global.clearTimeout = real.clearTimeout })
  return {
    timers, delays,
    jump: ms => { now += ms },
    async advance(ms) {
      const target = now + ms
      for (let runs = 0; ; runs++) {
        const due = [...timers].filter(([, value]) => value.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
        if (!due) break
        assert.ok(runs < 100, 'local expiry must not spin or poll every second')
        now = due[1].at; timers.delete(due[0]); due[1].callback(); await tick()
      }
      now = target; await tick()
    }
  }
}
function mount(t, overrides) {
  const h = harness({ vue, '@/utils/nav': { go() {} }, ...overrides })
  // Minimal in-memory host, not DOM/uni mocks of component lifecycle.
  const host = () => ({ children: [], parent: null })
  const renderer = vue.createRenderer({
    createElement: host, createText: host, createComment: host,
    setText() {}, setElementText(node) { node.children = [] }, patchProp() {},
    insert(node, parent, anchor) {
      if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
      const index = anchor ? parent.children.indexOf(anchor) : -1
      parent.children.splice(index < 0 ? parent.children.length : index, 0, node); node.parent = parent
    },
    remove(node) { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1); node.parent = null },
    parentNode: node => node.parent,
    nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] || null
  })
  const app = renderer.createApp(h.load('src/components/PatronageWallPanel.vue').default, { embedded: true })
  app.config.globalProperties.$appThemeStyle = ''
  const warnings = []; app.config.warnHandler = warning => warnings.push(warning)
  app.mount(host())
  let closed = false
  const close = () => { if (!closed) { app.unmount(); closed = true } }
  t.after(() => { close(); assert.deepEqual(warnings, [], 'must mount without Vue lifecycle/template warnings') })
  const tree = () => nodes(app._instance.subTree)
  return { h, close, tree, text: () => tree().filter(node => typeof node.children === 'string').map(node => node.children).join('|'), action: id => tree().find(node => node.props?.['data-action'] === id) }
}
function realWall(t, summary) {
  let reads = 0
  const api = harness({ '@/api/boss': {}, '@/api/patronage': { getPatronageWallSummary: async () => { reads++; return summary } }, '@/utils/sessionExpiry': { getClientSessionGeneration: () => 0 } })
  const loader = api.load('src/api/patronageWall.ts')
  return { ...mount(t, { '@/api/patronageWall': loader }), reads: () => reads, loader }
}

test('mounted real wall removes its last expired boss, crown, player card and count without another API read', async t => {
  const time = clock(t), p = realWall(t, [entry(7, [crown(70, 1000)])])
  await tick()
  assert.match(p.text(), /当前 1 位陪玩/); assert.match(p.text(), /老板70/)
  await time.advance(999)
  assert.match(p.text(), /老板70/, 'right remains visible until the exact boundary')
  await time.advance(1)
  assert.doesNotMatch(p.text(), /老板70|陪玩7|当前 1 位陪玩/)
  assert.ok(p.action('empty')); assert.equal(p.action('wall-card'), undefined)
  assert.equal(p.tree().filter(node => node.props?.class === 'avatar-crown').length, 0)
  assert.equal(p.reads(), 1, 'expiry is local, never network polling')
  assert.equal(time.timers.size, 0, 'empty walls do not keep an expiry timer')
  await time.advance(300000); assert.equal(p.reads(), 1)
})

for (const lifecycle of ['hide', 'unload', 'unmount']) test(`${lifecycle} cancels the armed local expiry task`, async t => {
  const time = clock(t), p = realWall(t, [entry(7, [crown(70, 1000)])])
  await tick(); assert.equal(time.timers.size, 1)
  if (lifecycle === 'unmount') p.close(); else p.h.hooks[lifecycle][0]()
  assert.equal(time.timers.size, 0, 'hidden/unmounted panels must release the pending timer immediately')
  await time.advance(300000); assert.equal(p.reads(), 1)
})

test('refresh cancels the old expiry immediately and a regrant uses only its new expiry', async t => {
  const time = clock(t), summary = [entry(7, [crown(70, 1000)])], p = realWall(t, summary)
  await tick(); assert.equal(time.timers.size, 1)
  summary.splice(0, 1, entry(7, [crown(70, 5000)]))
  const refresh = p.action('refresh').props.onTap()
  assert.equal(time.timers.size, 0, 'refresh must retire the old expiry before its request settles')
  await refresh; await tick()
  assert.equal(time.timers.size, 1); assert.equal(p.reads(), 2)
  await time.advance(1000); assert.match(p.text(), /老板70/)
  await time.advance(4000); assert.ok(p.action('empty')); assert.equal(time.timers.size, 0)
  assert.equal(p.reads(), 2)
})

test('long-lived rights rearm within the signed 32-bit timer limit instead of overflowing into a hot loop', async t => {
  const time = clock(t), maxDelay = 2147483647, p = realWall(t, [entry(7, [crown(70, maxDelay + 5000)])])
  await tick()
  assert.equal(time.delays.at(-1), maxDelay, 'timer delay must not overflow on year/long-term crowns')
  const deliveryArms = time.delays.length
  assert.equal(time.timers.size, 1, 'loader notifications and final delivery share one armed timer')
  await time.advance(maxDelay)
  assert.match(p.text(), /老板70/); assert.equal(time.delays.at(-1), 5000); assert.equal(time.timers.size, 1)
  await time.advance(4999); assert.match(p.text(), /老板70/)
  await time.advance(1); assert.ok(p.action('empty')); assert.equal(time.timers.size, 0)
  assert.equal(p.reads(), 1); assert.equal(time.delays.length - deliveryArms, 1, 'only one long-delay rearm is needed, without polling')
})

test('different bosses expire independently and the player count drops only after each last crown', async t => {
  const time = clock(t), p = realWall(t, [entry(7, [crown(70, 1000), crown(71, 2000)]), entry(8, [crown(80, 3000)])])
  await tick(); assert.match(p.text(), /当前 2 位陪玩/)
  await time.advance(1000)
  assert.doesNotMatch(p.text(), /老板70/); assert.match(p.text(), /老板71/); assert.match(p.text(), /老板80/)
  assert.match(p.text(), /当前 2 位陪玩/); assert.ok(p.action('player-avatar-7')); assert.ok(p.action('boss-avatar-7-71'))
  await time.advance(1000)
  assert.doesNotMatch(p.text(), /陪玩7|老板71/); assert.match(p.text(), /当前 1 位陪玩/); assert.ok(p.action('service-8'))
  await time.advance(1000); assert.ok(p.action('empty')); assert.equal(p.reads(), 1); assert.equal(time.timers.size, 0)
})

test('hide then show refilters still-cached rights against wall time and resumes the remaining expiry', async t => {
  const time = clock(t), p = realWall(t, [entry(7, [crown(70, 1000), crown(71, 2000)])])
  await tick(); p.h.hooks.hide[0](); assert.equal(time.timers.size, 0)
  time.jump(1000) // Background timers may be suspended, not reliably ticked.
  await p.h.hooks.show[0](); await tick()
  assert.doesNotMatch(p.text(), /老板70/); assert.match(p.text(), /老板71/); assert.equal(p.reads(), 1, 'valid cache is preserved')
  assert.equal(time.timers.size, 1)
  await time.advance(1000); assert.ok(p.action('empty')); assert.equal(time.timers.size, 0)
})

test('show after a long background gap rereads once and does not render expired rights', async t => {
  const time = clock(t), p = realWall(t, [entry(7, [crown(70, 1000)])])
  await tick(); p.h.hooks.hide[0](); time.jump(300000)
  await p.h.hooks.show[0](); await tick()
  assert.ok(p.action('empty')); assert.doesNotMatch(p.text(), /老板70|陪玩7/)
  assert.equal(p.reads(), 2); assert.equal(time.timers.size, 0)
})

function controlledWall(t) {
  const requests = []
  return { ...mount(t, { '@/api/patronageWall': { loadPatronageWall: options => new Promise((resolve, reject) => requests.push({ options, resolve, reject })) } }), requests }
}
for (const lifecycle of ['hide', 'unload', 'unmount']) test(`late loader progress and completion after ${lifecycle} cannot resurrect the wall or its timer`, async t => {
  const time = clock(t), p = controlledWall(t), stale = p.requests[0]
  if (lifecycle === 'unmount') p.close(); else p.h.hooks[lifecycle][0]()
  stale.options.onUpdate([entry(7, [crown(70, 1000)])], { completed: 1, total: 2 })
  stale.resolve([entry(7, [crown(70, 1000)])]); await tick()
  assert.equal(time.timers.size, 0)
  if (lifecycle !== 'unmount') assert.doesNotMatch(p.text(), /老板70|陪玩7/)
})

test('partial updates replace their expiry, survive scan failure honestly, and expire without refetch', async t => {
  const time = clock(t), p = controlledWall(t), request = p.requests[0]
  request.options.onUpdate([entry(7, [crown(70, 1000)])], { completed: 1, total: 2 }); await tick()
  assert.match(p.text(), /已找到 1 位陪玩/); assert.equal(time.timers.size, 1)
  request.options.onUpdate([entry(8, [crown(80, 3000)])], { completed: 1, total: 2 }); await tick()
  assert.doesNotMatch(p.text(), /老板70/); assert.equal(time.timers.size, 1)
  request.reject(Error('remaining player unavailable')); await tick()
  assert.ok(p.action('partial-error'))
  await time.advance(1000); assert.match(p.text(), /老板80/)
  await time.advance(2000); assert.doesNotMatch(p.text(), /老板80|陪玩8/); assert.ok(p.action('error')); assert.equal(p.action('empty'), undefined)
  assert.equal(p.requests.length, 1); assert.equal(time.timers.size, 0)
})

test('expired, malformed, and future-start rights from a late delivery never render or arm a timer', async t => {
  const time = clock(t), p = controlledWall(t), invalid = [
    crown(70, 0), { ...crown(71, 1000), expires_at: 'not-a-date' },
    { ...crown(72, 1000), starts_at: 'not-a-date' }, { ...crown(73, 1000), starts_at: new Date(epoch + 500).toISOString() }
  ]
  p.requests[0].resolve([entry(7, invalid)]); await tick()
  assert.ok(p.action('empty')); assert.equal(time.timers.size, 0); assert.doesNotMatch(p.text(), /老板7|陪玩7/)
})

test('a delivered snapshot is rechecked if time crossed expiry while the request was pending', async t => {
  const time = clock(t), p = controlledWall(t)
  time.jump(1000); p.requests[0].resolve([entry(7, [crown(70, 1000)])]); await tick()
  assert.ok(p.action('empty')); assert.equal(time.timers.size, 0)
})
