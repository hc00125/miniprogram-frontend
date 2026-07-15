<template>
  <view class="checkout-page">
    <scroll-view scroll-y class="checkout-scroll">
      <view v-if="isCartCheckout && cartItems.length" class="card">
        <view class="card-head"><view><text class="card-title">购物车结算</text><text class="card-subtitle">当前版本一次结算一个商品规格</text></view><text class="count-pill">{{ cartQuantity }}件</text></view>
        <view v-for="item in cartItems" :key="item.id" class="merge-item"><image v-if="item.image_url" class="item-image" :src="item.image_url" mode="aspectFill" /><view v-else class="item-image empty">{{ item.package_name.slice(0, 1) }}</view><view class="item-main"><text>{{ item.package_name }}</text><text>{{ item.spec_display_name || item.spec_name || '固定价格商品' }}</text><text>¥{{ formatMoney(item.price) }} × {{ normalizeQuantity(item.quantity) }}</text></view><text class="item-total">¥{{ formatMoney(itemAmount(item)) }}</text></view>
      </view>

      <view v-else-if="product" class="card product-card"><image class="product-image" :src="productImage" mode="aspectFill" /><view class="product-main"><view><text class="product-name">{{ product.name }}</text><text class="product-tag">{{ isGuaranteeProduct ? '保底单' : product.group_name || '套餐' }}</text></view><text class="product-desc">{{ productDesc }}</text><view class="price-row"><text>¥</text><text>{{ formatMoney(basePrice) }}</text><text>{{ isSpecProduct ? '/单' : '/时/人' }}</text></view></view></view>

      <view v-if="designatedPlayer" class="card designate-card"><view class="card-head"><view><text class="card-title">已指定陪玩</text><text class="card-subtitle">指定本人不额外加价；仅展示匹配其类型的规格</text></view><button @tap="removeDesignation">取消指定</button></view><view class="designate-player"><image v-if="designatedPlayer.avatar_url" :src="designatedPlayer.avatar_url" mode="aspectFill" /><view v-else class="empty avatar">{{ designatedPlayer.name?.[0] || '陪' }}</view><view><text>{{ designatedPlayer.name }}</text><text>{{ designatedPlayer.type_name }} · {{ designatedPlayer.is_online ? '在线' : '离线' }}</text></view><text>指定费 ¥0</text></view></view>

      <view v-if="!isCartCheckout && product && specs.length" class="card"><view class="card-head"><view><text class="card-title">{{ isGuaranteeProduct ? '选择保底规格' : '选择规格' }}</text><text class="card-subtitle">{{ designatedPlayer ? `仅展示适用于“${designatedPlayer.type_name}”的规格` : '固定价格规格可使用微信官方虚拟支付' }}</text></view><text class="count-pill">{{ specs.length }}档</text></view><view class="spec-grid"><view v-for="spec in specs" :key="spec.id" class="spec-chip" :class="{ active: selectedSpec?.id === spec.id }" @tap="selectSpec(spec)"><text>{{ spec.name }}</text><text v-if="spec.required_player_type_name">仅限 {{ spec.required_player_type_name }}</text><text>¥{{ formatMoney(Number(spec.price || 0)) }}</text></view></view></view>

      <view v-if="hasCheckoutData" class="pay-rule-card" :class="{ blocked: Boolean(virtualPayBlockReason) }"><text class="rule-icon">{{ virtualPayBlockReason ? '!' : '✓' }}</text><view><text>{{ virtualPayBlockReason ? '当前组合暂不能下单' : '可使用微信官方虚拟支付' }}</text><text>{{ virtualPayBlockReason || virtualPayReadyText }}</text></view></view>

      <view v-if="hasCheckoutData" class="card">
        <text class="card-title standalone-title">下单信息</text>
        <view class="field"><text>订单联系称呼</text><input v-model="form.contact" placeholder="请输入客服和陪玩识别你的称呼" /><text class="field-tip">该称呼会随订单备注提交，供客服和陪玩核对。</text></view>
        <view class="field"><text>游戏ID / 队伍码</text><input v-model="form.gameId" placeholder="请输入游戏ID或队伍码" /></view>
        <view v-if="!isCartCheckout" class="field"><text>购买数量</text><view class="stepper"><button :disabled="form.quantity <= 1" @tap="adjustQuantity(-1)">−</button><text>{{ form.quantity }}</text><button @tap="adjustQuantity(1)">＋</button></view><text class="field-tip">同一固定价格规格可以购买多份</text></view>
        <view v-if="!isCartCheckout && !isSpecProduct" class="dynamic-grid"><view class="field"><text>人数</text><view class="stepper"><button @tap="adjustPlayerCount(-1)">−</button><text>{{ form.playerCount }}</text><button @tap="adjustPlayerCount(1)">＋</button></view></view><view class="field"><text>预订时长</text><view class="stepper"><button @tap="adjustHours(-0.5)">−</button><text>{{ formatHours(form.bookedHours) }}</text><button @tap="adjustHours(0.5)">＋</button></view></view></view>
        <view class="field"><text>订单备注</text><textarea v-model="form.note" maxlength="80" placeholder="其他需求（选填）" /><text class="field-tip">{{ form.note.length }}/80</text></view>
      </view>

      <view v-if="hasCheckoutData" class="card amount-card"><text class="card-title standalone-title">费用明细</text><template v-if="isCartCheckout"><view class="amount-line"><text>商品项目</text><text>{{ cartItems.length }}项</text></view><view class="amount-line"><text>商品数量</text><text>×{{ cartQuantity }}</text></view></template><template v-else><view v-if="selectedSpec" class="amount-line"><text>已选规格</text><text>{{ selectedSpec.name }}</text></view><view class="amount-line"><text>{{ isSpecProduct ? '规格单价' : '套餐单价' }}</text><text>¥{{ formatMoney(basePrice) }}</text></view><view class="amount-line"><text>购买数量</text><text>×{{ form.quantity }}</text></view><view v-if="!isSpecProduct" class="amount-line"><text>人数与时长</text><text>{{ form.playerCount }}人 · {{ formatHours(form.bookedHours) }}</text></view></template><view v-if="designatedPlayer" class="amount-line"><text>指定陪玩服务费</text><text>¥0.00</text></view><view class="amount-line total"><text>预计总额</text><text>¥{{ formatMoney(totalAmount) }}</text></view></view>

      <view v-if="!hasCheckoutData" class="empty-state"><text>{{ loading ? '商品加载中...' : '商品不存在或购物车已变化' }}</text><button v-if="!loading" @tap="goBack">返回点单页</button></view>
      <view class="bottom-spacer"></view>
    </scroll-view>

    <view v-if="hasCheckoutData" class="bottom-bar"><view><text>{{ designatedPlayer ? `指定 ${designatedPlayer.name}` : '预计总额' }}</text><text>¥{{ formatMoney(totalAmount) }}</text></view><button :disabled="submitting || Boolean(virtualPayBlockReason)" @tap="submitOrder">{{ submitting ? '提交中...' : (virtualPayBlockReason ? '当前组合不可下单' : '立即下单') }}</button></view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { createOrder, getMyBossOrders, getPackages, type BossOrderListItem, type BossPackage, type BossPackageSpec, type OrderCreateItemPayload } from '@/api/boss'
import { getClientProfile, syncClientProfile, type ClientProfile } from '@/utils/client'
import { formatHours } from '@/utils/format'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { backToRoute, relaunch, replace } from '@/utils/nav'
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
const specs = computed(() => !designatedPlayer.value || !designatedPlayerTypeId.value ? allSpecs.value : allSpecs.value.filter(spec => { const requiredTypeId = Number(spec.required_player_type_id || 0); return !requiredTypeId || requiredTypeId === designatedPlayerTypeId.value }))
const isGuaranteeProduct = computed(() => Boolean(product.value && (product.value.product_type === 'guarantee' || product.value.name.includes('保底'))))
const isSpecProduct = computed(() => Boolean(allSpecs.value.length) || product.value?.product_type === 'guarantee' || product.value?.product_type === 'escort')
const productImage = computed(() => product.value ? getProductImage(product.value) : fallbackImage)
const productDesc = computed(() => selectedSpec.value?.description || selectedSpec.value?.name || product.value?.description || '商品内容与价格以后端当前配置为准')
const basePrice = computed(() => selectedSpec.value ? Number(selectedSpec.value.price || 0) : (allSpecs.value.length ? 0 : (product.value ? getDisplayPrice(product.value) : 0)))
const unitAmount = computed(() => isSpecProduct.value ? basePrice.value : basePrice.value * form.playerCount * form.bookedHours)
const singleTotalAmount = computed(() => unitAmount.value * form.quantity)
const cartQuantity = computed(() => cartItems.value.reduce((sum, item) => sum + normalizeQuantity(item.quantity), 0))
const cartTotalAmount = computed(() => cartItems.value.reduce((sum, item) => sum + itemAmount(item), 0))
const totalAmount = computed(() => isCartCheckout.value ? cartTotalAmount.value : singleTotalAmount.value)

function specMatchesDesignatedPlayer(spec: BossPackageSpec | null | undefined) { if (!spec || !designatedPlayer.value) return true; const requiredTypeId = Number(spec.required_player_type_id || 0); return !requiredTypeId || (designatedPlayerTypeId.value > 0 && requiredTypeId === designatedPlayerTypeId.value) }
const virtualPayBlockReason = computed(() => {
  if (!hasCheckoutData.value) return ''
  if (designatedPlayer.value && isCartCheckout.value) return '指定陪玩暂不支持购物车结算，请从商品详情直接购买。'
  if (isCartCheckout.value && cartItems.value.length !== 1) return '当前版本一次只支持结算一个商品规格。'
  if (designatedPlayer.value && !designatedPlayerTypeId.value) return '指定陪玩的类型信息已过期，请取消指定后重新选择。'
  if (designatedPlayer.value && allSpecs.value.length && !specs.value.length) return `当前商品没有适用于“${designatedPlayer.value.type_name}”的规格。`
  if (designatedPlayer.value && selectedSpec.value && !specMatchesDesignatedPlayer(selectedSpec.value)) return '所选规格与指定陪玩类型不匹配。'
  if (!isCartCheckout.value && !isSpecProduct.value) return '当前阶段暂不支持按人数和时长动态计价，请选择固定价格规格。'
  if (!isCartCheckout.value && allSpecs.value.length && !selectedSpec.value) return '请选择一个固定价格规格。'
  return ''
})
const virtualPayReadyText = computed(() => designatedPlayer.value && selectedSpec.value ? `将按“${selectedSpec.value.name}”价格发出10分钟指定邀请。` : (isCartCheckout.value ? '已选择一个固定价格商品，同一规格数量可大于1。' : `已选择“${selectedSpec.value?.name || ''}”，支付时将核对规格和数量。`))

function normalizeQuantity(value: unknown) { const number = Math.floor(Number(value || 1)); return Number.isFinite(number) ? Math.max(1, Math.min(99, number)) : 1 }
function itemAmount(item: ShopCartItem) { return Number(item.price || 0) * normalizeQuantity(item.quantity) }
function itemSpecId(item: ShopCartItem) { const id = Number(item.spec_id || item.spec_id_snapshot || 0); return Number.isFinite(id) && id > 0 ? id : null }
function getProductImage(item: BossPackage) { const current = item as BossPackage & Record<string, any>; return current.cover_url || current.image_url || current.thumb_url || current.picture_url || fallbackImage }
function getDisplayPrice(item: BossPackage) { const prices = (item.specs || []).map(spec => Number(spec.price || 0)).filter(price => Number.isFinite(price) && price >= 0); return prices.length ? Math.min(...prices) : Number(item.base_price || 0) }
function getPackagePlayerCount(item: BossPackage | null | undefined) { return Math.max(1, Math.min(Number(item?.player_count || 1), MAX_PLAYER_COUNT)) }
function formatMoney(value: number) { return Number.isInteger(value) ? `${value}` : Number(value || 0).toFixed(2) }
function getBossOpenid(profile: ClientProfile | null = getClientProfile()) { return profile?.openid || profile?.open_id || profile?.wechat_openid || '' }
async function ensureBossOpenid() { const local = getBossOpenid(); if (local) return local; try { return getBossOpenid(await syncClientProfile()) } catch { return '' } }
function getUnfinishedOrders(orders: BossOrderListItem[]) { return orders.filter(order => unfinishedStatuses.includes(order.status)) }
function showUnfinishedOrders(orders: BossOrderListItem[]) { const lines = orders.slice(0, 5).map(order => `${order.order_no}（${order.status}）`).join('\n'); uni.showModal({ title: '无法下单', content: `您有未完成的订单，请先完成后再下单\n${lines}`, showCancel: false }) }
function syncSelectedSpec() { const next = specs.value; if (!next.length) { selectedSpec.value = null; return }; const preferred = next.find(item => String(item.id) === initialSpecId.value); const current = next.find(item => String(item.id) === String(selectedSpec.value?.id || '')); selectedSpec.value = preferred || current || next[0] }
async function fetchCartCheckout() { loading.value = true; try { const selectedIds = new Set(cartItemIds.value); cartItems.value = (await getShopCart()).filter(item => selectedIds.has(String(item.id))); if (!cartItems.value.length) toast('选中的购物车商品不存在或已删除') } catch (error) { toast(getErrorMessage(error, '购物车加载失败')) } finally { loading.value = false } }
async function fetchProduct() { if (!packageId.value) return; loading.value = true; try { const matched = (await getPackages()).find(item => item.id === packageId.value) || null; product.value = matched; if (matched) form.playerCount = getPackagePlayerCount(matched); syncSelectedSpec() } catch (error) { toast(getErrorMessage(error, '商品加载失败')) } finally { loading.value = false } }
function selectSpec(spec: BossPackageSpec) { if (!specMatchesDesignatedPlayer(spec)) return toast('该规格与指定陪玩类型不匹配'); selectedSpec.value = spec }
function adjustQuantity(delta: number) { const next = form.quantity + delta; if (next < 1) return; if (next > 99) return toast('单次最多选择99件'); form.quantity = next }
function adjustPlayerCount(delta: number) { const next = form.playerCount + delta; if (next < 1) return; if (next > MAX_PLAYER_COUNT) return toast(`下单人数最多${MAX_PLAYER_COUNT}人`); form.playerCount = next }
function adjustHours(delta: number) { const next = Math.round((form.bookedHours + delta) * 10) / 10; if (next >= .5) form.bookedHours = next }
function buildBossNote() { const parts = [`订单联系称呼：${form.contact.trim()}`]; if (designatedPlayer.value) parts.push(`指定陪玩：${designatedPlayer.value.name}（${designatedPlayer.value.type_name}，指定本人不加价）`); if (!isCartCheckout.value && selectedSpec.value) parts.push(`规格：${selectedSpec.value.name}，价格：¥${formatMoney(Number(selectedSpec.value.price || 0))}`); if (!isCartCheckout.value && form.quantity > 1) parts.push(`购买数量：${form.quantity}`); if (form.note.trim()) parts.push(form.note.trim()); return parts.join('\n') }
function buildMergedItems(): OrderCreateItemPayload[] { return cartItems.value.map(item => ({ package_id: Number(item.package_id), spec_id: itemSpecId(item), quantity: normalizeQuantity(item.quantity), spec_display_name: item.spec_display_name || item.spec_name || '', image_url: item.image_url || '', description: item.description || '' })) }
async function removeMergedCartItems() { for (const item of cartItems.value) { try { await removeShopCartItem(item.id) } catch {} } }
function removeDesignation() { clearDesignatedPlayer(); designatedPlayer.value = null; syncSelectedSpec(); toast('已取消指定陪玩') }
async function submitOrder() {
  if (!hasCheckoutData.value) return toast('商品不存在')
  if (virtualPayBlockReason.value) return toast(virtualPayBlockReason.value)
  if (!getStorage<string>('token')) { toast('请先微信登录'); replace('/pages/client/login/index'); return }
  if (!form.contact.trim()) return toast('请填写订单联系称呼')
  if (!form.gameId.trim()) return toast('请填写游戏ID/队伍码')
  const bossWechat = await ensureBossOpenid()
  if (!bossWechat) return toast('微信身份获取失败，请重新登录')
  submitting.value = true
  try {
    const unfinishedOrders = getUnfinishedOrders(await getMyBossOrders())
    if (unfinishedOrders.length) { showUnfinishedOrders(unfinishedOrders); return }
    const mergedItems = isCartCheckout.value ? buildMergedItems() : undefined
    const result = await createOrder({ boss_wechat: bossWechat, game_id: form.gameId.trim(), package_id: isCartCheckout.value ? mergedItems?.[0]?.package_id : product.value?.id, spec_id: !isCartCheckout.value && selectedSpec.value ? Number(selectedSpec.value.id) : null, quantity: form.quantity, items: mergedItems, required_players: isCartCheckout.value || isSpecProduct.value ? 1 : form.playerCount, addon_details: null, designated_players: designatedPlayer.value ? [Number(designatedPlayer.value.id)] : null, boss_note: buildBossNote(), booked_hours: isCartCheckout.value || isSpecProduct.value ? 1 : form.bookedHours })
    if (isCartCheckout.value) await removeMergedCartItems()
    setStorage('boss_wechat', form.contact.trim())
    clearDesignatedPlayer()
    success('下单成功')
    relaunch('/pages/boss/waiting/index', { orderNo: result.order_no })
  } catch (error) { toast(getErrorMessage(error, '创建订单失败')) }
  finally { submitting.value = false }
}
function goBack() { backToRoute('/pages/shop/category/index') }
onLoad(query => { cartItemIds.value = query?.cartItemIds ? String(query.cartItemIds).split(',').filter(Boolean) : []; const id = Number(query?.packageId); packageId.value = Number.isFinite(id) ? id : null; initialSpecId.value = query?.specId ? String(query.specId) : ''; form.quantity = normalizeQuantity(query?.quantity); form.contact = getStorage<string>('boss_wechat') || getClientProfile()?.nickname || ''; designatedPlayer.value = getDesignatedPlayer(); if (cartItemIds.value.length) fetchCartCheckout(); else fetchProduct() })
onShow(() => { designatedPlayer.value = getDesignatedPlayer(); syncSelectedSpec() })
</script>

<style lang="scss" scoped>
.checkout-page{min-height:100vh;color:#172116;background:#f7f3ea}.checkout-scroll{height:100vh}.card,.pay-rule-card{margin:20rpx;padding:24rpx;border-radius:24rpx;background:#fff;box-shadow:0 10rpx 28rpx rgba(39,61,42,.06)}.card-head{display:flex;justify-content:space-between;gap:16rpx;margin-bottom:18rpx}.card-head>view{flex:1}.card-title,.card-subtitle{display:block}.card-title{font-size:29rpx;font-weight:900}.card-subtitle{margin-top:5rpx;color:#879083;font-size:21rpx;line-height:1.45}.count-pill{padding:6rpx 12rpx;border-radius:999rpx;color:#1f7c4b;background:#eef8f1}.product-card{display:flex;gap:18rpx}.product-image{width:138rpx;height:138rpx;border-radius:18rpx}.product-main{flex:1;min-width:0}.product-main>view:first-child{display:flex;gap:12rpx}.product-name{flex:1;font-size:29rpx;font-weight:900}.product-tag{padding:6rpx 10rpx;border-radius:999rpx;color:#a87520;background:#fff5df;font-size:19rpx}.product-desc{display:block;margin-top:9rpx;color:#7d877a;font-size:21rpx}.price-row{display:flex;align-items:baseline;margin-top:14rpx;color:#a87520}.price-row text:nth-child(2){font-size:38rpx;font-weight:900}.merge-item{display:flex;align-items:center;gap:14rpx;padding:14rpx;border-radius:18rpx;background:#f7faf4}.item-image{width:94rpx;height:94rpx;border-radius:16rpx}.empty{display:flex;align-items:center;justify-content:center;color:#fff;background:#1f7c4b}.item-main{flex:1;min-width:0}.item-main text{display:block}.item-main text:first-child{font-weight:900}.item-main text:not(:first-child){margin-top:4rpx;color:#879083;font-size:20rpx}.item-total{color:#a87520;font-weight:900}.designate-card{background:linear-gradient(135deg,#f2faf4,#fffaf0)}.designate-card button{margin:0;color:#a13d35;background:#fff0ed}.designate-player{display:flex;align-items:center;gap:14rpx}.designate-player>image,.avatar{width:76rpx;height:76rpx;border-radius:20rpx}.designate-player>view:nth-child(3){flex:1}.designate-player view text{display:block}.designate-player view text:first-child{font-weight:900}.designate-player view text:last-child{margin-top:4rpx;color:#879083;font-size:20rpx}.designate-player>text{color:#1f7c4b;font-size:20rpx;font-weight:900}.spec-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12rpx}.spec-chip{padding:16rpx;border-radius:16rpx;background:#f5f5f5;border:2rpx solid transparent}.spec-chip.active{border-color:#1f7c4b;background:#eef8f1}.spec-chip text{display:block}.spec-chip text:not(:first-child){margin-top:5rpx;color:#7d877a;font-size:19rpx}.pay-rule-card{display:flex;align-items:flex-start;gap:14rpx;background:#eef8f1}.pay-rule-card.blocked{color:#8f4d35;background:#fff0ed}.rule-icon{width:38rpx;height:38rpx;display:flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;background:#1f7c4b}.blocked .rule-icon{background:#a13d35}.pay-rule-card>view{flex:1}.pay-rule-card view text{display:block}.pay-rule-card view text:first-child{font-weight:900}.pay-rule-card view text:last-child{margin-top:5rpx;font-size:21rpx;line-height:1.45}.standalone-title{margin-bottom:18rpx}.field{padding:16rpx 0;border-bottom:1rpx solid #eee}.field>text:first-child{display:block;font-size:23rpx;font-weight:900}.field input,.field textarea{width:100%;margin-top:10rpx;padding:15rpx;border-radius:14rpx;background:#f7faf4;box-sizing:border-box}.field textarea{height:130rpx}.field-tip{display:block;margin-top:7rpx;color:#879083;font-size:19rpx}.stepper{display:flex;align-items:center;justify-content:flex-end;margin-top:10rpx}.stepper button{width:58rpx;height:58rpx;margin:0}.stepper>text{width:80rpx;text-align:center;font-weight:900}.dynamic-grid{display:grid;grid-template-columns:1fr 1fr;gap:12rpx}.amount-line{min-height:58rpx;display:flex;align-items:center;justify-content:space-between;border-bottom:1rpx solid #eee}.amount-line text:first-child{color:#879083}.amount-line text:last-child{font-weight:900}.amount-line.total text:last-child{color:#a87520;font-size:30rpx}.empty-state{min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center}.empty-state button{margin-top:20rpx}.bottom-spacer{height:160rpx}.bottom-bar{position:fixed;left:0;right:0;bottom:0;z-index:20;display:flex;align-items:center;gap:16rpx;padding:16rpx 22rpx calc(16rpx + env(safe-area-inset-bottom));background:#fff}.bottom-bar>view{flex:1}.bottom-bar view text{display:block}.bottom-bar view text:first-child{color:#879083;font-size:20rpx}.bottom-bar view text:last-child{color:#a87520;font-size:34rpx;font-weight:900}.bottom-bar button{min-width:260rpx;height:78rpx;margin:0;border-radius:999rpx;color:#fff;background:#1f7c4b}.bottom-bar button[disabled]{opacity:.5}
</style>
