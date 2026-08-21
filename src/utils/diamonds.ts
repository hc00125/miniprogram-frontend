export const DIAMONDS_PER_YUAN = 10

/**
 * RMB is the accounting source of truth and is precise to cents.
 * The public exchange ratio stays fixed at ¥1 = 10 diamonds, therefore
 * ¥0.01 = 0.1 diamond and ¥12.35 = 123.5 diamonds exactly.
 */
export function yuanToDiamonds(value: number | string | null | undefined): number {
  const raw = String(value ?? '0').trim()
  const match = raw.match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/)
  if (!match) throw new Error('人民币金额格式不正确')

  const sign = match[1] === '-' ? -1 : 1
  const yuan = Number(match[2])
  const cents = Number((match[3] || '').padEnd(2, '0'))
  if (!Number.isSafeInteger(yuan) || !Number.isSafeInteger(cents)) throw new Error('人民币金额超出范围')

  const totalCents = sign * (yuan * 100 + cents)
  if (!Number.isSafeInteger(totalCents)) throw new Error('人民币金额超出范围')
  return totalCents / 10
}

/** Accept diamond values in exact 0.1-diamond increments. */
export function normalizeDiamonds(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  const diamonds = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(diamonds)) throw new Error('钻石数量格式不正确')

  const tenths = Math.round(diamonds * 10)
  if (!Number.isSafeInteger(tenths) || Math.abs(diamonds * 10 - tenths) > 1e-8) {
    throw new Error('钻石数量最多保留1位小数')
  }
  return tenths / 10
}

export function diamondsFrom(
  diamondValue: unknown,
  yuanFallback: number | string | null | undefined = 0
): number {
  if (diamondValue !== null && diamondValue !== undefined && diamondValue !== '') {
    return normalizeDiamonds(diamondValue)
  }
  return yuanToDiamonds(yuanFallback)
}

export function formatDiamonds(value: unknown): string {
  return normalizeDiamonds(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  })
}

export function diamondText(value: unknown): string {
  return `💎${formatDiamonds(value)}`
}

/** 仅充值/微信收银台实付说明使用人民币。 */
export function formatYuan(value: number | string | null | undefined): string {
  return Number(value || 0).toFixed(2)
}
