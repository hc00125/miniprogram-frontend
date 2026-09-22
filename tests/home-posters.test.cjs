const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('vue')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { compile } = require('@vue/compiler-dom')
const { renderToString } = require('@vue/server-renderer')
const source = fs.readFileSync(path.join(__dirname, '../src/pages/boss/home/index.vue'), 'utf8')
const descriptor = parse(source).descriptor
const template = descriptor.template.content
const render = new Function('Vue', compile(template, { mode: 'function', prefixIdentifiers: true, isCustomElement: tag => ['view', 'text', 'image', 'scroll-view', 'swiper', 'swiper-item'].includes(tag) }).code)(vue)
function harness(packages = [], fail = false) {
  const hooks = [], calls = []
  const mocks = {
    vue,
    '@dcloudio/uni-app': { onShow: fn => hooks.push(fn), onShareAppMessage() {}, onShareTimeline() {} },
    '@/api/boss': { getPackages: async () => { if (fail) throw Error('offline'); return packages }, getPlayerList: async () => [] },
    '@/components/MainBottomTabs.vue': { default: {} },
    '@/utils/uiIcons': { uiIcons: {} },
    '@/utils/nav': { go: (...args) => calls.push(args), goMain() {}, navigateToTab() {} },
    '@/utils/client': { getClientProfile() {} },
    '@/utils/diamonds': { diamondsFrom: (diamonds, price) => diamonds ?? price, formatDiamonds: String },
    '@/utils/feedback': { toast() {} }
  }
  const compiled = compileScript(descriptor, { id: 'home-test' })
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(compiled.content, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports, require: name => { assert.ok(name in mocks, name); return mocks[name] } })
  const state = module.exports.default.setup({}, { expose() {} })
  async function html() {
    const app = vue.createSSRApp({ setup: () => ({ ...state }), render })
    app.component('MainBottomTabs', { render: () => null })
    return renderToString(app)
  }
  return { state, calls, html, load: async () => { for (const hook of hooks) await hook() } }
}

test('home recommendations exclude broken-cover ID 11 locally and refill without mutating catalogue', async () => {
  const packages = [
    { id: 11, name: '特色玩法单', cover_url: 'https://api.huc125.cn/media/broken.jpg' },
    { id: 12, name: '单人 四套四弹', cover_url: 'https://api.huc125.cn/media/four.jpg', base_price: 15 },
    { id: 16, name: '五套四弹', cover_url: 'https://api.huc125.cn/media/five.jpg', base_price: 20 },
    { id: 22, name: '六套五弹', cover_url: 'https://api.huc125.cn/media/six.jpg', base_price: 30 }
  ]
  const before = JSON.stringify(packages)
  const h = harness(packages); await h.load()
  assert.deepEqual(Array.from(h.state.hotPackages.value, p => p.id), [12, 16])
  assert.doesNotMatch(await h.html(), /特色玩法单/)
  h.state.failedPackageCovers.value[12] = packages[1].cover_url
  assert.deepEqual(Array.from(h.state.hotPackages.value, p => p.id), [16, 22])
  assert.equal(JSON.stringify(packages), before)
  assert.equal(h.state.packages.value.length, 4)
})

test('hot cards render API cover_url without an overlay and preserve external name, price and packageId', async () => {
  const packages = [
    { id: 16, name: '五套四弹', cover_url: 'https://api.huc125.cn/media/packages/test-cover-a.jpg', base_price: 28, player_count: 1 },
    { id: 12, name: '单人 四套四弹', cover_url: 'https://api.huc125.cn/media/packages/test-cover-b.jpg', base_price: 39, player_count: 1 }
  ]
  const h = harness(packages); await h.load()
  const html = await h.html()
  for (const pkg of packages) {
    assert.ok(html.includes(`src="${pkg.cover_url}"`), 'must render this product’s API cover URL')
    assert.ok(html.includes(pkg.name))
    assert.ok(html.includes(`💎${pkg.base_price}`))
    h.state.goShopDetail(pkg.id)
    assert.equal(h.calls.at(-1)[0], '/pages/shop/detail/index')
    assert.equal(h.calls.at(-1)[1].packageId, pkg.id)
  }
  const media = [...html.matchAll(/<view class="package-media">([\s\S]*?)<\/view>/g)]
  assert.equal(media.length, 2)
  for (const [, contents] of media) {
    assert.match(contents, /<image[^>]+class="package-bg"/)
    assert.doesNotMatch(contents, /<text|shade|badge/)
  }
  assert.doesNotMatch(html, /package-shade|适合深夜车队/)
  assert.match(template, /@tap="goShopDetail\(pkg.id\)"/)
  assert.match(template, /\/时\/人/)
  const css = descriptor.styles[0].content
  assert.doesNotMatch(css, /package-shade/)
  for (const cls of ['hot-copy', 'hot-price']) {
    const blocks = [...css.matchAll(new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`, 'g'))]
    assert.ok(blocks.length)
    for (const [, block] of blocks) assert.doesNotMatch(block, /position:absolute|z-index/)
  }
})

test('missing and failed covers are omitted from home recommendations and recover on URL change', async () => {
  const pkg = { id: 16, name: '实际套餐', cover_url: 'https://api.huc125.cn/media/failed.jpg', base_price: 28 }
  const h = harness([pkg, { id: 12, name: '未配图套餐', base_price: 39 }]); await h.load()
  assert.ok((await h.html()).includes(pkg.cover_url))
  h.state.failedPackageCovers.value[pkg.id] = pkg.cover_url
  const html = await h.html()
  const media = [...html.matchAll(/<view class="package-media">([\s\S]*?)<\/view>/g)]
  assert.equal(media.length, 0)
  assert.doesNotMatch(html, /实际套餐|未配图套餐|💎28/)
  h.state.packages.value[0].cover_url = 'https://api.huc125.cn/media/recovered.jpg'
  assert.equal(h.state.hotPackages.value.length, 1)
  assert.ok((await h.html()).includes('recovered.jpg'))
  assert.match(template, /@error="failedPackageCovers\[pkg.id\] = pkg.cover_url"/)
  assert.match(descriptor.styles[0].content, /\.package-media\{[^}]*background:#f3f2ef/)
})

test('carousel keeps lounge and maps real five/six posters to their own product details', async () => {
  const products = [
    { id: 16, name: '五套四弹', cover_url: 'https://api.huc125.cn/media/packages/2026/07/46908ab7-76b1-483b-b497-0b14596bce47_pJB36ig.jpg', base_price: 20 },
    { id: 22, name: '六套五弹', cover_url: 'https://api.huc125.cn/media/packages/2026/07/liutao-wutan-danren-cover.jpg', base_price: 30 }
  ]
  const h = harness(products); await h.load()
  const banners = vue.unref(h.state.heroBanners)
  assert.equal(banners.length, 3)
  assert.equal(banners[0].image, 'https://api.huc125.cn/media/banners/hero-lounge.jpg')
  h.state.handleHeroBannerTap(banners[0].target)
  assert.equal(h.calls.at(-1)[0], '/pages/shop/category/index')
  for (const [i, pkg] of products.entries()) {
    assert.equal(banners[i + 1].image, pkg.cover_url)
    h.state.handleHeroBannerTap(banners[i + 1].target)
    assert.equal(h.calls.at(-1)[0], '/pages/shop/detail/index')
    assert.equal(h.calls.at(-1)[1].packageId, pkg.id)
  }
  const html = await h.html()
  assert.doesNotMatch(html, /package-five.png|package-six.png/)
  assert.match(html, /class="hero-slide__image"[^>]+mode="aspectFit"/)
  h.state.packages.value = []
  assert.equal(vue.unref(h.state.heroBanners).length, 1, 'removed products must not remain as stale offers')
  const offline = harness([], true); await offline.load()
  assert.equal(vue.unref(offline.state.heroBanners).length, 1)
})

test('carousel image errors remove only the failed offer and never substitute a poster', async () => {
  const h = harness([{ id: 16, name: '五套四弹', cover_url: 'https://api.huc125.cn/media/five.jpg' }]); await h.load()
  const banner = vue.unref(h.state.heroBanners)[1]
  assert.match(template, /@error="handleHeroImageError\(banner\)"/)
  h.state.handleHeroImageError(banner)
  assert.equal(vue.unref(h.state.heroBanners).length, 1)
  assert.equal(h.state.hotPackages.value.length, 0)
  assert.equal(h.state.packages.value.length, 1)
  assert.doesNotMatch(await h.html(), /five.jpg|package-five.png|package-six.png/)
})

test('failed package API never substitutes invented local packages', async () => {
  const h = harness([], true); await h.load()
  assert.equal(h.state.hotPackages.value.length, 0)
  const html = await h.html()
  assert.match(html, /暂无套餐/)
  assert.doesNotMatch(source, /fallbackPackages|packageVisuals|packageImageFor|默认展示数据/)
})

test('home removes fictional accepted-order ticker without removing order notice or real navigation', async () => {
  const h = harness(); await h.load()
  const html = await h.html()
  assert.doesNotMatch(html, /18分钟前|金牌陪已接单|notice-bar/)
  assert.match(html, /order-notice-banner/)
  h.state.goQuery(); h.state.goOrderNotice()
  assert.ok(h.calls.some(call => call[0] === '/pages/boss/order-notice/index'))
})
