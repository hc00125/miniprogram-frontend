<template>
  <view :style="appThemeStyle" class="help-page">
    <view class="help-shell">
      <HelpArticleContent v-if="article" :article="article" />
      <template v-else>
        <view class="help-hero"><text class="help-title">违规订单认定与处置</text></view>
        <view class="help-card help-placeholder"><text class="help-summary">内容整理中</text></view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { currentTheme, themeStyleFor } from '@/utils/theme'
import { getHelpArticle } from '@/content/help'
import HelpArticleContent from './HelpArticleContent.vue'

const appThemeStyle = computed(() => themeStyleFor(currentTheme.value))
const article = getHelpArticle('order-violations')
</script>

<style scoped src="./help.css"></style>
