<template>
  <view class="theme-switcher">
    <button class="theme-entry" data-action="open-theme-picker" @tap="opened = true">
      <view class="theme-entry-icon"><image :src="uiIcons.settings" mode="aspectFit" /></view>
      <view class="theme-entry-copy"><text class="theme-entry-title">切换 UI</text><text class="theme-entry-sub">选择你喜欢的界面配色</text></view>
      <text class="theme-entry-current">{{ currentTheme.name }}</text>
      <image class="theme-chevron" :src="uiIcons.chevron" mode="aspectFit" />
    </button>
    <view v-if="opened" class="theme-overlay">
      <view class="theme-mask" @tap="opened = false" />
      <view class="theme-panel" role="dialog" aria-label="切换 UI">
        <view class="theme-panel-heading"><text>切换 UI</text><button data-action="close-theme-picker" @tap="opened = false">完成</button></view>
        <text class="theme-panel-note">立即生效，下次打开仍保留你的选择</text>
        <scroll-view scroll-y class="theme-options">
          <button v-for="theme in themes" :key="theme.id" class="theme-option" :class="{ selected: currentTheme.id === theme.id }" :aria-pressed="currentTheme.id === theme.id" :data-theme="theme.id" @tap="selectTheme(theme.id)">
            <view class="theme-swatch" :style="{ background: theme.tokens.gradient }" />
            <view class="theme-option-copy"><text>{{ theme.name }}</text><text>{{ theme.description }}</text></view>
            <text class="theme-option-state">{{ currentTheme.id === theme.id ? '使用中' : '使用' }}</text>
          </button>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onHide } from '@dcloudio/uni-app'
import { themes, currentTheme, selectTheme } from '@/utils/theme'
import { uiIcons } from '@/utils/uiIcons'
const opened = ref(false)
onHide(() => { opened.value = false })
</script>

<style scoped>
.theme-switcher { margin-top:22rpx; }
.theme-entry { display:flex; align-items:center; gap:16rpx; width:100%; min-height:126rpx; padding:22rpx; border:1rpx solid var(--ui-line); border-radius:26rpx; background:var(--ui-surface); color:var(--ui-text); text-align:left; }
.theme-entry::after,.theme-option::after,.theme-panel-heading button::after { border:0; }
.theme-entry-icon { display:flex; align-items:center; justify-content:center; width:72rpx; height:72rpx; flex-shrink:0; border-radius:22rpx; background:var(--ui-accent-soft); }
.theme-entry-icon image { width:42rpx; height:42rpx; }
.theme-entry-copy,.theme-option-copy { display:flex; flex:1; min-width:0; flex-direction:column; gap:9rpx; }
.theme-entry-title { font-size:29rpx; font-weight:800; }
.theme-entry-sub { font-size:21rpx; color:var(--ui-muted); }
.theme-entry-current { font-size:23rpx; color:var(--ui-accent); }
.theme-chevron { width:24rpx; height:24rpx; flex-shrink:0; }
.theme-overlay { position:fixed; z-index:999; inset:0; }
.theme-mask { position:absolute; inset:0; background:rgba(0,0,0,.5); }
.theme-panel { position:absolute; left:0; right:0; bottom:0; padding:30rpx 24rpx calc(30rpx + env(safe-area-inset-bottom)); border-radius:32rpx 32rpx 0 0; background:var(--ui-surface); color:var(--ui-text); }
.theme-panel-heading { display:flex; align-items:center; justify-content:space-between; font-size:34rpx; font-weight:800; }
.theme-panel-heading button { min-width:100rpx; min-height:88rpx; padding:12rpx 18rpx; border-radius:18rpx; background:var(--ui-accent-soft); color:var(--ui-accent); font-size:26rpx; }
.theme-panel-note { display:block; margin:12rpx 0 24rpx; color:var(--ui-muted); font-size:24rpx; }
.theme-options { max-height:55vh; }
.theme-option { display:flex; align-items:center; gap:22rpx; width:100%; min-height:142rpx; padding:22rpx; margin:0 0 18rpx; border:2rpx solid var(--ui-line); border-radius:24rpx; color:var(--ui-text); background:var(--ui-soft); text-align:left; }
.theme-option.selected { border-color:var(--ui-accent); background:var(--ui-accent-soft); }
.theme-swatch { width:88rpx; height:88rpx; border-radius:24rpx; flex-shrink:0; }
.theme-option-copy text:first-child { font-size:29rpx; font-weight:800; }
.theme-option-copy text:last-child { color:var(--ui-muted); font-size:22rpx; }
.theme-option-state { color:var(--ui-accent); font-size:23rpx; flex-shrink:0; }
</style>
