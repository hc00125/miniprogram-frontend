<template>
  <view class="notice-page">
    <scroll-view scroll-y class="notice-scroll">
      <view class="notice-hero">
        <view class="hero-badge">TOUCHI CLUB</view>
        <view class="hero-title">偷吃电竞 · 下单须知</view>
        <view class="hero-subtitle">请老板下单前仔细阅读，避免因信息不清影响后续服务体验</view>
      </view>

      <view class="notice-card intro-card">
        <view class="welcome-title">欢迎各位老板来到偷吃电竞！</view>
        <view class="welcome-text">感谢各位老板的光顾与支持！</view>
        <view class="minor-warning">未成年人禁止消费！</view>
        <view class="business-row">
          <text>营业时间</text>
          <text>24小时营业</text>
        </view>
        <view class="section-desc">下单前请老板务必仔细阅读以下内容，避免因信息不清影响后续服务体验。</view>
      </view>

      <view class="notice-image-card">
        <image
          v-if="!flowImageError"
          class="notice-flow-image"
          :src="flowImageUrl"
          mode="widthFix"
          @tap="previewFlowImage"
          @error="flowImageError = true"
        />
        <view v-else class="image-placeholder">
          <view class="placeholder-title">下单流程图加载失败</view>
          <view class="placeholder-desc">请检查图片地址是否可以访问：{{ flowImageUrl }}</view>
        </view>
      </view>

      <view class="notice-card">
        <view class="section-title">服务流程</view>
        <view class="ordered-list">
          <view v-for="(item, index) in serviceFlow" :key="index" class="ordered-item">
            <view class="ordered-index">{{ padIndex(index + 1) }}</view>
            <view class="ordered-text">{{ item }}</view>
          </view>
        </view>
      </view>

      <view class="notice-card notice-card--green">
        <view class="section-title">为什么建议进入 KOOK？</view>
        <view class="ordered-list">
          <view v-for="(item, index) in kookReasons" :key="index" class="ordered-item ordered-item--green">
            <view class="ordered-index">{{ index + 1 }}</view>
            <view class="ordered-text">{{ item }}</view>
          </view>
        </view>
      </view>

      <view class="notice-card notice-card--rules">
        <view class="section-title">老板须知</view>
        <view class="rule-list">
          <view v-for="(item, index) in bossRules" :key="index" class="rule-item">
            <view class="rule-index">{{ index + 1 }}</view>
            <view class="rule-text">{{ item }}</view>
          </view>
        </view>
      </view>

      <view class="thanks-card">
        <view>感谢各位老板对偷吃电竞的支持</view>
        <text>我们会持续优化服务流程，提升服务体验。</text>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const flowImageError = ref(false)
const flowImageUrl = 'https://api.huc125.cn/media/order-notice/order-notice-flow.jpg'

const serviceFlow = [
  '下单前请先联系官方客服，确认所需服务内容、当前是否可接单、排期情况及相关注意事项。',
  '下单后请将订单截图发送给客服，并按照客服指引进入官方接待渠道等待安排。',
  '建议老板提前准备好 KOOK，可使用手机 App 或网页版，进入官方接待区等待客服接待。排队期间请不要随意退出，以免影响安排顺序。KOOK 频道号：TC8888。',
  '如小程序客服暂未回复，超过 5 分钟仍无回应，可前往官方接待区联系在线客服咨询订单安排。',
  '客服会根据订单信息与老板预留的游戏昵称 / ID，安排对应服务人员进行对接。',
  '服务人员与老板确认服务内容、注意事项及开始时间后，即可开始服务。',
  '服务完成后，客服会协助确认服务结果。',
  '请老板在小程序内确认收货，并根据实际体验进行评价。',
  '如老板对本次服务满意，或有任何建议、反馈、投诉，可在老板意见箱中填写，我们会认真查看并及时处理。'
]

const kookReasons = [
  '方便老板实时了解服务进度，减少等待过程中的不确定性。',
  '服务过程更加公开透明，便于客服与管理员同步跟进。',
  '老板可了解服务人员的操作思路与沟通方式，提升整体体验。',
  '管理员会对服务过程进行监督，保障服务质量。',
  'KOOK 是俱乐部主要接待与沟通渠道，后续活动通知、服务安排、问题反馈都会更加方便。'
]

const bossRules = [
  '服务过程中，如服务人员私下索要联系方式、绕开平台单独交易或私下对接，请老板保留相关证据并提交给俱乐部。经核实后，我们将按店内规则严肃处理。',
  '服务过程中请老板配合服务人员的合理沟通与安排。如因老板长时间无回应、不配合、挂机或其他个人原因导致服务受影响，服务人员有权提醒一次；提醒无效的，可申请中止服务并进入结单流程。',
  '服务过程中如出现异常情况，将按照订单规则进行核实处理。',
  '若服务过程中出现订单异常，普通情况补偿保底 +40W；机场地图补偿保底 +60W；三角洲补偿保底 +80W，具体以实际订单情况和客服核实结果为准。',
  '相关售后、反馈或客诉问题，请老板在下单后 24 小时内联系官方客服处理。超过 24 小时后，原则上不再受理。',
  '如出现服务异常、损失争议等问题，俱乐部会根据订单记录、沟通记录及服务过程进行核查；如确认为服务人员责任，将按照店内规则进行补偿处理。',
  '如老板需要仓库整理等附加服务，可提前联系官方客服咨询。',
  '本店严格禁止未成年人消费。如隐瞒年龄或提供虚假信息下单，造成的后果由下单人自行承担，本店有权取消服务并按规则处理。'
]

function padIndex(value: number) {
  return String(value).padStart(2, '0')
}

function previewFlowImage() {
  uni.previewImage({ urls: [flowImageUrl], current: flowImageUrl })
}
</script>

<style lang="scss" scoped>
.notice-page {
  min-height: 100vh;
  background: #f7f3ea;
  color: #202124;
}

.notice-scroll {
  height: 100vh;
}

.notice-hero {
  margin: 24rpx 24rpx 0;
  padding: 42rpx 32rpx;
  border-radius: 30rpx;
  color: #fff;
  background:
    radial-gradient(circle at 12% 20%, rgba(255, 255, 255, 0.22), transparent 30%),
    linear-gradient(135deg, #3f4f37 0%, #6b7f55 48%, #e6883a 100%);
  box-shadow: 0 18rpx 40rpx rgba(75, 92, 55, 0.18);
  box-sizing: border-box;
}

.hero-badge {
  color: rgba(255, 255, 255, 0.78);
  font-size: 22rpx;
  font-weight: 900;
  letter-spacing: 3rpx;
}

.hero-title {
  margin-top: 16rpx;
  font-size: 46rpx;
  font-weight: 900;
  line-height: 1.16;
}

.hero-subtitle {
  margin-top: 14rpx;
  max-width: 590rpx;
  color: rgba(255, 255, 255, 0.86);
  font-size: 25rpx;
  font-weight: 600;
  line-height: 1.55;
}

.notice-card {
  margin: 22rpx 24rpx 0;
  padding: 28rpx 26rpx;
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 14rpx 30rpx rgba(35, 42, 30, 0.06);
  box-sizing: border-box;
}

.intro-card {
  border: 1rpx solid rgba(100, 122, 79, 0.16);
  background: linear-gradient(180deg, #fff, #fffaf0);
}

.welcome-title {
  color: #e65f34;
  font-size: 34rpx;
  font-weight: 900;
  line-height: 1.4;
}

.welcome-text {
  margin-top: 12rpx;
  color: #404040;
  font-size: 28rpx;
  font-weight: 800;
  line-height: 1.5;
}

.minor-warning {
  display: inline-flex;
  margin-top: 18rpx;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  color: #fff;
  font-size: 28rpx;
  font-weight: 900;
  background: linear-gradient(135deg, #ef4444, #b91c1c);
}

.business-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20rpx;
  margin-top: 22rpx;
  padding: 18rpx 20rpx;
  border-radius: 18rpx;
  background: #f8f3e5;
}

.business-row text:first-child {
  color: #5d6f4f;
  font-size: 26rpx;
  font-weight: 900;
}

.business-row text:last-child {
  color: #e65f34;
  font-size: 38rpx;
  font-weight: 900;
}

.section-desc {
  margin-top: 18rpx;
  color: #555;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 1.72;
}

.notice-image-card {
  margin: 22rpx 24rpx 0;
  overflow: hidden;
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 14rpx 30rpx rgba(35, 42, 30, 0.06);
}

.notice-flow-image {
  width: 100%;
  display: block;
}

.image-placeholder {
  min-height: 260rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12rpx;
  padding: 30rpx;
  text-align: center;
  box-sizing: border-box;
  background: #fffaf0;
}

.placeholder-title {
  color: #5d6f4f;
  font-size: 30rpx;
  font-weight: 900;
}

.placeholder-desc {
  color: #999;
  font-size: 23rpx;
  line-height: 1.5;
}

.section-title {
  color: #2f3a2b;
  font-size: 32rpx;
  font-weight: 900;
  line-height: 1.3;
}

.ordered-list,
.rule-list {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.ordered-item,
.rule-item {
  display: flex;
  gap: 18rpx;
  padding: 20rpx;
  border-radius: 18rpx;
  background: #fafafa;
  border: 1rpx solid #f0f0f0;
}

.ordered-item--green {
  background: #f7faf3;
  border-color: rgba(93, 111, 79, 0.12);
}

.ordered-index,
.rule-index {
  width: 58rpx;
  height: 58rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
  color: #fff;
  font-size: 22rpx;
  font-weight: 900;
  background: linear-gradient(135deg, #6c805d, #425239);
}

.rule-index {
  background: linear-gradient(135deg, #e6883a, #c45a1d);
}

.ordered-text,
.rule-text {
  flex: 1;
  min-width: 0;
  color: #4a4a4a;
  font-size: 25rpx;
  font-weight: 600;
  line-height: 1.66;
}

.notice-card--green {
  background: linear-gradient(180deg, #fff, #f8fbf4);
}

.notice-card--rules {
  background: linear-gradient(180deg, #fff, #fffaf5);
}

.thanks-card {
  margin: 22rpx 24rpx 0;
  padding: 30rpx 28rpx;
  border-radius: 24rpx;
  text-align: center;
  color: #fff;
  background: linear-gradient(135deg, #5d6f4f, #e6883a);
  box-shadow: 0 14rpx 30rpx rgba(93, 111, 79, 0.14);
}

.thanks-card view {
  font-size: 31rpx;
  font-weight: 900;
  line-height: 1.4;
}

.thanks-card text {
  display: block;
  margin-top: 10rpx;
  color: rgba(255, 255, 255, 0.86);
  font-size: 24rpx;
  font-weight: 700;
  line-height: 1.5;
}

.bottom-space {
  height: 90rpx;
}
</style>
