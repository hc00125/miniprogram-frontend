const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const vue = require('vue')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { renderToString } = require('@vue/server-renderer')
const root = path.join(__dirname, '..')
function load(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const code = file.endsWith('.vue') ? compileScript(parse(source, { templateParseOptions: { isCustomElement: t => ['view', 'text', 'image', 'scroll-view'].includes(t) } }).descriptor, { id: 'gift-test', inlineTemplate: true, templateOptions: { isCustomElement: t => ['view', 'text', 'image', 'scroll-view'].includes(t), compilerOptions: { isCustomElement: t => ['view', 'text', 'image', 'scroll-view'].includes(t) } } }).content : source
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(id => id.startsWith('@/') ? load('src/' + id.slice(2) + (id.endsWith('.vue') ? '' : '.ts')) : require(id), mod, mod.exports)
  return mod.exports
}
const rose = { code: 'rose', name: '玫瑰长名称', image_url: '', price_diamonds: 12, description: '' }
const render = (component, props) => renderToString(vue.createSSRApp(component, props))
function nodes(vnode, all = []) {
  if (vnode && typeof vnode === 'object') { all.push(vnode); if (Array.isArray(vnode.children)) vnode.children.forEach(n => nodes(n, all)) }
  return all
}
test('real GiftGrid SFC renders empty, missing image, integer price and selection; tap emits only selection', async () => {
  const Grid = load('src/components/gifts/GiftGrid.vue').default
  assert.match(await render(Grid, { items: [] }), /暂无可选礼物/)
  const html = await render(Grid, { items: [rose], selectedCode: 'rose' })
  assert.match(html, /玫瑰长名称/); assert.match(html, /12 钻石/); assert.match(html, /暂无图片/); assert.match(html, /gift-item--selected/)
  const events = []
  const draw = Grid.setup({ items: [rose], selectedCode: '', emptyText: '空' }, { expose() {}, emit: (...args) => events.push(args) })
  nodes(draw({ items: [rose], selectedCode: '' }, [])).find(n => n.props && n.props.onTap).props.onTap()
  assert.equal(events[0][0], 'select'); assert.equal(events[0][1].code, 'rose')
})

test('real GiftSheet keeps recipient fixed, tabs/total/unknown balance, fail-closed action and clears on account switch', async () => {
  const Sheet = load('src/components/gifts/GiftSheet.vue').default
  const props = vue.reactive({ open: true, accountId: 'a', recipient: { id: 'p', name: '固定收礼人' }, catalog: [rose], inventory: [], capabilities: { purchase_enabled: true, inventory_send_enabled: true }, balanceDiamonds: null, loading: false, error: '', maxQuantity: 5 })
  const html = await render(Sheet, props)
  for (const text of ['固定收礼人', '我的礼物', '购买后赠送', '暂未开放', '余额暂不可用']) assert.ok(html.includes(text), text)
  const events = []
  const scope = vue.effectScope()
  const draw = scope.run(() => Sheet.setup(props, { expose() {}, emit: (...args) => events.push(args) }))
  const tree = () => nodes(draw(props, []))
  tree().find(n => n.props && n.props.onSelect).props.onSelect(rose)
  tree().find(n => n.props && n.props['data-action'] === 'increase').props.onTap()
  props.balanceDiamonds = 1
  const selected = tree()
  assert.ok(selected.some(n => typeof n.children === 'string' && n.children.includes('24 钻石')))
  assert.ok(selected.some(n => typeof n.children === 'string' && n.children.includes('余额不足')))
  assert.equal(selected.find(n => n.props && n.props['data-action'] === 'submit').props.disabled, true)
  tree().find(n => n.props && n.props['data-action'] === 'inventory').props.onTap()
  assert.ok(tree().some(n => typeof n.children === 'string' && n.children.includes('不额外扣钻石')))
  props.accountId = 'b'
  await vue.nextTick()
  assert.equal(tree().some(n => n.props && n.props['data-action'] === 'submit'), false)
  assert.ok(events.some(e => e[0] === 'close'))
  scope.stop()
})

test('grid image errors retain actual name and price without substituting a product', () => {
  const Grid = load('src/components/gifts/GiftGrid.vue').default
  const item = { ...rose, image_url: 'https://example.invalid/rose.png' }
  const props = { items: [item], selectedCode: '', emptyText: '空' }
  const draw = Grid.setup(props, { expose() {}, emit() {} })
  let tree = nodes(draw(props, []))
  tree.find(n => n.props && n.props.onError).props.onError()
  tree = nodes(draw(props, []))
  assert.equal(tree.some(n => n.type === 'image'), false)
  assert.ok(tree.some(n => n.children === '暂无图片'))
  assert.ok(tree.some(n => n.children === rose.name))
  assert.ok(tree.some(n => n.children === '12 钻石'))
})

test('sheet defaults closed capabilities, shows loading/error without fake inventory, and close dismisses immediately', async () => {
  const Sheet = load('src/components/gifts/GiftSheet.vue').default
  const props = { open: true, accountId: 'a', recipient: { id: 'p', name: '陪玩' } }
  assert.match(await render(Sheet, props), /礼物交易暂未开放/)
  assert.match(await render(Sheet, { ...props, loading: true }), /正在加载礼物/)
  assert.match(await render(Sheet, { ...props, error: 'network' }), /礼物加载失败/)
  assert.ok(!(await render(Sheet, { ...props, open: false })).includes('gift-sheet'))
  const complete = vue.reactive({ ...props, catalog: [], inventory: [], capabilities: { purchase_enabled: false, inventory_send_enabled: false }, balanceDiamonds: null, loading: false, error: '', maxQuantity: 1 })
  const scope = vue.effectScope()
  const events = []
  const draw = scope.run(() => Sheet.setup(complete, { expose() {}, emit: (...e) => events.push(e) }))
  nodes(draw(complete, [])).find(n => n.props && n.props['aria-label'] === '关闭礼物面板').props.onTap()
  assert.equal(nodes(draw(complete, [])).some(n => n.props && n.props['data-action'] === 'submit'), false)
  assert.equal(events[0][0], 'close')
  scope.stop()
})

exports.load = load
exports.nodes = nodes
