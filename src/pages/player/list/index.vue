<template>
  <view class="club-page player-list-page bottom-safe">
    <view class="topbar">
      <button @tap="goMain('home')">‹</button>
      <view><text>已入驻陪玩</text><text>选择陪玩师，进入其专属商品页下单</text></view>
      <button :loading="refreshing" :disabled="refreshing" @tap="handleManualRefresh">{{ refreshing ? '刷新中' : '刷新' }}</button>
    </view>

    <view class="brand-poster list-hero">
      <view class="club-eyebrow">PLAYER SERVICES</view>
      <view class="club-title">选择你想指定的陪玩师</view>
      <view class="club-sub">每位陪玩师都有自己的服务商品和规格；付款成功后，系统将直接通知该陪玩师。</view>
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
      <view v-for="player in filteredPlayers" :key="player.id" class="player-card" @tap="openPlayerDetail(player)">
        <view class="portrait"><image v-if="player.avatar_url" class="portrait-img" :src="player.avatar_url" mode="aspectFill" /><view v-else class="portrait-empty">{{ player.name?.slice(0, 1) || '陪' }}</view></view>
        <view class="player-main">
          <view class="name-row"><text>{{ player.name }}</text><text class="club-pill" :class="player.is_online ? '' : 'pill-offline'">{{ player.status || (player.is_online ? '在线' : '离线') }}</text></view>
          <view class="tags"><text>{{ player.type_name || '优质陪玩' }}</text><text class="rating-tag">{{ player.rating_count ? `★ ${player.avg_rating || '0.0'} · ${player.rating_count}条评价` : '暂无评分' }}</text><text>接单 {{ player.total_orders || 0 }}</text><text v-if="player.audio_intro_url" class="audio-tag">语音介绍</text></view>
          <view class="bio">{{ player.bio || '暂无简介' }}</view>
          <view class="card-actions"><view><text class="designate-price">{{ player.can_be_designated === false ? '暂不接受指定' : !player.is_online ? '当前离线' : '查看专属服务和规格' }}</text><text class="designate-state">{{ player.is_online ? '在线，可直接下单邀请' : '离线，暂不可指定' }}</text></view><button class="club-btn" :disabled="player.can_be_designated === false || !player.is_online" @tap.stop="openPlayerDetail(player)">{{ player.can_be_designated === false ? '暂不可指定' : !player.is_online ? '当前离线' : '查看服务' }}</button></view>
        </view>
      </view>
    </view>

    <view v-if="!filteredPlayers.length && loaded" class="club-empty">{{ emptyText }}</view>
    <MainBottomTabs active="players" @select="handleMainTabSelect" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { getPlayerList, type OnlinePlayer } from '@/api/boss'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import { relaunch, navigateToTab, type MainTab, go } from '@/utils/nav'
import { success, toast } from '@/utils/feedback'

const filters = ['全部', '女陪', '技术陪', '金牌陪', '明星陪', '在线']
const activeFilter = ref('全部')
const loaded = ref(false)
const players = ref<OnlinePlayer[]>([])
const searchKeyword = ref('')
const searchFocused = ref(false)
const refreshing = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined
let fetchSequence = 0

const visiblePlayers = computed(() => players.value)
const filteredPlayers = computed(() => {
  if (activeFilter.value === '全部') return visiblePlayers.value
  if (activeFilter.value === '在线') return visiblePlayers.value.filter(player => player.is_online)
  return visiblePlayers.value.filter(player => player.type_name === activeFilter.value)
})
const normalizedSearchKeyword = computed(() => searchKeyword.value.trim())
const searchSummary = computed(() => normalizedSearchKeyword.value ? `找到 ${filteredPlayers.value.length} 位相关陪玩` : activeFilter.value !== '全部' ? `当前分类 ${filteredPlayers.value.length} 位陪玩` : `共 ${visiblePlayers.value.length} 位陪玩`)
const emptyText = computed(() => normalizedSearchKeyword.value ? `没有找到“${normalizedSearchKeyword.value}”相关陪玩` : '暂无符合条件的陪玩')
function normalizeOnlineValue(value: unknown) { return value === true || value === 1 || value === '1' || value === 'true' }

async function fetchPlayers() {
  const sequence = ++fetchSequence
  try {
    const keyword = normalizedSearchKeyword.value
    const list = await getPlayerList(keyword ? { search: keyword } : {})
    if (sequence !== fetchSequence) return false
    players.value = (list || []).map(player => ({ ...player, type_name: player.player_type?.name || player.type_name || '优质陪玩', is_online: normalizeOnlineValue(player.is_online), status: player.status || (normalizeOnlineValue(player.is_online) ? '在线' : '离线') }))
    return true
  } catch {
    if (sequence === fetchSequence) { players.value = []; toast('陪玩列表刷新失败，请稍后重试') }
    return false
  } finally { if (sequence === fetchSequence) loaded.value = true }
}
async function handleManualRefresh() { if (refreshing.value) return; refreshing.value = true; try { if (await fetchPlayers()) success('刷新成功') } finally { refreshing.value = false } }
function clearSearch() { searchKeyword.value = '' }
watch(searchKeyword, () => { if (searchTimer) clearTimeout(searchTimer); searchTimer = setTimeout(fetchPlayers, 300) })
onMounted(fetchPlayers)
onUnmounted(() => { if (searchTimer) clearTimeout(searchTimer) })
function openPlayerDetail(player: OnlinePlayer) { if (player.can_be_designated === false) return toast('该陪玩当前不接受指定'); go('/pages/player/detail/index', { playerId: player.id }) }
function handleMainTabSelect(tab: MainTab) { if (tab === 'home' || tab === 'order') { relaunch('/pages/boss/home/index', { tab }); return }; if (tab === 'players') return; navigateToTab(tab as 'query' | 'profile') }
function goMain(tab: MainTab = 'home') { handleMainTabSelect(tab) }
</script>

<style lang="scss" scoped>
.player-list-page { padding-bottom: 150rpx; }
.topbar { display:flex;align-items:center;justify-content:space-between;gap:18rpx;margin-bottom:24rpx; }.topbar button { min-width:72rpx;height:72rpx;padding:0 18rpx;border-radius:24rpx;background:#fff;color:#1f7c4b;font-size:26rpx;font-weight:900;box-shadow:0 10rpx 24rpx rgba(39,61,42,.08); }.topbar view { flex:1;display:flex;flex-direction:column;gap:4rpx; }.topbar text:first-child { color:#172116;font-size:38rpx;font-weight:900; }.topbar text:last-child { color:#687665;font-size:23rpx; }
.list-hero { min-height:250rpx; }.search-panel { margin-top:24rpx; }.search-box { height:82rpx;display:flex;align-items:center;gap:14rpx;padding:0 22rpx;border-radius:26rpx;background:#fff;border:2rpx solid rgba(36,55,39,.08);box-shadow:0 10rpx 24rpx rgba(39,61,42,.06);transition:border-color .2s,box-shadow .2s; }.search-box.focused { border-color:rgba(47,155,99,.52);box-shadow:0 12rpx 28rpx rgba(47,155,99,.12); }.search-icon { color:#1f7c4b;font-size:38rpx;font-weight:900;line-height:1;transform:rotate(-18deg); }.search-input { flex:1;height:82rpx;color:#172116;font-size:26rpx; }.search-placeholder { color:#a3aca0; }.search-clear { width:48rpx;height:48rpx;display:flex;align-items:center;justify-content:center;border-radius:50%;color:#7d877a;background:#eef3e9;font-size:34rpx;line-height:48rpx;text-align:center; }.search-meta { display:block;margin:12rpx 6rpx 0;color:#7d877a;font-size:21rpx; }
.filters { margin:18rpx 0 24rpx;white-space:nowrap; }.filter { display:inline-flex;align-items:center;justify-content:center;min-width:112rpx;height:58rpx;padding:0 22rpx;margin-right:12rpx;border-radius:999rpx;background:#fff;color:#687665;font-size:25rpx;font-weight:800;border:1px solid rgba(36,55,39,.09); }.filter.active { background:#172116;color:#fff; }
.players { display:flex;flex-direction:column;gap:18rpx; }.player-card { padding:22rpx;display:flex;gap:18rpx;border-radius:32rpx;background:#fff;border:1px solid rgba(36,55,39,.09);box-shadow:0 10rpx 24rpx rgba(39,61,42,.06); }.portrait { width:108rpx;height:108rpx;border-radius:32rpx;background:#eef3e9;flex-shrink:0;overflow:hidden; }.portrait-img { width:100%;height:100%; }.portrait-empty { width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;background:#2f9b63;font-size:36rpx;font-weight:900; }.pill-offline { background:rgba(42,63,48,.06)!important;color:#aab1a5!important; }.player-main { flex:1;min-width:0; }.name-row,.tags,.card-actions { display:flex;align-items:center;justify-content:space-between;gap:12rpx; }.name-row>text:first-child { font-size:30rpx;font-weight:900; }.tags { margin-top:10rpx;flex-wrap:wrap;justify-content:flex-start; }.tags text { padding:5rpx 10rpx;border-radius:999rpx;color:#687665;font-size:20rpx;background:#f4f7f1; }.rating-tag { color:#a87520!important;background:#fff6df!important; }.bio { margin-top:12rpx;color:#687665;font-size:23rpx;line-height:1.5; }.card-actions { margin-top:16rpx;align-items:flex-end; }.card-actions>view { flex:1;min-width:0; }.card-actions text { display:block; }.designate-price { color:#1f7c4b;font-size:22rpx;font-weight:900; }.designate-state { margin-top:4rpx;color:#8a9286;font-size:19rpx; }.card-actions button { min-width:140rpx;height:64rpx;margin:0;font-size:22rpx; }.card-actions button[disabled] { opacity:.5; }
</style>
