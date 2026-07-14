<template>
  <view class="checkout-page">
    <scroll-view scroll-y class="checkout-scroll">
      <view v-if="isCartCheckout" class="card merge-card">
        <view class="card-head">
          <view><text class="card-title">购物车结算</text><text class="card-subtitle">本次选择 {{ cartItems.length }} 个商品</text></view>
          <text class="count-pill">{{ cartQuantity }}件</text>
        </view>
        <view class="merge-list">
          <view v-for="item in cartItems" :key="item.id" class="merge-item">
            <image v-if="item.image_url" class="item-image" :src="item.image_url" mode="aspectFill" />
            <view v-else class="item-image item-image--placeholder">{{ item.package_name.slice(0, 1) }}</view>
            <view class="item-main">
              <text class="item-name">{{ item.package_name }}</text>
              <text v-if="item.spec_display_name || item.spec_name" class="item-spec">{{ item.spec_display_name || item.spec_name }}</text>
              <text class="item-price">¥{{ formatMoney(item.price) }} × {{ normalizeQuantity(item.quantity) }}</text>
            </view>
            <text class="item-total">¥{{ formatMoney(itemAmount(item)) }}</text>
          </view>
        </view>
      </view>

      <view v-else-if="product" class="card product-card">
        <image class="product-image" :src="productImage" mode="aspectFill" />
        <view class="product-main">
          <view class="product-title-row">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-tag">{{ isGuaranteeProduct ? '特色单' : product.group_name || '套餐' }}</text>
          </view>
          <text class="product-desc">{{ productDesc }}</text>
          <view class="price-row"><text>¥</text><text>{{ formatMoney(basePrice) }}</text><text>{{ isSpecProduct ? '/单' : '/时/人' }}</text></view>
        </view>
      </view>

      <view v-if="designatedPlayer" class="card designate-card">
        <view class="card-head">
          <view><text class="card-title">已指定陪玩</text><text class="card-subtitle">指定本人不额外加价；系统只展示与其类型匹配的规格，邀请10分钟内有效</text></view>
          <button class="remove-designate" @tap="removeDesignation">取消指定</button>
        </view>
        <view class="designate-player">
          <image v-if="designatedPlayer.avatar_url" class="designate-avatar" :src="designatedPlayer.avatar_url" mode="aspectFill" />
          <view v-else class="designate-avatar designate-avatar--empty">{{ designatedPlayer.name?.[0] || '陪' }}</view>
          <view class="designate-main">
            <text>{{ designatedPlayer.name }}</text>
            <text>{{ designatedPlayer.type_name }} · {{ designatedPlayer.is_online ? '在线' : '离线' }}</text>
          </view>
          <text class="free-tag">指定费 ¥0</text>
        </view>
        <view class="designate-flow"><text>1 发出邀请</text><text>2 陪玩接受</text><text>3 人数到齐付款</text></view>
      </view>

      <view v-if="!isCartCheckout && product && specs.length" class="card">
        <view class="card-head">
          <view>
            <text class="card-title">{{ isGuaranteeProduct ? '选择保底规格' : '选择规格' }}</text>
            <text class="card-subtitle">{{ designatedPlayer ? `仅展示适用于“${designatedPlayer.type_name}”的固定价格规格` : '固定价格规格可直接使用微信虚拟支付' }}</text>
          </view>
          <text class="count-pill">{{ specs.length }}档</text>
        </view>
        <view class="spec-grid">
          <view v-for="spec in specs" :key="spec.id" class="spec-chip" :class="{ active: selectedSpec?.id === spec.id }" @tap="selectSpec(spec)">
            <text>{{ spec.name }}</text>
            <text v-if="spec.required_player_type_name" class="spec-type">仅限 {{ spec.required_player_type_name }}</text>
            <text v-if="spec.guarantee_amount">保底 {{ spec.guarantee_amount }}</text>
            <text>¥{{ formatMoney(Number(spec.price)) }}</text>
          </view>
        </view>
      </view>

      <view v-if="hasCheckoutData" class="pay-rule-card" :class="{ blocked: Boolean(virtualPayBlockReason) }">
        <view class="rule-icon">{{ virtualPayBlockReason ? '!' : '✓' }}</view>
        <view class="rule-main"><text class="rule-title">{{ virtualPayBlockReason ? '当前组合暂不能使用虚拟支付' : '可使用微信官方虚拟支付' }}</text><text class="rule-desc">{{ virtualPayBlockReason || virtualPayReadyText }}</text></view>
      </view>

      <view v-if="hasCheckoutData" class="card">
        <text class="card-title standalone-title">下单信息</text>
        <view class="field"><text class="field-label">联系昵称</text><input v-model="form.contact" class="field-input" placeholder="请输入您的联系昵称" /></view>
        <view class="field"><text class="field-label">游戏ID / 队伍码</text><input v-model="form.gameId" class="field-input" placeholder="请输入游戏ID或队伍码" /></view>
        <view v-if="!isCartCheckout" class="field">
          <text class="field-label">购买数量</text>
          <view class="stepper"><button :disabled="form.quantity <= 1" @tap="adjustQuantity(-1)">−</button><text>{{ form.quantity }}</text><button class="plus" @tap="adjustQuantity(1)">＋</button></view>
          <text class="field-tip">同一固定价格规格可以购买多份</text>
        </view>
        <view v-if="!isCartCheckout && !isSpecProduct" class="dynamic-grid">
          <view class="field"><text class="field-label">人数</text><view class="stepper"><button @tap="adjustPlayerCount(-1)">−</button><text>{{ form.playerCount }}</text><button class="plus" @tap="adjustPlayerCount(1)">＋</button></view></view>
          <view class="field"><text class="field-label">预订时长</text><view class="stepper"><button @tap="adjustHours(-0.5)">−</button><text>{{ formatHours(form.bookedHours) }}</text><button class="plus" @tap="adjustHours(0.5)">＋</button></view></view>
        </view>
        <view class="field textarea-field"><text class="field-label">订单备注</text><textarea v-model="form.note" class="field-textarea" maxlength="80" placeholder="如有其他需求请备注（选填）" /><text class="textarea-count">{{ form.note.length }}/80</text></view>
      </view>

      <view v-if="hasCheckoutData" class="card amount-card">
        <text class="card-title standalone-title">费用明细</text>
        <template v-if="isCartCheckout"><view class="amount-line"><text>商品项目</text><text>{{ cartItems.length }}项</text></view><view class="amount-line"><text>商品数量</text><text>×{{ cartQuantity }}</text></view></template>
        <template v-else>
          <view v-if="selectedSpec" class="amount-line"><text>已选规格</text><text>{{ selectedSpec.name }}</text></view>
          <view class="amount-line"><text>{{ isSpecProduct ? '规格单价' : '套餐单价' }}</text><text>¥{{ formatMoney(basePrice) }}</text></view>
          <view class="amount-line"><text>购买数量</text><text>×{{ form.quantity }}</text></view>
          <view v-if="!isSpecProduct" class="amount-line"><text>人数与时长</text><text>{{ form.playerCount }}人 · {{ formatHours(form.bookedHours) }}</text></view>
        </template>
        <view v-if="designatedPlayer" class="amount-line"><text>指定陪玩服务费</text><text>¥0.00</text></view>
        <view class="amount-line amount-line--total"><text>预计总额</text><text>¥{{ formatMoney(totalAmount) }}</text></view>
      </view>

      <view v-if="!hasCheckoutData" class="empty-state"><text>{{ loading ? '商品加载中...' : '商品不存在或购物车已变化' }}</text><button v-if="!loading" @tap="goBack">返回</button></view>
      <view class="bottom-spacer"></view>
    </scroll-view>

    <view v-if="hasCheckoutData" class="bottom-bar">
      <view class="bottom-price"><text>{{ designatedPlayer ? `指定 ${designatedPlayer.name}` : '预计总额' }}</text><text>¥{{ formatMoney(totalAmount) }}</text></view>
      <button class="submit-btn" :disabled="submitting || Boolean(virtualPayBlockReason)" @tap="submitOrder">{{ submitting ? '提交中...' : (virtualPayBlockReason ? '当前组合不可下单' : '立即下单') }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { createOrder, getMyBossOrders, getPackages, type BossOrderListItem, type BossPackage, type BossPackageSpec, type OrderCreateItemPayload } from '@/api/boss'
import { getClientProfile, syncClientProfile, type ClientProfile } from '@/utils/client'
import { formatHours } from '@/utils/format'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { go, replace } from '@/utils/nav'
import { getStorage, setStorage } from '@/utils/storage'
import { getShopCart, removeShopCartItem, type ShopCartItem } from '@/utils/shopCart'
import { clearDesignatedPlayer, getDesignatedPlayer, type DesignatedPlayerSelection } from '@/utils/designatedPlayer'

const fallbackImage = 'https://api.huc125.cn/media/banners/hero-lounge.jpg'
const MAX_PLAYER_COUNT = 3
const unfinishedStatuses = ['待接单', '进行中', '待支付', '待开打']

const packageId = ref<number | null>(null)
const initialSpecId = ref('')
const cartItemIds = ref<string[]>([])
const loading = ref(false)
const submitting = ref(false)
const product = ref<BossPackage | null>(null)
const selectedSpec = ref<BossPackageSpec | null>(null)
const cartItems = ref<ShopCartItem[]>([])
const designatedPlayer = ref<DesignatedPlayerSelection | null>(null)
const form = reactive({ contact: '', gameId: '', note: '', bookedHours: 1, playerCount: 1, quantity: 1 })

const isCartCheckout = computed(() => cartItemIds.value.length > 0)
const hasCheckoutData = computed(() => isCartCheckout.value ? cartItems.value.length > 0 : Boolean(product.value))
const allSpecs = computed(() => [...(product.value?.specs || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)))
const designatedPlayerTypeId = computed(() => Number(designatedPlayer.value?.type_id || 0))
const specs = computed(() => {
  if (!designatedPlayer.value || !designatedPlayerTypeId.value) return allSpecs.value
  return allSpecs.value.filter(spec => {
    const requiredTypeId = Number(spec.required_player_type_id || 0)
    return !requiredTypeId || requiredTypeId === designatedPlayerTypeId.value
  })
})
const isGuaranteeProduct = computed(() => Boolean(product.value && (product.value.product_type === 'guarantee' || product.value.name.includes('保底'))))
const isSpecProduct = computed(() => Boolean(allSpecs.value.length) || product.value?.product_type === 'guarantee' || product.value?.product_type === 'escort')
const productImage = computed(() => product.value ? getProductImage(product.value) : fallbackImage)
const productDesc = computed(() => isGuaranteeProduct.value ? (selectedSpec.value ? `当前规格：${selectedSpec.value.guarantee_amount || selectedSpec.value.name}` : '请选择固定价格保底规格。') : selectedSpec.value?.name || product.value?.description || '精选套餐，平台保障，快速匹配陪玩。')
const basePrice = computed(() => selectedSpec.value ? Number(selectedSpec.value.price || 0) : (allSpecs.value.length ? 0 : (product.value ? getDisplayPrice(product.value) : 0)))
const unitAmount = computed(() => isSpecProduct.value ? basePrice.value : basePrice.value * form.playerCount * form.bookedHours)
const singleTotalAmount = computed(() => unitAmount.value * form.quantity)
const cartQuantity = computed(() => cartItems.value.reduce((sum, item) => sum + normalizeQuantity(item.quantity), 0))
const cartTotalAmount = computed(() => cartItems.value.reduce((sum, item) => sum + itemAmount(item), 0))
const totalAmount = computed(() => isCartCheckout.value ? cartTotalAmount.value : singleTotalAmount.value)

function specMatchesDesignatedPlayer(spec: BossPackageSpec | null | undefined) {
  if (!spec || !designatedPlayer.value) return true
  const requiredTypeId = Number(spec.required_player_type_id || 0)
  return !requiredTypeId || (designatedPlayerTypeId.value > 0 && requiredTypeId === designatedPlayerTypeId.value)
}

const virtualPayBlockReason = computed(() => {
  if (!hasCheckoutData.value) return ''
  if (designatedPlayer.value && isCartCheckout.value) return '指定陪玩暂不支持购物车结算，请直接购买一个固定价格商品。'
  if (isCartCheckout.value && cartItems.value.length !== 1) return '当前阶段暂不支持多个不同商品合并虚拟支付，请返回购物车仅选择一个商品规格。'
  if (designatedPlayer.value && !designatedPlayerTypeId.value) return '指定陪玩的类型信息已过期，请取消指定后重新选择陪玩。'
  if (designatedPlayer.value && allSpecs.value.length && !specs.value.length) return `当前商品没有适用于“${designatedPlayer.value.type_name}”的规格，请更换商品或取消指定。`
  if (designatedPlayer.value && selectedSpec.value && !specMatchesDesignatedPlayer(selectedSpec.value)) return '所选规格与指定陪玩类型不匹配，请重新选择规格。'
  if (!isCartCheckout.value && !isSpecProduct.value) return '当前阶段暂不支持按人数和服务时长动态计价，请选择带固定价格规格的商品。'
  if (!isCartCheckout.value && allSpecs.value.length && !selectedSpec.value) return '请选择一个固定价格规格。'
  return ''
})

const virtualPayReadyText = computed(() => {
  if (designatedPlayer.value && selectedSpec.value) return `将按“${selectedSpec.value.name}”价格向“${designatedPlayer.value.name}”发出10分钟指定邀请，指定本人不另加价。`
  if (isCartCheckout.value) return '已选择一个固定价格商品；同一商品数量可以大于1。'
  return selectedSpec.value ? `已选择“${selectedSpec.value.name}”，支付时将按该规格与购买数量核对金额。` : '请选择一个固定价格规格。'
})

function normalizeQuantity(value: unknown) { const num = Math.floor(Number(value || 1)); return Number.isFinite(num) ? Math.max(1, Math.min(99, num)) : 1 }
function itemAmount(item: ShopCartItem) { return Number(item.price || 0) * normalizeQuantity(item.quantity) }
function itemSpecId(item: ShopCartItem) { const specId = Number(item.spec_id || item.spec_id_snapshot || 0); return Number.isFinite(specId) && specId > 0 ? specId : null }
function getProductImage(item: BossPackage) { const current = item as BossPackage & Record<string, any>; return current.cover_url || current.image_url || current.thumb_url || current.picture_url || fallbackImage }
function getDisplayPrice(item: BossPackage) { const prices = (item.specs || []).map(spec => Number(spec.price || 0)).filter(price => price >= 0); return prices.length ? Math.min(...prices) : getProductPrice(item) }
function getProductPrice(item: BossPackage) { const current = item as BossPackage & Record<string, any>; return Math.max(0, Number(current.price ?? current.base_price ?? 0)) }
function getPackagePlayerCount(item: BossPackage | null | undefined) { return Math.max(1, Math.min(Number(item?.player_count || 1), MAX_PLAYER_COUNT)) }
function formatMoney(value: number) { return Number.isInteger(value) ? `${value}` : Number(value || 0).toFixed(2) }
function getBossOpenid(profile: ClientProfile | null = getClientProfile()) { return profile?.openid || profile?.open_id || profile?.wechat_openid || '' }
async function ensureBossOpenid() { const local = getBossOpenid(); if (local) return local; try { return getBossOpenid(await syncClientProfile()) } catch { return '' } }
function getUnfinishedOrders(orders: BossOrderListItem[]) { return orders.filter(order => unfinishedStatuses.includes(order.status)) }
function showUnfinishedOrders(orders: BossOrderListItem[]) { const lines = orders.slice(0, 5).map(order => `${order.order_no}（${order.status}）`).join('\n'); uni.showModal({ title: '无法下单', content: `您有未完成的订单，请先完成后再下单\n${lines}`, showCancel: false, confirmColor: '#2f9b63' }) }
function syncSelectedSpec() {
  const nextSpecs = specs.value
  if (!nextSpecs.length) { selectedSpec.value = null; return }
  const preferred = nextSpecs.find(item => String(item.id) === initialSpecId.value)
  const current = nextSpecs.find(item => String(item.id) === String(selectedSpec.value?.id || ''))
  selectedSpec.value = preferred || current || nextSpecs[0]
}
async function fetchCartCheckout() { loading.value = true; try { const selectedIds = new Set(cartItemIds.value); cartItems.value = (await getShopCart()).filter(item => selectedIds.has(String(item.id))); if (!cartItems.value.length) toast('选中的购物车商品不存在或已删除') } catch (error) { toast(getErrorMessage(error, '购物车加载失败')) } finally { loading.value = false } }
async function fetchProduct() { if (!packageId.value) return; loading.value = true; try { const matched = (await getPackages()).find(item => item.id === packageId.value) || null; product.value = matched; if (matched) form.playerCount = getPackagePlayerCount(matched); syncSelectedSpec() } catch (error) { toast(getErrorMessage(error, '商品加载失败')) } finally { loading.value = false } }
function selectSpec(spec: BossPackageSpec) { if (!specMatchesDesignatedPlayer(spec)) return toast('该规格与指定陪玩类型不匹配'); selectedSpec.value = spec }
function adjustQuantity(delta: number) { const next = form.quantity + delta; if (next < 1) return; if (next > 99) return toast('单次最多选择99件'); form.quantity = next }
function adjustPlayerCount(delta: number) { const next = form.playerCount + delta; if (next < 1) return; if (next > MAX_PLAYER_COUNT) return toast(`下单人数最多${MAX_PLAYER_COUNT}人`); form.playerCount = next }
function adjustHours(delta: number) { const next = Math.round((form.bookedHours + delta) * 10) / 10; if (next >= .5) form.bookedHours = next }
function buildBossNote() { const parts: string[] = []; if (designatedPlayer.value) parts.push(`指定陪玩：${designatedPlayer.value.name}（${designatedPlayer.value.type_name}，指定本人不加价）`); if (!isCartCheckout.value && selectedSpec.value) parts.push(`规格：${selectedSpec.value.name}，价格：¥${formatMoney(Number(selectedSpec.value.price || 0))}`); if (!isCartCheckout.value && form.quantity > 1) parts.push(`购买数量：${form.quantity}`); if (form.note.trim()) parts.push(form.note.trim()); return parts.join('\n') || null }
function buildMergedItems(): OrderCreateItemPayload[] { return cartItems.value.map(item => ({ package_id: Number(item.package_id), spec_id: itemSpecId(item), quantity: normalizeQuantity(item.quantity), spec_display_name: item.spec_display_name || item.spec_name || '', image_url: item.image_url || '', description: item.description || '' })) }
async function removeMergedCartItems() { for (const item of cartItems.value) { try { await removeShopCartItem(item.id) } catch {} } }
function removeDesignation() { clearDesignatedPlayer(); designatedPlayer.value = null; syncSelectedSpec(); toast('已取消指定陪玩') }
async function showVirtualPayBlock() { if (!virtualPayBlockReason.value) return; await new Promise(resolve => uni.showModal({ title: '当前组合暂不可下单', content: virtualPayBlockReason.value, showCancel: false, confirmText: '我知道了', confirmColor: '#2f9b63', complete: resolve })) }

async function submitOrder() {
  if (!hasCheckoutData.value) return toast('商品不存在')
  if (virtualPayBlockReason.value) return showVirtualPayBlock()
  if (!isCartCheckout.value && product.value?.is_frontend_preset) return toast('请先在后端创建同名商品后再下单')
  if (!isCartCheckout.value && allSpecs.value.length && !selectedSpec.value) return toast('请选择规格')
  if (designatedPlayer.value && !specMatchesDesignatedPlayer(selectedSpec.value)) return toast('指定陪玩与规格类型不匹配')
  if (!getStorage<string>('token')) { toast('请先微信登录'); go('/pages/client/login/index'); return }
  if (!form.contact.trim()) return toast('请填写联系昵称')
  if (!form.gameId.trim()) return toast('请填写游戏ID/队伍码')
  const bossWechat = await ensureBossOpenid()
  if (!bossWechat) return toast('微信身份获取失败，请重新登录')

  submitting.value = true
  try {
    const unfinishedOrders = getUnfinishedOrders(await getMyBossOrders())
    if (unfinishedOrders.length) { showUnfinishedOrders(unfinishedOrders); return }
    const mergedItems = isCartCheckout.value ? buildMergedItems() : undefined
    const requiredPlayers = isCartCheckout.value || isSpecProduct.value ? 1 : form.playerCount
    const res = await createOrder({
      boss_wechat: bossWechat,
      game_id: form.gameId.trim(),
      package_id: isCartCheckout.value ? mergedItems?.[0]?.package_id : product.value?.id,
      spec_id: !isCartCheckout.value && selectedSpec.value ? Number(selectedSpec.value.id) : null,
      quantity: form.quantity,
      items: mergedItems,
      required_players: requiredPlayers,
      addon_details: null,
      designated_players: designatedPlayer.value ? [Number(designatedPlayer.value.id)] : null,
      boss_note: buildBossNote(),
      booked_hours: isCartCheckout.value || isSpecProduct.value ? 1 : form.bookedHours
    })
    if (isCartCheckout.value) await removeMergedCartItems()
    setStorage('boss_wechat', form.contact.trim())
    clearDesignatedPlayer()
    designatedPlayer.value = null
    success('下单成功')
    replace('/pages/boss/waiting/index', { orderNo: res.order_no })
  } catch (error) { toast(getErrorMessage(error, '创建订单失败')) } finally { submitting.value = false }
}
function goBack() { uni.navigateBack({ delta: 1 }) }

onLoad((query) => {
  cartItemIds.value = query?.cartItemIds ? String(query.cartItemIds).split(',').filter(Boolean) : []
  const id = Number(query?.packageId)
  packageId.value = Number.isFinite(id) ? id : null
  initialSpecId.value = query?.specId ? String(query.specId) : ''
  form.quantity = normalizeQuantity(query?.quantity)
  form.contact = getStorage<string>('boss_wechat') || getClientProfile()?.nickname || ''
  designatedPlayer.value = getDesignatedPlayer()
  if (cartItemIds.value.length) fetchCartCheckout()
  else fetchProduct()
})
onShow(() => { designatedPlayer.value = getDesignatedPlayer(); syncSelectedSpec() })
</script>

<style lang="scss" scoped>
.checkout-page { min-height: 100vh; color: #172116; background: linear-gradient(180deg, #f8f5ed, #f5f7f2); }
.checkout-scroll { height: 100vh; }
.card, .pay-rule-card { margin: 22rpx; padding: 26rpx; border-radius: 26rpx; background: rgba(255,255,255,.96); border: 1rpx solid rgba(39,61,42,.08); box-shadow: 0 12rpx 30rpx rgba(39,61,42,.05); box-sizing: border-box; }
.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20rpx; margin-bottom: 20rpx; }
.card-title { display: block; font-size: 30rpx; font-weight: 900; }
.standalone-title { margin-bottom: 22rpx; }
.card-subtitle { display: block; margin-top: 7rpx; color: #879083; font-size: 22rpx; line-height: 1.4; }
.count-pill { padding: 7rpx 14rpx; border-radius: 999rpx; color: #1f7c4b; font-size: 21rpx; font-weight: 900; background: #eef8f1; }
.product-card { display: flex; gap: 20rpx; }
.product-image { width: 150rpx; height: 150rpx; flex-shrink: 0; border-radius: 20rpx; background: #edf1ea; }
.product-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.product-title-row { display: flex; justify-content: space-between; gap: 14rpx; }
.product-name { flex: 1; font-size: 31rpx; font-weight: 900; }
.product-tag { padding: 6rpx 12rpx; border-radius: 999rpx; color: #a87520; font-size: 20rpx; font-weight: 900; background: #fff6df; }
.product-desc { margin-top: 10rpx; color: #7d877a; font-size: 23rpx; }
.price-row { margin-top: auto; display: flex; align-items: baseline; color: #a87520; }
.price-row text:nth-child(2) { font-size: 42rpx; font-weight: 900; }
.merge-list { display: flex; flex-direction: column; gap: 14rpx; }
.merge-item { display: flex; align-items: center; gap: 14rpx; padding: 16rpx; border-radius: 20rpx; background: #f7faf4; }
.item-image { width: 104rpx; height: 104rpx; flex-shrink: 0; border-radius: 18rpx; }
.item-image--placeholder { display: flex; align-items: center; justify-content: center; color: #fff; background: #2f9b63; }
.item-main { flex: 1; min-width: 0; }
.item-main text { display: block; }
.item-name { font-size: 26rpx; font-weight: 900; }
.item-spec, .item-price { margin-top: 5rpx; color: #7d877a; font-size: 21rpx; }
.item-total { color: #a87520; font-weight: 900; }
.designate-card { border-color: rgba(47,155,99,.18); background: linear-gradient(135deg, #f2faf4, #fffaf0); }
.remove-designate { min-width: 120rpx; height: 56rpx; margin: 0; padding: 0 16rpx; border-radius: 999rpx; color: #a13d35; font-size: 21rpx; background: #fff0ed; }
.remove-designate::after { border: none; }
.designate-player { display: flex; align-items: center; gap: 16rpx; }
.designate-avatar { width: 84rpx; height: 84rpx; border-radius: 24rpx; background: #2f9b63; }
.designate-avatar--empty { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 32rpx; font-weight: 900; }
.designate-main { flex: 1; min-width: 0; }
.designate-main text { display: block; }
.designate-main text:first-child { font-size: 28rpx; font-weight: 900; }
.designate-main text:last-child { margin-top: 6rpx; color: #687665; font-size: 21rpx; }
.free-tag { padding: 7rpx 12rpx; border-radius: 999rpx; color: #1f7c4b; font-size: 20rpx; font-weight: 900; background: #e5f6e9; }
.designate-flow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8rpx; margin-top: 18rpx; }
.designate-flow text { padding: 12rpx 6rpx; border-radius: 14rpx; color: #687665; font-size: 19rpx; text-align: center; background: rgba(255,255,255,.75); }
.spec-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14rpx; }
.spec-chip { padding: 18rpx; border-radius: 18rpx; border: 1rpx solid rgba(39,61,42,.10); background: #f8faf6; }
.spec-chip text { display: block; }
.spec-chip text:first-child { font-size: 24rpx; font-weight: 900; }
.spec-chip text:last-child { margin-top: 9rpx; color: #a87520; font-size: 29rpx; font-weight: 900; }
.spec-chip .spec-type { margin-top: 7rpx; color: #1f7c4b; font-size: 20rpx; font-weight: 800; }
.spec-chip.active { border-color: #2f9b63; background: #eef8f1; }
.pay-rule-card { display: flex; gap: 16rpx; align-items: flex-start; border-color: rgba(47,155,99,.16); background: #f2faf4; }
.pay-rule-card.blocked { border-color: rgba(196,50,50,.18); background: #fff4f2; }
.rule-icon { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; color: #fff; font-weight: 900; background: #2f9b63; }
.blocked .rule-icon { background: #c43232; }
.rule-main { flex: 1; }
.rule-main text { display: block; }
.rule-title { font-size: 25rpx; font-weight: 900; }
.rule-desc { margin-top: 7rpx; color: #687665; font-size: 22rpx; line-height: 1.5; }
.field { margin-top: 22rpx; }
.field-label { display: block; margin-bottom: 10rpx; color: #687665; font-size: 24rpx; font-weight: 800; }
.field-input, .field-textarea { width: 100%; border-radius: 18rpx; border: 1rpx solid rgba(39,61,42,.09); background: #f8faf6; box-sizing: border-box; font-size: 27rpx; }
.field-input { height: 84rpx; padding: 0 20rpx; }
.field-textarea { min-height: 150rpx; padding: 18rpx 20rpx; }
.field-tip { display: block; margin-top: 8rpx; color: #8a9286; font-size: 21rpx; }
.textarea-field { position: relative; }
.textarea-count { position: absolute; right: 16rpx; bottom: 13rpx; color: #aab0a8; font-size: 20rpx; }
.dynamic-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.stepper { height: 78rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 10rpx; border-radius: 18rpx; background: #f8faf6; border: 1rpx solid rgba(39,61,42,.09); }
.stepper button { width: 52rpx; height: 52rpx; padding: 0; margin: 0; border-radius: 50%; background: #fff; }
.stepper button.plus { color: #fff; background: #2f9b63; }
.stepper button::after { border: none; }
.amount-line { min-height: 66rpx; display: flex; align-items: center; justify-content: space-between; gap: 22rpx; border-bottom: 1rpx solid rgba(39,61,42,.07); color: #687665; font-size: 25rpx; }
.amount-line text:last-child { flex: 1; text-align: right; color: #172116; font-weight: 800; }
.amount-line--total { border-bottom: 0; }
.amount-line--total text:last-child { color: #a87520; font-size: 32rpx; font-weight: 900; }
.empty-state { min-height: 70vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #879083; }
.bottom-spacer { height: calc(150rpx + env(safe-area-inset-bottom)); }
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; align-items: center; gap: 18rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); background: rgba(255,255,255,.98); box-shadow: 0 -10rpx 30rpx rgba(39,61,42,.08); }
.bottom-price { flex: 1; }
.bottom-price text { display: block; }
.bottom-price text:first-child { color: #879083; font-size: 21rpx; }
.bottom-price text:last-child { color: #a87520; font-size: 34rpx; font-weight: 900; }
.submit-btn { min-width: 236rpx; height: 82rpx; margin: 0; border-radius: 999rpx; color: #fff; font-size: 27rpx; font-weight: 900; background: linear-gradient(135deg, #5fc68a, #1f7c4b); }
.submit-btn::after { border: none; }
.submit-btn[disabled] { opacity: .48; }
</style>
