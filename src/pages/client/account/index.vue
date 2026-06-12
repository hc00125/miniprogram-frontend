<template>
  <view class="club-page account-page">
    <view class="account-hero brand-poster">
      <view class="hero-top">
        <view class="hero-tag">账号信息</view>
        <view class="hero-sub">登录身份与基础资料</view>
      </view>
      <view class="hero-body">
        <button class="avatar-shell" open-type="chooseAvatar" @chooseavatar="chooseAvatar">
          <image v-if="draftAvatar" class="avatar-img" :src="draftAvatar" mode="aspectFill" />
          <text v-else>{{ displayInitial }}</text>
        </button>
        <view class="identity-block">
          <view class="identity-name">{{ draftNickname || '未设置昵称' }}</view>
          <view class="identity-meta">{{ statusText }}</view>
          <view class="identity-tip">点击头像可重新选择头像</view>
        </view>
      </view>
    </view>

    <view class="club-card form-card">
      <view class="club-card__hd form-head">
        <text class="club-card__title">基础资料</text>
        <text class="helper">保存后立即同步到个人中心</text>
      </view>
      <view class="club-card__bd form-body">
        <view class="field-group">
          <text class="field-label">昵称</text>
          <input v-model="draftNickname" class="club-input" maxlength="20" placeholder="请输入你的昵称" />
        </view>
        <view class="field-group readonly">
          <text class="field-label">当前身份</text>
          <text class="field-value">{{ statusText }}</text>
        </view>
      </view>
    </view>

    <view class="club-card action-card">
      <button class="club-btn save-btn" :disabled="saving" @tap="handleSave">
        {{ saving ? '保存中...' : '保存资料' }}
      </button>
      <button class="ghost-btn" @tap="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { updateClientProfileApi, uploadClientAvatarApi } from '@/api/client'
import { getClientProfile, normalizeAvatarUrl, saveClientProfile, shouldUploadAvatarUrl, syncClientProfile, type ClientProfile } from '@/utils/client'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { replace } from '@/utils/nav'
import { clearPlayerAuth } from '@/utils/storage'

const profile = ref<ClientProfile | null>(null)
const draftNickname = ref('')
const draftAvatar = ref('')
const saving = ref(false)

const statusText = computed(() => {
  const status = profile.value?.player_status || 'none'
  if (status === 'approved') return '已成为陪玩师'
  if (status === 'pending') return '申请审核中'
  if (status === 'rejected') return '申请未通过'
  return '普通用户'
})
const displayInitial = computed(() => (draftNickname.value.trim().slice(0, 1) || '微'))

function syncDraft(current: ClientProfile | null) {
  profile.value = current
  draftNickname.value = current?.nickname || ''
  draftAvatar.value = current?.avatarUrl || current?.avatar_url || ''
}

async function loadAccount() {
  const localProfile = getClientProfile()
  if (!localProfile) {
    replace('/pages/client/login/index')
    return
  }
  syncDraft(localProfile)
  try {
    const latest = await syncClientProfile()
    syncDraft(latest)
  } catch (error) {
    toast('账号信息刷新失败')
  }
}

function chooseAvatar(event: any) {
  draftAvatar.value = event.detail.avatarUrl || ''
}

async function handleSave() {
  const nickname = draftNickname.value.trim()
  if (!nickname) {
    toast('请先填写昵称')
    return
  }

  saving.value = true
  try {
    let avatarUrl = normalizeAvatarUrl(draftAvatar.value)
    if (shouldUploadAvatarUrl(draftAvatar.value)) {
      const uploaded = await uploadClientAvatarApi(draftAvatar.value)
      avatarUrl = uploaded.avatar_url || ''
    }
    const updated = await updateClientProfileApi({
      nickname,
      avatar_url: avatarUrl
    })
    saveClientProfile(updated)
    syncDraft(updated)
    success('资料已保存')
  } catch (error) {
    toast(getErrorMessage(error, '保存失败'))
  } finally {
    saving.value = false
  }
}

async function handleLogout() {
  const ok = await confirm('确定退出当前账号吗？')
  if (!ok) return
  clearPlayerAuth()
  replace('/pages/client/login/index')
}

onShow(loadAccount)
</script>

<style lang="scss" scoped>
.account-hero {
  padding: 28rpx;
}

.hero-top {
  position: relative;
  z-index: 1;
}

.hero-tag {
  color: #a87520;
  font-size: 22rpx;
  font-weight: 900;
  letter-spacing: 4rpx;
}

.hero-sub {
  margin-top: 8rpx;
  color: #687665;
  font-size: 24rpx;
}

.hero-body {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  gap: 22rpx;
  position: relative;
  z-index: 1;
}

.avatar-shell {
  width: 150rpx;
  height: 150rpx;
  border-radius: 42rpx;
  background: #172116;
  border: 1px solid rgba(216,161,68,.18);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #d8a144;
  font-size: 54rpx;
  font-weight: 900;
}

.avatar-img {
  width: 150rpx;
  height: 150rpx;
}

.identity-block {
  flex: 1;
  min-width: 0;
}

.identity-name {
  color: #172116;
  font-size: 44rpx;
  font-weight: 900;
  word-break: break-all;
}

.identity-meta {
  margin-top: 12rpx;
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(47,155,99,.10);
  color: #1f7c4b;
  font-size: 23rpx;
}

.identity-tip {
  margin-top: 16rpx;
  color: #687665;
  font-size: 22rpx;
}

.form-card {
  padding-bottom: 10rpx;
}

.form-head {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.helper {
  color: #687665;
  font-size: 23rpx;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.field-label {
  color: #475646;
  font-size: 25rpx;
  font-weight: 800;
}

.readonly {
  padding: 22rpx;
  border-radius: 24rpx;
  background: linear-gradient(180deg, #f7faf4, #f2f6ef);
  border: 1px solid rgba(37,49,35,.06);
}

.field-value {
  color: #172116;
  font-size: 30rpx;
  font-weight: 900;
}

.action-card {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.save-btn {
  width: 100%;
}

.ghost-btn {
  width: 100%;
  height: 90rpx;
  border-radius: 28rpx;
  background: #fff;
  color: #7c4e16;
  border: 1px solid rgba(199,145,70,.22);
  font-size: 28rpx;
  font-weight: 800;
}
</style>
