// Exercise the shipped render data against its WXML, not the browser SFC adapter.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict'), vue = require('vue')
const root = path.join(__dirname, '../dist/build/mp-weixin')
const base = path.join(root, 'pages/boss/home/index')
const wxml = fs.readFileSync(base + '.wxml', 'utf8')
const wxss = fs.readFileSync(base + '.wxss', 'utf8')
let component
const navigation = [], shares = [], constants = { exports: {} }
vm.runInNewContext(fs.readFileSync(path.join(root, 'constants/nationalBounty.js'), 'utf8'), { module: constants, exports: constants.exports })
const vendor = { ...vue, index: { $on() {}, $off() {} }, onShow() {}, onHide() {}, onShareAppMessage(f) { shares.push(f) }, onShareTimeline(f) { shares.push(f) }, _export_sfc: c => c, e: Object.assign, t: String, o: x => x, p: x => x, s: x => x || '', f: (items, fn) => items.map(fn) }
const requireBoundary = name => name.endsWith('vendor.js') ? vendor : name.endsWith('nationalBounty.js') ? constants.exports : name.endsWith('nav.js') ? { go: (...args) => navigation.push(args) } : name.endsWith('uiIcons.js') ? { uiIcons: {} } : {}
vm.runInNewContext(fs.readFileSync(base + '.js', 'utf8'), {
  wx: { createPage: c => component = c },
  require: requireBoundary
})
const loop = wxml.match(/<swiper-item wx:for="{{(\w+)}}" wx:for-item="banner"/)[1]
const image = wxml.match(/<image wx:elif="{{banner\.(\w+)}}" class="hero-slide__image[^>]*src="{{banner\.(\w+)}}"[^>]*binderror="{{banner\.(\w+)}}"/)
const fallback = wxml.match(/class="hero-slide__fallback[^>]*><text[^>]*>{{banner\.(\w+)}}/)[1]
const resultCondition = wxml.match(/<view wx:if="{{banner\.(\w+)}}" class="event-result-banner/)[1]
const resultLoop = wxml.match(/wx:for="{{banner\.(\w+)}}" wx:for-item="winner"/)[1]
const resultFields = ['place', 'name', 'score'].map(kind => wxml.match(new RegExp('class="event-result-' + kind + '[^>]*>[^<]*{{winner\\.(\\w+)}}'))[1])
const bannerTap = wxml.match(/class="hero-slide[^>]*bindtap="{{banner\.(\w+)}}"/)[1]
const expected = [[1, '朝宗', '72,727,107'], [2, '女一大', '70,175,285'], [3, '咖啡', '69,473,325']]
const titles = ['', '偷吃电竞', '暗区突围无限，S7赛季已上线，查看暗区服务']
for (let index = 1; index < 3; index++) {
  const scope = vue.effectScope()
  try {
    const render = scope.run(() => component.setup({}, {}))
    const rows = render({}, {})[loop]
    assert.equal(rows.length, 3)
    assert.equal(rows[0][resultCondition], true)
    assert.deepEqual(Array.from(rows[0][resultLoop], row => resultFields.map(field => field === resultFields[0] ? Number(row[field]) : row[field])), expected)
    rows[0][bannerTap]()
    assert.equal(navigation.at(-1)[0], '/pages/client/national-bounty/index')
    for (const share of shares) assert.equal(share().imageUrl, '/images/home-redesign/club-welcome.jpg')
    for (const row of rows.slice(1)) {
      assert.equal(row[image[1]], true)
      assert.match(row[image[2]], /^\/images\/home-redesign\/.+\.jpg$/)
      const asset = fs.readFileSync(path.join(root, row[image[2]].slice(1)))
      assert.equal(asset.readUInt16BE(0), 0xffd8)
    }
    rows[index][image[3]]()
    const failed = render({}, {})[loop]
    assert.equal(failed[index][image[1]], false)
    assert.equal(failed[index][fallback], titles[index])
    assert.equal(failed.slice(1).filter(row => row[image[1]]).length, 1)
    assert.equal(failed[0][resultCondition], true)
  } finally { scope.stop() }
}
const imageStyle = wxss.match(/\.hero-slide__image[^{}]*\{([^}]+)\}/)[1]
assert.match(imageStyle, /display:block/)
assert.match(imageStyle, /height:327rpx/)
assert.match(wxml.match(/<image[^>]*class="hero-slide__image[^>]*>/)[0], /mode="aspectFill"/)
assert.doesNotMatch(imageStyle, /position:absolute|inset:/)
assert.match(wxml, /奖励已全部发放/)
assert.doesNotMatch(fs.readFileSync(base + '.js', 'utf8') + wxml, /national-bounty-2026\.jpg|查看活动规则/)
const detailBase = path.join(root, 'pages/client/national-bounty/index')
const detailWxml = fs.readFileSync(detailBase + '.wxml', 'utf8')
let detailComponent
vm.runInNewContext(fs.readFileSync(detailBase + '.js', 'utf8'), { wx: { createPage: c => detailComponent = c }, require: requireBoundary })
const detailLoop = detailWxml.match(/wx:for="{{(\w+)}}" wx:for-item="result"/)[1]
const detailFields = ['rank', 'name', 'score'].map(kind => detailWxml.match(new RegExp('class="result-' + kind + '[^>]*>[^<]*{{result\\.(\\w+)}}'))[1])
const detailScope = vue.effectScope()
try {
  const render = detailScope.run(() => detailComponent.setup({}, {}))
  const data = render({}, {})
  assert.deepEqual(Array.from(data[detailLoop], row => detailFields.map(field => field === detailFields[0] ? Number(row[field]) : row[field])), expected)
  assert.ok(Object.values(data).includes('已结束'))
  assert.ok(Object.values(data).includes('最终排名已锁定，活动奖励已全部发放。'))
  data[detailWxml.match(/data-action="customer-service"[^>]*bindtap="{{(\w+)}}"/)[1]]()
  assert.equal(navigation.at(-1)[0], '/pages/client/customer-service/index')
} finally { detailScope.stop() }
assert.equal(JSON.parse(fs.readFileSync(detailBase + '.json', 'utf8')).navigationBarTitleText, '国庆冲榜收官')
assert.doesNotMatch(detailWxml, /<image|活动时段|参与规则|10月14日|进行结算发放/)
console.log('PASS compiled carousel and event closure: exact final results, fully paid status, native offline result card, matching detail, routes, brand share cover, two independent image fallbacks and fixed-height flow layout. Native simulator verification remains required.')
