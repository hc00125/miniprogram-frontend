const {test}=require('node:test'),assert=require('node:assert/strict'),vue=require('vue')
const {harness,nodes}=require('./commerce-sfc-harness.cjs')
const tick=()=>new Promise(setImmediate)
const cap={catalog_read:true,records_read:true,inventory_read:true,purchase_enabled:true,purchase_supported:true,quote_supported:true,recipient_eligible:true,max_quantity:10,max_diamonds:100,daily_diamonds:null,policy_version:'v1',blockers:[]}
const item={code:'free_heart',name:'免费心心',image_url:'https://fixture.invalid/heart.png',price_diamonds:0,description:'不扣钻，不产生收益'}

test('zero-price receipts are labelled free, never falsely labelled as paid money',()=>{
 const api=harness().load('src/api/giftCommerce.ts')
 assert.equal(api.paymentLabel('paid',0),'已完成（免费）')
 assert.equal(api.paymentLabel('paid',1),'已付款')
})

test('free catalog card, real controller and API complete without login/payment or client price authority',async()=>{
 const h=harness(),calls=[]
 h.uni.login=()=>{throw new Error('free gift must not request a payment login code')}
 h.uni.request=o=>{
  const path=new URL(o.url).pathname;calls.push([o.method,path,o.data])
  if(path.endsWith('/catalog/'))o.success({statusCode:200,data:{count:1,next:null,previous:null,results:[item]}})
  else if(path.endsWith('/capabilities/'))o.success({statusCode:200,data:cap})
  else if(path.endsWith('/quotes/'))o.success({statusCode:200,data:{...o.data,price_version:'a'.repeat(64),commission_version:1,total_diamonds:0,available_diamonds:'0.00',policy_version:'v1',can_submit:true,blockers:[]}})
  else if(path.endsWith('/purchases/'))o.success({statusCode:200,data:{purchase_no:'free-1',payment_status:'paid',amount_diamonds:0,blockers:[]}})
  else throw new Error(path)
 }
 h.uni.setStorageSync=(k,v)=>h.storage[k]=v;h.uni.removeStorageSync=k=>delete h.storage[k]
 const C=h.load('src/components/gifts/GiftLiveSheet.vue').default,scope=vue.effectScope(),props={recipient:{id:'12',name:'收礼人'}},draw=scope.run(()=>C.setup(props,{expose(){},emit(){}})),tree=()=>nodes(draw(props,[])),button=a=>tree().find(n=>n.props?.['data-action']===a)
 await tick();const grid=tree().find(n=>n.props?.onSelect);assert.ok(grid,'zero price must remain visible');assert.equal(grid.props.items[0].price_diamonds,0)
 grid.props.onSelect(item);await button('quote').props.onTap();await tick();assert.ok(button('pay'));assert.equal(button('pay').props.disabled,false)
 assert.match(JSON.stringify(button('pay').children),/免费/)
 await button('pay').props.onTap();await tick()
 const submitted=calls.filter(x=>x[1].endsWith('/purchases/'));assert.equal(submitted.length,1)
 assert.equal(submitted[0][2].code,'');assert.equal(submitted[0][2].total_diamonds,undefined)
 assert.equal(button('pay'),undefined);assert.ok(tree().some(n=>typeof n.children==='string'&&n.children.includes('free-1')))
 scope.stop()
})
