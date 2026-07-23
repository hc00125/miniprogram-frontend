<template>
  <view class="service-page">
    <view class="hero">
      <text class="eyebrow">MY SERVICES</text>
      <text class="title">我的服务</text>
      <text class="subtitle">从平台共享规格中选择服务。价格和支付道具由平台统一维护。</text>
      <text class="approval">{{ data?.auto_approval_enabled ? '符合规则的服务会自动审核上架' : '提交后由管理员审核，审核通过后老板才能看到' }}</text>
    </view>

    <view v-if="loading" class="empty">服务加载中...</view>

    <template v-else>
      <view class="section">
        <view class="section-head"><text>我的上架</text><text>{{ listings.length }}项</text></view>
        <view v-if="listings.length" class="cards">
          <view v-for="item in listings" :key="item.id" class="card">
            <view class="card-main">
              <view class="row"><text class="name">{{ item.spec.package_name }} · {{ item.spec.display_name }}</text><text class="status" :class="`status--${item.status}`">{{ item.status_text }}</text></view>
              <text class="meta">¥{{ money(item.spec.price) }}/小时 · {{ item.spec.required_player_type_name || '不限等级' }}</text>
              <text v-if="item.custom_description" class="description">{{ item.custom_description }}</text>
              <text v-if="item.rejection_reason" class="reason">未通过原因：{{ item.rejection_reason }}</text>
            </view>
            <view class="actions">
              <button v-if="item.status === 'approved'" class="secondary" @tap="toggleAvailable(item)">{{ item.is_available ? '暂停预约' : '恢复预约' }}</button>
              <button v-if="item.status === 'approved'" class="danger" @tap="offline(item)">下架</button>
              <button v-else-if="item.status === 'offline' || item.status === 'rejected'" class="primary" @tap="restore(item)">重新申请</button>
              <text v-else class="pending-tip">等待管理员审核</text>
            </view>
          </view>
        </view>
        <view v-else class="empty">暂未上架服务</view>
      </view>

      <view class="section">
        <view class="section-head"><text>可上架共享规格</text><text>{{ availableSpecs.length }}项</text></view>
        <view v-if="availableSpecs.length" class="cards">
          <view v-for="spec in availableSpecs" :key="spec.id" class="card">
            <view class="card-main">
              <text class="name">{{ spec.package_name }} · {{ spec.display_name }}</text>
              <text class="meta">¥{{ money(spec.price) }}/小时 · {{ spec.required_player_type_name || '不限等级' }}</text>
              <text v-if="spec.description" class="description">{{ spec.description }}</text>
              <text v-if="spec.requires_escort_qualification" class="qualification">需要护航资格，提交后人工审核</text>
            </view>
            <button class="primary" :loading="submittingId === spec.id" :disabled="Boolean(submittingId)" @tap="publish(spec.id)">申请上架</button>
          </view>
        </view>
        <view v-else class="empty">没有新的共享规格可上架</view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  createPlayerServiceListing,
  getPlayerServiceListings,
  updatePlayerServiceListing,
  type PlayerServiceListing,
  type PlayerServiceListingResult
} from '@/api/serviceListings'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { isApprovedPlayer } from '@/utils/client'
import { replace } from '@/utils/nav'

const data = ref<PlayerServiceListingResult | null>(null)
const loading = ref(true)
const submittingId = ref<number | null>(null)
const listings = computed(() => data.value?.listings || [])
const availableSpecs = computed(() => data.value?.available_specs || [])

function money(value: number) {
  return Number.isInteger(Number(value)) ? `${Number(value)}` : Number(value || 0).toFixed(2)
}

async function load() {
  loading.value = true
  try {
    data.value = await getPlayerServiceListings()
  } catch (error) {
    toast(getErrorMessage(error, '服务列表加载失败'))
  } finally {
    loading.value = false
  }
}

async function publish(specId: number) {
  if (submittingId.value) return
  submittingId.value = specId
  try {
    const result = await createPlayerServiceListing(specId)
    success(result.message)
    await load()
  } catch (error) {
    toast(getErrorMessage(error, '上架申请提交失败'))
  } finally {
    submittingId.value = null
  }
}

async function toggleAvailable(item: PlayerServiceListing) {
  try {
    await updatePlayerServiceListing(item.id, { is_available: !item.is_available })
    success(item.is_available ? '已暂停接受该服务预约' : '已恢复接受该服务预约')
    await load()
  } catch (error) {
    toast(getErrorMessage(error, '服务状态更新失败'))
  }
}

async function offline(item: PlayerServiceListing) {
  if (!(await confirm('下架后老板将看不到该服务。确定下架吗？', '下架服务'))) return
  try {
    await updatePlayerServiceListing(item.id, { action: 'offline' })
    success('服务已下架')
    await load()
  } catch (error) {
    toast(getErrorMessage(error, '服务下架失败'))
  }
}

async function restore(item: PlayerServiceListing) {
  try {
    const result = await updatePlayerServiceListing(item.id, { action: 'restore' })
    success(result.message)
    await load()
  } catch (error) {
    toast(getErrorMessage(error, '重新申请失败'))
  }
}

onShow(async () => {
  if (!(await isApprovedPlayer())) {
    toast('仅已通过审核的陪玩师可以管理服务')
    replace('/pages/player/apply/index')
    return
  }
  await load()
})
</script>

<style lang="scss" scoped>
.service-page{min-height:100vh;padding:24rpx 24rpx 80rpx;box-sizing:border-box;color:#172116;background:radial-gradient(circle at 10% 0,rgba(47,155,99,.12),transparent 30%),#f7f3ea}.hero,.section{margin-bottom:22rpx;padding:28rpx;border-radius:28rpx;background:#fff;box-shadow:0 14rpx 34rpx rgba(39,61,42,.06)}.hero{color:#fff;background:linear-gradient(135deg,#173426,#1f7c4b 62%,#45ae72)}.eyebrow,.title,.subtitle,.approval,.name,.meta,.description,.reason,.qualification{display:block}.eyebrow{color:rgba(255,255,255,.68);font-size:20rpx;font-weight:900;letter-spacing:2rpx}.title{margin-top:8rpx;font-size:40rpx;font-weight:900}.subtitle{margin-top:10rpx;color:rgba(255,255,255,.78);font-size:22rpx;line-height:1.55}.approval{margin-top:18rpx;padding:12rpx 14rpx;border-radius:14rpx;color:#fff8d8;font-size:21rpx;background:rgba(255,255,255,.12)}.section-head,.row,.actions{display:flex;align-items:center;justify-content:space-between;gap:14rpx}.section-head{margin-bottom:18rpx}.section-head text:first-child{font-size:30rpx;font-weight:900}.section-head text:last-child{color:#879083;font-size:21rpx}.cards{display:flex;flex-direction:column;gap:16rpx}.card{padding:20rpx;border-radius:20rpx;background:#f7faf4;border:1rpx solid rgba(39,61,42,.08)}.card-main{min-width:0}.name{font-size:27rpx;font-weight:900}.meta{margin-top:8rpx;color:#1f7c4b;font-size:22rpx;font-weight:800}.description{margin-top:8rpx;color:#687665;font-size:21rpx;line-height:1.5}.reason{margin-top:10rpx;color:#a13d35;font-size:21rpx}.qualification{margin-top:10rpx;color:#8d651c;font-size:21rpx}.status{flex-shrink:0;padding:6rpx 12rpx;border-radius:999rpx;font-size:19rpx;font-weight:900}.status--approved{color:#1f7c4b;background:#e6f6eb}.status--pending{color:#8d651c;background:#fff3d5}.status--rejected{color:#a13d35;background:#fff0ed}.status--offline{color:#687665;background:#ecefeb}.actions{justify-content:flex-end;margin-top:16rpx}.actions button,.card>button{height:62rpx;margin:16rpx 0 0;padding:0 22rpx;border-radius:999rpx;font-size:22rpx;font-weight:900}.actions button{margin:0}.primary{color:#fff;background:#1f7c4b}.secondary{color:#1f7c4b;background:#e8f6ec}.danger{color:#a13d35;background:#fff0ed}.primary::after,.secondary::after,.danger::after{border:none}.pending-tip{color:#879083;font-size:21rpx}.empty{padding:44rpx 24rpx;color:#879083;text-align:center}
</style>
