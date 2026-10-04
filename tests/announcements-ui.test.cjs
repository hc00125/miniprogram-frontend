const test=require('node:test'),assert=require('node:assert/strict')
const {setup,row,tick}=require('./announcements-harness.cjs')
test('hidden homepage ignores old responses and never restarts its refresh timer',async()=>{
 const original=global.setTimeout,clear=global.clearTimeout,timers=new Map();let seq=0
 global.setTimeout=(fn,ms)=>{const id=++seq;timers.set(id,{fn,ms});return id};global.clearTimeout=id=>timers.delete(id)
 let s
 try{
  s=setup('src/components/HomeAnnouncements.vue',{active:true});const old=[...s.requests]
  s.props.active=false;old.forEach(r=>s.respond(r));await tick()
  assert.ok(!s.text().includes('玫瑰'));assert.equal(timers.size,0)
  s.props.active=true;s.requests.slice(2).forEach(r=>s.respond(r));await tick()
  assert.equal(timers.size,1);assert.equal([...timers.values()][0].ms,30000)
  const next=[...timers.values()][0].fn;timers.clear();next();assert.equal(s.requests.length,6)
  s.props.active=false;s.requests.slice(4).forEach(r=>s.respond(r));await tick();assert.equal(timers.size,0)
 }finally{s?.close();global.setTimeout=original;global.clearTimeout=clear}
})
test('one failed feed does not hide the other; retry is read only',async()=>{
 const s=setup('src/components/HomeAnnouncements.vue',{active:true})
 try{
  s.requests[0].fail({});s.respond(s.requests[1]);await tick()
  assert.match(s.text(),/加载失败/);assert.match(s.text(),/玫瑰/)
  s.action('open-patronage').props.onTap();assert.equal(s.requests.length,3);assert.equal(s.calls.length,0)
  s.respond(s.requests[2]);await tick();assert.match(s.text(),/周冠/)
 }finally{s.close()}
})
test('home cards independently load real API records, preserve empty state and navigate by kind',async()=>{
 const s=setup('src/components/HomeAnnouncements.vue',{active:true})
 try {
  assert.equal(s.requests.length,2);assert.match(s.text(),/冠名通报/);assert.match(s.text(),/礼物通报/)
  s.respond(s.requests.find(r=>r.data.kind==='patronage'),[])
  s.respond(s.requests.find(r=>r.data.kind==='gift'))
  await tick();assert.match(s.text(),/暂无通报/);assert.match(s.text(),/玫瑰/)
  s.action('open-gift').props.onTap();assert.deepEqual(s.calls.at(-1),['/pages/client/announcements/index',{kind:'gift'}])
  s.action('open-patronage').props.onTap();assert.deepEqual(s.calls.at(-1),['/pages/client/announcements/index',{kind:'patronage'}])
  assert.ok(s.requests.every(r=>r.method==='GET'))
 }finally{s.close()}
})
