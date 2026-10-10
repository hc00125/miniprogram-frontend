// Explicit replay of an actual Django APIClient response; makes no live requests.
// node tests/patronage-wall-backend.integration.cjs /path/to/offline-fixture.json
const fs = require('node:fs'), assert = require('node:assert/strict'), vue = require('vue')
const { harness, nodes } = require('./commerce-sfc-harness.cjs')
const fixture = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
assert.equal(fixture.statusCode, 200)
assert.equal(fixture.data.contract_version, '1.0')
assert.ok(fixture.data.count > 0)
const reads = [], navigation = [], unmount = []
const apiHost = harness({ '@/api/boss': { getPlayerList: () => { throw Error('summary must avoid legacy list') } } })
apiHost.uni.request = options => {
  reads.push(options)
  assert.equal(options.url, 'https://fixture.invalid/api/patronage/wall/')
  assert.equal(options.method, 'GET')
  assert.deepEqual(options.header, {}, 'public summary must not send client credentials')
  options.success(JSON.parse(JSON.stringify(fixture)))
}
const api = apiHost.load('src/api/patronageWall.ts')
const h = harness({
  vue: { ...vue, onMounted: f => h.hooks.mounted.push(f), onBeforeUnmount: f => unmount.push(f) },
  '@/api/patronageWall': api,
  '@/utils/nav': { go: (...args) => navigation.push(args) }
})
const scope = vue.effectScope(), Panel = h.load('src/components/PatronageWallPanel.vue').default
const render = scope.run(() => Panel.setup({ embedded: true }, { expose() {} }))
const tree = () => nodes(render({}, []))
const action = id => tree().find(node => node.props?.['data-action'] === id)
const text = () => tree().filter(node => typeof node.children === 'string').map(node => node.children).join('|')
const tick = () => new Promise(setImmediate)
async function ready() {
  for (let i = 0; i < 20 && action('loading'); i++) await tick()
  assert.equal(action('loading'), undefined)
  assert.equal(action('error'), undefined)
  assert.equal(tree().filter(node => node.props?.['data-action'] === 'wall-card').length, fixture.data.count)
}
;(async () => {
  try {
    h.hooks.show[0](); h.hooks.mounted[0](); await ready()
    assert.equal(reads.length, 1, 'one actual parsed GET for both lifecycle hooks')
    for (const entry of fixture.data.results) {
      assert.ok(text().includes(entry.player.name))
      for (const crown of entry.crowns) {
        assert.ok(text().includes(crown.boss_name))
        assert.ok(text().includes(crown.package_name))
      }
    }
    const second = fixture.data.results[1] || fixture.data.results[0], id = second.player.id
    action(`service-${id}`).props.onTap(); action(`patronage-${id}`).props.onTap()
    assert.deepEqual(navigation, [['/pages/player/detail/index', { playerId: id }], ['/pages/client/patronage/index', { playerId: id }]])
    h.hooks.hide[0](); h.hooks.show[0](); await ready()
    assert.equal(reads.length, 1, 'complete cache avoids another request on return')
    action('refresh').props.onTap(); await ready()
    assert.equal(reads.length, 2, 'forced refresh still uses only one aggregate GET')
    console.log(`Django response replay passed: ${fixture.data.count} players, ${fixture.data.results.reduce((n, e) => n + e.crowns.length, 0)} crowns, 1 GET; cache and both navigation targets verified.`)
  } finally { unmount.forEach(f => f()); scope.stop() }
})().catch(error => { console.error(error); process.exitCode = 1 })
