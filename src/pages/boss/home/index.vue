<template>
  <view :style="$appThemeStyle" class="club-page home-page">
    <scroll-view scroll-y class="home-scroll">
      <view class="landing">
        <view class="club-brand" data-section="club-brand">
          <image class="club-brand-logo" src="/images/club/club-logo.png" mode="aspectFit" />
          <view class="club-brand-copy"><view class="club-brand-title"><text>偷吃电竞</text><text class="club-brand-badge">俱乐部</text></view></view>
        </view>
        <view class="hero-section">
          <swiper class="hero-swiper" circular autoplay interval="4200" duration="480" @change="handleHeroChange">
            <swiper-item v-for="banner in heroBanners" :key="banner.id">
              <view class="hero-slide" :role="banner.target === 'brand' ? 'img' : 'button'" :aria-label="banner.title" @tap="handleHeroBannerTap(banner.target)">
                <view v-if="banner.target === 'national-bounty'" class="event-result-banner" data-section="national-bounty-results">
                  <view class="event-result-heading"><text>偷吃电竞 · 国庆冲榜</text><text class="event-result-status">{{ NATIONAL_BOUNTY_STATUS }}</text></view>
                  <text class="event-result-title">国庆冲榜圆满结束</text>
                  <view class="event-result-winners">
                    <view v-for="winner in NATIONAL_BOUNTY_RESULTS" :key="winner.rank" class="event-result-winner">
                      <text class="event-result-place">第{{ winner.rank }}名</text><text class="event-result-name">{{ winner.name }}</text><text class="event-result-score">{{ formatNationalBountyScore(winner.score) }}</text>
                    </view>
                  </view>
                  <view class="event-result-footer"><text>奖励已全部发放</text><text>查看收官公告 ›</text></view>
                </view>
                <image v-else-if="!failedHeroImages[banner.id]" class="hero-slide__image" :src="banner.image" mode="aspectFill" @error="handleHeroImageError(banner)" />
                <view v-else class="hero-slide__fallback"><text>{{ banner.title }}</text></view>
              </view>
            </swiper-item>
          </swiper>
          <view class="hero-meta"><view class="hero-dots"><text v-for="(banner, index) in heroBanners" :key="banner.id" :class="{ active: currentHeroIndex === index }"></text></view></view>
        </view>

        <HomeAnnouncements :active="announcementsActive" />

        <view class="game-section">
          <view class="section-head"><text class="section-title">选择游戏</text></view>
          <button v-if="isArenaFeaturedGame" class="steam-game-card arena-game-card" data-action="arena-game" aria-label="暗区突围无限，去下单" @tap="goFeaturedGame">
            <image class="steam-game-art" src="/images/home-redesign/arena-breakout.jpg" mode="aspectFill" />
            <view class="steam-game-shade" />
            <view class="steam-game-content"><view class="steam-game-copy"><text class="steam-game-title">暗区突围无限</text></view><text class="steam-game-action">去下单 ›</text></view>
          </button>
          <view v-else-if="featuredGame" class="game-card" @tap="goFeaturedGame">
            <image v-if="featuredGame.icon_url && !failedGameIcons[featuredGame.id]" class="game-icon" :src="featuredGame.icon_url" mode="aspectFill" @error="failedGameIcons[featuredGame.id] = true" />
            <view v-else class="game-icon game-icon--fallback"><image :src="uiIcons.order" mode="aspectFit" /></view>
            <view class="game-copy"><text class="game-name">{{ featuredGame.name }}</text></view>
            <button class="game-order" @tap.stop="goFeaturedGame">去点单</button>
          </view>
          <view v-else class="section-empty" @tap="fetchHomeData">{{ catalogLoading ? '游戏加载中…' : catalogLoadFailed ? '游戏加载失败，点击重试' : '暂无已上架游戏' }}</view>
          <button class="steam-game-card" data-action="steam-games" aria-label="小游戏陪玩，去下单" @tap="goSteamGames">
            <image class="steam-game-art" src="/images/home-redesign/steam-games.jpg" mode="aspectFill" />
            <view class="steam-game-shade" />
            <view class="steam-game-content"><view class="steam-game-copy"><text class="steam-game-title">小游戏陪玩</text></view><text class="steam-game-action">去下单 ›</text></view>
          </button>
        </view>

        <view class="home-shortcuts" data-section="home-shortcuts">
          <button class="shortcut-item" data-action="order-notice" hover-class="shortcut-item--pressed" @tap="goOrderNotice"><view class="shortcut-icon"><image :src="uiIcons.terms" mode="aspectFit" /></view><text>下单须知</text></button>
          <button class="shortcut-item" data-action="benefits" hover-class="shortcut-item--pressed" @tap="goBenefits"><view class="shortcut-icon"><image :src="uiIcons.benefits" mode="aspectFit" /></view><text>常驻福利</text></button>
          <button class="shortcut-item" data-action="customer-service" hover-class="shortcut-item--pressed" @tap="goCustomerService"><view class="shortcut-icon"><image :src="uiIcons.support" mode="aspectFit" /></view><text>联系客服</text></button>
          <button class="shortcut-item" data-action="my-orders" hover-class="shortcut-item--pressed" @tap="goMyOrders"><view class="shortcut-icon"><image :src="uiIcons.query" mode="aspectFit" /></view><text>我的订单</text></button>
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
            <view v-for="player in featuredPlayers" :key="player.id" class="player-card" :class="{ 'player-card--crowned': crownedPlayers[player.id] }">
              <view class="player-card-head" @tap="openPlayerDetail(player)">
                <view class="player-avatar-shell">
                  <image v-if="!failedAvatars[player.id]" class="player-avatar" :src="player.avatar_url" mode="aspectFill" @error="failedAvatars[player.id] = true" />
                  <view v-else class="player-avatar player-avatar--fallback">{{ player.name.slice(0, 1) }}</view>
                  <image v-if="crownedPlayers[player.id]" class="player-avatar-crown" src="/icons/patronage/crown-gold.png" mode="aspectFit" aria-hidden="true" />
                </view>
                <view class="player-copy"><text class="player-name">{{ player.name }}</text><text class="player-type">{{ player.type_name }}</text></view>
                <view class="player-indicators">
                  <view class="player-status" :class="{ off: !player.presence_online }"><text></text>{{ player.presence_online ? '在线' : '离线' }}</view>
                  <text class="player-rating">{{ player.rating_count ? `★ ${player.avg_rating || '0.0'}` : '未评分' }}</text>
                </view>
              </view>
              <view class="player-crowns" :class="{ 'player-crowns--active': crownedPlayers[player.id] }"><PatronageCrowns compact :player-id="player.id" @active-change="crownedPlayers[player.id] = $event" /></view>
              <view class="player-actions">
                <button class="player-patronage" @tap.stop="openPlayerPatronage(player)">冠名/包天</button>
                <view class="player-gift"><GiftHost compact persistent-entry :recipient-id="player.id" :recipient-name="player.name" /></view>
              </view>
            </view>
          </view>
          <view v-else class="section-empty" @tap="fetchHomeData">{{ playersLoading ? '陪玩加载中…' : playersLoadFailed ? '陪玩加载失败，点击重试' : '暂无可推荐的陪玩' }}</view>
        </view>
      </view>
    </scroll-view>
    <button class="ranking-float" data-action="open-rankings" aria-label="查看排行榜" @tap="goRankings"><image class="ranking-float-icon" src="/icons/rank-light.png" mode="aspectFit" /><text>排行榜</text></button>
    <MainBottomTabs active="home" @select="handleMainTabSelect" />
  </view>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'
import { onHide, onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app'
import { getPlayerList, type OnlinePlayer } from '@/api/boss'
import { getCatalogNavigation, type GameService } from '@/api/catalog'
import { getWalletOverview, type WalletOverview } from '@/api/wallet'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import GiftHost from '@/components/gifts/GiftHost.vue'
import PatronageCrowns from '@/components/PatronageCrowns.vue'
import HomeAnnouncements from '@/components/HomeAnnouncements.vue'
import { uiIcons } from '@/utils/uiIcons'
import { go, goMain, navigateToTab, type MainTab } from '@/utils/nav'
import { getClientProfile } from '@/utils/client'
import { getStorage } from '@/utils/storage'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
import { getAccountRestrictionView, showAccountRestrictionModal } from '@/utils/accountRestriction'
import { formatDiamonds } from '@/utils/diamonds'
import { toast } from '@/utils/feedback'
import { NATIONAL_BOUNTY_RESULTS, NATIONAL_BOUNTY_STATUS, formatNationalBountyScore } from '@/constants/nationalBounty'

type HeroTarget = 'national-bounty' | 'brand' | 'arena'
type HeroBanner = { id: string; image?: string; target: HeroTarget; title: string }
const homeHero = '/images/home-redesign/club-welcome.jpg'
const currentHeroIndex = ref(0)
const failedHeroImages = ref<Record<string, boolean>>({})
const heroBanners: HeroBanner[] = [
  { id: 'national-bounty', target: 'national-bounty', title: '国庆冲榜已结束，奖励已全部发放，查看最终排名' },
  { id: 'club-welcome', image: '/images/home-redesign/club-welcome.jpg', target: 'brand', title: '偷吃电竞' },
  { id: 'arena-s7', image: '/images/home-redesign/arena-s7-utopia.jpg', target: 'arena', title: '暗区突围无限，S7赛季已上线，查看暗区服务' }
]
onShareAppMessage(() => ({ title: '偷吃电竞｜专业游戏陪练服务', path: '/pages/boss/home/index', imageUrl: homeHero }))
onShareTimeline(() => ({ title: '偷吃电竞｜专业游戏陪练服务', query: '', imageUrl: homeHero }))

const games = ref<GameService[]>([]), catalogLoading = ref(false), catalogLoadFailed = ref(false)
const featuredGame = computed(() => games.value[0] || null)
const isArenaFeaturedGame = computed(() => Boolean(featuredGame.value && /暗区突围|arena[\s_-]*breakout/i.test(`${featuredGame.value.name} ${featuredGame.value.code}`)))
const steamGame = computed(() => games.value.find(game => /steam|小游戏/i.test(`${game.code} ${game.name}`)) || null)
const failedGameIcons = ref<Record<number, boolean>>({})
const players = ref<OnlinePlayer[]>([]), playersLoading = ref(false), playersLoadFailed = ref(false)
const failedAvatars = ref<Record<number, boolean>>({})
const crownedPlayers = ref<Record<number, boolean>>({})
const activePlayerType = ref('全部')
const playerFilters = computed(() => ['全部', ...['技术陪', '娱乐陪'].filter(type => players.value.some(player => player.type_name === type))])
const featuredPlayers = computed(() => players.value.filter(player => hasUserAvatar(player) && (activePlayerType.value === '全部' || player.type_name === activePlayerType.value)).slice(0, 4))
const isLoggedIn = ref(false), accountRestricted = ref(false), walletLoading = ref(false), walletLoadFailed = ref(false)
const walletOverview = ref<WalletOverview | null>(null)
const walletBalance = computed(() => { if (!walletOverview.value) return '--'; try { return formatDiamonds(walletOverview.value.balance_diamonds) } catch { return '--' } })
const announcementsActive = ref(false)
let visible = true, generation = 0, walletGeneration = 0

function hasUserAvatar(player: OnlinePlayer) { return Boolean(String(player.avatar_url || '').trim()) }
function normalizeOnlineValue(value: unknown) { return value === true || value === 1 || value === '1' || value === 'true' }
function normalizePlayer(player: OnlinePlayer): OnlinePlayer { const isOnline = normalizeOnlineValue(player.is_online); return { ...player, is_online: isOnline, type_name: player.player_type?.name || player.type_name || '优质陪玩', price_extra: player.player_type?.price_extra || player.price_extra || 0, status: isOnline ? '在线' : '离线' } }
function goShopCategory() { go('/pages/shop/category/index') }
function goSteamGames() {
  uni.removeStorageSync('catalog:requested-game-id')
  uni.setStorageSync('catalog:requested-game-kind', 'mini-games')
  if (steamGame.value) uni.setStorageSync('catalog:requested-game-id', steamGame.value.id)
  goShopCategory()
}
function goRankings() { goMain('rankings') }
function goFeaturedGame() { if (!featuredGame.value) return; uni.setStorageSync('catalog:requested-game-id', featuredGame.value.id); goShopCategory() }
function goArenaServices() {
  if (catalogLoading.value) return toast('服务加载中，请稍后再试')
  const game = games.value.find(item => /暗区突围|arena[\s_-]*breakout/i.test(item.name + ' ' + item.code))
  if (game) { uni.setStorageSync('catalog:requested-game-id', game.id); goShopCategory(); return }
  go('/pages/client/customer-service/index', { scene: 'arena' })
}
function goOrderNotice() { go('/pages/boss/order-notice/index') }
function goBenefits() { go('/pages/client/benefits/index') }
function goCustomerService() { go('/pages/client/customer-service/index') }
function goMyOrders() { if (!getStorage<string>('token')) { go('/pages/client/login/index'); return }; goMain('query') }
function goPlayerList() { goMain('players') }
function openPlayerDetail(player: OnlinePlayer) { if (player.can_be_designated === false) return toast('该陪玩当前不接受指定'); go('/pages/player/detail/index', { playerId: player.id }) }
function openPlayerPatronage(player: OnlinePlayer) { go('/pages/client/patronage/index', { playerId: player.id }) }
function goRecharge() {
  if (!getStorage<string>('token')) { clearWallet(); go('/pages/client/login/index'); return }
  const profile = getClientProfile()
  if (getAccountRestrictionView(profile).restricted) { void showAccountRestrictionModal(profile); return }
  go('/pages/client/recharge/index')
}
function handleHeroChange(event: { detail?: { current?: number } }) { currentHeroIndex.value = event.detail?.current || 0 }
function handleHeroImageError(banner: HeroBanner) { failedHeroImages.value[banner.id] = true }
function handleHeroBannerTap(target: HeroTarget) { if (target === 'brand') return; if (target === 'national-bounty') return go('/pages/client/national-bounty/index'); if (target === 'arena') return goArenaServices() }
function handleMainTabSelect(tab: MainTab) { if (tab === 'home') return; if (tab === 'order') return goShopCategory(); if (tab === 'rankings') return goRankings(); if (tab === 'query' || tab === 'players' || tab === 'profile') navigateToTab(tab) }
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
    (async () => { try { const result = await getCatalogNavigation(); if (current()) games.value = result.games || [] } catch { if (current()) { games.value = []; catalogLoadFailed.value = true } } finally { if (current()) catalogLoading.value = false } })(),
    (async () => { try { const result = await getPlayerList(); if (current()) { players.value = (result || []).map(normalizePlayer); if (!playerFilters.value.includes(activePlayerType.value)) activePlayerType.value = '全部' } } catch { if (current()) { players.value = []; crownedPlayers.value = {}; playersLoadFailed.value = true } } finally { if (current()) playersLoading.value = false } })(),
    loadWallet()
  ])
}
function hide() { visible = false; announcementsActive.value = false; crownedPlayers.value = {}; generation++; clearWallet() }
onShow(() => { visible = true; announcementsActive.value = true; return fetchHomeData() })
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
.home-page { min-height: 100vh; background: $bg; box-sizing: border-box; }
.home-shortcuts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8rpx; margin-top: 24rpx; padding: 20rpx 10rpx; border: 1rpx solid var(--ui-line, #e7ecf2); border-radius: 26rpx; background: var(--ui-surface, #fff); }
.shortcut-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14rpx; min-width: 0; min-height: 144rpx; margin: 0; padding: 8rpx 0; border-radius: 18rpx; background: transparent; color: var(--ui-text, #334350); font-size: 24rpx; font-weight: 600; line-height: 1.4; white-space: nowrap; }
.shortcut-item::after { border: 0; }
.shortcut-item--pressed { background: var(--ui-soft, #edf3f7); }
.shortcut-icon { display: flex; align-items: center; justify-content: center; width: 80rpx; height: 80rpx; border-radius: 24rpx; background: var(--ui-accent-soft); }
.shortcut-icon image { width: 46rpx; height: 46rpx; }
.home-scroll { height: 100vh; }
.landing { padding: 20rpx 24rpx calc(160rpx + env(safe-area-inset-bottom)); }
.club-brand { display: flex; align-items: center; gap: 18rpx; padding: 0 6rpx 24rpx; }
.club-brand-logo { flex-shrink: 0; width: 94rpx; height: 94rpx; }
.club-brand-copy { flex: 1; min-width: 0; }
.club-brand-title { display: flex; align-items: center; gap: 14rpx; color: var(--ui-text, #253b2f); font-size: 35rpx; font-weight: 800; }
.club-brand-badge { padding: 4rpx 10rpx; border: 1rpx solid var(--ui-line, #d6e5d3); border-radius: 8rpx; background: var(--ui-accent-soft); color: var(--ui-accent); font-size: 19rpx; font-weight: 600; border-color: var(--ui-accent-line); }
.hero-section { margin-top: 4rpx; }
/* 750rpx viewport minus page/landing gutters = 654rpx; banners are 2:1. */
.hero-swiper { height: 327rpx; }
.hero-slide { position: relative; height: 100%; overflow: hidden; border-radius: 28rpx; background: var(--ui-primary, #15261b); }
.hero-slide__fallback { display: flex; align-items: center; justify-content: center; height: 100%; padding: 32rpx; box-sizing: border-box; background: var(--ui-gradient); color: var(--ui-on-primary); font-size: 32rpx; font-weight: 700; text-align: center; line-height: 1.7; }
.hero-slide__image { display: block; width: 100%; height: 327rpx; }
.event-result-banner { display: flex; flex-direction: column; justify-content: space-between; height: 100%; padding: 24rpx 28rpx; box-sizing: border-box; border: 1rpx solid var(--ui-gold-line); border-radius: 28rpx; background: var(--ui-gold-soft); color: var(--ui-text); }
.event-result-heading, .event-result-footer { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; font-size: 24rpx; line-height: 1.5; }
.event-result-heading { color: var(--ui-gold); font-weight: 600; }
.event-result-status { flex-shrink: 0; padding: 2rpx 12rpx; border: 1rpx solid var(--ui-gold-line); border-radius: 10rpx; }
.event-result-title { display: block; font-size: 36rpx; font-weight: 800; line-height: 1.35; }
.event-result-winners { display: flex; gap: 12rpx; }
.event-result-winner { flex: 1; min-width: 0; }
.event-result-place, .event-result-name, .event-result-score { display: block; }
.event-result-place { font-size: 22rpx; line-height: 1.5; color: var(--ui-muted); }
.event-result-name { font-size: 28rpx; font-weight: 700; line-height: 1.5; }
.event-result-score { font-size: 24rpx; font-weight: 600; line-height: 1.5; color: var(--ui-gold); font-variant-numeric: tabular-nums; }
.event-result-footer { color: var(--ui-gold); }
.hero-meta { display: flex; justify-content: center; margin-top: 14rpx; }
.hero-dots { display: flex; gap: 10rpx; }
.hero-dots text { display: block; width: 18rpx; height: 6rpx; border-radius: 999rpx; background: var(--ui-accent-line); }
.hero-dots text.active { width: 36rpx; background: var(--ui-accent); }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin: 28rpx 0 18rpx; }
.section-title { color: var(--ui-text, #253b2f); font-size: 32rpx; font-weight: 800; }
.section-link { padding: 8rpx 0 8rpx 12rpx; margin: 0; color: var(--ui-muted, #738176); background: transparent; font-size: 22rpx; line-height: 1.5; }
.section-link::after, .game-order::after, .wallet-recharge::after, .player-filter::after { border: 0; }
.game-card { display: flex; align-items: center; gap: 20rpx; min-height: 156rpx; padding: 24rpx; border: 1rpx solid var(--ui-line, #e5ebe2); border-radius: 24rpx; background: var(--ui-surface, #ffffff); box-sizing: border-box; }
.game-icon { flex-shrink: 0; width: 92rpx; height: 92rpx; border-radius: 20rpx; background: var(--ui-soft, #eef9ef); }
.game-icon--fallback { display: flex; align-items: center; justify-content: center; }
.game-icon--fallback image { width: 58rpx; height: 58rpx; }
.game-copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 10rpx; }
.game-name { overflow: hidden; color: var(--ui-text, #253b2f); font-size: 29rpx; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.game-order { display: flex; flex-shrink: 0; align-items: center; justify-content: center; min-width: 126rpx; min-height: 72rpx; margin: 0; padding: 14rpx 22rpx; border-radius: 36rpx; background: var(--ui-primary, #1f7c4b); color: #ffffff; font-size: 25rpx; line-height: 1.4; box-sizing: border-box; }
.steam-game-card { position: relative; display: block; width: 100%; height: 305rpx; margin: 18rpx 0 0; padding: 0; overflow: hidden; border-radius: 26rpx; background: var(--ui-primary, #213f37); text-align: left; line-height: 1.5; box-sizing: border-box; }
.arena-game-card { margin-top: 0; }
.steam-game-card::after, .ranking-float::after { border: 0; }
.steam-game-art { display: block; width: 100%; height: 100%; }
.steam-game-shade { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 42%, rgba(10,27,19,.18) 60%, rgba(10,27,19,.83) 100%); pointer-events: none; }
.steam-game-content { position: absolute; left: 26rpx; right: 26rpx; bottom: 22rpx; display: flex; align-items: flex-end; justify-content: space-between; gap: 18rpx; }
.steam-game-copy { flex: 1; min-width: 0; color: #ffffff; text-shadow: 0 2rpx 8rpx var(--ui-shadow, rgba(0,0,0,.28)); }
.steam-game-title { display: block; font-size: 34rpx; font-weight: 800; line-height: 1.3; }
.steam-game-action { flex-shrink: 0; padding: 12rpx 25rpx; border: 1rpx solid var(--ui-line, rgba(255,255,255,.5)); border-radius: 34rpx; background: var(--ui-button-surface); color: var(--ui-button-ink); font-size: 26rpx; font-weight: 800; line-height: 1.5; }
.ranking-float { position: fixed; z-index: 8; right: 20rpx; bottom: calc(32rpx + env(safe-area-inset-bottom)); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3rpx; width: 108rpx; height: 108rpx; margin: 0; padding: 8rpx; border: 3rpx solid var(--ui-line, #f7f5ee); border-radius: 50%; background: var(--ui-gradient); box-shadow: 0 5rpx 20rpx var(--ui-shadow, rgba(22,67,40,.18)); color: #ffffff; font-size: 22rpx; line-height: 1.3; box-sizing: border-box; }
.ranking-float-icon { width: 40rpx; height: 40rpx; }
.wallet-card { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; margin-top: 26rpx; padding: 28rpx; border-radius: 26rpx; background: var(--ui-gradient); color: #ffffff; }
.wallet-copy { flex: 1; min-width: 0; }
.wallet-title { display: flex; align-items: center; gap: 10rpx; font-size: 26rpx; font-weight: 700; }
.wallet-title image { width: 34rpx; height: 34rpx; }
.wallet-balance { display: flex; align-items: baseline; flex-wrap: wrap; gap: 10rpx; margin-top: 12rpx; font-size: 43rpx; font-weight: 800; overflow-wrap: anywhere; }
.wallet-unit { color: var(--ui-on-primary-muted); font-size: 21rpx; font-weight: 400; }
.wallet-note, .wallet-retry { display: block; margin-top: 16rpx; color: var(--ui-on-primary-muted); font-size: 23rpx; }
.wallet-recharge { display: flex; flex-shrink: 0; align-items: center; justify-content: center; min-width: 164rpx; min-height: 74rpx; margin: 0; padding: 16rpx 24rpx; border-radius: 40rpx; color: var(--ui-button-ink); background: var(--ui-button-surface); font-size: 25rpx; font-weight: 700; line-height: 1.4; box-sizing: border-box; }
.player-filters { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 18rpx; }
.player-filter { display: flex; align-items: center; justify-content: center; min-width: 110rpx; min-height: 58rpx; margin: 0; padding: 10rpx 24rpx; border-radius: 30rpx; color: var(--ui-muted, #778273); background: var(--ui-soft, #eaece3); font-size: 23rpx; line-height: 1.4; box-sizing: border-box; }
.player-filter.active { background: var(--ui-gradient); color: #ffffff; font-weight: 700; }
.player-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18rpx; }
.player-card { --gift-entry-compact-min-height: 88rpx; min-width: 0; padding: 22rpx 18rpx; border: 1rpx solid var(--ui-line, #e5ebe2); border-radius: 24rpx; background: var(--ui-surface, #ffffff); box-sizing: border-box; }
.player-card--crowned { border-color: var(--ui-gold, #94651e); }
.player-card-head { display: flex; align-items: center; gap: 10rpx; min-width: 0; }
.player-avatar-shell { position: relative; flex-shrink: 0; width: 82rpx; height: 82rpx; padding: 2rpx; border: 2rpx solid transparent; border-radius: 50%; box-sizing: border-box; }
.player-card--crowned .player-avatar-shell { border-color: var(--ui-gold, #94651e); }
.player-avatar { display: block; width: 100%; height: 100%; border-radius: 50%; background: var(--ui-soft, #edf3e8); }
.player-avatar--fallback { display: flex; align-items: center; justify-content: center; color: var(--ui-accent, #1f7c4b); font-size: 32rpx; font-weight: 700; }
.player-avatar-crown { position: absolute; top: -18rpx; left: 50%; width: 34rpx; height: 26rpx; transform: translateX(-50%); }
.player-copy { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 9rpx; }
.player-name { color: var(--ui-text, #2b3b2e); font-size: 25rpx; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player-type { color: var(--ui-muted, #88907e); font-size: 20rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player-indicators { display: flex; flex-shrink: 0; flex-direction: column; align-items: flex-end; gap: 9rpx; max-width: 74rpx; }
.player-status { display: flex; align-items: center; gap: 5rpx; color: var(--ui-accent, #1f7c4b); font-size: 19rpx; line-height: 1.4; white-space: nowrap; }
.player-status text { flex-shrink: 0; width: 8rpx; height: 8rpx; border-radius: 50%; background: var(--ui-primary, #4ca467); }
.player-status.off { color: var(--ui-muted, #999f91); }
.player-status.off text { background: var(--ui-soft, #afb4a6); }
.player-rating { max-width: 74rpx; color: var(--ui-muted, #8b8e78); font-size: 19rpx; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player-crowns { min-width: 0; }
.player-crowns--active { margin-top: 14rpx; }
.player-actions { display: flex; align-items: center; gap: 10rpx; margin-top: 16rpx; }
.player-patronage, .player-gift { flex: 1; min-width: 0; }
.player-patronage { display: flex; align-items: center; justify-content: center; min-height: 88rpx; margin: 0; padding: 12rpx 4rpx; border: 1rpx solid var(--ui-line, #cad9c8); border-radius: 18rpx; background: var(--ui-surface, #ffffff); color: var(--ui-accent, #1f7c4b); font-size: 22rpx; line-height: 1.4; white-space: nowrap; box-sizing: border-box; }
.player-card--crowned .player-patronage { border-color: var(--ui-gold, #94651e); background: var(--ui-gold, #94651e); color: var(--ui-surface, #ffffff); }
.player-patronage::after { border: 0; }
.section-empty { padding: 38rpx 20rpx; border: 1rpx solid var(--ui-line, #e5ebe2); border-radius: 22rpx; background: var(--ui-surface, #ffffff); color: var(--ui-muted, #929985); font-size: 24rpx; text-align: center; }
</style>
