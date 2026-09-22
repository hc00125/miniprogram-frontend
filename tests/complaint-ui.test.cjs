const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { parse } = require('@vue/compiler-sfc')
const postcss = require('postcss')
const dir = path.join(__dirname, '../src/pages/client/complaints')
function source(name) { return fs.readFileSync(path.join(dir, name + '.vue'), 'utf8') }
test('首页保持平台身份、紧凑入口、数量与图形空态，不再展示大段声明', () => {
  const template = parse(source('index')).descriptor.template.content
  assert.match(template, /偷吃电竞/)
  assert.doesNotMatch(template, /提交至偷吃电竞平台|非微信官方投诉渠道|class="title">投诉与反馈/)
  assert.match(template, /<button[^>]*class="primary feedback-action"[^>]*@tap="create"/)
  assert.match(template, /提交反馈/)
  assert.match(template, /class="action-icon"/)
  assert.match(template, /class="feedback-count"/)
  assert.match(template, /items.length/)
  assert.match(template, /class="empty-art"/)
  assert.match(source('create'), /文字、联系方式及图片仅用于平台核实投诉/)
})
function declarations(name, selector) {
  const { descriptor } = parse(source(name))
  const result = {}
  for (const style of descriptor.styles) {
    const css = style.src ? fs.readFileSync(path.join(dir, style.src), 'utf8') : style.content
    postcss.parse(css).walkRules(rule => {
      if (rule.selector === selector) rule.walkDecls(d => { result[d.prop] = d.value })
    })
  }
  return result
}
test('投诉三页的标准按钮覆盖全局 inline-flex/零 padding 重置，保留小图移除按钮', () => {
  for (const name of ['index', 'create', 'detail']) {
    const css = declarations(name, '.page button')
    assert.equal(css.display, 'flex', name + '必须恢复块级按钮')
    assert.equal(css.width, '100%', name + '按钮必须全宽')
    assert.ok(parseInt(css['min-height']) >= 88, name + '触控高度不足')
    assert.ok(parseInt(css.padding) > 0, name + '不能只有文字背景')
    assert.ok(parseInt(css['border-radius']) >= 16)
    assert.ok(declarations(name, '.page button[disabled]').opacity)
    assert.equal(declarations(name, '.page button[size="mini"]').width, 'auto')
  }
})
