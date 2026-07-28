<template>
  <view class="club-page query-page">
    <view class="query-hero">
      <view class="hero-bg"><view class="ambient-glow ambient-glow--left"></view><view class="ambient-glow ambient-glow--right"></view></view>
      <view class="hero-content"><view class="hero-eyebrow">ORDER CENTER</view><view class="hero-title">订单中心</view><view class="hero-sub">查看派单、接单、钻石支付和开打进度</view></view>
      <button class="refresh-btn" :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh"><text v-if="!refreshing" class="refresh-icon">↻</text><text>{{ refreshing ? '刷新中' : '刷新' }}</text></button>
    </view>

    <view class="summary-row">
      <view class="summary-item"><text class="summary-value summary-value--warn">{{ payCount }}</text><text class="summary-label">待支付</text></view><view class="summary-divider"></view>
      <view class="summary-item"><text class="summary-value summary-value--ready">{{ readyCount }}</text><text class="summary-label">待开打</text></view><view class="summary-divider"></view>
      <view class="summary-item"><text class="summary-value">{{ runningCount }}</text><text class="summary-label">进行中</text></view>
    </view>

    <view class="cart-entry-card" @tap="openCart"><view class="cart-entry-icon">🛒</view><view class="cart-entry-main"><text class="cart-entry-title">购物车</text><text class="cart-entry-sub">{{ cartSummaryText }}</text></view><button class="cart-entry-btn" @tap.stop="openCart">{{ isLoggedIn ? '去结算' : '去登录' }}</button></view>

    <view v-if="!isLoggedIn" class="login-card"><view class="login-icon">微</view><view class="login-text"><text class="login-title">请先微信登录</text><text class="login-sub">登录后可查看当前账号的全部点单记录</text></view><button class="club-btn club-btn--primary login-btn" @tap="go('/pages/client/login/index')">去登录</button></view>

    <template v-else>
      <scroll-view scroll-x class="tabs" show-scrollbar="false"><view v-for="tab in tabs" :key="tab.key" class="tab" :class="{ active: activeTab === tab.key }" @tap="activeTab = tab.key"><text>{{ tab.label }}</text><text v-if="tab.count" class="tab-count">{{ tab.count }}</text></view></scroll-view>

      <view v-if="filteredOrders.length" class="order-list">
        <view v-for="order in filteredOrders" :key="order.order_no" class="order-card" @tap="openOrder(order)">
          <view class="order-cover"><image class="cover-img" :src="orderCover(order)" mode="aspectFill" /><view class="cover-shade"></view><view class="cover-status" :class="`cover-status--${coverStatusKey(order.status)}`"><text>{{ order.status }}</text></view></view>
          <view class="order-body">
            <view class="order-head">
              <view class="order-main"><text class="order-title">{{ order.package_name || '套餐订单' }}</text><text class="order-no">订单号 {{ order.order_no }}</text></view>
              <view class="order-amount"><view class="order-amount-main"><text class="amount-currency">💎</text><text class="amount-value">{{ diamond(orderDisplayDiamonds(order)) }}</text></view><text v-if="renewalPaidDiamonds(order) > 0" class="amount-renewal-note">含续单 💎{{ diamond(renewalPaidDiamonds(order)) }}</text></view>
            </view>
            <view class="order-meta"><view class="meta-item"><text class="meta-icon">●</text><text class="meta-text">{{ formatOrderTime(order.created_at) }}</text></view><view class="meta-item"><text class="meta-icon">●</text><text class="meta-text">{{ stageHint(order.status) }}</text></view></view>
            <view class="order-actions"><button class="club-btn club-btn--ghost" @tap.stop="goMain('order')">再来一单</button><button class="club-btn club-btn--primary" @tap.stop="openOrder(order)">{{ actionText(order.status) }}</button></view>
          </view>
        </view>
      </view>

      <view v-else-if="loaded" class="empty-card"><view class="empty-orb"><view class="empty-icon">单</view></view><text class="empty-title">暂无点单记录</text><text class="empty-sub">去点单大厅选择套餐，今晚一起开局</text><button class="club-btn club-btn--primary" @tap="goMain('order')">去点单</button></view>
      <view v-else class="loading-card"><view class="loading-spinner"></view><text>加载中...</text></view>
    </template>

    <MainBottomTabs active="query" @select="handleMainTabSelect" />
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { getMyBossOrders, type BossOrderListItem } from '@/api/boss'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import { diamondsFrom, formatDiamonds } from '@/utils/diamonds'
import { formatDateTime as formatDateTimeValue } from '@/utils/format'
import { success, toast, getErrorMessage } from '@/utils/feedback'
import { go, relaunch, navigateToTab, type MainTab } from '@/utils/nav'
import { getStorage } from '@/utils/storage'
import { getShopCartCount } from '@/utils/shopCart'

const activeTab = ref('all')
const cartCount = ref(0)
const isLoggedIn = ref(false)
const orders = ref<BossOrderListItem[]>([])
const loaded = ref(false)
const refreshing = ref(false)

const waitingCount = computed(() => orders.value.filter(o => o.status === '待接单').length)
const payCount = computed(() => orders.value.filter(o => o.status === '待支付').length)
const readyCount = computed(() => orders.value.filter(o => o.status === '待开打').length)
const runningCount = computed(() => orders.value.filter(o => o.status === '进行中').length)
const doneCount = computed(() => orders.value.filter(o => o.status === '已完成').length)
const cartSummaryText = computed(() => isLoggedIn.value ? `当前购物车 ${cartCount.value} 件商品，可继续点单或合并结算` : '登录后可查看购物车商品')
const tabs = computed(() => [
  { key: 'all', label: '全部', count: orders.value.length || 0 },
  { key: '待接单', label: '待接单', count: waitingCount.value || 0 },
  { key: '待支付', label: '待支付', count: payCount.value || 0 },
  { key: '待开打', label: '待开打', count: readyCount.value || 0 },
  { key: '进行中', label: '进行中', count: runningCount.value || 0 },
  { key: '已完成', label: '已完成', count: doneCount.value || 0 }
])
const filteredOrders = computed(() => activeTab.value === 'all' ? orders.value : orders.value.filter(o => o.status === activeTab.value))
const fallbackCover = 'https://api.huc125.cn/media/banners/hero-lounge.jpg'

function orderCover(order: BossOrderListItem) { return (order as any).cover_url || fallbackCover }
function coverStatusKey(status: string) { if (status === '待接单') return 'pending'; if (status === '待支付') return 'paying'; if (status === '待开打') return 'ready'; if (status === '进行中') return 'running'; if (status === '已完成') return 'done'; if (status === '已取消') return 'cancel'; return 'idle' }
function actionText(status: string) { if (status === '待接单') return '查看接单'; if (status === '待支付') return '去支付'; if (status === '待开打') return '等待开打'; if (status === '进行中') return '服务进度'; if (status === '已完成') return '查看详情'; return '查看订单' }
function stageHint(status: string) { if (status === '待接单') return '订单已派发，等待陪玩接单'; if (status === '待支付') return '队伍已就位，请完成钻石支付'; if (status === '待开打') return '支付成功，等待陪玩开打'; if (status === '进行中') return '服务正在进行中'; if (status === '已完成') return '服务已完成'; if (status === '已取消') return '订单已取消'; return status }
function baseOrderDiamonds(order: BossOrderListItem) { const raw = order as BossOrderListItem & Record<string, any>; return diamondsFrom(raw.total_amount_diamonds ?? raw.total_price_per_hour_diamonds, order.total_amount ?? order.total_price_per_hour ?? 0) }
function renewalPaidDiamonds(order: BossOrderListItem) { const raw = order as BossOrderListItem & Record<string, any>; return diamondsFrom(raw.renewal_paid_amount_diamonds, raw.renewal_paid_amount || 0) }
function orderDisplayDiamonds(order: BossOrderListItem) { return baseOrderDiamonds(order) + renewalPaidDiamonds(order) }
function diamond(value: unknown) { try { return formatDiamonds(value ?? 0) } catch { return '--' } }
function formatOrderTime(value: string) { return formatDateTimeValue(value) }
function openOrder(order: BossOrderListItem) { if (order.status === '待接单') go('/pages/boss/waiting/index', { orderNo: order.order_no }); else if (order.status === '待支付' || order.status === '已完成') go('/pages/boss/payment/index', { orderNo: order.order_no }); else if (order.status === '待开打' || order.status === '进行中') go('/pages/boss/in-progress/index', { orderNo: order.order_no }); else go('/pages/boss/payment/index', { orderNo: order.order_no }) }
function syncLoginState() { const token = getStorage<string>('token'); isLoggedIn.value = Boolean(token); return token }
function resetOrderCenter() { orders.value = []; cartCount.value = 0; activeTab.value = 'all' }
function openCart() { if (!syncLoginState()) { go('/pages/client/login/index'); return } go('/pages/shop/cart/index') }
async function fetchOrders() { const token = syncLoginState(); try { loaded.value = false; if (!token) { resetOrderCenter(); return true } orders.value = await getMyBossOrders(); return true } catch (error) { toast(getErrorMessage(error, '订单刷新失败')); return false } finally { loaded.value = true } }
async function fetchCartCount() { const token = syncLoginState(); if (!token) { cartCount.value = 0; return true } try { cartCount.value = await getShopCartCount(); return true } catch (error) { cartCount.value = 0; toast(getErrorMessage(error, '购物车刷新失败')); return false } }
async function refreshCenter() { syncLoginState(); const [ordersOk, cartOk] = await Promise.all([fetchOrders(), fetchCartCount()]); return ordersOk && cartOk }
async function handleManualRefresh() { if (refreshing.value) return; refreshing.value = true; try { if (await refreshCenter()) success('刷新成功') } finally { refreshing.value = false } }
onShow(() => { void refreshCenter() })
function handleMainTabSelect(tab: MainTab) { if (tab === 'home' || tab === 'order') { relaunch('/pages/boss/home/index', { tab }); return } if (tab === 'query') return; navigateToTab(tab) }
function goMain(tab: MainTab = 'home') { handleMainTabSelect(tab) }
</script>

<style lang="scss" src="./index.scss" scoped></style>
