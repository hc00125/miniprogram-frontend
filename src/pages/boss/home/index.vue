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

        <view class="game-section">
          <view class="section-head"><text class="section-title">选择游戏</text><button class="section-link" @tap="goOrderNotice">下单须知 ›</button></view>
          <view v-if="featuredGame" class="game-card" @tap="goFeaturedGame">
            <image v-if="featuredGame.icon_url && !failedGameIcons[featuredGame.id]" class="game-icon" :src="featuredGame.icon_url" mode="aspectFill" @error="failedGameIcons[featuredGame.id] = true" />
            <view v-else class="game-icon game-icon--fallback"><image :src="uiIcons.order" mode="aspectFit" /></view>
            <view class="game-copy"><text class="game-name">{{ featuredGame.name }}</text><text class="game-sub">选择服务，轻松开局</text></view>
            <button class="game-order" @tap.stop="goFeaturedGame">去点单</button>
          </view>
          <view v-else class="section-empty" @tap="fetchHomeData">{{ catalogLoading ? '游戏加载中…' : catalogLoadFailed ? '游戏加载失败，点击重试' : '暂无已上架游戏' }}</view>
          <view class="more-games" @tap="goShopCategory"><text>更多游戏</text><image :src="uiIcons.chevron" mode="aspectFit" /></view>
        </view>

        <view class="wallet-card">
          <view class="wallet-copy">
            <view class="wallet-title"><image :src="uiIcons.diamondLight" mode="aspectFit" /><text>我的钻石</text></view>
            <text v-if="!isLoggedIn" class="wallet-note">登录后查看余额</text>
            <text v-else-if="walletLoadFailed" class="wallet-retry" @tap="loadWallet">加载失败 · 点击重试</text>
            <view v-else class="wallet-balance"><text>{{ walletLoading ? '--' : walletBalance }}</text><text class="wallet-unit">钻石</text></view>
          </view>
          <button class="wallet-recharge" @tap="goRecharge">{{ !isLoggedIn ? '登录查看' : accountRestricted ? '账户受限' : '充值钻石' }}</button>
        </view>

        <view class="players-section">
          <view class="section-head"><text class="section-title">陪玩推荐</text><button class="section-link" @tap="goPlayerList">更多陪玩 ›</button></view>
          <view class="player-filters"><button v-for="type in playerFilters" :key="type" class="player-filter" :class="{ active: activePlayerType === type }" @tap="activePlayerType = type">{{ type }}</button></view>
          <view v-if="featuredPlayers.length" class="player-grid">
            <view v-for="player in featuredPlayers" :key="player.id" class="player-card">
              <view class="player-card-head" @tap="openPlayerDetail(player)">
                <image v-if="!failedAvatars[player.id]" class="player-avatar" :src="player.avatar_url" mode="aspectFill" @error="failedAvatars[player.id] = true" />
                <view v-else class="player-avatar player-avatar--fallback">{{ player.name.slice(0, 1) }}</view>
                <view class="player-copy"><text class="player-name">{{ player.name }}</text><text class="player-type">{{ player.type_name }}</text></view>
              </view>
              <view class="player-meta"><view class="player-status" :class="{ off: !player.presence_online }"><text></text>{{ player.presence_online ? '在线' : '离线' }}</view><text class="player-rating">{{ player.rating_count ? `★ ${player.avg_rating || '0.0'}` : '暂无评分' }}</text></view>
              <GiftHost :recipient-id="player.id" :recipient-name="player.name" />
            </view>
          </view>
          <view v-else class="section-empty" @tap="fetchHomeData">{{ playersLoading ? '陪玩加载中…' : playersLoadFailed ? '陪玩加载失败，点击重试' : '暂无可推荐的陪玩' }}</view>
        </view>
      </view>
    </scroll-view>
    <MainBottomTabs active="home" @select="handleMainTabSelect" />
  </view>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'
import { onHide, onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app'
import { getPackages, getPlayerList, type BossPackage, type OnlinePlayer } from '@/api/boss'
import { getCatalogNavigation, type GameService } from '@/api/catalog'
import { getWalletOverview, type WalletOverview } from '@/api/wallet'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import GiftHost from '@/components/gifts/GiftHost.vue'
import { uiIcons } from '@/utils/uiIcons'
import { go, goMain, navigateToTab, type MainTab } from '@/utils/nav'
import { getClientProfile } from '@/utils/client'
import { getStorage } from '@/utils/storage'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
import { getAccountRestrictionView, showAccountRestrictionModal } from '@/utils/accountRestriction'
import { formatDiamonds } from '@/utils/diamonds'
import { toast } from '@/utils/feedback'

type HeroTarget = 'shop' | number
type HeroBanner = { id: string; image: string; target: HeroTarget }
const homeHero = 'https://api.huc125.cn/media/banners/hero-lounge.jpg'
const currentHeroIndex = ref(0)
const packages = ref<BossPackage[]>([])
const failedPackageCovers = ref<Record<number, string>>({})
// 原有真实商品轮播保留：图片与点击始终绑定同一商品，接口失败不补假商品。
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

const games = ref<GameService[]>([]), catalogLoading = ref(false), catalogLoadFailed = ref(false)
const featuredGame = computed(() => games.value[0] || null)
const failedGameIcons = ref<Record<number, boolean>>({})
const players = ref<OnlinePlayer[]>([]), playersLoading = ref(false), playersLoadFailed = ref(false)
const failedAvatars = ref<Record<number, boolean>>({})
const activePlayerType = ref('全部')
const playerFilters = computed(() => ['全部', ...['技术陪', '娱乐陪'].filter(type => players.value.some(player => player.type_name === type))])
const featuredPlayers = computed(() => players.value.filter(player => hasUserAvatar(player) && (activePlayerType.value === '全部' || player.type_name === activePlayerType.value)).slice(0, 4))
const isLoggedIn = ref(false), accountRestricted = ref(false), walletLoading = ref(false), walletLoadFailed = ref(false)
const walletOverview = ref<WalletOverview | null>(null)
const walletBalance = computed(() => { if (!walletOverview.value) return '--'; try { return formatDiamonds(walletOverview.value.balance_diamonds) } catch { return '--' } })
let visible = true, generation = 0, walletGeneration = 0

function hasUserAvatar(player: OnlinePlayer) { return Boolean(String(player.avatar_url || '').trim()) }
function normalizeOnlineValue(value: unknown) { return value === true || value === 1 || value === '1' || value === 'true' }
function normalizePlayer(player: OnlinePlayer): OnlinePlayer { const isOnline = normalizeOnlineValue(player.is_online); return { ...player, is_online: isOnline, type_name: player.player_type?.name || player.type_name || '优质陪玩', price_extra: player.player_type?.price_extra || player.price_extra || 0, status: isOnline ? '在线' : '离线' } }
function goShopCategory() { go('/pages/shop/category/index') }
function goFeaturedGame() { if (!featuredGame.value) return; uni.setStorageSync('catalog:requested-game-id', featuredGame.value.id); goShopCategory() }
function goShopDetail(packageId: number) { go('/pages/shop/detail/index', { packageId }) }
function goOrderNotice() { go('/pages/boss/order-notice/index') }
function goPlayerList() { goMain('players') }
function openPlayerDetail(player: OnlinePlayer) { if (player.can_be_designated === false) return toast('该陪玩当前不接受指定'); go('/pages/player/detail/index', { playerId: player.id }) }
function goRecharge() {
  if (!getStorage<string>('token')) { clearWallet(); go('/pages/client/login/index'); return }
  const profile = getClientProfile()
  if (getAccountRestrictionView(profile).restricted) { void showAccountRestrictionModal(profile); return }
  go('/pages/client/recharge/index')
}
function handleHeroChange(event: { detail?: { current?: number } }) { currentHeroIndex.value = event.detail?.current || 0 }
function handleHeroImageError(banner: HeroBanner) { if (typeof banner.target === 'number') failedPackageCovers.value[banner.target] = banner.image }
function handleHeroBannerTap(target: HeroTarget) { if (typeof target === 'number') return goShopDetail(target); goShopCategory() }
function handleMainTabSelect(tab: MainTab) { if (tab === 'home') return; if (tab === 'order') return goShopCategory(); if (tab === 'query' || tab === 'players' || tab === 'profile') navigateToTab(tab) }
function clearWallet() { walletGeneration++; isLoggedIn.value = false; accountRestricted.value = false; walletOverview.value = null; walletLoadFailed.value = false; walletLoading.value = false }
function expire(scope: string) { if (scope === 'token') clearWallet() }
async function loadWallet() {
  const ticket = ++walletGeneration, sent = getStorage<string>('token') || ''
  isLoggedIn.value = Boolean(sent); accountRestricted.value = getAccountRestrictionView(getClientProfile()).restricted
  walletOverview.value = null; walletLoadFailed.value = false; walletLoading.value = Boolean(sent)
  if (!sent || !visible) { walletLoading.value = false; return }
  const current = () => visible && ticket === walletGeneration && sent === getStorage<string>('token')
  try { const result = await getWalletOverview(); if (current()) walletOverview.value = result }
  catch { if (current()) walletLoadFailed.value = true }
  finally { if (current()) walletLoading.value = false }
}
async function fetchHomeData() {
  const ticket = ++generation
  catalogLoading.value = true; catalogLoadFailed.value = false; playersLoading.value = true; playersLoadFailed.value = false
  const current = () => visible && ticket === generation
  await Promise.all([
    (async () => { try { const result = await getPackages(); if (current()) packages.value = result } catch { if (current()) packages.value = [] } })(),
    (async () => { try { const result = await getCatalogNavigation(); if (current()) games.value = result.games || [] } catch { if (current()) { games.value = []; catalogLoadFailed.value = true } } finally { if (current()) catalogLoading.value = false } })(),
    (async () => { try { const result = await getPlayerList(); if (current()) { players.value = (result || []).map(normalizePlayer); if (!playerFilters.value.includes(activePlayerType.value)) activePlayerType.value = '全部' } } catch { if (current()) { players.value = []; playersLoadFailed.value = true } } finally { if (current()) playersLoading.value = false } })(),
    loadWallet()
  ])
}
function hide() { visible = false; generation++; clearWallet() }
onShow(() => { visible = true; return fetchHomeData() })
onHide(hide)
uni.$on(SESSION_EXPIRED_EVENT, expire)
onScopeDispose(() => { hide(); uni.$off(SESSION_EXPIRED_EVENT, expire) })
function applyOwnPresence(reply: { player_id: number; presence_online: boolean }) {
  const target = (players.value).find(item => item.id === reply.player_id)
  if (target && reply.presence_online === true) target.presence_online = true
}
uni.$on('player-presence-updated', applyOwnPresence)
onScopeDispose(() => uni.$off('player-presence-updated', applyOwnPresence))
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';
.home-page { min-height: 100vh; background: #f7f5ee; box-sizing: border-box; }
.home-scroll { height: 100vh; }
.landing { padding: 20rpx 24rpx calc(160rpx + env(safe-area-inset-bottom)); }
.hero-section { margin-top: 4rpx; }
.hero-swiper { height: 332rpx; }
.hero-slide { position: relative; height: 100%; overflow: hidden; border-radius: 28rpx; background: #15261b; }
.hero-slide__image { position: absolute; inset: 0; width: 100%; height: 100%; }
.hero-meta { display: flex; justify-content: center; margin-top: 14rpx; }
.hero-dots { display: flex; gap: 10rpx; }
.hero-dots text { display: block; width: 18rpx; height: 6rpx; border-radius: 999rpx; background: rgba(31,124,75,.18); }
.hero-dots text.active { width: 36rpx; background: #1f7c4b; }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin: 28rpx 0 18rpx; }
.section-title { color: #253b2f; font-size: 32rpx; font-weight: 800; }
.section-link { padding: 8rpx 0 8rpx 12rpx; margin: 0; color: #738176; background: transparent; font-size: 22rpx; line-height: 1.5; }
.section-link::after, .game-order::after, .wallet-recharge::after, .player-filter::after { border: 0; }
.game-card { display: flex; align-items: center; gap: 20rpx; min-height: 156rpx; padding: 24rpx; border: 1rpx solid #e5ebe2; border-radius: 24rpx; background: #fffefa; box-sizing: border-box; }
.game-icon { flex-shrink: 0; width: 92rpx; height: 92rpx; border-radius: 20rpx; background: #eef9ef; }
.game-icon--fallback { display: flex; align-items: center; justify-content: center; }
.game-icon--fallback image { width: 58rpx; height: 58rpx; }
.game-copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 10rpx; }
.game-name { overflow: hidden; color: #253b2f; font-size: 29rpx; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.game-sub { color: #8a9489; font-size: 22rpx; }
.game-order { display: flex; flex-shrink: 0; align-items: center; justify-content: center; min-width: 126rpx; min-height: 72rpx; margin: 0; padding: 14rpx 22rpx; border-radius: 36rpx; background: #1f7c4b; color: #fffefa; font-size: 25rpx; line-height: 1.4; box-sizing: border-box; }
.more-games { display: flex; align-items: center; justify-content: center; gap: 10rpx; min-height: 76rpx; margin-top: 12rpx; border: 1rpx dashed #cad9c8; border-radius: 18rpx; color: #71806f; font-size: 24rpx; background: rgba(255,255,255,.45); }
.more-games image { width: 18rpx; height: 18rpx; }
.wallet-card { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; margin-top: 26rpx; padding: 28rpx; border-radius: 26rpx; background: #1f7c4b; color: #fffefa; }
.wallet-copy { flex: 1; min-width: 0; }
.wallet-title { display: flex; align-items: center; gap: 10rpx; font-size: 26rpx; font-weight: 700; }
.wallet-title image { width: 34rpx; height: 34rpx; }
.wallet-balance { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10rpx; margin-top: 12rpx; font-size: 43rpx; font-weight: 800; overflow-wrap: anywhere; }
.wallet-unit { color: #d3ecd9; font-size: 21rpx; font-weight: 400; }
.wallet-note, .wallet-retry { display: block; margin-top: 16rpx; color: #d3ecd9; font-size: 23rpx; }
.wallet-recharge { display: flex; flex-shrink: 0; align-items: center; justify-content: center; min-width: 164rpx; min-height: 74rpx; margin: 0; padding: 16rpx 24rpx; border-radius: 40rpx; color: #1f7c4b; background: #eef9ef; font-size: 25rpx; font-weight: 700; line-height: 1.4; box-sizing: border-box; }
.player-filters { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 18rpx; }
.player-filter { display: flex; align-items: center; justify-content: center; min-width: 110rpx; min-height: 58rpx; margin: 0; padding: 10rpx 24rpx; border-radius: 30rpx; color: #778273; background: #eaece3; font-size: 23rpx; line-height: 1.4; box-sizing: border-box; }
.player-filter.active { background: #1f7c4b; color: #fffefa; font-weight: 700; }
.player-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18rpx; }
.player-card { min-width: 0; padding: 22rpx 18rpx; border: 1rpx solid #e5ebe2; border-radius: 24rpx; background: #fffefa; box-sizing: border-box; }
.player-card-head { display: flex; align-items: center; gap: 14rpx; min-width: 0; }
.player-avatar { width: 82rpx; height: 82rpx; flex-shrink: 0; border-radius: 50%; background: #edf3e8; }
.player-avatar--fallback { display: flex; align-items: center; justify-content: center; color: #1f7c4b; font-size: 32rpx; font-weight: 700; }
.player-copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 9rpx; }
.player-name { color: #2b3b2e; font-size: 27rpx; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player-type { color: #88907e; font-size: 21rpx; }
.player-meta { display: flex; align-items: center; justify-content: space-between; gap: 6rpx; margin-top: 20rpx; margin-bottom: 18rpx; }
.player-status { display: flex; align-items: center; gap: 7rpx; color: #1f7c4b; font-size: 20rpx; }
.player-status text { width: 9rpx; height: 9rpx; border-radius: 50%; background: #4ca467; }
.player-status.off { color: #999f91; }
.player-status.off text { background: #afb4a6; }
.player-rating { color: #8b8e78; font-size: 20rpx; }
.section-empty { padding: 38rpx 20rpx; border: 1rpx solid #e5ebe2; border-radius: 22rpx; background: #fffefa; color: #929985; font-size: 24rpx; text-align: center; }
</style>
