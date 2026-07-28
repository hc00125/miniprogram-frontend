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
        <button class="tiny-link" :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">{{ refreshing ? '刷新中' : '刷新' }}</button>
      </view>
      <view class="club-card__bd">
        <view v-if="orderInfo.boss_name" class="info-row"><text>老板</text><text>{{ orderInfo.boss_name }}</text></view>
        <view class="info-row"><text>套餐</text><text>{{ orderInfo.package_name }}</text></view>
        <view v-if="orderInfo.addon_name" class="info-row"><text>附加项</text><text>{{ orderInfo.addon_name }}</text></view>
        <view v-if="orderInfo.game_id" class="info-row"><text>游戏ID/队伍码</text><text class="copyable" @tap="copyText(orderInfo.game_id)">{{ orderInfo.game_id }}</text></view>
        <view v-if="orderInfo.kook_room_number" class="info-row"><text>KOOK房间号</text><text class="copyable" @tap="copyText(orderInfo.kook_room_number)">{{ orderInfo.kook_room_number }}</text></view>
        <view class="info-row"><text>主订单金额</text><text class="amount">¥{{ orderInfo.total_amount || orderInfo.total_price_per_hour }}</text></view>
        <view class="info-row"><text>累计服务时长</text><text class="duration">{{ totalBookedHoursText }}</text></view>
        <view v-if="orderInfo.status === '待接单'" class="info-row"><text>等待时间</text><text>{{ waitTime }}</text></view>
        <view v-if="orderInfo.status === '待支付'" class="info-row"><text>当前阶段</text><text>{{ serverConfirming ? '微信支付结果核验中' : '等待老板付款' }}</text></view>
        <view v-if="orderInfo.status === '待开打'" class="info-row"><text>当前阶段</text><text class="duration">老板已付款，可开打</text></view>
        <view v-if="orderInfo.status === '进行中'" class="info-row"><text>已进行</text><text class="duration">{{ duration }}</text></view>
        <view v-if="orderInfo.duration_minutes" class="info-row"><text>实际服务</text><text>{{ orderInfo.duration_minutes }} 分钟</text></view>
      </view>
    </view>

    <view v-if="orderInfo?.status === '待支付'" class="club-card payment-wait-card" :class="{ 'payment-wait-card--confirming': serverConfirming }">
      <view class="club-card__hd">
        <view>
          <text class="club-card__title">{{ serverConfirming ? '正在核验老板支付结果' : '等待老板付款' }}</text>
          <text class="payment-wait-sub">{{ serverConfirming ? '支付入口已关闭，阵容暂时继续保留' : '老板有10分钟完成支付，期间请保持在线' }}</text>
        </view>
        <text class="payment-wait-chip">{{ paymentCountdown }}</text>
      </view>
      <view v-if="serverConfirming" class="payment-wait-message">
        <text>系统正在向微信确认是否已经扣款。</text>
        <text>核验结束前无需进入老板房间，也不会因为等待产生迟到记录。</text>
      </view>
      <view v-else class="payment-wait-message">
        <text>当前阵容已经为老板保留。</text>
        <text>付款成功后页面会自动变为“待开打”，届时才开始计算进入房间的时间。</text>
      </view>
    </view>

    <view v-if="timeoutCancelled" class="club-card payment-release-card">
      <view class="club-card__hd">
        <text class="club-card__title">订单已由系统释放</text>
        <text class="payment-release-chip">不计责任</text>
      </view>
      <view class="payment-release-message">
        <text>老板未在规定时间内完成付款，订单已经自动取消。</text>
        <text>本次不会计入你的取消、迟到或处罚记录，可以返回大厅继续接单。</text>
      </view>
    </view>

    <view v-if="orderInfo && myOrderPlayer && roomEntryVisible" class="club-card room-entry-card" :class="`room-entry-${roomJoinStatus}`">
      <view class="club-card__hd">
        <view>
          <text class="club-card__title">进入老板房间</text>
          <text class="room-entry-sub">老板付款后10分钟内进入房间并主动确认</text>
        </view>
        <text class="room-entry-chip">{{ roomJoinStatusText }}</text>
      </view>
      <view v-if="roomJoinStatus === 'pending'" class="room-entry-countdown">
        <text>剩余时间</text>
        <text>{{ roomJoinCountdown }}</text>
      </view>
      <view v-else-if="roomJoinStatus === 'overdue'" class="room-entry-warning">
        <text>已经超过10分钟</text>
        <text>请尽快进入并确认。本次只生成待核实记录，不会自动扣款或处罚。</text>
      </view>
      <view v-else-if="roomJoinStatus === 'late_confirmed'" class="room-entry-warning">
        <text>已在超时后确认</text>
        <text>系统已保留记录，后续由管理员结合实际情况核实。</text>
      </view>
      <view v-else class="room-entry-success">
        <text>已完成进入确认</text>
        <text v-if="myOrderPlayer.room_join_confirmed_at">确认时间：{{ formatRoomTime(myOrderPlayer.room_join_confirmed_at) }}</text>
      </view>
      <button v-if="canConfirmRoomEntry" class="room-entry-btn" :disabled="confirmingRoom" @tap="handleConfirmRoomEntry">
        {{ confirmingRoom ? '确认中...' : '我已进入老板房间' }}
      </button>
      <text class="room-entry-tip">请仅在实际进入游戏或KOOK房间后点击，老板端会同步看到状态。</text>
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
            <text>{{ playerItem.type_name }} · {{ playerItem.room_join_status_text || playerItem.status || '已接单' }}</text>
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
      <button v-if="orderInfo?.status === '待支付'" class="club-btn club-btn--ghost" @tap="toast(serverConfirming ? '系统正在核验微信支付结果' : '等待老板在倒计时内完成付款')">{{ serverConfirming ? '支付核验中' : '等待付款' }}</button>
      <button v-if="timeoutCancelled" class="club-btn" @tap="backToRoute('/pages/player/grab/index')">继续接单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  completeOrder,
  confirmPlayerRoomEntry,
  getPlayerOrder,
  pausePlayerOrder,
  resumePlayerOrder,
  setPlayerOrderKookRoom,
  startTimer
} from '@/api/player'
import { formatDuration } from '@/utils/format'
import { getStorage } from '@/utils/storage'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { goMain, replace, backToRoute } from '@/utils/nav'
import { isApprovedPlayer } from '@/utils/client'

const orderNo = ref('')
const orderInfo = ref<any>(null)
const player = ref<any>(null)
const loading = ref(true)
const refreshing = ref(false)
const starting = ref(false)
const completing = ref(false)
const confirmingRoom = ref(false)
const savingRoom = ref(false)
const roomInput = ref('')
const roomFocused = ref(false)
const duration = ref('00:00:00')
const waitTime = ref('')
const now = ref(Date.now())
let refreshTimer: ReturnType<typeof setInterval> | null = null
let durationTimer: ReturnType<typeof setInterval> | null = null
let prevPlayerCount = 0
let previousStatus = ''

const canEditKookRoom = computed(() => Boolean(orderInfo.value && ['待开打', '进行中'].includes(orderInfo.value.status)))
const renewalCount = computed(() => Number(orderInfo.value?.renewal_count || 0))
const paidRenewals = computed(() => (orderInfo.value?.renewals || []).filter((item: any) => item.paid))
const totalBookedHoursText = computed(() => formatHours(orderInfo.value?.total_booked_hours ?? orderInfo.value?.booked_hours ?? 0))
const myOrderPlayer = computed(() => (orderInfo.value?.players || []).find((item: any) => Number(item.id) === Number(player.value?.id)) || null)
const roomEntryVisible = computed(() => Boolean(['待开打', '进行中', '已完成'].includes(orderInfo.value?.status)))
const paymentPhase = computed(() => String(orderInfo.value?.payment_phase || 'inactive'))
const serverConfirming = computed(() => orderInfo.value?.status === '待支付' && paymentPhase.value === 'confirming')
const timeoutCancelled = computed(() => Boolean(
  orderInfo.value?.status === '已取消'
  && /10分钟|自动取消|未完成支付/.test(String(orderInfo.value?.cancel_reason || ''))
))
const paymentCountdown = computed(() => {
  const deadline = serverConfirming.value
    ? orderInfo.value?.payment_confirmation_deadline_at
    : orderInfo.value?.payment_deadline_at
  if (!deadline) return '--:--'
  return formatCountdown(Math.max(0, Math.floor((new Date(deadline).getTime() - now.value) / 1000)))
})
const roomJoinStatus = computed(() => String(myOrderPlayer.value?.room_join_status || 'pending'))
const roomJoinStatusText = computed(() => myOrderPlayer.value?.room_join_status_text || ({
  pending: '等待进入',
  confirmed: '按时进入',
  late_confirmed: '超时后进入',
  overdue: '已超时待核实',
  waived: '管理员已免除'
} as Record<string, string>)[roomJoinStatus.value] || '等待进入')
const roomJoinCountdown = computed(() => {
  const deadline = myOrderPlayer.value?.room_join_deadline
  if (!deadline) return '--:--'
  const seconds = Math.max(0, Math.floor((new Date(deadline).getTime() - now.value) / 1000))
  if (!seconds) return '已超时'
  return formatCountdown(seconds)
})
const canConfirmRoomEntry = computed(() => Boolean(
  roomEntryVisible.value
  && myOrderPlayer.value?.can_confirm_room_join
  && !['已完成', '已取消'].includes(orderInfo.value?.status)
  && ['pending', 'overdue'].includes(roomJoinStatus.value)
))

function formatHours(value: number) {
  const hours = Number(value || 0)
  return Number.isInteger(hours) ? `${hours}小时` : `${hours.toFixed(1)}小时`
}

function formatCountdown(value: number) {
  const seconds = Math.max(0, Math.floor(Number(value || 0)))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
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
  now.value = Date.now()
  if (!orderInfo.value) return
  if (orderInfo.value.timer_started_at) {
    const start = new Date(orderInfo.value.timer_started_at).getTime()
    const end = orderInfo.value.end_time
      ? new Date(orderInfo.value.end_time).getTime()
      : orderInfo.value.is_paused && orderInfo.value.last_paused_at
        ? new Date(orderInfo.value.last_paused_at).getTime()
        : now.value
    duration.value = formatDuration(Math.max(0, Math.floor((end - start) / 1000) - (orderInfo.value.paused_duration || 0)))
  } else if (orderInfo.value.status === '待开打') {
    duration.value = '等待开打'
  }

  if (orderInfo.value.status === '待接单' && orderInfo.value.created_at) {
    const diffSec = Math.floor((now.value - new Date(orderInfo.value.created_at).getTime()) / 1000)
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
    if (previousStatus === '待支付' && res.status === '待开打') success('老板已付款，可以准备进入房间')
    if (previousStatus === '待支付' && res.status === '已取消' && /10分钟|自动取消|未完成支付/.test(String(res.cancel_reason || ''))) {
      toast('老板未完成付款，订单已由系统释放')
    }
    previousStatus = res.status
    orderInfo.value = res
    if (!roomFocused.value) roomInput.value = res.kook_room_number || ''
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

function formatRoomTime(input: string) {
  if (!input) return '-'
  const date = new Date(input)
  return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function handleConfirmRoomEntry() {
  if (!canConfirmRoomEntry.value || confirmingRoom.value) return
  const message = roomJoinStatus.value === 'overdue'
    ? '当前已超过10分钟。请确认你已经实际进入老板房间，系统会记录为超时后进入并交由管理员核实。'
    : '请确认你已经实际进入老板的游戏或KOOK房间。确认后老板端会同步显示。'
  if (!(await confirm(message, '确认进入房间'))) return
  confirmingRoom.value = true
  try {
    const result = await confirmPlayerRoomEntry(orderNo.value)
    success(result.message)
    await fetchOrder()
  } catch (error) {
    toast(getErrorMessage(error, '进入房间确认失败'))
  } finally {
    confirmingRoom.value = false
  }
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
  await fetchOrder()
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
.payment-wait-card { border-color: rgba(47,155,99,.18); background: linear-gradient(180deg,#f2faf4,#fff); }
.payment-wait-card--confirming { border-color: rgba(216,161,68,.28); background: linear-gradient(180deg,#fff8e7,#fff); }
.payment-wait-card .club-card__hd > view { flex: 1; min-width: 0; }
.payment-wait-sub { display: block; margin-top: 6rpx; color: #788375; font-size: 21rpx; }
.payment-wait-chip { flex-shrink: 0; min-width: 112rpx; padding: 9rpx 14rpx; border-radius: 999rpx; color: #1f7c4b; font-size: 28rpx; font-family: monospace; font-weight: 900; text-align: center; background: #e6f6ea; }
.payment-wait-card--confirming .payment-wait-chip { color: #945f12; background: #fff0c8; }
.payment-wait-message { padding: 20rpx; border-radius: 20rpx; background: rgba(255,255,255,.82); }
.payment-wait-message text { display: block; color: #5e6b5c; font-size: 23rpx; line-height: 1.55; }
.payment-wait-message text:first-child { color: #243624; font-weight: 900; }
.payment-wait-message text + text { margin-top: 8rpx; }
.payment-release-card { border-color: rgba(216,161,68,.24); background: linear-gradient(180deg,#fff8e8,#fff); }
.payment-release-chip { padding: 7rpx 13rpx; border-radius: 999rpx; color: #94600f; font-size: 21rpx; font-weight: 900; background: #ffedbf; }
.payment-release-message { padding: 20rpx; border-radius: 20rpx; background: rgba(255,255,255,.86); }
.payment-release-message text { display: block; color: #78633d; font-size: 23rpx; line-height: 1.55; }
.payment-release-message text:first-child { color: #6f4c10; font-weight: 900; }
.payment-release-message text + text { margin-top: 8rpx; }
.room-entry-card { border-color: rgba(47,155,99,.18); background: linear-gradient(180deg,#f3faf5,#fff); }
.room-entry-card .club-card__hd > view { flex: 1; min-width: 0; }
.room-entry-sub { display: block; margin-top: 6rpx; color: #879083; font-size: 21rpx; }
.room-entry-chip { flex-shrink: 0; padding: 7rpx 13rpx; border-radius: 999rpx; color: #1f7c4b; font-size: 20rpx; font-weight: 900; background: #e6f6ea; }
.room-entry-overdue, .room-entry-late_confirmed { border-color: rgba(216,161,68,.28); background: linear-gradient(180deg,#fff9e9,#fff); }
.room-entry-overdue .room-entry-chip, .room-entry-late_confirmed .room-entry-chip { color: #945f12; background: #fff0c8; }
.room-entry-countdown { display: flex; align-items: baseline; justify-content: space-between; gap: 16rpx; padding: 22rpx; border-radius: 20rpx; background: rgba(255,255,255,.82); }
.room-entry-countdown text:first-child { color: #687665; font-size: 23rpx; }
.room-entry-countdown text:last-child { color: #1f7c4b; font-size: 46rpx; font-weight: 900; font-family: monospace; }
.room-entry-warning, .room-entry-success { padding: 18rpx; border-radius: 18rpx; }
.room-entry-warning { color: #7f5e25; background: #fff3d7; }
.room-entry-success { color: #276d43; background: #e9f7ed; }
.room-entry-warning text, .room-entry-success text { display: block; }
.room-entry-warning text:first-child, .room-entry-success text:first-child { font-size: 24rpx; font-weight: 900; }
.room-entry-warning text:last-child, .room-entry-success text:last-child { margin-top: 6rpx; font-size: 21rpx; line-height: 1.5; }
.room-entry-btn { width: 100%; height: 78rpx; margin-top: 18rpx; border-radius: 999rpx; color: #fff; font-size: 26rpx; font-weight: 900; background: linear-gradient(135deg,#5fc68a,#1f7c4b); }
.room-entry-btn::after { border: none; }
.room-entry-btn[disabled] { opacity: .58; }
.room-entry-tip { display: block; margin-top: 12rpx; color: #879083; font-size: 20rpx; line-height: 1.45; text-align: center; }
.renewal-card { background: linear-gradient(180deg,#fffdf7,#fff); border-color: rgba(216,161,68,.18); }
.renewal-badge { padding: 6rpx 13rpx; border-radius: 999rpx; color: #9a6a16; font-size: 22rpx; font-weight: 900; background: #fff3d4; }
.renewal-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12rpx; margin-top: 10rpx; }
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
.kook-card { background: linear-gradient(180deg,#fff,#f8fbf4); }
.room-status { color: #1f7c4b; font-size: 23rpx; font-weight: 900; }
.room-status--warn { color: #a87520; }
.kook-desc { margin-top: 8rpx; color: #687665; font-size: 24rpx; line-height: 1.5; }
.kook-input-row { display: flex; align-items: center; gap: 14rpx; margin-top: 20rpx; }
.kook-input { flex: 1; height: 78rpx; padding: 0 20rpx; border-radius: 18rpx; color: #172116; font-size: 26rpx; background: #fff; border: 1px solid rgba(37,49,35,.10); box-sizing: border-box; }
.save-room-btn { width: 142rpx; height: 78rpx; display: flex; align-items: center; justify-content: center; padding: 0; margin: 0; border-radius: 18rpx; color: #fff; font-size: 25rpx; font-weight: 900; background: linear-gradient(135deg,#65c980,#1f7c4b); }
.save-room-btn::after { border: none; }
.save-room-btn[disabled] { opacity: .6; }
.kook-tip { margin-top: 14rpx; color: #9a8b6b; font-size: 22rpx; }
.note-card { padding: 26rpx 28rpx; display: flex; flex-direction: column; gap: 10rpx; }
.note-card text:first-child { color: #a87520; font-size: 24rpx; font-weight: 800; }
.note-card text:last-child { color: #5d4d25; font-size: 27rpx; }
.player-stack { display: flex; flex-direction: column; gap: 14rpx; }
.player-row { display: flex; align-items: center; gap: 16rpx; padding: 20rpx; border-radius: 24rpx; background: #fff; border: 1px solid rgba(37,49,35,.08); }
.avatar { width: 62rpx; height: 62rpx; border-radius: 50%; background: linear-gradient(135deg,#65c980,#1f7c4b); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; }
.player-main { flex: 1; display: flex; flex-direction: column; gap: 4rpx; font-size: 28rpx; }
.player-main text:last-child { color: #687665; font-size: 23rpx; }
.me-tag { padding: 6rpx 14rpx; border-radius: 999rpx; background: #eef9ef; color: #1f7c4b; font-size: 22rpx; font-weight: 800; }
.footer-actions { position: fixed; left: 24rpx; right: 24rpx; bottom: calc(28rpx + env(safe-area-inset-bottom)); display: grid; grid-template-columns: repeat(2,1fr); gap: 16rpx; }
</style>
