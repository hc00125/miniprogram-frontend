<template>
  <view class="club-page account-page">
    <view class="account-hero brand-poster">
      <view class="hero-top">
        <view class="hero-tag">账号信息</view>
        <view class="hero-sub">登录身份与基础资料</view>
      </view>
      <view class="hero-body">
        <button
          class="avatar-shell"
          :class="{ 'avatar-shell--dirty': avatarDirty }"
          :disabled="avatarPicking"
          @tap="handleAvatarTap"
        >
          <image v-if="draftAvatar" class="avatar-img" :src="draftAvatar" mode="aspectFill" />
          <text v-else>{{ displayInitial }}</text>
        </button>
        <view class="identity-block">
          <view class="identity-name">{{ draftNickname || '未设置昵称' }}</view>
          <view class="identity-meta">{{ statusText }}</view>
          <view class="identity-tip">
            {{ avatarPicking ? '正在打开相册或相机…' : (avatarDirty ? '已选择新头像，请点击下方“保存资料”' : '点击头像可从相册或相机选择图片') }}
          </view>
        </view>
      </view>
    </view>

    <view
      v-if="accountRestriction.restricted"
      class="account-restriction-card"
      :class="`account-restriction-card--${accountRestriction.status}`"
      @tap="showRestrictionDetails"
    >
      <view class="restriction-head">
        <view class="restriction-icon">{{ accountRestriction.status === 'banned' ? '禁' : '停' }}</view>
        <view class="restriction-main">
          <text class="restriction-title">{{ accountRestriction.title }}</text>
          <text v-if="accountRestriction.suspendedUntilText" class="restriction-until">暂停至：{{ accountRestriction.suspendedUntilText }}</text>
        </view>
        <text class="restriction-arrow">›</text>
      </view>
      <text v-if="accountRestriction.reason" class="restriction-reason">原因：{{ accountRestriction.reason }}</text>
      <text class="restriction-tip">当前无法进行新的下单、接单、充值、支付或提现操作，历史记录与客服功能仍可使用。</text>
      <button class="restriction-service-btn" @tap.stop="goCustomerService">联系客服</button>
    </view>

    <view class="vip-card" :class="`vip-card--${vipTheme}`">
      <view class="vip-head">
        <view>
          <text class="vip-eyebrow">TOUCHI VIP</text>
          <text class="vip-title">{{ vipName }}</text>
        </view>
        <text class="vip-spend">成长钻石 💎{{ diamond(growthDiamonds) }}</text>
      </view>
      <view class="vip-progress-track">
        <view class="vip-progress-bar" :style="{ width: `${vipProgress}%` }"></view>
      </view>
      <view class="vip-progress-text">
        <text v-if="nextVipName">距离{{ nextVipName }}还差 💎{{ diamond(vipRemainingDiamonds) }}</text>
        <text v-else>已达到当前最高头衔</text>
        <text>{{ vipProgress }}%</text>
      </view>
      <view v-if="vipBenefits.length" class="vip-benefits">
        <text v-for="benefit in vipBenefits" :key="benefit">{{ benefit }}</text>
      </view>
      <view class="vip-actions">
        <view class="vip-action" @tap.stop="goGrowthRecords">
          <text>累计钻石记录</text>
          <text>›</text>
        </view>
      </view>
    </view>

    <view class="club-card wallet-entry-card" @tap="goWallet">
      <view class="wallet-entry-head">
        <view>
          <text class="wallet-entry-eyebrow">可用钻石</text>
          <view v-if="walletOverview || !walletLoadFailed" class="wallet-entry-balance"><text>💎</text><text>{{ walletBalance }}</text></view>
          <view v-else class="wallet-entry-balance wallet-entry-balance--error" @tap.stop="retryWalletOverview"><text>加载失败 · 点击重试</text></view>
        </view>
        <view
          class="wallet-entry-recharge"
          :class="{ 'wallet-entry-recharge--disabled': accountRestriction.restricted }"
          @tap.stop="goRecharge"
        >{{ accountRestriction.restricted ? '账户受限' : '充值钻石' }}</view>
      </view>
      <view class="wallet-entry-foot">
        <text>可用钻石可直接支付平台商品与服务</text>
        <text>查看明细 ›</text>
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
          <text v-else class="vip-room-threshold">解锁条件：成长钻石达到 💎20,000</text>
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
        <view class="field-group readonly">
          <text class="field-label">账户状态</text>
          <text class="field-value" :class="`field-value--${accountRestriction.status}`">{{ accountRestriction.statusText }}</text>
        </view>
      </view>
    </view>

    <view class="club-card action-card">
      <button class="club-btn save-btn" :disabled="saving" @tap="handleSave">
        {{ saving ? '保存中...' : '保存资料' }}
      </button>
      <button class="ghost-btn" @tap="handleLogout">退出登录</button>
    </view>

    <view v-if="privacyDialogVisible" class="privacy-mask">
      <view class="privacy-dialog">
        <text class="privacy-title">头像选择授权</text>
        <text class="privacy-content">
          为了让你从相册或相机选择并上传账号头像，需要你先阅读并同意{{ privacyContractName }}。头像仅用于个人中心、订单服务阵容和陪玩师资料展示。
        </text>
        <text class="privacy-link" @tap="openPrivacyPolicy">查看《隐私政策》</text>
        <view class="privacy-actions">
          <button class="privacy-cancel" @tap="closePrivacyDialog">暂不同意</button>
          <button
            class="privacy-agree"
            open-type="agreePrivacyAuthorization"
            @agreeprivacyauthorization="handlePrivacyAgreed"
          >
            同意并继续
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { updateClientProfileApi, uploadClientAvatarApi } from '@/api/client'
import { getWalletOverview, type WalletOverview } from '@/api/wallet'
import { getAccountRestrictionView, showAccountRestrictionModal } from '@/utils/accountRestriction'
import { getClientProfile, normalizeAvatarUrl, saveClientProfile, shouldUploadAvatarUrl, syncClientProfile, type ClientProfile } from '@/utils/client'
import { formatDiamonds } from '@/utils/diamonds'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { go, replace } from '@/utils/nav'
import { clearPlayerAuth } from '@/utils/storage'

declare const wx: any

const profile = ref<ClientProfile | null>(null)
const draftNickname = ref('')
const draftAvatar = ref('')
const saving = ref(false)
const avatarDirty = ref(false)
const avatarPicking = ref(false)
const initialized = ref(false)
const privacyDialogVisible = ref(false)
const privacyContractName = ref('《用户隐私保护指引》')
const walletOverview = ref<WalletOverview | null>(null)
const walletLoadFailed = ref(false)

const accountRestriction = computed(() => getAccountRestrictionView(profile.value))
const statusText = computed(() => {
  const status = profile.value?.player_status || 'none'
  if (status === 'approved') return '已成为陪玩师'
  if (status === 'pending') return '申请审核中'
  if (status === 'rejected') return '申请未通过'
  return '普通用户'
})
const displayInitial = computed(() => (draftNickname.value.trim().slice(0, 1) || '微'))
const growthDiamonds = computed(() => Number(
  profile.value?.vip?.growth_diamonds
  ?? profile.value?.cumulative_consumption_diamonds
  ?? 0
))
const vipName = computed(() => profile.value?.vip?.current_tier?.name || '鼠鼠')
const vipTheme = computed(() => profile.value?.vip?.current_tier?.badge_color || 'mouse')
const vipProgress = computed(() => Math.max(0, Math.min(100, Number(profile.value?.vip?.progress_percent || 0))))
const vipRemainingDiamonds = computed(() => Number(profile.value?.vip?.remaining_growth_diamonds || 0))
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
  return '成长钻石达到20,000后解锁，由平台超管统一配置。'
})

const walletBalance = computed(() => diamond(walletOverview.value?.balance_diamonds || 0))

async function loadWalletOverview() {
  try {
    walletOverview.value = await getWalletOverview()
    walletLoadFailed.value = false
  } catch {
    walletLoadFailed.value = walletOverview.value === null
  }
}

function retryWalletOverview() {
  void loadWalletOverview()
}

function goWallet() {
  go('/pages/client/wallet/index')
}

function goGrowthRecords() {
  go('/pages/client/growth-records/index')
}

function goRecharge() {
  if (accountRestriction.value.restricted) {
    void showAccountRestrictionModal(profile.value)
    return
  }
  go('/pages/client/recharge/index')
}

function goCustomerService() {
  go('/pages/client/customer-service/index')
}

function showRestrictionDetails() {
  void showAccountRestrictionModal(profile.value)
}

function diamond(value: unknown) {
  try {
    return formatDiamonds(value ?? 0)
  } catch {
    return '--'
  }
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

function openPrivacyPolicy() {
  go('/pages/legal/privacy/index')
}

function closePrivacyDialog() {
  privacyDialogVisible.value = false
}

function applySelectedAvatar(path: string) {
  const avatarPath = String(path || '').trim()
  if (!avatarPath) {
    toast('没有获取到图片，请重新选择')
    return
  }
  draftAvatar.value = avatarPath
  avatarDirty.value = true
  toast('已选择新头像，请点击保存资料')
}

function openAvatarPicker() {
  if (avatarPicking.value) return
  if (!uni.canIUse('chooseMedia')) {
    toast('当前微信版本过低，请升级微信后重新选择头像')
    return
  }

  avatarPicking.value = true
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    success: (result: any) => {
      applySelectedAvatar(result?.tempFiles?.[0]?.tempFilePath || '')
    },
    fail: (error: any) => {
      const message = String(error?.errMsg || '').trim()
      console.error('[account-avatar] chooseMedia failed', error)
      if (/cancel/i.test(message)) return
      toast(message ? `头像选择失败：${message}` : '头像选择失败，请重试')
    },
    complete: () => {
      avatarPicking.value = false
    }
  })
}

function handleAvatarTap() {
  if (avatarPicking.value) return

  // #ifdef MP-WEIXIN
  if (typeof wx !== 'undefined' && typeof wx.getPrivacySetting === 'function') {
    wx.getPrivacySetting({
      success: (result: any) => {
        privacyContractName.value = result?.privacyContractName
          ? `《${result.privacyContractName}》`
          : '《用户隐私保护指引》'
        if (result?.needAuthorization) {
          privacyDialogVisible.value = true
          return
        }
        openAvatarPicker()
      },
      fail: (error: any) => {
        console.error('[account-avatar] getPrivacySetting failed', error)
        openAvatarPicker()
      }
    })
    return
  }
  // #endif

  openAvatarPicker()
}

function handlePrivacyAgreed(event: any) {
  const message = String(event?.detail?.errMsg || '')
  if (message && !/ok/i.test(message)) {
    toast(`隐私授权失败：${message}`)
    return
  }
  privacyDialogVisible.value = false
  setTimeout(openAvatarPicker, 0)
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
    avatarDirty.value = false
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

onShow(async () => {
  void loadWalletOverview()
  if (initialized.value || avatarDirty.value) return
  initialized.value = true
  await loadAccount()
})
</script>

<style lang="scss" scoped>
.account-hero { padding: 28rpx; }
.hero-top { position: relative; z-index: 1; }
.hero-tag { color: #a87520; font-size: 22rpx; font-weight: 900; letter-spacing: 4rpx; }
.hero-sub { margin-top: 8rpx; color: #687665; font-size: 24rpx; }
.hero-body { margin-top: 24rpx; display: flex; align-items: center; gap: 22rpx; position: relative; z-index: 1; }
.avatar-shell { width: 150rpx; height: 150rpx; padding: 0; border-radius: 42rpx; background: #172116; border: 1px solid rgba(216,161,68,.18); display: flex; align-items: center; justify-content: center; overflow: hidden; color: #d8a144; font-size: 54rpx; font-weight: 900; }
.avatar-shell[disabled] { opacity: .72; }
.avatar-shell--dirty { border: 4rpx solid rgba(47,155,99,.72); box-shadow: 0 0 0 8rpx rgba(47,155,99,.10); }
.avatar-img { width: 150rpx; height: 150rpx; }
.identity-block { flex: 1; min-width: 0; }
.identity-name { color: #172116; font-size: 44rpx; font-weight: 900; word-break: break-all; }
.identity-meta { margin-top: 12rpx; display: inline-flex; padding: 8rpx 18rpx; border-radius: 999rpx; background: rgba(47,155,99,.10); color: #1f7c4b; font-size: 23rpx; }
.identity-tip { margin-top: 16rpx; color: #687665; font-size: 22rpx; }
.account-restriction-card { margin-top: 22rpx; padding: 28rpx; border-radius: 28rpx; border: 1rpx solid rgba(179,120,22,.20); background: linear-gradient(135deg,#fff8e8,#fff0c9); box-shadow: 0 14rpx 34rpx rgba(130,83,12,.10); }
.account-restriction-card--banned { border-color: rgba(177,61,53,.22); background: linear-gradient(135deg,#fff2ef,#ffe0dc); box-shadow: 0 14rpx 34rpx rgba(130,35,29,.10); }
.restriction-head { display: flex; align-items: center; gap: 16rpx; }
.restriction-icon { width: 68rpx; height: 68rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 20rpx; color: #fff; font-size: 29rpx; font-weight: 900; background: linear-gradient(135deg,#d49b38,#a96c0e); }
.account-restriction-card--banned .restriction-icon { background: linear-gradient(135deg,#d8645d,#9e302a); }
.restriction-main { flex: 1; min-width: 0; }
.restriction-title { display: block; color: #7c4d08; font-size: 32rpx; font-weight: 900; }
.account-restriction-card--banned .restriction-title { color: #8f2e28; }
.restriction-until { display: block; margin-top: 6rpx; color: #986916; font-size: 22rpx; }
.restriction-arrow { color: #9d731f; font-size: 42rpx; font-weight: 900; }
.restriction-reason { display: block; margin-top: 20rpx; color: #65440d; font-size: 24rpx; font-weight: 900; line-height: 1.55; }
.account-restriction-card--banned .restriction-reason { color: #6f2a26; }
.restriction-tip { display: block; margin-top: 12rpx; color: #776442; font-size: 22rpx; line-height: 1.65; }
.account-restriction-card--banned .restriction-tip { color: #76504d; }
.restriction-service-btn { width: 100%; height: 72rpx; margin-top: 20rpx; border-radius: 999rpx; color: #fff; font-size: 25rpx; font-weight: 900; background: linear-gradient(135deg,#d49b38,#a96c0e); }
.account-restriction-card--banned .restriction-service-btn { background: linear-gradient(135deg,#d8645d,#9e302a); }
.restriction-service-btn::after { border: none; }
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
.vip-spend { font-size: 22rpx; font-weight: 900; }
.vip-progress-track { height: 12rpx; margin-top: 25rpx; overflow: hidden; border-radius: 999rpx; background: rgba(255,255,255,.18); }
.vip-progress-bar { height: 100%; border-radius: inherit; background: linear-gradient(90deg,#f7dda0,#d8a144); }
.vip-progress-text { margin-top: 14rpx; display: flex; justify-content: space-between; gap: 20rpx; font-size: 22rpx; opacity: .82; }
.vip-benefits { margin-top: 18rpx; display: flex; flex-wrap: wrap; gap: 10rpx; }
.vip-benefits text { padding: 8rpx 14rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 900; background: rgba(255,255,255,.12); }
.vip-actions { margin-top: 18rpx; padding-top: 16rpx; border-top: 1rpx solid rgba(255,255,255,.14); }
.vip-action { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 12rpx 16rpx; border-radius: 999rpx; font-size: 22rpx; font-weight: 900; background: rgba(255,255,255,.12); }
.vip-action text:last-child { font-size: 30rpx; line-height: 1; }
.wallet-entry-card { margin-bottom: 24rpx; padding: 28rpx; }
.wallet-entry-head { display: flex; align-items: center; justify-content: space-between; gap: 20rpx; }
.wallet-entry-eyebrow { display: block; color: #a87520; font-size: 21rpx; font-weight: 900; }
.wallet-entry-balance { margin-top: 8rpx; display: flex; align-items: baseline; gap: 6rpx; color: #172116; }
.wallet-entry-balance text:first-child { font-size: 26rpx; font-weight: 900; }
.wallet-entry-balance text:last-child { font-size: 48rpx; line-height: 1; font-weight: 900; }
.wallet-entry-balance--error text:first-child, .wallet-entry-balance--error text:last-child { font-size: 27rpx; line-height: 1.4; font-weight: 900; color: #a13d35; text-decoration: underline; }
.wallet-entry-recharge { flex-shrink: 0; padding: 14rpx 34rpx; border-radius: 999rpx; color: #fff; font-size: 25rpx; font-weight: 900; background: linear-gradient(135deg, #4fc083, #1f7c4b); box-shadow: 0 10rpx 22rpx rgba(31,124,75,.18); }
.wallet-entry-recharge--disabled { color: #76504d; background: #f4d5d1; box-shadow: none; }
.wallet-entry-foot { margin-top: 20rpx; padding-top: 18rpx; display: flex; align-items: center; justify-content: space-between; gap: 16rpx; border-top: 1rpx solid rgba(39,61,42,.07); font-size: 22rpx; }
.wallet-entry-foot text:first-child { color: #687665; }
.wallet-entry-foot text:last-child { color: #1f7c4b; font-weight: 900; }
.vip-room-card { margin-top: 0; padding: 28rpx; }
.vip-room-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16rpx; }
.vip-room-head text { display: block; }
.vip-room-eyebrow { color: #a87520; font-size: 21rpx; font-weight: 900; }
.vip-room-title { margin-top: 6rpx; color: #172116; font-size: 34rpx; font-weight: 900; }
.vip-room-state { padding: 8rpx 14rpx; border-radius: 999rpx; color: #9a6a16; font-size: 20rpx; font-weight: 900; background: #fff3d4; }
.vip-room-state--active { color: #1f7c4b; background: #e8f7ec; }
.vip-room-state--pending_configuration { color: #9a6a16; background: #fff3d4; }
.vip-room-state--disabled { color: #6e746e; background: #eef0ec; }
.vip-room-body { margin-top: 20rpx; padding: 20rpx; display: flex; align-items: center; gap: 18rpx; border-radius: 22rpx; background: #f7faf4; }
.vip-room-icon { width: 74rpx; height: 74rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 22rpx; color: #fff; font-size: 30rpx; font-weight: 900; background: linear-gradient(135deg,#4fc083,#1f7c4b); }
.vip-room-main { flex: 1; min-width: 0; }
.vip-room-description { display: block; color: #687665; font-size: 23rpx; line-height: 1.5; }
.vip-room-number-row { margin-top: 10rpx; display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.vip-room-number { color: #172116; font-size: 29rpx; font-weight: 900; word-break: break-all; }
.vip-room-copy { flex-shrink: 0; padding: 8rpx 14rpx; border-radius: 999rpx; color: #1f7c4b; font-size: 21rpx; font-weight: 900; background: #e8f7ec; }
.vip-room-threshold { display: block; margin-top: 10rpx; color: #a87520; font-size: 22rpx; font-weight: 900; }
.form-card { margin-top: 24rpx; }
.form-head { align-items: flex-start; }
.helper { color: #687665; font-size: 22rpx; }
.form-body { display: flex; flex-direction: column; gap: 22rpx; }
.field-label { display: block; margin-bottom: 12rpx; color: #526153; font-size: 24rpx; font-weight: 900; }
.readonly { padding: 20rpx; border-radius: 22rpx; background: #f7faf4; border: 1rpx solid rgba(39,61,42,.08); }
.field-value { color: #172116; font-size: 29rpx; font-weight: 900; }
.field-value--suspended { color: #a66d0e; }
.field-value--banned { color: #a13d35; }
.action-card { margin-top: 24rpx; padding: 24rpx; }
.save-btn, .ghost-btn { width: 100%; }
.ghost-btn { height: 80rpx; margin-top: 14rpx; border-radius: 22rpx; color: #687665; font-size: 27rpx; font-weight: 900; background: #f7faf4; }
.save-btn::after, .ghost-btn::after, .avatar-shell::after { border: none; }
.privacy-mask { position: fixed; z-index: 9999; left: 0; right: 0; top: 0; bottom: 0; padding: 32rpx; display: flex; align-items: center; justify-content: center; box-sizing: border-box; background: rgba(13,25,17,.56); }
.privacy-dialog { width: 100%; padding: 34rpx 30rpx 28rpx; box-sizing: border-box; border-radius: 30rpx; background: #fff; box-shadow: 0 24rpx 70rpx rgba(13,25,17,.22); }
.privacy-title { display: block; color: #172116; font-size: 34rpx; font-weight: 900; text-align: center; }
.privacy-content { display: block; margin-top: 20rpx; color: #687665; font-size: 24rpx; line-height: 1.7; }
.privacy-link { display: inline-block; margin-top: 18rpx; color: #1f7c4b; font-size: 23rpx; font-weight: 900; text-decoration: underline; }
.privacy-actions { margin-top: 28rpx; display: grid; grid-template-columns: 1fr 1.6fr; gap: 14rpx; }
.privacy-actions button { height: 80rpx; margin: 0; border-radius: 999rpx; font-size: 25rpx; font-weight: 900; }
.privacy-actions button::after { border: none; }
.privacy-cancel { color: #687665; background: #f1f3ef; }
.privacy-agree { color: #fff; background: linear-gradient(135deg,#4fc083,#1f7c4b); }
</style>