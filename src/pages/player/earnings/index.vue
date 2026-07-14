<template>
  <view class="earnings-page">
    <view class="hero-card">
      <view class="hero-top">
        <view>
          <text class="eyebrow">PLAYER WALLET</text>
          <text class="hero-title">鱼干收益中心</text>
          <text class="hero-sub">订单完成后进入{{ overview?.review_days || 8 }}天审核期，无异常即可提现</text>
        </view>
        <button class="refresh-btn" @tap="loadAll">刷新</button>
      </view>
      <view class="available-block">
        <text>可提现鱼干</text>
        <view><text class="currency">鱼干</text><text>{{ fish(overview?.available_balance) }}</text></view>
        <text>人民币：鱼干 = 1：10，即10鱼干可兑换1元，实际到账以财务打款为准</text>
      </view>
    </view>

    <view class="balance-grid">
      <view class="balance-item">
        <text>{{ fish(overview?.pending_balance) }}</text>
        <text>审核中鱼干</text>
      </view>
      <view class="balance-item">
        <text>{{ fish(overview?.withdrawing_balance) }}</text>
        <text>提现中鱼干</text>
      </view>
      <view class="balance-item">
        <text>{{ fish(overview?.withdrawn_total) }}</text>
        <text>累计已提鱼干</text>
      </view>
    </view>

    <view class="card stats-card">
      <view><text>{{ overview?.accepted_orders || 0 }}</text><text>累计接单</text></view>
      <view><text>{{ overview?.completed_orders || 0 }}</text><text>已结算订单</text></view>
      <view><text>{{ fish(overview?.commission_total) }}</text><text>累计抽成鱼干</text></view>
      <view><text>{{ Number(overview?.default_commission_rate || 15).toFixed(0) }}%</text><text>默认抽成</text></view>
    </view>

    <view class="card withdrawal-card">
      <view class="card-head">
        <view>
          <text class="card-title">申请提现</text>
          <text class="card-sub">财务审核后手动汇款，请确认收款信息准确</text>
        </view>
        <text class="available-chip">可提 {{ fish(overview?.available_balance) }} 鱼干</text>
      </view>

      <view class="amount-input-wrap">
        <text>鱼干</text>
        <input v-model="form.amount" type="digit" placeholder="请输入鱼干数量" />
        <text class="all-link" @tap="fillAll">全部</text>
      </view>
      <text v-if="withdrawalYuan > 0" class="exchange-preview">预计折合人民币 ¥{{ money(withdrawalYuan) }}</text>

      <picker :range="methodLabels" :value="methodIndex" @change="handleMethodChange">
        <view class="form-row">
          <text>收款方式</text>
          <text>{{ methodLabels[methodIndex] }} ›</text>
        </view>
      </picker>
      <view class="form-row input-row">
        <text>收款人</text>
        <input v-model="form.account_name" maxlength="80" placeholder="填写实名收款人" />
      </view>
      <view class="form-row input-row">
        <text>收款账号</text>
        <input v-model="form.account_no" maxlength="150" :placeholder="accountPlaceholder" />
      </view>
      <view class="form-row input-row">
        <text>备注</text>
        <input v-model="form.request_note" maxlength="300" placeholder="选填" />
      </view>

      <button class="withdraw-btn" :disabled="submitting || !canSubmit" @tap="submitWithdrawal">
        {{ submitting ? '正在提交...' : '提交提现申请' }}
      </button>
      <text class="withdraw-tip">最低提现 {{ minWithdrawalFish }} 鱼干（折合人民币 ¥{{ money(overview?.min_withdrawal_amount || 1) }}）；鱼干数量最多保留1位小数。</text>
    </view>

    <view class="tabs">
      <view :class="{ active: activeTab === 'earnings' }" @tap="activeTab = 'earnings'">工资明细</view>
      <view :class="{ active: activeTab === 'withdrawals' }" @tap="activeTab = 'withdrawals'">提现记录</view>
    </view>

    <view v-if="activeTab === 'earnings'" class="list-section">
      <view v-for="item in settlements" :key="item.id" class="card record-card">
        <view class="record-head">
          <view>
            <text class="record-title">{{ item.package_name || '陪玩服务' }}</text>
            <text class="record-no">{{ item.order_no }}</text>
          </view>
          <text class="status-chip" :class="earningStatusClass(item.status_text)">{{ item.status_text }}</text>
        </view>
        <view class="amount-detail">
          <view><text>分配收入</text><text>{{ fish(item.gross_amount) }} 鱼干</text></view>
          <view><text>平台抽成 {{ Number(item.commission_rate || 0).toFixed(0) }}%</text><text>-{{ fish(item.commission_amount) }} 鱼干</text></view>
          <view class="net-row"><text>应得鱼干</text><text>{{ fish(item.net_amount) }}</text></view>
          <view class="yuan-row"><text>折合人民币</text><text>¥{{ money(item.net_amount) }}</text></view>
        </view>
        <view class="record-foot">
          <text v-if="item.status === 'pending'">预计 {{ dateTime(item.review_until) }} 审核完成</text>
          <text v-else-if="item.status === 'frozen'">冻结原因：{{ item.freeze_reason || '请联系管理员' }}</text>
          <text v-else>可提现 {{ fish(item.available_amount) }} · 提现中 {{ fish(item.withdrawing_amount) }} · 已提现 {{ fish(item.withdrawn_amount) }} 鱼干</text>
        </view>
      </view>
      <view v-if="!loading && !settlements.length" class="empty-card">暂无工资记录，完成订单后会自动生成。</view>
    </view>

    <view v-else class="list-section">
      <view v-for="item in withdrawals" :key="item.withdrawal_no" class="card record-card">
        <view class="record-head">
          <view>
            <text class="record-title">提现 {{ fish(item.amount) }} 鱼干</text>
            <text class="record-no">{{ item.withdrawal_no }}</text>
          </view>
          <text class="status-chip" :class="withdrawalStatusClass(item.status)">{{ item.status_text }}</text>
        </view>
        <view class="withdrawal-info">
          <view><text>折合人民币</text><text>¥{{ money(item.amount) }}</text></view>
          <view><text>收款方式</text><text>{{ item.payment_method_text }}</text></view>
          <view><text>收款账号</text><text>{{ item.account_name }} · {{ item.account_no_masked }}</text></view>
          <view><text>申请时间</text><text>{{ dateTime(item.created_at) }}</text></view>
          <view v-if="item.transfer_no"><text>转账流水</text><text>{{ item.transfer_no }}</text></view>
          <view v-if="item.reject_reason"><text>处理说明</text><text class="reject-text">{{ item.reject_reason }}</text></view>
        </view>
      </view>
      <view v-if="!loading && !withdrawals.length" class="empty-card">暂无提现记录。</view>
    </view>

    <view v-if="loading" class="loading-state">收益数据加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  createWithdrawal,
  getEarningSettlements,
  getEarningsOverview,
  getWithdrawals,
  type EarningsOverview,
  type PlayerEarningItem,
  type WithdrawalItem
} from '@/api/earnings'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { isApprovedPlayer } from '@/utils/client'
import { replace } from '@/utils/nav'

const FISH_PER_YUAN = 10
const overview = ref<EarningsOverview | null>(null)
const settlements = ref<PlayerEarningItem[]>([])
const withdrawals = ref<WithdrawalItem[]>([])
const activeTab = ref<'earnings' | 'withdrawals'>('earnings')
const loading = ref(true)
const submitting = ref(false)

const methods = [
  { label: '微信', value: 'wechat' as const },
  { label: '支付宝', value: 'alipay' as const },
  { label: '银行卡', value: 'bank' as const },
  { label: '其他', value: 'other' as const }
]
const methodLabels = methods.map(item => item.label)
const methodIndex = ref(0)
const form = reactive({
  amount: '',
  account_name: '',
  account_no: '',
  request_note: ''
})

const availableFish = computed(() => toFish(overview.value?.available_balance))
const minWithdrawalFishValue = computed(() => toFish(overview.value?.min_withdrawal_amount || 1))
const minWithdrawalFish = computed(() => fish(overview.value?.min_withdrawal_amount || 1))
const withdrawalFish = computed(() => Number(form.amount || 0))
const withdrawalYuan = computed(() => fishToYuan(withdrawalFish.value))
const hasValidFishPrecision = computed(() => Math.abs(withdrawalFish.value * 10 - Math.round(withdrawalFish.value * 10)) < 0.000001)

const accountPlaceholder = computed(() => {
  const method = methods[methodIndex.value].value
  if (method === 'wechat') return '微信号或财务约定账号'
  if (method === 'alipay') return '支付宝账号'
  if (method === 'bank') return '银行卡号'
  return '填写收款账号'
})
const canSubmit = computed(() => {
  const amount = withdrawalFish.value
  return amount >= minWithdrawalFishValue.value
    && amount <= availableFish.value
    && hasValidFishPrecision.value
    && Boolean(form.account_name.trim())
    && Boolean(form.account_no.trim())
})

function money(value?: number | string | null) {
  return Number(value || 0).toFixed(2)
}

function toFish(value?: number | string | null) {
  return Number(value || 0) * FISH_PER_YUAN
}

function fish(value?: number | string | null) {
  return toFish(value).toFixed(2)
}

function fishToYuan(value?: number | string | null) {
  return Number((Number(value || 0) / FISH_PER_YUAN).toFixed(2))
}

function dateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function earningStatusClass(status: string) {
  if (status === '审核中') return 'status-pending'
  if (status === '已冻结') return 'status-danger'
  if (status === '提现中') return 'status-paying'
  if (status.includes('已提现')) return 'status-done'
  return 'status-ready'
}

function withdrawalStatusClass(status: string) {
  if (status === 'pending_review') return 'status-pending'
  if (status === 'pending_payment') return 'status-paying'
  if (status === 'paid') return 'status-done'
  return 'status-danger'
}

function handleMethodChange(event: any) {
  methodIndex.value = Number(event?.detail?.value || 0)
}

function fillAll() {
  form.amount = availableFish.value.toFixed(2)
}

async function loadAll() {
  loading.value = true
  try {
    const [overviewResult, settlementResult, withdrawalResult] = await Promise.all([
      getEarningsOverview(),
      getEarningSettlements(),
      getWithdrawals()
    ])
    overview.value = overviewResult
    settlements.value = settlementResult.results || []
    withdrawals.value = withdrawalResult.results || []
  } catch (error) {
    toast(getErrorMessage(error, '收益数据加载失败'))
  } finally {
    loading.value = false
  }
}

async function submitWithdrawal() {
  if (submitting.value) return
  if (!hasValidFishPrecision.value) {
    toast('鱼干数量最多保留1位小数')
    return
  }
  if (withdrawalFish.value < minWithdrawalFishValue.value) {
    toast(`最低提现${minWithdrawalFish.value}鱼干`)
    return
  }
  if (!canSubmit.value) {
    toast('请完整填写提现信息，并确认鱼干余额充足')
    return
  }
  const fishAmount = withdrawalFish.value
  const yuanAmount = withdrawalYuan.value
  const method = methods[methodIndex.value]
  const ok = await confirm(
    `确认申请提现${fishAmount.toFixed(2)}鱼干（折合人民币¥${money(yuanAmount)}）到${method.label}账号 ${form.account_no.trim()} 吗？`,
    '确认提现'
  )
  if (!ok) return

  submitting.value = true
  try {
    await createWithdrawal({
      amount: yuanAmount,
      payment_method: method.value,
      account_name: form.account_name.trim(),
      account_no: form.account_no.trim(),
      request_note: form.request_note.trim()
    })
    form.amount = ''
    form.request_note = ''
    success('提现申请已提交，等待财务审核')
    activeTab.value = 'withdrawals'
    await loadAll()
  } catch (error) {
    toast(getErrorMessage(error, '提现申请失败'))
  } finally {
    submitting.value = false
  }
}

onShow(async () => {
  if (!(await isApprovedPlayer())) {
    toast('请先成为已通过审核的陪玩师')
    replace('/pages/player/apply/index')
    return
  }
  await loadAll()
})
</script>

<style lang="scss" scoped>
.earnings-page { min-height: 100vh; padding: 22rpx 24rpx 80rpx; box-sizing: border-box; color: #172116; background: radial-gradient(circle at 10% 0%, rgba(216,161,68,.14), transparent 30%), radial-gradient(circle at 90% 14%, rgba(47,155,99,.12), transparent 28%), #f7f3ea; }
.hero-card, .card, .balance-grid, .empty-card { border-radius: 28rpx; background: rgba(255,255,255,.96); border: 1rpx solid rgba(39,61,42,.08); box-shadow: 0 14rpx 34rpx rgba(39,61,42,.06); }
.hero-card { padding: 30rpx; color: #fff; background: linear-gradient(135deg, #173426, #1f7c4b 62%, #45ae72); }
.hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; }
.hero-top > view { flex: 1; min-width: 0; }
.eyebrow, .hero-title, .hero-sub { display: block; }
.eyebrow { color: rgba(255,255,255,.68); font-size: 20rpx; font-weight: 900; letter-spacing: 2rpx; }
.hero-title { margin-top: 8rpx; font-size: 40rpx; font-weight: 900; }
.hero-sub { margin-top: 8rpx; color: rgba(255,255,255,.72); font-size: 22rpx; line-height: 1.5; }
.refresh-btn { min-width: 110rpx; height: 58rpx; margin: 0; padding: 0 20rpx; border-radius: 999rpx; color: #fff; font-size: 23rpx; font-weight: 900; background: rgba(255,255,255,.14); }
.refresh-btn::after, .withdraw-btn::after { border: none; }
.available-block { margin-top: 28rpx; padding: 24rpx; border-radius: 24rpx; background: rgba(255,255,255,.12); }
.available-block > text { display: block; }
.available-block > text:first-child { color: rgba(255,255,255,.72); font-size: 22rpx; }
.available-block > view { display: flex; align-items: baseline; gap: 10rpx; margin-top: 8rpx; }
.available-block > view text:last-child { font-size: 60rpx; line-height: 1; font-weight: 900; }
.currency { font-size: 22rpx; font-weight: 900; }
.available-block > text:last-child { margin-top: 10rpx; color: rgba(255,255,255,.64); font-size: 20rpx; line-height: 1.5; }
.balance-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rpx; margin-top: 20rpx; overflow: hidden; }
.balance-item { padding: 24rpx 8rpx; text-align: center; background: #fff; }
.balance-item text { display: block; }
.balance-item text:first-child { color: #172116; font-size: 31rpx; font-weight: 900; }
.balance-item text:last-child { margin-top: 5rpx; color: #879083; font-size: 20rpx; }
.card { margin-top: 20rpx; padding: 26rpx; }
.stats-card { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; }
.stats-card view { text-align: center; }
.stats-card text { display: block; }
.stats-card text:first-child { color: #1f7c4b; font-size: 29rpx; font-weight: 900; }
.stats-card text:last-child { margin-top: 5rpx; color: #879083; font-size: 19rpx; }
.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.card-head > view { flex: 1; min-width: 0; }
.card-title, .card-sub { display: block; }
.card-title { font-size: 30rpx; font-weight: 900; }
.card-sub { margin-top: 6rpx; color: #7d877a; font-size: 21rpx; line-height: 1.45; }
.available-chip { padding: 7rpx 13rpx; border-radius: 999rpx; color: #1f7c4b; font-size: 20rpx; font-weight: 900; background: #eef8f1; }
.amount-input-wrap { display: flex; align-items: center; gap: 14rpx; margin-top: 22rpx; padding: 18rpx 20rpx; border-radius: 18rpx; background: #f7faf4; }
.amount-input-wrap > text:first-child { color: #a87520; font-size: 22rpx; font-weight: 900; }
.amount-input-wrap input { flex: 1; min-width: 0; font-size: 31rpx; font-weight: 900; }
.all-link { color: #1f7c4b; font-size: 23rpx; font-weight: 900; }
.exchange-preview { display: block; margin-top: 10rpx; color: #a87520; font-size: 21rpx; text-align: right; }
.form-row { min-height: 76rpx; display: flex; align-items: center; justify-content: space-between; gap: 20rpx; border-bottom: 1rpx solid rgba(39,61,42,.07); font-size: 24rpx; }
.form-row > text:first-child { flex-shrink: 0; color: #687665; }
.form-row > text:last-child { text-align: right; font-weight: 800; }
.input-row input { flex: 1; text-align: right; font-size: 24rpx; }
.withdraw-btn { width: 100%; height: 84rpx; margin-top: 22rpx; border-radius: 999rpx; color: #fff; font-size: 27rpx; font-weight: 900; background: linear-gradient(135deg, #d8a144, #a87520); }
.withdraw-btn[disabled] { opacity: .52; }
.withdraw-tip { display: block; margin-top: 12rpx; color: #8a9286; font-size: 20rpx; line-height: 1.5; text-align: center; }
.tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 10rpx; margin-top: 22rpx; padding: 8rpx; border-radius: 999rpx; background: rgba(255,255,255,.82); }
.tabs view { height: 62rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; color: #687665; font-size: 25rpx; font-weight: 900; }
.tabs view.active { color: #fff; background: #1f7c4b; }
.list-section { display: flex; flex-direction: column; }
.record-card { padding: 24rpx; }
.record-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16rpx; }
.record-head > view { flex: 1; min-width: 0; }
.record-title, .record-no { display: block; }
.record-title { font-size: 27rpx; font-weight: 900; }
.record-no { margin-top: 5rpx; color: #9aa197; font-size: 19rpx; font-family: monospace; word-break: break-all; }
.status-chip { flex-shrink: 0; padding: 7rpx 13rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 900; }
.status-pending { color: #9a6a16; background: #fff3d4; }
.status-ready { color: #1f7c4b; background: #eef8f1; }
.status-paying { color: #a87520; background: #fff5df; }
.status-done { color: #26753a; background: #e4f7e8; }
.status-danger { color: #a13d35; background: #fff0ed; }
.amount-detail { margin-top: 18rpx; padding: 16rpx 18rpx; border-radius: 18rpx; background: #f7faf4; }
.amount-detail view, .withdrawal-info view { min-height: 48rpx; display: flex; align-items: center; justify-content: space-between; gap: 16rpx; font-size: 22rpx; }
.amount-detail view text:first-child, .withdrawal-info view text:first-child { color: #7d877a; }
.amount-detail view text:last-child, .withdrawal-info view text:last-child { flex: 1; text-align: right; font-weight: 800; word-break: break-all; }
.amount-detail .net-row { margin-top: 6rpx; padding-top: 8rpx; border-top: 1rpx solid rgba(39,61,42,.08); }
.amount-detail .net-row text:last-child { color: #1f7c4b; font-size: 27rpx; font-weight: 900; }
.amount-detail .yuan-row { color: #8a9286; }
.record-foot { margin-top: 13rpx; color: #8a9286; font-size: 20rpx; line-height: 1.45; }
.withdrawal-info { margin-top: 16rpx; }
.reject-text { color: #a13d35; }
.empty-card { margin-top: 20rpx; padding: 60rpx 24rpx; color: #8a9286; text-align: center; font-size: 24rpx; }
.loading-state { padding: 50rpx 20rpx; color: #8a9286; text-align: center; font-size: 24rpx; }
</style>
