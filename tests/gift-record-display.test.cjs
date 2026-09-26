const test = require('node:test')
const assert = require('node:assert/strict')
const vue = require('vue')
const { harness, nodes } = require('./commerce-sfc-harness.cjs')
const SENT = { transfer_no:'GT-human-record', gift_code:'gift_test_heart_free', gift_name:'小心心', sender_name:'chen2', recipient_name:'小绪', image_url:'https://unit.test/heart.png', quantity:10, status:'delivered', created_at:'2026-09-26T09:11:15.590786+00:00' }
function text(node) {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(text).join(' ')
  if (!node || typeof node !== 'object') return ''
  return typeof node.children === 'object' && !Array.isArray(node.children) ? '' : text(node.children)
}
const button = (tree, label) => nodes(tree).filter(v => v.type === 'button').find(v => text(v).includes(label))
const settle = () => new Promise(resolve => setImmediate(resolve))
async function page(record=SENT) {
  const calls=[]
  const h=harness({
    '@/components/RoleSwitcher.vue': {__esModule:true, default:{}},
    '@/utils/request': {BASE_URL:'https://unit.test/api'},
    '@/stores/role': {useRoleStore:()=>({currentRole:'boss',bootstrap:async()=>{}})},
    '@/utils/giftCheckout': {createGiftCheckout:()=>({invalidate(){},recovery:()=>null})},
  })
  h.uni.request=options=>{
    calls.push({url:options.url,method:options.method})
    const results=[record]
    options.success({statusCode:200,data:{count:results.length,next:null,previous:null,results}})
  }
  const scope=vue.effectScope()
  const draw=scope.run(()=>h.load('src/pages/client/gifts/index.vue').default.setup({}, {expose(){}}))
  const render=()=>draw({},[])
  await h.hooks.show[0]()
  async function open(label) { const target=button(render(),label); assert.ok(target,'缺少标签：'+label); target.props.onTap(); await settle(); await vue.nextTick(); return render() }
  return {h,render,open,calls,close:()=>scope.stop()}
}

test('sent and received render actual names and gift through the real API parser, not raw codes', async()=>{
  const p=await page()
  for (const tab of ['送出记录','收到记录']) {
    const tree=await p.open(tab), content=text(tree)
    assert.match(content,/小心心\s*×\s*10/)
    assert.match(content,/赠送人：chen2/)
    assert.match(content,/收礼人：小绪/)
    assert.match(content,/已送达/)
    assert.ok(nodes(tree).some(v=>v.type==='image'&&v.props.src===SENT.image_url))
    assert.match(content,/2026-09-26 \d{2}:11/)
    assert.doesNotMatch(content,/gift_test_heart_free|delivered|T09:11:15|\+00:00/)
    const references=nodes(tree).filter(v=>String(v.props?.class||'').includes('record-reference'))
    assert.equal(references.length,1)
    assert.match(text(references[0]),/GT-human-record/)
    assert.ok(p.calls.every(c=>c.method==='GET'),'viewing and switching never purchase/send')
  }
  assert.ok(p.calls.some(c=>c.url.endsWith('/gifts/sent/')))
  assert.ok(p.calls.some(c=>c.url.endsWith('/gifts/received/')))
  p.close()
})

test('old API records and unknown status have readable fallbacks, never internal codes or raw timestamps',async()=>{
  const {gift_name,sender_name,recipient_name,...old}=SENT
  const p=await page({...old,status:'future_internal_state',created_at:'not-a-date'})
  const content=text(await p.open('送出记录'))
  assert.match(content,/礼物/)
  assert.match(content,/赠送人：昵称暂不可用/)
  assert.match(content,/收礼人：昵称暂不可用/)
  assert.match(content,/状态待确认/)
  assert.match(content,/时间暂不可用/)
  assert.doesNotMatch(content,/gift_test_heart_free|future_internal_state|not-a-date|NaN/)
  p.close()
})


test('backpack shows image, stock and acquired time rather than product codes',async()=>{
 const p=await page({lot_id:8,name:'小星星',gift_code:'internal_star',remaining:3,available:2,status:'active',image_url:'https://unit.test/star.png',created_at:SENT.created_at})
 const tree=await p.open('我的背包'),content=text(tree)
 assert.match(content,/小星星/);assert.match(content,/剩余 3 件/);assert.match(content,/可赠送 2 件/)
 assert.match(content,/获得时间：2026-09-26/);assert.doesNotMatch(content,/internal_star/)
 assert.ok(nodes(tree).some(v=>v.type==='image'&&v.props.src==='https://unit.test/star.png'))
 p.close()
})
test('earnings show source, per-batch quantity, real credited fish and no raw blocker codes',async()=>{
 const p=await page({id:5,gift_name:'小星星',sender_name:'chen2',quantity:2,image_url:'https://unit.test/star.png',
 status:'available',monetary_accrual:true,currency:'fish',wallet_destination:'player_wallet',net_amount:'1.50',credited_amount:'1.00',debt_offset_amount:'0.50',available_amount:'0.00',blockers:[],credited_at:SENT.created_at})
 const content=text(await p.open('礼物收益'))
 assert.match(content,/小星星 × 2/);assert.match(content,/赠送人：chen2/)
 assert.match(content,/已入钱包 1.00 鱼干/);assert.match(content,/0.50 鱼干/);assert.match(content,/入账时间：2026-09-26/)
 assert.doesNotMatch(content,/available|服务端金额/);p.close()
})
test('pending and unknown earning states are readable and never imply actual credit',async()=>{
 const p=await page({id:6,gift_name:'小星星',sender_name:'chen2',quantity:1,status:'frozen',monetary_accrual:false,net_amount:'0.00',available_amount:'0.00',blockers:['ACCRUAL_BASIS_UNCONFIRMED','FUTURE_INTERNAL_CODE'],credited_at:null})
 const content=text(await p.open('礼物收益'))
 assert.match(content,/待计提/);assert.match(content,/冻结/);assert.match(content,/收益计算依据尚未确认/)
 assert.doesNotMatch(content,/ACCRUAL_BASIS_UNCONFIRMED|FUTURE_INTERNAL_CODE|frozen|已入钱包|入账时间/);p.close()
})


test('broken gift image uses a placeholder and leaves the readable record intact',async()=>{
 const p=await page();let tree=await p.open('送出记录')
 const image=nodes(tree).find(v=>v.type==='image');assert.ok(image)
 image.props.onError();await vue.nextTick();tree=p.render()
 assert.equal(nodes(tree).filter(v=>v.type==='image').length,0)
 assert.match(text(tree),/小心心/);assert.match(text(tree),/赠送人：chen2/);p.close()
})
test('purchase records identify gift, quantity, destination and time while preserving payment facts',async()=>{
 const p=await page({purchase_no:'GP-history',amount_diamonds:10,payment_status:'paid',blockers:[],gift_name:'小星星',quantity:10,mode:'direct',recipient_name:'小绪',created_at:SENT.created_at,image_url:SENT.image_url})
 const tree=await p.open('购买记录'),content=text(tree)
 assert.match(content,/小星星 × 10/);assert.match(content,/金额：10 钻石/);assert.match(content,/状态：已付款/)
 assert.match(content,/购买方式：直接赠送/);assert.match(content,/收礼人：小绪/);assert.match(content,/购买时间：2026-09-26/)
 assert.ok(nodes(tree).some(v=>v.type==='image'&&v.props.src===SENT.image_url))
 assert.ok(nodes(tree).some(v=>String(v.props?.class||'').includes('record-reference')&&text(v).includes('GP-history')))
 assert.ok(p.calls.every(c=>c.method==='GET'));p.close()
})
test('free inventory purchase and unknown payment remain distinct, with no fabricated receiver',async()=>{
 for (const status of ['paid','unknown']) {
  const p=await page({purchase_no:'GP-free',amount_diamonds:0,payment_status:status,blockers:[],gift_name:'小心心',quantity:1,mode:'inventory',created_at:SENT.created_at})
  const content=text(await p.open('购买记录'))
  assert.match(content,/购买方式：买入背包/);assert.doesNotMatch(content,/收礼人/)
  if(status==='paid')assert.match(content,/已完成（免费）/)
  else {assert.match(content,/付款结果未知/);assert.doesNotMatch(content,/已完成|已付款/)}
  p.close()
 }
})

test('a reversed gift is labeled revoked, not refunded or still delivered',async()=>{
  const p=await page({...SENT,status:'reversed'})
  const content=text(await p.open('收到记录'))
  assert.match(content,/已撤销/)
  assert.doesNotMatch(content,/已退款|已送达|reversed/)
  p.close()
})
