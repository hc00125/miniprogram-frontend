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
      <view class="club-sub">展示当前可预约或在线的陪玩师，点单时可回到点单大厅指定 TA。</view>
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
      <view v-for="player in filteredPlayers" :key="player.id" class="player-card">
        <view class="portrait">
          <image v-if="player.avatar_url" class="portrait-img" :src="player.avatar_url" mode="aspectFill" />
          <text v-else>{{ player.name?.[0] || '陪' }}</text>
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
          </view>
          <view class="bio">{{ player.bio || '暂无简介' }}</view>
          <view class="card-actions">
            <text>+¥{{ formatMoney(player.price_extra || 0) }}/时</text>
            <button class="club-btn" @tap="goMain('order')">指定TA</button>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!filteredPlayers.length && loaded" class="club-empty">
      {{ players.length === 0 ? '暂无可展示的陪玩师' : '暂无符合条件的陪玩' }}
    </view>

    <MainBottomTabs active="players" @select="handleMainTabSelect" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getPlayerList, type OnlinePlayer } from '@/api/boss'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import { getClientProfile } from '@/utils/client'
import { relaunch, navigateToTab, type MainTab } from '@/utils/nav'
import { toast } from '@/utils/feedback'

const filters = ['全部', '女陪', '技术陪', '金牌陪', '明星陪', '在线']
const activeFilter = ref('全部')
const loaded = ref(false)
const players = ref<OnlinePlayer[]>([])

// 真实陪玩数据完全由后端返回（接口 /boss/online-players）
// 后端应只返回 "is_player=true" 且已通过审核的陪玩师

const filteredPlayers = computed(() => {
  const filter = activeFilter.value
  const source = players.value
  if (filter === '全部') return source
  if (filter === '在线') return source.filter(player => player.is_online)
  return source.filter(player => player.type_name === filter)
})

function formatMoney(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

async function fetchPlayers() {
  loaded.value = false
  try {
    // 使用 /api/player/list 获取全部陪玩师（含本人），不走 /boss/online-players
    const list = await getPlayerList()
    // 标准化后端响应的嵌套字段
    players.value = (list || []).map(p => ({
      ...p,
      type_name: p.player_type?.name || p.type_name || '优质陪玩',
      price_extra: p.player_type?.price_extra || p.price_extra || 0,
      status: p.status || (p.is_online ? '在线' : '离线')
    }))
  } catch (error) {
    players.value = []
    toast('陪玩列表加载失败，请稍后重试')
  } finally {
    loaded.value = true
  }
}

onMounted(fetchPlayers)

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
  background: linear-gradient(135deg, #65c980, #1f7c4b);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42rpx;
  font-weight: 900;
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
