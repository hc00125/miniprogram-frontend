<template>
  <view class="page">
    <view class="notice">提交至偷吃电竞平台，由平台客服处理；非微信官方投诉渠道，不影响使用微信官方投诉渠道。本入口不会自动退款或处罚。</view>
    <view v-if="submission.number" class="card success">
      <text class="heading">提交成功</text><text selectable>工单编号：{{ submission.number }}</text>
      <button class="primary" @tap="openDetail">查看处理进度</button>
    </view>
    <template v-else>
      <view v-if="!loggedIn" class="card"><text>请先微信登录，提交本人反馈。</text><button @tap="login">微信登录</button></view>
      <view class="card">
        <text class="heading">投诉类型</text>
        <picker :range="categoryNames" :value="categoryIndex" :disabled="sending" @change="selectCategory"><view class="field">{{ categoryLabels[form.category] }} ›</view></picker>
        <text class="heading">问题描述（必填）</text>
        <textarea v-model="form.description" :disabled="sending" :maxlength="1000" placeholder="请描述问题经过和诉求，10—1000字" />
        <text class="muted">{{ form.description.length }}/1000</text>
        <text class="heading">关联订单（选填）</text><input v-model="form.order_no" :disabled="sending" :maxlength="20" placeholder="仅可关联自己的订单号" />
        <text class="heading">联系方式（选填）</text><input v-model="form.contact" :disabled="sending" :maxlength="100" placeholder="手机号或微信号，方便平台联系" />
        <text class="heading">图片凭证（最多3张，每张5MB）</text>
        <view class="images"><view v-for="(image, index) in images" :key="image.path"><image :src="image.path" mode="aspectFill" /><button size="mini" :disabled="sending || picking" @tap="images.splice(index, 1)">移除</button></view></view>
        <button :disabled="sending || picking || images.length >= 3" :loading="picking" @tap="pick">选择图片</button>
      </view>
      <view class="notice">文字、联系方式及图片仅用于平台核实投诉、联系与处理反馈。请勿上传支付密码、验证码、身份证等无关敏感信息。<text class="link" @tap="privacy">查看隐私政策</text></view>
      <view v-if="error" class="error">{{ error }}。输入已保留；如网络超时，请先核对“我的反馈”，避免重复提交。</view>
      <button class="primary" :loading="sending" :disabled="sending || picking || !loggedIn" @tap="submit">{{ sending ? '正在提交' : '提交给平台客服' }}</button>
      <button @tap="openList">我的反馈</button>
    </template>
    <view v-if="privacyVisible" class="mask"><view class="card dialog"><text class="heading">图片凭证授权</text><text>选取图片用于平台投诉处理，请阅读并同意微信《用户隐私保护指引》及平台隐私政策。</text><text class="link" @tap="privacy">查看隐私政策</text><button open-type="agreePrivacyAuthorization" @agreeprivacyauthorization="privacyAgreed">同意并选择图片</button><button @tap="privacyVisible = false">暂不同意</button></view></view>
  </view>
</template>
<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { complaintDraftOwner, saveComplaintDraft, readComplaintDraft, categoryLabels, newRequestId, submitComplaint, validateComplaint, chooseComplaintImages, uploadComplaintImage, type ComplaintForm, type SubmissionState, type ComplaintCategory, type LocalComplaintImage } from '@/api/complaints'
import { getErrorMessage } from '@/utils/feedback'
const form = reactive<ComplaintForm>({ category: 'service', description: '', order_no: '', contact: '', attachment_ids: [] })
const submission = reactive<SubmissionState>({ busy: false, number: '', clientRequestId: newRequestId() })
const images = ref<LocalComplaintImage[]>([])
const sending = ref(false), picking = ref(false), error = ref(''), privacyVisible = ref(false), loggedIn = ref(Boolean(uni.getStorageSync('token')))
const categories = Object.keys(categoryLabels) as ComplaintCategory[]
const categoryNames = categories.map(key => categoryLabels[key])
let owner = complaintDraftOwner()
function saveDraft() { saveComplaintDraft(owner, 'create', submission.number ? null : { form, images: images.value, submission }) }
function restoreDraft() {
  const draft = readComplaintDraft(owner, 'create')
  if (draft) { Object.assign(form, draft.form); images.value = draft.images; Object.assign(submission, draft.submission, { busy: false }) }
}
const categoryIndex = computed(() => categories.indexOf(form.category))
function selectCategory(event: any) { form.category = categories[Number(event.detail.value)] }
function login() { uni.navigateTo({ url: '/pages/client/login/index' }) }
function privacy() { uni.navigateTo({ url: '/pages/legal/privacy/index' }) }
function openList() { uni.navigateTo({ url: '/pages/client/complaints/index' }) }
function openDetail() { uni.navigateTo({ url: `/pages/client/complaints/detail?number=${encodeURIComponent(submission.number)}` }) }
async function pick() {
  if (picking.value || sending.value) return
  picking.value = true
  try { images.value.push(...await chooseComplaintImages(3 - images.value.length)) }
  catch (e: any) {
    if (e.privacyRequired) privacyVisible.value = true
    else if (!/cancel/i.test(e.errMsg || '')) error.value = getErrorMessage(e, '选择图片失败')
  } finally { picking.value = false }
}
function privacyAgreed(event: any) {
  if (event.detail?.errMsg && !/:ok$/.test(event.detail.errMsg)) return
  privacyVisible.value = false; void pick()
}
async function submit() {
  if (sending.value || picking.value || submission.number) return
  if (!uni.getStorageSync('token')) { loggedIn.value = false; return }
  sending.value = true; error.value = ''
  try {
    validateComplaint({ ...form, attachment_ids: images.value.map((_, index) => index) })
    for (const file of images.value) if (!file.id) file.id = (await uploadComplaintImage(file)).id
    form.attachment_ids = images.value.map(file => file.id!)
    await submitComplaint(submission, form)
    saveDraft()
  } catch (e) { saveDraft(); error.value = getErrorMessage(e, '提交失败，请稍后重试') }
  finally { sending.value = false; loggedIn.value = Boolean(uni.getStorageSync('token')) }
}
onLoad(options => { restoreDraft(); if (options?.order_no) form.order_no = String(options.order_no) })
onUnload(saveDraft)
onShow(() => {
  loggedIn.value = Boolean(uni.getStorageSync('token'))
  const nextOwner = complaintDraftOwner()
  if (nextOwner && nextOwner !== owner) {
    if (owner) { Object.assign(form, { category: 'service', description: '', order_no: '', contact: '', attachment_ids: [] }); images.value = []; Object.assign(submission, { busy: false, number: '', clientRequestId: newRequestId(), fingerprint: '' }) }
    owner = nextOwner; restoreDraft()
  }
})
</script>
<style scoped src="./buttons.css"></style>
<style scoped>
.page{min-height:100vh;padding:28rpx;background:#f7f3ea;box-sizing:border-box;color:#172116}.card{padding:26rpx;background:white;border-radius:24rpx;margin:22rpx 0;line-height:1.7}.notice{padding:22rpx;border-radius:20rpx;background:#edf6ee;color:#47614b;font-size:24rpx;line-height:1.7}.heading{display:block;font-weight:700;margin:18rpx 0 12rpx}.field,input,textarea{padding:20rpx;background:#f6f7f4;border-radius:14rpx;box-sizing:border-box;width:100%;font-size:28rpx}input{height:82rpx}textarea{height:240rpx}.muted{display:block;color:#75816f;text-align:right;font-size:22rpx}.images{display:flex;gap:14rpx;margin-bottom:18rpx}.images image{width:170rpx;height:170rpx;border-radius:14rpx}.primary{margin:24rpx 0;background:#1f7c4b;color:white}.error{color:#a13d35;font-size:25rpx;margin:20rpx 0;line-height:1.6}.link{display:block;color:#1f7c4b;text-decoration:underline;margin:12rpx 0}.success text{display:block;word-break:break-all}.mask{position:fixed;inset:0;z-index:99;background:#0008;display:flex;align-items:center;padding:30rpx}.dialog{width:100%}.dialog button{margin-top:16rpx}
</style>
