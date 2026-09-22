const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
function harness() {
  const requests = [], expired = [], storage = new Map([['token', 'user-jwt'], ['admin_token', 'admin']])
  const uni = { getStorageSync: k => storage.get(k) || '', request: r => requests.push(r) }
  const file = require('node:path').join(__dirname, '../src/api/kook.ts')
  assert.ok(fs.existsSync(file), 'KOOK API missing')
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    module, exports: module.exports, uni, require: name => name.endsWith('/request') ? { BASE_URL: 'https://api.test/api' } : { handleSessionExpiry: (...args) => { expired.push(args); return args[0] === 401 ? { handled: true } : null } }
  })
  return { api: module.exports, requests, expired, storage }
}
test('KOOK uses only player JWT and exact no-slash contract; 401 never replays writes', async () => {
  const h = harness(), p = h.api.createChallenge('bind').catch(e => e)
  assert.equal(h.requests[0].url, 'https://api.test/api/player/kook-binding/challenges')
  assert.equal(h.requests[0].header.Authorization, 'Bearer user-jwt')
  assert.equal(h.requests[0].data.purpose, 'bind')
  h.requests[0].success({statusCode:401,data:{code:'token_not_valid'}})
  assert.equal((await p).handled, true)
  assert.equal(h.expired[0][3], 'token'); assert.equal(h.requests.length,1)
})
test('binding lifecycle sends only contract fields; queued is not sent, unavailable and stale sessions reject', async () => {
  const h = harness()
  for (const [name,args,method,suffix,body] of [
    ['getChallenge',['uuid'],'GET','/challenges/uuid',undefined],
    ['confirmChallenge',['uuid','nonce',false],'POST','/challenges/uuid/confirm',{confirmation_nonce:'nonce',notifications_enabled:false}],
    ['cancelChallenge',['uuid'],'DELETE','/challenges/uuid',undefined],
    ['setNotifications',[false],'POST','',{notifications_enabled:false}],
    ['unbind',['version'],'DELETE','',{binding_version:'version'}],
    ['sendTest',['request-uuid'],'POST','/test-notification',{request_id:'request-uuid'}],
    ['getTest',['delivery'],'GET','/test-notifications/delivery',undefined]
  ]) {
    assert.equal(typeof h.api[name], 'function', name)
    const p = h.api[name](...args), r = h.requests.at(-1)
    assert.equal(r.method,method); assert.equal(r.url, 'https://api.test/api/player/kook-binding'+suffix)
    assert.equal(JSON.stringify(r.data),JSON.stringify(body))
    r.success({statusCode:200,data:{status:'queued'}}); assert.equal((await p).status,'queued')
  }
  for (const status of [404,409,410,429,503]) {
    const p = h.api.getBinding().catch(e=>e); h.requests.at(-1).success({statusCode:status,data:'<html>offline</html>'})
    assert.equal((await p).statusCode,status)
  }
  const p = h.api.createChallenge('bind').catch(e=>e); h.storage.set('token','other')
  h.requests.at(-1).success({statusCode:201,data:{code:'PRIVATE'}})
  assert.equal((await p).code,'STALE_SESSION')
  h.storage.delete('token'); const noUser = h.api.getBinding(); assert.equal(h.requests.at(-1).header.Authorization,undefined)
  h.requests.at(-1).success({statusCode:200,data:{}}); await noUser
})
module.exports = { harness }
