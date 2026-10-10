// Replay captured Django HTTP JSON through the real TS API and Vue SFC.
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
const h = harness({ vue: { ...vue, onBeforeUnmount() {} }, '@/components/PatronageWallPanel.vue': { default: { name: 'PatronageWallPanel', props: ['embedded'] } }, '@/api/rankings': mod.exports })
const scope = vue.effectScope(), C = h.load('src/pages/client/rankings/index.vue').default
const draw = scope.run(() => C.setup({}, { expose() {} }))
const tree = () => nodes(draw({}, []))
const action = key => tree().find(n => n.props?.['data-action'] === key)
const text = () => tree().filter(n => typeof n.children === 'string').map(n => n.children).join('|')
const tick = () => new Promise(setImmediate)
;(async () => {
  try {
    await h.hooks.show[0](); await tick()
    assert.equal(requests.length, 0, 'the default crown tab must not fetch contribution/order statistics')
    for (const board of ['boss', 'player']) {
      action(`board-${board}`).props.onTap(); await tick()
      for (const period of ['day', 'week', 'month']) {
        action(`period-${period}`).props.onTap(); await tick()
        const expected = responses[`${board}:${period}`].data
        assert.deepEqual(mod.exports.parseRankings(expected, board, period).results, expected.results)
        assert.ok(action('ranking-row')); assert.ok(!action('error')); assert.ok(!action('empty'))
        assert.ok(!action('unavailable')); assert.ok(!action('loading'))
        assert.equal(tree().filter(n => n.props?.['data-action'] === 'ranking-row').length, expected.results.length)
        for (const row of expected.results) {
          assert.ok(text().includes(row.name))
          assert.ok(text().includes(String(row.value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')))
        }
        assert.equal(action('ranking-rules'), undefined)
      }
    }
    assert.ok(requests.length >= 6)
    console.log('PASS: both boards × day/week/month: captured HTTP JSON -> actual TS API/parser -> actual Vue SFC; all rows match, anonymous GET replay, no network during replay.')
  } finally { scope.stop() }
})().catch(error => { console.error(error); process.exitCode = 1 })
