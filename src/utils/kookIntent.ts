// This is navigation context, never an authorization to accept/grab an order.
export function parseKookIntent(value: unknown): string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{16,100}$/.test(value) ? value : ''
}
export function interpretEntry(data: any) {
  const blocked = { state: 'forbidden', orderNo: '', message: '该通知暂不可查看，请以大厅当前订单为准' }
  if (!data || data.safe_target !== 'pages/player/grab/index') return blocked
  if (data.state === 'expired' || (data.expires_at && Date.parse(data.expires_at) <= Date.now())) return { state: 'expired', orderNo: '', message: '通知链接已过期，请查看大厅最新订单' }
  if (data.state === 'forbidden') return blocked
  if (!['available', 'invited', 'joined', 'closed'].includes(data.state) || !Number.isFinite(Date.parse(data.expires_at))) return blocked
  if (data.state === 'closed') return { state: 'closed', orderNo: '', message: '该订单已不可接，请查看其他订单' }
  if (typeof data.order_no !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(data.order_no)) return blocked
  return { state: data.state as string, orderNo: data.order_no as string, message: data.state === 'joined' ? '你已加入该订单，请到我的订单查看' : data.state === 'invited' ? '请在下方本人邀请中核对并手动接受' : '请在大厅核对当前可接名额后手动接单' }
}
