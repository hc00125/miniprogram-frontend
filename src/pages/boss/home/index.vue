<template>
  <view class="club-page home-page">
    <scroll-view scroll-y class="home-scroll">
      <view class="landing">
        <view class="hero-section">
          <swiper class="hero-swiper" circular autoplay interval="4200" duration="480" @change="handleHeroChange">
            <swiper-item v-for="banner in heroBanners" :key="banner.id">
              <view class="hero-slide" @tap="handleHeroBannerTap(banner.target)">
                <image class="hero-slide__image" :src="banner.image" :mode="banner.target === 'shop' ? 'aspectFill' : 'aspectFit'" @error="handleHeroImageError(banner)" />
              </view>
            </swiper-item>
          </swiper>
          <view class="hero-meta"><view class="hero-dots"><text v-for="(banner, index) in heroBanners" :key="banner.id" :class="{ active: currentHeroIndex === index }"></text></view></view>
        </view>

        <view class="action-card-row">
          <view class="action-card" @tap="goShopCategory"><view class="action-icon"><image class="action-icon-image" :src="uiIcons.order" mode="aspectFit" /></view><view class="action-main"><text>点单大厅</text><text>快速下单\n找到心仪陪玩</text></view><image class="action-arrow" :src="uiIcons.chevron" mode="aspectFit" /></view>
          <view class="action-card" @tap="goQuery"><view class="action-icon"><image class="action-icon-image" :src="uiIcons.query" mode="aspectFit" /></view><view class="action-main"><text>订单进度</text><text>实时追踪\n订单状态</text></view><image class="action-arrow" :src="uiIcons.chevron" mode="aspectFit" /></view>
        </view>

        <view class="order-notice-banner" @tap="goOrderNotice"><image class="order-notice-image" :src="orderNoticeBannerUrl" mode="widthFix" /></view>

        <view class="section-head"><view><text>已入驻陪玩</text><text>精选在线阵容</text></view><button @tap="goPlayerList">全部陪玩 ›</button></view>
        <scroll-view v-if="featuredPlayers.length" scroll-x class="player-showcase" show-scrollbar="false">
          <view v-for="player in featuredPlayers" :key="player.id" class="player-mini-card">
            <image class="player-mini-avatar" :src="player.avatar_url" mode="aspectFill" />
            <view class="player-mini-main"><view class="player-mini-name-row"><text class="player-mini-name">{{ player.name }}</text><text class="player-mini-badge">TC</text></view><view class="player-mini-type">{{ player.type_name || '优质陪玩' }}</view><view class="player-mini-status" :class="{ off: !player.is_online }"><text></text>{{ player.is_online ? '在线' : '离线' }}</view></view>
          </view>
        </scroll-view>
        <view v-else class="player-showcase-empty">暂无已上传头像的陪玩</view>

        <view class="section-head package-head"><view><text>热门套餐</text><text>高频选择，快速开局</text></view><button @tap="goShopCategory">更多套餐 ›</button></view>
        <view v-if="hotPackages.length" class="hot-packages">
          <view v-for="pkg in hotPackages" :key="pkg.id" class="hot-package" @tap="goShopDetail(pkg.id)">
            <view class="package-media"><image v-if="pkg.cover_url && failedPackageCovers[pkg.id] !== pkg.cover_url" class="package-bg" :src="pkg.cover_url" mode="aspectFit" @error="failedPackageCovers[pkg.id] = pkg.cover_url" /></view>
            <view class="hot-copy"><text>{{ pkg.name }}</text></view>
            <view class="hot-price"><text>💎{{ packageDiamonds(pkg) }}</text><text>/时/人</text></view>
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
import { onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app'
import { getPackages, getPlayerList, type BossPackage, type OnlinePlayer } from '@/api/boss'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import { uiIcons } from '@/utils/uiIcons'
import { go, goMain, navigateToTab, type MainTab } from '@/utils/nav'
import { getClientProfile } from '@/utils/client'
import { diamondsFrom, formatDiamonds } from '@/utils/diamonds'
import { toast } from '@/utils/feedback'

type HeroTarget = 'shop' | number
type HeroBanner = { id: string; image: string; target: HeroTarget }

const homeHero = 'https://api.huc125.cn/media/banners/hero-lounge.jpg'
const orderNoticeBannerUrl = 'https://api.huc125.cn/media/order-notice/order-guide-banner.jpg'
// 仅选现有五套四弹/六套五弹单人商品，图片和点击始终来自同一商品。
// API 失败或商品不再返回时不回退到本地占位商品/海报。
const heroBanners = computed<HeroBanner[]>(() => [
  { id: 'lounge', image: homeHero, target: 'shop' },
  ...[16, 22].flatMap(id => {
    const pkg = packages.value.find(item => item.id === id)
    return pkg?.cover_url?.trim() && failedPackageCovers.value[id] !== pkg.cover_url
      ? [{ id: `package-${id}`, image: pkg.cover_url, target: id }]
      : []
  })
])

onShareAppMessage(() => ({ title: '偷吃电竞｜专业游戏陪练服务', path: '/pages/boss/home/index', imageUrl: homeHero }))
onShareTimeline(() => ({ title: '偷吃电竞｜专业游戏陪练服务', query: '', imageUrl: homeHero }))

const currentHeroIndex = ref(0)
const packages = ref<BossPackage[]>([])
const failedPackageCovers = ref<Record<number, string>>({})
const players = ref<OnlinePlayer[]>([])
// 首页推荐单独排除已确认海报 404 的 ID 11；不影响目录、排序或可购买状态。
// 图片运行时失败后继续按 API 原顺序补位，URL 更新后可重新展示。
const hotPackages = computed(() => packages.value.filter(pkg => pkg.id !== 11 && Boolean(pkg.cover_url?.trim()) && failedPackageCovers.value[pkg.id] !== pkg.cover_url).slice(0, 2))
const featuredPlayers = computed(() => players.value.filter(hasUserAvatar).slice(0, 6))

function hasUserAvatar(player: OnlinePlayer) { return Boolean(String(player.avatar_url || '').trim()) }
function toSafeNumber(value: unknown, fallback: number) { const numberValue = Number(value); return Number.isFinite(numberValue) ? numberValue : fallback }
function getPackageBasePrice(pkg: BossPackage | null | undefined) { const item = pkg as (BossPackage & Record<string, unknown>) | null | undefined; const price = item ? item.price : undefined; const basePrice = item ? item.base_price : undefined; return Math.max(0, toSafeNumber(price !== undefined ? price : (basePrice !== undefined ? basePrice : 0), 0)) }
function packageDiamonds(pkg: BossPackage) { const raw = pkg as BossPackage & Record<string, unknown>; try { return formatDiamonds(diamondsFrom(raw.base_price_diamonds ?? raw.price_diamonds, getPackageBasePrice(pkg))) } catch { return '--' } }
function normalizeOnlineValue(value: unknown) { return value === true || value === 1 || value === '1' || value === 'true' }
function normalizePlayer(player: OnlinePlayer): OnlinePlayer { const isOnline = normalizeOnlineValue(player.is_online); return { ...player, is_online: isOnline, type_name: player.player_type?.name || player.type_name || '优质陪玩', price_extra: player.player_type?.price_extra || player.price_extra || 0, status: isOnline ? '在线' : '离线' } }
function goShopCategory() { go('/pages/shop/category/index') }
function goShopDetail(packageId: number) { go('/pages/shop/detail/index', { packageId }) }
function goOrderNotice() { go('/pages/boss/order-notice/index') }
function goQuery() { goMain('query') }
function goPlayerList() { goMain('players') }
function goProfile() { if (!getClientProfile()) { go('/pages/client/login/index'); return } goMain('profile') }
function handleHeroChange(event: { detail?: { current?: number } }) { currentHeroIndex.value = event.detail?.current || 0 }
function handleHeroImageError(banner: HeroBanner) { if (typeof banner.target === 'number') failedPackageCovers.value[banner.target] = banner.image }
function handleHeroBannerTap(target: HeroTarget) { if (typeof target === 'number') return goShopDetail(target); goShopCategory() }
function handleMainTabSelect(tab: MainTab) { if (tab === 'home') return; if (tab === 'order') return goShopCategory(); if (tab === 'query' || tab === 'players' || tab === 'profile') navigateToTab(tab) }
async function fetchHomeData() { try { packages.value = await getPackages() } catch { packages.value = []; toast('套餐加载失败，请稍后重试') } try { players.value = (await getPlayerList() || []).map(normalizePlayer) } catch { players.value = [] } }
onShow(fetchHomeData)
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';
.home-page{min-height:100vh;padding-bottom:calc(150rpx + env(safe-area-inset-bottom));background:radial-gradient(ellipse at 12% 0%,rgba(47,155,99,.12),transparent 38%),radial-gradient(ellipse at 88% 16%,rgba(216,161,68,.10),transparent 32%),linear-gradient(180deg,#f7f3ea 0%,#faf8f2 48%,#fffaf2 100%);box-sizing:border-box}.home-scroll{height:100vh}.landing{padding:16rpx 24rpx 40rpx}.hero-section{margin-top:6rpx}.hero-swiper{height:332rpx}.hero-slide{position:relative;height:100%;overflow:hidden;border-radius:28rpx;background:#15261b}.hero-slide__image{position:absolute;inset:0;width:100%;height:100%}.hero-meta{display:flex;align-items:center;justify-content:center;margin-top:14rpx;padding:0 6rpx}.hero-dots{display:flex;gap:10rpx}.hero-dots text{width:22rpx;height:6rpx;border-radius:999rpx;background:rgba(47,155,99,.18)}.hero-dots text.active{width:40rpx;background:#2f9b63}.action-card-row{display:grid;grid-template-columns:repeat(2,1fr);gap:18rpx;margin-top:24rpx}.action-card{min-height:138rpx;display:flex;align-items:center;gap:18rpx;padding:22rpx 20rpx;border-radius:20rpx;background:rgba(255,255,255,.86);border:1rpx solid rgba(61,97,74,.10);box-shadow:0 12rpx 30rpx rgba(31,55,40,.06);box-sizing:border-box}.action-icon{width:74rpx;height:74rpx;flex-shrink:0;display:flex;align-items:center;justify-content:center}.action-icon-image{width:52rpx;height:52rpx;display:block}.action-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:8rpx}.action-main text:first-child{font-size:30rpx;font-weight:900}.action-main text:last-child{color:#858575;font-size:22rpx;line-height:1.35;white-space:pre-line}.action-arrow{width:20rpx;height:20rpx;flex-shrink:0}.order-notice-banner{overflow:hidden;margin-top:18rpx;border-radius:26rpx;background:#fffaf0;box-shadow:0 14rpx 30rpx rgba(35,42,30,.08)}.order-notice-image{width:100%;display:block}.section-head{display:flex;align-items:flex-end;justify-content:space-between;margin-top:30rpx;margin-bottom:16rpx}.section-head>view{display:flex;align-items:baseline;gap:14rpx}.section-head text:first-child{font-size:34rpx;font-weight:900}.section-head text:last-child{color:#8d8a80;font-size:23rpx}.section-head button{padding:0;margin:0;color:#3d614a;font-size:24rpx;background:transparent}.section-head button::after{border:none}.player-showcase{white-space:nowrap}.player-mini-card{display:inline-flex;align-items:center;gap:14rpx;width:236rpx;min-height:104rpx;padding:16rpx;margin-right:14rpx;border-radius:18rpx;background:rgba(255,255,255,.90);border:1rpx solid rgba(61,97,74,.10);vertical-align:top}.player-mini-avatar{width:64rpx;height:64rpx;flex-shrink:0;border-radius:50%}.player-mini-main{flex:1;min-width:0}.player-mini-name-row{display:flex;align-items:center;gap:8rpx}.player-mini-name{max-width:106rpx;font-size:25rpx;font-weight:900;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.player-mini-badge{padding:2rpx 7rpx;border-radius:5rpx;color:#5d704d;font-size:18rpx;background:#eef5e7}.player-mini-type{margin-top:6rpx;color:#555;font-size:21rpx}.player-mini-status{display:flex;align-items:center;gap:6rpx;margin-top:6rpx;color:#2f9b63;font-size:21rpx;font-weight:800}.player-mini-status text{width:9rpx;height:9rpx;border-radius:50%;background:#2f9b63}.player-mini-status.off{color:#999}.player-mini-status.off text{background:#bbb}.player-showcase-empty{padding:50rpx 20rpx;border-radius:18rpx;color:#888;font-size:26rpx;text-align:center;background:rgba(255,255,255,.72)}.hot-packages{display:grid;grid-template-columns:repeat(2,1fr);gap:18rpx}.hot-package{overflow:hidden;border-radius:16rpx;background:#fff}.package-media{height:320rpx;background:#f3f2ef}.package-bg{display:block;width:100%;height:100%}.hot-copy{padding:18rpx 20rpx 0}.hot-copy text{color:#262626;font-size:28rpx;font-weight:900}.hot-price{display:flex;align-items:baseline;gap:4rpx;padding:12rpx 20rpx 20rpx;color:#91651d}.hot-price text:first-child{font-size:36rpx;font-weight:900}.hot-price text:last-child{font-size:21rpx}
</style>
