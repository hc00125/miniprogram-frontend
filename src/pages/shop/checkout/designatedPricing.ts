import type { BossPackageSpec } from '@/api/boss'
import type { DesignatedPlayerSelection } from '@/utils/designatedPlayer'

export interface DesignatedPricingLine {
  player_id: number
  player_name: string
  actual_type_name: string
  minimum_billing_type_name: string
  effective_billing_type_name: string
  unit_price: number
}

export interface DesignatedPricingResult {
  base_unit_price: number
  public_slots: number
  total: number
  lines: DesignatedPricingLine[]
  missing_billing_players: string[]
  incompatible_players: string[]
}

function roundMoney(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100
}

export function calculateDesignatedPricing(
  specs: BossPackageSpec[],
  players: DesignatedPlayerSelection[],
  selectedSpec: BossPackageSpec | null,
  requiredPlayers: number
): DesignatedPricingResult | null {
  const count = Math.max(1, Number(requiredPlayers || 1))
  if (!selectedSpec?.required_player_type_id) return null

  const baseUnit = Number(selectedSpec.price || 0) / count
  const basePriority = Number(selectedSpec.required_player_type_priority || 0)
  const specsByType = new Map<number, BossPackageSpec>()
  for (const spec of specs) {
    const typeId = Number(spec.required_player_type_id || 0)
    if (!typeId) continue
    const current = specsByType.get(typeId)
    if (!current || Number(spec.price || 0) > Number(current.price || 0)) specsByType.set(typeId, spec)
  }

  const lines: DesignatedPricingLine[] = []
  const missingBillingPlayers: string[] = []
  const incompatiblePlayers: string[] = []
  let total = baseUnit * Math.max(0, count - players.length)

  for (const player of players) {
    const actualPriority = Number(player.type_priority || 0)
    if (actualPriority < basePriority) incompatiblePlayers.push(player.name)

    const billingTypeId = Number(player.designated_billing_type_id || player.type_id || 0)
    const billingSpec = specsByType.get(billingTypeId)
    if (!billingSpec) {
      missingBillingPlayers.push(player.name)
      continue
    }

    const billingUnit = Number(billingSpec.price || 0) / count
    const useDesignatedBilling = billingUnit > baseUnit
    const effectiveUnit = Math.max(baseUnit, billingUnit)
    total += effectiveUnit
    lines.push({
      player_id: player.id,
      player_name: player.name,
      actual_type_name: player.type_name,
      minimum_billing_type_name: player.designated_billing_type_name || player.type_name,
      effective_billing_type_name: useDesignatedBilling
        ? (player.designated_billing_type_name || player.type_name)
        : (selectedSpec.required_player_type_name || '基础规格'),
      unit_price: roundMoney(effectiveUnit)
    })
  }

  return {
    base_unit_price: roundMoney(baseUnit),
    public_slots: Math.max(0, count - players.length),
    total: roundMoney(total),
    lines,
    missing_billing_players: missingBillingPlayers,
    incompatible_players: incompatiblePlayers
  }
}
