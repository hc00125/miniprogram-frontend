const test = require('node:test'), assert = require('node:assert/strict')
const { harness } = require('./commerce-sfc-harness.cjs')
const row = (kind='gift', id=1) => ({id:`${kind}:${id}`,kind,boss_name:'老板甲',player_id:7,player_name:'陪玩乙',item_name:kind==='gift'?'玫瑰':'周冠',quantity:2,occurred_at:'2026-09-30T12:00:00+08:00',text:kind==='gift'?'老板「老板甲」赠送「陪玩乙」「玫瑰」×2':'老板「老板甲」为「陪玩乙」开通「周冠」'})
const page = (kind='gift', rows=[row(kind)], count=rows.length, number=1, size=20) => ({count,page:number,page_size:size,results:rows})
test('all feed accepts both real kinds and preserves public display images only',async()=>{
 const h=harness(),requests=[],rows=[{...row('gift',3),boss_avatar_url:'https://images.invalid/boss.png',player_avatar_url:'/media/player.png',item_image_url:'https://images.invalid/gift.png',openid:'must-not-leak'},row('patronage',4)]
 h.uni.request=o=>{requests.push(o);o.success({statusCode:200,data:page('all',rows)})}
 const result=await h.load('src/api/announcements.ts').getAnnouncements('all')
 assert.equal(requests[0].data.kind,'all');assert.equal(result.results[0].boss_avatar_url,rows[0].boss_avatar_url);assert.equal(result.results[0].item_image_url,rows[0].item_image_url);assert.ok(!('openid' in result.results[0]));assert.equal(result.results[1].kind,'patronage')
})
test('unsafe or missing image URLs fall back without hiding a genuine record',async()=>{
 const h=harness();h.uni.request=o=>o.success({statusCode:200,data:page('gift',[{...row(),boss_avatar_url:'javascript:alert(1)',player_avatar_url:'//untrusted.invalid/x',item_image_url:null}])})
 const result=await h.load('src/api/announcements.ts').getAnnouncements('gift');assert.equal(result.results.length,1)
 for(const field of ['boss_avatar_url','player_avatar_url','item_image_url'])assert.equal(result.results[0][field],'')
})
test('malformed records, mismatched pages and duplicate event IDs reject rather than fake empty', async () => {
 for (const data of [null,{},page('gift',[{...row(),player_id:0}]),page('gift',[{...row(),occurred_at:'bad'}]),page('gift',[{...row(),quantity:0}]),page('gift',[{...row(),id:'patronage:1'}]),page('gift',[row(),row()]),page('patronage'),page('gift',[],0,2),page('gift',[],1),page('gift',[{...row(),text:''}]),page('gift',[],0,1,50)]) {
  const h=harness();h.uni.request=o=>o.success({statusCode:200,data})
  await assert.rejects(h.load('src/api/announcements.ts').getAnnouncements('gift'),/通报/)
 }
})
test('invalid request arguments never reach network; HTTP and transport failures reject', async () => {
 const h=harness();let requests=0;h.uni.request=()=>requests++
 const api=h.load('src/api/announcements.ts')
 for (const args of [['other'],['gift',0],['gift',1,51],['gift',1.5]]) await assert.rejects(api.getAnnouncements(...args))
 assert.equal(requests,0)
 h.uni.request=o=>o.success({statusCode:503,data:page()});await assert.rejects(api.getAnnouncements('gift'))
 h.uni.request=o=>o.fail({});await assert.rejects(api.getAnnouncements('gift'))
})
test('announcement GET uses public fixed endpoint and returns validated real body', async () => {
 const h=harness(),requests=[]
 h.uni.request=o=>{requests.push(o);o.success({statusCode:200,data:page()})}
 const api=h.load('src/api/announcements.ts')
 assert.deepEqual(await api.getAnnouncements('gift'),page())
 assert.equal(requests[0].url,'https://fixture.invalid/api/announcements/')
 assert.equal(requests[0].method,'GET');assert.deepEqual(requests[0].data,{kind:'gift',page:1,page_size:20})
 assert.ok(!requests[0].header?.Authorization)
})
