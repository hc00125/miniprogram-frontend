<template>
  <view class="shop-detail-page">
    <scroll-view v-if="product" scroll-y class="detail-scroll">
      <view class="hero-section">
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
            <text class="price-symbol">💎</text>
            <text class="price-value">{{ diamondFromYuan(productPrice) }}</text>
            <text class="price-unit">{{ hourlyService ? '/时' : '/单' }}</text>
          </view>
          <text v-if="originalPrice > productPrice" class="origin-price">💎{{ diamondFromYuan(originalPrice) }}</text>
        </view>
        <view class="product-title-row">
          <text class="product-name">{{ product.name }}</text>
          <text class="product-badge">{{ productBadge }}</text>
        </view>
        <text class="product-summary">{{ productSummary }}</text>
        <view class="member-strip">
          <text>平台统一钻石标价 · 人民币1元对应10钻石</text>
          <text>{{ isGuaranteeProduct ? '查看规则 ›' : '了解更多 ›' }}</text>
        </view>
        <view v-if="isGuaranteeProduct" class="guarantee-overview">
          <view class="overview-item"><text>起步钻石</text><text>💎{{ diamondFromYuan(productPrice) }}</text></view>
          <view class="overview-item"><text>规格档位</text><text>{{ specs.length || 9 }}档</text></view>
          <view class="overview-item"><text>计价方式</text><text>按单</text></view>
        </view>
        <view class="product-meta">
          <text>已售{{ soldCount }}件</text>
          <text>{{ wantCount }}人想买</text>
        </view>
      </view>

      <view v-if="hasMultiplePlayerProducts" class="detail-card player-service-switch-card">
        <view class="player-service-switch-head">
          <view>
            <text class="player-service-switch-title">TA 的全部上架服务</text>
            <text class="player-service-switch-subtitle">共{{ allProducts.length }}项，点击切换商品与规格</text>
          </view>
          <text class="player-service-switch-count">{{ activeProductIndex + 1 }}/{{ allProducts.length }}</text>
        </view>
        <scroll-view scroll-x class="player-service-scroll" :show-scrollbar="false">
          <view class="player-service-list">
            <view
              v-for="item in allProducts"
              :key="item.id"
              class="player-service-chip"
              :class="{ active: item.id === product.id }"
              @tap="selectPlayerProduct(item)"
            >
              <text class="player-service-name">{{ item.name }}</text>
              <text class="player-service-meta">{{ item.specs?.length || 0 }}个规格 · 💎{{ packageDiamonds(item) }}起</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="detail-card option-card">
        <view class="option-row" @tap="openSpecPopup('buy')">
          <text class="option-label">选择</text>
          <text class="option-value">{{ selectedSpec ? `已选：${getSpecDisplayName(selectedSpec)}` : '请选择规格' }}</text>
          <text class="option-arrow">›</text>
        </view>
        <view v-if="specs.length" class="option-preview">
          <view v-for="spec in previewSpecs" :key="spec.id" class="preview-chip">{{ getSpecDisplayName(spec) }} · 💎{{ specDiamonds(spec) }}</view>
          <view class="preview-chip">共{{ specs.length }}个规格</view>
        </view>
      </view>

      <view v-if="isGuaranteeProduct" class="detail-card guarantee-rule-card">
        <view class="card-head"><text class="product-name">保底说明</text><text>客服确认后开局</text></view>
        <view><view v-for="rule in guaranteeRules" :key="rule" class="rule-item"><text></text><text>{{ rule }}</text></view></view>
      </view>

      <view v-if="product.rules_text" class="detail-card">
        <view class="card-head"><text class="product-name">规则与玩法</text></view>
        <view class="rules-content">{{ product.rules_text }}</view>
      </view>

      <view class="graphic-title"><text></text><text>图文详情</text><text></text></view>
      <view class="graphic-card">
        <view v-if="product.detail_text" class="graphic-text">{{ product.detail_text }}</view>
        <template v-if="detailImages.length">
          <image v-for="url in detailImages" :key="url" class="graphic-image" :src="url" mode="widthFix" @tap="previewProductImage(url)" />
        </template>
        <view v-else-if="!product.detail_text" class="graphic-placeholder">
          <view class="hero-brand">偷吃俱乐部 <text>CLUB</text></view>
          <view class="hero-title">{{ heroTitle }}</view>
          <view class="hero-subtitle">{{ detailText }}</view>
        </view>
      </view>

      <view v-if="recommendProducts.length && !hasMultiplePlayerProducts" class="recommend-section">
        <view class="graphic-title"><text></text><text>您或许会喜欢</text><text></text></view>
        <view class="recommend-grid">
          <view v-for="item in recommendProducts" :key="item.id" class="recommend-card" @tap="openProduct(item.id)">
            <image v-if="getRawProductImage(item)" class="recommend-image" :src="getRawProductImage(item)" mode="aspectFill" />
            <view v-else class="recommend-image recommend-image--placeholder">{{ item.name.slice(0, 1) }}</view>
            <text class="recommend-name">{{ item.name }}</text>
            <view class="recommend-price">💎{{ packageDiamonds(item) }}</view>
            <text class="recommend-cart">🛒</text>
          </view>
        </view>
      </view>
      <view class="bottom-spacer"></view>
    </scroll-view>

    <view v-else class="empty-state">
      <text>{{ loading ? '商品加载中...' : '商品不存在' }}</text>
      <button v-if="!loading" @tap="goBack">返回</button>
    </view>

    <view v-if="product" class="bottom-bar">
      <view class="bottom-icon" @tap="goHome"><text>⌂</text><text>首页</text></view>
      <view v-if="!isPlayerServiceProduct" class="bottom-icon" @tap="openCart"><view class="cart-icon-wrap"><text>🛒</text><text v-if="cartCount" class="cart-badge">{{ cartCount > 99 ? '99+' : cartCount }}</text></view><text>购物车</text></view>
      <button v-if="!isPlayerServiceProduct" class="cart-action" @tap="openSpecPopup('cart')">加入购物车</button>
      <button class="buy-action" @tap="openSpecPopup('buy')">{{ isPlayerServiceProduct ? '立即指定' : '立即购买' }}</button>
    </view>

    <view v-if="product && specPopupVisible" class="spec-popup-mask" @tap="closeSpecPopup">
      <view class="spec-popup" @tap.stop>
        <view class="spec-popup-header">
          <image class="spec-popup-image" :src="specPopupImage" mode="aspectFill" @tap="previewProductImage(specPopupImage)" />
          <view class="spec-popup-info">
            <view class="spec-popup-price">💎{{ diamondFromYuan(selectedTotalPrice) }}</view>
            <text class="spec-popup-stock">{{ hourlyService ? `时长：${effectiveHours}小时` : '按单购买' }}</text>
            <text class="spec-popup-selected">{{ selectedSpec ? `已选：${getSpecDisplayName(selectedSpec)}` : '请选择规格' }}</text>
          </view>
          <view class="spec-popup-close" @tap="closeSpecPopup">×</view>
        </view>
        <view class="spec-popup-body">
          <view v-if="hasMultiplePlayerProducts" class="popup-product-group">
            <view class="spec-popup-title-row"><text class="spec-popup-title">上架服务</text><text class="spec-popup-title-tip">先选择商品</text></view>
            <scroll-view scroll-x class="popup-product-scroll" :show-scrollbar="false">
              <view class="popup-product-list">
                <view
                  v-for="item in allProducts"
                  :key="item.id"
                  class="popup-product-chip"
                  :class="{ active: item.id === product.id }"
                  @tap="selectPlayerProduct(item)"
                >
                  <text>{{ item.name }}</text>
                  <text>{{ item.specs?.length || 0 }}个规格 · 💎{{ packageDiamonds(item) }}起</text>
                </view>
              </view>
            </scroll-view>
          </view>
          <view v-if="specs.length">
            <view class="spec-popup-title-row"><text class="spec-popup-title">商品规格</text><text class="spec-popup-title-tip">钻石价格</text></view>
            <view class="spec-popup-grid">
              <view v-for="spec in specs" :key="spec.id" class="spec-popup-chip" :class="{ active: selectedSpec?.id === spec.id }" @tap="selectSpec(spec)"><text>{{ getSpecDisplayName(spec) }} · 💎{{ specDiamonds(spec) }}</text></view>
            </view>
          </view>
          <view v-if="hourlyService" class="quantity-row">
            <view><text class="quantity-title">服务时长</text><text class="quantity-tip">数量代表小时</text></view>
            <view class="quantity-stepper"><button class="quantity-btn" :disabled="effectiveHours <= 1" @tap="adjustQuantity(-1)">−</button><text class="quantity-value">{{ effectiveHours }}小时</text><button class="quantity-btn" :disabled="effectiveHours >= MAX_SERVICE_HOURS" @tap="adjustQuantity(1)">＋</button></view>
          </view>
          <view v-else class="single-order-tip">本商品按单收费，每次购买1份。</view>
        </view>
        <view class="spec-popup-footer">
          <button v-if="!isPlayerServiceProduct" class="popup-cart-btn" @tap="confirmSpecAction('cart')">加入购物车</button>
          <button class="popup-buy-btn" @tap="confirmSpecAction('buy')">{{ isPlayerServiceProduct ? '确认指定' : '立即购买' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app'
import { getPackages, getPlayerServiceProducts, type BossPackage, type BossPackageSpec } from '@/api/boss'
import { diamondsFrom, formatDiamonds } from '@/utils/diamonds'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { go, goMain } from '@/utils/nav'
import { addShopCartItem, getShopCartCount } from '@/utils/shopCart'
import { isHourlyService, MAX_SERVICE_HOURS, normalizeServiceHours } from '@/utils/serviceBilling'

const fallbackImage = 'https://api.huc125.cn/media/banners/hero-lounge.jpg'
const packageId = ref<number | null>(null)
const playerId = ref<number | null>(null)
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
const isPlayerServiceProduct = computed(() => product.value?.selling_mode === 'player_designated')
const hasMultiplePlayerProducts = computed(() => Boolean(playerId.value && allProducts.value.length > 1))
const activeProductIndex = computed(() => Math.max(0, allProducts.value.findIndex(item => item.id === product.value?.id)))
const productPrice = computed(() => selectedSpec.value ? Number(selectedSpec.value.price || 0) : (product.value ? getDisplayPrice(product.value) : 0))
const selectedTotalPrice = computed(() => productPrice.value * effectiveHours.value)
const originalPrice = computed(() => product.value ? getOriginalPrice(product.value) : 0)
const soldCount = computed(() => product.value ? getSoldCount(product.value) : 0)
const soldCountText = computed(() => soldCount.value ? `已售${soldCount.value}件` : '新品上线')
const wantCount = computed(() => Math.max(1, soldCount.value + 1))
const heroTitle = computed(() => product.value?.name || 'VIP特惠')
const heroSubtitle = computed(() => selectedSpec.value?.name || product.value?.description || '规格可选 · 快速开局')
const heroNote = computed(() => '选择规格与服务时长后下单，支付页可使用已有钻石或微信即时支付')
const productBadge = computed(() => isGuaranteeProduct.value ? '特色单' : product.value?.group_name || '推荐套餐')
const productSummary = computed(() => product.value?.description || '精选套餐，平台保障，统一使用整数钻石标价。')
const detailText = computed(() => product.value?.description || selectedSpec.value?.description || '选择规格和服务时长后确认下单')
const guaranteeRules = computed(() => [selectedSpec.value?.guarantee_amount ? `当前选择：电视台保底 ${selectedSpec.value.guarantee_amount}` : '请选择一个电视台保底档位', '下单后客服会按所选规格确认局数、规则和开局时间', '钻石价格以后端配置为准'])
const recommendProducts = computed(() => allProducts.value.filter(item => item.id !== product.value?.id).slice(0, 6))
const shareQuery = computed(() => packageId.value ? `packageId=${packageId.value}${playerId.value ? `&playerId=${playerId.value}` : ''}` : '')

onShareAppMessage(() => ({ title: product.value ? `偷吃电竞｜${product.value.name}` : '偷吃电竞｜精选游戏服务', path: shareQuery.value ? `/pages/shop/detail/index?${shareQuery.value}` : '/pages/shop/category/index', ...(rawProductImage.value ? { imageUrl: rawProductImage.value } : {}) }))
onShareTimeline(() => ({ title: product.value ? `偷吃电竞｜${product.value.name}` : '偷吃电竞｜精选游戏服务', query: shareQuery.value, ...(rawProductImage.value ? { imageUrl: rawProductImage.value } : {}) }))

function diamondFromYuan(value: number | string) { try { return formatDiamonds(diamondsFrom(undefined, value)) } catch { return '--' } }
function specDiamonds(spec: BossPackageSpec) { const raw = spec as BossPackageSpec & Record<string, any>; try { return formatDiamonds(diamondsFrom(raw.price_diamonds, spec.price)) } catch { return '--' } }
function packageDiamonds(item: BossPackage) { const raw = item as BossPackage & Record<string, any>; try { return formatDiamonds(diamondsFrom(raw.min_price_diamonds ?? raw.base_price_diamonds, getDisplayPrice(item))) } catch { return '--' } }
function getRawProductImage(item: BossPackage) { const value = item as BossPackage & Record<string, any>; return value.cover_url || value.image_url || value.thumb_url || value.picture_url || '' }
function getDisplayPrice(item: BossPackage) { const itemSpecs = item.specs || []; if (itemSpecs.length) return Math.min(...itemSpecs.map(spec => Number(spec.price || 0)).filter(price => price >= 0)); return getProductPrice(item) }
function getProductPrice(item: BossPackage) { const value = item as BossPackage & Record<string, any>; return Math.max(0, Number(value.price ?? value.base_price ?? 0)) }
function getOriginalPrice(item: BossPackage) { const value = item as BossPackage & Record<string, any>; const price = getDisplayPrice(item); return Math.max(price, Number(value.original_price ?? value.market_price ?? price)) }
function getSoldCount(item: BossPackage) { const value = item as BossPackage & Record<string, any>; return Number(value.sold_count ?? value.sales_count ?? value.sales ?? value.order_count ?? 0) }
function getSpecDisplayName(spec: BossPackageSpec) { const value = spec as BossPackageSpec & Record<string, any>; return String(value.short_name || value.display_name || spec.name || '').trim() }
function sortedSpecs(item: BossPackage) { return [...(item.specs || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(a.id) - Number(b.id)) }
function activateProduct(item: BossPackage) { product.value = item; packageId.value = item.id; selectedSpec.value = sortedSpecs(item)[0] || null; selectedQuantity.value = 1 }
function selectPlayerProduct(item: BossPackage) { if (item.id === product.value?.id) return; activateProduct(item) }
function selectSpec(spec: BossPackageSpec) { selectedSpec.value = spec }
function adjustQuantity(delta: number) { const next = effectiveHours.value + delta; if (next < 1) return; if (next > MAX_SERVICE_HOURS) return toast(`单次最多选择${MAX_SERVICE_HOURS}小时`); selectedQuantity.value = next }
function previewProductImage(url: string) { if (!url) return; uni.previewImage({ urls: previewImages.value.length ? previewImages.value : [url], current: url }) }
async function refreshCartCount() { try { cartCount.value = await getShopCartCount() } catch { cartCount.value = 0 } }
async function fetchProduct() { if (!packageId.value) return; loading.value = true; try { const list = playerId.value ? (await getPlayerServiceProducts(playerId.value)).products : await getPackages(); allProducts.value = list; const requested = list.find(item => item.id === packageId.value); const fallback = playerId.value ? [...list].sort((a, b) => (b.specs?.length || 0) - (a.specs?.length || 0) || Number(a.sort_order || 0) - Number(b.sort_order || 0) || a.id - b.id)[0] : null; const next = requested || fallback || null; if (next) activateProduct(next); else product.value = null } catch (error) { toast(getErrorMessage(error, '商品详情加载失败')) } finally { loading.value = false } }
function openProduct(nextPackageId: number) { const next = allProducts.value.find(item => item.id === nextPackageId); if (playerId.value && next) { activateProduct(next); return } go('/pages/shop/detail/index', { packageId: nextPackageId, playerId: playerId.value || '' }) }
function openSpecPopup(action: 'cart' | 'buy' = 'buy') { if (!product.value) return; pendingAction.value = action; if (!hourlyService.value) selectedQuantity.value = 1; specPopupVisible.value = true }
function closeSpecPopup() { specPopupVisible.value = false }
function confirmSpecAction(action?: 'cart' | 'buy') { const finalAction = action || pendingAction.value; if (specs.value.length && !selectedSpec.value) return toast('请选择规格'); closeSpecPopup(); if (finalAction === 'cart') return void handleCartTap(); if (!product.value) return; go('/pages/shop/checkout/index', { packageId: product.value.id, playerId: playerId.value || product.value.owner_player_id || '', specId: selectedSpec.value?.id, quantity: effectiveHours.value }) }
async function handleCartTap() { if (!product.value) return; if (isPlayerServiceProduct.value) return toast('陪玩师专属商品请直接指定下单'); try { await addShopCartItem({ product: product.value, spec: selectedSpec.value, spec_display_name: selectedSpec.value ? getSpecDisplayName(selectedSpec.value) : undefined, image_url: specPopupImage.value, price: productPrice.value, description: productSummary.value, quantity: effectiveHours.value }); await refreshCartCount(); success(hourlyService.value ? `已加入购物车 · ${effectiveHours.value}小时` : '已加入购物车') } catch (error) { toast(getErrorMessage(error, '加入购物车失败')) } }
function openCart() { go('/pages/shop/cart/index') }
function goHome() { goMain('home') }
function goBack() { uni.navigateBack({ delta: 1 }) }
onLoad(query => { const id = Number(query?.packageId); const player = Number(query?.playerId); packageId.value = Number.isFinite(id) ? id : null; playerId.value = Number.isFinite(player) && player > 0 ? player : null; void fetchProduct() })
onShow(refreshCartCount)
</script>

<style lang="scss" src="./index.scss" scoped></style>
