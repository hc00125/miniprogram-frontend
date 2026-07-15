<template>
  <view class="profile-settings-page">
    <view class="hero-card"><text class="eyebrow">PLAYER PROFILE</text><text class="hero-title">陪玩资料设置</text><text class="hero-sub">简介和语音修改提交审核，审核通过后才替换公开资料</text></view>
    <view v-if="settings?.pending_update" class="review-card review-pending"><text>资料审核中</text><text>提交时间：{{ dateTime(settings.pending_update.submitted_at) }}</text><text>审核期间，老板端仍然展示你当前已通过的资料。</text></view>
    <view v-else-if="settings?.latest_update?.status === 'rejected'" class="review-card review-rejected"><text>上次修改未通过</text><text>{{ settings.latest_update.reject_reason || '请修改后重新提交' }}</text></view>

    <view class="card current-card">
      <view class="card-head"><view><text class="card-title">当前公开资料</text><text class="card-sub">陪玩类型只能由管理员调整</text></view><text class="type-chip">{{ settings?.player.type_name || '-' }}</text></view>
      <view class="current-row"><text>陪玩名称</text><text>{{ settings?.player.name || '-' }}</text></view>
      <view class="current-row"><text>个人简介</text><text>{{ settings?.player.bio || '暂未填写' }}</text></view>
      <view class="current-row"><text>语音介绍</text><text>{{ settings?.player.audio_intro_url ? '已配置' : '未配置' }}</text></view>
    </view>

    <view class="card escort-card" @tap="go('/pages/player/escort-qualification/index')">
      <view class="escort-icon">护</view>
      <view class="escort-main"><text class="card-title">护航资格</text><text class="card-sub">独立专业资格，申请后由后台审核</text></view>
      <view class="escort-status"><text>{{ settings?.player.escort_status_text || '未申请' }}</text><text>›</text></view>
    </view>

    <view class="card form-card">
      <view class="card-head"><view><text class="card-title">提交新资料</text><text class="card-sub">新的申请会覆盖尚未审核的修改稿</text></view><text class="count-chip">{{ form.bio.length }}/500</text></view>
      <text class="field-label">个人简介</text>
      <textarea v-model="form.bio" class="bio-input" maxlength="500" placeholder="填写在线时间、擅长玩法、沟通风格等公开介绍" />
      <view class="audio-section">
        <view class="audio-head"><text>语音自我介绍</text><text>支持 MP3 / M4A / AAC / WAV，20MB以内</text></view>
        <view v-if="form.audio_intro_url" class="audio-card"><view class="audio-icon">声</view><view class="audio-main"><text>{{ form.audio_intro_title || '音频自我介绍' }}</text><text>{{ isPlaying ? '正在播放' : '已上传，等待随资料提交审核' }}</text></view><button class="audio-action" @tap="toggleAudio">{{ isPlaying ? '暂停' : '试听' }}</button><button class="audio-remove" @tap="removeAudio">移除</button></view>
        <button v-else class="upload-btn" :disabled="audioUploading" @tap="chooseAudio">{{ audioUploading ? '上传中...' : '选择并上传语音介绍' }}</button>
      </view>
      <view class="review-notice"><text>审核说明</text><text>{{ settings?.review_notice || '修改提交后进入审核，审核期间继续展示旧资料。' }}</text></view>
      <button class="submit-btn" :disabled="submitting || loading || audioUploading" @tap="submitProfile">{{ submitting ? '提交中...' : (settings?.pending_update ? '更新待审核资料' : '提交审核') }}</button>
    </view>
    <view v-if="loading" class="loading-state">资料加载中...</view>
  </view>
</template>

<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { uploadPlayerApplicationAudioApi } from '@/api/client'
import { getPlayerProfileSettings, submitPlayerProfileUpdate, type PlayerProfileSettingsResult } from '@/api/player'
import { confirm, getErrorMessage, success, toast } from '@/utils/feedback'
import { go, replace } from '@/utils/nav'
import { isApprovedPlayer } from '@/utils/client'

const settings = ref<PlayerProfileSettingsResult | null>(null)
const loading = ref(true)
const submitting = ref(false)
const audioUploading = ref(false)
const isPlaying = ref(false)
const form = reactive({ bio: '', audio_intro_url: '', audio_intro_title: '' })
let audioContext: UniApp.InnerAudioContext | null = null

function applyForm(result: PlayerProfileSettingsResult) {
  settings.value = result
  const draft = result.pending_update
  form.bio = draft?.bio ?? result.player.bio ?? ''
  form.audio_intro_url = draft?.audio_intro_url ?? result.player.audio_intro_url ?? ''
  form.audio_intro_title = draft?.audio_intro_title ?? result.player.audio_intro_title ?? ''
}
async function loadSettings() { loading.value = true; try { applyForm(await getPlayerProfileSettings()) } catch (error) { toast(getErrorMessage(error, '陪玩资料加载失败')) } finally { loading.value = false } }
function dateTime(value?: string | null) { if (!value) return '-'; const date = new Date(value); if (Number.isNaN(date.getTime())) return '-'; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
function chooseAudio() {
  const chooseFile = (uni as any).chooseMessageFile
  if (!chooseFile) return toast('当前环境不支持选择音频文件，请使用微信真机或开发者工具')
  chooseFile({ count: 1, type: 'file', success: async (res: any) => {
    const file = res?.tempFiles?.[0]
    if (!file?.path) return toast('未选择音频文件')
    const name = String(file.name || '音频自我介绍')
    if (!/\.(mp3|m4a|aac|wav)$/i.test(name)) return toast('只支持 MP3/M4A/AAC/WAV 音频')
    audioUploading.value = true
    try { const uploaded = await uploadPlayerApplicationAudioApi(file.path, name); form.audio_intro_url = uploaded.audio_intro_url; form.audio_intro_title = uploaded.audio_intro_title || name; success('语音上传成功') }
    catch (error) { toast(getErrorMessage(error, '语音上传失败')) }
    finally { audioUploading.value = false }
  }, fail: () => {} })
}
function getAudioContext() { if (!form.audio_intro_url) return null; if (!audioContext) { audioContext = uni.createInnerAudioContext(); audioContext.onPlay(() => { isPlaying.value = true }); audioContext.onPause(() => { isPlaying.value = false }); audioContext.onStop(() => { isPlaying.value = false }); audioContext.onEnded(() => { isPlaying.value = false }); audioContext.onError(() => { isPlaying.value = false; toast('语音播放失败') }) } audioContext.src = form.audio_intro_url; return audioContext }
function toggleAudio() { const context = getAudioContext(); if (!context) return; if (isPlaying.value) context.pause(); else context.play() }
async function removeAudio() { if (!(await confirm('移除后，审核通过时公开资料中的语音也会被清除。确定移除吗？', '移除语音'))) return; if (audioContext) audioContext.stop(); form.audio_intro_url = ''; form.audio_intro_title = '' }
async function submitProfile() {
  if (submitting.value) return
  if (!form.bio.trim() && !form.audio_intro_url && !(await confirm('当前简介和语音均为空，审核通过后公开资料也会清空。仍要提交吗？', '确认提交'))) return
  submitting.value = true
  try { applyForm(await submitPlayerProfileUpdate({ bio: form.bio.trim(), audio_intro_url: form.audio_intro_url.trim(), audio_intro_title: form.audio_intro_title.trim() })); success('资料修改已提交审核') }
  catch (error) { toast(getErrorMessage(error, '资料提交失败')) }
  finally { submitting.value = false }
}
onShow(async () => { if (!(await isApprovedPlayer())) { toast('仅已通过审核的陪玩师可以修改资料'); replace('/pages/player/apply/index'); return } await loadSettings() })
onBeforeUnmount(() => { if (audioContext) { audioContext.stop(); audioContext.destroy(); audioContext = null } })
</script>

<style lang="scss" scoped>
.profile-settings-page { min-height: 100vh; padding: 24rpx 24rpx 80rpx; box-sizing: border-box; color: #172116; background: radial-gradient(circle at 12% 0%, rgba(47,155,99,.12), transparent 30%), radial-gradient(circle at 88% 10%, rgba(216,161,68,.12), transparent 28%), #f7f3ea; }
.hero-card, .card, .review-card { margin-bottom: 20rpx; padding: 28rpx; border-radius: 28rpx; background: rgba(255,255,255,.97); border: 1rpx solid rgba(39,61,42,.08); box-shadow: 0 14rpx 34rpx rgba(39,61,42,.06); }
.hero-card { color: #fff; background: linear-gradient(135deg, #173426, #1f7c4b 62%, #45ae72); }
.eyebrow, .hero-title, .hero-sub { display: block; }
.eyebrow { color: rgba(255,255,255,.68); font-size: 20rpx; font-weight: 900; letter-spacing: 2rpx; }
.hero-title { margin-top: 10rpx; font-size: 40rpx; font-weight: 900; }
.hero-sub { margin-top: 10rpx; color: rgba(255,255,255,.74); font-size: 22rpx; line-height: 1.5; }
.review-card text { display: block; }
.review-card text:first-child { font-size: 28rpx; font-weight: 900; }
.review-card text:not(:first-child) { margin-top: 7rpx; font-size: 21rpx; line-height: 1.5; }
.review-pending { color: #7b5a1f; border-color: rgba(216,161,68,.24); background: #fff8e8; }
.review-rejected { color: #8f2929; border-color: rgba(196,50,50,.18); background: #fff4f2; }
.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx; margin-bottom: 18rpx; }
.card-head > view { flex: 1; min-width: 0; }
.card-title, .card-sub { display: block; }
.card-title { font-size: 30rpx; font-weight: 900; }
.card-sub { margin-top: 6rpx; color: #879083; font-size: 21rpx; line-height: 1.45; }
.type-chip, .count-chip { padding: 7rpx 13rpx; border-radius: 999rpx; color: #1f7c4b; font-size: 20rpx; font-weight: 900; background: #eef8f1; }
.current-row { min-height: 70rpx; display: flex; align-items: flex-start; justify-content: space-between; gap: 24rpx; padding: 14rpx 0; border-bottom: 1rpx solid rgba(39,61,42,.07); font-size: 23rpx; }
.current-row:last-child { border-bottom: none; }
.current-row text:first-child { flex-shrink: 0; color: #7d877a; }
.current-row text:last-child { flex: 1; text-align: right; font-weight: 700; line-height: 1.55; }
.escort-card { display: flex; align-items: center; gap: 16rpx; }
.escort-icon { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 18rpx; color: #fff; font-size: 28rpx; font-weight: 900; background: #2f9b63; }
.escort-main { flex: 1; min-width: 0; }
.escort-status { display: flex; align-items: center; gap: 10rpx; color: #1f7c4b; font-size: 22rpx; font-weight: 900; }
.field-label { display: block; margin-bottom: 10rpx; font-size: 25rpx; font-weight: 900; }
.bio-input { width: 100%; min-height: 220rpx; padding: 20rpx; border-radius: 18rpx; border: 1rpx solid rgba(39,61,42,.10); background: #f7faf4; box-sizing: border-box; font-size: 25rpx; line-height: 1.65; }
.audio-section { margin-top: 24rpx; }
.audio-head text { display: block; }
.audio-head text:first-child { font-size: 25rpx; font-weight: 900; }
.audio-head text:last-child { margin-top: 5rpx; color: #879083; font-size: 20rpx; }
.audio-card { margin-top: 14rpx; display: flex; align-items: center; gap: 12rpx; padding: 16rpx; border-radius: 18rpx; background: #f7faf4; }
.audio-icon { width: 58rpx; height: 58rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 18rpx; color: #fff; font-weight: 900; background: #2f9b63; }
.audio-main { flex: 1; min-width: 0; }
.audio-main text { display: block; }
.audio-main text:first-child { font-size: 23rpx; font-weight: 900; }
.audio-main text:last-child { margin-top: 4rpx; color: #879083; font-size: 19rpx; }
.audio-action, .audio-remove { height: 54rpx; margin: 0; padding: 0 14rpx; border-radius: 999rpx; font-size: 20rpx; font-weight: 900; }
.audio-action { color: #1f7c4b; background: #e8f6ec; }
.audio-remove { color: #a13d35; background: #fff0ed; }
.audio-action::after, .audio-remove::after, .upload-btn::after, .submit-btn::after { border: none; }
.upload-btn { width: 100%; height: 78rpx; margin-top: 14rpx; border-radius: 18rpx; color: #1f7c4b; font-size: 24rpx; font-weight: 900; background: #eef8f1; border: 1rpx dashed rgba(47,155,99,.28); }
.review-notice { margin-top: 22rpx; padding: 16rpx; border-radius: 16rpx; background: #fff8e8; }
.review-notice text { display: block; }
.review-notice text:first-child { color: #8d651c; font-size: 22rpx; font-weight: 900; }
.review-notice text:last-child { margin-top: 5rpx; color: #746343; font-size: 20rpx; line-height: 1.5; }
.submit-btn { width: 100%; height: 84rpx; margin-top: 22rpx; border-radius: 999rpx; color: #fff; font-size: 27rpx; font-weight: 900; background: linear-gradient(135deg, #5fc68a, #1f7c4b); }
.submit-btn[disabled], .upload-btn[disabled] { opacity: .55; }
.loading-state { padding: 50rpx; color: #879083; text-align: center; }
</style>
