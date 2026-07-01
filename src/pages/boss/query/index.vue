<template>
  <view class="club-page query-page">
    <!-- 顶部 Hero -->
    <view class="query-hero">
      <view class="hero-bg">
        <view class="ambient-glow ambient-glow--left"></view>
        <view class="ambient-glow ambient-glow--right"></view>
      </view>
      <view class="hero-content">
        <view class="hero-eyebrow">ORDER CENTER</view>
        <view class="hero-title">订单中心</view>
        <view class="hero-sub">查看您账号的全部点单记录与服务状态</view>
      </view>
      <button class="refresh-btn" @tap="refreshCenter">
        <text class="refresh-icon">↻</text>
        <text>刷新</text>
      </button>
    </view>

    <!-- 统计三联 -->
    <view class="summary-row">
      <view class="summary-item">
        <text class="summary-value">{{ runningCount }}</text>
        <text class="summary-label">进行中</text>
      </view>
      <view class="summary-divider"></view>
      <view class="summary-item">
        <text class="summary-value summary-value--warn">{{ payCount }}</text>
        <text class="summary-label">待支付</text>
      </view>
      <view class="summary-divider"></view>
      <view class="summary-item">
        <text class="summary-value summary-value--success">{{ doneCount }}</text>
        <text class="summary-label">已完成</text>
      </view>
    </view>

    <view class="cart-entry-card" @tap="openCart">
      <view class="cart-entry-icon">🛒</view>
      <view class="cart-entry-main">
        <text class="cart-entry-title">购物车</text>
        <text class="cart-entry-sub">{{ cartSummaryText }}</text>
      </view>
      <button class="cart-entry-btn" @tap.stop="openCart">{{ isLoggedIn ? '去结算' : '去登录' }}</button>
    </view>

    <!-- 未登录提示 -->
    <view v-if="!isLoggedIn" class="login-card">
      <view class="login-icon">微</view>
      <view class="login-text">
        <text class="login-title">请先微信登录</text>
        <text class="login-sub">登录后可查看当前账号的全部点单记录</text>
      </view>
      <button class="club-btn club-btn--primary login-btn" @tap="go('/pages/client/login/index')">去登录</button>
    </view>

    <template v-else>
      <!-- Tab 切换 -->
      <scroll-view scroll-x class="tabs" show-scrollbar="false">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ active: activeTab === tab.key }"
          @tap="activeTab = tab.key"
        >
          <text>{{ tab.label }}</text>
          <text v-if="tab.count" class="tab-count">{{ tab.count }}</text>
        </view>
      </scroll-view>

      <!-- 订单列表 -->
      <view v-if="filteredOrders.length" class="order-list">
        <view
          v-for="order in filteredOrders"
          :key="order.order_no"
          class="order-card"
          @tap="openOrder(order)"
        >
          <view class="order-cover">
            <image
              class="cover-img"
              :src="orderCover(order)"
              mode="aspectFill"
            />
            <view class="cover-shade"></view>
            <view class="cover-status" :class="`cover-status--${coverStatusKey(order.status)}`">
              <text>{{ order.status }}</text>
            </view>
          </view>

          <view class="order-body">
            <view class="order-head">
              <view class="order-main">
                <text class="order-title">{{ order.package_name || '套餐订单' }}</text>
                <text class="order-no">订单号 {{ order.order_no }}</text>
              </view>
              <view class="order-amount">
                <text class="amount-currency">¥</text>
                <text class="amount-value">{{ formatMoney(order.total_amount || order.total_price_per_hour || 0) }}</text>
                <text v-if="order.total_price_per_hour && !order.total_amount" class="amount-unit">/小时</text>
              </view>
            </view>

            <view class="order-meta">
              <view class="meta-item">
                <text class="meta-icon">●</text>
                <text class="meta-text">{{ order.required_players || 1 }}人局 · {{ order.booked_hours || 1 }}小时</text>
              </view>
              <view class="meta-item">
                <text class="meta-icon">●</text>
                <text class="meta-text">{{ formatOrderTime(order.created_at) }}</text>
              </view>
            </view>

            <view v-if="order.players?.length" class="order-players">
              <view
                v-for="player in order.players.slice(0, 4)"
                :key="player.id"
                class="player-avatar"
              >
                <text>{{ player.name?.[0] || '陪' }}</text>
              </view>
              <text v-if="order.players.length > 4" class="player-more">+{{ order.players.length - 4 }}</text>
              <text class="players-label">{{ order.players.length }} 位陪玩</text>
            </view>

            <view class="order-actions">
              <button class="club-btn club-btn--ghost" @tap.stop="goMain('order')">
                再来一单
              </button>
              <button class="club-btn club-btn--primary" @tap.stop="openOrder(order)">
                {{ actionText(order.status) }}
              </button>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else-if="loaded" class="empty-card">
        <view class="empty-orb">
          <view class="empty-ring empty-ring--outer"></view>
          <view class="empty-ring empty-ring--inner"></view>
          <view class="empty-icon">单</view>
        </view>
        <text class="empty-title">暂无点单记录</text>
        <text class="empty-sub">去点单大厅选择套餐，今晚一起开局</text>
        <button class="club-btn club-btn--primary" @tap="goMain('order')">去点单</button>
      </view>

      <view v-else class="loading-card">
        <view class="loading-spinner"></view>
        <text>加载中...</text>
      </view>
    </template>

    <MainBottomTabs active="query" @select="handleMainTabSelect" />
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { getMyBossOrders, type BossOrderListItem } from '@/api/boss'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import { formatDateTime as formatDateTimeValue } from '@/utils/format'
import { toast, getErrorMessage } from '@/utils/feedback'
import { go, relaunch, navigateToTab, type MainTab } from '@/utils/nav'
import { getStorage } from '@/utils/storage'
import { getShopCartCount } from '@/utils/shopCart'

const activeTab = ref('all')
const orders = ref<BossOrderListItem[]>([])
const loaded = ref(false)
const cartCount = ref(0)
const isLoggedIn = ref(false)

const runningCount = computed(() => orders.value.filter(o => o.status === '进行中').length)
const waitingCount = computed(() => orders.value.filter(o => o.status === '待接单').length)
const payCount = computed(() => orders.value.filter(o => o.status === '待支付').length)
const doneCount = computed(() => orders.value.filter(o => o.status === '已完成').length)
const cartSummaryText = computed(() => isLoggedIn.value ? `当前购物车 ${cartCount.value} 件商品，可继续点单或合并结算` : '登录后可查看购物车商品')

const tabs = computed(() => [
  { key: 'all', label: '全部', count: orders.value.length || 0 },
  { key: '待接单', label: '待接单', count: waitingCount.value || 0 },
  { key: '进行中', label: '进行中', count: runningCount.value || 0 },
  { key: '待支付', label: '待支付', count: payCount.value || 0 },
  { key: '已完成', label: '已完成', count: doneCount.value || 0 }
])

const filteredOrders = computed(() => {
  if (activeTab.value === 'all') return orders.value
  return orders.value.filter(o => o.status === activeTab.value)
})

const fallbackCover = '/static/images/home-redesign/hero-lounge.jpg'

function orderCover(order: BossOrderListItem) {
  return (order as any).cover_url || fallbackCover
}

function coverStatusKey(status: string) {
  if (status === '待接单') return 'pending'
  if (status === '进行中') return 'running'
  if (status === '待支付') return 'paying'
  if (status === '已完成') return 'done'
  if (status === '已取消') return 'cancel'
  return 'idle'
}

function actionText(status: string) {
  if (status === '待接单') return '查看进度'
  if (status === '进行中') return '服务进度'
  if (status === '待支付') return '去支付'
  if (status === '已完成') return '查看详情'
  return '再来一单'
}

function formatMoney(value: number) {
  return Number(value || 0).toFixed(2)
}

function formatOrderTime(value: string) {
  return formatDateTimeValue(value)
}

function openOrder(order: BossOrderListItem) {
  if (order.status === '待接单') {
    go('/pages/boss/waiting/index', { orderNo: order.order_no })
  } else if (order.status === '进行中') {
    go('/pages/boss/in-progress/index', { orderNo: order.order_no })
  } else {
    go('/pages/boss/payment/index', { orderNo: order.order_no })
  }
}

function syncLoginState() {
  const token = getStorage<string>('token')
  isLoggedIn.value = Boolean(token)
  return token
}

function resetOrderCenter() {
  orders.value = []
  cartCount.value = 0
  activeTab.value = 'all'
}

function openCart() {
  if (!syncLoginState()) {
    go('/pages/client/login/index')
    return
  }
  go('/pages/shop/cart/index')
}

async function fetchOrders() {
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
}

async function fetchCartCount() {
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
  const token = syncLoginState()
  if (!token) {
    resetOrderCenter()
    loaded.value = true
    return
  }
  fetchOrders()
  fetchCartCount()
}

onShow(refreshCenter)

function handleMainTabSelect(tab: MainTab) {
  if (tab === 'home' || tab === 'order') {
    relaunch('/pages/boss/home/index', { tab })
    return
  }
  if (tab === 'query') return
  navigateToTab(tab)
}

function goMain(tab: MainTab = 'home') {
  handleMainTabSelect(tab)
}
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';

.query-page {
  min-height: 100vh;
  padding: 20rpx 24rpx 200rpx;
  box-sizing: border-box;
  background:
    radial-gradient(ellipse at 12% 0%, rgba(216, 161, 68, 0.10), transparent 36%),
    radial-gradient(ellipse at 88% 14%, rgba(47, 155, 99, 0.10), transparent 32%),
    linear-gradient(180deg, #fbf7ef 0%, #f7f3ea 48%, #fffaf2 100%);
}

.query-hero {
  position: relative;
  min-height: 200rpx;
  padding: 28rpx 32rpx 26rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
  overflow: hidden;
  border: 1px solid rgba(216, 161, 68, 0.18);
  border-radius: 28rpx;
  background:
    radial-gradient(circle at 8% 18%, rgba(255, 255, 255, 0.96), transparent 36%),
    radial-gradient(circle at 92% 28%, rgba(255, 255, 255, 0.72), transparent 30%),
    linear-gradient(135deg, #fff8ed 0%, #fef5dc 56%, #edf6f0 100%);
  box-shadow: 0 16rpx 40rpx rgba(176, 134, 60, 0.10);
}
.hero-bg { position: absolute; inset: 0; pointer-events: none; }
.ambient-glow { position: absolute; border-radius: 50%; filter: blur(40rpx); opacity: 0.4; }
.ambient-glow--left { top: -60rpx; left: -60rpx; width: 220rpx; height: 220rpx; background: radial-gradient(circle, rgba(216, 161, 68, 0.50), transparent 70%); }
.ambient-glow--right { bottom: -80rpx; right: -80rpx; width: 240rpx; height: 240rpx; background: radial-gradient(circle, rgba(47, 155, 99, 0.40), transparent 70%); }
.hero-content { position: relative; z-index: 1; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.hero-eyebrow { color: #a87520; font-size: 21rpx; font-weight: 900; letter-spacing: 1.5rpx; }
.hero-title { color: #14291f; font-size: 42rpx; font-weight: 900; line-height: 1.16; letter-spacing: -0.5rpx; }
.hero-sub { color: #5a6b5b; font-size: 23rpx; font-weight: 600; line-height: 1.4; }
.refresh-btn { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 6rpx; min-width: 116rpx; height: 56rpx; padding: 0 20rpx; border-radius: 999rpx; background: rgba(255, 255, 255, 0.92); color: #1f7c4b; font-size: 24rpx; font-weight: 900; flex-shrink: 0; box-shadow: 0 8rpx 18rpx rgba(31, 124, 75, 0.10); border: 1px solid rgba(47, 155, 99, 0.12); }
.refresh-icon { font-size: 26rpx; line-height: 1; }

.summary-row { display: grid; grid-template-columns: 1fr 1px 1fr 1px 1fr; align-items: center; margin: 22rpx 0 0; padding: 22rpx 24rpx; border: 1px solid rgba(47, 155, 99, 0.10); border-radius: 24rpx; background: rgba(255, 255, 255, 0.96); box-shadow: 0 12rpx 28rpx rgba(38, 69, 54, 0.05); }
.summary-item { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.summary-value { color: #1f7c4b; font-size: 44rpx; font-weight: 900; line-height: 1.1; font-variant-numeric: tabular-nums; }
.summary-value--warn { color: #c8821a; }
.summary-value--success { color: #26753a; }
.summary-label { color: #828a7e; font-size: 22rpx; font-weight: 600; }
.summary-divider { width: 1px; height: 56rpx; background: rgba(42, 63, 48, 0.08); }

.cart-entry-card { margin-top: 18rpx; padding: 22rpx 24rpx; display: flex; align-items: center; gap: 18rpx; border-radius: 24rpx; border: 1px solid rgba(47, 155, 99, 0.12); background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(239, 251, 244, 0.96)); box-shadow: 0 12rpx 28rpx rgba(38, 69, 54, 0.05); box-sizing: border-box; }
.cart-entry-icon { width: 78rpx; height: 78rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 22rpx; color: #1f7c4b; font-size: 34rpx; background: rgba(47, 155, 99, 0.10); }
.cart-entry-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.cart-entry-title { color: #14291f; font-size: 30rpx; font-weight: 900; }
.cart-entry-sub { color: #5a6b5b; font-size: 22rpx; font-weight: 600; line-height: 1.4; }
.cart-entry-btn { min-width: 132rpx; height: 62rpx; padding: 0 22rpx; margin: 0; border-radius: 999rpx; color: #fff; font-size: 24rpx; font-weight: 900; background: linear-gradient(135deg, #2f9b63, #1f7c4b); }
.cart-entry-btn::after { border: none; }

.login-card { margin-top: 22rpx; padding: 24rpx 26rpx; display: flex; align-items: center; gap: 18rpx; border: 1px solid rgba(216, 161, 68, 0.20); border-radius: 24rpx; background: linear-gradient(135deg, #fff7e6 0%, #fffaf0 100%); box-shadow: 0 10rpx 26rpx rgba(216, 161, 68, 0.08); }
.login-icon { width: 80rpx; height: 80rpx; flex-shrink: 0; border-radius: 24rpx; background: linear-gradient(135deg, #5fb78a, #1f7c4b); color: #fff; font-size: 36rpx; font-weight: 900; display: flex; align-items: center; justify-content: center; }
.login-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.login-title { color: #14291f; font-size: 28rpx; font-weight: 900; }
.login-sub { color: #8b7649; font-size: 22rpx; font-weight: 600; line-height: 1.4; }
.login-btn { min-width: 144rpx; min-height: 64rpx; font-size: 26rpx; }

.tabs { white-space: nowrap; margin: 22rpx 0 18rpx; }
.tab { display: inline-flex; align-items: center; gap: 6rpx; min-width: 110rpx; height: 64rpx; margin-right: 12rpx; padding: 0 22rpx; border-radius: 999rpx; background: #fff; color: #687665; font-size: 25rpx; font-weight: 800; border: 1px solid rgba(36, 55, 39, 0.10); transition: all 0.2s ease; }
.tab.active { background: linear-gradient(135deg, #173426, #1f7c4b); color: #fff; border-color: transparent; box-shadow: 0 8rpx 18rpx rgba(31, 124, 75, 0.22); }
.tab-count { display: inline-flex; min-width: 28rpx; height: 28rpx; padding: 0 8rpx; border-radius: 999rpx; background: rgba(42, 63, 48, 0.10); color: #828a7e; font-size: 20rpx; font-weight: 800; align-items: center; justify-content: center; line-height: 1; }
.tab.active .tab-count { background: rgba(255, 255, 255, 0.22); color: #fff; }

.order-list { display: flex; flex-direction: column; gap: 18rpx; }
.order-card { position: relative; border: 1px solid rgba(42, 63, 48, 0.06); border-radius: 26rpx; background: rgba(255, 255, 255, 0.96); overflow: hidden; box-shadow: 0 14rpx 32rpx rgba(38, 69, 54, 0.06); }
.order-cover { position: relative; width: 100%; height: 180rpx; overflow: hidden; }
.cover-img { position: absolute; inset: 0; width: 100%; height: 100%; }
.cover-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0.30) 100%), linear-gradient(90deg, rgba(255, 255, 255, 0.10), transparent 30%); }
.cover-status { position: absolute; top: 14rpx; left: 14rpx; padding: 6rpx 14rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 800; backdrop-filter: blur(8rpx); background: rgba(255, 255, 255, 0.86); color: #14291f; border: 1rpx solid rgba(255, 255, 255, 0.30); }
.cover-status--pending { color: #9a6a16; background: rgba(255, 247, 223, 0.92); }
.cover-status--running { color: #1f7c4b; background: rgba(239, 251, 239, 0.92); }
.cover-status--paying { color: #c46b16; background: rgba(255, 241, 224, 0.92); }
.cover-status--done { color: #26753a; background: rgba(220, 248, 224, 0.92); }
.cover-status--cancel { color: #6f6f6f; background: rgba(232, 232, 232, 0.92); }
.order-body { padding: 20rpx 22rpx 22rpx; display: flex; flex-direction: column; gap: 14rpx; }
.order-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; }
.order-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.order-title { color: #14291f; font-size: 30rpx; font-weight: 900; letter-spacing: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-no { color: #8b9788; font-size: 20rpx; font-weight: 600; font-family: 'SF Mono', 'DIN Alternate', -apple-system, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.order-amount { display: flex; align-items: baseline; gap: 2rpx; color: #1f7c4b; flex-shrink: 0; }
.amount-currency { font-size: 22rpx; font-weight: 800; color: #1f7c4b; }
.amount-value { font-size: 38rpx; font-weight: 900; line-height: 1; color: #1f7c4b; font-variant-numeric: tabular-nums; letter-spacing: -0.5rpx; }
.amount-unit { margin-left: 2rpx; font-size: 19rpx; font-weight: 700; color: #828a7e; }
.order-meta { display: flex; flex-wrap: wrap; gap: 18rpx; color: #828a7e; font-size: 22rpx; font-weight: 600; }
.meta-item { display: flex; align-items: center; gap: 6rpx; }
.meta-icon { color: #5fb78a; font-size: 14rpx; }
.meta-text { color: #5a6b5b; }
.order-players { display: flex; align-items: center; gap: 8rpx; padding-top: 6rpx; }
.player-avatar { width: 48rpx; height: 48rpx; border-radius: 50%; background: linear-gradient(135deg, #5fb78a, #1f7c4b); color: #fff; font-size: 20rpx; font-weight: 900; display: flex; align-items: center; justify-content: center; border: 2rpx solid #fff; box-shadow: 0 4rpx 10rpx rgba(31, 124, 75, 0.18); margin-left: -8rpx; }
.player-avatar:first-child { margin-left: 0; }
.player-more { width: 48rpx; height: 48rpx; border-radius: 50%; background: rgba(42, 63, 48, 0.10); color: #5a6b5b; font-size: 18rpx; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-left: -8rpx; border: 2rpx solid #fff; box-sizing: border-box; }
.players-label { margin-left: 8rpx; color: #828a7e; font-size: 21rpx; font-weight: 700; }
.order-actions { margin-top: 4rpx; display: grid; grid-template-columns: 1fr 1.4fr; gap: 14rpx; }
.order-actions .club-btn { min-height: 76rpx; font-size: 26rpx; font-weight: 800; border-radius: 20rpx; }
.order-actions .club-btn--ghost { color: #5a6b5b; background: #f7faf4; border: 1px solid rgba(36, 55, 39, 0.10); }

.empty-card { margin-top: 22rpx; padding: 56rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 14rpx; border: 1px solid rgba(42, 63, 48, 0.06); border-radius: 28rpx; background: rgba(255, 255, 255, 0.96); box-shadow: 0 14rpx 36rpx rgba(38, 69, 54, 0.06); }
.empty-orb { position: relative; width: 156rpx; height: 156rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.empty-ring { position: absolute; inset: 0; border-radius: 50%; border: 2rpx solid rgba(47, 155, 99, 0.18); }
.empty-ring--outer { animation: empty-breathe 2.6s ease-in-out infinite; }
.empty-ring--inner { inset: 22rpx; border-color: rgba(47, 155, 99, 0.28); animation: empty-breathe 2.6s ease-in-out infinite 0.6s; }
@keyframes empty-breathe { 0%, 100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.06); opacity: 0.8; } }
.empty-icon { position: relative; z-index: 1; width: 96rpx; height: 96rpx; border-radius: 28rpx; background: linear-gradient(135deg, #fef5dc, #fff7e6); color: #a87520; font-size: 38rpx; font-weight: 900; display: flex; align-items: center; justify-content: center; box-shadow: 0 12rpx 24rpx rgba(216, 161, 68, 0.20); }
.empty-title { color: #14291f; font-size: 32rpx; font-weight: 900; letter-spacing: 0; }
.empty-sub { color: #5a6b5b; font-size: 24rpx; font-weight: 600; line-height: 1.4; margin-bottom: 12rpx; }
.empty-card .club-btn { min-width: 240rpx; min-height: 78rpx; font-size: 28rpx; font-weight: 900; border-radius: 24rpx; }
.loading-card { margin-top: 22rpx; padding: 80rpx 32rpx; display: flex; flex-direction: column; align-items: center; gap: 18rpx; color: #5a6b5b; font-size: 24rpx; font-weight: 600; }
.loading-spinner { width: 56rpx; height: 56rpx; border: 4rpx solid rgba(47, 155, 99, 0.18); border-top-color: #1f7c4b; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .empty-ring--outer,
  .empty-ring--inner,
  .loading-spinner {
    animation: none;
  }
}
</style>
