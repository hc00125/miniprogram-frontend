<template>
  <view class="announcements" data-section="announcements">
    <view v-for="card in cards" :key="card.kind" class="announcement-card" :class="card.kind" :data-action="`open-${card.kind}`" @tap="open(card.kind)">
      <view class="announcement-heading"><text class="announcement-icon">{{ card.kind === 'patronage' ? '👑' : '🎁' }}</text><text class="announcement-title">{{ card.title }}</text><text class="announcement-arrow">›</text></view>
      <swiper v-if="feeds[card.kind].items.length && !feeds[card.kind].error" class="announcement-swiper" vertical circular :autoplay="active && feeds[card.kind].items.length > 1" :interval="4500" :duration="400">
        <swiper-item v-for="item in feeds[card.kind].items" :key="item.id"><view class="announcement-line">{{ item.text }}</view></swiper-item>
      </swiper>
      <text v-else class="announcement-placeholder">{{ feeds[card.kind].error ? '加载失败，点击重试' : feeds[card.kind].loading ? '通报加载中…' : '暂无通报' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, watch, onBeforeUnmount } from 'vue'
import { getAnnouncements, type Announcement, type AnnouncementKind } from '@/api/announcements'
import { go } from '@/utils/nav'
const props = defineProps<{ active: boolean }>()
const cards: { kind: AnnouncementKind; title: string }[] = [{ kind: 'patronage', title: '冠名通报' }, { kind: 'gift', title: '礼物通报' }]
const feeds = reactive<Record<AnnouncementKind, { items: Announcement[]; loading: boolean; error: boolean }>>({
  patronage: { items: [], loading: false, error: false }, gift: { items: [], loading: false, error: false }
})
let generation = 0
let timer: ReturnType<typeof setTimeout> | undefined
function stop() { generation++; if (timer !== undefined) clearTimeout(timer); timer = undefined }
async function refresh(ticket: number) {
  await Promise.all(cards.map(card => load(card.kind, ticket)))
  if (props.active && ticket === generation) timer = setTimeout(() => { timer = undefined; void refresh(ticket) }, 30000)
}
async function load(kind: AnnouncementKind, ticket = generation) {
  feeds[kind].loading = true; feeds[kind].error = false
  try { const result = await getAnnouncements(kind, 1, 10); if (props.active && ticket === generation) feeds[kind].items = result.results }
  catch { if (props.active && ticket === generation) feeds[kind].error = true }
  finally { if (props.active && ticket === generation) feeds[kind].loading = false }
}
function open(kind: AnnouncementKind) {
  if (feeds[kind].error) { if (!feeds[kind].loading) void load(kind); return }
  go('/pages/client/announcements/index', { kind })
}
watch(() => props.active, active => { stop(); if (active) void refresh(generation) }, { immediate: true, flush: 'sync' })
onBeforeUnmount(stop)
</script>

<style scoped>
.announcements { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16rpx; margin-top: 22rpx; }
.announcement-card { min-width: 0; padding: 22rpx 20rpx; border: 1rpx solid #e5ebe2; border-radius: 22rpx; background: #fffefa; box-sizing: border-box; }
.announcement-heading { display: flex; align-items: center; gap: 10rpx; }
.announcement-icon { color: #1f7c4b; font-size: 34rpx; line-height: 1; }
.patronage .announcement-icon { color: #bd923d; }
.announcement-title { flex: 1; color: #253b2f; font-size: 26rpx; font-weight: 700; }
.announcement-arrow { color: #9ca693; font-size: 30rpx; }
.announcement-swiper { height: 36rpx; margin-top: 12rpx; }
.announcement-line, .announcement-placeholder { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #7c8877; font-size: 21rpx; line-height: 36rpx; }
.announcement-placeholder { margin-top: 12rpx; }
</style>
