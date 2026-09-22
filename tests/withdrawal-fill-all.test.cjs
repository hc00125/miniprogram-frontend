const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/pages/player/earnings/index.vue'), 'utf8');
const body = source.match(/function fillAll\(\) \{([\s\S]*?)\n\}/)[1];
function fill(balance, allowed = true, debt = 0) {
  const ctx = { overview: { value: { can_withdraw: allowed } }, debtFish: { value: debt }, availableFish: { value: balance }, form: { amount: '' }, toast() {} };
  vm.runInNewContext(`(function() {${body}})()`, ctx);
  return ctx.form.amount;
}
test('全部提现截断到一位小数且不超过余额', () => {
  for (const [balance, expected] of [[1198.39,'1198.3'],[1198.35,'1198.3'],[1198.3,'1198.3'],[10,'10'],[0.09,'0'],[0,'0'],[10.19,'10.1']]) {
    assert.equal(fill(balance), expected, `balance=${balance}`);
    assert.ok(Number(fill(balance)) <= balance);
  }
});
test('禁提或欠款时不填入金额', () => {
  assert.equal(fill(1198.39, false), '');
  assert.equal(fill(1198.39, true, 1), '');
});
