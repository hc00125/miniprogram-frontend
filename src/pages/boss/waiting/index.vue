<template>
  <view class="waiting-page">
    <view class="status-bar"><view class="status-pulse" :class="{ danger: replacementActive || matchingDecisionRequired }"></view><view class="status-copy"><text>{{ statusTitle }}</text><text>{{ statusSubtitle }}</text></view><text class="status-tag">{{ orderInfo?.status || '待接单' }}</text></view>

    <view class="hero-card">
      <text class="hero-eyebrow">ORDER MATCHING</text>
      <text class="hero-title">{{ replacementActive ? replacementHeroTitle : (isTargetedOrder ? '正在等待陪玩师确认' : '正在为你组建队伍') }}</text>
      <text class="hero-sub">{{ replacementActive ? replacementHeroSub : (isTargetedOrder ? '支付已完成，系统已向指定陪玩师发出服务邀请' : '指定邀请与公开抢单同时进行，人数到齐后进入钻石支付') }}</text>
      <view class="hero-meta"><view><text>订单号</text><text>{{ orderNo || '加载中' }}</text></view><view><text>已等待</text><text>{{ waitTime || '00:00' }}</text></view></view>
    </view>

    <view v-if="orderInfo?.matching?.active" class="card visibility-card" :class="`visibility-${orderInfo.matching.visibility_status || 'unknown'}`">
      <view class="card-head"><view><text class="card-title">抢单大厅发布状态</text><text class="card-sub">{{ orderInfo.matching.visibility_message || '正在核对当前在线陪玩可见性' }}</text></view><text class="visibility-chip">{{ Number(orderInfo.matching.eligible_online_player_count || 0) }}人可见</text></view>
      <view class="visibility-grid"><view><text>公开空缺</text><text>{{ Number(orderInfo.matching.public_slots || 0) }}位</text></view><view><text>符合条件在线</text><text>{{ Number(orderInfo.matching.eligible_online_player_count || 0) }}/{{ Number(orderInfo.matching.online_player_count || 0) }}人</text></view><view><text>指定预留</text><text>{{ Number(orderInfo.matching.pending_designation_slots || 0) }}位</text></view></view>
      <view class="visibility-rules"><text>等级要求：{{ matchingRequiredTypeText }}</text><text>护航资格：{{ orderInfo.matching.requires_escort_qualification ? '需要' : '不需要' }}</text></view>
      <text v-if="orderInfo.matching.visibility_status === 'no_eligible_players'" class="visibility-warning">订单确实已发布，但当前没有符合等级、资格和接单状态的在线陪玩，因此其他账号可能看不到。</text>
    </view>

    <OrderReplacementCard :order-no="orderNo" :replacement="orderInfo?.replacement" @updated="checkOrder" />

    <view v-if="matchingReminderDue" class="card matching-card" :class="{ 'matching-card--overdue': matchingDecisionRequired }">
      <view class="card-head"><view><text class="card-title">{{ matchingDecisionRequired ? '本轮匹配已超过30分钟' : '当前匹配时间较长' }}</text><text class="card-sub">{{ matchingDecisionRequired ? '订单仍保留在公开大厅，请决定继续等待或取消订单' : '系统仍在匹配，已接陪玩等待满15分钟后可无责退出' }}</text></view><text class="matching-chip">{{ readyCount }}/{{ requiredCount }}人</text></view>
      <view class="matching-grid"><view><text>当前已接</text><text>{{ readyCount }}人</text></view><view><text>仍缺名额</text><text>{{ Math.max(0, requiredCount - readyCount) }}人</text></view><view><text>本轮剩余</text><text>{{ matchingCountdownText }}</text></view></view>
      <view v-if="orderInfo?.matching?.players_can_exit_without_penalty" class="matching-notice">已接陪玩等待组队超过15分钟后，可以无责退出；不会暂停接单、罚款或消耗免罚机会。</view>
      <view v-if="matchingDecisionRequired" class="matching-actions"><button :disabled="matchingWorking" @tap="handleContinueMatching">{{ matchingWorking ? '处理中...' : '继续等待30分钟' }}</button><button class="danger" :disabled="matchingWorking" @tap="handleCancel">取消订单</button></view>
    </view>

    <view v-if="designations.length" class="card designation-card">
      <view class="card-head"><view><text class="card-title">{{ isTargetedOrder ? '指定服务邀请' : '指定陪玩邀请' }}</text><text class="card-sub">{{ isTargetedOrder ? '待接受邀请10分钟后将自动取消并进入退款流程' : '待接受邀请10分钟后自动转为公开抢单' }}</text></view><button class="mini-btn" :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">{{ refreshing ? '刷新中' : '刷新' }}</button></view>
      <view class="designation-list"><view v-for="item in designations" :key="item.id" class="designation-item"><image v-if="item.avatar_url" class="designation-avatar" :src="item.avatar_url" mode="aspectFill" /><view v-else class="designation-avatar designation-avatar--empty">{{ item.player_name?.[0] || '陪' }}</view><view class="designation-main"><text>{{ item.player_name }}</text><text>{{ item.player_type }} · {{ item.is_online ? '在线' : '离线' }}</text><text v-if="item.status === 'pending'">{{ countdownText(item.expires_at) }}</text></view><view class="designation-side"><text class="designation-status" :class="`status-${item.status}`">{{ item.status_text }}</text><button v-if="item.can_release && !isTargetedOrder" :disabled="item.releasing" @tap="releaseDesignation(item)">{{ item.releasing ? '处理中' : '取消指定' }}</button></view></view></view>
    </view>

    <view v-if="orderInfo" class="card progress-card">
      <view class="card-head"><view><text class="card-title">{{ isTargetedOrder ? '服务确认进度' : '接单进度' }}</text><text class="card-sub">{{ isTargetedOrder ? `${readyCount}/1 位指定陪玩已确认服务` : `${readyCount}/${requiredCount} 位陪玩已接单；人数到齐并付款后，陪玩需在10分钟内进入房间` }}</text></view><text class="open-slot">{{ isTargetedOrder ? (readyCount ? '已确认' : '待确认') : `剩余${Math.max(0, requiredCount - readyCount)}位` }}</text></view>
      <view class="progress-track"><view class="progress-fill" :style="{ width: progressPercent }"></view></view>
      <scroll-view scroll-x class="player-track" show-scrollbar="false"><view v-for="player in players" :key="player.id" class="player-item ready"><image v-if="player.avatar_url" class="player-avatar" :src="player.avatar_url" mode="aspectFill" /><view v-else class="player-avatar player-avatar--empty">{{ player.name?.[0] || '陪' }}</view><text class="player-name">{{ player.name }}</text><text class="player-type">{{ player.is_designated ? '指定已接受' : (player.type_name || '已接单') }}</text><text class="player-entry" :class="`entry-${player.room_join_status || 'pending'}`">{{ playerRoomText(player) }}</text></view><view v-for="item in waitingSlots" :key="item" class="player-item waiting"><view class="player-avatar waiting-avatar"><text></text><text></text><text></text></view><text class="player-name">{{ isTargetedOrder ? '指定陪玩师' : '匹配中' }}</text><text class="player-type">{{ isTargetedOrder ? '等待确认服务' : '等待接单' }}</text></view></scroll-view>
      <view v-if="overduePlayers.length" class="entry-alert"><text>有 {{ overduePlayers.length }} 位陪玩进入房间超时</text><text>系统保留记录，后续由管理员结合实际情况处理。</text></view>
    </view>

    <view v-if="orderInfo" class="card detail-card">
      <view class="card-head"><view><text class="card-title">订单信息</text><text class="card-sub">{{ isTargetedOrder ? '付款后由指定陪玩师确认，再进入开打' : '派单、接单、钻石支付、开打依次进行' }}</text></view><text class="order-status">{{ orderInfo.status }}</text></view>
      <view class="info-row"><text>套餐</text><text>{{ orderInfo.package_name_raw || orderInfo.package_name || '待确认' }}</text></view>
      <view v-if="orderInfo.spec_display_name || orderInfo.spec_name" class="info-row"><text>规格</text><text>{{ orderInfo.spec_display_name || orderInfo.spec_name }}</text></view>
      <view class="info-row"><text>{{ isTargetedOrder ? '指定对象' : '需要陪玩' }}</text><text>{{ isTargetedOrder ? (orderInfo.target_player_name_snapshot || activeDesignationNames || '等待确认') : `${requiredCount}人` }}</text></view>
      <view v-if="activeDesignationNames" class="info-row"><text>指定陪玩</text><text>{{ activeDesignationNames }}</text></view>
      <view v-if="orderInfo.game_id_raw || orderInfo.game_id" class="info-row"><text>游戏ID/队伍码</text><text>{{ orderInfo.game_id_raw || orderInfo.game_id }}</text></view>
      <view class="info-row"><text>预订时长</text><text>{{ bookedHoursText }}</text></view><view class="info-row"><text>下单时间</text><text>{{ createdTimeText }}</text></view><view class="amount-row"><text>订单钻石</text><text>{{ amountText }}</text></view>
    </view>

    <view class="footer-actions"><button class="ghost-btn" @tap="goMain('home')">返回首页</button><button class="primary-btn" :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">{{ refreshing ? '刷新中' : '刷新状态' }}</button><button v-if="canCancelUnpaid" class="danger-btn" @tap="handleCancel">取消订单</button><button v-if="orderInfo?.status === '待支付'" class="primary-btn" @tap="goPayment">去付款</button></view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import OrderReplacementCard from '@/components/OrderReplacementCard.vue'
import { cancelOrder, getOrder, getOrderDesignations, releaseOrderDesignation, type OrderDesignationItem } from '@/api/boss'
import { continueOrderMatching } from '@/api/orderMatching'
import { diamondsFrom, formatDiamonds } from '@/utils/diamonds'
import { formatDateTime } from '@/utils/format'
import { replace, relaunch } from '@/utils/nav'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'

const orderNo = ref('')
const orderInfo = ref<any>(null)
const designations = ref<Array<OrderDesignationItem & { releasing?: boolean }>>([])
const waitTime = ref('')
const now = ref(Date.now())
const refreshing = ref(false)
const matchingWorking = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
let waitTimer: ReturnType<typeof setInterval> | null = null
let prevPlayerCount = 0

const players = computed(() => orderInfo.value?.players || [])
const overduePlayers = computed(() => players.value.filter((item: any) => ['overdue', 'late_confirmed'].includes(item.room_join_status)))
const readyCount = computed(() => players.value.length)
const requiredCount = computed(() => orderInfo.value?.required_players || 0)
const isTargetedOrder = computed(() => orderInfo.value?.fulfillment_mode === 'targeted')
const replacementActive = computed(() => Boolean(orderInfo.value?.replacement?.active))
const replacementPhase = computed(() => orderInfo.value?.replacement?.phase || '')
const replacementHeroTitle = computed(() => replacementPhase.value === 'matching' ? '指定名额需要重新安排' : (orderInfo.value?.replacement?.mode === 'targeted' ? '指定陪玩已退出' : '服务人员退出，正在补位'))
const replacementHeroSub = computed(() => replacementPhase.value === 'matching' ? '订单尚未付款，可重新指定、转为公开名额或取消整个订单' : '原订单号和支付记录保持不变，请在下方选择处理方式')
const matchingReminderDue = computed(() => Boolean(orderInfo.value?.matching?.active && orderInfo.value?.matching?.reminder_due))
const matchingDecisionRequired = computed(() => Boolean(orderInfo.value?.matching?.active && orderInfo.value?.matching?.decision_required))
const matchingCountdownText = computed(() => { const seconds = Math.max(0, Number(orderInfo.value?.matching?.remaining_seconds || 0)); if (!seconds) return '需确认'; return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` })
const matchingRequiredTypeText = computed(() => { const types = Array.isArray(orderInfo.value?.matching?.required_player_types) ? orderInfo.value.matching.required_player_types : []; if (!types.length) return '不限等级'; return types.map((item: any) => `${item.name}${Number(item.count || 0) > 1 ? `×${item.count}` : ''}`).join('、') })
// 待接单/待支付订单均可取消；已付款的指定/待接单订单取消时后端会退款到钱包。
const canCancelUnpaid = computed(() => Boolean(orderInfo.value && ['待接单', '待支付'].includes(orderInfo.value.status)))
const waitingSlots = computed(() => Array.from({ length: Math.max(0, requiredCount.value - readyCount.value) }, (_, index) => index))
const progressPercent = computed(() => requiredCount.value ? `${Math.min(100, readyCount.value / requiredCount.value * 100)}%` : '0%')
const bookedHoursText = computed(() => `${Number(orderInfo.value?.booked_hours || 1)}小时`)
const createdTimeText = computed(() => orderInfo.value?.created_at ? formatDateTime(orderInfo.value.created_at) : '待确认')
const amountText = computed(() => {
  if (!orderInfo.value) return '待确认'
  try {
    const diamonds = diamondsFrom(orderInfo.value.total_amount_diamonds ?? orderInfo.value.total_price_per_hour_diamonds, orderInfo.value.total_amount || orderInfo.value.total_price_per_hour || 0)
    return `💎${formatDiamonds(diamonds)}`
  } catch { return '待确认' }
})
const activeDesignationNames = computed(() => designations.value.filter(item => ['pending', 'accepted'].includes(item.status)).map(item => item.player_name).join('、'))
const statusTitle = computed(() => replacementActive.value ? replacementHeroTitle.value : matchingDecisionRequired.value ? '匹配等待已超时' : designations.value.some(item => item.status === 'pending') ? '等待指定陪玩回应' : (isTargetedOrder.value ? '指定服务正在确认' : '订单已派发'))
const statusSubtitle = computed(() => replacementActive.value ? replacementHeroSub.value : matchingDecisionRequired.value ? '请选择继续等待或取消订单' : designations.value.some(item => item.status === 'pending') ? (isTargetedOrder.value ? 'TA 接受后即可开始服务；拒绝或超时将自动退款' : '指定邀请接受后，剩余名额继续公开匹配') : (isTargetedOrder.value ? '等待指定陪玩师确认服务' : '陪玩接满后将自动进入付款页面'))

function countdownText(value: string) { const diff = Math.max(0, Math.floor((new Date(value).getTime() - now.value) / 1000)); if (!diff) return isTargetedOrder.value ? '邀请即将超时并进入退款流程' : '邀请即将超时并转公开'; return `${Math.floor(diff / 60)}分${diff % 60}秒后超时` }
function playerRoomText(player: any) { const status = player.room_join_status || 'pending'; if (status === 'confirmed') return '已进入房间'; if (status === 'late_confirmed') return '超时后已进入'; if (status === 'overdue') return '进入房间已超时'; if (status === 'waived') return '管理员已免除'; const deadline = player.room_join_deadline; if (!deadline) return orderInfo.value?.paid ? '等待进入房间' : '等待人数到齐并付款'; const seconds = Math.max(0, Math.floor((new Date(deadline).getTime() - now.value) / 1000)); return seconds ? `入房 ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : '进入房间已超时' }
function updateWaitTime() { now.value = Date.now(); if (!orderInfo.value?.created_at) { waitTime.value = ''; return }; const diff = Math.max(0, Math.floor((now.value - new Date(orderInfo.value.created_at).getTime()) / 1000)); waitTime.value = `${Math.floor(diff / 60)}:${String(diff % 60).padStart(2, '0')}`; if (orderInfo.value?.matching?.deadline_at) orderInfo.value.matching.remaining_seconds = Math.max(0, Math.floor((new Date(orderInfo.value.matching.deadline_at).getTime() - now.value) / 1000)) }
async function checkOrder() { if (!orderNo.value) return false; try { const [res, designationResult] = await Promise.all([getOrder(orderNo.value), getOrderDesignations(orderNo.value)]); const count = res.players?.length || 0; if (count > prevPlayerCount && prevPlayerCount > 0) toast('有陪玩接单了'); prevPlayerCount = count; orderInfo.value = res; designations.value = (designationResult.results || []).map(item => ({ ...item, releasing: false })); updateWaitTime(); if (res.status === '待支付') { stopTimers(); replace('/pages/boss/payment/index', { orderNo: orderNo.value }) } else if ((res.status === '待开打' || res.status === '进行中') && !res.replacement?.active) { stopTimers(); replace('/pages/boss/in-progress/index', { orderNo: orderNo.value }) } else if (res.status === '进行中' && res.replacement?.active) { stopTimers(); replace('/pages/boss/in-progress/index', { orderNo: orderNo.value }) } else if (res.status === '已完成') { stopTimers(); replace('/pages/boss/payment/index', { orderNo: orderNo.value }) } else if (res.status === '已取消') { stopTimers(); toast(res.fulfillment_mode === 'targeted' ? '指定订单已取消，退款将按原支付方式处理' : '订单已取消'); goMain('home') } return true } catch (error) { toast(getErrorMessage(error, '订单刷新失败')); return false } }
async function handleManualRefresh() { if (refreshing.value) return; refreshing.value = true; try { if (await checkOrder()) success('刷新成功') } finally { refreshing.value = false } }
async function handleContinueMatching() { if (matchingWorking.value) return; matchingWorking.value = true; try { const result = await continueOrderMatching(orderNo.value); success(result.message); await checkOrder() } catch (error) { toast(getErrorMessage(error, '继续等待失败')) } finally { matchingWorking.value = false } }
async function releaseDesignation(item: OrderDesignationItem & { releasing?: boolean }) { if (!(await confirm(`取消指定 ${item.player_name} 吗？该名额会立即转为公开抢单。`, '取消指定'))) return; item.releasing = true; try { await releaseOrderDesignation(orderNo.value, item.id); success('已取消指定，名额转为公开抢单'); await checkOrder() } catch (error) { toast(getErrorMessage(error, '取消指定失败')) } finally { item.releasing = false } }
function goPayment() { replace('/pages/boss/payment/index', { orderNo: orderNo.value }) }
async function handleCancel() { const joinedText = readyCount.value ? `当前已有${readyCount.value}位陪玩接单，取消后将全部释放。` : ''; const refundText = orderInfo.value?.paid ? '该订单已付款，取消后款项将原路退回到钱包。' : ''; if (!(await confirm(`确定要取消这个订单吗？${joinedText}${refundText}`, '取消订单'))) return; try { await cancelOrder(orderNo.value); success('订单已取消'); stopTimers(); goMain('home') } catch (error) { toast(getErrorMessage(error, '取消失败')) } }
function stopTimers() { if (timer) clearInterval(timer); if (waitTimer) clearInterval(waitTimer); timer = null; waitTimer = null }
onLoad(query => { orderNo.value = String(query?.orderNo || '') })
onMounted(() => { checkOrder(); timer = setInterval(checkOrder, 5000); waitTimer = setInterval(updateWaitTime, 1000) })
onUnmounted(stopTimers)
const goMain = (tab = 'home') => relaunch('/pages/boss/home/index', { tab })
</script>

<style lang="scss" scoped>
.waiting-page { min-height:100vh;padding:20rpx 24rpx 220rpx;box-sizing:border-box;color:#172116;background:radial-gradient(ellipse at 12% 0%,rgba(216,161,68,.10),transparent 36%),radial-gradient(ellipse at 88% 14%,rgba(47,155,99,.10),transparent 32%),#f7f3ea; }
.status-bar,.hero-card,.card { margin-top:22rpx;border-radius:28rpx;background:rgba(255,255,255,.96);border:1rpx solid rgba(39,61,42,.08);box-shadow:0 14rpx 36rpx rgba(39,61,42,.06); }.status-bar { margin-top:0;display:flex;align-items:center;gap:14rpx;padding:18rpx 22rpx; }.status-pulse { width:16rpx;height:16rpx;border-radius:50%;background:#2f9b63;box-shadow:0 0 0 8rpx rgba(47,155,99,.12); }.status-pulse.danger { background:#c83d3d;box-shadow:0 0 0 8rpx rgba(200,61,61,.12); }.status-copy { flex:1; }.status-copy text,.hero-eyebrow,.hero-title,.hero-sub { display:block; }.status-copy text:first-child { font-size:25rpx;font-weight:900; }.status-copy text:last-child { margin-top:4rpx;color:#7d877a;font-size:20rpx; }.status-tag,.order-status { padding:7rpx 14rpx;border-radius:999rpx;color:#a87520;font-size:21rpx;font-weight:900;background:#fff5d9; }
.hero-card { padding:34rpx 28rpx;background:linear-gradient(135deg,#fffaf0,#eef8f1); }.hero-eyebrow { color:#a87520;font-size:21rpx;font-weight:900; }.hero-title { margin-top:12rpx;font-size:40rpx;font-weight:900; }.hero-sub { margin-top:9rpx;color:#687665;font-size:24rpx; }.hero-meta { display:grid;grid-template-columns:1fr 1fr;gap:14rpx;margin-top:26rpx; }.hero-meta view { padding:18rpx;border-radius:18rpx;background:rgba(255,255,255,.66); }.hero-meta text { display:block; }.hero-meta text:first-child { color:#879083;font-size:20rpx; }.hero-meta text:last-child { margin-top:6rpx;font-size:24rpx;font-weight:900;word-break:break-all; }
.card { padding:26rpx; }.designation-card { border-color:rgba(216,161,68,.22);background:linear-gradient(180deg,#fffaf0,#fff); }.card-head { display:flex;justify-content:space-between;align-items:flex-start;gap:20rpx;margin-bottom:20rpx; }.card-title,.card-sub { display:block; }.card-title { font-size:30rpx;font-weight:900; }.card-sub { margin-top:6rpx;color:#879083;font-size:21rpx;line-height:1.45; }.mini-btn { min-width:104rpx;height:58rpx;margin:0;padding:0 18rpx;border-radius:999rpx;color:#1f7c4b;font-size:22rpx;font-weight:900;background:#eef8f1; }.mini-btn::after,.designation-side button::after,.footer-actions button::after,.matching-actions button::after { border:none; }
.visibility-card { border-color:rgba(47,155,99,.20);background:linear-gradient(180deg,#f0faf3,#fff); }.visibility-no_eligible_players,.visibility-no_online_players { border-color:rgba(216,161,68,.26);background:linear-gradient(180deg,#fff8e8,#fff); }.visibility-chip { flex-shrink:0;padding:7rpx 13rpx;border-radius:999rpx;color:#1f7c4b;font-size:21rpx;font-weight:900;background:#e5f6e9; }.visibility-no_eligible_players .visibility-chip,.visibility-no_online_players .visibility-chip { color:#a87520;background:#fff0cc; }.visibility-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx; }.visibility-grid view { padding:16rpx 8rpx;border-radius:16rpx;text-align:center;background:rgba(255,255,255,.82); }.visibility-grid text { display:block; }.visibility-grid text:first-child { color:#879083;font-size:19rpx; }.visibility-grid text:last-child { margin-top:5rpx;font-size:23rpx;font-weight:900; }.visibility-rules { display:flex;justify-content:space-between;gap:14rpx;margin-top:14rpx;padding:15rpx;border-radius:16rpx;color:#5f6d5d;font-size:20rpx;background:#f7faf4; }.visibility-warning { display:block;margin-top:14rpx;padding:15rpx;border-radius:16rpx;color:#7a5a24;font-size:21rpx;line-height:1.5;background:#fff2d4; }
.matching-card { border-color:rgba(216,161,68,.26);background:linear-gradient(180deg,#fffaf0,#fff); }.matching-card--overdue { border-color:rgba(200,61,61,.22);background:linear-gradient(180deg,#fff3f3,#fff); }.matching-chip { padding:7rpx 13rpx;border-radius:999rpx;color:#a87520;font-size:21rpx;font-weight:900;background:#fff3d4; }.matching-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx; }.matching-grid view { padding:16rpx 8rpx;border-radius:16rpx;text-align:center;background:rgba(255,255,255,.8); }.matching-grid text { display:block; }.matching-grid text:first-child { color:#879083;font-size:19rpx; }.matching-grid text:last-child { margin-top:5rpx;font-size:23rpx;font-weight:900; }.matching-notice { margin-top:16rpx;padding:16rpx;border-radius:16rpx;color:#6e5b32;font-size:21rpx;line-height:1.5;background:#fff4d9; }.matching-actions { display:grid;grid-template-columns:1.4fr 1fr;gap:12rpx;margin-top:16rpx; }.matching-actions button { height:68rpx;margin:0;border-radius:18rpx;color:#1f7c4b;font-size:22rpx;font-weight:900;background:#eaf7ed; }.matching-actions .danger { color:#a13d35;background:#fff0ed; }
.designation-list { display:flex;flex-direction:column;gap:14rpx; }.designation-item { display:flex;align-items:center;gap:14rpx;padding:16rpx;border-radius:20rpx;background:rgba(255,255,255,.78); }.designation-avatar { width:72rpx;height:72rpx;flex-shrink:0;border-radius:22rpx;background:#2f9b63; }.designation-avatar--empty { display:flex;align-items:center;justify-content:center;color:#fff;font-size:28rpx;font-weight:900; }.designation-main { flex:1;min-width:0; }.designation-main text { display:block; }.designation-main text:first-child { font-size:25rpx;font-weight:900; }.designation-main text:nth-child(2) { margin-top:4rpx;color:#687665;font-size:20rpx; }.designation-main text:last-child { margin-top:5rpx;color:#a87520;font-size:19rpx; }.designation-side { display:flex;flex-direction:column;align-items:flex-end;gap:8rpx; }.designation-status { padding:6rpx 10rpx;border-radius:999rpx;font-size:19rpx;font-weight:900; }.status-pending { color:#a87520;background:#fff3d4; }.status-accepted { color:#1f7c4b;background:#e5f6e9; }.status-declined,.status-expired,.status-cancelled { color:#8a9286;background:#f0f2ef; }.designation-side button { height:50rpx;margin:0;padding:0 12rpx;border-radius:999rpx;color:#a13d35;font-size:19rpx;background:#fff0ed; }
.progress-track { height:12rpx;overflow:hidden;border-radius:999rpx;background:#edf1ea; }.progress-fill { height:100%;border-radius:inherit;background:linear-gradient(90deg,#5fc68a,#1f7c4b); }.open-slot { color:#1f7c4b;font-size:22rpx;font-weight:900; }.player-track { margin-top:22rpx;white-space:nowrap; }.player-item { width:168rpx;display:inline-flex;flex-direction:column;align-items:center;margin-right:14rpx;padding:16rpx 10rpx;border-radius:22rpx;background:#f7faf4;vertical-align:top;box-sizing:border-box; }.player-avatar { width:72rpx;height:72rpx;border-radius:50%; }.player-avatar--empty { display:flex;align-items:center;justify-content:center;color:#fff;font-size:28rpx;font-weight:900;background:#2f9b63; }.waiting-avatar { display:flex;align-items:center;justify-content:center;gap:5rpx;background:#eef1ec; }.waiting-avatar text { width:7rpx;height:7rpx;border-radius:50%;background:#a7afa4; }.player-name { max-width:146rpx;margin-top:9rpx;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:23rpx;font-weight:900; }.player-type { margin-top:4rpx;color:#879083;font-size:19rpx; }.player-entry { max-width:146rpx;margin-top:7rpx;padding:5rpx 9rpx;overflow:hidden;border-radius:999rpx;color:#a87520;font-size:17rpx;font-weight:900;white-space:nowrap;text-overflow:ellipsis;background:#fff3d4; }.entry-confirmed,.entry-waived { color:#1f7c4b;background:#e5f6e9; }.entry-overdue,.entry-late_confirmed { color:#9c3d32;background:#fff0ed; }.entry-alert { margin-top:18rpx;padding:16rpx;border-radius:16rpx;color:#8f4d35;background:#fff2ec; }.entry-alert text { display:block; }.entry-alert text:first-child { font-weight:900; }.entry-alert text:last-child { margin-top:6rpx;font-size:20rpx; }
.info-row,.amount-row { min-height:68rpx;display:flex;align-items:center;justify-content:space-between;gap:20rpx;border-bottom:1rpx solid rgba(39,61,42,.07);font-size:24rpx; }.info-row text:first-child,.amount-row text:first-child { color:#7d877a; }.info-row text:last-child,.amount-row text:last-child { flex:1;text-align:right;font-weight:800; }.amount-row { border-bottom:none; }.amount-row text:last-child { color:#a87520;font-size:30rpx;font-weight:900; }
.footer-actions { position:fixed;left:24rpx;right:24rpx;bottom:calc(24rpx + env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(2,1fr);gap:12rpx;z-index:20; }.footer-actions button { min-height:72rpx;border-radius:999rpx;font-size:24rpx;font-weight:900; }.ghost-btn { color:#687665;background:#fff; }.primary-btn { color:#fff;background:#1f7c4b; }.danger-btn { color:#a13d35;background:#fff0ed; }
</style>
