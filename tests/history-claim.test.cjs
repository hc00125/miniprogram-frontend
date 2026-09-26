const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),vue=require('vue');
const {parse,compileScript}=require('@vue/compiler-sfc');
const root=path.join(__dirname,'..');
function harness(options={}){
 const file=path.join(root,'src/pages/client/history-claim/index.vue');assert.ok(fs.existsSync(file),'认领页面尚未实现');
 const d=parse(fs.readFileSync(file,'utf8')).descriptor,compiled=compileScript(d,{id:'claim'}),module={exports:{}};
 const hooks={show:[],hide:[],unload:[]},events={},storage={token:'claim-test-session'},calls=[];
 const mocks={vue,'@dcloudio/uni-app':{onShow:f=>hooks.show.push(f),onHide:f=>hooks.hide.push(f),onUnload:f=>hooks.unload.push(f)},
  '@/api/history':{getHistoryClaims:options.get||(async()=>({customer:null,claims:[]})),submitHistoryClaim:options.submit||(async data=>{calls.push(data);return {id:1,status:'pending'}})},
  '@/utils/storage':{getStorage:k=>storage[k],SESSION_CHANGED_EVENT:'change'},'@/utils/sessionExpiry':{SESSION_EXPIRED_EVENT:'expired'},
  '@/utils/nav':{go:(...args)=>calls.push(args),goMain:(...args)=>calls.push(args)},'@/utils/feedback':{getErrorMessage:e=>e.message||'失败',toast:x=>calls.push(x),success:x=>calls.push(x)}};
 vm.runInNewContext(ts.transpileModule(compiled.content,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,
  {module,exports:module.exports,require:n=>{assert.ok(mocks[n],n);return mocks[n]},uni:{$on:(k,f)=>events[k]=f,$off:k=>delete events[k]}});
 const scope=vue.effectScope(),s=scope.run(()=>module.exports.default.setup({},{expose(){}}));
 return {s,storage,calls,events,show:async()=>{for(const f of hooks.show)await f()},hide:()=>hooks.hide.forEach(f=>f()),scope};
}
test('claim submits a numeric customer reference for review, without exposing histories before approval',async()=>{
 const h=harness();await h.show();h.s.customerId.value='123';h.s.message.value='原群昵称';h.s.consent.value=true;await h.s.submit();
 assert.equal(h.calls[0].customer_id,123);assert.equal(h.calls[0].message,'原群昵称');assert.equal(h.s.posting.value,false);
 h.scope.stop();
});
module.exports={harness};
