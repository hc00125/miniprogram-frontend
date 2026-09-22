const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), ts=require('typescript')
function load(api={}, ask=async()=>true) {
 const file=require('node:path').join(__dirname,'../src/pages/player/kook-binding/state.ts'); assert.ok(fs.existsSync(file),'binding page state missing')
 const module={exports:{}}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2018}}).outputText,{module,exports:module.exports,require:()=>({})})
 const s=module.exports.initialState(); return {s,c:module.exports.createController(s,api,ask),m:module.exports}
}
test('binding code expires, candidate requires explicit confirmation, duplicate taps locked',async()=>{
 let creates=0, confirms=0, release; const h=load({createChallenge:()=>{creates++;return new Promise(r=>release=r)},getChallenge:async()=>({status:'awaiting_confirmation',expires_at:'2099-01-01',confirmation_nonce:'nonce',masked_kook_user:'***42'}),confirmChallenge:async(id,nonce,enabled)=>{confirms++;assert.equal(id,'challenge');assert.equal(nonce,'nonce');assert.equal(enabled,false);return {status:'bound',notifications_enabled:false,binding_version:'version'}}})
 const first=h.c.start(); await h.c.start(); assert.equal(creates,1)
 release({challenge_id:'challenge',code:'TEST-CODE',expires_at:'2099-01-01'});await first
 assert.equal(h.s.code,'TEST-CODE');await h.c.poll();assert.equal(confirms,0); assert.equal(h.s.challenge.status,'awaiting_confirmation')
 await h.c.confirmBinding();assert.equal(confirms,1);assert.equal(h.s.code,'');assert.equal(h.s.binding.status,'bound')
 h.s.code='TEST';h.s.challenge={status:'pending',expires_at:'2000-01-01'};h.c.tick(Date.now());assert.equal(h.s.code,'');assert.equal(h.s.challenge.status,'expired')
})
test('unbind/rebind cancelled by user do not write; consent/test status only reflect server; no auto retry unknown',async()=>{
 let writes=0;const h=load({unbind:async()=>writes++,createChallenge:async()=>writes++},async()=>false)
 h.s.binding={status:'bound',binding_version:'v'};await h.c.start();await h.c.remove();assert.equal(writes,0)
 const x=load({setNotifications:async enabled=>({status:'bound',notifications_enabled:enabled}),sendTest:async()=>({delivery_id:'d',status:'queued'}),getTest:async()=>({status:'unknown'}),cancelChallenge:async()=>{}})
 x.s.binding={status:'bound',notifications_enabled:false};await x.c.toggle(true);assert.equal(x.s.binding.notifications_enabled,true)
 await x.c.test();assert.equal(x.s.delivery.status,'queued');await x.c.poll();assert.equal(x.s.delivery.status,'unknown')
 assert.match(x.m.deliveryText('sent'),/平台.*不代表.*已读/);assert.match(x.m.deliveryText('unknown'),/不.*重发/)
 x.s.challengeId='c';x.s.code='private';await x.c.cancel();assert.equal(x.s.code,'')
})
test('hidden/expired session clears secrets and rejects late response; resume reads candidate without recovering code',async()=>{
 let release;const h=load({createChallenge:()=>new Promise(r=>release=r)})
 const p=h.c.start();h.c.reset();release({challenge_id:'c',code:'PRIVATE',expires_at:'2099-01-01'});await p;assert.equal(h.s.code,'');assert.equal(h.s.challenge,null)
 const x=load({getBinding:async()=>({status:'awaiting_confirmation',challenge_id:'c'}),getChallenge:async()=>({status:'awaiting_confirmation',confirmation_nonce:'n',expires_at:'2099-01-01'})})
 await x.c.load();assert.equal(x.s.code,'');assert.equal(x.s.challenge.confirmation_nonce,'n')
 assert.match(x.m.errorText({statusCode:503}),/未开放/);assert.match(x.m.errorText({statusCode:404}),/未部署|不可用/)
})
test('confirmation fails closed for malformed expiry and malformed success does not show bound',async()=>{
 let called=0; const h=load({confirmChallenge:async()=>{called++;return {}}})
 h.s.challengeId='c';h.s.challenge={status:'awaiting_confirmation',confirmation_nonce:'nonce',expires_at:'invalid'}
 await h.c.confirmBinding();assert.equal(called,0)
 h.s.challenge.expires_at='2099-01-01';await h.c.confirmBinding();assert.equal(h.s.binding,null);assert.ok(h.s.error)
})
test('notification toggle failure preserves server state and page uses non-optimistic action',async()=>{
 const h=load({setNotifications:async()=>{throw {statusCode:503}}});h.s.binding={status:'bound',notifications_enabled:false};await h.c.toggle(true)
 assert.equal(h.s.binding.notifications_enabled,false);assert.match(h.s.error,/未开放/)
 const page=fs.readFileSync(require('node:path').join(__dirname,'../src/pages/player/kook-binding/index.vue'),'utf8')
 assert.ok(page.includes('@tap="c.toggle(!s.binding.notifications_enabled)"'),'server-owned toggle should not optimistically flip a native switch')
})
module.exports={load}
