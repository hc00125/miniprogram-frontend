const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const read=p=>fs.readFileSync(path.join(__dirname,'../src',p),'utf8')
test('income entry does not promise a universal 16 percent; overview explains mini exception',()=>{
 assert.doesNotMatch(read('pages/player/my-orders/index.vue'),/查看工资、16%抽成/)
 assert.match(read('pages/player/earnings/index.vue'),/仅娱乐mini、技术mini的普通陪玩订单/)
 assert.doesNotMatch(read('pages/legal/user-agreement/index.vue'),/当前默认抽成为16%/)
})
