<template>
  <view class="checkout-page">
    <view class="checkout-scroll">
      <view v-if="isCartCheckout" class="card">
        <view class="head"><text class="title">购物车批量下单</text><text class="pill">{{ cartOrderCount }}单</text></view>
        <view v-for="item in cartItems" :key="item.id" class="row player">
          <view class="grow">
            <text>{{ item.package_name }} · {{ item.spec_display_name || item.spec_name || '默认规格' }}</text>
            <text class="muted">数量 {{ quantity(item.quantity) }}，将发布 {{ quantity(item.quantity) }} 个独立订单</text>
          </view>
          <text class="price">¥{{ money(itemAmount(item)) }}</text>
        </view>
      </view>

      <view v-else-if="product" class="card product">
        <image :src="productImage" mode="aspectFill" />
        <view class="grow">
          <view class="head"><text class="title">{{ product.name }}</text><text class="pill">需{{ requiredPlayers }}人</text></view>
          <text class="sub">{{ selectedSpec?.name || product.description || '精选陪玩服务' }}</text>
          <text class="price">¥{{ money(basePrice) }}/单</text>
        </view>
      </view>

      <view v-if="designatedPlayers.length" class="card">
        <view class="head">
          <view class="grow"><text class="title">已指定 {{ designatedPlayers.length }}/{{ requiredPlayers }}人</text><text class="sub">按指定阵容最高等级自动匹配规格和整单价格</text></view>
          <button size="mini" @tap="clearAllDesignations">取消全部</button>
        </view>
        <view class="players">
          <view v-for="item in designatedPlayers" :key="item.id" class="player">
            <image v-if="item.avatar_url" class="avatar" :src="item.avatar_url" mode="aspectFill" />
            <view v-else class="avatar avatar-empty">{{ item.name?.[0] || '陪' }}</view>
            <view class="grow"><text>{{ item.name }}</text><text class="muted">{{ item.type_name }}</text></view>
            <text class="pill">按{{ item.type_name }}价</text>
            <button size="mini" @tap="removeDesignation(item.id)">移除</button>
          </view>
        </view>
      </view>

      <view v-if="!isCartCheckout && product && visibleSpecs.length" class="card">
        <view class="head"><view><text class="title">选择规格</text><text class="sub">{{ designatedPlayers.length ? '指定后由系统锁定最高等级计价规格' : '商品固定人数，规格决定等级与整单价' }}</text></view><text class="pill">{{ visibleSpecs.length }}档</text></view>
        <view class="specs">
          <view v-for="spec in visibleSpecs" :key="spec.id" class="spec" :class="{ active: selectedSpec?.id === spec.id }" @tap="chooseSpec(spec)">
            <text>{{ spec.name }}</text>
            <text class="muted">{{ spec.required_player_type_name ? `${spec.required_player_type_name}及以上` : '不限等级' }}</text>
            <text class="spec-price">¥{{ money(Number(spec.price)) }}</text>
          </view>
        </view>
      </view>

      <view v-if="hasData" class="rule" :class="{ blocked: Boolean(blockReason) }">
        <text>{{ blockReason ? '!' : '✓' }}</text><text class="grow">{{ blockReason || readyText }}</text>
      </view>

      <view v-if="hasData" class="card fields">
        <text class="title">下单信息</text>
        <view>
          <text class="field-label">联系昵称</text>
          <input
            v-model="form.contact"
            class="input"
            placeholder="请输入联系昵称"
            always-embed
            :cursor-spacing="24"
            confirm-type="next"
            @focus="handleFieldFocus"
            @blur="handleFieldBlur"
          />
        </view>
        <view>
          <text class="field-label">游戏ID / 队伍码</text>
          <input
            v-model="form.gameId"
            class="input"
            placeholder="请输入游戏ID或队伍码"
            always-embed
            :cursor-spacing="24"
            confirm-type="done"
            @focus="handleFieldFocus"
            @blur="handleFieldBlur"
          />
        </view>
        <view>
          <text class="field-label">订单备注</text>
          <textarea
            v-model="form.note"
            class="textarea"
            maxlength="80"
            placeholder="其他需求（选填，将同步到本批订单）"
            :cursor-spacing="100"
            @focus="handleFieldFocus"
            @blur="handleFieldBlur"
          />
        </view>
      </view>

      <view v-if="hasData" class="card amounts">
        <text class="title">费用明细</text>
        <view v-if="selectedSpec" class="row amount"><text>{{ designatedPlayers.length ? '指定计价规格' : '已选规格' }}</text><text>{{ selectedSpec.name }}</text></view>
        <view v-if="selectedSpec?.required_player_type_name" class="row amount"><text>陪玩要求</text><text>{{ selectedSpec.required_player_type_name }}及以上 × {{ requiredPlayers }}人</text></view>
        <view class="row amount"><text>{{ isCartCheckout ? `${cartOrderCount}个独立订单合计` : '整单价格' }}</text><text>¥{{ money(totalAmount) }}</text></view>
        <view v-if="designatedPlayers.length" class="row amount"><text>指定服务费</text><text>¥0.00</text></view>
        <view class="row total"><text>预计总额</text><text>¥{{ money(totalAmount) }}</text></view>
      </view>

      <view v-if="!hasData" class="empty">{{ loading ? '商品加载中...' : '商品不存在或购物车已变化' }}</view>
      <view class="spacer"></view>
    </view>

    <view v-if="hasData && !fieldEditing" class="bottom">
      <view class="grow"><text class="muted">{{ isCartCheckout ? `批量发布${cartOrderCount}个订单` : designatedPlayers.length ? `按${designatedPlayers[0]?.type_name || '指定陪玩'}等级计价` : '预计总额' }}</text><text class="price">¥{{ money(totalAmount) }}</text></view>
      <button class="submit" :disabled="submitting || Boolean(blockReason)" @tap="submit">{{ submitting ? '提交中...' : isCartCheckout ? `发布${cartOrderCount}个订单` : '立即下单' }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { createOrder, getMyBossOrders, getPackages, type BossOrderListItem, type BossPackage, type BossPackageSpec } from '@/api/boss'
import { createCartOrderBatch } from '@/api/orderBatch'
import { getClientProfile, syncClientProfile, type ClientProfile } from '@/utils/client'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { go, goMain, replace } from '@/utils/nav'
import { getStorage, setStorage } from '@/utils/storage'
import { getShopCart, type ShopCartItem } from '@/utils/shopCart'
import { clearDesignatedPlayers, getDesignatedPlayers, removeDesignatedPlayer, type DesignatedPlayerSelection } from '@/utils/designatedPlayer'
import { isSameDesignatedType, resolveDesignatedPricingSpec } from './designatedPricing'

const fallbackImage = 'https://api.huc125.cn/media/banners/hero-lounge.jpg'
const unfinished = ['待接单', '进行中', '待支付', '待开打']
const packageId = ref<number | null>(null)
const initialSpecId = ref('')
const cartItemIds = ref<string[]>([])
const loading = ref(false)
const submitting = ref(false)
const fieldEditing = ref(false)
const product = ref<BossPackage | null>(null)
const selectedSpec = ref<BossPackageSpec | null>(null)
const cartItems = ref<ShopCartItem[]>([])
const designatedPlayers = ref<DesignatedPlayerSelection[]>([])
const form = reactive({ contact: '', gameId: '', note: '' })
let fieldBlurTimer: ReturnType<typeof setTimeout> | null = null

const isCartCheckout = computed(() => cartItemIds.value.length > 0)
const hasData = computed(() => isCartCheckout.value ? cartItems.value.length > 0 : Boolean(product.value))
const allSpecs = computed(() => [...(product.value?.specs || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)))
const designatedPricingSpec = computed(() => resolveDesignatedPricingSpec(allSpecs.value, designatedPlayers.value))
const visibleSpecs = computed(() => designatedPlayers.value.length ? (designatedPricingSpec.value ? [designatedPricingSpec.value] : []) : allSpecs.value)
const requiredPlayers = computed(() => Math.max(1, Math.min(3, Number(product.value?.player_count || 1))))
const remainingSlots = computed(() => Math.max(0, requiredPlayers.value - designatedPlayers.value.length))
const productImage = computed(() => product.value?.cover_url || product.value?.image_url || product.value?.thumb_url || product.value?.picture_url || fallbackImage)
const basePrice = computed(() => Number(selectedSpec.value?.price ?? product.value?.base_price ?? 0))
const cartOrderCount = computed(() => cartItems.value.reduce((sum, item) => sum + quantity(item.quantity), 0))
const totalAmount = computed(() => isCartCheckout.value ? cartItems.value.reduce((sum, item) => sum + itemAmount(item), 0) : basePrice.value)
const blockReason = computed(() => {
  if (!hasData.value) return ''
  if (designatedPlayers.value.length && isCartCheckout.value) return '指定具体陪玩暂不支持购物车批量下单。'
  if (isCartCheckout.value && cartItems.value.length !== cartItemIds.value.length) return '部分购物车商品已变化，请返回购物车重新选择。'
  if (isCartCheckout.value && cartOrderCount.value > 20) return '单次最多发布20个订单，请减少商品数量。'
  if (designatedPlayers.value.length && !isSameDesignatedType(designatedPlayers.value)) return '当前仅支持指定同类型陪玩。'
  if (designatedPlayers.value.length > requiredPlayers.value) return `当前商品只需要${requiredPlayers.value}名陪玩。`
  if (designatedPlayers.value.length && !designatedPricingSpec.value) return `当前商品未配置“${designatedPlayers.value[0]?.type_name || '该等级'}”计价规格。`
  if (!isCartCheckout.value && allSpecs.value.length && !selectedSpec.value) return '请选择规格。'
  return ''
})
const readyText = computed(() => {
  if (isCartCheckout.value) return `将把${cartItems.value.length}项商品拆分为${cartOrderCount.value}个独立订单，各自进入抢单大厅；接满后分别完成支付。`
  if (designatedPlayers.value.length && selectedSpec.value) return `已按指定阵容最高等级匹配“${selectedSpec.value.name}”，整单¥${money(basePrice.value)}；剩余${remainingSlots.value}个名额公开抢单。`
  return selectedSpec.value ? `已选择“${selectedSpec.value.name}”，整单¥${money(basePrice.value)}。` : '可使用微信官方虚拟支付。'
})

function quantity(value: unknown) { const n = Math.floor(Number(value || 1)); return Number.isFinite(n) ? Math.max(1, Math.min(99, n)) : 1 }
function itemAmount(item: ShopCartItem) { return Number(item.price || 0) * quantity(item.quantity) }
function money(value: number) { return Number.isInteger(Number(value)) ? `${Number(value)}` : Number(value || 0).toFixed(2) }
function bossOpenid(profile: ClientProfile | null = getClientProfile()) { return profile?.openid || profile?.open_id || profile?.wechat_openid || '' }
async function ensureOpenid() { const local = bossOpenid(); if (local) return local; try { return bossOpenid(await syncClientProfile()) } catch { return '' } }
function syncPlayers() { designatedPlayers.value = getDesignatedPlayers() }
function handleFieldFocus() {
  if (fieldBlurTimer) clearTimeout(fieldBlurTimer)
  fieldBlurTimer = null
  fieldEditing.value = true
}
function handleFieldBlur() {
  if (fieldBlurTimer) clearTimeout(fieldBlurTimer)
  fieldBlurTimer = setTimeout(() => { fieldEditing.value = false }, 120)
}
function syncSpec() {
  if (designatedPlayers.value.length) { selectedSpec.value = designatedPricingSpec.value; return }
  selectedSpec.value = allSpecs.value.find(item => String(item.id) === initialSpecId.value) || selectedSpec.value || allSpecs.value[0] || null
}
function chooseSpec(spec: BossPackageSpec) {
  if (designatedPlayers.value.length && Number(spec.id) !== Number(designatedPricingSpec.value?.id || 0)) return toast('指定后按最高等级自动匹配价格')
  selectedSpec.value = spec
}
function removeDesignation(id: number) { designatedPlayers.value = removeDesignatedPlayer(id); syncSpec() }
function clearAllDesignations() { clearDesignatedPlayers(); designatedPlayers.value = []; syncSpec() }
async function fetchProduct() { if (!packageId.value) return; loading.value = true; try { product.value = (await getPackages()).find(item => item.id === packageId.value) || null; syncSpec() } catch (e) { toast(getErrorMessage(e, '商品加载失败')) } finally { loading.value = false } }
async function fetchCart() { loading.value = true; try { const ids = new Set(cartItemIds.value); cartItems.value = (await getShopCart()).filter(item => ids.has(String(item.id))) } catch (e) { toast(getErrorMessage(e, '购物车加载失败')) } finally { loading.value = false } }
function note() { const lines = designatedPlayers.value.length ? [`指定陪玩：${designatedPlayers.value.map(item => item.name).join('、')}（按最高等级规格计价，指定服务费¥0）`] : []; if (selectedSpec.value) lines.push(`规格：${selectedSpec.value.name}，价格：¥${money(basePrice.value)}`); if (form.note.trim()) lines.push(form.note.trim()); return lines.join('\n') || null }
function showUnfinished(orders: BossOrderListItem[]) { uni.showModal({ title: '无法下单', content: `您有未完成的订单：\n${orders.slice(0, 5).map(item => `${item.order_no}（${item.status}）`).join('\n')}`, showCancel: false }) }

async function submit() {
  if (blockReason.value) return toast(blockReason.value)
  if (!getStorage<string>('token')) { toast('请先微信登录'); go('/pages/client/login/index'); return }
  if (!form.contact.trim() || !form.gameId.trim()) return toast('请填写联系昵称和游戏ID/队伍码')
  const openid = await ensureOpenid(); if (!openid) return toast('微信身份获取失败')
  submitting.value = true
  try {
    const active = (await getMyBossOrders()).filter(item => unfinished.includes(item.status)); if (active.length) return showUnfinished(active)
    setStorage('boss_wechat', form.contact.trim())
    if (isCartCheckout.value) {
      const result = await createCartOrderBatch({
        boss_wechat: openid,
        game_id: form.gameId.trim(),
        cart_item_ids: cartItems.value.map(item => Number(item.id)),
        boss_note: form.note.trim() || null,
        booked_hours: 1
      })
      clearDesignatedPlayers()
      success(`已发布${result.order_count}个订单`)
      if (result.order_count === 1 && result.order_nos[0]) {
        replace('/pages/boss/waiting/index', { orderNo: result.order_nos[0] })
      } else {
        goMain('query')
      }
      return
    }
    const res = await createOrder({ boss_wechat: openid, game_id: form.gameId.trim(), package_id: product.value?.id, spec_id: Number(selectedSpec.value?.id || 0) || null, quantity: 1, required_players: requiredPlayers.value, addon_details: null, designated_players: designatedPlayers.value.length ? designatedPlayers.value.map(item => Number(item.id)) : null, boss_note: note(), booked_hours: 1 })
    clearDesignatedPlayers()
    success('下单成功')
    replace('/pages/boss/waiting/index', { orderNo: res.order_no })
  } catch (e) { toast(getErrorMessage(e, '创建订单失败')) } finally { submitting.value = false }
}

onLoad(query => { cartItemIds.value = query?.cartItemIds ? Array.from(new Set(String(query.cartItemIds).split(',').filter(Boolean))) : []; packageId.value = Number(query?.packageId) || null; initialSpecId.value = query?.specId ? String(query.specId) : ''; form.contact = getStorage<string>('boss_wechat') || getClientProfile()?.nickname || ''; syncPlayers(); cartItemIds.value.length ? fetchCart() : fetchProduct() })
onShow(() => { syncPlayers(); syncSpec() })
</script>

<style lang="scss" src="./index.scss" scoped></style>
