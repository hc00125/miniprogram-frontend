const {test}=require('node:test'),assert=require('node:assert/strict'),vue=require('vue')
const {harness,nodes}=require('./commerce-hosts.test.cjs')
const cap={catalog_read:true,purchase_enabled:true,purchase_supported:true,quote_supported:true,recipient_eligible:true,max_quantity:2,max_diamonds:20,daily_diamonds:100,policy_version:'v1',blockers:[]}
const q={gift_code:'rose',quantity:1,mode:'direct',recipient_id:12,price_version:'a'.repeat(64),commission_version:0,total_diamonds:10,available_diamonds:'10.50',policy_version:'v1',can_submit:true,blockers:[]}
const tick=()=>new Promise(setImmediate)
test('real host uses confirmed recipient capability even when purchases disabled and mounts live sheet',async()=>{
 const calls=[],h=harness({'@/api/giftCommerce':{readGiftCapabilities:async id=>{calls.push(id);return {...cap,purchase_enabled:false}}}})
 const C=h.load('src/components/gifts/GiftHost.vue').default,scope=vue.effectScope(),props=vue.reactive({recipientId:12,recipientName:'甲'})
 const draw=scope.run(()=>C.setup(props,{expose(){}})),tree=()=>nodes(draw(props,[]))
 await h.hooks.show[0]();assert.deepEqual(calls,[12]);const entry=tree().find(n=>n.props?.['data-action']==='open-gift');assert.ok(entry);entry.props.onTap({stopPropagation(){}})
 assert.ok(tree().some(n=>n.props?.recipient?.id==='12'));h.hooks.hide[0]();assert.ok(!tree().some(n=>n.props?.recipient?.id==='12'));scope.stop()
})
test('purchase-to-inventory mode drops recipient, refreshes unscoped capability and never transfers stock',async()=>{
 const calls=[],h=harness({'@/api/giftCommerce':{readGiftCapabilities:async id=>{calls.push(['cap',id]);return cap},hasDiamonds:()=>true,paymentLabel:s=>s},'@/api/gifts':{getGiftCatalog:async()=>({results:[{code:'rose',name:'玫瑰',price_diamonds:10}],next:null,previous:null})},'@/utils/giftCheckout':{createGiftCheckout:()=>({invalidate(){},recovery:()=>null,quote:async s=>{calls.push(['quote',s]);return {...q,mode:'inventory',recipient_id:null,commission_version:null}}}),giftGate(){}}})
 const C=h.load('src/components/gifts/GiftLiveSheet.vue').default,scope=vue.effectScope(),props={recipient:{id:'12',name:'甲'}},draw=scope.run(()=>C.setup(props,{expose(){},emit(){}})),tree=()=>nodes(draw(props,[]));await tick();const toggle=tree().find(n=>n.props?.['data-action']==='buy-inventory');assert.ok(toggle);await toggle.props.onTap();await tick();assert.deepEqual(calls[1],['cap',undefined]);tree().find(n=>n.props?.onSelect).props.onSelect({code:'rose',name:'玫瑰',price_diamonds:10});await tree().find(n=>n.props?.['data-action']==='quote').props.onTap();assert.deepEqual(calls[2],['quote',{gift_code:'rose',quantity:1,mode:'inventory'}]);scope.stop()
})
test('live sheet hides synchronously on page hide and rejects late quote before unmount',async()=>{
 let finish,invalidations=0;const h=harness({'@/api/giftCommerce':{readGiftCapabilities:async()=>cap,hasDiamonds:()=>true,paymentLabel:s=>s},'@/api/gifts':{getGiftCatalog:async()=>({results:[{code:'rose',name:'玫瑰',price_diamonds:10}],next:null,previous:null})},'@/utils/giftCheckout':{createGiftCheckout:()=>({invalidate(){invalidations++},recovery:()=>null,quote:()=>new Promise(resolve=>finish=resolve)}),giftGate(){}}})
 const C=h.load('src/components/gifts/GiftLiveSheet.vue').default,scope=vue.effectScope(),props={recipient:{id:'12',name:'甲'}},draw=scope.run(()=>C.setup(props,{expose(){},emit(){}})),tree=()=>nodes(draw(props,[]));await tick();tree().find(n=>n.props?.onSelect).props.onSelect({code:'rose',name:'玫瑰',price_diamonds:10});tree().find(n=>n.props?.['data-action']==='quote').props.onTap();const before=invalidations;assert.ok(h.hooks.hide.length);h.hooks.hide[0]();assert.ok(invalidations>before);finish(q);await tick();assert.ok(!tree().some(n=>typeof n.children==='string'&&n.children.includes('10.50')));scope.stop()
})
test('live sheet quotes then explicit confirmation; decimal balance displayed; unknown only queries; inventory disabled',async()=>{
 const calls=[],controller={invalidate(){},recovery:()=>calls.some(c=>c[0]==='pay')?{state:'unknown',business_no:'original'}:null,quote:async(...args)=>{calls.push(['quote',...args]);return q},pay:async(...args)=>{calls.push(['pay',...args]);return {purchase_no:'original',payment_status:'unknown'}},recover:async()=>{calls.push(['get']);return {purchase_no:'original',payment_status:'unknown'}}}
 const h=harness({'@/api/giftCommerce':{readGiftCapabilities:async()=>cap,hasDiamonds:()=>true,paymentLabel:s=>s},'@/api/gifts':{getGiftCatalog:async()=>({results:[{code:'rose',name:'玫瑰',price_diamonds:10}],next:null,previous:null})},'@/utils/giftCheckout':{createGiftCheckout:()=>controller,giftGate(){}}})
 const C=h.load('src/components/gifts/GiftLiveSheet.vue').default,scope=vue.effectScope(),props=vue.reactive({recipient:{id:'12',name:'固定收礼人'}})
 const draw=scope.run(()=>C.setup(props,{expose(){},emit(){}})),tree=()=>nodes(draw(props,[])),button=a=>tree().find(n=>n.props?.['data-action']===a)
 await tick();tree().find(n=>n.props?.onSelect).props.onSelect({code:'rose',name:'玫瑰',price_diamonds:10});await button('quote').props.onTap();await tick()
 assert.ok(tree().some(n=>typeof n.children==='string'&&n.children.includes('10.50')));assert.equal(calls.length,1)
 await button('pay').props.onTap();await tick();assert.equal(calls[1][0],'pay');assert.equal(button('pay'),undefined)
 await button('recover').props.onTap();assert.equal(calls[2][0],'get');assert.ok(tree().some(n=>typeof n.children==='string'&&n.children.includes('库存专用报价')))
 scope.stop()
})
