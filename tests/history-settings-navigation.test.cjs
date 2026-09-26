const test = require('node:test')
const assert = require('node:assert/strict')
const vue = require('vue')
const { harness, nodes } = require('./commerce-sfc-harness.cjs')
const text = node => typeof node === 'string' ? node : typeof node?.children === 'string' ? node.children : Array.isArray(node?.children) ? node.children.map(text).join('') : ''

function settings(profile) {
  const navigation = []
  const unexpected = () => { throw new Error('Navigation test must not call a business API') }
  const h = harness({
    vue: { ...vue, resolveComponent: name => name },
    '@/api/client': { bindClientPhoneNumberApi: unexpected },
    '@/api/player': { confirmPlayerOrderNoticeSubscription: unexpected, getPlayerOrderNoticeConfig: unexpected, logoutPlayer: unexpected, updatePlayerOnlineStatus: unexpected },
    '@/utils/client': { getClientProfile: () => profile, saveClientProfile: unexpected, setPlayerOnlineStatus: unexpected, syncClientProfile: unexpected },
    '@/utils/feedback': { confirm: unexpected, getErrorMessage: e => e.message, success: unexpected, toast: unexpected },
    '@/utils/nav': { go: (...args) => navigation.push(args), replace: unexpected },
    '@/utils/storage': { clearPlayerAuth: unexpected }
  })
  const scope = vue.effectScope()
  const page = h.load('src/pages/client/settings/index.vue').default
  const render = scope.run(() => page.setup({}, { expose() {} }))
  const tree = render({}, [])
  return { navigation, tree, scope }
}

for (const [role, profile] of [['boss', { id: 1, nickname: 'fixture-boss' }], ['player', { id: 2, player: { type_name: 'fixture', is_online: true } }]]) {
  test(`settings exposes one ordinary history-claim row for ${role}, retaining existing links`, () => {
    const h = settings(profile)
    try {
      const rows = nodes(h.tree).filter(n => typeof n.props?.onTap === 'function' && text(n).includes('认领历史订单'))
      assert.equal(rows.length, 1, 'history claim belongs under Settings, not the personal-center list')
      assert.equal(rows[0].type, 'view')
      assert.match(rows[0].props.class, /setting-row/)
      rows[0].props.onTap()
      assert.deepEqual(h.navigation, [['/pages/client/history-claim/index']])
      assert.ok(text(h.tree).includes('头像与昵称'))
      assert.ok(text(h.tree).includes('隐私政策'))
      assert.ok(text(h.tree).includes('退出当前账号'))
    } finally { h.scope.stop() }
  })
}

test('settings does not expose the history-claim entry without an account profile', () => {
  const h = settings(null)
  try { assert.ok(!text(h.tree).includes('认领历史订单')) } finally { h.scope.stop() }
})
