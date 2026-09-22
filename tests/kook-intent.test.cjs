const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript')
const root=path.join(__dirname,'..')
test('registered cream/green binding page, wide buttons, lifecycle cleanup and both entrypoints',()=>{
 const file=path.join(root,'src/pages/player/kook-binding/index.vue');assert.ok(fs.existsSync(file),'binding page missing')
 const src=fs.readFileSync(file,'utf8'),sfc=require('@vue/compiler-sfc').parse(src);assert.equal(sfc.errors.length,0)
 for(const text of ['c.start','c.confirmBinding','c.cancel','c.remove','c.toggle','c.test','onHide','onUnload','SESSION_EXPIRED_EVENT','暂未开放','只私信机器人','width: 100%','min-height: 92rpx','#fbf7ef']) assert.ok(src.includes(text),text)
 assert.doesNotMatch(src,/console\.|setStorageSync/)
 const pages=JSON.parse(fs.readFileSync(path.join(root,'src/pages.json'),'utf8')).pages
 assert.equal(pages[0].path,'pages/boss/home/index');assert.ok(pages.some(p=>p.path==='pages/player/kook-binding/index'))
 for(const page of ['client/profile','player/grab']) assert.ok(fs.readFileSync(path.join(root,`src/pages/${page}/index.vue`),'utf8').includes('/pages/player/kook-binding/index'))
})
function load(){const file=path.join(root,'src/utils/kookIntent.ts');assert.ok(fs.existsSync(file),'intent module missing');const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});return module.exports}
test('opaque navigation contract rejects arbitrary routes, missing resolver, expired or forbidden without exposing order',()=>{
 const m=load();assert.equal(m.parseKookIntent('a'.repeat(32)),'a'.repeat(32));for(const s of ['https://evil','a','../order', ['a'.repeat(32)]]) assert.equal(m.parseKookIntent(s),'')
 for(const data of [{state:'forbidden',order_no:'SECRET',safe_target:'pages/player/grab/index'},{state:'available',order_no:'SECRET',safe_target:'https://evil'},{state:'available',order_no:'SECRET',safe_target:'pages/player/grab/index',expires_at:'2000-01-01'}]) {const r=m.interpretEntry(data);assert.equal(r.orderNo,'');assert.ok(r.message)}
 const r=m.interpretEntry({state:'invited',order_no:'order-1',safe_target:'pages/player/grab/index',expires_at:'2099-01-01'});assert.equal(r.orderNo,'order-1');assert.equal(r.state,'invited')
})
