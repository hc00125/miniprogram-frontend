import type { BossPackageSpec } from '@/api/boss'
import type { DesignatedPlayerSelection } from '@/utils/designatedPlayer'

export function resolveDesignatedPricingSpec(specs: BossPackageSpec[], players: DesignatedPlayerSelection[]) {
  if (!players.length) return null
  const highestPriority = Math.max(0, ...players.map(item => Number(item.type_priority || 0)))
  if (!highestPriority) return null
  const eligible = specs.filter(spec => Number(spec.required_player_type_priority || 0) === highestPriority)
  return [...eligible].sort((a, b) => {
    const priceDiff = Number(b.price || 0) - Number(a.price || 0)
    if (priceDiff) return priceDiff
    const sortDiff = Number(a.sort_order || 0) - Number(b.sort_order || 0)
    if (sortDiff) return sortDiff
    return Number(a.id || 0) - Number(b.id || 0)
  })[0] || null
}
