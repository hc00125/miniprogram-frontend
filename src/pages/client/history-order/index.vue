<template>
  <view class="history-order">
    <view v-if="!loggedIn" class="card"><text>请先登录查看自己的订单</text><button class="primary" @tap="go('/pages/client/login/index')">微信登录</button></view>
    <template v-else>
      <view v-if="errorText" class="card error">{{ errorText }}</view>
      <view v-if="order" class="card"><view class="heading"><text class="title">{{ order.package_name }}</text><text class="badge">{{ order.status }}</text></view><text class="sub">客服代派 · 线下收款</text><text class="amount">¥{{ amountText }}</text><text class="hint">此订单已由客服确认线下收款，无需在小程序再次付款。</text><view class="row"><text>订单号</text><text selectable>{{ order.order_no }}</text></view><view class="row"><text>商品规格</text><text>{{ order.spec_name_snapshot || '默认规格' }}</text></view><view class="row"><text>服务人数</text><text>{{ order.required_players }} 人</text></view><view class="row"><text>时长 / 份数</text><text>{{ order.booked_hours }}</text></view><view v-if="order.kook_room_number" class="row"><text>KOOK房间</text><text selectable>{{ order.kook_room_number }}</text></view><view v-if="order.game_id" class="row"><text>游戏 / 房间</text><text selectable>{{ order.game_id }}</text></view><view class="note"><text>服务备注</text><text class="sub">{{ order.boss_note || '无' }}</text></view></view>
      <view v-if="order" class="card"><text class="section-title">服务陪玩</text><text v-if="!order.players?.length" class="sub">等待陪玩接单</text><view v-for="player in order.players || []" :key="player.id" class="row"><text>{{ player.name }}</text><text>{{ player.status }}</text></view></view>
      <view v-if="!order && loading" class="card sub">正在查询订单…</view>
      <button class="primary" :disabled="loading" :loading="loading" @tap="load">刷新订单</button>
      <button class="secondary" @tap="go('/pages/client/customer-service/index')">退改或续单，联系原客服</button>
    </template>
  </view>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getHistoryOrder } from '@/api/history'
import { getStorage, SESSION_CHANGED_EVENT } from '@/utils/storage'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
import { go } from '@/utils/nav'
import { getErrorMessage } from '@/utils/feedback'
const order = ref<any>(null), loading = ref(false), loggedIn = ref(false), errorText = ref('')
let orderNo = '', generation = 0
const amountText = computed(() => Number(order.value?.total_amount || 0).toFixed(2))
function reset() { generation++; order.value = null; loading.value = false; errorText.value = ''; loggedIn.value = !!getStorage<string>('token') }
async function load() {
  const token = getStorage<string>('token') || ''; loggedIn.value = !!token
  if (!token) { reset(); return }
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(orderNo)) { errorText.value = '订单号不正确'; return }
  const epoch = ++generation; loading.value = true; errorText.value = ''
  const valid = () => generation === epoch && getStorage<string>('token') === token
  try { const result = await getHistoryOrder(orderNo); if (!valid()) return; if (result.source !== 'staff') { order.value = null; errorText.value = '请从订单中心查看这笔自助订单'; return } order.value = result }
  catch (error) { if (valid()) { order.value = null; errorText.value = getErrorMessage(error, '查询失败，请刷新或联系客服') } }
  finally { if (valid()) loading.value = false }
}
onLoad(query => { orderNo = String(query?.orderNo || '') })
onShow(load)
onHide(() => { generation++; loading.value = false })
uni.$on(SESSION_CHANGED_EVENT, reset); uni.$on(SESSION_EXPIRED_EVENT, reset)
onUnload(() => { reset(); uni.$off(SESSION_CHANGED_EVENT, reset); uni.$off(SESSION_EXPIRED_EVENT, reset) })
</script>
<style scoped>
.history-order{min-height:100vh;box-sizing:border-box;padding:30rpx;background:#fbf7ef;color:#2c4132}.card{background:white;border:1rpx solid #e3eadc;border-radius:28rpx;padding:30rpx;margin-bottom:24rpx}.heading{display:flex;justify-content:space-between;gap:20rpx;align-items:flex-start}.title{font-size:36rpx;font-weight:700}.badge{background:#eef9ef;color:#1f7c4b;border-radius:20rpx;padding:8rpx 16rpx;font-size:23rpx;white-space:nowrap}.sub,.hint{display:block;font-size:26rpx;line-height:1.7;color:#75836f;margin-top:14rpx;white-space:pre-wrap}.hint{font-size:24rpx}.amount{display:block;color:#1f7c4b;font-size:54rpx;font-weight:750;margin-top:26rpx}.row{display:flex;justify-content:space-between;gap:25rpx;padding:24rpx 0;border-bottom:1rpx solid #edf0e6;font-size:25rpx}.row text:first-child{flex-shrink:0;color:#778570}.row text:last-child{text-align:right;overflow-wrap:anywhere}.note{margin-top:26rpx;font-size:26rpx}.section-title{font-size:30rpx;font-weight:650}.primary,.secondary{display:flex;justify-content:center;align-items:center;width:100%;box-sizing:border-box;min-height:90rpx;padding:22rpx;border-radius:22rpx;margin:22rpx 0;font-size:29rpx}.primary{background:#1f7c4b;color:#fff}.secondary{background:#eef9ef;color:#1f7c4b}.primary[disabled]{opacity:.5}.error{color:#9a5822}
</style>
