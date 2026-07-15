<template>
  <view class="detail-page">
    <scroll-view v-if="product" scroll-y class="detail-scroll">
      <view class="nav-row">
        <button @tap="goBack">‹</button>
        <text>商品详情</text>
        <button @tap="openCart">🛒<text v-if="cartCount">{{ cartCount > 99 ? '99+' : cartCount }}</text></button>
      </view>

      <view class="product-panel">
        <image v-if="rawProductImage" class="product-image" :src="rawProductImage" mode="aspectFill" @tap="previewProductImage(rawProductImage)" />
        <view v-else class="product-image placeholder" :class="{ guarantee: isGuaranteeProduct }">
          <text class="brand">偷吃电竞</text>
          <text class="placeholder-title">{{ product.name }}</text>
          <text class="placeholder-sub">{{ product.description || '请选择规格后下单' }}</text>
        </view>

        <view class="product-main">
          <view class="price-row">
            <view class="price"><text v-if="specs.length > 1">起</text><small>¥</small><b>{{ formatMoney(productPrice) }}</b><text>{{ priceUnit }}</text></view>
            <text class="sold">{{ soldCountText }}</text>
          </view>
          <view class="name-row"><text class="name">{{ product.name }}</text><text class="badge">{{ productBadge }}</text></view>
          <text class="summary">{{ productSummary }}</text>
          <view class="meta"><text>{{ specs.length ? `${specs.length}个固定价格规格` : '按页面规则计价' }}</text><text>{{ isGuaranteeProduct ? '按单计价' : (specs.length ? '固定规格计价' : '按人数与时长计价') }}</text></view>
        </view>
      </view>

      <view class="card spec-card" @tap="openSpecPopup('buy')">
        <view class="card-row"><text class="label">已选规格</text><text class="value">{{ selectedSpec ? getSpecDisplayName(selectedSpec) : (specs.length ? '请选择规格' : '无需选择规格') }}</text><text v-if="specs.length" class="arrow">›</text></view>
        <view v-if="specs.length" class="spec-preview"><text v-for="spec in previewSpecs" :key="spec.id">{{ getSpecDisplayName(spec) }}</text><text v-if="specs.length > previewSpecs.length">共{{ specs.length }}个</text></view>
      </view>

      <view v-if="isGuaranteeProduct" class="card rule-card">
        <view class="section-head"><text>服务说明</text><small>下单后由客服确认</small></view>
        <view class="rule-list"><view v-for="rule in guaranteeRules" :key="rule"><text>•</text><text>{{ rule }}</text></view></view>
      </view>

      <view class="section-title"><text>图文详情</text></view>
      <view class="detail-content">
        <template v-if="detailImages.length">
          <image v-for="url in detailImages" :key="url" class="detail-image" :src="url" mode="widthFix" @tap="previewProductImage(url)" />
        </template>
        <view v-else class="detail-empty"><text>{{ product.name }}</text><text>{{ product.description || selectedSpec?.description || '暂无更多图文说明' }}</text></view>
      </view>

      <view v-if="recommendProducts.length" class="recommend-wrap">
        <view class="section-title"><text>其他商品</text></view>
        <scroll-view scroll-x class="recommend-scroll" show-scrollbar="false">
          <view class="recommend-row">
            <view v-for="item in recommendProducts" :key="item.id" class="recommend-card" @tap="openProduct(item.id)">
              <image v-if="getRawProductImage(item)" class="recommend-image" :src="getRawProductImage(item)" mode="aspectFill" />
              <view v-else class="recommend-image recommend-placeholder">{{ item.name.slice(0, 1) }}</view>
              <text class="recommend-name">{{ item.name }}</text>
              <text class="recommend-price">¥{{ formatMoney(getDisplayPrice(item)) }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
      <view class="bottom-spacer"></view>
    </scroll-view>

    <view v-else class="empty-state"><text>{{ loading ? '商品加载中...' : '商品不存在或已下架' }}</text><button v-if="!loading" @tap="goBack">返回点单页</button></view>

    <view v-if="product" class="bottom-bar">
      <button class="home-btn" @tap="goHome">首页</button>
      <button class="cart-btn" @tap="openSpecPopup('cart')">加入购物车</button>
      <button class="buy-btn" @tap="openSpecPopup('buy')">立即购买</button>
    </view>

    <view v-if="product && specPopupVisible" class="popup-mask" @tap="closeSpecPopup">
      <view class="popup" @tap.stop>
        <view class="popup-head">
          <image class="popup-image" :src="specPopupImage" mode="aspectFill" />
          <view><text class="popup-price">¥{{ formatMoney(productPrice) }}</text><text>{{ selectedSpec ? `已选：${getSpecDisplayName(selectedSpec)}` : (specs.length ? '请选择规格' : '当前商品无规格') }}</text></view>
          <text class="popup-close" @tap="closeSpecPopup">×</text>
        </view>
        <scroll-view scroll-y class="popup-body">
          <view v-if="specs.length" class="popup-specs"><view v-for="spec in specs" :key="spec.id" :class="{ active: selectedSpec?.id === spec.id }" @tap="selectSpec(spec)"><text>{{ getSpecDisplayName(spec) }}</text><text>¥{{ formatMoney(Number(spec.price || 0)) }}</text></view></view>
          <view class="quantity-row"><text>数量</text><view><button :disabled="selectedQuantity <= 1" @tap="adjustQuantity(-1)">−</button><text>{{ selectedQuantity }}</text><button @tap="adjustQuantity(1)">＋</button></view></view>
        </scroll-view>
        <view class="popup-actions"><button @tap="confirmSpecAction('cart')">加入购物车</button><button @tap="confirmSpecAction('buy')">立即购买</button></view>
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
.detail-page{min-height:100vh;color:#20261f;background:#f5f6f3}.detail-scroll{height:100vh}.nav-row{position:sticky;top:0;z-index:20;height:88rpx;display:grid;grid-template-columns:78rpx 1fr 78rpx;align-items:center;padding:env(safe-area-inset-top) 18rpx 0;background:rgba(255,255,255,.96);box-sizing:content-box;border-bottom:1rpx solid #eceeea}.nav-row>text{text-align:center;font-size:30rpx;font-weight:900}.nav-row button{position:relative;width:64rpx;height:64rpx;margin:0;padding:0;border-radius:50%;color:#273127;font-size:34rpx;background:#f1f3ef}.nav-row button::after{border:none}.nav-row button:last-child{justify-self:end;font-size:24rpx}.nav-row button:last-child text{position:absolute;right:-6rpx;top:-5rpx;min-width:28rpx;height:28rpx;padding:0 6rpx;border-radius:999rpx;color:#fff;font-size:15rpx;line-height:28rpx;background:#ef4f5f}.product-panel{display:flex;gap:18rpx;margin:18rpx;padding:18rpx;border-radius:22rpx;background:#fff;box-shadow:0 8rpx 22rpx rgba(37,58,39,.06)}.product-image{width:250rpx;height:250rpx;flex-shrink:0;border-radius:18rpx;background:#e7ebe6}.placeholder{display:flex;flex-direction:column;justify-content:center;padding:24rpx;color:#fff;background:linear-gradient(135deg,#173426,#45ae72);box-sizing:border-box}.placeholder.guarantee{background:linear-gradient(135deg,#302719,#b58b3b)}.brand{font-size:20rpx;font-weight:900;opacity:.75}.placeholder-title{margin-top:14rpx;font-size:34rpx;font-weight:900}.placeholder-sub{display:-webkit-box;margin-top:10rpx;overflow:hidden;font-size:20rpx;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.product-main{flex:1;min-width:0}.price-row,.name-row,.meta{display:flex;align-items:center;justify-content:space-between;gap:10rpx}.price{display:flex;align-items:baseline;color:#a87520;white-space:nowrap}.price>text{font-size:17rpx}.price small{font-size:21rpx;font-weight:900}.price b{font-size:42rpx;line-height:1;font-weight:900}.sold{color:#92998f;font-size:18rpx}.name-row{align-items:flex-start;margin-top:16rpx}.name{flex:1;min-width:0;font-size:30rpx;font-weight:900;line-height:1.3}.badge{flex-shrink:0;padding:5rpx 9rpx;border-radius:999rpx;color:#1f7c4b;background:#eef8f1;font-size:17rpx;font-weight:900}.summary{display:-webkit-box;margin-top:10rpx;overflow:hidden;color:#667066;font-size:21rpx;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}.meta{margin-top:15rpx;padding-top:12rpx;border-top:1rpx solid #eef0ec;color:#91988f;font-size:17rpx}.card{margin:14rpx 18rpx 0;padding:20rpx;border-radius:20rpx;background:#fff}.card-row{display:flex;align-items:center;gap:12rpx}.label{width:110rpx;color:#717a70;font-size:22rpx}.value{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:23rpx;font-weight:800}.arrow{color:#a5aaa3;font-size:34rpx}.spec-preview{display:flex;gap:8rpx;margin-top:14rpx;overflow:hidden}.spec-preview text{flex-shrink:0;padding:8rpx 12rpx;border-radius:10rpx;color:#5e685e;background:#f3f5f1;font-size:17rpx}.rule-card{background:#fffaf0}.section-head{display:flex;align-items:center;justify-content:space-between}.section-head>text{font-size:25rpx;font-weight:900}.section-head small{color:#999;font-size:18rpx}.rule-list{margin-top:10rpx}.rule-list view{display:flex;gap:10rpx;margin-top:8rpx;color:#606960;font-size:20rpx;line-height:1.5}.rule-list view text:first-child{color:#a87520}.section-title{margin:26rpx 18rpx 12rpx;font-size:27rpx;font-weight:900}.detail-content{margin:0 18rpx;overflow:hidden;border-radius:18rpx;background:#fff}.detail-image{width:100%;display:block}.detail-empty{min-height:220rpx;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30rpx;color:#fff;text-align:center;background:linear-gradient(135deg,#173426,#1f7c4b)}.detail-empty text:first-child{font-size:34rpx;font-weight:900}.detail-empty text:last-child{margin-top:12rpx;font-size:21rpx;line-height:1.5;opacity:.76}.recommend-scroll{white-space:nowrap}.recommend-row{display:inline-flex;gap:12rpx;padding:0 18rpx}.recommend-card{width:210rpx;padding:10rpx;border-radius:16rpx;background:#fff;box-sizing:border-box;vertical-align:top}.recommend-image{width:190rpx;height:150rpx;border-radius:12rpx;background:#e8ece7}.recommend-placeholder{display:flex;align-items:center;justify-content:center;color:#fff;font-size:42rpx;font-weight:900;background:#1f7c4b}.recommend-name{display:block;margin-top:9rpx;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:21rpx;font-weight:900}.recommend-price{display:block;margin-top:5rpx;color:#a87520;font-size:23rpx;font-weight:900}.bottom-spacer{height:150rpx}.bottom-bar{position:fixed;left:0;right:0;bottom:0;z-index:25;display:grid;grid-template-columns:120rpx 1fr 1fr;gap:10rpx;padding:12rpx 18rpx calc(12rpx + env(safe-area-inset-bottom));background:#fff;box-shadow:0 -6rpx 20rpx rgba(0,0,0,.07)}.bottom-bar button{height:72rpx;margin:0;border-radius:999rpx;font-size:23rpx;font-weight:900}.bottom-bar button::after,.popup button::after{border:none}.home-btn{color:#536054;background:#f0f3ef}.cart-btn{color:#1f7c4b;background:#eaf7ee}.buy-btn{color:#fff;background:#1f7c4b}.empty-state{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center}.empty-state button{margin-top:20rpx;color:#fff;background:#1f7c4b}.popup-mask{position:fixed;inset:0;z-index:50;display:flex;align-items:flex-end;background:rgba(0,0,0,.45)}.popup{width:100%;max-height:76vh;padding:22rpx;border-radius:28rpx 28rpx 0 0;background:#fff;box-sizing:border-box}.popup-head{display:flex;align-items:flex-start;gap:14rpx}.popup-image{width:112rpx;height:112rpx;flex-shrink:0;border-radius:16rpx}.popup-head>view{flex:1;min-width:0}.popup-head>view text{display:block}.popup-head>view text:last-child{margin-top:8rpx;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#777;font-size:20rpx}.popup-price{color:#a87520;font-size:34rpx;font-weight:900}.popup-close{font-size:40rpx;color:#777}.popup-body{max-height:46vh;margin-top:18rpx}.popup-specs{display:grid;grid-template-columns:repeat(2,1fr);gap:10rpx}.popup-specs>view{padding:14rpx;border-radius:14rpx;background:#f3f5f1;border:2rpx solid transparent}.popup-specs>view.active{border-color:#1f7c4b;background:#eef8f1}.popup-specs text{display:block;font-size:21rpx}.popup-specs text:last-child{margin-top:4rpx;color:#a87520;font-weight:900}.quantity-row{display:flex;align-items:center;justify-content:space-between;margin-top:20rpx}.quantity-row>text{font-size:23rpx;font-weight:900}.quantity-row>view{display:flex;align-items:center}.quantity-row button{width:54rpx;height:54rpx;margin:0;padding:0}.quantity-row>view>text{width:64rpx;text-align:center;font-weight:900}.popup-actions{display:grid;grid-template-columns:1fr 1fr;gap:12rpx;margin-top:20rpx}.popup-actions button{height:72rpx;margin:0;border-radius:999rpx;font-weight:900}.popup-actions button:first-child{color:#1f7c4b;background:#eaf7ee}.popup-actions button:last-child{color:#fff;background:#1f7c4b}
</style>
