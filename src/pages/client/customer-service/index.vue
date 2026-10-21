<template>
  <view :style="$appThemeStyle" class="support-page">
    <view class="support-hero">
      <text class="support-title">联系客服</text>
    </view>

    <view class="feedback-entry">
      <text class="feedback-title">投诉与反馈</text>
      <button class="feedback-action" @tap="openComplaints">去反馈</button>
    </view>

    <view v-if="scene === 'account-cancellation'" class="scene-notice">
      <text class="scene-notice-title">账号注销申请</text>
      <text class="scene-notice-text">请联系客服核验未完成订单、提现和身份信息后处理账号注销。</text>
    </view>

    <view v-if="loading" class="state-card">
      <text class="state-title">客服信息加载中</text>
    </view>

    <template v-else>
      <view v-if="loadError" class="state-card state-card--error">
        <text class="state-title">人工客服信息加载失败</text>
        <text class="state-sub">{{ loadError }}，微信官方客服仍可继续使用。</text>
        <button class="retry-button" @tap="loadSupportCenter">重新加载</button>
      </view>

      <view v-if="officialEnabled" class="channel-card official-card">
        <view class="channel-icon channel-icon--official">微</view>
        <view class="channel-main">
          <text class="channel-title">微信官方客服</text>
        </view>
        <button class="channel-action official-action" open-type="contact">进入客服</button>
      </view>

      <view class="section-head">
        <view>
          <text class="section-title">客服微信号</text>
        </view>
        <text v-if="contacts.length" class="section-count">{{ contacts.length }}位</text>
      </view>

      <view v-if="contacts.length" class="contact-list">
        <view v-for="contact in contacts" :key="contact.id" class="channel-card contact-card">
          <view class="channel-icon channel-icon--manual"><image class="support-pictogram" :src="uiIcons.support" mode="aspectFit" /></view>
          <view class="channel-main">
            <text class="channel-title">{{ contact.name }}</text>
            <text v-if="contact.description" class="channel-description">{{ contact.description }}</text>
            <text v-if="contact.service_hours" class="service-hours">服务时间：{{ contact.service_hours }}</text>
            <view class="wechat-row">
              <text class="wechat-label">微信号</text>
              <text class="wechat-id" user-select selectable>{{ contact.wechat_id }}</text>
            </view>
          </view>
          <button class="channel-action copy-action" @tap="copyWechat(contact.wechat_id)">复制</button>
        </view>
      </view>

      <view v-else class="state-card empty-card">
        <text class="state-title">人工客服微信暂未开放</text>
        <text class="state-sub">{{ officialEnabled ? '可先通过微信官方客服联系我们' : '请稍后再试' }}</text>
      </view>

      <view class="support-tip">
        <text>复制微信号后，请返回微信首页搜索并添加客服。平台客服不会主动索要支付密码或验证码。</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { uiIcons } from '@/utils/uiIcons'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getSupportCenter, type SupportContact } from '@/api/support'
import { getClientProfile } from '@/utils/client'
import { getErrorMessage } from '@/utils/feedback'
import { copyText } from '@/utils/clipboard'

function openComplaints() { uni.navigateTo({ url: '/pages/client/complaints/index' }) }

const loading = ref(true)
const loadError = ref('')
const officialEnabled = ref(true)
const contacts = ref<SupportContact[]>([])
const scene = ref('')

function currentAudience() {
  return getClientProfile()?.player ? 'player' as const : 'boss' as const
}

async function loadSupportCenter() {
  loading.value = true
  loadError.value = ''
  try {
    const payload = await getSupportCenter(currentAudience())
    officialEnabled.value = payload.official_customer_service_enabled !== false
    contacts.value = Array.isArray(payload.contacts) ? payload.contacts : []
  } catch (error) {
    loadError.value = getErrorMessage(error, '暂时无法获取人工客服信息')
    officialEnabled.value = true
    contacts.value = []
  } finally {
    loading.value = false
  }
}

function copyWechat(wechatId: string) {
  const value = String(wechatId || '').trim()
  if (!value) return
  copyText(value, 'customer-service')
}

onLoad((options) => {
  scene.value = String(options?.scene || '')
})

onShow(loadSupportCenter)
</script>

<style lang="scss" scoped>
.support-page { min-height: 100vh; padding: 24rpx 24rpx 80rpx; box-sizing: border-box; color: var(--ui-text, #172116); background: var(--ui-bg, #f7f3ea); }
.support-hero { padding: 12rpx 4rpx 20rpx; color: var(--ui-text, #172116); background: transparent; }
.support-title { display: block; }
.support-title { font-size: 44rpx; font-weight: 900; }
.feedback-entry { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; margin-top: 20rpx; padding: 18rpx 26rpx; border: 1rpx solid var(--ui-accent-line, rgba(39,61,42,.08)); border-radius: 24rpx; background: var(--ui-surface, rgba(255,255,255,.92)); }
.feedback-title { min-width: 0; color: var(--ui-text, #172116); font-size: 27rpx; font-weight: 700; }
.feedback-action { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 132rpx; height: 64rpx; margin: 0; padding: 12rpx 20rpx; box-sizing: border-box; border: 1rpx solid var(--ui-accent-line, rgba(31,124,75,.18)); border-radius: 999rpx; color: var(--ui-accent, #1f7c4b); background: var(--ui-soft, #eef8f1); font-size: 23rpx; font-weight: 700; line-height: 1.2; }
.feedback-action::after { border: none; }
.scene-notice { margin-top: 20rpx; padding: 24rpx; border: 1rpx solid var(--ui-gold-line, rgba(216,161,68,.28)); border-radius: 24rpx; background: var(--ui-surface, #fff7e5); }
.scene-notice-title,.scene-notice-text { display: block; }
.scene-notice-title { color: var(--ui-gold, #8b5b13); font-size: 27rpx; font-weight: 900; }
.scene-notice-text { margin-top: 8rpx; color: var(--ui-gold, #795f31); font-size: 22rpx; line-height: 1.55; }
.channel-card,.state-card { margin-top: 20rpx; padding: 26rpx; border: 1rpx solid var(--ui-accent-line, rgba(39,61,42,.08)); border-radius: 28rpx; background: var(--ui-surface, rgba(255,255,255,.97)); box-shadow: 0 14rpx 34rpx var(--ui-shadow, rgba(39,61,42,.06)); }
.channel-card { display: flex; align-items: center; gap: 18rpx; }
.official-card { border-color: var(--ui-accent-line, rgba(47,155,99,.16)); background: linear-gradient(135deg,var(--ui-soft, #f2fbf5),var(--ui-surface, #fff)); }
.channel-icon { width: 70rpx; height: 70rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 22rpx; color: #fff; font-size: 28rpx; font-weight: 900; background: linear-gradient(135deg,#5b9ad8,#2a6db4); }
.channel-icon--official { background: var(--ui-gradient); }
.channel-main { flex: 1; min-width: 0; }
.channel-title,.channel-description,.service-hours { display: block; }
.channel-title { color: var(--ui-text, #172116); font-size: 29rpx; font-weight: 900; }
.channel-description { margin-top: 7rpx; color: var(--ui-muted, #687665); font-size: 21rpx; line-height: 1.5; }
.service-hours { margin-top: 9rpx; color: var(--ui-gold, #8b6a34); font-size: 20rpx; }
.channel-action { flex-shrink: 0; min-width: 112rpx; height: 64rpx; margin: 0; padding: 0 20rpx; border-radius: 999rpx; font-size: 22rpx; font-weight: 900; line-height: 64rpx; }
.channel-action::after { border: none; }
.official-action { color: #fff; background: var(--ui-primary, #1f7c4b); }
.copy-action { color: var(--ui-accent, #1f7c4b); border: 1rpx solid var(--ui-accent-line, rgba(31,124,75,.18)); background: var(--ui-soft, #eef8f1); }
.section-head { margin-top: 30rpx; display: flex; align-items: flex-end; justify-content: space-between; gap: 16rpx; padding: 0 6rpx; }
.section-head text { display: block; }
.section-title { color: var(--ui-text, #172116); font-size: 32rpx; font-weight: 900; }
.section-count { color: var(--ui-muted, #879083); font-size: 21rpx; }
.contact-list { display: flex; flex-direction: column; }
.contact-card { align-items: flex-start; }
.wechat-row { margin-top: 14rpx; display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.wechat-label { padding: 5rpx 10rpx; border-radius: 999rpx; color: var(--ui-accent, #1f7c4b); font-size: 18rpx; font-weight: 900; background: var(--ui-soft, #eef8f1); }
.wechat-id { color: var(--ui-text, #172116); font-size: 27rpx; font-weight: 900; font-family: 'SF Mono','DIN Alternate',monospace; word-break: break-all; }
.state-card { text-align: center; }
.state-title,.state-sub { display: block; }
.state-title { color: var(--ui-text, #172116); font-size: 28rpx; font-weight: 900; }
.state-sub { margin-top: 9rpx; color: var(--ui-muted, #879083); font-size: 22rpx; line-height: 1.5; }
.state-card--error { border-color: var(--ui-danger, rgba(161,61,53,.16)); background: var(--ui-surface, #fff7f5); }
.retry-button { width: 220rpx; height: 68rpx; margin-top: 20rpx; border-radius: 999rpx; color: #fff; font-size: 23rpx; font-weight: 900; line-height: 68rpx; background: var(--ui-primary, #1f7c4b); }
.retry-button::after { border: none; }
.empty-card { margin-top: 16rpx; }
.support-tip { margin-top: 24rpx; padding: 8rpx 4rpx; color: var(--ui-muted, #687665); background: transparent; }
.support-tip text { font-size: 24rpx; line-height: 1.55; }
.channel-icon--manual { background: transparent; }
.support-pictogram { width: 52rpx; height: 52rpx; display: block; }
</style>
