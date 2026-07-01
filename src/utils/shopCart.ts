import api from '@/utils/request'
import type { BossPackage, BossPackageSpec } from '@/api/boss'

export interface ShopCartItem {
  id: number | string
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
  created_at?: string
  updated_at?: string
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

export interface AddShopCartRequest {
  package_id: number
  spec_id?: string | number | null
  spec_name?: string
  spec_display_name?: string
  price: number
  quantity?: number
  image_url?: string
  description?: string
}

function normalizeQuantity(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.min(99, Math.floor(value)))
}

export async function getShopCart(): Promise<ShopCartItem[]> {
  return api.get<ShopCartItem[]>('/boss/cart')
}

export async function getShopCartCount() {
  const items = await getShopCart()
  return items.reduce((sum, item) => sum + normalizeQuantity(Number(item.quantity || 1)), 0)
}

export async function addShopCartItem(payload: AddShopCartPayload) {
  const product = payload.product
  const spec = payload.spec || null
  const body: AddShopCartRequest = {
    package_id: product.id,
    spec_id: spec?.id ?? null,
    spec_name: spec?.name,
    spec_display_name: payload.spec_display_name || spec?.name,
    price: Number(payload.price || product.base_price || 0),
    quantity: normalizeQuantity(payload.quantity || 1),
    image_url: payload.image_url,
    description: payload.description || product.description
  }
  return api.post<ShopCartItem>('/boss/cart', body)
}

export async function updateShopCartItemQuantity(id: string | number, quantity: number) {
  await api.put<ShopCartItem>(`/boss/cart/${id}`, { quantity: normalizeQuantity(quantity) })
  return getShopCart()
}

export async function removeShopCartItem(id: string | number) {
  await api.delete<{ message: string }>(`/boss/cart/${id}`)
  return getShopCart()
}

export async function clearShopCart() {
  await api.delete<{ message: string }>('/boss/cart/clear')
  return [] as ShopCartItem[]
}
