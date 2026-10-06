// Exercise the shipped render data against its WXML, not the browser SFC adapter.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), vue = require('vue')
const root = path.join(__dirname, '../dist/build/mp-weixin')
const base = path.join(root, 'pages/boss/home/index')
const wxml = fs.readFileSync(base + '.wxml', 'utf8')
const wxss = fs.readFileSync(base + '.wxss', 'utf8')
let component
const vendor = { ...vue, index: { $on() {}, $off() {} }, onShow() {}, onHide() {}, onShareAppMessage() {}, onShareTimeline() {}, _export_sfc: c => c, e: Object.assign, t: String, o: x => x, p: x => x, s: x => x || '', f: (items, fn) => items.map(fn) }
vm.runInNewContext(fs.readFileSync(base + '.js', 'utf8'), {
  wx: { createPage: c => component = c },
  require: name => name.endsWith('vendor.js') ? vendor : name.endsWith('uiIcons.js') ? { uiIcons: {} } : {}
})
const loop = wxml.match(/<swiper-item wx:for="{{(\w+)}}" wx:for-item="banner"/)[1]
const image = wxml.match(/<image wx:if="{{banner\.(\w+)}}" class="hero-slide__image[^>]*src="{{banner\.(\w+)}}"[^>]*binderror="{{banner\.(\w+)}}"/)
const fallback = wxml.match(/class="hero-slide__fallback[^>]*><text[^>]*>{{banner\.(\w+)}}/)[1]
const titles = ['国庆赏金赛，查看活动规则', '欢迎来到偷吃电竞，一起开黑，一起开心', '暗区突围无限，S7赛季已上线，查看暗区服务']
for (let index = 0; index < 3; index++) {
  const scope = vue.effectScope()
  try {
    const render = scope.run(() => component.setup({}, {}))
    const rows = render({}, {})[loop]
    assert.equal(rows.length, 3)
    for (const row of rows) {
      assert.equal(row[image[1]], true)
      assert.match(row[image[2]], /^\/images\/home-redesign\/.+\.jpg$/)
      const asset = fs.readFileSync(path.join(root, row[image[2]].slice(1)))
      assert.equal(asset.readUInt16BE(0), 0xffd8)
    }
    rows[index][image[3]]()
    const failed = render({}, {})[loop]
    assert.equal(failed[index][image[1]], false)
    assert.equal(failed[index][fallback], titles[index])
    assert.equal(failed.filter(row => row[image[1]]).length, 2)
  } finally { scope.stop() }
}
const imageStyle = wxss.match(/\.hero-slide__image[^{}]*\{([^}]+)\}/)[1]
assert.match(imageStyle, /display:block/)
assert.match(imageStyle, /height:327rpx/)
assert.match(wxml.match(/<image[^>]*class="hero-slide__image[^>]*>/)[0], /mode="aspectFill"/)
assert.doesNotMatch(imageStyle, /position:absolute|inset:/)
console.log('PASS compiled carousel: all 3 image bindings/files, independent error fallbacks, fixed-height flow layout. Native simulator verification remains required.')
