const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const read=p=>fs.readFileSync(path.join(__dirname,'../src',p),'utf8')
test('income page omits explanation and summary cards without hiding withdrawal errors',()=>{
 assert.doesNotMatch(read('pages/player/my-orders/index.vue'),/查看工资、16%抽成/)
 const template=read('pages/player/earnings/index.vue').split('</template>')[0]
 assert.doesNotMatch(template,/hero-sub|card-sub|stats-card|commission_policy/)
 assert.doesNotMatch(template,/天审核期，无异常即可提现|10鱼干可兑换1元|平台通常于每周一|所有提现均由管理员人工审核|默认抽成25%/)
 assert.match(template,/<text v-if="withdrawalBlockReason"[^>]*role="alert"/)
 assert.doesNotMatch(read('pages/legal/user-agreement/index.vue'),/当前默认抽成为16%/)
})
