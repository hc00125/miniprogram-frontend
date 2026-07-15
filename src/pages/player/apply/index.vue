<template>
  <view class="apply-page">
    <view class="hero"><text>PLAYER APPLICATION</text><text>申请成为偷吃电竞陪玩师</text><text>资料审核通过后才能进入抢单大厅</text></view>
    <view class="card">
      <text class="title">申请信息</text>
      <view class="field"><text>真实姓名 *</text><input v-model="form.real_name" maxlength="30" placeholder="仅用于平台内部审核" /></view>
      <view class="field"><text>陪玩师名称</text><view class="readonly">{{ playerNameText }}</view><text class="tip">使用当前账号昵称，可在账号信息中修改</text></view>
      <view class="field"><text>陪玩类型 *</text><view class="type-grid"><view v-for="type in playerTypes" :key="type.id" :class="{ active: form.type_id === type.id }" @tap="form.type_id = type.id">{{ type.name }}</view></view><text class="tip">类型只用于匹配对应规格，不会重复叠加类型费用。</text></view>
      <view class="field"><text>联系微信 *</text><input v-model="form.contact_wechat" placeholder="请输入联系微信号" /></view>
      <view class="field"><text>个人介绍 *</text><textarea v-model="form.bio" maxlength="200" placeholder="在线时间、擅长玩法、过往经历等" /><text class="tip">{{ form.bio.length }}/200</text></view>
    </view>

    <view class="card">
      <text class="title">音频自我介绍</text><text class="tip">可选，审核通过后可能展示在陪玩详情页</text>
      <view v-if="form.audio_intro_url" class="audio-row"><view><text>{{ form.audio_intro_title || '音频自我介绍' }}</text><text>已上传</text></view><button @tap="removeAudio">移除</button></view>
      <button v-else class="upload-btn" :disabled="audioUploading" @tap="chooseAudio">{{ audioUploading ? '上传中...' : '上传音频介绍' }}</button>
      <text class="tip">支持 MP3 / M4A / AAC / WAV，建议不超过20MB。</text>
    </view>

    <view class="card notice"><text>审核说明</text><text>真实姓名仅供内部审核；公开资料可能展示名称、头像、类型、简介、语音、接单数、评分与公开评价。</text></view>

    <view class="agree" @tap="agree = !agree"><view :class="{ checked: agree }">{{ agree ? '✓' : '' }}</view><text>我确认资料真实，并同意</text><text class="link" @tap.stop="showRule = true">《平台接单规则》</text><text>与</text><text class="link" @tap.stop="go('/pages/legal/privacy/index')">《隐私政策》</text></view>
    <button class="submit-btn" :disabled="submitting || audioUploading" @tap="submitApply">{{ submitting ? '提交中...' : '提交申请' }}</button>

    <view v-if="showRule" class="mask" @tap="showRule = false"><view class="sheet" @tap.stop><view class="sheet-head"><text>平台接单规则</text><text @tap="showRule = false">×</text></view><text>1. 陪玩师需通过平台审核，资料真实有效。</text><text>2. 真实姓名仅用于内部审核，不作为公开资料展示。</text><text>3. 接单后须按约定时间上线；入房超时会生成待核实记录。</text><text>4. 服务过程中应保持专业态度并遵守平台规范。</text><text>5. 收益按订单结算，异常情况由管理员依据记录核实处理。</text><button @tap="showRule = false">我知道了</button></view></view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPlayerTypes, type PlayerType } from '@/api/boss'
import { uploadPlayerApplicationAudioApi } from '@/api/client'
import { getClientProfile, submitPlayerApplication, syncClientProfile, type ClientProfile } from '@/utils/client'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { backToRoute, go, replace } from '@/utils/nav'

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
const playerNameText = computed(() => profile.value?.nickname?.trim() || profile.value?.player?.name?.trim() || profile.value?.application?.name?.trim() || '微信用户')

function applyDefaults(current: ClientProfile | null) {
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
async function loadContext() {
  if (!uni.getStorageSync('token')) { toast('请先登录后再申请'); replace('/pages/client/login/index'); return }
  applyDefaults(getClientProfile())
  try {
    const [latest, types] = await Promise.all([syncClientProfile(), getPlayerTypes()])
    if (types?.length) playerTypes.value = [...types].sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0))
    applyDefaults(latest)
  } catch { if (!form.type_id) form.type_id = playerTypes.value[0]?.id || 0 }
}
function chooseAudio() {
  const chooseFile = (uni as any).chooseMessageFile
  if (!chooseFile) return toast('当前环境不支持选择音频文件')
  chooseFile({ count: 1, type: 'file', success: async (result: any) => {
    const file = result?.tempFiles?.[0]
    if (!file?.path) return
    const name = file.name || '音频自我介绍'
    if (!/\.(mp3|m4a|aac|wav)$/i.test(name)) return toast('只支持 MP3/M4A/AAC/WAV 音频')
    audioUploading.value = true
    try { const uploaded = await uploadPlayerApplicationAudioApi(file.path, name); form.audio_intro_url = uploaded.audio_intro_url; form.audio_intro_title = uploaded.audio_intro_title || name; success('音频上传成功') }
    catch (error) { toast(getErrorMessage(error, '音频上传失败')) }
    finally { audioUploading.value = false }
  } })
}
function removeAudio() { form.audio_intro_url = ''; form.audio_intro_title = '' }
function validateRealName(value: string) { const normalized = value.trim().replace(/\s+/g, ' '); return normalized.replace(/\s/g, '').length >= 2 && /^[\u3400-\u9fffA-Za-z·•'’\- ]+$/.test(normalized) ? normalized : '' }
async function submitApply() {
  const realName = validateRealName(form.real_name)
  if (!realName) return toast('请输入完整、有效的真实姓名')
  if (!form.type_id) return toast('请选择陪玩类型')
  if (!form.contact_wechat.trim()) return toast('请输入联系微信')
  if (!form.bio.trim()) return toast('请填写个人介绍')
  if (!agree.value) return toast('请先同意平台规则和隐私政策')
  submitting.value = true
  try {
    await submitPlayerApplication({ name: playerNameText.value, real_name: realName, type_id: form.type_id, contact_wechat: form.contact_wechat.trim(), bio: form.bio.trim(), audio_intro_url: form.audio_intro_url, audio_intro_title: form.audio_intro_title })
    success('申请已提交')
    backToRoute('/pages/client/profile/index')
  } catch (error) { toast(getErrorMessage(error, '提交失败')) }
  finally { submitting.value = false }
}
onShow(loadContext)
</script>

<style lang="scss" scoped>
.apply-page{min-height:100vh;padding:20rpx 24rpx 150rpx;box-sizing:border-box;background:#f7f3ea}.hero,.card,.agree{margin-bottom:18rpx;padding:26rpx;border-radius:26rpx;background:#fff}.hero{color:#fff;background:linear-gradient(135deg,#173426,#1f7c4b)}.hero text{display:block}.hero text:first-child{font-size:19rpx;opacity:.7}.hero text:nth-child(2){margin-top:10rpx;font-size:38rpx;font-weight:900}.hero text:last-child{margin-top:8rpx;font-size:22rpx;opacity:.78}.title{display:block;font-size:29rpx;font-weight:900}.field{margin-top:20rpx}.field>text:first-child{display:block;font-size:24rpx;font-weight:900}.field input,.field textarea,.readonly{width:100%;margin-top:10rpx;padding:16rpx;border-radius:16rpx;background:#f7faf4;box-sizing:border-box}.field textarea{height:150rpx}.tip{display:block;margin-top:7rpx;color:#879083;font-size:20rpx;line-height:1.5}.type-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12rpx;margin-top:10rpx}.type-grid view{padding:18rpx;border-radius:16rpx;text-align:center;background:#f7faf4}.type-grid view.active{color:#1f7c4b;border:2rpx solid #1f7c4b;background:#eef8f1}.audio-row{display:flex;align-items:center;gap:14rpx;margin-top:18rpx;padding:16rpx;border-radius:16rpx;background:#f7faf4}.audio-row>view{flex:1}.audio-row text{display:block}.audio-row text:first-child{font-weight:900}.audio-row text:last-child{margin-top:5rpx;color:#879083;font-size:20rpx}.audio-row button,.upload-btn{margin:0;color:#fff;background:#1f7c4b}.upload-btn{width:100%;margin-top:18rpx}.notice text{display:block}.notice text:first-child{font-weight:900}.notice text:last-child{margin-top:8rpx;color:#687665;font-size:22rpx;line-height:1.55}.agree{display:flex;align-items:center;flex-wrap:wrap;gap:5rpx;font-size:22rpx}.agree>view{width:36rpx;height:36rpx;display:flex;align-items:center;justify-content:center;border:2rpx solid #ccc;border-radius:9rpx}.agree>view.checked{color:#fff;background:#1f7c4b;border-color:#1f7c4b}.link{color:#1f7c4b;font-weight:900}.submit-btn{position:fixed;left:24rpx;right:24rpx;bottom:calc(22rpx + env(safe-area-inset-bottom));height:82rpx;border-radius:999rpx;color:#fff;background:#1f7c4b}.mask{position:fixed;inset:0;z-index:40;display:flex;align-items:flex-end;background:rgba(0,0,0,.45)}.sheet{width:100%;padding:26rpx;border-radius:28rpx 28rpx 0 0;background:#fff;box-sizing:border-box}.sheet-head{display:flex;justify-content:space-between;font-size:30rpx;font-weight:900}.sheet>text{display:block;margin-top:13rpx;color:#687665;font-size:23rpx;line-height:1.5}.sheet button{width:100%;margin-top:20rpx;color:#fff;background:#1f7c4b}
</style>
