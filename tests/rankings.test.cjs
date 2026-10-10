const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), vue = require('vue')
const { harness, nodes } = require('./commerce-sfc-harness.cjs')
const tick = () => new Promise(setImmediate)
const row = (name = '公开昵称') => ({ id: 'public-1', rank: 1, name, avatar_url: 'https://images.invalid/avatar.png', value: 1200 })
const response = (board = 'boss', period = 'day', results = [row()]) => ({ available: true, board, period, period_start: '2026-10-05T00:00:00+08:00', period_end: '2026-10-06T00:00:00+08:00', updated_at: '2026-10-05T04:00:00+08:00', results })
function api(config = '') {
  const requests = [], source = fs.readFileSync(path.join(__dirname, '../src/api/rankings.ts'), 'utf8').replace('import.meta', `({ env: { VITE_RANKINGS_API_PATH: ${JSON.stringify(config)} } })`), mod = { exports: {} }
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  new Function('require', 'module', 'exports', 'uni', code)(id => id === '@/utils/diamonds' ? harness().load('src/utils/diamonds.ts') : { BASE_URL: 'https://fixture.invalid/api' }, mod, mod.exports, { request: options => requests.push(options) })
  return { ...mod.exports, requests }
}
test('unconfigured rankings remain unavailable without a network request; external and traversal paths are rejected', async () => {
  const a = api(); assert.deepEqual(await a.getRankings('boss', 'day'), { available: false }); assert.equal(a.requests.length, 0)
  for (const path of ['https://other.invalid/rankings/', '//other.invalid/rankings/', '/rankings/../users', '/rankings/?token=secret']) {
    const b = api(path); await assert.rejects(b.getRankings('boss', 'day')); assert.equal(b.requests.length, 0)
  }
})
test('configured rankings request exactly the selected period; malformed and mismatched records fail instead of producing rankings', async () => {
  const a = api('/rankings/'), pending = a.getRankings('player', 'month')
  assert.equal(a.requests[0].url, 'https://fixture.invalid/api/rankings/'); assert.equal(a.requests[0].method, 'GET'); assert.deepEqual(a.requests[0].data, { board: 'player', period: 'month' }); assert.equal(a.requests[0].header, undefined)
  a.requests[0].success({ statusCode: 200, data: response('player', 'month', []) }); assert.deepEqual((await pending).results, [])
  for (const bad of [response('boss', 'week'), { ...response(), results: [{ ...row(), value: -1 }] }, { ...response(), results: [row(), row()] }, { ...response(), period_end: '2026-10-04T00:00:00+08:00' }]) assert.throws(() => a.parseRankings(bad, 'boss', 'day'))
  assert.equal(a.parseRankings(response('boss', 'day', [{ ...row(), avatar_url: 'javascript:alert(1)' }]), 'boss', 'day').results[0].avatar_url, '')
})
test('boss contributions use the existing one-decimal diamond precision while player counts remain integers', () => {
  const a = api(), parsed = (board, value) => a.parseRankings(response(board, 'day', [{ ...row(), value }]), board, 'day')
  assert.equal(parsed('boss', 1234.5).results[0].value, 1234.5)
  assert.equal(parsed('boss', 0).results[0].value, 0); assert.equal(parsed('player', 0).results[0].value, 0)
  for (const value of [1234.56, Infinity, NaN, Number.MAX_SAFE_INTEGER, '1234.5']) assert.throws(() => parsed('boss', value))
  assert.throws(() => parsed('player', 1234.5))
})
test('rankings enforce competitive ranks 1,1,3 rather than trusting malformed rank numbers', () => {
  const a = api(), rows = [
    { ...row('并列甲'), id: 'a', rank: 1, value: 10 },
    { ...row('并列乙'), id: 'b', rank: 1, value: 10 },
    { ...row('第三'), id: 'c', rank: 3, value: 5 },
  ]
  assert.deepEqual(a.parseRankings(response('boss', 'day', rows), 'boss', 'day').results.map(x => x.rank), [1, 1, 3])
  for (const ranks of [[2, 2, 3], [1, 2, 3], [1, 1, 2], [1, 1, 1]]) {
    assert.throws(() => a.parseRankings(response('boss', 'day', rows.map((r, i) => ({ ...r, rank: ranks[i] }))), 'boss', 'day'))
  }
})
function page() {
  const requests = [], unmount = []
  const h = harness({ vue: { ...vue, onBeforeUnmount: f => unmount.push(f) }, '@/api/rankings': { getRankings: (board, period) => new Promise((resolve, reject) => requests.push({ board, period, resolve, reject })) } })
  const scope = vue.effectScope(), C = h.load('src/pages/client/rankings/index.vue').default, draw = scope.run(() => C.setup({}, { expose() {} }))
  const tree = () => nodes(draw({}, [])), text = () => tree().filter(n => typeof n.children === 'string').map(n => n.children).join('|'), action = id => tree().find(n => n.props?.['data-action'] === id)
  return { requests, h, text, action, close: () => { unmount.forEach(f => f()); scope.stop() } }
}
test('ranking tabs discard stale responses and preserve selected board and period after returning', async () => {
  const p = page()
  try {
    p.h.hooks.show[0](); assert.ok(p.action('loading')); assert.deepEqual([p.requests[0].board, p.requests[0].period], ['boss', 'day']); assert.equal(p.action('board-boss').props['aria-pressed'], true)
    p.action('board-player').props.onTap(); p.action('period-week').props.onTap()
    assert.deepEqual([p.requests[2].board, p.requests[2].period], ['player', 'week'])
    assert.equal(p.action('board-boss').props['aria-pressed'], false); assert.equal(p.action('board-player').props['aria-pressed'], true); assert.equal(p.action('period-week').props['aria-pressed'], true)
    p.requests[2].resolve(response('player', 'week', [row('本周陪玩')])); await tick(); assert.match(p.text(), /本周陪玩/); assert.match(p.text(), /1,200/)
    p.requests[0].resolve(response('boss', 'day', [row('旧老板')])); p.requests[1].resolve(response('player', 'day', [row('旧日榜')])); await tick(); assert.doesNotMatch(p.text(), /旧老板|旧日榜/)
    p.action('period-month').props.onTap(); p.h.hooks.hide[0](); p.requests[3].resolve(response('player', 'month', [row('隐藏后返回')])); await tick(); assert.doesNotMatch(p.text(), /隐藏后返回/)
    p.h.hooks.show[0](); assert.deepEqual([p.requests[4].board, p.requests[4].period], ['player', 'month'])
    p.requests[4].resolve({ available: false }); await tick(); assert.ok(p.action('unavailable')); assert.doesNotMatch(p.text(), /本周陪玩/)
  } finally { p.close() }
})
test('ranking pages keep real row data without explanatory small print on either board', async () => {
  const p = page()
  try {
    p.h.hooks.show[0](); p.requests[0].resolve(response()); await tick()
    assert.match(p.text(), /公开昵称/); assert.match(p.text(), /1,200/); assert.match(p.text(), /钻石/)
    assert.equal(p.action('ranking-rules'), undefined)
    assert.doesNotMatch(p.text(), /消费钻石合计|充值不计入|成功退款|北京时间|同分并列|统计时间|更新于|最多展示/)
    p.action('board-player').props.onTap()
    p.requests[1].resolve(response('player', 'day', [row('真实陪玩')])); await tick()
    assert.match(p.text(), /真实陪玩/); assert.match(p.text(), /1,200/); assert.match(p.text(), /接单量/)
    assert.equal(p.action('ranking-rules'), undefined)
    assert.doesNotMatch(p.text(), /成功接单时间|同人同单|最终成功完成|老板取消|北京时间|同分并列|统计时间|更新于|最多展示/)
  } finally { p.close() }
})

test('ranking error retry, empty results and failed avatar have distinct honest display states', async () => {
  const p = page()
  try {
    p.h.hooks.show[0](); p.requests[0].reject(new Error('offline')); await tick(); assert.ok(p.action('error'))
    p.action('retry').props.onTap(); p.requests[1].resolve(response('boss', 'day', [])); await tick(); assert.ok(p.action('empty'))
    p.action('period-month').props.onTap(); p.requests[2].resolve(response('boss', 'month', [{ ...row(), value: 1234.5 }])); await tick(); assert.ok(p.action('avatar-public-1')); assert.match(p.text(), /1,234\.5/)
    p.action('avatar-public-1').props.onError(); assert.equal(p.action('avatar-public-1'), undefined); assert.match(p.text(), /公开昵称/); assert.match(p.text(), /钻石/)
  } finally { p.close() }
})
