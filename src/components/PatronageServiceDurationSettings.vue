<template>
  <view class="duration-settings">
    <text class="title">冠名服务时长</text>
    <text class="hint">各档总价固定，按0.5小时步长填写。修改仅影响后续购买，不改变已购约定。冠名有效期与服务时长独立，服务由陪玩自行计时。</text>
    <text v-if="loading" class="hint">加载中…</text>
    <text v-if="error" class="error">{{ error }}</text>
    <button v-if="error" data-action="duration-retry" @tap="load">重新加载</button>
    <view v-for="item in packages" :key="item.code" class="duration-row">
      <text class="name">{{ item.name }} · {{ item.amount_diamonds }} 钻</text>
      <text v-if="item.service_hours" class="hint">当前 {{ item.service_hours }} 小时 · 折算约 {{ item.hourly_amount_diamonds }} 钻/小时</text>
      <text v-else class="hint">当前等级无默认时长，请设置本档约定</text>
      <view class="editor"><input type="digit" :value="draft[item.code]" :data-action="`hours-${item.code}`" :disabled="saving !== ''" placeholder="服务小时数" @input="draft[item.code] = $event.detail.value" /><text>小时</text><button :data-action="`save-${item.code}`" :disabled="loading || saving !== ''" @tap="save(item.code)">保存</button></view>
    </view>
    <text v-if="saved" class="hint">已保存，以服务端当前约定为准</text>
  </view>
</template>
<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getMyPatronageDurations, saveMyPatronageDuration, patronageSession, type PatronagePackage, type PatronageCode, type PatronageCatalog } from '@/api/patronage'
import { getClientSessionGeneration } from '@/utils/sessionExpiry'
const packages = ref<PatronagePackage[]>([]), draft = ref<Record<string,string>>({})
const loading = ref(false), saving = ref(''), error = ref(''), saved = ref(false)
let visible = false, generation = 0
const stamp = () => `${patronageSession()}:${getClientSessionGeneration()}`
const valid = (ticket: number, owner: string) => visible && ticket === generation && owner === stamp()
function accept(data: PatronageCatalog) { packages.value = data.packages; draft.value = Object.fromEntries(data.packages.map(p => [p.code, p.service_hours || ''])) }
function hide() { visible = false; ++generation; packages.value = []; draft.value = {}; loading.value = false; saving.value = ''; saved.value = false; error.value = '' }
async function load() {
  if (!visible || saving.value) return
  const ticket = ++generation, owner = stamp(); loading.value = true; error.value = ''; saved.value = false; packages.value = []
  try { const data = await getMyPatronageDurations(); if (valid(ticket, owner)) accept(data) }
  catch { if (valid(ticket, owner)) error.value = '冠名服务时长加载失败，请重试' }
  finally { if (valid(ticket, owner)) loading.value = false }
}
async function save(code: PatronageCode) {
  if (!visible || loading.value || saving.value) return
  const ticket = generation, owner = stamp(); saving.value = code; error.value = ''; saved.value = false
  try { const data = await saveMyPatronageDuration(code, draft.value[code]); if (valid(ticket, owner)) { accept(data); saved.value = true } }
  catch { if (valid(ticket, owner)) error.value = '保存失败，请填写正数且以0.5小时为步长，或重新加载核对' }
  finally { if (valid(ticket, owner)) saving.value = '' }
}
onShow(() => { visible = true; return load() }); onHide(hide); onUnload(hide); onUnmounted(hide)
</script>
<style scoped>
.duration-settings{margin-bottom:22rpx;padding:28rpx;border-radius:28rpx;background:var(--ui-surface,#fff);color:var(--ui-text,#172116)}.title,.name,.hint,.error{display:block}.title{font-size:30rpx;font-weight:800}.hint{font-size:23rpx;line-height:1.6;color:var(--ui-muted,#687665);margin-top:12rpx}.duration-row{margin-top:24rpx;padding:18rpx;background:var(--ui-soft,#f7f3ea);border-radius:18rpx}.editor{display:flex;align-items:center;gap:14rpx;margin-top:12rpx}.editor input{flex:1;min-width:0;background:var(--ui-surface,#fff);padding:12rpx;border-radius:12rpx}.editor button{margin:0;font-size:24rpx;background:var(--ui-primary,#1f7c4b);color:#fff}.error{color:var(--ui-danger,#a13d35);font-size:24rpx}
</style>
