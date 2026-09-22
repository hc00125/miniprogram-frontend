const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('vue')
const { parse } = require('@vue/compiler-sfc')
const { baseParse, compile } = require('@vue/compiler-dom')
const { renderToString } = require('@vue/server-renderer')
const root = path.join(__dirname, '..')
const read = p => fs.readFileSync(path.join(root, p), 'utf8')
function icons() {
  const module = { exports: {} }
  vm.runInNewContext(ts.transpileModule(read('src/utils/uiIcons.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports })
  return module.exports.uiIcons
}
function fragment(page, cls) {
  const template = parse(read(page.startsWith('src/') ? page : 'src/pages/' + page + '/index.vue')).descriptor.template.content
  let found
  function walk(n) {
    if (n.props?.some(p => p.name === 'class' && p.value?.content.split(' ').includes(cls))) found ||= n.loc.source
    n.children?.forEach(walk)
  }
  walk(baseParse(template)); assert.ok(found, cls)
  return found
}
async function render(page, cls, state = {}) {
  const source = fragment(page, cls)
  const render = new Function('Vue', compile(source, { mode: 'function', prefixIdentifiers: true, isCustomElement: t => ['view','text','image','scroll-view'].includes(t) }).code)(vue)
  return renderToString(vue.createSSRApp({ setup: () => ({ uiIcons: icons(), ...state }), render }))
}

function asset(html,name) { assert.ok(html.includes('/icons/duotone/'+name+'.png'), name+' pictogram missing') }
test('phase2 all original scripts, directives, button text and monetary interpolations are preserved',()=>{
 const {contract,files}=require('./secondary-icons-phase2-helpers.cjs'),expected=require('./secondary-icons-phase2-contracts.json');
 for(const p of files)assert.deepEqual(contract(read(p)),expected[p],p)
})
test('payment SFC waiting verification collection and diamond icons keep brand and status gates',async()=>{
 const template=parse(read('src/pages/boss/payment/index.vue')).descriptor.template.content;
 for(const key of ['clock','verification','payment','diamond'])assert.match(template,new RegExp('uiIcons\\.'+key));
 const html=await render('boss/payment','amount-row',{diamond:x=>String(x),amountCardValue:123});asset(html,'diamond');assert.match(html,/123/);
 const methods=await render('boss/payment','pay-methods',{isIOS:false,payMethod:'wechat',selectPayMethod(){},diamond:x=>String(x),orderAmount:123,balanceSufficient:true,balanceOptionSub:'余额说明',walletBalance:123,walletLoadFailed:false});
 asset(methods,'diamond');assert.match(methods,/>微</);assert.match(methods,/微信即时支付/);
 const ios=await render('boss/payment','pay-methods',{isIOS:true,payMethod:'balance',selectPayMethod(){},balanceSufficient:true,balanceOptionSub:'余额说明',walletBalance:123,walletLoadFailed:false});assert.doesNotMatch(ios,/微信即时支付/)
})

function iconModule(){const module={exports:{}};vm.runInNewContext(ts.transpileModule(read('src/utils/uiIcons.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});return module.exports}
function pageFunctions(page,names){const module={exports:{}};const script=parse(read('src/pages/'+page+'/index.vue')).descriptor.scriptSetup.content;vm.runInNewContext(ts.transpileModule(script+'\nmodule.exports={'+names.join(',')+'}',{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,require:n=>n==='vue'?vue:n==='@/utils/uiIcons'?iconModule():n==='@/utils/diamonds'?{formatDiamonds:x=>String(x)}:n==='@dcloudio/uni-app'?{onShow(){},onReachBottom(){}}:{}});return module.exports}
test('ledger SFC uses real entry/source type maps without altering amount functions or income/deduction classes',async()=>{
 const funcs=iconModule(),wallet=pageFunctions('client/wallet',['isIncome','amountText','entryTypeText','diamonds','dateTime']),growth=pageFunctions('client/growth-records',['amountText','recordTypeText','diamonds','dateTime']);
 for(const [type,key] of Object.entries({recharge:'income',order_payment:'expense',refund_in:'refund',admin_adjust:'adjustment',unknown:'adjustment'})){
  for(const amount of [-12,0,12]){const item={entry_type:type,amount_diamonds:amount,balance_after_diamonds:37};
   const html=await render('client/wallet','record-main',{...wallet,...funcs,item});asset(html,key+(amount>0?'':'-red'));assert.ok(html.includes(wallet.amountText(item)));assert.ok(html.includes(wallet.entryTypeText(type)));assert.match(html,new RegExp(amount>0?'amount-in':'amount-out'));
  }
 }
 for(const [type,key] of Object.entries({order:'income',refund:'refund',manual:'adjustment',backfill:'backfill',unknown:'adjustment'})){
  for(const amount of [-12,0,12]){const item={source_type:type,amount_diamonds:amount,balance_after_diamonds:37};
   const html=await render('client/growth-records','record-card',{...growth,...funcs,item,records:[item]});asset(html,key+(amount>=0?'':'-red'));assert.ok(html.includes(growth.amountText(amount)));assert.match(html,new RegExp(amount>=0?'amount-plus':'amount-minus'));
  }
 }
})

test('account room, feedback light icon and red danger warning preserve all original actions',async()=>{
 asset(await render('client/account','vip-room-icon'),'room');
 const feedback=await render('client/complaints','feedback-action',{create(){}});asset(feedback,'feedback-light');assert.match(feedback,/提交反馈/);
 for(const mode of ['targeted','public'])for(const allowed of [false,true]){
  const html=await render('src/components/OrderReplacementCard.vue','replacement-card',{replacement:{active:true,mode,can_request_cancel:allowed,phase:'in_service'},title:'补位',subtitle:'说明',remainingText:'1小时',working:false,handleReassign(){},handlePublishPublic(){},handleCancelRemaining(){}});
  assert.equal(html.includes('/icons/duotone/warning-light.png'),allowed);assert.equal(html.includes('danger-strong'),allowed);
  if(allowed)assert.ok(html.includes(mode==='targeted'?'取消剩余服务':'取消剩余服务并退款'));
 }
})

test('static standalone diamond units render local assets while button and dynamic strings remain untouched',async()=>{
 const cases=[['shop/detail','price-wrap',{diamondFromYuan:x=>String(x),productPrice:123,displaySpecCount:0,hourlyService:true}],['shop/cart','cart-price',{item:{price:123},diamondAmount:x=>String(x),isHourlyItem:()=>true}],['shop/checkout','row total',{diamondAmount:x=>String(x),totalAmount:123}]];
 // Select individual classes from actual templates (not synthetic markup).
 for(const [page,cls,state] of cases){const actual=cls==='row total'?'total':cls;const html=await render(page,actual,state);asset(html,'diamond');assert.match(html,/123/)}
 const wallet=await render('client/wallet','balance-block',{overviewUnavailable:false,overview:{balance_diamonds:123},diamonds:x=>String(x),reloadAll(){},goRecharge(){}});asset(wallet,'diamond-light');assert.match(wallet,/123/);
 asset(await render('client/growth-records','summary-value',{growthDiamonds:123,diamonds:x=>String(x)}),'diamond-light');
 const inProgress=parse(read('src/pages/boss/in-progress/index.vue')).descriptor.template.content;assert.match(inProgress,/uiIcons.diamond/);
 const grab=parse(read('src/pages/player/grab/index.vue')).descriptor.template.content;assert.match(grab,/uiIcons.diamond/);
})
