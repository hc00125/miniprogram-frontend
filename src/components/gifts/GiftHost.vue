<template>
  <view v-if="enabled" @tap.stop>
    <button data-action="open-gift" class="gift-entry" @tap.stop="show">送礼物</button>
    <GiftLiveSheet v-if="open" :key="sessionKey" :recipient="recipient" @close="close" />
  </view>
</template>
<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import GiftLiveSheet from '@/components/gifts/GiftLiveSheet.vue'
import { readGiftCapabilities } from '@/api/giftCommerce'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
const props = defineProps<{ recipientId: number | string; recipientName: string }>()
const enabled = ref(false), open = ref(false), sessionKey = ref('')
const recipient = computed(() => ({ id: String(props.recipientId), name: props.recipientName }))
let generation = 0, visible = true, token = ''
function close() { generation++; open.value = false; sessionKey.value = String(generation) }
function show() {
  if (!enabled.value || !visible) return
  if (!token || token !== String(uni.getStorageSync('token') || '') || !uni.getStorageSync('client_profile')?.id) { close(); enabled.value=false; return }
  close(); open.value=true
}
async function refresh() {
  close(); enabled.value=false; token=String(uni.getStorageSync('token') || '')
  if (!visible || !token) return
  const ticket=generation, sent=token
  try { const c=await readGiftCapabilities(Number(props.recipientId)); if(ticket===generation && visible && sent===String(uni.getStorageSync('token') || '')) enabled.value=c.catalog_read || c.records_read || c.inventory_read }
  catch { if(ticket===generation) enabled.value=false }
}
function hide() { visible=false; close(); enabled.value=false }
function expire(scope:string){if(scope==='token')hide()}
onShow(()=>{visible=true;return refresh()});onHide(hide);onUnload(hide)
uni.$on(SESSION_EXPIRED_EVENT,expire)
onScopeDispose(()=>{hide();uni.$off(SESSION_EXPIRED_EVENT,expire)})
watch(()=>props.recipientId,()=>{void refresh()},{flush:'sync'})
</script>
<style scoped>
.gift-entry{display:flex;align-items:center;justify-content:center;min-height:88rpx;min-width:140rpx;padding:16rpx 24rpx;border-radius:22rpx;background:#eef9ef;color:#1f7c4b;font-size:25rpx}.gift-entry::after{border:0}
</style>
