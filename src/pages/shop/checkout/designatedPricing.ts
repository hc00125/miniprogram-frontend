import type { BossPackageSpec } from '@/api/boss'
import type { DesignatedPlayerSelection } from '@/utils/designatedPlayer'

export function isSameDesignatedType(players: DesignatedPlayerSelection[]) {
  if (!players.length) return true
  const typeId = Number(players[0]?.type_id || 0)
  return typeId > 0 && players.every(item => Number(item.type_id || 0) === typeId)
}

export function resolveDesignatedPricingSpec(specs: BossPackageSpec[], players: DesignatedPlayerSelection[]) {
  if (!players.length || !isSameDesignatedType(players)) return null
  const highestPriority = Math.max(0, ...players.map(item => Number(item.type_priority || 0)))
  const eligible = specs.filter(spec => {
    const priority = Number(spec.required_player_type_priority || 0)
    return Boolean(spec.required_player_type_id) && priority > 0 && priority <= highestPriority
  })
  return [...eligible].sort((a, b) => {
    const priorityDiff = Number(b.required_player_type_priority || 0) - Number(a.required_player_type_priority || 0)
    if (priorityDiff) return priorityDiff
    const priceDiff = Number(b.price || 0) - Number(a.price || 0)
    if (priceDiff) return priceDiff
    return Number(a.sort_order || 0) - Number(b.sort_order || 0)
  })[0] || null
}
