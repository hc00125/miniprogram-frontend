const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path')
test('actual page hooks never restart polling after hide during load and unsubscribe on unload',async()=>{
 const hooks={},timers=new Set(),events=new Map();let release,hidden=0,resets=0
 const controller={load:()=>new Promise(r=>release=r),hide:()=>hidden++,reset:()=>resets++,tick:()=>{},poll:()=>{}}
 const src=require('@vue/compiler-sfc').parse(fs.readFileSync(path.join(__dirname,'../src/pages/player/kook-binding/index.vue'),'utf8')).descriptor.scriptSetup.content
 const module={exports:{}};vm.runInNewContext(ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2018}}).outputText,{module,exports:module.exports,uni:{getStorageSync:()=> 'jwt',$on:(k,f)=>events.set(k,f),$off:k=>events.delete(k)},setInterval:f=>{timers.add(f);return f},clearInterval:f=>timers.delete(f),require:name=>{
 if(name==='vue') return {ref:v=>({value:v}),reactive:v=>v,computed:f=>({get value(){return f()}})}
 if(name==='@dcloudio/uni-app') return Object.fromEntries(['onShow','onHide','onUnload'].map(k=>[k,f=>hooks[k]=f]))
 if(name==='./state') return {initialState:()=>({}),createController:()=>controller}
 if(name.endsWith('sessionExpiry')) return {SESSION_EXPIRED_EVENT:'expired'}
 return {}
 }})
 const p=hooks.onShow();hooks.onHide();release();await p
 assert.equal(timers.size,0);assert.equal(hidden,1);hooks.onUnload();assert.equal(events.size,0);assert.ok(resets)
})
