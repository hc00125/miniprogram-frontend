<template>
  <view class="vip-card" :class="`vip-card--${vipTheme}`" data-section="vip-summary">
    <view class="vip-head">
      <view><text class="vip-title">{{ vipName }}</text></view>
      <text class="vip-spend">成长钻石 💎{{ diamond(growthDiamonds) }}</text>
    </view>
    <view class="vip-progress-track">
      <view class="vip-progress-bar" :style="{ width: `${vipProgress}%` }"></view>
    </view>
    <view class="vip-progress-text">
      <text v-if="nextVipName">距离{{ nextVipName }}还差 💎{{ diamond(vipRemainingDiamonds) }}</text>
      <text v-else>已达到当前最高头衔</text>
      <text>{{ vipProgress }}%</text>
    </view>
    <view v-if="vipBenefits.length" class="vip-benefits">
      <text v-for="benefit in vipBenefits" :key="benefit">{{ benefit }}</text>
    </view>
    <view class="vip-actions">
      <view class="vip-action" data-action="growth-records" role="button" @tap.stop="goGrowthRecords">
        <text>累计钻石记录</text><text>›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ClientProfile } from '@/utils/client'
import { formatDiamonds } from '@/utils/diamonds'
import { go } from '@/utils/nav'

const props = defineProps<{ profile: ClientProfile }>()
const growthDiamonds = computed(() => Number(props.profile.vip?.growth_diamonds ?? props.profile.cumulative_consumption_diamonds ?? 0))
const vipName = computed(() => props.profile.vip?.current_tier?.name || '鼠鼠')
const vipTheme = computed(() => props.profile.vip?.current_tier?.badge_color || 'mouse')
const vipProgress = computed(() => Math.max(0, Math.min(100, Number(props.profile.vip?.progress_percent || 0))))
const vipRemainingDiamonds = computed(() => Number(props.profile.vip?.remaining_growth_diamonds || 0))
const nextVipName = computed(() => props.profile.vip?.next_tier?.name || '')
const vipBenefits = computed(() => props.profile.vip?.current_tier?.benefits || [])

function diamond(value: unknown) {
  try { return formatDiamonds(value ?? 0) } catch { return '--' }
}
function goGrowthRecords() { go('/pages/client/growth-records/index') }
</script>

<style scoped>
.vip-card { margin-top: 22rpx; padding: 28rpx; border-radius: 30rpx; color: #fff; background: var(--ui-gradient); box-shadow: 0 18rpx 40rpx var(--ui-shadow, rgba(23,52,38,.16)); }
.vip-card--mouse { background: linear-gradient(135deg,var(--ui-soft, #59655b),var(--ui-soft, #26372d)); }
.vip-card--bronze { color: #fff8eb; background: linear-gradient(135deg,#8b5a2b,#c68b52); }
.vip-card--silver { color: var(--ui-text, #24302d); background: linear-gradient(135deg,var(--ui-soft, #f7f9f8),var(--ui-accent-soft, #cfd8d5)); }
.vip-card--gold { color: var(--ui-gold, #3b2a0e); background: linear-gradient(135deg,var(--ui-soft, #fff4ce),#d8a144); }
.vip-card--platinum { color: var(--ui-text, #26383c); background: linear-gradient(135deg,var(--ui-soft, #f5fbfc),var(--ui-soft, #a9c8cf)); }
.vip-card--emerald { background: var(--ui-gradient); }
.vip-card--diamond { color: var(--ui-text, #123447); background: linear-gradient(135deg,var(--ui-soft, #f4fdff),#74d7ef 58%,var(--ui-soft, #b7a8ff)); }
.vip-card--glory { background: linear-gradient(135deg,#4c174e,#b43779 58%,#f0a85d); }
.vip-card--brilliant { color: var(--ui-text, #301d4a); background: linear-gradient(135deg,var(--ui-surface, #fff0fb),var(--ui-soft, #d39cff) 48%,#79e5e0); }
.vip-card--dream { background: linear-gradient(135deg,#392762,#7d5bd7 52%,var(--ui-soft, #e388c7)); }
.vip-card--elegant { color: var(--ui-text, #472439); background: linear-gradient(135deg,var(--ui-surface, #fff0f5),var(--ui-soft, #f2a9cc) 50%,#e9c56d); }
.vip-card--supreme { background: linear-gradient(135deg,#090909,#38230d 58%,#d8a144); box-shadow: 0 18rpx 46rpx var(--ui-shadow, rgba(23,15,5,.28)); }
.vip-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20rpx; }
.vip-head text { display: block; }
.vip-title { font-size: 38rpx; font-weight: 900; }
.vip-spend { font-size: 22rpx; font-weight: 900; }
.vip-progress-track { height: 12rpx; margin-top: 25rpx; overflow: hidden; border-radius: 999rpx; background: rgba(255,255,255,.18); }
.vip-progress-bar { height: 100%; border-radius: inherit; background: linear-gradient(90deg,var(--ui-gold-soft, #f7dda0),#d8a144); }
.vip-progress-text { margin-top: 14rpx; display: flex; justify-content: space-between; gap: 20rpx; font-size: 22rpx; opacity: .82; }
.vip-benefits { margin-top: 18rpx; display: flex; flex-wrap: wrap; gap: 10rpx; }
.vip-benefits text { padding: 8rpx 14rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 900; background: rgba(255,255,255,.12); }
.vip-actions { margin-top: 18rpx; padding-top: 16rpx; border-top: 1rpx solid var(--ui-line, rgba(255,255,255,.14)); }
.vip-action { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 12rpx 16rpx; border-radius: 999rpx; font-size: 22rpx; font-weight: 900; background: rgba(255,255,255,.12); }
.vip-action text:last-child { font-size: 30rpx; line-height: 1; }
</style>
