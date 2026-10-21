<template>
  <view :style="$appThemeStyle" class="page">
    <view class="brand-row"><text>偷吃电竞 · 客服反馈</text></view>
    <button class="primary feedback-action" hover-class="button-pressed" @tap="create">
      <view class="action-icon"><image class="feedback-icon" :src="uiIcons.feedbackLight" mode="aspectFit" /></view>
      <view class="action-copy"><text class="action-title">提交反馈</text></view>
      <text class="action-arrow">›</text>
    </button>
    <view class="section-head"><view class="section-title"><text class="heading">我的反馈</text><text v-if="loggedIn" class="feedback-count">{{ loading && !items.length ? '…' : items.length }}{{ hasMore && items.length ? '+' : '' }}</text></view></view>
    <view v-if="!loggedIn" class="card state-card"><text class="state-title">登录后查看反馈</text><button @tap="login">微信登录</button></view>
    <template v-else>
      <view v-if="error" class="card error"><text>{{ error }}</text><button :disabled="loading" @tap="load(items.length === 0)">重新加载</button></view>
      <view v-for="item in items" :key="item.number" class="card feedback-card" hover-class="card-pressed" @tap="open(item.number)">
        <view class="row"><text class="category">{{ categoryLabels[item.category] || '反馈' }}</text><text class="status">{{ statusLabels[item.status] || item.status }}</text></view>
        <text class="description">{{ item.description }}</text>
        <text class="number">编号 {{ item.number }}</text>
        <view class="card-footer"><text class="muted">更新于 {{ item.updated_at }}</text><text class="detail-arrow">›</text></view>
      </view>
      <view v-if="!loading && !error && !items.length" class="card state-card empty-state">
        <text class="state-title">还没有反馈记录</text><text class="muted">提交后，可在这里查看进度</text>
      </view>
      <button v-if="hasMore" :loading="loading" :disabled="loading" @tap="load(false)">{{ loading ? '加载中' : '加载更多' }}</button>
      <text v-else-if="items.length" class="muted end">— 已显示全部反馈 —</text>
    </template>
  </view>
</template>
<script setup lang="ts">
import { uiIcons } from '@/utils/uiIcons'
import { ref, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listComplaints, categoryLabels, statusLabels, type Complaint } from '@/api/complaints'
import { getErrorMessage } from '@/utils/feedback'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
const items = ref<Complaint[]>([])
const loading = ref(false), error = ref(''), hasMore = ref(true), loggedIn = ref(false)
let page = 1
async function load(reset = true) {
  if (loading.value) return
  loggedIn.value = Boolean(uni.getStorageSync('token'))
  if (!loggedIn.value) { items.value = []; return }
  loading.value = true; error.value = ''
  try {
    const result = await listComplaints(reset ? 1 : page)
    items.value = reset ? result.results : [...items.value, ...result.results]
    page = reset ? 2 : page + 1
    hasMore.value = Boolean(result.next)
  } catch (e) { error.value = getErrorMessage(e, '反馈加载失败，请重试') }
  finally { loading.value = false }
}
function login() { uni.navigateTo({ url: '/pages/client/login/index' }) }
function create() { uni.navigateTo({ url: '/pages/client/complaints/create' }) }
function open(number: string) { uni.navigateTo({ url: `/pages/client/complaints/detail?number=${encodeURIComponent(number)}` }) }
function clearSession(scope: string) { if (scope === 'token') { items.value = []; loggedIn.value = false } }
uni.$on(SESSION_EXPIRED_EVENT, clearSession)
onUnmounted(() => uni.$off(SESSION_EXPIRED_EVENT, clearSession))
onShow(() => { items.value = []; void load(true) })
</script>
<style scoped src="./buttons.css"></style>
<style scoped>
.page { min-height: 100vh; padding: 32rpx 28rpx calc(40rpx + env(safe-area-inset-bottom)); box-sizing: border-box; background: var(--ui-soft, #f7f3ea); color: var(--ui-text, #213a2b); }
.brand-row { padding: 0 4rpx 16rpx; font-size: 24rpx; color: var(--ui-muted, #657365); }
.page button.feedback-action { min-height: 104rpx; padding: 22rpx 24rpx; margin-top: 0; border-radius: 28rpx; text-align: left; justify-content: flex-start; box-shadow: none; }
.action-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 52rpx; height: 52rpx; background: transparent; margin-right: 18rpx; }
.action-copy { flex: 1; min-width: 0; }
.action-title { display: block; font-size: 34rpx; font-weight: 700; }
.action-arrow { margin-left: 16rpx; font-size: 42rpx; color: var(--ui-muted, #d5e9dc); font-weight: 400; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin: 44rpx 4rpx 20rpx; }
.section-title { display: flex; align-items: center; gap: 14rpx; }
.heading { font-size: 30rpx; font-weight: 700; }
.feedback-count { min-width: 38rpx; padding: 2rpx 10rpx; border-radius: 20rpx; background: var(--ui-soft, #e7ecdf); color: var(--ui-muted, #50684e); font-size: 22rpx; text-align: center; }
.card { background: var(--ui-surface, #fffefa); border: 1rpx solid var(--ui-line, #ececdf); border-radius: 26rpx; padding: 28rpx; margin: 18rpx 0; line-height: 1.6; word-break: break-all; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.category { font-size: 28rpx; font-weight: 600; }
.status { flex-shrink: 0; padding: 6rpx 16rpx; border-radius: 24rpx; background: var(--ui-soft, #edf4e9); color: var(--ui-accent, #32724c); font-size: 22rpx; }
.number, .muted { display: block; color: var(--ui-muted, #778172); font-size: 23rpx; }
.description { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 20rpx 0; white-space: pre-wrap; font-size: 27rpx; color: var(--ui-text, #3d4a3e); }
.card-footer { display: flex; align-items: center; justify-content: space-between; gap: 14rpx; margin-top: 20rpx; padding-top: 18rpx; border-top: 1rpx solid var(--ui-line, #eff0e9); }
.detail-arrow { font-size: 32rpx; color: var(--ui-muted, #78917a); }
.state-card { text-align: center; padding: 44rpx 30rpx; }
.empty-state { padding: 56rpx 30rpx 52rpx; }
.state-title { display: block; font-size: 29rpx; font-weight: 600; margin-bottom: 12rpx; }
.error { color: var(--ui-danger, #a13d35); font-size: 26rpx; }
.end { text-align: center; padding: 24rpx; font-size: 22rpx; }
.card-pressed { background: var(--ui-soft, #f0f4e9); }
</style>

<style scoped>
.feedback-icon { width: 52rpx; height: 52rpx; }
</style>
