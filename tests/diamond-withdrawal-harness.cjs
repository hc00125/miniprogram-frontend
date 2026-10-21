const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), vue = require('vue')
const { parse, compileScript } = require('@vue/compiler-sfc')
const root = path.join(__dirname, '..')
const tick = () => new Promise(setImmediate)
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b }); return { promise, resolve, reject } }
const receipt = (data = {}) => ({ withdrawal_no: 'WD-1', amount: 12, payment_method: 'diamonds', payment_method_text: '提现为钻石', status: 'paid', status_text: '已兑换', account_name: '', account_no_masked: '', request_id: data.request_id, diamond_amount: Number(data.amount || 12), diamond_balance_after: 12.5, target_profile_id: 41, actor_user_id: 71, created_at: '2026-10-17T12:00:00Z', ...data })
async function setup(t, options = {}) {
  const storage = structuredClone(options.storage || { token: 'session-A', client_profile: { id: 41, player: { id: 11 } } })
  const hooks = { show: [], unload: [], hide: [] }, events = {}, calls = { request: [], confirm: [], success: [], toast: [], saved: [] }, cache = {}
  const uni = {
    getStorageSync: k => storage[k], setStorageSync: (k,v) => { if(options.storageFail) throw Error('storage full'); storage[k] = structuredClone(v) }, removeStorageSync: k => { delete storage[k] },
    $on: (k,f) => { (events[k] ||= []).push(f) }, $off: (k,f) => { events[k] = (events[k] || []).filter(x => x !== f) }, $emit: (k,...args) => (events[k] || []).forEach(f => f(...args)),
    getDeviceInfo: () => ({ platform: 'ios' }),
    getRandomValues: ({ length, success }) => success({ randomValues: Uint8Array.from({length}, (_,i) => (i*17 + 3) % 256).buffer }),
    request: args => {
      const call = { url: args.url.replace(/^https?:\/\/[^/]+\/api/, ''), method: args.method, data: structuredClone(args.data), header: {...args.header}, storage: structuredClone(storage) }; calls.request.push(call)
      let result
      if (options.transport) result = options.transport(call, calls)
      if (result === undefined) {
        if (call.url.endsWith('/overview')) result = { player_id: storage.client_profile.player.id, available_balance: options.balance ?? '12.99', can_withdraw: options.allowed ?? true, debt_balance: options.debt ?? 0, min_withdrawal_amount: 0.1 }
        else if (call.url === '/client/profile') result = { ...storage.client_profile, wallet: { balance_diamonds: 12.5 } }
        else if (call.url.endsWith('/settlements') || (call.url.endsWith('/withdrawals') && call.method === 'GET')) result = { results: options.history || [] }
        else if (call.method === 'POST') result = receipt(call.data)
        else result = { error: { statusCode: 404, detail: '未找到' } }
      }
      Promise.resolve(result).then(r => { if(r?.error) { if(r.error.statusCode) args.success({statusCode:r.error.statusCode,data:r.error}); else args.fail(r.error) } else args.success({ statusCode: 200, data: r }) }, e => args.fail(e))
    }
  }
  const overrides = {
    // No DOM lifecycle in this renderer; keep real Vue reactivity and SFC event handlers.
    vue: { ...vue, withDirectives: vnode => vnode },
    '@dcloudio/uni-app': { onShow: fn => hooks.show.push(fn), onHide: fn => hooks.hide.push(fn), onUnload: fn => hooks.unload.push(fn) },
    '@/utils/client': { isApprovedPlayer: async () => options.approved ? options.approved(storage) : true, saveClientProfile: p => { calls.saved.push(p); storage.client_profile = structuredClone(p) } },
    '@/utils/nav': { replace() {} },
    '@/utils/feedback': { confirm: async (...args) => { calls.confirm.push(args); return options.confirm ? options.confirm(...args) : true }, success: s => calls.success.push(s), toast: s => calls.toast.push(s), getErrorMessage: (e,f) => load('src/utils/feedback.ts').getErrorMessage(e,f) },
    '@/utils/sessionExpiry': { SESSION_EXPIRED_EVENT: 'session:expired', getClientSessionGeneration: () => '0', handleSessionExpiry: () => null }, '@/utils/accountRestriction': { showAccountRestrictionModal: () => {} }
  }
  function load(file) {
    if(cache[file]) return cache[file].exports
    let source = fs.readFileSync(path.join(root,file), 'utf8'), mod = cache[file] = { exports: {} }
    if(file.endsWith('.vue')) source = compileScript(parse(source, { templateParseOptions: { isCustomElement: () => true } }).descriptor, {id:'diamond-withdrawal',inlineTemplate:true,templateOptions:{compilerOptions:{isCustomElement:()=>true}}}).content
    source = source.replace(/import\.meta\.env/g, '(' + JSON.stringify({VITE_BASE_URL:'https://fixture.invalid/api',VITE_IOS_PURCHASE_ENABLED: options.iosDisabled ? 'false' : 'true'}) + ')')
    const code = ts.transpileModule(source, { compilerOptions: { module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020 } }).outputText
    new Function('require','module','exports','uni','wx','globalThis',code)(id => overrides[id] || (id.startsWith('@/') ? load('src/'+id.slice(2)+(id.endsWith('.vue')?'':'.ts')) : require(id)),mod,mod.exports,uni,uni,{crypto:options.nativeUUID ? undefined : globalThis.crypto,wx:uni})
    return mod.exports
  }
  const component = load('src/pages/player/earnings/index.vue').default, scope = vue.effectScope()
  const draw = scope.run(() => component.setup({}, {expose(){}}))
  function nodes(v,out=[]) {if(v && typeof v === 'object') {out.push(v);if(Array.isArray(v.children))v.children.forEach(n=>nodes(n,out))}return out}
  const tree = () => nodes(draw({$appThemeStyle:''}, [])), text = () => tree().filter(n=>typeof n.children === 'string').map(n=>n.children).join('|')
  const button = () => tree().find(n=>n.type==='button' && n.props?.class==='withdraw-btn')
  const f = { storage, uni, calls, hooks, tree, text, button, load, refresh: () => hooks.show[0](), method: i => tree().find(n=>n.type==='picker').props.onChange({detail:{value:String(i)}}), input: (i,s) => tree().filter(n=>n.type==='input')[i].props['onUpdate:modelValue'](s), all: () => tree().find(n=>n.props?.class==='all-link').props.onTap(), tap: () => button().props.onTap() }
  t.after(() => { hooks.unload.forEach(fn=>fn());scope.stop() })
  await f.refresh(); return f
}
module.exports = { setup, tick, receipt, deferred }
