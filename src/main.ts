import { createSSRApp } from 'vue'
import App from './App.vue'
import { configureOrderAlertAudioOptions } from '@/utils/audioOptions'
import { initializeTheme, themeMixin } from '@/utils/theme'

export function createApp() {
  configureOrderAlertAudioOptions()
  initializeTheme()
  const app = createSSRApp(App)
  app.mixin(themeMixin)
  return { app }
}
