<template>
  <view class="cart-page">
    <scroll-view scroll-y class="cart-scroll">
      <view class="cart-header">
        <view>
          <text class="cart-title">购物车</text>
          <text class="cart-subtitle">{{ loading ? '正在同步购物车...' : `共 ${cartCount} 件商品，当前版本一次结算一个商品规格` }}</text>
        </view>
        <button v-if="items.length" class="clear-btn" :disabled="operating" @tap="handleClearCart">清空</button>
      </view>

      <view v-if="items.length" class="select-row">
        <text>单项目结算</text>
        <text>同一规格数量可以大于 1</text>
      </view>

      <view v-if="items.length" class="cart-list">
        <view v-for="item in items" :key="item.id" class="cart-card" :class="{ selected: isSelected(item) }" @tap="selectItem(item)">
          <view class="item-check"><view class="check-circle" :class="{ checked: isSelected(item) }">✓</view></view>

          <image v-if="item.image_url" class="cart-image" :src="item.image_url" mode="aspectFill" />
          <view v-else class="cart-image cart-image--placeholder"><text>{{ item.package_name.slice(0, 1) }}</text></view>

          <view class="cart-main">
            <view class="cart-name-row"><text class="cart-name">{{ item.package_name }}</text><text v-if="item.group_name" class="cart-tag">{{ item.group_name }}</text></view>
            <text v-if="item.spec_display_name || item.spec_name" class="cart-spec">已选：{{ item.spec_display_name || item.spec_name }}</text>
            <text v-if="item.description" class="cart-desc">{{ item.description }}</text>
            <view class="cart-bottom">
              <view class="cart-price"><text>¥</text><text>{{ formatMoney(item.price) }}</text></view>
              <view class="stepper" @tap.stop>
                <button class="step-btn" :disabled="operating" @tap="adjustQuantity(item, -1)">−</button>
                <text class="step-value">{{ item.quantity }}</text>
                <button class="step-btn plus" :disabled="operating" @tap="adjustQuantity(item, 1)">＋</button>
              </view>
            </view>
          </view>

          <view class="card-actions" @tap.stop>
            <button class="remove-btn" :disabled="operating" @tap="removeItem(item.id)">删除</button>
            <button class="buy-btn" @tap="checkoutItem(item)">去下单</button>
          </view>
        </view>
      </view>

      <view v-else class="empty-state">
        <view class="empty-icon">🛒</view>
        <text class="empty-title">{{ loading ? '正在加载购物车' : '购物车还是空的' }}</text>
        <text class="empty-desc">{{ loading ? '请稍等' : '先去挑选一个套餐或规格吧' }}</text>
        <button v-if="!loading" class="shop-btn" @tap="goShop">去点单</button>
      </view>
      <view class="bottom-spacer"></view>
    </scroll-view>

    <view v-if="items.length" class="bottom-bar">
      <view class="total-box">
        <text>{{ selectedItem ? `已选 ${selectedItem.quantity} 件` : '请选择一个商品规格' }}</text>
        <view><text>¥</text><text>{{ formatMoney(selectedTotalPrice) }}</text></view>
      </view>
      <button class="bottom-shop-btn" @tap="goShop">继续选购</button>
      <button class="checkout-btn" :disabled="!selectedItem || operating" @tap="checkoutSelected">结算所选</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { clearShopCart, getShopCart, removeShopCartItem, updateShopCartItemQuantity, type ShopCartItem } from '@/utils/shopCart'
import { go, goMain } from '@/utils/nav'
import { getErrorMessage, success, toast } from '@/utils/feedback'

const items = ref<ShopCartItem[]>([])
const selectedId = ref('')
const loading = ref(false)
const operating = ref(false)
const cartCount = computed(() => items.value.reduce((sum, item) => sum + Number(item.quantity || 1), 0))
const selectedItem = computed(() => items.value.find(item => itemKey(item) === selectedId.value) || null)
const selectedTotalPrice = computed(() => selectedItem.value ? Number(selectedItem.value.price || 0) * Number(selectedItem.value.quantity || 1) : 0)

function itemKey(item: Pick<ShopCartItem, 'id'>) { return String(item.id) }
function syncSelectedId(nextItems: ShopCartItem[]) {
  if (selectedId.value && nextItems.some(item => itemKey(item) === selectedId.value)) return
  selectedId.value = ''
}

async function refreshCart() {
  loading.value = true
  try {
    const list = await getShopCart()
    items.value = list
    syncSelectedId(list)
  } catch (error) {
    toast(getErrorMessage(error, '购物车加载失败'))
  } finally { loading.value = false }
}

function formatMoney(value: number) { return Number.isInteger(value) ? `${value}` : Number(value || 0).toFixed(2) }
function isSelected(item: ShopCartItem) { return selectedId.value === itemKey(item) }
function selectItem(item: ShopCartItem) { selectedId.value = isSelected(item) ? '' : itemKey(item) }

async function adjustQuantity(item: ShopCartItem, delta: number) {
  const next = Number(item.quantity || 1) + delta
  operating.value = true
  try {
    if (next <= 0) {
      items.value = await removeShopCartItem(item.id)
      syncSelectedId(items.value)
      toast('已删除')
      return
    }
    items.value = await updateShopCartItemQuantity(item.id, next)
    syncSelectedId(items.value)
  } catch (error) {
    toast(getErrorMessage(error, '数量更新失败'))
  } finally { operating.value = false }
}

async function removeItem(id: string | number) {
  operating.value = true
  try {
    items.value = await removeShopCartItem(id)
    syncSelectedId(items.value)
    toast('已删除')
  } catch (error) {
    toast(getErrorMessage(error, '删除失败'))
  } finally { operating.value = false }
}

function handleClearCart() {
  uni.showModal({
    title: '清空购物车',
    content: '确定要清空购物车吗？',
    confirmColor: '#ef4f5f',
    success: async (res) => {
      if (!res.confirm) return
      operating.value = true
      try {
        items.value = await clearShopCart()
        selectedId.value = ''
        success('已清空')
      } catch (error) {
        toast(getErrorMessage(error, '清空失败'))
      } finally { operating.value = false }
    }
  })
}

function itemSpecId(item: ShopCartItem) { return item.spec_id || item.spec_id_snapshot || undefined }
function checkoutItem(item: ShopCartItem) {
  go('/pages/shop/checkout/index', { packageId: item.package_id, specId: itemSpecId(item), quantity: item.quantity })
}
function checkoutSelected() {
  if (!selectedItem.value) return toast('请选择一个要结算的商品规格')
  go('/pages/shop/checkout/index', { cartItemIds: itemKey(selectedItem.value) })
}
function goShop() { goMain('order') }

onShow(refreshCart)
</script>

<style lang="scss" scoped>
.cart-page { min-height:100vh;background:#f7f7f7;color:#222; }.cart-scroll { height:100vh; }
.cart-header { display:flex;align-items:center;justify-content:space-between;padding:28rpx 24rpx 10rpx;box-sizing:border-box; }.cart-title { display:block;font-size:42rpx;font-weight:900; }.cart-subtitle { display:block;margin-top:8rpx;color:#888;font-size:24rpx; }
.clear-btn { min-width:112rpx;height:58rpx;margin:0;padding:0 22rpx;border-radius:999rpx;color:#888;font-size:24rpx;background:#fff; }.clear-btn::after,.step-btn::after,.remove-btn::after,.buy-btn::after,.bottom-bar button::after,.shop-btn::after { border:none; }
.select-row { display:flex;align-items:center;justify-content:space-between;gap:18rpx;margin:8rpx 22rpx 0;padding:18rpx 20rpx;border-radius:18rpx;background:#fff;box-sizing:border-box; }.select-row text:first-child { color:#333;font-size:25rpx;font-weight:900; }.select-row text:last-child { color:#999;font-size:22rpx; }
.cart-list { padding:0 22rpx; }.cart-card { position:relative;display:flex;gap:18rpx;margin-top:20rpx;padding:22rpx 22rpx 22rpx 72rpx;border-radius:22rpx;background:#fff;box-sizing:border-box;border:2rpx solid transparent; }.cart-card.selected { border-color:rgba(239,79,95,.34);background:linear-gradient(180deg,#fff,#fff8f9); }
.item-check { position:absolute;left:22rpx;top:50%;transform:translateY(-50%); }.check-circle { width:38rpx;height:38rpx;display:flex;align-items:center;justify-content:center;border-radius:50%;border:2rpx solid #d8d8d8;color:transparent;font-size:22rpx;font-weight:900;box-sizing:border-box; }.check-circle.checked { border-color:#ef4f5f;color:#fff;background:linear-gradient(135deg,#ff7583,#ef3f51); }
.cart-image { width:148rpx;height:148rpx;flex-shrink:0;border-radius:16rpx;background:#f0f0f0; }.cart-image--placeholder { display:flex;align-items:center;justify-content:center;color:#20ff9a;font-size:54rpx;font-weight:900;background:linear-gradient(135deg,#2f2f20,#1f2118); }
.cart-main { min-width:0;flex:1;padding-right:108rpx; }.cart-name-row { display:flex;align-items:flex-start;gap:12rpx; }.cart-name { flex:1;min-width:0;font-size:29rpx;font-weight:900;line-height:1.35; }.cart-tag { flex-shrink:0;padding:5rpx 10rpx;border-radius:999rpx;color:#ef4f5f;font-size:20rpx;background:#fff1f3; }.cart-spec { display:block;margin-top:10rpx;color:#8b6a27;font-size:23rpx; }.cart-desc { display:block;margin-top:8rpx;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#888;font-size:23rpx; }
.cart-bottom { display:flex;align-items:center;justify-content:space-between;gap:18rpx;margin-top:18rpx; }.cart-price { display:flex;align-items:baseline;color:#ef4f5f; }.cart-price text:first-child { font-size:22rpx;font-weight:900; }.cart-price text:last-child { margin-left:4rpx;font-size:36rpx;font-weight:900; }.stepper { height:58rpx;display:flex;align-items:center;border-radius:999rpx;background:#f7f7f7;overflow:hidden; }.step-btn { width:58rpx;height:58rpx;margin:0;padding:0;color:#777;font-size:26rpx;background:transparent; }.step-btn.plus { color:#ef4f5f; }.step-value { min-width:54rpx;text-align:center;font-weight:900; }
.card-actions { position:absolute;right:18rpx;top:22rpx;display:flex;flex-direction:column;gap:10rpx; }.card-actions button { width:92rpx;height:52rpx;margin:0;padding:0;border-radius:999rpx;font-size:20rpx; }.remove-btn { color:#888;background:#f3f3f3; }.buy-btn { color:#fff;background:#1f7c4b; }
.empty-state { min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40rpx;box-sizing:border-box; }.empty-icon { font-size:86rpx; }.empty-title { margin-top:20rpx;font-size:34rpx;font-weight:900; }.empty-desc { margin-top:10rpx;color:#888;font-size:24rpx; }.shop-btn { min-width:220rpx;height:78rpx;margin-top:28rpx;border-radius:999rpx;color:#fff;background:#1f7c4b; }
.bottom-spacer { height:190rpx; }.bottom-bar { position:fixed;left:0;right:0;bottom:0;z-index:20;display:flex;align-items:center;gap:12rpx;padding:18rpx 22rpx calc(18rpx + env(safe-area-inset-bottom));background:rgba(255,255,255,.98);box-shadow:0 -10rpx 30rpx rgba(0,0,0,.08); }.total-box { flex:1;min-width:0; }.total-box>text { color:#888;font-size:20rpx; }.total-box>view { display:flex;align-items:baseline;color:#ef4f5f; }.total-box>view text:last-child { font-size:36rpx;font-weight:900; }.bottom-shop-btn,.checkout-btn { height:76rpx;margin:0;padding:0 20rpx;border-radius:999rpx;font-size:23rpx;font-weight:900; }.bottom-shop-btn { color:#1f7c4b;background:#eef8f1; }.checkout-btn { min-width:170rpx;color:#fff;background:linear-gradient(135deg,#ff7583,#ef3f51); }.checkout-btn[disabled] { opacity:.5; }
</style>
