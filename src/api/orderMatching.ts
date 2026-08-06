import api from '@/utils/request'

export interface OrderMatchingState {
  active: boolean
  started_at?: string
  deadline_at?: string
  elapsed_seconds?: number
  remaining_seconds?: number
  reminder_due?: boolean
  players_can_exit_without_penalty?: boolean
  decision_required?: boolean
  extension_count?: number
  current_players?: number
  required_players?: number
  missing_slots?: number
}

export function continueOrderMatching(orderNo: string) {
  return api.post<{ message: string; matching: OrderMatchingState }>(`/boss/order/${orderNo}/matching/continue`)
}
