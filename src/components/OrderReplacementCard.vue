<template>
  <view v-if="replacement?.active" class="replacement-card">
    <view class="replacement-head">
      <view>
        <text class="replacement-title">{{ title }}</text>
        <text class="replacement-sub">{{ subtitle }}</text>
      </view>
      <text class="replacement-chip">{{ replacement.mode_text || '待补位' }}</text>
    </view>

    <view class="replacement-grid">
      <view><text>退出陪玩</text><text>{{ replacement.cancelled_player_name || '待确认' }}</text></view>
      <view><text>空缺名额</text><text>{{ replacement.missing_slots || 1 }}人</text></view>
      <view><text>剩余服务</text><text>{{ remainingText }}</text></view>
    </view>

    <view v-if="replacement.status === 'cancel_requested'" class="replacement-notice">
      已提交取消剩余服务申请，等待客服核算未履行部分和退款金额。
    </view>

    <view v-else-if="replacement.mode === 'targeted'" class="replacement-actions">
      <button :disabled="working" @tap="handleReassign">重新指定</button>
      <button :disabled="working" @tap="handlePublishPublic">转公开补位</button>
      <button class="danger" :disabled="working" @tap="handleCancelRemaining">取消剩余服务</button>
    </view>

    <view v-else class="replacement-notice replacement-notice--public">
      空缺名额已进入抢单大厅，原订单号、付款记录和其他陪玩均保持不变。
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

const props = defineProps<{
  orderNo: string
  replacement: OrderReplacementState | null | undefined
}>()
const emit = defineEmits<{ (event: 'updated'): void }>()
const working = ref(false)

const title = computed(() => props.replacement?.mode === 'targeted' ? '指定陪玩已退出' : '正在紧急补位')
const subtitle = computed(() => props.replacement?.mode === 'targeted'
  ? '本次指定已取消，请重新指定、转公开补位或申请取消剩余服务'
  : '系统只补充退出的名额，不会取消其他陪玩或要求重复付款')
const remainingText = computed(() => {
  const minutes = Number(props.replacement?.remaining_minutes || 0)
  if (!minutes) return '待核算'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours ? `${hours}小时${rest ? `${rest}分钟` : ''}` : `${rest}分钟`
})

async function handlePublishPublic() {
  if (!(await confirm('确定将该指定名额转为公开补位吗？系统会立即放入抢单大厅。', '转为公开补位'))) return
  working.value = true
  try {
    const result = await publishOrderReplacement(props.orderNo)
    success(result.message)
    emit('updated')
  } catch (error) {
    toast(getErrorMessage(error, '转公开补位失败'))
  } finally { working.value = false }
}

async function handleCancelRemaining() {
  if (!(await confirm('确定申请取消未履行的剩余服务吗？客服会根据实际剩余时长核算退款。', '申请取消剩余服务'))) return
  working.value = true
  try {
    const result = await requestCancelRemainingService(props.orderNo)
    success(result.message)
    emit('updated')
  } catch (error) {
    toast(getErrorMessage(error, '提交申请失败'))
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
.replacement-actions { display:grid;grid-template-columns:1fr 1fr;gap:12rpx;margin-top:18rpx; }.replacement-actions button { height:70rpx;margin:0;padding:0 12rpx;border-radius:18rpx;color:#8c3030;font-size:22rpx;font-weight:900;background:#ffeaea; }.replacement-actions button::after { border:none; }.replacement-actions .danger { grid-column:1 / -1;color:#fff;background:linear-gradient(135deg,#e36767,#b52d2d); }
.replacement-notice { margin-top:18rpx;padding:18rpx;border-radius:18rpx;color:#7b5d36;font-size:22rpx;line-height:1.5;background:#fff3dc; }.replacement-notice--public { color:#276d43;background:#eaf7ed; }
</style>
