<template>
  <view :style="$appThemeStyle" class="ranking-page">
    <view class="ranking-heading">
      <text class="heading-title">排行榜</text>
      <view class="heading-emblem"><view class="emblem-bar bar-short" /><view class="emblem-bar bar-tall" /><view class="emblem-bar bar-middle" /></view>
    </view>
    <view class="board-tabs">
      <button v-for="tab in boards" :key="tab.value" class="board-tab" :class="{ active: board === tab.value }" :aria-pressed="board === tab.value" :data-action="`board-${tab.value}`" @tap="selectBoard(tab.value)">
        <text class="board-title">{{ tab.label }}</text>
      </button>
    </view>
    <view class="ranking-card">
      <view class="period-tabs">
        <button v-for="tab in periods" :key="tab.value" class="period-tab" :class="{ active: period === tab.value }" :aria-pressed="period === tab.value" :data-action="`period-${tab.value}`" @tap="selectPeriod(tab.value)">{{ tab.label }}</button>
      </view>
      <view v-if="status === 'loading'" class="state" data-action="loading"><view class="state-mark">榜</view><text class="state-title">榜单加载中</text></view>
      <view v-else-if="status === 'error'" class="state" data-action="error"><view class="state-mark">榜</view><text class="state-title">暂时没能加载榜单</text><button class="retry-button" data-action="retry" @tap="load">重新加载</button></view>
      <view v-else-if="status === 'unavailable'" class="state" data-action="unavailable"><view class="state-mark">榜</view><text class="state-title">榜单暂未开放</text></view>
      <view v-else-if="!items.length" class="state" data-action="empty"><view class="state-mark">榜</view><text class="state-title">本期暂无上榜记录</text></view>
      <view v-else class="ranking-list">
        <view class="list-heading"><text class="rank-column">名次</text><text class="name-column">{{ board === 'boss' ? '老板' : '陪玩' }}</text><text>{{ board === 'boss' ? '消费钻石' : '接单量' }}</text></view>
        <view v-for="item in items" :key="item.id" class="ranking-row" :class="{ 'leading-row': item.rank <= 3 }" data-action="ranking-row">
          <text class="rank-number" :class="`rank-${item.rank}`">{{ item.rank < 10 ? `0${item.rank}` : item.rank }}</text>
          <image v-if="item.avatar_url && !failedImages[item.id]" class="ranking-avatar" :src="item.avatar_url" mode="aspectFill" :data-action="`avatar-${item.id}`" @error="failedImages[item.id] = true" />
          <view v-else class="ranking-avatar avatar-fallback">{{ item.name.slice(0, 1) }}</view>
          <text class="ranking-name">{{ item.name }}</text><view class="ranking-value"><text class="value-number">{{ formatValue(item.value) }}</text><text class="value-unit">{{ board === 'boss' ? '钻石' : '单' }}</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getRankings, type RankingBoard, type RankingPeriod, type RankingResult } from '@/api/rankings'
const boards: { value: RankingBoard; label: string }[] = [{ value: 'boss', label: '老板贡献榜' }, { value: 'player', label: '陪玩接单榜' }]
const periods: { value: RankingPeriod; label: string }[] = [{ value: 'day', label: '日榜' }, { value: 'week', label: '周榜' }, { value: 'month', label: '月榜' }]
const board = ref<RankingBoard>('boss'), period = ref<RankingPeriod>('day')
const status = ref<'loading' | 'error' | 'unavailable' | 'ready'>('loading'), result = ref<RankingResult | null>(null)
const failedImages = ref<Record<string, boolean>>({})
const items = computed(() => result.value?.available ? result.value.results : [])
let visible = false, generation = 0
function formatValue(value: number) { return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',') }
async function load() {
  if (!visible) return
  const ticket = ++generation, requestedBoard = board.value, requestedPeriod = period.value
  status.value = 'loading'; result.value = null; failedImages.value = {}
  try {
    const data = await getRankings(requestedBoard, requestedPeriod)
    if (!visible || ticket !== generation) return
    result.value = data; status.value = data.available ? 'ready' : 'unavailable'
  } catch { if (visible && ticket === generation) status.value = 'error' }
}
function selectBoard(value: RankingBoard) { if (value === board.value) return; board.value = value; return load() }
function selectPeriod(value: RankingPeriod) { if (value === period.value) return; period.value = value; return load() }
function hide() { visible = false; generation++ }
onShow(() => { visible = true; return load() })
onHide(hide); onUnload(hide); onBeforeUnmount(hide)
</script>

<style scoped>
.ranking-page { min-height: 100vh; padding: 30rpx 26rpx calc(48rpx + env(safe-area-inset-bottom)); background: var(--app-page-bg, var(--ui-soft, #f7f9fc)); color: var(--ui-text, #253b2f); box-sizing: border-box; }
.ranking-heading { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; padding: 14rpx 6rpx 34rpx; }
.heading-title { display: block; font-size: 34rpx; font-weight: 800; line-height: 1.5; }
.heading-emblem { display: flex; align-items: flex-end; justify-content: center; gap: 7rpx; flex-shrink: 0; width: 80rpx; height: 76rpx; transform: rotate(-8deg); }
.emblem-bar { width: 18rpx; border-radius: 5rpx 5rpx 2rpx 2rpx; background: var(--ui-primary, #1f7c4b); }
.bar-short { height: 35rpx; opacity: .35; }.bar-tall { height: 66rpx; }.bar-middle { height: 48rpx; opacity: .65; }
.board-tabs { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.board-tab { flex: 1; min-width: 0; margin: 0; padding: 24rpx 12rpx; border-radius: 22rpx; border: 1rpx solid var(--ui-line, #e2e7da); background: var(--ui-surface, #fffefa); color: var(--ui-muted, #61725e); line-height: 1.5; text-align: center; }
.board-tab.active { background: var(--ui-primary, #1f7c4b); color: #fffefa; border-color: var(--ui-accent-line, #1f7c4b); }
.board-tab::after, .period-tab::after, .retry-button::after { border: 0; }
.board-title { display: block; font-size: 29rpx; font-weight: 800; }
.ranking-card { padding: 24rpx 20rpx 12rpx; border: 1rpx solid var(--ui-line, #e8ecdf); border-radius: 26rpx; background: var(--ui-surface, #fffefa); }
.period-tabs { display: flex; gap: 8rpx; padding: 6rpx; border-radius: 18rpx; background: var(--ui-soft, #f0f2e9); }
.period-tab { flex: 1; min-width: 0; margin: 0; padding: 16rpx 8rpx; border-radius: 14rpx; background: transparent; color: var(--ui-muted, #6c7c68); font-size: 26rpx; line-height: 1.4; }
.period-tab.active { background: var(--ui-surface, #fffefa); color: var(--ui-accent, #1f7c4b); box-shadow: 0 3rpx 12rpx #24442e0a; font-weight: 800; }
.state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 65rpx 10rpx 90rpx; min-height: 260rpx; }
.state-mark { display: flex; justify-content: center; align-items: center; width: 100rpx; height: 100rpx; background: var(--ui-soft, #edf4e8); border: 9rpx solid var(--ui-line, #f6f8f0); border-radius: 30rpx; color: var(--ui-muted, #77a77b); font-size: 42rpx; font-weight: 800; transform: rotate(-6deg); }
.state-title { margin-top: 28rpx; color: var(--ui-muted, #486046); font-size: 29rpx; font-weight: 700; }
.retry-button { margin: 28rpx 0 0; padding: 16rpx 38rpx; border-radius: 32rpx; color: #fffefa; background: var(--ui-primary, #1f7c4b); font-size: 25rpx; line-height: 1.4; }
.list-heading { display: flex; align-items: center; gap: 12rpx; padding: 26rpx 8rpx 15rpx; color: var(--ui-muted, #89947f); font-size: 21rpx; }.rank-column { width: 54rpx; flex-shrink: 0; }.name-column { flex: 1; }
.ranking-row { display: flex; align-items: center; gap: 16rpx; padding: 27rpx 8rpx; border-bottom: 1rpx solid var(--ui-line, #edf0e8); }.leading-row { background: linear-gradient(90deg, var(--ui-soft, #f6f8ee), var(--ui-surface, #fffefa)); }
.rank-number { width: 46rpx; flex-shrink: 0; font-size: 28rpx; color: var(--ui-muted, #8f9a85); font-weight: 800; font-style: italic; }.rank-1 { color: var(--ui-gold, #bf923a); }.rank-2 { color: var(--ui-muted, #78919a); }.rank-3 { color: var(--ui-gold, #a58260); }
.ranking-avatar { width: 76rpx; height: 76rpx; border-radius: 50%; flex-shrink: 0; background: var(--ui-soft, #eef4e8); }.avatar-fallback { display: flex; align-items: center; justify-content: center; color: var(--ui-muted, #528654); font-size: 30rpx; font-weight: 700; }
.ranking-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 27rpx; font-weight: 700; }.ranking-value { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; max-width: 210rpx; }.value-number { color: var(--ui-accent, #1f7c4b); font-size: 28rpx; font-weight: 800; overflow-wrap: anywhere; }.value-unit { margin-top: 4rpx; color: var(--ui-muted, #8a9681); font-size: 20rpx; }
</style>
