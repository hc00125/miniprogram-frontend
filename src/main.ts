import { createSSRApp } from 'vue'
import App from './App.vue'
import { installVirtualPaymentBridge } from '@/utils/virtual-payment'

export function createApp() {
  installVirtualPaymentBridge()
  const app = createSSRApp(App)
  return { app }
}
