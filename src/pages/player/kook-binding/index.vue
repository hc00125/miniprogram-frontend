<template>
  <view class="kook-page">
    <text class="eyebrow">接单通知</text><text class="title">连接你的 KOOK</text>
    <text class="subtitle">指定邀请发给本人，接单仍在小程序完成。</text>
    <view v-if="s.error" class="notice">{{ s.error }}</view>
    <view v-if="!loggedIn" class="card"><text>请先使用已审核陪玩师的微信账号登录</text><button class="primary" @tap="login">微信登录</button></view>
    <template v-else>
      <view class="card">
        <view class="row"><text class="heading">{{ s.binding?.status === 'bound' ? '已绑定' : 'KOOK账号' }}</text><button class="small" :disabled="s.busy" @tap="c.load">刷新</button></view>
        <template v-if="s.binding?.status === 'bound'">
          <text class="identity">{{ s.binding.kook_display_name || 'KOOK用户' }} · {{ s.binding.masked_kook_user }}</text>
          <view class="row"><text>接收本人通知 · {{ s.binding.notifications_enabled ? '已开启' : '已关闭' }}</text><button class="small" :disabled="s.busy" @tap="c.toggle(!s.binding.notifications_enabled)">{{ s.binding.notifications_enabled ? '关闭' : '开启' }}</button></view>
          <view class="actions"><button :disabled="s.busy" @tap="c.start">更换账号</button><button :disabled="s.busy" @tap="c.remove">解除绑定</button></view>
        </template>
        <button v-else class="primary" :disabled="s.busy || !s.binding" @tap="c.start">{{ s.challengeId ? '重新获取绑定码' : '获取绑定码' }}</button>
        <text v-if="!s.binding" class="hint">正在核对服务状态；暂未开放时无法绑定。</text>
      </view>
      <view v-if="s.challenge" class="card">
        <template v-if="s.challenge.status === 'pending'">
          <text class="heading">私信机器人，再回来确认</text>
          <text v-if="s.code" class="code" user-select selectable>bind {{ s.code }}</text>
          <button v-if="s.code" :disabled="s.busy" @tap="copyCode">复制私信指令</button>
          <text v-else class="hint">绑定码仅显示一次。已发送请等待，未发送可重新获取。</text>
          <text class="hint">只私信机器人，不发群、不交给他人。发完回本页确认。</text>
          <text class="hint">{{ remaining }} 秒后过期</text>
        </template>
        <template v-else-if="s.challenge.status === 'awaiting_confirmation'">
          <text class="heading">待你确认的账号</text><text class="identity">{{ s.challenge.kook_display_name || 'KOOK用户' }}</text><text>{{ s.challenge.masked_kook_user }}</text>
          <view class="row"><text>绑定后接收本人通知</text><switch color="#2f9b63" :checked="s.consent" :disabled="s.busy" @change="s.consent = $event.detail.value" /></view>
          <button class="primary" :disabled="s.busy || !s.challenge.confirmation_nonce" @tap="c.confirmBinding">这是我的账号，确认绑定</button>
        </template>
        <text v-else class="heading">{{ s.challenge.status === 'expired' ? '绑定码已过期，请重新获取' : '本次绑定流程已结束，请刷新' }}</text>
        <button :disabled="s.busy" @tap="c.cancel">取消本次绑定</button>
      </view>
      <view v-if="s.binding?.status === 'bound'" class="card">
        <text class="heading">测试通知</text><text class="hint">仅发送给当前绑定账号；未开放发送时会提示，原有提醒不受影响。</text>
        <button class="primary" :disabled="s.busy || !s.binding.notifications_enabled || s.delivery?.status === 'queued' || s.delivery?.status === 'unknown'" @tap="c.test">发送测试通知</button>
        <text v-if="!s.binding.notifications_enabled" class="hint">请先开启接收本人通知</text>
        <text v-if="s.delivery" class="result">{{ deliveryText(s.delivery.status) }}</text>
        <button v-if="s.deliveryId" :disabled="s.busy" @tap="c.poll">查询平台发送结果</button>
      </view>
    </template>
  </view>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import * as api from '@/api/kook'
import { copyText } from '@/utils/clipboard'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
import { createController, initialState, deliveryText } from './state'
const s = reactive(initialState()), loggedIn = ref(false)
const c = createController(s, api, content => new Promise(resolve => uni.showModal({ title: '确认操作', content, success: r => resolve(r.confirm), fail: () => resolve(false) })))
let visible = false, generation = 0
let owner = '', timer: ReturnType<typeof setInterval> | undefined
const remaining = computed(() => Math.max(0, Math.ceil((Date.parse(s.challenge?.expires_at || '') - s.now) / 1000)) || 0)
function login() { uni.navigateTo({ url: '/pages/client/login/index' }) }
function stop() { generation++; if (timer) clearInterval(timer); timer = undefined }
function expired(scope: string) { if (scope === 'token') { stop(); owner = ''; loggedIn.value = false; c.reset() } }
function copyCode() { c.tick(Date.now()); if (s.code && s.challenge?.status === 'pending') copyText(`bind ${s.code}`, 'kook-binding') }
uni.$on(SESSION_EXPIRED_EVENT, expired)
onShow(async () => {
  stop(); visible = true
  const currentGeneration = generation
  const token = String(uni.getStorageSync('token') || '')
  if (token !== owner) c.reset()
  owner = token; loggedIn.value = Boolean(token)
  if (!token) return
  await c.load()
  if (!visible || currentGeneration !== generation || token !== String(uni.getStorageSync('token') || '')) return
  timer = setInterval(() => { c.tick(Date.now()); if (!s.error && (s.challengeId || s.delivery?.status === 'queued')) void c.poll() }, 5000)
})
onHide(() => { visible = false; stop(); c.hide() })
onUnload(() => { visible = false; stop(); c.reset(); uni.$off(SESSION_EXPIRED_EVENT, expired) })
</script>
<style scoped>
.kook-page { min-height: 100vh; box-sizing: border-box; padding: 40rpx 28rpx 80rpx; background: #fbf7ef; color: #243c2d; }
.eyebrow, .title, .subtitle, .heading, .identity, .hint, .code, .result { display: block; }
.eyebrow { color: #2f9b63; font-size: 24rpx; font-weight: 700; }.title { margin-top: 12rpx; font-size: 46rpx; font-weight: 800; }.subtitle { margin: 16rpx 0 32rpx; color: #728075; font-size: 25rpx; line-height: 1.7; }
.card { background: #fffefb; border: 1rpx solid #e1e9dd; border-radius: 30rpx; padding: 28rpx; margin-top: 22rpx; }.heading { font-size: 31rpx; font-weight: 700; }.identity { margin: 20rpx 0; overflow-wrap: anywhere; }.hint { margin: 16rpx 0; color: #768275; font-size: 24rpx; line-height: 1.6; }.notice { padding: 24rpx; border-radius: 24rpx; background: #fff0d7; color: #82622d; font-size: 26rpx; }.code { margin: 24rpx 0; padding: 28rpx 12rpx; background: #eef5e9; border-radius: 20rpx; text-align: center; font-family: monospace; font-size: 34rpx; }.row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin: 18rpx 0; }.actions { display: flex; gap: 16rpx; }.result { margin-top: 20rpx; color: #2f7f54; font-size: 26rpx; }
button { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 92rpx; box-sizing: border-box; padding: 22rpx 28rpx; margin: 18rpx 0 0; border-radius: 24rpx; background: #edf3e8; color: #2c6541; font-size: 27rpx; line-height: 1.4; }button::after { border: 0; }button.primary { background: #2f9b63; color: #fff; }button[disabled] { opacity: .45; }.small { width: auto; min-height: 64rpx; margin: 0; padding: 12rpx 20rpx; }
</style>
