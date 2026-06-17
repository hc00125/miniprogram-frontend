<template>
  <view class="club-page login-page">
    <view class="brand-poster login-hero">
      <view class="eyebrow">偷吃电竞 · 陪玩工作台</view>
      <view class="title">登录陪玩工作台</view>
      <view class="sub">查看派单、抢单、管理服务进度。仅审核通过的陪玩师可进入抢单大厅。</view>
    </view>

    <view class="club-card">
      <view class="club-card__bd form-stack">
        <view>
          <view class="club-section-title">称呼</view>
          <input v-model="form.name" class="club-input" placeholder="请输入您的称呼" @confirm="handleLogin" />
        </view>
        <view>
          <view class="club-section-title">类型</view>
          <view class="type-grid">
            <view
              v-for="type in playerTypes"
              :key="type.id"
              class="type-chip"
              :class="{ active: form.type_id === type.id }"
              @tap="form.type_id = type.id"
            >
              {{ type.name }}
            </view>
          </view>
        </view>
        <button class="club-btn" :disabled="loading" @tap="handleLogin">{{ loading ? '登录中...' : '登录' }}</button>
        <view class="notice">登录后 30 天内有效</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { getPlayerTypes } from '@/api/boss'
import { getCurrentPlayer, loginPlayer } from '@/api/player'
import { getErrorMessage, toast, success } from '@/utils/feedback'
import { replace } from '@/utils/nav'
import { getStorage, setStorage } from '@/utils/storage'

const form = reactive({ name: '', type_id: 0 })
const playerTypes = ref<any[]>([])
const loading = ref(false)

async function fetchPlayerTypes() {
  try {
    playerTypes.value = await getPlayerTypes()
    if (!form.type_id && playerTypes.value.length) form.type_id = playerTypes.value[0].id
  } catch (error) {
    toast(getErrorMessage(error, '获取类型失败'))
  }
}

async function handleLogin() {
  if (!form.name.trim()) return toast('请输入称呼')
  if (!form.type_id) return toast('请选择类型')

  loading.value = true
  try {
    const res = await loginPlayer(form.name.trim(), form.type_id)
    setStorage('token', res.token)
    setStorage('player', res.player)
    success('登录成功')
    replace('/pages/player/grab/index')
  } catch (error) {
    toast(getErrorMessage(error, '登录失败'))
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const token = getStorage<string>('token')
  const player = getStorage<any>('player')
  if (token && player) {
    try {
      await getCurrentPlayer()
      replace('/pages/player/grab/index')
      return
    } catch {
      // ignore invalid token and stay on page
    }
  }
  await fetchPlayerTypes()
})
</script>

<style lang="scss" scoped>
.login-hero { padding: 42rpx 30rpx; }
.eyebrow { position: relative; z-index: 1; color: #a87520; font-size: 22rpx; font-weight: 900; }
.title { position: relative; z-index: 1; margin-top: 12rpx; color: #172116; font-size: 42rpx; font-weight: 900; }
.sub { position: relative; z-index: 1; margin-top: 10rpx; color: #687665; font-size: 24rpx; line-height: 1.5; }
.form-stack { display: flex; flex-direction: column; gap: 24rpx; }
.type-grid { display: flex; flex-wrap: wrap; gap: 14rpx; }
.type-chip { padding: 18rpx 24rpx; border-radius: 18rpx; background: #fff; border: 1px solid rgba(37,49,35,.08); font-size: 28rpx; font-weight: 700; color: #1e2719; }
.type-chip.active { background: #eef9ef; border-color: #65c980; color: #1f7c4b; }
.notice { text-align: center; color: #687665; font-size: 24rpx; }
</style>
