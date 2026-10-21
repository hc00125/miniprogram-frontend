<template>
  <view class="announcements" data-section="announcements">
    <view v-for="card in cards" :key="card.kind" class="announcement-card" :class="card.kind" :data-action="`open-${card.kind}`" role="button" :aria-label="`${card.title}，查看全部记录`" @tap="open(card.kind)">
      <view class="announcement-heading"><text class="announcement-title">{{ card.title }}</text></view>
      <swiper v-if="feeds[card.kind].items.length && !feeds[card.kind].error" class="announcement-swiper" vertical circular :autoplay="active && feeds[card.kind].items.length > 1" :interval="4500" :duration="400">
        <swiper-item v-for="item in feeds[card.kind].items" :key="item.id">
          <view class="announcement-line" :aria-label="item.text">
            <view class="announcement-avatars">
              <image v-if="item.boss_avatar_url && !failedImages[`${item.id}:boss`]" class="announcement-avatar avatar-boss" :src="item.boss_avatar_url" mode="aspectFill" :data-action="`image-boss-${item.id}`" @error="failedImages[`${item.id}:boss`] = true" />
              <view v-else class="announcement-avatar avatar-boss avatar-fallback">{{ item.boss_name.slice(0, 1) }}</view>
              <image v-if="item.kind !== 'vip_upgrade' && item.player_avatar_url && !failedImages[`${item.id}:player`]" class="announcement-avatar avatar-player" :src="item.player_avatar_url" mode="aspectFill" :data-action="`image-player-${item.id}`" @error="failedImages[`${item.id}:player`] = true" />
              <view v-else-if="item.kind !== 'vip_upgrade'" class="announcement-avatar avatar-player avatar-fallback">{{ item.player_name.slice(0, 1) }}</view>
            </view>
            <view class="announcement-copy">
              <view v-if="item.kind !== 'vip_upgrade'" class="announcement-names"><text class="announcement-name">{{ item.boss_name }}</text><text class="announcement-verb">{{ item.kind === 'gift' ? '送给' : '为' }}</text><text class="announcement-name recipient-name">{{ item.player_name }}</text></view>
              <view v-else class="announcement-names"><text class="announcement-name">{{ item.boss_name }}</text><text class="announcement-verb">升级了</text></view>
              <view v-if="item.kind === 'vip_upgrade'" class="announcement-detail">{{ item.from_tier_name }} → {{ item.to_tier_name }}</view>
              <view v-else class="announcement-detail"><text v-if="item.kind === 'patronage'" class="announcement-verb">开通</text><text class="announcement-item">{{ item.item_name }}</text><text v-if="item.kind === 'gift'" class="announcement-quantity">×{{ item.quantity }}</text></view>
            </view>
            <image v-if="item.item_image_url && !failedImages[`${item.id}:item`]" class="announcement-art" :src="item.item_image_url" mode="aspectFit" :data-action="`image-item-${item.id}`" @error="failedImages[`${item.id}:item`] = true" />
            <view v-else class="announcement-art art-fallback">{{ item.kind === 'gift' ? '礼' : item.kind === 'vip_upgrade' ? '升' : '冠' }}</view>
          </view>
        </swiper-item>
      </swiper>
      <text v-else class="announcement-placeholder">{{ feeds[card.kind].error ? '加载失败，点击重试' : feeds[card.kind].loading ? '通报加载中…' : '暂无通报' }}</text>
      <text class="announcement-arrow">›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, watch, onBeforeUnmount } from 'vue'
import { getAnnouncements, type Announcement } from '@/api/announcements'
type CardKind = 'gift' | 'patronage'
import { go } from '@/utils/nav'
const props = defineProps<{ active: boolean }>()
const cards: { kind: CardKind; title: string }[] = [{ kind: 'gift', title: '热门广播' }, { kind: 'patronage', title: '冠名通报' }]
const failedImages = reactive<Record<string, boolean>>({})
const feeds = reactive<Record<CardKind, { items: Announcement[]; loading: boolean; error: boolean }>>({
  patronage: { items: [], loading: false, error: false }, gift: { items: [], loading: false, error: false }
})
let generation = 0
let timer: ReturnType<typeof setTimeout> | undefined
function stop() { generation++; if (timer !== undefined) clearTimeout(timer); timer = undefined }
async function refresh(ticket: number) {
  await Promise.all(cards.map(card => load(card.kind, ticket)))
  if (props.active && ticket === generation) timer = setTimeout(() => { timer = undefined; void refresh(ticket) }, 30000)
}
async function load(kind: CardKind, ticket = generation) {
  feeds[kind].loading = true; feeds[kind].error = false
  try {
    const result = await getAnnouncements(kind === 'gift' ? 'popular' : kind, 1, 10)
    if (props.active && ticket === generation) {
      feeds[kind].items = result.results
      // Keep image failures bounded to the current two feeds, and retry them on refresh.
      Object.keys(failedImages).filter(key => key.startsWith(`${kind}:`) || (kind === 'gift' && key.startsWith('vip_upgrade:'))).forEach(key => delete failedImages[key])
    }
  }
  catch { if (props.active && ticket === generation) feeds[kind].error = true }
  finally { if (props.active && ticket === generation) feeds[kind].loading = false }
}
function open(kind: CardKind) {
  if (feeds[kind].error) { if (!feeds[kind].loading) void load(kind); return }
  go(kind === 'patronage' ? '/pages/client/patronage-announcements/index' : '/pages/client/popular-announcements/index')
}
watch(() => props.active, active => { stop(); if (active) void refresh(generation) }, { immediate: true, flush: 'sync' })
onBeforeUnmount(stop)
</script>

<style scoped>
.announcements { display: flex; flex-direction: column; gap: 28rpx; margin-top: 34rpx; }
.announcement-card { position: relative; min-width: 0; padding: 20rpx 38rpx 12rpx 18rpx; border: 1rpx solid var(--ui-line); border-radius: 20rpx; background: var(--ui-surface); box-sizing: border-box; }
.announcement-card.patronage { border-color: var(--ui-line); background: var(--ui-surface); }
.announcement-heading { position: static; display: flex; align-items: center; margin-bottom: 8rpx; background: transparent; color: var(--ui-text); }
.patronage .announcement-heading { color: var(--ui-gold); }
.announcement-title { font-size: 24rpx; font-weight: 800; line-height: 1.3; letter-spacing: 1rpx; }
.announcement-arrow { position: absolute; right: 13rpx; top: 50%; color: var(--ui-muted, #548067); font-size: 34rpx; line-height: 1; transform: translateY(-20%); }
.patronage .announcement-arrow { color: var(--ui-gold, #956b28); }
.announcement-swiper { position: relative; z-index: 1; height: 94rpx; }
.announcement-line { display: flex; align-items: center; gap: 14rpx; height: 94rpx; }
.announcement-avatars { position: relative; flex-shrink: 0; width: 94rpx; height: 72rpx; }
.announcement-avatar { position: absolute; width: 62rpx; height: 62rpx; border: 3rpx solid var(--ui-line, #f6fbf2); border-radius: 50%; background: var(--ui-soft, #dcecdc); box-sizing: border-box; }
.avatar-boss { top: 0; left: 0; }
.avatar-player { bottom: 0; right: 0; }
.avatar-fallback { display: flex; align-items: center; justify-content: center; color: var(--ui-accent, #2c6849); font-size: 25rpx; font-weight: 700; }
.announcement-copy { flex: 1; min-width: 0; }
.announcement-names, .announcement-detail { display: flex; align-items: center; gap: 8rpx; line-height: 1.5; }
.announcement-names { color: var(--ui-text, #243b2d); font-size: 26rpx; font-weight: 700; }
.announcement-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recipient-name { color: var(--ui-accent, #1f7049); }
.announcement-verb { flex-shrink: 0; color: var(--ui-muted, #607664); font-size: 22rpx; font-weight: 400; }
.announcement-detail { margin-top: 5rpx; color: var(--ui-accent, #277249); font-size: 25rpx; }
.patronage .announcement-detail { color: var(--ui-gold, #8b6527); }
.announcement-item { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.announcement-quantity { flex-shrink: 0; font-weight: 800; }
.announcement-art { flex-shrink: 0; width: 66rpx; height: 66rpx; }
.art-fallback { display: flex; align-items: center; justify-content: center; width: 54rpx; height: 54rpx; margin: 6rpx; border: 1rpx solid var(--ui-accent-line, rgba(39,114,73,.18)); border-radius: 16rpx; color: var(--ui-accent, #417653); background: var(--ui-surface); font-size: 26rpx; }
.patronage .art-fallback { border-color: var(--ui-gold-line, #e7d6af); color: var(--ui-gold, #956b28); }
.announcement-placeholder { display: flex; align-items: center; height: 94rpx; color: var(--ui-muted, #647566); font-size: 25rpx; }
</style>
