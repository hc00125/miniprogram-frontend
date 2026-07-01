<template>
  <view class="main-bottom-tabs-placeholder" />
</template>

<script setup lang="ts">
import type { MainTab } from '@/utils/nav'

defineProps<{
  active: MainTab
}>()

defineEmits<{
  select: [tab: MainTab]
}>()
</script>

<style lang="scss">
.main-bottom-tabs-placeholder {
  display: none;
}
</style>
