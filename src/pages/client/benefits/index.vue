<template>
  <view :style="$appThemeStyle" class="benefits-page">
    <view class="benefits-heading"><text class="benefits-title">常驻福利</text><text class="benefits-subtitle">偷吃电竞 · 福利专区</text></view>
    <view class="benefits-empty">
      <view class="benefits-emblem"><image :src="uiIcons.benefits" mode="aspectFit" /></view>
      <text class="empty-title">暂无福利内容</text>
      <text class="empty-note">敬请期待</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { uiIcons } from '@/utils/uiIcons'
</script>

<style scoped>
.benefits-page { min-height: 100vh; padding: 36rpx 28rpx; box-sizing: border-box; background: var(--app-page-bg, var(--ui-soft, #f7f9fc)); }
.benefits-heading { padding: 8rpx 6rpx 30rpx; }
.benefits-title, .benefits-subtitle, .empty-title, .empty-note { display: block; }
.benefits-title { color: var(--ui-text, #253b2f); font-size: 40rpx; font-weight: 800; }
.benefits-subtitle { margin-top: 12rpx; color: var(--ui-muted, #72808e); font-size: 25rpx; }
.benefits-empty { display: flex; flex-direction: column; align-items: center; padding: 100rpx 28rpx; border: 1rpx solid var(--ui-line, #e7ecf2); border-radius: 28rpx; background: var(--ui-surface, #fff); }
.benefits-emblem { display: flex; align-items: center; justify-content: center; width: 124rpx; height: 124rpx; border-radius: 38rpx; background: var(--ui-soft, #eef4f5); }
.benefits-emblem image { width: 66rpx; height: 66rpx; }
.empty-title { margin-top: 32rpx; color: var(--ui-text, #334350); font-size: 30rpx; font-weight: 600; }
.empty-note { margin-top: 14rpx; color: var(--ui-muted, #72808e); font-size: 25rpx; }
</style>
