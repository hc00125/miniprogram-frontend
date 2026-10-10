// Execute the shipped mini-program render function and resolve its actual WXML bindings.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), vue = require('vue')
const base = path.join(__dirname, '../dist/build/mp-weixin/pages/player/list')
const wxml = fs.readFileSync(path.join(base, 'index.wxml'), 'utf8')
const players = [{ id: 12, name: '接单中', is_online: true, can_be_designated: true }, { id: 34, name: '休息中', is_online: false }, { id: 56, name: '不接受指定', is_online: true, can_be_designated: false }]
const hooks = [], calls = []; let C
const vendor = { ...vue,s: x => x || '', index: { $on() {}, $off() {} }, onShow: f => hooks.push(f), onUnmounted() {}, _export_sfc: c => c, e: Object.assign, t: String, n: x => x, o: x => x, p: x => x, f: (items, fn) => items.map(fn) }
const assets = {}
vm.runInNewContext(fs.readFileSync(path.join(base, '../../../common/assets.js'), 'utf8'), { exports: assets })
vm.runInNewContext(fs.readFileSync(path.join(base, 'index.js'), 'utf8'), { wx: { createPage: c => C = c }, require: name => name.endsWith('vendor.js') ? vendor : name.endsWith('assets.js') ? assets : name.endsWith('boss.js') ? { getPlayerList: async () => players } : name.endsWith('nav.js') ? { go: (...args) => calls.push(args) } : { toast() {}, success() {} } })
async function main() {
  const scope = vue.effectScope(), render = scope.run(() => C.setup({}, { expose() {} }))
  try {
    for (const f of hooks) await f()
    const data = render({}, {}), loop = wxml.match(/wx:for="{{(\w+)}}" wx:for-item="player"/)[1], rows = data[loop]
    const service = wxml.match(/<button[^>]*class="club-btn[^>]*disabled="{{player\.(\w+)}}"[^>]*>{{player\.(\w+)}}<\/button>/)
    assert.ok(service, 'service button must resolve its own disabled/text bindings')
    assert.deepEqual(rows.map(r => [r[service[2]], r[service[1]]]), [['查看服务', false], ['休息中', true], ['暂不可指定', true]])
    const priceKey = wxml.match(/class="designate-price[^>]*>{{player\.(\w+)}}/)[1]
    assert.deepEqual(rows.map(r => r[priceKey]), ['查看专属服务和规格', '休息中', '暂不接受指定'])
    const patronage = wxml.match(/<button[^>]*class="player-patronage[^>]*catchtap="{{player\.(\w+)}}"/)[1]
    rows.forEach(r => r[patronage]())
    assert.equal(JSON.stringify(calls), JSON.stringify(players.map(p => ['/pages/client/patronage/index', { playerId: p.id }])))
    const giftProps = wxml.match(/<gift-host[^>]*u-p="{{player\.(\w+)}}"/)[1]
    assert.deepEqual(rows.map(r => [r[giftProps]['recipient-id'], r[giftProps]['recipient-name']]), players.map(p => [p.id, p.name]))
    const activeChange = wxml.match(/<patronage-crowns[^>]*bindactiveChange="{{player\.(\w+)}}"/)[1]
    const crownImage = wxml.match(/<image[^>]*class="portrait-crown[^>]*>/)[0]
    const crownVisible = crownImage.match(/wx:if="{{player\.(\w+)}}"/)[1], crownSource = crownImage.match(/src="{{player\.(\w+)}}"/)[1]
    const portraitBorder = wxml.match(/player\.(\w+) && 'portrait-wrap--crowned'/)[1], cardBorder = wxml.match(/player\.(\w+) && 'player-card--crowned'/)[1]
    const decoration = list => list.map(r => [!!r[crownVisible], !!r[portraitBorder], !!r[cardBorder]])
    const controls = list => list.map(r => [r[service[2]], r[service[1]], r[priceKey], r[giftProps]['recipient-id'], r[giftProps]['recipient-name']])
    const originalControls = controls(rows), undecorated = players.map(() => [false, false, false])
    assert.deepEqual(decoration(rows), undecorated)
    rows[1][activeChange](true)
    const crowned = render({}, {})[loop]
    assert.deepEqual(decoration(crowned), [[false, false, false], [true, true, true], [false, false, false]])
    assert.equal(crowned[1][crownSource], '/icons/patronage/crown-gold.png')
    assert.deepEqual(controls(crowned), originalControls)
    crowned[1][activeChange](false)
    const cleared = render({}, {})[loop]
    assert.deepEqual(decoration(cleared), undecorated)
    assert.deepEqual(controls(cleared), originalControls)
    console.log('PASS shipped JS + WXML: service/gift/patronage targets preserved; crown events toggle only their player without enabling resting players.')
  } finally { scope.stop() }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
