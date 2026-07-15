<template>
  <view class="escort-page">
    <view class="hero">
      <text class="eyebrow">ESCORT QUALIFICATION</text>
      <text class="title">护航资格申请</text>
      <text class="subtitle">护航资格独立于娱乐陪、技术陪等等级，通过后台审核后生效。</text>
    </view>

    <view v-if="result" class="status-card" :class="`status-${result.qualification.status}`">
      <view class="status-head">
        <view><text class="card-title">当前状态</text><text class="status-name">{{ result.qualification.status_text }}</text></view>
        <text class="status-chip">{{ result.qualification.has_qualification ? '已认证' : '护航资格' }}</text>
      </view>
      <text v-if="result.qualification.review_note" class="status-note">{{ result.qualification.review_note }}</text>
      <text v-if="result.latest_application?.reviewed_at" class="status-time">审核时间：{{ dateTime(result.latest_application.reviewed_at) }}</text>
    </view>

    <view v-if="result?.latest_application?.status === 'rejected'" class="review-card rejected">
      <text>上次申请未通过</text>
      <text>{{ result.latest_application.reject_reason || '请补充材料后重新提交' }}</text>
    </view>
    <view v-else-if="result?.pending_application" class="review-card pending">
      <text>申请审核中</text>
      <text>提交时间：{{ dateTime(result.pending_application.submitted_at) }}</text>
      <text>审核前仍可更新经历说明和证明材料。</text>
    </view>

    <view class="card">
      <text class="card-title">资格说明</text>
      <view class="rule"><text>1</text><text>娱乐陪、技术陪等仍属于陪玩等级。</text></view>
      <view class="rule"><text>2</text><text>护航属于额外专业资格，不会改变原陪玩等级。</text></view>
      <view class="rule"><text>3</text><text>商品端护航接单限制暂未启用，后续接入时仅已通过者可接。</text></view>
    </view>

    <view v-if="result?.qualification.can_submit" class="card form-card">
      <view class="card-head"><text class="card-title">{{ result.pending_application ? '更新申请材料' : '提交申请材料' }}</text><text>{{ form.experience.length }}/1000</text></view>
      <text class="field-label">护航经历与能力说明</text>
      <textarea v-model="form.experience" class="textarea" maxlength="1000" placeholder="请填写护航经历、擅长地图/玩法、沟通能力、可服务时间等，至少10个字" />
      <text class="field-label material-label">证明材料链接（选填）</text>
      <textarea v-model="form.evidenceText" class="material-input" maxlength="2500" placeholder="每行填写一个 http/https 链接，最多5条" />
      <text class="field-tip">可填写战绩截图、作品或其他证明材料的公开链接。</text>
      <button class="submit-btn" :disabled="submitting || loading" @tap="submit">{{ submitting ? '提交中...' : (result.pending_application ? '更新待审核申请' : '提交护航资格申请') }}</button>
    </view>

    <view v-else-if="result?.qualification.status === 'approved'" class="complete-card">护航资格已通过，无需重复申请。</view>
    <view v-else-if="result?.qualification.status === 'suspended'" class="complete-card suspended">护航资格已暂停，请联系管理员处理。</view>
    <view v-if="loading" class="loading">加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getEscortQualification, submitEscortQualification, type EscortQualificationResult } from '@/api/player'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { replace } from '@/utils/nav'
import { isApprovedPlayer } from '@/utils/client'

const result = ref<EscortQualificationResult | null>(null)
const loading = ref(true)
const submitting = ref(false)
const form = reactive({ experience: '', evidenceText: '' })

function applyResult(value: EscortQualificationResult) {
  result.value = value
  const draft = value.pending_application || (value.latest_application?.status === 'rejected' ? value.latest_application : null)
  form.experience = draft?.experience || ''
  form.evidenceText = (draft?.evidence_urls || []).join('\n')
}

function dateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function evidenceUrls() {
  return form.evidenceText.split('\n').map(item => item.trim()).filter(Boolean)
}

async function load() {
  loading.value = true
  try { applyResult(await getEscortQualification()) }
  catch (error) { toast(getErrorMessage(error, '护航资格状态加载失败')) }
  finally { loading.value = false }
}

async function submit() {
  const experience = form.experience.trim()
  if (experience.length < 10) return toast('护航经历与能力说明至少填写10个字')
  const urls = evidenceUrls()
  if (urls.length > 5) return toast('证明材料链接最多填写5条')
  if (urls.some(url => !/^https?:\/\//i.test(url))) return toast('证明材料必须填写完整的http/https链接')
  submitting.value = true
  try {
    applyResult(await submitEscortQualification({ experience, evidence_urls: urls }))
    success('护航资格申请已提交审核')
  } catch (error) { toast(getErrorMessage(error, '护航资格申请提交失败')) }
  finally { submitting.value = false }
}

onShow(async () => {
  if (!(await isApprovedPlayer())) {
    toast('仅已通过审核的陪玩师可以申请护航资格')
    replace('/pages/player/apply/index')
    return
  }
  await load()
})
</script>

<style lang="scss" scoped>
.escort-page { min-height: 100vh; padding: 24rpx 24rpx 80rpx; box-sizing: border-box; color: #172116; background: #f7f3ea; }
.hero, .card, .status-card, .review-card, .complete-card { margin-bottom: 20rpx; padding: 28rpx; border-radius: 28rpx; background: #fff; border: 1rpx solid rgba(39,61,42,.08); box-shadow: 0 14rpx 34rpx rgba(39,61,42,.06); }
.hero { color: #fff; background: linear-gradient(135deg, #173426, #1f7c4b 62%, #45ae72); }
.eyebrow, .title, .subtitle { display: block; }
.eyebrow { color: rgba(255,255,255,.68); font-size: 20rpx; font-weight: 900; letter-spacing: 2rpx; }
.title { margin-top: 10rpx; font-size: 40rpx; font-weight: 900; }
.subtitle { margin-top: 10rpx; color: rgba(255,255,255,.76); font-size: 22rpx; line-height: 1.55; }
.status-head, .card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; }
.status-head text { display: block; }
.card-title { font-size: 29rpx; font-weight: 900; }
.status-name { margin-top: 8rpx; font-size: 25rpx; font-weight: 800; }
.status-chip { padding: 7rpx 13rpx; border-radius: 999rpx; color: #1f7c4b; font-size: 20rpx; font-weight: 900; background: #eef8f1; }
.status-note, .status-time { display: block; margin-top: 12rpx; color: #687665; font-size: 21rpx; line-height: 1.5; }
.review-card text { display: block; }
.review-card text:first-child { font-size: 27rpx; font-weight: 900; }
.review-card text:not(:first-child) { margin-top: 7rpx; font-size: 21rpx; line-height: 1.5; }
.pending { color: #7b5a1f; background: #fff8e8; }
.rejected, .suspended { color: #8f2929; background: #fff4f2; }
.rule { display: flex; gap: 14rpx; margin-top: 16rpx; color: #687665; font-size: 22rpx; line-height: 1.55; }
.rule text:first-child { width: 38rpx; height: 38rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; color: #fff; background: #2f9b63; }
.field-label { display: block; margin-top: 22rpx; margin-bottom: 10rpx; font-size: 24rpx; font-weight: 900; }
.card-head > text:last-child { color: #879083; font-size: 20rpx; }
.textarea, .material-input { width: 100%; padding: 18rpx; border-radius: 18rpx; border: 1rpx solid rgba(39,61,42,.1); background: #f7faf4; box-sizing: border-box; font-size: 24rpx; line-height: 1.6; }
.textarea { min-height: 260rpx; }
.material-input { min-height: 160rpx; }
.field-tip { display: block; margin-top: 8rpx; color: #879083; font-size: 20rpx; }
.submit-btn { width: 100%; height: 84rpx; margin-top: 24rpx; border-radius: 999rpx; color: #fff; font-size: 27rpx; font-weight: 900; background: linear-gradient(135deg, #5fc68a, #1f7c4b); }
.submit-btn::after { border: none; }
.submit-btn[disabled] { opacity: .55; }
.complete-card { color: #1f7c4b; font-size: 24rpx; font-weight: 800; text-align: center; background: #eef8f1; }
.loading { padding: 48rpx; color: #879083; text-align: center; }
</style>
