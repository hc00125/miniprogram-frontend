import type { BossPackage, BossPackageSpec } from '@/api/boss'

const CART_KEY = 'shop_cart'
const MAX_CART_QUANTITY = 99

export interface ShopCartItem {
  id: string
  package_id: number
  package_name: string
  group_name?: string | null
  product_type?: string
  image_url?: string
  description?: string
  spec_id?: string | number | null
  spec_name?: string
  spec_display_name?: string
  price: number
  quantity: number
  added_at: number
  updated_at: number
}

export interface AddShopCartPayload {
  product: BossPackage
  spec?: BossPackageSpec | null
  spec_display_name?: string
  image_url?: string
  price: number
  description?: string
  quantity?: number
}

function makeCartItemId(packageId: number, specId?: string | number | null) {
  return `${packageId}:${specId === undefined || specId === null || specId === '' ? 'default' : String(specId)}`
}

function normalizeQuantity(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.min(MAX_CART_QUANTITY, Math.floor(value)))
}

export function getShopCart(): ShopCartItem[] {
  const value = uni.getStorageSync(CART_KEY)
  return Array.isArray(value) ? value : []
}

export function saveShopCart(items: ShopCartItem[]) {
  uni.setStorageSync(CART_KEY, items)
}

export function getShopCartCount() {
  return getShopCart().reduce((sum, item) => sum + normalizeQuantity(Number(item.quantity || 1)), 0)
}

export function addShopCartItem(payload: AddShopCartPayload) {
  const product = payload.product
  const spec = payload.spec || null
  const quantity = normalizeQuantity(payload.quantity || 1)
  const now = Date.now()
  const id = makeCartItemId(product.id, spec?.id)
  const items = getShopCart()
  const current = items.find(item => item.id === id)

  if (current) {
    current.quantity = normalizeQuantity(current.quantity + quantity)
    current.price = Number(payload.price || current.price || 0)
    current.image_url = payload.image_url || current.image_url
    current.description = payload.description || current.description
    current.spec_name = spec?.name || current.spec_name
    current.spec_display_name = payload.spec_display_name || current.spec_display_name
    current.updated_at = now
    saveShopCart(items)
    return current
  }

  const item: ShopCartItem = {
    id,
    package_id: product.id,
    package_name: product.name,
    group_name: product.group_name,
    product_type: product.product_type,
    image_url: payload.image_url,
    description: payload.description || product.description,
    spec_id: spec?.id ?? null,
    spec_name: spec?.name,
    spec_display_name: payload.spec_display_name || spec?.name,
    price: Number(payload.price || product.base_price || 0),
    quantity,
    added_at: now,
    updated_at: now
  }
  items.unshift(item)
  saveShopCart(items)
  return item
}

export function updateShopCartItemQuantity(id: string, quantity: number) {
  const nextQuantity = normalizeQuantity(quantity)
  const items = getShopCart().map(item => item.id === id ? { ...item, quantity: nextQuantity, updated_at: Date.now() } : item)
  saveShopCart(items)
  return items
}

export function removeShopCartItem(id: string) {
  const items = getShopCart().filter(item => item.id !== id)
  saveShopCart(items)
  return items
}

export function clearShopCart() {
  saveShopCart([])
}
