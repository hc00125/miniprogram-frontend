<template>
  <view v-if="props.compact" class="crown-compact">
    <view v-if="crowns.length" class="crown-plaque" role="button" :aria-label="plaqueAriaLabel" data-action="crowns-toggle" @tap.stop="toggleRotation">
      <image class="plaque-crown" src="/icons/patronage/crown-gold.png" mode="aspectFit" aria-hidden="true" />
      <swiper class="crown-swiper" vertical circular :autoplay="!rotationPaused" :interval="3600" :duration="400">
        <swiper-item v-for="slide in plaqueSlides" :key="slide.key">
          <view class="plaque-line">
            <image v-if="slide.crown.boss_avatar_url && !failedAvatars[slide.crown.id]" class="plaque-avatar" :src="slide.crown.boss_avatar_url" mode="aspectFill" @error="failedAvatars[slide.crown.id] = true" />
            <view v-else class="plaque-avatar plaque-placeholder">{{ slide.crown.boss_name.slice(0, 1) || '冠' }}</view>
            <view class="plaque-message"><text v-if="slide.prefix" class="plaque-word plaque-prefix">{{ slide.prefix }}</text><text class="plaque-boss">{{ slide.crown.boss_name }}</text><text class="plaque-word plaque-suffix">{{ slide.suffix }}</text></view>
            <text class="plaque-package">{{ slide.crown.package_name }}</text>
          </view>
        </swiper-item>
      </swiper>
      <image class="rotation-icon" :src="rotationPaused ? '/icons/patronage/play-gold.png' : '/icons/patronage/pause-gold.png'" mode="aspectFit" aria-hidden="true" />
    </view>
    <text v-else-if="error" class="tag-error" data-action="crowns-retry" @tap.stop="loadCrowns">冠名加载失败，点击重试</text>
  </view>
  <view v-else class="patronage-card">
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
  </view>
</template>
<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getPatronageCrowns, type PatronageCrown } from '@/api/patronage'
import { go } from '@/utils/nav'
const props = defineProps<{ playerId: number; compact?: boolean }>()
const emit = defineEmits<{ (e: 'active-change', active: boolean): void }>()
const crowns = ref<PatronageCrown[]>([]), loading = ref(false), error = ref(false)
const rotationPaused = ref(false), failedAvatars = ref<Record<number, boolean>>({})
const plaqueSlides = computed(() => crowns.value.flatMap(crown => [
  { key: `${crown.id}-thanks`, crown, prefix: '感谢', suffix: '老板' },
  { key: `${crown.id}-support`, crown, prefix: '', suffix: '冠名支持' }
]))
const plaqueAriaLabel = computed(() => `冠名老板：${crowns.value.map(crown => `${crown.boss_name}，${crown.package_name}；感谢 ${crown.boss_name} 老板冠名`).join('；')}${crowns.value.length ? rotationPaused.value ? '。轮播已暂停，点击继续' : '。轮播中，点击暂停' : ''}`)
let generation = 0, visible = true
function displayExpiry(value: string) { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
function clearCrowns() { crowns.value = []; loading.value = false; error.value = false; rotationPaused.value = false; failedAvatars.value = {}; emit('active-change', false) }
function toggleRotation() { if (crowns.value.length) rotationPaused.value = !rotationPaused.value }
async function loadCrowns() {
  const current = ++generation, id = props.playerId
  clearCrowns()
  if (!visible || !Number.isSafeInteger(id) || id <= 0) return
  loading.value = true
  const isCurrent = () => visible && current === generation && id === props.playerId
  try { const result = await getPatronageCrowns(id); if (isCurrent()) { crowns.value = result; emit('active-change', result.length > 0) } }
  catch { if (isCurrent()) { error.value = true; emit('active-change', false) } }
  finally { if (current === generation) loading.value = false }
}
function hide() { visible = false; ++generation; clearCrowns() }
function openPatronage() { if (Number.isSafeInteger(props.playerId) && props.playerId > 0) go('/pages/client/patronage/index', { playerId: props.playerId }) }
// The detail host is created after its player fetch, often after the page onShow.
watch(() => props.playerId, () => { if (visible) void loadCrowns() }, { immediate: true })
onShow(() => { visible = true; return loadCrowns() })
onHide(hide); onUnload(hide); onUnmounted(hide)
</script>
<style scoped>
.crown-compact{min-width:0;width:100%}.crown-plaque{display:flex;align-items:center;gap:6rpx;height:62rpx;padding:0 10rpx;box-sizing:border-box;border:1rpx solid var(--ui-gold-line,#eadfcb);border-radius:14rpx;background:var(--ui-gold-soft,#fbf5e9);color:var(--ui-gold,#94651e);overflow:hidden}.plaque-crown{width:24rpx;height:24rpx;flex-shrink:0}.crown-swiper{flex:1;min-width:0;height:60rpx}.plaque-line{display:flex;align-items:center;gap:6rpx;width:100%;height:60rpx;min-width:0}.plaque-avatar{width:28rpx;height:28rpx;border-radius:50%;flex-shrink:0;background:var(--ui-gold-line,#eadfcb)}.plaque-placeholder{display:flex;align-items:center;justify-content:center;font-size:19rpx;font-weight:700;color:var(--ui-gold,#94651e)}.plaque-message{display:flex;align-items:center;flex:1;min-width:0;overflow:hidden}.plaque-word{flex-shrink:0;font-size:20rpx;white-space:nowrap}.plaque-prefix{margin-right:4rpx}.plaque-suffix{margin-left:4rpx}.plaque-boss{flex:1;min-width:0;font-size:22rpx;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.plaque-package{flex-shrink:0;max-width:30%;font-size:20rpx;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rotation-icon{width:16rpx;height:16rpx;flex-shrink:0}.tag-error{font-size:20rpx;color:var(--ui-muted,#687665)}
.patronage-card{margin:24rpx;padding:28rpx;border-radius:30rpx;color:var(--ui-text, #172116);background:var(--ui-surface, #fff);box-shadow:0 14rpx 30rpx var(--ui-shadow, rgba(39,61,42,.07))}.heading{display:flex;justify-content:space-between;align-items:center;gap:20rpx}.title{font-size:30rpx;font-weight:800}.hint{display:block;color:var(--ui-muted, #687665);font-size:22rpx;line-height:1.6}.empty{display:block;margin:26rpx 0;color:var(--ui-muted, #879083);font-size:25rpx}.crown-row{display:flex;align-items:center;gap:18rpx;margin-top:22rpx;padding:18rpx;border-radius:20rpx;background:var(--ui-soft, #f7faf4)}.boss-avatar{width:76rpx;height:76rpx;border-radius:22rpx;flex-shrink:0;background:var(--ui-soft, #e4f2de)}.placeholder{display:flex;align-items:center;justify-content:center;color:var(--ui-accent, #1f7c4b);font-size:30rpx;font-weight:800}.crown-main{min-width:0}.boss-name{display:block;font-size:27rpx;font-weight:700;word-break:break-all}.refresh{display:flex;align-items:center;justify-content:center;min-height:64rpx;margin:0;padding:12rpx;color:var(--ui-accent, #1f7c4b);background:transparent;font-size:23rpx}.entry{display:flex;align-items:center;justify-content:center;width:100%;min-height:80rpx;box-sizing:border-box;margin:24rpx 0 0;padding:18rpx 22rpx;border-radius:22rpx;color:var(--ui-accent, #1f7c4b);background:var(--ui-soft, #eef8e7);font-size:27rpx;font-weight:700}button::after{border:0}
</style>
