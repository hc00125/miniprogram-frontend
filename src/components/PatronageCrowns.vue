<template>
  <view class="patronage-card">
    <view class="heading"><text class="title">TA 的冠名支持</text><button class="refresh" data-action="crowns-refresh" :disabled="loading" @tap="loadCrowns">刷新</button></view>
    <text class="hint">多人可同时冠名 · 不独占、不锁单</text>
    <text v-if="loading" class="empty">正在加载冠名…</text>
    <text v-else-if="error" class="empty">冠名暂时加载失败，可重试</text>
    <text v-else-if="!crowns.length" class="empty">暂无有效冠名</text>
    <view v-for="crown in crowns" :key="crown.id" class="crown-row">
      <image v-if="crown.boss_avatar_url" class="boss-avatar" :src="crown.boss_avatar_url" mode="aspectFill" />
      <view v-else class="boss-avatar placeholder">{{ crown.boss_name.slice(0, 1) || '冠' }}</view>
      <view class="crown-main"><text class="boss-name">{{ crown.boss_name }}</text><text class="hint">{{ crown.package_name }}<text v-if="crown.source === 'day_pass_bonus'"> · 包天赠送</text></text><text class="hint">到期 {{ displayExpiry(crown.expires_at) }}</text></view>
    </view>
    <button class="entry" data-action="patronage-entry" @tap="openPatronage">查看冠名 / 包天套餐 ›</button>
    <text class="hint footer-hint">购买尚未开放，可先了解套餐</text>
  </view>
</template>
<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getPatronageCrowns, type PatronageCrown } from '@/api/patronage'
import { go } from '@/utils/nav'
const props = defineProps<{ playerId: number }>()
const crowns = ref<PatronageCrown[]>([]), loading = ref(false), error = ref(false)
let generation = 0, visible = true
function displayExpiry(value: string) { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
async function loadCrowns() {
  const current = ++generation, id = props.playerId
  crowns.value = []; error.value = false
  if (!visible || !Number.isSafeInteger(id) || id <= 0) return
  loading.value = true
  try { const result = await getPatronageCrowns(id); if (visible && current === generation && id === props.playerId) crowns.value = result }
  catch { if (visible && current === generation) error.value = true }
  finally { if (current === generation) loading.value = false }
}
function hide() { visible = false; ++generation; crowns.value = []; loading.value = false }
function openPatronage() { if (Number.isSafeInteger(props.playerId) && props.playerId > 0) go('/pages/client/patronage/index', { playerId: props.playerId }) }
// The detail host is created after its player fetch, often after the page onShow.
watch(() => props.playerId, () => { if (visible) void loadCrowns() }, { immediate: true })
onShow(() => { visible = true; return loadCrowns() })
onHide(hide); onUnload(hide); onUnmounted(hide)
</script>
<style scoped>
.patronage-card{margin:24rpx;padding:28rpx;border-radius:30rpx;color:#172116;background:#fff;box-shadow:0 14rpx 30rpx rgba(39,61,42,.07)}.heading{display:flex;justify-content:space-between;align-items:center;gap:20rpx}.title{font-size:30rpx;font-weight:800}.hint{display:block;color:#687665;font-size:22rpx;line-height:1.6}.empty{display:block;margin:26rpx 0;color:#879083;font-size:25rpx}.crown-row{display:flex;align-items:center;gap:18rpx;margin-top:22rpx;padding:18rpx;border-radius:20rpx;background:#f7faf4}.boss-avatar{width:76rpx;height:76rpx;border-radius:22rpx;flex-shrink:0;background:#e4f2de}.placeholder{display:flex;align-items:center;justify-content:center;color:#1f7c4b;font-size:30rpx;font-weight:800}.crown-main{min-width:0}.boss-name{display:block;font-size:27rpx;font-weight:700;word-break:break-all}.refresh{display:flex;align-items:center;justify-content:center;min-height:64rpx;margin:0;padding:12rpx;color:#1f7c4b;background:transparent;font-size:23rpx}.entry{display:flex;align-items:center;justify-content:center;width:100%;min-height:80rpx;box-sizing:border-box;margin:24rpx 0 0;padding:18rpx 22rpx;border-radius:22rpx;color:#1f7c4b;background:#eef8e7;font-size:27rpx;font-weight:700}.footer-hint{margin-top:10rpx;text-align:center}button::after{border:0}
</style>
