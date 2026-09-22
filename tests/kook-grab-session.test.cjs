const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), ts=require('typescript')
const root=path.join(__dirname,'..')
function harness() {
  let token='user-A', resolve, reject
  const hooks={}, events=new Map(), refs=[]
  const register=name=>fn=>{hooks[name]=fn}
  const uni={$on:(n,f)=>events.set(n,f),$off:n=>events.delete(n)}
  const mocks={
    vue:{ref:v=>{const r={value:v};refs.push(r);return r},computed:f=>({}),onMounted:register('mounted'),onUnmounted:register('unmounted')},
    '@dcloudio/uni-app':Object.fromEntries(['onLoad','onShow','onHide','onUnload'].map(n=>[n,register(n)])),
    '@/api/kook':{getEntry:()=>new Promise((r,j)=>{resolve=r;reject=j})},
    '@/utils/storage':{getStorage:()=>token,SESSION_CHANGED_EVENT:'auth-session-changed'},
    '@/utils/sessionExpiry':{SESSION_EXPIRED_EVENT:'session-expired'},
    '@/utils/client':{getPlayerOnlineStatus:()=>false},
    '@/utils/orderAlert':{createOrderAlert:()=>({prepare(){},destroy(){}})},
    '@/utils/kookIntent':{parseKookIntent:x=>x,interpretEntry:x=>({message:'订单',orderNo:x.order_no})}
  }
  const source=fs.readFileSync(path.join(root,'src/pages/player/grab/index.vue'),'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
  const js=ts.transpileModule(source+'\nexport { kookNotice }',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
  const module={exports:{}}
  vm.runInNewContext(js,{module,exports:module.exports,require:n=>mocks[n]||{},uni,clearInterval(){},setInterval(){return 1}})
  return {hooks,events,notice:module.exports.kookNotice,token:v=>{token=v},resolve:v=>resolve(v),reject:()=>reject(new Error('late'))}
}
test('grab resolved notice clears on hide, account switch elsewhere and return',async()=>{
  const h=harness();const p=h.hooks.onLoad({kook_intent:'opaque'});h.resolve({order_no:'A-PRIVATE'});await p
  assert.match(h.notice.value,/A-PRIVATE/)
  h.hooks.onHide();assert.equal(h.notice.value,'')
  h.token('user-B');h.hooks.onShow();assert.equal(h.notice.value,'')
})
test('grab late success and failure cannot resurrect after hide/show or token change',async()=>{
  for(const fail of [false,true]) for(const boundary of ['hide','token','unload']) {
    const h=harness();const p=h.hooks.onLoad({kook_intent:'opaque'})
    if(boundary==='hide'){h.hooks.onHide();h.hooks.onShow()}
    if(boundary==='token') h.token('user-B')
    if(boundary==='unload') { assert.ok(h.hooks.onUnload);h.hooks.onUnload() }
    if(fail)h.reject();else h.resolve({order_no:'A-PRIVATE'})
    await p;assert.equal(h.notice.value,'',`${boundary}/${fail}`)
  }
})
test('grab session event clears already displayed notice and fences ABA token responses',async()=>{
  const h=harness();let p=h.hooks.onLoad({kook_intent:'opaque'});h.resolve({order_no:'A-PRIVATE'});await p
  assert.ok(h.events.has('auth-session-changed'))
  h.events.get('auth-session-changed')();assert.equal(h.notice.value,'')
  p=h.hooks.onLoad({kook_intent:'opaque'})
  h.token('user-B');h.events.get('auth-session-changed')();h.token('user-A');h.events.get('auth-session-changed')()
  h.resolve({order_no:'A-PRIVATE'});await p;assert.equal(h.notice.value,'')
  h.hooks.onUnload();assert.equal(h.events.size,0)
})
test('token set and auth clearing broadcast a credential-free session change',()=>{
  const events=[], store={};const module={exports:{}}
  const js=ts.transpileModule(fs.readFileSync(path.join(root,'src/utils/storage.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
  vm.runInNewContext(js,{module,exports:module.exports,uni:{setStorageSync:(k,v)=>store[k]=v,removeStorageSync:k=>delete store[k],getStorageSync:k=>store[k],$emit:(...args)=>events.push(args)}})
  module.exports.setStorage('token','synthetic-A');module.exports.setStorage('player',{})
  module.exports.clearPlayerAuth()
  assert.deepEqual(events,[['auth-session-changed'],['auth-session-changed']])
})
