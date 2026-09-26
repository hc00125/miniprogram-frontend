const { test } = require('node:test')
const assert = require('node:assert/strict')
const vue = require('vue')
const { homeHarness, source, descriptor } = require('./home-reference-harness.cjs')
const template = descriptor.template.content
function harness(packages = [], fail = false) { return homeHarness({ packages, packageFail: fail, guest: true }) }
// The approved reference layout replaces hot-package cards with games/wallet/players.
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
  assert.equal(h.state.packages.value.length, 1)
  assert.doesNotMatch(await h.html(), /five.jpg|package-five.png|package-six.png/)
})

test('failed package API never substitutes invented local packages', async () => {
  const h = harness([], true); await h.load()
  const html = await h.html()
  assert.equal(h.state.heroBanners.value.length, 1)
  assert.doesNotMatch(source, /fallbackPackages|packageVisuals|packageImageFor|默认展示数据/)
})


test('failed carousel cover recovers only on real API URL change and never mutates catalogue', async t => {
  const products = [{ id: 11, name: '特色玩法单', cover_url: 'https://fixture.invalid/broken.jpg' }, { id: 16, name: '五套四弹', cover_url: 'https://fixture.invalid/five.jpg' }]
  const before = JSON.stringify(products), h = harness(products); t.after(() => h.scope.stop()); await h.load()
  assert.doesNotMatch(await h.html(), /broken.jpg|特色玩法单/)
  h.state.handleHeroImageError(h.state.heroBanners.value[1])
  assert.equal(h.state.heroBanners.value.length, 1)
  assert.equal(JSON.stringify(products), before)
  h.state.packages.value = [...products, { id: 22, name: '六套五弹' }]
  assert.equal(h.state.heroBanners.value.length, 1, 'missing image does not get a fabricated poster')
  h.state.packages.value = products.map(p => p.id === 16 ? { ...p, cover_url: 'https://fixture.invalid/recovered.jpg' } : p)
  assert.equal(h.state.heroBanners.value.length, 2)
  assert.match(await h.html(), /recovered.jpg/)
})
test('home retains order notice navigation without fictional broadcasts or obsolete hot-card sections', async t => {
  const h = harness(); t.after(() => h.scope.stop()); await h.load()
  const html = await h.html()
  assert.doesNotMatch(html, /18分钟前|金牌陪已接单|notice-bar|热门套餐/)
  assert.match(html, /下单须知/)
  h.state.goOrderNotice()
  assert.ok(h.calls.some(call => call[0] === '/pages/boss/order-notice/index'))
  for (const tab of ['query', 'players', 'profile']) { h.state.handleMainTabSelect(tab); assert.equal(h.calls.at(-1)[1], tab) }
})
