<template>
  <view :style="$appThemeStyle" class="earnings-page">
    <view class="hero-card">
      <view class="hero-top">
        <view>
          <text class="hero-title">鱼干收益中心</text>
        </view>
        <button class="refresh-btn" @tap="loadAll">刷新</button>
      </view>
      <view class="available-block">
        <text>可提现鱼干</text>
        <view><text class="currency">鱼干</text><text>{{ fish(overview?.available_balance) }}</text></view>
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
      <view class="balance-item" :class="{ debt: debtFish > 0 }">
        <text>{{ fish(overview?.debt_balance) }}</text>
        <text>待抵扣鱼干</text>
      </view>
    </view>

    <view v-if="overview?.withdrawal_block_reason" class="wallet-warning">
      <text>!</text><text>{{ overview.withdrawal_block_reason }}</text>
    </view>

    <view class="card withdrawal-card">
      <view class="card-head">
        <view>
          <text class="card-title">申请提现</text>
        </view>
        <text class="available-chip">可提 {{ fish(overview?.available_balance) }} 鱼干</text>
      </view>

      <view class="amount-input-wrap">
        <text>鱼干</text>
        <input v-model="form.amount" :disabled="!!pendingDiamond" type="digit" placeholder="请输入鱼干数量" />
        <text class="all-link" @tap="fillAll">全部</text>
      </view>
      <block v-if="isDiamond">
        <text class="withdraw-tip">1鱼干＝1钻石，最低1鱼干，仅支持整数；全部兑换余数留在鱼干钱包。到账本人钻石钱包，无需财务审核。</text>
        <text v-if="diamondAmount" class="exchange-preview">扣{{ diamondAmount }}鱼干，到账{{ diamondAmount }}钻石</text>
      </block>
      <text v-else-if="withdrawalYuan > 0" class="exchange-preview">预计折合人民币 ¥{{ money(withdrawalYuan) }}</text>

      <picker :range="methodLabels" :value="methodIndex" @change="handleMethodChange">
        <view class="form-row">
          <text>收款方式</text>
          <text>{{ methodLabels[methodIndex] }} ›</text>
        </view>
      </picker>
      <view v-if="!isDiamond" class="form-row input-row">
        <text>收款人</text>
        <input v-model="form.account_name" maxlength="80" placeholder="填写实名收款人" />
      </view>
      <view v-if="!isDiamond" class="form-row input-row">
        <text>收款账号</text>
        <input v-model="form.account_no" maxlength="150" :placeholder="accountPlaceholder" />
      </view>
      <view class="form-row input-row">
        <text>备注</text>
        <input v-model="form.request_note" maxlength="300" placeholder="选填" />
      </view>

      <button class="withdraw-btn" :disabled="submitting || !canSubmit" @tap="submitWithdrawal">
        {{ isDiamond ? (submitting ? '兑换中' : (pendingDiamond ? '恢复原兑换请求' : '确认兑换')) : (submitting ? '正在提交...' : (overview?.can_withdraw === false ? '当前暂不能提现' : '提交提现申请')) }}
      </button>
      <text v-if="pendingDiamond" class="withdraw-tip">原兑换{{ pendingDiamond.amount }}鱼干结果待确认，请恢复原兑换请求；不会新建请求。</text>
      <text v-if="withdrawalBlockReason" class="withdraw-tip" style="color: #c0392b;" role="alert">{{ withdrawalBlockReason }}</text>
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
            <text class="record-no">{{ item.source === 'surcharge' ? '加价收益' : '原单收益' }}{{ item.surcharge_no ? ` · ${item.surcharge_no}` : '' }}</text>
            <text class="record-no">老板：{{ item.boss_name || '未设置昵称' }}</text>
            <text class="record-no">订单：{{ item.order_no }}</text>
          </view>
          <text class="status-chip" :class="earningStatusClass(item.status_text)">{{ item.status_text }}</text>
        </view>
        <view class="amount-detail">
          <view><text>分配收入</text><text>{{ fish(item.gross_amount) }} 鱼干</text></view>
          <view><text>平台抽成 {{ Number(item.commission_rate || 0).toFixed(0) }}%</text><text>-{{ fish(item.commission_amount) }} 鱼干</text></view>
          <view v-if="Number(item.reversed_amount || 0) > 0"><text>退款/异常冲销</text><text>-{{ fish(item.reversed_amount) }} 鱼干</text></view>
          <view v-if="Number(item.debt_offset_amount || 0) > 0"><text>抵扣历史欠款</text><text>-{{ fish(item.debt_offset_amount) }} 鱼干</text></view>
          <view class="net-row"><text>订单应得鱼干</text><text>{{ fish(item.net_amount) }}</text></view>
          <view class="yuan-row"><text>订单应得折合人民币</text><text>¥{{ money(fishToYuan(item.net_amount)) }}</text></view>
        </view>
        <view class="record-foot">
          <text v-if="item.status === 'pending'">预计 {{ dateTime(item.review_until) }} 审核完成</text>
          <text v-else-if="item.status === 'frozen'">冻结原因：{{ item.freeze_reason || '请联系管理员' }}</text>
          <text v-else-if="item.status === 'reversed'">该订单工资已完成冲销</text>
          <text v-else>可提现 {{ fish(item.available_amount) }} · 提现中 {{ fish(item.withdrawing_amount) }} · 已提现 {{ fish(item.withdrawn_amount) }} 鱼干</text>
        </view>
      </view>
      <view v-if="!loading && !settlements.length" class="empty-card">暂无工资记录</view>
    </view>

    <view v-else class="list-section">
      <view v-for="item in withdrawals" :key="item.withdrawal_no" class="card record-card">
        <view class="record-head">
          <view>
            <text class="record-title">{{ item.payment_method === 'diamonds' ? `兑换${item.diamond_amount}钻石` : `提现 ${fish(item.amount)} 鱼干` }}</text>
            <text class="record-no">{{ item.withdrawal_no }}</text>
          </view>
          <text class="status-chip" :class="withdrawalStatusClass(item.status)">{{ item.status_text }}</text>
        </view>
        <view class="withdrawal-info">
          <view v-if="item.payment_method === 'diamonds'"><text>扣除鱼干</text><text>{{ fish(item.amount) }} 鱼干</text></view>
          <view v-else><text>折合人民币</text><text>¥{{ money(fishToYuan(item.amount)) }}</text></view>
          <view><text>收款方式</text><text>{{ item.payment_method_text }}</text></view>
          <block v-if="item.payment_method === 'diamonds'">
            <view><text>到账钱包</text><text>本人钻石钱包</text></view>
            <view><text>钻石到账数</text><text>{{ item.diamond_amount }} 钻石</text></view>
            <view v-if="item.diamond_balance_after != null"><text>兑换后余额（交易时）</text><text>{{ item.diamond_balance_after }} 钻石</text></view>
          </block>
          <view v-else><text>收款账号</text><text>{{ item.account_name }} · {{ item.account_no_masked }}</text></view>
          <view><text>申请时间</text><text>{{ dateTime(item.created_at) }}</text></view>
          <view v-if="item.payment_method !== 'diamonds' && item.transfer_no"><text>转账流水</text><text>{{ item.transfer_no }}</text></view>
          <view v-if="item.reject_reason"><text>处理说明</text><text class="reject-text">{{ item.reject_reason }}</text></view>
        </view>
      </view>
      <view v-if="!loading && !withdrawals.length" class="empty-card">暂无提现记录</view>
    </view>

    <view v-if="loading" class="loading-state">收益数据加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import {
  createWithdrawal,
  getEarningSettlements,
  getEarningsOverview,
  getWithdrawals,
  getDiamondWithdrawal,
  type EarningsOverview,
  type PlayerEarningItem,
  type WithdrawalItem
} from '@/api/earnings'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { isApprovedPlayer } from '@/utils/client'
import { replace } from '@/utils/nav'
import { getClientProfileApi } from '@/api/client'
import { saveClientProfile } from '@/utils/client'
import { SESSION_CHANGED_EVENT } from '@/utils/storage'
import { getClientSessionGeneration, SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
import { completeDiamondWithdrawal, createDiamondRequestId, diamondPayload, persistDiamondWithdrawal, readDiamondWithdrawal, type PendingDiamondWithdrawal } from '@/utils/diamondWithdrawal'

const FISH_PER_YUAN = 10
const overview = ref<EarningsOverview | null>(null)
const settlements = ref<PlayerEarningItem[]>([])
const withdrawals = ref<WithdrawalItem[]>([])
const activeTab = ref<'earnings' | 'withdrawals'>('earnings')
const loading = ref(true)
const submitting = ref(false)
const pendingDiamond = ref<PendingDiamondWithdrawal | null>(null)
let loadedToken = ''
let pageEpoch = 0
let pageActive = true
let loadSequence = 0
function approvalSession() { return JSON.stringify([uni.getStorageSync('token') || '', getClientSessionGeneration(), pageEpoch]) }
function sessionToken() {
  const profile = uni.getStorageSync('client_profile')
  return JSON.stringify([uni.getStorageSync('token') || '', profile?.id, profile?.player?.id, getClientSessionGeneration(), pageEpoch])
}
function resetSessionView() {
  pageEpoch++
  loadedToken = ''
  overview.value = null
  settlements.value = []
  withdrawals.value = []
  pendingDiamond.value = null
  form.amount = ''
  form.account_name = ''
  form.account_no = ''
  form.request_note = ''
  methodIndex.value = 0
  submitting.value = false
  loading.value = true
}
uni.$on(SESSION_CHANGED_EVENT, resetSessionView)
uni.$on(SESSION_EXPIRED_EVENT, resetSessionView)
onHide(() => { pageActive = false; resetSessionView() })
onUnload(() => {
  pageActive = false
  pageEpoch++
  uni.$off(SESSION_CHANGED_EVENT, resetSessionView)
  uni.$off(SESSION_EXPIRED_EVENT, resetSessionView)
})
function currentActor() {
  const profile = uni.getStorageSync('client_profile')
  const playerId = overview.value?.player_id
  if (!pageActive || !uni.getStorageSync('token') || !loadedToken || loadedToken !== sessionToken() || !playerId || !profile?.id || profile.player?.id !== playerId) throw new Error('登录身份已变化，请刷新收益后重试')
  return { player_id: playerId, profile_id: Number(profile.id) }
}
function actorIsCurrent(actor: { player_id: number; profile_id: number }, token: string) {
  const profile = uni.getStorageSync('client_profile')
  return pageActive && token === sessionToken() && profile?.id === actor.profile_id && profile?.player?.id === actor.player_id
}

const methods = [
  { label: '微信', value: 'wechat' as const },
  { label: '支付宝', value: 'alipay' as const },
  { label: '银行卡', value: 'bank' as const },
  { label: '其他', value: 'other' as const },
  { label: '提现为钻石', value: 'diamonds' as const }
]
const methodLabels = methods.map(item => item.label)
const methodIndex = ref(0)
const isDiamond = computed(() => methods[methodIndex.value].value === 'diamonds')
const form = reactive({ amount: '', account_name: '', account_no: '', request_note: '' })
const diamondAmount = computed(() => /^[1-9]\d*$/.test(form.amount) && Number.isSafeInteger(Number(form.amount)) ? form.amount : '')

const availableFish = computed(() => Number(overview.value?.available_balance || 0))
const debtFish = computed(() => Number(overview.value?.debt_balance || 0))
const minWithdrawalFishValue = computed(() => Number(overview.value?.min_withdrawal_amount ?? 0.1))
const minWithdrawalFish = computed(() => fish(minWithdrawalFishValue.value))
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
const withdrawalBlockReason = computed(() => {
  if (loading.value) return '收益数据加载中，请稍候'
  if (pendingDiamond.value) return isDiamond.value ? '' : '请先选择提现为钻石，恢复原兑换请求'
  if (!overview.value) return '收益数据加载失败，请刷新后重试'
  if (overview.value.can_withdraw === false) return overview.value.withdrawal_block_reason || '当前账号暂不能提现，请联系管理员'
  if (debtFish.value > 0) return '当前有未抵扣欠款，暂不能提现'
  if (isDiamond.value) {
    if (!diamondAmount.value) return '兑换鱼干须为整数，最低兑换1鱼干'
    if (Number(diamondAmount.value) > availableFish.value) return '兑换金额超过可提现余额'
    return ''
  }
  if (!form.amount || !Number.isFinite(withdrawalFish.value)) return '请输入有效的提现鱼干数量'
  if (withdrawalFish.value < minWithdrawalFishValue.value) return `最低提现 ${minWithdrawalFish.value} 鱼干`
  if (withdrawalFish.value > availableFish.value) return '提现金额超过可提现余额'
  if (!hasValidFishPrecision.value) return '鱼干数量最多保留1位小数'
  if (!form.account_name.trim()) return '请填写收款人姓名'
  if (!form.account_no.trim()) return '请填写收款账号'
  return ''
})
const canSubmit = computed(() => !withdrawalBlockReason.value)

function money(value?: number | string | null) { return Number(value || 0).toFixed(2) }
function fish(value?: number | string | null) { return Number(value || 0).toFixed(2) }
function fishToYuan(value?: number | string | null) { return Number((Number(value || 0) / FISH_PER_YUAN).toFixed(2)) }
function dateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
function earningStatusClass(status: string) {
  if (status === '审核中') return 'status-pending'
  if (status === '已冻结' || status === '已冲销') return 'status-danger'
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
function handleMethodChange(event: any) { methodIndex.value = Number(event?.detail?.value || 0) }
function fillAll() {
  if (pendingDiamond.value) return
  if (overview.value?.can_withdraw === false || debtFish.value > 0) {
    toast(overview.value?.withdrawal_block_reason || '当前暂不能提现')
    return
  }
  // 按十进制字符串截断到一位小数，不四舍五入，也不扣除钱包余数。
  if (isDiamond.value) {
    const balance = String(overview.value?.available_balance || '0')
    form.amount = /^\d+(\.\d+)?$/.test(balance) ? balance.split('.')[0].replace(/^0+(?=\d)/, '') : ''
    if (!diamondAmount.value) toast('可提现余额不足1鱼干，无法兑换钻石；余数保留在鱼干钱包')
    return
  }
  form.amount = String(availableFish.value).replace(/(\.\d)\d+$/, '$1').replace(/\.0$/, '')
}

async function loadAll() {
  if (loadedToken && loadedToken !== sessionToken()) resetSessionView()
  const token = sessionToken()
  const sequence = ++loadSequence
  loading.value = true
  try {
    const [overviewResult, settlementResult, withdrawalResult] = await Promise.all([
      getEarningsOverview(),
      getEarningSettlements(),
      getWithdrawals()
    ])
    if (!pageActive || token !== sessionToken() || sequence !== loadSequence) return
    loadedToken = token
    overview.value = overviewResult
    settlements.value = settlementResult.results || []
    withdrawals.value = withdrawalResult.results || []
  } catch (error) {
    if (token === sessionToken() && sequence === loadSequence) toast(getErrorMessage(error, '收益数据加载失败'))
  } finally {
    if (token === sessionToken() && sequence === loadSequence) loading.value = false
  }
}

async function submitDiamondWithdrawal() {
  if (pendingDiamond.value) return recoverDiamondWithdrawal(true)
  if (!canSubmit.value) return toast(withdrawalBlockReason.value)
  submitting.value = true
  const token = sessionToken()
  try {
    const actor = currentActor()
    const existing = readDiamondWithdrawal(actor)
    if (existing) {
      pendingDiamond.value = existing
      form.amount = existing.amount
      return
    }
    const amount = diamondAmount.value
    const note = form.request_note.trim()
    const ok = await confirm(`确认扣${amount}鱼干，到账${amount}钻石至本人钻石钱包？兑换完成后无需财务审核。`, '确认兑换')
    if (!ok || !actorIsCurrent(actor, token)) return
    const requestId = await createDiamondRequestId()
    if (!actorIsCurrent(actor, token)) return
    // Another page can have persisted a request while this confirmation was open.
    // This synchronous re-read + write has no await gap and never replaces it.
    const saved = readDiamondWithdrawal(actor)
    if (saved) {
      pendingDiamond.value = saved
      form.amount = saved.amount
      return
    }
    const pending: PendingDiamondWithdrawal = { ...actor, request_id: requestId, amount, request_note: note, state: 'pending' }
    persistDiamondWithdrawal(pending)
    pendingDiamond.value = pending
    const result = await postDiamondWithdrawal(pending, token)
    await finishDiamondWithdrawal(pending, result, token)
  } catch (error) {
    if (token === sessionToken()) toast(getErrorMessage(error, '兑换结果待确认，请恢复原兑换请求'))
  } finally {
    if (token === sessionToken()) submitting.value = false
  }
}

async function postDiamondWithdrawal(pending: PendingDiamondWithdrawal, token: string) {
  if (!actorIsCurrent(pending, token)) throw new Error('登录身份已变化，请刷新后恢复原兑换请求')
  // A rejected retry does not resolve another same-key transaction. Only a
  // matching completed receipt can release the persisted original request.
  return createWithdrawal(diamondPayload(pending))
}

async function finishDiamondWithdrawal(pending: PendingDiamondWithdrawal, result: WithdrawalItem, token: string) {
  if (!actorIsCurrent(pending, token)) return
  const receipt = completeDiamondWithdrawal(pending, result)
  pendingDiamond.value = readDiamondWithdrawal(pending)
  form.amount = pendingDiamond.value?.amount || ''
  form.request_note = pendingDiamond.value?.request_note || ''
  success(`已到账${receipt.diamond_amount}钻石`)
  activeTab.value = 'withdrawals'
  await Promise.all([loadAll(), (async () => {
    const profile = await getClientProfileApi()
    if (actorIsCurrent(pending, token) && profile.id === pending.profile_id) saveClientProfile(profile)
  })()])
}

async function recoverDiamondWithdrawal(retry: boolean) {
  if (submitting.value) return
  submitting.value = true
  const token = sessionToken()
  try {
    const actor = currentActor()
    const pending = readDiamondWithdrawal(actor)
    if (!pending) return
    pendingDiamond.value = pending
    let result: WithdrawalItem
    try {
      result = await getDiamondWithdrawal(pending.request_id)
    } catch (error: any) {
      if (error?.statusCode !== 404 || !retry) throw error
      if (!actorIsCurrent(actor, token)) return
      result = await postDiamondWithdrawal(pending, token)
    }
    await finishDiamondWithdrawal(pending, result, token)
  } catch (error) {
    if (token === sessionToken()) toast(getErrorMessage(error, '原兑换结果待确认，请重试恢复'))
  } finally {
    if (token === sessionToken()) submitting.value = false
  }
}

async function submitWithdrawal() {
  if (submitting.value) return
  if (isDiamond.value) return submitDiamondWithdrawal()
  if (overview.value?.can_withdraw === false || debtFish.value > 0) {
    toast(overview.value?.withdrawal_block_reason || '当前暂不能提现')
    return
  }
  if (!hasValidFishPrecision.value) return toast('鱼干数量最多保留1位小数')
  if (withdrawalFish.value < minWithdrawalFishValue.value) return toast(`最低提现${minWithdrawalFish.value}鱼干`)
  if (!canSubmit.value) return toast(withdrawalBlockReason.value)

  const fishAmount = withdrawalFish.value
  const yuanAmount = withdrawalYuan.value
  const method = methods[methodIndex.value]
  if (method.value === 'diamonds') return
  const token = sessionToken()
  const payload = {
    amount: fishAmount,
    payment_method: method.value,
    account_name: form.account_name.trim(),
    account_no: form.account_no.trim(),
    request_note: form.request_note.trim()
  }
  submitting.value = true
  try {
    const ok = await confirm(
      `确认申请提现${fishAmount.toFixed(1)}鱼干（折合人民币¥${money(yuanAmount)}）到${method.label}账号 ${payload.account_no} 吗？`,
      '确认提现'
    )
    if (!ok || !pageActive || token !== sessionToken()) return
    await createWithdrawal(payload)
    if (!pageActive || token !== sessionToken()) return
    form.amount = ''
    form.request_note = ''
    success('提现申请已提交，等待财务审核')
    activeTab.value = 'withdrawals'
    await loadAll()
  } catch (error) {
    if (token === sessionToken()) toast(getErrorMessage(error, '提现申请失败'))
  } finally {
    if (token === sessionToken()) submitting.value = false
  }
}

onShow(async () => {
  pageActive = true
  if (loadedToken && loadedToken !== sessionToken()) resetSessionView()
  const approval = approvalSession()
  const approved = await isApprovedPlayer()
  if (!pageActive || approval !== approvalSession()) return
  if (!approved) {
    toast('请先成为已通过审核的陪玩师')
    replace('/pages/player/apply/index')
    return
  }
  await loadAll()
  if (!pageActive || approval !== approvalSession()) return
  try {
    pendingDiamond.value = readDiamondWithdrawal(currentActor())
    if (pendingDiamond.value) {
      methodIndex.value = methods.findIndex(item => item.value === 'diamonds')
      form.amount = pendingDiamond.value.amount
      await recoverDiamondWithdrawal(false)
    }
  } catch (error) {
    toast(getErrorMessage(error, '原兑换请求恢复失败'))
  }
})
</script>

<style lang="scss" scoped>
.earnings-page { min-height: 100vh; padding: 22rpx 24rpx 80rpx; box-sizing: border-box; color: var(--ui-text, #172116); background: radial-gradient(circle at 10% 0%, rgba(216,161,68,.14), transparent 30%), radial-gradient(circle at 90% 14%, var(--ui-accent-soft, rgba(47,155,99,.12)), transparent 28%), var(--ui-soft, #f7f3ea); }
.hero-card, .card, .balance-grid, .empty-card { border-radius: 28rpx; background: var(--ui-surface, rgba(255,255,255,.96)); border: 1rpx solid var(--ui-accent-line, rgba(39,61,42,.08)); box-shadow: 0 14rpx 34rpx var(--ui-shadow, rgba(39,61,42,.06)); }
.hero-card { padding: 30rpx; color: #fff; background: var(--ui-gradient); }
.hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; }
.hero-top > view { flex: 1; min-width: 0; }
.hero-title { display: block; }

.hero-title { font-size: 40rpx; font-weight: 900; }
.refresh-btn { min-width: 110rpx; height: 58rpx; margin: 0; padding: 0 20rpx; border-radius: 999rpx; color: #fff; font-size: 23rpx; font-weight: 900; background: rgba(255,255,255,.14); }
.refresh-btn::after, .withdraw-btn::after { border: none; }
.available-block { margin-top: 28rpx; padding: 24rpx; border-radius: 24rpx; background: rgba(255,255,255,.12); }
.available-block > text { display: block; }
.available-block > text:first-child { color: rgba(255,255,255,.72); font-size: 22rpx; }
.available-block > view { display: flex; align-items: baseline; gap: 10rpx; margin-top: 8rpx; }
.available-block > view text:last-child { font-size: 60rpx; line-height: 1; font-weight: 900; }
.currency { font-size: 22rpx; font-weight: 900; }
.balance-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rpx; margin-top: 20rpx; overflow: hidden; }
.balance-item { padding: 24rpx 8rpx; text-align: center; background: var(--ui-surface, #fff); }
.balance-item.debt { background: var(--ui-surface, #fff0ed); }
.balance-item text { display: block; }
.balance-item text:first-child { color: var(--ui-text, #172116); font-size: 31rpx; font-weight: 900; }
.balance-item.debt text:first-child { color: var(--ui-danger, #a13d35); }
.balance-item text:last-child { margin-top: 5rpx; color: var(--ui-muted, #879083); font-size: 20rpx; }
.wallet-warning { display: flex; align-items: flex-start; gap: 12rpx; margin-top: 18rpx; padding: 18rpx 20rpx; border-radius: 18rpx; color: var(--ui-danger, #8f3d32); background: var(--ui-surface, #fff0ed); font-size: 22rpx; line-height: 1.5; }
.wallet-warning text:first-child { width: 34rpx; height: 34rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: var(--ui-danger-fill, #a13d35); font-weight: 900; }
.card { margin-top: 20rpx; padding: 26rpx; }
.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; }
.card-head > view { flex: 1; min-width: 0; }
.card-title { display: block; }
.card-title { font-size: 30rpx; font-weight: 900; }
.available-chip { padding: 7rpx 13rpx; border-radius: 999rpx; color: var(--ui-accent, #1f7c4b); font-size: 20rpx; font-weight: 900; background: var(--ui-soft, #eef8f1); }
.amount-input-wrap { display: flex; align-items: center; gap: 14rpx; margin-top: 22rpx; padding: 18rpx 20rpx; border-radius: 18rpx; background: var(--ui-soft, #f7faf4); }
.amount-input-wrap > text:first-child { color: var(--ui-gold, #a87520); font-size: 22rpx; font-weight: 900; }
.amount-input-wrap input { flex: 1; min-width: 0; font-size: 31rpx; font-weight: 900; }
.all-link { color: var(--ui-accent, #1f7c4b); font-size: 23rpx; font-weight: 900; }
.exchange-preview { display: block; margin-top: 10rpx; color: var(--ui-gold, #a87520); font-size: 21rpx; text-align: right; }
.form-row { min-height: 76rpx; display: flex; align-items: center; justify-content: space-between; gap: 20rpx; border-bottom: 1rpx solid var(--ui-accent-line, rgba(39,61,42,.07)); font-size: 24rpx; }
.form-row > text:first-child { flex-shrink: 0; color: var(--ui-muted, #687665); }
.form-row > text:last-child { text-align: right; font-weight: 800; }
.input-row input { flex: 1; text-align: right; font-size: 24rpx; }
.withdraw-btn { width: 100%; height: 84rpx; margin-top: 22rpx; border-radius: 999rpx; color: #fff; font-size: 27rpx; font-weight: 900; background: linear-gradient(135deg, #d8a144, #a87520); }
.withdraw-btn[disabled] { opacity: .52; }
.withdraw-tip { display: block; margin-top: 12rpx; color: var(--ui-muted, #8a9286); font-size: 20rpx; line-height: 1.5; text-align: center; }
.tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 10rpx; margin-top: 22rpx; padding: 8rpx; border-radius: 999rpx; background: var(--ui-surface, rgba(255,255,255,.82)); }
.tabs view { height: 62rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; color: var(--ui-muted, #687665); font-size: 25rpx; font-weight: 900; }
.tabs view.active { color: #fff; background: var(--ui-primary, #1f7c4b); }
.list-section { display: flex; flex-direction: column; }
.record-card { padding: 24rpx; }
.record-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16rpx; }
.record-head > view { flex: 1; min-width: 0; }
.record-title, .record-no { display: block; }
.record-title { font-size: 27rpx; font-weight: 900; }
.record-no { margin-top: 5rpx; color: var(--ui-muted, #9aa197); font-size: 19rpx; font-family: monospace; word-break: break-all; }
.status-chip { flex-shrink: 0; padding: 7rpx 13rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 900; }
.status-pending { color: var(--ui-gold, #9a6a16); background: var(--ui-soft, #fff3d4); }
.status-ready { color: var(--ui-accent, #1f7c4b); background: var(--ui-soft, #eef8f1); }
.status-paying { color: var(--ui-gold, #a87520); background: var(--ui-surface, #fff5df); }
.status-done { color: var(--ui-accent, #26753a); background: var(--ui-soft, #e4f7e8); }
.status-danger { color: var(--ui-danger, #a13d35); background: var(--ui-surface, #fff0ed); }
.amount-detail { margin-top: 18rpx; padding: 16rpx 18rpx; border-radius: 18rpx; background: var(--ui-soft, #f7faf4); }
.amount-detail view, .withdrawal-info view { min-height: 48rpx; display: flex; align-items: center; justify-content: space-between; gap: 16rpx; font-size: 22rpx; }
.amount-detail view text:first-child, .withdrawal-info view text:first-child { color: var(--ui-muted, #7d877a); }
.amount-detail view text:last-child, .withdrawal-info view text:last-child { flex: 1; text-align: right; font-weight: 800; word-break: break-all; }
.amount-detail .net-row { margin-top: 6rpx; padding-top: 8rpx; border-top: 1rpx solid var(--ui-accent-line, rgba(39,61,42,.08)); }
.amount-detail .net-row text:last-child { color: var(--ui-accent, #1f7c4b); font-size: 27rpx; font-weight: 900; }
.amount-detail .yuan-row { color: var(--ui-muted, #8a9286); }
.record-foot { margin-top: 13rpx; color: var(--ui-muted, #8a9286); font-size: 20rpx; line-height: 1.45; }
.withdrawal-info { margin-top: 16rpx; }
.reject-text { color: var(--ui-danger, #a13d35); }
.empty-card { margin-top: 20rpx; padding: 60rpx 24rpx; color: var(--ui-muted, #8a9286); text-align: center; font-size: 24rpx; }
.loading-state { padding: 50rpx 20rpx; color: var(--ui-muted, #8a9286); text-align: center; font-size: 24rpx; }
</style>
