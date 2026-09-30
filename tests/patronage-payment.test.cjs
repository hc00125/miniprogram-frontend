// Fixtures replace HTTP only. No live requests or real wallet operations.
const {test}=require('node:test'),assert=require('node:assert/strict')
const {harness}=require('./commerce-sfc-harness.cjs')
function apiHarness(){const h=harness({'@/utils/sessionExpiry':{getClientSessionGeneration:()=> '0',handleSessionExpiry:()=>null}});return {...h,api:h.load('src/api/patronage.ts')}}
const input=()=>({player_id:7,package_code:'day',price_version:'a'.repeat(64),idempotency_key:'patronage-original/&?键'})
const record=(status='unknown')=>({purchase_no:'PN-fixture',idempotency_key:input().idempotency_key,price_version:input().price_version,player_id:7,player_name:'陪玩',package_code:'day',package_name:'日冠',amount_yuan:'188.00',amount_diamonds:'1880.0',payment_status:status,created_at:'2026-09-29T00:00:00Z',paid_at:status==='paid'?'2026-09-29T00:01:00Z':null,starts_at:status==='paid'?'2026-09-29T00:01:00Z':null,expires_at:status==='paid'?'2026-09-30T00:01:00Z':null,bonus_naming_days:0,blockers:[]})
const {quote}=require('./patronage-harness.cjs')
function intentHarness(transport,shared){
 const h=apiHarness(),memory=shared||{},calls=[]
 let session={accountId:'1',loginGeneration:'login-a'},keyCount=0
 const storage={get:k=>memory[k],set:(k,v)=>{memory[k]=structuredClone(v)}}
 const adapter=h.api.createPatronagePaymentAdapter(async(...args)=>{calls.push(args);return transport(...args)})
 const create=()=>h.load('src/utils/patronagePaymentIntent.ts').createPatronagePaymentIntent({session:()=>session,storage,newKey:()=>{keyCount++;return input().idempotency_key},adapter})
 return {...h,memory,storage,calls,create,session:v=>{session=v},keys:()=>keyCount}
}
const readyQuote=()=>({...quote(),can_submit:true,blockers:[]})
test('durable original intent records send before POST; timeout and reload permit only explicit same-key GET',async()=>{
 const fs=require('node:fs');assert.ok(fs.existsSync(require('node:path').join(__dirname,'../src/utils/patronagePaymentIntent.ts')),'payment intent module exists')
 const h=intentHarness(async(method)=>{if(method==='POST'){const persisted=Object.values(h.memory)[0];assert.equal(persisted.dispatch_started,true);throw Error('fixture timeout')}return record('paid')})
 const c=h.create(),prepared=c.prepare(readyQuote());assert.equal(prepared.dispatch_started,false);assert.equal(h.keys(),1)
 await assert.rejects(c.dispatch('wx-code-fixture'),/timeout/);assert.equal(c.snapshot().payment_status,'unknown')
 const reconstructed=h.create();assert.equal(reconstructed.snapshot().idempotency_key,prepared.idempotency_key)
 await assert.rejects(reconstructed.dispatch(),/原交易/);assert.throws(()=>reconstructed.prepare({...readyQuote(),package_code:'week'}),/原交易/)
 assert.equal((await reconstructed.recover()).payment_status,'paid');assert.equal(reconstructed.snapshot().confirmed_by_key,true)
 assert.equal(reconstructed.snapshot().dispatch_started,true);assert.equal(h.keys(),1)
 assert.deepEqual(h.calls.map(x=>x[0]),['POST','GET']);assert.equal(h.calls[1][2].idempotency_key,prepared.idempotency_key)
 assert.doesNotMatch(JSON.stringify(h.memory),/wx-code-fixture|login-a|fixture-session-a/)
})
test('overlapping original-key reads cannot erase dispatch fact or downgrade a verified terminal result',async()=>{
 let resolveRead,resolvePost
 const h=intentHarness(method=>new Promise(resolve=>{if(method==='POST')resolvePost=resolve;else resolveRead=resolve}))
 const c=h.create();c.prepare(readyQuote());const other=h.create()
 const read=other.recover();const pay=c.dispatch();resolveRead(record('created'));await read
 assert.equal(c.snapshot().dispatch_started,true,'GET that began before POST cannot clear send fact')
 resolvePost(record('paid'));await pay;assert.equal(c.snapshot().confirmed_by_key,false,'POST paid is not original-key confirmation')
 const verified=c.recover();resolveRead(record('paid'));await verified
 assert.equal(c.snapshot().confirmed_by_key,true)
 const stale=other.recover();resolveRead(record('created'));await assert.rejects(stale,/状态|原交易/)
 assert.equal(c.snapshot().payment_status,'paid');assert.equal(c.snapshot().confirmed_by_key,true)
 await assert.rejects(other.dispatch(),/原交易/);assert.equal(h.calls.filter(x=>x[0]==='POST').length,1)
})
test('recover validates immutable selection, exact decimal value and pinned business number before persisting',async()=>{
 let reply=record('unknown');const h=intentHarness(async()=>reply),c=h.create();c.prepare(readyQuote());await c.dispatch()
 const original=c.snapshot()
 for(const patch of [{player_id:8},{package_code:'week'},{amount_yuan:'187.00'},{amount_diamonds:'1881.0'},{purchase_no:'PN-wrong'}]){
  reply={...record('paid'),...patch};await assert.rejects(c.recover(),/匹配|原交易/);assert.deepEqual(c.snapshot(),original)
 }
 reply={...record('paid'),amount_yuan:'188.000',amount_diamonds:'1880'}
 assert.equal((await c.recover()).payment_status,'paid')
})
test('hide/unload invalidation rejects late responses, clears view and preserves original recovery slot',async()=>{
 let resolve;const h=intentHarness(()=>new Promise(r=>resolve=r)),c=h.create();c.prepare(readyQuote());const pending=c.dispatch()
 assert.equal(typeof c.invalidate,'function');c.invalidate();assert.equal(c.snapshot(),null)
 resolve(record('paid'));await assert.rejects(pending,/关闭|登录/)
 const next=h.create();assert.equal(next.snapshot().payment_status,'unknown');assert.equal(next.snapshot().dispatch_started,true)
 await assert.rejects(next.dispatch(),/原交易/)
 const read=next.recover();next.invalidate();resolve(record('paid'));await assert.rejects(read,/关闭|登录/)
 assert.equal(Object.values(h.memory)[0].payment_status,'unknown')
})
test('account switch and same-account relogin invalidate old controller without leaking or replaying old key',async()=>{
 for(const replacement of [{accountId:'2',loginGeneration:'login-b'},{accountId:'1',loginGeneration:'login-b'}]){
  let resolve;const h=intentHarness(()=>new Promise(r=>resolve=r)),c=h.create();c.prepare(readyQuote());const pending=c.dispatch()
  h.session(replacement);assert.equal(c.snapshot(),null);resolve(record('paid'));await assert.rejects(pending,/登录/)
  await assert.rejects(c.recover(),/登录|关闭/);assert.equal(h.calls.length,1)
  const fresh=h.create();if(replacement.accountId==='2')assert.equal(fresh.snapshot(),null);else assert.equal(fresh.snapshot().dispatch_started,true)
  h.session({accountId:'1',loginGeneration:'login-c'});assert.equal(h.create().snapshot().idempotency_key,input().idempotency_key)
 }
})
test('corrupt journals and invalid generated keys fail closed; legacy send marker absence is conservative',async()=>{
 const seed=intentHarness(async()=>record()),s=seed.create();s.prepare(readyQuote());const [slot,original]=Object.entries(seed.memory)[0]
 for(const change of [v=>v.version=2,v=>v.account_id='other',v=>v.idempotency_key='',v=>v.dispatch_started='false',v=>v.amount_yuan=188,v=>v.payment_status='success',v=>v.confirmed_by_key='false']){
  const value=structuredClone(original);change(value);const h=intentHarness(async()=>record(),{[slot]:value}),c=h.create()
  assert.throws(()=>c.prepare(readyQuote()),/原交易|响应/);await assert.rejects(c.dispatch());await assert.rejects(c.recover());assert.equal(h.calls.length,0);assert.equal(h.keys(),0)
 }
 const legacy={...original};delete legacy.dispatch_started;const h=intentHarness(async()=>record('created'),{[slot]:legacy}),c=h.create()
 assert.equal(c.snapshot().dispatch_started,true);await assert.rejects(c.dispatch(),/原交易/);await c.recover();assert.equal(c.snapshot().dispatch_started,true)
 const factory=seed.load('src/utils/patronagePaymentIntent.ts').createPatronagePaymentIntent
 const bad=factory({session:()=>({accountId:'9',loginGeneration:'test'}),storage:seed.storage,newKey:()=>''})
 assert.throws(()=>bad.prepare(readyQuote()),/响应|原交易/)
})
test('fresh confirmation binds immutable quote; rejected selection revokes previous approval',async()=>{
 const h=intentHarness(async()=>record()),c=h.create(),q=readyQuote(),p=c.prepare(q)
 q.player_id=888;p.player_id=999;assert.equal(c.snapshot().player_id,7)
 assert.throws(()=>c.prepare({...readyQuote(),price_version:'invalid'}))
 await assert.rejects(c.dispatch(),/报价/);assert.equal(h.calls.length,0)
 c.prepare(readyQuote());const slot=Object.keys(h.memory)[0];h.memory[slot].price_version='b'.repeat(64)
 await assert.rejects(c.dispatch(),/报价|原交易/);assert.equal(h.calls.length,0)
})
test('lost or rolled-back storage cannot reopen an already sent intent in a live controller',async()=>{
 for(const rollback of ['missing','prepared']){
  const h=intentHarness(async()=>{throw Error('timeout')}),c=h.create(),before=c.prepare(readyQuote());await assert.rejects(c.dispatch())
  const slot=Object.keys(h.memory)[0];if(rollback==='missing')delete h.memory[slot];else h.memory[slot]=before
  assert.throws(()=>c.prepare(readyQuote()),/原交易/);await assert.rejects(c.dispatch(),/原交易/)
  assert.equal(h.keys(),1);assert.equal(h.calls.length,1)
 }
})
test('default storage persists through platform storage, default controller cannot write even with ready quote',async()=>{
 const h=apiHarness();h.uni.setStorageSync=(k,v)=>{h.storage[k]=structuredClone(v)}
 let requests=0;h.uni.request=()=>{requests++;throw Error('unexpected live request')}
 const factory=h.load('src/utils/patronagePaymentIntent.ts').createPatronagePaymentIntent
 const deps={session:()=>({accountId:'1',loginGeneration:'non-secret-generation'}),newKey:()=>input().idempotency_key}
 const c=factory(deps);assert.doesNotThrow(()=>c.prepare(readyQuote()));await assert.rejects(c.dispatch(),/尚未开放/)
 assert.equal(c.snapshot().dispatch_started,false);assert.equal(factory(deps).snapshot().idempotency_key,input().idempotency_key);assert.equal(requests,0)
})
test('write failure or mismatching read-back prevents dispatch; failed result persistence retains original unknown',async()=>{
 for(const mode of ['throw','drop','rollback']){
  const h=intentHarness(async()=>record('paid')),c=h.create();c.prepare(readyQuote());const set=h.storage.set
  h.storage.set=(k,v)=>{if(mode==='throw')throw Error('storage failed');if(mode==='rollback')set(k,{...v,dispatch_started:false,payment_status:'prepared'})}
  await assert.rejects(c.dispatch());assert.equal(h.calls.length,0)
 }
 let rejectSave=false;const h=intentHarness(async()=>{rejectSave=true;return record('paid')}),c=h.create();c.prepare(readyQuote());const set=h.storage.set
 h.storage.set=(k,v)=>{if(rejectSave)throw Error('full');set(k,v)}
 await assert.rejects(c.dispatch(),/full/);assert.equal(c.snapshot().dispatch_started,true);assert.equal(c.snapshot().payment_status,'unknown')
 await assert.rejects(h.create().dispatch(),/原交易/);assert.equal(h.calls.length,1)
})
test('double taps, reconstructed prepared intents and quote blockers never auto-replay',async()=>{
 let resolve;const h=intentHarness(()=>new Promise(r=>resolve=r)),c=h.create();c.prepare(readyQuote())
 const reopened=h.create();await assert.rejects(reopened.dispatch(),/报价/)
 const pay=c.dispatch();await assert.rejects(c.dispatch(),/原交易/);await assert.rejects(reopened.dispatch(),/原交易/)
 resolve(record('created'));await pay;assert.equal(c.snapshot().dispatch_started,true);await assert.rejects(c.dispatch(),/原交易/);assert.equal(h.calls.length,1)
 for(const q of [{...readyQuote(),can_submit:false},{...readyQuote(),blockers:['PURCHASE_NOT_ENABLED']}]){
  const h=intentHarness(async()=>record()),c=h.create();c.prepare(q);await assert.rejects(c.dispatch(),/报价/);assert.equal(h.calls.length,0)
 }
})
test('real HTTP GET adapter plus intent preserves unknown on 404/503/401/malformed/network and rejects stale client session',async()=>{
 const h=apiHarness(),memory={},httpCalls=[];h.uni.setStorageSync=(k,v)=>{h.storage[k]=structuredClone(v)}
 const raw=h.api.createPatronagePaymentAdapter(),post=h.api.createPatronagePaymentAdapter(async()=>{throw Error('fixture POST timeout')})
 const factory=h.load('src/utils/patronagePaymentIntent.ts').createPatronagePaymentIntent
 const deps={session:()=>({accountId:'1',loginGeneration:'test'}),newKey:()=>input().idempotency_key,adapter:{purchase:post.purchase,byKey:raw.byKey}}
 const c=factory(deps);c.prepare(readyQuote());await assert.rejects(c.dispatch());const original=c.snapshot()
 for(const status of [404,503,401]){
  h.uni.request=o=>{httpCalls.push(o);assert.equal(o.method,'GET');o.success({statusCode:status,data:record('paid')})}
  await assert.rejects(c.recover());assert.deepEqual(c.snapshot(),original)
 }
 for(const value of [null,{...record('paid'),success:false},{...record(),amount_diamonds:'NaN'}]){
  h.uni.request=o=>{httpCalls.push(o);o.success({statusCode:200,data:value})};await assert.rejects(c.recover());assert.deepEqual(c.snapshot(),original)
 }
 h.uni.request=o=>{httpCalls.push(o);o.fail({errMsg:'timeout'})};await assert.rejects(c.recover());assert.deepEqual(c.snapshot(),original)
 let pending;h.uni.request=o=>{httpCalls.push(o);pending=o};const read=c.recover();h.storage.token='new-token';pending.success({statusCode:200,data:record('paid')});await assert.rejects(read,/登录/)
 assert.deepEqual(c.snapshot(),original);assert.ok(httpCalls.every(x=>x.data.idempotency_key===original.idempotency_key))
 await assert.rejects(factory(deps).dispatch(),/原交易/)
})
test('strict transaction parser rejects failure-shaped paid, missing identity/timestamp and mismatched POST replies',async()=>{
 const {api}=apiHarness()
 for(const patch of [{purchase_no:''},{payment_status:'success'},{amount_yuan:188},{paid_at:null},{success:false},{error:'failed'},{payment_status:'failed',paid_at:'2026-09-29T00:01:00Z'}]){
  assert.throws(()=>api.parsePatronagePurchase({...record('paid'),...patch}),/响应/)
 }
 const adapter=api.createPatronagePaymentAdapter(async()=>({...record('paid'),player_id:99}))
 await assert.rejects(adapter.purchase(input()),/匹配|响应/)
 for(const patch of [{idempotency_key:''},{idempotency_key:123},{player_id:0},{package_code:'other'},{price_version:'b'},{code:123}]){
  let count=0;const a=api.createPatronagePaymentAdapter(async()=>{count++;return record()})
  await assert.rejects(a.purchase({...input(),...patch}));assert.equal(count,0)
 }
})
test('v4 adapter constructs exact authenticated POST and original-key GET; real parser retains statuses',async()=>{
 const {api,uni,storage}=apiHarness(),calls=[]
 assert.equal(typeof api.createPatronagePaymentAdapter,'function')
 const adapter=api.createPatronagePaymentAdapter(async(method,endpoint,data)=>{calls.push({method,endpoint,data});return record()})
 assert.equal((await adapter.purchase({...input(),code:'ephemeral-code',surplus:'not sent'})).payment_status,'unknown')
 assert.deepEqual(calls[0],{method:'POST',endpoint:'purchases',data:{...input(),code:'ephemeral-code'}})
 await adapter.byKey(input().idempotency_key)
 assert.deepEqual(calls[1],{method:'GET',endpoint:'purchases/by-key',data:{idempotency_key:input().idempotency_key}})
 let requests=0;uni.request=o=>{requests++;assert.equal(o.method,'GET');assert.equal(o.url,'https://fixture.invalid/api/patronage/purchases/by-key/');assert.deepEqual(o.data,{idempotency_key:input().idempotency_key});assert.equal(o.header.Authorization,'Bearer fixture-session-a');o.success({statusCode:200,data:record()})}
 await api.createPatronagePaymentAdapter().byKey(input().idempotency_key);assert.equal(requests,1)
 delete storage.token;await assert.rejects(api.createPatronagePaymentAdapter().byKey(input().idempotency_key),/登录/)
})
