<template>
  <view class="notice-page">
    <scroll-view scroll-y class="notice-scroll">
      <view class="notice-hero">
        <view class="hero-badge">ORDER NOTICE</view>
        <view class="hero-title">点单须知</view>
        <view class="hero-subtitle">下单前请先阅读说明，避免订单信息不完整导致接单延迟</view>
      </view>

      <view class="notice-card notice-card--warning">
        <view class="warning-title">欢迎各位老板来到偷吃电竞俱乐部！</view>
        <view class="warning-line">感谢各位老板的光顾！！</view>
        <view class="warning-line">未成年禁止消费！</view>
      </view>

      <view class="notice-card">
        <view class="section-title">营业时间</view>
        <view class="business-time">24小时营业</view>
        <view class="section-desc">老板务必仔细阅读一下内容，具体服务规则以客服确认后的订单为准。</view>
      </view>

      <view class="notice-card">
        <view class="section-title">服务流程</view>
        <view class="flow-list">
          <view v-for="item in flowItems" :key="item.step" class="flow-item">
            <view class="flow-step">{{ item.step }}</view>
            <view class="flow-main">
              <view class="flow-title">{{ item.title }}</view>
              <view class="flow-desc">{{ item.desc }}</view>
            </view>
          </view>
        </view>
      </view>

      <view class="notice-card notice-card--placeholder">
        <view class="section-title">正式说明文案待补充</view>
        <view class="section-desc">你把具体文字发给我后，我会把这里替换成正式版点单须知，也可以继续加服务流程长图。</view>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
const flowItems = [
  { step: '01', title: '选择服务', desc: '在小程序首页或点单页查看需要的商品、规格和价格。' },
  { step: '02', title: '联系客服', desc: '下单前建议先联系客服确认档期、规则、区服和具体需求。' },
  { step: '03', title: '提交订单', desc: '确认商品、规格、数量和备注后提交订单，等待客服或陪玩接待。' },
  { step: '04', title: '等待接单', desc: '订单提交后请留意订单状态，客服会根据订单信息安排服务。' },
  { step: '05', title: '完成服务', desc: '服务完成后按页面提示进行确认或支付，遇到问题及时联系客服。' }
]
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
  padding: 40rpx 32rpx;
  border-radius: 30rpx;
  color: #fff;
  background:
    radial-gradient(circle at 12% 20%, rgba(255, 255, 255, 0.24), transparent 30%),
    linear-gradient(135deg, #111827 0%, #7f1d1d 56%, #ef4444 100%);
  box-shadow: 0 18rpx 40rpx rgba(127, 29, 29, 0.18);
  box-sizing: border-box;
}

.hero-badge {
  color: rgba(255, 255, 255, 0.76);
  font-size: 22rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.hero-title {
  margin-top: 16rpx;
  font-size: 48rpx;
  font-weight: 900;
  line-height: 1.16;
}

.hero-subtitle {
  margin-top: 14rpx;
  max-width: 580rpx;
  color: rgba(255, 255, 255, 0.84);
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

.notice-card--warning {
  border: 1rpx solid rgba(239, 68, 68, 0.18);
  background: linear-gradient(180deg, #fff, #fff8f0);
}

.warning-title {
  color: #ef4444;
  font-size: 34rpx;
  font-weight: 900;
  line-height: 1.4;
}

.warning-line {
  margin-top: 12rpx;
  color: #404040;
  font-size: 28rpx;
  font-weight: 800;
  line-height: 1.55;
  text-decoration: underline;
}

.section-title {
  color: #111827;
  font-size: 32rpx;
  font-weight: 900;
  line-height: 1.3;
}

.business-time {
  margin-top: 18rpx;
  color: #ef4444;
  font-size: 46rpx;
  font-weight: 900;
  line-height: 1.2;
}

.section-desc {
  margin-top: 16rpx;
  color: #555;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 1.7;
}

.flow-list {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.flow-item {
  display: flex;
  gap: 18rpx;
  padding: 20rpx;
  border-radius: 18rpx;
  background: #fafafa;
  border: 1rpx solid #f0f0f0;
}

.flow-step {
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
  background: linear-gradient(135deg, #ef4444, #b91c1c);
}

.flow-main {
  flex: 1;
  min-width: 0;
}

.flow-title {
  color: #222;
  font-size: 28rpx;
  font-weight: 900;
}

.flow-desc {
  margin-top: 8rpx;
  color: #666;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.55;
}

.notice-card--placeholder {
  border: 1rpx dashed rgba(239, 68, 68, 0.32);
  background: #fffaf5;
}

.bottom-space {
  height: 80rpx;
}
</style>
