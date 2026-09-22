// Do not log/copy raw platform errors: they may include the copied secret or contact.
// These categories are diagnostic hints, not proof of a device/configuration root cause.
function failureInfo(error: any) {
  const message = typeof error?.errMsg === 'string' ? error.errMsg : ''
  const code = Number.isSafeInteger(error?.errno) ? error.errno : Number.isSafeInteger(error?.errCode) ? error.errCode : 'NA'
  if (code === 112 || /api scope is not declared in the privacy agreement/i.test(message)) {
    return { code, reason: 'PRIVACY_DECLARATION', hint: '微信提示隐私接口声明未完成，请将下方反馈码发给客服核查。' }
  }
  if (/appid privacy api banned/i.test(message)) {
    return { code, reason: 'PRIVACY_BANNED', hint: '微信提示隐私接口受限，请将下方反馈码发给客服核查。' }
  }
  if (code === 104 || /privacy.*(deny|denied|disagree|not agree)|未同意隐私/i.test(message)) {
    return { code, reason: 'PRIVACY_NOT_AGREED', hint: '本次隐私授权未完成，未自动重试。你可以手动输入。' }
  }
  if (code === 103 || /auth deny|permission denied|authorize.*deny/i.test(message)) {
    return { code, reason: 'DENIED', hint: '本次复制被拒绝，未自动重试。你可以手动输入。' }
  }
  return { code, reason: 'FAILED', hint: '本次复制未完成。' }
}

// Callback style avoids an unhandled Promise rejection in uni's no-callback API.
// Native setClipboardData owns the success toast; never read clipboard contents back.
export function copyText(data: string, source: 'kook-binding' | 'customer-service') {
  const fail = (error: any) => {
    const info = failureInfo(error)
    uni.showModal({
      title: '复制失败',
      content: `${info.hint}\n请关闭提示后长按页面中的文字手动复制，或手动输入。\n反馈码：CP/${source}/${info.reason}/${info.code}`,
      showCancel: false,
      confirmText: '我知道了'
    })
  }
  try { uni.setClipboardData({ data, fail }) }
  catch (error) { fail(error) }
}
