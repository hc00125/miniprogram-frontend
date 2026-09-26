<template>
  <view class="checkout-page">
    <view class="checkout-scroll">
      <view v-if="isCartCheckout" class="card">
        <view class="head"><text class="title">购物车结算</text><text class="pill">{{ cartOrderCount }}单</text></view>
        <view v-for="item in cartItems" :key="item.id" class="row player">
          <view class="grow"><text>{{ item.package_name }} · {{ item.spec_display_name || item.spec_name || '默认规格' }}</text><text class="muted">{{ isHourlyItem(item) ? `服务时长 ${itemHours(item)}小时` : '按单购买' }}</text></view>
          <view class="price diamond-value"><image class="diamond-unit" :src="uiIcons.diamond" mode="aspectFit" /><text>{{ diamondAmount(itemAmount(item)) }}</text></view>
        </view>
      </view>

      <view v-else-if="product" class="card product">
        <image :src="productImage" mode="aspectFill" />
        <view class="grow">
          <view class="head"><text class="title">{{ product.name }}</text><text class="pill">{{ isTargetedPlayerProduct ? '指定服务' : `需${requiredPlayers}人` }}</text></view>
          <text class="sub">{{ selectedSpec?.name || product.description || '精选陪玩服务' }}</text>
          <view class="price diamond-value"><image class="diamond-unit" :src="uiIcons.diamond" mode="aspectFit" /><text>{{ diamondAmount(basePrice) }}{{ hourlyCurrent ? '/小时' : '/单' }}</text></view>
        </view>
      </view>

      <view v-if="isTargetedPlayerProduct && product" class="card">
        <view class="head"><text class="title">指定对象</text><text class="pill">支付后通知</text></view>
        <view class="row"><text>{{ product.owner_player_name || '该陪玩师' }}</text><text class="muted">本订单只邀请 TA，TA 拒绝或超时将自动退款</text></view>
      </view>

      <view v-if="!isCartCheckout && product && allSpecs.length" class="card">
        <view class="head"><view><text class="title">选择规格</text><text class="sub">服务规格由平台统一配置，钻石价格以此页为准</text></view><text class="pill">{{ allSpecs.length }}档</text></view>
        <view class="specs">
          <view v-for="spec in allSpecs" :key="spec.id" class="spec" :class="{ active: selectedSpec?.id === spec.id }" @tap="chooseSpec(spec)">
            <text>{{ spec.name }}</text><text v-if="spec.listing_description || spec.description" class="muted">{{ spec.listing_description || spec.description }}</text><view class="spec-price diamond-value"><image class="diamond-unit" :src="uiIcons.diamond" mode="aspectFit" /><text>{{ specDiamonds(spec) }}{{ hourlyCurrent ? '/小时' : '' }}</text></view>
          </view>
        </view>
      </view>

      <view v-if="!isCartCheckout && hourlyCurrent" class="card duration-card">
        <view class="head"><view><text class="title">预订时长</text><text class="sub">下单数量代表服务小时数</text></view><text class="pill">{{ effectiveHours }}小时</text></view>
        <view class="duration-stepper"><button :disabled="effectiveHours <= 1" @tap="adjustHours(-1)">−</button><text>{{ effectiveHours }}小时</text><button :disabled="effectiveHours >= MAX_SERVICE_HOURS" @tap="adjustHours(1)">＋</button></view>
      </view>

      <view v-if="hasData" class="rule" :class="{ blocked: Boolean(blockReason) }"><text>{{ blockReason ? '!' : '✓' }}</text><text class="grow">{{ blockReason || readyText }}</text></view>

      <view v-if="hasData" class="card fields">
        <text class="title">下单信息</text>
        <view><text class="field-label">联系昵称</text><input v-model="form.contact" class="input" placeholder="请输入联系昵称" always-embed :cursor-spacing="24" confirm-type="next" @focus="handleFieldFocus" @blur="handleFieldBlur" /></view>
        <view><text class="field-label">游戏ID / 队伍码</text><input v-model="form.gameId" class="input" placeholder="请输入游戏ID或队伍码" always-embed :cursor-spacing="24" confirm-type="done" @focus="handleFieldFocus" @blur="handleFieldBlur" /></view>
        <view><text class="field-label">订单备注</text><textarea v-model="form.note" class="textarea" maxlength="80" placeholder="其他需求（选填）" :cursor-spacing="100" @focus="handleFieldFocus" @blur="handleFieldBlur" /></view>
      </view>

      <view v-if="commerceRelease.orderSurchargeQuoteSupported && hasData && !isCartCheckout && !isTargetedPlayerProduct" class="card surcharge-choice">
        <text class="title">整单额外加价（选填）</text>
        <text class="muted">按订单要求人数均分，固定抽成25%；不填为0钻石，不改变原套餐。</text>
        <input data-action="surcharge-input" type="number" :value="surchargeInput" placeholder="0 钻石（整单，不是每人）" @input="inputSurcharge" />
        <text v-if="surchargeError" class="surcharge-alert">{{ surchargeError }}</text>
        <text v-if="surchargePending" class="muted">正在核对整单加价报价…</text>
        <view v-if="surchargeQuote && surchargeAmount" class="surcharge-breakdown">
          <view class="row amount"><text>原套餐</text><text>{{ surchargeQuote.base_amount_diamonds }} 钻石</text></view>
          <view class="row amount"><text>整单加价</text><text>{{ surchargeQuote.surcharge.amount_diamonds }} 钻石</text></view>
          <view class="row total"><text>报价总额</text><text>{{ surchargeQuote.total_amount_diamonds }} 钻石</text></view>
          <text class="muted">{{ surchargeQuote.required_players }}人均分；每人毛额 {{ surchargeQuote.surcharge.per_person_gross_diamonds }} 钻石等值，抽成 {{ surchargeQuote.surcharge.per_person_commission_diamonds }} 钻石等值，净额 {{ surchargeQuote.surcharge.per_person_net_diamonds }} 钻石等值（尚未结算为鱼干）</text>
          <text v-if="!surchargeQuote.can_submit || surchargeQuote.blockers.length" class="surcharge-alert">加价付款尚未开放：{{ surchargeQuote.blockers.join(' · ') || '服务端暂不可提交' }}</text>
        </view>
      </view>

      <view v-if="hasData" class="card amounts">
        <text class="title">钻石明细</text>
        <view v-if="selectedSpec && !isCartCheckout" class="row amount"><text>{{ isTargetedPlayerProduct ? '指定服务规格' : '基础规格' }}</text><text>{{ selectedSpec.name }}</text></view>
        <view v-if="!isCartCheckout && hourlyCurrent" class="row amount"><text>每小时钻石 × {{ effectiveHours }}小时</text><view class="diamond-value"><image class="diamond-unit" :src="uiIcons.diamond" mode="aspectFit" /><text>{{ diamondAmount(basePrice) }} × {{ effectiveHours }}</text></view></view>
        <view v-if="isCartCheckout" class="row amount"><text>{{ cartOrderCount }}个订单合计</text><view class="diamond-value"><image class="diamond-unit" :src="uiIcons.diamond" mode="aspectFit" /><text>{{ diamondAmount(totalAmount) }}</text></view></view>
        <view class="row total"><text>预计总钻石</text><view class="diamond-value"><image class="diamond-unit" :src="uiIcons.diamond" mode="aspectFit" /><text>{{ diamondAmount(totalAmount) }}</text></view></view>
      </view>

      <view v-if="!hasData" class="empty">{{ loading ? '商品加载中...' : '商品不存在或购物车已变化' }}</view>
      <view class="spacer"></view>
    </view>

    <view v-if="hasData && !fieldEditing" class="bottom">
      <view class="grow"><text class="muted">{{ isCartCheckout ? `共${cartOrderCount}个订单` : isTargetedPlayerProduct ? '支付成功后立即通知陪玩师' : hourlyCurrent ? `${effectiveHours}小时服务` : '预计总钻石' }}</text><view class="price diamond-value"><image class="diamond-unit" :src="uiIcons.diamond" mode="aspectFit" /><text>{{ diamondAmount(totalAmount) }}</text></view></view>
      <button data-action="submit-order" class="submit" :disabled="submitting || Boolean(blockReason) || (commerceRelease.orderSurchargeQuoteSupported && surchargeAmount !== 0 && !positiveQuoteReady)" @tap="submit">{{ submitting ? '提交中...' : isTargetedPlayerProduct ? '确认指定并支付' : isCartCheckout ? `发布${cartOrderCount}个订单` : '立即下单' }}</button>
      <button v-if="commerceRelease.orderSurchargeQuoteSupported && recoveryAvailable" data-action="recover-surcharge" @tap="recoverOriginal">查询原加价订单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { uiIcons } from '@/utils/uiIcons'
import { computed, reactive, ref, watch, onScopeDispose } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { commerceRelease } from '@/utils/commerceRelease'
import { parseWholeOrderAmount } from '@/utils/surchargePresentation'
import { quoteOrderSurcharge, type SurchargeQuote, type SurchargeQuoteRequest } from '@/api/surchargeQuote'
import { makeSurchargeIntent } from '@/utils/surchargeCheckoutIntent'
import { SESSION_CHANGED_EVENT } from '@/utils/storage'
import { SESSION_EXPIRED_EVENT } from '@/utils/sessionExpiry'
import { createOrder, getPackages, getPlayerServiceProducts, type BossPackage, type BossPackageSpec, type OrderCreatePayload } from '@/api/boss'
import { createCartOrderBatch } from '@/api/orderBatch'
import { createSharedListingOrder } from '@/api/serviceListings'
import { getClientProfile, syncClientProfile, type ClientProfile } from '@/utils/client'
import { diamondsFrom, formatDiamonds } from '@/utils/diamonds'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { go, goMain, replace } from '@/utils/nav'
import { isHourlyService, MAX_SERVICE_HOURS, normalizeServiceHours } from '@/utils/serviceBilling'
import { getStorage, setStorage } from '@/utils/storage'
import { getShopCart, type ShopCartItem } from '@/utils/shopCart'

const fallbackImage = 'https://api.huc125.cn/media/banners/hero-lounge.jpg'
const packageId = ref<number | null>(null)
const playerId = ref<number | null>(null)
const initialSpecId = ref('')
const cartItemIds = ref<string[]>([])
const requestedHours = ref(1)
const loading = ref(false)
const submitting = ref(false)
const fieldEditing = ref(false)
const product = ref<BossPackage | null>(null)
const selectedSpec = ref<BossPackageSpec | null>(null)
const cartItems = ref<ShopCartItem[]>([])
const form = reactive({ contact: '', gameId: '', note: '' })
const surchargeInput = ref(''), surchargeQuote = ref<SurchargeQuote | null>(null), surchargeError = ref(''), surchargePending = ref(false)
const surchargeAmount = computed(() => parseWholeOrderAmount(surchargeInput.value).amount)
let quoteGeneration = 0, quoteTimer: ReturnType<typeof setTimeout> | null = null, quoteVisible = true
let quotedSelection = ''
let checkoutIntent = makeSurchargeIntent(() => ({ account: String(getClientProfile()?.id || ''), token: String(getStorage<string>('token') || '') }))
const recoveryVersion = ref(0)
const recoveryAvailable = computed(() => { recoveryVersion.value; try { const d=checkoutIntent.state(); return Boolean(d && d.status !== 'paid' && d.cancelled_verified !== true) } catch { return false } })
const positiveQuoteReady = computed(() => Boolean(quoteVisible && !recoveryAvailable.value && !isCartCheckout.value && !isTargetedPlayerProduct.value && surchargeAmount.value && surchargeQuote.value?.can_submit
  && !surchargeQuote.value.blockers.length && !surchargePending.value && !surchargeError.value
  && quotedSelection === JSON.stringify(quotePayload(bossOpenid()))
  && surchargeQuote.value.surcharge.amount_diamonds === surchargeAmount.value
  && Number.isFinite(totalAmount.value) && surchargeQuote.value.base_amount_yuan === totalAmount.value.toFixed(2)
  && surchargeQuote.value.required_players === requiredPlayers.value))
function quotePayload(openid: string): SurchargeQuoteRequest { return { boss_wechat: openid, game_id: form.gameId.trim(), package_id: product.value?.id,
  spec_id: Number(selectedSpec.value?.id || 0) || null, quantity: effectiveHours.value, required_players: requiredPlayers.value,
  addon_details: null, boss_note: note(), booked_hours: effectiveHours.value, surcharge_diamonds: surchargeAmount.value || 0 } }
function clearQuote(clearInput = false) {
  quoteGeneration++
  if (quoteTimer) clearTimeout(quoteTimer)
  quoteTimer = null; surchargeQuote.value = null; quotedSelection = ''; surchargePending.value = false; surchargeError.value = ''
  if (clearInput) surchargeInput.value = ''
}
function inputSurcharge(event: { detail?: { value?: string } }) {
  surchargeInput.value = String(event.detail?.value ?? '')
  clearQuote()
  if (!commerceRelease.orderSurchargeQuoteSupported || !quoteVisible || isCartCheckout.value || isTargetedPlayerProduct.value) return
  if (surchargeAmount.value === null) { surchargeError.value = '请输入整单非负整数钻石'; return }
  if (!surchargeAmount.value) return
  const generation = quoteGeneration, amount = surchargeAmount.value
  const token = String(getStorage<string>('token') || ''), account = String(getClientProfile()?.id || '')
  if (!token || !account) { surchargeError.value = '请先登录后再报价'; return }
  surchargePending.value = true
  quoteTimer = setTimeout(async () => {
    quoteTimer = null
    try {
      const openid = await ensureOpenid()
      if (generation !== quoteGeneration || !quoteVisible || !sameQuoteSession(token, account)) return
      if (!openid) throw new Error('微信身份获取失败，未发起报价')
      const payload = quotePayload(openid)
      const selection = JSON.stringify(payload)
      const result = await quoteOrderSurcharge(payload)
      if (generation !== quoteGeneration || !quoteVisible || !sameQuoteSession(token, account) || selection !== JSON.stringify(quotePayload(openid)) || surchargeAmount.value !== amount) return
      surchargeQuote.value = JSON.parse(JSON.stringify(result))
      quotedSelection = selection
    } catch (error: any) {
      if (generation === quoteGeneration && quoteVisible && sameQuoteSession(token, account)) surchargeError.value = getErrorMessage(error, '加价报价失败，请重新确认')
    } finally { if (generation === quoteGeneration) surchargePending.value = false }
  }, 280)
}
function sameQuoteSession(token: string, account: string) { return token === String(getStorage<string>('token') || '') && account === String(getClientProfile()?.id || '') }
function clearCheckoutIntent() { quoteVisible = false; clearQuote(true); checkoutIntent.close(); recoveryVersion.value++ }
function changedCheckoutSession() { clearQuote(true); checkoutIntent.close(); checkoutIntent = makeSurchargeIntent(() => ({ account: String(getClientProfile()?.id || ''), token: String(getStorage<string>('token') || '') })); recoveryVersion.value++ }
function expiredCheckoutSession(scope: string) { if (scope === 'token') changedCheckoutSession() }
onShow(() => { quoteVisible = true; clearQuote(true); checkoutIntent = makeSurchargeIntent(() => ({ account: String(getClientProfile()?.id || ''), token: String(getStorage<string>('token') || '') })); recoveryVersion.value++ })
onHide(clearCheckoutIntent); onUnload(clearCheckoutIntent)
uni.$on(SESSION_CHANGED_EVENT, changedCheckoutSession)
uni.$on(SESSION_EXPIRED_EVENT, expiredCheckoutSession)
onScopeDispose(() => { clearCheckoutIntent(); uni.$off(SESSION_CHANGED_EVENT, changedCheckoutSession); uni.$off(SESSION_EXPIRED_EVENT, expiredCheckoutSession) })
let fieldBlurTimer: ReturnType<typeof setTimeout> | null = null

const isCartCheckout = computed(() => cartItemIds.value.length > 0)
const isTargetedPlayerProduct = computed(() => product.value?.selling_mode === 'player_designated')
const currentListingId = computed(() => Number(selectedSpec.value?.listing_id || product.value?.listing_id || 0))
const hasData = computed(() => isCartCheckout.value ? cartItems.value.length > 0 : Boolean(product.value))
const allSpecs = computed(() => [...(product.value?.specs || [])].filter(item => item.is_active !== false).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)))
const requiredPlayers = computed(() => isTargetedPlayerProduct.value ? 1 : Math.max(1, Number(product.value?.player_count || 1)))
const basePrice = computed(() => Number(selectedSpec.value?.price ?? product.value?.base_price ?? 0))
const productImage = computed(() => product.value?.cover_url || product.value?.image_url || product.value?.thumb_url || product.value?.picture_url || fallbackImage)
const hourlyCurrent = computed(() => isHourlyService(product.value))
const effectiveHours = computed(() => hourlyCurrent.value ? normalizeServiceHours(requestedHours.value) : 1)
const cartOrderCount = computed(() => cartItems.value.length)
const totalAmount = computed(() => isCartCheckout.value ? cartItems.value.reduce((sum, item) => sum + itemAmount(item), 0) : basePrice.value * effectiveHours.value)
watch(() => [product.value?.id, selectedSpec.value?.id, effectiveHours.value, form.gameId, form.note], () => {
  if (surchargeAmount.value && quoteVisible) inputSurcharge({detail:{value:surchargeInput.value}})
}, { flush:'sync' })
const blockReason = computed(() => {
  if (!hasData.value) return ''
  if (isCartCheckout.value && cartItems.value.length !== cartItemIds.value.length) return '部分购物车商品已变化，请返回购物车重新选择。'
  if (isCartCheckout.value && cartOrderCount.value > 20) return '单次最多结算20项商品。'
  if (!isCartCheckout.value && allSpecs.value.length && !selectedSpec.value) return '请选择规格。'
  if (isTargetedPlayerProduct.value && !product.value?.owner_player_id) return '该陪玩师商品配置异常，请稍后再试。'
  return ''
})
const readyText = computed(() => {
  if (isCartCheckout.value) return `共${cartItems.value.length}项商品，每项生成1个订单；陪玩商品数量代表服务时长。`
  if (isTargetedPlayerProduct.value) return `本单仅邀请${product.value?.owner_player_name || '该陪玩师'}；支付成功后发送微信通知，拒绝或超时将自动退款。`
  return selectedSpec.value ? `已选择“${selectedSpec.value.name}”，${hourlyCurrent.value ? `${effectiveHours.value}小时` : '按单'}合计💎${diamondAmount(totalAmount.value)}。` : '可使用已有钻石或微信即时支付。'
})

function quantity(value: unknown) { return normalizeServiceHours(value) }
function isHourlyItem(item: ShopCartItem) { return isHourlyService(item) }
function itemHours(item: ShopCartItem) { return isHourlyItem(item) ? quantity(item.quantity) : 1 }
function itemAmount(item: ShopCartItem) { return Number(item.price || 0) * itemHours(item) }
function diamondAmount(yuanValue: number | string) {
  try { return formatDiamonds(diamondsFrom(undefined, yuanValue)) }
  catch { return '--' }
}
function specDiamonds(spec: BossPackageSpec) {
  const value = spec as BossPackageSpec & Record<string, any>
  try { return formatDiamonds(diamondsFrom(value.price_diamonds, spec.price)) }
  catch { return '--' }
}
function bossOpenid(profile: ClientProfile | null = getClientProfile()) { return profile?.openid || profile?.open_id || profile?.wechat_openid || '' }
async function ensureOpenid() { const local = bossOpenid(); if (local) return local; try { return bossOpenid(await syncClientProfile()) } catch { return '' } }
function handleFieldFocus() { if (fieldBlurTimer) clearTimeout(fieldBlurTimer); fieldBlurTimer = null; fieldEditing.value = true }
function handleFieldBlur() { if (fieldBlurTimer) clearTimeout(fieldBlurTimer); fieldBlurTimer = setTimeout(() => { fieldEditing.value = false }, 120) }
function adjustHours(delta: number) { const next = effectiveHours.value + delta; if (next < 1 || next > MAX_SERVICE_HOURS) return; requestedHours.value = next }
function syncSpec() { selectedSpec.value = allSpecs.value.find(item => String(item.id) === initialSpecId.value) || allSpecs.value.find(item => Number(item.id) === Number(selectedSpec.value?.id || 0)) || allSpecs.value[0] || null }
function chooseSpec(spec: BossPackageSpec) { selectedSpec.value = spec }
async function fetchProduct() {
  if (!packageId.value) return
  loading.value = true
  try {
    const products = playerId.value ? (await getPlayerServiceProducts(playerId.value)).products : await getPackages()
    product.value = products.find(item => item.id === packageId.value) || null
    if (!isHourlyService(product.value)) requestedHours.value = 1
    syncSpec()
  } catch (error) { toast(getErrorMessage(error, '商品加载失败')) } finally { loading.value = false }
}
async function fetchCart() { loading.value = true; try { const ids = new Set(cartItemIds.value); cartItems.value = (await getShopCart()).filter(item => ids.has(String(item.id))) } catch (error) { toast(getErrorMessage(error, '购物车加载失败')) } finally { loading.value = false } }
function note() { const lines: string[] = []; if (hourlyCurrent.value) lines.push(`预订时长：${effectiveHours.value}小时`); if (selectedSpec.value) lines.push(`规格：${selectedSpec.value.name}，预计总价：💎${diamondAmount(totalAmount.value)}`); if (form.note.trim()) lines.push(form.note.trim()); return lines.join('\n') || null }

async function submit() {
  if (submitting.value) return
  if (blockReason.value) return toast(blockReason.value)
  if (commerceRelease.orderSurchargeQuoteSupported && surchargeAmount.value !== 0 && !positiveQuoteReady.value) return toast(surchargeAmount.value === null ? '请输入整单非负整数钻石' : '加价报价不可提交：服务端尚未开放、金额或选择已变化，请重新报价')
  if (!getStorage<string>('token')) { toast('请先微信登录'); go('/pages/client/login/index'); return }
  if (!form.contact.trim() || !form.gameId.trim()) return toast('请填写联系昵称和游戏ID/队伍码')
  submitting.value = true
  const positive = Boolean(commerceRelease.orderSurchargeQuoteSupported && surchargeAmount.value)
  const generation = quoteGeneration, token = String(getStorage<string>('token') || ''), account = String(getClientProfile()?.id || '')
  try {
    const openid = await ensureOpenid(); if (!openid) { toast('微信身份获取失败'); return }
    if (positive) {
      if (generation !== quoteGeneration || !quoteVisible || !sameQuoteSession(token,account)
        || !positiveQuoteReady.value || quotedSelection !== JSON.stringify(quotePayload(openid))) return toast('报价或会话已变化，请重新确认，未创建订单')
      const quote = surchargeQuote.value!
      const res = await checkoutIntent.create(quotePayload(openid), quote)
      if (generation !== quoteGeneration || !quoteVisible || !sameQuoteSession(token,account)) return
      recoveryVersion.value++
      replace('/pages/boss/surcharge-payment/index', { key: res.checkout.idempotency_key })
      return
    }
    setStorage('boss_wechat', form.contact.trim())
    if (isCartCheckout.value) {
      const result = await createCartOrderBatch({ boss_wechat: openid, game_id: form.gameId.trim(), cart_item_ids: cartItems.value.map(item => Number(item.id)), boss_note: form.note.trim() || null })
      success(`已发布${result.order_count}个订单`)
      if (result.order_count === 1 && result.order_nos[0]) replace('/pages/boss/waiting/index', { orderNo: result.order_nos[0] }); else goMain('query')
      return
    }
    const hours = effectiveHours.value
    const payload: OrderCreatePayload = { boss_wechat: openid, game_id: form.gameId.trim(), package_id: product.value?.id, spec_id: Number(selectedSpec.value?.id || 0) || null, quantity: hours, required_players: requiredPlayers.value, addon_details: null, boss_note: note(), booked_hours: hours }
    const res = isTargetedPlayerProduct.value && currentListingId.value > 0
      ? await createSharedListingOrder({ ...payload, listing_id: currentListingId.value })
      : await createOrder(payload)
    success(isTargetedPlayerProduct.value ? '指定订单已创建，请完成支付' : '下单成功')
    replace('/pages/boss/waiting/index', { orderNo: res.order_no })
  } catch (error) { toast(getErrorMessage(error, '创建订单失败')) } finally { if (positive) recoveryVersion.value++; submitting.value = false }
}
async function recoverOriginal() {
  if (submitting.value || !commerceRelease.orderSurchargeQuoteSupported) return
  submitting.value = true
  try {
    const item = checkoutIntent.state()
    if (!item) return toast('无原加价订单')
    // Route holds only the opaque original key; never personal fields or wx.login code.
    replace('/pages/boss/surcharge-payment/index', { key: item.key })
  } catch (e) { toast(getErrorMessage(e, '原单查询失败')) } finally { submitting.value = false }
}

onLoad(query => {
  cartItemIds.value = query?.cartItemIds ? Array.from(new Set(String(query.cartItemIds).split(',').filter(Boolean))) : []
  packageId.value = Number(query?.packageId) || null
  const targetPlayer = Number(query?.playerId)
  playerId.value = Number.isFinite(targetPlayer) && targetPlayer > 0 ? targetPlayer : null
  initialSpecId.value = query?.specId ? String(query.specId) : ''
  requestedHours.value = normalizeServiceHours(query?.quantity || 1)
  form.contact = getStorage<string>('boss_wechat') || getClientProfile()?.nickname || ''
  cartItemIds.value.length ? void fetchCart() : void fetchProduct()
})
</script>

<style lang="scss" src="./index.scss" scoped></style>

<style scoped>
.diamond-value.diamond-value { display: inline-flex; align-items: center; gap: 4rpx; vertical-align: middle; padding: 0; border-radius: 0; background: transparent; }
.diamond-value.diamond-value > text { display: inline; color: inherit; font-size: inherit; font-weight: inherit; margin: 0; }
.diamond-unit, .diamond-value .diamond-unit { display: inline-block; width: 26rpx; height: 26rpx; flex-shrink: 0; vertical-align: middle; border-radius: 0; }
.surcharge-choice { background: #fffdf6; }
.surcharge-choice input { margin-top: 18rpx; min-height: 84rpx; padding: 0 22rpx; border: 1rpx solid #dceadd; border-radius: 18rpx; background: #f7faf4; color: #172116; }
.surcharge-breakdown { margin-top: 18rpx; }
.surcharge-alert { display: block; margin-top: 12rpx; color: #9a6a16; font-size: 24rpx; }
</style>
