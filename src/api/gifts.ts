import { BASE_URL } from '@/utils/request'

export interface GiftCatalogItem {
  code: string
  name: string
  image_url: string
  price_diamonds: number
  description: string
}
export interface GiftCatalogPage {
  count: number
  next: string | null
  previous: string | null
  results: GiftCatalogItem[]
}
export interface GiftCapabilities {
  purchase_enabled: boolean
  inventory_send_enabled: boolean
}
export interface GiftRecipient { id: string; name: string }
export interface GiftInventoryItem extends GiftCatalogItem { available_quantity: number }

/** Proposed public, anonymous catalog contract. request.ts returns raw JSON,
 * not {data: ...}; its unknown-prefix admin-token fallback must not be used here.
 * No production caller until backend deployment/contract is verified. */
export function getGiftCatalog(page = 1): Promise<GiftCatalogPage> {
  if (!Number.isSafeInteger(page) || page < 1) return Promise.reject(new Error('目录页码无效'))
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}/gifts/catalog/`, method: 'GET', data: { page }, header: {},
      success: res => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject({ statusCode: res.statusCode, detail: '礼物目录暂不可用' })
          return
        }
        try { resolve(parseGiftCatalog(res.data)) } catch (error) { reject(error) }
      },
      fail: reject
    })
  })
}

export function parseGiftCatalog(value: unknown): GiftCatalogPage {
  const data = value as GiftCatalogPage
  if (!data || !Number.isSafeInteger(data.count) || data.count < 0 || !Array.isArray(data.results)
    || !(data.next === null || typeof data.next === 'string')
    || !(data.previous === null || typeof data.previous === 'string')) throw new Error('礼物目录格式无效')
  const codes = new Set<string>()
  const results = data.results.map(item => {
    if (!item || typeof item.code !== 'string' || !item.code.trim() || codes.has(item.code)
      || typeof item.name !== 'string' || !item.name.trim() || typeof item.image_url !== 'string'
      || typeof item.description !== 'string' || !Number.isSafeInteger(item.price_diamonds)
      || item.price_diamonds <= 0) throw new Error('礼物目录格式无效')
    codes.add(item.code)
    return { code: item.code, name: item.name, image_url: item.image_url,
      price_diamonds: item.price_diamonds, description: item.description }
  })
  return { count: data.count, next: data.next, previous: data.previous, results }
}

/** No deployed capability endpoint yet: deliberately no network request.
 * These flags are UI information, NEVER service-side authorization. */
export async function getGiftCapabilities(): Promise<GiftCapabilities> {
  return { purchase_enabled: false, inventory_send_enabled: false }
}
