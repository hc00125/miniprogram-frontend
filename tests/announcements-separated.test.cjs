const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const {setup,row,tick}=require('./announcements-harness.cjs')
for(const [route,kind,title] of [['popular-announcements','popular','热门广播'],['patronage-announcements','patronage','冠名通报']]){
 const eventKind=kind==='popular'?'gift':kind
 test(`${title} is an independent fixed-filter page with honest empty/error, pagination and refresh`,async()=>{
  const file=`src/pages/client/${route}/index.vue`;assert.ok(fs.existsSync(path.join(__dirname,'..',file)), 'independent page must exist')
  const pages=JSON.parse(fs.readFileSync(path.join(__dirname,'../src/pages.json'),'utf8'));assert.ok(pages.pages.some(p=>p.path===file.slice(4,-4)));assert.equal(pages.pages[0].path,'pages/boss/home/index')
  const s=setup(file);try{
   s.life.load[0]({kind:kind==='gift'?'patronage':'all'});s.life.show[0]();assert.equal(s.requests[0].data.kind,kind);assert.ok(s.calls.some(c=>c[0]==='title'&&c[1]===title));assert.match(s.text(),new RegExp(title));assert.equal(s.action('filter-all'),undefined);assert.equal(s.action('filter-patronage'),undefined)
   s.respond(s.requests[0],Array.from({length:20},(_,i)=>row(eventKind,i+1)),21);await tick();s.action('more').props.onTap();assert.equal(s.requests[1].data.page,2);s.requests[1].fail({});await tick();assert.match(s.text(),/加载失败/);s.action('retry').props.onTap();assert.equal(s.requests[2].data.page,2);s.respond(s.requests[2],[row(eventKind,21)],21);await tick();assert.equal(s.tree().filter(n=>n.props?.['data-action']==='record').length,21)
   s.life.show[0]();assert.equal(s.requests[3].data.page,1);s.respond(s.requests[3],[]);await tick();assert.match(s.text(),/暂无通报/)
   s.life.show[0]();s.life.hide[0]();s.respond(s.requests[4],[row(eventKind)]);await tick();assert.equal(s.action('record'),undefined);assert.ok(s.requests.every(r=>r.data.kind===kind&&r.method==='GET'))
  }finally{s.close()}
 })
}
test('homepage opens separate popular and patronage pages, not a mixed feed tab',async()=>{
 const s=setup('src/components/HomeAnnouncements.vue',{active:true});try{
 s.requests.forEach(r=>s.respond(r,[]));await tick();s.action('open-gift').props.onTap();assert.deepEqual(s.calls.at(-1),['/pages/client/popular-announcements/index']);s.action('open-patronage').props.onTap();assert.deepEqual(s.calls.at(-1),['/pages/client/patronage-announcements/index'])
 }finally{s.close()}
})
