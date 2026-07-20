from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str) -> None:
    file_path = ROOT / path
    text = file_path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected exactly one match, found {count}: {old[:80]!r}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')


def patch_grab() -> None:
    path = 'src/pages/player/grab/index.vue'
    replace_once(path,
        '<button class="refresh-btn" @tap="refreshAll">刷新</button>',
        '<button class="refresh-btn" :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">{{ refreshing ? \'刷新中\' : \'刷新\' }}</button>'
    )
    replace_once(path,
        'const onlineUpdating = ref(false)\nconst now = ref(Date.now())',
        'const onlineUpdating = ref(false)\nconst refreshing = ref(false)\nconst now = ref(Date.now())'
    )
    replace_once(path,
'''async function refreshAll() {
  try {
    const [inviteList, publicOrders] = await Promise.all([
      getDesignationInvitations(),
      getAvailableOrders()
    ])
    checkNewOrderAlert(inviteList || [], publicOrders || [])
    invitations.value = (inviteList || []).map(item => ({ ...item, responding: false }))
    orders.value = (publicOrders || []).map(item => ({ ...item, grabbing: false }))
  } catch (error) {
    toast(getErrorMessage(error, '订单刷新失败'))
  }
}

async function startRefresh() {''',
'''async function refreshAll() {
  try {
    const [inviteList, publicOrders] = await Promise.all([
      getDesignationInvitations(),
      getAvailableOrders()
    ])
    checkNewOrderAlert(inviteList || [], publicOrders || [])
    invitations.value = (inviteList || []).map(item => ({ ...item, responding: false }))
    orders.value = (publicOrders || []).map(item => ({ ...item, grabbing: false }))
    return true
  } catch (error) {
    toast(getErrorMessage(error, '订单刷新失败'))
    return false
  }
}

async function handleManualRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    if (await refreshAll()) success('刷新成功')
  } finally {
    refreshing.value = false
  }
}

async function startRefresh() {'''
    )


def patch_query() -> None:
    path = 'src/pages/boss/query/index.vue'
    replace_once(path,
'''      <button class="refresh-btn" @tap="refreshCenter">
        <text class="refresh-icon">↻</text>
        <text>刷新</text>
      </button>''',
'''      <button class="refresh-btn" :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">
        <text v-if="!refreshing" class="refresh-icon">↻</text>
        <text>{{ refreshing ? '刷新中' : '刷新' }}</text>
      </button>'''
    )
    replace_once(path,
        "import { toast, getErrorMessage } from '@/utils/feedback'",
        "import { success, toast, getErrorMessage } from '@/utils/feedback'"
    )
    replace_once(path,
        "const loaded = ref(false)",
        "const loaded = ref(false)\nconst refreshing = ref(false)"
    )
    replace_once(path,
'''async function fetchOrders() {
  const token = syncLoginState()
  try {
    loaded.value = false
    if (!token) {
      resetOrderCenter()
      return
    }
    orders.value = await getMyBossOrders()
  } catch (error) {
    toast(getErrorMessage(error, '加载订单失败'))
  } finally {
    loaded.value = true
  }
}''',
'''async function fetchOrders() {
  const token = syncLoginState()
  try {
    loaded.value = false
    if (!token) {
      resetOrderCenter()
      return true
    }
    orders.value = await getMyBossOrders()
    return true
  } catch (error) {
    toast(getErrorMessage(error, '订单刷新失败'))
    return false
  } finally {
    loaded.value = true
  }
}'''
    )
    replace_once(path,
'''async function fetchCartCount() {
  const token = syncLoginState()
  if (!token) {
    cartCount.value = 0
    return
  }
  try {
    cartCount.value = await getShopCartCount()
  } catch {
    cartCount.value = 0
  }
}

function refreshCenter() {
  syncLoginState()
  fetchOrders()
  fetchCartCount()
}

onShow(refreshCenter)''',
'''async function fetchCartCount() {
  const token = syncLoginState()
  if (!token) {
    cartCount.value = 0
    return true
  }
  try {
    cartCount.value = await getShopCartCount()
    return true
  } catch (error) {
    cartCount.value = 0
    toast(getErrorMessage(error, '购物车刷新失败'))
    return false
  }
}

async function refreshCenter() {
  syncLoginState()
  const [ordersOk, cartOk] = await Promise.all([fetchOrders(), fetchCartCount()])
  return ordersOk && cartOk
}

async function handleManualRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    if (await refreshCenter()) success('刷新成功')
  } finally {
    refreshing.value = false
  }
}

onShow(() => { void refreshCenter() })'''
    )


def patch_player_list() -> None:
    path = 'src/pages/player/list/index.vue'
    replace_once(path,
        '<button @tap="fetchPlayers">刷新</button>',
        '<button :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">{{ refreshing ? \'刷新中\' : \'刷新\' }}</button>'
    )
    replace_once(path,
        "import { toast } from '@/utils/feedback'",
        "import { success, toast } from '@/utils/feedback'"
    )
    replace_once(path,
        "const searchFocused = ref(false)",
        "const searchFocused = ref(false)\nconst refreshing = ref(false)"
    )
    replace_once(path,
'''    players.value = (list || []).map(raw => {
      const p = raw as BillingPlayer''',
'''    players.value = (list || []).map(raw => {
      const p = raw as BillingPlayer'''
    )
    replace_once(path,
'''      }
    })
  } catch {
    if (sequence !== fetchSequence) return
    players.value = []
    toast('陪玩列表加载失败，请稍后重试')
  } finally {
    if (sequence === fetchSequence) loaded.value = true
  }
}

function clearSearch()''',
'''      }
    })
    return true
  } catch {
    if (sequence !== fetchSequence) return false
    players.value = []
    toast('陪玩列表刷新失败，请稍后重试')
    return false
  } finally {
    if (sequence === fetchSequence) loaded.value = true
  }
}

async function handleManualRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    if (await fetchPlayers()) success('刷新成功')
  } finally {
    refreshing.value = false
  }
}

function clearSearch()'''
    )


def patch_player_orders() -> None:
    path = 'src/pages/player/my-orders/index.vue'
    replace_once(path,
        '<button class="club-btn club-btn--ghost" @tap="refreshAll">刷新</button>',
        '<button class="club-btn club-btn--ghost" :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">{{ refreshing ? \'刷新中\' : \'刷新\' }}</button>'
    )
    replace_once(path,
        "import { getErrorMessage, toast } from '@/utils/feedback'",
        "import { getErrorMessage, success, toast } from '@/utils/feedback'"
    )
    replace_once(path,
        "const ratingData = ref<PlayerRatingsResult | null>(null)",
        "const ratingData = ref<PlayerRatingsResult | null>(null)\nconst refreshing = ref(false)"
    )
    replace_once(path,
'''async function fetchOrders() {
  try {
    orders.value = await getMyOrders()
  } catch (error) {
    toast(getErrorMessage(error, '获取订单失败'))
  }
}

async function fetchRatings() {
  try {
    ratingData.value = await getMyPlayerRatings()
  } catch (error) {
    ratingData.value = null
    toast(getErrorMessage(error, '获取评价失败'))
  }
}

async function refreshAll() {
  await Promise.all([fetchOrders(), fetchRatings()])
}''',
'''async function fetchOrders() {
  try {
    orders.value = await getMyOrders()
    return true
  } catch (error) {
    toast(getErrorMessage(error, '订单刷新失败'))
    return false
  }
}

async function fetchRatings() {
  try {
    ratingData.value = await getMyPlayerRatings()
    return true
  } catch (error) {
    ratingData.value = null
    toast(getErrorMessage(error, '评价刷新失败'))
    return false
  }
}

async function refreshAll() {
  const [ordersOk, ratingsOk] = await Promise.all([fetchOrders(), fetchRatings()])
  return ordersOk && ratingsOk
}

async function handleManualRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    if (await refreshAll()) success('刷新成功')
  } finally {
    refreshing.value = false
  }
}'''
    )


def patch_waiting() -> None:
    path = 'src/pages/boss/waiting/index.vue'
    replace_once(path,
        '<button class="mini-btn" @tap="checkOrder">刷新</button>',
        '<button class="mini-btn" :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">{{ refreshing ? \'刷新中\' : \'刷新\' }}</button>'
    )
    replace_once(path,
        '<button class="primary-btn" @tap="checkOrder">刷新状态</button>',
        '<button class="primary-btn" :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">{{ refreshing ? \'刷新中\' : \'刷新状态\' }}</button>'
    )
    replace_once(path,
        "const now = ref(Date.now())",
        "const now = ref(Date.now())\nconst refreshing = ref(false)"
    )
    replace_once(path,
'''async function checkOrder() {
  if (!orderNo.value) return
  try {''',
'''async function checkOrder() {
  if (!orderNo.value) return false
  try {'''
    )
    replace_once(path,
'''    else if (res.status === '已取消') { stopTimers(); toast('订单已取消'); goMain('home') }
  } catch (error) { toast(getErrorMessage(error, '订单加载失败')) }
}

async function releaseDesignation''',
'''    else if (res.status === '已取消') { stopTimers(); toast('订单已取消'); goMain('home') }
    return true
  } catch (error) {
    toast(getErrorMessage(error, '订单刷新失败'))
    return false
  }
}

async function handleManualRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    if (await checkOrder()) success('刷新成功')
  } finally {
    refreshing.value = false
  }
}

async function releaseDesignation'''
    )


def patch_player_detail() -> None:
    path = 'src/pages/player/order-detail/index.vue'
    replace_once(path,
        '<button class="tiny-link" @tap="fetchOrder">刷新</button>',
        '<button class="tiny-link" :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">{{ refreshing ? \'刷新中\' : \'刷新\' }}</button>'
    )
    replace_once(path,
        "const loading = ref(true)",
        "const loading = ref(true)\nconst refreshing = ref(false)"
    )
    replace_once(path,
'''    if (!roomFocused.value) roomInput.value = res.kook_room_number || ''
    updateDuration()
  } catch (error) {
    toast(getErrorMessage(error, '订单加载失败'))
  } finally {
    loading.value = false
  }
}

function formatRoomTime''',
'''    if (!roomFocused.value) roomInput.value = res.kook_room_number || ''
    updateDuration()
    return true
  } catch (error) {
    toast(getErrorMessage(error, '订单刷新失败'))
    return false
  } finally {
    loading.value = false
  }
}

async function handleManualRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    if (await fetchOrder()) success('刷新成功')
  } finally {
    refreshing.value = false
  }
}

function formatRoomTime'''
    )


def patch_boss_progress() -> None:
    path = 'src/pages/boss/in-progress/index.vue'
    replace_once(path,
        '<button class="mini-btn" @tap="checkOrder">刷新</button>',
        '<button class="mini-btn" :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">{{ refreshing ? \'刷新中\' : \'刷新\' }}</button>'
    )
    replace_once(path,
        '<button class="primary-btn" @tap="checkOrder">刷新状态</button>',
        '<button class="primary-btn" :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">{{ refreshing ? \'刷新中\' : \'刷新状态\' }}</button>'
    )
    replace_once(path,
        "const renewing = ref(false)",
        "const renewing = ref(false)\nconst refreshing = ref(false)"
    )
    replace_once(path,
'''async function checkOrder() {
  if (!orderNo.value) return
  try {
    const res = await getOrder(orderNo.value); orderInfo.value = res; updateDuration()
    if (res.status === '待支付') { stopTimers(); replace('/pages/boss/payment/index', { orderNo: orderNo.value }) }
    else if (res.status === '已完成') { stopTimers(); replace('/pages/boss/payment/index', { orderNo: orderNo.value }) }
    else if (res.status === '已取消') { stopTimers(); toast('订单已取消'); goMain('home') }
  } catch (error) { toast(getErrorMessage(error, '订单加载失败')) }
}
async function handleRenewal() {''',
'''async function checkOrder() {
  if (!orderNo.value) return false
  try {
    const res = await getOrder(orderNo.value); orderInfo.value = res; updateDuration()
    if (res.status === '待支付') { stopTimers(); replace('/pages/boss/payment/index', { orderNo: orderNo.value }) }
    else if (res.status === '已完成') { stopTimers(); replace('/pages/boss/payment/index', { orderNo: orderNo.value }) }
    else if (res.status === '已取消') { stopTimers(); toast('订单已取消'); goMain('home') }
    return true
  } catch (error) {
    toast(getErrorMessage(error, '订单刷新失败'))
    return false
  }
}
async function handleManualRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    if (await checkOrder()) success('刷新成功')
  } finally {
    refreshing.value = false
  }
}
async function handleRenewal() {'''
    )


def patch_profile() -> None:
    path = 'src/pages/client/profile/index.vue'
    replace_once(path,
        '<button v-if="profile?.player_status === \'pending\'" class="refresh-link" @tap.stop="loadProfile">刷新状态</button>',
        '<button v-if="profile?.player_status === \'pending\'" class="refresh-link" :loading="refreshing" :disabled="refreshing" @tap.stop="handleManualRefresh">{{ refreshing ? \'刷新中\' : \'刷新状态\' }}</button>'
    )
    replace_once(path,
        "import { getErrorMessage, toast } from '@/utils/feedback'",
        "import { getErrorMessage, success, toast } from '@/utils/feedback'"
    )
    replace_once(path,
        "const onlineUpdating = ref(false)",
        "const onlineUpdating = ref(false)\nconst refreshing = ref(false)"
    )
    replace_once(path,
'''    profile.value = await syncClientProfile()
  } catch (error) {''',
'''    profile.value = await syncClientProfile()
    return true
  } catch (error) {'''
    )
    replace_once(path,
'''      toast('登录状态已失效，可继续游客浏览或重新登录')
      return
    }
    profile.value = cached
    toast(getErrorMessage(error, '个人信息刷新失败'))
  }
}

async function togglePlayerOnline() {''',
'''      toast('登录状态已失效，可继续游客浏览或重新登录')
      return false
    }
    profile.value = cached
    toast(getErrorMessage(error, '个人信息刷新失败'))
    return false
  }
}

async function handleManualRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    if (await loadProfile()) success('刷新成功')
  } finally {
    refreshing.value = false
  }
}

async function togglePlayerOnline() {'''
    )


for patch in (
    patch_grab,
    patch_query,
    patch_player_list,
    patch_player_orders,
    patch_waiting,
    patch_player_detail,
    patch_boss_progress,
    patch_profile,
):
    patch()

print('Refresh feedback applied successfully.')
