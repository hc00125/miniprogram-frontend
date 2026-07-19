<template>
  <view class="club-page player-list-page bottom-safe">
    <view class="topbar">
      <button @tap="goMain('home')">‹</button>
      <view><text>已入驻陪玩</text><text>最多选择3名同类型陪玩</text></view>
      <button @tap="fetchPlayers">刷新</button>
    </view>

    <view class="brand-poster list-hero">
      <view class="club-eyebrow">PLAYER LINEUP</view>
      <view class="club-title">组合你的指定阵容</view>
      <view class="club-sub">可只指定部分成员，剩余名额继续公开抢单；指定本人不额外加价。</view>
    </view>

    <view class="search-panel">
      <view class="search-box" :class="{ focused: searchFocused }">
        <text class="search-icon">⌕</text>
        <input
          v-model="searchKeyword"
          class="search-input"
          type="text"
          confirm-type="search"
          maxlength="30"
          placeholder="搜索陪玩昵称、类型或简介"
          placeholder-class="search-placeholder"
          @focus="searchFocused = true"
          @blur="searchFocused = false"
          @confirm="fetchPlayers"
        />
        <text v-if="searchKeyword" class="search-clear" @tap.stop="clearSearch">×</text>
      </view>
      <text class="search-meta">{{ searchSummary }}</text>
    </view>

    <scroll-view scroll-x class="filters" show-scrollbar="false">
      <view v-for="filter in filters" :key="filter" class="filter" :class="{ active: activeFilter === filter }" @tap="activeFilter = filter">{{ filter }}</view>
    </scroll-view>

    <view v-if="selectedPlayers.length" class="selection-tip">
      <text>已选 {{ selectedPlayers.length }} 人 · {{ selectedPlayers[0].type_name }}</text>
      <text>只能继续选择同类型陪玩</text>
    </view>

    <view class="players">
      <view v-for="player in filteredPlayers" :key="player.id" class="player-card" :class="{ selected: isSelected(player) }" @tap="openPlayerDetail(player)">
        <view class="portrait"><image class="portrait-img" :src="player.avatar_url" mode="aspectFill" /></view>
        <view class="player-main">
          <view class="name-row">
            <text>{{ player.name }}</text>
            <text class="club-pill" :class="player.is_online ? '' : 'pill-offline'">{{ player.status || (player.is_online ? '在线' : '离线') }}</text>
          </view>
          <view class="tags">
            <text>{{ player.type_name || '优质陪玩' }}</text>
            <text class="rating-tag">{{ player.rating_count ? `★ ${player.avg_rating || '0.0'} · ${player.rating_count}条评价` : '暂无评分' }}</text>
            <text>接单 {{ player.total_orders || 0 }}</text>
            <text v-if="player.audio_intro_url" class="audio-tag">语音介绍</text>
          </view>
          <view class="bio">{{ player.bio || '暂无简介' }}</view>
          <view class="card-actions">
            <view>
              <text class="designate-price">{{ selectionStateText(player) }}</text>
              <text class="designate-state">{{ selectionHint(player) }}</text>
            </view>
            <button class="club-btn" :class="{ selected: isSelected(player) }" :disabled="!canToggle(player)" @tap.stop="togglePlayer(player)">{{ selectionButtonText(player) }}</button>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!filteredPlayers.length && loaded" class="club-empty">{{ emptyText }}</view>

    <view v-if="selectedPlayers.length" class="selection-bar">
      <view class="selected-summary">
        <view class="avatar-stack">
          <image v-for="item in selectedPlayers" :key="item.id" class="selected-avatar" :src="item.avatar_url" mode="aspectFill" />
        </view>
        <view><text>已选 {{ selectedPlayers.length }} 人</text><text>{{ selectedNames }}</text></view>
      </view>
      <button class="clear-btn" @tap="clearSelection">清空</button>
      <button class="next-btn" @tap="chooseProduct">去选商品</button>
    </view>

    <MainBottomTabs active="players" @select="handleMainTabSelect" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPlayerList, type OnlinePlayer } from '@/api/boss'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import { relaunch, navigateToTab, type MainTab, go, goMain as switchMain } from '@/utils/nav'
import { toast } from '@/utils/feedback'
import {
  MAX_DESIGNATED_PLAYERS,
  addDesignatedPlayer,
  clearDesignatedPlayers,
  getDesignatedPlayers,
  removeDesignatedPlayer,
  type DesignatedPlayerSelection
} from '@/utils/designatedPlayer'

const filters = ['全部', '女陪', '技术陪', '金牌陪', '明星陪', '在线']
const activeFilter = ref('全部')
const loaded = ref(false)
const players = ref<OnlinePlayer[]>([])
const selectedPlayers = ref<DesignatedPlayerSelection[]>([])
const searchKeyword = ref('')
const searchFocused = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined
let fetchSequence = 0

function hasUserAvatar(player: OnlinePlayer) { return Boolean(String(player.avatar_url || '').trim()) }
function canDesignate(player: OnlinePlayer) { return (player as OnlinePlayer & { can_be_designated?: boolean }).can_be_designated !== false }
function playerTypeId(player: OnlinePlayer) { return Number(player.type_id || player.player_type?.id || 0) }
function isSelected(player: OnlinePlayer) { return selectedPlayers.value.some(item => item.id === Number(player.id)) }
function isSameType(player: OnlinePlayer) {
  if (!selectedPlayers.value.length) return true
  return Number(selectedPlayers.value[0].type_id || 0) === playerTypeId(player)
}
function canToggle(player: OnlinePlayer) {
  if (isSelected(player)) return true
  return canDesignate(player) && isSameType(player) && selectedPlayers.value.length < MAX_DESIGNATED_PLAYERS
}
function selectionButtonText(player: OnlinePlayer) {
  if (isSelected(player)) return '已选择'
  if (!canDesignate(player)) return '暂不可指定'
  if (!isSameType(player)) return '类型不一致'
  if (selectedPlayers.value.length >= MAX_DESIGNATED_PLAYERS) return '人数已满'
  return '加入阵容'
}
function selectionStateText(player: OnlinePlayer) {
  if (isSelected(player)) return '已加入指定阵容'
  if (!canDesignate(player)) return '当前不接受指定'
  if (!isSameType(player)) return `当前已选${selectedPlayers.value[0]?.type_name || '其他类型'}`
  return '指定本人不加价'
}
function selectionHint(player: OnlinePlayer) {
  if (isSelected(player)) return '再次点击可移出阵容'
  if (!canDesignate(player)) return '该权限由管理员后台控制'
  if (!isSameType(player)) return '方案二仅支持同类型阵容'
  return player.is_online ? '在线，可发出10分钟邀请' : '离线，仍可发出邀请'
}
const visiblePlayers = computed(() => players.value.filter(hasUserAvatar))
const filteredPlayers = computed(() => {
  const filter = activeFilter.value
  const source = visiblePlayers.value
  if (filter === '全部') return source
  if (filter === '在线') return source.filter(player => player.is_online)
  return source.filter(player => player.type_name === filter)
})
const normalizedSearchKeyword = computed(() => searchKeyword.value.trim())
const searchSummary = computed(() => {
  if (normalizedSearchKeyword.value) return `找到 ${filteredPlayers.value.length} 位相关陪玩`
  if (activeFilter.value !== '全部') return `当前分类 ${filteredPlayers.value.length} 位陪玩`
  return `共 ${visiblePlayers.value.length} 位陪玩`
})
const emptyText = computed(() => {
  if (normalizedSearchKeyword.value) return `没有找到“${normalizedSearchKeyword.value}”相关陪玩`
  return visiblePlayers.value.length === 0 ? '暂无已上传头像的陪玩师' : '暂无符合条件的陪玩'
})
const selectedNames = computed(() => selectedPlayers.value.map(item => item.name).join('、'))
function normalizeOnlineValue(value: unknown) { return value === true || value === 1 || value === '1' || value === 'true' }
function syncSelection() { selectedPlayers.value = getDesignatedPlayers() }

async function fetchPlayers() {
  const sequence = ++fetchSequence
  if (!loaded.value) loaded.value = false
  try {
    const keyword = normalizedSearchKeyword.value
    const list = await getPlayerList(keyword ? { search: keyword } : {})
    if (sequence !== fetchSequence) return
    players.value = (list || []).map(p => ({
      ...p,
      type_id: Number(p.type_id || p.player_type?.id || 0),
      type_name: p.player_type?.name || p.type_name || '优质陪玩',
      type_priority: Number(p.type_priority ?? p.player_type?.priority ?? 0),
      is_online: normalizeOnlineValue(p.is_online),
      price_extra: p.player_type?.price_extra || p.price_extra || 0,
      status: p.status || (normalizeOnlineValue(p.is_online) ? '在线' : '离线')
    }))
  } catch {
    if (sequence !== fetchSequence) return
    players.value = []
    toast('陪玩列表加载失败，请稍后重试')
  } finally {
    if (sequence === fetchSequence) loaded.value = true
  }
}

function clearSearch() { searchKeyword.value = '' }

watch(searchKeyword, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchPlayers, 300)
})

onMounted(fetchPlayers)
onUnmounted(() => { if (searchTimer) clearTimeout(searchTimer) })
onShow(syncSelection)
function openPlayerDetail(player: OnlinePlayer) { go('/pages/player/detail/index', { playerId: player.id }) }
function toSelection(player: OnlinePlayer): DesignatedPlayerSelection {
  return {
    id: Number(player.id),
    name: player.name,
    type_id: playerTypeId(player),
    type_name: player.type_name || player.player_type?.name || '陪玩',
    type_priority: Number(player.type_priority ?? player.player_type?.priority ?? 0),
    avatar_url: player.avatar_url,
    is_online: Boolean(player.is_online)
  }
}
function togglePlayer(player: OnlinePlayer) {
  if (isSelected(player)) {
    selectedPlayers.value = removeDesignatedPlayer(Number(player.id))
    toast(`已移出 ${player.name}`)
    return
  }
  if (!canDesignate(player)) return toast('该陪玩当前不接受指定')
  const typeId = playerTypeId(player)
  if (!typeId) return toast('该陪玩的类型信息不完整，请刷新后重试')
  const result = addDesignatedPlayer(toSelection(player))
  selectedPlayers.value = result.players
  toast(result.message)
}
function clearSelection() { clearDesignatedPlayers(); selectedPlayers.value = []; toast('已清空指定阵容') }
function chooseProduct() {
  if (!selectedPlayers.value.length) return toast('请先选择陪玩')
  toast(`已选择${selectedPlayers.value.length}名${selectedPlayers.value[0].type_name}，请选择支持对应人数的商品`)
  switchMain('order')
}
function handleMainTabSelect(tab: MainTab) {
  if (tab === 'home' || tab === 'order') { relaunch('/pages/boss/home/index', { tab }); return }
  if (tab === 'players') return
  navigateToTab(tab as 'query' | 'profile')
}
function goMain(tab: MainTab = 'home') { handleMainTabSelect(tab) }
</script>

<style lang="scss" scoped>
.player-list-page { padding-bottom: 250rpx; }
.topbar { display:flex;align-items:center;justify-content:space-between;gap:18rpx;margin-bottom:24rpx; }.topbar button { min-width:72rpx;height:72rpx;padding:0 18rpx;border-radius:24rpx;background:#fff;color:#1f7c4b;font-size:26rpx;font-weight:900;box-shadow:0 10rpx 24rpx rgba(39,61,42,.08); }.topbar view { flex:1;display:flex;flex-direction:column;gap:4rpx; }.topbar text:first-child { color:#172116;font-size:38rpx;font-weight:900; }.topbar text:last-child { color:#687665;font-size:23rpx; }
.list-hero { min-height:250rpx; }
.search-panel { margin-top:24rpx; }.search-box { height:82rpx;display:flex;align-items:center;gap:14rpx;padding:0 22rpx;border-radius:26rpx;background:#fff;border:2rpx solid rgba(36,55,39,.08);box-shadow:0 10rpx 24rpx rgba(39,61,42,.06);transition:border-color .2s,box-shadow .2s; }.search-box.focused { border-color:rgba(47,155,99,.52);box-shadow:0 12rpx 28rpx rgba(47,155,99,.12); }.search-icon { color:#1f7c4b;font-size:38rpx;font-weight:900;line-height:1;transform:rotate(-18deg); }.search-input { flex:1;height:82rpx;color:#172116;font-size:26rpx; }.search-placeholder { color:#a3aca0; }.search-clear { width:48rpx;height:48rpx;display:flex;align-items:center;justify-content:center;border-radius:50%;color:#7d877a;background:#eef3e9;font-size:34rpx;line-height:48rpx;text-align:center; }.search-meta { display:block;margin:12rpx 6rpx 0;color:#7d877a;font-size:21rpx; }
.filters { margin:18rpx 0 24rpx;white-space:nowrap; }.filter { display:inline-flex;align-items:center;justify-content:center;min-width:112rpx;height:58rpx;padding:0 22rpx;margin-right:12rpx;border-radius:999rpx;background:#fff;color:#687665;font-size:25rpx;font-weight:800;border:1px solid rgba(36,55,39,.09); }.filter.active { background:#172116;color:#fff; }
.selection-tip { display:flex;align-items:center;justify-content:space-between;gap:16rpx;margin-bottom:18rpx;padding:18rpx 20rpx;border-radius:20rpx;color:#1f7c4b;background:#eef8f1; }.selection-tip text:first-child { font-size:24rpx;font-weight:900; }.selection-tip text:last-child { color:#687665;font-size:20rpx; }
.players { display:flex;flex-direction:column;gap:18rpx; }.player-card { padding:22rpx;display:flex;gap:18rpx;border-radius:32rpx;background:#fff;border:1px solid rgba(36,55,39,.09);box-shadow:0 10rpx 24rpx rgba(39,61,42,.06); }.player-card.selected { border-color:rgba(47,155,99,.48);background:linear-gradient(135deg,#f3fbf5,#fff); }.portrait { width:108rpx;height:108rpx;border-radius:32rpx;background:#eef3e9;flex-shrink:0;overflow:hidden; }.portrait-img { width:100%;height:100%; }.pill-offline { background:rgba(42,63,48,.06)!important;color:#aab1a5!important; }.player-main { flex:1;min-width:0; }.name-row,.tags,.card-actions { display:flex;align-items:center;justify-content:space-between;gap:12rpx; }.name-row>text:first-child { font-size:30rpx;font-weight:900; }.tags { margin-top:10rpx;flex-wrap:wrap;justify-content:flex-start; }.tags text { padding:5rpx 10rpx;border-radius:999rpx;color:#687665;font-size:20rpx;background:#f4f7f1; }.rating-tag { color:#a87520!important;background:#fff6df!important; }.bio { margin-top:12rpx;color:#687665;font-size:23rpx;line-height:1.5; }.card-actions { margin-top:16rpx;align-items:flex-end; }.card-actions>view { flex:1;min-width:0; }.card-actions text { display:block; }.designate-price { color:#1f7c4b;font-size:22rpx;font-weight:900; }.designate-state { margin-top:4rpx;color:#8a9286;font-size:19rpx; }.card-actions button { min-width:140rpx;height:64rpx;margin:0;font-size:22rpx; }.card-actions button.selected { color:#1f7c4b;background:#e5f6e9; }.card-actions button[disabled] { opacity:.5; }
.selection-bar { position:fixed;left:20rpx;right:20rpx;bottom:calc(116rpx + env(safe-area-inset-bottom));z-index:30;display:flex;align-items:center;gap:12rpx;padding:14rpx 16rpx;border-radius:26rpx;background:rgba(255,255,255,.98);box-shadow:0 14rpx 36rpx rgba(39,61,42,.18); }.selected-summary { flex:1;min-width:0;display:flex;align-items:center;gap:12rpx; }.avatar-stack { display:flex;padding-left:10rpx; }.selected-avatar { width:54rpx;height:54rpx;margin-left:-10rpx;border:4rpx solid #fff;border-radius:50%;background:#eef3e9; }.selected-summary>view:last-child { min-width:0; }.selected-summary text { display:block; }.selected-summary text:first-child { font-size:23rpx;font-weight:900; }.selected-summary text:last-child { margin-top:3rpx;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#7d877a;font-size:19rpx; }.selection-bar button { height:62rpx;margin:0;padding:0 18rpx;border-radius:999rpx;font-size:21rpx;font-weight:900; }.selection-bar button::after { border:none; }.clear-btn { color:#8f4d35;background:#fff0ed; }.next-btn { color:#fff;background:#1f7c4b; }
</style>
