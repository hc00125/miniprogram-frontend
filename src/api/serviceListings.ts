import api from '@/utils/request'

export interface SharedServiceSpec {
  id: number
  package_id: number
  package_name: string
  package_description: string
  package_cover_url: string
  name: string
  display_name: string
  description: string
  price: number
  required_player_type_id?: number | null
  required_player_type_name?: string
  requires_escort_qualification?: boolean
  sort_order?: number
}

export interface PlayerServiceListing {
  id: number
  status: 'pending' | 'approved' | 'rejected' | 'offline'
  status_text: string
  is_available: boolean
  custom_description: string
  sort_order: number
  rejection_reason?: string
  reviewed_at?: string | null
  created_at: string
  updated_at: string
  spec: SharedServiceSpec
}

export interface PlayerServiceListingResult {
  auto_approval_enabled: boolean
  listings: PlayerServiceListing[]
  available_specs: SharedServiceSpec[]
}

export function getPlayerServiceListings() {
  return api.get<PlayerServiceListingResult>('/player/service-listings')
}

export function createPlayerServiceListing(specId: number, customDescription = '') {
  return api.post<{ message: string; listing: PlayerServiceListing }>('/player/service-listings', {
    spec_id: specId,
    custom_description: customDescription
  })
}

export function updatePlayerServiceListing(
  listingId: number,
  payload: {
    action?: 'offline' | 'restore' | 'resubmit'
    is_available?: boolean
    custom_description?: string
    sort_order?: number
  }
) {
  return api.patch<{ message: string; listing: PlayerServiceListing }>(`/player/service-listings/${listingId}`, payload)
}

export function createSharedListingOrder(payload: Record<string, any> & { listing_id: number }) {
  return api.post<{ order_no: string; status: string; total_price: number; message: string }>('/boss/listing-order', payload)
}
