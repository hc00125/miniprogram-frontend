import api from '@/utils/request'

export type SupportAudience = 'boss' | 'player'

export interface SupportContact {
  id: number
  name: string
  wechat_id: string
  service_hours: string
  description: string
  audience: 'all' | SupportAudience
  sort_order: number
}

export interface SupportCenterResponse {
  official_customer_service_enabled: boolean
  contacts: SupportContact[]
}

export function getSupportCenter(audience: SupportAudience) {
  return api.get<SupportCenterResponse>('/support/customer-service/', { audience })
}
