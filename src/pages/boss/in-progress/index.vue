<template>
  <view class="progress-page">
    <view class="status-bar"><view class="live-dot" :class="{ waiting: orderInfo?.status === '待开打' }"></view><view><text>{{ statusTitle }}</text><text>{{ statusSub }}</text></view><text>{{ orderInfo?.status || '加载中' }}</text></view>

    <view class="hero-card"><text class="eyebrow">SERVICE PROGRESS</text><text class="hero-title">{{ heroTitle }}</text><view class="timer-card"><text>{{ orderInfo?.status === '待开打' ? '当前阶段' : '实际服务计时' }}</text><text>{{ orderInfo?.status === '待开打' ? '等待开打' : duration }}</text><text>{{ durationStatus }}</text></view><view class="hero-meta"><view><text>订单号</text><text>{{ orderNo || '加载中' }}</text></view><view><text>开始时间</text><text>{{ startTimeText }}</text></view></view></view>

    <view v-if="orderInfo?.paid" class="amount-card"><view><text>累计已支付</text><text>¥{{ totalPaidAmount }}</text><text>主订单 ¥{{ paidAmount }} · 续单 ¥{{ renewalPaidAmount }}</text></view><text>盾</text></view>

    <view v-if="orderInfo && canShowRenewal" class="card renewal-card">
      <view class="card-head"><view><text class="card-title">继续续单</text><text class="card-sub">保持原陪玩阵容、商品规格和 KOOK 房间</text></view><text class="chip">已续 {{ orderInfo.renewal_count || 0 }} 次</text></view>
      <view class="renewal-summary"><view><text>原购买时长</text><text>{{ originalHoursText }}</text></view><view><text>已支付续单时长</text><text>{{ renewalHoursText }}</text></view><view><text>累计购买时长</text><text>{{ totalHoursText }}</text></view></view>
      <view v-if="orderInfo.pending_renewal_order_no" class="pending-renewal"><view><text>存在待支付续单</text><text>{{ orderInfo.pending_renewal_order_no }}</text></view><button @tap="continueRenewalPayment">继续支付</button></view>
      <template v-else>
        <text class="label">选择续单份数</text>
        <view class="unit-options"><view v-for="unit in renewalOptions" :key="unit" :class="{ active: renewalUnits === unit }" @tap="renewalUnits = unit"><text>{{ unit }}份</text><text>+{{ formatHours(baseHours * unit) }}</text></view></view>
        <view class="renewal-price"><view><text>本次增加</text><text>{{ formatHours(baseHours * renewalUnits) }}</text></view><view><text>续单金额</text><text>¥{{ renewalAmount }}</text></view></view>
        <button class="renewal-btn" :disabled="renewing || !orderInfo.can_renew" @tap="handleRenewal">{{ renewing ? '正在创建续单...' : `立即续单 ¥${renewalAmount}` }}</button>
        <text class="tip">{{ orderInfo.can_renew ? '续单会生成独立支付订单，付款成功后购买时长自动计入本订单。' : '当前订单暂不能创建新续单，请先处理待支付续单或刷新状态。' }}</text>
      </template>
      <view v-if="paidRenewals.length" class="history"><text class="card-title">续单记录</text><view v-for="item in paidRenewals" :key="item.order_no"><text>第{{ item.renewal_index }}次 · +{{ formatHours(Number(item.booked_hours || 0)) }}</text><text>¥{{ Number(item.total_amount || 0).toFixed(2) }} · {{ item.status }}</text></view></view>
    </view>

    <view v-if="orderInfo" class="card">
      <view class="card-head"><view><text class="card-title">服务阵容与入房状态</text><text class="card-sub">已接单 {{ acceptedCount }}/{{ requiredCount }} 人；已确认入房 {{ enteredCount }}/{{ acceptedCount }} 人</text></view></view>
      <scroll-view scroll-x class="player-track" show-scrollbar="false"><view v-for="playerItem in orderInfo.players" :key="playerItem.id" class="player-card"><image v-if="playerItem.avatar_url" class="player-avatar" :src="playerItem.avatar_url" mode="aspectFill" /><view v-else class="player-avatar empty">{{ playerItem.name?.[0] || '陪' }}</view><view><text>{{ playerItem.name }}</text><text>{{ playerItem.type_name || '陪玩' }}</text><text class="entry">{{ playerRoomText(playerItem) }}</text></view></view></scroll-view>
      <view v-if="overduePlayers.length" class="warning"><text>{{ overduePlayers.length }}位陪玩存在入房超时记录</text><text>该记录仅供管理员核实，不会自动扣款或处罚。</text></view>
    </view>

    <view v-if="orderInfo" class="card">
      <view class="card-head"><view><text class="card-title">订单信息</text><text class="card-sub">房间号和游戏ID分开显示</text></view><text class="chip">{{ orderInfo.status }}</text></view>
      <view class="info-row"><text>套餐</text><text>{{ orderInfo.package_name_raw || orderInfo.package_name || '待确认' }}</text></view>
      <view v-if="orderInfo.spec_display_name || orderInfo.spec_name" class="info-row"><text>规格</text><text>{{ orderInfo.spec_display_name || orderInfo.spec_name }}</text></view>
      <view v-if="orderInfo.game_id_raw || orderInfo.game_id" class="info-row"><text>游戏ID/队伍码</text><text>{{ orderInfo.game_id_raw || orderInfo.game_id }}</text></view>
      <view v-if="orderInfo.kook_room_number" class="info-row copyable" @tap="copyRoom"><text>KOOK房间号</text><text>{{ orderInfo.kook_room_number }} · 复制</text></view>
      <view class="info-row"><text>原购买时长</text><text>{{ originalHoursText }}</text></view>
      <view class="info-row"><text>累计购买时长</text><text>{{ totalHoursText }}</text></view>
      <view class="info-row"><text>主订单金额</text><text>¥{{ paidAmount }}</text></view>
    </view>

    <view v-if="orderInfo" class="card"><text class="card-title">订单流程</text><view class="flow-list"><view class="done"><text>✓</text><view><text>1. 派单</text><text>订单已发布到抢单大厅</text></view></view><view :class="stepClass('接单')"><text>{{ stepIcon('接单','2') }}</text><view><text>2. 接单</text><text>{{ acceptedCount }}/{{ requiredCount }} 位陪玩已接单</text></view></view><view :class="stepClass('付款')"><text>{{ stepIcon('付款','3') }}</text><view><text>3. 付款</text><text>{{ orderInfo.paid ? `已支付 ¥${paidAmount}` : '等待老板付款' }}</text></view></view><view :class="stepClass('开打')"><text>{{ stepIcon('开打','4') }}</text><view><text>4. 开打</text><text>{{ orderInfo.status === '待开打' ? '等待陪玩确认开打' : orderInfo.status === '进行中' ? duration : '等待前序步骤完成' }}</text></view></view><view :class="stepClass('完成')"><text>{{ stepIcon('完成','5') }}</text><view><text>5. 完成</text><text>{{ orderInfo.status === '已完成' ? '服务已完成' : '服务结束后完成订单' }}</text></view></view></view></view>

    <view class="footer-actions"><button class="ghost" @tap="goMain('home')">返回首页</button><button class="primary" @tap="checkOrder">刷新状态</button><button v-if="orderInfo?.status === '待支付'" class="primary" @tap="goPayment">去付款 ¥{{ paidAmount }}</button></view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createRenewal, getOrder } from '@/api/boss'
import { formatDateTime as formatDateTimeValue, formatDuration } from '@/utils/format'
import { goMain, replace } from '@/utils/nav'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'

const orderNo = ref('')
const orderInfo = ref<any>(null)
const duration = ref('00:00:00')
const renewalUnits = ref(1)
const renewing = ref(false)
const now = ref(Date.now())
const renewalOptions = [1, 2, 3]
let orderTimer: ReturnType<typeof setInterval> | null = null
let durationTimer: ReturnType<typeof setInterval> | null = null

const startTimeText = computed(() => orderInfo.value?.start_time ? formatDateTimeValue(orderInfo.value.start_time) : '待确认')
const baseHours = computed(() => Math.max(.5, Number(orderInfo.value?.booked_hours || 1)))
const paidAmount = computed(() => Number(orderInfo.value?.total_amount || orderInfo.value?.total_price_per_hour || 0).toFixed(2))
const renewalPaidAmount = computed(() => Number(orderInfo.value?.renewal_paid_amount || 0).toFixed(2))
const totalPaidAmount = computed(() => (Number(paidAmount.value) + Number(renewalPaidAmount.value)).toFixed(2))
const renewalAmount = computed(() => (Number(paidAmount.value) * renewalUnits.value).toFixed(2))
const originalHoursText = computed(() => formatHours(Number(orderInfo.value?.booked_hours || 0)))
const renewalHoursText = computed(() => formatHours(Number(orderInfo.value?.renewal_booked_hours || 0)))
const totalHoursText = computed(() => formatHours(Number(orderInfo.value?.total_booked_hours ?? orderInfo.value?.booked_hours ?? 0)))
const paidRenewals = computed(() => (orderInfo.value?.renewals || []).filter((item: any) => item.paid))
const acceptedCount = computed(() => Number(orderInfo.value?.players?.length || 0))
const requiredCount = computed(() => Number(orderInfo.value?.required_players || 0))
const enteredCount = computed(() => (orderInfo.value?.players || []).filter((item: any) => ['confirmed','late_confirmed','waived'].includes(item.room_join_status)).length)
const overduePlayers = computed(() => (orderInfo.value?.players || []).filter((item: any) => ['overdue','late_confirmed'].includes(item.room_join_status)))
const canShowRenewal = computed(() => ['待开打','进行中'].includes(orderInfo.value?.status) && orderInfo.value?.order_type !== 'renewal')
const statusTitle = computed(() => orderInfo.value?.status === '待开打' ? '付款完成，等待开打' : '服务正在进行中')
const statusSub = computed(() => orderInfo.value?.status === '待开打' ? '陪玩填写房间号并确认开打后开始计时' : '请保持游戏内在线，订单状态会自动刷新')
const heroTitle = computed(() => orderInfo.value?.status === '待开打' ? '队伍已接满，准备开打' : '服务进行中')
const durationStatus = computed(() => orderInfo.value?.status === '待开打' ? '已付款 · 等待陪玩操作' : orderInfo.value?.is_paused ? '已暂停' : orderInfo.value?.timer_started_at ? '服务中' : '等待开始')

function formatHours(value: number) { const hours = Number(value || 0); return Number.isInteger(hours) ? `${hours}小时` : `${hours.toFixed(1)}小时` }
function playerRoomText(player: any) { const status = player.room_join_status || 'pending'; if (status === 'confirmed') return '已确认入房'; if (status === 'late_confirmed') return '超时后已确认入房'; if (status === 'overdue') return '入房确认已超时'; if (status === 'waived') return '管理员已免除确认'; if (!player.room_join_deadline) return '已接单，等待入房确认'; const seconds = Math.max(0, Math.floor((new Date(player.room_join_deadline).getTime() - now.value) / 1000)); return seconds ? `入房确认 ${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}` : '入房确认已超时' }
function updateDuration() { now.value = Date.now(); if (!orderInfo.value?.timer_started_at) { duration.value = orderInfo.value?.status === '待开打' ? '等待开打' : '00:00:00'; return }; const start = new Date(orderInfo.value.timer_started_at).getTime(); const end = orderInfo.value.end_time ? new Date(orderInfo.value.end_time).getTime() : orderInfo.value.is_paused && orderInfo.value.last_paused_at ? new Date(orderInfo.value.last_paused_at).getTime() : now.value; duration.value = formatDuration(Math.max(0, Math.floor((end - start) / 1000) - Number(orderInfo.value.paused_duration || 0))) }
function stepRank(status: string) { return ({ '待接单':1,'待支付':2,'待开打':3,'进行中':4,'已完成':5 } as Record<string,number>)[status] || 0 }
function targetRank(step: string) { return ({ '接单':2,'付款':3,'开打':4,'完成':5 } as Record<string,number>)[step] || 0 }
function stepClass(step: string) { const current = stepRank(orderInfo.value?.status); const target = targetRank(step); if (current > target || (step === '完成' && current === 5)) return 'done'; if (current === target || (step === '接单' && current === 1)) return 'active'; return '' }
function stepIcon(step: string, fallback: string) { return stepClass(step) === 'done' ? '✓' : fallback }
async function checkOrder() { if (!orderNo.value) return; try { const result = await getOrder(orderNo.value); orderInfo.value = result; updateDuration(); if (result.status === '待支付' || result.status === '已完成') { stopTimers(); replace('/pages/boss/payment/index', { orderNo: orderNo.value }) } else if (result.status === '已取消') { stopTimers(); toast('订单已取消'); goMain('home') } } catch (error) { toast(getErrorMessage(error,'订单加载失败')) } }
async function handleRenewal() { if (!orderInfo.value?.can_renew || renewing.value) return; if (!(await confirm(`确认续单${renewalUnits.value}份？\n增加${formatHours(baseHours.value * renewalUnits.value)}，需支付¥${renewalAmount.value}`,'确认续单'))) return; renewing.value = true; try { const result = await createRenewal(orderNo.value, renewalUnits.value); stopTimers(); success(result.created ? '续单已创建' : '已有待支付续单'); replace('/pages/boss/payment/index', { orderNo: result.order_no }) } catch (error) { toast(getErrorMessage(error,'续单创建失败')) } finally { renewing.value = false } }
function continueRenewalPayment() { const no = orderInfo.value?.pending_renewal_order_no; if (no) { stopTimers(); replace('/pages/boss/payment/index', { orderNo: no }) } }
function copyRoom() { const room = orderInfo.value?.kook_room_number; if (room) uni.setClipboardData({ data: room, success: () => success('KOOK房间号已复制') }) }
function goPayment() { replace('/pages/boss/payment/index', { orderNo: orderNo.value }) }
function stopTimers() { if (orderTimer) clearInterval(orderTimer); if (durationTimer) clearInterval(durationTimer); orderTimer = null; durationTimer = null }
onLoad(query => { orderNo.value = String(query?.orderNo || '') })
onMounted(() => { checkOrder(); orderTimer = setInterval(checkOrder, 5000); durationTimer = setInterval(updateDuration, 1000) })
onUnmounted(stopTimers)
</script>

<style lang="scss" scoped>
.progress-page{min-height:100vh;padding:20rpx 24rpx 210rpx;box-sizing:border-box;color:#172116;background:#f7f3ea}.status-bar,.hero-card,.card,.amount-card{margin-top:18rpx;border-radius:25rpx;background:#fff;box-shadow:0 12rpx 30rpx rgba(39,61,42,.06)}.status-bar{margin-top:0;display:flex;align-items:center;gap:14rpx;padding:18rpx}.live-dot{width:15rpx;height:15rpx;border-radius:50%;background:#ef5b5b}.live-dot.waiting{background:#d8a144}.status-bar>view:nth-child(2){flex:1}.status-bar text{display:block}.status-bar view text:first-child{font-weight:900}.status-bar view text:last-child{margin-top:4rpx;color:#879083;font-size:20rpx}.status-bar>text{padding:6rpx 12rpx;border-radius:999rpx;color:#1f7c4b;background:#eef8f1}.hero-card{padding:28rpx;background:linear-gradient(135deg,#eef8f1,#fffaf0)}.eyebrow,.hero-title{display:block}.eyebrow{color:#1f7c4b;font-size:19rpx;font-weight:900}.hero-title{margin-top:8rpx;font-size:38rpx;font-weight:900}.timer-card{margin-top:20rpx;padding:22rpx;border-radius:20rpx;text-align:center;color:#fff;background:linear-gradient(135deg,#5fb78a,#1f7c4b)}.timer-card text{display:block}.timer-card text:first-child{font-size:20rpx;opacity:.75}.timer-card text:nth-child(2){margin-top:5rpx;font-family:monospace;font-size:48rpx;font-weight:900}.timer-card text:last-child{margin-top:5rpx;font-size:20rpx}.hero-meta{display:grid;grid-template-columns:1fr 1fr;gap:12rpx;margin-top:16rpx}.hero-meta view{padding:14rpx;border-radius:15rpx;background:rgba(255,255,255,.72)}.hero-meta text{display:block}.hero-meta text:first-child{color:#879083;font-size:19rpx}.hero-meta text:last-child{margin-top:4rpx;font-weight:900;word-break:break-all}.amount-card{display:flex;align-items:center;justify-content:space-between;padding:24rpx;color:#fff;background:linear-gradient(135deg,#173426,#1f7c4b)}.amount-card view text{display:block}.amount-card view text:first-child,.amount-card view text:last-child{font-size:20rpx;opacity:.75}.amount-card view text:nth-child(2){margin-top:5rpx;font-size:46rpx;font-weight:900}.amount-card>text{width:60rpx;height:60rpx;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(255,255,255,.14)}.card{padding:24rpx}.card-head{display:flex;justify-content:space-between;gap:16rpx;margin-bottom:17rpx}.card-head>view{flex:1}.card-title,.card-sub{display:block}.card-title{font-size:29rpx;font-weight:900}.card-sub{margin-top:5rpx;color:#879083;font-size:20rpx;line-height:1.45}.chip{height:max-content;padding:6rpx 12rpx;border-radius:999rpx;color:#1f7c4b;background:#eef8f1;font-size:20rpx;font-weight:900}.renewal-summary,.unit-options{display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx}.renewal-summary view,.unit-options view{padding:15rpx 7rpx;border-radius:15rpx;text-align:center;background:#f7faf4}.renewal-summary text,.unit-options text{display:block}.renewal-summary text:first-child,.unit-options text:last-child{color:#879083;font-size:18rpx}.renewal-summary text:last-child,.unit-options text:first-child{margin-top:4rpx;font-size:23rpx;font-weight:900}.unit-options view.active{color:#1f7c4b;border:2rpx solid #1f7c4b;background:#eef8f1}.label{display:block;margin-top:20rpx;color:#687665;font-weight:900}.renewal-price{display:grid;grid-template-columns:1fr 1fr;gap:10rpx;margin-top:14rpx}.renewal-price view{display:flex;justify-content:space-between;padding:14rpx;border-radius:14rpx;background:#fff8e8}.renewal-price text:last-child{color:#a87520;font-weight:900}.renewal-btn{width:100%;height:76rpx;margin-top:16rpx;border-radius:999rpx;color:#fff;background:#a87520}.tip{display:block;margin-top:10rpx;color:#879083;font-size:20rpx;text-align:center;line-height:1.45}.pending-renewal{display:flex;align-items:center;gap:14rpx;padding:16rpx;border-radius:16rpx;background:#fff5df}.pending-renewal>view{flex:1}.pending-renewal text{display:block}.pending-renewal button{margin:0;color:#fff;background:#a87520}.history{margin-top:20rpx;padding-top:17rpx;border-top:1rpx solid #eee}.history>view{display:flex;justify-content:space-between;gap:12rpx;padding:12rpx 0;border-bottom:1rpx solid #eee;color:#687665;font-size:20rpx}.player-track{white-space:nowrap}.player-card{width:285rpx;display:inline-flex;align-items:center;gap:12rpx;margin-right:12rpx;padding:16rpx;border-radius:18rpx;background:#f7faf4;box-sizing:border-box}.player-avatar{width:68rpx;height:68rpx;flex-shrink:0;border-radius:50%}.empty{display:flex;align-items:center;justify-content:center;color:#fff;background:#1f7c4b}.player-card>view:last-child{flex:1;min-width:0}.player-card text{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.player-card text:first-child{font-weight:900}.player-card text:nth-child(2){margin-top:4rpx;color:#1f7c4b;font-size:19rpx}.entry{margin-top:5rpx!important;color:#a87520!important;font-size:18rpx!important}.warning{margin-top:16rpx;padding:15rpx;border-radius:15rpx;color:#8f4d35;background:#fff2ec}.warning text{display:block}.warning text:last-child{margin-top:5rpx;font-size:20rpx}.info-row{min-height:62rpx;display:flex;justify-content:space-between;align-items:center;gap:16rpx;border-bottom:1rpx solid #eee}.info-row text:first-child{color:#879083}.info-row text:last-child{text-align:right;font-weight:900}.copyable text:last-child{color:#1f7c4b}.flow-list{display:flex;flex-direction:column;gap:14rpx;margin-top:18rpx}.flow-list>view{display:flex;align-items:center;gap:13rpx;color:#9aa197}.flow-list>view>text{width:46rpx;height:46rpx;display:flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;background:#c8cec6;font-weight:900}.flow-list>view>view text{display:block}.flow-list>view>view text:first-child{color:#687665;font-weight:900}.flow-list>view>view text:last-child{margin-top:3rpx;font-size:20rpx}.flow-list>view.done>text,.flow-list>view.active>text{background:#1f7c4b}.footer-actions{position:fixed;left:18rpx;right:18rpx;bottom:calc(20rpx + env(safe-area-inset-bottom));display:flex;gap:10rpx}.footer-actions button{flex:1;height:74rpx;margin:0;border-radius:999rpx}.ghost{color:#687665;background:#fff}.primary{color:#fff;background:#1f7c4b}
</style>
