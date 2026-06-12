<template>
  <view class="main-bottom-tabs">
    <view
      v-for="item in tabs"
      :key="item.key"
      class="main-bottom-tabs__item"
      :class="{ active: active === item.key }"
      @tap="emit('select', item.key)"
    >
      <text class="main-bottom-tabs__icon">{{ item.icon }}</text>
      <text class="main-bottom-tabs__label">{{ item.label }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { MainTab } from '@/utils/nav'

defineProps<{
  active: MainTab
}>()

const emit = defineEmits<{
  select: [tab: MainTab]
}>()

const tabs: { key: MainTab; label: string; icon: string }[] = [
  { key: 'home', label: '首页', icon: '⌂' },
  { key: 'order', label: '点单', icon: '+' },
  { key: 'query', label: '订单', icon: '≡' },
  { key: 'players', label: '陪玩', icon: '◇' },
  { key: 'profile', label: '我的', icon: '○' }
]
</script>

<style lang="scss">
:host {
  position: fixed;
  left: 16rpx;
  right: 16rpx;
  bottom: 14rpx;
  z-index: 22;
  display: block;
  height: calc(104rpx + env(safe-area-inset-bottom));
}

.main-bottom-tabs {
  width: 100%;
  height: calc(104rpx + env(safe-area-inset-bottom));
  padding: 10rpx 18rpx calc(10rpx + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(36, 55, 39, 0.08);
  border-radius: 32rpx;
  box-shadow: 0 -8rpx 34rpx rgba(39, 61, 42, 0.12);
}

.main-bottom-tabs__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5rpx;
  color: #7c847d;
  font-size: 21rpx;
}

.main-bottom-tabs__item.active {
  color: #2f9b63;
  font-weight: 900;
}

.main-bottom-tabs__item.active .main-bottom-tabs__icon {
  color: #fff;
  background: linear-gradient(135deg, #65c980, #1f7c4b);
}

.main-bottom-tabs__icon {
  width: 44rpx;
  height: 44rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 29rpx;
  line-height: 1;
}

.main-bottom-tabs__label {
  line-height: 1.15;
}
</style>
