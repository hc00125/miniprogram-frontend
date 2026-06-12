<template>
  <view class="club-page apply-page">
    <!-- 顶部 Hero：左侧文案 + 右侧三色徽标 -->
    <view class="apply-hero">
      <view class="hero-bg">
        <view class="ambient-glow ambient-glow--left"></view>
        <view class="ambient-glow ambient-glow--right"></view>
      </view>
      <view class="hero-content">
        <view class="hero-eyebrow">PLAYER APPLICATION</view>
        <view class="hero-title">成为<br/>偷吃电竞陪玩师</view>
        <view class="hero-sub">展示你的实力，接住今晚的订单</view>
        <view class="hero-tags">
          <view class="hero-tag hero-tag--green">
            <text class="tag-icon">证</text>
            <view class="tag-text">
              <text class="tag-title">资质简单</text>
              <text class="tag-sub">10分钟提交</text>
            </view>
          </view>
          <view class="hero-tag hero-tag--gold">
            <text class="tag-icon">实</text>
            <view class="tag-text">
              <text class="tag-title">实时进度</text>
              <text class="tag-sub">订单接不停</text>
            </view>
          </view>
          <view class="hero-tag hero-tag--green">
            <text class="tag-icon">￥</text>
            <view class="tag-text">
              <text class="tag-title">好收益</text>
              <text class="tag-sub">接单就有</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 申请信息：基础信息 -->
    <view class="form-card">
      <view class="form-head">
        <text class="form-num">1</text>
        <view class="form-head-text">
          <text class="form-eyebrow">申请信息</text>
          <text class="form-hint">请如实填写，便于审核联系</text>
        </view>
      </view>
      <view class="form-body">
        <view class="field">
          <view class="field-head">
            <text class="field-label">陪玩师名称</text>
            <text class="field-auto">来自昵称</text>
          </view>
          <view class="readonly-field">
            <text class="readonly-value">{{ playerNameText }}</text>
            <text class="readonly-note">使用当前账号昵称作为陪玩师名称，可在账号信息中修改</text>
          </view>
        </view>

        <view class="field">
          <view class="field-head">
            <text class="field-label">陪玩类型</text>
            <text class="field-required">*</text>
          </view>
          <view class="type-grid">
            <view
              v-for="type in playerTypes"
              :key="type.id"
              class="type-option"
              :class="{ active: form.type_id === type.id }"
              @tap="form.type_id = type.id"
            >
              <text class="type-name">{{ type.name }}</text>
              <text v-if="type.price_extra" class="type-extra">+¥{{ type.price_extra }}/时</text>
            </view>
          </view>
        </view>

        <view class="field">
          <view class="field-head">
            <text class="field-label">联系微信</text>
            <text class="field-required">*</text>
          </view>
          <input
            v-model="form.contact_wechat"
            class="field-input"
            placeholder="请输入联系微信号"
            placeholder-style="color: #aab1a5; font-size: 27rpx;"
          />
        </view>

        <view class="field">
          <view class="field-head">
            <text class="field-label">个人介绍</text>
            <text class="field-counter">{{ form.bio.length }}/200</text>
          </view>
          <textarea
            v-model="form.bio"
            class="field-textarea"
            placeholder="简单介绍自己（在线时间、擅长玩法、过往经历等）"
            maxlength="200"
            placeholder-style="color: #aab1a5; font-size: 27rpx;"
          />
          <view class="field-tag-row">
            <text class="field-tag" @tap="form.bio += (form.bio ? '、' : '') + '女陪'">女陪</text>
            <text class="field-tag" @tap="form.bio += (form.bio ? '、' : '') + '技术陪'">技术陪</text>
            <text class="field-tag" @tap="form.bio += (form.bio ? '、' : '') + '金牌陪'">金牌陪</text>
            <text class="field-tag" @tap="form.bio += (form.bio ? '、' : '') + '明星陪'">明星陪</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 审核说明 + 协议 -->
    <view class="form-card form-card--notice">
      <view class="notice-banner">
        <view class="notice-icon">i</view>
        <view class="notice-text">
          <text class="notice-title">审核说明</text>
          <text class="notice-sub">平台将按当前登录账号建立陪玩师身份，并结合昵称、所选陪玩类型与资料完成审核。</text>
        </view>
      </view>
    </view>

    <view class="agree-card" @tap="agree = !agree">
      <view class="checkbox" :class="{ checked: agree }">
        <text v-if="agree">✓</text>
      </view>
      <view class="agree-text">
        <text>我确认资料真实，并同意</text>
        <text class="agree-link" @tap.stop="showRule = true">《平台接单规则》</text>
        <text>与</text>
        <text class="agree-link" @tap.stop="showRule = true">《隐私协议》</text>
      </view>
    </view>

    <view class="footer-actions">
      <button class="club-btn club-btn--primary" :disabled="submitting" @tap="submitApply">
        {{ submitting ? '提交中...' : '提交申请' }}
      </button>
    </view>

    <!-- 规则弹窗 -->
    <view v-if="showRule" class="rule-mask" @tap="showRule = false">
      <view class="rule-sheet" @tap.stop>
        <view class="rule-head">
          <text class="rule-title">平台接单规则</text>
          <text class="rule-close" @tap="showRule = false">×</text>
        </view>
        <scroll-view scroll-y class="rule-body">
          <text class="rule-line">1. 陪玩师需通过平台实名认证，资料真实有效。</text>
          <text class="rule-line">2. 接到订单后须按约定时间上线服务，迟到/失约将影响信用分。</text>
          <text class="rule-line">3. 服务过程中应保持专业态度，遵守平台行为规范。</text>
          <text class="rule-line">4. 收益按订单结算，T+1 自动到账微信钱包。</text>
          <text class="rule-line">5. 平台保留对违规行为的处罚与解约权利。</text>
        </scroll-view>
        <button class="club-btn club-btn--primary rule-confirm" @tap="showRule = false">我知道了</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, reactive, ref } from 'vue'
import { getPlayerTypes, type PlayerType } from '@/api/boss'
import { getClientProfile, submitPlayerApplication, syncClientProfile, type ClientProfile } from '@/utils/client'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { replace } from '@/utils/nav'

const agree = ref(false)
const showRule = ref(false)
const submitting = ref(false)
const profile = ref<ClientProfile | null>(null)
const playerTypes = ref<PlayerType[]>([
  { id: 1, name: '女陪', priority: 1, price_extra: 0 },
  { id: 2, name: '技术陪', priority: 2, price_extra: 0 },
  { id: 3, name: '金牌陪', priority: 3, price_extra: 0 },
  { id: 4, name: '明星陪', priority: 4, price_extra: 0 }
])

const form = reactive({
  type_id: 0,
  contact_wechat: '',
  bio: ''
})

const playerNameText = computed(() => {
  const current = profile.value
  return (
    current?.nickname?.trim() ||
    current?.player?.name?.trim() ||
    current?.application?.nickname?.trim() ||
    current?.application?.name?.trim() ||
    '微信用户'
  )
})

function applyProfileDefaults(current: ClientProfile | null) {
  profile.value = current
  const application = current?.application
  const player = current?.player
  form.contact_wechat = application?.contact_wechat || player?.contact_wechat || form.contact_wechat
  form.bio = application?.bio || player?.bio || form.bio
  form.type_id = application?.type_id || player?.type_id || form.type_id || playerTypes.value[0]?.id || 0
}

async function loadApplyContext() {
  if (!uni.getStorageSync('token')) {
    toast('请先登录后再申请')
    replace('/pages/client/login/index')
    return
  }
  applyProfileDefaults(getClientProfile())
  try {
    const [latest, types] = await Promise.all([
      syncClientProfile(),
      getPlayerTypes()
    ])
    if (Array.isArray(types) && types.length) {
      playerTypes.value = [...types].sort((a, b) => (a.priority || 0) - (b.priority || 0))
    }
    applyProfileDefaults(latest)
  } catch (error) {
    if (!form.type_id && playerTypes.value.length) form.type_id = playerTypes.value[0].id
  }
}

async function submitApply() {
  if (!form.type_id) return toast('请选择陪玩类型')
  if (!form.contact_wechat.trim()) return toast('请输入联系微信')
  if (!form.bio.trim()) return toast('请简单介绍自己')
  if (!agree.value) return toast('请先同意平台规则')

  submitting.value = true
  try {
    await submitPlayerApplication({
      name: playerNameText.value,
      type_id: form.type_id,
      contact_wechat: form.contact_wechat.trim(),
      bio: form.bio.trim()
    })
    success('申请已提交')
    uni.navigateBack()
  } catch (error) {
    toast(getErrorMessage(error, '提交失败'))
  } finally {
    submitting.value = false
  }
}

onShow(loadApplyContext)
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';

.apply-page {
  min-height: 100vh;
  padding: 20rpx 24rpx 200rpx;
  box-sizing: border-box;
  background:
    radial-gradient(ellipse at 12% 0%, rgba(216, 161, 68, 0.10), transparent 36%),
    radial-gradient(ellipse at 88% 14%, rgba(47, 155, 99, 0.10), transparent 32%),
    linear-gradient(180deg, #fbf7ef 0%, #f7f3ea 48%, #fffaf2 100%);
}

/* ========== 顶部 Hero ========== */
.apply-hero {
  position: relative;
  padding: 36rpx 32rpx 32rpx;
  border: 1px solid rgba(216, 161, 68, 0.18);
  border-radius: 28rpx;
  overflow: hidden;
  background:
    radial-gradient(circle at 8% 18%, rgba(255, 255, 255, 0.96), transparent 36%),
    radial-gradient(circle at 92% 28%, rgba(255, 255, 255, 0.72), transparent 30%),
    linear-gradient(135deg, #fff8ed 0%, #fef5dc 56%, #edf6f0 100%);
  box-shadow: 0 16rpx 40rpx rgba(176, 134, 60, 0.10);
}

.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(40rpx);
  opacity: 0.4;
}

.ambient-glow--left {
  top: -60rpx;
  left: -60rpx;
  width: 220rpx;
  height: 220rpx;
  background: radial-gradient(circle, rgba(216, 161, 68, 0.50), transparent 70%);
}

.ambient-glow--right {
  bottom: -80rpx;
  right: -80rpx;
  width: 240rpx;
  height: 240rpx;
  background: radial-gradient(circle, rgba(47, 155, 99, 0.40), transparent 70%);
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.hero-eyebrow {
  color: #a87520;
  font-size: 22rpx;
  font-weight: 900;
  letter-spacing: 1.5rpx;
}

.hero-title {
  color: #14291f;
  font-size: 48rpx;
  font-weight: 900;
  line-height: 1.16;
  letter-spacing: -1rpx;
}

.hero-sub {
  color: #5a6b5b;
  font-size: 25rpx;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8rpx;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 6rpx;
}

.hero-tag {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 16rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(36, 55, 39, 0.08);
  box-shadow: 0 6rpx 14rpx rgba(38, 69, 54, 0.05);
  flex-shrink: 0;
}

.hero-tag--green .tag-icon {
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  color: #fff;
}

.hero-tag--gold .tag-icon {
  background: linear-gradient(135deg, #f3d79b, #d8a144);
  color: #fff;
}

.tag-icon {
  width: 36rpx;
  height: 36rpx;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 900;
  flex-shrink: 0;
}

.tag-text {
  display: flex;
  flex-direction: column;
  gap: 1rpx;
  line-height: 1.15;
}

.tag-title {
  color: #14291f;
  font-size: 22rpx;
  font-weight: 900;
}

.tag-sub {
  color: #5a6b5b;
  font-size: 18rpx;
  font-weight: 600;
}

/* ========== 通用卡片 ========== */
.form-card,
.agree-card {
  margin-top: 22rpx;
  border: 1px solid rgba(42, 63, 48, 0.06);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14rpx 36rpx rgba(38, 69, 54, 0.06);
  overflow: hidden;
}

.form-head {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 24rpx 28rpx 16rpx;
  border-bottom: 1px solid rgba(42, 63, 48, 0.06);
}

.form-num {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  color: #fff;
  font-size: 24rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 6rpx 12rpx rgba(31, 124, 75, 0.18);
}

.form-head-text {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.form-eyebrow {
  color: #14291f;
  font-size: 30rpx;
  font-weight: 900;
  letter-spacing: 0;
}

.form-hint {
  color: #5a6b5b;
  font-size: 22rpx;
  font-weight: 600;
}

.form-body {
  padding: 22rpx 28rpx 26rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* ========== 表单字段 ========== */
.field {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.field-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8rpx;
}

.field-label {
  color: #14291f;
  font-size: 26rpx;
  font-weight: 800;
}

.field-required {
  color: #ef5b5b;
  font-size: 24rpx;
  font-weight: 900;
  margin-left: 2rpx;
}

.field-auto {
  color: #1f7c4b;
  font-size: 22rpx;
  font-weight: 800;
}

.field-counter {
  color: #aab1a5;
  font-size: 21rpx;
  font-weight: 600;
}

.readonly-field {
  min-height: 92rpx;
  padding: 18rpx 24rpx;
  box-sizing: border-box;
  border: 1px solid rgba(47, 155, 99, 0.18);
  border-radius: 20rpx;
  background: linear-gradient(180deg, #f7faf4, #fffdf8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6rpx;
}

.readonly-value {
  color: #14291f;
  font-size: 30rpx;
  font-weight: 900;
  font-family: 'SF Mono', 'DIN Alternate', -apple-system, monospace;
}

.readonly-note {
  color: #5a6b5b;
  font-size: 22rpx;
  font-weight: 600;
}

.type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}

.type-option {
  min-height: 86rpx;
  padding: 16rpx 18rpx;
  box-sizing: border-box;
  border-radius: 20rpx;
  border: 1px solid rgba(36, 55, 39, 0.10);
  background: #fffdf8;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4rpx;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.type-option:active {
  transform: scale(0.98);
}

.type-option.active {
  border-color: rgba(47, 155, 99, 0.48);
  background: linear-gradient(135deg, #edf8ef, #fffaf0);
  box-shadow: 0 8rpx 18rpx rgba(31, 124, 75, 0.10);
}

.type-name {
  color: #14291f;
  font-size: 26rpx;
  font-weight: 900;
}

.type-extra {
  color: #a87520;
  font-size: 21rpx;
  font-weight: 800;
}

.field-input {
  width: 100%;
  box-sizing: border-box;
  height: 92rpx;
  padding: 0 24rpx;
  border: 1px solid rgba(36, 55, 39, 0.10);
  border-radius: 20rpx;
  background: #fffdf8;
  color: #14291f;
  font-size: 27rpx;
  font-weight: 600;
}

.field-input:focus {
  border-color: rgba(47, 155, 99, 0.40);
  background: #fff;
}

.field-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 160rpx;
  padding: 20rpx 24rpx;
  border: 1px solid rgba(36, 55, 39, 0.10);
  border-radius: 20rpx;
  background: #fffdf8;
  color: #14291f;
  font-size: 27rpx;
  line-height: 1.5;
}

.field-textarea:focus {
  border-color: rgba(47, 155, 99, 0.40);
  background: #fff;
}

.field-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 4rpx;
}

.field-tag {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(47, 155, 99, 0.10);
  border: 1px solid rgba(47, 155, 99, 0.20);
  color: #1f7c4b;
  font-size: 22rpx;
  font-weight: 700;
}

/* ========== 提示卡片 ========== */
.form-card--notice {
  background: rgba(255, 247, 223, 0.72);
  border-color: rgba(216, 161, 68, 0.20);
  box-shadow: 0 8rpx 22rpx rgba(216, 161, 68, 0.06);
}

.notice-banner {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 24rpx 28rpx;
}

.notice-icon {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #f3d79b, #d8a144);
  color: #fff;
  font-size: 22rpx;
  font-weight: 900;
  font-style: italic;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
}

.notice-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.notice-title {
  color: #6d5215;
  font-size: 26rpx;
  font-weight: 900;
}

.notice-sub {
  color: #8b7649;
  font-size: 23rpx;
  font-weight: 600;
  line-height: 1.5;
}

/* ========== 协议 ========== */
.agree-card {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 22rpx 28rpx;
  border: 1px solid rgba(216, 161, 68, 0.18);
  background: rgba(255, 252, 244, 0.92);
}

.checkbox {
  width: 38rpx;
  height: 38rpx;
  border-radius: 10rpx;
  border: 2rpx solid rgba(216, 161, 68, 0.50);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 26rpx;
  font-weight: 900;
  background: #fff;
  flex-shrink: 0;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.checkbox.checked {
  background: linear-gradient(135deg, #5fb78a, #1f7c4b);
  border-color: transparent;
}

.agree-text {
  flex: 1;
  min-width: 0;
  color: #5a6b5b;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.5;
}

.agree-link {
  color: #1f7c4b;
  font-weight: 800;
  text-decoration: underline;
}

/* ========== 底部操作 ========== */
.footer-actions {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(20rpx + env(safe-area-inset-bottom));
  padding: 16rpx;
  display: flex;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -4rpx 24rpx rgba(38, 69, 54, 0.08);
  border: 1px solid rgba(42, 63, 48, 0.06);
  z-index: 10;
}

.footer-actions .club-btn {
  flex: 1;
  min-height: 92rpx;
  border-radius: 22rpx;
  font-size: 32rpx;
  font-weight: 900;
}

/* ========== 规则弹窗 ========== */
.rule-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.50);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.rule-sheet {
  width: 100%;
  max-height: 78vh;
  display: flex;
  flex-direction: column;
  border-radius: 32rpx 32rpx 0 0;
  background: #fffdf8;
  box-shadow: 0 -10rpx 40rpx rgba(0, 0, 0, 0.20);
}

.rule-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 18rpx;
  border-bottom: 1px solid rgba(42, 63, 48, 0.08);
}

.rule-title {
  color: #14291f;
  font-size: 32rpx;
  font-weight: 900;
}

.rule-close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(42, 63, 48, 0.06);
  color: #5a6b5b;
  font-size: 40rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.rule-body {
  flex: 1;
  padding: 24rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  max-height: 56vh;
}

.rule-line {
  color: #2a3a30;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 1.6;
}

.rule-confirm {
  margin: 0 32rpx 36rpx;
  min-height: 88rpx;
  border-radius: 24rpx;
  font-size: 30rpx;
  font-weight: 900;
}
</style>
