const {test}=require('node:test'),assert=require('node:assert/strict')
const {setup,tick,catalog,quote}=require('./patronage-harness.cjs')
const {harness}=require('./commerce-sfc-harness.cjs')
test('same-token login completion advances non-secret session generation',()=>{
 const h=harness();h.uni.removeStorageSync=k=>delete h.storage[k];const s=h.load('src/utils/sessionExpiry.ts')
 assert.equal(typeof s.getClientSessionGeneration,'function');const before=s.getClientSessionGeneration();s.finishSessionLogin();assert.notEqual(s.getClientSessionGeneration(),before)
})
const purchase='src/pages/client/patronage/index.vue'
function livePage(options={}) {
 const p=setup(purchase),requests=[],modals=[],logins=[];let replyKey='',status='paid'
 p.h.uni.showModal=o=>modals.push(o)
 p.h.uni.login=o=>{logins.push(o);o.success({code:'temporary-wechat-code'})}
 p.h.uni.request=o=>{
  requests.push(o);const end=o.url.split('/api/patronage/')[1]
  if(options.request && options.request(o,end))return
  const data=end==='catalog/'?{...catalog(),purchase_enabled:options.enabled!==false}:end==='quotes/'?{...quote(),can_submit:options.enabled!==false,blockers:options.enabled===false?['PURCHASE_NOT_ENABLED']:[]}:
   end==='purchases/pending/'?(options.pending||{count:0,next:null,previous:null,results:[]}):record(status,{idempotency_key:o.data.idempotency_key||replyKey})
  if(end==='purchases/')replyKey=o.data.idempotency_key
  o.success({statusCode:200,data})
 }
 p.life.load[0]({playerId:'7'})
 return {...p,requests,modals,logins,setStatus:v=>status=v}
}
test('enabled real SFC confirms before one POST, verifies original-key GET then explicitly buys again; cancel never sends',async()=>{
 const p=livePage();await p.life.show[0]();assert.equal(p.action('purchase').props.disabled,false)
 const cancelled=p.action('purchase').props.onTap();await tick();assert.equal(p.modals.length,1);assert.equal(p.requests.filter(o=>o.url.endsWith('/purchases/')).length,0);p.modals[0].success({confirm:false});await cancelled
 const buying=p.action('purchase').props.onTap();await tick();await p.action('purchase').props.onTap();assert.equal(p.modals.length,2);p.modals[1].success({confirm:true});await buying
 const posts=()=>p.requests.filter(o=>o.url.endsWith('/purchases/'));assert.equal(posts().length,1);assert.equal(posts()[0].data.code,'temporary-wechat-code')
 assert.equal(p.requests.at(-1).url.endsWith('/purchases/by-key/'),true);assert.equal(p.requests.at(-1).data.idempotency_key,posts()[0].data.idempotency_key)
 assert.match(p.text(),/购买成功/);assert.equal(p.action('purchase').props.disabled,true);assert.ok(p.action('buy-again'))
 const again=p.action('buy-again').props.onTap();await tick();p.modals[2].success({confirm:true});await again
 assert.equal(posts().length,2);assert.notEqual(posts()[0].data.idempotency_key,posts()[1].data.idempotency_key)
 assert.equal(Object.keys(p.h.storage).filter(k=>k.includes(':archive:')).length,1);assert.doesNotMatch(JSON.stringify(Object.entries(p.h.storage).filter(([k])=>k.startsWith('patronage:'))),/temporary-wechat-code|fixture-session/);p.scope.stop()
})
test('same-token relogin while initial quote is pending cannot rebrand the late response or open purchasing',async()=>{
 let response;const p=livePage({request:(o,end)=>{if(end==='quotes/'){response=o;return true}}})
 const showing=p.life.show[0]();await tick();p.relogin();response.success({statusCode:200,data:{...quote(),can_submit:true,blockers:[]}});await showing
 assert.doesNotMatch(p.text(),/2000.0/);assert.equal(p.action('purchase').props.disabled,true);p.scope.stop()
})
test('late 401 from same-token prior login cannot expire the new session',async()=>{
 let generation='1',response,expiry=0;const h=harness({'@/utils/sessionExpiry':{getClientSessionGeneration:()=>generation,handleSessionExpiry:()=>{expiry++;return null}}}),api=h.load('src/api/patronage.ts')
 h.uni.request=o=>response=o;const reading=api.getPatronagePending();generation='2';response.success({statusCode:401,data:{detail:'expired'}});await assert.rejects(reading);assert.equal(expiry,0)
})
test('closed gates and server total including unseen pages block all purchase events',async()=>{
 for(const options of [{enabled:false},{pending:{count:21,next:'https://evil.invalid',previous:null,results:[]}},{request:(o,end)=>{if(end==='purchases/pending/'){o.success({statusCode:503,data:{detail:'pending unavailable'}});return true}}}]){
  const p=livePage(options);await p.life.show[0]();assert.equal(p.action('purchase').props.disabled,true);await p.action('purchase').props.onTap();assert.equal(p.modals.length,0);assert.equal(p.logins.length,0);assert.equal(p.requests.some(o=>o.url.endsWith('/purchases/')),false);p.scope.stop()
 }
})
test('cross-device pending is recovered by original server key only and count continues to block',async()=>{
 const p=livePage({pending:{count:21,next:'https://evil.invalid',previous:null,results:[record()]}});await p.life.show[0]()
 assert.match(p.text(),/未决交易 21 笔/);await p.action('pending-PN-fixture').props.onTap()
 const reads=p.requests.filter(o=>o.url.endsWith('/by-key/'));assert.equal(reads.length,1);assert.equal(reads[0].data.idempotency_key,key);assert.equal(p.requests.some(o=>o.url.endsWith('/purchases/')),false);assert.equal(p.action('purchase').props.disabled,true);assert.equal(p.modals.length,0);p.scope.stop()
})
test('POST timeout survives hide/show; HTTP 404 then unknown then paid recovery never reposts or rotates key',async()=>{
 let readStatus=404;const p=livePage({request:(o,end)=>{if(end==='purchases/'){o.fail({errMsg:'timeout'});return true}if(end==='purchases/by-key/' && readStatus===404){o.success({statusCode:404,data:{detail:'not found'}});return true}}})
 await p.life.show[0]();const buy=p.action('purchase').props.onTap();await tick();p.modals[0].success({confirm:true});await buy
 const sent=p.requests.find(o=>o.url.endsWith('/purchases/')).data.idempotency_key;assert.doesNotMatch(p.text(),/购买成功/);assert.equal(p.action('buy-again'),undefined)
 p.life.hide[0]();await p.life.show[0]();await p.action('recover').props.onTap();assert.equal(p.action('purchase').props.disabled,true)
 readStatus=200;p.setStatus('unknown');await p.action('recover').props.onTap();assert.equal(p.action('buy-again'),undefined)
 p.setStatus('paid');await p.action('recover').props.onTap();assert.match(p.text(),/购买成功/);assert.ok(p.action('buy-again'));assert.equal(p.requests.filter(o=>o.url.endsWith('/purchases/')).length,1)
 assert.ok(p.requests.filter(o=>o.url.endsWith('/by-key/')).every(o=>o.data.idempotency_key===sent));p.scope.stop()
})
test('POST paid is not success when by-key verification fails, and explicit again rechecks pending before a new key',async()=>{
 let failRead=true,blocked=false;const p=livePage({request:(o,end)=>{if(end==='purchases/by-key/'&&failRead){o.success({statusCode:503,data:{detail:'unavailable'}});return true}if(end==='purchases/pending/'&&blocked){o.success({statusCode:200,data:{count:1,next:null,previous:null,results:[record()]}});return true}}})
 await p.life.show[0]();const buy=p.action('purchase').props.onTap();await tick();p.modals[0].success({confirm:true});await buy
 assert.doesNotMatch(p.text(),/购买成功/);assert.equal(p.action('buy-again'),undefined);failRead=false;await p.action('recover').props.onTap();assert.match(p.text(),/购买成功/)
 const before=JSON.stringify(Object.entries(p.h.storage).filter(([k])=>k.startsWith('patronage:')));blocked=true;await p.action('buy-again').props.onTap();assert.equal(p.modals.length,1);assert.equal(JSON.stringify(Object.entries(p.h.storage).filter(([k])=>k.startsWith('patronage:'))),before);p.scope.stop()
})
test('hide unload relogin and account switch discard late login and never POST',async()=>{
 for(const mode of ['hide','unload','relogin','account']){
  const p=livePage();let login;p.h.uni.login=o=>login=o;await p.life.show[0]();const buying=p.action('purchase').props.onTap();await tick();p.modals[0].success({confirm:true});await tick();assert.ok(login)
  if(mode==='hide')p.life.hide[0]();else if(mode==='unload')p.life.unload[0]();else if(mode==='relogin')p.relogin();else p.h.storage.client_profile={id:2}
  login.success({code:'late-code'});await buying;assert.equal(p.requests.some(o=>o.url.endsWith('/purchases/')),false);assert.doesNotMatch(p.text(),/购买成功/);p.scope.stop()
 }
})
test('hide unload relogin and account switch discard late POST and preserve durable unknown',async()=>{
 for(const mode of ['hide','unload','relogin','account']){
  let post;const p=livePage({request:(o,end)=>{if(end==='purchases/'){post=o;return true}}});await p.life.show[0]();const buying=p.action('purchase').props.onTap();await tick();p.modals[0].success({confirm:true});await tick();assert.ok(post)
  if(mode==='hide')p.life.hide[0]();else if(mode==='unload')p.life.unload[0]();else if(mode==='relogin')p.relogin();else p.h.storage.client_profile={id:2}
  post.success({statusCode:200,data:record('paid',{idempotency_key:post.data.idempotency_key})});await buying
  assert.doesNotMatch(p.text(),/购买成功/);assert.equal(p.requests.filter(o=>o.url.endsWith('/by-key/')).length,0)
  const journal=Object.entries(p.h.storage).find(([k])=>k.startsWith('patronage:'))[1];assert.equal(journal.dispatch_started,true);assert.equal(journal.payment_status,'unknown');p.scope.stop()
 }
})
test('a hidden older onShow completion cannot replace the newer active payment controller',async()=>{
 let firstQuote,quotes=0,login;const p=livePage({request:(o,end)=>{if(end==='quotes/'&&++quotes===1){firstQuote=o;return true}}});p.h.uni.login=o=>login=o
 const oldShow=p.life.show[0]();await tick();p.life.hide[0]();await p.life.show[0]();const buying=p.action('purchase').props.onTap();await tick();p.modals[0].success({confirm:true});await tick();assert.ok(login)
 firstQuote.success({statusCode:200,data:{...quote(),can_submit:true,blockers:[]}});await oldShow;login.success({code:'code'});await buying
 assert.equal(p.requests.filter(o=>o.url.endsWith('/purchases/')).length,1);assert.match(p.text(),/购买成功/);p.scope.stop()
})
test('active purchase button keeps full-width brand-green styling while disabled is muted',()=>{
 const fs=require('node:fs'),{parse}=require('@vue/compiler-sfc'),postcss=require('postcss');const css=parse(fs.readFileSync(require('node:path').join(__dirname,'../src/pages/client/patronage/index.vue'),'utf8')).descriptor.styles[0].content
 const rules={};postcss.parse(css).walkRules(r=>{rules[r.selector]=Object.fromEntries(r.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]))})
 assert.equal(rules['.purchase-button'].background,'#1f7c4b');assert.equal(rules['.purchase-button'].color,'#fff');assert.equal(rules['.purchase-button'].width,'100%');assert.notEqual(rules['.purchase-button[disabled]'].background,rules['.purchase-button'].background)
})
test('corrupt local journal visibly disables buying even when backend flags are enabled',async()=>{
 const p=livePage();p.h.storage['patronage:payment-intent:v1:1']={version:999};await p.life.show[0]();assert.equal(p.action('purchase').props.disabled,true);assert.match(p.text(),/恢复记录异常/);p.scope.stop()
})
test('catalog withdrawal during confirmation overrides a still-ready quote and cannot dispatch',async()=>{
 let reads=0;const p=livePage({request:(o,end)=>{if(end==='catalog/'&&++reads>1){const c=catalog();c.purchase_enabled=true;c.packages[0].available=false;c.packages[0].blockers=['UNAVAILABLE'];o.success({statusCode:200,data:c});return true}}});await p.life.show[0]();const buying=p.action('purchase').props.onTap();await tick();p.modals[0].success({confirm:true});await buying
 assert.equal(p.requests.some(o=>o.url.endsWith('/purchases/')),false);assert.match(p.text(),/购买条件已变化/);p.scope.stop()
})
test('day-pass actual selection confirms backend 3400 diamonds and original-key fulfilment with seven bonus days',async()=>{
 const q={...quote(),package_code:'day_pass',amount_yuan:'340.00',amount_diamonds:'3400.0',platform_amount_yuan:'85.00',player_amount_yuan:'255.00',available_diamonds:'4000.0',can_submit:true,blockers:[]}
 const p=livePage({request:(o,end)=>{if(end==='quotes/'&&o.data.package_code==='day_pass'){o.success({statusCode:200,data:q});return true}if(end==='purchases/'||end==='purchases/by-key/'){o.success({statusCode:200,data:record('paid',{idempotency_key:o.data.idempotency_key,package_code:'day_pass',package_name:'包天',amount_yuan:'340.00',amount_diamonds:'3400.0',bonus_naming_days:7,expires_at:'2026-10-06T00:01:00Z'})});return true}}})
 await p.life.show[0]();await p.action('package-day_pass').props.onTap();assert.equal(p.action('purchase').props.disabled,false);assert.match(p.text(),/不限制服务时长/)
 const task=p.action('purchase').props.onTap();await tick();assert.match(p.modals[0].content,/包天.*3400.0 钻/);p.modals[0].success({confirm:true});await task
 assert.equal(p.requests.find(o=>o.url.endsWith('/purchases/')).data.package_code,'day_pass');assert.match(p.text(),/购买成功/);p.scope.stop()
})
test('quote price changes after modal require a fresh user confirmation, never auto-charge new amount',async()=>{
 let quotes=0;const p=livePage({request:(o,end)=>{if(end==='quotes/'&&++quotes>1){o.success({statusCode:200,data:{...quote(),can_submit:true,blockers:[],price_version:'b'.repeat(64),amount_yuan:'200.00',amount_diamonds:'2000.0'}});return true}}})
 await p.life.show[0]();const task=p.action('purchase').props.onTap();await tick();p.modals[0].success({confirm:true});await task
 assert.equal(p.requests.some(o=>o.url.endsWith('/purchases/')),false);assert.match(p.text(),/价格已变化/);assert.equal(p.modals.length,1);p.scope.stop()
})
test('explicit abandon of a never-sent prepared intent archives it only after pending clears',async()=>{
 const h=harness({'@/utils/sessionExpiry':{getClientSessionGeneration:()=> '0',handleSessionExpiry:()=>null}}),api=h.load('src/api/patronage.ts');let n=0,count=1
 const memory={},c=h.load('src/utils/patronagePaymentIntent.ts').createPatronagePaymentIntent({session:()=>({accountId:'1',loginGeneration:'0'}),newKey:()=>`key-${++n}`,storage:{get:k=>memory[k],set:(k,v)=>memory[k]=structuredClone(v)},pending:async()=>({count,next:null,previous:null,results:[]}),adapter:api.createPatronagePaymentAdapter(async()=>{throw Error('not dispatched')})})
 const q={...quote(),can_submit:true,blockers:[]};const original=c.prepare(q);await assert.rejects(c.startNew({...q,package_code:'week'}));assert.equal(n,1);count=0;const next=await c.startNew({...q,package_code:'week'});assert.equal(next.package_code,'week');assert.notEqual(next.idempotency_key,original.idempotency_key);assert.equal(Object.entries(memory).find(([k])=>k.includes(':archive:'))[1].dispatch_started,false)
})
const key='patronage-fixture-key'
const record=(status='unknown',extra={})=>({purchase_no:'PN-fixture',idempotency_key:key,price_version:'a'.repeat(64),player_id:7,player_name:'陪玩甲',package_code:'day',package_name:'日冠',amount_yuan:'188.00',amount_diamonds:'1880.0',payment_status:status,created_at:'2026-09-29T00:00:00Z',paid_at:status==='paid'?'2026-09-29T00:01:00Z':null,starts_at:status==='paid'?'2026-09-29T00:01:00Z':null,expires_at:status==='paid'?'2026-09-30T00:01:00Z':null,bonus_naming_days:0,blockers:[],...extra})
test('v4 parser binds key/version and paid fulfilment; pending reads numbered pages with client credentials',async()=>{
 const h=harness({'@/utils/sessionExpiry':{getClientSessionGeneration:()=> '0',handleSessionExpiry:()=>null}}),api=h.load('src/api/patronage.ts'),calls=[]
 assert.equal(api.parsePatronagePurchase(record('paid')).idempotency_key,key)
 for(const patch of [{idempotency_key:''},{price_version:'bad'},{starts_at:null},{expires_at:null},{expires_at:'2026-09-28T00:00:00Z'}])assert.throws(()=>api.parsePatronagePurchase(record('paid',patch)))
 h.uni.request=o=>{calls.push(o);o.success({statusCode:200,data:{count:2,next:'https://evil.invalid',previous:null,results:[record()]}})}
 const page=await api.getPatronagePending(2);assert.equal(page.count,2);assert.equal(page.results[0].idempotency_key,key)
 assert.equal(calls[0].url,'https://fixture.invalid/api/patronage/purchases/pending/');assert.deepEqual(calls[0].data,{page:2});assert.equal(calls[0].header.Authorization,'Bearer fixture-session-a')
 const adapter=api.createPatronagePaymentAdapter(async()=>record('paid',{idempotency_key:'other'}));await assert.rejects(adapter.byKey(key));await assert.rejects(adapter.purchase({player_id:7,package_code:'day',price_version:'a'.repeat(64),idempotency_key:key}))
})
test('explicit new purchase archives GET-confirmed intent, checks server count, never rotates unknown or POST-only paid',async()=>{
 const h=harness({'@/utils/sessionExpiry':{getClientSessionGeneration:()=> '0',handleSessionExpiry:()=>null}}),api=h.load('src/api/patronage.ts');let n=0,pending={count:0,next:null,previous:null,results:[]},status='unknown'
 const memory={},storage={get:k=>memory[k],set:(k,v)=>memory[k]=structuredClone(v)}
 const adapter=api.createPatronagePaymentAdapter(async(method,ep,data)=>record(status,{idempotency_key:data.idempotency_key}))
 const c=h.load('src/utils/patronagePaymentIntent.ts').createPatronagePaymentIntent({session:()=>({accountId:'1',loginGeneration:'a'}),storage,adapter,newKey:()=>`key-${++n}`,pending:async()=>pending})
 const q={...quote(),can_submit:true,blockers:[]};c.prepare(q);await c.dispatch();assert.equal(typeof c.startNew,'function');await assert.rejects(c.startNew(q));assert.equal(n,1)
 status='paid';await c.recover();pending={count:21,next:'evil',previous:null,results:[]};await assert.rejects(c.startNew(q));assert.equal(n,1)
 pending={count:0,next:null,previous:null,results:[]};const next=await c.startNew(q);assert.equal(next.idempotency_key,'key-2');assert.equal(next.dispatch_started,false)
 const archives=Object.entries(memory).filter(([k])=>k.includes(':archive:'));assert.equal(archives.length,1);assert.equal(archives[0][1].idempotency_key,'key-1');assert.equal(archives[0][1].confirmed_by_key,true)
 await c.dispatch();assert.equal(c.snapshot().confirmed_by_key,false);await assert.rejects(c.startNew(q));assert.equal(n,2)
})
