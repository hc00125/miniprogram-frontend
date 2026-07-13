<template>
  <view class="club-page login-page">
    <view class="brand-block">
      <view class="brand-bg">
        <view class="ambient-glow ambient-glow--left"></view>
        <view class="ambient-glow ambient-glow--right"></view>
      </view>
      <view class="brand-content">
        <view class="brand-mark"><text>竞</text></view>
        <view class="brand-name">偷吃电竞</view>
        <view class="brand-tagline">专业陪玩平台 · 资深客服</view>
        <view class="brand-slogan">
          <text class="slogan-cn">今晚一起</text>
          <text class="slogan-accent">开局</text>
        </view>
        <view class="brand-sub">登录后可点单、查看订单进度、申请成为陪玩师</view>
      </view>
    </view>

    <view class="hero-ip">
      <view class="ip-frame">
        <view class="ip-glow"></view>
        <view class="ip-content">
          <text class="ip-emoji">🎮</text>
          <text class="ip-title">偷吃电竞 · 真实陪玩</text>
          <text class="ip-sub">深夜车队 · 快速开局 · 安全保障</text>
        </view>
      </view>
    </view>

    <view class="login-form">
      <view class="avatar-section">
        <button
          class="avatar-btn"
          :class="{ disabled: !agreementAccepted }"
          :open-type="agreementAccepted ? 'chooseAvatar' : ''"
          @tap="ensureAgreement"
          @chooseavatar="chooseAvatar"
        >
          <image v-if="avatarUrl" class="avatar-img" :src="avatarUrl" mode="aspectFill" />
          <text v-else class="avatar-placeholder">选头像</text>
        </button>
        <text class="avatar-hint">同意协议后可选择微信头像</text>
      </view>

      <view class="agreement-card" @tap="agreementAccepted = !agreementAccepted">
        <view class="checkbox" :class="{ checked: agreementAccepted }">
          <text v-if="agreementAccepted">✓</text>
        </view>
        <view class="agreement-text">
          <text>我已阅读并同意</text>
          <text class="agreement-link" @tap.stop="openAgreement">《用户服务协议》</text>
          <text>和</text>
          <text class="agreement-link" @tap.stop="openPrivacy">《隐私政策》</text>
        </view>
      </view>
      <text class="agreement-hint">默认不勾选。请阅读后自主选择，未同意不会调用微信登录。</text>

      <button
        class="club-btn wechat-btn"
        :disabled="loading || !agreementAccepted"
        @tap="wechatLogin"
      >
        <text class="wechat-btn-icon">微</text>
        <text>{{ loading ? '登录中...' : '微信一键登录' }}</text>
      </button>

      <button class="skip-btn" @tap="goMain('home')">暂不登录，先逛首页</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { go, replace, relaunch } from '@/utils/nav'
import { saveClientProfile, shouldUploadAvatarUrl } from '@/utils/client'
import { setStorage } from '@/utils/storage'
import { updateClientProfileApi, uploadClientAvatarApi, wechatLogin as apiWechatLogin } from '@/api/client'
import { success, toast } from '@/utils/feedback'

const avatarUrl = ref('')
const nickname = ref('')
const loading = ref(false)
const agreementAccepted = ref(false)

function ensureAgreement() {
  if (!agreementAccepted.value) toast('请先阅读并同意用户服务协议和隐私政策')
}

function chooseAvatar(event: any) {
  if (!agreementAccepted.value) return
  avatarUrl.value = event.detail.avatarUrl
}

function openPrivacy() {
  go('/pages/legal/privacy/index')
}

function openAgreement() {
  go('/pages/legal/user-agreement/index')
}

async function wechatLogin() {
  if (!agreementAccepted.value) {
    toast('请先阅读并同意用户服务协议和隐私政策')
    return
  }
  loading.value = true
  try {
    const trimmedNickname = nickname.value.trim()
    const loginRes: any = await new Promise((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    if (!loginRes?.code) throw new Error('微信登录凭证获取失败')
    const result = await apiWechatLogin({
      code: loginRes.code,
      nickname: trimmedNickname || '微信用户',
      avatar_url: ''
    })
    setStorage('token', result.token)
    let profile = result.profile
    if (shouldUploadAvatarUrl(avatarUrl.value)) {
      try {
        const uploaded = await uploadClientAvatarApi(avatarUrl.value)
        if (uploaded.avatar_url) {
          profile = await updateClientProfileApi({ avatar_url: uploaded.avatar_url })
        }
      } catch {
        toast('头像上传失败，可稍后在账号信息重试')
      }
    }
    saveClientProfile(profile)
    success('登录成功')
    replace('/pages/client/profile/index')
  } catch {
    toast('微信登录失败')
  } finally {
    loading.value = false
  }
}

const goMain = (tab = 'home') => relaunch('/pages/boss/home/index', { tab })
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';

.login-page {
  min-height: 100vh;
  padding: 24rpx 36rpx 80rpx;
  box-sizing: border-box;
  background:
    radial-gradient(ellipse at 12% 0%, rgba(216, 161, 68, 0.16), transparent 38%),
    radial-gradient(ellipse at 88% 20%, rgba(47, 155, 99, 0.16), transparent 32%),
    linear-gradient(180deg, #fbf7ef 0%, #f5f1e3 60%, #eef6ea 100%);
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.brand-block {
  position: relative;
  margin-top: 40rpx;
  padding: 32rpx 24rpx 36rpx;
  overflow: hidden;
  border-radius: 28rpx;
  background: transparent;
  text-align: center;
}

.brand-bg { position: absolute; inset: 0; pointer-events: none; }
.ambient-glow { position: absolute; border-radius: 50%; filter: blur(50rpx); opacity: 0.40; }
.ambient-glow--left {
  top: -100rpx;
  left: -60rpx;
  width: 280rpx;
  height: 280rpx;
  background: radial-gradient(circle, rgba(216, 161, 68, 0.60), transparent 70%);
}
.ambient-glow--right {
  bottom: -60rpx;
  right: -40rpx;
  width: 260rpx;
  height: 260rpx;
  background: radial-gradient(circle, rgba(47, 155, 99, 0.50), transparent 70%);
}
.brand-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.brand-mark {
  width: 96rpx;
  height: 96rpx;
  margin-bottom: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  color: #f3d79b;
  font-size: 40rpx;
  font-weight: 900;
  background: linear-gradient(145deg, #173426, #1f7c4b);
  box-shadow: 0 14rpx 28rpx rgba(23, 52, 38, 0.20);
}
.brand-name { color: #14291f; font-size: 34rpx; font-weight: 900; }
.brand-tagline {
  display: inline-flex;
  margin-top: 4rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  color: #a87520;
  font-size: 20rpx;
  font-weight: 800;
  letter-spacing: 0.5rpx;
  background: rgba(255, 247, 223, 0.94);
  border: 1px solid rgba(216, 161, 68, 0.30);
}
.brand-slogan {
  margin-top: 22rpx;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4rpx;
  color: #14291f;
  font-size: 60rpx;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -1.5rpx;
}
.slogan-accent {
  color: transparent;
  background: linear-gradient(135deg, #f3d79b, #d8a144);
  -webkit-background-clip: text;
  background-clip: text;
}
.brand-sub { margin-top: 12rpx; color: #5a6b5b; font-size: 24rpx; font-weight: 600; line-height: 1.4; }
.hero-ip { margin-top: 24rpx; }
.ip-frame {
  position: relative;
  min-height: 240rpx;
  padding: 36rpx 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #173426 0%, #1f7c4b 60%, #2f9b63 100%);
  box-shadow: 0 18rpx 40rpx rgba(23, 52, 38, 0.16);
}
.ip-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 30%, rgba(216, 161, 68, 0.40), transparent 40%),
    radial-gradient(circle at 82% 70%, rgba(95, 183, 138, 0.50), transparent 50%);
}
.ip-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  text-align: center;
}
.ip-emoji { margin-bottom: 6rpx; font-size: 76rpx; line-height: 1; filter: drop-shadow(0 6rpx 18rpx rgba(0, 0, 0, 0.30)); }
.ip-title { color: #fffaf0; font-size: 30rpx; font-weight: 900; letter-spacing: 0.5rpx; text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.20); }
.ip-sub { color: rgba(255,255,255,.84); font-size: 23rpx; font-weight: 600; line-height: 1.4; }
.login-form {
  margin-top: 24rpx;
  padding: 32rpx 28rpx 24rpx;
  border: 1px solid rgba(42, 63, 48, 0.06);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14rpx 36rpx rgba(38, 69, 54, 0.06);
}
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 28rpx;
}
.avatar-btn {
  width: 152rpx;
  height: 152rpx;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  color: #1f7c4b;
  font-size: 26rpx;
  font-weight: 800;
  background: linear-gradient(135deg, #fff7df, #eef9ef);
  border: 2rpx dashed rgba(47, 155, 99, 0.30);
}
.avatar-btn.disabled { opacity: .58; }
.avatar-img { width: 100%; height: 100%; }
.avatar-placeholder { color: #1f7c4b; font-size: 26rpx; font-weight: 800; }
.avatar-hint { color: #828a7e; font-size: 21rpx; font-weight: 600; }
.agreement-card {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  padding: 18rpx;
  border-radius: 18rpx;
  background: #f7faf4;
  border: 1rpx solid rgba(39,61,42,.08);
}
.checkbox {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8rpx;
  color: #fff;
  font-size: 23rpx;
  font-weight: 900;
  background: #fff;
  border: 2rpx solid #aeb7ad;
  box-sizing: border-box;
}
.checkbox.checked { background: #2f9b63; border-color: #2f9b63; }
.agreement-text { flex: 1; color: #687665; font-size: 22rpx; line-height: 1.65; }
.agreement-link { color: #1f7c4b; font-weight: 900; text-decoration: underline; }
.agreement-hint { display: block; margin-top: 10rpx; color: #9aa197; font-size: 20rpx; line-height: 1.5; }
.wechat-btn {
  width: 100%;
  min-height: 96rpx;
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border-radius: 24rpx;
  color: #fff;
  font-size: 32rpx;
  font-weight: 900;
  background: linear-gradient(135deg, #4ec269, #1a7e3c);
  box-shadow: 0 14rpx 28rpx rgba(30, 126, 60, 0.30);
}
.wechat-btn[disabled] { opacity: .48; box-shadow: none; }
.wechat-btn-icon {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 12rpx;
  color: #fff;
  font-size: 24rpx;
  font-weight: 900;
  background: rgba(255,255,255,.22);
}
.skip-btn {
  width: 100%;
  min-height: 72rpx;
  margin-top: 16rpx;
  border-radius: 22rpx;
  color: #5a6b5b;
  font-size: 26rpx;
  font-weight: 600;
  background: transparent;
  border: 1px solid rgba(42, 63, 48, 0.10);
}
.avatar-btn::after, .wechat-btn::after, .skip-btn::after { border: none; }
</style>
