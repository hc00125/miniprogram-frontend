<template>
  <view class="club-page profile-page">
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
            <text class="stat-value">{{ playerRatingText }}</text>
            <text class="stat-label">综合评分</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item">
            <text class="stat-value">{{ profile.player.rating_count || 0 }}</text>
            <text class="stat-label">评价数量</text>
          </view>
        </view>
        <view v-if="profile?.application?.reject_reason" class="reject-banner">
          <text class="reject-icon">!</text>
          <text class="reject-text">审核未通过：{{ profile.application.reject_reason }}</text>
        </view>
      </view>
    </view>

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
      <view class="quick-item" @tap="handlePlayerAction">
        <view class="quick-icon">抢</view>
        <view class="quick-text">
          <text class="quick-title">抢单大厅</text>
          <text class="quick-sub">查看并抢新订单</text>
        </view>
      </view>
      <view class="quick-item" @tap="handlePlayerCenterAction">
        <view class="quick-icon">{{ profile?.player_status === 'approved' ? '评' : '陪' }}</view>
        <view class="quick-text">
          <text class="quick-title">{{ playerCenterTitle }}</text>
          <text class="quick-sub">{{ playerCenterSub }}</text>
        </view>
      </view>
    </view>

    <view v-if="!profile?.player" class="player-card">
      <view class="card-head">
        <text class="card-eyebrow">陪玩师信息</text>
        <button v-if="profile?.player_status === 'pending'" class="card-link" @tap.stop="loadProfile">刷新状态</button>
      </view>
      <view class="player-empty">
        <text class="empty-emoji">陪</text>
        <text class="empty-title">{{ playerEmptyTitle }}</text>
        <text class="empty-sub">{{ playerEmptySub }}</text>
        <view class="club-btn club-btn--primary empty-btn" hover-class="hover-class" @tap="handlePlayerAction">{{ playerActionTitle }}</view>
      </view>
    </view>

    <view class="list-card">
      <view class="list-item" @tap="handleService">
        <view class="list-left">
          <text class="list-icon list-icon--green">服</text>
          <text class="list-label">服务条款</text>
        </view>
        <text class="list-arrow">查看陪玩师签约协议条款</text>
        <text class="list-chevron">›</text>
      </view>

      <button
        class="list-item contact-button"
        open-type="contact"
        hover-class="list-item--active"
      >
        <view class="list-left">
          <text class="list-icon list-icon--blue">客</text>
          <text class="list-label">联系客服</text>
        </view>
        <text class="list-arrow">进入微信官方客服会话</text>
        <text class="list-chevron">›</text>
      </button>

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

const isPlayerOnline = computed(() => Boolean(profile.value?.player?.is_online))

const playerRatingText = computed(() => {
  const count = Number(profile.value?.player?.rating_count || 0)
  const score = Number(profile.value?.player?.avg_rating || 0)
  return count > 0 ? score.toFixed(1) : '-'
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
const playerCenterTitle = computed(() => {
  if (profile.value?.player_status === 'approved') return '我的接单与评价'
  return playerActionTitle.value
})
const playerCenterSub = computed(() => {
  if (profile.value?.player_status === 'approved') return '查看订单与老板评价'
  if (profile.value?.player_status === 'pending') return '请等待管理员审核'
  return '提交资料后审核'
})
const playerEmptyTitle = computed(() => {
  if (profile.value?.player_status === 'pending') return '申请审核中'
  if (profile.value?.player_status === 'rejected') return '申请未通过'
  return '还不是陪玩师'
})
const playerEmptySub = computed(() => {
  if (profile.value?.player_status === 'pending') return '审核通过后即可进入抢单大厅'
  if (profile.value?.player_status === 'rejected') return '可重新提交申请资料'
  return '提交申请后，审核通过即可进入抢单大厅'
})

async function loadProfile() {
  try {
    profile.value = await syncClientProfile()
  } catch (error) {
    const cached = getClientProfile()
    if (!cached) {
      go('/pages/client/login/index')
      return
    }
    if (cached.application?.status === 'approved') {
      cached.player_status = 'approved'
    } else if (cached.application && cached.player_status !== 'pending') {
      cached.player_status = 'pending'
    }
    profile.value = cached
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
  if (profile.value?.player_status === 'approved') {
    go('/pages/player/grab/index')
    return
  }
  if (profile.value?.player_status === 'pending') {
    toast('申请审核中，请等待管理员审核')
    return
  }
  go('/pages/player/apply/index')
}

function handlePlayerCenterAction() {
  if (profile.value?.player_status === 'approved') {
    go('/pages/player/my-orders/index')
    return
  }
  handlePlayerAction()
}

function handleService() {
  go('/pages/legal/privacy/index')
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

.profile-hero {
  position: relative;
  padding: 32rpx 30rpx 28rpx;
  overflow: hidden;
  border: 1px solid rgba(47, 155, 99, 0.12);
  border-radius: 28rpx;
  background: linear-gradient(135deg, #173426 0%, #1f7c4b 60%, #2f9b63 100%);
  box-shadow: 0 20rpx 44rpx rgba(23, 52, 38, 0.18);
}
.hero-bg { position: absolute; inset: 0; pointer-events: none; }
.ambient-glow { position: absolute; border-radius: 50%; filter: blur(40rpx); opacity: .5; }
.ambient-glow--left { top: -60rpx; left: -40rpx; width: 220rpx; height: 220rpx; background: radial-gradient(circle, rgba(216,161,68,.40), transparent 70%); }
.ambient-glow--right { right: -60rpx; bottom: -80rpx; width: 280rpx; height: 280rpx; background: radial-gradient(circle, rgba(95,183,138,.40), transparent 70%); }
.hero-top { position: relative; z-index: 1; display: flex; align-items: center; gap: 24rpx; }
.avatar-wrap { position: relative; width: 140rpx; height: 140rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 36rpx; color: #173426; background: linear-gradient(135deg, #f3d79b, #d8a144); box-shadow: 0 12rpx 28rpx rgba(0,0,0,.18); }
.avatar-img { width: 100%; height: 100%; }
.avatar-text { font-size: 56rpx; font-weight: 900; line-height: 1; }
.avatar-ring { position: absolute; inset: -4rpx; border: 2rpx solid rgba(255,255,255,.30); border-radius: 40rpx; pointer-events: none; }
.hero-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12rpx; }
.hero-name-row { display: flex; align-items: center; gap: 8rpx; }
.hero-name { overflow: hidden; color: #fffaf0; font-size: 40rpx; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 4rpx 12rpx rgba(0,0,0,.20); }
.hero-arrow { color: rgba(255,255,255,.62); font-size: 36rpx; }
.hero-id-row { display: flex; align-items: center; gap: 12rpx; flex-wrap: wrap; }
.hero-id { color: rgba(255,255,255,.78); font-size: 21rpx; font-family: 'SF Mono','DIN Alternate',monospace; }
.hero-status { display: inline-flex; align-items: center; gap: 6rpx; padding: 5rpx 12rpx; border: 1rpx solid rgba(255,255,255,.22); border-radius: 999rpx; color: #fff; font-size: 20rpx; font-weight: 800; background: rgba(255,255,255,.18); }
.status-dot { width: 8rpx; height: 8rpx; border-radius: 50%; background: #5fb78a; }
.hero-status.pending { background: rgba(216,161,68,.22); }
.hero-status.pending .status-dot { background: #f3d79b; }
.hero-status.rejected { background: rgba(239,91,91,.22); }
.hero-status.rejected .status-dot { background: #ef5b5b; }

.player-summary-card,
.player-card,
.list-card {
  margin-top: 22rpx;
  overflow: hidden;
  border: 1px solid rgba(42,63,48,.06);
  border-radius: 28rpx;
  background: rgba(255,255,255,.96);
  box-shadow: 0 14rpx 36rpx rgba(38,69,54,.06);
}
.player-summary-card { margin-top: 14rpx; border-radius: 24rpx; }
.card-head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 28rpx 18rpx; border-bottom: 1px solid rgba(42,63,48,.06); }
.player-summary-head { padding: 22rpx 24rpx 12rpx; border-bottom: 0; }
.card-eyebrow { color: #14291f; font-size: 30rpx; font-weight: 900; }
.card-link { padding: 0; color: #1f7c4b; font-size: 24rpx; font-weight: 800; background: transparent; }
.card-link::after { border: none; }
.player-summary-body { padding: 0 24rpx 22rpx; display: flex; flex-direction: column; gap: 16rpx; }
.player-summary-meta { display: flex; align-items: center; gap: 14rpx; flex-wrap: wrap; }
.player-type { color: #1f7c4b; font-size: 22rpx; font-weight: 800; }
.player-id { color: #8b9788; font-size: 20rpx; font-family: 'SF Mono','DIN Alternate',monospace; }
.online-toggle { display: inline-flex; align-items: center; justify-content: center; gap: 6rpx; min-width: 96rpx; padding: 8rpx 14rpx; border: 1px solid rgba(47,155,99,.20); border-radius: 999rpx; color: #1f7c4b; font-size: 21rpx; font-weight: 800; background: rgba(47,155,99,.12); }
.online-toggle.off { color: #5a6b5b; border-color: rgba(42,63,48,.12); background: rgba(42,63,48,.06); }
.online-toggle.syncing { opacity: .72; }
.online-dot { width: 8rpx; height: 8rpx; border-radius: 50%; background: #5fb78a; }
.online-toggle.off .online-dot { background: #aab1a5; }
.stats-row { display: grid; grid-template-columns: 1fr 1px 1fr 1px 1fr; align-items: center; padding: 20rpx 0; border: 1px solid rgba(47,155,99,.08); border-radius: 20rpx; background: linear-gradient(180deg,#f7faf4,#fff); }
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 4rpx; }
.stat-value { color: #1f7c4b; font-size: 36rpx; font-weight: 900; }
.stat-label { color: #5a6b5b; font-size: 21rpx; }
.stat-divider { width: 1px; height: 48rpx; background: rgba(42,63,48,.08); }
.reject-banner { display: flex; align-items: center; gap: 12rpx; padding: 14rpx 18rpx; border: 1px solid rgba(239,91,91,.20); border-radius: 16rpx; color: #c43232; font-size: 24rpx; background: rgba(239,91,91,.08); }
.reject-icon { width: 32rpx; height: 32rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; color: #fff; font-weight: 900; background: #ef5b5b; }
.reject-text { flex: 1; line-height: 1.4; }

.quick-grid { margin-top: 22rpx; display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; }
.quick-item { display: flex; align-items: center; gap: 16rpx; min-height: 142rpx; padding: 22rpx; border: 1px solid rgba(42,63,48,.06); border-radius: 24rpx; background: rgba(255,255,255,.96); box-shadow: 0 12rpx 30rpx rgba(38,69,54,.06); box-sizing: border-box; }
.quick-item:active { transform: scale(.98); }
.quick-item--primary { border-color: rgba(216,161,68,.30); background: linear-gradient(135deg,#fff8df,#fffdf8); }
.quick-icon { width: 76rpx; height: 76rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 22rpx; color: #f3d79b; font-size: 32rpx; font-weight: 900; background: linear-gradient(135deg,#173426,#1f7c4b); }
.quick-icon--primary { color: #173426; background: linear-gradient(135deg,#f3d79b,#d8a144); }
.quick-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.quick-title { color: #14291f; font-size: 28rpx; font-weight: 900; }
.quick-sub { color: #5a6b5b; font-size: 21rpx; line-height: 1.3; }

.player-empty { padding: 50rpx 28rpx 38rpx; display: flex; flex-direction: column; align-items: center; gap: 10rpx; }
.empty-emoji { width: 96rpx; height: 96rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 6rpx; border-radius: 50%; color: #173426; font-size: 40rpx; font-weight: 900; background: linear-gradient(135deg,#f3d79b,#d8a144); }
.empty-title { color: #14291f; font-size: 30rpx; font-weight: 900; }
.empty-sub { margin-bottom: 14rpx; color: #5a6b5b; font-size: 23rpx; line-height: 1.4; text-align: center; }
.empty-btn { min-width: 240rpx; min-height: 76rpx; border-radius: 24rpx; font-size: 28rpx; font-weight: 900; }

.list-item { width: 100%; min-height: 110rpx; display: flex; align-items: center; gap: 14rpx; padding: 22rpx 28rpx; border-bottom: 1px solid rgba(42,63,48,.06); box-sizing: border-box; }
.list-item:last-child { border-bottom: 0; }
.list-item--active { background: rgba(47,155,99,.05); }
.contact-button { margin: 0; border-radius: 0; color: inherit; text-align: left; line-height: normal; background: transparent; }
.contact-button::after { border: none; }
.list-left { display: flex; align-items: center; gap: 14rpx; flex-shrink: 0; }
.list-icon { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 18rpx; color: #fff; font-size: 26rpx; font-weight: 900; }
.list-icon--green { background: linear-gradient(135deg,#5fb78a,#1f7c4b); }
.list-icon--blue { background: linear-gradient(135deg,#5b9ad8,#2a6db4); }
.list-icon--gold { color: #173426; background: linear-gradient(135deg,#f3d79b,#d8a144); }
.list-label { min-width: 120rpx; color: #14291f; font-size: 28rpx; font-weight: 800; }
.list-arrow { flex: 1; overflow: hidden; color: #8b9788; font-size: 22rpx; font-weight: 600; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
.list-chevron { flex-shrink: 0; margin-left: 8rpx; color: #c4bba3; font-size: 32rpx; line-height: 1; }
</style>
