export const DIAMONDS_PER_YUAN = 10

/**
 * Legacy API fallback only. New APIs should return integer diamond fields.
 * The conversion parses decimal text into integer cents first, avoiding direct
 * binary floating-point multiplication for user-facing diamond values.
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
  if (!Number.isSafeInteger(totalCents) || totalCents % 10 !== 0) {
    throw new Error('该金额会产生小数钻石')
  }
  return totalCents / 10
}

export function normalizeDiamonds(value: unknown): number {
  const diamonds = typeof value === 'number' ? value : Number(value ?? 0)
  if (!Number.isSafeInteger(diamonds)) throw new Error('钻石数量必须为整数')
  return diamonds
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
  return normalizeDiamonds(value).toLocaleString('zh-CN')
}

export function diamondText(value: unknown): string {
  return `💎${formatDiamonds(value)}`
}

/** 仅充值/微信收银台实付说明使用人民币。 */
export function formatYuan(value: number | string | null | undefined): string {
  return Number(value || 0).toFixed(2)
}
