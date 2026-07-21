export const MAX_SERVICE_HOURS = 24

type ServiceBillingTarget = {
  product_type?: string | null
  name?: string | null
  package_name?: string | null
}

export function isHourlyService(target?: ServiceBillingTarget | null) {
  if (!target) return false
  const name = String(target.name || target.package_name || '')
  return target.product_type !== 'guarantee' && !name.includes('保底')
}

export function normalizeServiceHours(value: unknown) {
  const parsed = Math.floor(Number(value || 1))
  if (!Number.isFinite(parsed)) return 1
  return Math.max(1, Math.min(MAX_SERVICE_HOURS, parsed))
}
