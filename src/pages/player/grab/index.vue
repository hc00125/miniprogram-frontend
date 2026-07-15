<template>
  <view class="grab-page">
    <view class="status-strip"><view class="status-dot" :class="{ live: online }"></view><view><text>{{ online ? '实时接单中' : '当前离线' }}</text><text>{{ online ? '指定邀请和公开订单每10秒自动刷新' : '上线后才会开始接收公开订单' }}</text></view><button :disabled="onlineUpdating" @tap="toggleOnline">{{ onlineUpdating ? '同步中' : (online ? '下线' : '上线') }}</button></view>

    <view class="player-card"><image v-if="playerAvatarUrl" class="avatar" :src="playerAvatarUrl" mode="aspectFill" /><view v-else class="avatar empty">{{ player?.name?.[0] || '陪' }}</view><view class="player-main"><text>{{ player?.name || '陪玩师' }}</text><text>{{ player?.type_name || '陪玩' }} · {{ playerRatingText }}</text></view><button @tap="go('/pages/player/earnings/index')">收益</button></view>

    <view v-if="invitations.length" class="section">
      <view class="section-head"><view><text>老板指定邀请</text><text>仅你本人可以接受，10分钟内有效</text></view><text>{{ invitations.length }}条</text></view>
      <view v-for="item in invitations" :key="item.designation_id" class="invitation-card">
        <view class="invite-top"><view><text class="invite-label">专属指定</text><text class="order-no">{{ item.order_no }}</text></view><text class="countdown">{{ countdownText(item.designation_expires_at) }}</text></view>
        <text class="order-title">{{ item.package_name || '陪玩订单' }}</text>
        <view class="meta-grid"><view><text>人数</text><text>{{ item.current_players || 0 }}/{{ item.required_players }}人</text></view><view><text>订单金额</text><text>¥{{ money(item.total_price_per_hour) }}</text></view><view><text>购买时长</text><text>{{ formatHours(item.booked_hours || 1) }}</text></view><view><text>指定服务费</text><text>¥0.00</text></view></view>
        <text v-if="item.boss_note" class="boss-note">老板备注：{{ item.boss_note }}</text>
        <view class="invite-actions"><button class="decline" :disabled="item.responding" @tap="decline(item)">拒绝</button><button class="accept" :disabled="item.responding" @tap="accept(item)">{{ item.responding ? '处理中...' : '接受指定' }}</button></view>
      </view>
    </view>

    <view class="section">
      <view class="section-head"><view><text>公开抢单大厅</text><text>指定陪玩预留名额不会被其他人占用</text></view><button @tap="refreshAll">刷新</button></view>
      <view v-if="orders.length" class="order-list">
        <view v-for="order in orders" :key="order.order_no" class="order-card"><view class="order-head"><view><text class="order-title">{{ order.package_name || '套餐订单' }}</text><text class="order-no">{{ order.order_no }}</text></view><text class="public-tag">公开名额</text></view><view class="meta-grid"><view><text>人数</text><text>{{ order.current_players || 0 }}/{{ order.required_players }}人</text></view><view><text>价格</text><text>¥{{ money(order.total_price_per_hour) }}</text></view></view><text v-if="order.boss_note" class="boss-note">老板备注：{{ order.boss_note }}</text><button class="grab-btn" :disabled="order.grabbing || !order.can_grab" @tap="grab(order)">{{ order.grabbing ? '抢单中...' : '立即抢单' }}</button></view>
      </view>
      <view v-else class="empty-card">暂无公开可抢订单，请保持在线。</view>
    </view>

    <view class="footer-actions"><button @tap="go('/pages/player/my-orders/index')">我的订单</button><button @tap="handleLogout">退出登录</button></view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { acceptDesignation, declineDesignation, getAvailableOrders, getCurrentPlayer, getDesignationInvitations, grabOrder as apiGrabOrder, logoutPlayer, updatePlayerOnlineStatus, type DesignationInvitation } from '@/api/player'
import { getStorage, removeStorage } from '@/utils/storage'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { go, replace } from '@/utils/nav'
import { getClientProfile, isApprovedPlayer, normalizeAvatarUrl, setPlayerOnlineStatus, getPlayerOnlineStatus } from '@/utils/client'
import { formatHours } from '@/utils/format'

const player = ref<any>(null)
const orders = ref<any[]>([])
const invitations = ref<Array<DesignationInvitation & { responding?: boolean }>>([])
const online = ref(getPlayerOnlineStatus())
const onlineUpdating = ref(false)
const now = ref(Date.now())
let refreshTimer: ReturnType<typeof setInterval> | null = null
let clockTimer: ReturnType<typeof setInterval> | null = null

const playerAvatarUrl = computed(() => { const profile = getClientProfile(); return normalizeAvatarUrl(player.value?.avatar_url || player.value?.avatarUrl || profile?.avatar_url || profile?.avatarUrl) })
const playerRatingText = computed(() => Number(player.value?.rating_count || 0) > 0 ? `★ ${Number(player.value?.avg_rating || 0).toFixed(1)}` : '暂无评分')
function money(value: number | string | null | undefined) { return Number(value || 0).toFixed(2) }
function countdownText(value: string) { const diff = Math.max(0, Math.floor((new Date(value).getTime() - now.value) / 1000)); return diff ? `${Math.floor(diff / 60)}:${String(diff % 60).padStart(2, '0')}后超时` : '即将超时' }
function stopRefresh() { if (refreshTimer) clearInterval(refreshTimer); refreshTimer = null }
async function refreshAll() {
  try {
    const [inviteList, publicOrders] = await Promise.all([getDesignationInvitations(), getAvailableOrders()])
    invitations.value = (inviteList || []).map(item => ({ ...item, responding: false }))
    orders.value = (publicOrders || []).map(item => ({ ...item, grabbing: false }))
  } catch (error) { toast(getErrorMessage(error, '订单刷新失败')) }
}
async function startRefresh() { await refreshAll(); stopRefresh(); refreshTimer = setInterval(refreshAll, 10000) }
async function accept(item: DesignationInvitation & { responding?: boolean }) {
  if (!(await confirm(`接受老板指定邀请吗？\n套餐：${item.package_name}\n指定本人不额外加价`, '接受指定'))) return
  item.responding = true
  try { await acceptDesignation(item.order_no); success('已接受指定邀请'); await refreshAll(); go('/pages/player/order-detail/index', { orderNo: item.order_no }) }
  catch (error) { toast(getErrorMessage(error, '接受指定失败')) }
  finally { item.responding = false }
}
async function decline(item: DesignationInvitation & { responding?: boolean }) {
  if (!(await confirm('拒绝后该名额会立即转为公开抢单，确定拒绝吗？', '拒绝指定'))) return
  item.responding = true
  try { await declineDesignation(item.order_no); success('已拒绝，名额转为公开抢单'); await refreshAll() }
  catch (error) { toast(getErrorMessage(error, '拒绝指定失败')) }
  finally { item.responding = false }
}
async function grab(order: any) {
  if (!order.can_grab || order.grabbing) return
  if (!(await confirm(`确定抢这个公开订单吗？\n套餐：${order.package_name}`))) return
  order.grabbing = true
  try { await apiGrabOrder(order.order_no, player.value.id); success('抢单成功'); await refreshAll(); go('/pages/player/order-detail/index', { orderNo: order.order_no }) }
  catch (error) { toast(getErrorMessage(error, '抢单失败')) }
  finally { order.grabbing = false }
}
async function toggleOnline() {
  if (onlineUpdating.value) return
  onlineUpdating.value = true
  try {
    const result = await updatePlayerOnlineStatus(!online.value)
    online.value = Boolean(result.is_online)
    setPlayerOnlineStatus(online.value)
    if (online.value) await startRefresh(); else { stopRefresh(); await refreshAll() }
    toast(online.value ? '已上线，开始接单' : '已离线，指定邀请仍可查看')
  } catch (error) { toast(getErrorMessage(error, '在线状态更新失败')) }
  finally { onlineUpdating.value = false }
}
async function handleLogout() { if (!(await confirm('确定退出登录吗？'))) return; try { await logoutPlayer() } catch {}; setPlayerOnlineStatus(false); removeStorage('token'); replace('/pages/client/login/index') }

onMounted(async () => {
  if (!(await isApprovedPlayer())) { toast('请先完成陪玩师申请并通过审核'); replace('/pages/player/apply/index'); return }
  if (!getStorage<string>('token')) { replace('/pages/client/login/index'); return }
  try { player.value = await getCurrentPlayer(); online.value = Boolean(player.value?.is_online); setPlayerOnlineStatus(online.value) } catch { player.value = getStorage<any>('player') }
  if (!player.value) { toast('陪玩师信息未同步'); replace('/pages/client/profile/index'); return }
  await startRefresh()
  clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => { stopRefresh(); if (clockTimer) clearInterval(clockTimer) })
</script>

<style lang="scss" scoped>
.grab-page{min-height:100vh;padding:22rpx 24rpx 180rpx;box-sizing:border-box;color:#172116;background:#f7f3ea}.status-strip,.player-card,.section,.order-card,.invitation-card,.empty-card{border-radius:26rpx;background:#fff;box-shadow:0 12rpx 30rpx rgba(39,61,42,.06)}.status-strip{display:flex;align-items:center;gap:14rpx;padding:20rpx}.status-dot{width:15rpx;height:15rpx;border-radius:50%;background:#aaa}.status-dot.live{background:#2f9b63}.status-strip>view:nth-child(2){flex:1}.status-strip text{display:block}.status-strip text:first-child{font-weight:900}.status-strip text:last-child{margin-top:4rpx;color:#879083;font-size:20rpx}.status-strip button,.player-card button,.section-head button{margin:0;color:#1f7c4b;background:#eef8f1}.player-card{display:flex;align-items:center;gap:16rpx;margin-top:18rpx;padding:22rpx;color:#fff;background:linear-gradient(135deg,#173426,#1f7c4b)}.avatar{width:86rpx;height:86rpx;border-radius:24rpx}.empty{display:flex;align-items:center;justify-content:center;background:#d8a144;font-weight:900}.player-main{flex:1}.player-main text{display:block}.player-main text:first-child{font-size:28rpx;font-weight:900}.player-main text:last-child{margin-top:5rpx;font-size:21rpx;opacity:.78}.player-card button{color:#fff;background:rgba(255,255,255,.14)}.section{margin-top:18rpx;padding:22rpx}.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16rpx}.section-head>view{flex:1}.section-head view text{display:block}.section-head view text:first-child{font-size:29rpx;font-weight:900}.section-head view text:last-child{margin-top:5rpx;color:#879083;font-size:20rpx}.section-head>text{padding:6rpx 12rpx;border-radius:999rpx;color:#1f7c4b;background:#eef8f1}.invitation-card,.order-card{margin-top:16rpx;padding:20rpx;background:#f9fbf7}.invite-top,.order-head{display:flex;justify-content:space-between;gap:14rpx}.invite-label,.public-tag{color:#1f7c4b;font-size:20rpx;font-weight:900}.order-no{display:block;margin-top:5rpx;color:#999;font-size:18rpx}.countdown{color:#a87520;font-weight:900}.order-title{display:block;margin-top:14rpx;font-size:27rpx;font-weight:900}.meta-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10rpx;margin-top:14rpx}.meta-grid view{padding:13rpx;border-radius:14rpx;background:#fff}.meta-grid text{display:block}.meta-grid text:first-child{color:#879083;font-size:19rpx}.meta-grid text:last-child{margin-top:4rpx;font-weight:900}.boss-note{display:block;margin-top:14rpx;color:#687665;font-size:21rpx;line-height:1.5}.invite-actions{display:grid;grid-template-columns:1fr 2fr;gap:12rpx;margin-top:16rpx}.invite-actions button,.grab-btn{height:68rpx;margin:0;border-radius:999rpx}.decline{color:#a13d35;background:#fff0ed}.accept,.grab-btn{color:#fff;background:#1f7c4b}.grab-btn{width:100%;margin-top:16rpx}.empty-card{margin-top:16rpx;padding:45rpx;text-align:center;color:#879083}.footer-actions{position:fixed;left:24rpx;right:24rpx;bottom:calc(22rpx + env(safe-area-inset-bottom));display:grid;grid-template-columns:1fr 1fr;gap:12rpx}.footer-actions button{height:76rpx;margin:0;border-radius:999rpx;background:#fff}.footer-actions button:first-child{color:#fff;background:#1f7c4b}
</style>
