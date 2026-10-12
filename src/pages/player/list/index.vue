<template>
  <view :style="$appThemeStyle" class="club-page player-list-page bottom-safe">
    <view class="topbar">
      <button @tap="goMain('home')">‹</button>
      <view><text>已入驻大神</text></view>
      <button :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">{{ refreshing ? '刷新中' : '刷新' }}</button>
    </view>

    <view class="discovery-tabs">
      <button class="discovery-tab" :class="{ active: discoveryMode === 'random' }" :aria-pressed="discoveryMode === 'random'" hover-class="discovery-tab--pressed" @tap="selectDiscoveryMode('random')">随机陪玩</button>
      <button class="discovery-tab" :class="{ active: discoveryMode === 'quality' }" :aria-pressed="discoveryMode === 'quality'" hover-class="discovery-tab--pressed" @tap="selectDiscoveryMode('quality')">推荐陪玩</button>
    </view>

    <view class="search-panel">
      <view class="search-box" :class="{ focused: searchFocused }">
        <text class="search-icon">⌕</text>
        <input v-model="searchKeyword" class="search-input" type="text" confirm-type="search" maxlength="30" placeholder="搜索陪玩昵称、类型或简介" placeholder-class="search-placeholder" @focus="searchFocused = true" @blur="searchFocused = false" @confirm="fetchPlayers" />
        <text v-if="searchKeyword" class="search-clear" @tap.stop="clearSearch">×</text>
      </view>
      <text class="search-meta">{{ searchSummary }}</text>
    </view>

    <scroll-view scroll-x class="filters" show-scrollbar="false"><view v-for="filter in filters" :key="filter" class="filter" :class="{ active: activeFilter === filter }" @tap="activeFilter = filter">{{ filter }}</view></scroll-view>

    <view class="players">
      <view v-for="player in filteredPlayers" :key="player.id" class="player-card" :class="{ 'player-card--crowned': crownedPlayers[player.id] }" @tap="openPlayerDetail(player)">
        <view class="player-card-head">
          <view class="portrait-wrap" :class="{ 'portrait-wrap--crowned': crownedPlayers[player.id] }">
            <image v-if="crownedPlayers[player.id]" class="portrait-crown" src="/icons/patronage/crown-gold.png" mode="aspectFit" aria-hidden="true" />
            <view class="portrait"><image v-if="player.avatar_url" class="portrait-img" :src="player.avatar_url" mode="aspectFill" /><view v-else class="portrait-empty">{{ player.name?.slice(0, 1) || '陪' }}</view></view>
          </view>
          <view class="player-main">
          <view class="name-row"><text>{{ player.name }}</text><text class="club-pill" :class="player.presence_online ? '' : 'pill-offline'">{{ player.presence_online ? '在线' : '离线' }}</text></view>
          <view class="tags"><text>{{ player.type_name || '优质陪玩' }}</text><text class="rating-tag">{{ player.rating_count ? `★ ${player.avg_rating || '0.0'} · ${player.rating_count}条评价` : '暂无评分' }}</text><text>接单 {{ player.total_orders || 0 }}</text><text v-if="player.audio_intro_url" class="audio-tag">语音介绍</text></view>
          </view>
        </view>
        <view v-if="player.bio" class="bio">{{ player.bio }}</view>
        <view class="player-crowns" :class="{ 'player-crowns--active': crownedPlayers[player.id] }"><PatronageCrowns compact :player-id="player.id" @active-change="crownedPlayers[player.id] = $event" /></view>
        <view class="player-actions">
          <button class="player-patronage" hover-class="player-patronage--pressed" @tap.stop="openPlayerPatronage(player)">冠名/包天</button>
          <view class="player-gift"><GiftHost compact persistent-entry :recipient-id="player.id" :recipient-name="player.name" /></view>
          <button class="club-btn" :disabled="player.can_be_designated === false || !player.is_online" @tap.stop="openPlayerDetail(player)">{{ player.can_be_designated === false ? '暂不可指定' : !player.is_online ? '休息中' : '查看服务' }}</button>
        </view>
        <view class="card-actions"><view><text class="designate-price">{{ player.can_be_designated === false ? '暂不接受指定' : !player.is_online ? '休息中' : '查看专属服务和规格' }}</text><text class="designate-state">{{ player.is_online ? '接单已开启，可查看服务' : '休息中，暂不可指定' }}</text></view></view>
      </view>
    </view>

    <view v-if="!filteredPlayers.length && loaded" class="club-empty">{{ emptyText }}</view>
    <MainBottomTabs active="players" @select="handleMainTabSelect" />
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPlayerList, type OnlinePlayer } from '@/api/boss'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import GiftHost from '@/components/gifts/GiftHost.vue'
import PatronageCrowns from '@/components/PatronageCrowns.vue'
import { relaunch, navigateToTab, type MainTab, go } from '@/utils/nav'
import { success, toast } from '@/utils/feedback'

const filters = ['全部', '女陪', '技术陪', '金牌陪', '明星陪', '在线']
const discoveryMode = ref<'random' | 'quality'>('random')
const activeFilter = ref('全部')
const loaded = ref(false)
const players = ref<OnlinePlayer[]>([])
const crownedPlayers = ref<Record<number, boolean>>({})
const searchKeyword = ref('')
const searchFocused = ref(false)
const refreshing = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined
let fetchSequence = 0
let disposed = false
let shuffleCounter = 0
function createShuffleKey() { return `${Date.now().toString(36)}-${(++shuffleCounter).toString(36)}-${Math.random().toString(36).slice(2, 14)}` }
let shuffleKey = createShuffleKey()

const visiblePlayers = computed(() => players.value)
const filteredPlayers = computed(() => {
  if (activeFilter.value === '全部') return visiblePlayers.value
  if (activeFilter.value === '在线') return visiblePlayers.value.filter(player => player.presence_online)
  return visiblePlayers.value.filter(player => player.type_name === activeFilter.value)
})
const normalizedSearchKeyword = computed(() => searchKeyword.value.trim())
const searchSummary = computed(() => normalizedSearchKeyword.value ? `找到 ${filteredPlayers.value.length} 位相关陪玩` : activeFilter.value !== '全部' ? `当前分类 ${filteredPlayers.value.length} 位陪玩` : `共 ${visiblePlayers.value.length} 位陪玩`)
const emptyText = computed(() => normalizedSearchKeyword.value ? `没有找到“${normalizedSearchKeyword.value}”相关陪玩` : '暂无符合条件的陪玩')
function selectDiscoveryMode(mode: 'random' | 'quality') { if (discoveryMode.value === mode) return; discoveryMode.value = mode; void fetchPlayers() }
function normalizeOnlineValue(value: unknown) { return value === true || value === 1 || value === '1' || value === 'true' }

async function fetchPlayers() {
  if (disposed) return false
  const sequence = ++fetchSequence
  try {
    const keyword = normalizedSearchKeyword.value
    const list = await getPlayerList({ discovery: discoveryMode.value, ...(discoveryMode.value === 'random' ? { shuffle_key: shuffleKey } : {}), ...(keyword ? { search: keyword } : {}) })
    if (sequence !== fetchSequence) return false
    players.value = (list || []).map(player => ({ ...player, type_name: player.player_type?.name || player.type_name || '优质陪玩', is_online: normalizeOnlineValue(player.is_online), status: player.status || (normalizeOnlineValue(player.is_online) ? '在线' : '离线') }))
    return true
  } catch {
    if (sequence === fetchSequence) { players.value = []; toast('陪玩列表刷新失败，请稍后重试') }
    return false
  } finally { if (sequence === fetchSequence) loaded.value = true }
}
async function handleManualRefresh() { if (disposed || refreshing.value) return; refreshing.value = true; if (discoveryMode.value === 'random') shuffleKey = createShuffleKey(); try { if (await fetchPlayers()) success('刷新成功') } finally { if (!disposed) refreshing.value = false } }
function clearSearch() { searchKeyword.value = '' }
watch(searchKeyword, () => { ++fetchSequence; if (searchTimer) clearTimeout(searchTimer); searchTimer = setTimeout(fetchPlayers, 300) }, { flush: 'sync' })
onShow(fetchPlayers)
onUnmounted(() => { disposed = true; ++fetchSequence; if (searchTimer) clearTimeout(searchTimer); searchTimer = undefined })
function openPlayerDetail(player: OnlinePlayer) { if (player.can_be_designated === false) return toast('该陪玩当前不接受指定'); go('/pages/player/detail/index', { playerId: player.id }) }
function openPlayerPatronage(player: OnlinePlayer) { go('/pages/client/patronage/index', { playerId: player.id }) }
function handleMainTabSelect(tab: MainTab) { if (tab === 'home' || tab === 'order') { relaunch('/pages/boss/home/index', { tab }); return }; if (tab === 'players') return; navigateToTab(tab as 'query' | 'profile') }
function goMain(tab: MainTab = 'home') { handleMainTabSelect(tab) }
function applyOwnPresence(reply: { player_id: number; presence_online: boolean }) {
  const target = (players.value).find(item => item.id === reply.player_id)
  if (target && reply.presence_online === true) target.presence_online = true
}
uni.$on('player-presence-updated', applyOwnPresence)
onUnmounted(() => uni.$off('player-presence-updated', applyOwnPresence))
</script>

<style lang="scss" scoped>
.player-list-page { padding-bottom: 150rpx; }
.player-card { --gift-entry-compact-min-height: 88rpx; }
.player-card.player-card--crowned { border-color: var(--ui-gold, #94651e); }
.player-crowns { min-width: 0; }
.player-crowns--active { margin-top: 14rpx; }
.player-card-head { display: flex; align-items: center; gap: 18rpx; min-width: 0; }
.portrait-wrap { position: relative; flex-shrink: 0; border: 2rpx solid transparent; border-radius: 50%; }
.portrait-wrap--crowned { border-color: var(--ui-gold, #94651e); }
.portrait-crown { position: absolute; top: -26rpx; left: 50%; width: 38rpx; height: 30rpx; transform: translateX(-50%); }
.discovery-tabs { display: flex; gap: 16rpx; }
.discovery-tab { flex: 1; display: flex; align-items: center; justify-content: center; min-width: 0; min-height: 88rpx; margin: 0; padding: 18rpx 12rpx; box-sizing: border-box; border: 2rpx solid var(--ui-line, #cad9c8); border-radius: 24rpx; background: var(--ui-surface, #fff); color: var(--ui-muted, #687665); font-size: 30rpx; font-weight: 800; line-height: 1.4; }
.discovery-tab::after { border: 0; }
.discovery-tab.active { border-color: transparent; background: var(--ui-gradient, linear-gradient(135deg, #2f9b63, #1f7c4b)); color: #fff; }
.discovery-tab--pressed { opacity: .85; }
.player-actions { display: flex; align-items: center; gap: 16rpx; margin-top: 16rpx; }
.player-patronage, .player-gift, .player-actions > .club-btn { flex: 1; min-width: 0; }
.player-actions > .club-btn { display: flex; align-items: center; justify-content: center; min-height: 88rpx; height: auto; margin: 0; padding: 16rpx 4rpx; border-radius: 18rpx; font-size: 24rpx; line-height: 1.4; white-space: nowrap; box-sizing: border-box; }
.player-actions > .club-btn[disabled] { opacity: .5; }
.player-card--crowned .player-patronage { background: var(--ui-gold, #94651e); border-color: var(--ui-gold, #94651e); color: var(--ui-surface, #fff); font-weight: 700; }
.player-patronage, .player-gift :deep(.gift-entry--compact) { display: flex; align-items: center; justify-content: center; min-height: 88rpx; margin: 0; padding: 16rpx 4rpx; border: 1rpx solid var(--ui-line, #cad9c8); border-radius: 18rpx; background: var(--ui-surface, #fffefa); color: var(--ui-accent, #1f7c4b); font-size: 24rpx; line-height: 1.4; white-space: nowrap; box-sizing: border-box; }
.player-patronage::after { border: 0; }
.player-patronage--pressed { opacity: .85; }
.topbar { display:flex;align-items:center;justify-content:space-between;gap:18rpx;margin-bottom:24rpx; }.topbar button { min-width:72rpx;height:72rpx;padding:0 18rpx;border-radius:24rpx;background:var(--ui-surface, #fff);color:var(--ui-accent, #1f7c4b);font-size:26rpx;font-weight:900;box-shadow:0 10rpx 24rpx var(--ui-shadow, rgba(39,61,42,.08)); }.topbar view { flex:1;display:flex;flex-direction:column;gap:4rpx; }.topbar text { color:var(--ui-text, #172116);font-size:38rpx;font-weight:900; }
.search-panel { margin-top:24rpx; }.search-box { height:82rpx;display:flex;align-items:center;gap:14rpx;padding:0 22rpx;border-radius:26rpx;background:var(--ui-surface, #fff);border:2rpx solid var(--ui-line, rgba(36,55,39,.08));box-shadow:0 10rpx 24rpx var(--ui-shadow, rgba(39,61,42,.06));transition:border-color .2s,box-shadow .2s; }.search-box.focused { border-color:var(--ui-accent-line, rgba(47,155,99,.52));box-shadow:0 12rpx 28rpx var(--ui-shadow, rgba(47,155,99,.12)); }.search-icon { color:var(--ui-accent, #1f7c4b);font-size:38rpx;font-weight:900;line-height:1;transform:rotate(-18deg); }.search-input { flex:1;height:82rpx;color:var(--ui-text, #172116);font-size:26rpx; }.search-placeholder { color:var(--ui-muted, #a3aca0); }.search-clear { width:48rpx;height:48rpx;display:flex;align-items:center;justify-content:center;border-radius:50%;color:var(--ui-muted, #7d877a);background:var(--ui-soft, #eef3e9);font-size:34rpx;line-height:48rpx;text-align:center; }.search-meta { display:block;margin:12rpx 6rpx 0;color:var(--ui-muted, #7d877a);font-size:21rpx; }
.filters { margin:18rpx 0 24rpx;white-space:nowrap; }.filter { display:inline-flex;align-items:center;justify-content:center;min-width:112rpx;height:58rpx;padding:0 22rpx;margin-right:12rpx;border-radius:999rpx;background:var(--ui-surface, #fff);color:var(--ui-muted, #687665);font-size:25rpx;font-weight:800;border:1px solid var(--ui-line, rgba(36,55,39,.09)); }.filter.active { background:var(--ui-gradient);color:#fff; }
.players { display:flex;flex-direction:column;gap:18rpx; }
.player-card { padding:30rpx 22rpx 22rpx;display:flex;flex-direction:column;min-width:0;border-radius:32rpx;background:var(--ui-surface, #fff);border:1px solid var(--ui-line, rgba(36,55,39,.09));box-shadow:0 10rpx 24rpx var(--ui-shadow, rgba(39,61,42,.06));box-sizing:border-box; }
.portrait { width:108rpx;height:108rpx;border-radius:50%;background:var(--ui-soft, #eef3e9);overflow:hidden; }
.portrait-img { width:100%;height:100%; }
.portrait-empty { width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;background:var(--ui-primary, #2f9b63);font-size:36rpx;font-weight:900; }
.pill-offline { background:var(--ui-soft, rgba(42,63,48,.06))!important;color:var(--ui-muted, #aab1a5)!important; }
.player-main { flex:1;min-width:0; }
.name-row,.tags,.card-actions { display:flex;align-items:center;justify-content:space-between;gap:12rpx; }
.name-row>text:first-child { flex:1;min-width:0;font-size:30rpx;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.name-row>.club-pill { flex-shrink:0; }
.tags { margin-top:10rpx;flex-wrap:wrap;justify-content:flex-start; }
.tags text { padding:5rpx 10rpx;border-radius:999rpx;color:var(--ui-muted, #687665);font-size:22rpx;background:var(--ui-soft, #f4f7f1); }
.rating-tag { color:var(--ui-gold, #a87520)!important;background:var(--ui-gold-soft, #fbf5e9)!important; }
.bio { margin-top:12rpx;color:var(--ui-muted, #687665);font-size:23rpx;line-height:1.5; }
.card-actions { margin-top:14rpx; }
.card-actions>view { flex:1;min-width:0; }
.card-actions text { display:block; }
.designate-price { color:var(--ui-accent, #1f7c4b);font-size:22rpx;font-weight:900; }
.designate-state { margin-top:4rpx;color:var(--ui-muted, #8a9286);font-size:19rpx; }
</style>
