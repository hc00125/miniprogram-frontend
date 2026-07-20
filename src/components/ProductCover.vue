<template>
  <view class="product-cover" :class="[`product-cover--${theme}`, { 'product-cover--empty': !image }]">
    <image v-if="image" class="product-cover__image" :src="image" mode="aspectFill" />
    <view class="product-cover__shade"></view>
    <view class="product-cover__brand">偷吃电竞 <text>TOUCHI</text></view>
    <view class="product-cover__content">
      <text v-if="badge" class="product-cover__badge">{{ badge }}</text>
      <text class="product-cover__title">{{ title }}</text>
      <text class="product-cover__summary">{{ summary || '平台保障 · 快速匹配 · 服务留痕' }}</text>
    </view>
    <text v-if="soldText" class="product-cover__sold">{{ soldText }}</text>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  image?: string
  title: string
  summary?: string
  badge?: string
  soldText?: string
  theme?: 'green' | 'gold' | 'rose' | 'blue' | string
}>(), {
  image: '',
  summary: '',
  badge: '',
  soldText: '',
  theme: 'green'
})
</script>

<style lang="scss" scoped>
.product-cover { position: relative; width: 100%; aspect-ratio: 1 / 1; overflow: hidden; border-radius: 24rpx; color: #fff; background: linear-gradient(145deg,#173426,#2f9b63); }
.product-cover--gold { background: linear-gradient(145deg,#3c2b0e,#d8a144); }
.product-cover--rose { background: linear-gradient(145deg,#5a1f2b,#e65f75); }
.product-cover--blue { background: linear-gradient(145deg,#16374d,#4b91be); }
.product-cover__image { position: absolute; inset: 0; width: 100%; height: 100%; }
.product-cover__shade { position: absolute; inset: 0; background: linear-gradient(180deg,rgba(10,20,14,.06) 15%,rgba(8,18,12,.18) 45%,rgba(8,18,12,.88) 100%); }
.product-cover--empty .product-cover__shade { background: radial-gradient(circle at 80% 20%,rgba(255,255,255,.16),transparent 34%),linear-gradient(180deg,transparent,rgba(0,0,0,.30)); }
.product-cover__brand { position: absolute; top: 20rpx; left: 20rpx; font-size: 20rpx; font-weight: 900; letter-spacing: 2rpx; text-shadow: 0 3rpx 10rpx rgba(0,0,0,.32); }
.product-cover__brand text { margin-left: 7rpx; opacity: .62; font-size: 16rpx; }
.product-cover__content { position: absolute; left: 20rpx; right: 20rpx; bottom: 22rpx; display: flex; flex-direction: column; align-items: flex-start; }
.product-cover__badge { margin-bottom: 9rpx; padding: 6rpx 12rpx; border-radius: 999rpx; color: #173426; background: #f3d79b; font-size: 18rpx; font-weight: 900; }
.product-cover__title { max-width: 100%; overflow: hidden; font-size: 31rpx; font-weight: 900; line-height: 1.18; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 3rpx 12rpx rgba(0,0,0,.36); }
.product-cover__summary { display: -webkit-box; margin-top: 8rpx; overflow: hidden; opacity: .82; font-size: 19rpx; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.product-cover__sold { position: absolute; top: 18rpx; right: 18rpx; padding: 6rpx 11rpx; border-radius: 999rpx; background: rgba(0,0,0,.28); backdrop-filter: blur(8rpx); font-size: 17rpx; font-weight: 800; }
</style>
