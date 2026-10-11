const { test } = require('node:test'), assert = require('node:assert/strict'), vue = require('vue')
const { harness, nodes } = require('./commerce-sfc-harness.cjs')
const tick = () => new Promise(setImmediate)
const activeWindow = () => ({ starts_at: new Date(Date.now() - 60000).toISOString(), expires_at: new Date(Date.now() + 3600000).toISOString() })
const entry = (id, name) => ({ player: { id, name, avatar_url: `https://fixture.invalid/player-${id}.png`, type_name: '技术陪', is_online: false, can_be_designated: false }, crowns: [{ id: 1, boss_name: `老板${id}`, boss_avatar_url: `https://fixture.invalid/boss-${id}.png`, package_name: '年冠', ...activeWindow() }, { id: 2, boss_name: `另一位老板${id}`, boss_avatar_url: '', package_name: '周冠', ...activeWindow() }] })
function page() {
  const requests = [], calls = [], unmount = [], mounted = []
  const h = harness({ vue: { ...vue, onMounted: f => mounted.push(f), onBeforeUnmount: f => unmount.push(f) }, '@/api/patronageWall': { loadPatronageWall: options => new Promise((resolve, reject) => requests.push({ options, resolve, reject })) }, '@/utils/nav': { go: (...args) => calls.push(args) } })
  const scope = vue.effectScope(), C = h.load('src/components/PatronageWallPanel.vue').default
  const render = scope.run(() => C.setup({ embedded: false }, { expose() {} })), tree = () => nodes(render({}, []))
  const action = id => tree().find(n => n.props?.['data-action'] === id), text = () => tree().filter(n => typeof n.children === 'string').map(n => n.children).join('|')
  return { h, requests, calls, unmount, mounted, scope, tree, action, text, close: () => { unmount.forEach(f => f()); scope.stop() } }
}
test('wall renders each player and all their bosses and both actions navigate with that player ID', async () => {
  const p = page()
  try {
    p.h.hooks.show[0](); assert.ok(p.action('loading'))
    p.requests[0].resolve([entry(7, '陪玩甲'), entry(18, '陪玩乙')]); await tick()
    for (const value of ['陪玩甲', '陪玩乙', '老板7', '另一位老板7', '老板18', '另一位老板18', '年冠', '周冠', '当前 2 位陪玩']) assert.ok(p.text().includes(value))
    assert.equal(p.tree().filter(n => n.props?.['data-action'] === 'wall-card').length, 2)
    p.action('service-18').props.onTap(); p.action('patronage-18').props.onTap()
    assert.deepEqual(p.calls, [['/pages/player/detail/index', { playerId: 18 }], ['/pages/client/patronage/index', { playerId: 18 }]])
    assert.equal(p.action('service-18').props.disabled, undefined, 'viewing services must defer resting/designation restrictions to the original detail page')
  } finally { p.close() }
})
test('loading progress, failure and a completed empty list have distinct honest states', async () => {
  const p = page()
  try {
    p.h.hooks.show[0](); p.requests[0].options.onProgress(3, 142)
    assert.match(p.text(), /3 \/ 142/); assert.equal(p.action('empty'), undefined)
    p.requests[0].reject(Error('one player failed')); await tick()
    assert.ok(p.action('error')); assert.equal(p.action('empty'), undefined); assert.equal(p.tree().some(n => n.props?.['data-action'] === 'wall-card'), false)
    p.action('retry').props.onTap(); assert.ok(p.action('loading'))
    assert.equal(p.requests[1].options.forceRefresh, true)
    p.requests[1].resolve([]); await tick(); assert.ok(p.action('empty')); assert.equal(p.action('error'), undefined)
  } finally { p.close() }
})
test('failed player and boss images retain readable identities and correct service targets', async () => {
  const p = page()
  try {
    p.h.hooks.show[0](); p.requests[0].resolve([entry(7, '陪玩甲')]); await tick()
    p.action('player-avatar-7').props.onError(); p.action('boss-avatar-7-1').props.onError()
    assert.equal(p.action('player-avatar-7'), undefined); assert.equal(p.action('boss-avatar-7-1'), undefined)
    assert.match(p.text(), /陪玩甲/); assert.match(p.text(), /老板7/); assert.match(p.text(), /年冠/)
    assert.ok(p.tree().some(n => n.props?.class?.includes('avatar-fallback') && n.children === '陪'))
    p.action('service-7').props.onTap(); assert.deepEqual(p.calls.at(-1), ['/pages/player/detail/index', { playerId: 7 }])
  } finally { p.close() }
})
for (const hook of ['hide', 'unload', 'unmount']) test(`${hook} clears the wall and rejects progress or data from its hidden generation`, async () => {
  const p = page()
  try {
    p.h.hooks.show[0](); p.requests[0].resolve([entry(7, '旧陪玩')]); await tick()
    p.action('refresh').props.onTap(); const hidden = p.requests[1]
    if (hook === 'unmount') p.unmount[0](); else p.h.hooks[hook][0]()
    assert.equal(hidden.options.isCurrent(), false); hidden.options.onProgress(99, 100)
    hidden.options.onUpdate([entry(7, '隐藏的部分结果')], { completed: 99, total: 100 })
    hidden.resolve([entry(7, '隐藏后返回')]); await tick()
    assert.doesNotMatch(p.text(), /旧陪玩|隐藏后返回|隐藏的部分结果|99 \/ 100/)
    if (hook === 'hide') {
      p.h.hooks.show[0](); const current = p.requests[2]
      current.resolve([entry(18, '当前陪玩')]); await tick()
      assert.match(p.text(), /当前陪玩/); assert.doesNotMatch(p.text(), /隐藏后返回/)
    }
  } finally { p.close() }
})
test('a repeated refresh retires older work and only the newest result can become ready', async () => {
  const p = page()
  try {
    p.h.hooks.show[0](); p.action('refresh').props.onTap()
    assert.equal(p.requests[0].options.isCurrent(), false); assert.equal(p.requests[1].options.isCurrent(), true)
    p.requests[1].resolve([entry(18, '最新陪玩')]); await tick()
    p.requests[0].options.onProgress(100, 100); p.requests[0].reject(Error('old failure')); await tick()
    assert.match(p.text(), /最新陪玩/); assert.equal(p.action('error'), undefined)
  } finally { p.close() }
})

test('real partial crowns are usable while remaining players load and survive an incomplete scan', async () => {
  const p = page()
  try {
    p.h.hooks.show[0]()
    p.requests[0].options.onUpdate([entry(7, '先返回的陪玩')], { completed: 1, total: 142, complete: false, fromCache: false })
    assert.match(p.text(), /先返回的陪玩/); assert.match(p.text(), /已找到 1 位陪玩/)
    assert.ok(p.action('updating')); assert.equal(p.action('loading'), undefined)
    p.action('service-7').props.onTap(); assert.deepEqual(p.calls.at(-1), ['/pages/player/detail/index', { playerId: 7 }])
    p.requests[0].reject(Error('another player failed')); await tick()
    assert.match(p.text(), /先返回的陪玩/); assert.ok(p.action('partial-error')); assert.equal(p.action('empty'), undefined)
    p.action('retry-partial').props.onTap(); assert.equal(p.requests[1].options.forceRefresh, true)
    p.requests[1].resolve([entry(18, '重试成功')]); await tick()
    assert.match(p.text(), /当前 1 位陪玩/); assert.equal(p.action('partial-error'), undefined)
  } finally { p.close() }
})

test('a tab mounted after page show starts loading, while show followed by mount does not duplicate it', () => {
  const mounted = page(), shown = page()
  try {
    mounted.mounted[0](); assert.equal(mounted.requests.length, 1)
    mounted.h.hooks.show[0](); assert.equal(mounted.requests.length, 1)
    shown.h.hooks.show[0](); shown.mounted[0](); assert.equal(shown.requests.length, 1)
    assert.equal(shown.requests[0].options.forceRefresh, false)
  } finally { mounted.close(); shown.close() }
})
