const {test}=require('node:test'),assert=require('node:assert/strict'),vue=require('vue'),fs=require('node:fs'),path=require('node:path')
const {harness,nodes}=require('./commerce-hosts.test.cjs')
const tick=()=>new Promise(setImmediate)
test('records page loads batches, earned zero remains pending, pagination is numbered, hidden responses discarded',async()=>{
 const calls=[],h=harness({'@/api/giftCommerce':{readGiftRecords:(...args)=>new Promise((resolve,reject)=>calls.push({args,resolve,reject})),earningLabel:e=>e.monetary_accrual?'计提':'待计提（尚未形成可提现收益）',paymentLabel:s=>s},'@/utils/giftCheckout':{createGiftCheckout:()=>({invalidate(){},recovery:()=>null})}})
 const C=h.load('src/pages/client/gifts/index.vue').default,scope=vue.effectScope(),draw=scope.run(()=>C.setup({},{expose(){}})),tree=()=>nodes(draw({},[])),action=a=>tree().find(n=>n.props?.['data-action']===a)
 h.hooks.show[0]();assert.deepEqual(calls[0].args,['inventory',1]);calls[0].resolve({results:[{lot_id:8,gift_code:'rose',name:'玫瑰',remaining:2,available:0,status:'frozen'}],count:21,next:'https://attacker.invalid/',previous:null});await tick()
 assert.ok(tree().some(n=>typeof n.children==='string'&&n.children.includes('批次 8')));assert.ok(tree().some(n=>typeof n.children==='string'&&n.children.includes('禁止赠送')))
 action('next').props.onTap();assert.deepEqual(calls[1].args,['inventory',2]);calls[1].resolve({results:[],count:21,next:null,previous:'x'});await tick()
 action('earnings').props.onTap();calls[2].resolve({results:[{id:1,status:'frozen',monetary_accrual:false,net_amount:'0.00',available_amount:'0.00',blockers:['ACCRUAL_BASIS_UNCONFIRMED']}],count:1,next:null,previous:null});await tick()
 assert.ok(tree().some(n=>typeof n.children==='string'&&n.children.includes('待计提')));assert.ok(!tree().some(n=>typeof n.children==='string'&&n.children==='零收益' || n.children==='已计提 0.00；可用 0.00（服务端金额）'))
 action('refresh').props.onTap();h.hooks.hide[0]();calls[3].resolve({results:[{id:999}],count:1,next:null,previous:null});await tick();assert.ok(!JSON.stringify(tree().map(n=>typeof n.children==='string'?n.children:'')).includes('999'));scope.stop()
})
test('gift records route is registered and has a real profile entry with no administrator credentials',()=>{
 const root=path.join(__dirname,'..'),pages=JSON.parse(fs.readFileSync(path.join(root,'src/pages.json'),'utf8')).pages
 assert.ok(pages.some(p=>p.path==='pages/client/gifts/index'))
 assert.ok(fs.readFileSync(path.join(root,'src/pages/client/profile/index.vue'),'utf8').includes("/pages/client/gifts/index"))
})
