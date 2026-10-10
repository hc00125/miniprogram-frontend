const {test}=require('node:test'), assert=require('node:assert/strict')
const {harness}=require('./commerce-sfc-harness.cjs')
const {setup,catalog,quote}=require('./patronage-harness.cjs')
const terms={service_hours:'26.5',hourly_amount_yuan:'7.09',hourly_amount_diamonds:'70.9',service_terms_source:'player_override',service_terms_version:'2026-10-table-v1'}
test('real parser retains naming promise, and legacy lacks a promise',()=>{
 const api=harness().load('src/api/patronage.ts')
 assert.equal(api.parsePatronageQuote({...quote(),...terms}).service_hours,'26.5')
 assert.equal(api.parsePatronageQuote(quote()).service_hours,null)
 for(const bad of ['0','-1','2.25','NaN',true])assert.throws(()=>api.parsePatronageQuote({...quote(),...terms,service_hours:bad}))
})
test('owner settings renders server hours, saves only code and hours, ignores late hidden response',async()=>{
 const p=setup('src/components/PatronageServiceDurationSettings.vue'), calls=[]
 const response=()=>({...catalog(),packages:[{...catalog().packages[0],...terms}]})
 p.h.uni.request=o=>{calls.push(o);o.success({statusCode:200,data:response()})}
 await p.life.show[0]();assert.match(p.text(),/26.5/)
 p.action('hours-day').props.onInput({detail:{value:'30.5'}})
 await p.action('save-day').props.onTap()
 assert.deepEqual(calls.at(-1).data,{package_code:'day',service_hours:'30.5'})
 assert.match(p.text(),/26.5/)
 let late;p.h.uni.request=o=>late=o
 const loading=p.life.show[0]();p.life.hide[0]();late.success({statusCode:200,data:response()});await loading
 assert.doesNotMatch(p.text(),/26.5/);p.scope.stop()
})
test('compact crown tags reuse real API projection without inventing ranking',async()=>{
 const p=setup('src/components/PatronageCrowns.vue',{}, {playerId:7,compact:true})
 const now=Date.now()
 p.h.uni.request=o=>o.success({statusCode:200,data:{results:[{id:1,boss_name:'老板甲',boss_avatar_url:'',package_name:'日冠',source:'purchase',starts_at:new Date(now-1000).toISOString(),expires_at:new Date(now+60000).toISOString()}]}})
 await p.life.show[0]();assert.match(p.text(),/老板甲·日冠/);assert.equal(p.action('patronage-entry'),undefined);p.scope.stop()
})
test('purchase SFC displays quote terms separately from validity',async()=>{
 const p=setup('src/pages/client/patronage/index.vue')
 p.h.uni.request=o=>o.success({statusCode:200,data:o.url.includes('/catalog/')?catalog():o.url.includes('/quotes/')?{...quote(),...terms}:{count:0,next:null,previous:null,results:[]}})
 p.life.load[0]({playerId:'7'});await p.life.show[0]()
 assert.match(p.text(),/26.5.*小时/);assert.match(p.text(),/70.9/);p.scope.stop()
})
