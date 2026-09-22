const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync(require('node:path').join(__dirname,'../src/pages/player/earnings/index.vue'),'utf8');
function reason(overrides={}) {
 const match=src.match(/const withdrawalBlockReason = computed\(\(\) => \{([\s\S]*?)\n\}\)/);
 assert.ok(match, '应有统一的不可提交原因');
 const ctx={loading:{value:false},submitting:{value:false},overview:{value:{can_withdraw:true}},debtFish:{value:0},withdrawalFish:{value:0.1},minWithdrawalFishValue:{value:0.1},minWithdrawalFish:{value:'0.10'},availableFish:{value:100},hasValidFishPrecision:{value:true},form:{amount:'0.1',account_name:'测试',account_no:'test'},...overrides};
 return vm.runInNewContext(`(function(){${match[1]}})()`,ctx);
}
test('0.1鱼干可提交，各项失败均有明确原因',()=>{
 assert.equal(reason(),'');
 assert.match(reason({form:{amount:'0.1',account_name:'',account_no:'test'}}),/收款人/);
 assert.match(reason({form:{amount:'0.1',account_name:'测试',account_no:''}}),/收款账号/);
 assert.match(reason({withdrawalFish:{value:0.09}}),/最低/);
 assert.match(reason({withdrawalFish:{value:101}}),/余额/);
 assert.match(reason({hasValidFishPrecision:{value:false}}),/小数/);
 assert.match(reason({debtFish:{value:1}}),/欠款/);
 assert.match(reason({overview:{value:{can_withdraw:false,withdrawal_block_reason:'账号受限'}}}),/账号受限/);
 assert.match(reason({loading:{value:true}}),/加载/);
 assert.match(reason({overview:{value:null}}),/加载/);
 assert.match(src,/v-if="withdrawalBlockReason"/);
});
