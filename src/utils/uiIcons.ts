// Local publicDir assets; SVG masters live in design/icons (not shipped).
export const uiIcons = {
  order: '/icons/duotone/order.png',
  query: '/icons/duotone/query.png',
  grab: '/icons/duotone/grab.png',
  reviews: '/icons/duotone/reviews.png',
  apply: '/icons/duotone/apply.png',
  notification: '/icons/duotone/notification.png',
  terms: '/icons/duotone/terms.png',
  support: '/icons/duotone/support.png',
  feedback: '/icons/duotone/feedback.png',
  settings: '/icons/duotone/settings.png',
  guest: '/icons/duotone/guest.png',
  chevron: '/icons/duotone/chevron.png',
  fish: '/icons/duotone/fish.png',
  shield: '/icons/duotone/shield.png',
  microphone: '/icons/duotone/microphone.png',
  cart: '/icons/duotone/cart.png',
  home: '/icons/duotone/home.png',
  back: '/icons/duotone/back.png',
  clock: '/icons/duotone/clock.png',
  verification: '/icons/duotone/verification.png',
  payment: '/icons/duotone/payment.png',
  diamond: '/icons/duotone/diamond.png',
  diamondLight: '/icons/duotone/diamond-light.png',
  income: '/icons/duotone/income.png',
  incomeRed: '/icons/duotone/income-red.png',
  expense: '/icons/duotone/expense.png',
  expenseRed: '/icons/duotone/expense-red.png',
  refund: '/icons/duotone/refund.png',
  refundRed: '/icons/duotone/refund-red.png',
  adjustment: '/icons/duotone/adjustment.png',
  adjustmentRed: '/icons/duotone/adjustment-red.png',
  backfill: '/icons/duotone/backfill.png',
  backfillRed: '/icons/duotone/backfill-red.png',
  room: '/icons/duotone/room.png',
  feedbackLight: '/icons/duotone/feedback-light.png',
  warningLight: '/icons/duotone/warning-light.png',
} as const

// Presentation only: type selects the glyph; original page sign predicates select tone.
export function walletRecordIcon(type: string, income: boolean) {
  const key = ({ recharge: 'income', order_payment: 'expense', refund_in: 'refund', admin_adjust: 'adjustment' } as Record<string, string>)[type] || 'adjustment'
  return uiIcons[(income ? key : `${key}Red`) as keyof typeof uiIcons]
}
export function growthRecordIcon(type: string, nonnegative: boolean) {
  const key = ({ order: 'income', refund: 'refund', manual: 'adjustment', backfill: 'backfill' } as Record<string, string>)[type] || 'adjustment'
  return uiIcons[(nonnegative ? key : `${key}Red`) as keyof typeof uiIcons]
}
