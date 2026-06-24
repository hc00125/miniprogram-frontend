<template>
  <view class="shop-category-page club-page">
    <view class="shop-top" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="search-box">
        <text class="search-icon">⌕</text>
        <input
          v-model="keyword"
          class="search-input"
          confirm-type="search"
          placeholder="搜索"
          placeholder-style="color: #a7a7a7;"
        />
      </view>

      <scroll-view scroll-x class="top-category-scroll" show-scrollbar="false">
        <view class="top-category-list">
          <view
            v-for="category in categories"
            :key="category.id"
            class="top-category-item"
            :class="{ active: activeCategoryId === category.id }"
            @tap="selectCategory(category.id)"
          >
            <view class="top-category-icon">
              <text>{{ getCategoryInitial(category.name) }}</text>
            </view>
            <text class="top-category-name">{{ category.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="shop-body">
      <scroll-view scroll-y class="side-category-scroll" show-scrollbar="false">
        <view
          v-for="category in categories"
          :key="category.id"
          class="side-category-item"
          :class="{ active: activeCategoryId === category.id }"
          @tap="selectCategory(category.id)"
        >
          <text>{{ category.name }}</text>
        </view>
      </scroll-view>

      <scroll-view scroll-y class="product-scroll" refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="refreshData">
        <view class="product-content">
          <view class="promo-banner">
            <view>
              <text class="promo-eyebrow">TOUCHI CLUB</text>
              <text class="promo-title">{{ activeCategoryName }}</text>
              <text class="promo-sub">精选陪玩套餐，选择后进入详情确认</text>
            </view>
          </view>

          <view v-if="loading" class="state-card">加载商品中...</view>
          <view v-else-if="filteredProducts.length === 0" class="state-card">暂无相关商品</view>

          <view v-else class="product-list">
            <view
              v-for="product in filteredProducts"
              :key="product.id"
              class="product-card"
              @tap="openDetail(product.id)"
            >
              <image class="product-image" :src="getProductImage(product)" mode="aspectFill" />
              <view class="product-info">
                <text class="product-name">{{ product.name }}</text>
                <text class="product-desc">{{ product.description || '精选套餐，平台保障，快速匹配陪玩' }}</text>
                <text class="product-sold">已售{{ getSoldCount(product) }}件</text>
                <view class="product-bottom">
                  <view class="price-wrap">
                    <text class="price-symbol">¥</text>
                    <text class="price-value">{{ formatMoney(getProductPrice(product)) }}</text>
                    <text class="price-unit">/时</text>
                  </view>
                  <button class="cart-btn" @tap.stop="openDetail(product.id)">
                    <text>🛒</text>
                  </button>
                </view>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <MainBottomTabs active="order" @select="handleMainTabSelect" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getPackageGroups, getPackages, type BossPackage, type PackageGroup } from '@/api/boss'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import { getErrorMessage, toast } from '@/utils/feedback'
import { go, goMain, navigateToTab, type MainTab } from '@/utils/nav'

interface ShopCategory extends PackageGroup {}

const fallbackImage = '/static/images/home-redesign/hero-lounge.jpg'
const fallbackCategory: ShopCategory = { id: 0, name: '特惠体验单', sort_order: 0 }

const statusBarHeight = ref(20)
const keyword = ref('')
const loading = ref(false)
const loaded = ref(false)
const refreshing = ref(false)
const categories = ref<ShopCategory[]>([fallbackCategory])
const products = ref<BossPackage[]>([])
const activeCategoryId = ref<number>(fallbackCategory.id)

const activeCategoryName = computed(() => categories.value.find(item => item.id === activeCategoryId.value)?.name || '商品分类')

const filteredProducts = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  let list = products.value
  if (activeCategoryId.value !== fallbackCategory.id) list = list.filter(item => item.group_id === activeCategoryId.value)
  if (q) {
    list = list.filter(item => {
      const text = `${item.name || ''} ${item.description || ''} ${item.group_name || ''}`.toLowerCase()
      return text.includes(q)
    })
  }
  return list
})

function getCategoryInitial(name: string) {
  return (name || '单').trim().slice(0, 1)
}

function selectCategory(id: number) {
  activeCategoryId.value = id
}

function normalizeCategories(groupList: PackageGroup[], packageList: BossPackage[]) {
  if (groupList.length) return groupList
  const map = new Map<number, ShopCategory>()
  packageList.forEach(item => {
    if (item.group_id === null) return
    if (!map.has(item.group_id)) {
      map.set(item.group_id, {
        id: item.group_id,
        name: item.group_name || '推荐套餐',
        sort_order: 0
      })
    }
  })
  return map.size ? Array.from(map.values()) : [fallbackCategory]
}

function syncActiveCategory(nextCategories: ShopCategory[]) {
  if (!nextCategories.some(item => item.id === activeCategoryId.value)) activeCategoryId.value = nextCategories[0]?.id ?? fallbackCategory.id
}

function getProductImage(product: BossPackage) {
  const item = product as BossPackage & Record<string, any>
  return item.cover_url || item.image_url || item.thumb_url || item.picture_url || fallbackImage
}

function getProductPrice(product: BossPackage) {
  const item = product as BossPackage & Record<string, any>
  return Number(item.price ?? item.base_price ?? 0)
}

function getSoldCount(product: BossPackage) {
  const item = product as BossPackage & Record<string, any>
  return Number(item.sold_count ?? item.sales_count ?? item.sales ?? item.order_count ?? 0)
}

function formatMoney(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2)
}

function openDetail(packageId: number) {
  go('/pages/shop/detail/index', { packageId })
}

async function fetchShopData(silent = false) {
  if (!silent) loading.value = true
  try {
    const [groupRes, packageRes] = await Promise.all([getPackageGroups(), getPackages()])
    const nextCategories = normalizeCategories(groupRes, packageRes)
    categories.value = nextCategories
    products.value = packageRes
    syncActiveCategory(nextCategories)
    loaded.value = true
  } catch (error) {
    toast(getErrorMessage(error, '商品加载失败'))
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function refreshData() {
  refreshing.value = true
  fetchShopData(true)
}

function handleMainTabSelect(tab: MainTab) {
  if (tab === 'order') return
  if (tab === 'query' || tab === 'players' || tab === 'profile') {
    navigateToTab(tab)
    return
  }
  goMain(tab)
}

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
  } catch (_error) {
    statusBarHeight.value = 20
  }
})

onShow(() => {
  if (!loaded.value) fetchShopData()
})
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';

.shop-category-page {
  min-height: 100vh;
  padding: 0 0 calc(120rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: #ffffff;
}

.shop-top {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 18rpx 24rpx 10rpx;
  background: #ffffff;
  box-sizing: border-box;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  height: 64rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #f6f6f6;
  box-sizing: border-box;
}

.search-icon {
  color: #9d9d9d;
  font-size: 34rpx;
  line-height: 1;
}

.search-input {
  flex: 1;
  height: 64rpx;
  color: #222;
  font-size: 28rpx;
}

.top-category-scroll {
  width: 100%;
  margin-top: 22rpx;
  white-space: nowrap;
}

.top-category-list {
  display: inline-flex;
  gap: 34rpx;
  padding: 2rpx 2rpx 8rpx;
}

.top-category-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  min-width: 112rpx;
}

.top-category-icon {
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #1f7c4b;
  font-size: 34rpx;
  font-weight: 900;
  background: linear-gradient(135deg, #f2fff5, #dff5e5);
  border: 4rpx solid transparent;
  box-sizing: border-box;
}

.top-category-item.active .top-category-icon {
  color: #ffffff;
  background: linear-gradient(135deg, #f06575, #ec3f51);
  border-color: rgba(236, 63, 81, 0.18);
}

.top-category-name {
  max-width: 150rpx;
  color: #333;
  font-size: 26rpx;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-category-item.active .top-category-name {
  color: #ec3f51;
  font-weight: 800;
}

.shop-body {
  display: flex;
  height: calc(100vh - 212rpx - env(safe-area-inset-bottom));
  min-height: 760rpx;
  border-top: 1rpx solid #f3f3f3;
  background: #ffffff;
}

.side-category-scroll {
  width: 190rpx;
  height: 100%;
  flex-shrink: 0;
  background: #f7f7f7;
}

.side-category-item {
  position: relative;
  min-height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18rpx 18rpx;
  box-sizing: border-box;
  color: #333;
  font-size: 28rpx;
  line-height: 1.32;
  text-align: center;
}

.side-category-item.active {
  color: #e94b5a;
  font-weight: 900;
  background: #ffffff;
}

.side-category-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 24rpx;
  bottom: 24rpx;
  width: 6rpx;
  border-radius: 999rpx;
  background: #e94b5a;
}

.product-scroll {
  flex: 1;
  height: 100%;
  background: #ffffff;
}

.product-content {
  padding: 18rpx 22rpx 32rpx;
  box-sizing: border-box;
}

.promo-banner {
  min-height: 132rpx;
  display: flex;
  align-items: center;
  padding: 24rpx 26rpx;
  margin-bottom: 20rpx;
  border-radius: 12rpx;
  overflow: hidden;
  box-sizing: border-box;
  color: #ffffff;
  background:
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(135deg, #2e313d 0%, #151722 48%, #cf3147 100%);
}

.promo-eyebrow,
.promo-title,
.promo-sub {
  display: block;
}

.promo-eyebrow {
  font-size: 20rpx;
  font-weight: 900;
  opacity: 0.72;
}

.promo-title {
  margin-top: 8rpx;
  font-size: 32rpx;
  font-weight: 900;
}

.promo-sub {
  margin-top: 8rpx;
  font-size: 22rpx;
  opacity: 0.82;
}

.state-card {
  padding: 120rpx 20rpx;
  color: #888;
  font-size: 26rpx;
  text-align: center;
}

.product-list {
  display: flex;
  flex-direction: column;
}

.product-card {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #ededed;
}

.product-image {
  width: 150rpx;
  height: 150rpx;
  flex-shrink: 0;
  border-radius: 8rpx;
  background: #f3f3f3;
}

.product-info {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.product-name {
  color: #2f2f2f;
  font-size: 31rpx;
  font-weight: 500;
  line-height: 1.32;
}

.product-desc {
  margin-top: 8rpx;
  color: #8a8a8a;
  font-size: 23rpx;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.product-sold {
  margin-top: 10rpx;
  color: #999;
  font-size: 23rpx;
}

.product-bottom {
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20rpx;
}

.price-wrap {
  display: flex;
  align-items: baseline;
  color: #ef4f5f;
}

.price-symbol {
  font-size: 26rpx;
  font-weight: 800;
}

.price-value {
  margin-left: 4rpx;
  font-size: 44rpx;
  font-weight: 900;
  line-height: 1;
}

.price-unit {
  margin-left: 4rpx;
  color: #ef4f5f;
  font-size: 22rpx;
}

.cart-btn {
  width: 58rpx;
  height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  border-radius: 50%;
  color: #e94b5a;
  font-size: 28rpx;
  line-height: 1;
  background: #ffffff;
  border: 2rpx solid #ef6b77;
}

.cart-btn::after {
  border: none;
}
</style>
