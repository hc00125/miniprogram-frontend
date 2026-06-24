<template>
  <view class="shop-detail-page">
    <scroll-view v-if="product" scroll-y class="detail-scroll">
      <view class="cover-wrap">
        <image class="cover-image" :src="productImage" mode="aspectFill" />
      </view>

      <view class="detail-card price-card">
        <view class="price-row">
          <view class="price-wrap">
            <text class="price-symbol">¥</text>
            <text class="price-value">{{ formatMoney(productPrice) }}</text>
            <text class="price-unit">/时</text>
          </view>
          <text class="sold-text">已售{{ soldCount }}件</text>
        </view>
        <text class="product-name">{{ product.name }}</text>
        <text class="product-desc">{{ product.description || '精选陪玩套餐，平台保障，快速匹配陪玩。' }}</text>
      </view>

      <view class="detail-card service-card">
        <view class="card-title">服务保障</view>
        <view class="service-grid">
          <view class="service-item">
            <text class="service-dot">✓</text>
            <text>平台保障</text>
          </view>
          <view class="service-item">
            <text class="service-dot">✓</text>
            <text>快速匹配</text>
          </view>
          <view class="service-item">
            <text class="service-dot">✓</text>
            <text>订单可查</text>
          </view>
        </view>
      </view>

      <view class="detail-card info-card">
        <view class="card-title">商品详情</view>
        <view class="info-row">
          <text class="info-label">商品分类</text>
          <text class="info-value">{{ product.group_name || '推荐套餐' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">默认人数</text>
          <text class="info-value">{{ product.player_count || 1 }}人</text>
        </view>
        <view class="info-row">
          <text class="info-label">计费方式</text>
          <text class="info-value">按小时计费</text>
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <view v-else class="empty-state">
      <text>{{ loading ? '商品加载中...' : '商品不存在' }}</text>
      <button v-if="!loading" class="back-btn" @tap="goBack">返回</button>
    </view>

    <view v-if="product" class="bottom-bar">
      <view class="bottom-price">
        <text>合计</text>
        <text>¥{{ formatMoney(productPrice) }}</text>
      </view>
      <button class="cart-action" @tap="handleCartTap">购物车</button>
      <button class="buy-action" @tap="handleBuyTap">立即下单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getPackages, type BossPackage } from '@/api/boss'
import { getErrorMessage, toast } from '@/utils/feedback'
import { go } from '@/utils/nav'

const fallbackImage = '/static/images/home-redesign/hero-lounge.jpg'
const packageId = ref<number | null>(null)
const loading = ref(false)
const product = ref<BossPackage | null>(null)

const productImage = computed(() => product.value ? getProductImage(product.value) : fallbackImage)
const productPrice = computed(() => product.value ? getProductPrice(product.value) : 0)
const soldCount = computed(() => product.value ? getSoldCount(product.value) : 0)

function getProductImage(item: BossPackage) {
  const productItem = item as BossPackage & Record<string, any>
  return productItem.cover_url || productItem.image_url || productItem.thumb_url || productItem.picture_url || fallbackImage
}

function getProductPrice(item: BossPackage) {
  const productItem = item as BossPackage & Record<string, any>
  return Number(productItem.price ?? productItem.base_price ?? 0)
}

function getSoldCount(item: BossPackage) {
  const productItem = item as BossPackage & Record<string, any>
  return Number(productItem.sold_count ?? productItem.sales_count ?? productItem.sales ?? productItem.order_count ?? 0)
}

function formatMoney(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2)
}

async function fetchProduct() {
  if (!packageId.value) return
  loading.value = true
  try {
    const list = await getPackages()
    product.value = list.find(item => item.id === packageId.value) || null
  } catch (error) {
    toast(getErrorMessage(error, '商品详情加载失败'))
  } finally {
    loading.value = false
  }
}

function handleCartTap() {
  toast('第一阶段暂不做复杂购物车')
}

function handleBuyTap() {
  if (!product.value) return
  toast('已为你打开原点单页，下一阶段接入规格下单')
  go('/pages/boss/order/index', { packageId: product.value.id })
}

function goBack() {
  uni.navigateBack({ delta: 1 })
}

onLoad((query) => {
  const id = Number(query?.packageId)
  packageId.value = Number.isFinite(id) ? id : null
  fetchProduct()
})
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';

.shop-detail-page {
  min-height: 100vh;
  background: #f7f7f7;
  color: #222;
}

.detail-scroll {
  height: 100vh;
}

.cover-wrap {
  width: 100%;
  height: 560rpx;
  background: #ececec;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.detail-card {
  margin: 20rpx 22rpx 0;
  padding: 26rpx;
  border-radius: 22rpx;
  background: #ffffff;
  box-sizing: border-box;
}

.price-card {
  margin-top: -38rpx;
  position: relative;
  z-index: 2;
}

.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.price-wrap {
  display: flex;
  align-items: baseline;
  color: #ef4f5f;
}

.price-symbol {
  font-size: 28rpx;
  font-weight: 800;
}

.price-value {
  margin-left: 4rpx;
  font-size: 54rpx;
  line-height: 1;
  font-weight: 900;
}

.price-unit {
  margin-left: 6rpx;
  font-size: 24rpx;
}

.sold-text {
  color: #8f8f8f;
  font-size: 24rpx;
}

.product-name {
  display: block;
  margin-top: 18rpx;
  color: #252525;
  font-size: 36rpx;
  font-weight: 900;
  line-height: 1.35;
}

.product-desc {
  display: block;
  margin-top: 14rpx;
  color: #686868;
  font-size: 26rpx;
  line-height: 1.55;
}

.card-title {
  color: #202020;
  font-size: 30rpx;
  font-weight: 900;
  margin-bottom: 22rpx;
}

.service-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.service-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  color: #1f7c4b;
  font-size: 24rpx;
  background: rgba(47, 155, 99, 0.10);
}

.service-dot {
  font-weight: 900;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: #888;
  font-size: 26rpx;
}

.info-value {
  flex: 1;
  color: #333;
  font-size: 26rpx;
  text-align: right;
}

.bottom-spacer {
  height: calc(150rpx + env(safe-area-inset-bottom));
}

.empty-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  color: #888;
  font-size: 28rpx;
}

.back-btn {
  min-width: 180rpx;
  height: 70rpx;
  line-height: 70rpx;
  border-radius: 999rpx;
  color: #fff;
  font-size: 26rpx;
  background: #ef4f5f;
}

.back-btn::after {
  border: none;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 22rpx calc(18rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  box-shadow: 0 -10rpx 30rpx rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

.bottom-price {
  min-width: 150rpx;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.bottom-price text:first-child {
  color: #888;
  font-size: 22rpx;
}

.bottom-price text:last-child {
  color: #ef4f5f;
  font-size: 34rpx;
  font-weight: 900;
}

.cart-action,
.buy-action {
  height: 78rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 30rpx;
  margin: 0;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 900;
}

.cart-action::after,
.buy-action::after {
  border: none;
}

.cart-action {
  color: #ef4f5f;
  background: #fff1f3;
}

.buy-action {
  min-width: 188rpx;
  color: #fff;
  background: linear-gradient(135deg, #ff7583, #ef3f51);
}
</style>
