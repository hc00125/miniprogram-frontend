<template>
  <image
    class="boss-notice-poster"
    :src="POSTER_URL"
    mode="widthFix"
    aria-label="偷吃电竞老板须知，点击放大查看"
    @tap="previewPoster"
  />
</template>

<script setup lang="ts">
const POSTER_URL = '/images/notices/boss-notice.jpg'

function previewPoster() {
  uni.previewImage({ current: POSTER_URL, urls: [POSTER_URL] })
}
</script>

<style scoped>
.boss-notice-poster {
  display: block;
  width: 100%;
}
</style>
