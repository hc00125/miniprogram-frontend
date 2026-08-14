<template>
  <view class="club-page login-page">
    <view class="brand-card">
      <view class="brand-glow brand-glow--left"></view>
      <view class="brand-glow brand-glow--right"></view>
      <view class="brand-mark">竞</view>
      <text class="brand-name">偷吃电竞</text>
      <text class="brand-tagline">专业陪玩平台 · 资深客服</text>
      <view class="brand-slogan"><text>今晚一起</text><text>开局</text></view>
      <text class="brand-sub">登录后可点单、查看订单进度、申请成为陪玩师</text>
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
        <view class="checkbox" :class="{ checked: agreementAccepted }"><text v-if="agreementAccepted">✓</text></view>
        <view class="agreement-text">
          <text>我已阅读并同意</text>
          <text class="agreement-link" @tap.stop="openAgreement">《用户服务协议》</text>
          <text>和</text>
          <text class="agreement-link" @tap.stop="openPrivacy">《隐私政策》</text>
        </view>
      </view>
      <text class="agreement-hint">协议默认不勾选；未同意时不会调用微信登录。</text>

      <button class="wechat-btn" :disabled="loading || !agreementAccepted" @tap="wechatLogin">
        <text class="wechat-icon">微</text>
        <text>{{ loading ? '登录中...' : '微信一键登录' }}</text>
      </button>

      <button class="skip-btn" :disabled="loading" @tap="leaveLogin">暂不登录，返回首页</button>
      <text class="guest-tip">游客仍可浏览首页、商品、陪玩列表、服务条款和客服信息。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onBackPress } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { updateClientProfileApi, uploadClientAvatarApi, wechatLogin as apiWechatLogin } from '@/api/client'
import { isAccountRestricted, showAccountRestrictionModal } from '@/utils/accountRestriction'
import { saveClientProfile, shouldUploadAvatarUrl } from '@/utils/client'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { go, relaunch, replace } from '@/utils/nav'
import { setStorage } from '@/utils/storage'

const avatarUrl = ref('')
const loading = ref(false)
const agreementAccepted = ref(false)

function ensureAgreement() {
  if (!agreementAccepted.value) toast('请先阅读并同意用户服务协议和隐私政策')
}

function chooseAvatar(event: any) {
  if (!agreementAccepted.value) return
  avatarUrl.value = event.detail.avatarUrl || ''
}

function openPrivacy() {
  go('/pages/legal/privacy/index')
}

function openAgreement() {
  go('/pages/legal/user-agreement/index')
}

function leaveLogin() {
  // 审核要求：取消登录和系统返回都必须真正离开登录流程，不能退回受限页后再次弹回登录页。
  // 首页是公开 tabBar 页面，使用 reLaunch/switchTab 会清理登录页及其前方的受限页面栈。
  relaunch('/pages/boss/home/index', { tab: 'home' })
}

onBackPress(() => {
  // 必须同步返回 true 才能阻止默认 navigateBack；不要把此回调改成 async。
  leaveLogin()
  return true
})

async function wechatLogin() {
  if (!agreementAccepted.value) return ensureAgreement()
  loading.value = true
  try {
    const loginResult: any = await new Promise((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    if (!loginResult?.code) throw new Error('微信登录凭证获取失败')

    const result = await apiWechatLogin({ code: loginResult.code, nickname: '微信用户', avatar_url: '' })
    setStorage('token', result.token)
    let profile = result.profile
    if (shouldUploadAvatarUrl(avatarUrl.value)) {
      try {
        const uploaded = await uploadClientAvatarApi(avatarUrl.value)
        if (uploaded.avatar_url) profile = await updateClientProfileApi({ avatar_url: uploaded.avatar_url })
      } catch (error) {
        // 内容安全拒绝时保留后端的明确提示，避免审核人员只看到笼统“上传失败”。
        toast(getErrorMessage(error, '头像上传失败，可稍后在账号信息中重试'))
      }
    }
    saveClientProfile(profile)
    const restricted = isAccountRestricted(profile)
    if (!restricted) success('登录成功')
    replace('/pages/client/profile/index')
    if (restricted) {
      setTimeout(() => {
        void showAccountRestrictionModal(profile, { oncePerSession: true })
      }, 350)
    }
  } catch (error) {
    toast(getErrorMessage(error, '微信登录失败'))
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';
.login-page{min-height:100vh;padding:28rpx 34rpx 80rpx;box-sizing:border-box;background:linear-gradient(180deg,#fbf7ef,#eef6ea)}
.brand-card{position:relative;overflow:hidden;padding:38rpx 26rpx;border-radius:30rpx;text-align:center;background:linear-gradient(135deg,#173426,#1f7c4b 62%,#2f9b63);box-shadow:0 18rpx 42rpx rgba(23,52,38,.18)}
.brand-glow{position:absolute;width:260rpx;height:260rpx;border-radius:50%;filter:blur(48rpx);opacity:.45}.brand-glow--left{left:-100rpx;top:-120rpx;background:#d8a144}.brand-glow--right{right:-100rpx;bottom:-120rpx;background:#5fb78a}
.brand-mark{position:relative;width:92rpx;height:92rpx;margin:0 auto;display:flex;align-items:center;justify-content:center;border-radius:26rpx;color:#173426;font-size:40rpx;font-weight:900;background:linear-gradient(135deg,#f3d79b,#d8a144)}
.brand-name,.brand-tagline,.brand-sub{position:relative;display:block}.brand-name{margin-top:16rpx;color:#fffaf0;font-size:36rpx;font-weight:900}.brand-tagline{margin:8rpx auto 0;color:#f3d79b;font-size:21rpx}.brand-slogan{position:relative;margin-top:24rpx;display:flex;justify-content:center;gap:8rpx;color:#fff;font-size:54rpx;font-weight:900}.brand-slogan text:last-child{color:#f3d79b}.brand-sub{margin-top:14rpx;color:rgba(255,255,255,.78);font-size:22rpx;line-height:1.5}
.login-form{margin-top:24rpx;padding:30rpx 26rpx;border-radius:28rpx;background:#fff;border:1rpx solid rgba(42,63,48,.07);box-shadow:0 14rpx 36rpx rgba(38,69,54,.06)}
.avatar-section{display:flex;flex-direction:column;align-items:center;gap:10rpx;margin-bottom:26rpx}.avatar-btn{width:144rpx;height:144rpx;padding:0;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:50%;color:#1f7c4b;font-size:25rpx;font-weight:900;background:#eef8f1;border:2rpx dashed rgba(47,155,99,.32)}.avatar-btn.disabled{opacity:.56}.avatar-img{width:100%;height:100%}.avatar-hint{color:#828a7e;font-size:21rpx}.avatar-btn::after{border:none}
.agreement-card{display:flex;align-items:flex-start;gap:14rpx;padding:18rpx;border-radius:18rpx;background:#f7faf4;border:1rpx solid rgba(39,61,42,.08)}.checkbox{width:36rpx;height:36rpx;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:8rpx;color:#fff;font-size:22rpx;font-weight:900;background:#fff;border:2rpx solid #aeb7ad;box-sizing:border-box}.checkbox.checked{background:#2f9b63;border-color:#2f9b63}.agreement-text{flex:1;color:#687665;font-size:22rpx;line-height:1.65}.agreement-link{color:#1f7c4b;font-weight:900;text-decoration:underline}.agreement-hint{display:block;margin-top:10rpx;color:#9aa197;font-size:20rpx}
.wechat-btn,.skip-btn{width:100%;border-radius:23rpx;font-weight:900}.wechat-btn{height:92rpx;margin-top:24rpx;display:flex;align-items:center;justify-content:center;gap:12rpx;color:#fff;font-size:30rpx;background:linear-gradient(135deg,#4ec269,#1a7e3c)}.wechat-btn[disabled]{opacity:.46}.wechat-icon{width:42rpx;height:42rpx;display:flex;align-items:center;justify-content:center;border-radius:11rpx;background:rgba(255,255,255,.2)}.skip-btn{height:76rpx;margin-top:15rpx;color:#415444;font-size:26rpx;background:#f6f8f4;border:1rpx solid rgba(42,63,48,.1)}.wechat-btn::after,.skip-btn::after{border:none}.guest-tip{display:block;margin-top:13rpx;color:#8a9286;font-size:20rpx;line-height:1.5;text-align:center}
</style>
