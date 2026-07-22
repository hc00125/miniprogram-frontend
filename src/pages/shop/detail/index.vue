<template>
  <view class="shop-detail-page">
    <scroll-view v-if="product" scroll-y class="detail-scroll">
      <view class="hero-section" :class="{ 'hero-section--guarantee': isGuaranteeProduct }">
        <image v-if="rawProductImage" class="hero-image" :src="rawProductImage" mode="aspectFill" @tap="previewProductImage(rawProductImage)" />
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
        <view v-if="rawProductImage" class="image-preview-tip" @tap="previewProductImage(rawProductImage)">点击查看大图</view>
      </view>

      <view class="detail-card product-card">
        <view class="price-line">
          <view class="price-wrap">
            <text v-if="specs.length" class="price-prefix">起</text>
            <text class="price-symbol">¥</text>
            <text class="price-value">{{ formatMoney(productPrice) }}</text>
            <text class="price-unit">{{ hourlyService ? '/时' : '/单' }}</text>
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
          <view class="overview-item"><text>起步价</text><text>¥58</text></view>
          <view class="overview-item"><text>规格档位</text><text>{{ specs.length || 9 }}档</text></view>
          <view class="overview-item"><text>计价方式</text><text>按单</text></view>
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
          <view v-for="spec in previewSpecs" :key="spec.id" class="preview-chip">{{ getSpecDisplayName(spec) }}</view>
          <view class="preview-chip preview-chip--more">共{{ specs.length }}个规格可选</view>
        </view>
        <view class="option-row">
          <text class="option-label">活动</text>
          <text class="tag">送积分</text>
          <text class="option-value">购买最高可得 {{ rewardPoints }} 积分</text>
        </view>
      </view>

      <view v-if="isGuaranteeProduct" class="detail-card guarantee-rule-card">
        <view class="card-head"><text class="card-title">保底说明</text><text class="card-more">客服确认后开局</text></view>
        <view class="rule-list"><view v-for="rule in guaranteeRules" :key="rule" class="rule-item"><text></text><text>{{ rule }}</text></view></view>
      </view>

      <view class="detail-card review-card">
        <view class="card-head"><text class="card-title">暂无评价</text><text class="card-more">查看全部 ›</text></view>
      </view>

      <view v-if="product?.rules_text" class="detail-card rules-card">
        <view class="card-head"><text class="card-title">规则与玩法</text></view>
        <view class="rules-content">{{ product.rules_text }}</view>
      </view>

      <view class="graphic-title"><text></text><text>图文详情</text><text></text></view>
      <view class="graphic-card">
        <view v-if="product.detail_text" class="graphic-text">{{ product.detail_text }}</view>
        <template v-if="detailImages.length">
          <image v-for="url in detailImages" :key="url" class="graphic-image" :src="url" mode="widthFix" @tap="previewProductImage(url)" />
          <view class="graphic-preview-tip">点击图片可查看大图</view>
        </template>
        <view v-else-if="!product.detail_text" class="graphic-placeholder">
          <view class="hero-brand">偷吃俱乐部 <text>CLUB</text></view>
          <view class="hero-title">{{ heroTitle }}</view>
          <view class="hero-subtitle">{{ detailText }}</view>
          <view class="hero-note">后端配置 detail_images 后会自动显示长图详情</view>
        </view>
      </view>

      <view v-if="recommendProducts.length" class="recommend-section">
        <view class="graphic-title recommend-title"><text></text><text>您或许会喜欢</text><text></text></view>
        <view class="recommend-grid">
          <view v-for="item in recommendProducts" :key="item.id" class="recommend-card" @tap="openProduct(item.id)">
            <image v-if="getRawProductImage(item)" class="recommend-image" :src="getRawProductImage(item)" mode="aspectFill" />
            <view v-else class="recommend-image recommend-image--placeholder"><text>{{ item.name.slice(0, 1) }}</text></view>
            <text class="recommend-name">{{ item.name }}</text>
            <view class="recommend-price"><text>¥</text><text>{{ formatMoney(getDisplayPrice(item)) }}</text></view>
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
      <view class="bottom-icon" @tap="goHome"><text>⌂</text><text>首页</text></view>
      <view class="bottom-icon" @tap="openCart">
        <view class="cart-icon-wrap"><text>🛒</text><text v-if="cartCount" class="cart-badge">{{ cartCount > 99 ? '99+' : cartCount }}</text></view>
        <text>购物车</text>
      </view>
      <button v-if="canStartDesignated" class="designated-action" @tap="startDesignatedGroup">指定陪玩</button>
      <button class="cart-action" @tap="openSpecPopup('cart')">加入购物车</button>
      <button class="buy-action" @tap="openSpecPopup('buy')">立即购买</button>
    </view>

    <view v-if="product && specPopupVisible" class="spec-popup-mask" @tap="closeSpecPopup">
      <view class="spec-popup" @tap.stop>
        <view class="spec-popup-header">
          <image class="spec-popup-image" :src="specPopupImage" mode="aspectFill" @tap="previewProductImage(specPopupImage)" />
          <view class="spec-popup-info">
            <view class="spec-popup-price"><text>¥</text><text>{{ formatMoney(selectedTotalPrice) }}</text></view>
            <text class="spec-popup-stock">{{ hourlyService ? `时长：${effectiveHours}小时` : '按单购买' }}</text>
            <text class="spec-popup-selected">{{ selectedSpec ? `已选：${getSpecDisplayName(selectedSpec)}` : '请选择规格' }}</text>
          </view>
          <view class="spec-popup-close" @tap="closeSpecPopup">×</view>
        </view>
        <view class="spec-popup-body">
          <view v-if="specs.length" class="spec-popup-group">
            <view class="spec-popup-title-row">
              <text class="spec-popup-title">{{ isGuaranteeProduct ? '保底规格' : '商品规格' }}</text>
              <text class="spec-popup-title-tip">{{ isGuaranteeProduct ? '按保底金额选择' : '请选择规格' }}</text>
            </view>
            <view class="spec-popup-grid">
              <view v-for="spec in specs" :key="spec.id" class="spec-popup-chip" :class="{ active: selectedSpec?.id === spec.id }" @tap="selectSpec(spec)"><text>{{ getSpecDisplayName(spec) }}</text></view>
            </view>
          </view>
          <view v-if="hourlyService" class="quantity-row">
            <view><text class="quantity-title">服务时长</text><text class="quantity-tip">数量代表小时，不代表人数或订单数</text></view>
            <view class="quantity-stepper">
              <button class="quantity-btn" :disabled="effectiveHours <= 1" @tap="adjustQuantity(-1)">−</button>
              <text class="quantity-value">{{ effectiveHours }}小时</text>
              <button class="quantity-btn quantity-btn--plus" :disabled="effectiveHours >= MAX_SERVICE_HOURS" @tap="adjustQuantity(1)">＋</button>
            </view>
          </view>
          <view v-else class="single-order-tip">本商品按单收费，每次购买1份。</view>
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
import { onLoad, onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app'
import { getPackages, type BossPackage, type BossPackageSpec } from '@/api/boss'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { go, goMain } from '@/utils/nav'
import { addShopCartItem, getShopCartCount } from '@/utils/shopCart'
import { isHourlyService, MAX_SERVICE_HOURS, normalizeServiceHours } from '@/utils/serviceBilling'

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
const detailImages = computed(() => product.value?.detail_images?.length ? product.value.detail_images : (rawProductImage.value ? [rawProductImage.value] : []))
const previewImages = computed(() => Array.from(new Set([rawProductImage.value, ...detailImages.value].filter(Boolean))))
const isGuaranteeProduct = computed(() => Boolean(product.value && (product.value.product_type === 'guarantee' || product.value.name.includes('保底'))))
const hourlyService = computed(() => isHourlyService(product.value))
const effectiveHours = computed(() => hourlyService.value ? normalizeServiceHours(selectedQuantity.value) : 1)
const canStartDesignated = computed(() => Boolean(
  product.value
  && !isGuaranteeProduct.value
  && product.value.product_type !== 'guarantee'
  && [1, 2, 3].includes(Number(product.value.player_count || 1))
  && product.value.package_family_id
  && specs.value.some(spec => spec.is_active !== false && spec.required_player_type_id)
))
const productPrice = computed(() => selectedSpec.value ? Number(selectedSpec.value.price || 0) : (product.value ? getDisplayPrice(product.value) : 0))
const selectedTotalPrice = computed(() => productPrice.value * effectiveHours.value)
const originalPrice = computed(() => product.value ? getOriginalPrice(product.value) : 0)
const soldCount = computed(() => product.value ? getSoldCount(product.value) : 0)
const soldCountText = computed(() => soldCount.value ? `已售${soldCount.value}件` : '新品上线')
const wantCount = computed(() => Math.max(1, soldCount.value + 1))
const rewardPoints = computed(() => Math.max(1, Math.round(selectedTotalPrice.value)))
const heroTitle = computed(() => product.value?.name || 'VIP特惠')
const heroSubtitle = computed(() => isGuaranteeProduct.value ? '电视台保底 · 九档可选 · 按单下单' : selectedSpec.value?.name || product.value?.description || '规格可选 · 快速开局')
const heroNote = computed(() => isGuaranteeProduct.value ? '选择保底档位后确认下单，客服接单后开局' : '选择规格与服务时长后下单，客服接单后开局')
const productBadge = computed(() => isGuaranteeProduct.value ? '特色单' : product.value?.group_name || '推荐套餐')
const productSummary = computed(() => isGuaranteeProduct.value ? '暗区突围端游电视台保底服务，按保底金额选择规格，一单一价。' : product.value?.description || '精选套餐，平台保障，按小时购买。')
const detailText = computed(() => isGuaranteeProduct.value ? '九档电视台保底规格可选，适合不同预算与保底目标。' : product.value?.description || selectedSpec.value?.description || '选择规格和服务时长后确认下单')
const memberStripText = computed(() => isGuaranteeProduct.value ? '保底规格可选，价格按单计算' : '陪玩服务按小时计价')
const guaranteeRules = computed(() => {
  const amount = selectedSpec.value?.guarantee_amount
  return [amount ? `当前选择：电视台保底 ${amount}` : '请选择一个电视台保底档位', '下单后客服会按所选规格确认局数、规则和开局时间', '规格价格以后端配置为准，提交后会自动记录所选规格']
})
const recommendProducts = computed(() => allProducts.value.filter(item => item.id !== product.value?.id).slice(0, 6))

onShareAppMessage(() => ({ title: product.value ? `偷吃电竞｜${product.value.name}` : '偷吃电竞｜精选游戏服务', path: packageId.value ? `/pages/shop/detail/index?packageId=${packageId.value}` : '/pages/shop/category/index', ...(rawProductImage.value ? { imageUrl: rawProductImage.value } : {}) }))
onShareTimeline(() => ({ title: product.value ? `偷吃电竞｜${product.value.name}` : '偷吃电竞｜精选游戏服务', query: packageId.value ? `packageId=${packageId.value}` : '', ...(rawProductImage.value ? { imageUrl: rawProductImage.value } : {}) }))

function getRawProductImage(item: BossPackage) { const value = item as BossPackage & Record<string, any>; return value.cover_url || value.image_url || value.thumb_url || value.picture_url || '' }
function getDisplayPrice(item: BossPackage) { const itemSpecs = item.specs || []; if (itemSpecs.length) return Math.min(...itemSpecs.map(spec => Number(spec.price || 0)).filter(price => price >= 0)); return getProductPrice(item) }
function getProductPrice(item: BossPackage) { const value = item as BossPackage & Record<string, any>; return Math.max(0, Number(value.price ?? value.base_price ?? 0)) }
function getOriginalPrice(item: BossPackage) { const value = item as BossPackage & Record<string, any>; const price = getDisplayPrice(item); return Math.max(price, Number(value.original_price ?? value.market_price ?? price)) }
function getSoldCount(item: BossPackage) { const value = item as BossPackage & Record<string, any>; return Number(value.sold_count ?? value.sales_count ?? value.sales ?? value.order_count ?? 0) }
function formatMoney(value: number) { return Number.isInteger(value) ? `${value}` : value.toFixed(2) }
function getSpecDisplayName(spec: BossPackageSpec) { const value = spec as BossPackageSpec & Record<string, any>; if (value.short_name) return String(value.short_name); if (value.display_name) return String(value.display_name); if (isGuaranteeProduct.value) { if (spec.guarantee_amount) return `${spec.guarantee_amount}档`; const matched = String(spec.name || '').match(/(\d+\s*w)/i); if (matched?.[1]) return `${matched[1].replace(/\s+/g, '')}档`; return String(spec.name || '').replace(/^电视台保底\s*/i, '').trim() || String(spec.name || '') } return String(spec.name || '').trim() }
function selectSpec(spec: BossPackageSpec) { selectedSpec.value = spec }
function adjustQuantity(delta: number) { const next = effectiveHours.value + delta; if (next < 1) return; if (next > MAX_SERVICE_HOURS) return toast(`单次最多选择${MAX_SERVICE_HOURS}小时`); selectedQuantity.value = next }
function previewProductImage(url: string) { if (!url) return; uni.previewImage({ urls: previewImages.value.length ? previewImages.value : [url], current: url }) }
async function refreshCartCount() { try { cartCount.value = await getShopCartCount() } catch { cartCount.value = 0 } }
async function fetchProduct() { if (!packageId.value) return; loading.value = true; try { const list = await getPackages(); allProducts.value = list; product.value = list.find(item => item.id === packageId.value) || null; selectedSpec.value = product.value?.specs?.[0] || null; selectedQuantity.value = 1 } catch (error) { toast(getErrorMessage(error, '商品详情加载失败')) } finally { loading.value = false } }
function openProduct(nextPackageId: number) { go('/pages/shop/detail/index', { packageId: nextPackageId }) }
function openSpecPopup(action: 'cart' | 'buy' = 'buy') { if (!product.value) return; pendingAction.value = action; if (!hourlyService.value) selectedQuantity.value = 1; specPopupVisible.value = true }
function closeSpecPopup() { specPopupVisible.value = false }
function confirmSpecAction(action?: 'cart' | 'buy') { const finalAction = action || pendingAction.value; if (specs.value.length && !selectedSpec.value) return toast('请选择规格'); closeSpecPopup(); if (finalAction === 'cart') return void handleCartTap(); if (!product.value) return; go('/pages/shop/checkout/index', { packageId: product.value.id, specId: selectedSpec.value?.id, quantity: effectiveHours.value }) }
function startDesignatedGroup() {
  if (!product.value) return
  if (specs.value.length && !selectedSpec.value) return toast('请先选择基础规格')
  go('/pages/designated/group/index', { packageId: product.value.id, specId: selectedSpec.value?.id })
}
async function handleCartTap() { if (!product.value) return; try { await addShopCartItem({ product: product.value, spec: selectedSpec.value, spec_display_name: selectedSpec.value ? getSpecDisplayName(selectedSpec.value) : undefined, image_url: specPopupImage.value, price: productPrice.value, description: productSummary.value, quantity: effectiveHours.value }); await refreshCartCount(); success(hourlyService.value ? `已加入购物车 · ${effectiveHours.value}小时` : '已加入购物车') } catch (error) { toast(getErrorMessage(error, '加入购物车失败')) } }
function openCart() { go('/pages/shop/cart/index') }
function goHome() { goMain('home') }
function goBack() { uni.navigateBack({ delta: 1 }) }
onLoad(query => { const id = Number(query?.packageId); packageId.value = Number.isFinite(id) ? id : null; void fetchProduct() })
onShow(refreshCartCount)
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';
.shop-detail-page{min-height:100vh;background:#f6f6f6;color:#222}.detail-scroll{height:100vh}.hero-section{position:relative;min-height:720rpx;overflow:hidden;background:#2d2d22}.hero-section--guarantee{background:#17191f}.hero-image{width:100%;height:720rpx;display:block}.hero-placeholder,.graphic-placeholder{min-height:720rpx;display:flex;flex-direction:column;justify-content:center;padding:70rpx 44rpx 90rpx;color:#20ff9a;background:linear-gradient(135deg,#2f2f20,#1f2118 48%,#343526);box-sizing:border-box}.hero-section--guarantee .hero-placeholder{color:#ffd36a;background:linear-gradient(135deg,#15171f,#252638 55%,#5d1f2f)}.hero-brand{color:#fff;font-size:38rpx;font-weight:900}.hero-brand text{color:#20ff9a}.hero-title{margin-top:26rpx;color:#20ff9a;font-size:72rpx;font-weight:900}.hero-subtitle{margin-top:22rpx;color:#20ff9a;font-size:40rpx;font-weight:900}.hero-note{margin-top:36rpx;color:#fff;font-size:24rpx;font-weight:800}.hero-mask{position:absolute;left:0;right:0;bottom:0;height:160rpx;background:linear-gradient(180deg,transparent,rgba(246,246,246,.95))}.hero-float{position:absolute;top:calc(22rpx + env(safe-area-inset-top));width:64rpx;height:64rpx;display:flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-size:38rpx;background:rgba(0,0,0,.36);z-index:3}.hero-float--left{left:24rpx}.hero-float--right{right:24rpx;font-size:28rpx}.hero-sold,.image-preview-tip{position:absolute;bottom:34rpx;z-index:3;padding:10rpx 18rpx;border-radius:999rpx;color:#fff;font-size:22rpx;background:rgba(0,0,0,.42)}.hero-sold{left:24rpx}.image-preview-tip{right:24rpx}.detail-card{margin:18rpx 22rpx 0;padding:24rpx;border-radius:18rpx;background:#fff;box-sizing:border-box}.product-card{margin-top:-18rpx;position:relative;z-index:2}.price-line,.price-wrap{display:flex;align-items:baseline}.price-line{gap:18rpx}.price-wrap{color:#ef4f5f}.price-prefix{font-size:22rpx;font-weight:900}.price-symbol{font-size:26rpx;font-weight:900}.price-value{margin-left:4rpx;font-size:50rpx;font-weight:900}.price-unit{margin-left:6rpx;font-size:23rpx;font-weight:800}.origin-price{color:#aaa;font-size:24rpx;text-decoration:line-through}.product-title-row,.card-head{display:flex;align-items:center;justify-content:space-between;gap:18rpx}.product-title-row{margin-top:18rpx}.product-name{font-size:34rpx;font-weight:900}.product-badge{padding:8rpx 14rpx;border-radius:999rpx;color:#ef4f5f;font-size:22rpx;background:#fff1f3}.product-summary{display:block;margin-top:12rpx;color:#666;font-size:25rpx}.member-strip{display:flex;justify-content:space-between;padding:18rpx 20rpx;margin-top:18rpx;border-radius:10rpx;background:#fff8d8;font-size:24rpx}.guarantee-overview{display:grid;grid-template-columns:repeat(3,1fr);gap:12rpx;margin-top:18rpx}.overview-item{padding:16rpx;text-align:center;background:#f8f0df;border-radius:14rpx}.overview-item text{display:block}.product-meta{display:flex;justify-content:space-between;margin-top:16rpx;color:#888;font-size:23rpx}.option-card{padding:0 24rpx 22rpx}.option-row{display:flex;align-items:center;min-height:88rpx;border-bottom:1rpx solid #f2f2f2}.option-label{width:72rpx;color:#858585;font-size:25rpx;font-weight:800}.option-value{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:25rpx}.option-arrow{font-size:36rpx;color:#aaa}.tag{padding:3rpx 8rpx;margin-right:14rpx;border:1rpx solid #ef4f5f;color:#ef4f5f;font-size:20rpx}.option-preview{display:flex;gap:12rpx;padding:18rpx 0;overflow:hidden}.preview-chip{flex-shrink:0;max-width:180rpx;padding:14rpx 18rpx;border-radius:10rpx;color:#888;font-size:22rpx;background:#f6f6f6}.rules-content,.graphic-text{white-space:pre-wrap;line-height:1.7}.rule-item{display:flex;gap:12rpx;margin-top:12rpx;color:#5c5c5c;font-size:24rpx}.rule-item text:first-child{width:10rpx;height:10rpx;margin-top:12rpx;border-radius:50%;background:#ef4f5f}.graphic-title{display:flex;align-items:center;justify-content:center;gap:18rpx;margin:38rpx 0 18rpx;color:#777;font-size:25rpx}.graphic-title text:first-child,.graphic-title text:last-child{width:70rpx;height:1rpx;background:#d7d7d7}.graphic-card{position:relative;margin:0 22rpx;overflow:hidden;border-radius:8rpx;background:#2d2d22}.graphic-image{width:100%;display:block}.graphic-text{padding:32rpx 28rpx;background:#fff}.graphic-preview-tip{position:absolute;right:16rpx;bottom:16rpx;padding:8rpx 14rpx;border-radius:999rpx;color:#fff;font-size:20rpx;background:rgba(0,0,0,.45)}.recommend-section{padding:0 22rpx}.recommend-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18rpx}.recommend-card{position:relative;overflow:hidden;border-radius:16rpx;background:#fff}.recommend-image{width:100%;height:250rpx}.recommend-image--placeholder{display:flex;align-items:center;justify-content:center}.recommend-name{display:block;padding:16rpx;font-size:27rpx}.recommend-price{padding:0 16rpx 20rpx;color:#ef4f5f;font-size:34rpx;font-weight:900}.recommend-cart{position:absolute;right:16rpx;bottom:18rpx}.bottom-spacer{height:calc(156rpx + env(safe-area-inset-bottom))}.empty-state{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24rpx}.bottom-bar{position:fixed;left:0;right:0;bottom:0;z-index:20;display:flex;align-items:center;gap:14rpx;padding:16rpx 20rpx calc(16rpx + env(safe-area-inset-bottom));background:#fff}.bottom-icon{width:72rpx;display:flex;flex-direction:column;align-items:center;font-size:20rpx}.cart-icon-wrap{position:relative}.cart-badge{position:absolute;right:-14rpx;top:-10rpx;padding:2rpx 8rpx;border-radius:999rpx;color:#fff;background:#ef4f5f}.cart-action,.buy-action,.designated-action{flex:1;height:76rpx;display:flex;align-items:center;justify-content:center;padding:0 12rpx;margin:0;border-radius:999rpx;color:#fff;font-size:24rpx;font-weight:900}.cart-action{background:linear-gradient(135deg,#ffbd27,#ff9e00)}.designated-action{background:linear-gradient(135deg,#65c980,#1f7c4b)}.buy-action{background:linear-gradient(135deg,#ff7583,#ef3f51)}.spec-popup-mask{position:fixed;inset:0;z-index:99;display:flex;align-items:flex-end;background:rgba(0,0,0,.48)}.spec-popup{width:100%;max-height:82vh;display:flex;flex-direction:column;padding:24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));border-radius:28rpx 28rpx 0 0;background:#fff;box-sizing:border-box}.spec-popup-header{position:relative;display:flex;gap:20rpx;padding-right:50rpx}.spec-popup-image{width:156rpx;height:156rpx;border-radius:16rpx}.spec-popup-info{flex:1;display:flex;flex-direction:column;gap:8rpx}.spec-popup-price{color:#ef4f5f;font-size:46rpx;font-weight:900}.spec-popup-stock,.spec-popup-selected,.quantity-tip{display:block;color:#888;font-size:23rpx}.spec-popup-selected{color:#333}.spec-popup-close{position:absolute;right:0;top:0;font-size:42rpx;color:#999}.spec-popup-body{margin-top:28rpx;overflow-y:auto}.spec-popup-title-row{display:flex;justify-content:space-between;margin-bottom:18rpx}.spec-popup-title,.quantity-title{font-size:29rpx;font-weight:900}.spec-popup-title-tip{color:#999;font-size:23rpx}.spec-popup-grid{display:flex;flex-wrap:wrap;gap:16rpx}.spec-popup-chip{flex:0 0 calc((100% - 32rpx)/3);padding:20rpx 12rpx;border:1rpx solid #ececec;border-radius:12rpx;background:#f7f7f7;text-align:center;box-sizing:border-box}.spec-popup-chip.active{border-color:#ef4f5f;background:#fff1f3;color:#ef4f5f}.quantity-row{margin-top:34rpx;display:flex;align-items:center;justify-content:space-between;gap:20rpx}.quantity-stepper{display:flex;align-items:center;height:64rpx;border-radius:8rpx;overflow:hidden;background:#f7f7f7}.quantity-btn{width:64rpx;height:64rpx;margin:0;padding:0;border-radius:0;color:#777;background:#f0f0f0}.quantity-value{min-width:100rpx;text-align:center;font-size:25rpx;font-weight:900}.single-order-tip{margin-top:32rpx;padding:20rpx;border-radius:14rpx;color:#8b6a27;background:#fff8d8}.spec-popup-footer{display:flex;gap:18rpx;margin-top:28rpx}.popup-cart-btn,.popup-buy-btn{flex:1;height:84rpx;margin:0;border-radius:999rpx;color:#fff;font-size:28rpx;font-weight:900}.popup-cart-btn{background:linear-gradient(135deg,#ffbd27,#ff9e00)}.popup-buy-btn{background:linear-gradient(135deg,#ff7583,#ef3f51)}button::after{border:none}
</style>
