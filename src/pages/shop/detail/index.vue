<template>
  <view class="shop-detail-page">
    <scroll-view v-if="product" scroll-y class="detail-scroll">
      <view class="hero-section" :class="{ 'hero-section--guarantee': isGuaranteeProduct }">
        <image v-if="rawProductImage" class="hero-image" :src="rawProductImage" mode="aspectFill" />
        <view v-else class="hero-placeholder">
          <view class="hero-brand">偷吃俱乐部 <text>CLUB</text></view>
          <view class="hero-title">{{ heroTitle }}</view>
          <view class="hero-subtitle">{{ heroSubtitle }}</view>
          <view class="hero-note">{{ heroNote }}</view>
        </view>
        <view class="hero-mask"></view>
        <view class="hero-float hero-float--left" @tap="goBack">‹</view>
        <view class="hero-float hero-float--right">•••</view>
        <view class="hero-sold">{{ soldCountText }}</view>
      </view>

      <view class="detail-card product-card">
        <view class="price-line">
          <view class="price-wrap">
            <text v-if="specs.length" class="price-prefix">起</text>
            <text class="price-symbol">¥</text>
            <text class="price-value">{{ formatMoney(productPrice) }}</text>
            <text class="price-unit">{{ isSpecProduct ? '/单' : '/时' }}</text>
          </view>
          <text v-if="originalPrice > productPrice" class="origin-price">¥{{ formatMoney(originalPrice) }}</text>
        </view>
        <view class="product-title-row">
          <text class="product-name">{{ product.name }}</text>
          <text class="product-badge">{{ productBadge }}</text>
        </view>
        <text class="product-summary">{{ productSummary }}</text>
        <view class="member-strip">
          <text>{{ memberStripText }}</text>
          <text>{{ isGuaranteeProduct ? '查看规则 ›' : '了解更多 ›' }}</text>
        </view>
        <view v-if="isGuaranteeProduct" class="guarantee-overview">
          <view class="overview-item">
            <text>起步价</text>
            <text>¥58</text>
          </view>
          <view class="overview-item">
            <text>规格档位</text>
            <text>{{ specs.length || 9 }}档</text>
          </view>
          <view class="overview-item">
            <text>计价方式</text>
            <text>按单</text>
          </view>
        </view>
        <view class="product-meta">
          <text>已售{{ soldCount }}件</text>
          <text>{{ wantCount }}人想买</text>
        </view>
      </view>

      <view class="detail-card option-card">
        <view class="option-row" @tap="openSpecPopup('buy')">
          <text class="option-label">选择</text>
          <text class="option-value">{{ selectedSpec ? `已选：${getSpecDisplayName(selectedSpec)}` : '请选择规格' }}</text>
          <text class="option-arrow">›</text>
        </view>

        <view v-if="specs.length" class="option-preview">
          <view class="preview-chip" v-for="spec in previewSpecs" :key="spec.id">
            {{ getSpecDisplayName(spec) }}
          </view>
          <view class="preview-chip preview-chip--more">共{{ specs.length }}个规格可选</view>
        </view>

        <view class="option-row">
          <text class="option-label">活动</text>
          <text class="tag">送积分</text>
          <text class="option-value">购买最高可得 {{ rewardPoints }} 积分</text>
        </view>
      </view>

      <view v-if="isGuaranteeProduct" class="detail-card guarantee-rule-card">
        <view class="card-head">
          <text class="card-title">保底说明</text>
          <text class="card-more">客服确认后开局</text>
        </view>
        <view class="rule-list">
          <view v-for="rule in guaranteeRules" :key="rule" class="rule-item">
            <text></text>
            <text>{{ rule }}</text>
          </view>
        </view>
      </view>

      <view class="detail-card review-card">
        <view class="card-head">
          <text class="card-title">暂无评价</text>
          <text class="card-more">查看全部 ›</text>
        </view>
      </view>

      <view class="graphic-title">
        <text></text>
        <text>图文详情</text>
        <text></text>
      </view>

      <view class="graphic-card">
        <template v-if="detailImages.length">
          <image v-for="url in detailImages" :key="url" class="graphic-image" :src="url" mode="widthFix" />
        </template>
        <view v-else class="graphic-placeholder">
          <view class="hero-brand">偷吃俱乐部 <text>CLUB</text></view>
          <view class="hero-title">{{ heroTitle }}</view>
          <view class="hero-subtitle">{{ detailText }}</view>
          <view class="hero-note">后端配置 detail_images 后会自动显示长图详情</view>
        </view>
      </view>

      <view v-if="recommendProducts.length" class="recommend-section">
        <view class="graphic-title recommend-title">
          <text></text>
          <text>您或许会喜欢</text>
          <text></text>
        </view>
        <view class="recommend-grid">
          <view
            v-for="item in recommendProducts"
            :key="item.id"
            class="recommend-card"
            @tap="openProduct(item.id)"
          >
            <image v-if="getRawProductImage(item)" class="recommend-image" :src="getRawProductImage(item)" mode="aspectFill" />
            <view v-else class="recommend-image recommend-image--placeholder">
              <text>{{ item.name.slice(0, 1) }}</text>
            </view>
            <text class="recommend-name">{{ item.name }}</text>
            <view class="recommend-price">
              <text>¥</text>
              <text>{{ formatMoney(getDisplayPrice(item)) }}</text>
            </view>
            <text class="recommend-cart">🛒</text>
          </view>
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <view v-else class="empty-state">
      <text>{{ loading ? '商品加载中...' : '商品不存在' }}</text>
      <button v-if="!loading" class="back-btn" @tap="goBack">返回</button>
    </view>

    <view v-if="product" class="bottom-bar">
      <view class="bottom-icon" @tap="goHome">
        <text>⌂</text>
        <text>首页</text>
      </view>
      <view class="bottom-icon" @tap="openCart">
        <view class="cart-icon-wrap">
          <text>🛒</text>
          <text v-if="cartCount" class="cart-badge">{{ cartCount > 99 ? '99+' : cartCount }}</text>
        </view>
        <text>购物车</text>
      </view>
      <button class="cart-action" @tap="openSpecPopup('cart')">加入购物车</button>
      <button class="buy-action" @tap="openSpecPopup('buy')">立即购买</button>
    </view>

    <view v-if="product && specPopupVisible" class="spec-popup-mask" @tap="closeSpecPopup">
      <view class="spec-popup" @tap.stop>
        <view class="spec-popup-header">
          <image class="spec-popup-image" :src="specPopupImage" mode="aspectFill" />
          <view class="spec-popup-info">
            <view class="spec-popup-price">
              <text>¥</text>
              <text>{{ formatMoney(productPrice) }}</text>
            </view>
            <text class="spec-popup-stock">{{ specs.length ? `共${specs.length}个规格可选` : '无规格可选' }}</text>
            <text class="spec-popup-selected">{{ selectedSpec ? `已选：${getSpecDisplayName(selectedSpec)}` : '请选择规格' }}</text>
          </view>
          <view class="spec-popup-close" @tap="closeSpecPopup">×</view>
        </view>

        <view class="spec-popup-body">
          <view class="spec-popup-group">
            <view class="spec-popup-title-row">
              <text class="spec-popup-title">{{ isGuaranteeProduct ? '保底规格' : '商品规格' }}</text>
              <text class="spec-popup-title-tip">{{ isGuaranteeProduct ? '按保底金额选择' : '请选择规格' }}</text>
            </view>
            <view class="spec-popup-grid">
              <view
                v-for="spec in specs"
                :key="spec.id"
                class="spec-popup-chip"
                :class="{ active: selectedSpec?.id === spec.id }"
                @tap="selectSpec(spec)"
              >
                <text>{{ getSpecDisplayName(spec) }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="spec-popup-footer">
          <button class="popup-cart-btn" @tap="confirmSpecAction('cart')">加入购物车</button>
          <button class="popup-buy-btn" @tap="confirmSpecAction('buy')">立即购买</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getPackages, type BossPackage, type BossPackageSpec } from '@/api/boss'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { go, goMain } from '@/utils/nav'
import { addShopCartItem, getShopCartCount } from '@/utils/shopCart'

const fallbackImage = '/static/images/home-redesign/hero-lounge.jpg'
const packageId = ref<number | null>(null)
const loading = ref(false)
const product = ref<BossPackage | null>(null)
const allProducts = ref<BossPackage[]>([])
const selectedSpec = ref<BossPackageSpec | null>(null)
const specPopupVisible = ref(false)
const pendingAction = ref<'cart' | 'buy'>('buy')
const cartCount = ref(0)

const specs = computed(() => [...(product.value?.specs || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)))
const previewSpecs = computed(() => specs.value.slice(0, 3))
const rawProductImage = computed(() => product.value ? getRawProductImage(product.value) : '')
const specPopupImage = computed(() => rawProductImage.value || fallbackImage)
const detailImages = computed(() => product.value?.detail_images?.length ? product.value.detail_images : (rawProductImage.value ? [rawProductImage.value] : []))
const isGuaranteeProduct = computed(() => Boolean(product.value && (product.value.product_type === 'guarantee' || product.value.name.includes('保底'))))
const isSpecProduct = computed(() => Boolean(specs.value.length) || product.value?.product_type === 'guarantee' || product.value?.product_type === 'escort')
const productPrice = computed(() => selectedSpec.value ? Number(selectedSpec.value.price || 0) : (product.value ? getDisplayPrice(product.value) : 0))
const originalPrice = computed(() => product.value ? getOriginalPrice(product.value) : 0)
const soldCount = computed(() => product.value ? getSoldCount(product.value) : 0)
const soldCountText = computed(() => soldCount.value ? `已售${soldCount.value}件` : '新品上线')
const wantCount = computed(() => Math.max(1, soldCount.value + 1))
const rewardPoints = computed(() => Math.max(1, Math.round(productPrice.value)))
const heroTitle = computed(() => product.value?.name || 'VIP特惠')
const heroSubtitle = computed(() => isGuaranteeProduct.value ? '电视台保底 · 九档可选 · 按单下单' : selectedSpec.value?.name || product.value?.description || '规格可选 · 快速开局')
const heroNote = computed(() => isGuaranteeProduct.value ? '选择保底档位后确认下单，客服接单后开局' : '按规格确认后下单，客服接单后开局')
const productBadge = computed(() => isGuaranteeProduct.value ? '特色单' : product.value?.group_name || '推荐套餐')
const productSummary = computed(() => isGuaranteeProduct.value ? '暗区突围端游电视台保底服务，按保底金额选择规格，一单一价。' : product.value?.description || '精选套餐，平台保障，快速匹配陪玩。')
const detailText = computed(() => isGuaranteeProduct.value ? '九档电视台保底规格可选，适合不同预算与保底目标。' : product.value?.description || selectedSpec.value?.description || '选择规格后确认下单')
const memberStripText = computed(() => isGuaranteeProduct.value ? '保底规格可选，价格按单计算' : '加入会员，享会员价')
const guaranteeRules = computed(() => {
  const amount = selectedSpec.value?.guarantee_amount
  return [
    amount ? `当前选择：电视台保底 ${amount}` : '请选择一个电视台保底档位',
    '下单后客服会按所选规格确认局数、规则和开局时间',
    '当前后端暂未建立规格表，前端会把所选规格自动写入订单备注'
  ]
})
const recommendProducts = computed(() => allProducts.value.filter(item => item.id !== product.value?.id).slice(0, 6))

function getRawProductImage(item: BossPackage) {
  const productItem = item as BossPackage & Record<string, any>
  return productItem.cover_url || productItem.image_url || productItem.thumb_url || productItem.picture_url || ''
}

function getDisplayPrice(item: BossPackage) {
  const itemSpecs = item.specs || []
  if (itemSpecs.length) return Math.min(...itemSpecs.map(spec => Number(spec.price || 0)).filter(price => price >= 0))
  return getProductPrice(item)
}

function getProductPrice(item: BossPackage) {
  const productItem = item as BossPackage & Record<string, any>
  return Math.max(0, Number(productItem.price ?? productItem.base_price ?? 0))
}

function getOriginalPrice(item: BossPackage) {
  const productItem = item as BossPackage & Record<string, any>
  const price = getDisplayPrice(item)
  return Math.max(price, Number(productItem.original_price ?? productItem.market_price ?? price))
}

function getSoldCount(item: BossPackage) {
  const productItem = item as BossPackage & Record<string, any>
  return Number(productItem.sold_count ?? productItem.sales_count ?? productItem.sales ?? productItem.order_count ?? 0)
}

function formatMoney(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2)
}

function getSpecDisplayName(spec: BossPackageSpec) {
  const specItem = spec as BossPackageSpec & Record<string, any>
  if (specItem.short_name) return String(specItem.short_name)
  if (specItem.display_name) return String(specItem.display_name)
  if (isGuaranteeProduct.value) {
    if (spec.guarantee_amount) return `${spec.guarantee_amount}档`
    const matched = String(spec.name || '').match(/(\d+\s*w)/i)
    if (matched?.[1]) return `${matched[1].replace(/\s+/g, '')}档`
    return String(spec.name || '').replace(/^电视台保底\s*/i, '').trim() || String(spec.name || '')
  }
  return String(spec.name || '').trim()
}

function selectSpec(spec: BossPackageSpec) {
  selectedSpec.value = spec
}

async function refreshCartCount() {
  try {
    cartCount.value = await getShopCartCount()
  } catch {
    cartCount.value = 0
  }
}

async function fetchProduct() {
  if (!packageId.value) return
  loading.value = true
  try {
    const list = await getPackages()
    allProducts.value = list
    product.value = list.find(item => item.id === packageId.value) || null
    selectedSpec.value = product.value?.specs?.[0] || null
  } catch (error) {
    toast(getErrorMessage(error, '商品详情加载失败'))
  } finally {
    loading.value = false
  }
}

function openProduct(nextPackageId: number) {
  go('/pages/shop/detail/index', { packageId: nextPackageId })
}

function openSpecPopup(action: 'cart' | 'buy' = 'buy') {
  if (!product.value) return
  pendingAction.value = action
  if (!specs.value.length) {
    if (action === 'cart') {
      handleCartTap()
      return
    }
    go('/pages/shop/checkout/index', { packageId: product.value.id })
    return
  }
  specPopupVisible.value = true
}

function closeSpecPopup() {
  specPopupVisible.value = false
}

function confirmSpecAction(action?: 'cart' | 'buy') {
  const finalAction = action || pendingAction.value
  if (specs.value.length && !selectedSpec.value) {
    toast('请选择规格')
    return
  }
  closeSpecPopup()
  if (finalAction === 'cart') {
    handleCartTap()
    return
  }
  if (!product.value) return
  go('/pages/shop/checkout/index', { packageId: product.value.id, specId: selectedSpec.value?.id })
}

async function handleCartTap() {
  if (!product.value) return
  try {
    await addShopCartItem({
      product: product.value,
      spec: selectedSpec.value,
      spec_display_name: selectedSpec.value ? getSpecDisplayName(selectedSpec.value) : undefined,
      image_url: specPopupImage.value,
      price: productPrice.value,
      description: productSummary.value,
      quantity: 1
    })
    await refreshCartCount()
    success('已加入购物车')
  } catch (error) {
    toast(getErrorMessage(error, '加入购物车失败'))
  }
}

function handleCollectTap() {
  toast('收藏功能开发中')
}

function handleBuyTap() {
  openSpecPopup('buy')
}

function openCart() {
  go('/pages/shop/cart/index')
}

function goHome() {
  goMain('home')
}

function goBack() {
  uni.navigateBack({ delta: 1 })
}

onLoad((query) => {
  const id = Number(query?.packageId)
  packageId.value = Number.isFinite(id) ? id : null
  fetchProduct()
})

onShow(refreshCartCount)
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';
.shop-detail-page { min-height: 100vh; background: #f6f6f6; color: #222; }
.detail-scroll { height: 100vh; }
.hero-section { position: relative; min-height: 720rpx; overflow: hidden; background: #2d2d22; }
.hero-section--guarantee { background: #17191f; }
.hero-image { width: 100%; height: 720rpx; display: block; }
.hero-placeholder, .graphic-placeholder { min-height: 720rpx; display: flex; flex-direction: column; justify-content: center; padding: 70rpx 44rpx 90rpx; color: #20ff9a; background: radial-gradient(circle at 12% 28%, rgba(255, 255, 255, 0.12), transparent 23%), linear-gradient(135deg, #2f2f20 0%, #1f2118 48%, #343526 100%); box-sizing: border-box; }
.hero-section--guarantee .hero-placeholder { color: #ffd36a; background: radial-gradient(circle at 80% 12%, rgba(255, 216, 106, 0.22), transparent 28%), linear-gradient(135deg, #15171f 0%, #252638 55%, #5d1f2f 100%); }
.hero-brand { color: #fff; font-size: 38rpx; font-weight: 900; letter-spacing: 2rpx; }
.hero-brand text { color: #20ff9a; }
.hero-section--guarantee .hero-brand text { color: #ffd36a; }
.hero-title { margin-top: 26rpx; color: #20ff9a; font-size: 72rpx; line-height: 1.08; font-weight: 900; word-break: break-all; }
.hero-section--guarantee .hero-title, .hero-section--guarantee .hero-subtitle { color: #ffd36a; }
.hero-subtitle { margin-top: 22rpx; color: #20ff9a; font-size: 40rpx; line-height: 1.45; font-weight: 900; }
.hero-note { margin-top: 36rpx; color: #fff; font-size: 24rpx; font-weight: 800; opacity: 0.88; }
.hero-mask { position: absolute; left: 0; right: 0; bottom: 0; height: 160rpx; background: linear-gradient(180deg, transparent, rgba(246, 246, 246, 0.95)); pointer-events: none; }
.hero-float { position: absolute; top: calc(22rpx + env(safe-area-inset-top)); width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; color: #fff; font-size: 38rpx; font-weight: 900; background: rgba(0, 0, 0, 0.36); backdrop-filter: blur(8rpx); }
.hero-float--left { left: 24rpx; }
.hero-float--right { right: 24rpx; font-size: 28rpx; letter-spacing: 3rpx; }
.hero-sold { position: absolute; left: 24rpx; bottom: 34rpx; z-index: 2; padding: 10rpx 18rpx; border-radius: 999rpx; color: #fff; font-size: 23rpx; background: rgba(0, 0, 0, 0.42); }
.detail-card { margin: 18rpx 22rpx 0; padding: 24rpx; border-radius: 18rpx; background: #fff; box-sizing: border-box; }
.product-card { margin-top: -18rpx; position: relative; z-index: 2; }
.price-line { display: flex; align-items: baseline; gap: 18rpx; }
.price-wrap { display: flex; align-items: baseline; color: #ef4f5f; }
.price-prefix { margin-right: 4rpx; font-size: 22rpx; font-weight: 900; }
.price-symbol { font-size: 26rpx; font-weight: 900; }
.price-value { margin-left: 4rpx; font-size: 50rpx; line-height: 1; font-weight: 900; }
.price-unit { margin-left: 6rpx; font-size: 23rpx; font-weight: 800; }
.origin-price { color: #aaa; font-size: 24rpx; text-decoration: line-through; }
.product-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; margin-top: 18rpx; }
.product-name { flex: 1; min-width: 0; color: #2b2b2b; font-size: 34rpx; font-weight: 900; line-height: 1.35; }
.product-badge { flex-shrink: 0; padding: 8rpx 14rpx; border-radius: 999rpx; color: #ef4f5f; font-size: 22rpx; font-weight: 900; background: #fff1f3; }
.product-summary { display: block; margin-top: 12rpx; color: #666; font-size: 25rpx; line-height: 1.48; }
.member-strip { min-height: 62rpx; display: flex; align-items: center; justify-content: space-between; gap: 20rpx; padding: 0 20rpx; margin-top: 18rpx; border-radius: 10rpx; color: #5f4216; font-size: 24rpx; background: #fff8d8; box-sizing: border-box; }
.member-strip text:first-child { color: #2f2f2f; }
.guarantee-overview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-top: 18rpx; }
.overview-item { padding: 16rpx 10rpx; border-radius: 14rpx; text-align: center; background: #f8f0df; }
.overview-item text { display: block; }
.overview-item text:first-child { color: #8b6a27; font-size: 21rpx; }
.overview-item text:last-child { margin-top: 6rpx; color: #2d2d2d; font-size: 28rpx; font-weight: 900; }
.product-meta { display: flex; justify-content: space-between; margin-top: 16rpx; color: #8b8b8b; font-size: 23rpx; }
.option-card { padding: 0 24rpx 22rpx; }
.option-row { display: flex; align-items: center; min-height: 88rpx; border-bottom: 1rpx solid #f2f2f2; box-sizing: border-box; }
.option-row:last-child { border-bottom: none; }
.option-label { width: 72rpx; flex-shrink: 0; color: #858585; font-size: 25rpx; font-weight: 800; }
.option-value { flex: 1; min-width: 0; color: #333; font-size: 25rpx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.option-arrow { color: #aaa; font-size: 36rpx; }
.tag { padding: 3rpx 8rpx; margin-right: 14rpx; border: 1rpx solid #ef4f5f; border-radius: 4rpx; color: #ef4f5f; font-size: 20rpx; }
.option-preview { display: flex; gap: 12rpx; padding: 18rpx 0; overflow: hidden; border-bottom: 1rpx solid #f2f2f2; }
.preview-chip { flex-shrink: 0; max-width: 180rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; padding: 0 18rpx; border-radius: 10rpx; color: #888; font-size: 22rpx; background: #f6f6f6; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; box-sizing: border-box; }
.preview-chip--more { color: #999; background: #f9f9f9; }
.guarantee-rule-card { background: linear-gradient(180deg, #fff, #fff8e7); }
.rule-list { margin-top: 18rpx; }
.rule-item { display: flex; gap: 12rpx; margin-top: 12rpx; color: #5c5c5c; font-size: 24rpx; line-height: 1.45; }
.rule-item text:first-child { width: 10rpx; height: 10rpx; flex-shrink: 0; margin-top: 12rpx; border-radius: 50%; background: #ef4f5f; }
.rule-item text:last-child { flex: 1; }
.review-card { min-height: 84rpx; }
.card-head { display: flex; align-items: center; justify-content: space-between; }
.card-title { color: #222; font-size: 28rpx; font-weight: 900; }
.card-more { color: #999; font-size: 24rpx; }
.graphic-title { display: flex; align-items: center; justify-content: center; gap: 18rpx; margin: 38rpx 0 18rpx; color: #777; font-size: 25rpx; }
.graphic-title text:first-child, .graphic-title text:last-child { width: 70rpx; height: 1rpx; background: #d7d7d7; }
.graphic-card { margin: 0 22rpx; overflow: hidden; border-radius: 8rpx; background: #2d2d22; }
.graphic-image { width: 100%; display: block; }
.graphic-placeholder { min-height: 680rpx; }
.recommend-section { padding: 0 22rpx; }
.recommend-title { margin-top: 40rpx; }
.recommend-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18rpx; }
.recommend-card { position: relative; overflow: hidden; border-radius: 16rpx; background: #fff; }
.recommend-image { width: 100%; height: 250rpx; display: block; background: #f0f0f0; }
.recommend-image--placeholder { display: flex; align-items: center; justify-content: center; color: #20ff9a; font-size: 58rpx; font-weight: 900; background: linear-gradient(135deg, #2f2f20, #1f2118); }
.recommend-name { display: block; min-height: 72rpx; padding: 16rpx 16rpx 0; color: #333; font-size: 27rpx; line-height: 1.35; }
.recommend-price { display: flex; align-items: baseline; gap: 4rpx; padding: 12rpx 16rpx 20rpx; color: #ef4f5f; }
.recommend-price text:first-child { font-size: 22rpx; font-weight: 900; }
.recommend-price text:last-child { font-size: 34rpx; font-weight: 900; }
.recommend-cart { position: absolute; right: 16rpx; bottom: 18rpx; width: 50rpx; height: 50rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1rpx solid #ef6b77; color: #ef4f5f; font-size: 24rpx; background: #fff; }
.bottom-spacer { height: calc(156rpx + env(safe-area-inset-bottom)); }
.empty-state { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; color: #888; font-size: 28rpx; }
.back-btn { min-width: 180rpx; height: 70rpx; line-height: 70rpx; border-radius: 999rpx; color: #fff; font-size: 26rpx; background: #ef4f5f; }
.back-btn::after { border: none; }
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; align-items: center; gap: 14rpx; padding: 16rpx 20rpx calc(16rpx + env(safe-area-inset-bottom)); background: #fff; box-shadow: 0 -10rpx 30rpx rgba(0, 0, 0, 0.08); box-sizing: border-box; }
.bottom-icon { width: 72rpx; display: flex; flex-direction: column; align-items: center; gap: 4rpx; color: #7c7c7c; }
.bottom-icon text:first-child { font-size: 34rpx; line-height: 1; }
.bottom-icon text:last-child { font-size: 20rpx; }
.cart-icon-wrap { position: relative; line-height: 1; }
.cart-badge { position: absolute; right: -14rpx; top: -10rpx; min-width: 28rpx; height: 28rpx; display: flex; align-items: center; justify-content: center; padding: 0 7rpx; border-radius: 999rpx; color: #fff; font-size: 18rpx !important; font-weight: 900; background: #ef4f5f; box-sizing: border-box; }
.cart-action, .buy-action { flex: 1; height: 76rpx; display: flex; align-items: center; justify-content: center; padding: 0 18rpx; margin: 0; border-radius: 999rpx; color: #fff; font-size: 27rpx; font-weight: 900; }
.cart-action::after, .buy-action::after { border: none; }
.cart-action { background: linear-gradient(135deg, #ffbd27, #ff9e00); }
.buy-action { background: linear-gradient(135deg, #ff7583, #ef3f51); }
.spec-popup-mask { position: fixed; inset: 0; z-index: 99; display: flex; align-items: flex-end; background: rgba(0, 0, 0, 0.48); }
.spec-popup { width: 100%; max-height: 82vh; display: flex; flex-direction: column; padding: 24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom)); border-radius: 28rpx 28rpx 0 0; background: #fff; box-sizing: border-box; }
.spec-popup-header { position: relative; display: flex; align-items: flex-start; gap: 20rpx; padding-right: 50rpx; }
.spec-popup-image { width: 156rpx; height: 156rpx; flex-shrink: 0; border-radius: 16rpx; background: #f1f1f1; }
.spec-popup-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; padding-top: 4rpx; }
.spec-popup-price { display: flex; align-items: baseline; color: #ef4f5f; }
.spec-popup-price text:first-child { font-size: 26rpx; font-weight: 900; }
.spec-popup-price text:last-child { margin-left: 4rpx; font-size: 46rpx; line-height: 1; font-weight: 900; }
.spec-popup-stock, .spec-popup-selected { color: #888; font-size: 24rpx; line-height: 1.4; }
.spec-popup-selected { color: #333; }
.spec-popup-close { position: absolute; right: 0; top: 0; width: 58rpx; height: 58rpx; display: flex; align-items: center; justify-content: center; color: #999; font-size: 42rpx; line-height: 1; }
.spec-popup-body { flex: 1; min-height: 0; margin-top: 28rpx; overflow-y: auto; }
.spec-popup-title-row { display: flex; align-items: baseline; justify-content: space-between; gap: 20rpx; margin-bottom: 18rpx; }
.spec-popup-title { color: #333; font-size: 29rpx; font-weight: 900; }
.spec-popup-title-tip { color: #999; font-size: 23rpx; }
.spec-popup-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.spec-popup-chip { flex: 0 0 calc((100% - 32rpx) / 3); max-width: calc((100% - 32rpx) / 3); min-height: 72rpx; display: flex; align-items: center; justify-content: center; padding: 0 12rpx; border-radius: 12rpx; border: 1rpx solid #ececec; background: #f7f7f7; text-align: center; box-sizing: border-box; }
.spec-popup-chip text { display: block; width: 100%; color: #555; font-size: 24rpx; font-weight: 500; line-height: 1.3; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.spec-popup-chip.active { border-color: #ef4f5f; background: #fff1f3; }
.spec-popup-chip.active text { color: #ef4f5f; font-weight: 700; }
.spec-popup-footer { display: flex; gap: 18rpx; margin-top: 28rpx; }
.popup-cart-btn, .popup-buy-btn { flex: 1; height: 84rpx; display: flex; align-items: center; justify-content: center; padding: 0 20rpx; margin: 0; border-radius: 999rpx; color: #fff; font-size: 28rpx; font-weight: 900; }
.popup-cart-btn::after, .popup-buy-btn::after { border: none; }
.popup-cart-btn { background: linear-gradient(135deg, #ffbd27, #ff9e00); }
.popup-buy-btn { background: linear-gradient(135deg, #ff7583, #ef3f51); }
</style>
