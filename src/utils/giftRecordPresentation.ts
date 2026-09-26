import { earningLabel, paymentLabel, type Purchase, type Transfer, type Lot, type Earning } from '@/api/giftCommerce'
import { formatDateTime } from '@/utils/format'

const statusLabels: Record<string, string> = {
  created: '待送出', processing: '赠送处理中', unknown: '结果待确认',
  delivered: '已送达', failed: '未送达', reversed: '已撤销', cancelled: '已取消',
}
function name(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}
function displayTime(value: unknown) {
  const timestamp = typeof value === 'string' ? value.replace(/(\.\d{3})\d+(?=[Z+-])/, '$1') : ''
  return timestamp && Number.isFinite(Date.parse(timestamp)) ? formatDateTime(timestamp) : '时间暂不可用'
}
function image(value: unknown) {
  return typeof value === 'string' && /^https?:\/\//.test(value) ? value : ''
}

export function giftInventoryCard(record: Lot) {
  return {
    id: String(record.lot_id), title: name(record.name, '礼物'), image: image(record.image_url),
    lines: [`剩余 ${record.remaining} 件 · 可赠送 ${record.available} 件`,
      `状态：${({active:'有效',frozen:'已冻结',revoked:'已撤销'} as Record<string,string>)[record.status] || '状态待确认'}`,
      `获得时间：${displayTime(record.created_at)}`],
    reference: `批次 ${record.lot_id}`,
  }
}
export function giftEarningCard(record: Earning) {
  const confirmed = record.monetary_accrual && record.currency === 'fish' && record.wallet_destination === 'player_wallet'
  const states: Record<string,string> = {pending:'待处理',frozen:'已冻结',available:confirmed?'已入账':'待核对',reversed:'已撤销'}
  const reasons: Record<string,string> = {ACCRUAL_BASIS_UNCONFIRMED:'收益计算依据尚未确认',FEATURE_DISABLED:'该功能暂未开放',POLICY_UNCONFIRMED:'结算规则待确认'}
  const lines = [`赠送人：${name(record.sender_name,'昵称暂不可用')}`,
    !record.monetary_accrual ? '待计提（尚未形成可提现收益）' : record.earnings_eligible === false ? '此礼物不产生收益' : confirmed ? earningLabel(record) : '历史收益请以钱包记录为准',
    `状态：${states[record.status] || '状态待确认'}`]
  if (confirmed && record.credited_at) lines.push(`入账时间：${displayTime(record.credited_at)}`)
  else if (confirmed) lines.push('入账时间：暂无时间记录')
  if (Array.isArray(record.blockers)) lines.push(...[...new Set(record.blockers.map(code=>reasons[code] || '收益暂不可用，请联系客服核对'))])
  return {id:String(record.id),title:`${name(record.gift_name,'礼物')}${record.quantity ? ` × ${record.quantity}` : ''}`,
    image:image(record.image_url),lines,reference:`收益编号：${record.id}`}
}

export function giftPurchaseCard(record: Purchase) {
  const lines = [`金额：${record.amount_diamonds} 钻石`, `状态：${paymentLabel(record.payment_status, record.amount_diamonds)}`,
    `购买方式：${record.mode === 'direct' ? '直接赠送' : record.mode === 'inventory' ? '买入背包' : '待核对'}`]
  if (record.mode === 'direct') lines.push(`收礼人：${name(record.recipient_name, '昵称暂不可用')}`)
  lines.push(`购买时间：${displayTime(record.created_at)}`)
  if (record.blockers?.length) lines.push('本笔交易需核对，请联系客服，勿重复支付')
  return {id:record.purchase_no, title:`${name(record.gift_name,'礼物')}${record.quantity ? ` × ${record.quantity}` : ''}`,
    image:image(record.image_url), lines, reference:`交易编号：${record.purchase_no}`}
}

export function giftTransferCard(record: Transfer) {
  const time = displayTime(record.created_at)
  return {
    id: record.transfer_no, image: image(record.image_url),
    title: `${name(record.gift_name, '礼物')} × ${record.quantity}`,
    lines: [
      `赠送人：${name(record.sender_name, '昵称暂不可用')}`,
      `收礼人：${name(record.recipient_name, '昵称暂不可用')}`,
      `状态：${statusLabels[record.status] || '状态待确认'}`,
      `时间：${time}`,
    ],
    reference: `记录编号：${record.transfer_no}`,
  }
}
