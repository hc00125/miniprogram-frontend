<template>
  <view class="cart-page">
    <scroll-view scroll-y class="cart-scroll">
      <view class="cart-header">
        <view>
          <text class="cart-title">购物车</text>
          <text class="cart-subtitle">已加入 {{ cartCount }} 件商品</text>
        </view>
        <button v-if="items.length" class="clear-btn" @tap="handleClearCart">清空</button>
      </view>

      <view v-if="items.length" class="cart-list">
        <view v-for="item in items" :key="item.id" class="cart-card">
          <image v-if="item.image_url" class="cart-image" :src="item.image_url" mode="aspectFill" />
          <view v-else class="cart-image cart-image--placeholder">
            <text>{{ item.package_name.slice(0, 1) }}</text>
          </view>

          <view class="cart-main">
            <view class="cart-name-row">
              <text class="cart-name">{{ item.package_name }}</text>
              <text v-if="item.group_name" class="cart-tag">{{ item.group_name }}</text>
            </view>
            <text v-if="item.spec_display_name || item.spec_name" class="cart-spec">已选：{{ item.spec_display_name || item.spec_name }}</text>
            <text v-if="item.description" class="cart-desc">{{ item.description }}</text>
            <view class="cart-bottom">
              <view class="cart-price">
                <text>¥</text>
                <text>{{ formatMoney(item.price) }}</text>
              </view>
              <view class="stepper">
                <button class="step-btn" @tap="adjustQuantity(item, -1)">−</button>
                <text class="step-value">{{ item.quantity }}</text>
                <button class="step-btn plus" @tap="adjustQuantity(item, 1)">＋</button>
              </view>
            </view>
          </view>

          <view class="card-actions">
            <button class="remove-btn" @tap="removeItem(item.id)">删除</button>
            <button class="buy-btn" @tap="checkoutItem(item)">去下单</button>
          </view>
        </view>
      </view>

      <view v-else class="empty-state">
        <view class="empty-icon">🛒</view>
        <text class="empty-title">购物车还是空的</text>
        <text class="empty-desc">先去挑选一个套餐或规格吧</text>
        <button class="shop-btn" @tap="goShop">去点单</button>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <view v-if="items.length" class="bottom-bar">
      <view class="total-box">
        <text>合计</text>
        <view>
          <text>¥</text>
          <text>{{ formatMoney(totalPrice) }}</text>
        </view>
      </view>
      <button class="bottom-shop-btn" @tap="goShop">继续选购</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { clearShopCart, getShopCart, removeShopCartItem, updateShopCartItemQuantity, type ShopCartItem } from '@/utils/shopCart'
import { go, goMain } from '@/utils/nav'
import { success, toast } from '@/utils/feedback'

const items = ref<ShopCartItem[]>([])
const cartCount = computed(() => items.value.reduce((sum, item) => sum + Number(item.quantity || 1), 0))
const totalPrice = computed(() => items.value.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0))

function refreshCart() {
  items.value = getShopCart()
}

function formatMoney(value: number) {
  return Number.isInteger(value) ? `${value}` : Number(value || 0).toFixed(2)
}

function adjustQuantity(item: ShopCartItem, delta: number) {
  const next = Number(item.quantity || 1) + delta
  if (next <= 0) {
    removeItem(item.id)
    return
  }
  items.value = updateShopCartItemQuantity(item.id, next)
}

function removeItem(id: string) {
  items.value = removeShopCartItem(id)
  toast('已删除')
}

function handleClearCart() {
  uni.showModal({
    title: '清空购物车',
    content: '确定要清空购物车吗？',
    confirmColor: '#ef4f5f',
    success: (res) => {
      if (!res.confirm) return
      clearShopCart()
      refreshCart()
      success('已清空')
    }
  })
}

function checkoutItem(item: ShopCartItem) {
  go('/pages/shop/checkout/index', {
    packageId: item.package_id,
    specId: item.spec_id || undefined
  })
}

function goShop() {
  goMain('order')
}

onShow(refreshCart)
</script>

<style lang="scss" scoped>
.cart-page { min-height: 100vh; background: #f7f7f7; color: #222; }
.cart-scroll { height: 100vh; }
.cart-header { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 24rpx 10rpx; box-sizing: border-box; }
.cart-title { display: block; color: #222; font-size: 42rpx; font-weight: 900; }
.cart-subtitle { display: block; margin-top: 8rpx; color: #888; font-size: 24rpx; }
.clear-btn { min-width: 112rpx; height: 58rpx; display: flex; align-items: center; justify-content: center; padding: 0 22rpx; margin: 0; border-radius: 999rpx; color: #888; font-size: 24rpx; background: #fff; }
.clear-btn::after { border: none; }
.cart-list { padding: 0 22rpx; }
.cart-card { position: relative; display: flex; gap: 18rpx; margin-top: 20rpx; padding: 22rpx; border-radius: 22rpx; background: #fff; box-sizing: border-box; }
.cart-image { width: 148rpx; height: 148rpx; flex-shrink: 0; border-radius: 16rpx; background: #f0f0f0; }
.cart-image--placeholder { display: flex; align-items: center; justify-content: center; color: #20ff9a; font-size: 54rpx; font-weight: 900; background: linear-gradient(135deg, #2f2f20, #1f2118); }
.cart-main { min-width: 0; flex: 1; padding-right: 108rpx; }
.cart-name-row { display: flex; align-items: flex-start; gap: 12rpx; }
.cart-name { flex: 1; min-width: 0; color: #252525; font-size: 29rpx; font-weight: 900; line-height: 1.35; }
.cart-tag { flex-shrink: 0; padding: 5rpx 10rpx; border-radius: 999rpx; color: #ef4f5f; font-size: 20rpx; background: #fff1f3; }
.cart-spec { display: block; margin-top: 10rpx; color: #8b6a27; font-size: 23rpx; }
.cart-desc { display: block; margin-top: 8rpx; color: #888; font-size: 23rpx; line-height: 1.35; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.cart-bottom { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; margin-top: 18rpx; }
.cart-price { display: flex; align-items: baseline; color: #ef4f5f; }
.cart-price text:first-child { font-size: 22rpx; font-weight: 900; }
.cart-price text:last-child { margin-left: 4rpx; font-size: 36rpx; font-weight: 900; line-height: 1; }
.stepper { height: 58rpx; display: flex; align-items: center; border-radius: 999rpx; background: #f7f7f7; overflow: hidden; }
.step-btn { width: 58rpx; height: 58rpx; display: flex; align-items: center; justify-content: center; padding: 0; margin: 0; color: #777; font-size: 26rpx; background: transparent; }
.step-btn.plus { color: #ef4f5f; }
.step-btn::after { border: none; }
.step-value { min-width: 54rpx; text-align: center; color: #222; font-size: 25rpx; font-weight: 900; }
.card-actions { position: absolute; right: 22rpx; top: 22rpx; display: flex; flex-direction: column; gap: 12rpx; }
.remove-btn, .buy-btn { width: 92rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; padding: 0; margin: 0; border-radius: 999rpx; font-size: 22rpx; }
.remove-btn::after, .buy-btn::after { border: none; }
.remove-btn { color: #999; background: #f6f6f6; }
.buy-btn { color: #fff; background: linear-gradient(135deg, #ff7583, #ef3f51); }
.empty-state { min-height: 72vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 50rpx; text-align: center; box-sizing: border-box; }
.empty-icon { font-size: 88rpx; line-height: 1; }
.empty-title { margin-top: 24rpx; color: #333; font-size: 32rpx; font-weight: 900; }
.empty-desc { margin-top: 12rpx; color: #999; font-size: 25rpx; }
.shop-btn { margin-top: 32rpx; min-width: 210rpx; height: 78rpx; display: flex; align-items: center; justify-content: center; padding: 0 34rpx; border-radius: 999rpx; color: #fff; font-size: 28rpx; font-weight: 900; background: linear-gradient(135deg, #ff7583, #ef3f51); }
.shop-btn::after { border: none; }
.bottom-spacer { height: calc(130rpx + env(safe-area-inset-bottom)); }
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; align-items: center; gap: 18rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); background: #fff; box-shadow: 0 -10rpx 30rpx rgba(0, 0, 0, 0.08); box-sizing: border-box; }
.total-box { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.total-box > text { color: #888; font-size: 22rpx; }
.total-box view { display: flex; align-items: baseline; color: #ef4f5f; }
.total-box view text:first-child { font-size: 22rpx; font-weight: 900; }
.total-box view text:last-child { margin-left: 4rpx; font-size: 36rpx; font-weight: 900; }
.bottom-shop-btn { min-width: 210rpx; height: 82rpx; display: flex; align-items: center; justify-content: center; padding: 0 34rpx; margin: 0; border-radius: 999rpx; color: #fff; font-size: 29rpx; font-weight: 900; background: linear-gradient(135deg, #ffbd27, #ff9e00); }
.bottom-shop-btn::after { border: none; }
</style>
