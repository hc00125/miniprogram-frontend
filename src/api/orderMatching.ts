import api from '@/utils/request'

export interface MatchingRequiredPlayerType {
  id: number
  name: string
  priority: number
  count: number
}

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
  public_slots?: number
  pending_designation_slots?: number
  typed_slots?: number
  required_player_types?: MatchingRequiredPlayerType[]
  requires_escort_qualification?: boolean
  online_player_count?: number
  eligible_online_player_count?: number
  visibility_status?: 'visible' | 'no_online_players' | 'no_eligible_players' | string
  visibility_message?: string
}

export function continueOrderMatching(orderNo: string) {
  return api.post<{ message: string; matching: OrderMatchingState }>(`/boss/order/${orderNo}/matching/continue`)
}
