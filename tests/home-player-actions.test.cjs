const {test}=require('node:test'),assert=require('node:assert/strict')
const {homeHarness,descriptor}=require('./home-reference-harness.cjs')
const players=[{id:12,name:'陪玩甲',avatar_url:'/fixture-a.png',type_name:'技术陪',can_be_designated:false},{id:34,name:'陪玩乙',avatar_url:'/fixture-b.png',type_name:'娱乐陪'}]
test('recommended cards show patronage then gift in one action row with matching recipients',async()=>{
 const h=homeHarness({players});try{await h.load();const html=await h.html();
 const rows=[...html.matchAll(/<view class="player-actions"[^>]*>([\s\S]*?)<\/view>/g)].map(m=>m[1]);assert.equal(rows.length,2)
 rows.forEach((row,i)=>{assert.ok(row.indexOf('冠名/包天')<row.indexOf('送礼物'));assert.match(row,new RegExp(`data-recipient-id="${players[i].id}"`))})
 assert.match(descriptor.styles[0].content,/\.player-actions\s*\{[^}]*display:\s*flex/)
 }finally{h.scope.stop()}
})
test('patronage entry targets its own player without using designation gate or submitting payment',async()=>{
 const h=homeHarness({players});try{await h.load();h.state.openPlayerPatronage(players[0]);h.state.openPlayerPatronage(players[1]);
 assert.equal(JSON.stringify(h.calls.filter(c=>c[0]!=='wallet-read')),JSON.stringify([['/pages/client/patronage/index',{playerId:12}],['/pages/client/patronage/index',{playerId:34}]]))
 assert.match(descriptor.template.content,/@tap\.stop="openPlayerPatronage\(player\)"/)
 assert.match(descriptor.template.content,/<GiftHost[^>]*\bcompact\b[^>]*:recipient-id="player.id"[^>]*:recipient-name="player.name"/)
 }finally{h.scope.stop()}
})
