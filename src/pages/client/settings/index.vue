<template>
  <view class="settings-page">
    <view class="hero-card">
      <text class="eyebrow">ACCOUNT SETTINGS</text>
      <text class="hero-title">设置与权限</text>
      <text class="hero-sub">管理账号资料、陪玩展示、通知和隐私选项</text>
    </view>

    <view class="section-card">
      <text class="section-title">账号</text>
      <view class="setting-row" @tap="go('/pages/client/account/index')">
        <view><text>头像与昵称</text><text>修改账号公开资料</text></view><text>›</text>
      </view>
      <view class="setting-row">
        <view><text>接单通知</text><text>保存为本机偏好；系统消息能力后续可继续扩展</text></view>
        <switch :checked="orderNotificationEnabled" color="#2f9b63" @change="toggleNotification" />
      </view>
    </view>

    <view v-if="profile?.player" class="section-card player-settings-card">
      <view class="section-head">
        <view><text class="section-title">陪玩师设置</text><text>权限由管理员在后台控制</text></view>
        <text class="type-chip">{{ profile.player.type_name }}</text>
      </view>
      <view class="setting-row">
        <view><text>在线接单</text><text>{{ profile.player.is_online ? '当前在线，可接收订单' : '当前离线' }}</text></view>
        <switch :checked="profile.player.is_online" color="#2f9b63" :disabled="onlineUpdating || !canAcceptOrders" @change="toggleOnline" />
      </view>
      <view class="setting-row" @tap="go('/pages/player/profile-settings/index')">
        <view><text>个人简介与语音</text><text>修改后提交后台审核，审核期间展示旧资料</text></view><text>›</text>
      </view>
      <view class="permission-grid">
        <view :class="{ disabled: !canAcceptOrders }"><text>{{ canAcceptOrders ? '已开启' : '已暂停' }}</text><text>接单权限</text></view>
        <view :class="{ disabled: !canBeDesignated }"><text>{{ canBeDesignated ? '已开启' : '已暂停' }}</text><text>被指定权限</text></view>
        <view :class="{ disabled: !isPubliclyVisible }"><text>{{ isPubliclyVisible ? '展示中' : '已隐藏' }}</text><text>陪玩列表</text></view>
        <view :class="{ disabled: !canWithdraw }"><text>{{ canWithdraw ? '已开启' : '已暂停' }}</text><text>提现权限</text></view>
      </view>
      <text v-if="permissionWarning" class="permission-warning">{{ permissionWarning }}</text>
    </view>

    <view class="section-card">
      <text class="section-title">协议与隐私</text>
      <view class="setting-row" @tap="go('/pages/legal/user-agreement/index')">
        <view><text>用户服务协议</text><text>查看平台服务规则</text></view><text>›</text>
      </view>
      <view class="setting-row" @tap="go('/pages/legal/privacy/index')">
        <view><text>隐私政策</text><text>了解个人信息的收集与使用</text></view><text>›</text>
      </view>
      <button class="setting-row contact-row" open-type="contact">
        <view><text>联系客服</text><text>进入微信官方客服会话</text></view><text>›</text>
      </button>
      <button class="setting-row contact-row danger-link" open-type="contact">
        <view><text>申请账号注销</text><text>联系客服核验未完成订单、提现和身份后处理</text></view><text>›</text>
      </button>
    </view>

    <button class="logout-btn" @tap="logout">退出当前账号</button>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { logoutPlayer, updatePlayerOnlineStatus } from '@/api/player'
import { getClientProfile, saveClientProfile, setPlayerOnlineStatus, syncClientProfile, type ClientProfile } from '@/utils/client'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { go, replace } from '@/utils/nav'
import { clearPlayerAuth } from '@/utils/storage'

const profile = ref<ClientProfile | null>(getClientProfile())
const onlineUpdating = ref(false)
const orderNotificationEnabled = ref(uni.getStorageSync('player_order_notification') !== '0')

const canAcceptOrders = computed(() => profile.value?.player?.can_accept_orders !== false)
const canBeDesignated = computed(() => profile.value?.player?.can_be_designated !== false)
const isPubliclyVisible = computed(() => profile.value?.player?.is_publicly_visible !== false)
const canWithdraw = computed(() => profile.value?.player?.can_withdraw !== false)
const permissionWarning = computed(() => {
  const names: string[] = []
  if (!canAcceptOrders.value) names.push('接单')
  if (!canBeDesignated.value) names.push('被指定')
  if (!isPubliclyVisible.value) names.push('公开展示')
  if (!canWithdraw.value) names.push('提现')
  return names.length ? `以下权限已由管理员暂停：${names.join('、')}。如有疑问请联系客服。` : ''
})

async function loadProfile() {
  try {
    profile.value = await syncClientProfile()
  } catch {
    profile.value = getClientProfile()
  }
}

function toggleNotification(event: any) {
  orderNotificationEnabled.value = Boolean(event?.detail?.value)
  uni.setStorageSync('player_order_notification', orderNotificationEnabled.value ? '1' : '0')
  toast(orderNotificationEnabled.value ? '已开启本机接单提醒偏好' : '已关闭本机接单提醒偏好')
}

async function toggleOnline(event: any) {
  if (!profile.value?.player) return
  if (!canAcceptOrders.value) {
    toast('管理员已暂停您的接单权限')
    return
  }
  const next = Boolean(event?.detail?.value)
  onlineUpdating.value = true
  try {
    const result = await updatePlayerOnlineStatus(next)
    profile.value = {
      ...profile.value,
      player: { ...profile.value.player, is_online: Boolean(result.is_online) }
    }
    saveClientProfile(profile.value)
    setPlayerOnlineStatus(Boolean(result.is_online))
    success(result.is_online ? '已上线接单' : '已切换离线')
  } catch (error) {
    toast(getErrorMessage(error, '在线状态更新失败'))
    await loadProfile()
  } finally {
    onlineUpdating.value = false
  }
}

async function logout() {
  if (!(await confirm('退出后需要重新微信登录，确定退出吗？', '退出账号'))) return
  try { if (profile.value?.player) await logoutPlayer() } catch {}
  clearPlayerAuth()
  success('已退出登录')
  replace('/pages/client/login/index')
}

onShow(loadProfile)
</script>

<style lang="scss" scoped>
.settings-page { min-height: 100vh; padding: 24rpx 24rpx 80rpx; box-sizing: border-box; color: #172116; background: radial-gradient(circle at 12% 0%, rgba(47,155,99,.12), transparent 30%), radial-gradient(circle at 88% 10%, rgba(216,161,68,.12), transparent 28%), #f7f3ea; }
.hero-card, .section-card { margin-bottom: 20rpx; padding: 28rpx; border-radius: 28rpx; background: rgba(255,255,255,.97); border: 1rpx solid rgba(39,61,42,.08); box-shadow: 0 14rpx 34rpx rgba(39,61,42,.06); }
.hero-card { color: #fff; background: linear-gradient(135deg, #173426, #1f7c4b 62%, #45ae72); }
.eyebrow, .hero-title, .hero-sub { display: block; }
.eyebrow { color: rgba(255,255,255,.68); font-size: 20rpx; font-weight: 900; letter-spacing: 2rpx; }
.hero-title { margin-top: 10rpx; font-size: 40rpx; font-weight: 900; }
.hero-sub { margin-top: 10rpx; color: rgba(255,255,255,.74); font-size: 22rpx; }
.section-title { display: block; margin-bottom: 10rpx; font-size: 30rpx; font-weight: 900; }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; margin-bottom: 6rpx; }
.section-head > view { flex: 1; }
.section-head .section-title { margin-bottom: 4rpx; }
.section-head view text:last-child { color: #879083; font-size: 20rpx; }
.type-chip { padding: 7rpx 13rpx; border-radius: 999rpx; color: #1f7c4b; font-size: 20rpx; font-weight: 900; background: #eef8f1; }
.setting-row { width: 100%; min-height: 88rpx; display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding: 14rpx 0; border-bottom: 1rpx solid rgba(39,61,42,.07); box-sizing: border-box; }
.setting-row:last-child { border-bottom: none; }
.setting-row > view { flex: 1; min-width: 0; }
.setting-row view text { display: block; }
.setting-row view text:first-child { font-size: 26rpx; font-weight: 900; }
.setting-row view text:last-child { margin-top: 5rpx; color: #879083; font-size: 20rpx; line-height: 1.45; }
.setting-row > text { color: #aaa; font-size: 34rpx; }
.contact-row { margin: 0; border-radius: 0; color: inherit; text-align: left; line-height: normal; background: transparent; }
.contact-row::after { border: none; }
.danger-link view text:first-child { color: #a13d35; }
.permission-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12rpx; margin-top: 18rpx; }
.permission-grid view { padding: 18rpx; border-radius: 18rpx; text-align: center; background: #eef8f1; }
.permission-grid view.disabled { background: #f1f2ef; }
.permission-grid text { display: block; }
.permission-grid text:first-child { color: #1f7c4b; font-size: 24rpx; font-weight: 900; }
.permission-grid view.disabled text:first-child { color: #9a5a45; }
.permission-grid text:last-child { margin-top: 4rpx; color: #687665; font-size: 20rpx; }
.permission-warning { display: block; margin-top: 14rpx; padding: 14rpx; border-radius: 14rpx; color: #8f4d35; font-size: 21rpx; line-height: 1.5; background: #fff2ec; }
.logout-btn { width: 100%; height: 82rpx; margin-top: 12rpx; border-radius: 999rpx; color: #a13d35; font-size: 27rpx; font-weight: 900; background: #fff; border: 1rpx solid rgba(161,61,53,.16); }
.logout-btn::after { border: none; }
</style>
