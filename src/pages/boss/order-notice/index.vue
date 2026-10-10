<template>
  <view :style="$appThemeStyle" class="notice-page">
    <view class="notice-content">
      <view class="notice-summary">
        <text class="business-hours">24小时营业</text>
        <text class="minor-warning">未成年人禁止消费</text>
      </view>

      <view class="notice-card flow-card">
        <text class="section-title">下单流程</text>
        <view class="flow-list">
          <view v-for="(step, index) in serviceFlow" :key="step.id" class="flow-step">
            <view class="step-marker" aria-hidden="true">{{ index + 1 }}</view>
            <view class="step-content">
              <text class="step-title">{{ step.title }}</text>
              <text class="step-description">{{ step.description }}</text>
              <view v-if="step.id === 'kook'" class="kook-channel">
                <text class="channel-value" user-select selectable>{{ KOOK_CHANNEL }}</text>
                <button
                  class="copy-button"
                  data-action="copy-kook"
                  hover-class="button--pressed"
                  aria-label="复制 KOOK 频道号 TC8888"
                  @tap="copyKookChannel"
                >复制频道号</button>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="notice-card aftercare-card">
        <text class="section-title">售后与补偿</text>
        <view class="aftercare-deadline">
          <text>售后、反馈或投诉，请在</text>
          <text class="deadline-value">下单后24小时内</text>
          <text>联系官方客服；超过24小时，原则上不再受理。</text>
        </view>
        <text class="compensation-title">服务中订单异常补偿保底</text>
        <view class="compensation-list">
          <view v-for="item in compensationRules" :key="item.label" class="compensation-item">
            <text class="compensation-label">{{ item.label }}</text>
            <text class="compensation-value">{{ item.amount }}</text>
          </view>
        </view>
        <text class="compensation-condition">具体以实际订单情况和客服核实结果为准。</text>
      </view>

      <view class="notice-card detail-card">
        <view v-for="section in detailSections" :key="section.id" class="detail-section">
          <button
            class="detail-toggle"
            data-action="toggle-detail"
            :data-section="section.id"
            :aria-expanded="openSections.includes(section.id)"
            :aria-controls="`notice-detail-${section.id}`"
            hover-class="button--pressed"
            @tap="toggleSection(section.id)"
          >
            <text class="detail-title">{{ section.title }}</text>
            <text class="detail-state">{{ openSections.includes(section.id) ? '收起' : '展开' }}</text>
          </button>
          <view
            v-if="openSections.includes(section.id)"
            :id="`notice-detail-${section.id}`"
            class="detail-list"
          >
            <view v-for="(item, index) in section.items" :key="index" class="detail-item">
              <view class="detail-dot" aria-hidden="true"></view>
              <text class="detail-text">{{ item }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="notice-actions">
        <button
          class="notice-action notice-action--primary"
          data-action="customer-service"
          hover-class="button--pressed"
          @tap="openCustomerService"
        >联系客服</button>
        <button
          class="notice-action notice-action--secondary"
          data-action="complaints"
          hover-class="button--pressed"
          @tap="openComplaints"
        >投诉与反馈</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { copyText } from '@/utils/clipboard'

const KOOK_CHANNEL = 'TC8888'
const openSections = ref<string[]>([])

const serviceFlow = [
  { id: 'support', title: '先联系客服', description: '确认服务内容、接单情况和排期。' },
  { id: 'order', title: '提交订单', description: '把订单截图发给客服，等待安排。' },
  { id: 'kook', title: 'KOOK接待', description: '进入官方接待区，按指引等待接待。' },
  { id: 'player', title: '对接陪玩', description: '确认服务内容和开始时间后开打。' },
  { id: 'review', title: '完成评价', description: '客服协助核对结果，订单完成后可评价。' }
]

const compensationRules = [
  { label: '普通情况', amount: '+40W' },
  { label: '机场地图', amount: '+60W' },
  { label: '三角洲', amount: '+80W' }
]

const detailSections = [
  {
    id: 'reception',
    title: '接待与KOOK说明',
    items: [
      '下单前先联系官方客服，确认服务内容、当前是否可接单、排期和注意事项。下单后把订单截图发给客服，按指引进入官方接待渠道等待安排。',
      '建议提前准备好 KOOK，手机 App 或网页版都可以使用。排队期间请不要随意退出，以免影响安排顺序。',
      '小程序客服超过5分钟仍未回复，可到官方接待区联系在线客服，咨询订单安排。',
      '客服会根据订单和你预留的游戏昵称 / ID，安排陪玩对接。双方确认服务内容、注意事项和开始时间后，再开始服务。',
      '接单后，请进入系统分配的 KOOK 接单房间。若陪玩未到，请联系官方客服。',
      '在 KOOK 可以实时了解服务进度、陪玩的操作思路和沟通方式。服务过程便于客服与管理员同步跟进，管理员会监督服务过程，保障服务质量。',
      'KOOK 是俱乐部主要接待和沟通渠道，也用于活动通知、服务安排与问题反馈。'
    ]
  },
  {
    id: 'rules',
    title: '服务规则',
    items: [
      '服务中若陪玩私下索要联系方式、绕开平台单独交易或私下对接，请保留证据并提交俱乐部；核实后按店内规则严肃处理。',
      '请配合陪玩的合理沟通与安排。若因长时间无回应、不配合、挂机或其他个人原因影响服务，陪玩有权提醒一次；提醒无效时，可申请中止服务并进入结单流程。',
      '需要仓库整理等附加服务，请提前联系官方客服咨询。',
      '未成年人禁止消费。隐瞒年龄或提供虚假信息下单的，后果由下单人承担，俱乐部有权取消服务并按规则处理。'
    ]
  },
  {
    id: 'aftercare',
    title: '责任核实与反馈',
    items: [
      '服务中出现异常，按订单规则核实处理。如有服务异常或损失争议，俱乐部会结合订单记录、沟通记录和服务过程核查；确认属于陪玩责任的，按店内规则补偿。',
      '服务结束后，客服会协助核对服务结果。订单完成后，可在小程序内根据实际体验评价。',
      '对本次服务满意，或有建议、反馈、投诉，都可以通过“投诉与反馈”提交，俱乐部会认真查看并及时处理。'
    ]
  }
]

function toggleSection(id: string) {
  openSections.value = openSections.value.includes(id)
    ? openSections.value.filter(item => item !== id)
    : [...openSections.value, id]
}

function copyKookChannel() {
  copyText(KOOK_CHANNEL, 'order-notice')
}

function openCustomerService() {
  uni.navigateTo({ url: '/pages/client/customer-service/index' })
}

function openComplaints() {
  uni.navigateTo({ url: '/pages/client/complaints/index' })
}
</script>

<style lang="scss" scoped>
.notice-page {
  min-height: 100vh;
  background: var(--ui-bg);
  color: var(--ui-text);
}

.notice-content {
  max-width: 900rpx;
  margin: 0 auto;
  padding: 24rpx 24rpx calc(32rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.notice-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 0 4rpx;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.6;
}

.business-hours { color: var(--ui-text); }
.minor-warning { color: var(--ui-danger); }

.notice-card {
  margin-top: 20rpx;
  padding: 24rpx;
  border: 1rpx solid var(--ui-line);
  border-radius: 24rpx;
  background: var(--ui-surface);
  box-sizing: border-box;
}

.section-title {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1.4;
}

.flow-list { margin-top: 20rpx; }

.flow-step {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  padding-bottom: 20rpx;
}

.flow-step:last-child { padding-bottom: 0; }

.flow-step:not(:last-child)::after {
  position: absolute;
  top: 46rpx;
  bottom: 2rpx;
  left: 21rpx;
  width: 2rpx;
  background: var(--ui-line);
  content: '';
}

.step-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 1;
}

.step-content { flex: 1; min-width: 0; }

.step-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.6;
}

.step-description {
  display: block;
  color: var(--ui-muted);
  font-size: 28rpx;
  line-height: 1.6;
}

.kook-channel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 8rpx;
}

.channel-value {
  color: var(--ui-accent);
  font-size: 30rpx;
  font-weight: 800;
  line-height: 1.6;
}

.copy-button,
.detail-toggle,
.notice-action {
  min-height: 48px;
  margin: 0;
  padding: 12rpx 20rpx;
  border: 0;
  border-radius: 16rpx;
  font-size: 28rpx;
  line-height: 1.6;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-button::after,
.detail-toggle::after,
.notice-action::after { border: 0; }

.copy-button {
  flex-shrink: 0;
  color: var(--ui-accent);
  background: var(--ui-accent-soft);
}

.aftercare-deadline {
  margin-top: 18rpx;
  font-size: 28rpx;
  line-height: 1.6;
}

.deadline-value { color: var(--ui-danger); font-weight: 800; }

.compensation-title {
  display: block;
  margin-top: 20rpx;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.6;
}

.compensation-list {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
}

.compensation-item {
  flex: 1;
  min-width: 0;
  padding: 12rpx 4rpx;
  border-radius: 14rpx;
  color: var(--ui-gold);
  background: var(--ui-gold-soft);
  text-align: center;
}

.compensation-label,
.compensation-value { display: block; font-size: 28rpx; line-height: 1.6; }
.compensation-value { font-size: 32rpx; font-weight: 800; }

.compensation-condition {
  display: block;
  margin-top: 14rpx;
  color: var(--ui-muted);
  font-size: 28rpx;
  line-height: 1.6;
}

.detail-card { padding: 0 24rpx; }
.detail-section + .detail-section { border-top: 1rpx solid var(--ui-line); }

.detail-toggle {
  width: 100%;
  justify-content: space-between;
  gap: 16rpx;
  padding: 18rpx 0;
  border-radius: 0;
  color: var(--ui-text);
  background: transparent;
  text-align: left;
}

.detail-title { flex: 1; font-size: 30rpx; font-weight: 700; }
.detail-state { flex-shrink: 0; color: var(--ui-accent); }
.detail-list { padding: 0 0 24rpx; }

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
}

.detail-item + .detail-item { margin-top: 18rpx; }

.detail-dot {
  flex-shrink: 0;
  width: 8rpx;
  height: 8rpx;
  margin-top: 19rpx;
  border-radius: 50%;
  background: var(--ui-accent);
}

.detail-text { flex: 1; min-width: 0; font-size: 28rpx; line-height: 1.6; }

.notice-actions { display: flex; gap: 16rpx; margin-top: 24rpx; }
.notice-action { flex: 1; min-width: 0; font-size: 30rpx; font-weight: 700; }
.notice-action--primary { color: var(--ui-on-primary); background: var(--ui-primary); }
.notice-action--secondary { color: var(--ui-accent); background: var(--ui-accent-soft); }
.button--pressed { opacity: 0.72; }
</style>
