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
      <view class="amount-row"><text>¥</text><text>{{ amountCardValue }}</text></view>
      <text v-if="showRenewalSummary" class="amount-breakdown">
        主订单 ¥{{ mainOrderAmount }} · 续单 ¥{{ renewalPaidAmount }}
      </text>
      <view class="secure-tip"><text>盾</text><text>微信官方小程序虚拟支付</text></view>
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
        <view class="info-row total-row"><text>续单金额</text><text>¥{{ orderAmount }}</text></view>
      </template>
      <template v-else>
        <view v-if="orderInfo.booked_hours" class="info-row"><text>{{ showRenewalSummary ? '原预订时长' : '预订时长' }}</text><text>{{ originalBookedHours }}</text></view>
        <view v-if="showRenewalSummary" class="info-row"><text>续单时长</text><text>{{ renewalBookedHours }}</text></view>
        <view v-if="showRenewalSummary" class="info-row emphasis-row"><text>累计购买时长</text><text>{{ totalBookedHours }}</text></view>
        <view v-if="orderInfo.duration_minutes" class="info-row"><text>实际服务</text><text>{{ Math.floor(orderInfo.duration_minutes / 60) }}小时 {{ orderInfo.duration_minutes % 60 }}分钟</text></view>
        <view v-if="showRenewalSummary" class="info-row"><text>主订单金额</text><text>¥{{ mainOrderAmount }}</text></view>
        <view v-if="showRenewalSummary" class="info-row"><text>续单金额</text><text>¥{{ renewalPaidAmount }}</text></view>
        <view class="info-row total-row"><text>{{ showRenewalSummary ? '累计金额' : '订单总额' }}</text><text>¥{{ amountCardValue }}</text></view>
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
          <view><text>支付金额</text><text>¥{{ money(item.total_amount) }}</text></view>
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

    <view v-if="payError" class="pay-error-card">
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
        <button class="retry-button" :disabled="paying" @tap="payByWechat">{{ paying ? '重试中...' : '重新尝试' }}</button>
      </view>
    </view>

    <view v-if="showPayPanel" class="card virtual-pay-card">
      <view class="virtual-head">
        <view class="wechat-icon">微</view>
        <view>
          <text>微信虚拟支付</text>
          <text>{{ isRenewal ? '续单独立付款 · 成功后自动合并时长' : '队伍已就位 · 可付款或取消订单' }}</text>
        </view>
      </view>
      <view class="virtual-notice">
        <text></text>
        <text>{{ payNotice }}</text>
      </view>
      <button class="pay-button" :disabled="paying || cancelling" @tap="payByWechat">
        {{ paying ? '正在拉起虚拟支付...' : `微信虚拟支付 ¥${orderAmount}` }}
      </button>
      <button v-if="isRenewal" class="cancel-renewal-button" :disabled="paying || cancelling" @tap="cancelRenewalOrder">
        {{ cancelling ? '正在取消续单...' : '取消本次续单' }}
      </button>
      <button v-else class="cancel-renewal-button" :disabled="paying || cancelling" @tap="cancelMainOrder">
        {{ cancelling ? '正在取消订单...' : '取消订单' }}
      </button>
      <text class="pay-help">未支付订单可以取消；支付成功后需联系客服按退款流程处理。</text>
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
import { onLoad, onShow } from '@dcloudio/uni-app'
import { cancelOrder, getOrder, getOrderRatings, ratePlayer, type OrderRatingRecord } from '@/api/boss'
import { createMiniProgramPayment } from '@/api/pay'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { relaunch, replace } from '@/utils/nav'
import { requestWechatVirtualPayment } from '@/utils/virtual-payment'

type PayErrorState = {
  title: string
  detail: string
  action: string
  code: string
}

const orderNo = ref('')
const orderInfo = ref<any>(null)
const loading = ref(true)
const loadError = ref('')
const paying = ref(false)
const cancelling = ref(false)
const payError = ref<PayErrorState | null>(null)
const ratings = ref<Record<number, number>>({})
const existingRatings = ref<Record<number, OrderRatingRecord>>({})
const ratingComment = ref('')
const ratingSubmitting = ref(false)

const isPaid = computed(() => Boolean(orderInfo.value?.paid))
const isRenewal = computed(() => orderInfo.value?.order_type === 'renewal')
const isCompleted = computed(() => orderInfo.value?.status === '已完成')
const showPayPanel = computed(() => Boolean(orderInfo.value && orderInfo.value.status === '待支付' && !orderInfo.value.paid))
const showProgressButton = computed(() => isRenewal.value ? isPaid.value : ['待开打', '进行中'].includes(orderInfo.value?.status))
const serviceOrderNo = computed(() => isRenewal.value ? orderInfo.value?.parent_order_no : orderNo.value)
const orderAmount = computed(() => money(orderInfo.value?.total_amount || orderInfo.value?.total_price_per_hour || 0))
const mainOrderAmount = computed(() => money(orderInfo.value?.total_amount || orderInfo.value?.total_price_per_hour || 0))
const renewalPaidAmount = computed(() => money(isRenewal.value ? 0 : orderInfo.value?.renewal_paid_amount || 0))
const paidRenewals = computed(() => (orderInfo.value?.renewals || []).filter((item: any) => item.paid && item.status === '已完成'))
const showRenewalSummary = computed(() => !isRenewal.value && Number(orderInfo.value?.renewal_paid_amount || 0) > 0)
const cumulativePaidAmount = computed(() => money(Number(mainOrderAmount.value) + Number(renewalPaidAmount.value)))
const amountCardValue = computed(() => isRenewal.value ? orderAmount.value : (isPaid.value ? cumulativePaidAmount.value : orderAmount.value))
const amountCardLabel = computed(() => {
  if (!isPaid.value) return '待支付金额'
  if (showRenewalSummary.value) return '累计已支付'
  return '已支付金额'
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
const payNotice = computed(() => isRenewal.value
  ? `本次续单增加${formatHours(orderInfo.value?.booked_hours || 0)}。付款成功后会自动合并到原订单，陪玩阵容和房间号保持不变。`
  : '支付前会核对微信道具、规格和订单金额。付款成功后订单进入“待开打”；付款前仍可取消并释放当前服务阵容。')
const payStatusText = computed(() => {
  if (!orderInfo.value) return '加载中'
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
  if (isRenewal.value) return isPaid.value ? '续单支付完成' : '续单已创建，请完成付款'
  if (orderInfo.value.status === '待支付') return '队伍已就位，请付款或取消订单'
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
  return '微信服务器已确认付款，请等待陪玩填写房间号并开打'
})

function money(value: number | string | null | undefined) {
  return Number(value || 0).toFixed(2)
}

function formatHours(value: number) {
  const hours = Number(value || 0)
  return Number.isInteger(hours) ? `${hours}小时` : `${hours.toFixed(1)}小时`
}

function formatRenewalTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
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
  const detail = getErrorMessage(error, '虚拟支付失败，请稍后重试')
  const code = extractCode(error)
  const text = `${detail} ${error?.errMsg || ''}`.toLowerCase()

  if (/未绑定|绑定微信虚拟支付道具|product/.test(text)) return { title: '商品暂不可支付', detail, action: '请联系管理员为当前商品规格绑定正确的微信虚拟道具。', code }
  if (/金额|价格|不一致|price|fee/.test(text)) return { title: '订单金额校验未通过', detail, action: '请确认订单仅包含一个固定价格规格，且没有额外加价或动态计费。', code }
  if (/openid|登录态|session|重新登录|jscode/.test(text)) return { title: '微信登录态已失效', detail, action: '请返回个人中心重新登录微信账号，然后再次进入订单支付页。', code }
  if (/appkey|offer|配置|configuration/.test(text)) return { title: '支付配置异常', detail, action: '请管理员检查AppKey、OfferID和虚拟支付环境配置。', code }
  if (/尚未审核|道具状态|15010|15011|15013/.test(text)) return { title: '微信道具暂不可用', detail, action: '请确认虚拟道具已发布，并使用正确的小程序版本和支付环境。', code }
  if (Number(error?.statusCode) >= 500 || /内部错误|请求失败（500）/.test(text)) return { title: '支付服务暂时异常', detail, action: '请稍后重试；如持续出现，请把错误编号提供给管理员查询服务器日志。', code }
  return { title: '虚拟支付未完成', detail, action: '请检查网络后重试；若微信已扣款，请不要重复支付，先刷新订单状态。', code }
}

async function fetchOrder() {
  if (!orderNo.value) return
  loading.value = true
  loadError.value = ''
  try {
    orderInfo.value = await getOrder(orderNo.value)
    if (isPaid.value) payError.value = null
    await fetchRatingStatus()
  } catch (error) {
    loadError.value = getErrorMessage(error, '订单加载失败')
  } finally {
    loading.value = false
  }
}

async function payByWechat() {
  if (!orderNo.value || paying.value || cancelling.value) return
  payError.value = null
  paying.value = true
  try {
    const loginResult: any = await new Promise((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    if (!loginResult?.code) throw new Error('微信登录态获取失败，请重新进入小程序')
    const payParams = await createMiniProgramPayment(orderNo.value, loginResult.code)
    await requestWechatVirtualPayment(payParams)
    await fetchOrder()
    success(isRenewal.value ? '续单支付完成，时长已合并' : '支付完成，等待陪玩开打')
  } catch (error: any) {
    const errCode = Number(error?.errCode)
    if (errCode === -2 || /cancel/i.test(String(error?.errMsg || ''))) {
      toast('已取消支付')
    } else {
      payError.value = classifyPayError(error)
      toast(payError.value.title)
    }
  } finally {
    paying.value = false
  }
}

async function cancelMainOrder() {
  if (isRenewal.value || isPaid.value || !showPayPanel.value || cancelling.value) return
  const acceptedCount = Number(orderInfo.value?.players?.length || 0)
  const acceptedText = acceptedCount ? `当前已有${acceptedCount}位陪玩接单。` : ''
  const message = `${acceptedText}取消后订单不会扣款，当前阵容会立即释放。确定取消吗？`
  if (!(await confirm(message, '取消订单'))) return

  cancelling.value = true
  try {
    // 普通主订单在付款前允许取消；后端负责停止入房倒计时并释放已接单陪玩。
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
  if (!isRenewal.value || isPaid.value || cancelling.value) return
  if (!(await confirm('取消后本次续单不会增加服务时长，确定取消吗？', '取消续单'))) return
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

onLoad((query) => { orderNo.value = String(query?.orderNo || '') })
onShow(fetchOrder)
</script>

<style lang="scss" src="./index.scss" scoped></style>
