<template>
  <view :style="articleThemeStyle" class="help-article">
    <view class="help-hero">
      <text class="help-eyebrow">{{ article.audience === 'boss' ? '老板必读' : article.audience === 'player' ? '陪玩必读' : '老板与陪玩均适用' }}</text>
      <text class="help-title">{{ article.title }}</text>
      <text class="help-summary">{{ article.summary }}</text>
    </view>

    <view class="help-section-tools">
      <button class="help-text-action" data-action="toggle-all" hover-class="help-pressed" @tap="toggleAll">{{ allOpen ? '全部收起' : '全部展开' }}</button>
    </view>

    <view v-for="(section, index) in article.sections" :key="section.id" class="help-card help-section">
      <button class="help-section-toggle" :data-section="section.id" :aria-expanded="openSections.includes(section.id)" :aria-controls="`help-section-${section.id}`" hover-class="help-pressed" @tap="toggleSection(section.id)">
        <text class="help-section-number" aria-hidden="true">{{ index + 1 }}</text>
        <text class="help-row-title help-section-title">{{ section.title }}</text>
        <text class="help-section-state">{{ openSections.includes(section.id) ? '收起' : '展开' }}</text>
      </button>
      <view v-if="openSections.includes(section.id)" :id="`help-section-${section.id}`" class="help-section-body">
        <text v-for="(paragraph, paragraphIndex) in section.paragraphs" :key="paragraphIndex" class="help-paragraph" selectable>{{ paragraph }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HelpArticle } from '@/content/help'
import { currentTheme } from '@/utils/theme'

const props = defineProps<{ article: HelpArticle }>()
const articleThemeStyle = computed(() => Object.entries(currentTheme.value.tokens).map(([key, value]) => `--ui-${key}:${value}`).join(';'))
const openSections = ref<string[]>(props.article.sections.length ? [props.article.sections[0].id] : [])
const allOpen = computed(() => Boolean(props.article.sections.length && props.article.sections.every(section => openSections.value.includes(section.id))))

function toggleSection(id: string) {
  openSections.value = openSections.value.includes(id)
    ? openSections.value.filter(item => item !== id)
    : [...openSections.value, id]
}

function toggleAll() {
  openSections.value = allOpen.value ? [] : props.article.sections.map(section => section.id)
}
</script>

<style scoped src="./help.css"></style>
<style scoped>
.help-article button { margin: 0; font-family: inherit; line-height: 1.5; text-align: left; }
.help-article button::after { border: none; }
</style>
