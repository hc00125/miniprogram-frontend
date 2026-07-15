<template>
  <view class="player-detail-page">
    <scroll-view scroll-y class="detail-scroll">
      <view v-if="player" class="profile-hero">
        <view class="profile-head">
          <image v-if="player.avatar_url" class="avatar" :src="player.avatar_url" mode="aspectFill" />
          <view v-else class="avatar avatar--placeholder">{{ player.name?.[0] || '陪' }}</view>
          <view class="profile-main">
            <view class="name-row">
              <text class="player-name">{{ player.name }}</text>
              <text class="status-pill" :class="{ off: !player.is_online }">{{ player.is_online ? '在线' : '离线' }}</text>
            </view>
            <text class="player-type">{{ player.type_name || '优质陪玩' }}</text>
          </view>
        </view>
        <view class="stats-row">
          <view><text>{{ player.total_orders || 0 }}</text><text>接单数</text></view>
          <view><text>{{ ratingSummary.rating_count ? ratingSummary.average_rating : '-' }}</text><text>{{ ratingSummary.rating_count }}条评价</text></view>
          <view><text>¥0</text><text>指定加价</text></view>
        </view>
      </view>

      <view v-if="player" class="detail-card designate-card" :class="{ blocked: !canDesignate }">
        <view>
          <text class="card-title">{{ designateCardTitle }}</text>
          <text class="card-subtitle">{{ designateCardSubtitle }}</text>
        </view>
        <text class="designate-state">{{ designateStateText }}</text>
      </view>

      <view v-if="selectedPlayers.length" class="detail-card selected-card">
        <view class="card-title-row">
          <view><text class="card-title">当前指定阵容</text><text class="card-subtitle">已选 {{ selectedPlayers.length }} 名{{ selectedPlayers[0].type_name }}，最多3名</text></view>
          <text class="rating-pill">{{ selectedPlayers.length }}/3</text>
        </view>
        <view class="selected-list">
          <view v-for="item in selectedPlayers" :key="item.id" class="selected-item">
            <image v-if="item.avatar_url" :src="item.avatar_url" mode="aspectFill" />
            <view v-else>{{ item.name?.[0] || '陪' }}</view>
            <text>{{ item.name }}</text>
          </view>
        </view>
      </view>

      <view v-if="player" class="detail-card">
        <text class="card-title">音频自我介绍</text>
        <view v-if="player.audio_intro_url" class="audio-player">
          <button @tap="toggleAudio">{{ isPlaying ? '暂停' : '播放' }}</button>
          <view><text>{{ player.audio_intro_title || `${player.name}的自我介绍` }}</text><text>{{ isPlaying ? '正在播放中...' : '点击播放' }}</text></view>
        </view>
        <view v-else class="empty-box">暂未上传音频介绍</view>
      </view>

      <view v-if="player" class="detail-card">
        <text class="card-title">个人简介</text>
        <text class="bio-text">{{ player.bio || '这个陪玩师还没有填写简介。' }}</text>
      </view>

      <view v-if="player" class="detail-card">
        <view class="card-title-row">
          <view><text class="card-title">老板评价</text><text class="card-subtitle">真实订单完成后产生的评价</text></view>
          <text class="rating-pill">★ {{ ratingSummary.rating_count ? ratingSummary.average_rating : '-' }} · {{ ratingSummary.rating_count }}条</text>
        </view>
        <view v-if="ratings.length" class="review-list">
          <view v-for="item in ratings" :key="item.id" class="review-item">
            <view><text class="stars">{{ starText(item.rating) }}</text><text>{{ formatReviewDate(item.created_at) }}</text></view>
            <text>{{ item.comment || '老板未填写文字评价' }}</text>
            <text>{{ item.package_name || '陪玩服务' }}</text>
          </view>
        </view>
        <view v-else class="empty-box">暂无评价</view>
      </view>

      <view v-if="!player && loaded" class="empty-state">陪玩师不存在或已下架</view>
      <view class="bottom-space"></view>
    </scroll-view>

    <view v-if="player" class="bottom-bar" :class="{ three: selectedPlayers.length }">
      <button class="back-btn" @tap="goBack">返回列表</button>
      <button class="order-btn" :class="{ remove: isSelected }" :disabled="!canToggle" @tap="toggleDesignation">{{ actionText }}</button>
      <button v-if="selectedPlayers.length" class="next-btn" @tap="chooseProduct">去选商品({{ selectedPlayers.length }})</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getPlayerList, type OnlinePlayer } from '@/api/boss'
import { getPublicPlayerRatings, type PlayerRatingItem, type PlayerRatingsResult } from '@/api/player'
import { goMain } from '@/utils/nav'
import { toast } from '@/utils/feedback'
import {
  MAX_DESIGNATED_PLAYERS,
  addDesignatedPlayer,
  getDesignatedPlayers,
  removeDesignatedPlayer,
  type DesignatedPlayerSelection
} from '@/utils/designatedPlayer'

const playerId = ref<number | null>(null)
const player = ref<OnlinePlayer | null>(null)
const ratingData = ref<PlayerRatingsResult | null>(null)
const selectedPlayers = ref<DesignatedPlayerSelection[]>([])
const loaded = ref(false)
const isPlaying = ref(false)
let audioContext: UniApp.InnerAudioContext | null = null

const ratings = computed<PlayerRatingItem[]>(() => ratingData.value?.results || [])
const canDesignate = computed(() => player.value?.can_be_designated !== false)
const isSelected = computed(() => selectedPlayers.value.some(item => item.id === Number(player.value?.id || 0)))
const sameType = computed(() => {
  if (!player.value || !selectedPlayers.value.length) return true
  return Number(selectedPlayers.value[0].type_id || 0) === Number(player.value.type_id || player.value.player_type?.id || 0)
})
const canToggle = computed(() => isSelected.value || (canDesignate.value && sameType.value && selectedPlayers.value.length < MAX_DESIGNATED_PLAYERS))
const actionText = computed(() => {
  if (isSelected.value) return '移出阵容'
  if (!canDesignate.value) return '暂不接受指定'
  if (!sameType.value) return '类型不一致'
  if (selectedPlayers.value.length >= MAX_DESIGNATED_PLAYERS) return '人数已满'
  return '加入指定阵容'
})
const designateCardTitle = computed(() => {
  if (isSelected.value) return '已加入指定阵容'
  if (!canDesignate.value) return '当前不接受指定'
  return '加入指定阵容'
})
const designateCardSubtitle = computed(() => {
  if (!canDesignate.value) return '该陪玩师的被指定权限已由管理员暂停，仍可查看公开资料。'
  if (!sameType.value) return `当前阵容已选择“${selectedPlayers.value[0]?.type_name}”，方案二只能继续选择同类型陪玩。`
  return '最多选择3名同类型陪玩；可只指定部分成员，剩余名额公开抢单，邀请10分钟内有效。'
})
const designateStateText = computed(() => {
  if (isSelected.value) return '已选择，指定费 ¥0'
  if (!canDesignate.value) return '暂不可指定'
  if (!sameType.value) return '请先清空原阵容'
  return player.value?.is_online ? '在线，可立即邀请' : '当前离线，仍可发出邀请'
})
const ratingSummary = computed(() => ratingData.value?.summary || {
  average_rating: Number(player.value?.avg_rating || 0),
  rating_count: Number(player.value?.rating_count || 0),
  total_orders: Number(player.value?.total_orders || 0)
})

function normalizeOnlineValue(value: unknown) { return value === true || value === 1 || value === '1' || value === 'true' }
function normalizePlayer(p: OnlinePlayer): OnlinePlayer {
  return {
    ...p,
    type_id: Number(p.type_id || p.player_type?.id || 0),
    type_name: p.player_type?.name || p.type_name || '优质陪玩',
    type_priority: Number(p.type_priority ?? p.player_type?.priority ?? 0),
    is_online: normalizeOnlineValue(p.is_online),
    status: normalizeOnlineValue(p.is_online) ? '在线' : '离线'
  }
}
function syncSelection() { selectedPlayers.value = getDesignatedPlayers() }
function starText(value: number) { const count = Math.max(1, Math.min(5, Number(value || 0))); return `${'★'.repeat(count)}${'☆'.repeat(5 - count)}` }
function formatReviewDate(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function fetchPlayer() {
  loaded.value = false
  try {
    const list = await getPlayerList()
    const matched = (list || []).map(normalizePlayer).find(item => Number(item.id) === Number(playerId.value)) || null
    player.value = matched
    if (matched) { try { ratingData.value = await getPublicPlayerRatings(matched.id) } catch { ratingData.value = null } }
  } catch { player.value = null; toast('陪玩详情加载失败') }
  finally { loaded.value = true }
}

function getAudioContext() {
  if (!player.value?.audio_intro_url) return null
  if (!audioContext) {
    audioContext = uni.createInnerAudioContext()
    audioContext.src = player.value.audio_intro_url
    audioContext.onPlay(() => { isPlaying.value = true })
    audioContext.onPause(() => { isPlaying.value = false })
    audioContext.onStop(() => { isPlaying.value = false })
    audioContext.onEnded(() => { isPlaying.value = false })
    audioContext.onError(() => { isPlaying.value = false; toast('音频播放失败') })
  }
  return audioContext
}
function toggleAudio() { const context = getAudioContext(); if (!context) return toast('暂无音频介绍'); if (isPlaying.value) context.pause(); else context.play() }
function toSelection(current: OnlinePlayer): DesignatedPlayerSelection {
  return {
    id: Number(current.id),
    name: current.name,
    type_id: Number(current.type_id || current.player_type?.id || 0),
    type_name: current.type_name || current.player_type?.name || '陪玩',
    type_priority: Number(current.type_priority ?? current.player_type?.priority ?? 0),
    avatar_url: current.avatar_url,
    is_online: Boolean(current.is_online)
  }
}
function toggleDesignation() {
  if (!player.value) return
  if (isSelected.value) {
    selectedPlayers.value = removeDesignatedPlayer(Number(player.value.id))
    toast(`已移出 ${player.value.name}`)
    return
  }
  if (!canDesignate.value) return toast('该陪玩当前不接受指定')
  const result = addDesignatedPlayer(toSelection(player.value))
  selectedPlayers.value = result.players
  toast(result.message)
}
function chooseProduct() {
  if (!selectedPlayers.value.length) return toast('请先选择陪玩')
  toast(`已选择${selectedPlayers.value.length}名${selectedPlayers.value[0].type_name}，请选择支持对应人数的商品`)
  goMain('order')
}
function goBack() { uni.navigateBack({ delta: 1 }) }
onLoad(query => { const id = Number(query?.playerId); playerId.value = Number.isFinite(id) ? id : null; syncSelection(); fetchPlayer() })
onShow(syncSelection)
onBeforeUnmount(() => { if (audioContext) { audioContext.stop(); audioContext.destroy(); audioContext = null } })
</script>

<style lang="scss" scoped>
.player-detail-page { min-height:100vh;color:#172116;background:#f7f3ea; }.detail-scroll { height:100vh; }.profile-hero,.detail-card { margin:24rpx;padding:28rpx;border-radius:30rpx;background:#fff;box-shadow:0 14rpx 30rpx rgba(39,61,42,.07); }.profile-hero { background:linear-gradient(135deg,#fff,#eef8e7); }.profile-head { display:flex;align-items:center;gap:22rpx; }.avatar { width:132rpx;height:132rpx;flex-shrink:0;border-radius:34rpx;background:#2f9b63; }.avatar--placeholder { display:flex;align-items:center;justify-content:center;color:#fff;font-size:52rpx;font-weight:900; }.profile-main { flex:1;min-width:0; }.name-row { display:flex;align-items:center;gap:14rpx; }.player-name { flex:1;font-size:40rpx;font-weight:900; }.status-pill { padding:8rpx 16rpx;border-radius:999rpx;color:#1f7c4b;font-size:22rpx;font-weight:900;background:#ecf8ef; }.status-pill.off { color:#99a198;background:#f0f2ef; }.player-type { display:inline-block;margin-top:12rpx;padding:7rpx 14rpx;border-radius:999rpx;color:#687665;font-size:23rpx;background:#f2f5ef; }
.stats-row { display:grid;grid-template-columns:repeat(3,1fr);gap:12rpx;margin-top:24rpx; }.stats-row view { padding:16rpx 8rpx;border-radius:18rpx;text-align:center;background:rgba(255,255,255,.75); }.stats-row text { display:block; }.stats-row text:first-child { font-size:30rpx;font-weight:900; }.stats-row text:last-child { margin-top:5rpx;color:#879083;font-size:20rpx; }
.designate-card { border:1rpx solid rgba(47,155,99,.16);background:linear-gradient(135deg,#f1faf3,#fffaf0); }.designate-card.blocked { border-color:rgba(161,61,53,.16);background:#f5f4f1; }.card-title,.card-subtitle { display:block; }.card-title { font-size:30rpx;font-weight:900; }.card-subtitle { margin-top:7rpx;color:#7d877a;font-size:22rpx;line-height:1.5; }.designate-state { display:inline-block;margin-top:16rpx;padding:8rpx 14rpx;border-radius:999rpx;color:#1f7c4b;font-size:21rpx;font-weight:900;background:#e5f6e9; }.blocked .designate-state { color:#8f4d35;background:#fff0ed; }
.selected-card { border:1rpx solid rgba(216,161,68,.22);background:#fffaf0; }.selected-list { display:flex;gap:18rpx;margin-top:20rpx; }.selected-item { min-width:100rpx;display:flex;flex-direction:column;align-items:center;gap:8rpx; }.selected-item image,.selected-item>view { width:72rpx;height:72rpx;border-radius:22rpx;background:#2f9b63; }.selected-item>view { display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900; }.selected-item text { max-width:120rpx;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:21rpx;font-weight:800; }
.audio-player { display:flex;align-items:center;gap:16rpx;margin-top:18rpx;padding:18rpx;border-radius:18rpx;background:#f7faf4; }.audio-player button { width:100rpx;height:60rpx;margin:0;border-radius:999rpx;color:#fff;font-size:23rpx;background:#1f7c4b; }.audio-player view { flex:1; }.audio-player text { display:block; }.audio-player text:first-child { font-weight:900; }.audio-player text:last-child { margin-top:5rpx;color:#879083;font-size:21rpx; }.bio-text { display:block;margin-top:16rpx;color:#4f5d50;font-size:25rpx;line-height:1.7; }.card-title-row { display:flex;justify-content:space-between;align-items:flex-start;gap:16rpx; }.rating-pill { padding:8rpx 12rpx;border-radius:999rpx;color:#a87520;font-size:20rpx;font-weight:900;background:#fff6df; }.review-list { margin-top:18rpx;display:flex;flex-direction:column;gap:14rpx; }.review-item { padding:18rpx;border-radius:18rpx;background:#f7faf4; }.review-item>view { display:flex;justify-content:space-between;color:#9aa197;font-size:20rpx; }.review-item>text { display:block;margin-top:8rpx;font-size:24rpx; }.review-item>text:last-child { color:#879083;font-size:20rpx; }.stars { color:#e1ac3f; }.empty-box,.empty-state { margin-top:18rpx;padding:30rpx;border-radius:18rpx;color:#879083;text-align:center;background:#f7faf4; }.bottom-space { height:170rpx; }
.bottom-bar { position:fixed;left:0;right:0;bottom:0;display:grid;grid-template-columns:1fr 2fr;gap:12rpx;padding:18rpx 20rpx calc(18rpx + env(safe-area-inset-bottom));background:rgba(255,255,255,.98);box-shadow:0 -10rpx 30rpx rgba(39,61,42,.08); }.bottom-bar.three { grid-template-columns:1fr 1.2fr 1.5fr; }.bottom-bar button { height:82rpx;margin:0;padding:0 12rpx;border-radius:999rpx;font-size:24rpx;font-weight:900; }.back-btn { color:#687665;background:#f1f3ef; }.order-btn,.next-btn { color:#fff;background:linear-gradient(135deg,#5fc68a,#1f7c4b); }.order-btn.remove { color:#8f4d35;background:#fff0ed; }.next-btn { background:linear-gradient(135deg,#d8a144,#a87520); }.order-btn[disabled] { opacity:.5; }.bottom-bar button::after,.audio-player button::after { border:none; }
</style>
