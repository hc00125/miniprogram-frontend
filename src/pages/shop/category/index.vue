<template>
  <view class="page">
    <view class="top" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="search"><text>⌕</text><input v-model="keyword" placeholder="搜索套餐或服务" /></view>
      <scroll-view scroll-x show-scrollbar="false" class="tabs">
        <view class="tab-row">
          <view v-for="item in categories" :key="item.id" class="tab" :class="{ active: activeCategoryId === item.id }" @tap="activeCategoryId = item.id">{{ item.name }}</view>
        </view>
      </scroll-view>
    </view>

    <view class="body">
      <scroll-view scroll-y class="side" show-scrollbar="false">
        <view v-for="item in categories" :key="item.id" class="side-item" :class="{ active: activeCategoryId === item.id }" @tap="activeCategoryId = item.id">{{ item.name }}</view>
      </scroll-view>

      <scroll-view scroll-y class="content" refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="refreshData">
        <view class="inner">
          <view class="banner">
            <view><text>TOUCHI CLUB</text><strong>{{ activeCategoryName }}</strong></view>
            <small>固定价格规格支持微信官方虚拟支付，以下单页校验为准</small>
          </view>

          <view v-if="loading" class="state">加载商品中...</view>
          <view v-else-if="loadFailed" class="state"><text>商品加载失败</text><button @tap="load">重新加载</button></view>
          <view v-else-if="!filteredProducts.length" class="state">暂无相关商品</view>

          <view v-else class="list">
            <view v-for="product in filteredProducts" :key="product.id" class="card" @tap="openDetail(product.id)">
              <image v-if="productImage(product)" class="cover" :src="productImage(product)" mode="aspectFill" />
              <view v-else class="cover placeholder" :class="`theme-${productTheme(product)}`"><text>{{ product.name.slice(0, 1) }}</text><small>偷吃电竞</small></view>

              <view class="info">
                <view class="title-row"><text class="name">{{ product.name }}</text><text class="badge">{{ productBadge(product) }}</text></view>
                <text class="desc">{{ product.description || '商品内容与价格以后端当前配置为准' }}</text>
                <view class="sold-row"><text>{{ soldText(product) }}</text><text>{{ product.specs?.length ? `${product.specs.length}个规格` : '按页面规则计价' }}</text></view>
                <view class="bottom">
                  <view class="price"><text v-if="product.specs?.length > 1">起</text><b>¥{{ money(productPrice(product)) }}</b><text>{{ priceUnit(product) }}</text></view>
                  <button @tap.stop="openDetail(product.id)">查看</button>
                </view>
              </view>
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
.page{min-height:100vh;padding-bottom:calc(112rpx + env(safe-area-inset-bottom));background:#f6f7f4}.top{position:sticky;top:0;z-index:10;padding:12rpx 20rpx 8rpx;background:#fff;border-bottom:1rpx solid #eef0ec}.search{height:60rpx;display:flex;align-items:center;gap:10rpx;padding:0 18rpx;border-radius:999rpx;background:#f1f3ef}.search text{color:#8b9389;font-size:28rpx}.search input{flex:1;height:60rpx;font-size:25rpx}.tabs{margin-top:12rpx;white-space:nowrap}.tab-row{display:inline-flex;gap:8rpx}.tab{padding:9rpx 16rpx;border-radius:999rpx;color:#687665;background:#f3f5f1;font-size:21rpx}.tab.active{color:#fff;background:#1f7c4b;font-weight:900}.body{display:flex;height:calc(100vh - 148rpx - env(safe-area-inset-bottom))}.side{width:132rpx;height:100%;flex-shrink:0;background:#ebefea}.side-item{position:relative;min-height:88rpx;display:flex;align-items:center;justify-content:center;padding:10rpx;color:#647066;text-align:center;font-size:22rpx;line-height:1.3;box-sizing:border-box}.side-item.active{color:#173426;background:#f6f7f4;font-weight:900}.side-item.active::before{content:'';position:absolute;left:0;width:6rpx;height:38rpx;border-radius:0 5rpx 5rpx 0;background:#d8a144}.content{flex:1;height:100%}.inner{padding:14rpx}.banner{display:flex;align-items:center;justify-content:space-between;gap:14rpx;padding:16rpx 18rpx;border-radius:16rpx;color:#fff;background:linear-gradient(135deg,#173426,#1f7c4b)}.banner>view{flex-shrink:0}.banner text,.banner strong{display:block}.banner text{color:#f3d79b;font-size:14rpx;font-weight:900;letter-spacing:2rpx}.banner strong{margin-top:3rpx;font-size:25rpx}.banner small{max-width:260rpx;opacity:.78;font-size:17rpx;line-height:1.4;text-align:right}.state{margin-top:14rpx;padding:48rpx 14rpx;border-radius:18rpx;color:#7a857b;text-align:center;background:#fff}.state text{display:block}.state button{width:180rpx;height:62rpx;margin-top:16rpx;color:#fff;font-size:22rpx;background:#1f7c4b}.list{display:flex;flex-direction:column;gap:12rpx;margin-top:14rpx}.card{min-width:0;display:flex;gap:14rpx;padding:12rpx;border-radius:18rpx;background:#fff;box-shadow:0 7rpx 18rpx rgba(34,62,43,.06)}.cover{width:150rpx;height:150rpx;flex-shrink:0;border-radius:14rpx;background:#eef1ed}.placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff}.placeholder>text{font-size:44rpx;font-weight:900}.placeholder small{margin-top:6rpx;font-size:16rpx;opacity:.72}.theme-green{background:linear-gradient(135deg,#173426,#45ae72)}.theme-gold{background:linear-gradient(135deg,#322819,#c59a44)}.theme-rose{background:linear-gradient(135deg,#482333,#c85f7f)}.theme-blue{background:linear-gradient(135deg,#1f3149,#5588bc)}.info{flex:1;min-width:0;display:flex;flex-direction:column}.title-row{display:flex;align-items:flex-start;gap:8rpx}.name{flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#172116;font-size:25rpx;font-weight:900}.badge{flex-shrink:0;padding:4rpx 8rpx;border-radius:999rpx;color:#1f7c4b;background:#eef8f1;font-size:15rpx;font-weight:800}.desc{display:-webkit-box;margin-top:7rpx;overflow:hidden;color:#707a70;font-size:18rpx;line-height:1.4;-webkit-box-orient:vertical;-webkit-line-clamp:2}.sold-row{display:flex;gap:10rpx;margin-top:8rpx;color:#9aa198;font-size:16rpx}.bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:8rpx;margin-top:auto;padding-top:8rpx}.price{display:flex;align-items:baseline;color:#a87520;white-space:nowrap}.price>text{font-size:14rpx}.price b{font-size:27rpx}.bottom button{width:76rpx;height:48rpx;margin:0;padding:0;border-radius:999rpx;color:#fff;font-size:18rpx;font-weight:900;background:#1f7c4b}.bottom button::after{border:none}
</style>
