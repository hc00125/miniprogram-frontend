const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript')
const {parse}=require('@vue/compiler-sfc')
const root=path.join(__dirname,'..')
function presenceHarness(token='presence-fixture-a') {
 const storage={token},events={},requests=[],timers=new Map(),modules={},emitted=[];let timerId=0
 const uni={getStorageSync:k=>storage[k],request:o=>requests.push(o),$on:(k,f)=>events[k]=f,$emit:(k,v)=>{emitted.push([k,v]);events[k]?.(v)}}
 function load(file){if(modules[file])return modules[file].exports;const m={exports:{}};modules[file]=m;const src=fs.readFileSync(path.join(root,file),'utf8');const code=file.endsWith('.vue')?parse(src).descriptor.script.content:src
 vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports,uni,console,setInterval:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id},clearInterval:id=>timers.delete(id),require:id=>id==='@/utils/request'?{BASE_URL:'https://presence.invalid/api'}:id.startsWith('@/')?load('src/'+id.slice(2)+'.ts'):id.startsWith('./')?load(path.join(path.dirname(file),id)+'.ts'):require(id)})
 return m.exports}
 const app=load('src/App.vue').default
 return {app,storage,requests,timers,events,emitted,launch(){app.onLaunch?.();assert.equal(typeof app.onShow,'function','应用级 onShow 应开始上报');app.onShow()},reply(i=0,data={tracked:true,player_id:1,presence_online:true}){requests[i].success({statusCode:200,data})}}
}
const flush=()=>new Promise(resolve=>setImmediate(resolve))
test('应用每次进入前台立即上报并且只有一个10分钟定时器',async()=>{
 const h=presenceHarness();h.launch();assert.equal(h.requests.length,1);assert.equal(h.timers.size,1);assert.equal([...h.timers.values()][0].ms,600000)
 assert.equal(h.requests[0].url,'https://presence.invalid/api/player/presence/heartbeat');assert.equal(h.requests[0].method,'POST');assert.equal(h.requests[0].header.Authorization,'Bearer presence-fixture-a')
 h.reply();await flush();h.app.onShow();assert.equal(h.requests.length,1);assert.equal(h.timers.size,1)
 h.app.onHide();assert.equal(h.timers.size,0);h.app.onShow();assert.equal(h.requests.length,2);assert.equal(h.timers.size,1)
})
test('未登录不发送；前台登录立即发送，退出登录清除定时器',async()=>{
 const h=presenceHarness('');h.launch();assert.equal(h.requests.length,0);assert.equal(h.timers.size,0)
 h.storage.token='session-b';h.events['auth-session-changed']();assert.equal(h.requests.length,1);assert.equal(h.timers.size,1)
 const oldTick=[...h.timers.values()][0].fn;h.storage.token='';h.events['auth-session-changed']();oldTick();assert.equal(h.requests.length,1);assert.equal(h.timers.size,0)
 h.reply();await flush();assert.equal(h.emitted.length,0)
})
test('10分钟周期执行；请求未完成不重叠发送',async()=>{
 const h=presenceHarness();h.launch();const tick=[...h.timers.values()][0].fn;tick();assert.equal(h.requests.length,1)
 h.reply();await flush();tick();assert.equal(h.requests.length,2);assert.equal(h.timers.size,1)
})
test('切后台时未完成的请求不能重新创建定时器或回填页面',async()=>{
 const h=presenceHarness();h.launch();h.app.onHide();h.reply();await flush();assert.equal(h.timers.size,0);assert.equal(h.emitted.length,0)
 h.app.onShow();assert.equal(h.requests.length,2)
})
test('切换账号后旧请求不影响新会话',async()=>{
 const h=presenceHarness();h.launch();h.storage.token='session-new';h.events['auth-session-changed']();assert.equal(h.requests.length,2)
 h.reply(0,{tracked:true,player_id:1,presence_online:true});h.reply(1,{tracked:true,player_id:2,presence_online:true});await flush()
 assert.equal(h.emitted.length,1);assert.equal(h.emitted[0][1].player_id,2);assert.equal(h.requests[1].header.Authorization,'Bearer session-new')
})
test('失败不快速重试，普通老板响应不会被当成陪玩在线',async()=>{
 const h=presenceHarness();h.launch();h.requests[0].fail({errMsg:'offline'});await flush();assert.equal(h.requests.length,1)
 ;[...h.timers.values()][0].fn();h.reply(1,{tracked:false});await flush();assert.equal(h.requests.length,2);assert.equal(h.emitted.length,0)
})
test('后台登录不发送，恢复前台立即发送',()=>{
 const h=presenceHarness('');h.launch();h.app.onHide();h.storage.token='new';h.events['auth-session-changed']();assert.equal(h.requests.length,0)
 h.app.onShow();assert.equal(h.requests.length,1)
})

