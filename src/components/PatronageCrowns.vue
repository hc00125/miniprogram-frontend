<template>
  <view v-if="props.compact" class="crown-compact">
    <view v-if="crowns.length" class="crown-plaque" role="button" :aria-label="plaqueAriaLabel" data-action="crowns-toggle" @tap.stop="toggleRotation">
      <image class="plaque-crown" src="/icons/patronage/crown-gold.png" mode="aspectFit" aria-hidden="true" />
      <view class="crown-viewport">
        <view class="crown-track" :style="`animation-duration:${marqueeDuration}s;animation-play-state:${rotationPaused ? 'paused' : 'running'};`" aria-hidden="true">
          <view v-for="copy in tickerCopies" :key="copy" class="crown-copy">
            <view v-for="crown in crowns" :key="crown.id" class="plaque-line">
              <image v-if="crown.boss_avatar_url && !failedAvatars[crown.id]" class="plaque-avatar" :src="crown.boss_avatar_url" mode="aspectFill" @error="failedAvatars[crown.id] = true" />
              <view v-else class="plaque-avatar plaque-placeholder">{{ crown.boss_name.slice(0, 1) || '冠' }}</view>
              <text class="plaque-word">感谢 </text><text class="plaque-boss">{{ crown.boss_name }}</text><text class="plaque-word"> 老板冠名 · </text><text class="plaque-package">{{ crown.package_name }}</text><text class="plaque-word">，谢谢老板的支持，祝老板玩得开心！</text>
            </view>
          </view>
        </view>
      </view>
      <image class="rotation-icon" :src="rotationPaused ? '/icons/patronage/play-gold.png' : '/icons/patronage/pause-gold.png'" mode="aspectFit" aria-hidden="true" />
    </view>
    <text v-else-if="error" class="tag-error" data-action="crowns-retry" @tap.stop="loadCrowns">冠名加载失败，点击重试</text>
  </view>
  <view v-else class="patronage-card">
    <view class="heading"><text class="title">TA 的冠名支持</text><button class="refresh" data-action="crowns-refresh" :disabled="loading" @tap="loadCrowns">刷新</button></view>

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
const tickerCopies = [0, 1]
function thanksMessage(crown: PatronageCrown) { return `感谢 ${crown.boss_name} 老板冠名 · ${crown.package_name}，谢谢老板的支持，祝老板玩得开心！` }
// Both copies have the same content width. Moving by half the track produces a
// seamless leftward loop; a longer list gets more time so names stay readable.
const marqueeDuration = computed(() => Math.max(18, Math.ceil(crowns.value.reduce((length, crown) => length + thanksMessage(crown).length + 4, 0) / 2.2)))
const plaqueAriaLabel = computed(() => `${crowns.value.map(thanksMessage).join('；')}${crowns.value.length ? rotationPaused.value ? '。滚动已暂停，点击继续' : '。滚动中，点击暂停' : ''}`)
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
.crown-compact{min-width:0;width:100%}.crown-plaque{position:relative;height:62rpx;box-sizing:border-box;border:1rpx solid var(--ui-gold-line,#eadfcb);border-radius:14rpx;background:var(--ui-gold-soft,#fbf5e9);color:var(--ui-gold,#94651e);overflow:hidden}.plaque-crown{position:absolute;left:10rpx;top:50%;transform:translateY(-50%);width:24rpx;height:24rpx}.crown-viewport{position:absolute;left:40rpx;right:32rpx;top:0;height:60rpx;overflow:hidden}.crown-track{display:inline-flex;align-items:center;flex-wrap:nowrap;width:max-content;height:60rpx;white-space:nowrap;animation-name:crown-marquee;animation-timing-function:linear;animation-iteration-count:infinite}.crown-copy{display:flex;align-items:center;flex-shrink:0;white-space:nowrap}.plaque-line{display:flex;align-items:center;flex-shrink:0;gap:6rpx;height:60rpx;padding-right:40rpx;white-space:nowrap}.plaque-avatar{width:28rpx;height:28rpx;border-radius:50%;flex-shrink:0;background:var(--ui-gold-line,#eadfcb)}.plaque-placeholder{display:flex;align-items:center;justify-content:center;font-size:19rpx;font-weight:700;color:var(--ui-gold,#94651e)}.plaque-word{flex-shrink:0;font-size:20rpx;white-space:nowrap}.plaque-boss{flex-shrink:0;font-size:22rpx;font-weight:700;white-space:nowrap}.plaque-package{flex-shrink:0;font-size:20rpx;white-space:nowrap}.rotation-icon{position:absolute;right:10rpx;top:50%;transform:translateY(-50%);width:16rpx;height:16rpx}.tag-error{font-size:20rpx;color:var(--ui-muted,#687665)}
@keyframes crown-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.patronage-card{margin:24rpx;padding:28rpx;border-radius:30rpx;color:var(--ui-text, #172116);background:var(--ui-surface, #fff);box-shadow:0 14rpx 30rpx var(--ui-shadow, rgba(39,61,42,.07))}.heading{display:flex;justify-content:space-between;align-items:center;gap:20rpx}.title{font-size:30rpx;font-weight:800}.hint{display:block;color:var(--ui-muted, #687665);font-size:22rpx;line-height:1.6}.empty{display:block;margin:26rpx 0;color:var(--ui-muted, #879083);font-size:25rpx}.crown-row{display:flex;align-items:center;gap:18rpx;margin-top:18rpx;padding:18rpx 0;border-bottom:1rpx solid var(--ui-line, #e7eadf);background:transparent}.boss-avatar{width:76rpx;height:76rpx;border-radius:22rpx;flex-shrink:0;background:var(--ui-soft, #e4f2de)}.placeholder{display:flex;align-items:center;justify-content:center;color:var(--ui-accent, #1f7c4b);font-size:30rpx;font-weight:800}.crown-main{min-width:0}.boss-name{display:block;font-size:27rpx;font-weight:700;word-break:break-all}.refresh{display:flex;align-items:center;justify-content:center;min-height:64rpx;margin:0;padding:12rpx;color:var(--ui-accent, #1f7c4b);background:transparent;font-size:23rpx}.entry{display:flex;align-items:center;justify-content:center;width:100%;min-height:80rpx;box-sizing:border-box;margin:24rpx 0 0;padding:18rpx 22rpx;border-radius:22rpx;color:var(--ui-accent, #1f7c4b);background:var(--ui-soft, #eef8e7);font-size:27rpx;font-weight:700}button::after{border:0}
</style>
