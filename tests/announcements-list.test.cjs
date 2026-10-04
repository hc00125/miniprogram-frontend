const test=require('node:test'),assert=require('node:assert/strict')
const {setup,row,tick}=require('./announcements-harness.cjs')
test('feed defaults to all; category switch ignores late old response and resets pagination',async()=>{
 const s=setup('src/pages/client/announcements/index.vue')
 try{
  s.life.load[0]({});s.life.show[0]();assert.equal(s.requests[0].data.kind,'all');assert.match(s.text(),/全部/)
  s.action('filter-gift').props.onTap();assert.equal(s.requests[1].data.kind,'gift');assert.equal(s.requests[1].data.page,1)
  s.respond(s.requests[1],[row('gift',9)]);await tick();s.respond(s.requests[0],[row('patronage',1)]);await tick()
  assert.match(s.text(),/玫瑰/);assert.ok(!s.text().includes('周冠'))
  s.action('filter-patronage').props.onTap();assert.equal(s.requests[2].data.kind,'patronage');s.respond(s.requests[2],[row('patronage',2)]);await tick();assert.match(s.text(),/周冠/);assert.ok(!s.text().includes('玫瑰'))
  assert.ok(s.requests.every(r=>r.method==='GET'));assert.ok(!s.text().includes('等级晋升'))
 }finally{s.close()}
})
test('feed renders both real avatars and gift artwork with quantity; broken images have explicit fallback',async()=>{
 const s=setup('src/pages/client/announcements/index.vue')
 try{
  s.life.load[0]({kind:'gift'});s.life.show[0]();s.respond(s.requests[0],[{...row('gift',9),quantity:3,boss_avatar_url:'https://images.invalid/boss.png',player_avatar_url:'https://images.invalid/player.png',item_image_url:'https://images.invalid/gift.png'}]);await tick()
  for(const role of ['boss','player','item'])assert.ok(s.action(`image-${role}-gift:9`))
  assert.match(s.text(),/老板甲/);assert.match(s.text(),/陪玩乙/);assert.match(s.text(),/玫瑰/);assert.match(s.text(),/×3/)
  for(const role of ['boss','player','item'])s.action(`image-${role}-gift:9`).props.onError()
  assert.ok(!s.tree().some(n=>n.type==='image'));assert.match(s.text(),/礼物/)
  s.action('record').props.onTap();assert.deepEqual(s.calls.at(-1),['/pages/player/detail/index',{playerId:7}])
 }finally{s.close()}
})
test('history ignores hidden/previous generation reads and shows genuine empty response',async()=>{
 const s=setup('src/pages/client/announcements/index.vue')
 try{
  s.life.load[0]({kind:'gift'});s.life.show[0]();const old=s.requests[0]
  s.life.hide[0]();s.respond(old);await tick();assert.ok(!s.text().includes('玫瑰'))
  s.life.show[0]();s.respond(s.requests[1],[]);await tick();assert.match(s.text(),/暂无通报/)
  s.life.show[0]();const stale=s.requests[2];s.life.hide[0]();s.life.show[0]();s.respond(s.requests[3],[]);await tick()
  s.respond(stale);await tick();assert.match(s.text(),/暂无通报/);assert.ok(!s.text().includes('玫瑰'))
 }finally{s.close()}
})
test('history deduplicates overlapping offset pages when a new event arrives',async()=>{
 const s=setup('src/pages/client/announcements/index.vue')
 try{
  s.life.load[0]({});s.life.show[0]();s.respond(s.requests[0],Array.from({length:20},(_,i)=>row('patronage',i+1)),22);await tick()
  s.action('more').props.onTap();s.action('more')?.props.onTap();assert.equal(s.requests.length,2)
  s.respond(s.requests[1],[row('patronage',20),row('patronage',21)],22);await tick()
  assert.equal(s.tree().filter(n=>n.props?.['data-action']==='record').length,21)
  assert.equal(s.action('more'),undefined)
 }finally{s.close()}
})
test('public history loads gift kind, paginates, retries failed page without skipping and navigates to player',async()=>{
 const s=setup('src/pages/client/announcements/index.vue')
 try {
  s.life.load[0]({kind:'gift'});s.life.show[0]();assert.equal(s.requests.length,1)
  s.respond(s.requests[0],Array.from({length:20},(_,i)=>row('gift',i+1)),21);await tick()
  assert.match(s.text(),/礼物通报/);s.action('more').props.onTap();assert.equal(s.requests[1].data.page,2)
  s.requests[1].fail({});await tick();assert.match(s.text(),/加载失败/)
  s.action('retry').props.onTap();assert.equal(s.requests[2].data.page,2)
  s.respond(s.requests[2],[row('gift',21)],21);await tick()
  assert.equal(s.tree().filter(n=>n.props?.['data-action']==='record').length,21);assert.equal(s.action('more'),undefined)
  s.action('record').props.onTap();assert.deepEqual(s.calls.at(-1),['/pages/player/detail/index',{playerId:7}])
  assert.ok(s.requests.every(r=>r.method==='GET'))
 }finally{s.close()}
})
