<template>
  <view class="detail-page">
    <view class="hero"><view><text>ORDER DETAIL</text><text>陪玩订单详情</text><text>{{ orderNo }}</text></view><text v-if="orderInfo" class="status">{{ orderInfo.status }}</text></view>
    <view v-if="loading" class="empty">加载中...</view>

    <view v-if="orderInfo" class="card">
      <view class="card-head"><text>服务信息</text><button @tap="fetchOrder">刷新</button></view>
      <view class="info-row"><text>套餐</text><text>{{ orderInfo.package_name }}</text></view>
      <view v-if="orderInfo.addon_name" class="info-row"><text>附加项</text><text>{{ orderInfo.addon_name }}</text></view>
      <view v-if="orderInfo.game_id" class="info-row"><text>游戏ID/队伍码</text><text class="copyable" @tap="copyText(orderInfo.game_id)">{{ orderInfo.game_id }}</text></view>
      <view v-if="orderInfo.kook_room_number" class="info-row"><text>KOOK房间号</text><text class="copyable" @tap="copyText(orderInfo.kook_room_number)">{{ orderInfo.kook_room_number }}</text></view>
      <view class="info-row"><text>订单金额</text><text class="amount">¥{{ orderInfo.total_amount || orderInfo.total_price_per_hour }}</text></view>
      <view class="info-row"><text>累计购买时长</text><text class="highlight">{{ totalBookedHoursText }}</text></view>
      <view v-if="orderInfo.status === '待接单'" class="info-row"><text>等待时间</text><text>{{ waitTime }}</text></view>
      <view v-if="orderInfo.status === '待支付'" class="info-row"><text>当前阶段</text><text>等待老板付款</text></view>
      <view v-if="orderInfo.status === '待开打'" class="info-row"><text>当前阶段</text><text class="highlight">老板已付款，可开打</text></view>
      <view v-if="orderInfo.status === '进行中'" class="info-row"><text>实际计时</text><text class="highlight">{{ duration }}</text></view>
      <view v-if="orderInfo.duration_minutes" class="info-row"><text>实际服务记录</text><text>{{ orderInfo.duration_minutes }} 分钟</text></view>
    </view>

    <view v-if="orderInfo && myOrderPlayer" class="card">
      <view class="card-head"><view><text>进入老板房间</text><text class="sub">接单后10分钟内进入并主动确认</text></view><text class="chip">{{ roomJoinStatusText }}</text></view>
      <view v-if="roomJoinStatus === 'pending'" class="room-box"><text>剩余时间</text><text>{{ roomJoinCountdown }}</text></view>
      <view v-else-if="roomJoinStatus === 'overdue' || roomJoinStatus === 'late_confirmed'" class="warning"><text>{{ roomJoinStatus === 'overdue' ? '已经超过10分钟' : '已在超时后确认' }}</text><text>系统保留记录，由管理员结合实际情况核实，不会自动扣款或处罚。</text></view>
      <view v-else class="success-box"><text>已完成进入确认</text><text v-if="myOrderPlayer.room_join_confirmed_at">确认时间：{{ formatRoomTime(myOrderPlayer.room_join_confirmed_at) }}</text></view>
      <button v-if="canConfirmRoomEntry" class="primary" :disabled="confirmingRoom" @tap="handleConfirmRoomEntry">{{ confirmingRoom ? '确认中...' : '我已进入老板房间' }}</button>
      <text class="tip">请仅在实际进入游戏或KOOK房间后点击，老板端会同步看到状态。</text>
    </view>

    <view v-if="orderInfo && (renewalCount || orderInfo.pending_renewal_order_no)" class="card">
      <view class="card-head"><text>续单信息</text><text class="chip">已续 {{ renewalCount }} 次</text></view>
      <view class="renew-grid"><view><text>原购买时长</text><text>{{ formatHours(orderInfo.booked_hours) }}</text></view><view><text>已支付续单</text><text>{{ formatHours(orderInfo.renewal_booked_hours) }}</text></view><view><text>累计购买时长</text><text>{{ totalBookedHoursText }}</text></view></view>
      <view v-if="orderInfo.pending_renewal_order_no" class="warning"><text>老板有一笔续单等待付款</text><text>付款完成后新增时长才会计入本单；待支付期间暂不能完成服务。</text></view>
    </view>

    <view v-if="orderInfo && canEditKookRoom" class="card"><view class="card-head"><text>KOOK 房间号</text><text class="chip">{{ orderInfo.kook_room_number ? '已填写' : '待填写' }}</text></view><text class="sub">多人接同一单时，任意一位填写后整张订单统一使用该房间号。</text><view class="input-row"><input v-model="roomInput" placeholder="请输入 KOOK 房间号" maxlength="100" @focus="roomFocused = true" @blur="roomFocused = false" /><button :disabled="savingRoom" @tap="saveKookRoom">{{ savingRoom ? '保存中' : '保存' }}</button></view></view>

    <view v-if="orderInfo?.boss_note" class="card"><text class="card-title">老板备注</text><text class="note">{{ orderInfo.boss_note }}</text></view>

    <view v-if="orderInfo" class="card"><view class="card-head"><text>队伍陪玩</text><text class="chip">{{ orderInfo.players?.length || 0 }}/{{ orderInfo.required_players }}</text></view><view v-for="item in orderInfo.players" :key="item.id" class="player-row"><view>{{ item.name?.[0] }}</view><text>{{ item.name }} · {{ item.type_name }} · {{ item.room_join_status_text || item.status || '已接单' }}</text><text v-if="item.id === player?.id">我</text></view></view>

    <view class="footer"><button class="ghost" @tap="backToRoute('/pages/player/grab/index')">大厅</button><button v-if="orderInfo?.status === '待开打'" class="primary" :disabled="starting" @tap="handleStartTimer">{{ starting ? '开打中...' : '确认开打' }}</button><button v-if="orderInfo?.status === '进行中' && !orderInfo?.is_paused" class="warn" @tap="handlePause">暂停</button><button v-if="orderInfo?.status === '进行中' && orderInfo?.is_paused" class="primary" @tap="handleResume">继续</button><button v-if="orderInfo?.status === '进行中'" class="primary" :disabled="completing" @tap="handleComplete">完成</button></view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { completeOrder, confirmPlayerRoomEntry, getPlayerOrder, pausePlayerOrder, resumePlayerOrder, setPlayerOrderKookRoom, startTimer } from '@/api/player'
import { formatDuration } from '@/utils/format'
import { getStorage } from '@/utils/storage'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { backToRoute, goMain, replace } from '@/utils/nav'
import { isApprovedPlayer } from '@/utils/client'

const orderNo = ref('')
const orderInfo = ref<any>(null)
const player = ref<any>(null)
const loading = ref(true)
const starting = ref(false)
const completing = ref(false)
const confirmingRoom = ref(false)
const savingRoom = ref(false)
const roomInput = ref('')
const roomFocused = ref(false)
const duration = ref('00:00:00')
const waitTime = ref('')
const now = ref(Date.now())
let refreshTimer: ReturnType<typeof setInterval> | null = null
let durationTimer: ReturnType<typeof setInterval> | null = null

const canEditKookRoom = computed(() => Boolean(orderInfo.value && ['待开打', '进行中'].includes(orderInfo.value.status)))
const renewalCount = computed(() => Number(orderInfo.value?.renewal_count || 0))
const totalBookedHoursText = computed(() => formatHours(orderInfo.value?.total_booked_hours ?? orderInfo.value?.booked_hours ?? 0))
const myOrderPlayer = computed(() => (orderInfo.value?.players || []).find((item: any) => Number(item.id) === Number(player.value?.id)) || null)
const roomJoinStatus = computed(() => String(myOrderPlayer.value?.room_join_status || 'pending'))
const roomJoinStatusText = computed(() => myOrderPlayer.value?.room_join_status_text || ({ pending: '等待进入', confirmed: '按时进入', late_confirmed: '超时后进入', overdue: '已超时待核实', waived: '管理员已免除' } as Record<string, string>)[roomJoinStatus.value] || '等待进入')
const roomJoinCountdown = computed(() => { const deadline = myOrderPlayer.value?.room_join_deadline; if (!deadline) return '--:--'; const seconds = Math.max(0, Math.floor((new Date(deadline).getTime() - now.value) / 1000)); return seconds ? `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : '已超时' })
const canConfirmRoomEntry = computed(() => Boolean(myOrderPlayer.value?.can_confirm_room_join && !['已完成', '已取消'].includes(orderInfo.value?.status) && ['pending', 'overdue'].includes(roomJoinStatus.value)))

function formatHours(value: number) { const hours = Number(value || 0); return Number.isInteger(hours) ? `${hours}小时` : `${hours.toFixed(1)}小时` }
function updateDuration() { now.value = Date.now(); if (!orderInfo.value) return; if (orderInfo.value.timer_started_at) { const start = new Date(orderInfo.value.timer_started_at).getTime(); const end = orderInfo.value.end_time ? new Date(orderInfo.value.end_time).getTime() : orderInfo.value.is_paused && orderInfo.value.last_paused_at ? new Date(orderInfo.value.last_paused_at).getTime() : now.value; duration.value = formatDuration(Math.max(0, Math.floor((end - start) / 1000) - Number(orderInfo.value.paused_duration || 0))) } if (orderInfo.value.status === '待接单' && orderInfo.value.created_at) { const seconds = Math.floor((now.value - new Date(orderInfo.value.created_at).getTime()) / 1000); waitTime.value = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` } }
async function fetchOrder() { try { orderInfo.value = await getPlayerOrder(orderNo.value); if (!roomFocused.value) roomInput.value = orderInfo.value.kook_room_number || ''; updateDuration() } catch (error) { toast(getErrorMessage(error, '订单加载失败')) } finally { loading.value = false } }
function formatRoomTime(input: string) { if (!input) return '-'; const date = new Date(input); return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
async function handleConfirmRoomEntry() { if (!canConfirmRoomEntry.value || confirmingRoom.value) return; if (!(await confirm('请确认你已经实际进入老板的游戏或KOOK房间。', '确认进入房间'))) return; confirmingRoom.value = true; try { const result = await confirmPlayerRoomEntry(orderNo.value); success(result.message); await fetchOrder() } catch (error) { toast(getErrorMessage(error, '进入房间确认失败')) } finally { confirmingRoom.value = false } }
async function saveKookRoom() { const value = roomInput.value.trim(); if (!value) return toast('请填写 KOOK 房间号'); savingRoom.value = true; try { await setPlayerOrderKookRoom(orderNo.value, value); success('KOOK 房间号已保存'); await fetchOrder(); return true } catch (error) { toast(getErrorMessage(error, '房间号保存失败')); return false } finally { savingRoom.value = false } }
async function ensureKookRoom() { if (orderInfo.value?.kook_room_number) return true; if (roomInput.value.trim()) return saveKookRoom(); toast('请先填写 KOOK 房间号'); return false }
async function handleStartTimer() { if (!(await ensureKookRoom())) return; if (!(await confirm('老板已完成付款，确定现在开打并开始计时吗？', '确认开打'))) return; starting.value = true; try { await startTimer(orderNo.value, player.value.id); success('已开打，计时开始'); await fetchOrder() } catch (error) { toast(getErrorMessage(error, '开打失败')) } finally { starting.value = false } }
async function handlePause() { try { await pausePlayerOrder(orderNo.value); success('计时已暂停'); await fetchOrder() } catch (error) { toast(getErrorMessage(error, '暂停失败')) } }
async function handleResume() { try { await resumePlayerOrder(orderNo.value); success('计时已继续'); await fetchOrder() } catch (error) { toast(getErrorMessage(error, '继续失败')) } }
async function handleComplete() { if (!(await ensureKookRoom())) return; if (orderInfo.value?.pending_renewal_order_no) return toast('老板还有一笔续单待支付，暂不能完成服务'); if (!(await confirm(`确定标记订单完成吗？当前累计购买时长为${totalBookedHoursText.value}。`))) return; completing.value = true; try { await completeOrder(orderNo.value, player.value.id); success('已标记完成'); await fetchOrder() } catch (error) { toast(getErrorMessage(error, '操作失败')) } finally { completing.value = false } }
function copyText(text: string) { uni.setClipboardData({ data: text, success: () => success('已复制') }) }
function stopTimers() { if (refreshTimer) clearInterval(refreshTimer); if (durationTimer) clearInterval(durationTimer) }
onLoad(query => { orderNo.value = String(query?.orderNo || '') })
onMounted(async () => { if (!(await isApprovedPlayer())) { toast('请先成为陪玩师'); replace('/pages/player/apply/index'); return }; if (!getStorage<string>('token')) { replace('/pages/client/login/index'); return }; player.value = getStorage<any>('player'); if (!player.value) { toast('陪玩师信息未同步，请刷新个人中心'); goMain('profile'); return }; fetchOrder(); refreshTimer = setInterval(fetchOrder, 5000); durationTimer = setInterval(updateDuration, 1000) })
onUnmounted(stopTimers)
</script>

<style lang="scss" scoped>
.detail-page{min-height:100vh;padding:20rpx 24rpx 180rpx;box-sizing:border-box;background:#f7f3ea}.hero,.card,.empty{margin-bottom:18rpx;padding:24rpx;border-radius:24rpx;background:#fff}.hero{display:flex;justify-content:space-between;gap:16rpx;color:#fff;background:linear-gradient(135deg,#173426,#1f7c4b)}.hero text{display:block}.hero view text:first-child{font-size:18rpx;opacity:.7}.hero view text:nth-child(2){margin-top:7rpx;font-size:34rpx;font-weight:900}.hero view text:last-child{margin-top:5rpx;font-size:20rpx;opacity:.75}.status,.chip{height:max-content;padding:7rpx 12rpx;border-radius:999rpx;color:#1f7c4b;background:#eef8f1;font-size:20rpx;font-weight:900}.card-head{display:flex;justify-content:space-between;gap:14rpx;margin-bottom:14rpx;font-size:28rpx;font-weight:900}.card-head>view{flex:1}.card-head button{margin:0;color:#1f7c4b;background:#eef8f1}.sub,.tip{display:block;margin-top:5rpx;color:#879083;font-size:20rpx;line-height:1.5}.info-row{min-height:62rpx;display:flex;justify-content:space-between;align-items:center;gap:15rpx;border-bottom:1rpx solid #eee}.info-row text:first-child{color:#879083}.info-row text:last-child{text-align:right;font-weight:900}.amount{color:#a87520}.highlight,.copyable{color:#1f7c4b}.room-box,.warning,.success-box{padding:18rpx;border-radius:16rpx}.room-box{display:flex;justify-content:space-between;background:#f7faf4}.room-box text:last-child{font-size:34rpx;font-weight:900}.warning{color:#8f4d35;background:#fff2ec}.success-box{color:#1f7c4b;background:#eef8f1}.warning text,.success-box text{display:block}.warning text:last-child,.success-box text:last-child{margin-top:5rpx;font-size:20rpx;line-height:1.5}.primary,.ghost,.warn{height:72rpx;border-radius:999rpx}.primary{color:#fff;background:#1f7c4b}.ghost{color:#687665;background:#fff}.warn{color:#7a5313;background:#fff0c8}.card>.primary{width:100%;margin-top:15rpx}.renew-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx}.renew-grid view{padding:14rpx 8rpx;border-radius:14rpx;text-align:center;background:#f7faf4}.renew-grid text{display:block}.renew-grid text:first-child{color:#879083;font-size:18rpx}.renew-grid text:last-child{margin-top:5rpx;font-weight:900}.input-row{display:flex;gap:12rpx;margin-top:15rpx}.input-row input{flex:1;padding:0 16rpx;border-radius:14rpx;background:#f7faf4}.input-row button{width:130rpx;margin:0;color:#fff;background:#1f7c4b}.card-title{font-size:28rpx;font-weight:900}.note{display:block;margin-top:12rpx;white-space:pre-wrap;line-height:1.6}.player-row{display:flex;align-items:center;gap:12rpx;padding:13rpx;border-radius:14rpx;background:#f7faf4}.player-row+.player-row{margin-top:10rpx}.player-row>view{width:48rpx;height:48rpx;display:flex;align-items:center;justify-content:center;border-radius:14rpx;color:#fff;background:#1f7c4b}.player-row>text:nth-child(2){flex:1}.footer{position:fixed;left:18rpx;right:18rpx;bottom:calc(20rpx + env(safe-area-inset-bottom));display:flex;gap:10rpx}.footer button{flex:1;margin:0}
</style>
