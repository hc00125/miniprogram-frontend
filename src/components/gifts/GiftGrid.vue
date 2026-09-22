<template>
  <view v-if="!items.length" class="gift-empty">{{ emptyText }}</view>
  <view v-else class="gift-grid">
    <button v-for="item in items" :key="item.code" class="gift-item" :class="{ 'gift-item--selected': selectedCode === item.code }" :aria-label="item.name + '，' + item.price_diamonds + '钻石'" @tap="emit('select', item)">
      <image v-if="item.image_url && !failedImages[item.image_url]" class="gift-image" :src="item.image_url" mode="aspectFit" @error="failedImages[item.image_url] = true" />
      <view v-else class="gift-image gift-placeholder">暂无图片</view>
      <text class="gift-name">{{ item.name }}</text>
      <text class="gift-price">{{ item.price_diamonds }} 钻石</text>
    </button>
  </view>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { GiftCatalogItem } from '@/api/gifts'
withDefaults(defineProps<{ items: GiftCatalogItem[]; selectedCode?: string; emptyText?: string }>(), {
  selectedCode: '', emptyText: '暂无可选礼物'
})
const emit = defineEmits<{ (event: 'select', item: GiftCatalogItem): void }>()
const failedImages = reactive<Record<string, boolean>>({})
</script>

<style scoped>
.gift-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16rpx; }
.gift-item { display: flex; flex-direction: column; align-items: center; width: 100%; min-height: 220rpx; margin: 0; padding: 16rpx 8rpx; box-sizing: border-box; border: 2rpx solid transparent; border-radius: 24rpx; background: #fff; line-height: 1.5; }
.gift-item::after { border: 0; }
.gift-item--selected { border-color: #2f9b63; background: #eef9ef; }
.gift-image { width: 112rpx; height: 112rpx; }
.gift-placeholder { display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #687665; background: #f7f3ea; border-radius: 18rpx; }
.gift-name { width: 100%; color: #172116; font-size: 25rpx; overflow-wrap: anywhere; }
.gift-price { font-size: 23rpx; color: #1f7c4b; }
.gift-empty { padding: 72rpx 20rpx; text-align: center; color: #687665; font-size: 26rpx; }
</style>
