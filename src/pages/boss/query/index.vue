<template>
  <view class="query-page">
    <view class="header-row">
      <view><text class="title">订单查询</text><text class="subtitle">查看当前账号的订单和服务进度</text></view>
      <button @tap="refreshCenter">刷新</button>
    </view>

    <view class="summary-row">
      <view><text>{{ payCount }}</text><text>待支付</text></view>
      <view><text>{{ readyCount }}</text><text>待开打</text></view>
      <view><text>{{ runningCount }}</text><text>进行中</text></view>
    </view>

    <view class="cart-row" @tap="openCart"><text class="cart-icon">🛒</text><view><text>购物车</text><text>{{ cartSummaryText }}</text></view><text class="arrow">›</text></view>

    <view v-if="!isLoggedIn" class="login-card"><text class="login-icon">微</text><view><text>请先微信登录</text><text>登录后可查看当前账号的订单记录</text></view><button @tap="go('/pages/client/login/index')">去登录</button></view>

    <template v-else>
      <scroll-view scroll-x class="tabs" show-scrollbar="false">
        <view class="tab-row"><view v-for="tab in tabs" :key="tab.key" class="tab" :class="{ active: activeTab === tab.key }" @tap="activeTab = tab.key"><text>{{ tab.label }}</text><text v-if="tab.count">{{ tab.count }}</text></view></view>
      </scroll-view>

      <view v-if="filteredOrders.length" class="order-list">
        <view v-for="order in filteredOrders" :key="order.order_no" class="order-card" @tap="openOrder(order)">
          <view class="cover-wrap"><image class="cover" :src="orderCover(order)" mode="aspectFill" /><text class="status" :class="statusClass(order.status)">{{ order.status }}</text></view>
          <view class="order-main">
            <view class="top-line"><text class="name">{{ order.package_name || '套餐订单' }}</text><text class="amount">¥{{ formatMoney(orderDisplayAmount(order)) }}</text></view>
            <text class="order-no">{{ order.order_no }}</text>
            <view class="meta-line"><text>{{ formatOrderTime(order.created_at) }}</text><text>{{ stageHint(order.status) }}</text></view>
            <view class="actions"><button v-if="canRepeat(order.status)" class="repeat" @tap.stop="goMain('order')">再来一单</button><button class="detail" @tap.stop="openOrder(order)">{{ actionText(order.status) }}</button></view>
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
const cartSummaryText = computed(() => isLoggedIn.value ? `共 ${cartCount.value} 件；一次结算一个商品规格` : '登录后可查看购物车')
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
function stageHint(status: string) { if (status === '待接单') return '等待陪玩接单'; if (status === '待支付') return '人数已满足，请付款'; if (status === '待开打') return '付款成功，等待开打'; if (status === '进行中') return '服务正在进行'; if (status === '已完成') return '服务已完成'; if (status === '已取消') return '订单已取消'; return status }
function statusClass(status: string) { return { pay: status === '待支付', ready: status === '待开打', running: status === '进行中', done: status === '已完成', cancel: status === '已取消' } }
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
.query-page{min-height:100vh;padding:20rpx 22rpx 132rpx;box-sizing:border-box;color:#172116;background:#f7f5ef}.header-row{display:flex;align-items:center;justify-content:space-between;gap:18rpx}.header-row>view{flex:1}.title,.subtitle{display:block}.title{font-size:38rpx;font-weight:900}.subtitle{margin-top:5rpx;color:#7d877a;font-size:21rpx}.header-row button{width:100rpx;height:58rpx;margin:0;padding:0;border-radius:999rpx;color:#1f7c4b;font-size:22rpx;font-weight:900;background:#fff}.header-row button::after,.actions button::after,.login-card button::after,.empty-card button::after{border:none}.summary-row{display:grid;grid-template-columns:repeat(3,1fr);gap:1rpx;margin-top:16rpx;overflow:hidden;border-radius:16rpx;background:#e8ebe7}.summary-row view{padding:13rpx 6rpx;text-align:center;background:#fff}.summary-row text{display:block}.summary-row text:first-child{color:#1f7c4b;font-size:28rpx;font-weight:900}.summary-row text:last-child{margin-top:2rpx;color:#8b9389;font-size:17rpx}.cart-row,.login-card{display:flex;align-items:center;gap:12rpx;margin-top:14rpx;padding:14rpx 16rpx;border-radius:16rpx;background:#fff}.cart-icon,.login-icon{width:48rpx;height:48rpx;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:13rpx;background:#eef8f1;font-size:22rpx}.cart-row>view,.login-card>view{flex:1;min-width:0}.cart-row view text,.login-card view text{display:block}.cart-row view text:first-child,.login-card view text:first-child{font-size:22rpx;font-weight:900}.cart-row view text:last-child,.login-card view text:last-child{margin-top:3rpx;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#899187;font-size:17rpx}.arrow{color:#a2a8a0;font-size:30rpx}.login-card button{width:112rpx;height:56rpx;margin:0;color:#fff;font-size:21rpx;background:#1f7c4b}.tabs{margin-top:14rpx;white-space:nowrap}.tab-row{display:inline-flex;gap:8rpx}.tab{display:inline-flex;align-items:center;gap:5rpx;padding:9rpx 14rpx;border-radius:999rpx;color:#687665;background:#fff;font-size:19rpx}.tab.active{color:#fff;background:#1f7c4b;font-weight:900}.tab text:last-child{font-size:15rpx}.order-list{display:flex;flex-direction:column;gap:12rpx;margin-top:14rpx}.order-card{display:flex;gap:14rpx;padding:12rpx;border-radius:18rpx;background:#fff;box-shadow:0 7rpx 18rpx rgba(39,61,42,.05)}.cover-wrap{position:relative;width:154rpx;height:154rpx;flex-shrink:0;overflow:hidden;border-radius:14rpx;background:#e9ece8}.cover{width:100%;height:100%}.status{position:absolute;left:8rpx;top:8rpx;padding:4rpx 8rpx;border-radius:999rpx;color:#fff;font-size:15rpx;font-weight:900;background:rgba(31,124,75,.9)}.status.pay{background:rgba(168,117,32,.92)}.status.ready{background:rgba(67,111,161,.92)}.status.running{background:rgba(31,124,75,.92)}.status.done{background:rgba(91,104,93,.88)}.status.cancel{background:rgba(120,120,120,.88)}.order-main{flex:1;min-width:0;display:flex;flex-direction:column}.top-line{display:flex;align-items:flex-start;gap:10rpx}.name{flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:24rpx;font-weight:900}.amount{flex-shrink:0;color:#a87520;font-size:25rpx;font-weight:900}.order-no{display:block;margin-top:5rpx;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#9a9f98;font-size:16rpx}.meta-line{display:flex;flex-direction:column;gap:3rpx;margin-top:9rpx;color:#747d74;font-size:17rpx;line-height:1.35}.actions{display:flex;justify-content:flex-end;gap:8rpx;margin-top:auto;padding-top:8rpx}.actions button{min-width:92rpx;height:48rpx;margin:0;padding:0 14rpx;border-radius:999rpx;font-size:17rpx;font-weight:900}.repeat{color:#1f7c4b;background:#eef8f1}.detail{color:#fff;background:#1f7c4b}.empty-card{margin-top:16rpx;padding:52rpx 18rpx;border-radius:18rpx;color:#858d83;text-align:center;background:#fff}.empty-card text{display:block}.empty-card button{width:170rpx;height:60rpx;margin-top:16rpx;color:#fff;background:#1f7c4b}
</style>
