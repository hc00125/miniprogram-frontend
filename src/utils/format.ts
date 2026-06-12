export function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  return [hours, minutes, seconds].map(n => String(n).padStart(2, '0')).join(':')
}

export function formatHours(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)}分钟`
  const whole = Math.floor(hours)
  const half = hours - whole
  if (half === 0) return `${whole}小时`
  return `${whole}小时${Math.round(half * 60)}分`
}

export function formatDateTime(input: string) {
  if (!input) return '-'
  const date = new Date(input)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}
