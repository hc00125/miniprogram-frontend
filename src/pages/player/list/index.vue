<template>
  <view class="club-page player-list-page bottom-safe">
    <view class="topbar">
      <button @tap="goMain('home')">‹</button>
      <view>
        <text>已入驻陪玩</text>
        <text>按类型筛选喜欢的陪玩师</text>
      </view>
      <button @tap="fetchPlayers">刷新</button>
    </view>

    <view class="brand-poster list-hero">
      <view class="club-eyebrow">PLAYER LINEUP</view>
      <view class="club-title">明星阵容，在线开局</view>
      <view class="club-sub">仅展示已上传头像的陪玩师，点击卡片可查看 TA 的音频自我介绍。</view>
    </view>

    <scroll-view scroll-x class="filters" show-scrollbar="false">
      <view
        v-for="filter in filters"
        :key="filter"
        class="filter"
        :class="{ active: activeFilter === filter }"
        @tap="activeFilter = filter"
      >
        {{ filter }}
      </view>
    </scroll-view>

    <view class="players">
      <view v-for="player in filteredPlayers" :key="player.id" class="player-card" @tap="openPlayerDetail(player)">
        <view class="portrait">
          <image class="portrait-img" :src="player.avatar_url" mode="aspectFill" />
        </view>
        <view class="player-main">
          <view class="name-row">
            <text>{{ player.name }}</text>
            <text class="club-pill" :class="player.is_online ? '' : 'pill-offline'">{{ player.status || (player.is_online ? '在线' : '离线') }}</text>
          </view>
          <view class="tags">
            <text>{{ player.type_name || '优质陪玩' }}</text>
            <text>★ {{ player.avg_rating || '-' }}</text>
            <text>接单 {{ player.total_orders || 0 }}</text>
            <text v-if="player.audio_intro_url" class="audio-tag">语音介绍</text>
          </view>
          <view class="bio">{{ player.bio || '暂无简介' }}</view>
          <view class="card-actions">
            <text>+¥{{ formatMoney(player.price_extra || 0) }}/时</text>
            <button class="club-btn" @tap.stop="showDesignateUnavailable">指定TA</button>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!filteredPlayers.length && loaded" class="club-empty">
      {{ visiblePlayers.length === 0 ? '暂无已上传头像的陪玩师' : '暂无符合条件的陪玩' }}
    </view>

    <MainBottomTabs active="players" @select="handleMainTabSelect" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getPlayerList, type OnlinePlayer } from '@/api/boss'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import { relaunch, navigateToTab, type MainTab, go } from '@/utils/nav'
import { toast } from '@/utils/feedback'

const filters = ['全部', '女陪', '技术陪', '金牌陪', '明星陪', '在线']
const activeFilter = ref('全部')
const loaded = ref(false)
const players = ref<OnlinePlayer[]>([])

function hasUserAvatar(player: OnlinePlayer) {
  return Boolean(String(player.avatar_url || '').trim())
}

const visiblePlayers = computed(() => players.value.filter(hasUserAvatar))

const filteredPlayers = computed(() => {
  const filter = activeFilter.value
  const source = visiblePlayers.value
  if (filter === '全部') return source
  if (filter === '在线') return source.filter(player => player.is_online)
  return source.filter(player => player.type_name === filter)
})

function formatMoney(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

function normalizeOnlineValue(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

async function fetchPlayers() {
  loaded.value = false
  try {
    const list = await getPlayerList()
    players.value = (list || []).map(p => ({
      ...p,
      is_online: normalizeOnlineValue(p.is_online),
      type_name: p.player_type?.name || p.type_name || '优质陪玩',
      price_extra: p.player_type?.price_extra || p.price_extra || 0,
      status: normalizeOnlineValue(p.is_online) ? '在线' : '离线'
    }))
  } catch (error) {
    players.value = []
    toast('陪玩列表加载失败，请稍后重试')
  } finally {
    loaded.value = true
  }
}

onMounted(fetchPlayers)

function openPlayerDetail(player: OnlinePlayer) {
  go('/pages/player/detail/index', { playerId: player.id })
}

function showDesignateUnavailable() {
  toast('该功能尚未上线')
}

function handleMainTabSelect(tab: MainTab) {
  if (tab === 'home' || tab === 'order') {
    relaunch('/pages/boss/home/index', { tab })
    return
  }
  if (tab === 'players') return
  navigateToTab(tab as 'query' | 'profile')
}

function goMain(tab: MainTab = 'home') {
  handleMainTabSelect(tab)
}
</script>

<style lang="scss" scoped>
.player-list-page {
  padding-bottom: 160rpx;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 24rpx;
}

.topbar button {
  min-width: 72rpx;
  height: 72rpx;
  padding: 0 18rpx;
  border-radius: 24rpx;
  background: #fff;
  color: #1f7c4b;
  font-size: 26rpx;
  font-weight: 900;
  box-shadow: 0 10rpx 24rpx rgba(39, 61, 42, 0.08);
}

.topbar view {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.topbar text:first-child {
  color: #172116;
  font-size: 38rpx;
  font-weight: 900;
}

.topbar text:last-child {
  color: #687665;
  font-size: 23rpx;
}

.list-hero {
  min-height: 250rpx;
}

.filters {
  margin: 24rpx 0;
  white-space: nowrap;
}

.filter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 112rpx;
  height: 58rpx;
  padding: 0 22rpx;
  margin-right: 12rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #687665;
  font-size: 25rpx;
  font-weight: 800;
  border: 1px solid rgba(36, 55, 39, 0.09);
}

.filter.active {
  background: #172116;
  color: #fff;
}

.players {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.player-card {
  padding: 22rpx;
  display: flex;
  gap: 18rpx;
  border-radius: 32rpx;
  background: #fff;
  border: 1px solid rgba(36, 55, 39, 0.09);
  box-shadow: 0 10rpx 24rpx rgba(39, 61, 42, 0.06);
}

.portrait {
  width: 108rpx;
  height: 108rpx;
  border-radius: 32rpx;
  background: #eef3e9;
  flex-shrink: 0;
  overflow: hidden;
}

.portrait-img {
  width: 100%;
  height: 100%;
}

.pill-offline {
  background: rgba(42, 63, 48, 0.06) !important;
  color: #aab1a5 !important;
}

.player-main {
  flex: 1;
  min-width: 0;
}

.name-row,
.tags,
.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.name-row text:first-child {
  color: #172116;
  font-size: 31rpx;
  font-weight: 900;
}

.tags {
  margin-top: 12rpx;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.tags text {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #f7faf4;
  color: #687665;
  font-size: 22rpx;
}

.tags .audio-tag {
  color: #1f7c4b;
  background: #eef8f1;
}

.bio {
  margin-top: 14rpx;
  color: #687665;
  font-size: 24rpx;
  line-height: 1.45;
}

.card-actions {
  margin-top: 18rpx;
}

.card-actions text {
  color: #a87520;
  font-size: 28rpx;
  font-weight: 900;
}

.card-actions .club-btn {
  min-height: 62rpx;
  padding: 0 22rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
}

</style>
