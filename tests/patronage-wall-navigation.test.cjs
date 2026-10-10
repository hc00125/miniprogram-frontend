const test = require('node:test'), assert = require('node:assert/strict'), vue = require('vue')
const { harness, nodes } = require('./commerce-sfc-harness.cjs')
const { setup, row, tick } = require('./announcements-harness.cjs')
const wallRoute = '/pages/client/patronage-wall/index'

test('rankings switches the first default crown tab inline and keeps statistics selections without navigation', async () => {
  const calls = [], requests = [], unmount = []
  const h = harness({ vue: { ...vue, onBeforeUnmount: f => unmount.push(f) }, '@/components/PatronageWallPanel.vue': { default: { name: 'PatronageWallPanel', props: ['embedded'] } }, '@/api/rankings': { getRankings: (board, period) => { requests.push([board, period]); return Promise.resolve({ available: false }) } }, '@/utils/nav': { go: (...args) => calls.push(args) } })
  const scope = vue.effectScope(), C = h.load('src/pages/client/rankings/index.vue').default
  const draw = scope.run(() => C.setup({}, { expose() {} })), tree = () => nodes(draw({}, []))
  const action = id => tree().find(n => n.props?.['data-action'] === id)
  try {
    await h.hooks.show[0]()
    assert.deepEqual(requests, [])
    assert.equal(action('board-patronage').props['aria-pressed'], true)
    assert.equal(tree().find(n => n.type?.name === 'PatronageWallPanel').props.embedded, '')
    assert.equal(action('period-day'), undefined)
    await action('board-boss').props.onTap()
    await action('board-player').props.onTap()
    await action('period-week').props.onTap()
    assert.deepEqual(requests, [['boss', 'day'], ['player', 'day'], ['player', 'week']])
    assert.equal(action('board-player').props['aria-pressed'], true)
    assert.equal(action('period-week').props['aria-pressed'], true)
    await action('board-patronage').props.onTap()
    assert.equal(action('board-patronage').props['aria-pressed'], true)
    assert.equal(tree().find(n => n.type?.name === 'PatronageWallPanel').props.embedded, '')
    assert.equal(action('period-week'), undefined)
    assert.equal(action('open-patronage-wall'), undefined)
    assert.deepEqual(calls, [])
    assert.equal(requests.length, 3)
    h.hooks.hide[0](); await h.hooks.show[0]()
    assert.equal(requests.length, 3)
    assert.equal(action('board-patronage').props['aria-pressed'], true)
    await action('board-player').props.onTap()
    assert.deepEqual(requests.at(-1), ['player', 'week'])
    assert.equal(action('board-player').props['aria-pressed'], true)
    assert.equal(action('period-week').props['aria-pressed'], true)
  } finally { unmount.forEach(f => f()); scope.stop() }
})

test('patronage announcements keeps the standalone crown wall route without changing historical feed kind or pagination', async () => {
  const p = setup('src/pages/client/patronage-announcements/index.vue')
  try {
    p.life.load[0]({ kind: 'all' }); p.life.show[0]()
    assert.equal(p.requests[0].data.kind, 'patronage')
    p.respond(p.requests[0], Array.from({ length: 20 }, (_, i) => row('patronage', i + 1)), 21); await tick()
    p.action('open-patronage-wall').props.onTap()
    assert.deepEqual(p.calls.at(-1), [wallRoute])
    assert.equal(p.requests.length, 1)
    p.action('more').props.onTap()
    assert.deepEqual([p.requests[1].data.kind, p.requests[1].data.page], ['patronage', 2])
    p.respond(p.requests[1], [row('patronage', 21)], 21); await tick()
    assert.equal(p.tree().filter(n => n.props?.['data-action'] === 'record').length, 21)
    p.action('record').props.onTap()
    assert.deepEqual(p.calls.at(-1), ['/pages/player/detail/index', { playerId: 7 }])
    assert.ok(p.requests.every(r => r.method === 'GET' && r.data.kind === 'patronage'))
  } finally { p.close() }
})
