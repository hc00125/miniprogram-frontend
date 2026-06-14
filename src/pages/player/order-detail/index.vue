<template>
  <view class="club-page detail-page">
    <view class="brand-poster detail-hero">
      <view>
        <view class="eyebrow">ORDER DETAIL</view>
        <view class="title">陪玩订单详情</view>
        <view class="sub">{{ orderNo }}</view>
      </view>
      <view v-if="orderInfo" class="club-status" :class="statusClass(orderInfo.status)">{{ orderInfo.status }}</view>
    </view>

    <view v-if="loading" class="club-empty">加载中...</view>

    <view v-if="orderInfo" class="club-card">
      <view class="club-card__hd">
        <text class="club-card__title">服务信息</text>
        <button class="tiny-link" @tap="fetchOrder">刷新</button>
      </view>
      <view class="club-card__bd">
        <view class="info-row"><text>套餐</text><text>{{ orderInfo.package_name }}</text></view>
        <view v-if="orderInfo.addon_name" class="info-row"><text>附加项</text><text>{{ orderInfo.addon_name }}</text></view>
        <view v-if="orderInfo.game_id" class="info-row"><text>游戏ID/队伍码</text><text class="copyable" @tap="copyText(orderInfo.game_id)">{{ orderInfo.game_id }}</text></view>
        <view class="info-row"><text>价格</text><text class="amount">¥{{ orderInfo.total_amount || orderInfo.total_price_per_hour }}</text></view>
        <view v-if="orderInfo.status === '待接单'" class="info-row"><text>等待时间</text><text>{{ waitTime }}</text></view>
        <view v-if="orderInfo.status === '进行中'" class="info-row"><text>已进行</text><text class="duration">{{ duration }}</text></view>
        <view v-if="orderInfo.duration_minutes" class="info-row"><text>服务时长</text><text>{{ orderInfo.duration_minutes }} 分钟</text></view>
      </view>
    </view>

    <view v-if="orderInfo?.boss_note" class="club-card note-card">
      <text>老板备注</text>
      <text>{{ orderInfo.boss_note }}</text>
    </view>

    <view v-if="orderInfo" class="club-card">
      <view class="club-card__hd">
        <text class="club-card__title">队伍打手</text>
        <text class="club-pill">{{ orderInfo.players?.length || 0 }}/{{ orderInfo.required_players }}</text>
      </view>
      <view class="club-card__bd player-stack">
        <view v-for="playerItem in orderInfo.players" :key="playerItem.id" class="player-row">
          <text class="avatar">{{ playerItem.name?.[0] }}</text>
          <view class="player-main">
            <text>{{ playerItem.name }}</text>
            <text>{{ playerItem.type_name }} · {{ playerItem.status || '已接单' }}</text>
          </view>
          <text v-if="playerItem.id === player?.id" class="me-tag">我</text>
        </view>
      </view>
    </view>

    <view class="footer-actions">
      <button class="club-btn club-btn--ghost" @tap="backToRoute('/pages/player/grab/index')">大厅</button>
      <button v-if="orderInfo?.status === '进行中' && !orderInfo?.timer_started_at" class="club-btn" :disabled="starting" @tap="handleStartTimer">开始计时</button>
      <button v-if="orderInfo?.status === '进行中' && orderInfo?.timer_started_at && !orderInfo?.is_paused" class="club-btn club-btn--warn" @tap="handlePause">暂停</button>
      <button v-if="orderInfo?.status === '进行中' && orderInfo?.is_paused" class="club-btn" @tap="handleResume">继续</button>
      <button v-if="orderInfo?.status === '进行中'" class="club-btn" :disabled="completing" @tap="handleComplete">完成</button>
      <button v-if="orderInfo?.status === '待支付'" class="club-btn club-btn--ghost" @tap="toast('等待老板支付')">待支付</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { completeOrder, getPlayerOrder, pausePlayerOrder, resumePlayerOrder, startTimer } from '@/api/player'
import { formatDuration } from '@/utils/format'
import { getStorage } from '@/utils/storage'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { replace, backToRoute } from '@/utils/nav'
import { isApprovedPlayer } from '@/utils/client'

const orderNo = ref('')
const orderInfo = ref<any>(null)
const player = ref<any>(null)
const loading = ref(true)
const starting = ref(false)
const completing = ref(false)
const duration = ref('00:00:00')
const waitTime = ref('')
let refreshTimer: ReturnType<typeof setInterval> | null = null
let durationTimer: ReturnType<typeof setInterval> | null = null
let prevPlayerCount = 0

function statusClass(status: string) {
  return {
    'club-status--wait': status === '待接单',
    'club-status--run': status === '进行中',
    'club-status--pay': status === '待支付',
    'club-status--done': status === '已完成',
    'club-status--cancel': status === '已取消'
  }
}

function updateDuration() {
  if (!orderInfo.value) return
  if (orderInfo.value.timer_started_at) {
    const start = new Date(orderInfo.value.timer_started_at).getTime()
    const end = orderInfo.value.end_time
      ? new Date(orderInfo.value.end_time).getTime()
      : orderInfo.value.is_paused && orderInfo.value.last_paused_at
        ? new Date(orderInfo.value.last_paused_at).getTime()
        : Date.now()
    duration.value = formatDuration(Math.floor((end - start) / 1000) - (orderInfo.value.paused_duration || 0))
  } else if (orderInfo.value.status === '进行中') {
    duration.value = '等待开始计时'
  }

  if (orderInfo.value.status === '待接单' && orderInfo.value.created_at) {
    const diffSec = Math.floor((Date.now() - new Date(orderInfo.value.created_at).getTime()) / 1000)
    const minutes = Math.floor(diffSec / 60)
    const seconds = String(diffSec % 60).padStart(2, '0')
    waitTime.value = `等待 ${minutes}:${seconds}`
  } else {
    waitTime.value = ''
  }
}

async function fetchOrder() {
  try {
    const res = await getPlayerOrder(orderNo.value)
    const newCount = res.players?.length || 0
    if (newCount > prevPlayerCount && prevPlayerCount > 0) toast('有打手就位')
    prevPlayerCount = newCount
    orderInfo.value = res
    updateDuration()
  } catch (error) {
    toast(getErrorMessage(error, '订单加载失败'))
  } finally {
    loading.value = false
  }
}

async function handleStartTimer() {
  const ok = await confirm('确定开始计时？开始后将按时间计费', '开始计时')
  if (!ok) return
  starting.value = true
  try {
    await startTimer(orderNo.value, player.value.id)
    success('计时已开始')
    await fetchOrder()
  } catch (error) {
    toast(getErrorMessage(error, '操作失败'))
  } finally {
    starting.value = false
  }
}

async function handlePause() {
  try {
    await pausePlayerOrder(orderNo.value)
    success('计时已暂停')
    await fetchOrder()
  } catch (error) {
    toast(getErrorMessage(error, '暂停失败'))
  }
}

async function handleResume() {
  try {
    await resumePlayerOrder(orderNo.value)
    success('计时已继续')
    await fetchOrder()
  } catch (error) {
    toast(getErrorMessage(error, '继续失败'))
  }
}

async function handleComplete() {
  const ok = await confirm('确定要标记订单完成吗？')
  if (!ok) return
  completing.value = true
  try {
    await completeOrder(orderNo.value, player.value.id)
    success('已标记完成')
    await fetchOrder()
  } catch (error) {
    toast(getErrorMessage(error, '操作失败'))
  } finally {
    completing.value = false
  }
}

function copyText(text: string) {
  uni.setClipboardData({ data: text, success: () => success('已复制') })
}

function stopTimers() {
  if (refreshTimer) clearInterval(refreshTimer)
  if (durationTimer) clearInterval(durationTimer)
  refreshTimer = null
  durationTimer = null
}

onLoad((query) => {
  orderNo.value = String(query?.orderNo || '')
})

onMounted(async () => {
  if (!(await isApprovedPlayer())) {
    toast('请先成为陪玩师')
    replace('/pages/player/apply/index')
    return
  }
  const token = getStorage<string>('token')
  const playerInfo = getStorage<any>('player')
  if (!token) {
    replace('/pages/client/login/index')
    return
  }
  if (!playerInfo) {
    toast('陪玩师信息未同步，请刷新个人中心')
    replace('/pages/client/profile/index')
    return
  }
  player.value = playerInfo
  fetchOrder()
  refreshTimer = setInterval(fetchOrder, 5000)
  durationTimer = setInterval(updateDuration, 1000)
})

onUnmounted(stopTimers)
</script>

<style lang="scss" scoped>
.detail-page { padding-bottom: 190rpx; }
.detail-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; }
.detail-hero > view, .detail-hero > text { position: relative; z-index: 1; }
.eyebrow { color: #a87520; font-size: 22rpx; font-weight: 900; }
.title { margin-top: 12rpx; color: #172116; font-size: 42rpx; font-weight: 900; }
.sub { margin-top: 8rpx; color: #687665; font-size: 24rpx; }
.tiny-link { color: #1f7c4b; font-size: 26rpx; font-weight: 900; }
.info-row { min-height: 68rpx; display: flex; justify-content: space-between; align-items: center; gap: 20rpx; border-bottom: 1px solid rgba(37,49,35,.08); font-size: 27rpx; }
.info-row:last-child { border-bottom: 0; }
.info-row text:first-child { color: #687665; }
.amount { color: #a87520; font-weight: 900; }
.duration { color: #1f7c4b; font-weight: 900; }
.copyable { color: #1f7c4b; font-weight: 800; }
.note-card { padding: 26rpx 28rpx; display: flex; flex-direction: column; gap: 10rpx; }
.note-card text:first-child { color: #a87520; font-size: 24rpx; font-weight: 800; }
.note-card text:last-child { color: #5d4d25; font-size: 27rpx; }
.player-stack { display: flex; flex-direction: column; gap: 14rpx; }
.player-row { display: flex; align-items: center; gap: 16rpx; padding: 20rpx; border-radius: 24rpx; background: #fff; border: 1px solid rgba(37,49,35,.08); }
.avatar { width: 62rpx; height: 62rpx; border-radius: 50%; background: linear-gradient(135deg, #65c980, #1f7c4b); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; }
.player-main { flex: 1; display: flex; flex-direction: column; gap: 4rpx; font-size: 28rpx; }
.player-main text:last-child { color: #687665; font-size: 23rpx; }
.me-tag { padding: 6rpx 14rpx; border-radius: 999rpx; background: #eef9ef; color: #1f7c4b; font-size: 22rpx; font-weight: 800; }
.footer-actions { position: fixed; left: 24rpx; right: 24rpx; bottom: calc(28rpx + env(safe-area-inset-bottom)); display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
</style>
