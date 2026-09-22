import { commerceRequest, integer } from '@/api/giftCommerce'
export interface SurchargePayment { surcharge_no:string;payment_status:string;amount_diamonds:number;refunded_diamonds:number;blockers:string[] }
function parse(d:any):SurchargePayment {
  if(!d || typeof d.surcharge_no!=='string' || !d.surcharge_no || !['created','processing','unknown','paid','failed','cancelled','partially_refunded','refunded'].includes(d.payment_status)
    || !integer(d.amount_diamonds,1) || !integer(d.refunded_diamonds) || d.refunded_diamonds>d.amount_diamonds || !Array.isArray(d.blockers) || !d.blockers.every((x:unknown)=>typeof x==='string'))throw new Error('加价交易格式无效')
  return d
}
function root(order:string){if(!order || typeof order!=='string')throw new Error('原订单号缺失');return `/boss/orders/${encodeURIComponent(order)}/surcharge/`}
export function readSurchargePayment(order:string,no:string){if(!no)throw new Error('原加价单号缺失');return commerceRequest(`${root(order)}${encodeURIComponent(no)}/`,'GET',{},parse)}
export function readSurchargeByKey(order:string,key:string){if(!key || key.length>100)throw new Error('原加价键缺失');return commerceRequest(`${root(order)}by-key/?idempotency_key=${encodeURIComponent(key)}`,'GET',{},parse)}
// No POST export: v1 lacks a spendable-balance quote, allocation and refund completion.
