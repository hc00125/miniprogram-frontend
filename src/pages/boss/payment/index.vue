<template>
  <view class="payment-page">
    <view class="status-card" :class="{ paid: isPaid }">
      <view class="status-dot"></view>
      <view class="status-main">
        <text class="status-title">{{ stripText }}</text>
        <text class="status-sub">{{ isRenewal ? `续单号 ${orderNo}` : `订单号 ${orderNo}` }}</text>
      </view>
      <text class="status-pill">{{ payStatusText }}</text>
    </view>

    <view v-if="orderInfo" class="amount-card">
      <text class="amount-label">{{ amountCardLabel }}</text>
      <view class="amount-row"><text>💎</text><text>{{ diamond(amountCardValue) }}</text></view>
      <text v-if="showRenewalSummary" class="amount-breakdown">
        主订单 💎{{ diamond(mainOrderAmount) }} · 续单 💎{{ diamond(renewalPaidAmount) }}
      </text>
      <view class="secure-tip"><text>钻</text><text>平台统一钻石标价 · 人民币1元对应10钻石</text></view>
    </view>

    <view v-if="showPaymentWindow" class="card virtual-pay-card">
      <view class="virtual-head">
        <view class="wechat-icon">时</view>
        <view>
          <text>{{ isRenewal ? '续单支付窗口' : '服务阵容已为您保留' }}</text>
          <text>{{ paymentWindowSubtitle }}</text>
        </view>
      </view>
      <view class="virtual-notice">
        <text></text>
        <text>{{ paymentWindowNotice }}</text>
      </view>
      <view class="info-row total-row">
        <text>{{ serverConfirming ? '微信核验剩余' : '支付剩余时间' }}</text>
        <text>{{ paymentCountdownText }}</text>
      </view>
    </view>

    <view v-if="loadError" class="error-card">
      <view class="error-icon">!</view>
      <view class="error-main">
        <text class="error-title">订单加载失败</text>
        <text class="error-detail">{{ loadError }}</text>
      </view>
      <button class="mini-button" @tap="fetchOrder">重新加载</button>
    </view>

    <view v-if="orderInfo" class="card detail-card">
      <view class="card-head"><text>{{ isRenewal ? '续单明细' : '订单明细' }}</text><text>{{ orderInfo.status }}</text></view>
      <view v-if="isRenewal" class="info-row room-row" @tap="copyText(orderInfo.parent_order_no)">
        <text>原订单</text><text>{{ orderInfo.parent_order_no }} · 复制</text>
      </view>
      <view v-if="isRenewal" class="info-row"><text>续单次数</text><text>第{{ orderInfo.renewal_index }}次</text></view>
      <view class="info-row"><text>套餐</text><text>{{ orderInfo.package_name_raw || orderInfo.package_name || '待确认' }}</text></view>
      <view v-if="orderInfo.spec_name || orderInfo.spec_display_name" class="info-row"><text>规格</text><text>{{ orderInfo.spec_display_name || orderInfo.spec_name }}</text></view>
      <view v-if="orderInfo.game_id_raw || orderInfo.game_id" class="info-row"><text>游戏ID/队伍码</text><text>{{ orderInfo.game_id_raw || orderInfo.game_id }}</text></view>
      <view v-if="orderInfo.kook_room_number" class="info-row room-row" @tap="copyText(orderInfo.kook_room_number)">
        <text>KOOK房间号</text><text>{{ orderInfo.kook_room_number }} · 复制</text>
      </view>
      <view v-if="orderInfo.addon_name" class="info-row"><text>附加项</text><text>{{ orderInfo.addon_name }}</text></view>

      <template v-if="isRenewal">
        <view v-if="orderInfo.booked_hours" class="info-row"><text>新增时长</text><text>{{ formatHours(orderInfo.booked_hours) }}</text></view>
        <view class="info-row total-row"><text>续单钻石</text><text>💎{{ diamond(orderAmount) }}</text></view>
      </template>
      <template v-else>
        <view v-if="orderInfo.booked_hours" class="info-row"><text>{{ showRenewalSummary ? '原预订时长' : '预订时长' }}</text><text>{{ originalBookedHours }}</text></view>
        <view v-if="showRenewalSummary" class="info-row"><text>续单时长</text><text>{{ renewalBookedHours }}</text></view>
        <view v-if="showRenewalSummary" class="info-row emphasis-row"><text>累计购买时长</text><text>{{ totalBookedHours }}</text></view>
        <view v-if="orderInfo.duration_minutes" class="info-row"><text>实际服务</text><text>{{ Math.floor(orderInfo.duration_minutes / 60) }}小时 {{ orderInfo.duration_minutes % 60 }}分钟</text></view>
        <view v-if="showRenewalSummary" class="info-row"><text>主订单钻石</text><text>💎{{ diamond(mainOrderAmount) }}</text></view>
        <view v-if="showRenewalSummary" class="info-row"><text>续单钻石</text><text>💎{{ diamond(renewalPaidAmount) }}</text></view>
        <view class="info-row total-row"><text>{{ showRenewalSummary ? '累计钻石' : '订单钻石' }}</text><text>💎{{ diamond(amountCardValue) }}</text></view>
      </template>
    </view>

    <view v-if="!isRenewal && paidRenewals.length" class="card renewal-history-card">
      <view class="card-head"><text>续单记录</text><text>共{{ paidRenewals.length }}次</text></view>
      <view v-for="item in paidRenewals" :key="item.order_no" class="renewal-record">
        <view class="renewal-record-head">
          <text>第{{ item.renewal_index }}次续单</text>
          <text>已支付</text>
        </view>
        <view class="renewal-record-grid">
          <view><text>新增时长</text><text>{{ formatHours(item.booked_hours) }}</text></view>
          <view><text>支付钻石</text><text>💎{{ diamond(diamondsFrom(item.total_amount_diamonds, item.total_amount)) }}</text></view>
          <view><text>支付时间</text><text>{{ formatRenewalTime(item.payment_confirmed_at || item.created_at) }}</text></view>
        </view>
        <view class="renewal-order-no" @tap="copyText(item.order_no)">
          <text>续单订单号</text><text>{{ item.order_no }} · 复制</text>
        </view>
      </view>
    </view>

    <view v-if="orderInfo?.players?.length" class="card players-card">
      <view class="card-head"><text>{{ isRenewal ? '保持原服务阵容' : '服务阵容' }}</text><text>{{ orderInfo.players.length }}位陪玩</text></view>
      <scroll-view scroll-x class="players-track" show-scrollbar="false">
        <view v-for="player in orderInfo.players" :key="player.id" class="player-item">
          <image v-if="player.avatar_url" class="player-avatar" :src="player.avatar_url" mode="aspectFill" />
          <view v-else class="player-avatar player-avatar--empty">{{ player.name?.[0] || '陪' }}</view>
          <text class="player-name">{{ player.name }}</text>
          <text class="player-type">{{ player.type_name || '陪玩' }}</text>
        </view>
      </scroll-view>
    </view>

    <view v-if="serverConfirming && !paymentConfirming" class="card virtual-pay-card">
      <view class="virtual-head">
        <view class="wechat-icon">核</view>
        <view>
          <text>支付时间已结束</text>
          <text>系统正在向微信确认最终支付结果</text>
        </view>
      </view>
      <view class="virtual-notice">
        <text></text>
        <text>核验期间不能再次发起支付，也不会立即释放陪玩阵容。若微信确认未付款，订单将自动取消。</text>
      </view>
      <button class="pay-button" :disabled="confirmationRefreshing" @tap="refreshPaymentStatus(false)">
        {{ confirmationRefreshing ? '正在核验微信支付...' : '刷新核验结果' }}
      </button>
      <text class="pay-help">请勿重复付款。核验通常会在几十秒内完成。</text>
    </view>

    <view v-if="paymentConfirming" class="card virtual-pay-card">
      <view class="virtual-head">
        <view class="wechat-icon">✓</view>
        <view>
          <text>微信付款已完成</text>
          <text>订单状态正在同步，请勿重复支付</text>
        </view>
      </view>
      <view class="virtual-notice">
        <text></text>
        <text>微信收银台已经返回成功。本次购买的等额钻石将直接用于当前订单，不会重复计入可用钻石余额。</text>
      </view>
      <button class="pay-button" :disabled="confirmationRefreshing" @tap="refreshPaymentStatus(false)">
        {{ confirmationRefreshing ? '正在同步订单状态...' : '刷新订单状态' }}
      </button>
      <text class="pay-help">可以停留在本页等待，也可以稍后重新进入订单查看；请不要重复付款。</text>
    </view>

    <view v-if="timeoutCancelled" class="card completed-card">
      <view class="completed-icon">!</view>
      <text class="completed-title">订单已超时取消</text>
      <text class="completed-sub">超过10分钟未完成支付，当前陪玩阵容已经释放。本次不会扣除钻石。</text>
      <button class="progress-button" @tap="goReorder">重新下单</button>
    </view>

    <view v-if="payError && !serverConfirming && !timeoutCancelled" class="pay-error-card">
      <view class="pay-error-head">
        <view class="error-icon">!</view>
        <view class="error-main">
          <text class="error-title">{{ payError.title }}</text>
          <text class="error-detail">{{ payError.detail }}</text>
        </view>
      </view>
      <view v-if="payError.code" class="error-code" @tap="copyErrorInfo">
        <text>错误编号</text><text>{{ payError.code }} · 复制</text>
      </view>
      <text class="error-action">{{ payError.action }}</text>
      <view class="error-actions">
        <button class="ghost-button" @tap="copyErrorInfo">复制错误信息</button>
        <button class="retry-button" :disabled="paying || !canStartPayment" @tap="handlePay">{{ paying ? '重试中...' : '重新尝试' }}</button>
      </view>
    </view>

    <view v-if="showPayPanel" class="card virtual-pay-card">
      <view class="virtual-head">
        <view class="wechat-icon">付</view>
        <view>
          <text>选择支付方式</text>
          <text>{{ isRenewal ? '续单使用钻石结算 · 成功后自动合并时长' : '平台服务统一以钻石标价和结算' }}</text>
        </view>
      </view>
      <view class="pay-methods">
        <view v-if="!isIOS" class="pay-method" :class="{ active: payMethod === 'wechat' }" @tap="selectPayMethod('wechat')">
          <view class="pay-method-icon pay-method-icon--wechat">微</view>
          <view class="pay-method-main">
            <text>微信即时支付</text>
            <text>购买本单所需💎{{ diamond(orderAmount) }}并立即用于订单</text>
          </view>
          <view class="pay-method-check" :class="{ checked: payMethod === 'wechat' }">✓</view>
        </view>
        <view
          class="pay-method"
          :class="{ active: payMethod === 'balance', disabled: !balanceSufficient }"
          @tap="selectPayMethod('balance')"
        >
          <view class="pay-method-icon pay-method-icon--balance">钻</view>
          <view class="pay-method-main">
            <text>可用钻石支付</text>
            <text>{{ balanceOptionSub }}</text>
          </view>
          <view v-if="walletBalance === null && walletLoadFailed" class="pay-method-tag">余额加载失败</view>
          <view v-else-if="walletBalance !== null && !balanceSufficient" class="pay-method-tag">还差💎{{ diamond(balanceShortfall) }}</view>
          <view v-else class="pay-method-check" :class="{ checked: payMethod === 'balance' }">✓</view>
        </view>
      </view>
      <view class="virtual-notice">
        <text></text>
        <text>{{ payNotice }}</text>
      </view>
      <button class="pay-button" :disabled="paying || cancelling || !canStartPayment" @tap="handlePay">
        {{ payButtonText }}
      </button>
      <button v-if="isRenewal" class="cancel-renewal-button" :disabled="paying || cancelling" @tap="cancelRenewalOrder">
        {{ cancelling ? '正在取消续单...' : '取消本次续单' }}
      </button>
      <button v-else class="cancel-renewal-button" :disabled="paying || cancelling" @tap="cancelMainOrder">
        {{ cancelling ? '正在取消订单...' : '取消订单' }}
      </button>
      <text class="pay-help">微信即时支付和已有钻石支付均保留；未支付订单可取消，支付成功后按原渠道退款规则处理。</text>
    </view>

    <view v-if="isPaid" class="card completed-card">
      <view class="completed-icon">✓</view>
      <text class="completed-title">{{ paidCardTitle }}</text>
      <text class="completed-sub">{{ paidCardSub }}</text>
      <button v-if="showProgressButton" class="progress-button" @tap="goProgress">{{ isRenewal ? '返回原订单' : '查看服务进度' }}</button>
    </view>

    <view v-if="isCompleted && !isRenewal && orderInfo?.players?.length" class="card rating-card">
      <view class="card-head"><text>评价陪玩</text><text>{{ allPlayersRated ? '本订单已评价完成' : '每位陪玩仅可评价一次' }}</text></view>
      <view v-for="player in orderInfo.players" :key="player.id" class="rating-item" :class="{ 'rating-item--rated': isPlayerRated(player.id) }">
        <view class="rating-player">
          <image v-if="player.avatar_url" class="rating-avatar" :src="player.avatar_url" mode="aspectFill" />
          <view v-else class="rating-avatar rating-avatar--empty">{{ player.name?.[0] || '陪' }}</view>
          <view><text>{{ player.name }}</text><text>{{ player.type_name || '陪玩' }}</text></view>
        </view>
        <view class="rating-control">
          <view class="stars" :class="{ locked: isPlayerRated(player.id) }">
            <text v-for="star in 5" :key="star" :class="{ active: (ratings[player.id] || 0) >= star }" @tap="setRating(player.id, star)">★</text>
          </view>
          <text v-if="isPlayerRated(player.id)" class="rating-done-tag">已评价</text>
        </view>
      </view>
      <view v-if="allPlayersRated" class="rating-complete-tip">该订单的所有陪玩均已评价，无法再次提交或修改。</view>
      <template v-else>
        <textarea v-model="ratingComment" class="rating-textarea" maxlength="60" placeholder="留下您的真实评价（选填）" />
        <button class="rating-button" :disabled="ratingSubmitting || !selectedUnratedPlayerIds.length" @tap="submitRatings">
          {{ ratingSubmitting ? '提交中...' : (selectedUnratedPlayerIds.length ? `提交评价（${selectedUnratedPlayerIds.length}位）` : '请选择星级') }}
        </button>
      </template>
    </view>

    <view v-if="loading" class="loading-state">订单加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { cancelOrder, getOrder, getOrderRatings, ratePlayer, type OrderRatingRecord } from '@/api/boss'
import { isIOSDevice } from '@/utils/purchaseAvailability'
import { closeVirtualPayment, createMiniProgramPayment } from '@/api/pay'
import { getWalletOverview, payOrderWithBalance } from '@/api/wallet'
import { diamondsFrom, formatDiamonds } from '@/utils/diamonds'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { relaunch, replace } from '@/utils/nav'
import { isVirtualPaymentConfirmationPending, requestWechatVirtualPayment } from '@/utils/virtual-payment'

type PayErrorState = {
  title: string
  detail: string
  action: string
  code: string
}

type PendingPaymentState = {
  orderNo: string
  paymentNo: string
  createdAt: number
}

const PENDING_PAYMENT_STORAGE_KEY = 'virtual_payment_confirmation_pending'
const orderNo = ref('')
const orderInfo = ref<any>(null)
const loading = ref(true)
const loadError = ref('')
const paying = ref(false)
const cancelling = ref(false)
const payMethod = ref<'wechat' | 'balance'>('wechat')
// iOS 端：隐藏微信支付选项，只能使用钱包已有钻石付款
const isIOS = isIOSDevice()
if (isIOS) payMethod.value = 'balance'
const walletBalance = ref<number | null>(null)
const walletLoadFailed = ref(false)
const payError = ref<PayErrorState | null>(null)
const paymentConfirming = ref(false)
const confirmationRefreshing = ref(false)
const ratings = ref<Record<number, number>>({})
const existingRatings = ref<Record<number, OrderRatingRecord>>({})
const ratingComment = ref('')
const ratingSubmitting = ref(false)
const clockNow = ref(Date.now())
const paymentClockSyncedAt = ref(Date.now())
const paymentRemainingAtSync = ref(0)
const confirmationRemainingAtSync = ref(0)
let confirmationTimer: ReturnType<typeof setTimeout> | null = null
let clockTimer: ReturnType<typeof setInterval> | null = null

const isPaid = computed(() => Boolean(orderInfo.value?.paid))
const isRenewal = computed(() => orderInfo.value?.order_type === 'renewal')
const isCompleted = computed(() => orderInfo.value?.status === '已完成')
const timeoutCancelled = computed(() => Boolean(
  orderInfo.value?.status === '已取消'
  && /10分钟|自动取消|未完成支付/.test(String(orderInfo.value?.cancel_reason || ''))
))
const paymentPhase = computed(() => String(orderInfo.value?.payment_phase || 'inactive'))
const serverConfirming = computed(() => Boolean(
  orderInfo.value?.status === '待支付'
  && !isPaid.value
  && paymentPhase.value === 'confirming'
))
const elapsedSinceSync = computed(() => Math.max(0, Math.floor((clockNow.value - paymentClockSyncedAt.value) / 1000)))
const paymentRemainingSeconds = computed(() => Math.max(0, paymentRemainingAtSync.value - elapsedSinceSync.value))
const confirmationRemainingSeconds = computed(() => Math.max(0, confirmationRemainingAtSync.value - elapsedSinceSync.value))
const canStartPayment = computed(() => Boolean(
  orderInfo.value?.status === '待支付'
  && !isPaid.value
  && paymentPhase.value === 'open'
  && paymentRemainingSeconds.value > 0
  && orderInfo.value?.can_start_payment !== false
))
const showPaymentWindow = computed(() => Boolean(
  orderInfo.value?.status === '待支付'
  && !isPaid.value
  && ['open', 'confirming'].includes(paymentPhase.value)
))
const showPayPanel = computed(() => Boolean(canStartPayment.value && !paymentConfirming.value))
const shouldPollPaymentStatus = computed(() => paymentConfirming.value || serverConfirming.value)
const showProgressButton = computed(() => isRenewal.value ? isPaid.value : ['待开打', '进行中'].includes(orderInfo.value?.status))
const serviceOrderNo = computed(() => isRenewal.value ? orderInfo.value?.parent_order_no : orderNo.value)
const orderAmount = computed(() => diamondsFrom(
  orderInfo.value?.total_amount_diamonds ?? orderInfo.value?.diamond_amount,
  orderInfo.value?.total_amount || orderInfo.value?.total_price_per_hour || 0
))
const mainOrderAmount = computed(() => diamondsFrom(
  orderInfo.value?.total_amount_diamonds,
  orderInfo.value?.total_amount || orderInfo.value?.total_price_per_hour || 0
))
const renewalPaidAmount = computed(() => isRenewal.value ? 0 : diamondsFrom(
  orderInfo.value?.renewal_paid_amount_diamonds,
  orderInfo.value?.renewal_paid_amount || 0
))
const paidRenewals = computed(() => (orderInfo.value?.renewals || []).filter((item: any) => item.paid && item.status === '已完成'))
const showRenewalSummary = computed(() => renewalPaidAmount.value > 0)
const cumulativePaidAmount = computed(() => mainOrderAmount.value + renewalPaidAmount.value)
const amountCardValue = computed(() => isRenewal.value ? orderAmount.value : (isPaid.value ? cumulativePaidAmount.value : orderAmount.value))
const amountCardLabel = computed(() => {
  if (paymentConfirming.value || serverConfirming.value) return '微信支付核验中'
  if (!isPaid.value) return '待支付钻石'
  if (showRenewalSummary.value) return '累计已支付钻石'
  return '已支付钻石'
})
const originalBookedHours = computed(() => formatHours(orderInfo.value?.booked_hours || 0))
const renewalBookedHours = computed(() => formatHours(orderInfo.value?.renewal_booked_hours || 0))
const totalBookedHours = computed(() => formatHours(orderInfo.value?.total_booked_hours ?? orderInfo.value?.booked_hours ?? 0))
const allPlayersRated = computed(() => {
  const players = orderInfo.value?.players || []
  return Boolean(players.length) && players.every((player: any) => Boolean(existingRatings.value[player.id]))
})
const selectedUnratedPlayerIds = computed(() => Object.keys(ratings.value)
  .map(Number)
  .filter(playerId => ratings.value[playerId] > 0 && !existingRatings.value[playerId]))
const balanceSufficient = computed(() => walletBalance.value !== null && walletBalance.value >= orderAmount.value)
const balanceShortfall = computed(() => Math.max(0, orderAmount.value - Number(walletBalance.value || 0)))
const balanceOptionSub = computed(() => {
  if (walletBalance.value !== null) return `当前可用 💎${diamond(walletBalance.value)} · 支付后 💎${diamond(Math.max(0, walletBalance.value - orderAmount.value))}`
  return walletLoadFailed.value ? '钻石余额加载失败，点击重试' : '钻石余额加载中...'
})
const payButtonText = computed(() => {
  if (paying.value) return payMethod.value === 'balance' ? '正在扣除可用钻石...' : '正在拉起微信支付...'
  return payMethod.value === 'balance'
    ? `使用 💎${diamond(orderAmount.value)} 支付`
    : `微信即时支付 💎${diamond(orderAmount.value)}`
})
const payNotice = computed(() => {
  if (payMethod.value === 'balance') {
    return isRenewal.value
      ? `本次续单将从可用钻石扣除💎${diamond(orderAmount.value)}，成功后自动合并到原订单。`
      : `将从可用钻石扣除💎${diamond(orderAmount.value)}；付款成功后订单进入“待开打”。`
  }
  return `微信支付用于购买本单所需的💎${diamond(orderAmount.value)}并立即消费，不会重复增加可用钻石余额。`
})
const paymentWindowSubtitle = computed(() => serverConfirming.value
  ? '支付入口已关闭 · 阵容暂不释放'
  : `请在 ${paymentCountdownText.value} 内完成付款`)
const paymentWindowNotice = computed(() => serverConfirming.value
  ? '系统正在核验微信是否已经扣款。确认期间请勿重复支付，阵容会暂时继续保留。'
  : '倒计时结束后将停止发起新支付，并进入短暂的微信结果核验；确认未付款后订单自动取消。')
const paymentCountdownText = computed(() => formatCountdown(
  serverConfirming.value ? confirmationRemainingSeconds.value : paymentRemainingSeconds.value
))
const payStatusText = computed(() => {
  if (!orderInfo.value) return '加载中'
  if (paymentConfirming.value || serverConfirming.value) return '确认中'
  if (timeoutCancelled.value) return '已超时'
  if (isRenewal.value && orderInfo.value.status === '待支付') return '续单待支付'
  if (isRenewal.value && isPaid.value) return '续单成功'
  if (orderInfo.value.status === '待支付') return '待支付'
  if (orderInfo.value.status === '待开打') return '待开打'
  if (orderInfo.value.status === '进行中') return '进行中'
  if (orderInfo.value.status === '已完成') return '已完成'
  return orderInfo.value.status || '待确认'
})
const stripText = computed(() => {
  if (!orderInfo.value) return '订单加载中'
  if (paymentConfirming.value) return '微信已付款，订单确认中'
  if (serverConfirming.value) return '支付窗口已结束，正在核验微信结果'
  if (timeoutCancelled.value) return '订单已超时，服务阵容已释放'
  if (isRenewal.value) return isPaid.value ? '续单支付完成' : '续单已创建，请完成付款'
  if (orderInfo.value.status === '待支付') return '队伍已就位，请在保留期内付款'
  if (orderInfo.value.status === '待开打') return '付款成功，等待陪玩开打'
  if (orderInfo.value.status === '进行中') return '付款已完成，服务进行中'
  if (orderInfo.value.status === '已完成') return '订单服务已完成'
  return '查看订单支付状态'
})
const paidCardTitle = computed(() => {
  if (isRenewal.value) return '续单支付成功'
  if (isCompleted.value) return '订单已完成'
  if (orderInfo.value?.status === '进行中') return '服务正在进行中'
  return '支付成功，等待开打'
})
const paidCardSub = computed(() => {
  if (isRenewal.value) return `新增${formatHours(orderInfo.value?.booked_hours || 0)}已自动计入原订单`
  if (isCompleted.value && showRenewalSummary.value) return `服务已完成，本单累计购买${totalBookedHours.value}，可以对陪玩进行评价`
  if (isCompleted.value) return '服务已完成，可以对陪玩进行评价'
  if (orderInfo.value?.status === '进行中') return '陪玩已开打，订单正在计时'
  return '支付已确认，请等待陪玩填写房间号并开打'
})

function diamond(value: unknown) {
  try {
    return formatDiamonds(value ?? 0)
  } catch {
    return '--'
  }
}

function formatHours(value: number) {
  const hours = Number(value || 0)
  return Number.isInteger(hours) ? `${hours}小时` : `${hours.toFixed(1)}小时`
}

function formatCountdown(value: number) {
  const seconds = Math.max(0, Math.floor(Number(value || 0)))
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function formatRenewalTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function syncPaymentClock() {
  paymentClockSyncedAt.value = Date.now()
  clockNow.value = paymentClockSyncedAt.value
  paymentRemainingAtSync.value = Number(orderInfo.value?.payment_remaining_seconds || 0)
  confirmationRemainingAtSync.value = Number(orderInfo.value?.payment_confirmation_remaining_seconds || 0)
}

function startClock() {
  if (clockTimer) return
  clockTimer = setInterval(() => {
    const previousPaymentSeconds = paymentRemainingSeconds.value
    const previousConfirmationSeconds = confirmationRemainingSeconds.value
    clockNow.value = Date.now()
    if (
      (paymentPhase.value === 'open' && previousPaymentSeconds > 0 && paymentRemainingSeconds.value === 0)
      || (paymentPhase.value === 'confirming' && previousConfirmationSeconds > 0 && confirmationRemainingSeconds.value === 0)
    ) {
      void fetchOrder()
    }
  }, 1000)
}

function stopClock() {
  if (!clockTimer) return
  clearInterval(clockTimer)
  clockTimer = null
}

function isPlayerRated(playerId: number) {
  return Boolean(existingRatings.value[playerId])
}

function setRating(playerId: number, value: number) {
  if (isPlayerRated(playerId)) {
    toast('该陪玩已经评价过，不能重复评价')
    return
  }
  ratings.value[playerId] = value
}

async function fetchRatingStatus() {
  if (!orderNo.value || !isCompleted.value || isRenewal.value) {
    existingRatings.value = {}
    return
  }
  try {
    const result = await getOrderRatings(orderNo.value)
    const map: Record<number, OrderRatingRecord> = {}
    for (const item of result.results || []) {
      map[item.player_id] = item
      ratings.value[item.player_id] = item.rating
    }
    existingRatings.value = map
  } catch (error) {
    toast(getErrorMessage(error, '评价状态加载失败'))
  }
}

function extractCode(error: any) {
  return String(error?.error_id || error?.reference_id || error?.wechat_code || error?.errCode || error?.statusCode || '')
}

function classifyPayError(error: any): PayErrorState {
  const detail = getErrorMessage(error, '支付失败，请稍后重试')
  const code = extractCode(error)
  const text = `${detail} ${error?.errMsg || ''}`.toLowerCase()

  if (/10分钟|支付窗口|核验微信/.test(text)) return { title: '支付窗口已结束', detail, action: '系统正在核验微信结果，请勿再次付款，稍后刷新订单状态。', code }
  if (/未绑定|绑定微信虚拟支付道具|product/.test(text)) return { title: '商品暂不可支付', detail, action: '请联系管理员为当前商品规格绑定正确的微信虚拟道具。', code }
  if (/金额|价格|不一致|price|fee/.test(text)) return { title: '订单钻石校验未通过', detail, action: '请联系管理员核对商品人民币等值金额与整数钻石价格。', code }
  if (/openid|登录态|session|重新登录|jscode/.test(text)) return { title: '微信登录态已失效', detail, action: '请返回个人中心重新登录微信账号，然后再次进入订单支付页。', code }
  if (/appkey|offer|配置|configuration/.test(text)) return { title: '支付配置异常', detail, action: '请管理员检查AppKey、OfferID和虚拟支付环境配置。', code }
  if (/尚未审核|道具状态|15010|15011|15013/.test(text)) return { title: '微信道具暂不可用', detail, action: '请确认虚拟道具已发布，并使用正确的小程序版本和支付环境。', code }
  if (Number(error?.statusCode) >= 500 || /内部错误|请求失败（500）/.test(text)) return { title: '支付服务暂时异常', detail, action: '请稍后重试；如持续出现，请把错误编号提供给管理员查询服务器日志。', code }
  return { title: '支付未完成', detail, action: '请检查网络后重试；若微信已扣款，请不要重复支付，先刷新订单状态。', code }
}

function clearConfirmationTimer() {
  if (!confirmationTimer) return
  clearTimeout(confirmationTimer)
  confirmationTimer = null
}

function clearPendingPaymentState() {
  clearConfirmationTimer()
  paymentConfirming.value = false
  const stored = uni.getStorageSync(PENDING_PAYMENT_STORAGE_KEY) as PendingPaymentState | ''
  if (!stored || stored.orderNo === orderNo.value) uni.removeStorageSync(PENDING_PAYMENT_STORAGE_KEY)
}

function scheduleConfirmationRefresh() {
  clearConfirmationTimer()
  if (!shouldPollPaymentStatus.value) return
  confirmationTimer = setTimeout(() => { void refreshPaymentStatus(true) }, 2500)
}

function enterConfirmationPending(paymentNo = '') {
  paymentConfirming.value = true
  payError.value = null
  const pendingState: PendingPaymentState = {
    orderNo: orderNo.value,
    paymentNo,
    createdAt: Date.now()
  }
  uni.setStorageSync(PENDING_PAYMENT_STORAGE_KEY, pendingState)
  scheduleConfirmationRefresh()
}

function restorePendingPaymentState() {
  const stored = uni.getStorageSync(PENDING_PAYMENT_STORAGE_KEY) as PendingPaymentState | ''
  if (!stored || stored.orderNo !== orderNo.value) return
  paymentConfirming.value = true
}

async function fetchOrder() {
  if (!orderNo.value) return false
  loading.value = true
  loadError.value = ''
  try {
    orderInfo.value = await getOrder(orderNo.value)
    syncPaymentClock()
    if (isPaid.value) {
      payError.value = null
      clearPendingPaymentState()
    } else if (orderInfo.value?.status !== '待支付') {
      clearPendingPaymentState()
    }
    if (shouldPollPaymentStatus.value) scheduleConfirmationRefresh()
    await fetchRatingStatus()
    return true
  } catch (error) {
    loadError.value = getErrorMessage(error, '订单加载失败')
    return false
  } finally {
    loading.value = false
  }
}

async function refreshPaymentStatus(silent = false) {
  if (!orderNo.value || confirmationRefreshing.value) return
  confirmationRefreshing.value = true
  try {
    const loaded = await fetchOrder()
    if (isPaid.value) {
      if (!silent) success(isRenewal.value ? '续单支付状态已确认' : '支付状态已确认')
      return
    }
    if (timeoutCancelled.value) {
      if (!silent) toast('订单已超时取消，服务阵容已释放')
      return
    }
    if (!silent) {
      toast(loaded ? '微信支付结果仍在核验中，请勿重复付款' : '订单状态暂时获取失败，系统会继续确认')
    }
  } finally {
    confirmationRefreshing.value = false
    if (shouldPollPaymentStatus.value) scheduleConfirmationRefresh()
  }
}

async function payByWechat() {
  if (!orderNo.value || paying.value || cancelling.value || paymentConfirming.value) return
  if (isIOS) {
    toast('iOS 端暂不支持微信支付，请使用可用钻石付款')
    return
  }
  if (!canStartPayment.value) {
    await fetchOrder()
    toast(serverConfirming.value ? '支付窗口已结束，系统正在核验微信结果' : '当前订单已不能继续支付')
    return
  }
  payError.value = null
  paying.value = true
  let currentPaymentNo = ''
  try {
    const loginResult: any = await new Promise((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    if (!loginResult?.code) throw new Error('微信登录态获取失败，请重新进入小程序')
    const payParams = await createMiniProgramPayment(orderNo.value, loginResult.code)
    currentPaymentNo = payParams.payment_no || ''
    await requestWechatVirtualPayment(payParams)
    await fetchOrder()
    if (!isPaid.value) {
      enterConfirmationPending(payParams.payment_no)
      toast('微信付款已完成，订单正在确认，请勿重复支付')
      return
    }
    success(isRenewal.value ? '续单支付完成，时长已合并' : '支付完成，等待陪玩开打')
  } catch (error: any) {
    const errCode = Number(error?.errCode)
    if (isVirtualPaymentConfirmationPending(error)) {
      enterConfirmationPending(String(error?.paymentNo || ''))
      await fetchOrder()
      if (isPaid.value) {
        success(isRenewal.value ? '续单支付完成，时长已合并' : '支付完成，等待陪玩开打')
      } else {
        toast('微信付款已完成，订单正在确认，请勿重复支付')
      }
    } else if (errCode === -2 || /cancel/i.test(String(error?.errMsg || ''))) {
      if (currentPaymentNo) {
        closeVirtualPayment(currentPaymentNo).catch((closeError) => {
          console.warn('[payment] 取消支付后关闭虚拟支付单失败', currentPaymentNo, closeError)
        })
      }
      toast('已取消支付')
    } else {
      payError.value = classifyPayError(error)
      if (/支付窗口|核验微信/.test(payError.value.detail)) await fetchOrder()
      toast(payError.value.title)
    }
  } finally {
    paying.value = false
  }
}

async function loadWalletBalance() {
  try {
    const overview = await getWalletOverview()
    walletBalance.value = overview.balance_diamonds
    walletLoadFailed.value = false
  } catch {
    walletLoadFailed.value = walletBalance.value === null
  }
  if (payMethod.value === 'balance' && walletBalance.value !== null && !balanceSufficient.value) {
    payMethod.value = 'wechat'
    toast('可用钻石不足，已切换为微信即时支付')
  }
}

function selectPayMethod(method: 'wechat' | 'balance') {
  if (paying.value) return
  if (isIOS && method === 'wechat') return
  if (method === 'balance' && !balanceSufficient.value) {
    if (walletBalance.value === null && walletLoadFailed.value) {
      toast('钻石余额加载失败，正在重试')
      void loadWalletBalance()
    } else if (walletBalance.value === null) {
      toast('钻石余额加载中，请稍候')
    } else {
      toast(isIOS ? `可用钻石不足，还差💎${diamond(balanceShortfall.value)}；iOS 端暂不支持充值，请更换设备支付或联系客服` : `可用钻石不足，还差💎${diamond(balanceShortfall.value)}；可先充值或使用微信即时支付`)
    }
    return
  }
  payMethod.value = method
}

async function payByBalance() {
  if (!orderNo.value || paying.value || cancelling.value || paymentConfirming.value) return
  if (!canStartPayment.value) {
    await fetchOrder()
    toast(serverConfirming.value ? '支付窗口已结束，系统正在核验微信结果' : '当前订单已不能继续支付')
    return
  }
  if (!balanceSufficient.value) {
    if (isIOS) {
      toast('可用钻石不足，iOS 端暂不支持充值，请更换设备支付或联系客服')
      return
    }
    payMethod.value = 'wechat'
    toast('可用钻石不足，请先充值或使用微信即时支付')
    return
  }
  const ok = await confirm(`确认使用💎${diamond(orderAmount.value)}支付吗？支付后可用钻石立即扣减。`, '钻石支付')
  if (!ok) return
  payError.value = null
  paying.value = true
  try {
    const result = await payOrderWithBalance(orderNo.value)
    walletBalance.value = result.balance_diamonds
    await fetchOrder()
    if (!isPaid.value) {
      enterConfirmationPending(result.payment_no || '')
      toast('钻石已扣除，订单状态正在确认，请稍候')
      return
    }
    success(isRenewal.value ? '续单支付完成，时长已合并' : '支付完成，等待陪玩开打')
  } catch (error) {
    toast(getErrorMessage(error, '钻石支付失败，请稍后重试'))
    void loadWalletBalance()
    await fetchOrder()
  } finally {
    paying.value = false
  }
}

function handlePay() {
  if (payMethod.value === 'balance') {
    void payByBalance()
    return
  }
  void payByWechat()
}

async function cancelMainOrder() {
  if (isRenewal.value || isPaid.value || !showPayPanel.value || cancelling.value) return
  const acceptedCount = Number(orderInfo.value?.players?.length || 0)
  const acceptedText = acceptedCount ? `当前已有${acceptedCount}位陪玩接单。` : ''
  const message = `${acceptedText}取消后订单不会扣除钻石，当前阵容会立即释放。确定取消吗？`
  if (!(await confirm(message, '取消订单'))) return

  cancelling.value = true
  try {
    await cancelOrder(orderNo.value, '老板在支付前主动取消')
    success('订单已取消，服务阵容已释放')
    relaunch('/pages/boss/home/index', { tab: 'home' })
  } catch (error) {
    toast(getErrorMessage(error, '取消订单失败'))
  } finally {
    cancelling.value = false
  }
}

async function cancelRenewalOrder() {
  if (!isRenewal.value || isPaid.value || cancelling.value || !canStartPayment.value) return
  if (!(await confirm('取消后本次续单不会增加服务时长，也不会扣除钻石，确定取消吗？', '取消续单'))) return
  cancelling.value = true
  try {
    await cancelOrder(orderNo.value)
    success('续单已取消')
    if (serviceOrderNo.value) replace('/pages/boss/in-progress/index', { orderNo: serviceOrderNo.value })
  } catch (error) {
    toast(getErrorMessage(error, '取消续单失败'))
  } finally {
    cancelling.value = false
  }
}

function copyErrorInfo() {
  if (!payError.value) return
  const text = [
    `订单号：${orderNo.value}`,
    `错误：${payError.value.title}`,
    `详情：${payError.value.detail}`,
    payError.value.code ? `错误编号：${payError.value.code}` : ''
  ].filter(Boolean).join('\n')
  uni.setClipboardData({ data: text, success: () => success('错误信息已复制') })
}

async function submitRatings() {
  const playerIds = selectedUnratedPlayerIds.value
  if (!playerIds.length) return toast('请至少给一位未评价的陪玩评分')
  ratingSubmitting.value = true
  try {
    for (const playerId of playerIds) {
      await ratePlayer(orderNo.value, playerId, ratings.value[playerId], ratingComment.value || null)
    }
    ratingComment.value = ''
    await fetchRatingStatus()
    success(allPlayersRated.value ? '本订单评价已全部完成' : '评价成功')
  } catch (error) {
    await fetchRatingStatus()
    const detail = getErrorMessage(error, '评价失败')
    toast(detail.includes('已评价') ? '评价状态已更新，该陪玩不能重复评价' : detail)
  } finally {
    ratingSubmitting.value = false
  }
}

function copyText(value: string) {
  if (!value) return
  uni.setClipboardData({ data: value, success: () => success('已复制') })
}

function goProgress() {
  if (!serviceOrderNo.value) return
  replace('/pages/boss/in-progress/index', { orderNo: serviceOrderNo.value })
}

function goReorder() {
  relaunch('/pages/boss/home/index', { tab: 'order' })
}

onLoad((query) => {
  orderNo.value = String(query?.orderNo || '')
  restorePendingPaymentState()
})
onShow(async () => {
  startClock()
  void loadWalletBalance()
  await fetchOrder()
  if (shouldPollPaymentStatus.value) scheduleConfirmationRefresh()
})
onUnload(() => {
  clearConfirmationTimer()
  stopClock()
})
</script>

<style lang="scss" src="./index.scss" scoped></style>
