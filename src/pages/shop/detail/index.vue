<template>
  <view class="shop-detail-page">
    <scroll-view v-if="product" scroll-y class="detail-scroll">
      <view class="hero-section" :class="{ 'hero-section--guarantee': isGuaranteeProduct }">
        <image v-if="rawProductImage" class="hero-image" :src="rawProductImage" mode="aspectFill" @tap="previewProductImage(rawProductImage)" />
        <view v-else class="hero-placeholder">
          <view class="hero-brand">偷吃电竞 <text>CLUB</text></view>
          <view class="hero-title">{{ product.name }}</view>
          <view class="hero-subtitle">{{ selectedSpec?.name || product.description || '请选择规格后下单' }}</view>
          <view class="hero-note">商品内容、价格与可选规格均以后端当前配置为准</view>
        </view>
        <view class="hero-mask"></view>
        <view class="hero-float hero-float--left" @tap="goBack">‹</view>
        <view class="hero-sold">{{ soldCountText }}</view>
        <view v-if="rawProductImage" class="image-preview-tip" @tap="previewProductImage(rawProductImage)">查看大图</view>
      </view>

      <view class="detail-card product-card">
        <view class="price-line">
          <view class="price-wrap">
            <text v-if="specs.length > 1" class="price-prefix">起</text>
            <text class="price-symbol">¥</text>
            <text class="price-value">{{ formatMoney(productPrice) }}</text>
            <text class="price-unit">{{ priceUnit }}</text>
          </view>
          <text v-if="originalPrice > productPrice" class="origin-price">¥{{ formatMoney(originalPrice) }}</text>
        </view>
        <view class="product-title-row">
          <text class="product-name">{{ product.name }}</text>
          <text class="product-badge">{{ productBadge }}</text>
        </view>
        <text class="product-summary">{{ productSummary }}</text>
        <view class="service-strip">
          <text>{{ specs.length ? `${specs.length} 个固定价格规格可选` : '按页面显示规则计价' }}</text>
          <text>订单全程留痕</text>
        </view>
        <view class="product-meta">
          <text>{{ soldCountText }}</text>
          <text>{{ isGuaranteeProduct ? '按单计价' : (specs.length ? '固定规格计价' : '按人数与时长计价') }}</text>
        </view>
      </view>

      <view class="detail-card option-card">
        <view class="option-row" @tap="openSpecPopup('buy')">
          <text class="option-label">规格</text>
          <text class="option-value">{{ selectedSpec ? `已选：${getSpecDisplayName(selectedSpec)}` : (specs.length ? '请选择规格' : '无需选择规格') }}</text>
          <text v-if="specs.length" class="option-arrow">›</text>
        </view>
        <view v-if="specs.length" class="option-preview">
          <view v-for="spec in previewSpecs" :key="spec.id" class="preview-chip">{{ getSpecDisplayName(spec) }}</view>
          <view v-if="specs.length > previewSpecs.length" class="preview-chip preview-chip--more">共{{ specs.length }}个</view>
        </view>
      </view>

      <view v-if="isGuaranteeProduct" class="detail-card guarantee-rule-card">
        <view class="card-head"><text class="card-title">服务说明</text><text class="card-more">下单后由客服确认</text></view>
        <view class="rule-list">
          <view v-for="rule in guaranteeRules" :key="rule" class="rule-item"><text></text><text>{{ rule }}</text></view>
        </view>
      </view>

      <view class="graphic-title"><text></text><text>图文详情</text><text></text></view>
      <view class="graphic-card">
        <template v-if="detailImages.length">
          <image v-for="url in detailImages" :key="url" class="graphic-image" :src="url" mode="widthFix" @tap="previewProductImage(url)" />
          <view class="graphic-preview-tip">点击图片可查看大图</view>
        </template>
        <view v-else class="graphic-placeholder">
          <view class="hero-brand">偷吃电竞 <text>CLUB</text></view>
          <view class="hero-title">{{ product.name }}</view>
          <view class="hero-subtitle">{{ product.description || selectedSpec?.description || '暂无更多图文说明' }}</view>
        </view>
      </view>

      <view v-if="recommendProducts.length" class="recommend-section">
        <view class="graphic-title recommend-title"><text></text><text>其他商品</text><text></text></view>
        <view class="recommend-grid">
          <view v-for="item in recommendProducts" :key="item.id" class="recommend-card" @tap="openProduct(item.id)">
            <image v-if="getRawProductImage(item)" class="recommend-image" :src="getRawProductImage(item)" mode="aspectFill" />
            <view v-else class="recommend-image recommend-image--placeholder"><text>{{ item.name.slice(0, 1) }}</text></view>
            <text class="recommend-name">{{ item.name }}</text>
            <view class="recommend-price"><text>¥</text><text>{{ formatMoney(getDisplayPrice(item)) }}</text></view>
          </view>
        </view>
      </view>
      <view class="bottom-spacer"></view>
    </scroll-view>

    <view v-else class="empty-state">
      <text>{{ loading ? '商品加载中...' : '商品不存在或已下架' }}</text>
      <button v-if="!loading" class="back-btn" @tap="goBack">返回点单页</button>
    </view>

    <view v-if="product" class="bottom-bar">
      <view class="bottom-icon" @tap="goHome"><text>⌂</text><text>首页</text></view>
      <view class="bottom-icon" @tap="openCart"><view class="cart-icon-wrap"><text>🛒</text><text v-if="cartCount" class="cart-badge">{{ cartCount > 99 ? '99+' : cartCount }}</text></view><text>购物车</text></view>
      <button class="cart-action" @tap="openSpecPopup('cart')">加入购物车</button>
      <button class="buy-action" @tap="openSpecPopup('buy')">立即购买</button>
    </view>

    <view v-if="product && specPopupVisible" class="spec-popup-mask" @tap="closeSpecPopup">
      <view class="spec-popup" @tap.stop>
        <view class="spec-popup-header">
          <image class="spec-popup-image" :src="specPopupImage" mode="aspectFill" />
          <view class="spec-popup-info"><view class="spec-popup-price"><text>¥</text><text>{{ formatMoney(productPrice) }}</text></view><text>{{ selectedSpec ? `已选：${getSpecDisplayName(selectedSpec)}` : (specs.length ? '请选择规格' : '当前商品无规格') }}</text></view>
          <view class="spec-popup-close" @tap="closeSpecPopup">×</view>
        </view>
        <view class="spec-popup-body">
          <view v-if="specs.length" class="spec-popup-grid">
            <view v-for="spec in specs" :key="spec.id" class="spec-popup-chip" :class="{ active: selectedSpec?.id === spec.id }" @tap="selectSpec(spec)"><text>{{ getSpecDisplayName(spec) }}</text><text>¥{{ formatMoney(Number(spec.price || 0)) }}</text></view>
          </view>
          <view class="quantity-row"><text>数量</text><view class="quantity-stepper"><button :disabled="selectedQuantity <= 1" @tap="adjustQuantity(-1)">−</button><text>{{ selectedQuantity }}</text><button @tap="adjustQuantity(1)">＋</button></view></view>
        </view>
        <view class="spec-popup-footer"><button class="popup-cart-btn" @tap="confirmSpecAction('cart')">加入购物车</button><button class="popup-buy-btn" @tap="confirmSpecAction('buy')">立即购买</button></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getPackages, type BossPackage, type BossPackageSpec } from '@/api/boss'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { backToRoute, go, goMain, replace } from '@/utils/nav'
import { addShopCartItem, getShopCartCount } from '@/utils/shopCart'

const fallbackImage = 'https://api.huc125.cn/media/banners/hero-lounge.jpg'
const packageId = ref<number | null>(null)
const loading = ref(false)
const product = ref<BossPackage | null>(null)
const allProducts = ref<BossPackage[]>([])
const selectedSpec = ref<BossPackageSpec | null>(null)
const selectedQuantity = ref(1)
const specPopupVisible = ref(false)
const pendingAction = ref<'cart' | 'buy'>('buy')
const cartCount = ref(0)

const specs = computed(() => [...(product.value?.specs || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)))
const previewSpecs = computed(() => specs.value.slice(0, 3))
const rawProductImage = computed(() => product.value ? getRawProductImage(product.value) : '')
const specPopupImage = computed(() => rawProductImage.value || fallbackImage)
const detailImages = computed(() => product.value?.detail_images?.length ? product.value.detail_images : [])
const previewImages = computed(() => Array.from(new Set([rawProductImage.value, ...detailImages.value].filter(Boolean))))
const isGuaranteeProduct = computed(() => Boolean(product.value && (product.value.product_type === 'guarantee' || product.value.name.includes('保底'))))
const productPrice = computed(() => selectedSpec.value ? Number(selectedSpec.value.price || 0) : (product.value ? getDisplayPrice(product.value) : 0))
const originalPrice = computed(() => product.value ? getOriginalPrice(product.value) : 0)
const soldCount = computed(() => product.value ? getSoldCount(product.value) : 0)
const soldCountText = computed(() => soldCount.value ? `已售${soldCount.value}件` : '新品上线')
const productBadge = computed(() => isGuaranteeProduct.value ? '保底单' : product.value?.group_name || '推荐套餐')
const productSummary = computed(() => product.value?.description || selectedSpec.value?.description || '平台记录订单、支付与服务进度。')
const priceUnit = computed(() => specs.value.length || isGuaranteeProduct.value ? '/单' : '/时/人')
const guaranteeRules = computed(() => [
  selectedSpec.value ? `当前选择：${selectedSpec.value.name}` : '请选择一个固定价格规格',
  '下单后客服会根据所选规格确认服务内容、规则和开始时间',
  '最终服务内容与价格以提交订单时记录的规格为准'
])
const recommendProducts = computed(() => allProducts.value.filter(item => item.id !== product.value?.id).slice(0, 4))

function getRawProductImage(item: BossPackage) { const current = item as BossPackage & Record<string, any>; return current.cover_url || current.image_url || current.thumb_url || current.picture_url || '' }
function getDisplayPrice(item: BossPackage) { const prices = (item.specs || []).map(spec => Number(spec.price || 0)).filter(price => Number.isFinite(price) && price >= 0); return prices.length ? Math.min(...prices) : getProductPrice(item) }
function getProductPrice(item: BossPackage) { const current = item as BossPackage & Record<string, any>; return Math.max(0, Number(current.price ?? current.base_price ?? 0)) }
function getOriginalPrice(item: BossPackage) { const current = item as BossPackage & Record<string, any>; const price = getDisplayPrice(item); return Math.max(price, Number(current.original_price ?? current.market_price ?? price)) }
function getSoldCount(item: BossPackage) { const current = item as BossPackage & Record<string, any>; return Math.max(0, Number(current.sold_count ?? current.sales_count ?? current.sales ?? current.order_count ?? 0)) }
function formatMoney(value: number) { return Number.isInteger(value) ? `${value}` : Number(value || 0).toFixed(2) }
function getSpecDisplayName(spec: BossPackageSpec) { const current = spec as BossPackageSpec & Record<string, any>; return String(current.short_name || current.display_name || spec.name || '').trim() }
function selectSpec(spec: BossPackageSpec) { selectedSpec.value = spec }
function adjustQuantity(delta: number) { const next = selectedQuantity.value + delta; if (next < 1) return; if (next > 99) return toast('单次最多选择99件'); selectedQuantity.value = next }
function previewProductImage(url: string) { if (!url) return; const urls = previewImages.value.length ? previewImages.value : [url]; uni.previewImage({ urls, current: url }) }
async function refreshCartCount() { try { cartCount.value = await getShopCartCount() } catch { cartCount.value = 0 } }
async function fetchProduct() {
  if (!packageId.value) return
  loading.value = true
  try {
    const list = await getPackages()
    allProducts.value = list
    product.value = list.find(item => item.id === packageId.value) || null
    selectedSpec.value = product.value?.specs?.[0] || null
    selectedQuantity.value = 1
  } catch (error) {
    product.value = null
    toast(getErrorMessage(error, '商品详情加载失败'))
  } finally { loading.value = false }
}
function openProduct(nextPackageId: number) { replace('/pages/shop/detail/index', { packageId: nextPackageId }) }
function openSpecPopup(action: 'cart' | 'buy' = 'buy') { if (!product.value) return; pendingAction.value = action; specPopupVisible.value = true }
function closeSpecPopup() { specPopupVisible.value = false }
function confirmSpecAction(action?: 'cart' | 'buy') {
  const finalAction = action || pendingAction.value
  if (specs.value.length && !selectedSpec.value) return toast('请选择规格')
  closeSpecPopup()
  if (finalAction === 'cart') return handleCartTap()
  if (product.value) go('/pages/shop/checkout/index', { packageId: product.value.id, specId: selectedSpec.value?.id, quantity: selectedQuantity.value })
}
async function handleCartTap() {
  if (!product.value) return
  try {
    await addShopCartItem({ product: product.value, spec: selectedSpec.value, spec_display_name: selectedSpec.value ? getSpecDisplayName(selectedSpec.value) : undefined, image_url: specPopupImage.value, price: productPrice.value, description: productSummary.value, quantity: selectedQuantity.value })
    await refreshCartCount()
    success(`已加入购物车 x${selectedQuantity.value}`)
  } catch (error) { toast(getErrorMessage(error, '加入购物车失败')) }
}
function openCart() { go('/pages/shop/cart/index') }
function goHome() { goMain('home') }
function goBack() { backToRoute('/pages/shop/category/index') }
onLoad(query => { const id = Number(query?.packageId); packageId.value = Number.isFinite(id) ? id : null; fetchProduct() })
onShow(refreshCartCount)
</script>

<style lang="scss" scoped>
.shop-detail-page{min-height:100vh;background:#f6f6f6;color:#222}.detail-scroll{height:100vh}.hero-section{position:relative;min-height:620rpx;overflow:hidden;background:#263128}.hero-image{width:100%;height:620rpx}.hero-placeholder,.graphic-placeholder{min-height:620rpx;display:flex;flex-direction:column;justify-content:center;padding:70rpx 44rpx;color:#fff;background:linear-gradient(135deg,#173426,#1f7c4b);box-sizing:border-box}.hero-section--guarantee .hero-placeholder{background:linear-gradient(135deg,#1b1d27,#5d1f2f)}.hero-brand{font-size:32rpx;font-weight:900}.hero-brand text{color:#f3d79b}.hero-title{margin-top:24rpx;font-size:58rpx;font-weight:900}.hero-subtitle{margin-top:18rpx;font-size:32rpx;font-weight:800;line-height:1.45}.hero-note{margin-top:28rpx;font-size:22rpx;opacity:.75}.hero-mask{position:absolute;left:0;right:0;bottom:0;height:140rpx;background:linear-gradient(transparent,rgba(246,246,246,.95));pointer-events:none}.hero-float{position:absolute;top:calc(22rpx + env(safe-area-inset-top));width:64rpx;height:64rpx;display:flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-size:38rpx;background:rgba(0,0,0,.4);z-index:3}.hero-float--left{left:24rpx}.hero-sold,.image-preview-tip{position:absolute;bottom:28rpx;z-index:3;padding:9rpx 16rpx;border-radius:999rpx;color:#fff;font-size:21rpx;background:rgba(0,0,0,.42)}.hero-sold{left:24rpx}.image-preview-tip{right:24rpx}.detail-card{margin:18rpx 22rpx 0;padding:24rpx;border-radius:20rpx;background:#fff}.product-card{position:relative;z-index:2;margin-top:-16rpx}.price-line,.price-wrap{display:flex;align-items:baseline;gap:5rpx}.price-wrap{color:#ef4f5f}.price-prefix{font-size:21rpx}.price-symbol{font-size:25rpx;font-weight:900}.price-value{font-size:48rpx;font-weight:900}.price-unit{font-size:22rpx;font-weight:800}.origin-price{margin-left:14rpx;color:#aaa;text-decoration:line-through}.product-title-row{display:flex;align-items:flex-start;gap:16rpx;margin-top:18rpx}.product-name{flex:1;font-size:34rpx;font-weight:900}.product-badge{padding:7rpx 13rpx;border-radius:999rpx;color:#1f7c4b;background:#eef8f1;font-size:21rpx;font-weight:900}.product-summary{display:block;margin-top:12rpx;color:#666;font-size:25rpx;line-height:1.55}.service-strip{display:flex;justify-content:space-between;gap:16rpx;margin-top:18rpx;padding:18rpx;border-radius:14rpx;color:#5f4216;background:#fff8d8;font-size:22rpx}.product-meta{display:flex;justify-content:space-between;margin-top:16rpx;color:#8b8b8b;font-size:22rpx}.option-card{padding:0 24rpx 20rpx}.option-row{min-height:86rpx;display:flex;align-items:center;border-bottom:1rpx solid #eee}.option-label{width:80rpx;color:#888}.option-value{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.option-arrow{font-size:36rpx;color:#aaa}.option-preview{display:flex;gap:10rpx;padding:16rpx 0;overflow:hidden}.preview-chip{flex-shrink:0;padding:12rpx 16rpx;border-radius:12rpx;background:#f5f5f5;color:#666;font-size:21rpx}.guarantee-rule-card{background:#fffaf0}.card-head{display:flex;justify-content:space-between}.card-title{font-size:28rpx;font-weight:900}.card-more{color:#999;font-size:22rpx}.rule-list{margin-top:14rpx}.rule-item{display:flex;gap:12rpx;margin-top:12rpx;color:#5c5c5c;font-size:23rpx;line-height:1.5}.rule-item text:first-child{width:9rpx;height:9rpx;margin-top:12rpx;border-radius:50%;background:#ef4f5f}.graphic-title{display:flex;align-items:center;justify-content:center;gap:16rpx;margin:36rpx 0 18rpx;color:#777}.graphic-title text:first-child,.graphic-title text:last-child{width:70rpx;height:1rpx;background:#ddd}.graphic-card{margin:0 22rpx;overflow:hidden;border-radius:12rpx;background:#263128}.graphic-image{width:100%;display:block}.graphic-preview-tip{position:absolute}.recommend-section{padding:0 22rpx}.recommend-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16rpx}.recommend-card{position:relative;overflow:hidden;padding-bottom:16rpx;border-radius:16rpx;background:#fff}.recommend-image{width:100%;height:220rpx}.recommend-image--placeholder{display:flex;align-items:center;justify-content:center;color:#fff;font-size:52rpx;background:#1f7c4b}.recommend-name{display:block;padding:14rpx 14rpx 0;font-size:25rpx;font-weight:900}.recommend-price{padding:8rpx 14rpx 0;color:#ef4f5f;font-weight:900}.bottom-spacer{height:180rpx}.empty-state{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center}.back-btn{margin-top:24rpx}.bottom-bar{position:fixed;left:0;right:0;bottom:0;z-index:20;display:grid;grid-template-columns:90rpx 100rpx 1fr 1fr;gap:10rpx;padding:14rpx 18rpx calc(14rpx + env(safe-area-inset-bottom));background:#fff}.bottom-icon{display:flex;flex-direction:column;align-items:center;justify-content:center;color:#666;font-size:20rpx}.cart-icon-wrap{position:relative}.cart-badge{position:absolute;top:-12rpx;right:-18rpx;padding:2rpx 8rpx;border-radius:999rpx;color:#fff;background:#ef4f5f}.bottom-bar button{height:76rpx;margin:0;border-radius:999rpx;font-size:24rpx;font-weight:900}.cart-action{color:#1f7c4b;background:#eef8f1}.buy-action{color:#fff;background:#1f7c4b}.bottom-bar button::after,.spec-popup button::after{border:none}.spec-popup-mask{position:fixed;inset:0;z-index:40;display:flex;align-items:flex-end;background:rgba(0,0,0,.45)}.spec-popup{width:100%;max-height:78vh;padding:24rpx;border-radius:30rpx 30rpx 0 0;background:#fff;box-sizing:border-box}.spec-popup-header{display:flex;gap:16rpx;align-items:flex-start}.spec-popup-image{width:130rpx;height:130rpx;border-radius:18rpx}.spec-popup-info{flex:1}.spec-popup-price{color:#ef4f5f}.spec-popup-price text:last-child{font-size:40rpx;font-weight:900}.spec-popup-info>text{display:block;margin-top:10rpx;color:#777}.spec-popup-close{font-size:42rpx}.spec-popup-body{max-height:48vh;overflow:auto;margin-top:22rpx}.spec-popup-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12rpx}.spec-popup-chip{padding:16rpx;border-radius:16rpx;background:#f5f5f5}.spec-popup-chip text{display:block}.spec-popup-chip text:last-child{margin-top:5rpx;color:#ef4f5f}.spec-popup-chip.active{border:2rpx solid #1f7c4b;background:#eef8f1}.quantity-row{display:flex;align-items:center;justify-content:space-between;margin-top:22rpx}.quantity-stepper{display:flex;align-items:center}.quantity-stepper button{width:60rpx;height:60rpx;margin:0}.quantity-stepper text{width:70rpx;text-align:center}.spec-popup-footer{display:grid;grid-template-columns:1fr 1fr;gap:14rpx;margin-top:24rpx}.spec-popup-footer button{height:78rpx;margin:0;border-radius:999rpx}.popup-cart-btn{color:#1f7c4b;background:#eef8f1}.popup-buy-btn{color:#fff;background:#1f7c4b}
</style>
