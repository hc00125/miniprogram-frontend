<template>
  <view class="club-page profile-page">
    <!-- 顶部 Hero：头像 + ID + 状态 -->
    <view class="profile-hero" @tap="go('/pages/client/account/index')">
      <view class="hero-bg">
        <view class="ambient-glow ambient-glow--left"></view>
        <view class="ambient-glow ambient-glow--right"></view>
      </view>
      <view class="hero-top">
        <view class="avatar-wrap">
          <image v-if="displayAvatarUrl" class="avatar-img" :src="displayAvatarUrl" mode="aspectFill" />
          <text v-else class="avatar-text">{{ displayInitial }}</text>
          <view class="avatar-ring"></view>
        </view>
        <view class="hero-info">
          <view class="hero-name-row">
            <text class="hero-name">{{ displayName }}</text>
            <text class="hero-arrow">›</text>
          </view>
          <view class="hero-id-row">
            <text class="hero-id">ID: {{ profileIdText }}</text>
            <text class="hero-status" :class="statusClass">
              <text class="status-dot"></text>
              <text>{{ statusText }}</text>
            </text>
          </view>
        </view>
      </view>

    </view>

    <!-- 陪玩师信息栏：紧贴绿色卡片，避免重复头像和昵称 -->
    <view v-if="profile?.player" class="player-summary-card">
      <view class="card-head player-summary-head">
        <text class="card-eyebrow">陪玩师信息</text>
        <view class="online-toggle" :class="{ off: !isPlayerOnline, syncing: onlineUpdating }" @tap="togglePlayerOnline">
          <text class="online-text">{{ onlineUpdating ? '同步中' : (isPlayerOnline ? '在线' : '离线') }}</text>
          <view class="online-dot"></view>
        </view>
      </view>
      <view class="player-summary-body">
        <view class="player-summary-meta">
          <text class="player-type">{{ profile.player.type_name || '陪玩师' }}</text>
          <text class="player-id">TC: {{ profile.player.id }}</text>
        </view>
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-value">{{ profile.player.total_orders || 0 }}</text>
            <text class="stat-label">接单</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value">-</text>
            <text class="stat-label">综合评分</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value">-</text>
            <text class="stat-label">好评率</text>
          </view>
        </view>
        <view v-if="profile?.application?.reject_reason" class="reject-banner">
          <text class="reject-icon">!</text>
          <text class="reject-text">审核未通过：{{ profile.application.reject_reason }}</text>
        </view>
      </view>
    </view>

    <!-- 4 宫格快捷入口 -->
    <view class="quick-grid">
      <view class="quick-item quick-item--primary" @tap="goMain('order')">
        <view class="quick-icon quick-icon--primary">点</view>
        <view class="quick-text">
          <text class="quick-title">我要点单</text>
          <text class="quick-sub">海量陪玩 · 快速开局</text>
        </view>
      </view>
      <view class="quick-item" @tap="goMain('query')">
        <view class="quick-icon">查</view>
        <view class="quick-text">
          <text class="quick-title">我的订单</text>
          <text class="quick-sub">查看服务记录</text>
        </view>
      </view>
      <view class="quick-item" @tap="goPlayerRoute">
        <view class="quick-icon">抢</view>
        <view class="quick-text">
          <text class="quick-title">抢单抢单</text>
          <text class="quick-sub">进入接单大厅</text>
        </view>
      </view>
      <view class="quick-item" @tap="handlePlayerAction">
        <view class="quick-icon">陪</view>
        <view class="quick-text">
          <text class="quick-title">{{ playerActionTitle }}</text>
          <text class="quick-sub">{{ playerActionSub }}</text>
        </view>
      </view>
    </view>

    <!-- 陪玩师申请状态 -->
    <view v-if="!profile?.player" class="player-card">
      <view class="card-head">
        <text class="card-eyebrow">陪玩师信息</text>
        <button v-if="profile?.player_status === 'pending'" class="card-link" @tap.stop="loadProfile">刷新状态</button>
      </view>
      <view class="player-empty">
        <text class="empty-emoji">陪</text>
        <text class="empty-title">还不是陪玩师</text>
        <text class="empty-sub">提交申请后，审核通过即可进入抢单大厅</text>
        <view class="club-btn club-btn--primary empty-btn" hover-class="hover-class" @tap="handlePlayerAction">立即申请</view>
      </view>
    </view>

    <!-- 列表区：服务条款 / 客服 / 设置 -->
    <view class="list-card">
      <view class="list-item" @tap="handleService">
        <view class="list-left">
          <text class="list-icon list-icon--green">服</text>
          <text class="list-label">服务条款</text>
        </view>
        <text class="list-arrow">查看陪玩师签约协议条款</text>
        <text class="list-chevron">›</text>
      </view>
      <view class="list-item" @tap="handleContact">
        <view class="list-left">
          <text class="list-icon list-icon--blue">客</text>
          <text class="list-label">联系客服</text>
        </view>
        <text class="list-arrow">7×24小时在线为您服务</text>
        <text class="list-chevron">›</text>
      </view>
      <view class="list-item" @tap="handleSettings">
        <view class="list-left">
          <text class="list-icon list-icon--gold">设</text>
          <text class="list-label">设置</text>
        </view>
        <text class="list-arrow">账号安全 · 通知等设置</text>
        <text class="list-chevron">›</text>
      </view>
    </view>

    <MainBottomTabs active="profile" @select="handleMainTabSelect" />
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { updatePlayerOnlineStatus } from '@/api/player'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import { getClientProfile, normalizeAvatarUrl, setPlayerOnlineStatus, syncClientProfile, type ClientProfile } from '@/utils/client'
import { go, relaunch, navigateToTab, type MainTab } from '@/utils/nav'
import { getErrorMessage, toast } from '@/utils/feedback'

const profile = ref<ClientProfile | null>(null)
const onlineUpdating = ref(false)
const displayAvatarUrl = computed(() => normalizeAvatarUrl(profile.value?.avatarUrl || profile.value?.avatar_url))

const displayName = computed(() => {
  const nickname = profile.value?.nickname?.trim()
  const playerName = profile.value?.player?.name?.trim()
  return nickname || playerName || '未设置昵称'
})
const displayInitial = computed(() => displayName.value.slice(0, 1) || '微')

const profileIdText = computed(() => {
  const openid = profile.value?.openid || profile.value?.open_id || profile.value?.wechat_openid
  if (openid) return openid.slice(-8).toUpperCase()
  return '20240705'
})

const isPlayerOnline = computed(() => {
  return Boolean(profile.value?.player?.is_online)
})

const statusText = computed(() => {
  const status = profile.value?.player_status || 'none'
  if (status === 'approved') return '已成为陪玩师'
  if (status === 'pending') return '申请审核中'
  if (status === 'rejected') return '申请未通过'
  return '普通用户'
})
const statusClass = computed(() => ({
  approved: profile.value?.player_status === 'approved',
  pending: profile.value?.player_status === 'pending',
  rejected: profile.value?.player_status === 'rejected'
}))
const playerActionTitle = computed(() => {
  if (profile.value?.player_status === 'approved') return '抢单大厅'
  if (profile.value?.player_status === 'pending') return '审核中'
  return '申请成为陪玩师'
})
const playerActionSub = computed(() => {
  if (profile.value?.player_status === 'approved') return '进入接单大厅'
  if (profile.value?.player_status === 'pending') return '请等待管理员审核'
  return '提交资料后审核'
})

async function loadProfile() {
  try {
    profile.value = await syncClientProfile()
  } catch (error) {
    profile.value = getClientProfile()
    if (!profile.value) {
      go('/pages/client/login/index')
      return
    }
    toast('个人信息刷新失败')
  }
}

async function togglePlayerOnline() {
  if (!profile.value?.player || onlineUpdating.value) return
  const nextOnline = !isPlayerOnline.value
  onlineUpdating.value = true
  try {
    const res = await updatePlayerOnlineStatus(nextOnline)
    const isOnline = Boolean(res.is_online)
    profile.value = {
      ...profile.value,
      player: {
        ...profile.value.player,
        is_online: isOnline
      }
    }
    setPlayerOnlineStatus(isOnline)
    toast(isOnline ? '已上线，开始接单' : '已离线，停止接单')
  } catch (error) {
    toast(getErrorMessage(error, '在线状态更新失败'))
  } finally {
    onlineUpdating.value = false
  }
}

function handlePlayerAction() {
  console.log('[handlePlayerAction] player_status =', profile.value?.player_status)
  if (profile.value?.player_status === 'approved') {
    go('/pages/player/grab/index')
    return
  }
  if (profile.value?.player_status === 'pending') {
    toast('申请审核中，请等待管理员审核')
    return
  }
  // 兜底：未登录 / 无 player_status / 已拒绝 / 加载失败等场景都进入申请页
  go('/pages/player/apply/index')
}

function goPlayerRoute() {
  handlePlayerAction()
}

function handleService() {
  toast('服务条款页面建设中')
}

function handleContact() {
  toast('客服功能开发中')
}

function handleSettings() {
  toast('设置页面建设中')
}

onShow(loadProfile)

function handleMainTabSelect(tab: MainTab) {
  if (tab === 'home' || tab === 'order') {
    relaunch('/pages/boss/home/index', { tab })
    return
  }
  if (tab === 'profile') return
  navigateToTab(tab as 'query' | 'players')
}

function goMain(tab: MainTab = 'home') {
  handleMainTabSelect(tab)
}
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';

.profile-page {
  min-height: 100vh;
  padding: 20rpx 24rpx 200rpx;
  box-sizing: border-box;
  background:
    radial-gradient(ellipse at 12% 0%, rgba(47, 155, 99, 0.12), transparent 38%),
    radial-gradient(ellipse at 88% 16%, rgba(216, 161, 68, 0.10), transparent 32%),
    linear-gradient(180deg, #f7f3ea 0%, #faf8f2 48%, #fffaf2 100%);
}

/* ========== 顶部 Hero ========== */
.profile-hero {
  position: relative;
  padding: 32rpx 30rpx 28rpx;
  overflow: hidden;
  border: 1px solid rgba(47, 155, 99, 0.12);
  border-radius: 28rpx;
  background: linear-gradient(135deg, #173426 0%, #1f7c4b 60%, #2f9b63 100%);
  box-shadow: 0 20rpx 44rpx rgba(23, 52, 38, 0.18);
}

.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(40rpx);
  opacity: 0.5;
}

.ambient-glow--left {
  top: -60rpx;
  left: -40rpx;
  width: 220rpx;
  height: 220rpx;
  background: radial-gradient(circle, rgba(216, 161, 68, 0.40), transparent 70%);
}

.ambient-glow--right {
  bottom: -80rpx;
  right: -60rpx;
  width: 280rpx;
  height: 280rpx;
  background: radial-gradient(circle, rgba(95, 183, 138, 0.40), transparent 70%);
}

.hero-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar-wrap {
  position: relative;
  width: 140rpx;
  height: 140rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 36rpx;
  background: linear-gradient(135deg, #f3d79b, #d8a144);
  color: #173426;
  font-size: 56rpx;
  font-weight: 900;
  overflow: hidden;
  box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.18);
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.avatar-text {
  font-size: 56rpx;
  font-weight: 900;
  line-height: 1;
}

.avatar-ring {
  position: absolute;
  inset: -4rpx;
  border-radius: 40rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.30);
  pointer-events: none;
}

.hero-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.hero-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.hero-name {
  color: #fffaf0;
  font-size: 40rpx;
  font-weight: 900;
  letter-spacing: 0;
  text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.20);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-arrow {
  color: rgba(255, 255, 255, 0.62);
  font-size: 36rpx;
  line-height: 1;
}

.hero-id-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.hero-id {
  color: rgba(255, 255, 255, 0.78);
  font-size: 21rpx;
  font-weight: 600;
  font-family: 'SF Mono', 'DIN Alternate', -apple-system, monospace;
}

.hero-status {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 5rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  border: 1rpx solid rgba(255, 255, 255, 0.22);
}

.status-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #5fb78a;
}

.hero-status.pending { background: rgba(216, 161, 68, 0.22); border-color: rgba(216, 161, 68, 0.34); }
.hero-status.pending .status-dot { background: #f3d79b; }
.hero-status.rejected { background: rgba(239, 91, 91, 0.22); border-color: rgba(239, 91, 91, 0.34); }
.hero-status.rejected .status-dot { background: #ef5b5b; }

/* ========== 4 宫格快捷入口 ========== */
.quick-grid {
  margin-top: 22rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14rpx;
}

.quick-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 142rpx;
  padding: 22rpx 22rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(42, 63, 48, 0.06);
  box-shadow: 0 12rpx 30rpx rgba(38, 69, 54, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.quick-item:active {
  transform: scale(0.98);
  box-shadow: 0 6rpx 16rpx rgba(38, 69, 54, 0.10);
}

.quick-item--primary {
  background: linear-gradient(135deg, #fff8df 0%, #fffdf8 100%);
  border-color: rgba(216, 161, 68, 0.30);
}

.quick-icon {
  width: 76rpx;
  height: 76rpx;
  flex-shrink: 0;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #173426, #1f7c4b);
  color: #f3d79b;
  font-size: 32rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.quick-icon--primary {
  background: linear-gradient(135deg, #f3d79b, #d8a144);
  color: #173426;
}

.quick-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.quick-title {
  color: #14291f;
  font-size: 28rpx;
  font-weight: 900;
}

.quick-sub {
  color: #5a6b5b;
  font-size: 21rpx;
  font-weight: 600;
  line-height: 1.3;
}

/* ========== 通用卡片 ========== */
.player-summary-card,
.player-card,
.list-card {
  margin-top: 22rpx;
  border: 1px solid rgba(42, 63, 48, 0.06);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14rpx 36rpx rgba(38, 69, 54, 0.06);
  overflow: hidden;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx 18rpx;
  border-bottom: 1px solid rgba(42, 63, 48, 0.06);
}

.card-eyebrow {
  color: #14291f;
  font-size: 30rpx;
  font-weight: 900;
  letter-spacing: 0;
}

.card-link {
  color: #1f7c4b;
  font-size: 24rpx;
  font-weight: 800;
  background: transparent;
  padding: 0;
}

/* ========== 陪玩师信息 ========== */
.player-summary-card {
  margin-top: 14rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.98);
}

.player-summary-head {
  padding: 22rpx 24rpx 12rpx;
  border-bottom: 0;
}

.player-summary-body {
  padding: 0 24rpx 22rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.player-summary-meta {
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex-wrap: wrap;
}

.player-type {
  color: #1f7c4b;
  font-size: 22rpx;
  font-weight: 800;
}

.player-id {
  color: #8b9788;
  font-size: 20rpx;
  font-weight: 600;
  font-family: 'SF Mono', 'DIN Alternate', -apple-system, monospace;
}

.online-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  min-width: 96rpx;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(47, 155, 99, 0.12);
  color: #1f7c4b;
  font-size: 21rpx;
  font-weight: 800;
  border: 1px solid rgba(47, 155, 99, 0.20);
  flex-shrink: 0;
  justify-content: center;
}

.online-toggle.off {
  background: rgba(42, 63, 48, 0.06);
  color: #5a6b5b;
  border-color: rgba(42, 63, 48, 0.12);
}

.online-toggle.syncing {
  opacity: 0.72;
}

.online-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #5fb78a;
}

.online-toggle.off .online-dot {
  background: #aab1a5;
}

.stats-row {
  display: grid;
  grid-template-columns: 1fr 1px 1fr 1px 1fr;
  align-items: center;
  padding: 20rpx 0;
  border-radius: 20rpx;
  background: linear-gradient(180deg, #f7faf4 0%, #ffffff 100%);
  border: 1px solid rgba(47, 155, 99, 0.08);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.stat-value {
  color: #1f7c4b;
  font-size: 36rpx;
  font-weight: 900;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  color: #5a6b5b;
  font-size: 21rpx;
  font-weight: 600;
}

.stat-divider {
  width: 1px;
  height: 48rpx;
  background: rgba(42, 63, 48, 0.08);
}

.reject-banner {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 14rpx 18rpx;
  border-radius: 16rpx;
  background: rgba(239, 91, 91, 0.08);
  border: 1px solid rgba(239, 91, 91, 0.20);
  color: #c43232;
  font-size: 24rpx;
  font-weight: 600;
}

.reject-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: #ef5b5b;
  color: #fff;
  font-size: 22rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  font-style: italic;
}

.reject-text {
  flex: 1;
  min-width: 0;
  line-height: 1.4;
}

/* ========== 陪玩师空状态 ========== */
.player-empty {
  padding: 50rpx 28rpx 38rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.empty-emoji {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #f3d79b, #d8a144);
  color: #173426;
  font-size: 40rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6rpx;
  box-shadow: 0 12rpx 24rpx rgba(216, 161, 68, 0.20);
}

.empty-title {
  color: #14291f;
  font-size: 30rpx;
  font-weight: 900;
}

.empty-sub {
  color: #5a6b5b;
  font-size: 23rpx;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
  margin-bottom: 14rpx;
}

.empty-btn {
  min-width: 240rpx;
  min-height: 76rpx;
  font-size: 28rpx;
  font-weight: 900;
  border-radius: 24rpx;
}

/* ========== 列表卡 ========== */
.list-item {
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-height: 110rpx;
  padding: 22rpx 28rpx;
  border-bottom: 1px solid rgba(42, 63, 48, 0.06);
}

.list-item:last-child {
  border-bottom: 0;
}

.list-left {
  display: flex;
  align-items: center;
  gap: 14rpx;
  flex-shrink: 0;
}

.list-icon {
  width: 60rpx;
  height: 60rpx;
  flex-shrink: 0;
  border-radius: 18rpx;
  color: #fff;
  font-size: 26rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-icon--green { background: linear-gradient(135deg, #5fb78a, #1f7c4b); }
.list-icon--blue { background: linear-gradient(135deg, #5b9ad8, #2a6db4); }
.list-icon--gold { background: linear-gradient(135deg, #f3d79b, #d8a144); color: #173426; }

.list-label {
  color: #14291f;
  font-size: 28rpx;
  font-weight: 800;
  min-width: 120rpx;
}

.list-arrow {
  flex: 1;
  text-align: right;
  color: #8b9788;
  font-size: 22rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-chevron {
  color: #c4bba3;
  font-size: 32rpx;
  line-height: 1;
  margin-left: 8rpx;
  flex-shrink: 0;
}
</style>
