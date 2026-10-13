<template>
  <view :style="appThemeStyle" class="help-page">
    <BossNoticePoster />
  </view>
</template>

<script setup lang="ts">
import { appThemeStyle } from '@/utils/theme'
import BossNoticePoster from '@/components/BossNoticePoster.vue'
</script>

<style scoped>
.help-page {
  min-height: 100vh;
  background: var(--ui-bg);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
