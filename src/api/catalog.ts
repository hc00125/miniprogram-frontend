import api from '@/utils/request'

export interface CatalogGroup {
  id: number
  name: string
  sort_order: number
}

export interface GameService {
  id: number
  name: string
  code: string
  icon_url: string
  sort_order: number
  groups: CatalogGroup[]
}

export interface CatalogNavigation {
  games: GameService[]
}

function isTestEntry(name: string) {
  const value = String(name || '').trim().toLowerCase()
  return !value || value.startsWith('test') || value.startsWith('group_')
}

export function getCatalogNavigation() {
  return api.get<CatalogNavigation>('/boss/catalog-navigation').then(payload => ({
    games: (payload.games || [])
      .filter(game => !isTestEntry(game.name))
      .map(game => ({
        ...game,
        icon_url: String(game.icon_url || ''),
        groups: (game.groups || [])
          .filter(group => !isTestEntry(group.name))
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || a.id - b.id)
      }))
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || a.id - b.id)
  }))
}
