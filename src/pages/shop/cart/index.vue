<template>
  <view class="cart-page">
    <scroll-view scroll-y class="cart-scroll">
      <view class="cart-header">
        <view>
          <text class="cart-title">购物车</text>
          <text class="cart-subtitle">{{ loading ? '正在同步购物车...' : `共 ${cartCount} 项服务，陪玩商品数量代表小时` }}</text>
        </view>
        <button v-if="items.length" class="clear-btn" :disabled="operating" @tap="handleClearCart">清空</button>
      </view>

      <view v-if="items.length" class="select-row" @tap="toggleSelectAll">
        <view class="select-all-main"><view class="check-circle" :class="{ checked: allSelected }">✓</view><text>{{ allSelected ? '取消全选' : '全选' }}</text></view>
        <text>每项商品生成1个订单，时长不改变陪玩人数</text>
      </view>

      <view v-if="items.length" class="cart-list">
        <view v-for="item in items" :key="item.id" class="cart-card" :class="{ selected: isSelected(item) }" @tap="toggleItem(item)">
          <view class="item-check"><view class="check-circle" :class="{ checked: isSelected(item) }">✓</view></view>
          <image v-if="item.image_url" class="cart-image" :src="item.image_url" mode="aspectFill" />
          <view v-else class="cart-image cart-image--placeholder"><text>{{ item.package_name.slice(0, 1) }}</text></view>

          <view class="cart-main">
            <view class="cart-name-row"><text class="cart-name">{{ item.package_name }}</text><text v-if="item.group_name" class="cart-tag">{{ item.group_name }}</text></view>
            <text v-if="item.spec_display_name || item.spec_name" class="cart-spec">已选：{{ item.spec_display_name || item.spec_name }}</text>
            <text v-if="item.description" class="cart-desc">{{ item.description }}</text>
            <view class="cart-bottom">
              <view class="cart-price"><text>💎</text><text>{{ diamondAmount(item.price) }}</text><text class="price-unit">{{ isHourlyItem(item) ? '/小时' : '/单' }}</text></view>
              <view v-if="isHourlyItem(item)" class="stepper" @tap.stop>
                <button class="step-btn" :disabled="operating || itemHours(item) <= 1" @tap="adjustQuantity(item, -1)">−</button>
                <text class="step-value">{{ itemHours(item) }}小时</text>
                <button class="step-btn plus" :disabled="operating || itemHours(item) >= MAX_SERVICE_HOURS" @tap="adjustQuantity(item, 1)">＋</button>
              </view>
              <text v-else class="single-unit">按单购买</text>
            </view>
            <text class="item-total">小计 💎{{ diamondAmount(itemTotal(item)) }}</text>
          </view>

          <view class="card-actions" @tap.stop>
            <button class="remove-btn" :disabled="operating" @tap="removeItem(item.id)">删除</button>
            <button class="buy-btn" @tap="checkoutItem(item)">单独下单</button>
          </view>
        </view>
      </view>

      <view v-else class="empty-state">
        <view class="empty-icon">🛒</view>
        <text class="empty-title">{{ loading ? '正在加载购物车' : '购物车还是空的' }}</text>
        <text class="empty-desc">{{ loading ? '请稍等' : '先去挑选套餐和服务时长吧' }}</text>
        <button v-if="!loading" class="shop-btn" @tap="goShop">去点单</button>
      </view>
      <view class="bottom-spacer"></view>
    </scroll-view>

    <view v-if="items.length" class="bottom-bar">
      <view class="total-box">
        <text>{{ selectedItems.length ? `已选 ${selectedItems.length} 项，将生成 ${selectedOrderCount} 个订单` : '请选择需要结算的商品' }}</text>
        <view><text>💎</text><text>{{ diamondAmount(selectedTotalPrice) }}</text></view>
      </view>
      <button class="bottom-shop-btn" @tap="goShop">继续选购</button>
      <button class="checkout-btn" :disabled="!selectedItems.length || operating" @tap="checkoutSelected">结算所选</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { clearShopCart, getShopCart, removeShopCartItem, updateShopCartItemQuantity, type ShopCartItem } from '@/utils/shopCart'
import { go, goMain } from '@/utils/nav'
import { diamondsFrom, formatDiamonds } from '@/utils/diamonds'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { isHourlyService, MAX_SERVICE_HOURS, normalizeServiceHours } from '@/utils/serviceBilling'

const items = ref<ShopCartItem[]>([])
const selectedIds = ref<string[]>([])
const loading = ref(false)
const operating = ref(false)
const cartCount = computed(() => items.value.length)
const selectedItems = computed(() => items.value.filter(item => selectedIds.value.includes(itemKey(item))))
const selectedOrderCount = computed(() => selectedItems.value.length)
const selectedTotalPrice = computed(() => selectedItems.value.reduce((sum, item) => sum + itemTotal(item), 0))
const allSelected = computed(() => Boolean(items.value.length) && selectedItems.value.length === items.value.length)

function itemKey(item: Pick<ShopCartItem, 'id'>) { return String(item.id) }
function isHourlyItem(item: ShopCartItem) { return isHourlyService(item) }
function itemHours(item: ShopCartItem) { return isHourlyItem(item) ? normalizeServiceHours(item.quantity) : 1 }
function itemTotal(item: ShopCartItem) { return Number(item.price || 0) * itemHours(item) }
function syncSelectedIds(nextItems: ShopCartItem[]) { const available = new Set(nextItems.map(itemKey)); selectedIds.value = selectedIds.value.filter(id => available.has(id)) }

async function refreshCart() {
  loading.value = true
  try { const list = await getShopCart(); items.value = list; syncSelectedIds(list) }
  catch (error) { toast(getErrorMessage(error, '购物车加载失败')) }
  finally { loading.value = false }
}

function diamondAmount(yuanValue: number | string) {
  try { return formatDiamonds(diamondsFrom(undefined, yuanValue)) }
  catch { return '--' }
}
function isSelected(item: ShopCartItem) { return selectedIds.value.includes(itemKey(item)) }
function toggleItem(item: ShopCartItem) { const key = itemKey(item); selectedIds.value = isSelected(item) ? selectedIds.value.filter(id => id !== key) : [...selectedIds.value, key] }
function toggleSelectAll() { selectedIds.value = allSelected.value ? [] : items.value.map(itemKey) }

async function adjustQuantity(item: ShopCartItem, delta: number) {
  if (!isHourlyItem(item)) return
  const next = itemHours(item) + delta
  if (next < 1 || next > MAX_SERVICE_HOURS) return
  operating.value = true
  try { items.value = await updateShopCartItemQuantity(item.id, next); syncSelectedIds(items.value) }
  catch (error) { toast(getErrorMessage(error, '服务时长更新失败')) }
  finally { operating.value = false }
}

async function removeItem(id: string | number) {
  operating.value = true
  try { items.value = await removeShopCartItem(id); syncSelectedIds(items.value); toast('已删除') }
  catch (error) { toast(getErrorMessage(error, '删除失败')) }
  finally { operating.value = false }
}

function handleClearCart() {
  uni.showModal({
    title: '清空购物车', content: '确定要清空购物车吗？', confirmColor: '#ef4f5f',
    success: async res => {
      if (!res.confirm) return
      operating.value = true
      try { items.value = await clearShopCart(); selectedIds.value = []; success('已清空') }
      catch (error) { toast(getErrorMessage(error, '清空失败')) }
      finally { operating.value = false }
    }
  })
}

function checkoutItem(item: ShopCartItem) { go('/pages/shop/checkout/index', { cartItemIds: itemKey(item) }) }
function checkoutSelected() {
  if (!selectedItems.value.length) return toast('请选择需要结算的商品')
  if (selectedOrderCount.value > 20) return toast('单次最多结算20项商品')
  go('/pages/shop/checkout/index', { cartItemIds: selectedItems.value.map(itemKey).join(',') })
}
function goShop() { goMain('order') }
onShow(refreshCart)
</script>

<style lang="scss" scoped>
.cart-page{min-height:100vh;background:#f7f7f7;color:#222}.cart-scroll{height:100vh}.cart-header{display:flex;align-items:center;justify-content:space-between;padding:28rpx 24rpx 10rpx}.cart-title{display:block;font-size:42rpx;font-weight:900}.cart-subtitle{display:block;margin-top:8rpx;color:#888;font-size:24rpx}.clear-btn{min-width:112rpx;height:58rpx;margin:0;border-radius:999rpx;color:#888;font-size:24rpx;background:#fff}.select-row{display:flex;align-items:center;justify-content:space-between;gap:18rpx;margin:8rpx 22rpx 0;padding:18rpx 20rpx;border-radius:18rpx;background:#fff}.select-all-main{display:flex;align-items:center;gap:12rpx}.select-row>text{color:#999;font-size:21rpx;text-align:right}.cart-list{padding:0 22rpx}.cart-card{position:relative;display:flex;gap:18rpx;margin-top:20rpx;padding:22rpx 22rpx 22rpx 72rpx;border-radius:22rpx;background:#fff;border:2rpx solid transparent}.cart-card.selected{border-color:rgba(239,79,95,.34);background:linear-gradient(180deg,#fff,#fff8f9)}.item-check{position:absolute;left:22rpx;top:50%;transform:translateY(-50%)}.check-circle{width:38rpx;height:38rpx;display:flex;align-items:center;justify-content:center;border-radius:50%;border:2rpx solid #d8d8d8;color:transparent}.check-circle.checked{border-color:#ef4f5f;color:#fff;background:#ef4f5f}.cart-image{width:148rpx;height:148rpx;flex-shrink:0;border-radius:16rpx;background:#f0f0f0}.cart-image--placeholder{display:flex;align-items:center;justify-content:center;color:#20ff9a;font-size:54rpx;font-weight:900;background:#1f2118}.cart-main{min-width:0;flex:1;padding-right:108rpx}.cart-name-row{display:flex;gap:12rpx}.cart-name{flex:1;font-size:29rpx;font-weight:900}.cart-tag{padding:5rpx 10rpx;border-radius:999rpx;color:#ef4f5f;font-size:20rpx;background:#fff1f3}.cart-spec{display:block;margin-top:10rpx;color:#8b6a27;font-size:23rpx}.cart-desc{display:block;margin-top:8rpx;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#888;font-size:23rpx}.cart-bottom{display:flex;align-items:center;justify-content:space-between;gap:18rpx;margin-top:18rpx}.cart-price{display:flex;align-items:baseline;color:#ef4f5f}.cart-price text:nth-child(2){margin-left:4rpx;font-size:36rpx;font-weight:900}.price-unit{margin-left:4rpx;font-size:20rpx}.stepper{height:58rpx;display:flex;align-items:center;border-radius:999rpx;background:#f7f7f7;overflow:hidden}.step-btn{width:52rpx;height:58rpx;margin:0;padding:0;color:#777;font-size:26rpx;background:transparent}.step-value{min-width:82rpx;text-align:center;font-size:22rpx;font-weight:900}.single-unit{color:#888;font-size:22rpx}.item-total{display:block;margin-top:10rpx;color:#555;font-size:22rpx}.card-actions{position:absolute;right:18rpx;top:22rpx;display:flex;flex-direction:column;gap:10rpx}.card-actions button{width:106rpx;height:52rpx;margin:0;padding:0;border-radius:999rpx;font-size:20rpx}.remove-btn{color:#888;background:#f3f3f3}.buy-btn{color:#fff;background:#1f7c4b}.empty-state{min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center}.empty-icon{font-size:86rpx}.empty-title{margin-top:20rpx;font-size:34rpx;font-weight:900}.empty-desc{margin-top:10rpx;color:#888;font-size:24rpx}.shop-btn{min-width:220rpx;height:78rpx;margin-top:28rpx;border-radius:999rpx;color:#fff;background:#1f7c4b}.bottom-spacer{height:190rpx}.bottom-bar{position:fixed;left:0;right:0;bottom:0;z-index:20;display:flex;align-items:center;gap:12rpx;padding:18rpx 22rpx calc(18rpx + env(safe-area-inset-bottom));background:#fff}.total-box{flex:1}.total-box>text{color:#888;font-size:20rpx}.total-box>view{color:#ef4f5f}.total-box>view text:last-child{font-size:36rpx;font-weight:900}.bottom-shop-btn,.checkout-btn{height:76rpx;margin:0;padding:0 20rpx;border-radius:999rpx;font-size:23rpx;font-weight:900}.bottom-shop-btn{color:#1f7c4b;background:#eef8f1}.checkout-btn{min-width:170rpx;color:#fff;background:#ef4f5f}button::after{border:none}
</style>
