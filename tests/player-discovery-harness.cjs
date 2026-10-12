// Pure test helper: executes the real SFC, TS API and request adapter.
// Network replies, clock, storage and device information are synthetic fixtures.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('typescript')
const vue = require('vue')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { compile } = require('@vue/compiler-dom')
const root = path.resolve(__dirname, '..')
const pagePath = 'src/pages/player/list/index.vue'
const fixturePlayer = (id, extra = {}) => ({ id, name: `测试陪玩${id}`, type_id: 1, type_name: '女陪', price_extra: 0, avg_rating: 4.8, rating_count: 2, total_orders: 7, status: '在线', is_online: true, presence_online: true, can_be_designated: true, ...extra })
const plain = value => JSON.parse(JSON.stringify(value))
function nodes(node) {
  return node && typeof node === 'object' ? [node, ...(Array.isArray(node.children) ? node.children.flatMap(nodes) : [])] : []
}
function text(node) {
  return Array.isArray(node.children) ? node.children.map(text).join('') : typeof node.children === 'string' ? node.children : ''
}
function page(options = {}) {
  const requests = [], feedback = [], routes = [], modals = []
  const storage = { token: 'synthetic-client-token', admin_token: 'synthetic-admin-token' }
  const showHooks = [], eventHooks = new Map(), timers = new Map(), cache = new Map()
  let now = options.now ?? 1791723600000, timerId = 0, state
  class FixtureDate extends Date { static now() { return now } }
  const uni = {
    request: request => requests.push(request),
    getStorageSync: key => storage[key],
    setStorageSync: (key, value) => { storage[key] = value },
    removeStorageSync: key => { delete storage[key] },
    getDeviceInfo: () => ({ platform: 'android' }),
    getSystemInfoSync: () => ({ platform: 'android' }),
    showToast: value => feedback.push(plain(value)),
    showModal: value => { modals.push(value); value.success?.({ confirm: false }); value.complete?.() },
    navigateTo: value => routes.push(['navigateTo', value.url]),
    switchTab: value => routes.push(['switchTab', value.url]),
    redirectTo: value => routes.push(['redirectTo', value.url]),
    reLaunch: value => routes.push(['reLaunch', value.url]),
    $on: (event, callback) => eventHooks.set(event, callback),
    $off: event => eventHooks.delete(event),
    $emit: (event, value) => eventHooks.get(event)?.(value)
  }
  const sandbox = {
    uni, console, Date: FixtureDate, Math: Object.assign(Object.create(Math), { random: () => options.random ?? 0.123456789 }),
    getCurrentPages: () => [],
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id },
    clearTimeout: id => timers.delete(id)
  }
  function evaluate(source, filename) {
    const module = { exports: {} }
    // Only compile-time environment is replaced; API/request logic is unmodified.
    source = source.replace(/import\.meta\.env/g, '({ VITE_BASE_URL: "https://fixture.example.invalid/api" })')
    const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }, fileName: filename }).outputText
    vm.runInNewContext(output, { ...sandbox, module, exports: module.exports, require: load }, { filename })
    return module.exports
  }
  function load(name) {
    if (name === 'vue') return vue
    if (name === '@dcloudio/uni-app') return { onShow: callback => showHooks.push(callback) }
    if (name.endsWith('.vue')) return { default: {} }
    // External payment dependency is not part of the read-only list path.
    if (name === '@/api/pay') return { reconcileVirtualCheckoutByOrder() { throw new Error('Unexpected payment call') } }
    assert.ok(name.startsWith('@/'), `Unexpected module: ${name}`)
    if (!cache.has(name)) {
      const filename = path.join(root, 'src', name.slice(2) + '.ts')
      cache.set(name, evaluate(fs.readFileSync(filename, 'utf8'), filename))
    }
    return cache.get(name)
  }
  const descriptor = parse(fs.readFileSync(path.join(root, pagePath), 'utf8')).descriptor
  const script = compileScript(descriptor, { id: 'discovery-behavior-test' })
  const component = evaluate(script.content, pagePath).default
  const renderer = vue.createRenderer({
    createElement: tag => ({ tagName: tag.toUpperCase(), addEventListener() {}, removeEventListener() {} }), createText: () => ({}), createComment: () => ({}),
    insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
    parentNode: () => null, nextSibling: () => null
  })
  // uni input host is not a browser DOM; keep the compiled model-update handler,
  // but omit runtime-dom's document-dependent input directive hooks.
  const render = new Function('Vue', compile(descriptor.template.content, { mode: 'function', prefixIdentifiers: true, isCustomElement: () => true }).code)({ ...vue, vModelText: {} })
  let tree
  const app = renderer.createApp({
    setup(props, context) { state = component.setup(props, context); return { ...state } },
    render() { tree = render(this, []); return tree }
  })
  app.config.globalProperties.$appThemeStyle = ''
  app.mount({})
  const draw = () => { app._instance.update(); return tree }
  const elements = className => nodes(draw()).filter(node => node.props?.class?.split(' ').includes(className))
  async function settle(index, data = [], statusCode = 200) {
    assert.ok(requests[index], `Missing request ${index}`)
    requests[index].success({ statusCode, data })
    await flush()
  }
  async function fail(index) { requests[index].fail({ errMsg: 'synthetic transport failure' }); await flush() }
  async function flush() { await Promise.resolve(); await Promise.resolve(); await vue.nextTick() }
  async function runTimers() {
    const current = [...timers.entries()]
    for (const [id, timer] of current) { timers.delete(id); timer.callback() }
    await flush()
  }
  return { state, uni, requests, feedback, routes, storage, modals, timers, eventHooks, elements, draw, text,
    api: load('@/api/boss'), show: () => showHooks[0](), settle, fail, flush, runTimers,
    unmount: () => app.unmount(), setNow: value => { now = value }, descriptor }
}
module.exports = { page, fixturePlayer, plain, nodes, text, root, pagePath }
