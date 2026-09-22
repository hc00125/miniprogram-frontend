const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const ts = require('typescript')
const { parse } = require('@vue/compiler-sfc')
const root = path.join(__dirname, '..')
// Execute actual page script + handler named by the template; only platform/UI boundaries are mocked.
function page(kind, outcome = 'fail', error = { errMsg: 'setClipboardData:fail auth deny', errno: 103 }) {
  const calls = [], modals = [], toasts = [], logs = []
  let options
  const uni = {
    setClipboardData(o) { calls.push(o.data); options = o; if (outcome === 'throw') throw error; if (outcome === 'fail') o.fail?.(error); if (outcome === 'success') o.success?.({ errMsg: 'setClipboardData:ok' }) },
    showModal: o => modals.push(o), showToast: o => toasts.push(o),
    $on() {}, $off() {}, getStorageSync: () => 'test-session'
  }
  const mocks = {
    vue: { ref: value => ({ value }), reactive: v => v, computed: f => ({ get value() { return f() } }) },
    '@dcloudio/uni-app': { onShow() {}, onLoad() {}, onHide() {}, onUnload() {} },
    '@/utils/sessionExpiry': { SESSION_EXPIRED_EVENT: 'expired' }
  }
  function load(file, extra = '') {
    const module = { exports: {} }
    const content = fs.readFileSync(file, 'utf8')
    const source = file.endsWith('.vue') ? parse(content).descriptor.scriptSetup.content : content
    vm.runInNewContext(ts.transpileModule(source + extra, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2018 } }).outputText, {
      module, exports: module.exports, uni, wx: uni, Date, setInterval, clearInterval,
      console: { log: (...x) => logs.push(x), warn: (...x) => logs.push(x), error: (...x) => logs.push(x) },
      require(name) {
        if (mocks[name]) return mocks[name]
        if (name === '@/utils/clipboard') return load(path.join(root, 'src/utils/clipboard.ts'))
        if (name === './state') return load(path.join(path.dirname(file), 'state.ts'))
        return {}
      }
    })
    return module.exports
  }
  const file = path.join(root, kind === 'kook' ? 'src/pages/player/kook-binding/index.vue' : 'src/pages/client/customer-service/index.vue')
  const template = parse(fs.readFileSync(file, 'utf8')).descriptor.template.content
  const expression = template.match(kind === 'kook' ? /@tap="([^"]+)"[^>]*>复制私信指令/ : /@tap="([^"]+)"[^>]*>复制<\/button>/)?.[1]
  assert.ok(expression, 'copy button must have a tap handler')
  const extra = kind === 'kook' ? '\nmodule.exports = { s, trigger: () => ' + expression + '() };' : '\nmodule.exports = { trigger: (contact) => ' + expression + ' };'
  const p = load(file, extra)
  if (p.s) Object.assign(p.s, { code: 'TEST-SECRET', challenge: { status: 'pending', expires_at: new Date(Date.now() + 60000).toISOString() } })
  return { ...p, calls, modals, toasts, logs, template, callback: () => options }
}
test('platform failure categories remain distinct and arbitrary details are not displayed', () => {
  const cases = [
    [{ errno: 104 }, 'PRIVACY_NOT_AGREED/104'],
    [{ errno: 103 }, 'DENIED/103'],
    [{ errMsg: 'setClipboardData:fail appid privacy api banned' }, 'PRIVACY_BANNED/NA'],
    [{ errMsg: 'setClipboardData:fail auth deny' }, 'DENIED/NA'],
    [{ errMsg: 'arbitrary TEST-SECRET test-contact', errno: 'test-contact' }, 'FAILED/NA']
  ]
  for (const kind of ['kook', 'support']) for (const [error, marker] of cases) {
    const p = page(kind, 'fail', error)
    p.trigger({ wechat_id: 'test-contact' })
    assert.ok(p.modals[0].content.includes(marker))
    assert.equal(p.calls.length, 1, 'never retry or auto-authorize')
    assert.doesNotMatch(JSON.stringify([p.modals, p.logs]), /TEST-SECRET|test-contact/)
  }
})

test('pending and successful native writes never invent/duplicate a success toast', () => {
  for (const kind of ['kook', 'support']) for (const outcome of ['pending', 'success']) {
    const p = page(kind, outcome)
    p.trigger({ wechat_id: ' test-contact ' })
    assert.equal(p.calls[0], kind === 'kook' ? 'bind TEST-SECRET' : 'test-contact')
    assert.equal(typeof p.callback().fail, 'function', 'explicit callback prevents uni unhandled Promise rejection')
    assert.equal(p.toasts.length, 0)
    assert.equal(p.modals.length, 0)
    assert.equal(p.logs.length, 0)
  }
})

test('expired KOOK code and empty contact never reach clipboard', () => {
  const k = page('kook')
  k.s.challenge.expires_at = new Date(Date.now() - 1000).toISOString()
  k.trigger()
  assert.equal(k.calls.length, 0)
  assert.equal(k.s.code, '')
  const s = page('support')
  s.trigger({ wechat_id: '  ' })
  assert.equal(s.calls.length, 0)
})

test('manual fallback texts actually enable WeChat long-press selection', () => {
  for (const kind of ['kook', 'support']) {
    const p = page(kind)
    const text = p.template.match(kind === 'kook' ? /<text[^>]*class="code"[^>]*>/ : /<text[^>]*class="wechat-id"[^>]*>/)?.[0]
    assert.match(text, /\buser-select(?:\s|>|=)/, `${kind}: fallback must be selectable`)
  }
})

test('native synchronous exceptions are contained with failure feedback', () => {
  for (const kind of ['kook', 'support']) {
    const p = page(kind, 'throw', { errMsg: 'setClipboardData:fail internal TEST-SECRET test-contact', errCode: -1 })
    assert.doesNotThrow(() => p.trigger({ wechat_id: 'test-contact' }))
    assert.equal(p.modals.length, 1)
    assert.match(p.modals[0].content, /FAILED\/-1/)
    assert.equal(p.toasts.length, 0)
    assert.doesNotMatch(JSON.stringify([p.modals, p.logs]), /TEST-SECRET|test-contact/)
  }
})

test('both entries preserve controlled failure codes without leaking clipboard or raw errors', () => {
  for (const kind of ['kook', 'support']) {
    const p = page(kind, 'fail', { errMsg: 'setClipboardData:fail api scope is not declared in the privacy agreement TEST-SECRET test-contact', errno: 112 })
    p.trigger({ wechat_id: 'test-contact' })
    assert.equal(p.modals.length, 1)
    assert.match(p.modals[0].content, /PRIVACY_DECLARATION\/112/)
    assert.doesNotMatch(JSON.stringify([p.modals, p.logs]), /TEST-SECRET|test-contact|api scope is not declared/)
    assert.equal(p.toasts.length, 0)
  }
})

test('KOOK tap reaches clipboard and a denied native call is not silently lost', () => {
  const p = page('kook')
  p.trigger()
  assert.equal(p.calls.length, 1, 'tap handler must reach clipboard')
  assert.equal(p.modals.length, 1, 'failure must show actionable feedback')
  assert.equal(p.toasts.length, 0, 'failure must not show success')
})
