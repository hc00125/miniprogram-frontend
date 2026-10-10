<template>
  <view :style="$appThemeStyle" class="announcement-page">
    <view class="page-heading"><text class="page-title">热门广播</text></view>
    <view class="feed-list">
      <view v-for="item in items" :key="item.id" class="record" data-action="record" @tap="openPlayer(item)">
        <view class="record-avatars">
          <image v-if="item.boss_avatar_url && !failedImages[`${item.id}:boss`]" class="avatar avatar-boss" :src="item.boss_avatar_url" mode="aspectFill" :data-action="`image-boss-${item.id}`" @error="failedImages[`${item.id}:boss`] = true" />
          <view v-else class="avatar avatar-boss avatar-fallback">{{ item.boss_name.slice(0, 1) }}</view>
          <image v-if="item.kind !== 'vip_upgrade' && item.player_avatar_url && !failedImages[`${item.id}:player`]" class="avatar avatar-player" :src="item.player_avatar_url" mode="aspectFill" :data-action="`image-player-${item.id}`" @error="failedImages[`${item.id}:player`] = true" />
          <view v-else-if="item.kind !== 'vip_upgrade'" class="avatar avatar-player avatar-fallback">{{ item.player_name.slice(0, 1) }}</view>
        </view>
        <view class="record-body">
          <view v-if="item.kind === 'gift'" class="record-names"><text class="boss-name">{{ item.boss_name }}</text><text class="record-verb">送</text><text class="player-name">{{ item.player_name }}</text></view>
          <text v-else class="record-patronage">{{ item.text }}</text>
          <view class="record-item"><text class="item-name">{{ item.item_name }}</text><text v-if="item.kind === 'gift'" class="item-quantity">×{{ item.quantity }}</text><text v-else class="kind-tag">老板升级</text></view>
          <text class="record-time">{{ formatTime(item.occurred_at) }}</text>
        </view>
        <view class="record-art">
          <image v-if="item.item_image_url && !failedImages[`${item.id}:item`]" class="item-image" :src="item.item_image_url" mode="aspectFit" :data-action="`image-item-${item.id}`" @error="failedImages[`${item.id}:item`] = true" />
          <view v-else class="item-placeholder">{{ item.kind === 'gift' ? '礼物' : '升级' }}</view>
        </view>
      </view>
    </view>
    <view v-if="error" class="empty" data-action="retry" @tap="loadNext">加载失败，点击重试</view>
    <view v-else-if="loading" class="empty">通报加载中…</view>
    <view v-else-if="!items.length" class="empty">暂无通报</view>
    <button v-else-if="hasMore" class="more" data-action="more" @tap="loadNext">查看更多</button>
    <text v-else class="end">已展示全部通报</text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getAnnouncements, type Announcement, type AnnouncementFilter } from '@/api/announcements'
import { go } from '@/utils/nav'
const kind = ref<AnnouncementFilter>('popular'), items = ref<Announcement[]>([])
const count = ref(0), loading = ref(false), error = ref(false)
const page = ref(0), failedImages = ref<Record<string, boolean>>({})
let generation = 0, visible = false
const hasMore = computed(() => page.value * 20 < count.value)
function formatTime(value: string) {
  const d = new Date(value), pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function openPlayer(item: Announcement) { if (item.kind === 'gift') go('/pages/player/detail/index', { playerId: item.player_id }) }
async function loadNext() {
  if (!visible || loading.value) return
  const ticket = generation, requestedKind = kind.value, next = page.value + 1
  loading.value = true; error.value = false
  try {
    const result = await getAnnouncements(requestedKind, next)
    if (!visible || generation !== ticket || kind.value !== requestedKind) return
    const merged = new Map(items.value.map(item => [item.id, item]))
    result.results.forEach(item => merged.set(item.id, item))
    items.value = Array.from(merged.values()); count.value = result.count; page.value = next
  } catch { if (visible && generation === ticket) error.value = true }
  finally { if (visible && generation === ticket) loading.value = false }
}
function reset() { generation++; page.value = 0; count.value = 0; items.value = []; failedImages.value = {}; loading.value = false; error.value = false }
function hide() { visible = false; generation++; loading.value = false }
onLoad(() => { uni.setNavigationBarTitle({ title: '热门广播' }) })
onShow(() => { visible = true; reset(); return loadNext() })
onHide(hide)
onUnload(hide)
</script>

<style scoped>
.announcement-page { min-height: 100vh; padding: 28rpx 24rpx calc(40rpx + env(safe-area-inset-bottom)); background: var(--ui-soft, #f7f5ee); box-sizing: border-box; }
.page-heading { display: flex; flex-direction: column; gap: 10rpx; margin: 10rpx 4rpx 26rpx; }
.page-title { color: var(--ui-text, #253b2f); font-size: 36rpx; font-weight: 800; }
.more::after { border: 0; }
.feed-list { overflow: hidden; border-radius: 24rpx; background: var(--ui-surface, #fffefa); }
.record { display: flex; align-items: center; gap: 18rpx; padding: 28rpx 20rpx; border-bottom: 1rpx solid var(--ui-line, #edf0e8); }
.record:last-child { border-bottom: 0; }
.record-avatars { position: relative; width: 108rpx; height: 92rpx; flex-shrink: 0; }
.avatar { position: absolute; width: 66rpx; height: 66rpx; border-radius: 50%; border: 3rpx solid var(--ui-line, #fffefa); background: var(--ui-soft, #eef9ef); box-sizing: border-box; }
.avatar-boss { top: 0; left: 0; }
.avatar-player { bottom: 0; right: 0; }
.avatar-fallback { display: flex; align-items: center; justify-content: center; color: var(--ui-accent, #1f7c4b); font-size: 25rpx; font-weight: 700; }
.record-body { flex: 1; min-width: 0; }
.record-names { display: flex; align-items: baseline; gap: 8rpx; font-size: 25rpx; line-height: 1.6; }
.boss-name, .player-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; color: var(--ui-text, #253b2f); }
.player-name { color: var(--ui-accent, #1f7c4b); }
.record-verb { flex-shrink: 0; color: var(--ui-muted, #929985); font-size: 22rpx; }
.record-patronage { display: block; color: var(--ui-text, #253b2f); font-size: 25rpx; line-height: 1.6; overflow-wrap: anywhere; }
.record-item { display: flex; flex-wrap: wrap; align-items: center; gap: 8rpx; margin-top: 8rpx; color: var(--ui-accent, #1f7c4b); font-size: 24rpx; line-height: 1.5; }
.item-name { overflow-wrap: anywhere; }
.item-quantity { font-weight: 700; }
.kind-tag { padding: 2rpx 8rpx; border-radius: 8rpx; background: var(--ui-soft, #eef9ef); font-size: 19rpx; }
.record-time { display: block; margin-top: 10rpx; color: var(--ui-muted, #929985); font-size: 20rpx; }
.record-art { width: 88rpx; flex-shrink: 0; }
.item-image { display: block; width: 88rpx; height: 88rpx; }
.item-placeholder { display: flex; align-items: center; justify-content: center; width: 88rpx; height: 88rpx; border-radius: 20rpx; background: var(--ui-soft, #eef9ef); color: var(--ui-muted, #6d866e); font-size: 23rpx; }
.empty, .end { display: block; padding: 44rpx 20rpx; text-align: center; color: var(--ui-muted, #929985); font-size: 25rpx; }
.more { display: flex; width: 100%; min-height: 84rpx; align-items: center; justify-content: center; margin-top: 24rpx; padding: 22rpx; border-radius: 42rpx; box-sizing: border-box; color: var(--ui-accent, #1f7c4b); background: var(--ui-soft, #eef9ef); font-size: 26rpx; }
</style>
