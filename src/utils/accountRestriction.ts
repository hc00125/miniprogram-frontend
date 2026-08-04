export type AccountStatus = 'active' | 'suspended' | 'banned'

export interface AccountRestrictionSource {
  account_status?: AccountStatus
  account_status_text?: string
  account_suspended_until?: string | null
  account_restriction_reason?: string
  code?: string
  detail?: string
  reason?: string
  suspended_until?: string | null
}

export interface AccountRestrictionView {
  restricted: boolean
  status: AccountStatus
  title: string
  statusText: string
  suspendedUntil: string | null
  suspendedUntilText: string
  reason: string
  content: string
  key: string
}

const sessionNoticeKeys = new Set<string>()
let modalVisible = false
let lastModalKey = ''
let lastModalAt = 0

function resolveStatus(source: AccountRestrictionSource | null | undefined): AccountStatus {
  if (source?.account_status === 'suspended' || source?.account_status === 'banned') {
    return source.account_status
  }
  if (source?.code === 'ACCOUNT_SUSPENDED') return 'suspended'
  if (source?.code === 'ACCOUNT_BANNED') return 'banned'
  return 'active'
}

export function formatAccountRestrictionTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function getAccountRestrictionView(source: AccountRestrictionSource | null | undefined): AccountRestrictionView {
  const status = resolveStatus(source)
  const restricted = status !== 'active'
  const suspendedUntil = source?.account_suspended_until || source?.suspended_until || null
  const suspendedUntilText = formatAccountRestrictionTime(suspendedUntil)
  const reason = String(source?.account_restriction_reason || source?.reason || '').trim()
  const title = status === 'banned' ? '账户已被封禁' : status === 'suspended' ? '账户已暂停使用' : '账户状态正常'
  const statusText = status === 'banned' ? '永久封禁' : status === 'suspended' ? '暂停使用' : '正常'

  const lines: string[] = []
  if (status === 'suspended' && suspendedUntilText) lines.push(`暂停至：${suspendedUntilText}`)
  if (reason) lines.push(`原因：${reason}`)
  if (restricted) {
    lines.push('')
    lines.push('当前无法进行下单、接单、充值、支付或提现等新的业务操作。')
    lines.push('历史订单、钱包记录和客服功能仍可使用。')
  }
  if (restricted && !lines.some(line => line.startsWith('原因：')) && source?.detail) {
    lines.unshift(String(source.detail).replace(/。?如有疑问请联系客服。?$/, ''))
  }

  const key = [status, suspendedUntil || '', reason || source?.detail || ''].join('|')
  return {
    restricted,
    status,
    title,
    statusText,
    suspendedUntil,
    suspendedUntilText,
    reason,
    content: lines.join('\n'),
    key
  }
}

export function isAccountRestricted(source: AccountRestrictionSource | null | undefined) {
  return getAccountRestrictionView(source).restricted
}

export function showAccountRestrictionModal(
  source: AccountRestrictionSource | null | undefined,
  options: { oncePerSession?: boolean } = {}
) {
  const view = getAccountRestrictionView(source)
  if (!view.restricted) return Promise.resolve(false)

  if (options.oncePerSession && sessionNoticeKeys.has(view.key)) {
    return Promise.resolve(false)
  }

  const now = Date.now()
  if (modalVisible || (lastModalKey === view.key && now - lastModalAt < 1500)) {
    return Promise.resolve(false)
  }

  if (options.oncePerSession) sessionNoticeKeys.add(view.key)
  modalVisible = true
  lastModalKey = view.key
  lastModalAt = now

  return new Promise<boolean>((resolve) => {
    uni.showModal({
      title: view.title,
      content: view.content,
      showCancel: true,
      cancelText: '我知道了',
      confirmText: '联系客服',
      confirmColor: view.status === 'banned' ? '#b13d35' : '#b37816',
      success: (result) => {
        if (result.confirm) {
          uni.navigateTo({ url: '/pages/client/customer-service/index' })
        }
        resolve(true)
      },
      fail: () => resolve(false),
      complete: () => {
        modalVisible = false
      }
    })
  })
}
