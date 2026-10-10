const test = require('node:test'), assert = require('node:assert/strict')
const { harness } = require('./commerce-sfc-harness.cjs')
const tick = () => new Promise(resolve => setImmediate(resolve))
const player = id => ({ id, name: `陪玩${id}`, type_name: '技术陪', is_online: true })
const crown = id => ({ id, boss_name: `老板${id}`, boss_avatar_url: '', package_name: '周冠', starts_at: '2020-01-01T00:00:00Z', expires_at: '2099-01-01T00:00:00Z', source: 'purchase' })
function setup(players, crowns) {
  const calls = []
  const api = harness({
    '@/api/boss': { getPlayerList: async params => { calls.push(params); return typeof players === 'function' ? players() : players } },
    '@/api/patronage': { getPatronageCrowns: crowns }
  }).load('src/api/patronageWall.ts')
  return { api, calls }
}

test('wall checks the complete unfiltered public list, deduplicates IDs and preserves player order despite out-of-order crowns', async () => {
  const requests = [], progress = []
  const s = setup([player(1), { ...player(2), is_archived: true }, player(3), { ...player(1), name: '重复' }, player(4), player(5)], id => new Promise(resolve => requests.push({ id, resolve })))
  const pending = s.api.loadPatronageWall({ onProgress: (...args) => progress.push(args) })
  await tick()
  assert.deepEqual(s.calls, [{}]); assert.deepEqual(requests.map(r => r.id), [1, 3, 4, 5])
  requests.find(r => r.id === 5).resolve([crown(50), crown(51)])
  requests.find(r => r.id === 3).resolve([])
  requests.find(r => r.id === 4).resolve([crown(40)])
  requests.find(r => r.id === 1).resolve([crown(10)])
  const result = await pending
  assert.deepEqual(result.map(r => [r.player.id, r.crowns.map(c => c.id)]), [[1, [10]], [4, [40]], [5, [50, 51]]])
  assert.equal(result[0].player.name, '陪玩1'); assert.deepEqual(progress, [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]])
})

test('wall never has more than four crown requests active and schedules each public player exactly once', async () => {
  let active = 0, maximum = 0
  const requests = [], queue = []
  const s = setup(Array.from({ length: 11 }, (_, i) => player(i + 1)), id => {
    active++; maximum = Math.max(maximum, active); requests.push(id)
    return new Promise(resolve => queue.push(() => { active--; resolve(id % 2 ? [crown(id)] : []) }))
  })
  const pending = s.api.loadPatronageWall()
  await tick(); assert.equal(queue.length, 4)
  while (queue.length) { queue.shift()(); await tick() }
  const result = await pending
  assert.equal(maximum, 4); assert.equal(active, 0)
  assert.deepEqual(requests, Array.from({ length: 11 }, (_, i) => i + 1))
  assert.deepEqual(result.map(r => r.player.id), [1, 3, 5, 7, 9, 11])
})

test('one failed crown read rejects the whole wall immediately and prevents later scheduling or progress', async () => {
  const requests = [], progress = [], failure = new Error('fixture crown failure')
  const s = setup(Array.from({ length: 12 }, (_, i) => player(i + 1)), id => new Promise((resolve, reject) => requests.push({ id, resolve, reject })))
  const pending = s.api.loadPatronageWall({ onProgress: (...args) => progress.push(args) })
  const rejected = assert.rejects(pending, error => error === failure)
  await tick(); requests[1].reject(failure); await rejected
  requests.filter(r => r.id !== 2).forEach(r => r.resolve([crown(r.id)])); await tick()
  assert.equal(requests.length, 4); assert.deepEqual(progress, [[0, 12]])
})

test('hiding while requests are active cancels results and stops scheduling and progress', async () => {
  let current = true
  const requests = [], progress = []
  const s = setup(Array.from({ length: 9 }, (_, i) => player(i + 1)), id => new Promise(resolve => requests.push({ id, resolve })))
  const pending = s.api.loadPatronageWall({ isCurrent: () => current, onProgress: (...args) => progress.push(args) })
  const rejected = assert.rejects(pending, /已取消/)
  await tick(); current = false
  requests.forEach(r => r.resolve([crown(r.id)])); await rejected; await tick()
  assert.equal(requests.length, 4); assert.deepEqual(progress, [[0, 9]])
})

test('cancellation before the list or while the list is pending starts no crown requests', async () => {
  let crowns = 0, current = false, resolveList
  const before = setup([player(1)], async () => { crowns++; return [] })
  await assert.rejects(before.api.loadPatronageWall({ isCurrent: () => current }), /已取消/)
  assert.deepEqual(before.calls, [])
  current = true
  const during = setup(() => new Promise(resolve => { resolveList = resolve }), async () => { crowns++; return [] })
  const pending = during.api.loadPatronageWall({ isCurrent: () => current })
  const rejected = assert.rejects(pending, /已取消/)
  await tick(); current = false; resolveList([player(1)]); await rejected
  assert.equal(crowns, 0)
})

test('empty public list or only archived players is a complete empty wall without crown requests', async () => {
  for (const players of [[], [{ ...player(1), is_archived: true }]]) {
    const progress = []
    const s = setup(players, () => { throw new Error('must not request archived player') })
    assert.deepEqual(await s.api.loadPatronageWall({ onProgress: (...args) => progress.push(args) }), [])
    assert.deepEqual(progress, [[0, 0]])
  }
})

test('malformed or newly paginated public responses fail before crown requests rather than silently omitting players', async () => {
  for (const players of [null, {}, { count: 2, results: [player(1)] }, [null], [player(0)], [player(-1)], [player('1')], [player(1.5)], [player(Number.MAX_SAFE_INTEGER + 1)]]) {
    const s = setup(players, () => { throw new Error('must not query malformed players') })
    await assert.rejects(s.api.loadPatronageWall(), /陪玩列表响应异常/)
  }
  const failure = new Error('fixture list failure')
  const s = setup(() => { throw failure }, () => { throw new Error('must not query after list failure') })
  await assert.rejects(s.api.loadPatronageWall(), error => error === failure)
})

test('crown response errors are not converted into empty membership', async () => {
  for (const response of [null, {}, { results: [] }]) {
    const s = setup([player(1)], async () => response)
    await assert.rejects(s.api.loadPatronageWall(), /冠名服务响应异常/)
  }
})

test('wall uses the real crown date parser so expired, future and malformed intervals never produce active entries', async () => {
  const h = harness({ '@/api/boss': { getPlayerList: async () => [player(7)] } })
  let request
  h.uni.request = options => { request = options; options.success({ statusCode: 200, data: { results: [
    { ...crown(1), expires_at: '2020-01-02T00:00:00Z' },
    { ...crown(2), starts_at: '2098-01-01T00:00:00Z' },
    { ...crown(3), expires_at: 'bad' }
  ] } }) }
  assert.deepEqual(await h.load('src/api/patronageWall.ts').loadPatronageWall(), [])
  assert.equal(request.method, 'GET'); assert.equal(request.url, 'https://fixture.invalid/api/patronage/crowns/')
  assert.deepEqual(request.data, { player_id: 7 })
})

test('completion rechecks every crown against one shared time and removes grants that expired while other players loaded', async t => {
  const base = Date.parse('2026-10-10T00:00:00Z'), iso = offset => new Date(base + offset).toISOString()
  let now = base, timeReads = 0
  t.mock.method(Date, 'now', () => { timeReads++; return now })
  const requests = []
  const s = setup([player(1), player(2), player(3)], id => new Promise(resolve => requests.push({ id, resolve })))
  const pending = s.api.loadPatronageWall()
  await tick()
  requests[0].resolve([{ ...crown(10), starts_at: iso(-1000), expires_at: iso(10000) }])
  requests[1].resolve([
    { ...crown(20), starts_at: iso(-1000), expires_at: iso(10000) },
    { ...crown(21), starts_at: iso(10000), expires_at: iso(20000) },
    { ...crown(22), starts_at: iso(11000), expires_at: iso(20000) }
  ])
  await tick()
  now = base + 10000
  requests[2].resolve([])
  const result = await pending
  assert.deepEqual(result.map(r => [r.player.id, r.crowns.map(c => c.id)]), [[2, [21]]])
  assert.equal(timeReads, 1)
})
