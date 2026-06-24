<template>
  <view class="club-page home-page">
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left">
        <text class="nav-brand">偷吃电竞</text>
      </view>
      <view class="nav-right" @tap="goProfile">
        <text>•••</text>
      </view>
    </view>

    <scroll-view scroll-y class="home-scroll">
      <view class="landing">
        <view class="hero-poster">
          <image class="hero-bg" :src="homeHero" mode="aspectFill" />
          <view class="hero-glass"></view>
          <view class="hero-copy">
            <view class="hero-title">今晚开局，不等队友</view>
            <view class="hero-sub">在线陪玩 · 快速接单 · 明星阵容</view>
            <view class="hero-actions">
              <button class="hero-btn hero-btn--primary" @tap="goShopCategory">立即点单 <text>›</text></button>
              <button class="hero-btn hero-btn--light" @tap="goQuery">
                <text class="btn-icon">▤</text>
                我的订单
              </button>
            </view>
            <view class="hero-dots">
              <text></text>
              <text></text>
              <text></text>
            </view>
          </view>
        </view>

        <view class="quick-grid">
          <view class="quick-card" @tap="goShopCategory">
            <view class="quick-icon quick-icon--order">✓</view>
            <view class="quick-main">
              <text>点单大厅</text>
              <text>海量陪玩 · 快速响应</text>
            </view>
            <text class="quick-arrow">›</text>
          </view>
          <view class="quick-card" @tap="goQuery">
            <view class="quick-icon quick-icon--query">◷</view>
            <view class="quick-main">
              <text>订单进度</text>
              <text>实时查看 · 进度跟踪</text>
            </view>
            <text class="quick-arrow">›</text>
          </view>
          <view class="quick-card" @tap="goPlayerList">
            <view class="quick-icon quick-icon--player">♙</view>
            <view class="quick-main">
              <text>陪玩入驻</text>
              <text>加入我们 · 收益多多</text>
            </view>
            <text class="quick-arrow">›</text>
          </view>
          <view class="quick-card" @tap="goProfile">
            <view class="quick-icon quick-icon--profile">●</view>
            <view class="quick-main">
              <text>个人中心</text>
              <text>我的资料 · 会员特权</text>
            </view>
            <text class="quick-arrow">›</text>
          </view>
        </view>

        <view class="notice-bar">
          <text class="notice-avatar">●</text>
          <text class="notice-text">18分钟前用户下单 · 金牌陪已接单</text>
          <text class="notice-arrow">›</text>
        </view>

        <view class="section-head">
          <view>
            <text>已入驻陪玩</text>
            <text>精选在线阵容</text>
          </view>
          <button @tap="goPlayerList">全部陪玩 ›</button>
        </view>
        <scroll-view v-if="featuredPlayers.length" scroll-x class="player-showcase" show-scrollbar="false">
          <view v-for="player in featuredPlayers" :key="player.id" class="show-player">
            <image v-if="player.avatar_url" class="show-photo" :src="player.avatar_url" mode="aspectFill" />
            <view v-else class="show-photo show-photo--placeholder">{{ playerInitial(player) }}</view>
            <view class="player-status" :class="{ off: !player.is_online }">
              {{ player.is_online ? '在线' : '离线' }}
            </view>
            <view class="show-name">{{ player.name }}</view>
            <view class="show-type">{{ player.type_name || '优质陪玩' }}</view>
            <view class="show-meta">
              <text>★ {{ player.avg_rating || '5.0' }}</text>
              <text v-if="player.price_extra">+¥{{ player.price_extra }}/时</text>
              <text v-else>可指定</text>
            </view>
          </view>
        </scroll-view>
        <view v-else class="player-showcase-empty">暂无已入驻陪玩</view>

        <view class="section-head package-head">
          <view>
            <text>热门套餐</text>
            <text>高频选择，快速开局</text>
          </view>
          <button @tap="goShopCategory">更多套餐 ›</button>
        </view>
        <view class="hot-packages">
          <view
            v-for="(pkg, index) in hotPackages"
            :key="pkg.id"
            class="hot-package"
            @tap="goShopDetail(pkg.id)"
          >
            <image class="package-bg" :src="packageImageFor(index)" mode="aspectFill" />
            <view class="package-shade"></view>
            <view class="hot-copy">
              <text>{{ pkg.name }}</text>
              <text>{{ getPackagePlayerCount(pkg) }}位陪玩 · {{ pkg.description || '适合深夜车队' }}</text>
            </view>
            <view class="hot-price">
              <text>¥{{ formatMoney(getPackageBasePrice(pkg)) }}</text>
              <text>/时/人</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <MainBottomTabs active="home" @select="handleMainTabSelect" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getPackages, getPlayerList, type BossPackage, type OnlinePlayer } from '@/api/boss'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import { go, goMain, navigateToTab, type MainTab } from '@/utils/nav'
import { getClientProfile } from '@/utils/client'

const assetBase = '/images/home-redesign'
const homeHero = `${assetBase}/hero-lounge.jpg`
const packageVisuals = [`${assetBase}/package-five.png`, `${assetBase}/package-six.png`]
const fallbackPackages: BossPackage[] = [
  { id: 1001, name: '四套四弹', player_count: 4, base_price: 15, description: '默认四人套餐', is_custom: false, group_id: 1, group_name: '默认推荐' },
  { id: 1002, name: '五套四弹', player_count: 5, base_price: 20, description: '默认五人套餐', is_custom: false, group_id: 1, group_name: '默认推荐' }
]

const statusBarHeight = ref(20)
const packages = ref<BossPackage[]>([...fallbackPackages])
const players = ref<OnlinePlayer[]>([])
const hotPackages = computed(() => (packages.value.length ? packages.value : fallbackPackages).slice(0, 2))
const featuredPlayers = computed(() => players.value.slice(0, 6))

function toSafeNumber(value: unknown, fallback: number) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function getPackagePlayerCount(pkg: BossPackage | null | undefined) {
  return Math.max(1, toSafeNumber(pkg?.player_count, 1))
}

function getPackageBasePrice(pkg: BossPackage | null | undefined) {
  const item = pkg as BossPackage & Record<string, any> | null | undefined
  return Math.max(0, toSafeNumber(item?.price ?? item?.base_price, 0))
}

function formatMoney(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

function packageImageFor(index: number) {
  return packageVisuals[index % packageVisuals.length]
}

function normalizeOnlineValue(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function normalizePlayer(player: OnlinePlayer): OnlinePlayer {
  const isOnline = normalizeOnlineValue(player.is_online)
  return {
    ...player,
    is_online: isOnline,
    type_name: player.player_type?.name || player.type_name || '优质陪玩',
    price_extra: player.player_type?.price_extra || player.price_extra || 0,
    status: isOnline ? '在线' : '离线'
  }
}

function playerInitial(player: OnlinePlayer) {
  return (player.name || player.type_name || '陪').trim().slice(0, 1)
}

function goShopCategory() {
  go('/pages/shop/category/index')
}

function goShopDetail(packageId: number) {
  go('/pages/shop/detail/index', { packageId })
}

function goQuery() {
  goMain('query')
}

function goPlayerList() {
  goMain('players')
}

function goProfile() {
  if (!getClientProfile()) {
    go('/pages/client/login/index')
    return
  }
  goMain('profile')
}

function handleMainTabSelect(tab: MainTab) {
  if (tab === 'home') return
  if (tab === 'order') {
    goShopCategory()
    return
  }
  if (tab === 'query' || tab === 'players' || tab === 'profile') {
    navigateToTab(tab)
  }
}

async function fetchHomeData() {
  try {
    const list = await getPackages()
    packages.value = list.length ? list : fallbackPackages
  } catch {
    packages.value = fallbackPackages
  }
  try {
    const list = await getPlayerList()
    players.value = (list || []).map(normalizePlayer)
  } catch {
    players.value = []
  }
}

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
  } catch (_error) {
    statusBarHeight.value = 20
  }
})

onShow(fetchHomeData)
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';

.home-page {
  min-height: 100vh;
  padding-bottom: calc(150rpx + env(safe-area-inset-bottom));
  background:
    radial-gradient(ellipse at 12% 0%, rgba(47, 155, 99, 0.12), transparent 38%),
    radial-gradient(ellipse at 88% 16%, rgba(216, 161, 68, 0.10), transparent 32%),
    linear-gradient(180deg, #f7f3ea 0%, #faf8f2 48%, #fffaf2 100%);
  box-sizing: border-box;
}

.custom-navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 28rpx;
  background: #fbf7ef;
  box-sizing: border-box;
}

.nav-brand {
  color: #172116;
  font-size: 34rpx;
  font-weight: 900;
}

.nav-right {
  width: 104rpx;
  height: 54rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  color: #172116;
  background: rgba(255, 255, 255, 0.82);
}

.home-scroll {
  height: calc(100vh - 88rpx - env(safe-area-inset-bottom));
}

.landing {
  padding: 0 24rpx 40rpx;
}

.hero-poster {
  position: relative;
  height: 330rpx;
  overflow: hidden;
  border-radius: 26rpx;
  box-shadow: 0 22rpx 46rpx rgba(31, 55, 40, 0.12);
}

.hero-bg,
.hero-glass {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hero-glass {
  background: linear-gradient(180deg, rgba(251, 247, 239, 0.30), rgba(251, 247, 239, 0.82));
  backdrop-filter: blur(2rpx);
}

.hero-copy {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 34rpx;
  text-align: center;
  box-sizing: border-box;
}

.hero-title {
  color: #0f3f25;
  font-size: 48rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.hero-sub {
  margin-top: 10rpx;
  color: rgba(23, 33, 22, 0.70);
  font-size: 27rpx;
}

.hero-actions {
  display: flex;
  gap: 28rpx;
  margin-top: 34rpx;
}

.hero-btn {
  min-width: 210rpx;
  height: 74rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 0 30rpx;
  margin: 0;
  border-radius: 999rpx;
  font-size: 29rpx;
  font-weight: 900;
}

.hero-btn::after {
  border: none;
}

.hero-btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #2f9b63, #1f7c4b);
}

.hero-btn--light {
  color: #9d6f2f;
  background: rgba(255, 255, 255, 0.90);
}

.hero-dots {
  display: flex;
  gap: 18rpx;
  margin-top: 24rpx;
}

.hero-dots text {
  width: 40rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.70);
}

.hero-dots text:first-child {
  background: #2f9b63;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18rpx;
  margin-top: 22rpx;
}

.quick-card {
  display: flex;
  align-items: center;
  gap: 18rpx;
  min-height: 116rpx;
  padding: 18rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 12rpx 30rpx rgba(31, 55, 40, 0.06);
  box-sizing: border-box;
}

.quick-icon {
  width: 58rpx;
  height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  color: #1f7c4b;
  font-weight: 900;
  background: #f5f0df;
}

.quick-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.quick-main text:first-child {
  color: #222;
  font-size: 29rpx;
  font-weight: 900;
}

.quick-main text:last-child {
  color: #777;
  font-size: 23rpx;
}

.quick-arrow,
.notice-arrow {
  color: #ad7a35;
  font-size: 36rpx;
}

.notice-bar {
  display: flex;
  align-items: center;
  gap: 18rpx;
  min-height: 78rpx;
  padding: 0 24rpx;
  margin-top: 22rpx;
  border-radius: 18rpx;
  border: 1rpx solid rgba(173, 122, 53, 0.20);
  background: rgba(255, 255, 255, 0.72);
  box-sizing: border-box;
}

.notice-avatar {
  color: #2f9b63;
  font-size: 22rpx;
}

.notice-text {
  flex: 1;
  color: #666;
  font-size: 26rpx;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 30rpx;
  margin-bottom: 16rpx;
}

.section-head > view {
  display: flex;
  align-items: baseline;
  gap: 14rpx;
}

.section-head text:first-child {
  color: #171717;
  font-size: 34rpx;
  font-weight: 900;
}

.section-head text:last-child {
  color: #8d8a80;
  font-size: 23rpx;
}

.section-head button {
  padding: 0;
  margin: 0;
  color: #3d614a;
  font-size: 24rpx;
  background: transparent;
}

.section-head button::after {
  border: none;
}

.player-showcase {
  white-space: nowrap;
}

.show-player {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  justify-content: flex-end;
  width: 190rpx;
  height: 250rpx;
  padding: 18rpx;
  margin-right: 16rpx;
  overflow: hidden;
  border-radius: 18rpx;
  color: #fff;
  background: linear-gradient(180deg, #dceee5, #165d38);
  box-sizing: border-box;
}

.show-photo {
  position: absolute;
  left: 50%;
  top: 48rpx;
  width: 90rpx;
  height: 90rpx;
  transform: translateX(-50%);
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.72);
}

.show-photo--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 40rpx;
  font-weight: 900;
  background: #35a86c;
}

.player-status {
  position: absolute;
  right: 16rpx;
  top: 16rpx;
  color: #23683f;
  font-size: 21rpx;
  font-weight: 900;
}

.player-status.off {
  color: #6b7b70;
}

.show-name,
.show-type,
.show-meta {
  position: relative;
  z-index: 2;
}

.show-name {
  color: #fff;
  font-size: 28rpx;
  font-weight: 900;
}

.show-type {
  margin-top: 6rpx;
  color: rgba(255, 255, 255, 0.74);
  font-size: 22rpx;
}

.show-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 16rpx;
  color: #fff8c9;
  font-size: 23rpx;
  font-weight: 900;
}

.player-showcase-empty {
  padding: 50rpx 20rpx;
  border-radius: 18rpx;
  color: #888;
  font-size: 26rpx;
  text-align: center;
  background: rgba(255, 255, 255, 0.72);
}

.hot-packages {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18rpx;
}

.hot-package {
  position: relative;
  min-height: 150rpx;
  overflow: hidden;
  border-radius: 16rpx;
  background: #123b28;
}

.package-bg,
.package-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.package-shade {
  background: linear-gradient(90deg, rgba(8, 46, 30, 0.94), rgba(8, 46, 30, 0.66));
}

.hot-copy,
.hot-price {
  position: relative;
  z-index: 2;
}

.hot-copy {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 28rpx 22rpx 0;
}

.hot-copy text:first-child {
  color: #fff;
  font-size: 30rpx;
  font-weight: 900;
}

.hot-copy text:last-child {
  color: rgba(255, 255, 255, 0.70);
  font-size: 22rpx;
}

.hot-price {
  position: absolute;
  right: 20rpx;
  bottom: 18rpx;
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  color: #ffcf66;
}

.hot-price text:first-child {
  font-size: 36rpx;
  font-weight: 900;
}

.hot-price text:last-child {
  font-size: 21rpx;
}
</style>
