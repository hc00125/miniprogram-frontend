const {test}=require('node:test'),assert=require('node:assert/strict'),vue=require('vue')
const {harness,nodes}=require('./commerce-sfc-harness.cjs')
const tick=()=>new Promise(setImmediate)
const readonly={contract_version:'1.0-readonly',catalog_read:true,records_read:true,inventory_read:true,purchase_supported:false,quote_supported:false,purchase_enabled:false,inventory_transfer_enabled:false,inventory_quote_supported:false,recipient_eligible:null,max_quantity:null,max_diamonds:null,daily_diamonds:null,policy_version:null,blockers:['READ_ONLY_RELEASE']}
function mount(h,file,props={}){const C=h.load(file).default,scope=vue.effectScope(),draw=scope.run(()=>C.setup(props,{expose(){},emit(){}}));return {tree:()=>nodes(draw(props,[])),stop:()=>scope.stop()}}
test('readonly release hides surcharge host without requests; record page explains browsing',async()=>{
 const h=transport(),hosts=Array.from({length:20},(_,i)=>mount(h,'src/components/orders/OrderSurchargeHost.vue',{orderNo:'existing-'+i}));for(const show of h.hooks.show)await show();for(const m of hosts){assert.ok(!m.tree().some(n=>n.props?.['data-action']==='refresh'));m.stop()}assert.equal(h.calls.length,0);h.safe()
 const hr=harness({'@/api/giftCommerce':{readGiftRecords:async()=>({results:[],count:0,next:null,previous:null})},'@/utils/giftCheckout':{createGiftCheckout:()=>({invalidate(){},recovery:()=>null})}}),r=mount(hr,'src/pages/client/gifts/index.vue');await hr.hooks.show[0]();assert.match(text(r.tree()),/本页只读展示本人记录/);r.stop()
})
function transport(){const h=harness(),calls=[],navigation=[];let logins=0,payments=0;Object.assign(h.uni,{request:o=>calls.push(o),login:()=>{logins++},requestPayment:()=>{payments++},requestVirtualPayment:()=>{payments++},navigateTo:o=>navigation.push(o.url),setStorageSync:(k,v)=>h.storage[k]=v,removeStorageSync:k=>delete h.storage[k]});return {...h,calls,navigation,safe:()=>{assert.ok(calls.every(c=>c.method==='GET'));assert.equal(logins,0);assert.equal(payments,0)}}}
const reply=(c,data,statusCode=200)=>c.success({data,statusCode})
const empty={count:0,results:[],next:null,previous:null}
test('real API + checkout + SFC browse pagination/navigation is 0 POST and 0 wx login/payment',async()=>{
 const h=transport(),m=mount(h,'src/components/gifts/GiftLiveSheet.vue',{recipient:{id:'12',name:'对象'}})
 assert.match(h.calls[0].url,/capabilities/);reply(h.calls[0],readonly);await tick()
 const item={code:'fixture-only',name:'测试边界商品',image_url:'https://fixture.invalid/image.png',price_diamonds:7,description:''}
 reply(h.calls[1],{count:21,results:[item],next:'https://untrusted.invalid',previous:null});await tick()
 const grid=m.tree().find(n=>n.props?.items);assert.deepEqual(grid.props.items,[item]);grid.props.onSelect(item)
 assert.ok(!m.tree().some(n=>['quote','pay'].includes(n.props?.['data-action'])))
 m.tree().find(n=>n.children==='下一页').props.onTap();assert.deepEqual(h.calls[2].data,{page:2});assert.match(h.calls[2].url,/\/gifts\/catalog\/$/);reply(h.calls[2],{...empty,previous:'x'});await tick()
 m.tree().find(n=>n.children==='我的礼物').props.onTap();assert.deepEqual(h.navigation,['/pages/client/gifts/index']);h.safe();m.stop()
})
test('real records API errors are not empty, pagination and all five tabs remain GET; switch discards late data',async()=>{
 const h=transport(),m=mount(h,'src/pages/client/gifts/index.vue'),action=a=>m.tree().find(n=>n.props?.['data-action']===a)
 h.hooks.show[0]();reply(h.calls[0],{detail:'记录服务未部署'},404);await tick();assert.match(text(m.tree()),/记录服务未部署/);assert.doesNotMatch(text(m.tree()),/本页暂无记录/)
 action('refresh').props.onTap();reply(h.calls[1],{...empty,count:21,next:'untrusted'});await tick();action('next').props.onTap();assert.equal(h.calls[2].data.page,2);reply(h.calls[2],empty);await tick()
 for(const tab of ['purchase-records','sent','received','earnings']){action(tab).props.onTap();assert.ok(h.calls.at(-1).url.endsWith('/'+tab+'/'));reply(h.calls.at(-1),empty);await tick()}
 action('refresh').props.onTap();const old=h.calls.at(-1);h.hooks.hide[0]();h.storage.token='other-session';h.storage.client_profile={id:2};h.hooks.show[0]();reply(old,{...empty,results:[{id:999}]});reply(h.calls.at(-1),empty);await tick();assert.doesNotMatch(text(m.tree()),/999/);h.safe();m.stop()
})
test('real capability 404/503 and stale session never reveal host; late catalog discarded',async()=>{
 for(const status of [404,503]){const h=transport(),m=mount(h,'src/components/gifts/GiftHost.vue',{recipientId:12,recipientName:'对象'});h.hooks.show[0]();reply(h.calls[0],{detail:'不可用'},status);await tick();assert.ok(!m.tree().some(n=>n.props?.['data-action']==='open-gift'));h.safe();m.stop()}
 const h=transport(),m=mount(h,'src/components/gifts/GiftLiveSheet.vue',{recipient:{id:'12',name:'对象'}});reply(h.calls[0],readonly);await tick();h.storage.token='relogin';reply(h.calls[1],{...empty,results:[{code:'old',name:'旧数据',price_diamonds:1,image_url:'x',description:''}]});await tick();assert.ok(!m.tree().some(n=>n.props?.items?.length));h.safe();m.stop()
})
const text=t=>t.map(n=>typeof n.children==='string'?n.children:'').join('|')
test('readonly host offers 查看礼物; future enabled offers 送礼物; 404 and session changes hide entry',async()=>{
 let value=readonly,fail=false;const h=harness({'@/api/giftCommerce':{readGiftCapabilities:async()=>{if(fail)throw {statusCode:404};return value}}}),m=mount(h,'src/components/gifts/GiftHost.vue',{recipientId:12,recipientName:'对象'})
 await h.hooks.show[0]();assert.match(text(m.tree()),/查看礼物/)
 value={...readonly,purchase_supported:true,quote_supported:true,purchase_enabled:true,blockers:[]};await h.hooks.show[0]();assert.match(text(m.tree()),/送礼物/)
 fail=true;await h.hooks.show[0]();assert.ok(!m.tree().some(n=>n.props?.['data-action']==='open-gift'));m.stop()
})
test('readonly real sheet shows catalog and recipient but no purchase controls; empty and failed catalog differ',async()=>{
 let failure=false;const h=harness({'@/api/giftCommerce':{readGiftCapabilities:async()=>readonly},'@/api/gifts':{getGiftCatalog:async()=>{if(failure)throw new Error('目录服务失败');return {results:[],next:null,previous:null}}},'@/utils/giftCheckout':{createGiftCheckout:()=>({invalidate(){},recovery:()=>null}),giftGate(){throw new Error('blocked')}}})
 let m=mount(h,'src/components/gifts/GiftLiveSheet.vue',{recipient:{id:'12',name:'真实对象'}});await tick()
 assert.match(text(m.tree()),/当前仅浏览，购买\/赠送未开放/);assert.match(text(m.tree()),/真实对象/)
 assert.ok(!m.tree().some(n=>['quote','pay','buy-inventory'].includes(n.props?.['data-action'])));assert.doesNotMatch(text(m.tree()),/数量|充值|余额|目录合计/)
 const grid=m.tree().find(n=>n.props?.items);assert.equal(grid.props['empty-text'],'暂无上架礼物，请管理员配置');m.stop()
 failure=true;m=mount(h,'src/components/gifts/GiftLiveSheet.vue',{recipient:{id:'12',name:'对象'}});await tick();assert.match(text(m.tree()),/目录服务失败/);assert.ok(!m.tree().some(n=>n.props?.items));m.stop()
})
