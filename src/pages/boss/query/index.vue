<template>
  <view class="club-page query-page">
    <view class="query-hero"><view><text class="eyebrow">ORDER CENTER</text><text class="hero-title">订单中心</text><text class="hero-sub">查看派单、接单、付款和服务进度</text></view><button @tap="refreshCenter">刷新</button></view>

    <view class="summary-row"><view><text>{{ payCount }}</text><text>待支付</text></view><view><text>{{ readyCount }}</text><text>待开打</text></view><view><text>{{ runningCount }}</text><text>进行中</text></view></view>

    <view class="cart-entry-card" @tap="openCart"><text class="cart-icon">🛒</text><view><text>购物车</text><text>{{ cartSummaryText }}</text></view><text>›</text></view>

    <view v-if="!isLoggedIn" class="login-card"><text class="login-icon">微</text><view><text>请先微信登录</text><text>登录后可查看当前账号的订单记录</text></view><button @tap="go('/pages/client/login/index')">去登录</button></view>

    <template v-else>
      <scroll-view scroll-x class="tabs" show-scrollbar="false"><view v-for="tab in tabs" :key="tab.key" class="tab" :class="{ active: activeTab === tab.key }" @tap="activeTab = tab.key"><text>{{ tab.label }}</text><text v-if="tab.count">{{ tab.count }}</text></view></scroll-view>

      <view v-if="filteredOrders.length" class="order-list">
        <view v-for="order in filteredOrders" :key="order.order_no" class="order-card" @tap="openOrder(order)">
          <view class="order-cover"><image class="cover-img" :src="orderCover(order)" mode="aspectFill" /><text class="cover-status">{{ order.status }}</text></view>
          <view class="order-body">
            <view class="order-head"><view><text class="order-title">{{ order.package_name || '套餐订单' }}</text><text class="order-no">{{ order.order_no }}</text></view><text class="order-amount">¥{{ formatMoney(orderDisplayAmount(order)) }}</text></view>
            <view class="order-meta"><text>{{ formatOrderTime(order.created_at) }}</text><text>{{ stageHint(order.status) }}</text></view>
            <view class="order-actions"><button v-if="canRepeat(order.status)" class="ghost" @tap.stop="goMain('order')">再来一单</button><button class="primary" @tap.stop="openOrder(order)">{{ actionText(order.status) }}</button></view>
          </view>
        </view>
      </view>
      <view v-else-if="loaded" class="empty-card"><text>暂无点单记录</text><button @tap="goMain('order')">去点单</button></view>
      <view v-else class="empty-card">加载中...</view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { getMyBossOrders, type BossOrderListItem } from '@/api/boss'
import { formatDateTime as formatDateTimeValue } from '@/utils/format'
import { toast, getErrorMessage } from '@/utils/feedback'
import { go, goMain } from '@/utils/nav'
import { getStorage } from '@/utils/storage'
import { getShopCartCount } from '@/utils/shopCart'

const activeTab = ref('all')
const cartCount = ref(0)
const isLoggedIn = ref(false)
const orders = ref<BossOrderListItem[]>([])
const loaded = ref(false)
const waitingCount = computed(() => orders.value.filter(order => order.status === '待接单').length)
const payCount = computed(() => orders.value.filter(order => order.status === '待支付').length)
const readyCount = computed(() => orders.value.filter(order => order.status === '待开打').length)
const runningCount = computed(() => orders.value.filter(order => order.status === '进行中').length)
const doneCount = computed(() => orders.value.filter(order => order.status === '已完成').length)
const cartSummaryText = computed(() => isLoggedIn.value ? `当前购物车共 ${cartCount.value} 件；一次结算一个商品规格` : '登录后可查看购物车')
const tabs = computed(() => [
  { key: 'all', label: '全部', count: orders.value.length },
  { key: '待接单', label: '待接单', count: waitingCount.value },
  { key: '待支付', label: '待支付', count: payCount.value },
  { key: '待开打', label: '待开打', count: readyCount.value },
  { key: '进行中', label: '进行中', count: runningCount.value },
  { key: '已完成', label: '已完成', count: doneCount.value }
])
const filteredOrders = computed(() => activeTab.value === 'all' ? orders.value : orders.value.filter(order => order.status === activeTab.value))
const fallbackCover = 'https://api.huc125.cn/media/banners/hero-lounge.jpg'

function orderCover(order: BossOrderListItem) { return (order as any).cover_url || fallbackCover }
function canRepeat(status: string) { return status === '已完成' || status === '已取消' }
function actionText(status: string) { if (status === '待接单') return '查看接单'; if (status === '待支付') return '去支付'; if (status === '待开打') return '等待开打'; if (status === '进行中') return '服务进度'; return '查看详情' }
function stageHint(status: string) { if (status === '待接单') return '订单已派发，等待陪玩接单'; if (status === '待支付') return '接单人数已满足，请付款'; if (status === '待开打') return '付款成功，等待陪玩开打'; if (status === '进行中') return '服务正在进行中'; if (status === '已完成') return '服务已完成'; if (status === '已取消') return '订单已取消'; return status }
function orderDisplayAmount(order: BossOrderListItem) { return Number(order.total_amount ?? order.total_price_per_hour ?? 0) + Number((order as any).renewal_paid_amount || 0) }
function formatMoney(value: number) { return Number(value || 0).toFixed(2) }
function formatOrderTime(value: string) { return formatDateTimeValue(value) }
function openOrder(order: BossOrderListItem) {
  if (order.status === '待接单') return go('/pages/boss/waiting/index', { orderNo: order.order_no })
  if (order.status === '待开打' || order.status === '进行中') return go('/pages/boss/in-progress/index', { orderNo: order.order_no })
  go('/pages/boss/payment/index', { orderNo: order.order_no })
}
function syncLoginState() { const token = getStorage<string>('token'); isLoggedIn.value = Boolean(token); return token }
function openCart() { if (!syncLoginState()) return go('/pages/client/login/index'); go('/pages/shop/cart/index') }
async function fetchOrders() {
  const token = syncLoginState()
  loaded.value = false
  if (!token) { orders.value = []; loaded.value = true; return }
  try { orders.value = await getMyBossOrders() } catch (error) { orders.value = []; toast(getErrorMessage(error, '加载订单失败')) }
  finally { loaded.value = true }
}
async function fetchCartCount() { if (!syncLoginState()) { cartCount.value = 0; return }; try { cartCount.value = await getShopCartCount() } catch { cartCount.value = 0 } }
function refreshCenter() { fetchOrders(); fetchCartCount() }
onShow(refreshCenter)
</script>

<style lang="scss" scoped>
.query-page{min-height:100vh;padding:20rpx 24rpx 140rpx;box-sizing:border-box;background:linear-gradient(180deg,#fbf7ef,#fffaf2)}.query-hero{display:flex;align-items:center;justify-content:space-between;gap:20rpx;padding:30rpx;border-radius:28rpx;color:#fff;background:linear-gradient(135deg,#173426,#1f7c4b)}.query-hero>view{flex:1}.query-hero text{display:block}.eyebrow{font-size:19rpx;opacity:.7}.hero-title{margin-top:8rpx;font-size:40rpx;font-weight:900}.hero-sub{margin-top:8rpx;font-size:22rpx;opacity:.78}.query-hero button{margin:0;color:#fff;background:rgba(255,255,255,.14)}.summary-row{display:grid;grid-template-columns:repeat(3,1fr);gap:1rpx;margin-top:18rpx;overflow:hidden;border-radius:22rpx;background:#eee}.summary-row view{padding:20rpx 8rpx;text-align:center;background:#fff}.summary-row text{display:block}.summary-row text:first-child{font-size:32rpx;font-weight:900;color:#1f7c4b}.summary-row text:last-child{margin-top:5rpx;color:#879083;font-size:20rpx}.cart-entry-card,.login-card{display:flex;align-items:center;gap:16rpx;margin-top:18rpx;padding:22rpx;border-radius:24rpx;background:#fff}.cart-icon,.login-icon{width:58rpx;height:58rpx;display:flex;align-items:center;justify-content:center;border-radius:16rpx;background:#eef8f1}.cart-entry-card>view,.login-card>view{flex:1;min-width:0}.cart-entry-card view text,.login-card view text{display:block}.cart-entry-card view text:first-child,.login-card view text:first-child{font-size:26rpx;font-weight:900}.cart-entry-card view text:last-child,.login-card view text:last-child{margin-top:5rpx;color:#879083;font-size:20rpx}.login-card button{margin:0;color:#fff;background:#1f7c4b}.tabs{margin-top:20rpx;white-space:nowrap}.tab{display:inline-flex;align-items:center;gap:7rpx;margin-right:10rpx;padding:12rpx 18rpx;border-radius:999rpx;color:#687665;background:#fff}.tab.active{color:#fff;background:#1f7c4b}.tab text:last-child{font-size:18rpx}.order-list{display:flex;flex-direction:column;gap:18rpx;margin-top:18rpx}.order-card{overflow:hidden;border-radius:26rpx;background:#fff}.order-cover{position:relative;height:190rpx}.cover-img{width:100%;height:100%}.cover-status{position:absolute;right:16rpx;top:16rpx;padding:7rpx 12rpx;border-radius:999rpx;color:#fff;background:rgba(0,0,0,.5)}.order-body{padding:22rpx}.order-head{display:flex;justify-content:space-between;gap:16rpx}.order-head>view{flex:1}.order-head text{display:block}.order-title{font-size:28rpx;font-weight:900}.order-no{margin-top:5rpx;color:#999;font-size:19rpx}.order-amount{color:#a87520;font-size:30rpx;font-weight:900}.order-meta{display:flex;justify-content:space-between;gap:16rpx;margin-top:16rpx;color:#7d877a;font-size:21rpx}.order-actions{display:flex;justify-content:flex-end;gap:12rpx;margin-top:18rpx}.order-actions button{min-width:150rpx;height:66rpx;margin:0;border-radius:999rpx}.order-actions .ghost{color:#1f7c4b;background:#eef8f1}.order-actions .primary{color:#fff;background:#1f7c4b}.empty-card{margin-top:20rpx;padding:60rpx 20rpx;border-radius:24rpx;text-align:center;background:#fff}.empty-card text{display:block;color:#879083}.empty-card button{margin-top:20rpx;color:#fff;background:#1f7c4b}
</style>
