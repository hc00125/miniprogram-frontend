export function formatPlayerName(name?: string) {
  return name || '-'
}

export function joinByComma(items: Array<string | undefined | null>) {
  return items.filter(Boolean).join('，')
}
