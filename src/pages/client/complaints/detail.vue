<template>
  <view class="page">
    <view class="notice">偷吃电竞平台内部反馈，由平台客服处理；非微信官方投诉渠道。</view>
    <view v-if="error" class="error">{{ error }}</view>
    <button :loading="loading" :disabled="loading || sending" @tap="load">刷新进度</button>
    <view v-if="!loggedIn" class="card"><text>请登录后查看本人反馈。</text><button @tap="login">微信登录</button></view>
    <template v-if="complaint">
      <view class="card">
        <text class="heading">{{ statusLabels[complaint.status] || complaint.status }} · {{ categoryLabels[complaint.category] }}</text>
        <text selectable class="line">工单编号：{{ complaint.number }}</text>
        <text v-if="complaint.order_no" class="line">关联订单：{{ complaint.order_no }}</text>
        <text v-if="complaint.contact" class="line">联系方式：{{ complaint.contact }}</text>
        <text class="description">{{ complaint.description }}</text>
        <view class="images"><view v-for="file in complaint.attachments" :key="file.id" @tap="preview(file)"><image v-if="localImages[file.id]" :src="localImages[file.id]" mode="aspectFill" /><text v-else class="image-placeholder">{{ imageErrors[file.id] || '点击加载图片' }}</text><text class="muted">{{ file.name }}</text></view></view>
      </view>
      <view class="card"><text class="heading">处理进度</text><text class="line">提交反馈 · {{ complaint.created_at }}</text><text v-for="(event, index) in complaint.status_history" :key="index" class="line">{{ statusLabels[event.to_status] || event.to_status }} · {{ event.created_at }}</text><text class="line">当前状态：{{ statusLabels[complaint.status] || complaint.status }}</text><text class="muted">最后更新 · {{ complaint.updated_at }}</text></view>
      <view class="card">
        <text class="heading">公开回复与补充记录</text><text v-if="!complaint.messages?.length" class="muted">暂无公开回复，请稍后查看。</text>
        <view v-for="(message, index) in complaint.messages" :key="message.id || index" class="message">
          <text class="line">{{ message.author || '平台回复' }}</text><text class="muted">{{ message.created_at }}</text><text class="description">{{ message.content }}</text>
          <view class="images"><view v-for="file in message.attachments" :key="file.id" @tap="preview(file)"><image v-if="localImages[file.id]" :src="localImages[file.id]" mode="aspectFill" /><text v-else class="image-placeholder">{{ imageErrors[file.id] || '点击加载图片' }}</text><text class="muted">{{ file.name }}</text></view></view>
        </view>
      </view>
      <view v-if="complaint.status !== 'closed'" class="card">
        <text class="heading">补充材料</text><textarea v-model="content" :maxlength="1000" :disabled="sending" placeholder="补充问题说明，最多1000字" />
        <view class="images"><view v-for="(file, index) in images" :key="file.path"><image :src="file.path" mode="aspectFill" /><button size="mini" :disabled="sending || picking" @tap="images.splice(index, 1)">移除</button></view></view>
        <button :disabled="sending || picking || images.length >= 3" @tap="pick">选择图片（最多3张，每张5MB）</button>
        <text class="muted">材料用于平台处理反馈，请勿上传密码、验证码、身份证等无关敏感信息。</text>
        <text v-if="replyUncertain" class="error">补充提交结果未确认，输入已保留。请先刷新核对公开记录，确认未提交后再手动重试。</text>
        <button class="primary" :loading="sending" :disabled="sending || picking || loading || replyUncertain" @tap="send">提交补充</button>
      </view>
      <view v-else class="notice">工单已关闭，不能继续补充材料。如有新问题，可从“投诉与反馈”重新提交。</view>
    </template>
    <view v-if="privacyVisible" class="mask"><view class="card"><text class="heading">图片凭证授权</text><text>图片仅用于平台核实和处理反馈。请同意微信《用户隐私保护指引》。</text><text class="link" @tap="privacy">查看平台隐私政策</text><button open-type="agreePrivacyAuthorization" @agreeprivacyauthorization="privacyAgreed">同意并选择图片</button><button @tap="privacyVisible = false">暂不同意</button></view></view>
  </view>
</template>
<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { complaintDraftOwner, saveComplaintDraft, readComplaintDraft, getComplaint, addComplaintMessage, downloadComplaintImage, chooseComplaintImages, uploadComplaintImage, categoryLabels, statusLabels, type Complaint, type ComplaintAttachment, type LocalComplaintImage } from '@/api/complaints'
import { getErrorMessage } from '@/utils/feedback'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
const number = ref(''), complaint = ref<Complaint | null>(null), content = ref(''), error = ref('')
const images = ref<LocalComplaintImage[]>([]), localImages = ref<Record<number, string>>({}), imageErrors = ref<Record<number, string>>({})
const loading = ref(false), sending = ref(false), picking = ref(false), privacyVisible = ref(false), replyUncertain = ref(false), loggedIn = ref(Boolean(uni.getStorageSync('token')))
const imageLoading = new Set<number>()
let active = true
let owner = complaintDraftOwner()
function saveDraft() { saveComplaintDraft(owner, number.value, { content: content.value, images: images.value, uncertain: replyUncertain.value }) }
function restoreDraft() { const draft = readComplaintDraft(owner, number.value); if (draft) { content.value = draft.content; images.value = draft.images; replyUncertain.value = draft.uncertain } }
async function load() {
  if (loading.value || sending.value || !number.value) return
  loggedIn.value = Boolean(uni.getStorageSync('token'))
  if (!loggedIn.value) { complaint.value = null; return }
  loading.value = true; error.value = ''
  try { complaint.value = await getComplaint(number.value); replyUncertain.value = false }
  catch (e) { error.value = getErrorMessage(e, '详情加载失败，请重试') }
  finally { loading.value = false }
}
async function preview(file: ComplaintAttachment) {
  if (imageLoading.has(file.id)) return
  imageLoading.add(file.id)
  const session = uni.getStorageSync('token')
  try {
    const path = localImages.value[file.id] || await downloadComplaintImage(file)
    if (!active || session !== uni.getStorageSync('token')) return
    localImages.value[file.id] = path; delete imageErrors.value[file.id]
    uni.previewImage({ urls: [path], current: path })
  } catch (e) { imageErrors.value[file.id] = getErrorMessage(e, '图片加载失败，点击重试') }
  finally { imageLoading.delete(file.id) }
}
async function pick() {
  if (picking.value || sending.value) return
  picking.value = true
  try { images.value.push(...await chooseComplaintImages(3 - images.value.length)) }
  catch (e: any) { if (e.privacyRequired) privacyVisible.value = true; else if (!/cancel/i.test(e.errMsg || '')) error.value = getErrorMessage(e, '选择图片失败') }
  finally { picking.value = false }
}
function privacy() { uni.navigateTo({ url: '/pages/legal/privacy/index' }) }
function login() { uni.navigateTo({ url: '/pages/client/login/index' }) }
function privacyAgreed(event: any) {
  if (event.detail?.errMsg && !/:ok$/.test(event.detail.errMsg)) return
  privacyVisible.value = false; void pick()
}
async function send() {
  if (sending.value || picking.value || loading.value || replyUncertain.value || !complaint.value || complaint.value.status === 'closed') return
  if (!content.value.trim()) { error.value = '请填写补充说明（1—1000字），可附图片'; return }
  sending.value = true; error.value = ''
  let posted = false, succeeded = false
  try {
    for (const file of images.value) if (!file.id) file.id = (await uploadComplaintImage(file)).id
    posted = true
    await addComplaintMessage(complaint.value.number, complaint.value.status, content.value, images.value.map(file => file.id!))
    content.value = ''; images.value = []; succeeded = true
    uni.showToast({ title: '补充已提交', icon: 'success' })
  } catch (e: any) {
    error.value = getErrorMessage(e, '补充失败，输入已保留')
    replyUncertain.value = posted && !e.statusCode && !e.handled
  } finally { sending.value = false; saveDraft() }
  if (succeeded) await load()
}
function clearSession(scope: string) { if (scope === 'token') { complaint.value = null; localImages.value = {}; imageErrors.value = {}; loggedIn.value = false } }
uni.$on(SESSION_EXPIRED_EVENT, clearSession)
onUnmounted(() => { active = false; uni.$off(SESSION_EXPIRED_EVENT, clearSession) })
onLoad(options => { number.value = String(options?.number || ''); restoreDraft() })
onUnload(saveDraft)
onShow(() => {
  const nextOwner = complaintDraftOwner()
  if (nextOwner && nextOwner !== owner) { content.value = ''; images.value = []; owner = nextOwner; restoreDraft() }
  localImages.value = {}; complaint.value = null; void load()
})
</script>
<style scoped src="./buttons.css"></style>
<style scoped>
.page{min-height:100vh;padding:28rpx;box-sizing:border-box;background:#f7f3ea;color:#172116}.notice{padding:22rpx;border-radius:20rpx;background:#edf6ee;color:#47614b;font-size:24rpx;line-height:1.7;margin-bottom:20rpx}.card{padding:26rpx;background:white;border-radius:24rpx;margin:22rpx 0;line-height:1.7;word-break:break-all}.heading{display:block;font-weight:700;font-size:30rpx;margin-bottom:14rpx}.line,.description,.muted{display:block}.description{white-space:pre-wrap;margin:18rpx 0}.muted{color:#75816f;font-size:23rpx}.message{border-top:1rpx solid #eee;padding:22rpx 0}.images{display:flex;gap:14rpx;margin:18rpx 0;flex-wrap:wrap}.images>view{width:170rpx}.images image,.image-placeholder{width:170rpx;height:170rpx;border-radius:14rpx}.image-placeholder{display:flex;align-items:center;text-align:center;background:#edf1ec;font-size:23rpx;color:#526e58}textarea{height:200rpx;padding:20rpx;width:100%;box-sizing:border-box;background:#f6f7f4;font-size:28rpx}.primary{margin-top:20rpx;background:#1f7c4b;color:white}.error{color:#a13d35;line-height:1.6;margin:20rpx 0;font-size:25rpx}.mask{position:fixed;inset:0;z-index:99;background:#0008;display:flex;align-items:center;padding:30rpx}.mask button{margin-top:18rpx}.link{display:block;color:#1f7c4b;text-decoration:underline;margin:12rpx 0}
</style>
