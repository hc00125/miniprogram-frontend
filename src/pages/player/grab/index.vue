<template>
  <view class="grab-page">
    <view class="status-strip">
      <view class="status-dot" :class="{ live: online }"></view>
      <view class="status-main">
        <text>{{ online ? '实时接单中' : '当前离线' }}</text>
        <text>{{ online ? '每10秒自动刷新，新订单将声音和震动提醒' : '上线后才会开始接收公开订单' }}</text>
      </view>
      <button :disabled="onlineUpdating" @tap="toggleOnline">{{ onlineUpdating ? '同步中' : (online ? '下线' : '上线') }}</button>
    </view>

    <view class="player-card">
      <image v-if="playerAvatarUrl" class="avatar" :src="playerAvatarUrl" mode="aspectFill" />
      <view v-else class="avatar avatar--empty">{{ player?.name?.[0] || '陪' }}</view>
      <view class="player-main">
        <text class="player-name">{{ player?.name || '陪玩师' }}</text>
        <text class="player-type">{{ player?.type_name || '陪玩' }} · ★ {{ player?.avg_rating || '5.0' }}</text>
      </view>
      <button class="wallet-btn" @tap="go('/pages/player/earnings/index')">收益</button>
    </view>

    <view v-if="invitations.length" class="section invitation-section">
      <view class="section-head">
        <view><text>老板指定邀请</text><text>仅你本人可以接受，10分钟内有效</text></view>
        <text class="count-chip">{{ invitations.length }}条</text>
      </view>
      <view v-for="item in invitations" :key="item.designation_id" class="invitation-card">
        <view class="invite-top">
          <view>
            <text class="invite-label">专属指定</text>
            <text class="order-no">{{ item.order_no }}</text>
          </view>
          <text class="countdown">{{ countdownText(item.designation_expires_at) }}</text>
        </view>
        <text class="order-title">{{ item.package_name || '陪玩订单' }}</text>
        <view class="meta-grid">
          <view><text>人数</text><text>{{ item.current_players || 0 }}/{{ item.required_players }}人</text></view>
          <view><text>订单金额</text><text>¥{{ money(item.total_price_per_hour) }}</text></view>
          <view><text>预订时长</text><text>{{ formatHours(item.booked_hours || 1) }}</text></view>
          <view><text>指定服务费</text><text>¥0.00</text></view>
        </view>
        <text v-if="item.boss_note" class="boss-note">老板备注：{{ item.boss_note }}</text>
        <view class="invite-actions">
          <button class="decline-btn" :disabled="item.responding" @tap="decline(item)">拒绝</button>
          <button class="accept-btn" :disabled="item.responding" @tap="accept(item)">{{ item.responding ? '处理中...' : '接受指定' }}</button>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <view><text>公开抢单大厅</text><text>指定陪玩预留名额不会被其他人占用</text></view>
        <button class="refresh-btn" @tap="refreshAll">刷新</button>
      </view>

      <view v-if="orders.length" class="order-list">
        <view v-for="order in orders" :key="order.order_no" class="order-card">
          <view class="meta-grid meta-grid--single">
            <view><text>人数</text><text>{{ order.current_players || 0 }}/{{ order.required_players }}人</text></view>
          </view>
          <text class="boss-note">老板备注：{{ order.boss_note || '无' }}</text>
          <button class="grab-btn" :disabled="order.grabbing || !order.can_grab" @tap="grab(order)">{{ order.grabbing ? '抢单中...' : '立即抢单' }}</button>
        </view>
      </view>
      <view v-else class="empty-card">暂无公开可抢订单，请保持在线。</view>
    </view>

    <view class="footer-actions">
      <button @tap="go('/pages/player/my-orders/index')">我的订单</button>
      <button @tap="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import {
  acceptDesignation,
  declineDesignation,
  getAvailableOrders,
  getCurrentPlayer,
  getDesignationInvitations,
  grabOrder as apiGrabOrder,
  logoutPlayer,
  updatePlayerOnlineStatus,
  type DesignationInvitation
} from '@/api/player'
import { getStorage, removeStorage } from '@/utils/storage'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { go, replace } from '@/utils/nav'
import { getClientProfile, isApprovedPlayer, normalizeAvatarUrl, setPlayerOnlineStatus, getPlayerOnlineStatus } from '@/utils/client'
import { formatHours } from '@/utils/format'
import { createOrderAlert } from '@/utils/orderAlert'

const player = ref<any>(null)
const orders = ref<any[]>([])
const invitations = ref<Array<DesignationInvitation & { responding?: boolean }>>([])
const online = ref(getPlayerOnlineStatus())
const onlineUpdating = ref(false)
const now = ref(Date.now())
const orderAlert = createOrderAlert()
const seenOrderKeys = new Set<string>()
let orderSnapshotReady = false
let pageVisible = true
let refreshTimer: ReturnType<typeof setInterval> | null = null
let clockTimer: ReturnType<typeof setInterval> | null = null

const playerAvatarUrl = computed(() => {
  const profile = getClientProfile()
  return normalizeAvatarUrl(player.value?.avatar_url || player.value?.avatarUrl || profile?.avatar_url || profile?.avatarUrl)
})

function money(value: number | string | null | undefined) { return Number(value || 0).toFixed(2) }

function countdownText(value: string) {
  const diff = Math.max(0, Math.floor((new Date(value).getTime() - now.value) / 1000))
  if (!diff) return '即将超时'
  return `${Math.floor(diff / 60)}:${String(diff % 60).padStart(2, '0')}后超时`
}

function stopRefresh() {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = null
}

function checkNewOrderAlert(inviteList: DesignationInvitation[], publicOrders: any[]) {
  const inviteKeys = (inviteList || []).map(item => `invite:${item.designation_id}`)
  const publicKeys = online.value
    ? (publicOrders || []).map(item => `order:${item.order_no}`)
    : []
  const nextKeys = [...inviteKeys, ...publicKeys]
  const hasNewInvitation = orderSnapshotReady && inviteKeys.some(key => !seenOrderKeys.has(key))
  const hasNewPublicOrder = orderSnapshotReady && publicKeys.some(key => !seenOrderKeys.has(key))

  nextKeys.forEach(key => seenOrderKeys.add(key))
  orderSnapshotReady = true

  if (!pageVisible || (!hasNewInvitation && !hasNewPublicOrder)) return
  orderAlert.notify()
  toast(hasNewInvitation ? '收到新的指定邀请' : '有新的公开订单')
}

async function refreshAll() {
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

async function startRefresh() {
  await refreshAll()
  stopRefresh()
  refreshTimer = setInterval(refreshAll, 10000)
}

async function accept(item: DesignationInvitation & { responding?: boolean }) {
  if (!(await confirm(`接受老板指定邀请吗？\n套餐：${item.package_name}\n指定本人不额外加价`, '接受指定'))) return
  item.responding = true
  try {
    await acceptDesignation(item.order_no)
    success('已接受指定邀请')
    await refreshAll()
    go('/pages/player/order-detail/index', { orderNo: item.order_no })
  } catch (error) {
    toast(getErrorMessage(error, '接受指定失败'))
  } finally {
    item.responding = false
  }
}

async function decline(item: DesignationInvitation & { responding?: boolean }) {
  if (!(await confirm('拒绝后该名额会立即转为公开抢单，确定拒绝吗？', '拒绝指定'))) return
  item.responding = true
  try {
    await declineDesignation(item.order_no)
    success('已拒绝，名额转为公开抢单')
    await refreshAll()
  } catch (error) {
    toast(getErrorMessage(error, '拒绝指定失败'))
  } finally {
    item.responding = false
  }
}

async function grab(order: any) {
  if (!order.can_grab || order.grabbing) return
  if (!(await confirm('确定抢这个公开订单吗？'))) return
  order.grabbing = true
  try {
    await apiGrabOrder(order.order_no, player.value.id)
    success('抢单成功')
    await refreshAll()
    go('/pages/player/order-detail/index', { orderNo: order.order_no })
  } catch (error) {
    toast(getErrorMessage(error, '抢单失败'))
  } finally {
    order.grabbing = false
  }
}

async function toggleOnline() {
  if (onlineUpdating.value) return
  onlineUpdating.value = true
  try {
    const result = await updatePlayerOnlineStatus(!online.value)
    online.value = Boolean(result.is_online)
    setPlayerOnlineStatus(online.value)
    if (online.value) {
      void orderAlert.prepare()
      await startRefresh()
    } else {
      stopRefresh()
      await refreshAll()
    }
    toast(online.value ? '已上线，开始接单' : '已离线，指定邀请仍可查看')
  } catch (error) {
    toast(getErrorMessage(error, '在线状态更新失败'))
  } finally {
    onlineUpdating.value = false
  }
}

async function handleLogout() {
  if (!(await confirm('确定退出登录吗？'))) return
  try { await logoutPlayer() } catch {}
  setPlayerOnlineStatus(false)
  removeStorage('token')
  removeStorage('player')
  replace('/pages/client/login/index')
}

onShow(() => {
  pageVisible = true
  void orderAlert.prepare()
})

onHide(() => {
  pageVisible = false
})

onMounted(async () => {
  if (!(await isApprovedPlayer())) {
    toast('请先成为陪玩师')
    go('/pages/player/apply/index')
    return
  }
  if (!getStorage<string>('token')) {
    replace('/pages/client/login/index')
    return
  }
  try {
    player.value = await getCurrentPlayer()
    online.value = Boolean(player.value?.is_online)
    setPlayerOnlineStatus(online.value)
  } catch {
    player.value = getStorage<any>('player')
  }
  if (!player.value) {
    toast('陪玩师信息未同步')
    replace('/pages/client/profile/index')
    return
  }
  void orderAlert.prepare()
  await startRefresh()
  clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  stopRefresh()
  if (clockTimer) clearInterval(clockTimer)
  orderAlert.destroy()
})
</script>

<style lang="scss" scoped>
.grab-page { min-height: 100vh; padding: 22rpx 24rpx 180rpx; box-sizing: border-box; color: #172116; background: radial-gradient(circle at 10% 0%, rgba(216,161,68,.12), transparent 30%), radial-gradient(circle at 90% 12%, rgba(47,155,99,.12), transparent 30%), #f7f3ea; }
.status-strip, .player-card, .section, .order-card, .invitation-card, .empty-card { border-radius: 28rpx; background: rgba(255,255,255,.97); border: 1rpx solid rgba(39,61,42,.08); box-shadow: 0 12rpx 30rpx rgba(39,61,42,.06); }
.status-strip { display: flex; align-items: center; gap: 14rpx; padding: 20rpx 22rpx; }
.status-dot { width: 16rpx; height: 16rpx; flex-shrink: 0; border-radius: 50%; background: #aab1a5; }
.status-dot.live { background: #2f9b63; box-shadow: 0 0 0 8rpx rgba(47,155,99,.12); }
.status-main { flex: 1; min-width: 0; }
.status-main text { display: block; }
.status-main text:first-child { font-size: 25rpx; font-weight: 900; }
.status-main text:last-child { margin-top: 4rpx; color: #879083; font-size: 20rpx; }
.status-strip button, .wallet-btn, .refresh-btn { min-width: 104rpx; height: 58rpx; margin: 0; padding: 0 16rpx; border-radius: 999rpx; color: #1f7c4b; font-size: 22rpx; font-weight: 900; background: #eef8f1; }
.status-strip button::after, .wallet-btn::after, .refresh-btn::after, .footer-actions button::after, .invite-actions button::after, .grab-btn::after { border: none; }
.player-card { margin-top: 20rpx; padding: 24rpx; display: flex; align-items: center; gap: 16rpx; color: #fff; background: linear-gradient(135deg, #173426, #1f7c4b 62%, #45ae72); }
.avatar { width: 88rpx; height: 88rpx; flex-shrink: 0; border-radius: 26rpx; }
.avatar--empty { display: flex; align-items: center; justify-content: center; color: #173426; font-size: 36rpx; font-weight: 900; background: #f3d79b; }
.player-main { flex: 1; min-width: 0; }
.player-main text { display: block; }
.player-name { font-size: 32rpx; font-weight: 900; }
.player-type { margin-top: 6rpx; color: rgba(255,255,255,.76); font-size: 22rpx; }
.wallet-btn { color: #fff; background: rgba(255,255,255,.14); }
.section { margin-top: 22rpx; padding: 24rpx; }
.invitation-section { border-color: rgba(216,161,68,.24); background: linear-gradient(180deg, #fffaf0, #fff); }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; margin-bottom: 18rpx; }
.section-head > view { flex: 1; min-width: 0; }
.section-head text { display: block; }
.section-head text:first-child { font-size: 30rpx; font-weight: 900; }
.section-head text:last-child { margin-top: 5rpx; color: #879083; font-size: 21rpx; }
.count-chip, .invite-label { padding: 7rpx 12rpx; border-radius: 999rpx; color: #a87520; font-size: 20rpx; font-weight: 900; background: #fff3d4; }
.invitation-card, .order-card { margin-top: 14rpx; padding: 20rpx; box-shadow: none; }
.invitation-card { border-color: rgba(216,161,68,.20); }
.invite-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.invite-top > view { flex: 1; min-width: 0; }
.invite-label, .order-no { display: block; }
.order-no { margin-top: 6rpx; color: #9aa197; font-size: 19rpx; font-family: monospace; word-break: break-all; }
.countdown { color: #a87520; font-size: 22rpx; font-weight: 900; }
.order-title { display: block; margin-top: 16rpx; font-size: 29rpx; font-weight: 900; }
.meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10rpx; margin-top: 16rpx; }
.meta-grid--single { grid-template-columns: 1fr; margin-top: 0; }
.meta-grid view { padding: 14rpx; border-radius: 16rpx; background: #f7faf4; }
.meta-grid text { display: block; }
.meta-grid text:first-child { color: #879083; font-size: 19rpx; }
.meta-grid text:last-child { margin-top: 5rpx; font-size: 24rpx; font-weight: 900; }
.boss-note { display: block; margin-top: 14rpx; padding: 14rpx; border-radius: 14rpx; color: #687665; font-size: 21rpx; line-height: 1.5; background: #f7f7f2; }
.invite-actions { display: grid; grid-template-columns: 1fr 2fr; gap: 12rpx; margin-top: 16rpx; }
.invite-actions button, .grab-btn { height: 72rpx; margin: 0; border-radius: 999rpx; font-size: 25rpx; font-weight: 900; }
.decline-btn { color: #a13d35; background: #fff0ed; }
.accept-btn, .grab-btn { color: #fff; background: linear-gradient(135deg, #5fc68a, #1f7c4b); }
.grab-btn { width: 100%; margin-top: 16rpx; }
.empty-card { padding: 50rpx 20rpx; color: #879083; text-align: center; box-shadow: none; }
.footer-actions { position: fixed; left: 24rpx; right: 24rpx; bottom: calc(24rpx + env(safe-area-inset-bottom)); display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; }
.footer-actions button { height: 76rpx; border-radius: 999rpx; color: #172116; font-size: 25rpx; font-weight: 900; background: rgba(255,255,255,.98); box-shadow: 0 10rpx 26rpx rgba(39,61,42,.10); }
</style>
