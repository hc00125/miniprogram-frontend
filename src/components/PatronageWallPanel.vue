<template>
  <view :style="$appThemeStyle" class="patronage-wall-panel" :class="{ 'patronage-wall-panel--embedded': props.embedded }">
    <view class="wall-heading">
      <view class="heading-title"><image src="/icons/patronage/crown-gold.png" mode="aspectFit" aria-hidden="true" /><text>{{ props.embedded ? '冠名陪玩' : '冠名榜单' }}</text></view>
      <button class="refresh-button" data-action="refresh" :disabled="status === 'loading'" @tap="refresh">刷新</button>
    </view>
    <text v-if="entries.length" class="wall-count">{{ status === 'ready' ? '当前' : '已找到' }} {{ entries.length }} 位陪玩</text>
    <view v-if="status === 'loading' && !entries.length" class="wall-state" data-action="loading"><text>冠名榜单加载中</text><text v-if="progress.total" class="load-progress">{{ progress.completed }} / {{ progress.total }}</text></view>
    <view v-else-if="status === 'error' && !entries.length" class="wall-state" data-action="error"><text>暂时没能加载冠名榜单</text><button class="retry-button" data-action="retry" @tap="refresh">重新加载</button></view>
    <view v-else-if="status === 'ready' && !entries.length" class="wall-state" data-action="empty"><text>当前暂无有效冠名</text></view>
    <view v-if="status === 'loading' && entries.length" class="wall-notice" data-action="updating"><text>正在加载其余陪玩</text><text v-if="progress.total" class="load-progress">{{ progress.completed }} / {{ progress.total }}</text></view>
    <view v-if="status === 'error' && entries.length" class="wall-notice" data-action="partial-error"><text>部分陪玩未能加载</text><button class="retry-button" data-action="retry-partial" @tap="refresh">重新加载</button></view>
    <view v-if="entries.length" class="wall-list">
      <view v-for="entry in entries" :key="entry.player.id" class="wall-card" data-action="wall-card">
        <view class="player-head">
          <view class="avatar-wrap">
            <image class="avatar-crown" src="/icons/patronage/crown-gold.png" mode="aspectFit" aria-hidden="true" />
            <image v-if="entry.player.avatar_url && !failedImages[`player:${entry.player.id}`]" class="player-avatar" :src="entry.player.avatar_url" mode="aspectFill" :data-action="`player-avatar-${entry.player.id}`" @error="failedImages[`player:${entry.player.id}`] = true" />
            <view v-else class="player-avatar avatar-fallback">{{ entry.player.name?.slice(0, 1) || '陪' }}</view>
          </view>
          <view class="player-copy"><text class="player-name">{{ entry.player.name }}</text><text v-if="entry.player.type_name" class="player-type">{{ entry.player.type_name }}</text></view>
          <button class="service-button" :data-action="`service-${entry.player.id}`" @tap="openService(entry)">查看服务 ›</button>
        </view>
        <view class="crown-list">
          <view v-for="crown in entry.crowns" :key="crown.id" class="crown-tag">
            <image v-if="crown.boss_avatar_url && !failedImages[`boss:${entry.player.id}:${crown.id}`]" class="boss-avatar" :src="crown.boss_avatar_url" mode="aspectFill" :data-action="`boss-avatar-${entry.player.id}-${crown.id}`" @error="failedImages[`boss:${entry.player.id}:${crown.id}`] = true" />
            <text>{{ crown.boss_name }} · {{ crown.package_name }}</text>
          </view>
        </view>
        <button class="patronage-button" :data-action="`patronage-${entry.player.id}`" @tap="openPatronage(entry)">冠名/包天 ›</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { loadPatronageWall, type PatronageWallEntry } from '@/api/patronageWall'
import { go } from '@/utils/nav'
const props = defineProps<{ embedded?: boolean }>()
const entries = ref<PatronageWallEntry[]>([])
const status = ref<'loading' | 'error' | 'ready'>('loading')
const progress = ref({ completed: 0, total: 0 })
const failedImages = ref<Record<string, boolean>>({})
let visible = true, generation = 0, started = false, hasShown = false
async function load(forceRefresh = false) {
  if (!visible) return
  const ticket = ++generation
  const isCurrent = () => visible && ticket === generation
  entries.value = []; status.value = 'loading'; progress.value = { completed: 0, total: 0 }; failedImages.value = {}
  try {
    const result = await loadPatronageWall({
      isCurrent, forceRefresh,
      onProgress: (completed, total) => { if (isCurrent()) progress.value = { completed, total } },
      onUpdate: (partial, meta) => {
        if (!isCurrent()) return
        entries.value = partial
        progress.value = { completed: meta.completed, total: meta.total }
      }
    })
    if (isCurrent()) { entries.value = result; status.value = 'ready' }
  } catch { if (isCurrent()) status.value = 'error' }
}
function refresh() { return load(true) }
function show() {
  const firstShow = !hasShown
  hasShown = true
  if (firstShow && started && visible) return
  visible = true; started = true; return load()
}
function openService(entry: PatronageWallEntry) { go('/pages/player/detail/index', { playerId: entry.player.id }) }
function openPatronage(entry: PatronageWallEntry) { go('/pages/client/patronage/index', { playerId: entry.player.id }) }
function hide() { visible = false; generation++; entries.value = []; failedImages.value = {}; progress.value = { completed: 0, total: 0 } }
// Conditional ranking tabs may mount this component after the page's onShow.
// Mount must start its load; when onShow ran first it must not duplicate work.
onMounted(() => { if (!started) { started = true; void load() } })
onShow(show)
onHide(hide); onUnload(hide); onBeforeUnmount(hide)
</script>

<style scoped>

.patronage-wall-panel { min-height: 100vh; padding: 28rpx 24rpx calc(40rpx + env(safe-area-inset-bottom)); color: var(--ui-text, #253b2f); background: var(--app-page-bg, var(--ui-soft, #f7f9fc)); box-sizing: border-box; }
.wall-heading { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin: 0 4rpx 20rpx; }
.heading-title { display: flex; align-items: center; gap: 12rpx; min-width: 0; font-size: 36rpx; font-weight: 800; }
.heading-title image { width: 40rpx; height: 40rpx; flex-shrink: 0; }
.refresh-button, .service-button, .patronage-button, .retry-button { display: flex; align-items: center; justify-content: center; min-height: 88rpx; margin: 0; padding: 16rpx 24rpx; box-sizing: border-box; border-radius: 20rpx; font-size: 25rpx; line-height: 1.4; }
button::after { border: 0; }
.refresh-button { flex-shrink: 0; color: var(--ui-accent, #1f7c4b); background: var(--ui-surface, #fff); }
.refresh-button[disabled] { opacity: .55; }
.wall-count { display: block; margin: 0 4rpx 24rpx; color: var(--ui-muted, #61725e); font-size: 24rpx; }
.wall-list { display: flex; flex-direction: column; gap: 22rpx; }
.wall-card { padding: 30rpx 24rpx 20rpx; border: 1rpx solid var(--ui-gold, #94651e); border-radius: 28rpx; background: var(--ui-surface, #fff); box-shadow: 0 10rpx 24rpx var(--ui-shadow, rgba(39,61,42,.06)); min-width: 0; }
.player-head { display: flex; align-items: center; gap: 18rpx; min-width: 0; }
.avatar-wrap { position: relative; flex-shrink: 0; width: 96rpx; height: 96rpx; padding: 3rpx; border: 2rpx solid var(--ui-gold, #94651e); border-radius: 50%; box-sizing: border-box; }
.avatar-crown { position: absolute; top: -24rpx; left: 50%; width: 38rpx; height: 28rpx; transform: translateX(-50%); }
.player-avatar { display: block; width: 100%; height: 100%; border-radius: 50%; background: var(--ui-gold-soft, #fbf5e9); }
.avatar-fallback { display: flex; align-items: center; justify-content: center; color: var(--ui-gold, #94651e); font-size: 34rpx; font-weight: 700; }
.player-copy { flex: 1; min-width: 0; }
.player-name { display: block; font-size: 30rpx; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.player-type { display: block; margin-top: 9rpx; color: var(--ui-muted, #61725e); font-size: 23rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.service-button { flex-shrink: 0; max-width: 190rpx; padding: 16rpx 20rpx; color: var(--ui-on-primary, #fff); background: var(--ui-primary, #1f7c4b); white-space: nowrap; }
.crown-list { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 24rpx; }
.crown-tag { display: flex; align-items: center; gap: 8rpx; max-width: 100%; padding: 10rpx 14rpx; border: 1rpx solid var(--ui-gold-line, #eadfcb); border-radius: 14rpx; background: var(--ui-gold-soft, #fbf5e9); color: var(--ui-gold, #94651e); font-size: 23rpx; line-height: 1.5; box-sizing: border-box; }
.crown-tag text { min-width: 0; overflow-wrap: anywhere; }
.boss-avatar { width: 32rpx; height: 32rpx; flex-shrink: 0; border-radius: 50%; }
.patronage-button { width: 100%; margin-top: 16rpx; color: var(--ui-gold, #94651e); background: transparent; }
.wall-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 360rpx; padding: 60rpx 20rpx; border-radius: 28rpx; background: var(--ui-surface, #fff); color: var(--ui-muted, #61725e); text-align: center; font-size: 28rpx; }
.load-progress { margin-top: 18rpx; font-size: 24rpx; }
.retry-button { margin-top: 28rpx; color: var(--ui-on-primary, #fff); background: var(--ui-primary, #1f7c4b); }

.patronage-wall-panel--embedded { min-height: 0; padding: 0; background: transparent; }
.patronage-wall-panel--embedded .heading-title { font-size: 28rpx; }
.wall-notice { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-bottom: 20rpx; color: var(--ui-muted, #61725e); font-size: 23rpx; }
.wall-notice .load-progress { margin-top: 0; }
.wall-notice .retry-button { margin-top: 0; min-height: 64rpx; padding: 10rpx 20rpx; font-size: 23rpx; }
</style>
