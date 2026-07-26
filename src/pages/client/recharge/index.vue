<template>
  <view class="recharge-page">
    <view class="balance-card">
      <text class="balance-label">当前钱包余额</text>
      <view v-if="overview || !overviewLoadFailed" class="balance-row"><text>¥</text><text>{{ balanceText }}</text></view>
      <view v-else class="balance-row balance-row--error" @tap="retryOverview"><text>余额加载失败 · 点击重试</text></view>
      <view class="secure-tip"><text>盾</text><text>微信官方小程序虚拟支付 · 实时到账</text></view>
    </view>

    <view v-if="rechargeConfirming" class="card confirming-card">
      <view class="confirming-head">
        <view class="confirming-icon">✓</view>
        <view>
          <text>微信付款已完成</text>
          <text>充值正在入账确认，请勿重复支付</text>
        </view>
      </view>
      <view class="confirming-notice">
        <text></text>
        <text>微信收银台已经返回成功，系统会持续向服务器核验入账状态。确认到账前请不要再次发起充值。</text>
      </view>
      <button class="pay-button" :disabled="confirmationRefreshing" @tap="refreshPendingRecharge(false)">
        {{ confirmationRefreshing ? '正在核验入账结果...' : '刷新入账状态' }}
      </button>
      <text class="pay-help">通常几十秒内即可到账；也可以稍后回到钱包页查看余额。</text>
    </view>

    <view class="card packages-card">
      <view class="card-head"><text>选择充值金额</text><text>固定档位 · 无赠送</text></view>
      <view v-if="packages.length" class="package-grid">
        <view
          v-for="item in packages"
          :key="item.id"
          class="package-item"
          :class="{ active: selectedId === item.id }"
          @tap="selectedId = item.id"
        >
          <view class="package-amount"><text>¥</text><text>{{ packageAmountText(item.amount) }}</text></view>
          <text class="package-sub">到账 ¥{{ money(item.amount) }}</text>
        </view>
      </view>
      <view v-else-if="!loading" class="empty-tip">暂无可用充值档位，请稍后再试或联系客服。</view>
    </view>

    <view v-if="payError && !rechargeConfirming" class="pay-error-card">
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
    </view>

    <view class="card notice-card">
      <view class="card-head"><text>充值说明</text><text></text></view>
      <view class="notice-line"><text></text><text>充值成功后余额实时到账，可用于支付陪玩订单。</text></view>
      <view class="notice-line"><text></text><text>充值金额不支持退款、提现；订单退款时按原路退回余额。</text></view>
      <view class="notice-line"><text></text><text>如遇支付成功但余额未到账，请勿重复充值，稍后刷新或联系客服。</text></view>
    </view>

    <view class="pay-bar">
      <button
        class="pay-button"
        :disabled="paying || mocking || rechargeConfirming || !selectedPackage"
        @tap="payRecharge"
      >
        {{ payButtonText }}
      </button>
      <button v-if="isDev" class="mock-button" :disabled="paying || mocking || rechargeConfirming || !selectedPackage" @tap="mockRecharge">
        {{ mocking ? '模拟充值中...' : '模拟充值成功（仅开发环境）' }}
      </button>
    </view>

    <view v-if="loading" class="loading-state">充值信息加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import {
  createRecharge,
  getRechargePackages,
  getWalletOverview,
  mockRechargeSuccess,
  queryRecharge,
  type RechargePackage,
  type WalletOverview
} from '@/api/wallet'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { back, replace } from '@/utils/nav'
import { isVirtualPaymentConfirmationPending, requestWechatVirtualPayment } from '@/utils/virtual-payment'

type PayErrorState = {
  title: string
  detail: string
  action: string
  code: string
}

type PendingRechargeState = {
  rechargeNo: string
  createdAt: number
}

const RECHARGE_PENDING_STORAGE_KEY = 'wallet_recharge_pending'

const overview = ref<WalletOverview | null>(null)
const overviewLoadFailed = ref(false)
const packages = ref<RechargePackage[]>([])
const selectedId = ref<number | null>(null)
const loading = ref(true)
const paying = ref(false)
const mocking = ref(false)
const payError = ref<PayErrorState | null>(null)
const rechargeConfirming = ref(false)
const pendingRechargeNo = ref('')
const confirmationRefreshing = ref(false)
let confirmationTimer: ReturnType<typeof setTimeout> | null = null
// 页面销毁标记：防止仍在途的查询在 onUnload 之后重排定时器（僵尸 poller）。
let pageAlive = true

const isDev = Boolean(import.meta.env.DEV)
const selectedPackage = computed(() => packages.value.find(item => item.id === selectedId.value) || null)
const balanceText = computed(() => money(overview.value?.balance))
const payButtonText = computed(() => {
  if (paying.value) return '正在拉起虚拟支付...'
  if (rechargeConfirming.value) return '上一笔充值确认入账中'
  if (!selectedPackage.value) return '请选择充值金额'
  return `微信虚拟支付 ¥${money(selectedPackage.value.amount)}`
})

function money(value: number | string | null | undefined) {
  return Number(value || 0).toFixed(2)
}

function packageAmountText(amount: string) {
  const value = Number(amount || 0)
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function extractCode(error: any) {
  return String(error?.error_id || error?.reference_id || error?.wechat_code || error?.errCode || error?.statusCode || '')
}

function classifyRechargeError(error: any): PayErrorState {
  const detail = getErrorMessage(error, '充值失败，请稍后重试')
  const code = extractCode(error)
  const text = `${detail} ${error?.errMsg || ''}`.toLowerCase()

  if (/未绑定|道具id|product/.test(text)) return { title: '充值档位暂不可用', detail, action: '请联系管理员为该充值档位绑定正确的微信虚拟道具。', code }
  if (/金额|价格|不一致|price|fee/.test(text)) return { title: '充值金额校验未通过', detail, action: '请重新选择充值档位后再试；若持续出现请联系管理员核对档位价格配置。', code }
  if (/openid|登录态|session|重新登录|jscode/.test(text)) return { title: '微信登录态已失效', detail, action: '请返回个人中心重新登录微信账号，然后再次进入充值页面。', code }
  if (/appkey|offer|配置|configuration/.test(text)) return { title: '支付配置异常', detail, action: '请管理员检查AppKey、OfferID和虚拟支付环境配置。', code }
  if (/尚未审核|道具状态|15010|15011|15013/.test(text)) return { title: '微信道具暂不可用', detail, action: '请确认虚拟道具已发布，并使用正确的小程序版本和支付环境。', code }
  if (Number(error?.statusCode) >= 500 || /内部错误|请求失败（500）/.test(text)) return { title: '支付服务暂时异常', detail, action: '请稍后重试；如持续出现，请把错误编号提供给管理员查询服务器日志。', code }
  return { title: '充值未完成', detail, action: '请检查网络后重试；若微信已扣款，请不要重复充值，先刷新入账状态。', code }
}

function copyErrorInfo() {
  if (!payError.value) return
  const text = [
    `错误：${payError.value.title}`,
    `详情：${payError.value.detail}`,
    payError.value.code ? `错误编号：${payError.value.code}` : ''
  ].filter(Boolean).join('\n')
  uni.setClipboardData({ data: text, success: () => success('错误信息已复制') })
}

function clearConfirmationTimer() {
  if (!confirmationTimer) return
  clearTimeout(confirmationTimer)
  confirmationTimer = null
}

function scheduleConfirmationRefresh() {
  clearConfirmationTimer()
  if (!pageAlive || !rechargeConfirming.value) return
  confirmationTimer = setTimeout(() => { void refreshPendingRecharge(true) }, 2500)
}

function enterConfirmationPending(rechargeNo: string) {
  if (!rechargeNo) return
  rechargeConfirming.value = true
  pendingRechargeNo.value = rechargeNo
  payError.value = null
  const pendingState: PendingRechargeState = { rechargeNo, createdAt: Date.now() }
  uni.setStorageSync(RECHARGE_PENDING_STORAGE_KEY, pendingState)
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
  if (!stored || !stored.rechargeNo) return
  rechargeConfirming.value = true
  pendingRechargeNo.value = stored.rechargeNo
}

async function loadData() {
  loading.value = true
  try {
    const [overviewResult, packagesResult] = await Promise.allSettled([getWalletOverview(), getRechargePackages()])
    if (overviewResult.status === 'fulfilled') {
      overview.value = overviewResult.value
      overviewLoadFailed.value = false
    } else {
      // 保留已知余额不清空；从未加载成功时展示"加载失败/点击重试"而非 ¥0.00。
      overviewLoadFailed.value = overview.value === null
    }
    if (packagesResult.status === 'fulfilled') {
      packages.value = packagesResult.value.results || []
      if (selectedId.value === null && packages.value.length) selectedId.value = packages.value[0].id
    } else {
      toast(getErrorMessage(packagesResult.reason, '充值信息加载失败'))
    }
  } finally {
    loading.value = false
  }
}

async function refreshOverview() {
  try {
    overview.value = await getWalletOverview()
    overviewLoadFailed.value = false
  } catch {
    // 静默失败：余额展示保持旧值，下次进入页面会重新拉取。
    overviewLoadFailed.value = overview.value === null
  }
}

function retryOverview() {
  void refreshOverview()
}

async function refreshPendingRecharge(silent = false) {
  if (!pendingRechargeNo.value || confirmationRefreshing.value) return
  confirmationRefreshing.value = true
  try {
    const result = await queryRecharge(pendingRechargeNo.value)
    if (result?.status === 'credited') {
      clearPendingRecharge()
      await refreshOverview()
      success('充值成功，余额已到账')
      return
    }
    if (result?.status === 'closed' || result?.status === 'failed') {
      clearPendingRecharge()
      toast('本次充值未完成入账；若微信已扣款请联系客服处理')
      return
    }
    if (!silent) toast(result?.status === 'paid' ? '已确认付款，正在入账，请稍候' : '充值仍在确认中，请勿重复支付')
  } catch (error) {
    if (!silent) toast(getErrorMessage(error, '充值状态查询失败，系统会继续确认'))
  } finally {
    confirmationRefreshing.value = false
    if (pageAlive && rechargeConfirming.value) scheduleConfirmationRefresh()
  }
}

function goBackAfterSuccess() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    back()
    return
  }
  replace('/pages/client/wallet/index')
}

/** 模拟支付流程（后端 ENABLE_MOCK_PAYMENT 模式）：主按钮与 DEV mock 按钮共用。 */
async function runMockRechargeFlow(rechargeNo: string) {
  await mockRechargeSuccess(rechargeNo)
  const result = await queryRecharge(rechargeNo)
  if (result?.status === 'credited' || result?.status === 'paid') {
    await refreshOverview()
    success('模拟充值成功，余额已到账')
  } else {
    toast(`模拟充值状态：${result?.status || '未知'}`)
  }
}

async function payRecharge() {
  if (paying.value || mocking.value) return
  if (rechargeConfirming.value) {
    toast('上一笔充值正在确认入账，请稍候')
    return
  }
  if (!selectedPackage.value) {
    toast('请先选择充值金额')
    return
  }
  payError.value = null
  paying.value = true
  let currentRechargeNo = ''
  try {
    const loginResult: any = await new Promise((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    if (!loginResult?.code) throw new Error('微信登录态获取失败，请重新进入小程序')
    const payParams = await createRecharge(selectedPackage.value.id, loginResult.code)
    currentRechargeNo = payParams.recharge_no || payParams.payment_no || ''
    if (payParams.mock === true || !payParams.signData) {
      // 后端模拟支付模式返回的 payload 没有 signData/paySig 等签名字段，无法拉起微信收银台。
      const ok = await confirm('后端当前处于模拟支付模式，本次充值将直接模拟支付成功（不产生真实扣款）。是否继续？', '模拟支付')
      if (ok) await runMockRechargeFlow(currentRechargeNo)
      return
    }
    await requestWechatVirtualPayment(payParams, { query: queryRecharge })
    clearPendingRecharge()
    await refreshOverview()
    success('充值成功，余额已到账')
    setTimeout(goBackAfterSuccess, 900)
  } catch (error: any) {
    const errCode = Number(error?.errCode)
    if (isVirtualPaymentConfirmationPending(error)) {
      enterConfirmationPending(String(error?.paymentNo || currentRechargeNo || ''))
      toast('微信付款已完成，充值正在入账，请勿重复支付')
    } else if (errCode === -2 || /cancel/i.test(String(error?.errMsg || ''))) {
      toast('已取消支付')
    } else {
      payError.value = classifyRechargeError(error)
      toast(payError.value.title)
    }
  } finally {
    paying.value = false
  }
}

async function mockRecharge() {
  if (!isDev || paying.value || mocking.value || rechargeConfirming.value) return
  if (!selectedPackage.value) {
    toast('请先选择充值金额')
    return
  }
  mocking.value = true
  try {
    const loginResult: any = await new Promise((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    if (!loginResult?.code) throw new Error('微信登录态获取失败，请重新进入小程序')
    const payParams = await createRecharge(selectedPackage.value.id, loginResult.code)
    await runMockRechargeFlow(payParams.recharge_no || payParams.payment_no || '')
  } catch (error) {
    toast(getErrorMessage(error, '模拟充值失败'))
  } finally {
    mocking.value = false
  }
}

onLoad(() => {
  restorePendingRecharge()
})
onShow(async () => {
  await loadData()
  if (rechargeConfirming.value) void refreshPendingRecharge(true)
})
onUnload(() => {
  // 置销毁标记 + 清理定时器；pending 状态保留在 storage，下次进入本页继续补查。
  pageAlive = false
  clearConfirmationTimer()
})
</script>

<style lang="scss" scoped>
.recharge-page { min-height: 100vh; padding: 24rpx 24rpx calc(70rpx + env(safe-area-inset-bottom)); box-sizing: border-box; color: #172116; background: radial-gradient(circle at 10% 0%, rgba(47,155,99,.12), transparent 30%), radial-gradient(circle at 90% 12%, rgba(216,161,68,.12), transparent 28%), #f7f3ea; }
.card, .balance-card, .pay-error-card { margin-bottom: 20rpx; border-radius: 28rpx; background: rgba(255,255,255,.96); border: 1rpx solid rgba(39,61,42,.08); box-shadow: 0 14rpx 34rpx rgba(39,61,42,.06); }
.card { padding: 26rpx; }
.balance-card { padding: 36rpx 28rpx 30rpx; text-align: center; color: #fff; background: linear-gradient(135deg, #173426, #1f7c4b 62%, #45ae72); }
.balance-label { color: rgba(255,255,255,.78); font-size: 24rpx; }
.balance-row { display: flex; justify-content: center; align-items: baseline; gap: 8rpx; margin-top: 12rpx; }
.balance-row text:first-child { font-size: 38rpx; font-weight: 900; }
.balance-row text:last-child { font-size: 76rpx; line-height: 1; font-weight: 900; }
.balance-row--error text:first-child, .balance-row--error text:last-child { font-size: 30rpx; line-height: 1.4; font-weight: 900; color: rgba(255,255,255,.88); text-decoration: underline; }
.secure-tip { display: inline-flex; align-items: center; gap: 10rpx; margin-top: 24rpx; padding: 10rpx 18rpx; border-radius: 999rpx; background: rgba(255,255,255,.12); font-size: 22rpx; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; margin-bottom: 18rpx; }
.card-head text:first-child { font-size: 30rpx; font-weight: 900; }
.card-head text:last-child { color: #1f7c4b; font-size: 22rpx; font-weight: 900; }
.package-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.package-item { padding: 26rpx 12rpx 22rpx; border-radius: 22rpx; text-align: center; background: #f7faf4; border: 3rpx solid rgba(39,61,42,.08); }
.package-item.active { background: #eef8f1; border-color: #1f7c4b; box-shadow: 0 8rpx 20rpx rgba(31,124,75,.14); }
.package-amount { display: flex; justify-content: center; align-items: baseline; gap: 4rpx; color: #172116; }
.package-amount text:first-child { font-size: 24rpx; font-weight: 900; }
.package-amount text:last-child { font-size: 44rpx; line-height: 1; font-weight: 900; }
.package-item.active .package-amount { color: #1f7c4b; }
.package-sub { display: block; margin-top: 10rpx; color: #879083; font-size: 20rpx; }
.package-item.active .package-sub { color: #1f7c4b; }
.empty-tip { padding: 40rpx 20rpx; color: #8a9286; text-align: center; font-size: 24rpx; }
.confirming-card { border-color: rgba(47,155,99,.18); }
.confirming-head { display: flex; align-items: center; gap: 18rpx; }
.confirming-icon { width: 72rpx; height: 72rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 22rpx; color: #fff; font-size: 29rpx; font-weight: 900; background: linear-gradient(135deg, #2fbd68, #16954d); }
.confirming-head view:last-child text { display: block; }
.confirming-head view:last-child text:first-child { font-size: 30rpx; font-weight: 900; }
.confirming-head view:last-child text:last-child { margin-top: 6rpx; color: #7d877a; font-size: 22rpx; }
.confirming-notice { display: flex; gap: 12rpx; margin-top: 22rpx; padding: 18rpx; border-radius: 18rpx; color: #78643a; font-size: 22rpx; line-height: 1.5; background: #fff8e8; }
.confirming-notice text:first-child { width: 10rpx; height: 10rpx; flex-shrink: 0; margin-top: 11rpx; border-radius: 50%; background: #d8a144; }
.confirming-notice text:last-child { flex: 1; }
.notice-card .card-head { margin-bottom: 10rpx; }
.notice-line { display: flex; gap: 12rpx; padding: 8rpx 0; color: #687665; font-size: 22rpx; line-height: 1.55; }
.notice-line text:first-child { width: 10rpx; height: 10rpx; flex-shrink: 0; margin-top: 12rpx; border-radius: 50%; background: #d8a144; }
.notice-line text:last-child { flex: 1; }
.pay-error-card { padding: 24rpx; border-color: rgba(196,50,50,.17); background: #fff6f4; }
.pay-error-head { display: flex; align-items: flex-start; gap: 16rpx; }
.error-icon { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; color: #fff; font-size: 28rpx; font-weight: 900; background: #c43232; }
.error-main { flex: 1; min-width: 0; }
.error-title, .error-detail, .error-action { display: block; }
.error-title { color: #8f2929; font-size: 27rpx; font-weight: 900; }
.error-detail { margin-top: 8rpx; color: #7c514d; font-size: 23rpx; line-height: 1.5; word-break: break-all; }
.error-code { display: flex; justify-content: space-between; gap: 20rpx; margin-top: 18rpx; padding: 16rpx 18rpx; border-radius: 16rpx; color: #8f2929; font-size: 22rpx; background: rgba(196,50,50,.07); }
.error-code text:last-child { flex: 1; text-align: right; font-weight: 900; word-break: break-all; }
.error-action { margin-top: 14rpx; color: #7d645f; font-size: 22rpx; line-height: 1.5; }
.pay-bar { margin-top: 8rpx; }
.pay-button { width: 100%; height: 92rpx; margin-top: 22rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; color: #fff; font-size: 30rpx; font-weight: 900; background: linear-gradient(135deg, #2fbd68, #15934c); box-shadow: 0 12rpx 26rpx rgba(31,156,81,.22); }
.pay-button::after, .mock-button::after { border: none; }
.pay-button[disabled], .mock-button[disabled] { opacity: .62; }
.mock-button { width: 100%; height: 76rpx; margin-top: 14rpx; border-radius: 999rpx; color: #a87520; font-size: 25rpx; font-weight: 900; background: #fff6df; border: 1rpx solid rgba(168,117,32,.2); }
.pay-help { display: block; margin-top: 14rpx; color: #9aa197; font-size: 21rpx; text-align: center; }
.loading-state { padding: 50rpx 20rpx; color: #8a9286; text-align: center; font-size: 24rpx; }
</style>
