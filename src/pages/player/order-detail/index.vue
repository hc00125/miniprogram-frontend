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
        <view v-if="orderInfo.kook_room_number" class="info-row"><text>KOOK房间号</text><text class="copyable" @tap="copyText(orderInfo.kook_room_number)">{{ orderInfo.kook_room_number }}</text></view>
        <view class="info-row"><text>主订单金额</text><text class="amount">¥{{ orderInfo.total_amount || orderInfo.total_price_per_hour }}</text></view>
        <view class="info-row"><text>累计服务时长</text><text class="duration">{{ totalBookedHoursText }}</text></view>
        <view v-if="orderInfo.status === '待接单'" class="info-row"><text>等待时间</text><text>{{ waitTime }}</text></view>
        <view v-if="orderInfo.status === '待支付'" class="info-row"><text>当前阶段</text><text>等待老板付款</text></view>
        <view v-if="orderInfo.status === '待开打'" class="info-row"><text>当前阶段</text><text class="duration">老板已付款，可开打</text></view>
        <view v-if="orderInfo.status === '进行中'" class="info-row"><text>已进行</text><text class="duration">{{ duration }}</text></view>
        <view v-if="orderInfo.duration_minutes" class="info-row"><text>实际服务</text><text>{{ orderInfo.duration_minutes }} 分钟</text></view>
      </view>
    </view>

    <view v-if="orderInfo && (renewalCount || orderInfo.pending_renewal_order_no)" class="club-card renewal-card">
      <view class="club-card__hd">
        <text class="club-card__title">续单信息</text>
        <text class="renewal-badge">已续 {{ renewalCount }} 次</text>
      </view>
      <view class="renewal-grid">
        <view><text>原时长</text><text>{{ formatHours(orderInfo.booked_hours) }}</text></view>
        <view><text>续单时长</text><text>{{ formatHours(orderInfo.renewal_booked_hours) }}</text></view>
        <view><text>累计时长</text><text>{{ totalBookedHoursText }}</text></view>
      </view>
      <view v-if="orderInfo.pending_renewal_order_no" class="renewal-pending">
        <text>老板有一笔续单等待付款</text>
        <text>付款完成后新增时长会自动计入本单；待支付期间暂不能完成服务。</text>
      </view>
      <view v-if="paidRenewals.length" class="renewal-list">
        <view v-for="item in paidRenewals" :key="item.order_no" class="renewal-row">
          <text>第{{ item.renewal_index }}次续单 · +{{ formatHours(item.booked_hours) }}</text>
          <text>已支付 ¥{{ Number(item.total_amount || 0).toFixed(2) }}</text>
        </view>
      </view>
    </view>

    <view v-if="orderInfo && canEditKookRoom" class="club-card kook-card">
      <view class="club-card__hd">
        <text class="club-card__title">KOOK 房间号</text>
        <text v-if="orderInfo.kook_room_number" class="room-status">已填写</text>
        <text v-else class="room-status room-status--warn">待填写</text>
      </view>
      <view class="kook-desc">多个陪玩接同一单时，只要任意一位填写，整张订单都会统一使用这个房间号。</view>
      <view class="kook-input-row">
        <input
          v-model="roomInput"
          class="kook-input"
          placeholder="请输入 KOOK 房间号，例如 TC8888-01"
          maxlength="100"
          @focus="roomFocused = true"
          @blur="roomFocused = false"
        />
        <button class="save-room-btn" :disabled="savingRoom" @tap="saveKookRoom">
          {{ savingRoom ? '保存中' : (orderInfo.kook_room_number ? '更新' : '保存') }}
        </button>
      </view>
      <view v-if="orderInfo.kook_room_updated_at" class="kook-tip">最近更新时间：{{ formatRoomTime(orderInfo.kook_room_updated_at) }}</view>
      <view v-else class="kook-tip">老板付款后，填写房间号即可确认开打。</view>
    </view>

    <view v-if="orderInfo?.boss_note" class="club-card note-card">
      <text>老板备注</text>
      <text>{{ orderInfo.boss_note }}</text>
    </view>

    <view v-if="orderInfo" class="club-card">
      <view class="club-card__hd">
        <text class="club-card__title">队伍陪玩</text>
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
      <button v-if="orderInfo?.status === '待开打'" class="club-btn" :disabled="starting" @tap="handleStartTimer">{{ starting ? '开打中...' : '确认开打' }}</button>
      <button v-if="orderInfo?.status === '进行中' && orderInfo?.timer_started_at && !orderInfo?.is_paused" class="club-btn club-btn--warn" @tap="handlePause">暂停</button>
      <button v-if="orderInfo?.status === '进行中' && orderInfo?.is_paused" class="club-btn" @tap="handleResume">继续</button>
      <button v-if="orderInfo?.status === '进行中'" class="club-btn" :disabled="completing" @tap="handleComplete">完成</button>
      <button v-if="orderInfo?.status === '待支付'" class="club-btn club-btn--ghost" @tap="toast('等待老板完成付款')">等待付款</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { completeOrder, getPlayerOrder, pausePlayerOrder, resumePlayerOrder, setPlayerOrderKookRoom, startTimer } from '@/api/player'
import { formatDuration } from '@/utils/format'
import { getStorage } from '@/utils/storage'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { goMain, replace, backToRoute } from '@/utils/nav'
import { isApprovedPlayer } from '@/utils/client'

const orderNo = ref('')
const orderInfo = ref<any>(null)
const player = ref<any>(null)
const loading = ref(true)
const starting = ref(false)
const completing = ref(false)
const savingRoom = ref(false)
const roomInput = ref('')
const roomFocused = ref(false)
const duration = ref('00:00:00')
const waitTime = ref('')
let refreshTimer: ReturnType<typeof setInterval> | null = null
let durationTimer: ReturnType<typeof setInterval> | null = null
let prevPlayerCount = 0

const canEditKookRoom = computed(() => Boolean(orderInfo.value && ['待开打', '进行中'].includes(orderInfo.value.status)))
const renewalCount = computed(() => Number(orderInfo.value?.renewal_count || 0))
const paidRenewals = computed(() => (orderInfo.value?.renewals || []).filter((item: any) => item.paid))
const totalBookedHoursText = computed(() => formatHours(orderInfo.value?.total_booked_hours ?? orderInfo.value?.booked_hours ?? 0))

function formatHours(value: number) {
  const hours = Number(value || 0)
  return Number.isInteger(hours) ? `${hours}小时` : `${hours.toFixed(1)}小时`
}

function statusClass(status: string) {
  return {
    'club-status--wait': status === '待接单',
    'club-status--pay': status === '待支付',
    'club-status--ready': status === '待开打',
    'club-status--run': status === '进行中',
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
    duration.value = formatDuration(Math.max(0, Math.floor((end - start) / 1000) - (orderInfo.value.paused_duration || 0)))
  } else if (orderInfo.value.status === '待开打') {
    duration.value = '等待开打'
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
    if (newCount > prevPlayerCount && prevPlayerCount > 0) toast('有陪玩就位')
    prevPlayerCount = newCount
    orderInfo.value = res
    if (!roomFocused.value) roomInput.value = res.kook_room_number || ''
    updateDuration()
  } catch (error) {
    toast(getErrorMessage(error, '订单加载失败'))
  } finally {
    loading.value = false
  }
}

function formatRoomTime(input: string) {
  if (!input) return '-'
  const date = new Date(input)
  return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function saveKookRoom() {
  const value = roomInput.value.trim()
  if (!value) {
    toast('请填写 KOOK 房间号')
    return false
  }
  savingRoom.value = true
  try {
    const res = await setPlayerOrderKookRoom(orderNo.value, value)
    if (orderInfo.value) {
      orderInfo.value.kook_room_number = res.kook_room_number
      orderInfo.value.kook_room_updated_at = new Date().toISOString()
    }
    roomInput.value = res.kook_room_number
    success('KOOK 房间号已保存')
    await fetchOrder()
    return true
  } catch (error) {
    toast(getErrorMessage(error, '房间号保存失败'))
    return false
  } finally {
    savingRoom.value = false
  }
}

async function ensureKookRoom() {
  if (orderInfo.value?.kook_room_number) return true
  if (roomInput.value.trim()) return saveKookRoom()
  toast('请先填写 KOOK 房间号')
  return false
}

async function handleStartTimer() {
  if (!(await ensureKookRoom())) return
  const ok = await confirm('老板已完成付款，确定现在开打并开始计时吗？', '确认开打')
  if (!ok) return
  starting.value = true
  try {
    await startTimer(orderNo.value, player.value.id)
    success('已开打，计时开始')
    await fetchOrder()
  } catch (error) {
    toast(getErrorMessage(error, '开打失败'))
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
  if (!(await ensureKookRoom())) return
  if (orderInfo.value?.pending_renewal_order_no) {
    toast('老板还有一笔续单待支付，暂不能完成服务')
    return
  }
  const ok = await confirm(`确定要标记订单完成吗？当前累计服务时长为${totalBookedHoursText.value}。`)
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
    goMain('profile')
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
.renewal-card { background: linear-gradient(180deg, #fffdf7, #fff); border-color: rgba(216,161,68,.18); }
.renewal-badge { padding: 6rpx 13rpx; border-radius: 999rpx; color: #9a6a16; font-size: 22rpx; font-weight: 900; background: #fff3d4; }
.renewal-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-top: 10rpx; }
.renewal-grid view { padding: 18rpx 8rpx; border-radius: 18rpx; text-align: center; background: #f7faf4; }
.renewal-grid text { display: block; }
.renewal-grid text:first-child { color: #879083; font-size: 20rpx; }
.renewal-grid text:last-child { margin-top: 5rpx; font-size: 25rpx; font-weight: 900; }
.renewal-pending { margin-top: 16rpx; padding: 18rpx; border-radius: 18rpx; background: #fff5df; }
.renewal-pending text { display: block; }
.renewal-pending text:first-child { color: #8d651c; font-size: 24rpx; font-weight: 900; }
.renewal-pending text:last-child { margin-top: 6rpx; color: #8c7c5f; font-size: 21rpx; line-height: 1.5; }
.renewal-list { margin-top: 16rpx; }
.renewal-row { min-height: 58rpx; display: flex; align-items: center; justify-content: space-between; gap: 16rpx; border-bottom: 1rpx solid rgba(39,61,42,.07); font-size: 22rpx; }
.renewal-row text:first-child { color: #4f5d50; }
.renewal-row text:last-child { color: #1f7c4b; font-weight: 900; text-align: right; }
.kook-card { background: linear-gradient(180deg, #fff, #f8fbf4); }
.room-status { color: #1f7c4b; font-size: 23rpx; font-weight: 900; }
.room-status--warn { color: #a87520; }
.kook-desc { margin-top: 8rpx; color: #687665; font-size: 24rpx; line-height: 1.5; }
.kook-input-row { display: flex; align-items: center; gap: 14rpx; margin-top: 20rpx; }
.kook-input { flex: 1; height: 78rpx; padding: 0 20rpx; border-radius: 18rpx; color: #172116; font-size: 26rpx; background: #fff; border: 1px solid rgba(37,49,35,.10); box-sizing: border-box; }
.save-room-btn { width: 142rpx; height: 78rpx; display: flex; align-items: center; justify-content: center; padding: 0; margin: 0; border-radius: 18rpx; color: #fff; font-size: 25rpx; font-weight: 900; background: linear-gradient(135deg, #65c980, #1f7c4b); }
.save-room-btn::after { border: none; }
.save-room-btn[disabled] { opacity: .6; }
.kook-tip { margin-top: 14rpx; color: #9a8b6b; font-size: 22rpx; }
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
