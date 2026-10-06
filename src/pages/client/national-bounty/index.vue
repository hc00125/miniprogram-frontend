<template>
  <view :style="$appThemeStyle" class="activity-page">
    <image class="activity-poster" src="/images/home-redesign/national-bounty-2026.jpg" mode="widthFix" aria-label="偷吃电竞国庆赏金赛" />
    <view class="activity-heading">
      <text class="activity-eyebrow">偷吃电竞 · 国庆活动</text>
      <text class="activity-title">国庆赏金赛</text>
      <text class="activity-intro">各位老板好！喜逢国庆，我们赏金赛活动正式开启！</text>
    </view>
    <view class="rule-card">
      <text class="section-title">活动时段</text>
      <text class="activity-time">10月1日15:00 — 10月14日24:00</text>
    </view>
    <view class="rule-card">
      <text class="section-title">活动奖金</text>
      <view class="award-grid">
        <view class="award"><text class="award-place">第一名</text><text class="award-value">888<text class="award-unit">元</text></text></view>
        <view class="award"><text class="award-place">第二名</text><text class="award-value">666<text class="award-unit">元</text></text></view>
        <view class="award"><text class="award-place">第三名</text><text class="award-value">333<text class="award-unit">元</text></text></view>
      </view>
    </view>
    <view class="rule-card">
      <text class="section-title">参与规则</text>
      <text class="rule-copy" selectable>老板可下单三名陪玩参与本次活动。对局结单后，提交本局价值最高的三张截图参赛，我们将依据截图内容核算，评选出本次活动前三名。</text>
    </view>
    <view class="rule-card">
      <text class="section-title">活动须知</text>
      <view class="notice-row"><text class="notice-number">1</text><text class="rule-copy" selectable>截图必须为本局真实对局截图，禁止P图、盗用他人截图，一经发现取消参赛资格。</text></view>
      <view class="notice-row"><text class="notice-number">2</text><text class="rule-copy" selectable>本活动真实有效，最终金额以现金或其他等额为准（老板选择）。</text></view>
      <view class="notice-row"><text class="notice-number">3</text><text class="rule-copy" selectable>带出核算以截图内物资价值为准，最终解释权归本俱乐部所有。</text></view>
    </view>
    <button class="activity-contact" @tap="contactService">联系客服</button>
  </view>
</template>

<script setup lang="ts">
import { go } from '@/utils/nav'
function contactService() { go('/pages/client/customer-service/index') }
</script>

<style scoped>
.activity-page { min-height: 100vh; padding: 24rpx 28rpx calc(40rpx + env(safe-area-inset-bottom)); box-sizing: border-box; color: var(--ui-text); }
.activity-poster { display: block; width: 100%; height: auto; border-radius: 24rpx; }
.activity-heading { padding: 32rpx 4rpx 8rpx; }
.activity-eyebrow, .activity-title, .activity-intro, .section-title, .activity-time, .award-place, .award-value { display: block; }
.activity-eyebrow { color: var(--ui-accent); font-size: 25rpx; font-weight: 600; }
.activity-title { margin-top: 12rpx; font-size: 44rpx; font-weight: 800; line-height: 1.3; }
.activity-intro { margin-top: 16rpx; color: var(--ui-muted); font-size: 32rpx; line-height: 1.75; }
.rule-card { margin-top: 24rpx; padding: 28rpx; border: 1rpx solid var(--ui-line); border-radius: 24rpx; background: var(--ui-surface); }
.section-title { margin-bottom: 18rpx; font-size: 34rpx; font-weight: 700; line-height: 1.5; }
.activity-time { color: var(--ui-accent); font-size: 30rpx; font-weight: 600; line-height: 1.7; }
.award-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14rpx; }
.award { padding: 24rpx 4rpx; border-radius: 16rpx; background: var(--ui-accent-soft); text-align: center; }
.award-place { font-size: 28rpx; line-height: 1.5; }
.award-value { margin-top: 10rpx; color: var(--ui-accent); font-size: 44rpx; font-weight: 800; line-height: 1.2; }
.award-unit { margin-left: 4rpx; font-size: 24rpx; font-weight: 500; }
.rule-copy { flex: 1; min-width: 0; font-size: 32rpx; line-height: 1.8; overflow-wrap: anywhere; }
.notice-row { display: flex; align-items: flex-start; gap: 16rpx; margin-top: 24rpx; }
.notice-number { flex-shrink: 0; width: 40rpx; margin-top: 8rpx; border-radius: 12rpx; background: var(--ui-accent-soft); color: var(--ui-accent); font-size: 26rpx; line-height: 40rpx; text-align: center; font-weight: 700; }
.activity-contact { display: flex; justify-content: center; align-items: center; min-height: 96rpx; margin: 28rpx 0 0; padding: 24rpx; border-radius: 24rpx; background: var(--ui-gradient); color: var(--ui-on-primary); font-size: 32rpx; font-weight: 700; line-height: 1.5; }
.activity-contact::after { border: 0; }
</style>
