import api from '@/utils/request'

export interface HistoryClaim {
  id: number
  customer_id: number
  status: 'pending' | 'approved' | 'rejected'
  message: string
  created_at: string
  reviewed_at?: string | null
}
export interface HistoryClaims {
  customer: { id: number; nickname: string } | null
  claims: HistoryClaim[]
}
export const getHistoryOrder = (orderNo: string) => api.get<any>(`/boss/order/${encodeURIComponent(orderNo)}`)
export const getHistoryClaims = () => api.get<HistoryClaims>('/client/history-claims/')
export const submitHistoryClaim = (data: { customer_id: number; message: string }) => api.post<HistoryClaim>('/client/history-claims/', data)
