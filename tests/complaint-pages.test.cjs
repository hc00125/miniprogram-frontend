const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
function page(name, mocks = {}) {
  const file = path.join(__dirname, '../src/pages/client/complaints', name + '.vue')
  assert.ok(fs.existsSync(file), name + '页面尚未实现')
  const source = fs.readFileSync(file, 'utf8')
  const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const loads = [], shows = []
  const vue = { ref: v => ({ value: v }), reactive: v => v, computed: fn => ({ get value() { return fn() } }), onUnmounted: () => {} }
  const uni = { getStorageSync: () => 'user', $on: () => {}, $off: () => {}, showToast: () => {}, navigateTo: () => {} }
  const api = { complaintDraftOwner: () => 'user', saveComplaintDraft: () => {}, readComplaintDraft: () => null, newRequestId: () => 'id', categoryLabels: { service: '服务问题' }, statusLabels: { pending: '待处理' }, ...mocks }
  const expose = name === 'create' ? '{ form, images, submission, sending, submit, error }' : name === 'index' ? '{ items, load, error, hasMore }' : '{ complaint, content, images, send, sending, error }'
  const js = ts.transpileModule(script + '\n;globalThis.state = ' + expose, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2018 } }).outputText
  const context = { exports: {}, uni, console, require: n => n === 'vue' ? vue : n === '@dcloudio/uni-app' ? { onLoad: fn => loads.push(fn), onShow: fn => shows.push(fn), onUnload: () => {} } : n === '@/api/complaints' ? api : n === '@/utils/sessionExpiry' ? { SESSION_EXPIRED_EVENT: 'session:expired' } : { getErrorMessage: e => e.handled ? '' : e.message || e.detail || '失败' } }
  vm.runInNewContext(js, context)
  return { ...context.state, loads, shows, source }
}
test('创建页上传前锁定防连点，失败保留表单，只有编号成功才进入成功态', async () => {
  let rejectUpload, uploads = 0, submits = 0
  const p = page('create', { validateComplaint: () => {}, uploadComplaintImage: () => { uploads++; return new Promise((_, reject) => rejectUpload = reject) }, submitComplaint: async state => { submits++; state.number = 'REAL123' } })
  p.form.description = '投诉描述至少十个字并保留'
  p.images.value = [{ path: 'local', size: 1 }]
  const first = p.submit(); await p.submit()
  assert.equal(uploads, 1)
  rejectUpload(Error('上传失败')); await first
  assert.equal(p.form.description, '投诉描述至少十个字并保留')
  assert.equal(p.images.value.length, 1)
  assert.equal(p.sending.value, false)
  assert.equal(submits, 0)
  p.images.value = []; await p.submit()
  assert.equal(p.submission.number, 'REAL123')
})
test('列表支持空态、分页与失败重试，加载失败不丢失前页', async () => {
  let calls = 0
  const p = page('index', { listComplaints: async () => { calls++; if (calls === 2) throw Error('断网'); return { results: calls === 1 ? [{ number: 'C1' }] : [], next: calls === 1 ? 'next' : null } } })
  await p.load(true); assert.equal(p.items.value.length, 1)
  await p.load(false); assert.equal(p.items.value.length, 1); assert.equal(p.error.value, '断网')
  await p.load(false); assert.equal(p.hasMore.value, false)
})
test('关闭工单不补充；补充失败留输入且并发不重复发送', async () => {
  let rejectReply, calls = 0
  const p = page('detail', { addComplaintMessage: () => { calls++; return new Promise((_, reject) => rejectReply = reject) } })
  p.complaint.value = { number: 'C1', status: 'closed' }; p.content.value = '补充内容'
  await p.send(); assert.equal(calls, 0)
  p.complaint.value.status = 'processing'
  const first = p.send(); await p.send(); assert.equal(calls, 1)
  rejectReply(Error('提交失败')); await first
  assert.equal(p.content.value, '补充内容'); assert.equal(p.sending.value, false)
  assert.match(p.source, /非微信官方投诉渠道/)
  assert.doesNotMatch(p.source, /:src="[^"\n]*content_url/)
})
test('页面注册及个人中心、客服、订单入口齐全', () => {
  const root = path.join(__dirname, '../src')
  const pages = JSON.parse(fs.readFileSync(path.join(root, 'pages.json'))).pages
  for (const name of ['index', 'create', 'detail']) assert.ok(pages.some(p => p.path === 'pages/client/complaints/' + name))
  for (const file of ['pages/client/profile/index.vue', 'pages/client/customer-service/index.vue', 'pages/boss/payment/index.vue']) assert.match(fs.readFileSync(path.join(root, file), 'utf8'), /\/pages\/client\/complaints\//)
})
