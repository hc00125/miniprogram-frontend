// Replay real isolated Django HTTP JSON through the real TS API and Vue SFC.
// Usage: node tests/rankings-backend.integration.cjs <captured-responses.json>
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const ts = require('typescript'), vue = require('vue')
const { harness, nodes } = require('./commerce-sfc-harness.cjs')
if (!process.argv[2]) throw new Error('Pass JSON captured by test_actual_http_responses_for_frontend_integration')
const responses = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const source = fs.readFileSync(path.join(__dirname, '../src/api/rankings.ts'), 'utf8')
  .replace('import.meta', '({ env: { VITE_RANKINGS_API_PATH: "/rankings/" } })')
const mod = { exports: {} }, requests = []
new Function('require', 'module', 'exports', 'uni', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText)(id => id === '@/utils/diamonds' ? harness().load('src/utils/diamonds.ts') : { BASE_URL: 'https://isolated.invalid/api' }, mod, mod.exports, {
  request(options) {
    requests.push(options)
    assert.equal(options.method, 'GET'); assert.equal(options.header, undefined)
    assert.equal(options.url, 'https://isolated.invalid/api/rankings/')
    const response = responses[`${options.data.board}:${options.data.period}`]
    assert.equal(response.statusCode, 200)
    options.success(response)
  }
})
const h = harness({ vue: { ...vue, onBeforeUnmount() {} }, '@/api/rankings': mod.exports })
const scope = vue.effectScope(), C = h.load('src/pages/client/rankings/index.vue').default
const draw = scope.run(() => C.setup({}, { expose() {} }))
const tree = () => nodes(draw({}, []))
const action = key => tree().find(n => n.props?.['data-action'] === key)
const text = () => tree().filter(n => typeof n.children === 'string').map(n => n.children).join('|')
const tick = () => new Promise(setImmediate)
;(async () => {
  try {
    await h.hooks.show[0](); await tick()
    for (const board of ['boss', 'player']) {
      action(`board-${board}`).props.onTap(); await tick()
      for (const period of ['day', 'week', 'month']) {
        action(`period-${period}`).props.onTap(); await tick()
        const expected = responses[`${board}:${period}`].data
        assert.deepEqual(mod.exports.parseRankings(expected, board, period).results, expected.results)
        assert.ok(action('ranking-row')); assert.ok(!action('error')); assert.ok(!action('empty'))
        assert.ok(!action('unavailable')); assert.ok(!action('loading'))
        assert.match(text(), board === 'boss' ? /联调老板/ : /公开陪玩/)
        assert.match(text(), board === 'boss' ? /123\.5/ : /1/)
        assert.match(text(), board === 'boss' ? /冠名线下退款暂不自动同步/ : /仅统计最终成功完成/)
      }
    }
    assert.ok(requests.length >= 6)
    console.log('PASS: both boards × day/week/month: real PostgreSQL Django JSON -> actual TS API/parser -> actual Vue SFC; anonymous GET only. Synthetic isolated DB fixtures, no production traffic.')
  } finally { scope.stop() }
})().catch(error => { console.error(error); process.exitCode = 1 })
