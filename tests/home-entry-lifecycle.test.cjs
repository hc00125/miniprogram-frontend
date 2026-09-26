const {test}=require('node:test'),assert=require('node:assert/strict'),vue=require('vue'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm')
const {parse}=require('@vue/compiler-sfc')
const {harness,nodes}=require('./commerce-sfc-harness.cjs')
const tick=()=>new Promise(setImmediate)
test('homepage game choice is consumed by an already-visited native catalogue tab',async()=>{
 const storage={'catalog:requested-game-id':5},show=[]
 const mocks={vue,'@dcloudio/uni-app':{onLoad(){},onShow:f=>show.push(f),onShareAppMessage(){},onShareTimeline(){}},'@/api/boss':{},'@/api/catalog':{},'@/components/MainBottomTabs.vue':{},'@/components/ProductCover.vue':{},'@/utils/diamonds':{},'@/utils/feedback':{},'@/utils/nav':{}}
 const code=parse(fs.readFileSync(require.resolve('../src/pages/shop/category/index.vue'),'utf8')).descriptor.scriptSetup.content+'\nmodule.exports={games,loaded,activeGameId,activeCategoryId,keyword};'
 const module={exports:{}}
 vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,require:n=>mocks[n],uni:{getStorageSync:k=>storage[k],removeStorageSync:k=>delete storage[k]}})
 const p=module.exports;p.loaded.value=true;p.games.value=[{id:5,groups:[{id:51}]},{id:8,groups:[{id:81}]}];p.activeGameId.value=8;p.activeCategoryId.value=81;p.keyword.value='previous game search'
 await show[0]();assert.equal(p.activeGameId.value,5);assert.equal(p.activeCategoryId.value,51);assert.equal(p.keyword.value,'');assert.equal(storage['catalog:requested-game-id'],undefined)
 p.activeGameId.value=8;p.activeCategoryId.value=81;await show[0]();assert.equal(p.activeGameId.value,8,'normal revisits preserve manual selection')
 storage['catalog:requested-game-id']=999;await show[0]();assert.equal(p.activeGameId.value,8,'unknown game does not override selection');assert.equal(storage['catalog:requested-game-id'],undefined)
})
test('gift entry mounted after asynchronous homepage cards reads existing capability without another page show',async()=>{
 const mounted=[],calls=[],h=harness({vue:{...vue,onMounted:f=>mounted.push(f)},'@/api/giftCommerce':{readGiftCapabilities:async id=>{calls.push(id);return {catalog_read:true,purchase_enabled:true,purchase_supported:true,quote_supported:true}}}})
 const C=h.load('src/components/gifts/GiftHost.vue').default,scope=vue.effectScope(),props={recipientId:12,recipientName:'真实目标的测试夹具'},draw=scope.run(()=>C.setup(props,{expose(){}})),tree=()=>nodes(draw(props,[]))
 for(const f of mounted)await f();await tick()
 assert.deepEqual(calls,[12]);const button=tree().find(n=>n.props?.['data-action']==='open-gift');assert.ok(button);button.props.onTap({stopPropagation(){}});assert.ok(tree().some(n=>n.props?.recipient?.id==='12'))
 h.hooks.hide[0]();assert.ok(!tree().some(n=>n.props?.recipient?.id==='12'));scope.stop()
})
