<template>
  <view class="club-page profile-page">
    <view class="profile-hero" @tap="handleHeroTap">
      <view class="hero-glow hero-glow--left"></view>
      <view class="hero-glow hero-glow--right"></view>
      <view class="hero-top">
        <view class="avatar-wrap">
          <image v-if="displayAvatarUrl" class="avatar-img" :src="displayAvatarUrl" mode="aspectFill" />
          <text v-else class="avatar-text">{{ displayInitial }}</text>
        </view>
        <view class="hero-info">
          <view class="hero-name-row">
            <text class="hero-name">{{ displayName }}</text>
            <text class="hero-arrow">{{ isLoggedIn ? '›' : '登录 ›' }}</text>
          </view>
          <view class="hero-id-row">
            <text class="hero-id">{{ profileIdText }}</text>
            <text class="hero-status" :class="statusClass"><text class="status-dot"></text>{{ statusText }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!isLoggedIn" class="guest-card">
      <view class="guest-icon">游</view>
      <view class="guest-main">
        <text class="guest-title">当前为游客模式</text>
        <text class="guest-sub">无需登录即可浏览首页、商品、陪玩列表、服务条款和客服信息。</text>
      </view>
      <button class="guest-login-btn" @tap="openLogin">微信登录</button>
      <button class="guest-browse-btn" @tap="switchMainTab('home')">继续浏览首页</button>
    </view>

    <view v-if="isLoggedIn && profile?.player" class="player-summary-card">
      <view class="card-head">
        <text class="card-title">陪玩师信息</text>
        <view class="online-toggle" :class="{ off: !isPlayerOnline, disabled: !canAcceptOrders }" @tap="togglePlayerOnline">
          <text>{{ onlineUpdating ? '同步中' : (!canAcceptOrders ? '接单暂停' : (isPlayerOnline ? '在线' : '离线')) }}</text>
          <view class="online-dot"></view>
        </view>
      </view>
      <view class="player-meta"><text>{{ profile.player.type_name || '陪玩师' }}</text><text>TC: {{ profile.player.id }}</text></view>
      <view class="stats-row">
        <view><text>{{ profile.player.total_orders || 0 }}</text><text>接单</text></view>
        <view><text>{{ playerRatingText }}</text><text>综合评分</text></view>
        <view><text>{{ profile.player.rating_count || 0 }}</text><text>评价数量</text></view>
      </view>
      <view v-if="!canAcceptOrders" class="warning-banner">管理员已暂停你的接单权限，请到设置页查看或联系客服。</view>
      <view v-if="profile.application?.reject_reason" class="warning-banner">审核未通过：{{ profile.application.reject_reason }}</view>
    </view>

    <view class="quick-grid">
      <view class="quick-item quick-item--primary" @tap="switchMainTab('order')">
        <view class="quick-icon quick-icon--primary">点</view>
        <view><text>我要点单</text><text>无需登录也可浏览商品</text></view>
      </view>
      <view class="quick-item" @tap="switchMainTab('query')">
        <view class="quick-icon">查</view>
        <view><text>我的订单</text><text>{{ isLoggedIn ? '查看服务记录' : '进入后可选择登录' }}</text></view>
      </view>
      <view class="quick-item" @tap="handlePlayerAction">
        <view class="quick-icon">抢</view>
        <view><text>抢单大厅</text><text>{{ playerActionSub }}</text></view>
      </view>
      <view class="quick-item" @tap="handlePlayerCenterAction">
        <view class="quick-icon">{{ profile?.player_status === 'approved' ? '评' : '陪' }}</view>
        <view><text>{{ playerCenterTitle }}</text><text>{{ playerCenterSub }}</text></view>
      </view>
    </view>

    <view v-if="isLoggedIn && !profile?.player" class="player-card">
      <view class="card-head">
        <text class="card-title">陪玩师信息</text>
        <button v-if="profile?.player_status === 'pending'" class="refresh-link" @tap.stop="loadProfile">刷新状态</button>
      </view>
      <view class="player-empty">
        <view class="empty-icon">陪</view>
        <text class="empty-title">{{ playerEmptyTitle }}</text>
        <text class="empty-sub">{{ playerEmptySub }}</text>
        <button class="apply-btn" @tap="handlePlayerAction">{{ playerActionTitle }}</button>
      </view>
    </view>

    <view class="list-card">
      <view class="list-item" @tap="handleService"><text class="list-icon list-icon--green">服</text><text class="list-label">服务条款</text><text class="list-note">隐私政策与服务说明</text><text class="chevron">›</text></view>
      <view class="list-item" @tap="go('/pages/client/customer-service/index')"><text class="list-icon list-icon--blue">客</text><text class="list-label">联系客服</text><text class="list-note">微信官方客服与人工客服</text><text class="chevron">›</text></view>
      <view class="list-item" @tap="handleSettings"><text class="list-icon list-icon--gold">设</text><text class="list-label">设置</text><text class="list-note">{{ isLoggedIn ? '账号、资料与权限' : '登录后管理账号' }}</text><text class="chevron">›</text></view>
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
import { getErrorMessage, toast } from '@/utils/feedback'
import { go, goMain as switchMainTab, type MainTab } from '@/utils/nav'
import { getStorage } from '@/utils/storage'

const profile = ref<ClientProfile | null>(null)
const isLoggedIn = ref(false)
const onlineUpdating = ref(false)

const displayAvatarUrl = computed(() => isLoggedIn.value ? normalizeAvatarUrl(profile.value?.avatarUrl || profile.value?.avatar_url) : '')
const displayName = computed(() => {
  if (!isLoggedIn.value) return '游客用户'
  return profile.value?.nickname?.trim() || profile.value?.player?.name?.trim() || '微信用户'
})
const displayInitial = computed(() => displayName.value.slice(0, 1) || '游')
const profileIdText = computed(() => {
  if (!isLoggedIn.value) return '无需登录即可浏览公开内容'
  const openid = profile.value?.openid || profile.value?.open_id || profile.value?.wechat_openid
  return openid ? `ID: ${openid.slice(-8).toUpperCase()}` : '已登录'
})
const canAcceptOrders = computed(() => profile.value?.player?.can_accept_orders !== false)
const isPlayerOnline = computed(() => Boolean(profile.value?.player?.is_online))
const playerRatingText = computed(() => Number(profile.value?.player?.rating_count || 0) > 0 ? Number(profile.value?.player?.avg_rating || 0).toFixed(1) : '-')
const statusText = computed(() => {
  if (!isLoggedIn.value) return '游客模式'
  if (profile.value?.player_status === 'approved') return '已成为陪玩师'
  if (profile.value?.player_status === 'pending') return '申请审核中'
  if (profile.value?.player_status === 'rejected') return '申请未通过'
  return '普通用户'
})
const statusClass = computed(() => ({
  guest: !isLoggedIn.value,
  approved: profile.value?.player_status === 'approved',
  pending: profile.value?.player_status === 'pending',
  rejected: profile.value?.player_status === 'rejected'
}))
const playerActionTitle = computed(() => {
  if (!isLoggedIn.value) return '登录后申请'
  if (profile.value?.player_status === 'approved') return canAcceptOrders.value ? '抢单大厅' : '接单已暂停'
  if (profile.value?.player_status === 'pending') return '审核中'
  return '申请成为陪玩师'
})
const playerActionSub = computed(() => {
  if (!isLoggedIn.value) return '登录后申请或接单'
  if (profile.value?.player_status === 'approved') return canAcceptOrders.value ? '查看并抢新订单' : '接单权限已暂停'
  if (profile.value?.player_status === 'pending') return '申请正在审核'
  return '先申请成为陪玩师'
})
const playerCenterTitle = computed(() => profile.value?.player_status === 'approved' ? '我的接单与评价' : playerActionTitle.value)
const playerCenterSub = computed(() => {
  if (!isLoggedIn.value) return '登录后查看个人服务'
  if (profile.value?.player_status === 'approved') return '查看订单与老板评价'
  if (profile.value?.player_status === 'pending') return '请等待管理员审核'
  return '提交资料后审核'
})
const playerEmptyTitle = computed(() => profile.value?.player_status === 'pending' ? '申请审核中' : (profile.value?.player_status === 'rejected' ? '申请未通过' : '还不是陪玩师'))
const playerEmptySub = computed(() => profile.value?.player_status === 'pending' ? '审核通过后即可进入抢单大厅' : (profile.value?.player_status === 'rejected' ? '可重新提交申请资料' : '提交申请后，审核通过即可进入抢单大厅'))

function openLogin() {
  go('/pages/client/login/index')
}

function handleHeroTap() {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  go('/pages/client/account/index')
}

async function loadProfile() {
  const token = getStorage<string>('token')
  isLoggedIn.value = Boolean(token)
  if (!token) {
    // 审核要求：游客进入“我的”页时必须停留在可浏览页面，不能自动跳转登录形成返回循环。
    profile.value = null
    return
  }

  try {
    profile.value = await syncClientProfile()
  } catch (error) {
    const cached = getClientProfile()
    const currentToken = getStorage<string>('token')
    if (!currentToken) {
      // 401会由请求层清除失效凭证；此处降级为游客模式，而不是再次跳回登录页。
      isLoggedIn.value = false
      profile.value = null
      toast('登录状态已失效，可继续游客浏览或重新登录')
      return
    }
    profile.value = cached
    toast(getErrorMessage(error, '个人信息刷新失败'))
  }
}

async function togglePlayerOnline() {
  if (!profile.value?.player || onlineUpdating.value) return
  if (!canAcceptOrders.value) return toast('管理员已暂停你的接单权限')
  onlineUpdating.value = true
  try {
    const result = await updatePlayerOnlineStatus(!isPlayerOnline.value)
    profile.value = { ...profile.value, player: { ...profile.value.player, is_online: Boolean(result.is_online) } }
    setPlayerOnlineStatus(Boolean(result.is_online))
    toast(result.is_online ? '已上线，开始接单' : '已离线，停止接单')
  } catch (error) {
    toast(getErrorMessage(error, '在线状态更新失败'))
  } finally {
    onlineUpdating.value = false
  }
}

function requireLogin() {
  if (isLoggedIn.value) return true
  toast('该功能需要登录，仍可继续浏览其他公开内容')
  openLogin()
  return false
}

function handlePlayerAction() {
  if (!requireLogin()) return
  if (profile.value?.player_status === 'approved') {
    if (!canAcceptOrders.value) {
      toast('管理员已暂停你的接单权限，请到设置页查看')
      go('/pages/client/settings/index')
      return
    }
    go('/pages/player/grab/index')
    return
  }
  if (profile.value?.player_status === 'pending') return toast('申请审核中，请等待管理员审核')
  go('/pages/player/apply/index')
}

function handlePlayerCenterAction() {
  if (!requireLogin()) return
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
  if (!requireLogin()) return
  go('/pages/client/settings/index')
}

function handleMainTabSelect(tab: MainTab) {
  if (tab === 'profile') return
  switchMainTab(tab)
}

onShow(loadProfile)
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';
.profile-page{min-height:100vh;padding:20rpx 24rpx 200rpx;box-sizing:border-box;background:linear-gradient(180deg,#f7f3ea,#fffaf2)}
.profile-hero{position:relative;padding:32rpx 30rpx;overflow:hidden;border-radius:28rpx;background:linear-gradient(135deg,#173426,#1f7c4b 60%,#2f9b63);box-shadow:0 20rpx 44rpx rgba(23,52,38,.18)}
.hero-glow{position:absolute;width:240rpx;height:240rpx;border-radius:50%;filter:blur(40rpx);opacity:.45}.hero-glow--left{left:-70rpx;top:-80rpx;background:#d8a144}.hero-glow--right{right:-80rpx;bottom:-100rpx;background:#5fb78a}
.hero-top{position:relative;z-index:1;display:flex;align-items:center;gap:24rpx}.avatar-wrap{width:132rpx;height:132rpx;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:34rpx;color:#173426;background:linear-gradient(135deg,#f3d79b,#d8a144)}.avatar-img{width:100%;height:100%}.avatar-text{font-size:54rpx;font-weight:900}.hero-info{flex:1;min-width:0}.hero-name-row{display:flex;align-items:center;justify-content:space-between;gap:10rpx}.hero-name{overflow:hidden;color:#fffaf0;font-size:40rpx;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.hero-arrow{color:#f3d79b;font-size:25rpx}.hero-id-row{display:flex;align-items:center;gap:12rpx;flex-wrap:wrap;margin-top:12rpx}.hero-id{color:rgba(255,255,255,.76);font-size:21rpx}.hero-status{display:flex;align-items:center;gap:7rpx;padding:5rpx 12rpx;border-radius:999rpx;color:#fff;font-size:20rpx;background:rgba(255,255,255,.16)}.status-dot{width:8rpx;height:8rpx;border-radius:50%;background:#5fb78a}.hero-status.guest .status-dot{background:#f3d79b}.hero-status.rejected .status-dot{background:#ef5b5b}
.guest-card,.player-summary-card,.player-card,.list-card{margin-top:22rpx;border-radius:26rpx;background:#fff;border:1rpx solid rgba(42,63,48,.07);box-shadow:0 12rpx 30rpx rgba(38,69,54,.06)}.guest-card{padding:28rpx;display:grid;grid-template-columns:auto 1fr;gap:16rpx}.guest-icon{width:72rpx;height:72rpx;display:flex;align-items:center;justify-content:center;border-radius:22rpx;color:#173426;font-size:30rpx;font-weight:900;background:linear-gradient(135deg,#f3d79b,#d8a144)}.guest-main text{display:block}.guest-title{font-size:29rpx;font-weight:900}.guest-sub{margin-top:8rpx;color:#687665;font-size:22rpx;line-height:1.5}.guest-login-btn,.guest-browse-btn{grid-column:1/3;width:100%;height:78rpx;border-radius:22rpx;font-size:26rpx;font-weight:900}.guest-login-btn{margin-top:8rpx;color:#fff;background:#1f7c4b}.guest-browse-btn{color:#5a6b5b;background:#f6f8f4}.guest-login-btn::after,.guest-browse-btn::after{border:none}
.player-summary-card{padding:24rpx}.card-head{display:flex;align-items:center;justify-content:space-between}.card-title{font-size:30rpx;font-weight:900}.online-toggle{display:flex;align-items:center;gap:7rpx;padding:8rpx 14rpx;border-radius:999rpx;color:#1f7c4b;font-size:21rpx;background:#eef8f1}.online-toggle.off,.online-toggle.disabled{color:#687665;background:#f1f3ef}.online-dot{width:8rpx;height:8rpx;border-radius:50%;background:#5fb78a}.online-toggle.off .online-dot,.online-toggle.disabled .online-dot{background:#aab1a5}.player-meta{display:flex;gap:14rpx;margin-top:16rpx;color:#687665;font-size:22rpx}.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx;margin-top:18rpx}.stats-row view{padding:18rpx 6rpx;border-radius:18rpx;text-align:center;background:#f7faf4}.stats-row text{display:block}.stats-row text:first-child{color:#1f7c4b;font-size:34rpx;font-weight:900}.stats-row text:last-child{margin-top:5rpx;color:#687665;font-size:20rpx}.warning-banner{margin-top:14rpx;padding:14rpx;border-radius:14rpx;color:#8f4d35;font-size:22rpx;background:#fff5e4}
.quick-grid{margin-top:22rpx;display:grid;grid-template-columns:1fr 1fr;gap:14rpx}.quick-item{min-height:138rpx;display:flex;align-items:center;gap:14rpx;padding:20rpx;border-radius:22rpx;background:#fff;border:1rpx solid rgba(42,63,48,.07)}.quick-item--primary{background:#fffaf0;border-color:rgba(216,161,68,.3)}.quick-icon{width:68rpx;height:68rpx;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:20rpx;color:#f3d79b;font-size:29rpx;font-weight:900;background:#1f7c4b}.quick-icon--primary{color:#173426;background:#d8a144}.quick-item view:last-child{min-width:0}.quick-item text{display:block}.quick-item text:first-child{font-size:27rpx;font-weight:900}.quick-item text:last-child{margin-top:5rpx;color:#687665;font-size:20rpx;line-height:1.35}
.player-card{overflow:hidden}.player-card .card-head{padding:22rpx 26rpx;border-bottom:1rpx solid rgba(42,63,48,.07)}.refresh-link{margin:0;padding:0;color:#1f7c4b;font-size:22rpx;background:transparent}.refresh-link::after{border:none}.player-empty{padding:38rpx 24rpx;display:flex;flex-direction:column;align-items:center;text-align:center}.empty-icon{width:88rpx;height:88rpx;display:flex;align-items:center;justify-content:center;border-radius:50%;color:#173426;font-size:38rpx;font-weight:900;background:#d8a144}.empty-title{margin-top:15rpx;font-size:29rpx;font-weight:900}.empty-sub{margin-top:8rpx;color:#687665;font-size:22rpx}.apply-btn{min-width:240rpx;height:76rpx;margin-top:18rpx;border-radius:22rpx;color:#fff;font-size:26rpx;font-weight:900;background:#1f7c4b}.apply-btn::after{border:none}
.list-card{overflow:hidden}.list-item{min-height:104rpx;display:flex;align-items:center;gap:14rpx;padding:20rpx 24rpx;border-bottom:1rpx solid rgba(42,63,48,.07)}.list-item:last-child{border-bottom:0}.list-icon{width:56rpx;height:56rpx;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:17rpx;color:#fff;font-size:24rpx;font-weight:900}.list-icon--green{background:#1f7c4b}.list-icon--blue{background:#2a6db4}.list-icon--gold{color:#173426;background:#d8a144}.list-label{min-width:110rpx;font-size:27rpx;font-weight:900}.list-note{flex:1;overflow:hidden;color:#8b9788;font-size:21rpx;text-align:right;text-overflow:ellipsis;white-space:nowrap}.chevron{color:#c4bba3;font-size:32rpx}
</style>
