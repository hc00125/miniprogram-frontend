<template>
  <view class="club-page home-page">
    <scroll-view scroll-y class="home-scroll">
      <view class="landing">
        <view class="hero-section">
          <swiper
            class="hero-swiper"
            circular
            autoplay
            interval="4200"
            duration="480"
            @change="handleHeroChange"
          >
            <swiper-item v-for="banner in heroBanners" :key="banner.id">
              <view class="hero-slide" @tap="handleHeroBannerTap(banner.target)">
                <image class="hero-slide__image" :src="banner.image" mode="aspectFill" />
                <view class="hero-slide__shade"></view>
                <view class="hero-slide__body">
                  <text class="hero-slide__badge">{{ banner.badge }}</text>
                  <view class="hero-slide__copy">
                    <text class="hero-slide__title">{{ banner.title }}</text>
                    <text class="hero-slide__sub">{{ banner.subtitle }}</text>
                  </view>
                  <text class="hero-slide__link">{{ banner.cta }} <text>›</text></text>
                </view>
              </view>
            </swiper-item>
          </swiper>

          <view class="hero-meta">
            <view class="hero-dots">
              <text
                v-for="(banner, index) in heroBanners"
                :key="banner.id"
                :class="{ active: currentHeroIndex === index }"
              ></text>
            </view>
          </view>
        </view>

        <view class="action-card-row">
          <view class="action-card" @tap="goShopCategory">
            <view class="action-icon action-icon--order">单</view>
            <view class="action-main">
              <text>点单大厅</text>
              <text>快速下单\n找到心仪陪玩</text>
            </view>
            <view class="action-arrow">›</view>
          </view>
          <view class="action-card" @tap="goQuery">
            <view class="action-icon action-icon--query">进</view>
            <view class="action-main">
              <text>订单进度</text>
              <text>实时追踪\n订单状态</text>
            </view>
            <view class="action-arrow">›</view>
          </view>
        </view>

        <view class="order-notice-banner" @tap="goOrderNotice">
          <image class="order-notice-image" :src="orderNoticeBannerUrl" mode="widthFix" />
        </view>

        <view class="notice-bar">
          <text class="notice-avatar">●</text>
          <text class="notice-text">18分钟前用户下单，金牌陪已接单</text>
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
          <view v-for="player in featuredPlayers" :key="player.id" class="player-mini-card">
            <image v-if="player.avatar_url" class="player-mini-avatar" :src="player.avatar_url" mode="aspectFill" />
            <view v-else class="player-mini-avatar player-mini-avatar--placeholder">{{ playerInitial(player) }}</view>
            <view class="player-mini-main">
              <view class="player-mini-name-row">
                <text class="player-mini-name">{{ player.name }}</text>
                <text class="player-mini-badge">TC</text>
              </view>
              <view class="player-mini-type">{{ player.type_name || '优质陪玩' }}</view>
              <view class="player-mini-status" :class="{ off: !player.is_online }">
                <text></text>{{ player.is_online ? '在线' : '离线' }}
              </view>
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
        <view v-if="hotPackages.length" class="hot-packages">
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
        <view v-else class="player-showcase-empty">暂无套餐</view>
      </view>
    </scroll-view>

    <MainBottomTabs active="home" @select="handleMainTabSelect" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPackages, getPlayerList, type BossPackage, type OnlinePlayer } from '@/api/boss'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import { go, goMain, navigateToTab, type MainTab } from '@/utils/nav'
import { getClientProfile } from '@/utils/client'
import { toast } from '@/utils/feedback'

type HeroTarget = 'shop' | 'query' | 'players' | 'notice'

type HeroBanner = {
  id: string
  image: string
  badge: string
  title: string
  subtitle: string
  cta: string
  target: HeroTarget
}

const assetBase = '/images/home-redesign'
const homeHero = `${assetBase}/hero-lounge.jpg`
const orderNoticeBannerUrl = 'https://api.huc125.cn/media/order-notice/order-guide-banner.jpg'
const packageVisuals = [`${assetBase}/package-five.png`, `${assetBase}/package-six.png`]
const heroBanners: HeroBanner[] = [
  {
    id: 'lounge',
    image: homeHero,
    badge: '今夜热推',
    title: '今晚开局，不等队友',
    subtitle: '在线陪玩 · 快速接单 · 明星阵容',
    cta: '立即看看',
    target: 'shop'
  },
  {
    id: 'package',
    image: `${assetBase}/package-five.png`,
    badge: '组队优先',
    title: '热门套餐，一滑即到',
    subtitle: '四黑五黑快速包场 · 价格透明',
    cta: '查看套餐',
    target: 'shop'
  },
  {
    id: 'orders',
    image: `${assetBase}/package-six.png`,
    badge: '老板精选',
    title: '订单进度一眼看清',
    subtitle: '下单、接单、进度追踪都在同一入口',
    cta: '去看订单',
    target: 'query'
  }
]
const fallbackPackages: BossPackage[] = [
  { id: 1001, name: '四套四弹', player_count: 4, base_price: 15, description: '默认四人套餐', is_custom: false, group_id: 1, group_name: '默认推荐' },
  { id: 1002, name: '五套五弹', player_count: 5, base_price: 20, description: '默认五人套餐', is_custom: false, group_id: 1, group_name: '默认推荐' }
]

const currentHeroIndex = ref(0)
const packages = ref<BossPackage[]>([])
const players = ref<OnlinePlayer[]>([])
const hotPackages = computed(() => packages.value.slice(0, 2))
const featuredPlayers = computed(() => players.value.slice(0, 6))

function toSafeNumber(value: unknown, fallback: number) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function getPackagePlayerCount(pkg: BossPackage | null | undefined) {
  return Math.max(1, toSafeNumber(pkg?.player_count, 1))
}

function getPackageBasePrice(pkg: BossPackage | null | undefined) {
  const item = pkg as (BossPackage & Record<string, unknown>) | null | undefined
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

function goOrderNotice() {
  go('/pages/boss/order-notice/index')
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

function handleHeroChange(event: { detail?: { current?: number } }) {
  currentHeroIndex.value = event.detail?.current || 0
}

function handleHeroBannerTap(target: HeroTarget) {
  if (target === 'notice') {
    goOrderNotice()
    return
  }
  if (target === 'query') {
    goQuery()
    return
  }
  if (target === 'players') {
    goPlayerList()
    return
  }
  goShopCategory()
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
    packages.value = list
  } catch {
    packages.value = fallbackPackages
    toast('网络异常，当前为默认展示数据')
  }

  try {
    const list = await getPlayerList()
    players.value = (list || []).map(normalizePlayer)
  } catch {
    players.value = []
  }
}

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

.home-scroll { height: 100vh; }
.landing { padding: 16rpx 24rpx 40rpx; }
.hero-section { margin-top: 6rpx; }
.hero-swiper { height: 332rpx; }
.hero-slide { position: relative; height: 100%; overflow: hidden; border-radius: 28rpx; background: #15261b; }
.hero-slide__image, .hero-slide__shade { position: absolute; inset: 0; width: 100%; height: 100%; }
.hero-slide__shade { background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(8, 20, 14, 0.74) 100%), linear-gradient(90deg, rgba(8, 20, 14, 0.05) 0%, rgba(8, 20, 14, 0.56) 100%); }
.hero-slide__body { position: relative; z-index: 2; display: flex; flex-direction: column; justify-content: space-between; height: 100%; padding: 24rpx 24rpx 26rpx; box-sizing: border-box; }
.hero-slide__badge { align-self: flex-start; padding: 10rpx 18rpx; border-radius: 999rpx; color: #fff6d6; font-size: 20rpx; font-weight: 700; background: rgba(11, 20, 16, 0.42); backdrop-filter: blur(12rpx); }
.hero-slide__copy { display: flex; flex-direction: column; gap: 10rpx; max-width: 78%; }
.hero-slide__title { color: #fff; font-size: 40rpx; font-weight: 900; line-height: 1.2; }
.hero-slide__sub { color: rgba(255, 250, 240, 0.84); font-size: 24rpx; line-height: 1.45; }
.hero-slide__link { align-self: flex-start; color: #fff; font-size: 24rpx; font-weight: 700; }
.hero-meta { display: flex; align-items: center; justify-content: center; margin-top: 14rpx; padding: 0 6rpx; }
.hero-dots { display: flex; gap: 10rpx; }
.hero-dots text { width: 22rpx; height: 6rpx; border-radius: 999rpx; background: rgba(47, 155, 99, 0.18); transition: all 0.2s ease; }
.hero-dots text.active { width: 40rpx; background: #2f9b63; }
.action-card-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18rpx; margin-top: 24rpx; }
.action-card { min-height: 138rpx; display: flex; align-items: center; gap: 18rpx; padding: 22rpx 20rpx; border-radius: 20rpx; background: rgba(255, 255, 255, 0.86); border: 1rpx solid rgba(61, 97, 74, 0.10); box-shadow: 0 12rpx 30rpx rgba(31, 55, 40, 0.06); box-sizing: border-box; }
.action-icon { width: 74rpx; height: 74rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; font-size: 31rpx; font-weight: 900; box-shadow: 0 8rpx 18rpx rgba(31, 55, 40, 0.14); }
.action-icon--order { background: linear-gradient(135deg, #2f9b63, #1f7c4b); }
.action-icon--query { background: linear-gradient(135deg, #d8a144, #a87520); }
.action-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.action-main text:first-child { color: #222; font-size: 30rpx; font-weight: 900; line-height: 1.2; }
.action-main text:last-child { color: #858575; font-size: 22rpx; line-height: 1.35; white-space: pre-line; }
.action-arrow { width: 34rpx; height: 34rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #bba16c; font-size: 26rpx; background: #fffaf0; border: 1rpx solid rgba(187, 161, 108, 0.28); }
.order-notice-banner { overflow: hidden; margin-top: 18rpx; border-radius: 26rpx; background: #fffaf0; box-shadow: 0 14rpx 30rpx rgba(35, 42, 30, 0.08); }
.order-notice-image { width: 100%; display: block; }
.notice-bar { display: flex; align-items: center; gap: 18rpx; min-height: 78rpx; padding: 0 24rpx; margin-top: 22rpx; border-radius: 18rpx; border: 1rpx solid rgba(173, 122, 53, 0.20); background: rgba(255, 255, 255, 0.72); box-sizing: border-box; }
.notice-avatar { color: #2f9b63; font-size: 22rpx; }
.notice-text { flex: 1; color: #666; font-size: 26rpx; }
.notice-arrow { color: #ad7a35; font-size: 36rpx; }
.section-head { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 30rpx; margin-bottom: 16rpx; }
.section-head > view { display: flex; align-items: baseline; gap: 14rpx; }
.section-head text:first-child { color: #171717; font-size: 34rpx; font-weight: 900; }
.section-head text:last-child { color: #8d8a80; font-size: 23rpx; }
.section-head button { padding: 0; margin: 0; color: #3d614a; font-size: 24rpx; background: transparent; }
.section-head button::after { border: none; }
.player-showcase { white-space: nowrap; }
.player-mini-card { display: inline-flex; align-items: center; gap: 14rpx; width: 236rpx; min-height: 104rpx; padding: 16rpx; margin-right: 14rpx; border-radius: 18rpx; background: rgba(255, 255, 255, 0.90); border: 1rpx solid rgba(61, 97, 74, 0.10); box-shadow: 0 10rpx 24rpx rgba(31, 55, 40, 0.05); box-sizing: border-box; vertical-align: top; }
.player-mini-avatar { width: 64rpx; height: 64rpx; flex-shrink: 0; border-radius: 50%; background: #f0f0f0; }
.player-mini-avatar--placeholder { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 30rpx; font-weight: 900; background: linear-gradient(135deg, #2f9b63, #1f7c4b); }
.player-mini-main { flex: 1; min-width: 0; }
.player-mini-name-row { display: flex; align-items: center; gap: 8rpx; min-width: 0; }
.player-mini-name { max-width: 106rpx; color: #242424; font-size: 25rpx; font-weight: 900; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.player-mini-badge { flex-shrink: 0; padding: 2rpx 7rpx; border-radius: 5rpx; color: #5d704d; font-size: 18rpx; font-weight: 900; background: #eef5e7; }
.player-mini-type { margin-top: 6rpx; color: #555; font-size: 21rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.player-mini-status { display: flex; align-items: center; gap: 6rpx; margin-top: 6rpx; color: #2f9b63; font-size: 21rpx; font-weight: 800; }
.player-mini-status text { width: 9rpx; height: 9rpx; border-radius: 50%; background: #2f9b63; }
.player-mini-status.off { color: #999; }
.player-mini-status.off text { background: #bbb; }
.player-showcase-empty { padding: 50rpx 20rpx; border-radius: 18rpx; color: #888; font-size: 26rpx; text-align: center; background: rgba(255, 255, 255, 0.72); }
.hot-packages { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18rpx; }
.hot-package { position: relative; min-height: 150rpx; overflow: hidden; border-radius: 16rpx; background: #123b28; }
.package-bg, .package-shade { position: absolute; inset: 0; width: 100%; height: 100%; }
.package-shade { background: linear-gradient(90deg, rgba(8, 46, 30, 0.94), rgba(8, 46, 30, 0.66)); }
.hot-copy, .hot-price { position: relative; z-index: 2; }
.hot-copy { display: flex; flex-direction: column; gap: 8rpx; padding: 28rpx 22rpx 0; }
.hot-copy text:first-child { color: #fff; font-size: 30rpx; font-weight: 900; }
.hot-copy text:last-child { color: rgba(255, 255, 255, 0.70); font-size: 22rpx; }
.hot-price { position: absolute; right: 20rpx; bottom: 18rpx; display: flex; align-items: baseline; gap: 4rpx; color: #ffcf66; }
.hot-price text:first-child { font-size: 36rpx; font-weight: 900; }
.hot-price text:last-child { font-size: 21rpx; }
</style>
