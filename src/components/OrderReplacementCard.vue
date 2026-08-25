<template>
  <view v-if="replacement?.active" class="replacement-card">
    <view class="replacement-head">
      <view>
        <text class="replacement-title">{{ title }}</text>
        <text class="replacement-sub">{{ subtitle }}</text>
      </view>
      <text class="replacement-chip">{{ replacement.mode_text || '待处理' }}</text>
    </view>

    <view class="replacement-grid">
      <view><text>退出陪玩</text><text>{{ replacement.cancelled_player_name || '待确认' }}</text></view>
      <view><text>空缺名额</text><text>{{ replacement.missing_slots || 1 }}人</text></view>
      <view><text>{{ replacement.phase === 'matching' ? '当前阶段' : '剩余服务' }}</text><text>{{ replacement.phase === 'matching' ? '付款前匹配' : remainingText }}</text></view>
    </view>

    <view v-if="replacement.status === 'cancel_requested'" class="replacement-notice">
      此订单来自旧版“待客服核算”流程。现在无需客服处理，可直接取消剩余服务并把未履行部分退回钱包。
      <view class="replacement-actions legacy-cancel-row">
        <button class="danger danger-strong" :disabled="working" @tap="handleCancelRemaining">立即取消并退款</button>
      </view>
    </view>

    <view v-else-if="replacement.mode === 'targeted'" class="replacement-actions">
      <button :disabled="working" @tap="handleReassign">重新指定</button>
      <button :disabled="working" @tap="handlePublishPublic">转为公开名额</button>
      <button v-if="replacement.can_request_cancel" class="danger danger-strong" :disabled="working" @tap="handleCancelRemaining">⚠️ 取消剩余服务</button>
      <view v-else class="replacement-notice matching-notice">订单尚未付款，取消整个订单请使用页面底部的“取消订单”。</view>
    </view>

    <view v-else class="replacement-notice replacement-notice--public">
      空缺名额已进入抢单大厅，原订单号、付款记录和其他陪玩均保持不变。
      <view v-if="replacement.can_request_cancel" class="replacement-actions public-cancel-row">
        <button class="danger danger-strong" :disabled="working" @tap="handleCancelRemaining">⚠️ 取消剩余服务并退款</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getPlayerList } from '@/api/boss'
import {
  publishOrderReplacement,
  reassignOrderReplacement,
  requestCancelRemainingService,
  type OrderReplacementState
} from '@/api/orderCancellation'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { relaunch } from '@/utils/nav'

const props = defineProps<{
  orderNo: string
  replacement: OrderReplacementState | null | undefined
}>()
const emit = defineEmits<{ (event: 'updated'): void }>()
const working = ref(false)

const title = computed(() => {
  if (props.replacement?.phase === 'matching') return '指定名额需要重新安排'
  if (props.replacement?.mode === 'targeted') return '指定陪玩已退出'
  return props.replacement?.phase === 'in_service' ? '服务中正在紧急补位' : '陪玩已退出，正在补位'
})
const subtitle = computed(() => {
  if (props.replacement?.phase === 'matching') return '该指定名额已退出；可重新指定或转为公开名额，订单尚未付款'
  return props.replacement?.mode === 'targeted'
    ? '本次指定已取消，可重新指定、转公开补位，或取消剩余服务并自动退款'
    : props.replacement?.can_request_cancel
      ? '系统正在补充退出名额；如不再继续等待，可取消未履行服务并自动退款'
      : '系统只补充退出的名额，不会取消其他陪玩或要求重复付款'
})
const remainingText = computed(() => {
  const minutes = Number(props.replacement?.remaining_minutes || 0)
  if (!minutes) return '0分钟'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours ? `${hours}小时${rest ? `${rest}分钟` : ''}` : `${rest}分钟`
})

async function handlePublishPublic() {
  if (!(await confirm('确定将该指定名额转为公开名额吗？系统会立即放入抢单大厅。', '转为公开名额'))) return
  working.value = true
  try {
    const result = await publishOrderReplacement(props.orderNo)
    success(result.message)
    emit('updated')
  } catch (error) {
    toast(getErrorMessage(error, '转公开失败'))
  } finally { working.value = false }
}

async function handleCancelRemaining() {
  if (!(await confirm('⚠️ 确定取消未履行的剩余服务吗？\n\n系统会立即按剩余服务时长自动核算，并把对应款项退回钱包。退款完成后订单将直接取消，无法撤回。', '取消剩余服务'))) return
  working.value = true
  try {
    const result = await requestCancelRemainingService(props.orderNo)
    success(result.message)
    relaunch('/pages/boss/home/index', { tab: 'home' })
  } catch (error) {
    toast(getErrorMessage(error, '取消并退款失败'))
  } finally { working.value = false }
}

async function handleReassign() {
  working.value = true
  try {
    const allPlayers = await getPlayerList({ is_online: true })
    const requiredTypeId = Number(props.replacement?.required_player_type_id || 0)
    const candidates = allPlayers
      .filter(item => item.can_be_designated !== false)
      .filter(item => !requiredTypeId || Number(item.player_type?.id || item.type_id) === requiredTypeId)
      .slice(0, 6)
    if (!candidates.length) {
      toast(`暂无在线的${props.replacement?.required_player_type_name || ''}陪玩可重新指定`)
      return
    }
    uni.showActionSheet({
      itemList: candidates.map(item => `${item.name} · ${item.player_type?.name || item.type_name || '陪玩'}`),
      success: async ({ tapIndex }) => {
        const selected = candidates[tapIndex]
        if (!selected) return
        working.value = true
        try {
          const result = await reassignOrderReplacement(props.orderNo, selected.id)
          success(result.message)
          emit('updated')
        } catch (error) {
          toast(getErrorMessage(error, '重新指定失败'))
        } finally { working.value = false }
      },
      fail: () => { working.value = false }
    })
  } catch (error) {
    toast(getErrorMessage(error, '获取可指定陪玩失败'))
  } finally {
    working.value = false
  }
}
</script>

<style lang="scss" scoped>
.replacement-card { margin-top:22rpx;padding:26rpx;border-radius:28rpx;border:1rpx solid rgba(196,61,61,.18);background:linear-gradient(180deg,#fff5f5,#fff);box-shadow:0 14rpx 36rpx rgba(60,30,30,.06); }
.replacement-head { display:flex;align-items:flex-start;justify-content:space-between;gap:18rpx; }.replacement-head>view { flex:1;min-width:0; }.replacement-title,.replacement-sub { display:block; }.replacement-title { color:#7b2525;font-size:30rpx;font-weight:900; }.replacement-sub { margin-top:6rpx;color:#876767;font-size:21rpx;line-height:1.45; }
.replacement-chip { flex-shrink:0;padding:7rpx 13rpx;border-radius:999rpx;color:#ad3030;font-size:20rpx;font-weight:900;background:#ffe4e4; }
.replacement-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx;margin-top:20rpx; }.replacement-grid view { padding:16rpx 8rpx;border-radius:16rpx;text-align:center;background:#fff; }.replacement-grid text { display:block; }.replacement-grid text:first-child { color:#9b8181;font-size:19rpx; }.replacement-grid text:last-child { margin-top:5rpx;color:#492f2f;font-size:23rpx;font-weight:900; }
.replacement-actions { display:grid;grid-template-columns:1fr 1fr;gap:12rpx;margin-top:18rpx; }.replacement-actions button { height:70rpx;margin:0;padding:0 12rpx;border-radius:18rpx;color:#8c3030;font-size:22rpx;font-weight:900;background:#ffeaea; }.replacement-actions button::after { border:none; }.replacement-actions .danger { grid-column:1 / -1;color:#fff;background:linear-gradient(135deg,#e36767,#b52d2d); }.replacement-actions .danger-strong { box-shadow:0 4rpx 12rpx rgba(181,45,45,.35); }.replacement-actions .matching-notice { grid-column:1 / -1;margin-top:0; }.replacement-actions.legacy-cancel-row,.replacement-actions.public-cancel-row { display:block;margin-top:16rpx; }.replacement-actions.legacy-cancel-row button,.replacement-actions.public-cancel-row button { width:100%; }
.replacement-notice { margin-top:18rpx;padding:18rpx;border-radius:18rpx;color:#7b5d36;font-size:22rpx;line-height:1.5;background:#fff3dc; }.replacement-notice--public { color:#276d43;background:#eaf7ed; }
</style>
