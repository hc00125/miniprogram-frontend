declare const wx: any

let configured = false

/**
 * iOS 默认会让 InnerAudioContext 遵循手机侧边静音键。
 * 抢单提示属于时效提醒，因此关闭该限制；失败时保留原有震动提醒。
 */
export function configureOrderAlertAudioOptions() {
  if (configured) return
  configured = true

  try {
    if (typeof wx === 'undefined' || typeof wx.setInnerAudioOption !== 'function') return
    wx.setInnerAudioOption({
      obeyMuteSwitch: false,
      mixWithOther: true,
      fail: (error: unknown) => {
        configured = false
        console.warn('抢单提示音配置失败', error)
      }
    })
  } catch (error) {
    configured = false
    console.warn('抢单提示音配置异常', error)
  }
}
