const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { parse } = require('@vue/compiler-sfc')
const postcss = require('postcss')
const file = path.join(__dirname, '../src/pages/client/customer-service/index.vue')
function page() { return parse(fs.readFileSync(file, 'utf8')).descriptor }
function declarations(selector) {
  const result = {}
  for (const style of page().styles) {
    assert.ok(style.scoped, '反馈样式必须限制在本页')
    postcss.parse(style.content).walkRules(rule => {
      if (rule.selector === selector) rule.walkDecls(d => { result[d.prop] = d.value })
    })
  }
  return result
}
test('反馈入口为紧凑单行，独立按钮显式尺寸覆盖全局 reset', () => {
  const row = declarations('.feedback-entry')
  assert.equal(row.display, 'flex')
  assert.equal(row['align-items'], 'center')
  assert.equal(row['justify-content'], 'space-between')
  assert.ok(parseInt(row.padding) > 0 && parseInt(row.padding) <= 20)
  assert.equal(row.height, undefined, '不固定卡片高度制造空白')
  const button = declarations('.feedback-action')
  assert.equal(button.display, 'flex')
  assert.equal(button.width, '132rpx')
  assert.equal(button.height, '64rpx')
  assert.equal(button['flex-shrink'], '0')
  assert.equal(button['box-sizing'], 'border-box')
  assert.equal(button.margin, '0')
  assert.ok(parseInt(button.padding) > 0)
  assert.ok(parseInt(button['border-radius']) >= 20)
  assert.equal(button['align-items'], 'center')
  assert.equal(button['justify-content'], 'center')
  assert.equal(declarations('.feedback-action::after').border, 'none')
})

test('客服页反馈入口只保留标题与明确操作，仍导航到原反馈页', () => {
  const { template, scriptSetup } = page()
  assert.doesNotMatch(template.content, /提交至平台客服处理，非微信官方投诉渠道/)
  assert.match(template.content, /<text class="feedback-title">投诉与反馈<\/text>/)
  assert.match(template.content, /<button[^>]*class="feedback-action"[^>]*@tap="openComplaints"[^>]*>去反馈<\/button>/)
  assert.match(scriptSetup.content, /function openComplaints\(\) \{ uni.navigateTo\(\{ url: '\/pages\/client\/complaints\/index' \}\) \}/)
  assert.match(template.content, /open-type="contact">进入客服/)
  assert.match(template.content, /@tap="copyWechat\(contact.wechat_id\)">复制/)
})
