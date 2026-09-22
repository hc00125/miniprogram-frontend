const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('vue')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { renderToString } = require('@vue/server-renderer')
const root = path.join(__dirname, '..')
const customTags = ['view', 'text', 'image', 'scroll-view']
const coverSource = fs.readFileSync(path.join(root, 'src/components/ProductCover.vue'), 'utf8')
const descriptor = parse(coverSource).descriptor
const compiled = compileScript(descriptor, { id: 'cover-test', inlineTemplate: true, templateOptions: { compilerOptions: { isCustomElement: tag => customTags.includes(tag) } } })
const moduleObject = { exports: {} }
vm.runInNewContext(ts.transpileModule(compiled.content, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: moduleObject, exports: moduleObject.exports, require })
const ProductCover = moduleObject.exports.default
const fallback = '平台保障 · 快速匹配 · 服务留痕'
const title = '三人 四套四弹'
const summary = '适合想要轻松组队的玩家，完整长简介测试'
const renderCover = props => renderToString(vue.createSSRApp(ProductCover, { title, ...props }))

test('ordering template hides cover descriptions but retains names, external description, price and detail controls', async () => {
  const { compile } = require('@vue/compiler-dom')
  const source = fs.readFileSync(path.join(root, 'src/pages/shop/category/index.vue'), 'utf8')
  const template = parse(source).descriptor.template.content
  const render = new Function('Vue', compile(template, { mode: 'function', prefixIdentifiers: true, isCustomElement: tag => customTags.includes(tag) }).code)(vue)
  const products = ['单人 四套四弹', '双人 四套四弹', title].map((name, id) => ({ id, name, description: summary, specs: [{ price: 99 }] }))
  const state = {
    statusBarHeight: 20, keyword: '', games: [{ id: 1, name: '测试游戏' }], activeGameId: 1,
    categories: [{ id: 1, name: '套餐' }], activeCategoryId: 1, activeGameName: '测试游戏', activeCategoryName: '套餐',
    refreshing: false, loading: false, filteredProducts: products,
    productImage: () => '/unchanged.jpg', productBadge: () => '推荐套餐', soldText: () => '新品', productTheme: () => 'green', diamondPrice: () => '99',
    selectGame() {}, refreshData() {}, openDetail() {}, selectMainTab() {}
  }
  const app = vue.createSSRApp({ setup: () => state, render })
  app.component('ProductCover', ProductCover)
  app.component('MainBottomTabs', { render: () => null })
  const html = await renderToString(app)
  assert.ok(!html.includes('product-cover__summary'), 'ordering cover must opt out of summary rendering')
  for (const product of products) assert.ok(html.includes(product.name))
  assert.equal((html.match(/class="desc"/g) || []).length, 3, 'external descriptions stay in scope unchanged')
  assert.ok(html.includes(summary))
  assert.equal((html.match(/💎99/g) || []).length, 3)
  assert.equal((html.match(/>查看<\/button>/g) || []).length, 3)
  assert.ok(html.includes('起'))
  assert.match(template, /@tap\.stop="openDetail\(product.id\)"/)
})

test('explicit false removes the summary node and fallback, preserving package title and image', async () => {
  for (const description of [summary, '']) {
    const html = await renderCover({ image: '/unchanged.jpg', summary: description, showSummary: false })
    assert.ok(!html.includes('product-cover__summary'), 'hidden summary must not render a node')
    assert.ok(!html.includes(summary))
    assert.ok(!html.includes(fallback))
    assert.ok(html.includes(title), 'package title must stay visible')
    assert.ok(html.includes('/unchanged.jpg'))
  }
})

test('default shared cover behavior preserves supplied summary and empty-summary fallback', async () => {
  const supplied = await renderCover({ summary })
  assert.ok(supplied.includes('product-cover__summary'))
  assert.ok(supplied.includes(summary))
  assert.ok((await renderCover({})).includes(fallback))
  assert.ok((await renderCover({ summary, showSummary: true })).includes(summary))
})
