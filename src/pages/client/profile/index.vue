<template>
  <view class="club-page profile-page">
    <view class="profile-hero" @tap="go('/pages/client/account/index')">
      <view class="avatar-wrap"><image v-if="displayAvatarUrl" class="avatar-img" :src="displayAvatarUrl" mode="aspectFill" /><text v-else>{{ displayInitial }}</text></view>
      <view class="hero-info"><view class="hero-name-row"><text>{{ displayName }}</text><text>›</text></view><view class="hero-id-row"><text>ID: {{ profileIdText }}</text><text class="hero-status" :class="statusClass">{{ statusText }}</text></view></view>
    </view>

    <view v-if="profile?.player" class="player-summary-card">
      <view class="card-head"><text>陪玩师信息</text><view class="online-toggle" :class="{ off: !isPlayerOnline, disabled: !canAcceptOrders }" @tap="togglePlayerOnline">{{ onlineUpdating ? '同步中' : (!canAcceptOrders ? '接单暂停' : (isPlayerOnline ? '在线' : '离线')) }}</view></view>
      <view class="player-summary-body">
        <view class="player-summary-meta"><text>{{ profile.player.type_name || '陪玩师' }}</text><text>TC: {{ profile.player.id }}</text></view>
        <view class="stats-row"><view><text>{{ profile.player.total_orders || 0 }}</text><text>接单</text></view><view><text>{{ playerRatingText }}</text><text>综合评分</text></view><view><text>{{ profile.player.rating_count || 0 }}</text><text>评价数量</text></view></view>
        <view v-if="!canAcceptOrders" class="warning">管理员已暂停你的接单权限，请到设置页查看或联系客服。</view>
        <view v-if="profile?.application?.reject_reason" class="warning">审核未通过：{{ profile.application.reject_reason }}</view>
      </view>
    </view>

    <view class="quick-grid" :class="{ 'quick-grid--basic': profile?.player_status !== 'approved' }">
      <view class="quick-item primary" @tap="goMain('order')"><view class="quick-icon">点</view><view><text>我要点单</text><text>查看商品与规格</text></view></view>
      <view class="quick-item" @tap="goMain('query')"><view class="quick-icon">查</view><view><text>我的订单</text><text>查看服务记录</text></view></view>
      <template v-if="profile?.player_status === 'approved'">
        <view class="quick-item" @tap="handlePlayerAction"><view class="quick-icon">抢</view><view><text>抢单大厅</text><text>{{ canAcceptOrders ? '查看并抢新订单' : '接单权限已暂停' }}</text></view></view>
        <view class="quick-item" @tap="go('/pages/player/my-orders/index')"><view class="quick-icon">评</view><view><text>我的接单与评价</text><text>查看订单与老板评价</text></view></view>
      </template>
    </view>

    <view v-if="profile?.player_status !== 'approved'" class="player-card">
      <view class="card-head"><text>陪玩师申请</text><button v-if="profile?.player_status === 'pending'" @tap.stop="loadProfile">刷新状态</button></view>
      <view class="player-empty"><text class="empty-title">{{ playerEmptyTitle }}</text><text class="empty-sub">{{ playerEmptySub }}</text><button class="apply-btn" :disabled="profile?.player_status === 'pending'" @tap="handlePlayerAction">{{ playerActionTitle }}</button></view>
    </view>

    <view class="list-card">
      <view class="list-item" @tap="go('/pages/legal/user-agreement/index')"><view><text class="list-icon">协</text><text>用户服务协议</text></view><text>平台服务规则 ›</text></view>
      <view class="list-item" @tap="go('/pages/legal/privacy/index')"><view><text class="list-icon privacy">隐</text><text>隐私政策</text></view><text>个人信息处理说明 ›</text></view>
      <button class="list-item contact-button" open-type="contact"><view><text class="list-icon contact">客</text><text>联系客服</text></view><text>微信官方客服会话 ›</text></button>
      <view class="list-item" @tap="go('/pages/client/settings/index')"><view><text class="list-icon settings">设</text><text>设置</text></view><text>账号、资料与权限 ›</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { updatePlayerOnlineStatus } from '@/api/player'
import { getClientProfile, normalizeAvatarUrl, setPlayerOnlineStatus, syncClientProfile, type ClientProfile } from '@/utils/client'
import { go, goMain, replace } from '@/utils/nav'
import { getErrorMessage, toast } from '@/utils/feedback'

const profile = ref<ClientProfile | null>(null)
const onlineUpdating = ref(false)
const displayAvatarUrl = computed(() => normalizeAvatarUrl(profile.value?.avatarUrl || profile.value?.avatar_url))
const canAcceptOrders = computed(() => profile.value?.player?.can_accept_orders !== false)
const displayName = computed(() => profile.value?.nickname?.trim() || profile.value?.player?.name?.trim() || '未设置昵称')
const displayInitial = computed(() => displayName.value.slice(0, 1) || '微')
const profileIdText = computed(() => {
  const openid = profile.value?.openid || profile.value?.open_id || profile.value?.wechat_openid
  return openid ? openid.slice(-8).toUpperCase() : '未同步'
})
const isPlayerOnline = computed(() => Boolean(profile.value?.player?.is_online))
const playerRatingText = computed(() => Number(profile.value?.player?.rating_count || 0) > 0 ? Number(profile.value?.player?.avg_rating || 0).toFixed(1) : '-')
const statusText = computed(() => {
  const status = profile.value?.player_status || 'none'
  if (status === 'approved') return '已成为陪玩师'
  if (status === 'pending') return '申请审核中'
  if (status === 'rejected') return '申请未通过'
  return '普通用户'
})
const statusClass = computed(() => ({ approved: profile.value?.player_status === 'approved', pending: profile.value?.player_status === 'pending', rejected: profile.value?.player_status === 'rejected' }))
const playerActionTitle = computed(() => profile.value?.player_status === 'pending' ? '审核中' : (profile.value?.player_status === 'rejected' ? '重新提交申请' : '申请成为陪玩师'))
const playerEmptyTitle = computed(() => profile.value?.player_status === 'pending' ? '申请审核中' : (profile.value?.player_status === 'rejected' ? '申请未通过' : '还不是陪玩师'))
const playerEmptySub = computed(() => profile.value?.player_status === 'pending' ? '请等待管理员审核，审核通过后即可接单' : (profile.value?.player_status === 'rejected' ? '修改资料后可以重新提交申请' : '提交资料并通过审核后即可进入抢单大厅'))

async function loadProfile() {
  try { profile.value = await syncClientProfile() }
  catch {
    const cached = getClientProfile()
    if (!cached) { replace('/pages/client/login/index'); return }
    if (cached.application?.status === 'approved') cached.player_status = 'approved'
    profile.value = cached
    toast('个人信息刷新失败，当前显示本机缓存')
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
  } catch (error) { toast(getErrorMessage(error, '在线状态更新失败')) }
  finally { onlineUpdating.value = false }
}
function handlePlayerAction() {
  if (profile.value?.player_status === 'approved') {
    if (!canAcceptOrders.value) { toast('管理员已暂停你的接单权限'); go('/pages/client/settings/index'); return }
    go('/pages/player/grab/index')
    return
  }
  if (profile.value?.player_status === 'pending') return toast('申请审核中，请等待管理员审核')
  go('/pages/player/apply/index')
}
onShow(loadProfile)
</script>

<style lang="scss" scoped>
.profile-page{min-height:100vh;padding:20rpx 24rpx 140rpx;box-sizing:border-box;background:linear-gradient(180deg,#f7f3ea,#fffaf2)}.profile-hero{display:flex;align-items:center;gap:22rpx;padding:30rpx;border-radius:28rpx;color:#fff;background:linear-gradient(135deg,#173426,#1f7c4b);box-shadow:0 18rpx 40rpx rgba(23,52,38,.17)}.avatar-wrap{width:128rpx;height:128rpx;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:34rpx;color:#173426;background:#f3d79b;font-size:52rpx;font-weight:900}.avatar-img{width:100%;height:100%}.hero-info{flex:1;min-width:0}.hero-name-row{display:flex;align-items:center;gap:10rpx;font-size:40rpx;font-weight:900}.hero-name-row text:first-child{max-width:420rpx;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.hero-id-row{display:flex;align-items:center;gap:12rpx;margin-top:14rpx;color:rgba(255,255,255,.75);font-size:20rpx}.hero-status{padding:6rpx 12rpx;border-radius:999rpx;color:#fff;background:rgba(255,255,255,.16)}.hero-status.pending{background:rgba(216,161,68,.35)}.hero-status.rejected{background:rgba(239,91,91,.35)}.player-summary-card,.player-card,.list-card{margin-top:20rpx;overflow:hidden;border-radius:26rpx;background:#fff;box-shadow:0 12rpx 30rpx rgba(39,61,42,.06)}.card-head{display:flex;align-items:center;justify-content:space-between;padding:22rpx 24rpx;border-bottom:1rpx solid #eee;font-size:28rpx;font-weight:900}.card-head button{margin:0;padding:0;color:#1f7c4b;background:transparent}.card-head button::after{border:none}.online-toggle{padding:7rpx 14rpx;border-radius:999rpx;color:#1f7c4b;background:#eef8f1;font-size:21rpx}.online-toggle.off,.online-toggle.disabled{color:#888;background:#f1f2ef}.player-summary-body{padding:22rpx}.player-summary-meta{display:flex;gap:14rpx;color:#687665;font-size:22rpx}.player-summary-meta text:first-child{color:#1f7c4b;font-weight:900}.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx;margin-top:18rpx}.stats-row view{padding:18rpx 8rpx;border-radius:18rpx;text-align:center;background:#f7faf4}.stats-row text{display:block}.stats-row text:first-child{font-size:32rpx;font-weight:900}.stats-row text:last-child{margin-top:5rpx;color:#879083;font-size:20rpx}.warning{margin-top:16rpx;padding:15rpx;border-radius:14rpx;color:#8f4d35;background:#fff2ec;font-size:22rpx;line-height:1.5}.quick-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14rpx;margin-top:20rpx}.quick-item{display:flex;align-items:center;gap:14rpx;padding:22rpx;border-radius:22rpx;background:#fff}.quick-item.primary{background:#eef8f1}.quick-icon{width:58rpx;height:58rpx;display:flex;align-items:center;justify-content:center;border-radius:16rpx;color:#fff;background:#1f7c4b;font-weight:900}.quick-item>view:last-child{flex:1}.quick-item text{display:block}.quick-item text:first-child{font-size:26rpx;font-weight:900}.quick-item text:last-child{margin-top:5rpx;color:#879083;font-size:20rpx}.player-empty{padding:32rpx;text-align:center}.empty-title,.empty-sub{display:block}.empty-title{font-size:30rpx;font-weight:900}.empty-sub{margin-top:10rpx;color:#879083;font-size:22rpx;line-height:1.5}.apply-btn{min-width:240rpx;height:74rpx;margin-top:22rpx;border-radius:999rpx;color:#fff;background:#1f7c4b}.list-item{min-height:92rpx;display:flex;align-items:center;justify-content:space-between;gap:14rpx;padding:0 22rpx;border-bottom:1rpx solid #eee;box-sizing:border-box}.list-item>view{display:flex;align-items:center;gap:12rpx}.list-item>text{color:#879083;font-size:21rpx}.list-icon{width:48rpx;height:48rpx;display:flex;align-items:center;justify-content:center;border-radius:14rpx;color:#fff;background:#1f7c4b;font-size:20rpx}.list-icon.privacy{background:#6c7d9b}.list-icon.contact{background:#3488d1}.list-icon.settings{background:#a87520}.contact-button{width:100%;margin:0;border-radius:0;color:inherit;text-align:left;background:transparent}.contact-button::after{border:none}
</style>
