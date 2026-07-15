<template>
  <view class="notice-page">
    <scroll-view scroll-y class="notice-scroll">
      <view class="hero"><text>TOUCHI CLUB</text><text>偷吃电竞 · 下单须知</text><text>下单前请阅读当前流程，具体服务内容以商品、订单记录及客服确认结果为准</text></view>
      <view class="card intro"><text class="title">欢迎来到偷吃电竞</text><text>本店不向未成年人提供消费服务。</text><view class="business"><text>接待状态</text><text>以小程序客服及 KOOK 在线状态为准</text></view></view>

      <view class="image-card"><image v-if="!flowImageError" :src="flowImageUrl" mode="widthFix" @tap="previewFlowImage" @error="flowImageError = true" /><view v-else class="placeholder">下单流程图暂时无法加载，请按照下方文字流程操作。</view></view>

      <view class="card"><text class="title">服务流程</text><view v-for="(item,index) in serviceFlow" :key="item" class="row"><text>{{ index + 1 }}</text><text>{{ item }}</text></view></view>
      <view class="card green"><text class="title">为什么建议进入 KOOK？</text><view v-for="(item,index) in kookReasons" :key="item" class="row"><text>{{ index + 1 }}</text><text>{{ item }}</text></view></view>
      <view class="card"><text class="title">老板须知</text><view v-for="(item,index) in bossRules" :key="item" class="row"><text>{{ index + 1 }}</text><text>{{ item }}</text></view></view>
      <view class="thanks"><text>感谢各位老板对偷吃电竞的支持</text><text>商品价格、服务范围、售后与补偿均以当前订单记录及客服核实结果为准。</text></view>
      <view class="bottom-space"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const flowImageError = ref(false)
const flowImageUrl = 'https://api.huc125.cn/media/order-notice/order-notice-flow.jpg'
const serviceFlow = [
  '下单前可先联系官方客服，确认所需服务、当前接单情况、排期和注意事项。',
  '选择商品与规格并提交订单，订单内容、价格和数量以提交时记录为准。',
  '按照客服指引进入官方接待渠道等待安排。KOOK 频道号：TC8888。',
  '小程序客服超过5分钟未回复时，可前往 KOOK 官方接待区联系在线客服。',
  '客服依据订单信息与游戏昵称或ID安排服务人员对接。',
  '服务人员与老板确认内容和开始时间后开打，并在小程序中记录服务状态。',
  '服务完成后可在订单详情查看结果并提交评价；需要售后时请尽快联系客服。'
]
const kookReasons = [
  '便于老板、客服和陪玩同步服务进度与房间信息。',
  '减少等待过程中的信息差，发生异常时方便核对记录。',
  'KOOK 是俱乐部主要接待渠道，活动和服务安排会更及时。'
]
const bossRules = [
  '请勿与服务人员绕开平台私下交易；发现私下索要联系方式或收款时请保留证据并联系客服。',
  '服务过程中请配合合理沟通与安排。因长时间无回应、挂机或个人原因影响服务时，平台会结合订单记录核实处理。',
  '出现掉线、服务中断、损失争议或其他异常时，请保留订单号、截图和沟通记录并及时联系官方客服。',
  '退款、补偿和责任认定不使用固定前端承诺，由客服依据商品规则、履约记录和实际损失核实处理。',
  '附加服务是否提供及价格，以客服当次确认和订单记录为准。',
  '严禁未成年人下单、支付或提交虚假年龄信息；发现后平台可取消服务并依法处理。'
]
function previewFlowImage() { uni.previewImage({ urls: [flowImageUrl], current: flowImageUrl }) }
</script>

<style lang="scss" scoped>
.notice-page{min-height:100vh;color:#202124;background:#f7f3ea}.notice-scroll{height:100vh}.hero,.card,.image-card,.thanks{margin:22rpx 24rpx 0;padding:28rpx;border-radius:26rpx;background:#fff;box-sizing:border-box;box-shadow:0 12rpx 30rpx rgba(35,42,30,.06)}.hero{color:#fff;background:linear-gradient(135deg,#3f4f37,#6b7f55,#e6883a)}.hero text{display:block}.hero text:first-child{font-size:20rpx;letter-spacing:3rpx;opacity:.75}.hero text:nth-child(2){margin-top:13rpx;font-size:42rpx;font-weight:900}.hero text:last-child{margin-top:12rpx;font-size:23rpx;line-height:1.55;opacity:.86}.title{display:block;font-size:30rpx;font-weight:900}.intro>text:nth-child(2){display:block;margin-top:12rpx;color:#b91c1c;font-size:25rpx;font-weight:900}.business{display:flex;justify-content:space-between;gap:16rpx;margin-top:18rpx;padding:16rpx;border-radius:16rpx;background:#fff8e8}.business text:last-child{text-align:right;font-weight:900}.image-card{padding:0;overflow:hidden}.image-card image{width:100%;display:block}.placeholder{padding:45rpx;text-align:center;color:#879083}.row{display:flex;gap:14rpx;margin-top:16rpx}.row>text:first-child{width:38rpx;height:38rpx;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:50%;color:#fff;background:#a87520;font-size:20rpx;font-weight:900}.row>text:last-child{flex:1;color:#4f5d50;font-size:23rpx;line-height:1.65}.green .row>text:first-child{background:#1f7c4b}.thanks{text-align:center;color:#fff;background:linear-gradient(135deg,#173426,#1f7c4b)}.thanks text{display:block}.thanks text:first-child{font-size:28rpx;font-weight:900}.thanks text:last-child{margin-top:10rpx;font-size:21rpx;line-height:1.55;opacity:.78}.bottom-space{height:60rpx}
</style>
