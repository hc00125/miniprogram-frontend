<template>
  <view :style="$appThemeStyle" class="activity-page">
    <view class="activity-content">
      <view class="activity-heading">
        <view class="activity-status-row">
          <text class="activity-club">偷吃电竞</text>
          <text class="activity-status">{{ NATIONAL_BOUNTY_STATUS }}</text>
        </view>
        <text class="activity-title">{{ NATIONAL_BOUNTY_TITLE }}</text>
      </view>

      <view class="result-card">
        <text class="section-title">最终排行榜</text>
        <view class="result-header">
          <text class="result-rank">名次</text>
          <text class="result-name">选手</text>
          <text class="result-score">总成绩</text>
        </view>
        <view
          v-for="result in NATIONAL_BOUNTY_RESULTS"
          :key="result.rank"
          class="result-row"
          :class="{ 'result-row--first': result.rank === 1 }"
        >
          <text class="result-rank">第{{ result.rank }}名</text>
          <text class="result-name">{{ result.name }}</text>
          <text class="result-score" selectable>{{ formatNationalBountyScore(result.score) }}</text>
        </view>
        <text class="result-congratulations">恭喜三位选手！</text>
      </view>

      <view class="reward-card">
        <view class="reward-heading">
          <text class="section-title">活动奖励</text>
          <text class="reward-status">已全部发放</text>
        </view>
        <text class="activity-copy" selectable>{{ NATIONAL_BOUNTY_REWARD_NOTICE }}</text>
      </view>

      <view class="thanks-card">
        <text class="activity-copy">本次冲榜竞争激烈，前三名的分数一直紧咬。感谢所有参与成员，也感谢大家在国庆期间的辛勤付出。</text>
        <text class="activity-copy">之后还会推出更多活动和更丰富的奖励，下一次榜首等你来拿！</text>
      </view>

      <button class="activity-contact" data-action="customer-service" hover-class="activity-contact--pressed" @tap="contactService">联系客服</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  NATIONAL_BOUNTY_RESULTS,
  NATIONAL_BOUNTY_TITLE,
  NATIONAL_BOUNTY_STATUS,
  NATIONAL_BOUNTY_REWARD_NOTICE,
  formatNationalBountyScore
} from '@/constants/nationalBounty'
import { go } from '@/utils/nav'

function contactService() {
  go('/pages/client/customer-service/index')
}
</script>

<style scoped>
.activity-page { min-height: 100vh; padding: 24rpx 24rpx calc(40rpx + env(safe-area-inset-bottom)); box-sizing: border-box; background: var(--ui-bg); color: var(--ui-text); }
.activity-content { max-width: 900rpx; margin: 0 auto; }
.activity-heading { padding: 16rpx 8rpx 28rpx; }
.activity-status-row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-bottom: 22rpx; }
.activity-club { color: var(--ui-muted); font-size: 28rpx; line-height: 1.5; }
.activity-status, .reward-status { flex-shrink: 0; padding: 8rpx 18rpx; border-radius: 999rpx; background: var(--ui-accent-soft); color: var(--ui-accent); font-size: 26rpx; font-weight: 700; line-height: 1.5; }
.activity-title, .activity-subtitle, .section-title, .activity-copy, .result-congratulations { display: block; }
.activity-title { font-size: 42rpx; font-weight: 800; line-height: 1.35; }
.result-card, .reward-card { padding: 26rpx; border: 1rpx solid var(--ui-line); border-radius: 24rpx; background: var(--ui-surface); }
.section-title { font-size: 34rpx; font-weight: 700; line-height: 1.5; }
.result-header, .result-row { display: flex; align-items: center; gap: 12rpx; }
.result-header { margin-top: 20rpx; padding: 0 12rpx 16rpx; color: var(--ui-muted); font-size: 26rpx; line-height: 1.5; }
.result-row { min-height: 100rpx; padding: 12rpx; border-top: 1rpx solid var(--ui-line); box-sizing: border-box; font-size: 32rpx; line-height: 1.5; }
.result-row--first { border-top: 0; border-radius: 16rpx; background: var(--ui-gold-soft); }
.result-rank { flex-shrink: 0; width: 96rpx; }
.result-name { flex: 1; min-width: 0; }
.result-row .result-name { font-weight: 700; }
.result-score { flex-shrink: 0; width: 194rpx; text-align: right; font-variant-numeric: tabular-nums; }
.result-row .result-score { font-weight: 700; }
.result-congratulations { margin-top: 20rpx; font-size: 30rpx; line-height: 1.5; }
.reward-card { margin-top: 22rpx; }
.reward-heading { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; margin-bottom: 16rpx; }
.activity-copy { font-size: 32rpx; line-height: 1.65; overflow-wrap: anywhere; }
.thanks-card { padding: 24rpx 8rpx 0; }
.thanks-card .activity-copy + .activity-copy { margin-top: 16rpx; }
.activity-contact { display: flex; justify-content: center; align-items: center; min-height: 96rpx; margin: 28rpx 0 0; padding: 22rpx; border-radius: 24rpx; background: var(--ui-gradient); color: var(--ui-on-primary); font-size: 32rpx; font-weight: 700; line-height: 1.5; }
.activity-contact::after { border: 0; }
.activity-contact--pressed { opacity: 0.8; }
</style>
