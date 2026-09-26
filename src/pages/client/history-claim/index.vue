<template>
  <view class="claim-page">
    <view class="intro"><text class="eyebrow">客服订单 · 历史认领</text><text class="title">把以前的订单找回来</text><text class="sub">向原客服索取客户编号，核实后统一查看服务记录。</text></view>
    <view v-if="!loggedIn" class="card"><text>请先微信登录，再认领属于自己的历史订单。</text><button class="primary" @tap="go('/pages/client/login/index')">微信登录</button></view>
    <template v-else>
      <view v-if="errorText" class="error">{{ errorText }}</view>
      <view v-if="data?.customer" class="card"><view class="head"><text class="section-title">已关联客户档案</text><text class="badge">认领成功</text></view><text class="customer-name">{{ data.customer.nickname }}</text><text class="sub">客户编号 {{ data.customer.id }}</text><text class="sub">客服历史单和小程序自助单，均可在订单中心查看。</text><button class="primary" @tap="goMain('query')">查看我的订单</button></view>
      <view v-else class="card"><text class="section-title">提交认领申请</text><text class="label">客户编号</text><input v-model="customerId" type="number" maxlength="16" placeholder="填写原客服提供的数字编号" :disabled="posting" /><text class="hint">不是个人中心显示的ID，也不是微信号。</text><text class="label">核实说明</text><textarea v-model="message" maxlength="300" placeholder="例如：原群昵称、常联系的客服，方便核实本人" :disabled="posting" /><view class="consent" @tap="!posting && (consent = !consent)"><text class="check" :class="{ checked: consent }">{{ consent ? '✓' : '' }}</text><text>确认该客户档案及历史订单属于本人</text></view><button class="primary" :loading="posting" :disabled="!canSubmit" @tap="submit">提交给客服核实</button><text class="hint">提交申请不会直接绑定。客服核实后关联记录，不重复扣款，不变更钱包余额。</text></view>
      <view class="card"><view class="head"><text class="section-title">申请进度</text><button class="refresh" :disabled="loading || posting" :loading="loading" @tap="load">刷新</button></view><text v-if="loading && !data" class="sub">正在查询…</text><text v-else-if="!data?.claims.length" class="sub">暂无认领申请</text><view v-for="item in data?.claims || []" :key="item.id" class="claim"><view class="head"><text>客户编号 {{ item.customer_id }}</text><text class="badge">{{ statusText(item.status) }}</text></view><text class="sub">{{ item.message }}</text><text v-if="item.status === 'pending'" class="hint">请联系原客服核实身份，审核后刷新查看。</text><text v-if="item.status === 'rejected'" class="hint">本次未通过，请联系原客服核对信息。</text></view></view>
    </template>
    <button class="support" @tap="go('/pages/client/customer-service/index')">联系人工客服</button>
  </view>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getHistoryClaims, submitHistoryClaim, type HistoryClaims } from '@/api/history'
import { getStorage, SESSION_CHANGED_EVENT } from '@/utils/storage'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
import { go, goMain } from '@/utils/nav'
import { getErrorMessage, success } from '@/utils/feedback'

const data = ref<HistoryClaims | null>(null)
const customerId = ref(''), message = ref(''), consent = ref(false)
const loading = ref(false), posting = ref(false), loggedIn = ref(false), errorText = ref('')
let generation = 0
const canSubmit = computed(() => loggedIn.value && !posting.value && consent.value && /^[1-9][0-9]{0,15}$/.test(customerId.value.trim()) && Number.isSafeInteger(Number(customerId.value)) && !!message.value.trim())
function valid(token: string, epoch: number) { return generation === epoch && getStorage<string>('token') === token }
function reset() { generation++; data.value = null; customerId.value = ''; message.value = ''; consent.value = false; loading.value = false; posting.value = false; errorText.value = ''; loggedIn.value = !!getStorage<string>('token') }
function statusText(status: string) { return ({pending:'待客服核实',approved:'已认领',rejected:'未通过'} as Record<string,string>)[status] || '待核实' }
async function load() {
  const token = getStorage<string>('token') || ''; loggedIn.value = !!token
  if (!token) { reset(); return }
  const epoch = ++generation; loading.value = true; errorText.value = ''
  try { const result = await getHistoryClaims(); if (valid(token, epoch)) data.value = result }
  catch (error) { if (valid(token, epoch)) errorText.value = getErrorMessage(error, '查询失败，请稍后刷新') }
  finally { if (valid(token, epoch)) loading.value = false }
}
async function submit() {
  if (!canSubmit.value) return
  const token = getStorage<string>('token') || '', epoch = generation
  posting.value = true; errorText.value = ''
  try {
    await submitHistoryClaim({ customer_id: Number(customerId.value.trim()), message: message.value.trim() })
    if (!valid(token, epoch)) return
    posting.value = false; consent.value = false; success('申请已提交，等待客服核实'); await load()
  } catch (error) { if (valid(token, epoch)) errorText.value = getErrorMessage(error, '提交结果未确认，请先刷新申请进度') }
  finally { if (valid(token, epoch)) posting.value = false }
}
onShow(load)
onHide(() => { generation++; loading.value = false; posting.value = false })
uni.$on(SESSION_CHANGED_EVENT, reset)
uni.$on(SESSION_EXPIRED_EVENT, reset)
onUnload(() => { reset(); uni.$off(SESSION_CHANGED_EVENT, reset); uni.$off(SESSION_EXPIRED_EVENT, reset) })
</script>
<style scoped>
.claim-page{min-height:100vh;padding:30rpx;background:#fbf7ef;color:#293e30;box-sizing:border-box}.intro{padding:18rpx 8rpx 32rpx}.eyebrow{font-size:22rpx;color:#728775;display:block}.title{font-size:42rpx;font-weight:750;display:block;margin:12rpx 0}.sub,.hint{font-size:25rpx;color:#798577;line-height:1.7;display:block;margin-top:12rpx}.hint{font-size:23rpx}.card{background:#fff;border:1rpx solid #e7eddf;border-radius:28rpx;padding:30rpx;margin-bottom:24rpx}.head{display:flex;justify-content:space-between;align-items:center;gap:16rpx}.section-title{font-size:30rpx;font-weight:700}.label{display:block;font-size:27rpx;margin:28rpx 0 14rpx}input,textarea{background:#f7f9f3;border:1rpx solid #e0e8d9;border-radius:16rpx;padding:22rpx;font-size:28rpx;box-sizing:border-box;width:100%}input{height:88rpx}textarea{height:180rpx}.primary{display:flex;align-items:center;justify-content:center;width:100%;min-height:92rpx;padding:22rpx 24rpx;box-sizing:border-box;background:#1f7c4b;color:white;border-radius:22rpx;margin:26rpx 0 12rpx;font-size:29rpx;font-weight:650}.primary[disabled]{background:#d4dfd0;color:#849180}.consent{display:flex;align-items:center;gap:14rpx;margin-top:26rpx;font-size:24rpx;color:#687b66}.check{display:flex;align-items:center;justify-content:center;width:32rpx;height:32rpx;border:2rpx solid #bfd1b9;border-radius:8rpx;flex-shrink:0}.checked{background:#1f7c4b;border-color:#1f7c4b;color:#fff}.badge{font-size:22rpx;background:#eef9ef;color:#1f7c4b;border-radius:20rpx;padding:7rpx 14rpx;white-space:nowrap}.customer-name{display:block;font-size:36rpx;font-weight:650;margin-top:24rpx}.claim{padding:24rpx 0;border-top:1rpx solid #edf0e6;margin-top:20rpx}.refresh{display:flex;padding:8rpx 18rpx;border-radius:16rpx;background:#eef9ef;font-size:24rpx;color:#1f7c4b;margin:0}.support{display:flex;justify-content:center;width:100%;padding:20rpx;background:transparent;color:#1f7c4b;font-size:26rpx}.error{background:#fff0e3;color:#9c6029;padding:24rpx;border-radius:20rpx;margin-bottom:22rpx;font-size:25rpx}
</style>
