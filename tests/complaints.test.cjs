const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
function harness() {
  const requests = [], uploads = [], downloads = [], expired = []
  const storage = new Map([['token', 'user-token'], ['admin_token', 'admin-token']])
  const uni = { getStorageSync: k => storage.get(k) || '', request: o => requests.push(o), uploadFile: o => uploads.push(o), downloadFile: o => downloads.push(o) }
  const filename = path.join(__dirname, '../src/api/complaints.ts')
  assert.ok(fs.existsSync(filename), '投诉API模块尚未实现')
  const module = { exports: {} }
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2018 } }).outputText
  vm.runInNewContext(js, { module, exports: module.exports, uni, console, require: name => {
    if (name === '@/utils/request') return { BASE_URL: 'https://api.test/api' }
    if (name === '@/utils/sessionExpiry') return { handleSessionExpiry: (...args) => { expired.push(args); return args[0] === 401 ? { handled: true } : null } }
    throw Error(name)
  } })
  return { api: module.exports, uni, requests, uploads, downloads, expired, storage }
}
test('投诉使用用户token、既有API前缀与分页results，绝不串管理员身份', async () => {
  const h = harness()
  const p = h.api.listComplaints(2)
  assert.equal(h.requests[0].url, 'https://api.test/api/support/complaints/')
  assert.equal(h.requests[0].header.Authorization, 'Bearer user-token')
  assert.equal(h.requests[0].data.page, 2)
  h.requests[0].success({ statusCode: 200, data: { results: [{ number: 'C123' }], next: null } })
  assert.equal((await p).results[0].number, 'C123')
})
test('创建校验、连点锁、失败保留数据及幂等键，成功只接受真实编号', async () => {
  const h = harness(), a = h.api
  assert.equal(typeof a.submitComplaint, 'function')
  const form = { category: 'service', description: '服务出现问题希望平台协助处理', order_no: '', contact: '', attachment_ids: [] }
  const state = { busy: false, number: '', clientRequestId: 'same-key' }
  assert.throws(() => a.validateComplaint({ ...form, description: '短' }), /10/)
  assert.throws(() => a.validateComplaint({ ...form, description: '字'.repeat(1001) }), /1000/)
  assert.throws(() => a.validateComplaint({ ...form, attachment_ids: [1,2,3,4] }), /3/)
  const first = a.submitComplaint(state, form).catch(e => e)
  await a.submitComplaint(state, form)
  assert.equal(h.requests.length, 1)
  assert.equal(h.requests[0].data.client_request_id, 'same-key')
  h.requests[0].fail({ errMsg: 'timeout' }); await first
  assert.equal(state.busy, false)
  assert.equal(form.description, '服务出现问题希望平台协助处理')
  const retry = a.submitComplaint(state, form)
  assert.equal(h.requests[1].data.client_request_id, 'same-key')
  h.requests[1].success({ statusCode: 201, data: { number: 'REAL-123' } })
  await retry
  assert.equal(state.number, 'REAL-123')
  await a.submitComplaint(state, form)
  assert.equal(h.requests.length, 2)
})
test('投诉401复用过期提示且不重放；迟到的读取不回填其他会话', async () => {
  const h = harness()
  const p = h.api.listComplaints().catch(e => e)
  h.requests[0].success({ statusCode: 401, data: { detail: 'expired' } })
  assert.equal((await p).handled, true)
  assert.equal(h.expired[0][3], 'token')
  assert.equal(h.requests.length, 1)
  const read = h.api.listComplaints().catch(e => e)
  h.storage.set('token', 'new-user')
  h.requests[1].success({ statusCode: 200, data: { results: [] } })
  assert.equal((await read).handled, true)
})
test('私有图片限制5MB、认证上传及本地下载；忽略外部content_url防token泄漏', async () => {
  const h = harness(), a = h.api
  assert.equal(typeof a.uploadComplaintImage, 'function')
  await assert.rejects(a.uploadComplaintImage({ path: '/tmp/a', size: 5 * 1024 * 1024 + 1 }), /5MB/)
  assert.equal(h.uploads.length, 0)
  const upload = a.uploadComplaintImage({ path: '/tmp/a', size: 100 })
  assert.equal(h.uploads[0].name, 'file')
  assert.equal(h.uploads[0].header.Authorization, 'Bearer user-token')
  h.uploads[0].success({ statusCode: 201, data: JSON.stringify({ id: 5, name: '凭证.png', content_url: 'https://evil.test/a' }) })
  const attachment = await upload
  const image = a.downloadComplaintImage(attachment)
  assert.equal(h.downloads[0].url, 'https://api.test/api/support/complaint-attachments/5/content/')
  assert.equal(h.downloads[0].header.Authorization, 'Bearer user-token')
  h.downloads[0].success({ statusCode: 200, tempFilePath: '/tmp/private.png' })
  assert.equal(await image, '/tmp/private.png')
})
test('选图须先通过微信隐私检查；拒绝授权不调用选图', async () => {
  const h = harness()
  assert.equal(typeof h.api.chooseComplaintImages, 'function')
  let picked = false
  h.uni.getPrivacySetting = o => o.success({ needAuthorization: true })
  h.uni.chooseMedia = () => { picked = true }
  await assert.rejects(h.api.chooseComplaintImages(3), e => e.privacyRequired === true)
  assert.equal(picked, false)
  h.uni.getPrivacySetting = o => o.success({ needAuthorization: false })
  h.uni.chooseMedia = o => { picked = true; assert.equal(o.count, 2); o.success({ tempFiles: [{ tempFilePath: 'local', size: 100 }] }) }
  assert.equal((await h.api.chooseComplaintImages(2))[0].path, 'local')
})
test('详情读取公开回复，关闭工单不能补充，补充请求不自动重试', async () => {
  const h = harness(), a = h.api
  assert.equal(typeof a.getComplaint, 'function')
  const p = a.getComplaint('C/1')
  assert.match(h.requests[0].url, /C%2F1\/$/)
  h.requests[0].success({ statusCode: 200, data: { number: 'C/1', messages: [] } }); await p
  await assert.rejects(a.addComplaintMessage('C1', 'closed', '补充说明', []), /关闭/)
  const reply = a.addComplaintMessage('C1', 'processing', '补充说明', [5])
  assert.match(h.requests[1].url, /C1\/messages\/$/)
  assert.equal(h.requests[1].data.content, '补充说明')
  h.requests[1].success({ statusCode: 201, data: { content: '补充说明', author: '用户' } })
  assert.equal((await reply).content, '补充说明')
})
test('重登草稿只在内存按用户隔离恢复，不缓存认证凭据，不自动重提', () => {
  const h = harness(), a = h.api
  assert.equal(typeof a.saveComplaintDraft, 'function')
  a.saveComplaintDraft('user-1', 'create', { description: '未发送文字', clientRequestId: 'original' })
  assert.equal(a.readComplaintDraft('user-2', 'create'), null)
  assert.equal(a.readComplaintDraft('user-1', 'create').clientRequestId, 'original')
  a.saveComplaintDraft('user-1', 'create', null)
  assert.equal(a.readComplaintDraft('user-1', 'create'), null)
  assert.equal(h.requests.length, 0)
})
test('适配真实后端author_role与status_history；补充内容必填', async () => {
  const h = harness(), a = h.api
  const p = a.getComplaint('C1')
  h.requests[0].success({ statusCode: 200, data: { number: 'C1', messages: [{ content: '收到', author_role: 'staff' }, { content: '补充', author_role: 'user' }], status_history: [{ from_status: 'pending', to_status: 'processing', created_at: '2026-09-18' }] } })
  const item = await p
  assert.equal(item.messages[0].author, '平台客服')
  assert.equal(item.messages[1].author, '我')
  assert.equal(item.status_history[0].to_status, 'processing')
  await assert.rejects(a.addComplaintMessage('C1', 'processing', '', [5]), /填写补充/)
})
module.exports = { harness }
