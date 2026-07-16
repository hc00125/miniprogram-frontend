<template>
  <view class="page">
    <view class="top" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="search"><text>⌕</text><input v-model="keyword" placeholder="搜索套餐或服务" /></view>
      <scroll-view scroll-x show-scrollbar="false" class="game-tabs">
        <view class="game-tab-row">
          <view
            v-for="game in games"
            :key="game.id"
            class="game-tab"
            :class="{ active: activeGameId === game.id }"
            @tap="selectGame(game)"
          >
            <image v-if="game.icon_url" class="game-icon" :src="game.icon_url" mode="aspectFill" />
            <view v-else class="game-icon game-icon--fallback">{{ game.name.slice(0, 1) }}</view>
            <text>{{ game.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="body">
      <scroll-view scroll-y class="side">
        <view
          v-for="item in categories"
          :key="item.id"
          class="side-item"
          :class="{ active: activeCategoryId === item.id }"
          @tap="activeCategoryId = item.id"
        >
          {{ item.name }}
        </view>
        <view v-if="!categories.length" class="side-empty">待配置</view>
      </scroll-view>

      <scroll-view scroll-y class="content" refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="refreshData">
        <view class="inner">
          <view class="banner">
            <text>TOUCHI CLUB · {{ activeGameName }}</text>
            <strong>{{ activeCategoryName }}</strong>
            <small>统一服务标准 · 官方虚拟支付 · 订单全程留痕</small>
          </view>
          <view v-if="loading" class="state">加载商品中...</view>
          <view v-else-if="!games.length" class="state">暂无已启用的游戏服务</view>
          <view v-else-if="!categories.length" class="state">该游戏暂未配置套餐分类</view>
          <view v-else-if="!filteredProducts.length" class="state">暂无相关商品</view>
          <view v-else class="grid">
            <view v-for="product in filteredProducts" :key="product.id" class="card" @tap="openDetail(product.id)">
              <ProductCover :image="productImage(product)" :title="product.name" :summary="product.description || '平台保障 · 快速匹配 · 服务留痕'" :badge="productBadge(product)" :sold-text="soldText(product)" :theme="productTheme(product)" />
              <view class="info"><text class="desc">{{ product.description || '精选套餐，平台保障，快速匹配陪玩' }}</text><view class="bottom"><view class="price"><text v-if="product.specs?.length">起</text><b>¥{{ money(productPrice(product)) }}</b><text>{{ product.product_type === 'guarantee' ? '/单' : '/时' }}</text></view><button @tap.stop="openDetail(product.id)">查看</button></view></view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
    <MainBottomTabs active="order" @select="selectMainTab" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getPackages, type BossPackage } from '@/api/boss'
import { getCatalogNavigation, type GameService } from '@/api/catalog'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import ProductCover from '@/components/ProductCover.vue'
import { getErrorMessage, toast } from '@/utils/feedback'
import { go, goMain, navigateToTab, type MainTab } from '@/utils/nav'

const statusBarHeight = ref(20)
const keyword = ref('')
const loading = ref(false)
const loaded = ref(false)
const refreshing = ref(false)
const games = ref<GameService[]>([])
const products = ref<BossPackage[]>([])
const activeGameId = ref<number | null>(null)
const activeCategoryId = ref<number | null>(null)

const activeGame = computed(() => games.value.find(item => item.id === activeGameId.value) || games.value[0] || null)
const categories = computed(() => activeGame.value?.groups || [])
const activeCategory = computed(() => categories.value.find(item => item.id === activeCategoryId.value) || categories.value[0] || null)
const activeGameName = computed(() => activeGame.value?.name || '游戏服务')
const activeCategoryName = computed(() => activeCategory.value?.name || '套餐服务')
const filteredProducts = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!activeGame.value || !activeCategory.value) return []
  return products.value.filter(item => {
    const matchesGame = Number(item.game_service_id || 0) === activeGame.value?.id
      || activeGame.value?.groups.some(group => group.id === item.group_id)
    const matchesCategory = item.group_id === activeCategory.value?.id
    const matchesKeyword = !q || `${item.name} ${item.description || ''}`.toLowerCase().includes(q)
    return matchesGame && matchesCategory && matchesKeyword
  })
})

function selectGame(game: GameService) {
  activeGameId.value = game.id
  activeCategoryId.value = game.groups[0]?.id || null
}

function productImage(product: BossPackage) { const item = product as BossPackage & Record<string, any>; return item.cover_url || item.image_url || item.thumb_url || item.picture_url || '' }
function productPrice(product: BossPackage) { const prices = (product.specs || []).map(item => Number(item.price || 0)).filter(value => value >= 0); return prices.length ? Math.min(...prices) : Number(product.base_price || 0) }
function soldCount(product: BossPackage) { const item = product as BossPackage & Record<string, any>; return Number(item.sold_count ?? item.sales_count ?? item.sales ?? 0) }
function soldText(product: BossPackage) { const value = soldCount(product); return value ? `已售${value}` : '新品' }
function productBadge(product: BossPackage) { if (product.product_type === 'guarantee') return '保底单'; if (product.product_type === 'fun') return '趣味单'; if (product.product_type === 'special') return '特色单'; return product.group_name || '推荐套餐' }
function productTheme(product: BossPackage) { if (product.product_type === 'guarantee') return 'gold'; if (product.product_type === 'fun') return 'rose'; if (product.product_type === 'special') return 'blue'; return 'green' }
function money(value: number) { return Number.isInteger(value) ? String(value) : Number(value || 0).toFixed(2) }
function openDetail(id: number) { go('/pages/shop/detail/index', { packageId: id }) }

function normalizeSelection() {
  const selectedGame = games.value.find(item => item.id === activeGameId.value) || games.value[0]
  activeGameId.value = selectedGame?.id || null
  const selectedGroup = selectedGame?.groups.find(item => item.id === activeCategoryId.value) || selectedGame?.groups[0]
  activeCategoryId.value = selectedGroup?.id || null
}

async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    const [navigation, list] = await Promise.all([getCatalogNavigation(), getPackages()])
    games.value = navigation.games
    products.value = list
    normalizeSelection()
    loaded.value = true
  } catch (error) {
    toast(getErrorMessage(error, '商品服务加载失败'))
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function refreshData() { refreshing.value = true; load(true) }
function selectMainTab(tab: MainTab) { if (tab === 'order') return; if (tab === 'query' || tab === 'players' || tab === 'profile') return navigateToTab(tab); goMain(tab) }
onLoad(() => { try { statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 20 } catch { statusBarHeight.value = 20 } })
onShow(() => { if (!loaded.value) load() })
</script>

<style lang="scss" scoped>
.page{min-height:100vh;padding-bottom:calc(120rpx + env(safe-area-inset-bottom));background:#f5f7f3}.top{position:sticky;top:0;z-index:10;padding:16rpx 22rpx 10rpx;background:#fff}.search{height:66rpx;display:flex;align-items:center;gap:12rpx;padding:0 20rpx;border-radius:999rpx;background:#f0f3ee}.search input{flex:1}.game-tabs{margin-top:14rpx;white-space:nowrap}.game-tab-row{display:inline-flex;gap:14rpx;padding-right:12rpx}.game-tab{display:inline-flex;align-items:center;gap:10rpx;min-height:62rpx;padding:7rpx 18rpx 7rpx 8rpx;border:1rpx solid transparent;border-radius:999rpx;color:#687665;background:#f3f5f1;font-size:22rpx}.game-tab.active{color:#fff;border-color:rgba(31,124,75,.18);background:#1f7c4b;font-weight:900;box-shadow:0 8rpx 18rpx rgba(31,124,75,.16)}.game-icon{width:48rpx;height:48rpx;flex-shrink:0;border:2rpx solid rgba(255,255,255,.72);border-radius:50%;background:#fff}.game-icon--fallback{display:flex;align-items:center;justify-content:center;color:#1f7c4b;font-size:21rpx;font-weight:900}.game-tab.active .game-icon--fallback{color:#173426;background:#f3d79b}.body{display:flex;height:calc(100vh - 184rpx - env(safe-area-inset-bottom))}.side{width:150rpx;height:100%;background:#e9eee8}.side-item{min-height:104rpx;display:flex;align-items:center;justify-content:center;padding:14rpx;color:#637064;text-align:center;font-size:24rpx}.side-item.active{color:#173426;background:#f5f7f3;font-weight:900;border-left:7rpx solid #d8a144}.side-empty{padding:34rpx 12rpx;color:#9aa39a;text-align:center;font-size:21rpx}.content{flex:1;height:100%}.inner{padding:18rpx}.banner{display:flex;flex-direction:column;padding:24rpx;border-radius:24rpx;color:#fff;background:linear-gradient(135deg,#173426,#1f7c4b)}.banner text{color:#f3d79b;font-size:17rpx;font-weight:900;letter-spacing:2rpx}.banner strong{margin-top:6rpx;font-size:32rpx}.banner small{margin-top:7rpx;opacity:.72;font-size:19rpx}.state{margin-top:18rpx;padding:60rpx 20rpx;border-radius:22rpx;color:#7a857b;text-align:center;background:#fff}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14rpx;margin-top:18rpx}.card{min-width:0;padding:10rpx;border-radius:26rpx;background:#fff;box-shadow:0 10rpx 26rpx rgba(34,62,43,.07)}.info{padding:12rpx 5rpx 5rpx}.desc{display:-webkit-box;min-height:56rpx;overflow:hidden;color:#6f7b70;font-size:19rpx;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.bottom{margin-top:10rpx;display:flex;align-items:center;justify-content:space-between;gap:6rpx}.price{display:flex;align-items:baseline;color:#a87520;white-space:nowrap}.price text{font-size:16rpx}.price b{font-size:28rpx}.bottom button{min-width:68rpx;height:46rpx;margin:0;padding:0 10rpx;border-radius:999rpx;color:#fff;background:#1f7c4b;font-size:18rpx;font-weight:900}.bottom button::after{border:0}
</style>
