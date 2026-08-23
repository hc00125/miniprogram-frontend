<template>
  <view class="recharge-page">
    <view class="balance-card">
      <text class="recharge-eyebrow">DIAMOND RECHARGE</text>
      <text class="recharge-title">钻石充值中心</text>
      <text class="recharge-subtitle">Android 1元=10钻石；iOS按渠道费率折算到账</text>
      <view class="balance-divider"></view>
      <text class="balance-label">当前可用钻石</text>
      <view v-if="overview || !overviewLoadFailed" class="balance-row">
        <text>💎</text><text>{{ diamonds(overview?.balance_diamonds || 0) }}</text>
      </view>
      <view v-else class="balance-row balance-row--error" @tap="loadData">
        <text>余额加载失败 · 点击重试</text>
      </view>
      <text class="secure-tip">微信官方小程序虚拟支付 · Android / iOS 均可充值</text>
    </view>

    <view v-if="rechargeConfirming" class="card confirming-card">
      <text class="section-title">微信付款确认中</text>
      <text class="section-desc">系统正在向微信核验入账，请勿重复支付。</text>
      <button class="primary-button" :disabled="confirmationRefreshing" @tap="refreshPendingRecharge(false)">
        {{ confirmationRefreshing ? '正在核验...' : '刷新入账状态' }}
      </button>
    </view>

    <view class="card package-card">
      <view class="card-head">
        <text>充值金额</text><text>{{ isIOS ? `iOS扣除${iosFeePercentText}%渠道费` : '1元 = 10钻石' }}</text>
      </view>

      <view v-if="quickAmounts.length" class="package-grid">
        <view
          v-for="item in quickAmounts"
          :key="item.id"
          class="package-item"
          :class="{ active: isQuickSelected(item) }"
          @tap="selectQuickAmount(item)"
        >
          <text class="package-diamonds">💎{{ diamonds(item.diamonds) }}</text>
          <text class="package-yuan">¥{{ yuan(item.pay_amount_yuan || item.amount) }}</text>
        </view>
      </view>

      <view class="custom-amount-block">
        <text class="custom-label">其他金额</text>
        <view class="amount-input-row" :class="{ invalid: amountTouched && amountError }">
          <text class="currency-symbol">¥</text>
          <input
            v-model="amountInput"
            class="amount-input"
            type="digit"
            maxlength="9"
            :placeholder="amountPlaceholder"
            @focus="amountTouched = true"
            @input="onAmountInput"
          />
        </view>
        <view class="amount-preview">
          <text v-if="amountError" class="amount-error">{{ amountError }}</text>
          <text v-else-if="validAmount !== null">预计到账 💎{{ diamonds(expectedDiamonds) }}</text>
          <text v-else>支持0.01元精度的自由金额充值</text>
        </view>
      </view>

      <view v-if="isIOS" class="ios-tip">
        <text class="ios-tip-title">iOS 已支持充值 · 到账钻石已扣渠道费</text>
        <text>iOS 使用微信官方 Apple 虚拟支付通道；当前按 {{ iosFeePercentText }}% 渠道费减少到账钻石。实付 ¥100 预计到账 💎{{ diamonds(iosHundredDiamonds) }}。</text>
      </view>
    </view>

    <view class="support-card" @tap="goCustomerService">
      <view class="support-icon">客</view>
      <view class="support-main">
        <text class="support-title">无法充值请联系客服</text>
        <text class="support-desc">微信已扣款但钻石未到账时，请勿重复充值。</text>
      </view>
      <text class="support-action">联系客服 ›</text>
    </view>

    <view v-if="payError && !rechargeConfirming" class="error-card">
      <text class="error-title">{{ payError.title }}</text>
      <text class="error-detail">{{ payError.detail }}</text>
      <view v-if="payError.code" class="error-code" @tap="copyErrorInfo">
        <text>错误编号</text><text>{{ payError.code }} · 复制</text>
      </view>
      <text class="error-action">{{ payError.action }}</text>
      <button class="error-support-button" @tap="goCustomerService">无法充值，联系客服</button>
    </view>

    <view class="card rules-card">
      <view class="card-head"><text>钻石规则</text><text>按渠道到账</text></view>
      <text>• Android/其他平台仍按人民币1元兑换10钻石；iOS按当前渠道费率扣减后折算到账。</text>
      <text v-if="isIOS">• 当前iOS渠道费率为 {{ iosFeePercentText }}%，具体费率以服务器配置和实际签约费率为准。</text>
      <text>• iOS 单笔最低充值1元；其他平台最低金额以页面提示为准。</text>
      <text>• 已有钻石可直接用于订单支付。</text>
      <text>• 微信已扣款但钻石未到账时请勿重复充值，先刷新入账状态。</text>
    </view>

    <view v-if="rechargeHistory.length" class="card history-card">
      <view class="card-head"><text>最近充值</text><text>服务器记录</text></view>
      <view v-for="item in rechargeHistory" :key="item.recharge_no" class="history-row">
        <view class="history-main">
          <text class="history-diamonds">+💎{{ diamonds(item.diamonds) }}</text>
          <text class="history-time">{{ dateTime(item.created_at) }}</text>
        </view>
        <view class="history-right">
          <text>实付 ¥{{ yuan(item.pay_amount_yuan || item.amount) }}</text>
          <text :class="`history-status history-status--${item.status}`">{{ rechargeStatusText(item) }}</text>
          <view v-if="item.status === 'paying'" class="history-actions">
            <button class="mini-button mini-button--continue" :disabled="actionRechargeNo === item.recharge_no" @tap.stop="continueRecharge(item)">
              继续支付
            </button>
            <button class="mini-button mini-button--cancel" :disabled="actionRechargeNo === item.recharge_no" @tap.stop="cancelPendingRecharge(item)">
              取消充值
            </button>
          </view>
        </view>
      </view>
    </view>

    <view class="pay-bar">
      <button class="primary-button pay-button" :disabled="paying || rechargeConfirming || validAmount === null" @tap="payRecharge">
        {{ payButtonText }}
      </button>
      <text class="pay-support-link" @tap="goCustomerService">无法充值请联系客服</text>
      <button v-if="isDev" class="mock-button" :disabled="paying || mocking || rechargeConfirming || validAmount === null" @tap="mockRecharge">
        {{ mocking ? '模拟充值中...' : '模拟充值成功（仅开发环境）' }}
      </button>
    </view>

    <view v-if="loading" class="loading-state">钻石充值信息加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import {
  cancelRecharge,
  createRecharge,
  getRechargeOrders,
  getRechargePackages,
  getWalletOverview,
  mockRechargeSuccess,
  queryRecharge,
  type RechargeConfig,
  type RechargePackage,
  type RechargeQueryResult,
  type WalletOverview
} from '@/api/wallet'
import { formatDiamonds, formatYuan } from '@/utils/diamonds'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { back, go, replace } from '@/utils/nav'
import { isVirtualPaymentConfirmationPending, requestWechatVirtualPayment } from '@/utils/virtual-payment'

type PayErrorState = { title: string; detail: string; action: string; code: string }
type PendingRechargeState = { rechargeNo: string; createdAt: number }

const RECHARGE_PENDING_STORAGE_KEY = 'wallet_recharge_pending'
const RECHARGE_EXPIRE_MS = 10 * 60 * 1000
const DEFAULT_DIAMONDS_PER_YUAN = 10

const overview = ref<WalletOverview | null>(null)
const overviewLoadFailed = ref(false)
const rechargeConfig = ref<RechargeConfig | null>(null)
const quickAmounts = ref<RechargePackage[]>([])
const rechargeHistory = ref<RechargeQueryResult[]>([])
const amountInput = ref('30')
const amountTouched = ref(false)
const loading = ref(true)
const paying = ref(false)
const mocking = ref(false)
const payError = ref<PayErrorState | null>(null)
const rechargeConfirming = ref(false)
const pendingRechargeNo = ref('')
const confirmationRefreshing = ref(false)
const actionRechargeNo = ref('')
let confirmationTimer: ReturnType<typeof setTimeout> | null = null
let pageAlive = true

const isDev = Boolean(import.meta.env.DEV)
const isIOS = computed(() => rechargeConfig.value?.client_platform === 'ios')
const diamondsPerYuan = computed(() => Number(rechargeConfig.value?.diamonds_per_yuan || overview.value?.diamonds_per_yuan || DEFAULT_DIAMONDS_PER_YUAN))
const iosFeePercent = computed(() => Math.max(0, Math.min(100, Number(rechargeConfig.value?.platform_fee_percent || 0))))
const iosFeePercentText = computed(() => {
  const value = iosFeePercent.value
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
})
const creditMultiplier = computed(() => isIOS.value ? Math.max(0, 1 - iosFeePercent.value / 100) : 1)
const minAmount = computed(() => Number(rechargeConfig.value?.min_amount_yuan || (isIOS.value ? 1 : 0.01)))
const maxAmount = computed(() => Number(rechargeConfig.value?.max_amount_yuan || 5000))
const amountPlaceholder = computed(() => `${minAmount.value.toFixed(2)} - ${maxAmount.value.toFixed(2)}元`)

function expectedDiamondsForAmount(amount: number) {
  const value = amount * diamondsPerYuan.value * creditMultiplier.value
  return Math.round(value * 10) / 10
}

function parseAmount(value: string) {
  const text = String(value || '').trim()
  if (!/^\d+(?:\.\d{0,2})?$/.test(text)) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

const amountError = computed(() => {
  if (!String(amountInput.value || '').trim()) return '请输入充值金额'
  const amount = parseAmount(amountInput.value)
  if (amount === null) return '金额格式不正确，最多保留2位小数'
  if (amount < minAmount.value) return `单笔最低充值 ¥${yuan(minAmount.value)}`
  if (amount > maxAmount.value) return `单笔最高充值 ¥${yuan(maxAmount.value)}`
  return ''
})

const validAmount = computed<number | null>(() => {
  if (amountError.value) return null
  return parseAmount(amountInput.value)
})
const expectedDiamonds = computed(() => {
  if (validAmount.value === null) return 0
  return expectedDiamondsForAmount(validAmount.value)
})
const iosHundredDiamonds = computed(() => expectedDiamondsForAmount(100))
const payButtonText = computed(() => {
  if (paying.value) return '正在拉起微信虚拟支付...'
  if (rechargeConfirming.value) return '上一笔充值确认入账中'
  if (validAmount.value === null) return amountError.value || '请输入充值金额'
  return `立即支付 ¥${yuan(validAmount.value)} · 获得 💎${diamonds(expectedDiamonds.value)}`
})

function diamonds(value: unknown) {
  try { return formatDiamonds(value ?? 0) } catch { return '--' }
}

function yuan(value: number | string | null | undefined) {
  return formatYuan(value)
}

function isQuickSelected(item: RechargePackage) {
  const current = validAmount.value
  return current !== null && Math.abs(current - Number(item.pay_amount_yuan || item.amount || 0)) < 1e-8
}

function selectQuickAmount(item: RechargePackage) {
  amountTouched.value = true
  amountInput.value = String(Number(item.pay_amount_yuan || item.amount || 0))
  payError.value = null
}

function onAmountInput() {
  amountTouched.value = true
  payError.value = null
}

function goCustomerService() {
  go('/pages/client/customer-service/index')
}

function dateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function isRechargeExpired(item: RechargeQueryResult) {
  const deadline = item.expires_at
    ? new Date(item.expires_at).getTime()
    : new Date(item.created_at || 0).getTime() + RECHARGE_EXPIRE_MS
  return Number.isFinite(deadline) && deadline > 0 && deadline <= Date.now()
}

function rechargeStatusText(item: RechargeQueryResult) {
  if (item.status === 'paying' && isRechargeExpired(item)) return '支付超时'
  const labels: Record<string, string> = {
    created: '已创建', paying: '支付中', paid: '已付款', credited: '已到账', closed: '已关闭', failed: '失败'
  }
  return labels[item.status] || item.status || '未知'
}

function extractCode(error: any) {
  return String(error?.error_id || error?.reference_id || error?.wechat_code || error?.errCode || error?.code || error?.statusCode || '')
}

function classifyRechargeError(error: any): PayErrorState {
  const detail = getErrorMessage(error, '钻石充值失败，请稍后重试')
  const code = extractCode(error)
  const text = `${detail} ${error?.errMsg || ''}`.toLowerCase()
  if (/40163|code\s*been\s*used|登录凭证/.test(text) || code === '40163') {
    return { title: '微信登录凭证刷新失败', detail, action: '请关闭小程序后重新进入；系统不会重复扣款。', code }
  }
  if (/沙箱|正式环境|apple/.test(text)) return { title: 'iOS支付环境未就绪', detail, action: 'iOS需要使用微信虚拟支付正式环境，请联系管理员。', code }
  if (/金额|价格|不一致|price|fee|0\.01/.test(text)) return { title: '充值金额校验未通过', detail, action: '请修改充值金额后重试。', code }
  if (/openid|session|jscode/.test(text)) return { title: '微信登录态已失效', detail, action: '请关闭并重新进入小程序。', code }
  if (Number(error?.statusCode) >= 500) return { title: '支付服务暂时异常', detail, action: '请稍后重试并保留错误编号。', code }
  return { title: '充值未完成', detail, action: '若微信已扣款，请勿重复充值，先刷新入账状态。', code }
}

function copyErrorInfo() {
  if (!payError.value) return
  const text = [`错误：${payError.value.title}`, `详情：${payError.value.detail}`, payError.value.code ? `错误编号：${payError.value.code}` : ''].filter(Boolean).join('\n')
  uni.setClipboardData({ data: text, success: () => success('错误信息已复制') })
}

function clearConfirmationTimer() {
  if (confirmationTimer) clearTimeout(confirmationTimer)
  confirmationTimer = null
}

function scheduleConfirmationRefresh() {
  clearConfirmationTimer()
  if (pageAlive && rechargeConfirming.value) {
    confirmationTimer = setTimeout(() => { void refreshPendingRecharge(true) }, 2500)
  }
}

function enterConfirmationPending(rechargeNo: string) {
  if (!rechargeNo) return
  rechargeConfirming.value = true
  pendingRechargeNo.value = rechargeNo
  payError.value = null
  const state: PendingRechargeState = { rechargeNo, createdAt: Date.now() }
  uni.setStorageSync(RECHARGE_PENDING_STORAGE_KEY, state)
  scheduleConfirmationRefresh()
}

function clearPendingRecharge() {
  clearConfirmationTimer()
  rechargeConfirming.value = false
  pendingRechargeNo.value = ''
  uni.removeStorageSync(RECHARGE_PENDING_STORAGE_KEY)
}

function restorePendingRecharge() {
  const stored = uni.getStorageSync(RECHARGE_PENDING_STORAGE_KEY) as PendingRechargeState | ''
  if (!stored?.rechargeNo) return
  rechargeConfirming.value = true
  pendingRechargeNo.value = stored.rechargeNo
}

async function closeExpiredRechargeOrders(items: RechargeQueryResult[]) {
  const stale = items.filter(item => item.status === 'paying' && isRechargeExpired(item))
  if (!stale.length) return false
  await Promise.allSettled(stale.map(item => cancelRecharge(item.recharge_no)))
  return true
}

async function loadData() {
  loading.value = true
  try {
    const [overviewResult, configResult, historyResult] = await Promise.allSettled([
      getWalletOverview(), getRechargePackages(), getRechargeOrders(1, 8)
    ])
    if (overviewResult.status === 'fulfilled') {
      overview.value = overviewResult.value
      overviewLoadFailed.value = false
    } else {
      overviewLoadFailed.value = overview.value === null
    }
    if (configResult.status === 'fulfilled') {
      rechargeConfig.value = configResult.value
      quickAmounts.value = configResult.value.results || []
      if (!amountTouched.value && quickAmounts.value.length) {
        const preferred = quickAmounts.value.find(item => Number(item.pay_amount_yuan || item.amount || 0) === 30) || quickAmounts.value[0]
        amountInput.value = String(Number(preferred.pay_amount_yuan || preferred.amount || minAmount.value))
      }
    }
    if (historyResult.status === 'fulfilled') {
      let results = historyResult.value.results || []
      if (await closeExpiredRechargeOrders(results)) {
        results = (await getRechargeOrders(1, 8)).results || []
      }
      rechargeHistory.value = results
    }
  } finally {
    loading.value = false
  }
}

async function refreshPendingRecharge(silent = false) {
  if (!pendingRechargeNo.value || confirmationRefreshing.value) return
  confirmationRefreshing.value = true
  try {
    const result = await queryRecharge(pendingRechargeNo.value)
    if (result.status === 'credited') {
      clearPendingRecharge()
      await loadData()
      success(`充值成功，💎${diamonds(result.diamonds)}已到账`)
      return
    }
    if (result.status === 'closed' || result.status === 'failed') {
      clearPendingRecharge()
      await loadData()
      toast('本次充值未完成')
      return
    }
    if (!silent) toast(result.status === 'paid' ? '已确认付款，钻石正在入账' : '充值仍在确认中')
  } catch (error) {
    if (!silent) toast(getErrorMessage(error, '充值状态查询失败'))
  } finally {
    confirmationRefreshing.value = false
    scheduleConfirmationRefresh()
  }
}

async function startRecharge(amount: number) {
  if (paying.value || rechargeConfirming.value) return
  payError.value = null
  paying.value = true
  let currentRechargeNo = ''
  try {
    const payParams = await createRecharge(amount)
    currentRechargeNo = payParams.recharge_no || payParams.payment_no || ''
    if (payParams.mock === true || !payParams.signData) {
      const ok = await confirm('当前为模拟支付模式，不产生真实扣款。是否继续？', '模拟支付')
      if (ok) await runMockRechargeFlow(currentRechargeNo)
      return
    }
    await requestWechatVirtualPayment(payParams, { query: queryRecharge })
    clearPendingRecharge()
    await loadData()
    success(`充值成功，💎${diamonds(payParams.diamonds)}已到账`)
    setTimeout(() => getCurrentPages().length > 1 ? back() : replace('/pages/client/wallet/index'), 900)
  } catch (error: any) {
    const errCode = Number(error?.errCode)
    if (isVirtualPaymentConfirmationPending(error)) {
      enterConfirmationPending(String(error?.paymentNo || currentRechargeNo || ''))
      toast('微信付款已完成，钻石正在入账')
    } else if (errCode === -2 || /cancel/i.test(String(error?.errMsg || ''))) {
      await loadData()
      toast('已取消微信收银台，可在充值记录中继续或取消')
    } else {
      payError.value = classifyRechargeError(error)
      toast(payError.value.title)
    }
  } finally {
    paying.value = false
  }
}

async function payRecharge() {
  amountTouched.value = true
  if (validAmount.value === null) return toast(amountError.value || '请输入正确的充值金额')
  await startRecharge(validAmount.value)
}

async function continueRecharge(item: RechargeQueryResult) {
  const amount = Number(item.pay_amount_yuan || item.amount || 0)
  if (!Number.isFinite(amount) || amount <= 0) return toast('旧充值金额异常，请取消后重新充值')
  amountInput.value = String(amount)
  amountTouched.value = true
  await startRecharge(amount)
}

async function cancelPendingRecharge(item: RechargeQueryResult) {
  const ok = await confirm('确认取消这笔未完成充值吗？微信已付款的订单不会被取消。', '取消充值')
  if (!ok) return
  actionRechargeNo.value = item.recharge_no
  try {
    const result = await cancelRecharge(item.recharge_no)
    if (pendingRechargeNo.value === item.recharge_no) clearPendingRecharge()
    await loadData()
    result.status === 'closed' ? success('充值已取消') : toast(rechargeStatusText(result))
  } catch (error) {
    toast(getErrorMessage(error, '取消充值失败'))
  } finally {
    actionRechargeNo.value = ''
  }
}

async function runMockRechargeFlow(rechargeNo: string) {
  const result = await mockRechargeSuccess(rechargeNo)
  await loadData()
  result.status === 'credited' || result.status === 'paid'
    ? success(`模拟充值成功，💎${diamonds(result.diamonds)}已到账`)
    : toast(`模拟充值状态：${result.status || '未知'}`)
}

async function mockRecharge() {
  if (!isDev || validAmount.value === null || mocking.value) return
  mocking.value = true
  try {
    const payParams = await createRecharge(validAmount.value)
    await runMockRechargeFlow(payParams.recharge_no || payParams.payment_no || '')
  } catch (error) {
    toast(getErrorMessage(error, '模拟充值失败'))
  } finally {
    mocking.value = false
  }
}

onLoad(() => { pageAlive = true; restorePendingRecharge() })
onShow(async () => { await loadData(); if (rechargeConfirming.value) void refreshPendingRecharge(true) })
onUnload(() => { pageAlive = false; clearConfirmationTimer() })
</script>

<style lang="scss" scoped>
.recharge-page { min-height: 100vh; padding: 24rpx 24rpx 70rpx; box-sizing: border-box; color: #172116; background: radial-gradient(circle at 8% 0%, rgba(216,161,68,.14), transparent 30%), #f7f3ea; }
.card, .balance-card, .error-card, .support-card { margin-bottom: 20rpx; padding: 26rpx; border-radius: 28rpx; background: #fff; box-shadow: 0 14rpx 34rpx rgba(39,61,42,.06); }
.balance-card { color: #fff; text-align: center; background: linear-gradient(135deg, #173426, #1f7c4b 62%, #45ae72); }
.recharge-eyebrow, .recharge-title, .recharge-subtitle, .balance-label, .secure-tip { display: block; }
.recharge-eyebrow { color: rgba(255,255,255,.68); font-size: 20rpx; font-weight: 900; letter-spacing: 2rpx; }
.recharge-title { margin-top: 8rpx; font-size: 42rpx; font-weight: 900; }
.recharge-subtitle { margin-top: 8rpx; color: rgba(255,255,255,.78); font-size: 22rpx; line-height: 1.5; }
.balance-divider { height: 1rpx; margin: 22rpx 0; background: rgba(255,255,255,.16); }
.balance-label, .secure-tip { color: rgba(255,255,255,.78); font-size: 23rpx; }
.balance-row { display: flex; justify-content: center; align-items: baseline; gap: 8rpx; margin: 14rpx 0 22rpx; }
.balance-row text:first-child { font-size: 36rpx; }.balance-row text:last-child { font-size: 72rpx; font-weight: 900; }
.balance-row--error text { font-size: 28rpx !important; text-decoration: underline; }
.package-card { border: 2rpx solid rgba(31,124,75,.08); }
.card-head { display: flex; justify-content: space-between; gap: 16rpx; margin-bottom: 18rpx; }
.card-head text:first-child, .section-title { font-size: 30rpx; font-weight: 900; }.card-head text:last-child { color: #1f7c4b; font-size: 22rpx; font-weight: 800; }
.section-desc { display: block; margin-top: 10rpx; color: #687665; font-size: 23rpx; }
.package-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.package-item { padding: 28rpx 8rpx 24rpx; border: 3rpx solid rgba(39,61,42,.08); border-radius: 22rpx; text-align: center; background: #f7faf4; }
.package-item.active { border-color: #1f9c51; background: #e9f8ef; box-shadow: 0 8rpx 20rpx rgba(31,156,81,.12); }.package-diamonds { display: block; font-size: 32rpx; font-weight: 900; }.package-yuan { display: block; margin-top: 10rpx; color: #687665; font-size: 23rpx; font-weight: 700; }
.custom-amount-block { margin-top: 24rpx; padding-top: 22rpx; border-top: 1rpx solid rgba(39,61,42,.08); }.custom-label { display: block; margin-bottom: 12rpx; color: #4c5b49; font-size: 24rpx; font-weight: 900; }
.amount-input-row { display: flex; align-items: center; height: 96rpx; padding: 0 24rpx; border: 3rpx solid rgba(31,124,75,.16); border-radius: 22rpx; background: #fbfdf9; }.amount-input-row:focus-within { border-color: #1f9c51; box-shadow: 0 0 0 6rpx rgba(31,156,81,.07); }.amount-input-row.invalid { border-color: rgba(177,54,44,.55); background: #fff8f6; }.currency-symbol { margin-right: 12rpx; color: #1f7c4b; font-size: 38rpx; font-weight: 900; }.amount-input { flex: 1; height: 96rpx; color: #172116; font-size: 42rpx; font-weight: 900; }.amount-preview { min-height: 36rpx; padding-top: 10rpx; color: #1f7c4b; font-size: 22rpx; font-weight: 800; }.amount-error { color: #a13d35; }
.ios-tip { margin-top: 20rpx; padding: 18rpx 20rpx; border-radius: 18rpx; background: #f0f5ff; color: #50627b; font-size: 21rpx; line-height: 1.55; }.ios-tip text { display: block; }.ios-tip-title { margin-bottom: 4rpx; color: #355070; font-size: 23rpx; font-weight: 900; }
.support-card { display: flex; align-items: center; gap: 16rpx; border: 2rpx solid rgba(216,161,68,.22); background: #fff8e7; }
.support-icon { width: 64rpx; height: 64rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 20rpx; color: #fff; font-size: 24rpx; font-weight: 900; background: #a87520; }
.support-main { flex: 1; min-width: 0; }.support-title, .support-desc { display: block; }.support-title { color: #6f4c12; font-size: 27rpx; font-weight: 900; }.support-desc { margin-top: 5rpx; color: #8b7750; font-size: 20rpx; line-height: 1.45; }.support-action { flex-shrink: 0; color: #1f7c4b; font-size: 22rpx; font-weight: 900; }
.rules-card > text { display: block; padding: 7rpx 0; color: #687665; font-size: 22rpx; line-height: 1.55; }
.history-row { display: flex; justify-content: space-between; gap: 20rpx; padding: 20rpx 0; border-top: 1rpx solid rgba(39,61,42,.07); }.history-row:first-of-type { border-top: 0; }
.history-main text, .history-right > text { display: block; }.history-diamonds { color: #1f7c4b; font-size: 27rpx; font-weight: 900; }.history-time { margin-top: 7rpx; color: #9aa197; font-size: 20rpx; }
.history-right { flex: 1; text-align: right; color: #687665; font-size: 21rpx; }.history-status { margin-top: 7rpx; font-weight: 900; }.history-status--credited { color: #1f7c4b; }.history-status--closed, .history-status--failed { color: #a13d35; }
.history-actions { display: flex; justify-content: flex-end; gap: 10rpx; margin-top: 12rpx; }.mini-button { min-width: 116rpx; height: 54rpx; margin: 0; padding: 0 14rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 800; line-height: 54rpx; }.mini-button::after { border: none; }.mini-button--continue { color: #fff; background: #1f9c51; }.mini-button--cancel { color: #a13d35; background: #fff0ee; }
.error-card { border: 1rpx solid rgba(196,50,50,.17); background: #fff6f4; }.error-title, .error-detail, .error-action { display: block; }.error-title { color: #8f2929; font-size: 28rpx; font-weight: 900; }.error-detail, .error-action { margin-top: 10rpx; color: #7c514d; font-size: 22rpx; line-height: 1.5; }.error-code { display: flex; justify-content: space-between; margin-top: 16rpx; padding: 15rpx; border-radius: 16rpx; color: #8f2929; background: rgba(196,50,50,.07); }
.error-support-button { width: 100%; height: 68rpx; margin-top: 18rpx; border-radius: 999rpx; color: #8f2929; font-size: 23rpx; font-weight: 900; background: #ffe8e3; }.error-support-button::after { border: none; }
.primary-button { width: 100%; min-height: 88rpx; margin-top: 20rpx; border-radius: 999rpx; color: #fff; font-size: 27rpx; font-weight: 900; background: linear-gradient(135deg, #2fbd68, #15934c); }.primary-button::after, .mock-button::after { border: none; }.primary-button[disabled], .mock-button[disabled], .mini-button[disabled] { opacity: .55; }
.pay-button { min-height: 96rpx; box-shadow: 0 12rpx 28rpx rgba(21,147,76,.22); }
.pay-support-link { display: block; padding: 18rpx 0 2rpx; color: #a87520; text-align: center; font-size: 22rpx; font-weight: 900; text-decoration: underline; }
.mock-button { width: 100%; height: 72rpx; margin-top: 14rpx; border-radius: 999rpx; color: #a87520; font-size: 24rpx; background: #fff6df; }.loading-state { display: block; padding: 40rpx 20rpx; color: #8a9286; text-align: center; font-size: 23rpx; }
</style>