const {test}=require('node:test'),assert=require('node:assert/strict')
const {setup,tick,catalog,quote}=require('./patronage-harness.cjs')
test('v3 approved duration, renewal, half-yuan rate and manual support copy render without enabling purchase',async()=>{
 const c=catalog();c.purchase_enabled=true;c.packages.push({code:'year',kind:'naming',name:'年冠',duration_days:365,amount_yuan:'9999.00',amount_diamonds:'99990.0',available:true,blockers:[]})
 const p=setup(purchase,{getPatronageCatalog:async()=>c,getPatronageQuote:async(id,code)=>({...quote(),package_code:code,can_submit:true,blockers:[]})})
 p.life.load[0]({playerId:'7'});await p.life.show[0]();await p.action('package-year').props.onTap()
 assert.match(p.text(),/365天/);assert.match(p.text(),/付款成功后生效/);assert.match(p.text(),/同老板同陪玩续购累加/)
 assert.match(p.text(),/未到期从原到期日延长/);assert.match(p.text(),/已到期从本次付款起算/)
 await p.action('package-day_pass').props.onTap();assert.match(p.text(),/0.5元步长/);assert.match(p.text(),/赠送一周冠名（7天），按同一规则累加/)
 assert.match(p.text(),/暂不提供自助退款/);assert.match(p.text(),/客服人工核实处理/)
 p.action('support').props.onTap();assert.deepEqual(p.calls[0],['/pages/client/customer-service/index'])
 assert.equal(p.action('purchase').props.disabled,true);assert.equal(typeof p.action('purchase').props.onTap,'function')
 assert.doesNotMatch(p.text(),/规则待确认|YEAR_DURATION_UNCONFIRMED|不予退款/);p.scope.stop()
 const r=setup('src/pages/client/patronage/records.vue',{getPatronageRecords:async()=>({count:0,next:null,previous:null,results:[]})});await r.life.show[0]()
 assert.match(r.text(),/暂不提供自助退款/);r.action('support').props.onTap();assert.deepEqual(r.calls[0],['/pages/client/customer-service/index']);r.scope.stop()
})
test('failed/missing capability or unverified pending never enable purchase; guest never POSTs quote',async()=>{
 for(const mode of ['failed','true','missing','guest','unconfigured']){
  let quotes=0
  const p=setup(purchase,{getPatronageCatalog:async()=>{if(mode==='failed')throw Error('503');const c=catalog();if(mode==='true')c.purchase_enabled=true;if(mode==='missing')delete c.purchase_enabled;if(mode==='unconfigured')c.packages=c.packages.map(x=>({...x,available:false,amount_diamonds:null,blockers:['HOURLY_RATE_UNSET']}));return c},getPatronageQuote:async()=>{quotes++;return {...quote(),can_submit:true,blockers:[]}}})
  if(mode==='guest')delete p.h.storage.token
  p.life.load[0]({playerId:'7'});await p.life.show[0]();assert.equal(p.action('purchase').props.disabled,true);assert.equal(typeof p.action('purchase').props.onTap,'function')
  if(['failed','guest','unconfigured'].includes(mode))assert.equal(quotes,0)
  if(mode==='unconfigured')assert.match(p.text(),/包天时薪暂未设置/)
  p.scope.stop()
 }
})
test('purchase discards late quote on hide, clears private values on expiry and never claims success',async()=>{
 let resolveQuote
 const p=setup(purchase,{getPatronageCatalog:async()=>catalog(),getPatronageQuote:()=>new Promise(r=>resolveQuote=r)})
 p.life.load[0]({playerId:'7'});const show=p.life.show[0]();await tick();p.life.hide[0]();resolveQuote(quote());await show;assert.doesNotMatch(p.text(),/2000.0|购买成功/)
 const again=p.life.show[0]();await tick();p.ui.events['session:expired']('token');resolveQuote(quote());await again;assert.doesNotMatch(p.text(),/2000.0/);assert.match(p.text(),/登录已过期/);p.scope.stop()
})
test('records SFC shows distinct states, empty/failure states and safe numbered pagination',async()=>{
 const calls=[],responses=[]
 const p=setup('src/pages/client/patronage/records.vue',{getPatronageRecords:page=>{calls.push(page);return new Promise((resolve,reject)=>responses.push({resolve,reject}))}})
 const first=p.life.show[0]();responses[0].resolve({count:5,next:'https://untrusted.invalid',previous:null,results:['created','processing','unknown','paid','failed'].map((s,i)=>({purchase_no:`PN${i}`,player_name:'陪玩甲',package_name:'日冠',amount_diamonds:'1880.0',payment_status:s,created_at:'2026-09-29T00:00:00Z',paid_at:null,starts_at:null,expires_at:null,bonus_naming_days:0,blockers:[]}))});await first
 for(const label of ['待支付','支付处理中','支付结果待确认','已支付','支付失败'])assert.match(p.text(),new RegExp(label))
 const next=p.action('next').props.onTap();assert.deepEqual(calls,[1,2]);responses[1].resolve({count:5,next:null,previous:'x',results:[]});await next;assert.match(p.text(),/暂无冠名或包天记录/)
 const refresh=p.action('refresh').props.onTap();responses[2].reject(Error('503'));await refresh;assert.match(p.text(),/加载失败/)
 p.scope.stop()
})
test('records hide and expiry clear private records and ignore delayed replies',async()=>{
 let resolve
 const p=setup('src/pages/client/patronage/records.vue',{getPatronageRecords:()=>new Promise(r=>resolve=r)})
 const show=p.life.show[0]();p.life.hide[0]();resolve({count:1,next:null,previous:null,results:[{purchase_no:'SECRET',payment_status:'paid'}]});await show;assert.doesNotMatch(p.text(),/SECRET/)
 delete p.h.storage.token;await p.life.show[0]();assert.match(p.text(),/登录/);p.scope.stop()
})
test('crowns component shows multiple bosses, independent failure and real player-specific entry',async()=>{
 let fail=false
 const p=setup('src/components/PatronageCrowns.vue',{getPatronageCrowns:async id=>{assert.equal(id,7);if(fail)throw Error('404');return [{id:1,boss_name:'老板甲',boss_avatar_url:'',package_name:'日冠',expires_at:'2026-10-01T00:00:00Z',source:'purchase'},{id:2,boss_name:'老板乙',boss_avatar_url:'',package_name:'周冠',expires_at:'2026-10-02T00:00:00Z',source:'day_pass_bonus'}]}},{playerId:7})
 await p.life.show[0]();assert.match(p.text(),/老板甲/);assert.match(p.text(),/老板乙/);assert.match(p.text(),/包天赠送/);p.action('patronage-entry').props.onTap();assert.deepEqual(p.calls[0],['/pages/client/patronage/index',{playerId:7}])
 fail=true;await p.action('crowns-refresh').props.onTap();assert.match(p.text(),/冠名暂时加载失败/);assert.doesNotMatch(p.text(),/老板甲/);assert.ok(p.action('patronage-entry'));p.scope.stop()
})
test('crowns empty response is not fabricated; page routes and existing entry hosts retain prior features',async()=>{
 const p=setup('src/components/PatronageCrowns.vue',{getPatronageCrowns:async()=>[]},{playerId:7});await p.life.show[0]();assert.match(p.text(),/暂无有效冠名/);p.scope.stop()
 const fs=require('node:fs'),path=require('node:path'),{parse,compileScript}=require('@vue/compiler-sfc'),root=path.join(__dirname,'..')
 const pages=JSON.parse(fs.readFileSync(path.join(root,'src/pages.json'),'utf8'));assert.equal(pages.pages[0].path,'pages/boss/home/index');assert.equal(pages.tabBar.list.length,5)
 for(const name of ['index','records'])assert.ok(pages.pages.some(p=>p.path===`pages/client/patronage/${name}`))
 const detail=fs.readFileSync(path.join(root,'src/pages/player/detail/index.vue'),'utf8'),profile=fs.readFileSync(path.join(root,'src/pages/client/profile/index.vue'),'utf8')
 assert.match(detail,/<PatronageCrowns[^>]*:player-id="player.id"/);assert.match(detail,/<GiftHost/);assert.match(detail,/openPlayerProduct/);assert.match(profile,/\/pages\/client\/patronage\/records/);assert.match(profile,/\/pages\/client\/gifts\/index/);assert.match(profile,/<MainBottomTabs/)
 for(const [name,source] of [['detail',detail],['profile',profile]]){const parsed=parse(source);assert.equal(parsed.errors.length,0);assert.ok(compileScript(parsed.descriptor,{id:name}).content)}
})
test('real page plus real API parser uses only catalog GET and quote POST and keeps backend strings',async()=>{
 const p=setup(purchase),requests=[],c=catalog()
 c.packages=[['day','日冠',1,'1880.0'],['week','周冠',7,'5200.0'],['month','月冠',30,'13140.0'],['quarter','季冠',90,'28880.0'],['year','年冠',null,'99990.0']].map(([code,name,duration_days,amount_diamonds])=>({code,name,duration_days,amount_diamonds,amount_yuan:'188.00',available:true,blockers:[],kind:'naming'})).concat(c.packages[1])
 p.h.uni.request=o=>{requests.push(o);o.success({statusCode:200,data:o.method==='GET'?c:{...quote(),package_code:o.data.package_code,amount_diamonds:c.packages.find(x=>x.code===o.data.package_code).amount_diamonds}})}
 p.life.load[0]({playerId:'7'});await p.life.show[0]();for(const amount of ['1880.0','5200.0','13140.0','28880.0','99990.0','3400.0'])assert.ok(p.text().includes(amount))
 await p.action('package-year').props.onTap();assert.match(p.text(),/1年/);assert.equal(requests.length,4);assert.ok(requests.every(o=>/\/(catalog|quotes|pending)\/$/.test(o.url)));assert.equal(typeof p.action('purchase').props.onTap,'function');p.scope.stop()
})
test('late prior package quote cannot replace latest selection; quote error removes old amount',async()=>{
 const pending=[],p=setup(purchase,{getPatronageCatalog:async()=>catalog(),getPatronageQuote:(id,code)=>new Promise((resolve,reject)=>pending.push({code,resolve,reject}))})
 p.life.load[0]({playerId:'7'});const show=p.life.show[0]();await tick();pending[0].resolve(quote());await show
 const older=p.action('package-day').props.onTap(),newer=p.action('package-day_pass').props.onTap()
 pending[2].resolve({...quote(),package_code:'day_pass',amount_diamonds:'3400.0'});await newer;pending[1].resolve({...quote(),amount_diamonds:'BAD-STALE'});await older;assert.doesNotMatch(p.text(),/BAD-STALE/)
 const refresh=p.action('quote').props.onTap();pending[3].reject(Error('503'));await refresh;assert.match(p.text(),/报价暂不可用/);assert.doesNotMatch(p.text(),/2000.0/);p.scope.stop()
})
const purchase='src/pages/client/patronage/index.vue'
test('closed purchase SFC loads catalog and quotes but disables its integrated payment event',async()=>{
 const calls=[],p=setup(purchase,{getPatronageCatalog:async id=>{calls.push(['catalog',id]);return catalog()},getPatronageQuote:async(id,code)=>{calls.push(['quote',id,code]);return {...quote(),package_code:code,amount_diamonds:code==='day_pass'?'3400.0':'1880.0'}}})
 p.life.load[0]({playerId:'7'});await p.life.show[0]();await tick();assert.deepEqual(calls[0],['catalog',7]);assert.match(p.text(),/陪玩甲/);assert.match(p.text(),/1880.0/);assert.match(p.text(),/尚未开放/)
 await p.action('package-day_pass').props.onTap();assert.match(p.text(),/3400.0/);assert.match(p.text(),/赠送一周冠名/);assert.match(p.text(),/计价/)
 const submit=p.action('purchase');assert.equal(submit.props.disabled,true);assert.equal(typeof submit.props.onTap,'function');assert.ok(calls.every(c=>['catalog','quote'].includes(c[0])));p.scope.stop()
})
