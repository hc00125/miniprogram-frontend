declare const wx: any

const ORDER_ALERT_FILENAME = 'touchi-new-order-alert.wav'
const ORDER_ALERT_WAV_BASE64 = 'UklGRnwHAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVgHAACAgIGCgX99e3yAhIeHhH54dXh+h42Nh310b3N9iZKTi31waW16i5eZkH5tZGd3i5uflYBqXmFzi6CmmoJoWVtui6OsoYZnVFRpiaayp4pnT01jh6e1q41pUExhg6W1rZBsUUxegKK0r5RwU0tbfZ+0sJdzVUtZeZ2zspp2V0tXdpqys515WUtVc5ewtJ99W0tTcJSvtKKAXkxRbJCttaWDYUxQaY2rtaeHY01OZoqptamKZk5NY4entauNaVBMYYOlta2QbFFMXoCitK+UcFNLW32ftLCXc1VLWXmds7KadldLV3aasrOdeVlLVXOXsLSffVtLU3CUr7SigF5MUWyQrbWlg2FMUGmNq7Wnh2NNTmaKqbWpimZOTWOHp7WrjWlQTGGDpbWtkGxRTF6AorSvlHBTS1t9n7Swl3NVS1l5nbOymnZXS1d2mrKznXlZS1Vzl7C0n31bS1NwlK+0ooBeTFFskK21pYNhTFBpjau1p4djTU5miqm1qYpmTk1jh6e1q41pUExhg6W1rZBsUUxegKK0r5RwU0tbfZ+0sJdzVUtZeZ2zspp2V0tXdpqys515WUtVc5ewtJ99W0tTcJSvtKKAXkxRbJCttaWDYUxQaY2rtaeHY01OZoqptamKZk5NY4entauNaVBMYYOlta2QbFFMXoCitK+UcFNLW32ftLCXc1VLWXmds7KadldLV3aasrOdeVlLVXOXsLSffVtLU3CUr7SigF5MUWyQrbWlg2FMUGmNq7Wnh2NNTmaKqbWpimZOTWOHp7WrjWlQTGGDpbWtkGxRTF6AorSvlHBTS1t9n7Swl3NVS1l5nbOymnZXS1d2mrKznXlZS1Vzl7C0n31dTlZxkqqvnoBjVFlwjaOpnINpW15wiZ2jmYRuYWJxhpedloVzZ2dyg5GXkoV3bW11gYyRjoV6c3J3gIiLiYR9eXh7gISFhIJ/fn5/gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBgH59gISFgXt5f4eJgnh1foqNg3VxfIyRhXNteo6Vh3Jpd4+ZinBldJCdjnBhcZGhkW9dbZGllXBZaJCpmnBVZI+tnnJSX46wo3NPWouzqHZOV4iyqnlPVYWwrH1QU4KvroBSUX6tsINUUHursYdWTnipsopYTXSns41aTHGltJBdTG6itZRfS2uftZdiS2idtZplS2WatZ1oS2KXtZ9rS1+UtaJuTF2QtKVxTFqNs6d0TViKsql4TlaHsat7UFSDsK1+UVKArq+CU1B9rLCFVU95qrKIV052qLOMWU1zprSPW0xwo7SSXktsobWVYUtpnrWYY0tmm7WbZktjmLWeaUthlbWhbEtekrSjcExbj7Smc01ZjLOodk5XiLKqeU9VhbCsfVBTgq+ugFJRfq2wg1RQe6uxh1ZOeKmyilhNdKezjVpMcaW0kF1MbqK1lF9La5+1l2JLaJ21mmVLZZq1nWhLYpe1n2tLX5S1om5MXZC0pXFMWo2zp3RNWIqyqXhOVoexq3tQVIOwrX5RUoCur4JTUH2ssIVVT3mqsohXTnaos4xZTXOmtI9bTHCjtJJeS2yhtZVhS2metZhjS2abtZtmS2OYtZ5pS2GVtaFsS16StKNwTFuPtKZzTVmMs6h2TleIsqp5T1WFsKx9UFOCr66AUlF+rbCDVFB7q7GHVk54qbKKWE10p7ONWkxxpbSQXUxuorWUX0trn7WXYktonbWaZUtlmrWdaEtil7Wfa0tflLWibkxdkLSlcUxajbOndE1YirKpeE5Wh7Gre1BUg7CtflFSgK6vglNQfaywhVVPeaqyiFdOdqizjFlNc6a0j1tMcKO0kl5LbKG1lWFLaZ61mGNLZpu1m2ZLY5i1nmlLYZW1oWxLXpK0o3BMW4+0pnNNWYyzqHZOV4iyqnlPVYWwrH1QU4KvroBSUX6tsINUUHursYdWTnipsopYTXSns41aTHGltJBdTG6itZRfS2uftZdiS2idtZplS2WatZ1oS2KXtZ9rS1+UtaJuTF2QtKVxTFqNs6d0TViKsql4TlaHsat7UFSDsK1+UVKAra2CVlR9qKuEW1Z6o6iHYFl4nqWIZFx3maKKaV92lZ+KbWN1kZuLcWd1jZeKdGt2ipOKd293h4+IenN5hYuHfHd6g4eEfnt9gYOCgH+AgA=='

export interface OrderAlertController {
  prepare: () => Promise<void>
  notify: () => void
  destroy: () => void
}

export function createOrderAlert(): OrderAlertController {
  let audio: any = null
  let preparing: Promise<void> | null = null
  let lastPlayedAt = 0

  async function prepare() {
    if (audio) return
    if (preparing) return preparing

    preparing = new Promise<void>((resolve) => {
      try {
        const filePath = `${wx.env.USER_DATA_PATH}/${ORDER_ALERT_FILENAME}`
        const fs = wx.getFileSystemManager()

        const createAudio = () => {
          try {
            audio = wx.createInnerAudioContext()
            audio.autoplay = false
            audio.loop = false
            audio.volume = 1
            audio.src = filePath
            audio.onError((error: unknown) => console.warn('新订单提示音播放失败', error))
          } catch (error) {
            console.warn('新订单提示音初始化失败', error)
          }
          resolve()
        }

        fs.access({
          path: filePath,
          success: createAudio,
          fail: () => {
            fs.writeFile({
              filePath,
              data: ORDER_ALERT_WAV_BASE64,
              encoding: 'base64',
              success: createAudio,
              fail: (error: unknown) => {
                console.warn('新订单提示音写入失败', error)
                resolve()
              }
            })
          }
        })
      } catch (error) {
        console.warn('新订单提示音准备失败', error)
        resolve()
      }
    })

    await preparing
  }

  function vibrate() {
    try {
      wx.vibrateShort({
        type: 'heavy',
        fail: () => {
          try { wx.vibrateShort({}) } catch {}
        }
      })
    } catch {}
  }

  function notify() {
    const current = Date.now()
    if (current - lastPlayedAt < 1500) return
    lastPlayedAt = current

    vibrate()
    void prepare().then(() => {
      if (!audio) return
      try {
        audio.stop()
        audio.seek(0)
        audio.play()
      } catch (error) {
        console.warn('新订单提示音触发失败', error)
      }
    })
  }

  function destroy() {
    try {
      audio?.destroy()
    } catch {}
    audio = null
    preparing = null
  }

  return { prepare, notify, destroy }
}
