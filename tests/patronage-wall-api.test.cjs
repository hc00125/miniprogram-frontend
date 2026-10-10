const test = require('node:test'), assert = require('node:assert/strict')
const { harness } = require('./commerce-sfc-harness.cjs')
const tick = () => new Promise(resolve => setImmediate(resolve))
const player = id => ({ id, name: `陪玩${id}`, type_name: '技术陪', is_online: true })
const crown = id => ({ id, boss_name: `老板${id}`, boss_avatar_url: '', package_name: '周冠', starts_at: '2020-01-01T00:00:00Z', expires_at: '2099-01-01T00:00:00Z', source: 'purchase' })
function setup(players, crowns, summary = async () => null) {
  const calls = []
  let generation = '0'
  const h = harness({
    '@/api/boss': { getPlayerList: async params => { calls.push(params); return typeof players === 'function' ? players() : players } },
    '@/api/patronage': { getPatronageCrowns: crowns, getPatronageWallSummary: summary },
    '@/utils/sessionExpiry': { getClientSessionGeneration: () => generation }
  })
  const api = h.load('src/api/patronageWall.ts')
  return { api, calls, storage: h.storage, setGeneration: value => { generation = String(value) } }
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

test('wall never has more than eight crown requests active and schedules each public player exactly once', async () => {
  let active = 0, maximum = 0
  const requests = [], queue = []
  const s = setup(Array.from({ length: 11 }, (_, i) => player(i + 1)), id => {
    active++; maximum = Math.max(maximum, active); requests.push(id)
    return new Promise(resolve => queue.push(() => { active--; resolve(id % 2 ? [crown(id)] : []) }))
  })
  const pending = s.api.loadPatronageWall()
  await tick(); assert.equal(queue.length, 8)
  while (queue.length) { queue.shift()(); await tick() }
  const result = await pending
  assert.equal(maximum, 8); assert.equal(active, 0)
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
  assert.equal(requests.length, 8); assert.deepEqual(progress, [[0, 12]])
})

test('hiding while requests are active cancels results and stops scheduling and progress', async () => {
  let current = true
  const requests = [], progress = []
  const s = setup(Array.from({ length: 9 }, (_, i) => player(i + 1)), id => new Promise(resolve => requests.push({ id, resolve })))
  const pending = s.api.loadPatronageWall({ isCurrent: () => current, onProgress: (...args) => progress.push(args) })
  const rejected = assert.rejects(pending, /已取消/)
  await tick(); current = false
  requests.forEach(r => r.resolve([crown(r.id)])); await rejected; await tick()
  assert.equal(requests.length, 8); assert.deepEqual(progress, [[0, 9]])
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
  h.uni.request = options => {
    if (options.url.endsWith('/wall/')) { options.success({ statusCode: 404, data: { detail: 'not deployed' } }); return }
    request = options; options.success({ statusCode: 200, data: { results: [
    { ...crown(1), expires_at: '2020-01-02T00:00:00Z' },
    { ...crown(2), starts_at: '2098-01-01T00:00:00Z' },
    { ...crown(3), expires_at: 'bad' }
  ] } }) }
  assert.deepEqual(await h.load('src/api/patronageWall.ts').loadPatronageWall(), [])
  assert.equal(request.method, 'GET'); assert.equal(request.url, 'https://fixture.invalid/api/patronage/crowns/')
  assert.deepEqual(request.data, { player_id: 7 })
})

test('deployed summary completes the wall without a player list or per-player reads, then reuses its complete cache', async () => {
  let reads = 0
  const updates = [], result = [{ player: { id: 7, name: '陪玩甲', avatar_url: '', type_name: '技术陪' }, crowns: [crown(7)] }]
  const s = setup(() => { throw Error('must not read public list') }, () => { throw Error('must not scan crowns') }, async () => { reads++; return result })
  assert.deepEqual(await s.api.loadPatronageWall({ onUpdate: (entries, meta) => updates.push({ entries, meta }) }), result)
  assert.equal(reads, 1); assert.equal(s.calls.length, 0); assert.equal(updates.at(-1).meta.complete, true)
  result[0].player.name = '外部修改'
  assert.equal((await s.api.loadPatronageWall())[0].player.name, '陪玩甲'); assert.equal(reads, 1)
  await s.api.loadPatronageWall({ forceRefresh: true }); assert.equal(reads, 2)
})

test('an empty summary is complete while summary errors never trigger an expensive fallback scan', async () => {
  const empty = setup(() => { throw Error('unexpected list') }, () => { throw Error('unexpected crowns') }, async () => [])
  assert.deepEqual(await empty.api.loadPatronageWall(), []); assert.equal(empty.calls.length, 0)
  for (const reason of [Error('malformed summary'), Error('503'), Error('network timeout')]) {
    const s = setup([player(1)], async () => [crown(1)], async () => { throw reason })
    await assert.rejects(s.api.loadPatronageWall(), e => e === reason); assert.equal(s.calls.length, 0)
  }
})

test('two entrances share one pending summary and a hidden subscriber cannot invalidate the other entrance', async () => {
  let reads = 0, finish, firstVisible = true
  const s = setup([], async () => [], () => { reads++; return new Promise(resolve => { finish = resolve }) })
  const first = s.api.loadPatronageWall({ isCurrent: () => firstVisible })
  const cancelled = assert.rejects(first, /已取消/)
  const second = s.api.loadPatronageWall()
  firstVisible = false
  finish([{ player: player(7), crowns: [crown(7)] }])
  await cancelled; assert.equal((await second)[0].player.id, 7); assert.equal(reads, 1)
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

test('wall works in an isolated older runtime without Array.prototype.flatMap', async () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript')
  const hostFlatMap = Array.prototype.flatMap
  const source = fs.readFileSync(path.join(__dirname, '../src/api/patronageWall.ts'), 'utf8')
  const mod = { exports: {} }, requests = []
  const imports = {
    '@/api/boss': { getPlayerList: async () => [player(1), player(2), player(3)] },
    '@/api/patronage': { getPatronageWallSummary: async () => null, getPatronageCrowns: async id => {
      requests.push(id)
      return id === 2 ? [] : [crown(id), { ...crown(id + 10), expires_at: '2020-01-02T00:00:00Z' }]
    } }
  }
  imports['@/utils/sessionExpiry'] = { getClientSessionGeneration: () => '0' }
  const context = vm.createContext({ module: mod, exports: mod.exports, require: id => imports[id], uni: { getStorageSync: () => '' } })
  vm.runInContext('Array.prototype.flatMap = undefined', context)
  assert.equal(vm.runInContext('typeof Array.prototype.flatMap', context), 'undefined')
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context)
  const result = await mod.exports.loadPatronageWall()
  assert.deepEqual(Array.from(result, entry => [entry.player.id, Array.from(entry.crowns, c => c.id)]), [[1, [1]], [3, [3]]])
  assert.deepEqual(requests, [1, 2, 3])
  assert.equal(Array.prototype.flatMap, hostFlatMap)
})

test('partial snapshots publish real entries immediately while later players remain pending; only a completed scan is marked complete', async () => {
  const requests = [], updates = []
  const s = setup(Array.from({ length: 9 }, (_, i) => player(i + 1)), id => new Promise(resolve => requests.push({ id, resolve })))
  let resolved = false
  const pending = s.api.loadPatronageWall({ onUpdate: (entries, meta) => updates.push({ entries, meta }) }).then(result => { resolved = true; return result })
  await tick()
  assert.deepEqual(updates, [{ entries: [], meta: { completed: 0, total: 9, complete: false, fromCache: false } }])
  requests[7].resolve([crown(80)])
  await tick()
  assert.equal(resolved, false)
  assert.deepEqual(updates.at(-1).entries.map(e => e.player.id), [8])
  assert.deepEqual(updates.at(-1).meta, { completed: 1, total: 9, complete: false, fromCache: false })
  assert.equal(requests.length, 9)
  requests.filter(r => r.id !== 8).forEach(r => r.resolve(r.id === 2 ? [crown(20)] : []))
  const result = await pending
  assert.deepEqual(result.map(e => e.player.id), [2, 8])
  assert.deepEqual(updates.at(-1).meta, { completed: 9, total: 9, complete: true, fromCache: false })
  assert.equal(updates.filter(u => u.meta.complete).length, 1)
})

test('partial failure preserves the last published data, never marks it complete, and does not seed a cache', async () => {
  const requests = [], updates = [], failure = new Error('fixture incomplete scan')
  let retry = false
  const s = setup(Array.from({ length: 10 }, (_, i) => player(i + 1)), id => retry ? Promise.resolve([crown(id)]) : new Promise((resolve, reject) => requests.push({ id, resolve, reject })))
  const pending = s.api.loadPatronageWall({ onUpdate: (entries, meta) => updates.push({ entries, meta }) })
  const rejected = assert.rejects(pending, error => error === failure)
  await tick(); requests[0].resolve([crown(10)]); await tick()
  assert.deepEqual(updates.at(-1).entries.map(e => e.player.id), [1])
  requests[1].reject(failure); await rejected
  const count = updates.length
  requests.filter(r => r.id !== 2).forEach(r => r.resolve([crown(r.id)])); await tick()
  assert.equal(updates.length, count); assert.equal(updates.some(u => u.meta.complete), false)
  assert.equal(requests.length, 9)
  retry = true
  assert.equal((await s.api.loadPatronageWall()).length, 10)
  assert.equal(s.calls.length, 2)
})

test('a complete successful scan is reused for 60 seconds, then refetched; forceRefresh also bypasses the cache', async t => {
  let now = Date.parse('2026-10-10T00:00:00Z'), requests = 0
  t.mock.method(Date, 'now', () => now)
  const s = setup([player(1)], async () => { requests++; return [crown(requests)] })
  const first = await s.api.loadPatronageWall()
  now += 59_999
  const updates = [], progress = []
  assert.deepEqual(await s.api.loadPatronageWall({ onUpdate: (entries, meta) => updates.push({ entries, meta }), onProgress: (...args) => progress.push(args) }), first)
  assert.equal(requests, 1); assert.equal(s.calls.length, 1)
  assert.deepEqual(progress, [[1, 1]])
  assert.deepEqual(updates[0].meta, { completed: 1, total: 1, complete: true, fromCache: true })
  now++
  assert.equal((await s.api.loadPatronageWall())[0].crowns[0].id, 2)
  assert.equal(requests, 2); assert.equal(s.calls.length, 2)
  assert.equal((await s.api.loadPatronageWall({ forceRefresh: true }))[0].crowns[0].id, 3)
  assert.equal(requests, 3); assert.equal(s.calls.length, 3)
})

test('cache reads recheck active intervals and remove empty players at the exact expiry without doing another scan', async t => {
  const base = Date.parse('2026-10-10T00:00:00Z')
  let now = base, requests = 0
  t.mock.method(Date, 'now', () => now)
  const expiring = { ...crown(10), starts_at: new Date(base - 1000).toISOString(), expires_at: new Date(base + 10000).toISOString() }
  const s = setup([player(1), player(2)], async id => { requests++; return id === 1 ? [expiring] : [crown(20), expiring] })
  assert.equal((await s.api.loadPatronageWall()).length, 2)
  now += 10000
  const updates = []
  const result = await s.api.loadPatronageWall({ onUpdate: (entries, meta) => updates.push({ entries, meta }) })
  assert.deepEqual(result.map(e => [e.player.id, e.crowns.map(c => c.id)]), [[2, [20]]])
  assert.equal(requests, 2); assert.equal(s.calls.length, 1)
  assert.equal(updates[0].meta.fromCache, true)
  now += 1
  assert.deepEqual((await s.api.loadPatronageWall()).map(e => e.player.id), [2])
})

test('later partial snapshots also remove crowns expiring during the scan', async t => {
  const base = Date.parse('2026-10-10T00:00:00Z')
  let now = base
  t.mock.method(Date, 'now', () => now)
  const requests = [], updates = []
  const s = setup([player(1), player(2), player(3)], id => new Promise(resolve => requests.push({ id, resolve })))
  const pending = s.api.loadPatronageWall({ onUpdate: (entries, meta) => updates.push({ entries, meta }) })
  await tick()
  requests[0].resolve([{ ...crown(10), starts_at: new Date(base - 1000).toISOString(), expires_at: new Date(base + 10000).toISOString() }])
  await tick(); assert.deepEqual(updates.at(-1).entries.map(e => e.player.id), [1])
  now += 10000
  requests[1].resolve([crown(20)]); await tick()
  assert.deepEqual(updates.at(-1).entries.map(e => e.player.id), [2])
  assert.equal(updates.at(-1).meta.complete, false)
  requests[2].resolve([])
  assert.deepEqual((await pending).map(e => e.player.id), [2])
})

test('callback, returned and cached data are deeply isolated from external mutations', async () => {
  const source = { ...player(1), player_type: { id: 7, name: '技术陪', price_extra: 0 }, extra: { tags: ['真实'] } }
  const originalCrown = crown(10)
  const s = setup([source], async () => [originalCrown])
  function mutate(entries) {
    if (!entries.length) return
    entries[0].player.name = '被外部修改'
    entries[0].player.player_type.name = '被外部修改'
    entries[0].player.extra.tags.push('被外部修改')
    entries[0].crowns[0].boss_name = '被外部修改'
    entries[0].crowns.push(crown(99))
  }
  const first = await s.api.loadPatronageWall({ onUpdate: mutate })
  assert.equal(first[0].player.name, '陪玩1'); assert.equal(first[0].crowns[0].boss_name, '老板10')
  mutate(first)
  source.player_type.name = '接口对象被修改'; source.extra.tags.push('接口对象被修改'); originalCrown.boss_name = '接口对象被修改'
  const cached = await s.api.loadPatronageWall({ onUpdate: mutate })
  assert.equal(cached[0].player.name, '陪玩1'); assert.equal(cached[0].player.player_type.name, '技术陪')
  assert.deepEqual(cached[0].player.extra.tags, ['真实']); assert.equal(cached[0].crowns[0].boss_name, '老板10')
  assert.equal(cached[0].crowns.length, 1)
  mutate(cached)
  assert.equal((await s.api.loadPatronageWall())[0].crowns.length, 1)
  assert.equal(s.calls.length, 1)
})

test('token changes, same-token login generation and explicit purchase invalidation each prevent stale cache reuse', async () => {
  let requests = 0
  const s = setup([player(1)], async () => [crown(++requests)])
  assert.equal((await s.api.loadPatronageWall())[0].crowns[0].id, 1)
  s.storage.token = 'fixture-session-b'
  assert.equal((await s.api.loadPatronageWall())[0].crowns[0].id, 2)
  s.setGeneration(1)
  assert.equal((await s.api.loadPatronageWall())[0].crowns[0].id, 3)
  s.api.invalidatePatronageWallCache()
  assert.equal((await s.api.loadPatronageWall())[0].crowns[0].id, 4)
  assert.equal(s.calls.length, 4)
})

test('a session transition during a scan suppresses late results and stops subsequent scheduling', async () => {
  const requests = [], updates = []
  const s = setup(Array.from({ length: 10 }, (_, i) => player(i + 1)), id => new Promise(resolve => requests.push({ id, resolve })))
  const pending = s.api.loadPatronageWall({ onUpdate: (entries, meta) => updates.push({ entries, meta }) })
  const rejected = assert.rejects(pending, /已取消/)
  await tick(); s.setGeneration(1)
  requests.forEach(r => r.resolve([crown(r.id)])); await rejected; await tick()
  assert.equal(requests.length, 8); assert.equal(updates.length, 1)
  assert.equal(updates[0].meta.complete, false)
})

test('two consumers share one in-flight scan and a joining consumer receives the existing partial snapshot', async () => {
  const requests = [], firstUpdates = [], secondUpdates = []
  const s = setup([player(1), player(2)], id => new Promise(resolve => requests.push({ id, resolve })))
  const first = s.api.loadPatronageWall({ onUpdate: (entries, meta) => firstUpdates.push({ entries, meta }) })
  await tick(); requests[0].resolve([crown(10)]); await tick()
  const second = s.api.loadPatronageWall({ onUpdate: (entries, meta) => secondUpdates.push({ entries, meta }) })
  assert.deepEqual(secondUpdates[0].entries.map(e => e.player.id), [1])
  assert.deepEqual(secondUpdates[0].meta, { completed: 1, total: 2, complete: false, fromCache: false })
  requests[1].resolve([crown(20)])
  assert.deepEqual(await second, await first)
  assert.equal(s.calls.length, 1); assert.equal(requests.length, 2)
  assert.equal(firstUpdates.at(-1).meta.complete, true); assert.equal(secondUpdates.at(-1).meta.complete, true)
})

test('one shared consumer may cancel without interrupting the other consumer or publishing to the hidden one', async () => {
  let current = true
  const requests = [], firstUpdates = [], secondUpdates = []
  const s = setup(Array.from({ length: 9 }, (_, i) => player(i + 1)), id => new Promise(resolve => requests.push({ id, resolve })))
  const first = s.api.loadPatronageWall({ isCurrent: () => current, onUpdate: (entries, meta) => firstUpdates.push({ entries, meta }) })
  const rejected = assert.rejects(first, /已取消/)
  const second = s.api.loadPatronageWall({ onUpdate: (entries, meta) => secondUpdates.push({ entries, meta }) })
  await tick(); current = false
  requests[0].resolve([crown(10)]); await rejected; await tick()
  assert.equal(firstUpdates.length, 1); assert.equal(requests.length, 9)
  requests.filter(r => r.id !== 1).forEach(r => r.resolve([crown(r.id)]))
  assert.equal((await second).length, 9)
  assert.equal(secondUpdates.at(-1).meta.complete, true)
  assert.equal(s.calls.length, 1)
})

test('force refresh rejects the old scan immediately, publishes no old late data, and preserves a global eight-request limit', async () => {
  const requests = [], oldUpdates = [], newUpdates = []
  let pass = 0, active = 0, maximum = 0
  const s = setup(() => { pass++; return Array.from({ length: 9 }, (_, i) => player(i + 1)) }, id => {
    active++; maximum = Math.max(maximum, active)
    const batch = pass
    return new Promise(resolve => requests.push({ id, batch, resolve: crowns => { active--; resolve(crowns) } }))
  })
  const old = s.api.loadPatronageWall({ onUpdate: (entries, meta) => oldUpdates.push({ entries, meta }) })
  const rejected = assert.rejects(old, /已取消/)
  await tick(); assert.equal(requests.length, 8)
  const fresh = s.api.loadPatronageWall({ forceRefresh: true, onUpdate: (entries, meta) => newUpdates.push({ entries, meta }) })
  await rejected; await tick()
  assert.equal(s.calls.length, 2); assert.equal(requests.length, 8)
  requests.filter(r => r.batch === 1).forEach(r => r.resolve([crown(r.id)])); await tick()
  assert.equal(oldUpdates.length, 1)
  const pendingNew = requests.filter(r => r.batch === 2)
  assert.equal(pendingNew.length, 8)
  for (let index = 0; index < requests.length; index++) {
    if (requests[index].batch !== 2) continue
    requests[index].resolve([crown(requests[index].id + 100)]); await tick()
  }
  const result = await fresh
  assert.deepEqual(result.map(e => e.crowns[0].id), Array.from({ length: 9 }, (_, i) => i + 101))
  assert.equal(maximum, 8); assert.equal(active, 0)
  assert.equal(newUpdates.at(-1).meta.complete, true)
  assert.deepEqual(await s.api.loadPatronageWall(), result)
  assert.equal(s.calls.length, 2)
})

test('explicit invalidation rejects a pending player-list scan and prevents its late response from querying crowns or seeding cache', async () => {
  const lists = [], requests = [], updates = []
  const s = setup(() => new Promise(resolve => lists.push(resolve)), async id => { requests.push(id); return [crown(id)] })
  const old = s.api.loadPatronageWall({ onUpdate: (entries, meta) => updates.push({ entries, meta }) })
  const rejected = assert.rejects(old, /已取消/)
  await tick(); s.api.invalidatePatronageWallCache(); await rejected
  lists[0]([player(1)]); await tick()
  assert.deepEqual(requests, []); assert.deepEqual(updates, [])
  const fresh = s.api.loadPatronageWall(); await tick(); lists[1]([player(2)])
  assert.deepEqual((await fresh).map(e => e.player.id), [2])
  assert.deepEqual(requests, [2]); assert.equal(s.calls.length, 2)
})

test('a truly empty complete result can be cached but initial partial emptiness stays incomplete', async () => {
  const updates = []
  const s = setup([player(1)], async () => [])
  assert.deepEqual(await s.api.loadPatronageWall({ onUpdate: (entries, meta) => updates.push({ entries, meta }) }), [])
  assert.equal(updates[0].meta.complete, false)
  assert.equal(updates.at(-1).meta.complete, true)
  const cachedUpdates = []
  assert.deepEqual(await s.api.loadPatronageWall({ onUpdate: (entries, meta) => cachedUpdates.push({ entries, meta }) }), [])
  assert.deepEqual(cachedUpdates, [{ entries: [], meta: { completed: 1, total: 1, complete: true, fromCache: true } }])
  assert.equal(s.calls.length, 1)
})

test('a cancelled or throwing update consumer cannot corrupt another subscriber or the completed cache', async () => {
  const requests = [], failure = new Error('fixture update failure')
  const s = setup([player(1)], id => new Promise(resolve => requests.push({ id, resolve })))
  const first = s.api.loadPatronageWall({ onUpdate: entries => { if (entries.length) throw failure } })
  const rejected = assert.rejects(first, error => error === failure)
  const second = s.api.loadPatronageWall()
  await tick(); requests[0].resolve([crown(10)]); await rejected
  assert.deepEqual((await second).map(e => e.player.id), [1])
  let current = true, cachedUpdates = 0
  await assert.rejects(s.api.loadPatronageWall({ isCurrent: () => current, onProgress: () => { current = false }, onUpdate: () => { cachedUpdates++ } }), /已取消/)
  assert.equal(cachedUpdates, 0)
  assert.deepEqual((await s.api.loadPatronageWall()).map(e => e.player.id), [1])
  assert.equal(s.calls.length, 1)
})

test('cancelling the only consumer during its last partial update never commits a completed cache', async () => {
  let current = true, requests = 0
  const updates = []
  const s = setup([player(1)], async () => { requests++; return [crown(requests)] })
  await assert.rejects(s.api.loadPatronageWall({
    isCurrent: () => current,
    onUpdate: (entries, meta) => { updates.push({ entries, meta }); if (meta.completed === 1) current = false }
  }), /已取消/)
  assert.equal(updates.some(u => u.meta.complete), false)
  current = true
  assert.equal((await s.api.loadPatronageWall())[0].crowns[0].id, 2)
  assert.equal(s.calls.length, 2)
})
