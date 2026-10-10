<template>
  <view class="product-cover" :class="[`product-cover--${theme}`, { 'product-cover--empty': !image }]">
    <image
      v-for="request in imageRequests"
      :key="request.key"
      class="product-cover__image"
      :src="request.source"
      mode="aspectFill"
      :lazy-load="true"
      @load="handleImageLoad(request)"
      @error="handleImageError(request)"
    />
    <view class="product-cover__shade"></view>
    <view class="product-cover__brand">偷吃电竞 <text>TOUCHI</text></view>
    <view class="product-cover__content">
      <text v-if="badge" class="product-cover__badge">{{ badge }}</text>
      <text class="product-cover__title">{{ title }}</text>
      <text v-if="showSummary" class="product-cover__summary">{{ summary || '平台保障 · 快速匹配 · 服务留痕' }}</text>
    </view>
    <text v-if="soldText" class="product-cover__sold">{{ soldText }}</text>
    <view v-if="imageState === 'loading'" class="product-cover__status">图片加载中</view>
    <button v-else-if="imageState === 'failed'" class="product-cover__status product-cover__status--retry" @tap.stop="retryImage">
      <text>图片加载失败</text>
      <text class="product-cover__retry">点击重试</text>
    </button>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  image?: string
  title: string
  summary?: string
  showSummary?: boolean
  badge?: string
  soldText?: string
  theme?: 'green' | 'gold' | 'rose' | 'blue' | string
}>(), {
  image: '',
  summary: '',
  showSummary: true,
  badge: '',
  soldText: '',
  theme: 'green'
})

interface ImageRequest {
  key: number
  source: string
}

const imageState = ref<'empty' | 'loading' | 'ready' | 'failed'>('empty')
const imageRequest = ref<ImageRequest>({ key: 0, source: '' })
// Keep each image's event handlers tied to its own request, including after a retry.
const imageRequests = computed(() => imageRequest.value.source ? [imageRequest.value] : [])

function startImageRequest(source: string) {
  imageRequest.value = { key: imageRequest.value.key + 1, source }
  imageState.value = source ? 'loading' : 'empty'
}

function isCurrentRequest(request: ImageRequest) {
  return request.key === imageRequest.value.key && request.source === props.image
}

function handleImageLoad(request: ImageRequest) {
  if (isCurrentRequest(request)) imageState.value = 'ready'
}

function handleImageError(request: ImageRequest) {
  if (isCurrentRequest(request)) imageState.value = 'failed'
}

function retryImage() {
  startImageRequest(props.image)
}

watch(() => props.image, startImageRequest, { immediate: true, flush: 'sync' })
</script>

<style lang="scss" scoped>
.product-cover { position: relative; width: 100%; aspect-ratio: 1 / 1; overflow: hidden; border-radius: 24rpx; color: #fff; background: var(--ui-gradient); }
.product-cover--gold { background: linear-gradient(145deg,#3c2b0e,#d8a144); }
.product-cover--rose { background: linear-gradient(145deg,var(--ui-danger-fill, #5a1f2b),var(--ui-danger-fill, #e65f75)); }
.product-cover--blue { background: linear-gradient(145deg,#16374d,#4b91be); }
.product-cover__image { position: absolute; inset: 0; width: 100%; height: 100%; }
.product-cover__shade { position: absolute; inset: 0; background: linear-gradient(180deg,rgba(10,20,14,.06) 15%,rgba(8,18,12,.18) 45%,rgba(8,18,12,.88) 100%); }
.product-cover--empty .product-cover__shade { background: radial-gradient(circle at 80% 20%,rgba(255,255,255,.16),transparent 34%),linear-gradient(180deg,transparent,rgba(0,0,0,.30)); }
.product-cover__brand { position: absolute; top: 20rpx; left: 20rpx; font-size: 20rpx; font-weight: 900; letter-spacing: 2rpx; text-shadow: 0 3rpx 10rpx var(--ui-shadow, rgba(0,0,0,.32)); }
.product-cover__brand text { margin-left: 7rpx; opacity: .62; font-size: 16rpx; }
.product-cover__content { position: absolute; left: 20rpx; right: 20rpx; bottom: 22rpx; display: flex; flex-direction: column; align-items: flex-start; }
.product-cover__badge { margin-bottom: 9rpx; padding: 6rpx 12rpx; border-radius: 999rpx; color: var(--ui-text, #173426); background: var(--ui-gold-soft, #f3d79b); font-size: 18rpx; font-weight: 900; }
.product-cover__title { max-width: 100%; overflow: hidden; font-size: 31rpx; font-weight: 900; line-height: 1.18; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 3rpx 12rpx var(--ui-shadow, rgba(0,0,0,.36)); }
.product-cover__summary { display: -webkit-box; margin-top: 8rpx; overflow: hidden; opacity: .82; font-size: 19rpx; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.product-cover__sold { position: absolute; top: 18rpx; right: 18rpx; padding: 6rpx 11rpx; border-radius: 999rpx; background: rgba(0,0,0,.28); backdrop-filter: blur(8rpx); font-size: 17rpx; font-weight: 800; }
.product-cover__status { position: absolute; top: 44%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; justify-content: center; width: max-content; max-width: 88%; margin: 0; padding: 12rpx 16rpx; border-radius: 14rpx; color: #fff; background: rgba(0,0,0,.48); font-size: 20rpx; line-height: 1.5; text-align: center; white-space: nowrap; }
.product-cover__status--retry { border: 1rpx solid rgba(255,255,255,.32); }
.product-cover__status--retry::after { border: 0; }
.product-cover__retry { margin-top: 3rpx; font-weight: 900; }
</style>
