import type { GiftCatalogItem, GiftRecipient } from '@/api/gifts'

type SelectedGift = Pick<GiftCatalogItem, 'code' | 'name' | 'price_diamonds'>
/** Ephemeral, instance-local selection only. No storage, wallet or transaction ID.
 * A future payment adapter must obtain server quote + idempotency key separately. */
export function createGiftIntent() {
  let generation = 0
  let account = ''
  let recipient: GiftRecipient | null = null
  let gift: SelectedGift | null = null
  let quantity = 1
  let maxQuantity = 1
  let needsConfirmation = true
  const invalidate = () => { generation += 1; needsConfirmation = true }
  const close = () => {
    account = ''; recipient = null; gift = null; quantity = 1; maxQuantity = 1
    invalidate()
  }
  return {
    open(accountId: string, target: GiftRecipient) {
      close()
      if (!accountId || !target.id) return
      account = accountId; recipient = { ...target }
    },
    close,
    syncAccount(accountId: string) { if (accountId !== account) close() },
    select(item: SelectedGift, limit: number) {
      if (!account || !recipient || !item.code || !Number.isSafeInteger(item.price_diamonds)
        || item.price_diamonds <= 0 || !Number.isSafeInteger(limit) || limit < 1) return false
      gift = { code: item.code, name: item.name, price_diamonds: item.price_diamonds }
      maxQuantity = Math.min(limit, Math.floor(Number.MAX_SAFE_INTEGER / item.price_diamonds))
      quantity = 1; invalidate(); return true
    },
    clearSelection() { gift = null; quantity = 1; maxQuantity = 1; invalidate() },
    setQuantity(value: number) {
      if (!gift || !Number.isSafeInteger(value) || value < 1 || value > maxQuantity) return false
      quantity = value; invalidate(); return true
    },
    rechargeReturned() { invalidate() },
    stamp() { return generation },
    accepts(stamp: number) { return Boolean(account && recipient) && stamp === generation },
    snapshot() {
      return { account_id: account, recipient: recipient ? { ...recipient } : null,
        gift: gift ? { ...gift } : null, quantity, max_quantity: maxQuantity,
        total_diamonds: gift ? gift.price_diamonds * quantity : 0, needs_confirmation: needsConfirmation }
    }
  }
}
