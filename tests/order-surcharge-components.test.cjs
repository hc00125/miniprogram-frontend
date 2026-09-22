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
  assert.ok(fs.existsSync(path.join(root, file)), `component foundation must exist: ${file}`)
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const isCustomElement = t => ['view', 'text', 'image', 'scroll-view'].includes(t)
  const code = file.endsWith('.vue') ? compileScript(parse(source, { templateParseOptions: { isCustomElement } }).descriptor, { id: 'surcharge-test', inlineTemplate: true, templateOptions: { compilerOptions: { isCustomElement } } }).content : source
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(id => id.startsWith('@/') ? load('src/' + id.slice(2) + (id.endsWith('.vue') ? '' : '.ts')) : require(id), mod, mod.exports)
  return mod.exports
}
function nodes(vnode, all = []) {
  if (vnode && typeof vnode === 'object') { all.push(vnode); if (Array.isArray(vnode.children)) vnode.children.forEach(n => nodes(n, all)) }
  return all
}
test('pending and unknown only offer original-order recovery, show prohibitions and never enable payment', async () => {
  const Sheet = load('src/components/orders/OrderSurchargeSheet.vue').default
  const props = vue.reactive(base()), events = [], scope = vue.effectScope()
  const draw = scope.run(() => Sheet.setup(props, { expose() {}, emit: (...e) => events.push(e) }))
  const tree = () => nodes(draw(props, []))
  for (const status of ['processing', 'unknown']) {
    props.readState = { order_no: props.orderNo, account_id: 'a', session_key: 'login-1', eligible: false, blocked_reason: '订单已有陪玩接单', payment_status: status, surcharge_no: '加价/旧单' }
    assert.ok(tree().some(n => typeof n.children === 'string' && n.children.includes('勿重复支付')))
    assert.ok(tree().some(n => n.children === '订单已有陪玩接单'))
    assert.equal(tree().find(n => n.type === 'input').props.disabled, true)
    tree().find(n => n.props && n.props['data-action'] === 'query-original').props.onTap()
    assert.deepEqual(events.at(-1), ['query-original', { order_no: props.orderNo, surcharge_no: '加价/旧单' }])
  }
  props.readState = { ...props.readState, eligible: true, blocked_reason: '', payment_status: 'paid' }
  assert.equal(tree().find(n => n.props && n.props['data-action'] === 'submit').props.disabled, true)
  props.readState = { ...props.readState, session_key: 'old-login', blocked_reason: '旧会话秘密' }
  assert.ok(!tree().some(n => n.children === '旧会话秘密'))
  assert.ok(!tree().some(n => n.props && n.props['data-action'] === 'query-original'))
  props.readState = null; props.loading = true
  assert.ok(tree().some(n => typeof n.children === 'string' && n.children.includes('正在读取')))
  props.loading = false; props.error = 'network'
  assert.ok(tree().some(n => typeof n.children === 'string' && n.children.includes('读取失败')))
  scope.stop()
})
test('close, account switch, same-account re-login and order change clear draft immediately; recharge never submits', () => {
  const Sheet = load('src/components/orders/OrderSurchargeSheet.vue').default
  for (const change of [p => { p.accountId = 'b' }, p => { p.sessionKey = 'login-2' }, p => { p.orderNo = '另一单' }, p => { p.playerCount = 4 }]) {
    const props = vue.reactive(base()), events = [], scope = vue.effectScope()
    const draw = scope.run(() => Sheet.setup(props, { expose() {}, emit: (...e) => events.push(e) }))
    const tree = () => nodes(draw(props, []))
    tree().find(n => n.type === 'input').props.onInput({ detail: { value: '25' } })
    props.rechargeRevision++
    assert.ok(tree().some(n => typeof n.children === 'string' && n.children.includes('重新确认')))
    assert.deepEqual(events, [])
    change(props)
    assert.ok(!tree().some(n => n.type === 'input'))
    assert.deepEqual(events, [['close']])
    props.open = false; props.open = true
    assert.equal(tree().find(n => n.type === 'input').props.value, '')
    tree().find(n => n.props && n.props['aria-label'] === '关闭加价面板').props.onTap()
    assert.ok(!tree().some(n => n.type === 'input'))
    scope.stop()
  }
})
test('only host-provided positive integer presets appear; choosing never charges or multiplies by people', () => {
  const Sheet = load('src/components/orders/OrderSurchargeSheet.vue').default
  const props = vue.reactive({ ...base(), presets: [10, 10, 30, 0, -1, 2.5, NaN, Number.MAX_SAFE_INTEGER + 1] })
  const scope = vue.effectScope(), events = []
  const draw = scope.run(() => Sheet.setup(props, { expose() {}, emit: (...e) => events.push(e) }))
  const tree = () => nodes(draw(props, []))
  const presets = tree().filter(n => n.props && n.props['data-action'] === 'preset')
  assert.equal(presets.length, 2)
  presets[1].props.onTap()
  assert.equal(tree().find(n => n.type === 'input').props.value, '30')
  assert.deepEqual(events, [])
  props.presets = []
  assert.equal(tree().filter(n => n.props && n.props['data-action'] === 'preset').length, 0)
  scope.stop()
})
const base = () => ({ open: true, accountId: 'a', sessionKey: 'login-1', orderNo: '原单/一 #', playerCount: 3, balanceDiamonds: null, readState: null, loading: false, error: '', presets: [], rechargeRevision: 0 })
test('real surcharge SFC shows fixed order/people, whole-order integer total and permanently disabled payment', async () => {
  const Sheet = load('src/components/orders/OrderSurchargeSheet.vue').default
  const html = await renderToString(vue.createSSRApp(Sheet, base()))
  for (const text of ['原单/一 #', '3 人', '整单额外加价', '不是每人加价', '暂未开放', '余额暂不可用']) assert.ok(html.includes(text), text)
  const props = vue.reactive(base()), events = [], scope = vue.effectScope()
  const draw = scope.run(() => Sheet.setup(props, { expose() {}, emit: (...e) => events.push(e) }))
  const tree = () => nodes(draw(props, []))
  tree().find(n => n.type === 'input').props.onInput({ detail: { value: '25' } })
  assert.ok(tree().some(n => typeof n.children === 'string' && n.children.includes('25 钻石')))
  assert.ok(!tree().some(n => typeof n.children === 'string' && n.children.includes('75 钻石')))
  props.balanceDiamonds = 1
  assert.ok(tree().some(n => typeof n.children === 'string' && n.children.includes('余额不足')))
  for (const value of ['1.5', '0', '-1', '1e2', '9007199254740992']) {
    tree().find(n => n.type === 'input').props.onInput({ detail: { value } })
    assert.ok(tree().some(n => typeof n.children === 'string' && n.children.includes('正整数')))
  }
  const submit = tree().find(n => n.props && n.props['data-action'] === 'submit')
  assert.equal(submit.props.disabled, true)
  assert.equal(submit.props.onTap, undefined)
  assert.deepEqual(events, [])
  scope.stop()
})
