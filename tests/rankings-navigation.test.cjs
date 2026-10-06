const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.join(__dirname, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/pages.json'), 'utf8'))
const tabPaths = new Set(manifest.tabBar.list.map(tab => '/' + tab.pagePath))
const orderPath = '/pages/boss/query/index'
const rankingPath = '/pages/client/rankings/index'
function harness(pages = []) {
  const calls = []
  const uni = Object.fromEntries(['switchTab', 'navigateTo', 'redirectTo', 'reLaunch', 'navigateBack'].map(method => [method, options => {
    if (method === 'switchTab') assert.ok(tabPaths.has(options.url), `switchTab must target a registered tab: ${options.url}`)
    if (method === 'navigateTo' || method === 'redirectTo') assert.equal(tabPaths.has(options.url.split('?')[0]), false, `${method} must not target a native tab`)
    calls.push({ method, ...options })
  }]))
  const module = { exports: {} }
  const source = fs.readFileSync(path.join(root, 'src/utils/nav.ts'), 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  new Function('exports', 'module', 'uni', 'getCurrentPages', js)(module.exports, module, uni, () => pages)
  return { nav: module.exports, calls }
}

test('rankings replaces only the third native tab; orders remain a registered page', () => {
  assert.equal(manifest.tabBar.list.length, 5)
  assert.equal(manifest.tabBar.list[2].pagePath, rankingPath.slice(1))
  assert.equal(manifest.tabBar.list[2].text, '排行榜')
  assert.equal(manifest.tabBar.list[2].iconPath, '/icons/themes/mist/tab-rank.png')
  assert.ok(manifest.pages.some(page => page.path === orderPath.slice(1)))
  assert.equal(tabPaths.has(orderPath), false)
  const { nav, calls } = harness()
  for (const tab of ['home', 'order', 'rankings', 'players', 'profile']) nav.goMain(tab)
  assert.deepEqual(calls.map(call => call.url), [...tabPaths])
  assert.ok(calls.every(call => call.method === 'switchTab'))
})

test('profile, checkout and history legacy order navigation opens the order page', () => {
  const { nav, calls } = harness()
  nav.goMain('query')
  nav.navigateToTab('query')
  nav.go(orderPath)
  assert.deepEqual(calls, Array.from({ length: 3 }, () => ({ method: 'navigateTo', url: orderPath })))
  const profile = fs.readFileSync(path.join(root, 'src/pages/client/profile/index.vue'), 'utf8')
  assert.match(profile, /switchMainTab\('query'\)/)
  assert.match(profile, /我的订单/)
})

test('legacy home tab params resolve to orders for go, replace and relaunch without losing remaining params', () => {
  const { nav, calls } = harness()
  for (const method of ['go', 'replace', 'relaunch']) nav[method]('/pages/boss/home/index', { tab: 'query', from: 'history', orderNo: 'fixture-1' })
  assert.deepEqual(calls, ['navigateTo', 'redirectTo', 'reLaunch'].map(method => ({ method, url: orderPath + '?from=history&orderNo=fixture-1' })))
})

test('direct rankings, homepage float and native tab compatibility aliases all switch to one native page', () => {
  const { nav, calls } = harness()
  nav.goMain('rankings')
  nav.navigateToTab('rankings')
  nav.go(rankingPath)
  nav.replace(rankingPath)
  nav.relaunch('/pages/boss/home/index', { tab: 'rankings' })
  assert.deepEqual(calls, Array.from({ length: 5 }, () => ({ method: 'switchTab', url: rankingPath })))
})

test('order detail return uses stack when available and redirectTo otherwise', () => {
  const stacked = harness([{ route: 'pages/client/profile/index' }, { route: orderPath.slice(1) }, { route: 'pages/boss/payment/index' }])
  stacked.nav.backToRoute(orderPath)
  assert.deepEqual(stacked.calls, [{ method: 'navigateBack', delta: 1 }])
  const unstacked = harness([{ route: 'pages/boss/payment/index' }])
  unstacked.nav.backToRoute(orderPath)
  assert.deepEqual(unstacked.calls, [{ method: 'redirectTo', url: orderPath }])
})
