// Resolve the shipped profile page's actual WXML keys against its compiled JS.
// Storage/session data is isolated; only API, navigation and native platform calls are mocked.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const assert = require('node:assert/strict'), vue = require('vue')
const { baseParse } = require('@vue/compiler-dom')
const root = path.join(__dirname, '../dist/build/mp-weixin')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
const pagePath = 'pages/client/profile/index', vipPath = 'components/VipSummaryCard'
const pageXml = read(pagePath + '.wxml'), vipXml = read(vipPath + '.wxml')
const all = node => [node, ...(node.children || []).flatMap(all)]
const attr = (node, name) => node.props?.find(p => p.name === name)?.value?.content
const hasClass = (node, name) => (attr(node, 'class') || '').split(' ').includes(name)
const one = (tree, predicate, message) => { const node = all(tree).find(predicate); assert.ok(node, message); return node }
const field = (value, label) => { const match = value?.match(/^{{(\w+)}}$/); assert.ok(match, label); return match[1] }
const textField = node => { const child = node.children?.find(n => n.type === 5); assert.ok(child, 'dynamic native text'); return field(`{{${child.content.content}}}`, 'text binding') }
const loopField = value => { const match = value?.match(/^{{\w+\.(\w+)}}$/); assert.ok(match, 'loop member binding'); return match[1] }
const pageTree = baseParse(pageXml), vipTree = baseParse(vipXml)
const guest = one(pageTree, n => hasClass(n, 'guest-card'), 'guest card')
const wallet = one(pageTree, n => hasClass(n, 'wallet-entry-card'), 'wallet card')
const vip = one(pageTree, n => n.tag === 'vip-summary-card', 'VIP component')
const grid = one(pageTree, n => hasClass(n, 'quick-grid'), 'quick entries')
const quick = grid.children.filter(n => hasClass(n, 'quick-item'))
assert.equal(quick.length, 4)
const status = one(quick[2], n => hasClass(n, 'quick-status'), 'grab status')
const fourthTitle = one(quick[3], n => hasClass(n, 'quick-title'), 'player-center title')
const walletValue = one(wallet, n => n.tag === 'text' && n.children?.some(c => c.type === 5), 'wallet amount')
const fields = {
  themeStyle: field(attr(one(pageTree, n => hasClass(n, 'profile-page'), 'profile root'), 'style'), 'profile theme style'),
  guest: field(attr(guest, 'wx:if'), 'guest condition'), wallet: field(attr(wallet, 'wx:if'), 'wallet condition'),
  vip: field(attr(vip, 'wx:if'), 'VIP condition'), vipProps: field(attr(vip, 'u-p'), 'VIP props'),
  status: field(attr(status, 'wx:if'), 'grab-status condition'), statusText: textField(status),
  title: textField(fourthTitle), walletValue: textField(walletValue),
  grabIcon: field(attr(one(quick[2], n => n.tag === 'image', 'grab icon'), 'src'), 'grab icon binding'),
  centerIcon: field(attr(one(quick[3], n => n.tag === 'image', 'player-center icon'), 'src'), 'center icon binding'),
  grabAction: field(attr(quick[2], 'bindtap'), 'grab navigation'), centerAction: field(attr(quick[3], 'bindtap'), 'player-center navigation')
}
const helpEntries = [
  ['老板须知', 'pages/client/help/boss-notice'],
  ['陪玩守则', 'pages/client/help/player-rules'],
  ['帮助与规则', 'pages/client/help/index']
]
const ruleEntries = [
  ['陪玩操作手册', 'pages/client/help/player-guide'],
  ['用户操作手册', 'pages/client/help/user-guide'],
  ['平台守则', 'pages/client/help/conduct'],
  ['使用规范', 'pages/client/help/usage'],
  ['违规订单认定与处置', 'pages/client/help/order-violations'],
  ['售后介入规范', 'pages/client/help/aftercare'],
  ['退款规则', 'pages/client/help/recharge-refund'],
  ['陪玩服务约定', 'pages/client/help/player-agreement']
]
const menuTargets = [...helpEntries,
  ['服务条款', 'pages/legal/privacy/index'],
  ['联系客服', 'pages/client/customer-service/index'],
  ['投诉与反馈', 'pages/client/complaints/index']
].map(([title, target]) => {
  const row = one(pageTree, n => hasClass(n, 'list-item') && all(n).some(c => hasClass(c, 'list-label') && c.children?.some(t => t.type === 2 && t.content === title)), title + ' entry')
  return { title, target: '/' + target, key: field(attr(row, 'bindtap'), title + ' tap') }
})
const vipSpend = one(vipTree, n => hasClass(n, 'vip-spend'), 'growth amount')
const vipSpendField = textField(vipSpend)
const record = one(vipTree, n => attr(n, 'data-action') === 'growth-records', 'growth record action')
const recordField = field(attr(record, 'catchtap'), 'growth record navigation')
assert.ok(JSON.parse(read(pagePath + '.json')).usingComponents['vip-summary-card'])

const storage = new Map(), calls = [], show = [], unmount = [], events = new Map(), components = {}, cache = {}
const snapshot = {
  id: 7, nickname: '编译检查老板', player_status: 'approved', account_status: 'active',
  cumulative_consumption_diamonds: 50,
  vip: { cumulative_consumption: '1010030.00', growth_diamonds: 10100300,
    current_tier: { name: '至臻鼠鼠', badge_color: 'supreme', benefits: ['专属KOOK房间'], feature_codes: [], min_consumption: '0.00' },
    next_tier: null, remaining_to_next: '0.00', remaining_growth_diamonds: 0, progress_percent: 100 },
  player: { id: 99, name: '编译检查陪玩', type_name: '技术陪', is_online: false, presence_online: true,
    can_accept_orders: true, total_orders: 7, avg_rating: 5, rating_count: 1 }
}
const platform = {
  getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, structuredClone(value)), removeStorageSync: key => storage.delete(key),
  $on: (name, fn) => { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(fn) },
  $off: (name, fn) => events.get(name)?.delete(fn), $emit: (name, ...args) => events.get(name)?.forEach(fn => fn(...args)),
  showToast: options => calls.push(['toast', options.title]),
  previewImage: options => calls.push(['preview-image', options])
}
const vendor = { ...vue, index: platform, onShow: fn => show.push(fn), onUnmounted: fn => unmount.push(fn),
  _export_sfc: value => value, e: Object.assign, t: String, n: value => value, s: value => value || '',
  o: value => value, p: value => value, f: (items, fn) => items.map(fn) }
const api = {
  'api/client.js': { getClientProfileApi: async () => { calls.push(['profile-read']); return structuredClone(snapshot) } },
  'api/wallet.js': { getWalletOverview: async () => { calls.push(['wallet-read']); return { balance_diamonds: 123.5 } } },
  'api/player.js': { updatePlayerOnlineStatus: async () => { throw Error('unexpected online mutation') } }
}
let Page
function load(name) {
  if (name === 'common/vendor.js') return vendor
  if (name === 'utils/nav.js') return { go: (...args) => calls.push(args), goMain: (...args) => calls.push(['tab', ...args]) }
  if (api[name]) return api[name]
  if (cache[name]) return cache[name]
  const exports = {}; cache[name] = exports
  vm.runInNewContext(read(name), { exports, console, setTimeout, clearTimeout, getCurrentPages: () => [],
    require: other => load(path.posix.normalize(path.posix.join(path.posix.dirname(name), other))),
    wx: { createPage: value => Page = value, createComponent: value => components[name] = value } }, { filename: name })
  return exports
}
load(pagePath + '.js'); load(vipPath + '.js')
const scope = vue.effectScope(), render = scope.run(() => Page.setup({}, { expose() {} }))
const draw = () => render({}, {})
const tick = () => new Promise(setImmediate)
const showPage = async () => { for (const fn of show) await fn(); await tick() }
function assertVisibleText(value, expected) {
  assert.equal(typeof value, 'string', 'native text must bind a string')
  assert.equal(value, expected)
  assert.doesNotMatch(value, /\/icons\/|^(true|false)$/)
}
function assertGuest(data) {
  assert.equal(Boolean(data[fields.guest]), true)
  assert.equal(Boolean(data[fields.wallet]), false)
  assert.equal(Boolean(data[fields.vip]), false)
  assert.equal(data[fields.vipProps], undefined)
  assert.equal(Boolean(data[fields.status]), false)
  assertVisibleText(data[fields.title], '登录后申请')
  assert.equal(data[fields.grabIcon], '/icons/themes/mist/grab.png')
  assert.equal(data[fields.centerIcon], '/icons/themes/mist/apply.png')
}
async function main() {
  try {
    const theme = load('utils/theme.js')
    for (const id of ['night', 'pink', 'mist']) {
      theme.selectTheme(id)
      const selected = theme.currentTheme.value
      const data = draw()
      for (const token of ['bg', 'surface', 'soft', 'text', 'accent']) {
        assert.ok(data[fields.themeStyle].includes(`--ui-${token}:${selected.tokens[token]}`), `profile root carries ${id} ${token} without global proxy injection`)
      }
      for (const entry of menuTargets) {
        data[entry.key]()
        assert.equal(calls.at(-1)[0], entry.target, entry.title + ' compiled WXML tap preserves its destination')
      }
    }
    const registeredPages = JSON.parse(read('app.json')).pages
    const posterPath = 'components/BossNoticePoster'
    load(posterPath + '.js')
    const posterTree = baseParse(read(posterPath + '.wxml'))
    const posterImage = one(posterTree, n => n.tag === 'image', 'notice poster image')
    assert.equal(all(posterTree).filter(n => n.tag === 'image').length, 1, 'poster is rendered once')
    assert.equal(attr(posterImage, 'mode'), 'widthFix', 'long poster keeps its full aspect ratio')
    assert.match(read(posterPath + '.wxss'), /width:100%/, 'poster follows the screen width')
    assert.doesNotMatch(read(posterPath + '.wxss'), /height:|overflow:hidden/, 'poster is not clipped to a fixed height')
    const posterRender = scope.run(() => components[posterPath + '.js'].setup({}, { expose() {} }))
    const posterData = posterRender({}, {})
    const posterSource = attr(posterImage, 'src')
    const posterUrl = posterSource.startsWith('{{') ? posterData[field(posterSource, 'poster source')] : posterSource
    assert.equal(posterUrl, 'https://api.huc125.cn/media/notices/boss-notice-20261014-q50.webp')
    assert.equal(fs.existsSync(path.join(root, 'images/notices/boss-notice.jpg')), false, 'remote poster is not duplicated in the mini-program package')
    assert.equal(fs.existsSync(path.join(root, 'images/notices/boss-notice.png')), false, 'large original PNG is not included in the mini-program package')
    assert.equal(fs.existsSync(path.join(root, 'images/notices/boss-notice-20261014-q50.webp')), false, 'selected WebP is hosted rather than packed')
    assert.match(posterUrl, /^https:\/\/api\.huc125\.cn\/media\//, 'poster uses the approved backend media domain')
    posterData[field(attr(posterImage, 'bindtap'), 'poster preview tap')]()
    assert.equal(JSON.stringify(calls.at(-1)), JSON.stringify(['preview-image', { current: posterUrl, urls: [posterUrl] }]), 'tap opens the same full image in native preview')
    function assertPosterPage(page) {
      const tree = baseParse(read(page + '.wxml'))
      one(tree, n => n.tag === 'boss-notice-poster', page + ' uses the shared poster')
      const componentPath = JSON.parse(read(page + '.json')).usingComponents['boss-notice-poster']
      assert.equal(path.posix.normalize(path.posix.join(path.posix.dirname(page), componentPath)), posterPath, 'both pages resolve the same compiled poster component')
      assert.equal(all(tree).filter(n => n.tag === 'text' || n.tag === 'button' || n.tag === 'help-article-content').length, 0, 'old notice text, buttons and sections are cleared')
    }
    assertPosterPage('pages/boss/order-notice/index')
    assert.equal(JSON.parse(read('pages/boss/order-notice/index.json')).navigationBarTitleText, '下单须知')
    const helpContent = load('content/help.js')
    const articlePath = 'pages/client/help/HelpArticleContent'
    load(articlePath + '.js')
    const articleComponent = components[articlePath + '.js']
    const articleTree = baseParse(read(articlePath + '.wxml'))
    const sectionLoop = one(articleTree, n => hasClass(n, 'help-section'), 'article sections')
    const sectionToggle = one(sectionLoop, n => hasClass(n, 'help-section-toggle'), 'section toggle')
    const sectionBody = one(sectionLoop, n => hasClass(n, 'help-section-body'), 'section body')
    const paragraph = one(sectionBody, n => hasClass(n, 'help-paragraph'), 'article paragraph')
    const articleFields = {
      title: textField(one(articleTree, n => hasClass(n, 'help-title'), 'article title')),
      audience: textField(one(articleTree, n => hasClass(n, 'help-eyebrow'), 'article audience')),
      style: field(attr(one(articleTree, n => hasClass(n, 'help-article'), 'article root'), 'style'), 'article theme'),
      sections: field(attr(sectionLoop, 'wx:for'), 'sections collection'),
      toggle: loopField(attr(sectionToggle, 'bindtap')),
      expanded: loopField(attr(sectionToggle, 'aria-expanded')),
      body: loopField(attr(sectionBody, 'wx:if')),
      paragraphs: loopField(attr(paragraph, 'wx:for')),
      text: loopField(`{{${paragraph.children.find(n => n.type === 5).content.content}}}`),
      all: field(attr(one(articleTree, n => attr(n, 'data-action') === 'toggle-all', 'all sections toggle'), 'bindtap'), 'toggle all')
    }
    for (const [title, page] of [...helpEntries, ...ruleEntries]) {
      assert.ok(registeredPages.includes(page), title + ' is registered')
      assert.equal(JSON.parse(read(page + '.json')).navigationBarTitleText, title)
      const xml = read(page + '.wxml')
      const tree = baseParse(xml)
      load(page + '.js')
      const pageRender = scope.run(() => Page.setup({}, { expose() {} }))
      const styleKey = field(attr(one(tree, n => hasClass(n, 'help-page'), 'help root'), 'style'), 'help theme style')
      for (const id of ['night', 'pink', 'mist']) {
        theme.selectTheme(id)
        assert.ok(pageRender({}, {})[styleKey].includes(`--ui-surface:${theme.currentTheme.value.tokens.surface}`), title + ' follows selected theme')
      }
      if (page.endsWith('/index')) {
        const data = pageRender({}, {})
        for (const [ruleTitle, target] of ruleEntries) {
          const action = target.split('/').at(-1)
          const key = field(attr(one(tree, n => attr(n, 'data-action') === action, action + ' help entry'), 'bindtap'), 'help navigation')
          assert.ok(all(one(tree, n => attr(n, 'data-action') === action, action)).some(n => n.type === 2 && n.content === ruleTitle), ruleTitle + ' is static native text')
          data[key](); assert.equal(calls.at(-1)[0], '/' + target)
        }
        assert.equal(all(tree).filter(n => attr(n, 'bindtap')).length, 8, 'eight localized topics are active')
        assert.doesNotMatch(xml, /老板须知|陪玩守则|help-pending/, 'hub does not repeat profile notices or show draft placeholders')
        assert.doesNotMatch(read(page + '.js'), /content\/help/, 'catalog renders without initializing the article content module')
      } else if (page.endsWith('/boss-notice')) {
        assertPosterPage(page)
        assert.equal(helpContent.getHelpArticle('boss-notice'), undefined, 'old boss notice text is removed')
      } else {
        assert.doesNotMatch(xml, /bindtap|catchtap/, title + ' wrapper cannot navigate elsewhere')
        const articleProps = field(attr(one(tree, n => n.tag === 'help-article-content', 'article component'), 'u-p'), 'article props')
        const article = pageRender({}, {})[articleProps].article
        assert.equal(article.id, page.split('/').at(-1), 'each standalone route owns its fixed article')
        assert.equal(article.title, title)
        const expected = helpContent.getHelpArticle(article.id)
        const articleRender = scope.run(() => articleComponent.setup({ article }, { expose() {} }))
        const drawArticle = () => articleRender({ article }, {})
        assertVisibleText(drawArticle()[articleFields.title], title)
        assertVisibleText(drawArticle()[articleFields.audience], article.audience === 'boss' ? '老板必读' : article.audience === 'player' ? '陪玩必读' : '老板与陪玩均适用')
        let sections = drawArticle()[articleFields.sections]
        assert.equal(sections.length, expected.sections.length)
        assert.deepEqual(sections.map(row => row[articleFields.expanded]), expected.sections.map((_, index) => index === 0), 'only first section starts expanded')
        sections[1][articleFields.toggle]()
        assert.equal(drawArticle()[articleFields.sections][1][articleFields.body], true)
        sections[1][articleFields.toggle]()
        assert.equal(drawArticle()[articleFields.sections][1][articleFields.body], false)
        const priorCalls = calls.length
        drawArticle()[articleFields.all]()
        sections = drawArticle()[articleFields.sections]
        assert.ok(sections.every(row => row[articleFields.expanded] && row[articleFields.body]), 'expand all works')
        sections.forEach((row, index) => assert.deepEqual(row[articleFields.paragraphs].map(item => item[articleFields.text]), expected.sections[index].paragraphs, 'native text matches the selected rule'))
        drawArticle()[articleFields.all]()
        assert.ok(drawArticle()[articleFields.sections].every(row => !row[articleFields.body]), 'collapse all works')
        assert.equal(calls.length, priorCalls, 'section actions never change pages')
        for (const id of ['night', 'pink', 'mist']) {
          theme.selectTheme(id)
          assert.ok(drawArticle()[articleFields.style].includes(`--ui-surface:${theme.currentTheme.value.tokens.surface}`), title + ' component has its own reactive theme tokens')
        }
      }
    }
    assert.ok(!registeredPages.includes('pages/client/help/article'), 'draft articles are not exposed')
    await showPage(); assertGuest(draw())
    assert.ok(!calls.some(c => c[0] === 'profile-read' || c[0] === 'wallet-read'), 'guests make no profile/wallet reads')
    storage.set('token', 'isolated-profile-fixture-session')
    await showPage()
    let data = draw()
    assert.equal(Boolean(data[fields.guest]), false)
    assert.equal(Boolean(data[fields.wallet]), true)
    assert.equal(Boolean(data[fields.vip]), true)
    assertVisibleText(data[fields.walletValue], '123.5')
    assert.equal(data[fields.vipProps].profile.id, 7)
    assert.equal(data[fields.vipProps].profile.vip.growth_diamonds, 10100300)
    assert.equal(Boolean(data[fields.status]), false)
    assertVisibleText(data[fields.title], '我的接单与评价')
    assert.equal(data[fields.grabIcon], '/icons/themes/mist/grab.png')
    assert.equal(data[fields.centerIcon], '/icons/themes/mist/reviews.png')
    assert.equal(calls.filter(c => c[0] === 'profile-read').length, 1)
    assert.equal(calls.filter(c => c[0] === 'wallet-read').length, 1)
    data[fields.grabAction](); data[fields.centerAction]()
    assert.equal(JSON.stringify(calls.slice(-2)), JSON.stringify([['/pages/player/grab/index'], ['/pages/player/my-orders/index']]))
    const vipProps = vue.reactive(data[fields.vipProps])
    const vipRender = scope.run(() => components[vipPath + '.js'].setup(vipProps, { expose() {} }))
    const vipData = vipRender({}, {})
    assertVisibleText(vipData[vipSpendField], '10,100,300')
    assert.equal(vipSpend.children.map(node => node.type === 2 ? node.content : node.type === 5 ? vipData[node.content.content] : '').join(''), '成长钻石 💎10,100,300')
    vipData[recordField]()
    assert.equal(JSON.stringify(calls.at(-1)), JSON.stringify(['/pages/client/growth-records/index']))
    snapshot.player.can_accept_orders = false
    await showPage(); data = draw()
    assert.equal(Boolean(data[fields.status]), true)
    assertVisibleText(data[fields.statusText], '接单已暂停')
    assertVisibleText(data[fields.title], '我的接单与评价')
    storage.delete('token'); platform.$emit(load('utils/sessionExpiry.js').SESSION_EXPIRED_EVENT, 'token')
    assertGuest(draw())
    const priorReads = calls.filter(c => c[0] === 'profile-read' || c[0] === 'wallet-read').length
    await showPage(); assertGuest(draw())
    assert.equal(calls.filter(c => c[0] === 'profile-read' || c[0] === 'wallet-read').length, priorReads)
    console.log('PASS shipped JS + matching WXML: shared full-width poster on both cleared notice pages, native image preview, three reactive themes, preserved profile menus, eight localized catalog destinations, fixed article routes and disclosure, guest/login/expiry, VIP, wallet/growth and existing quick entries. No live requests or window actions.')
  } finally { unmount.forEach(fn => fn()); scope.stop() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
