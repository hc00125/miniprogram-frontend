<template>
  <view v-if="enabled || (persistentEntry && visible)" @tap.stop>
    <button data-action="open-gift" class="gift-entry" :class="{ 'gift-entry--compact': compact }" :loading="loading" :disabled="loading" @tap.stop="show">{{ enabled && browseOnly ? '查看礼物' : '送礼物' }}</button>
    <GiftLiveSheet v-if="open" :key="sessionKey" :recipient="recipient" @close="close" />
  </view>
</template>
<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import GiftLiveSheet from '@/components/gifts/GiftLiveSheet.vue'
import { readGiftCapabilities } from '@/api/giftCommerce'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
const props = defineProps<{ recipientId: number | string; recipientName: string; compact?: boolean; persistentEntry?: boolean }>()
const browseOnly = ref(true)
const enabled = ref(false), open = ref(false), sessionKey = ref('')
const visible = ref(true), loading = ref(false)
const recipient = computed(() => ({ id: String(props.recipientId), name: props.recipientName }))
let generation = 0, token = ''
function close() { generation++; open.value = false; loading.value = false; sessionKey.value = String(generation) }
async function show() {
  if (!visible.value || loading.value) return
  if (props.persistentEntry) {
    if (!uni.getStorageSync('token') || !uni.getStorageSync('client_profile')?.id) {
      close(); enabled.value = false
      uni.navigateTo({ url: '/pages/client/login/index' })
      return
    }
    const pending = refresh(), ticket = generation
    await pending
    if (ticket !== generation || !visible.value || token !== String(uni.getStorageSync('token') || '')) return
    if (!enabled.value) {
      uni.showToast({ title: '礼物暂不可用，请稍后重试', icon: 'none' })
      return
    }
  }
  if (!enabled.value) return
  if (!token || token !== String(uni.getStorageSync('token') || '') || !uni.getStorageSync('client_profile')?.id) { close(); enabled.value=false; return }
  close(); open.value=true
}
async function refresh() {
  close(); enabled.value=false; token=String(uni.getStorageSync('token') || '')
  if (!visible.value || !token) return
  loading.value = true
  const ticket=generation, sent=token
  try { const c=await readGiftCapabilities(Number(props.recipientId)); if(ticket===generation && visible.value && sent===String(uni.getStorageSync('token') || '')) { enabled.value=c.catalog_read || c.records_read || c.inventory_read; browseOnly.value=!(c.purchase_enabled && c.purchase_supported && c.quote_supported) } }
  catch { if(ticket===generation) enabled.value=false }
  finally { if(ticket===generation) loading.value=false }
}
function hide() { visible.value=false; close(); enabled.value=false }
function expire(scope:string){if(scope==='token')hide()}
onShow(()=>{visible.value=true;if(!props.persistentEntry)return refresh()});onHide(hide);onUnload(hide)
// Async recommendation cards can mount after the page's first onShow.
onMounted(()=>{if(!props.persistentEntry && !token)return refresh()})
uni.$on(SESSION_EXPIRED_EVENT,expire)
onScopeDispose(()=>{hide();uni.$off(SESSION_EXPIRED_EVENT,expire)})
watch(()=>props.recipientId,()=>{if(props.persistentEntry){close();enabled.value=false}else{void refresh()}},{flush:'sync'})
</script>
<style scoped>
.gift-entry{display:flex;align-items:center;justify-content:center;min-height:88rpx;min-width:140rpx;padding:16rpx 24rpx;border-radius:22rpx;background:var(--ui-soft, #eef9ef);color:var(--ui-accent, #1f7c4b);font-size:25rpx}.gift-entry::after{border:0}
.gift-entry--compact{width:100%;min-width:0;min-height:68rpx;margin:0;padding:12rpx 4rpx;border:1rpx solid var(--ui-line, #cad9c8);border-radius:18rpx;background:var(--ui-surface, #fffefa);font-size:22rpx;line-height:1.4;white-space:nowrap;box-sizing:border-box}
</style>
