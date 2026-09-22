<template>
  <view v-if="visible" class="gift-mask" @tap="close">
    <view class="gift-sheet" @tap.stop>
      <view class="gift-header">
        <view><text class="gift-caption">送给</text><text class="gift-recipient">{{ state.recipient ? state.recipient.name : '' }}</text></view>
        <button class="gift-close" aria-label="关闭礼物面板" @tap="close">关闭</button>
      </view>
      <view class="gift-tabs">
        <button data-action="inventory" :class="{ active: tab === 'inventory' }" @tap="changeTab('inventory')">我的礼物</button>
        <button data-action="purchase" :class="{ active: tab === 'purchase' }" @tap="changeTab('purchase')">购买后赠送</button>
      </view>
      <scroll-view scroll-y class="gift-content">
        <view v-if="loading" class="gift-note">正在加载礼物…</view>
        <view v-else-if="error" class="gift-note">礼物加载失败，请稍后重试</view>
        <GiftGrid v-else :items="items" :selected-code="state.gift ? state.gift.code : ''" :empty-text="tab === 'inventory' ? '暂无可赠礼物' : '暂无可选礼物'" @select="select" />
        <button v-if="tab === 'inventory' && !items.length" class="gift-browse" @tap="changeTab('purchase')">去选礼物</button>
      </scroll-view>
      <view class="gift-footer">
        <view class="gift-quantity"><text>数量</text><button data-action="decrease" :disabled="!state.gift || state.quantity <= 1" @tap="quantity(-1)">−</button><text>{{ state.quantity }}</text><button data-action="increase" :disabled="!state.gift || state.quantity >= state.max_quantity" @tap="quantity(1)">＋</button></view>
        <text v-if="tab === 'purchase'" class="gift-total">合计 {{ state.total_diamonds }} 钻石</text>
        <text v-else class="gift-total">不额外扣钻石 · 可送 {{ availableQuantity }} 件</text>
        <text v-if="tab === 'purchase'" class="gift-note">{{ balanceText }}</text>
        <text v-if="insufficient" class="gift-warning">余额不足；开放后可充值并重新确认，不会自动赠送</text>
        <text class="gift-note">{{ blockedReason }}</text>
        <button data-action="submit" class="gift-submit" :disabled="true">暂未开放</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import GiftGrid from '@/components/gifts/GiftGrid.vue'
import type { GiftCapabilities, GiftCatalogItem, GiftInventoryItem, GiftRecipient } from '@/api/gifts'
import { createGiftIntent } from '@/utils/giftIntent'
const props = withDefaults(defineProps<{
  open: boolean; accountId: string; recipient: GiftRecipient
  catalog?: GiftCatalogItem[]; inventory?: GiftInventoryItem[]
  capabilities?: GiftCapabilities; balanceDiamonds?: number | null
  maxQuantity?: number; loading?: boolean; error?: string
}>(), { catalog: () => [], inventory: () => [], capabilities: () => ({ purchase_enabled: false, inventory_send_enabled: false }), balanceDiamonds: null, maxQuantity: 1, loading: false, error: '' })
const emit = defineEmits<{ (event: 'close'): void }>()
const intent = createGiftIntent()
const state = ref(intent.snapshot())
const tab = ref<'purchase' | 'inventory'>('purchase')
const update = () => { state.value = intent.snapshot() }
const visible = computed(() => props.open && state.value.account_id === props.accountId && Boolean(state.value.recipient))
const items = computed(() => tab.value === 'purchase' ? props.catalog : props.inventory)
const availableQuantity = computed(() => props.inventory.find(item => item.code === state.value.gift?.code)?.available_quantity || 0)
const balanceKnown = computed(() => typeof props.balanceDiamonds === 'number' && Number.isSafeInteger(props.balanceDiamonds) && props.balanceDiamonds >= 0)
const balanceText = computed(() => balanceKnown.value ? `可用余额 ${props.balanceDiamonds} 钻石` : '余额暂不可用')
const insufficient = computed(() => tab.value === 'purchase' && Boolean(state.value.gift) && balanceKnown.value && (props.balanceDiamonds as number) < state.value.total_diamonds)
// Capabilities alone cannot enable an unimplemented transaction adapter.
const blockedReason = computed(() => (tab.value === 'purchase' ? props.capabilities.purchase_enabled : props.capabilities.inventory_send_enabled)
  ? '交易功能尚未接入，暂未开放' : '礼物交易暂未开放')
function close() { intent.close(); update(); emit('close') }
function changeTab(value: 'purchase' | 'inventory') { tab.value = value; intent.clearSelection(); update() }
function select(item: GiftCatalogItem) {
  const limit = tab.value === 'inventory' ? props.inventory.find(entry => entry.code === item.code)?.available_quantity || 0 : props.maxQuantity
  intent.select(item, limit); update()
}
function quantity(delta: number) { intent.setQuantity(state.value.quantity + delta); update() }
watch(() => props.open, value => {
  if (value) { intent.open(props.accountId, props.recipient); tab.value = 'purchase' } else intent.close()
  update()
}, { immediate: true, flush: 'sync' })
watch(() => props.accountId, () => { close() }, { flush: 'sync' })
watch(() => props.recipient.id, () => { close() }, { flush: 'sync' })
watch(() => [props.catalog, props.inventory, props.maxQuantity], () => { intent.clearSelection(); update() }, { deep: true, flush: 'sync' })
onScopeDispose(() => intent.close())
</script>

<style scoped>
.gift-mask { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: flex-end; background: rgba(23, 33, 22, .4); }
.gift-sheet { width: 100%; max-height: 88vh; display: flex; flex-direction: column; box-sizing: border-box; border-radius: 32rpx 32rpx 0 0; background: #f7f3ea; color: #172116; padding: 24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom)); }
.gift-header { display: flex; flex-shrink: 0; align-items: center; justify-content: space-between; gap: 20rpx; }
.gift-header > view { min-width: 0; }
.gift-caption { font-size: 24rpx; color: #687665; margin-right: 14rpx; }
.gift-recipient { font-size: 30rpx; font-weight: 800; overflow-wrap: anywhere; }
.gift-close { min-width: 88rpx; min-height: 88rpx; flex-shrink: 0; font-size: 25rpx; background: transparent; }
.gift-tabs { display: flex; gap: 16rpx; margin: 18rpx 0; flex-shrink: 0; }
.gift-tabs button { flex: 1; min-height: 88rpx; font-size: 27rpx; border-radius: 22rpx; background: #fff; color: #687665; }
.gift-tabs .active { background: #eef9ef; color: #1f7c4b; font-weight: 800; }
.gift-content { height: 340rpx; min-height: 0; }
.gift-footer { display: flex; flex-direction: column; gap: 12rpx; padding-top: 18rpx; flex-shrink: 0; }
.gift-quantity { display: flex; align-items: center; gap: 20rpx; font-size: 27rpx; }
.gift-quantity button { display: flex; align-items: center; justify-content: center; min-width: 88rpx; min-height: 88rpx; margin: 0; background: #fff; }
.gift-total { color: #1f7c4b; font-size: 29rpx; font-weight: 800; }
.gift-note { color: #687665; font-size: 24rpx; }
.gift-warning { color: #9a6a16; font-size: 24rpx; }
.gift-submit { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 92rpx; padding: 20rpx; box-sizing: border-box; border-radius: 24rpx; background: #2f9b63; color: #fff; font-size: 29rpx; }
.gift-submit[disabled] { opacity: .56; background: #2f9b63; color: #fff; }
.gift-browse { min-height: 88rpx; background: #eef9ef; color: #1f7c4b; font-size: 26rpx; }
button::after { border: 0; }
</style>
