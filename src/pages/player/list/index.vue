<template>
  <view class="club-page player-list-page bottom-safe">
    <view class="topbar"><button @tap="goMain('home')">‹</button><view><text>已入驻陪玩</text><text>按类型筛选喜欢的陪玩师</text></view><button @tap="fetchPlayers">刷新</button></view>
    <view class="brand-poster list-hero"><view class="club-eyebrow">PLAYER LINEUP</view><view class="club-title">明星阵容，在线开局</view><view class="club-sub">点击“指定TA”后选择商品，指定本人不额外加价。</view></view>
    <scroll-view scroll-x class="filters" show-scrollbar="false"><view v-for="filter in filters" :key="filter" class="filter" :class="{ active: activeFilter === filter }" @tap="activeFilter = filter">{{ filter }}</view></scroll-view>
    <view class="players">
      <view v-for="player in filteredPlayers" :key="player.id" class="player-card" @tap="openPlayerDetail(player)">
        <view class="portrait"><image class="portrait-img" :src="player.avatar_url" mode="aspectFill" /></view>
        <view class="player-main"><view class="name-row"><text>{{ player.name }}</text><text class="club-pill" :class="player.is_online ? '' : 'pill-offline'">{{ player.status || (player.is_online ? '在线' : '离线') }}</text></view><view class="tags"><text>{{ player.type_name || '优质陪玩' }}</text><text class="rating-tag">{{ player.rating_count ? `★ ${player.avg_rating || '0.0'} · ${player.rating_count}条评价` : '暂无评分' }}</text><text>接单 {{ player.total_orders || 0 }}</text><text v-if="player.audio_intro_url">语音介绍</text></view><view class="bio">{{ player.bio || '暂无简介' }}</view><view class="card-actions"><view><text class="designate-price">{{ canDesignate(player) ? '指定本人不加价' : '当前不接受指定' }}</text><text class="designate-state">{{ canDesignate(player) ? (player.is_online ? '在线，可立即邀请' : '离线，仍可发出邀请') : '该权限由管理员后台控制' }}</text></view><button class="club-btn" :disabled="!canDesignate(player)" @tap.stop="designatePlayer(player)">{{ canDesignate(player) ? '指定TA' : '暂不可指定' }}</button></view></view>
      </view>
    </view>
    <view v-if="!filteredPlayers.length && loaded" class="club-empty">{{ visiblePlayers.length === 0 ? '暂无已上传头像的陪玩师' : '暂无符合条件的陪玩' }}</view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getPlayerList, type OnlinePlayer } from '@/api/boss'
import { go, goMain } from '@/utils/nav'
import { toast } from '@/utils/feedback'
import { saveDesignatedPlayer } from '@/utils/designatedPlayer'

const filters = ['全部', '女陪', '技术陪', '金牌陪', '明星陪', '在线']
const activeFilter = ref('全部')
const loaded = ref(false)
const players = ref<OnlinePlayer[]>([])
function hasUserAvatar(player: OnlinePlayer) { return Boolean(String(player.avatar_url || '').trim()) }
function canDesignate(player: OnlinePlayer) { return (player as OnlinePlayer & { can_be_designated?: boolean }).can_be_designated !== false }
const visiblePlayers = computed(() => players.value.filter(hasUserAvatar))
const filteredPlayers = computed(() => { const filter = activeFilter.value; if (filter === '全部') return visiblePlayers.value; if (filter === '在线') return visiblePlayers.value.filter(player => player.is_online); return visiblePlayers.value.filter(player => player.type_name === filter) })
function normalizeOnlineValue(value: unknown) { return value === true || value === 1 || value === '1' || value === 'true' }
async function fetchPlayers() {
  loaded.value = false
  try {
    players.value = (await getPlayerList()).map(player => ({ ...player, type_id: Number(player.type_id || player.player_type?.id || 0), type_name: player.player_type?.name || player.type_name || '优质陪玩', type_priority: Number(player.type_priority ?? player.player_type?.priority ?? 0), is_online: normalizeOnlineValue(player.is_online), status: normalizeOnlineValue(player.is_online) ? '在线' : '离线' }))
  } catch { players.value = []; toast('陪玩列表加载失败，请稍后重试') }
  finally { loaded.value = true }
}
function openPlayerDetail(player: OnlinePlayer) { go('/pages/player/detail/index', { playerId: player.id }) }
function designatePlayer(player: OnlinePlayer) {
  if (!canDesignate(player)) return toast('该陪玩当前不接受指定')
  const typeId = Number(player.type_id || player.player_type?.id || 0)
  if (!typeId) return toast('该陪玩的类型信息不完整，请刷新后重试')
  saveDesignatedPlayer({ id: Number(player.id), name: player.name, type_id: typeId, type_name: player.type_name || player.player_type?.name || '陪玩', type_priority: Number(player.type_priority ?? player.player_type?.priority ?? 0), avatar_url: player.avatar_url, is_online: Boolean(player.is_online) })
  toast(`已选择指定 ${player.name}，请选择对应类型规格`)
  goMain('order')
}
onMounted(fetchPlayers)
</script>

<style lang="scss" scoped>
.player-list-page{padding-bottom:140rpx}.topbar{display:flex;align-items:center;justify-content:space-between;gap:18rpx;margin-bottom:24rpx}.topbar button{min-width:72rpx;height:72rpx;margin:0;padding:0 18rpx;border-radius:24rpx;background:#fff;color:#1f7c4b;font-size:24rpx;font-weight:900}.topbar view{flex:1}.topbar text{display:block}.topbar text:first-child{font-size:36rpx;font-weight:900}.topbar text:last-child{margin-top:4rpx;color:#687665;font-size:22rpx}.list-hero{min-height:240rpx}.filters{margin:22rpx 0;white-space:nowrap}.filter{display:inline-flex;align-items:center;justify-content:center;min-width:110rpx;height:58rpx;margin-right:10rpx;padding:0 20rpx;border-radius:999rpx;color:#687665;background:#fff}.filter.active{color:#fff;background:#172116}.players{display:flex;flex-direction:column;gap:16rpx}.player-card{display:flex;gap:18rpx;padding:22rpx;border-radius:28rpx;background:#fff}.portrait{width:106rpx;height:106rpx;overflow:hidden;border-radius:30rpx}.portrait-img{width:100%;height:100%}.player-main{flex:1;min-width:0}.name-row,.card-actions{display:flex;align-items:center;justify-content:space-between;gap:12rpx}.name-row>text:first-child{font-size:29rpx;font-weight:900}.pill-offline{color:#999!important;background:#f1f2ef!important}.tags{display:flex;flex-wrap:wrap;gap:8rpx;margin-top:10rpx}.tags text{padding:5rpx 9rpx;border-radius:999rpx;color:#687665;background:#f4f7f1;font-size:19rpx}.rating-tag{color:#a87520!important;background:#fff6df!important}.bio{margin-top:12rpx;color:#687665;font-size:22rpx;line-height:1.5}.card-actions{margin-top:15rpx;align-items:flex-end}.card-actions>view{flex:1}.card-actions text{display:block}.designate-price{color:#1f7c4b;font-size:21rpx;font-weight:900}.designate-state{margin-top:4rpx;color:#8a9286;font-size:18rpx}.card-actions button{min-width:138rpx;height:62rpx;margin:0;font-size:21rpx}
</style>
