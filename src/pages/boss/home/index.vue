<template>
  <view class="club-page home-page">
    <scroll-view scroll-y class="home-scroll">
      <view class="landing">
        <view class="hero-section">
          <swiper class="hero-swiper" circular autoplay interval="4200" duration="480" @change="handleHeroChange">
            <swiper-item v-for="banner in heroBanners" :key="banner.id">
              <view class="hero-slide" @tap="handleHeroBannerTap(banner.target)"><image class="hero-slide__image" :src="banner.image" mode="aspectFill" /></view>
            </swiper-item>
          </swiper>
          <view class="hero-dots"><text v-for="(banner, index) in heroBanners" :key="banner.id" :class="{ active: currentHeroIndex === index }"></text></view>
        </view>

        <view class="action-card-row">
          <view class="action-card" @tap="goShopCategory"><view class="action-icon">单</view><view class="action-main"><text>点单大厅</text><text>查看当前上架商品与规格</text></view><text>›</text></view>
          <view class="action-card" @tap="goQuery"><view class="action-icon action-icon--query">进</view><view class="action-main"><text>订单进度</text><text>查看接单、支付和服务状态</text></view><text>›</text></view>
        </view>

        <view class="order-notice-banner" @tap="goOrderNotice"><image class="order-notice-image" :src="orderNoticeBannerUrl" mode="widthFix" /></view>

        <view class="section-head"><view><text>已入驻陪玩</text><text>展示已上传头像的陪玩师</text></view><button @tap="goPlayerList">全部陪玩 ›</button></view>
        <scroll-view v-if="featuredPlayers.length" scroll-x class="player-showcase" show-scrollbar="false">
          <view v-for="player in featuredPlayers" :key="player.id" class="player-mini-card" @tap="goPlayerDetail(player.id)">
            <image class="player-mini-avatar" :src="player.avatar_url" mode="aspectFill" />
            <view class="player-mini-main"><view class="player-mini-name-row"><text>{{ player.name }}</text><text>TC</text></view><text class="player-mini-type">{{ player.type_name || '陪玩师' }}</text><text class="player-mini-status" :class="{ off: !player.is_online }">{{ player.is_online ? '在线' : '离线' }}</text></view>
          </view>
        </scroll-view>
        <view v-else class="empty-box">{{ playerLoadFailed ? '陪玩列表加载失败，请稍后刷新' : '暂无已上传头像的陪玩' }}</view>

        <view class="section-head"><view><text>热门套餐</text><text>价格与计价方式以后端当前配置为准</text></view><button @tap="goShopCategory">更多套餐 ›</button></view>
        <view v-if="hotPackages.length" class="hot-packages">
          <view v-for="pkg in hotPackages" :key="pkg.id" class="hot-package" @tap="goShopDetail(pkg.id)">
            <image v-if="productImage(pkg)" class="package-bg" :src="productImage(pkg)" mode="aspectFill" />
            <view v-else class="package-bg package-placeholder">{{ pkg.name.slice(0, 1) }}</view>
            <view class="package-shade"></view>
            <view class="hot-copy"><text>{{ pkg.name }}</text><text>{{ pkg.description || '查看商品详情与可选规格' }}</text></view>
            <view class="hot-price"><text>{{ pkg.specs?.length > 1 ? '起 ' : '' }}¥{{ formatMoney(getPackageDisplayPrice(pkg)) }}</text><text>{{ getPackagePriceUnit(pkg) }}</text></view>
          </view>
        </view>
        <view v-else class="empty-box">{{ packageLoadFailed ? '商品加载失败，请进入点单页重试' : '暂无上架套餐' }}</view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPackages, getPlayerList, type BossPackage, type OnlinePlayer } from '@/api/boss'
import { go, goMain } from '@/utils/nav'
import { toast } from '@/utils/feedback'

type HeroTarget = 'shop' | 'query' | 'players' | 'notice'
type HeroBanner = { id: string; image: string; target: HeroTarget }

const assetBase = '/images/home-redesign'
const orderNoticeBannerUrl = 'https://api.huc125.cn/media/order-notice/order-guide-banner.jpg'
const heroBanners: HeroBanner[] = [
  { id: 'lounge', image: 'https://api.huc125.cn/media/banners/hero-lounge.jpg', target: 'shop' },
  { id: 'package', image: `${assetBase}/package-five.png`, target: 'shop' },
  { id: 'orders', image: `${assetBase}/package-six.png`, target: 'query' }
]

const currentHeroIndex = ref(0)
const packages = ref<BossPackage[]>([])
const players = ref<OnlinePlayer[]>([])
const packageLoadFailed = ref(false)
const playerLoadFailed = ref(false)
const hotPackages = computed(() => packages.value.slice(0, 4))
const featuredPlayers = computed(() => players.value.filter(player => Boolean(String(player.avatar_url || '').trim())).slice(0, 6))

function normalizeOnlineValue(value: unknown) { return value === true || value === 1 || value === '1' || value === 'true' }
function normalizePlayer(player: OnlinePlayer): OnlinePlayer {
  const isOnline = normalizeOnlineValue(player.is_online)
  return { ...player, is_online: isOnline, type_name: player.player_type?.name || player.type_name || '陪玩师', status: isOnline ? '在线' : '离线' }
}
function productImage(pkg: BossPackage) { const item = pkg as BossPackage & Record<string, any>; return item.cover_url || item.image_url || item.thumb_url || item.picture_url || '' }
function getPackageDisplayPrice(pkg: BossPackage) {
  const prices = (pkg.specs || []).map(spec => Number(spec.price || 0)).filter(value => Number.isFinite(value) && value >= 0)
  if (prices.length) return Math.min(...prices)
  const item = pkg as BossPackage & Record<string, any>
  return Math.max(0, Number(item.price ?? item.base_price ?? 0))
}
function getPackagePriceUnit(pkg: BossPackage) { return pkg.specs?.length || pkg.product_type === 'guarantee' || pkg.product_type === 'escort' ? '/单' : '/时/人' }
function formatMoney(value: number) { return Number.isInteger(value) ? `${value}` : Number(value || 0).toFixed(2) }
function handleHeroChange(event: { detail?: { current?: number } }) { currentHeroIndex.value = event.detail?.current || 0 }
function handleHeroBannerTap(target: HeroTarget) { if (target === 'query') return goMain('query'); if (target === 'players') return goMain('players'); if (target === 'notice') return goOrderNotice(); goShopCategory() }
function goShopCategory() { goMain('order') }
function goShopDetail(packageId: number) { go('/pages/shop/detail/index', { packageId }) }
function goOrderNotice() { go('/pages/boss/order-notice/index') }
function goQuery() { goMain('query') }
function goPlayerList() { goMain('players') }
function goPlayerDetail(playerId: number) { go('/pages/player/detail/index', { playerId }) }

async function fetchHomeData() {
  packageLoadFailed.value = false
  playerLoadFailed.value = false
  try { packages.value = await getPackages() } catch (error) { packages.value = []; packageLoadFailed.value = true; toast('商品加载失败') }
  try { players.value = (await getPlayerList()).map(normalizePlayer) } catch { players.value = []; playerLoadFailed.value = true }
}
onShow(fetchHomeData)
</script>

<style lang="scss" scoped>
.home-page{min-height:100vh;padding-bottom:calc(120rpx + env(safe-area-inset-bottom));background:linear-gradient(180deg,#f7f3ea,#fffaf2);box-sizing:border-box}.home-scroll{height:100vh}.landing{padding:16rpx 24rpx 42rpx}.hero-section{position:relative}.hero-swiper{height:332rpx}.hero-slide{height:100%;overflow:hidden;border-radius:28rpx;background:#173426}.hero-slide__image{width:100%;height:100%}.hero-dots{position:absolute;left:0;right:0;bottom:14rpx;display:flex;justify-content:center;gap:8rpx}.hero-dots text{width:12rpx;height:12rpx;border-radius:50%;background:rgba(255,255,255,.5)}.hero-dots text.active{width:34rpx;border-radius:999rpx;background:#fff}.action-card-row{display:grid;grid-template-columns:1fr 1fr;gap:16rpx;margin-top:20rpx}.action-card{display:flex;align-items:center;gap:14rpx;padding:22rpx;border-radius:24rpx;background:#fff;box-shadow:0 10rpx 26rpx rgba(39,61,42,.07)}.action-icon{width:62rpx;height:62rpx;display:flex;align-items:center;justify-content:center;border-radius:18rpx;color:#fff;font-weight:900;background:#1f7c4b}.action-icon--query{background:#a87520}.action-main{flex:1;min-width:0}.action-main text{display:block}.action-main text:first-child{font-size:27rpx;font-weight:900}.action-main text:last-child{margin-top:5rpx;color:#7d877a;font-size:19rpx;line-height:1.4}.action-card>text{font-size:34rpx;color:#aaa}.order-notice-banner{margin-top:20rpx;overflow:hidden;border-radius:24rpx;background:#fff}.order-notice-image{width:100%;display:block}.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16rpx;margin:30rpx 0 16rpx}.section-head>view text{display:block}.section-head>view text:first-child{font-size:32rpx;font-weight:900}.section-head>view text:last-child{margin-top:5rpx;color:#7d877a;font-size:21rpx}.section-head button{margin:0;padding:0;color:#1f7c4b;font-size:22rpx;font-weight:900;background:transparent}.section-head button::after{border:none}.player-showcase{white-space:nowrap}.player-mini-card{width:280rpx;display:inline-flex;align-items:center;gap:14rpx;margin-right:14rpx;padding:18rpx;border-radius:22rpx;background:#fff;box-sizing:border-box}.player-mini-avatar{width:82rpx;height:82rpx;flex-shrink:0;border-radius:22rpx}.player-mini-main{min-width:0;flex:1}.player-mini-name-row{display:flex;align-items:center;gap:8rpx}.player-mini-name-row text:first-child{max-width:130rpx;overflow:hidden;text-overflow:ellipsis;font-size:25rpx;font-weight:900}.player-mini-name-row text:last-child{color:#a87520;font-size:18rpx}.player-mini-type{display:block;margin-top:5rpx;color:#687665;font-size:20rpx}.player-mini-status{display:block;margin-top:6rpx;color:#1f7c4b;font-size:19rpx}.player-mini-status.off{color:#999}.hot-packages{display:flex;flex-direction:column;gap:16rpx}.hot-package{position:relative;height:250rpx;overflow:hidden;border-radius:26rpx;background:#173426}.package-bg{position:absolute;inset:0;width:100%;height:100%}.package-placeholder{display:flex;align-items:center;justify-content:center;color:#fff;font-size:76rpx;font-weight:900;background:linear-gradient(135deg,#173426,#1f7c4b)}.package-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.08))}.hot-copy{position:absolute;left:24rpx;right:180rpx;bottom:24rpx;color:#fff}.hot-copy text{display:block}.hot-copy text:first-child{font-size:32rpx;font-weight:900}.hot-copy text:last-child{margin-top:8rpx;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:21rpx;opacity:.78}.hot-price{position:absolute;right:22rpx;bottom:24rpx;color:#fff;text-align:right}.hot-price text{display:block}.hot-price text:first-child{font-size:30rpx;font-weight:900}.hot-price text:last-child{margin-top:5rpx;font-size:20rpx;opacity:.8}.empty-box{padding:46rpx 20rpx;border-radius:22rpx;color:#879083;text-align:center;background:#fff}
</style>
