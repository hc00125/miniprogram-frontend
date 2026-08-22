import api from '@/utils/request'

export type GrowthRecordType = 'order' | 'refund' | 'manual' | 'backfill' | string

export interface GrowthRecordItem {
  id: number
  source_type: GrowthRecordType
  source_type_text: string
  amount_yuan: string
  amount_diamonds: number
  balance_after_yuan: string
  balance_after_diamonds: number
  order_no: string
  reference_id: string
  reason: string
  created_at: string
}

export interface GrowthRecordListResult {
  count: number
  page: number
  page_size: number
  diamonds_per_yuan: number
  growth_diamonds: number
  results: GrowthRecordItem[]
}

export function getGrowthRecords(page = 1, pageSize = 20) {
  return api.get<GrowthRecordListResult>('/client/consumption-records', {
    page,
    page_size: pageSize
  })
}
