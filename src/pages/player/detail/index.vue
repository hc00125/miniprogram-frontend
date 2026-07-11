<template>
  <view class="player-detail-page">
    <scroll-view scroll-y class="detail-scroll">
      <view v-if="player" class="profile-hero">
        <view class="hero-bg"></view>
        <view class="profile-head">
          <view class="avatar-wrap">
            <image v-if="player.avatar_url" class="avatar" :src="player.avatar_url" mode="aspectFill" />
            <view v-else class="avatar avatar--placeholder">{{ player.name?.[0] || '陪' }}</view>
          </view>
          <view class="profile-main">
            <view class="name-row">
              <text class="player-name">{{ player.name }}</text>
              <text class="status-pill" :class="{ off: !player.is_online }">{{ player.status || (player.is_online ? '在线' : '离线') }}</text>
            </view>
            <view class="type-row">
              <text>{{ player.type_name || '优质陪玩' }}</text>
              <text>TC</text>
            </view>
          </view>
        </view>
        <view class="stats-row">
          <view class="stat-item"><text>{{ player.total_orders || 0 }}</text><text>接单数</text></view>
          <view class="stat-item">
            <text>{{ ratingSummary.rating_count ? ratingSummary.average_rating : '-' }}</text>
            <text>{{ ratingSummary.rating_count ? `${ratingSummary.rating_count}条评价` : '暂无评分' }}</text>
          </view>
          <view class="stat-item"><text>+¥{{ formatMoney(player.price_extra || 0) }}</text><text>加价/时</text></view>
        </view>
      </view>

      <view v-if="player" class="detail-card audio-card">
        <view class="card-title-row">
          <view>
            <text class="card-title">音频自我介绍</text>
            <text class="card-subtitle">听听 TA 的声音和服务风格</text>
          </view>
          <text v-if="player.audio_intro_url" class="audio-ready">可播放</text>
        </view>

        <view v-if="player.audio_intro_url" class="audio-player">
          <button class="play-btn" @tap="toggleAudio">{{ isPlaying ? '暂停' : '播放' }}</button>
          <view class="audio-main">
            <view class="audio-title">{{ player.audio_intro_title || `${player.name} 的自我介绍` }}</view>
            <view class="audio-url">{{ isPlaying ? '正在播放中...' : '点击播放音频介绍' }}</view>
          </view>
        </view>
        <view v-else class="audio-empty">
          <view class="audio-empty-icon">🎙️</view>
          <view>
            <text>暂未上传音频介绍</text>
            <text>后台配置音频 URL 后，这里会显示播放按钮。</text>
          </view>
        </view>
      </view>

      <view v-if="player" class="detail-card">
        <view class="card-title">个人简介</view>
        <view class="bio-text">{{ player.bio || '这个陪玩师还没有填写简介。' }}</view>
      </view>

      <view v-if="player" class="detail-card ratings-card">
        <view class="card-title-row">
          <view>
            <text class="card-title">老板评价</text>
            <text class="card-subtitle">真实订单完成后产生的服务评分</text>
          </view>
          <view class="rating-summary-pill">
            <text>★ {{ ratingSummary.rating_count ? ratingSummary.average_rating : '-' }}</text>
            <text>{{ ratingSummary.rating_count }}条</text>
          </view>
        </view>

        <view v-if="ratings.length" class="review-list">
          <view v-for="item in ratings" :key="item.id" class="review-item">
            <view class="review-head">
              <text class="review-stars">{{ starText(item.rating) }}</text>
              <text class="review-date">{{ formatReviewDate(item.created_at) }}</text>
            </view>
            <text class="review-comment">{{ item.comment || '老板未填写文字评价' }}</text>
            <text class="review-package">{{ item.package_name || '陪玩服务' }}</text>
          </view>
        </view>
        <view v-else class="review-empty">暂无评价，完成首个订单后这里会展示真实反馈。</view>
      </view>

      <view v-if="player" class="detail-card tips-card">
        <view class="card-title">下单提醒</view>
        <view class="tip-list">
          <view class="tip-item"><text></text><text>如需指定该陪玩师，请下单前先联系客服确认是否可接单。</text></view>
          <view class="tip-item"><text></text><text>陪玩师在线状态仅供参考，具体排期以客服确认结果为准。</text></view>
        </view>
      </view>

      <view v-if="!player && loaded" class="empty-state">
        <text>陪玩师不存在或已下架</text>
        <button @tap="goBack">返回</button>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

    <view v-if="player" class="bottom-bar">
      <button class="back-btn" @tap="goBack">返回列表</button>
      <button class="order-btn" @tap="goOrder">去点单</button>
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

const playerId = ref<number | null>(null)
const player = ref<OnlinePlayer | null>(null)
const ratingData = ref<PlayerRatingsResult | null>(null)
const loaded = ref(false)
const isPlaying = ref(false)
let audioContext: UniApp.InnerAudioContext | null = null

const ratings = computed<PlayerRatingItem[]>(() => ratingData.value?.results || [])
const ratingSummary = computed(() => ratingData.value?.summary || {
  average_rating: Number(player.value?.avg_rating || 0),
  rating_count: Number(player.value?.rating_count || 0),
  total_orders: Number(player.value?.total_orders || 0)
})

function normalizeOnlineValue(value: unknown) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function normalizePlayer(p: OnlinePlayer): OnlinePlayer {
  return {
    ...p,
    is_online: normalizeOnlineValue(p.is_online),
    type_name: p.player_type?.name || p.type_name || '优质陪玩',
    price_extra: p.player_type?.price_extra || p.price_extra || 0,
    status: normalizeOnlineValue(p.is_online) ? '在线' : '离线'
  }
}

function formatMoney(value: number) {
  return Number.isInteger(value) ? `${value}` : Number(value || 0).toFixed(1)
}

function starText(value: number) {
  const count = Math.max(1, Math.min(5, Number(value || 0)))
  return `${'★'.repeat(count)}${'☆'.repeat(5 - count)}`
}

function formatReviewDate(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function fetchPlayer() {
  loaded.value = false
  ratingData.value = null
  try {
    const list = await getPlayerList()
    const matched = (list || []).map(normalizePlayer).find(item => Number(item.id) === Number(playerId.value)) || null
    player.value = matched
    if (matched) {
      try {
        ratingData.value = await getPublicPlayerRatings(matched.id)
      } catch {
        ratingData.value = null
      }
    }
  } catch (error) {
    toast('陪玩详情加载失败')
    player.value = null
  } finally {
    loaded.value = true
  }
}

function getAudioContext() {
  if (!player.value?.audio_intro_url) return null
  if (!audioContext) {
    audioContext = uni.createInnerAudioContext()
    audioContext.autoplay = false
    audioContext.src = player.value.audio_intro_url
    audioContext.onPlay(() => { isPlaying.value = true })
    audioContext.onPause(() => { isPlaying.value = false })
    audioContext.onStop(() => { isPlaying.value = false })
    audioContext.onEnded(() => { isPlaying.value = false })
    audioContext.onError(() => {
      isPlaying.value = false
      toast('音频播放失败，请检查音频地址')
    })
  }
  return audioContext
}

function toggleAudio() {
  const context = getAudioContext()
  if (!context) {
    toast('暂无音频介绍')
    return
  }
  if (isPlaying.value) {
    context.pause()
  } else {
    context.play()
  }
}

function goBack() {
  uni.navigateBack({ delta: 1 })
}

function goOrder() {
  goMain('order')
}

onLoad((query) => {
  const id = Number(query?.playerId)
  playerId.value = Number.isFinite(id) ? id : null
  fetchPlayer()
})

onBeforeUnmount(() => {
  if (audioContext) {
    audioContext.stop()
    audioContext.destroy()
    audioContext = null
  }
})
</script>

<style lang="scss" scoped>
.player-detail-page {
  min-height: 100vh;
  background: #f7f3ea;
  color: #172116;
}

.detail-scroll {
  height: 100vh;
}

.profile-hero {
  position: relative;
  margin: 24rpx;
  padding: 30rpx;
  overflow: hidden;
  border-radius: 34rpx;
  background: linear-gradient(135deg, #fff, #eef8e7);
  box-shadow: 0 14rpx 30rpx rgba(39, 61, 42, 0.08);
  box-sizing: border-box;
}

.hero-bg {
  position: absolute;
  right: -90rpx;
  top: -90rpx;
  width: 260rpx;
  height: 260rpx;
  border-radius: 50%;
  background: rgba(47, 155, 99, 0.10);
}

.profile-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 22rpx;
}

.avatar-wrap {
  width: 132rpx;
  height: 132rpx;
  flex-shrink: 0;
  border-radius: 34rpx;
  overflow: hidden;
  background: linear-gradient(135deg, #65c980, #1f7c4b);
}

.avatar {
  width: 100%;
  height: 100%;
}

.avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 52rpx;
  font-weight: 900;
}

.profile-main {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.player-name {
  flex: 1;
  min-width: 0;
  color: #172116;
  font-size: 40rpx;
  font-weight: 900;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.status-pill {
  flex-shrink: 0;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  color: #1f7c4b;
  font-size: 23rpx;
  font-weight: 900;
  background: #ecf8ef;
}

.status-pill.off {
  color: #99a198;
  background: rgba(42, 63, 48, 0.06);
}

.type-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}

.type-row text {
  padding: 7rpx 14rpx;
  border-radius: 999rpx;
  color: #687665;
  font-size: 23rpx;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.72);
}

.stats-row {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
  margin-top: 28rpx;
}

.stat-item {
  padding: 18rpx 10rpx;
  border-radius: 20rpx;
  text-align: center;
  background: rgba(255, 255, 255, 0.82);
}

.stat-item text:first-child {
  display: block;
  color: #a87520;
  font-size: 30rpx;
  font-weight: 900;
}

.stat-item text:last-child {
  display: block;
  margin-top: 6rpx;
  color: #687665;
  font-size: 22rpx;
}

.detail-card {
  margin: 22rpx 24rpx 0;
  padding: 26rpx;
  border-radius: 28rpx;
  background: #fff;
  box-shadow: 0 12rpx 28rpx rgba(39, 61, 42, 0.06);
  box-sizing: border-box;
}

.card-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.card-title {
  display: block;
  color: #172116;
  font-size: 31rpx;
  font-weight: 900;
}

.card-subtitle {
  display: block;
  margin-top: 8rpx;
  color: #8a9286;
  font-size: 23rpx;
}

.audio-ready {
  flex-shrink: 0;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  color: #1f7c4b;
  font-size: 22rpx;
  font-weight: 900;
  background: #eef8f1;
}

.audio-player {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-top: 24rpx;
  padding: 22rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #f7faf4, #fffaf0);
}

.play-btn {
  width: 112rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  border-radius: 999rpx;
  color: #fff;
  font-size: 26rpx;
  font-weight: 900;
  background: linear-gradient(135deg, #2f9b63, #1f7c4b);
}

.play-btn::after {
  border: none;
}

.audio-main {
  flex: 1;
  min-width: 0;
}

.audio-title {
  color: #172116;
  font-size: 27rpx;
  font-weight: 900;
}

.audio-url {
  margin-top: 8rpx;
  color: #687665;
  font-size: 23rpx;
}

.audio-empty {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-top: 24rpx;
  padding: 22rpx;
  border-radius: 22rpx;
  background: #f7faf4;
}

.audio-empty-icon {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fff;
}

.audio-empty text {
  display: block;
}

.audio-empty text:first-child {
  color: #172116;
  font-size: 26rpx;
  font-weight: 900;
}

.audio-empty text:last-child {
  margin-top: 6rpx;
  color: #8a9286;
  font-size: 22rpx;
}

.bio-text {
  margin-top: 18rpx;
  color: #687665;
  font-size: 26rpx;
  line-height: 1.65;
}

.rating-summary-pill {
  flex-shrink: 0;
  padding: 10rpx 16rpx;
  border-radius: 18rpx;
  text-align: right;
  background: #fff7df;
}

.rating-summary-pill text {
  display: block;
}

.rating-summary-pill text:first-child {
  color: #a87520;
  font-size: 26rpx;
  font-weight: 900;
}

.rating-summary-pill text:last-child {
  margin-top: 4rpx;
  color: #8a9286;
  font-size: 20rpx;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 22rpx;
}

.review-item {
  padding: 20rpx;
  border-radius: 20rpx;
  background: #f7faf4;
  border: 1rpx solid rgba(39, 61, 42, 0.06);
}

.review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.review-stars {
  color: #e1ac3f;
  font-size: 27rpx;
  letter-spacing: 2rpx;
}

.review-date {
  color: #9aa197;
  font-size: 21rpx;
}

.review-comment {
  display: block;
  margin-top: 12rpx;
  color: #39423a;
  font-size: 25rpx;
  line-height: 1.55;
}

.review-package {
  display: block;
  margin-top: 10rpx;
  color: #8a9286;
  font-size: 21rpx;
}

.review-empty {
  margin-top: 22rpx;
  padding: 28rpx 20rpx;
  border-radius: 20rpx;
  color: #8a9286;
  font-size: 24rpx;
  text-align: center;
  background: #f7faf4;
}

.tip-list {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.tip-item {
  display: flex;
  gap: 12rpx;
  color: #687665;
  font-size: 24rpx;
  line-height: 1.55;
}

.tip-item text:first-child {
  width: 10rpx;
  height: 10rpx;
  flex-shrink: 0;
  margin-top: 14rpx;
  border-radius: 50%;
  background: #2f9b63;
}

.tip-item text:last-child {
  flex: 1;
}

.empty-state {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  color: #687665;
  font-size: 28rpx;
}

.empty-state button {
  min-width: 180rpx;
  height: 70rpx;
  line-height: 70rpx;
  border-radius: 999rpx;
  color: #fff;
  background: #2f9b63;
}

.empty-state button::after {
  border: none;
}

.bottom-space {
  height: calc(140rpx + env(safe-area-inset-bottom));
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -10rpx 30rpx rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

.back-btn,
.order-btn {
  flex: 1;
  height: 82rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24rpx;
  margin: 0;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 900;
}

.back-btn::after,
.order-btn::after {
  border: none;
}

.back-btn {
  color: #2f9b63;
  background: #eef8f1;
}

.order-btn {
  color: #fff;
  background: linear-gradient(135deg, #2f9b63, #1f7c4b);
}
</style>
