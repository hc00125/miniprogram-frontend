<template>
  <view class="waiting-page">
    <view class="status-bar"><view class="status-pulse"></view><view><text>{{ statusTitle }}</text><text>{{ statusSubtitle }}</text></view><text class="status-tag">{{ orderInfo?.status || '待接单' }}</text></view>

    <view class="hero-card"><text class="hero-eyebrow">ORDER MATCHING</text><text class="hero-title">正在为你组建队伍</text><text class="hero-sub">指定邀请与公开抢单同时进行，接单人数满足后进入付款</text><view class="hero-meta"><view><text>订单号</text><text>{{ orderNo || '加载中' }}</text></view><view><text>已等待</text><text>{{ waitTime || '00:00' }}</text></view></view></view>

    <view v-if="designations.length" class="card designation-card">
      <view class="card-head"><view><text class="card-title">指定陪玩邀请</text><text class="card-sub">邀请10分钟内有效；拒绝或超时后该名额转为公开抢单</text></view></view>
      <view class="designation-list">
        <view v-for="item in designations" :key="item.id" class="designation-item">
          <image v-if="item.avatar_url" class="designation-avatar" :src="item.avatar_url" mode="aspectFill" />
          <view v-else class="designation-avatar empty">{{ item.player_name?.[0] || '陪' }}</view>
          <view class="designation-main"><text>{{ item.player_name }}</text><text>{{ item.player_type }} · {{ item.is_online ? '在线' : '离线' }}</text><text v-if="item.status === 'pending'">{{ countdownText(item.expires_at) }}</text></view>
          <view class="designation-side"><text>{{ item.status_text }}</text><button v-if="item.can_release" :disabled="item.releasing" @tap="releaseDesignation(item)">{{ item.releasing ? '处理中' : '取消指定' }}</button></view>
        </view>
      </view>
    </view>

    <view v-if="orderInfo" class="card progress-card">
      <view class="card-head"><view><text class="card-title">接单与入房进度</text><text class="card-sub">已接单 {{ acceptedCount }}/{{ requiredCount }} 人；已确认入房 {{ enteredCount }}/{{ acceptedCount }} 人</text></view><text class="open-slot">剩余{{ Math.max(0, requiredCount - acceptedCount) }}位</text></view>
      <view class="progress-track"><view class="progress-fill" :style="{ width: progressPercent }"></view></view>
      <scroll-view scroll-x class="player-track" show-scrollbar="false">
        <view v-for="player in players" :key="player.id" class="player-item">
          <image v-if="player.avatar_url" class="player-avatar" :src="player.avatar_url" mode="aspectFill" />
          <view v-else class="player-avatar empty">{{ player.name?.[0] || '陪' }}</view>
          <text class="player-name">{{ player.name }}</text><text class="player-type">{{ player.is_designated ? '指定邀请已接受' : (player.type_name || '已接单') }}</text><text class="player-entry">{{ playerRoomText(player) }}</text>
        </view>
        <view v-for="slot in waitingSlots" :key="slot" class="player-item waiting"><view class="player-avatar waiting-avatar">···</view><text class="player-name">匹配中</text><text class="player-type">等待接单</text></view>
      </scroll-view>
      <view v-if="overduePlayers.length" class="entry-alert"><text>有 {{ overduePlayers.length }} 位陪玩入房超时或超时后确认</text><text>系统只保留待核实记录，不会自动处罚；由管理员结合实际情况处理。</text></view>
    </view>

    <view v-if="orderInfo" class="card detail-card">
      <view class="card-head"><view><text class="card-title">订单信息</text><text class="card-sub">派单、接单、付款、开打依次进行</text></view><text class="order-status">{{ orderInfo.status }}</text></view>
      <view class="info-row"><text>套餐</text><text>{{ orderInfo.package_name_raw || orderInfo.package_name || '待确认' }}</text></view>
      <view v-if="orderInfo.spec_display_name || orderInfo.spec_name" class="info-row"><text>规格</text><text>{{ orderInfo.spec_display_name || orderInfo.spec_name }}</text></view>
      <view class="info-row"><text>需要陪玩</text><text>{{ requiredCount }}人</text></view>
      <view v-if="activeDesignationNames" class="info-row"><text>指定陪玩</text><text>{{ activeDesignationNames }}</text></view>
      <view v-if="orderInfo.game_id_raw || orderInfo.game_id" class="info-row"><text>游戏ID/队伍码</text><text>{{ orderInfo.game_id_raw || orderInfo.game_id }}</text></view>
      <view class="info-row"><text>购买时长</text><text>{{ bookedHoursText }}</text></view>
      <view class="info-row"><text>下单时间</text><text>{{ createdTimeText }}</text></view>
      <view class="amount-row"><text>订单金额</text><text>{{ amountText }}</text></view>
    </view>

    <view class="footer-actions"><button class="ghost-btn" @tap="goMain('home')">返回首页</button><button class="primary-btn" @tap="checkOrder">刷新状态</button><button v-if="orderInfo?.status === '待接单'" class="danger-btn" @tap="handleCancel">取消订单</button><button v-if="orderInfo?.status === '待支付'" class="primary-btn" @tap="goPayment">去付款</button></view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { cancelOrder, getOrder, getOrderDesignations, releaseOrderDesignation, type OrderDesignationItem } from '@/api/boss'
import { formatDateTime } from '@/utils/format'
import { goMain, replace } from '@/utils/nav'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'

const orderNo = ref('')
const orderInfo = ref<any>(null)
const designations = ref<Array<OrderDesignationItem & { releasing?: boolean }>>([])
const waitTime = ref('')
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
let waitTimer: ReturnType<typeof setInterval> | null = null
let prevPlayerCount = 0

const players = computed(() => orderInfo.value?.players || [])
const acceptedCount = computed(() => players.value.length)
const enteredCount = computed(() => players.value.filter((item: any) => ['confirmed', 'late_confirmed', 'waived'].includes(item.room_join_status)).length)
const overduePlayers = computed(() => players.value.filter((item: any) => ['overdue', 'late_confirmed'].includes(item.room_join_status)))
const requiredCount = computed(() => Number(orderInfo.value?.required_players || 0))
const waitingSlots = computed(() => Array.from({ length: Math.max(0, requiredCount.value - acceptedCount.value) }, (_, index) => index))
const progressPercent = computed(() => requiredCount.value ? `${Math.min(100, acceptedCount.value / requiredCount.value * 100)}%` : '0%')
const bookedHoursText = computed(() => `${Number(orderInfo.value?.booked_hours || 1)}小时`)
const createdTimeText = computed(() => orderInfo.value?.created_at ? formatDateTime(orderInfo.value.created_at) : '待确认')
const amountText = computed(() => { const amount = orderInfo.value?.total_amount ?? orderInfo.value?.total_price_per_hour; return amount !== undefined && amount !== null ? `¥${Number(amount).toFixed(2)}` : '待确认' })
const activeDesignationNames = computed(() => designations.value.filter(item => ['pending', 'accepted'].includes(item.status)).map(item => item.player_name).join('、'))
const statusTitle = computed(() => designations.value.some(item => item.status === 'pending') ? '等待指定陪玩回应' : '订单已派发')
const statusSubtitle = computed(() => designations.value.some(item => item.status === 'pending') ? '指定邀请接受后，剩余名额继续公开匹配' : '接单人数满足后将自动进入付款页面')

function countdownText(value: string) { const diff = Math.max(0, Math.floor((new Date(value).getTime() - now.value) / 1000)); return diff ? `${Math.floor(diff / 60)}分${diff % 60}秒后超时` : '邀请即将超时并转公开' }
function playerRoomText(player: any) {
  const status = player.room_join_status || 'pending'
  if (status === 'confirmed') return '已确认入房'
  if (status === 'late_confirmed') return '超时后已确认入房'
  if (status === 'overdue') return '入房确认已超时'
  if (status === 'waived') return '管理员已免除确认'
  const deadline = player.room_join_deadline
  if (!deadline) return '已接单，等待入房确认'
  const seconds = Math.max(0, Math.floor((new Date(deadline).getTime() - now.value) / 1000))
  return seconds ? `入房确认 ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : '入房确认已超时'
}
function updateWaitTime() { now.value = Date.now(); if (!orderInfo.value?.created_at) return; const diff = Math.max(0, Math.floor((now.value - new Date(orderInfo.value.created_at).getTime()) / 1000)); waitTime.value = `${Math.floor(diff / 60)}:${String(diff % 60).padStart(2, '0')}` }
async function checkOrder() {
  if (!orderNo.value) return
  try {
    const [order, designationResult] = await Promise.all([getOrder(orderNo.value), getOrderDesignations(orderNo.value)])
    const count = order.players?.length || 0
    if (count > prevPlayerCount && prevPlayerCount > 0) toast('有陪玩接单了')
    prevPlayerCount = count
    orderInfo.value = order
    designations.value = (designationResult.results || []).map(item => ({ ...item, releasing: false }))
    updateWaitTime()
    if (order.status === '待支付') { stopTimers(); replace('/pages/boss/payment/index', { orderNo: orderNo.value }) }
    else if (order.status === '待开打' || order.status === '进行中') { stopTimers(); replace('/pages/boss/in-progress/index', { orderNo: orderNo.value }) }
    else if (order.status === '已完成') { stopTimers(); replace('/pages/boss/payment/index', { orderNo: orderNo.value }) }
    else if (order.status === '已取消') { stopTimers(); toast('订单已取消'); goMain('home') }
  } catch (error) { toast(getErrorMessage(error, '订单加载失败')) }
}
async function releaseDesignation(item: OrderDesignationItem & { releasing?: boolean }) { if (!(await confirm(`取消指定 ${item.player_name} 吗？该名额会立即转为公开抢单。`, '取消指定'))) return; item.releasing = true; try { await releaseOrderDesignation(orderNo.value, item.id); success('已取消指定，名额转为公开抢单'); await checkOrder() } catch (error) { toast(getErrorMessage(error, '取消指定失败')) } finally { item.releasing = false } }
function goPayment() { replace('/pages/boss/payment/index', { orderNo: orderNo.value }) }
async function handleCancel() { if (!(await confirm('确定要取消这个订单吗？'))) return; try { await cancelOrder(orderNo.value); success('订单已取消'); stopTimers(); goMain('home') } catch (error) { toast(getErrorMessage(error, '取消失败')) } }
function stopTimers() { if (timer) clearInterval(timer); if (waitTimer) clearInterval(waitTimer); timer = null; waitTimer = null }
onLoad(query => { orderNo.value = String(query?.orderNo || '') })
onMounted(() => { checkOrder(); timer = setInterval(checkOrder, 5000); waitTimer = setInterval(updateWaitTime, 1000) })
onUnmounted(stopTimers)
</script>

<style lang="scss" scoped>
.waiting-page{min-height:100vh;padding:20rpx 24rpx 220rpx;box-sizing:border-box;color:#172116;background:#f7f3ea}.status-bar,.hero-card,.card{margin-top:20rpx;border-radius:26rpx;background:#fff;box-shadow:0 12rpx 30rpx rgba(39,61,42,.06)}.status-bar{margin-top:0;display:flex;align-items:center;gap:14rpx;padding:18rpx 22rpx}.status-pulse{width:15rpx;height:15rpx;border-radius:50%;background:#2f9b63}.status-bar>view{flex:1}.status-bar text{display:block}.status-bar view text:first-child{font-size:25rpx;font-weight:900}.status-bar view text:last-child{margin-top:4rpx;color:#879083;font-size:20rpx}.status-tag{padding:7rpx 12rpx;border-radius:999rpx;color:#1f7c4b;background:#eef8f1}.hero-card{padding:30rpx;color:#fff;background:linear-gradient(135deg,#173426,#1f7c4b)}.hero-card>text{display:block}.hero-eyebrow{font-size:19rpx;opacity:.68}.hero-title{margin-top:8rpx;font-size:40rpx;font-weight:900}.hero-sub{margin-top:8rpx;font-size:22rpx;opacity:.78}.hero-meta{display:grid;grid-template-columns:1fr 1fr;gap:12rpx;margin-top:22rpx}.hero-meta view{padding:15rpx;border-radius:16rpx;background:rgba(255,255,255,.12)}.hero-meta text{display:block}.hero-meta text:first-child{font-size:19rpx;opacity:.7}.hero-meta text:last-child{margin-top:5rpx;font-weight:900}.card{padding:24rpx}.card-head{display:flex;justify-content:space-between;gap:16rpx}.card-head>view{flex:1}.card-title,.card-sub{display:block}.card-title{font-size:29rpx;font-weight:900}.card-sub{margin-top:6rpx;color:#879083;font-size:21rpx;line-height:1.5}.open-slot,.order-status{padding:7rpx 12rpx;border-radius:999rpx;color:#a87520;background:#fff5df;font-size:20rpx;font-weight:900}.designation-list{margin-top:16rpx}.designation-item{display:flex;align-items:center;gap:14rpx;padding:16rpx;border-radius:18rpx;background:#f7faf4}.designation-item+.designation-item{margin-top:12rpx}.designation-avatar,.player-avatar{width:72rpx;height:72rpx;flex-shrink:0;border-radius:20rpx}.empty{display:flex;align-items:center;justify-content:center;color:#fff;background:#1f7c4b;font-weight:900}.designation-main{flex:1;min-width:0}.designation-main text{display:block}.designation-main text:first-child{font-weight:900}.designation-main text:not(:first-child){margin-top:4rpx;color:#879083;font-size:20rpx}.designation-side{text-align:right}.designation-side>text{display:block;color:#1f7c4b;font-size:20rpx;font-weight:900}.designation-side button{height:50rpx;margin-top:8rpx;color:#a13d35;background:#fff0ed;font-size:19rpx}.progress-track{height:12rpx;margin-top:18rpx;overflow:hidden;border-radius:999rpx;background:#edf0eb}.progress-fill{height:100%;background:#1f7c4b}.player-track{margin-top:18rpx;white-space:nowrap}.player-item{width:190rpx;display:inline-flex;flex-direction:column;align-items:center;margin-right:12rpx;padding:18rpx;border-radius:18rpx;background:#f7faf4;box-sizing:border-box}.player-name,.player-type,.player-entry{display:block;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.player-name{margin-top:9rpx;font-weight:900}.player-type,.player-entry{margin-top:5rpx;color:#879083;font-size:18rpx}.waiting-avatar{color:#879083;background:#edf0eb}.entry-alert{margin-top:16rpx;padding:16rpx;border-radius:16rpx;color:#8f4d35;background:#fff2ec}.entry-alert text{display:block}.entry-alert text:last-child{margin-top:5rpx;font-size:20rpx}.info-row,.amount-row{min-height:64rpx;display:flex;align-items:center;justify-content:space-between;gap:16rpx;border-bottom:1rpx solid #eee;font-size:23rpx}.info-row text:first-child,.amount-row text:first-child{color:#879083}.info-row text:last-child,.amount-row text:last-child{text-align:right;font-weight:900}.amount-row text:last-child{color:#a87520;font-size:28rpx}.footer-actions{position:fixed;left:18rpx;right:18rpx;bottom:calc(20rpx + env(safe-area-inset-bottom));display:flex;gap:10rpx}.footer-actions button{flex:1;height:76rpx;margin:0;border-radius:999rpx;font-size:22rpx;font-weight:900}.ghost-btn{color:#687665;background:#fff}.primary-btn{color:#fff;background:#1f7c4b}.danger-btn{color:#fff;background:#a13d35}
</style>
