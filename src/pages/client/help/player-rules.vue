<template>
  <view :style="appThemeStyle" class="help-page">
    <view class="help-shell">
      <HelpArticleContent v-if="article" :article="article" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { appThemeStyle } from '@/utils/theme'
import { getHelpArticle } from '@/content/help'
import HelpArticleContent from './HelpArticleContent.vue'

const article = getHelpArticle('player-rules')
</script>

<style scoped src="./help.css"></style>
