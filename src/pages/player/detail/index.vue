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
          <text class="card-title">{{ canDesignate ? '指定该陪玩师' : '当前不接受指定' }}</text>
          <text class="card-subtitle">{{ canDesignate ? '第一版指定本人不额外加价；下单后TA有10分钟接受邀请。' : '该陪玩师的被指定权限已由管理员暂停，仍可查看公开资料。' }}</text>
        </view>
        <text class="designate-state">{{ canDesignate ? (player.is_online ? '在线，可立即邀请' : '当前离线，仍可发出邀请') : '暂不可指定' }}</text>
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

    <view v-if="player" class="bottom-bar">
      <button class="back-btn" @tap="goBack">返回列表</button>
      <button class="order-btn" :disabled="!canDesignate" @tap="designatePlayer">{{ canDesignate ? '指定TA并选商品' : '暂不接受指定' }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getPlayerList, type OnlinePlayer } from '@/api/boss'
import { getPublicPlayerRatings, type PlayerRatingItem, type PlayerRatingsResult } from '@/api/player'
import { goMain } from '@/utils/nav'
import { toast } from '@/utils/feedback'
import { saveDesignatedPlayer } from '@/utils/designatedPlayer'

const playerId = ref<number | null>(null)
const player = ref<OnlinePlayer | null>(null)
const ratingData = ref<PlayerRatingsResult | null>(null)
const loaded = ref(false)
const isPlaying = ref(false)
let audioContext: UniApp.InnerAudioContext | null = null

const ratings = computed<PlayerRatingItem[]>(() => ratingData.value?.results || [])
const canDesignate = computed(() => (player.value as (OnlinePlayer & { can_be_designated?: boolean }) | null)?.can_be_designated !== false)
const ratingSummary = computed(() => ratingData.value?.summary || {
  average_rating: Number(player.value?.avg_rating || 0),
  rating_count: Number(player.value?.rating_count || 0),
  total_orders: Number(player.value?.total_orders || 0)
})

function normalizeOnlineValue(value: unknown) { return value === true || value === 1 || value === '1' || value === 'true' }
function normalizePlayer(p: OnlinePlayer): OnlinePlayer {
  return { ...p, is_online: normalizeOnlineValue(p.is_online), type_name: p.player_type?.name || p.type_name || '优质陪玩', status: normalizeOnlineValue(p.is_online) ? '在线' : '离线' }
}
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
function designatePlayer() {
  if (!player.value) return
  if (!canDesignate.value) return toast('该陪玩当前不接受指定')
  saveDesignatedPlayer({ id: Number(player.value.id), name: player.value.name, type_name: player.value.type_name || '陪玩', avatar_url: player.value.avatar_url, is_online: Boolean(player.value.is_online) })
  toast(`已选择指定 ${player.value.name}，请选择商品`)
  goMain('order')
}
function goBack() { uni.navigateBack({ delta: 1 }) }
onLoad(query => { const id = Number(query?.playerId); playerId.value = Number.isFinite(id) ? id : null; fetchPlayer() })
onBeforeUnmount(() => { if (audioContext) { audioContext.stop(); audioContext.destroy(); audioContext = null } })
</script>

<style lang="scss" scoped>
.player-detail-page { min-height:100vh;color:#172116;background:#f7f3ea; }.detail-scroll { height:100vh; }.profile-hero,.detail-card { margin:24rpx;padding:28rpx;border-radius:30rpx;background:#fff;box-shadow:0 14rpx 30rpx rgba(39,61,42,.07); }.profile-hero { background:linear-gradient(135deg,#fff,#eef8e7); }.profile-head { display:flex;align-items:center;gap:22rpx; }.avatar { width:132rpx;height:132rpx;flex-shrink:0;border-radius:34rpx;background:#2f9b63; }.avatar--placeholder { display:flex;align-items:center;justify-content:center;color:#fff;font-size:52rpx;font-weight:900; }.profile-main { flex:1;min-width:0; }.name-row { display:flex;align-items:center;gap:14rpx; }.player-name { flex:1;font-size:40rpx;font-weight:900; }.status-pill { padding:8rpx 16rpx;border-radius:999rpx;color:#1f7c4b;font-size:22rpx;font-weight:900;background:#ecf8ef; }.status-pill.off { color:#99a198;background:#f0f2ef; }.player-type { display:inline-block;margin-top:12rpx;padding:7rpx 14rpx;border-radius:999rpx;color:#687665;font-size:23rpx;background:#f2f5ef; }
.stats-row { display:grid;grid-template-columns:repeat(3,1fr);gap:12rpx;margin-top:24rpx; }.stats-row view { padding:16rpx 8rpx;border-radius:18rpx;text-align:center;background:rgba(255,255,255,.75); }.stats-row text { display:block; }.stats-row text:first-child { font-size:30rpx;font-weight:900; }.stats-row text:last-child { margin-top:5rpx;color:#879083;font-size:20rpx; }
.designate-card { border:1rpx solid rgba(47,155,99,.16);background:linear-gradient(135deg,#f1faf3,#fffaf0); }.designate-card.blocked { border-color:rgba(161,61,53,.16);background:#f5f4f1; }.card-title,.card-subtitle { display:block; }.card-title { font-size:30rpx;font-weight:900; }.card-subtitle { margin-top:7rpx;color:#7d877a;font-size:22rpx;line-height:1.5; }.designate-state { display:inline-block;margin-top:16rpx;padding:8rpx 14rpx;border-radius:999rpx;color:#1f7c4b;font-size:21rpx;font-weight:900;background:#e5f6e9; }.blocked .designate-state { color:#8f4d35;background:#fff0ed; }
.audio-player { display:flex;align-items:center;gap:16rpx;margin-top:18rpx;padding:18rpx;border-radius:18rpx;background:#f7faf4; }.audio-player button { width:100rpx;height:60rpx;margin:0;border-radius:999rpx;color:#fff;font-size:23rpx;background:#1f7c4b; }.audio-player view { flex:1; }.audio-player text { display:block; }.audio-player text:first-child { font-weight:900; }.audio-player text:last-child { margin-top:5rpx;color:#879083;font-size:21rpx; }.bio-text { display:block;margin-top:16rpx;color:#4f5d50;font-size:25rpx;line-height:1.7; }.card-title-row { display:flex;justify-content:space-between;align-items:flex-start;gap:16rpx; }.rating-pill { padding:8rpx 12rpx;border-radius:999rpx;color:#a87520;font-size:20rpx;font-weight:900;background:#fff6df; }.review-list { margin-top:18rpx;display:flex;flex-direction:column;gap:14rpx; }.review-item { padding:18rpx;border-radius:18rpx;background:#f7faf4; }.review-item>view { display:flex;justify-content:space-between;color:#9aa197;font-size:20rpx; }.review-item>text { display:block;margin-top:8rpx;font-size:24rpx; }.review-item>text:last-child { color:#879083;font-size:20rpx; }.stars { color:#e1ac3f; }.empty-box,.empty-state { margin-top:18rpx;padding:30rpx;border-radius:18rpx;color:#879083;text-align:center;background:#f7faf4; }.bottom-space { height:150rpx; }
.bottom-bar { position:fixed;left:0;right:0;bottom:0;display:grid;grid-template-columns:1fr 2fr;gap:16rpx;padding:18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));background:rgba(255,255,255,.98);box-shadow:0 -10rpx 30rpx rgba(39,61,42,.08); }.bottom-bar button { height:82rpx;border-radius:999rpx;font-size:27rpx;font-weight:900; }.back-btn { color:#687665;background:#f1f3ef; }.order-btn { color:#fff;background:linear-gradient(135deg,#5fc68a,#1f7c4b); }.order-btn[disabled] { opacity:.5; }.bottom-bar button::after,.audio-player button::after { border:none; }
</style>
