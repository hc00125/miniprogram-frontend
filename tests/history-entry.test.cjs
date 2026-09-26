const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('history claim and offline detail are registered without replacing the homepage',()=>{
 const pages=JSON.parse(read('src/pages.json')).pages;
 assert.equal(pages[0].path,'pages/boss/home/index');
 assert.ok(pages.some(p=>p.path==='pages/client/history-claim/index'));
 assert.ok(pages.some(p=>p.path==='pages/client/history-order/index'));
 assert.doesNotMatch(read('src/pages/client/profile/index.vue'),/pages\/client\/history-claim\/index|认领历史订单/);
 assert.match(read('src/pages/client/settings/index.vue'),/pages\/client\/history-claim\/index/);
});
test('offline orders route to their read-only detail and do not show a diamond payment amount',()=>{
 const query=read('src/pages/boss/query/index.vue');
 assert.match(query,/order\.source === 'staff'/);
 assert.match(query,/pages\/client\/history-order\/index/);
 assert.match(query,/order\.source !== 'staff'/);
 const detail=read('src/pages/client/history-order/index.vue');
 assert.match(detail,/线下/);assert.doesNotMatch(detail,/requestPayment|createPayment|cancelOrder|payBy/);
});
