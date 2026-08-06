import { createSSRApp } from 'vue'
import App from './App.vue'
import { configureOrderAlertAudioOptions } from '@/utils/audioOptions'

export function createApp() {
  configureOrderAlertAudioOptions()
  const app = createSSRApp(App)
  return { app }
}
