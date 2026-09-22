/** Instance-local draft, never a payment attempt. sessionKey is a non-secret
 * login generation supplied by the host (must change even for same-user login).
 * No storage, authentication mutations, commission or currency calculations. */
export function createSurchargeIntent() {
  let generation = 0
  let account = '', session = '', order = ''
  let people = 0
  let amount: number | null = null
  const close = () => {
    account = ''; session = ''; order = ''; people = 0; amount = null; generation += 1
  }
  return {
    open(accountId: string, sessionKey: string, orderNo: string, playerCount: number) {
      close()
      if (!accountId || !sessionKey || !orderNo.trim() || !Number.isSafeInteger(playerCount) || playerCount < 1) return
      account = accountId; session = sessionKey; order = orderNo; people = playerCount
    },
    close,
    syncSession(accountId: string, sessionKey: string) { if (account !== accountId || session !== sessionKey) close() },
    setAmount(value: string) {
      generation += 1
      amount = null
      if (!account || !session || !order || typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return false
      const parsed = Number(value)
      if (!Number.isSafeInteger(parsed)) return false
      amount = parsed
      return true
    },
    rechargeReturned() { generation += 1 },
    stamp() { return generation },
    accepts(stamp: number) { return Boolean(account && session && order) && stamp === generation },
    snapshot() {
      return { account_id: account, session_key: session, order_no: order, player_count: people,
        amount_diamonds: amount, needs_confirmation: true as const }
    }
  }
}
