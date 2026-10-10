const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('vue')
const { compile } = require('@vue/compiler-dom')
const { parse } = require('@vue/compiler-sfc')
const { homeHarness, descriptor } = require('./home-reference-harness.cjs')
const { nodes } = require('./commerce-sfc-harness.cjs')

const root = path.join(__dirname, '..')
const render = new Function('Vue', compile(descriptor.template.content, {
  mode: 'function', prefixIdentifiers: true,
  isCustomElement: tag => ['view', 'text', 'image', 'scroll-view', 'swiper', 'swiper-item'].includes(tag)
}).code)({ ...vue, resolveComponent: name => name })
const action = (h, name) => nodes(render(vue.proxyRefs(h.state), [])).find(node => node.props?.['data-action'] === name)
const baseGame = { id: 5, code: 'arena', name: '暗区突围', groups: [{ id: 51 }] }

test('home shortcuts sit between games and wallet and open the intended registered destinations', async t => {
  const h = homeHarness({ games: [baseGame] }); t.after(() => h.scope.stop()); await h.load()
  const html = await h.html(), position = html.indexOf('data-section="home-shortcuts"')
  assert.ok(position > html.indexOf('小游戏陪玩') && position < html.indexOf('class="wallet-card"'))
  h.calls.length = 0
  for (const name of ['order-notice', 'benefits', 'customer-service', 'my-orders']) action(h, name).props.onTap()
  assert.deepEqual(h.calls, [['/pages/boss/order-notice/index'], ['/pages/client/benefits/index'], ['/pages/client/customer-service/index'], ['tab', 'query']])
  const pages = JSON.parse(fs.readFileSync(path.join(root, 'src/pages.json'), 'utf8')).pages
  for (const [route] of h.calls.filter(([route]) => route !== 'tab')) assert.ok(pages.some(p => '/' + p.path === route))
})

test('guest can browse benefits but my-orders shortcut directs to login', async t => {
  const h = homeHarness({ guest: true }); t.after(() => h.scope.stop()); await h.load()
  action(h, 'benefits').props.onTap(); action(h, 'my-orders').props.onTap()
  assert.deepEqual(h.calls, [['/pages/client/benefits/index'], ['/pages/client/login/index']])
})

function cachedCatalogue(storage, games) {
  const show = [], calls = []
  const unexpected = () => { throw new Error('Cached catalogue must not reload its API for a homepage selection') }
  const mocks = {
    vue,
    '@dcloudio/uni-app': { onLoad() {}, onShow: callback => show.push(callback), onShareAppMessage() {}, onShareTimeline() {} },
    '@/api/boss': { getPackages: unexpected }, '@/api/catalog': { getCatalogNavigation: unexpected },
    '@/components/MainBottomTabs.vue': {}, '@/components/ProductCover.vue': {}, '@/utils/diamonds': {}, '@/utils/feedback': {},
    '@/utils/nav': { goMain: tab => calls.push(['tab', tab]), navigateToTab: tab => calls.push(['tab', tab]) }
  }
  const source = parse(fs.readFileSync(path.join(root, 'src/pages/shop/category/index.vue'), 'utf8')).descriptor.scriptSetup.content
    + '\nmodule.exports = { games, loaded, activeGameId, activeCategoryId, keyword, selectGame, selectMainTab };'
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    module, exports: module.exports, require: name => mocks[name],
    uni: { getStorageSync: key => storage[key], removeStorageSync: key => delete storage[key] }
  })
  const state = module.exports
  state.loaded.value = true
  state.games.value = games
  state.activeGameId.value = baseGame.id
  state.activeCategoryId.value = baseGame.groups[0].id
  state.keyword.value = '旧游戏搜索'
  return { state, show: () => show[0](), calls }
}

test('brand header and Steam illustration use packaged assets while retaining the existing hero and recommendations', async t => {
  const h = homeHarness({ guest: true, games: [baseGame] })
  t.after(() => h.scope.stop())
  await h.load()
  const html = await h.html()
  assert.ok(html.indexOf('club-brand') < html.indexOf('hero-section'))
  assert.match(html, /club-brand-logo[^>]+src="\/images\/club\/club-logo.png"/)
  assert.match(html, /偷吃电竞/)
  assert.match(html, /小游戏陪玩/)
  assert.match(html, /陪玩推荐/)
  assert.doesNotMatch(html, /class="more-games"/)
  const logo = fs.readFileSync(path.join(root, 'static/images/club/club-logo.png'))
  const steam = fs.readFileSync(path.join(root, 'static/images/home-redesign/steam-games.jpg'))
  assert.equal(logo.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(steam.subarray(0, 3).toString('hex'), 'ffd8ff')
})

test('rendered floating rank button and homepage tab handler both target the rankings native tab', async t => {
  const h = homeHarness({ guest: true })
  t.after(() => h.scope.stop())
  await h.load()
  const button = action(h, 'open-rankings')
  assert.ok(button)
  assert.equal(button.type, 'button')
  assert.equal(button.props['aria-label'], '查看排行榜')
  button.props.onTap()
  h.state.handleMainTabSelect('rankings')
  assert.deepEqual(h.calls, [['tab', 'rankings'], ['tab', 'rankings']])
  assert.match(await h.html(), /src="\/icons\/rank-light.png"/)
})

test('Steam card with no configured game opens catalogue with explicit mini-game intent without inventing data', async t => {
  const h = homeHarness({ guest: true, games: [baseGame] })
  t.after(() => h.scope.stop())
  await h.load()
  const html = await h.html()
  assert.match(html, /去下单/)
  action(h, 'steam-games').props.onTap()
  assert.deepEqual(h.calls.at(-1), ['/pages/shop/category/index'])
  assert.equal(h.storage['catalog:requested-game-kind'], 'mini-games')
  assert.equal(h.storage['catalog:requested-game-id'], undefined)
  assert.equal(h.state.games.value.length, 1)
})

test('configured Steam card selects the actual game on a previously visited catalogue and consumes the intent only once', async t => {
  const steamGame = { id: 27, code: 'steam', name: '小游戏', groups: [{ id: 271 }] }
  const games = [baseGame, steamGame]
  const h = homeHarness({ guest: true, games })
  t.after(() => h.scope.stop())
  await h.load()
  action(h, 'steam-games').props.onTap()
  assert.deepEqual(h.calls.at(-1), ['/pages/shop/category/index'])
  assert.equal(h.storage['catalog:requested-game-id'], 27)
  const catalogue = cachedCatalogue(h.storage, games)
  await catalogue.show()
  assert.equal(catalogue.state.activeGameId.value, 27)
  assert.equal(catalogue.state.activeCategoryId.value, 271)
  assert.equal(catalogue.state.keyword.value, '')
  assert.equal(h.storage['catalog:requested-game-id'], undefined)
  catalogue.state.selectGame(baseGame)
  await catalogue.show()
  assert.equal(catalogue.state.activeGameId.value, 5, 'ordinary catalogue revisits preserve the latest manual selection')
  catalogue.state.selectMainTab('rankings')
  assert.deepEqual(catalogue.calls, [['tab', 'rankings']])
})

test('Arena artwork identified by actual featured game name or code keeps its real catalogue selection', async t => {
  for (const identity of [{ name: '暗区突围无限', code: 'aqtw' }, { name: '战术射击', code: 'arena-breakout-infinite' }]) {
    const arenaGame = { id: 73, ...identity, groups: [{ id: 731 }] }
    const otherGame = { id: 44, name: '小游戏', code: 'steam', groups: [{ id: 441 }] }
    const games = [arenaGame, otherGame]
    const h = homeHarness({ guest: true, games })
    t.after(() => h.scope.stop())
    await h.load()
    const button = action(h, 'arena-game')
    assert.ok(button, 'an actual Arena name or code enables the Arena artwork')
    assert.equal(button.type, 'button')
    const html = await h.html()
    assert.match(html, /src="\/images\/home-redesign\/arena-breakout.jpg"/)
    assert.match(html, /暗区突围无限/)
    assert.doesNotMatch(html, /组队开局，一起寻金/)
    button.props.onTap()
    assert.deepEqual(h.calls.at(-1), ['/pages/shop/category/index'])
    assert.equal(h.storage['catalog:requested-game-id'], 73)
    const catalogue = cachedCatalogue(h.storage, games)
    catalogue.state.activeGameId.value = 44
    catalogue.state.activeCategoryId.value = 441
    await catalogue.show()
    assert.equal(catalogue.state.activeGameId.value, 73)
    assert.equal(catalogue.state.activeCategoryId.value, 731)
    assert.equal(catalogue.state.keyword.value, '')
    assert.equal(h.storage['catalog:requested-game-id'], undefined)
  }
})

test('a non-Arena featured game keeps its generic card and route even when Arena exists later in the catalogue', async t => {
  const otherGame = { id: 94, name: '无畏契约', code: 'valorant', icon_url: 'https://fixture.invalid/valorant.png', groups: [] }
  const h = homeHarness({ guest: true, games: [otherGame, baseGame] })
  t.after(() => h.scope.stop())
  await h.load()
  assert.equal(action(h, 'arena-game'), undefined)
  const html = await h.html()
  assert.doesNotMatch(html, /arena-breakout.jpg|组队开局，一起寻金/)
  assert.match(html, /无畏契约/)
  assert.match(html, /https:\/\/fixture.invalid\/valorant.png/)
  const card = nodes(render(vue.proxyRefs(h.state), [])).find(node => node.props?.class === 'game-card')
  assert.ok(card)
  card.props.onTap()
  assert.equal(h.state.featuredGame.value.id, 94)
  assert.equal(h.storage['catalog:requested-game-id'], 94)
  assert.deepEqual(h.calls.at(-1), ['/pages/shop/category/index'])
})
