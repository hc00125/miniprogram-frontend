<template>
  <view class="page">
    <view class="top" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="search"><text>⌕</text><input v-model="keyword" placeholder="搜索套餐或服务" /></view>
      <scroll-view scroll-x show-scrollbar="false" class="tabs"><view class="tab-row"><view v-for="item in categories" :key="item.id" class="tab" :class="{ active: activeCategoryId === item.id }" @tap="activeCategoryId = item.id">{{ item.name }}</view></view></scroll-view>
    </view>
    <view class="body">
      <scroll-view scroll-y class="side"><view v-for="item in categories" :key="item.id" class="side-item" :class="{ active: activeCategoryId === item.id }" @tap="activeCategoryId = item.id">{{ item.name }}</view></scroll-view>
      <scroll-view scroll-y class="content" refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="refreshData">
        <view class="inner">
          <view class="banner"><text>TOUCHI CLUB</text><strong>{{ activeCategoryName }}</strong><small>固定价格规格可使用微信官方虚拟支付，具体以下单页校验结果为准</small></view>
          <view v-if="loading" class="state">加载商品中...</view>
          <view v-else-if="loadFailed" class="state"><text>商品加载失败</text><button @tap="load">重新加载</button></view>
          <view v-else-if="!filteredProducts.length" class="state">暂无相关商品</view>
          <view v-else class="grid">
            <view v-for="product in filteredProducts" :key="product.id" class="card" @tap="openDetail(product.id)">
              <ProductCover :image="productImage(product)" :title="product.name" :summary="product.description || '查看当前商品规格和服务说明'" :badge="productBadge(product)" :sold-text="soldText(product)" :theme="productTheme(product)" />
              <view class="info"><text class="desc">{{ product.description || '商品内容与价格以后端当前配置为准' }}</text><view class="bottom"><view class="price"><text v-if="product.specs?.length > 1">起</text><b>¥{{ money(productPrice(product)) }}</b><text>{{ priceUnit(product) }}</text></view><text class="view-link">查看 ›</text></view></view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getPackageGroups, getPackages, type BossPackage, type PackageGroup } from '@/api/boss'
import ProductCover from '@/components/ProductCover.vue'
import { getErrorMessage, toast } from '@/utils/feedback'
import { go } from '@/utils/nav'

const fallback: PackageGroup = { id: -10, name: '推荐套餐', sort_order: 0 }
const statusBarHeight = ref(20)
const keyword = ref('')
const loading = ref(false)
const loaded = ref(false)
const loadFailed = ref(false)
const refreshing = ref(false)
const categories = ref<PackageGroup[]>([fallback])
const products = ref<BossPackage[]>([])
const activeCategoryId = ref(fallback.id)
const activeCategory = computed(() => categories.value.find(item => item.id === activeCategoryId.value) || categories.value[0] || fallback)
const activeCategoryName = computed(() => activeCategory.value.name)
const filteredProducts = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return products.value.filter(item => (item.group_id === activeCategory.value.id || (item.group_id == null && item.group_name === activeCategory.value.name)) && (!q || `${item.name} ${item.description || ''}`.toLowerCase().includes(q)))
})

function normalizeGroups(groups: PackageGroup[], packageList: BossPackage[]) {
  const result = groups.filter(group => packageList.some(item => item.group_id === group.id || (item.group_id == null && item.group_name === group.name)))
  return result.length ? result.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)) : [fallback]
}
function productImage(product: BossPackage) { const item = product as BossPackage & Record<string, any>; return item.cover_url || item.image_url || item.thumb_url || item.picture_url || '' }
function productPrice(product: BossPackage) { const prices = (product.specs || []).map(item => Number(item.price || 0)).filter(value => Number.isFinite(value) && value >= 0); return prices.length ? Math.min(...prices) : Number(product.base_price || 0) }
function soldCount(product: BossPackage) { const item = product as BossPackage & Record<string, any>; return Math.max(0, Number(item.sold_count ?? item.sales_count ?? item.sales ?? 0)) }
function soldText(product: BossPackage) { const value = soldCount(product); return value ? `已售${value}` : '新品' }
function productBadge(product: BossPackage) { if (product.product_type === 'guarantee') return '保底单'; if (product.product_type === 'fun') return '趣味单'; if (product.product_type === 'special') return '特色单'; return product.group_name || '推荐套餐' }
function productTheme(product: BossPackage) { if (product.product_type === 'guarantee') return 'gold'; if (product.product_type === 'fun') return 'rose'; if (product.product_type === 'special') return 'blue'; return 'green' }
function priceUnit(product: BossPackage) { return product.specs?.length || product.product_type === 'guarantee' || product.product_type === 'escort' ? '/单' : '/时/人' }
function money(value: number) { return Number.isInteger(value) ? String(value) : Number(value || 0).toFixed(2) }
function openDetail(id: number) { go('/pages/shop/detail/index', { packageId: id }) }
async function load(silent = false) {
  if (!silent) loading.value = true
  loadFailed.value = false
  try {
    const [groups, list] = await Promise.all([getPackageGroups(), getPackages()])
    categories.value = normalizeGroups(groups, list)
    products.value = list
    if (!categories.value.some(item => item.id === activeCategoryId.value)) activeCategoryId.value = categories.value[0].id
    loaded.value = true
  } catch (error) {
    products.value = []
    loadFailed.value = true
    toast(getErrorMessage(error, '商品加载失败'))
  } finally { loading.value = false; refreshing.value = false }
}
function refreshData() { refreshing.value = true; load(true) }
onLoad(() => { try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 20 } catch { statusBarHeight.value = 20 } })
onShow(() => { if (!loaded.value || loadFailed.value) load() })
</script>

<style lang="scss" scoped>
.page{min-height:100vh;padding-bottom:calc(120rpx + env(safe-area-inset-bottom));background:#f5f7f3}.top{position:sticky;top:0;z-index:10;padding:16rpx 22rpx 10rpx;background:#fff}.search{height:66rpx;display:flex;align-items:center;gap:12rpx;padding:0 20rpx;border-radius:999rpx;background:#f0f3ee}.search input{flex:1}.tabs{margin-top:16rpx;white-space:nowrap}.tab-row{display:inline-flex;gap:12rpx}.tab{padding:12rpx 20rpx;border-radius:999rpx;color:#687665;background:#f3f5f1;font-size:22rpx}.tab.active{color:#fff;background:#1f7c4b;font-weight:900}.body{display:flex;height:calc(100vh - 170rpx - env(safe-area-inset-bottom))}.side{width:150rpx;height:100%;background:#e9eee8}.side-item{min-height:104rpx;display:flex;align-items:center;justify-content:center;padding:14rpx;color:#637064;text-align:center;font-size:24rpx}.side-item.active{color:#173426;background:#f5f7f3;font-weight:900;border-left:7rpx solid #d8a144}.content{flex:1;height:100%}.inner{padding:18rpx}.banner{display:flex;flex-direction:column;padding:24rpx;border-radius:24rpx;color:#fff;background:linear-gradient(135deg,#173426,#1f7c4b)}.banner text{color:#f3d79b;font-size:17rpx;font-weight:900;letter-spacing:3rpx}.banner strong{margin-top:6rpx;font-size:32rpx}.banner small{margin-top:7rpx;opacity:.8;font-size:19rpx;line-height:1.45}.state{margin-top:18rpx;padding:60rpx 20rpx;border-radius:22rpx;color:#7a857b;text-align:center;background:#fff}.state text{display:block}.state button{margin-top:20rpx;color:#fff;background:#1f7c4b}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14rpx;margin-top:18rpx}.card{min-width:0;padding:10rpx;border-radius:26rpx;background:#fff;box-shadow:0 10rpx 26rpx rgba(34,62,43,.07)}.info{padding:12rpx 5rpx 5rpx}.desc{display:-webkit-box;min-height:56rpx;overflow:hidden;color:#6f7b70;font-size:19rpx;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.bottom{margin-top:10rpx;display:flex;align-items:center;justify-content:space-between;gap:6rpx}.price{display:flex;align-items:baseline;color:#a87520;white-space:nowrap}.price text{font-size:16rpx}.price b{font-size:28rpx}.view-link{color:#1f7c4b;font-size:18rpx;font-weight:900}
</style>
