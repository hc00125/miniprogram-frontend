<template>
  <view class="club-page apply-page">
    <view class="apply-hero">
      <view class="hero-eyebrow">PLAYER APPLICATION</view>
      <view class="hero-title">成为<br/>偷吃电竞陪玩师</view>
      <view class="hero-sub">展示你的实力，接住今晚的订单</view>
      <view class="hero-tags">
        <view class="hero-tag"><text>证</text><text>资料审核</text></view>
        <view class="hero-tag"><text>声</text><text>语音介绍</text></view>
        <view class="hero-tag"><text>单</text><text>在线接单</text></view>
      </view>
    </view>

    <view class="form-card">
      <view class="form-head">
        <text class="form-num">1</text>
        <view><text class="form-eyebrow">申请信息</text><text class="form-hint">请如实填写，便于审核联系</text></view>
      </view>

      <view class="field">
        <view class="field-head"><text class="field-label">真实姓名</text><text class="field-required">*</text></view>
        <input v-model="form.real_name" class="field-input" maxlength="30" placeholder="请输入本人真实姓名" placeholder-style="color: #aab1a5; font-size: 27rpx;" />
        <text class="privacy-tip">仅用于平台内部审核，不会展示给老板或其他用户</text>
      </view>

      <view class="field">
        <view class="field-head"><text class="field-label">陪玩师名称</text><text class="field-auto">来自昵称</text></view>
        <view class="readonly-field"><text class="readonly-value">{{ playerNameText }}</text><text class="readonly-note">使用当前账号昵称作为陪玩师名称，可在账号信息中修改</text></view>
        <view v-if="needsCustomNickname" class="nickname-warning">
          <view>
            <text>请先设置公开昵称</text>
            <text>系统编号昵称只用于账号初始化，成为陪玩师前需要设置公开展示名称。</text>
          </view>
          <button @tap="openAccountSettings">去设置</button>
        </view>
      </view>

      <view class="field">
        <view class="field-head"><text class="field-label">陪玩类型</text><text class="field-required">*</text></view>
        <view class="type-grid">
          <view v-for="type in playerTypes" :key="type.id" class="type-option" :class="{ active: form.type_id === type.id }" @tap="form.type_id = type.id">
            <text class="type-name">{{ type.name }}</text>
          </view>
        </view>
        <text class="privacy-tip">陪玩类型用于匹配对应商品规格，不会在订单中重复叠加类型费用。</text>
      </view>

      <view class="field">
        <view class="field-head"><text class="field-label">联系微信</text><text class="field-required">*</text></view>
        <input v-model="form.contact_wechat" class="field-input" placeholder="请输入联系微信号" placeholder-style="color: #aab1a5; font-size: 27rpx;" />
      </view>

      <view class="field">
        <view class="field-head"><text class="field-label">个人介绍</text><text class="field-counter">{{ form.bio.length }}/200</text></view>
        <textarea v-model="form.bio" class="field-textarea" placeholder="简单介绍自己（在线时间、擅长玩法、过往经历等）" maxlength="200" placeholder-style="color: #aab1a5; font-size: 27rpx;" />
        <view class="field-tag-row">
          <text class="field-tag" @tap="appendBio('女陪')">女陪</text>
          <text class="field-tag" @tap="appendBio('技术陪')">技术陪</text>
          <text class="field-tag" @tap="appendBio('金牌陪')">金牌陪</text>
          <text class="field-tag" @tap="appendBio('明星陪')">明星陪</text>
        </view>
      </view>
    </view>

    <view class="form-card audio-card">
      <view class="form-head">
        <text class="form-num">2</text>
        <view><text class="form-eyebrow">音频自我介绍</text><text class="form-hint">可选，上传后审核通过会展示在陪玩详情页</text></view>
      </view>
      <view v-if="form.audio_intro_url" class="audio-info">
        <view class="audio-icon">声</view>
        <view class="audio-main"><text class="audio-title">{{ form.audio_intro_title || '音频自我介绍' }}</text><text class="audio-url">已上传，提交申请后同步给后台审核</text></view>
        <text class="audio-remove" @tap="removeAudio">移除</text>
      </view>
      <button v-else class="audio-upload" :disabled="audioUploading" @tap="chooseAudio">{{ audioUploading ? '上传中...' : '上传音频介绍' }}</button>
      <view class="audio-tips">支持 MP3 / M4A / AAC / WAV，建议控制在 20MB 以内，内容尽量简短清晰。</view>
    </view>

    <view class="form-card form-card--notice">
      <view class="notice-banner"><view class="notice-icon">i</view><view class="notice-text"><text class="notice-title">审核说明</text><text class="notice-sub">真实姓名仅供平台内部审核；公开资料可能展示陪玩师名称、头像、类型、简介、语音、接单数、评分与公开评价。</text></view></view>
    </view>

    <view class="agree-card" @tap="agree = !agree">
      <view class="checkbox" :class="{ checked: agree }"><text v-if="agree">✓</text></view>
      <view class="agree-text">
        <text>我确认资料真实，并同意</text>
        <text class="agree-link" @tap.stop="showRule = true">《平台接单规则》</text>
        <text>与</text>
        <text class="agree-link" @tap.stop="openPrivacy">《隐私政策》</text>
      </view>
    </view>

    <view class="footer-actions">
      <button class="club-btn club-btn--primary" :disabled="submitting || audioUploading || needsCustomNickname" @tap="submitApply">{{ needsCustomNickname ? '请先设置公开昵称' : (submitting ? '提交中...' : '提交申请') }}</button>
    </view>

    <view v-if="showRule" class="rule-mask" @tap="showRule = false">
      <view class="rule-sheet" @tap.stop>
        <view class="rule-head"><text class="rule-title">平台接单规则</text><text class="rule-close" @tap="showRule = false">×</text></view>
        <scroll-view scroll-y class="rule-body">
          <text class="rule-line">1. 陪玩师需通过平台审核，资料真实有效。</text>
          <text class="rule-line">2. 真实姓名仅用于平台身份审核，不作为公开陪玩资料展示。</text>
          <text class="rule-line">3. 接到订单后须按约定时间上线服务；入房超时会生成待核实记录，由管理员结合实际情况处理。</text>
          <text class="rule-line">4. 服务过程中应保持专业态度，遵守平台行为规范。</text>
          <text class="rule-line">5. 收益按订单结算，平台保留对违规行为进行核实、调整或终止合作的权利。</text>
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
import { uploadPlayerApplicationAudioApi } from '@/api/client'
import { getClientProfile, submitPlayerApplication, syncClientProfile, type ClientProfile } from '@/utils/client'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { go, replace } from '@/utils/nav'

const agree = ref(false)
const showRule = ref(false)
const submitting = ref(false)
const audioUploading = ref(false)
const profile = ref<ClientProfile | null>(null)
const playerTypes = ref<PlayerType[]>([
  { id: 1, name: '女陪', priority: 1, price_extra: 0 },
  { id: 2, name: '技术陪', priority: 2, price_extra: 0 },
  { id: 3, name: '金牌陪', priority: 3, price_extra: 0 },
  { id: 4, name: '明星陪', priority: 4, price_extra: 0 }
])
const form = reactive({ real_name: '', type_id: 0, contact_wechat: '', bio: '', audio_intro_url: '', audio_intro_title: '' })

const playerNameText = computed(() => {
  const current = profile.value
  return current?.nickname?.trim() || current?.player?.name?.trim() || current?.application?.nickname?.trim() || current?.application?.name?.trim() || '微信用户'
})
const needsCustomNickname = computed(() => Boolean(profile.value && profile.value.nickname_customized !== true))

function appendBio(tag: string) {
  if (form.bio.split('、').includes(tag)) return
  form.bio += (form.bio ? '、' : '') + tag
}

function applyProfileDefaults(current: ClientProfile | null) {
  profile.value = current
  const application = current?.application
  const player = current?.player
  form.real_name = application?.real_name || form.real_name
  form.contact_wechat = application?.contact_wechat || player?.contact_wechat || form.contact_wechat
  form.bio = application?.bio || player?.bio || form.bio
  form.audio_intro_url = application?.audio_intro_url || player?.audio_intro_url || form.audio_intro_url
  form.audio_intro_title = application?.audio_intro_title || player?.audio_intro_title || form.audio_intro_title
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
    const [latest, types] = await Promise.all([syncClientProfile(), getPlayerTypes()])
    if (Array.isArray(types) && types.length) playerTypes.value = [...types].sort((a, b) => (a.priority || 0) - (b.priority || 0))
    applyProfileDefaults(latest)
  } catch {
    if (!form.type_id && playerTypes.value.length) form.type_id = playerTypes.value[0].id
  }
}

function openPrivacy() { go('/pages/legal/privacy/index') }
function openAccountSettings() { go('/pages/client/account/index') }

function chooseAudio() {
  const chooseFile = (uni as any).chooseMessageFile
  if (!chooseFile) return toast('当前环境不支持选择音频文件，请在微信开发者工具或真机中使用')
  chooseFile({
    count: 1,
    type: 'file',
    success: async (res: any) => {
      const file = res?.tempFiles?.[0]
      if (!file?.path) return toast('未选择音频文件')
      const name = file.name || '音频自我介绍'
      if (!/\.(mp3|m4a|aac|wav)$/i.test(String(name))) return toast('只支持 MP3/M4A/AAC/WAV 音频')
      audioUploading.value = true
      try {
        const uploaded = await uploadPlayerApplicationAudioApi(file.path, name)
        form.audio_intro_url = uploaded.audio_intro_url
        form.audio_intro_title = uploaded.audio_intro_title || name
        success('音频上传成功')
      } catch (error) {
        toast(getErrorMessage(error, '音频上传失败'))
      } finally { audioUploading.value = false }
    },
    fail: () => {}
  })
}

function removeAudio() {
  form.audio_intro_url = ''
  form.audio_intro_title = ''
}

function validateRealName(value: string) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.replace(/\s/g, '').length < 2) return ''
  if (!/^[\u3400-\u9fffA-Za-z·•'’\- ]+$/.test(normalized)) return ''
  return normalized
}

async function submitApply() {
  if (needsCustomNickname.value) {
    toast('申请成为陪玩师前，请先设置公开昵称')
    openAccountSettings()
    return
  }
  const realName = validateRealName(form.real_name)
  if (!form.real_name.trim()) return toast('请输入真实姓名')
  if (!realName) return toast('请输入完整、有效的真实姓名')
  if (!form.type_id) return toast('请选择陪玩类型')
  if (!form.contact_wechat.trim()) return toast('请输入联系微信')
  if (!form.bio.trim()) return toast('请简单介绍自己')
  if (!agree.value) return toast('请先同意平台规则和隐私政策')

  submitting.value = true
  try {
    await submitPlayerApplication({
      name: playerNameText.value,
      real_name: realName,
      type_id: form.type_id,
      contact_wechat: form.contact_wechat.trim(),
      bio: form.bio.trim(),
      audio_intro_url: form.audio_intro_url,
      audio_intro_title: form.audio_intro_title
    })
    success('申请已提交')
    uni.navigateBack()
  } catch (error) {
    toast(getErrorMessage(error, '提交失败'))
  } finally { submitting.value = false }
}

onShow(loadApplyContext)
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';
.apply-page { min-height:100vh;padding:20rpx 24rpx 200rpx;box-sizing:border-box;background:radial-gradient(ellipse at 12% 0%,rgba(216,161,68,.10),transparent 36%),radial-gradient(ellipse at 88% 14%,rgba(47,155,99,.10),transparent 32%),linear-gradient(180deg,#fbf7ef 0%,#f7f3ea 48%,#fffaf2 100%); }
.apply-hero,.form-card,.agree-card { border-radius:28rpx;background:rgba(255,255,255,.96);box-shadow:0 14rpx 36rpx rgba(38,69,54,.06);border:1px solid rgba(42,63,48,.06); }
.apply-hero { padding:36rpx 32rpx 32rpx;background:linear-gradient(135deg,#fff8ed 0%,#fef5dc 56%,#edf6f0 100%); }
.hero-eyebrow,.form-eyebrow { display:block;color:#a87520;font-size:22rpx;font-weight:900;letter-spacing:1rpx; }
.hero-title { margin-top:14rpx;color:#172116;font-size:56rpx;line-height:1.05;font-weight:900; }
.hero-sub,.form-hint { display:block;margin-top:10rpx;color:#687665;font-size:24rpx;line-height:1.45; }
.hero-tags { display:flex;gap:14rpx;margin-top:26rpx; }
.hero-tag { flex:1;min-height:76rpx;display:flex;align-items:center;justify-content:center;gap:8rpx;border-radius:20rpx;background:rgba(255,255,255,.70);color:#1f7c4b;font-size:22rpx;font-weight:900; }
.form-card { margin-top:22rpx;padding:28rpx; }
.form-head { display:flex;align-items:center;gap:18rpx;margin-bottom:24rpx; }
.form-num,.notice-icon { width:56rpx;height:56rpx;display:flex;align-items:center;justify-content:center;border-radius:18rpx;color:#fff;background:linear-gradient(135deg,#65c980,#1f7c4b);font-size:26rpx;font-weight:900;flex-shrink:0; }
.field { margin-top:24rpx; }.field:first-of-type { margin-top:0; }
.field-head { display:flex;align-items:center;justify-content:space-between;margin-bottom:12rpx; }
.field-label { color:#172116;font-size:28rpx;font-weight:900; }
.field-required,.field-counter,.field-auto { color:#a87520;font-size:22rpx;font-weight:800; }
.readonly-field,.field-input,.field-textarea { width:100%;border-radius:20rpx;background:#f7faf4;border:1px solid rgba(36,55,39,.08);box-sizing:border-box; }
.readonly-field { padding:20rpx; }.readonly-value { display:block;color:#172116;font-size:30rpx;font-weight:900; }
.readonly-note,.privacy-tip { display:block;margin-top:8rpx;color:#8a9286;font-size:22rpx;line-height:1.45; }
.nickname-warning { display:flex;align-items:center;gap:16rpx;margin-top:14rpx;padding:18rpx;border-radius:18rpx;background:#fff3e8;border:1px solid rgba(168,117,32,.16); }
.nickname-warning > view { flex:1;min-width:0; }.nickname-warning text { display:block; }.nickname-warning text:first-child { color:#8c5d16;font-size:24rpx;font-weight:900; }.nickname-warning text:last-child { margin-top:5rpx;color:#8a6f48;font-size:21rpx;line-height:1.45; }
.nickname-warning button { min-width:116rpx;height:60rpx;margin:0;padding:0 18rpx;border-radius:999rpx;color:#fff;font-size:22rpx;font-weight:900;background:#a87520; }.nickname-warning button::after { border:none; }
.type-grid { display:grid;grid-template-columns:repeat(2,1fr);gap:14rpx; }
.type-option { min-height:90rpx;display:flex;align-items:center;justify-content:center;padding:0 20rpx;border-radius:20rpx;background:#f7faf4;border:1px solid rgba(36,55,39,.08); }
.type-option.active { background:#eef8f1;border-color:rgba(47,155,99,.45); }.type-name { color:#172116;font-size:27rpx;font-weight:900; }
.field-input { height:86rpx;padding:0 22rpx;color:#172116;font-size:28rpx; }.field-textarea { min-height:170rpx;padding:20rpx 22rpx;color:#172116;font-size:28rpx;line-height:1.5; }
.field-tag-row { display:flex;flex-wrap:wrap;gap:12rpx;margin-top:14rpx; }.field-tag { padding:10rpx 18rpx;border-radius:999rpx;color:#1f7c4b;font-size:23rpx;font-weight:800;background:#eef8f1; }
.audio-info { display:flex;align-items:center;gap:16rpx;padding:20rpx;border-radius:22rpx;background:#f7faf4;border:1px solid rgba(47,155,99,.12); }
.audio-icon { width:64rpx;height:64rpx;display:flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;background:linear-gradient(135deg,#65c980,#1f7c4b);font-weight:900;flex-shrink:0; }
.audio-main { flex:1;min-width:0; }.audio-title { display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#172116;font-size:27rpx;font-weight:900; }
.audio-url,.audio-tips { display:block;margin-top:8rpx;color:#8a9286;font-size:22rpx;line-height:1.45; }.audio-remove { color:#c43232;font-size:23rpx;font-weight:900; }
.audio-upload { width:100%;height:86rpx;margin:0;border-radius:22rpx;color:#fff;font-size:28rpx;font-weight:900;background:linear-gradient(135deg,#65c980,#1f7c4b); }.audio-upload::after { border:none; }
.notice-banner { display:flex;gap:16rpx;align-items:flex-start; }.notice-title { display:block;color:#172116;font-size:28rpx;font-weight:900; }.notice-sub { display:block;margin-top:8rpx;color:#687665;font-size:24rpx;line-height:1.5; }
.agree-card { display:flex;align-items:center;gap:16rpx;margin-top:22rpx;padding:22rpx 24rpx; }
.checkbox { width:38rpx;height:38rpx;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:10rpx;border:2rpx solid rgba(36,55,39,.18);color:#fff;font-weight:900; }.checkbox.checked { background:#1f7c4b;border-color:#1f7c4b; }
.agree-text { flex:1;display:flex;flex-wrap:wrap;gap:4rpx;color:#687665;font-size:24rpx;line-height:1.5; }.agree-link { color:#1f7c4b;font-weight:900; }
.footer-actions { position:fixed;left:24rpx;right:24rpx;bottom:calc(24rpx + env(safe-area-inset-bottom));z-index:20; }.footer-actions .club-btn { width:100%;min-height:92rpx;font-size:31rpx;border-radius:999rpx; }
.rule-mask { position:fixed;inset:0;z-index:50;display:flex;align-items:flex-end;background:rgba(0,0,0,.42); }.rule-sheet { width:100%;max-height:78vh;padding:28rpx;border-radius:32rpx 32rpx 0 0;background:#fff;box-sizing:border-box; }
.rule-head { display:flex;justify-content:space-between;align-items:center;margin-bottom:18rpx; }.rule-title { color:#172116;font-size:32rpx;font-weight:900; }.rule-close { color:#687665;font-size:46rpx; }.rule-body { max-height:48vh; }
.rule-line { display:block;margin-bottom:12rpx;color:#687665;font-size:26rpx;line-height:1.7; }.rule-confirm { margin-top:18rpx; }
</style>
