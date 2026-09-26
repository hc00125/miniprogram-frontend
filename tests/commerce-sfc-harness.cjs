const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), vue = require('vue')
const { parse, compileScript } = require('@vue/compiler-sfc')
const { renderToString } = require('@vue/server-renderer')
const root = path.join(__dirname, '..')
function harness(overrides = {}) {
  const hooks = { show: [], hide: [], unload: [], mounted: [] }, events = {}, storage = { token: 'fixture-session-a', client_profile: { id: 1 } }
  overrides = { vue: { ...vue, onMounted: f => hooks.mounted.push(f) }, ...overrides }
  const uni = { getStorageSync: k => storage[k], $on: (k,f) => {events[k] = f}, $off: k => {delete events[k]} }
  const custom = t => ['view','text','image','scroll-view'].includes(t)
  function load(file) {
    const source = fs.readFileSync(path.join(root, file), 'utf8'), mod = { exports: {} }
    const code = file.endsWith('.vue') ? compileScript(parse(source, { templateParseOptions: { isCustomElement: custom } }).descriptor, { id: 'commerce-host', inlineTemplate: true, templateOptions: { compilerOptions: { isCustomElement: custom } } }).content : source
    new Function('require','module','exports','uni', ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(id => overrides[id] || (id === '@/utils/purchaseAvailability' ? {getClientPlatform:()=> 'android',isIOSPurchaseEnabled:()=>true} : id === '@/utils/request' ? { BASE_URL: 'https://fixture.invalid/api' } : id === '@dcloudio/uni-app' ? { onShow: f => hooks.show.push(f), onHide: f => hooks.hide.push(f), onUnload: f => hooks.unload.push(f) } : id.startsWith('@/') ? load('src/' + id.slice(2) + (id.endsWith('.vue') ? '' : '.ts')) : require(id)), mod, mod.exports, uni)
    return mod.exports
  }
  return { load, hooks, storage, events, uni }
}
function nodes(v, out=[]) { if (v && typeof v === 'object') {out.push(v); if(Array.isArray(v.children)) v.children.forEach(c=>nodes(c,out))} return out }

exports.harness=harness; exports.nodes=nodes
