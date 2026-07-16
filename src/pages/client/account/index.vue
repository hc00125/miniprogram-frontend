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

    <view class="vip-card" :class="`vip-card--${vipTheme}`">
      <view class="vip-head">
        <view>
          <text class="vip-eyebrow">TOUCHI VIP</text>
          <text class="vip-title">{{ vipName }}</text>
        </view>
        <text class="vip-spend">累计钻石 💎{{ diamond(cumulativeConsumption) }}</text>
      </view>
      <view class="vip-progress-track">
        <view class="vip-progress-bar" :style="{ width: `${vipProgress}%` }"></view>
      </view>
      <view class="vip-progress-text">
        <text v-if="nextVipName">距离{{ nextVipName }}还差 💎{{ diamond(vipRemaining) }}</text>
        <text v-else>已达到当前最高头衔</text>
        <text>{{ vipProgress }}%</text>
      </view>
      <view v-if="vipBenefits.length" class="vip-benefits">
        <text v-for="benefit in vipBenefits" :key="benefit">{{ benefit }}</text>
      </view>
    </view>

    <view class="club-card vip-room-card">
      <view class="vip-room-head">
        <view>
          <text class="vip-room-eyebrow">会员权益</text>
          <text class="vip-room-title">专属KOOK房间</text>
        </view>
        <text class="vip-room-state" :class="vipKookRoomStatusClass">{{ vipKookRoomStatusText }}</text>
      </view>
      <view class="vip-room-body">
        <view class="vip-room-icon">房</view>
        <view class="vip-room-main">
          <text class="vip-room-description">{{ vipKookRoomDescription }}</text>
          <view v-if="vipKookRoomNumber" class="vip-room-number-row">
            <text class="vip-room-number">{{ vipKookRoomNumber }}</text>
            <view class="vip-room-copy" @tap="copyVipKookRoom">复制</view>
          </view>
          <text v-else class="vip-room-threshold">解锁条件：累计达到 💎20,000</text>
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
const cumulativeConsumption = computed(() => Number(profile.value?.vip?.cumulative_consumption ?? profile.value?.cumulative_consumption ?? 0))
const vipName = computed(() => profile.value?.vip?.current_tier?.name || '鼠鼠')
const vipTheme = computed(() => profile.value?.vip?.current_tier?.badge_color || 'mouse')
const vipProgress = computed(() => Math.max(0, Math.min(100, Number(profile.value?.vip?.progress_percent || 0))))
const vipRemaining = computed(() => Number(profile.value?.vip?.remaining_to_next || 0))
const nextVipName = computed(() => profile.value?.vip?.next_tier?.name || '')
const vipBenefits = computed(() => profile.value?.vip?.current_tier?.benefits || [])
const vipKookRoom = computed(() => profile.value?.vip?.private_kook_room)
const vipKookRoomNumber = computed(() => vipKookRoom.value?.room_number?.trim() || '')
const vipKookRoomStatusText = computed(() => {
  const status = vipKookRoom.value?.status || 'locked'
  if (status === 'active') return '已配置'
  if (status === 'pending_configuration') return '等待配置'
  if (status === 'disabled') return '暂未启用'
  return '💎20,000解锁'
})
const vipKookRoomStatusClass = computed(() => `vip-room-state--${vipKookRoom.value?.status || 'locked'}`)
const vipKookRoomDescription = computed(() => {
  const status = vipKookRoom.value?.status || 'locked'
  if (status === 'active') return '后续创建的新订单会自动使用该专属房间。'
  if (status === 'pending_configuration') return '权益已解锁，等待平台超管填写专属房间号。'
  if (status === 'disabled') return '房间记录已保留，当前暂不应用到新订单。'
  return '累计钻石达到20,000后解锁，由平台超管统一配置。'
})

function diamond(value: number) {
  const converted = Math.round(Number(value || 0) * 100) / 10
  const fixed = converted.toFixed(1)
  const [integer, decimal] = fixed.split('.')
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decimal === '0' ? formatted : `${formatted}.${decimal}`
}

function copyVipKookRoom() {
  if (!vipKookRoomNumber.value) return
  uni.setClipboardData({
    data: vipKookRoomNumber.value,
    success: () => success('KOOK房间号已复制')
  })
}

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
.account-hero { padding: 28rpx; }
.hero-top { position: relative; z-index: 1; }
.hero-tag { color: #a87520; font-size: 22rpx; font-weight: 900; letter-spacing: 4rpx; }
.hero-sub { margin-top: 8rpx; color: #687665; font-size: 24rpx; }
.hero-body { margin-top: 24rpx; display: flex; align-items: center; gap: 22rpx; position: relative; z-index: 1; }
.avatar-shell { width: 150rpx; height: 150rpx; border-radius: 42rpx; background: #172116; border: 1px solid rgba(216,161,68,.18); display: flex; align-items: center; justify-content: center; overflow: hidden; color: #d8a144; font-size: 54rpx; font-weight: 900; }
.avatar-img { width: 150rpx; height: 150rpx; }
.identity-block { flex: 1; min-width: 0; }
.identity-name { color: #172116; font-size: 44rpx; font-weight: 900; word-break: break-all; }
.identity-meta { margin-top: 12rpx; display: inline-flex; padding: 8rpx 18rpx; border-radius: 999rpx; background: rgba(47,155,99,.10); color: #1f7c4b; font-size: 23rpx; }
.identity-tip { margin-top: 16rpx; color: #687665; font-size: 22rpx; }

.vip-card { margin: 22rpx 0; padding: 28rpx; border-radius: 30rpx; color: #fff; background: linear-gradient(135deg,#173426,#1f7c4b); box-shadow: 0 18rpx 40rpx rgba(23,52,38,.16); }
.vip-card--mouse { background: linear-gradient(135deg,#59655b,#26372d); }
.vip-card--bronze { color: #fff8eb; background: linear-gradient(135deg,#8b5a2b,#c68b52); }
.vip-card--silver { color: #24302d; background: linear-gradient(135deg,#f7f9f8,#cfd8d5); }
.vip-card--gold { color: #3b2a0e; background: linear-gradient(135deg,#fff4ce,#d8a144); }
.vip-card--platinum { color: #26383c; background: linear-gradient(135deg,#f5fbfc,#a9c8cf); }
.vip-card--emerald { background: linear-gradient(135deg,#083f31,#1aa876); }
.vip-card--diamond { color: #123447; background: linear-gradient(135deg,#f4fdff,#74d7ef 58%,#b7a8ff); }
.vip-card--glory { background: linear-gradient(135deg,#4c174e,#b43779 58%,#f0a85d); }
.vip-card--brilliant { color: #301d4a; background: linear-gradient(135deg,#fff0fb,#d39cff 48%,#79e5e0); }
.vip-card--dream { background: linear-gradient(135deg,#392762,#7d5bd7 52%,#e388c7); }
.vip-card--elegant { color: #472439; background: linear-gradient(135deg,#fff0f5,#f2a9cc 50%,#e9c56d); }
.vip-card--supreme { background: linear-gradient(135deg,#090909,#38230d 58%,#d8a144); box-shadow: 0 18rpx 46rpx rgba(23,15,5,.28); }
.vip-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20rpx; }
.vip-head text { display: block; }
.vip-eyebrow { font-size: 19rpx; font-weight: 900; letter-spacing: 3rpx; opacity: .68; }
.vip-title { margin-top: 7rpx; font-size: 38rpx; font-weight: 900; }
.vip-spend { font-size: 22rpx; font-weight: 800; opacity: .88; text-align: right; }
.vip-progress-track { height: 12rpx; margin-top: 24rpx; overflow: hidden; border-radius: 999rpx; background: rgba(255,255,255,.22); }
.vip-card--silver .vip-progress-track,.vip-card--gold .vip-progress-track,.vip-card--platinum .vip-progress-track,.vip-card--diamond .vip-progress-track,.vip-card--brilliant .vip-progress-track,.vip-card--elegant .vip-progress-track { background: rgba(23,52,38,.14); }
.vip-progress-bar { height: 100%; border-radius: 999rpx; background: #f3d79b; transition: width .25s ease; }
.vip-card--silver .vip-progress-bar,.vip-card--platinum .vip-progress-bar,.vip-card--diamond .vip-progress-bar { background: #1f7c6d; }
.vip-card--gold .vip-progress-bar,.vip-card--elegant .vip-progress-bar { background: #6a4814; }
.vip-card--brilliant .vip-progress-bar { background: #61388f; }
.vip-progress-text { margin-top: 10rpx; display: flex; justify-content: space-between; gap: 20rpx; font-size: 20rpx; opacity: .82; }
.vip-benefits { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 22rpx; }
.vip-benefits text { padding: 8rpx 14rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 800; background: rgba(255,255,255,.14); }
.vip-card--silver .vip-benefits text,.vip-card--gold .vip-benefits text,.vip-card--platinum .vip-benefits text,.vip-card--diamond .vip-benefits text,.vip-card--brilliant .vip-benefits text,.vip-card--elegant .vip-benefits text { background: rgba(23,52,38,.10); }

.vip-room-card { margin-bottom: 22rpx; padding: 28rpx; }
.vip-room-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; }
.vip-room-head text { display: block; }
.vip-room-eyebrow { color: #a87520; font-size: 20rpx; font-weight: 900; letter-spacing: 2rpx; }
.vip-room-title { margin-top: 6rpx; color: #172116; font-size: 32rpx; font-weight: 900; }
.vip-room-state { flex-shrink: 0; padding: 8rpx 14rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 900; }
.vip-room-state--locked { color: #7c5a1c; background: #fff5dc; }
.vip-room-state--pending_configuration { color: #1f6f48; background: #eef8f1; }
.vip-room-state--disabled { color: #8d4c3b; background: #fff0ea; }
.vip-room-state--active { color: #fff; background: #1f7c4b; }
.vip-room-body { margin-top: 22rpx; display: flex; align-items: flex-start; gap: 18rpx; padding: 22rpx; border-radius: 24rpx; background: linear-gradient(180deg,#f7faf4,#f1f6ee); }
.vip-room-icon { width: 68rpx; height: 68rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 20rpx; color: #fff; font-size: 28rpx; font-weight: 900; background: #2f9b63; }
.vip-room-main { flex: 1; min-width: 0; }
.vip-room-description { display: block; color: #687665; font-size: 22rpx; line-height: 1.55; }
.vip-room-number-row { margin-top: 16rpx; display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.vip-room-number { flex: 1; min-width: 0; color: #172116; font-size: 30rpx; font-weight: 900; word-break: break-all; }
.vip-room-copy { flex-shrink: 0; padding: 9rpx 18rpx; border-radius: 999rpx; color: #1f7c4b; font-size: 21rpx; font-weight: 900; background: #fff; border: 1rpx solid rgba(31,124,75,.16); }
.vip-room-threshold { display: block; margin-top: 14rpx; color: #8a6a31; font-size: 21rpx; font-weight: 800; }

.form-card { padding-bottom: 10rpx; }
.form-head { display: flex; flex-direction: column; gap: 8rpx; }
.helper { color: #687665; font-size: 23rpx; }
.form-body { display: flex; flex-direction: column; gap: 22rpx; }
.field-group { display: flex; flex-direction: column; gap: 14rpx; }
.field-label { color: #475646; font-size: 25rpx; font-weight: 800; }
.readonly { padding: 22rpx; border-radius: 24rpx; background: linear-gradient(180deg, #f7faf4, #f2f6ef); border: 1px solid rgba(37,49,35,.06); }
.field-value { color: #172116; font-size: 30rpx; font-weight: 900; }
.action-card { display: flex; flex-direction: column; gap: 18rpx; }
.save-btn { width: 100%; }
.ghost-btn { width: 100%; height: 90rpx; border-radius: 28rpx; background: #fff; color: #7c4e16; border: 1px solid rgba(199,145,70,.22); font-size: 28rpx; font-weight: 800; }
</style>
