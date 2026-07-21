import api from '@/utils/request'
import type { BossPackage, BossPackageSpec } from '@/api/boss'
import { isHourlyService, normalizeServiceHours } from '@/utils/serviceBilling'

export interface ShopCartItem {
  id: number | string
  package_id: number
  package_name: string
  group_name?: string | null
  product_type?: string
  image_url?: string
  description?: string
  spec_id?: string | number | null
  spec_id_snapshot?: string | number | null
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

export async function getShopCart(): Promise<ShopCartItem[]> {
  return api.get<ShopCartItem[]>('/boss/cart')
}

export async function getShopCartCount() {
  const items = await getShopCart()
  return items.length
}

export async function addShopCartItem(payload: AddShopCartPayload) {
  const product = payload.product
  const spec = payload.spec || null
  const quantity = isHourlyService(product) ? normalizeServiceHours(payload.quantity || 1) : 1
  const body: AddShopCartRequest = {
    package_id: product.id,
    spec_id: spec ? spec.id : null,
    spec_name: spec ? spec.name : undefined,
    spec_display_name: payload.spec_display_name || (spec ? spec.name : undefined),
    price: Number(payload.price || product.base_price || 0),
    quantity,
    image_url: payload.image_url,
    description: payload.description || product.description
  }
  return api.post<ShopCartItem>('/boss/cart', body)
}

export async function updateShopCartItemQuantity(id: string | number, quantity: number) {
  await api.put<ShopCartItem>(`/boss/cart/${id}`, { quantity: normalizeServiceHours(quantity) })
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
