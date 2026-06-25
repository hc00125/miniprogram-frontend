<template>
  <view class="shop-checkout-page">
    <scroll-view scroll-y class="checkout-scroll">
      <view v-if="product" class="product-card">
        <image class="product-image" :src="productImage" mode="aspectFill" />
        <view class="product-main">
          <text class="product-name">{{ product.name }}</text>
          <text class="product-desc">{{ selectedSpec?.name || product.description || '精选套餐，平台保障，快速匹配陪玩。' }}</text>
          <view class="price-row">
            <text class="price-symbol">¥</text>
            <text class="price-value">{{ formatMoney(basePrice) }}</text>
            <text class="price-unit">{{ isSpecProduct ? '/单' : '/时/人' }}</text>
          </view>
        </view>
      </view>

      <view v-if="product && specs.length" class="checkout-card spec-card">
        <view class="card-title">选择规格</view>
        <view class="spec-grid">
          <view
            v-for="spec in specs"
            :key="spec.id"
            class="spec-chip"
            :class="{ active: selectedSpec?.id === spec.id }"
            @tap="selectSpec(spec)"
          >
            <text>{{ spec.name }}</text>
            <text>¥{{ formatMoney(Number(spec.price)) }}</text>
          </view>
        </view>
      </view>

      <view v-if="product" class="checkout-card">
        <view class="card-title">下单信息</view>
        <view class="input-row">
          <text class="input-label">联系昵称</text>
          <input v-model="form.contact" class="checkout-input" placeholder="请输入您的联系昵称" />
        </view>
        <view class="input-row">
          <text class="input-label">游戏ID / 队伍码</text>
          <input v-model="form.gameId" class="checkout-input" placeholder="请输入游戏ID或队伍码" />
        </view>
        <view v-if="!isSpecProduct" class="control-row">
          <view class="control-item">
            <text class="input-label">人数</text>
            <view class="stepper">
              <button class="step-btn" @tap="adjustPlayerCount(-1)">−</button>
              <text class="step-value">{{ form.playerCount }}</text>
              <button class="step-btn plus" @tap="adjustPlayerCount(1)">＋</button>
            </view>
          </view>
          <view class="control-item">
            <text class="input-label">预订时长</text>
            <view class="stepper">
              <button class="step-btn" @tap="adjustHours(-0.5)">−</button>
              <text class="step-value">{{ formatHours(form.bookedHours) }}</text>
              <button class="step-btn plus" @tap="adjustHours(0.5)">＋</button>
            </view>
          </view>
        </view>
        <view class="input-row textarea-row">
          <text class="input-label">订单备注</text>
          <textarea v-model="form.note" class="checkout-textarea" maxlength="80" placeholder="如有其他需求请备注（选填）" />
          <text class="textarea-count">{{ form.note.length }}/80</text>
        </view>
      </view>

      <view v-if="product" class="checkout-card detail-card">
        <view class="card-title">费用明细</view>
        <view v-if="selectedSpec" class="detail-row">
          <text>已选规格</text>
          <text>{{ selectedSpec.name }}</text>
        </view>
        <view class="detail-row">
          <text>{{ isSpecProduct ? '规格价格' : '套餐单价' }}</text>
          <text>¥{{ formatMoney(basePrice) }}{{ isSpecProduct ? '/单' : '/时/人' }}</text>
        </view>
        <view v-if="!isSpecProduct" class="detail-row">
          <text>人数</text>
          <text>{{ form.playerCount }}人</text>
        </view>
        <view v-if="!isSpecProduct" class="detail-row">
          <text>预订时长</text>
          <text>{{ formatHours(form.bookedHours) }}</text>
        </view>
        <view class="detail-row total-row">
          <text>预计总额</text>
          <text>¥{{ formatMoney(totalAmount) }}</text>
        </view>
      </view>

      <view v-if="!product" class="empty-state">
        <text>{{ loading ? '商品加载中...' : '商品不存在' }}</text>
        <button v-if="!loading" class="back-btn" @tap="goBack">返回</button>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>

    <view v-if="product" class="bottom-bar">
      <view class="bottom-price">
        <text>预计总额</text>
        <text>¥{{ formatMoney(totalAmount) }}</text>
      </view>
      <button class="submit-btn" :disabled="submitting" @tap="submitOrder">
        {{ submitting ? '提交中...' : '立即下单' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createOrder, getMyBossOrders, getPackages, type BossOrderListItem, type BossPackage, type BossPackageSpec } from '@/api/boss'
import { getClientProfile, syncClientProfile, type ClientProfile } from '@/utils/client'
import { formatHours } from '@/utils/format'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { go, replace } from '@/utils/nav'
import { getStorage, setStorage } from '@/utils/storage'

const fallbackImage = '/static/images/home-redesign/hero-lounge.jpg'
const MAX_PLAYER_COUNT = 3
const unfinishedStatuses = ['待接单', '进行中', '待支付']

const packageId = ref<number | null>(null)
const initialSpecId = ref<string>('')
const loading = ref(false)
const submitting = ref(false)
const product = ref<BossPackage | null>(null)
const selectedSpec = ref<BossPackageSpec | null>(null)
const form = reactive({ contact: '', gameId: '', note: '', bookedHours: 1, playerCount: 1 })

const specs = computed(() => [...(product.value?.specs || [])].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)))
const isSpecProduct = computed(() => Boolean(specs.value.length) || product.value?.product_type === 'guarantee' || product.value?.product_type === 'escort')
const productImage = computed(() => product.value ? getProductImage(product.value) : fallbackImage)
const basePrice = computed(() => selectedSpec.value ? Number(selectedSpec.value.price || 0) : (product.value ? getDisplayPrice(product.value) : 0))
const totalAmount = computed(() => isSpecProduct.value ? basePrice.value : basePrice.value * form.playerCount * form.bookedHours)

function getProductImage(item: BossPackage) {
  const productItem = item as BossPackage & Record<string, any>
  return productItem.cover_url || productItem.image_url || productItem.thumb_url || productItem.picture_url || fallbackImage
}

function getDisplayPrice(item: BossPackage) {
  const itemSpecs = item.specs || []
  if (itemSpecs.length) return Math.min(...itemSpecs.map(spec => Number(spec.price || 0)).filter(price => price >= 0))
  return getProductPrice(item)
}

function getProductPrice(item: BossPackage) {
  const productItem = item as BossPackage & Record<string, any>
  return Math.max(0, Number(productItem.price ?? productItem.base_price ?? 0))
}

function getPackagePlayerCount(item: BossPackage | null | undefined) {
  return Math.max(1, Math.min(Number(item?.player_count || 1), MAX_PLAYER_COUNT))
}

function formatMoney(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2)
}

function getBossOpenid(profile: ClientProfile | null = getClientProfile()) {
  return profile?.openid || profile?.open_id || profile?.wechat_openid || ''
}

async function ensureBossOpenid() {
  const localOpenid = getBossOpenid()
  if (localOpenid) return localOpenid
  try {
    return getBossOpenid(await syncClientProfile())
  } catch {
    return ''
  }
}

function getUnfinishedOrders(orders: BossOrderListItem[]) {
  return orders.filter(order => unfinishedStatuses.includes(order.status))
}

function showUnfinishedOrders(orders: BossOrderListItem[]) {
  const orderLines = orders.slice(0, 5).map(order => `${order.order_no}（${order.status}）`).join('\n')
  const moreText = orders.length > 5 ? `\n等 ${orders.length} 个未完成订单` : ''
  uni.showModal({
    title: '无法下单',
    content: `您有未完成的订单，请先完成后再下单\n${orderLines}${moreText}`,
    showCancel: false,
    confirmColor: '#2f9b63'
  })
}

function syncSelectedSpec(nextSpecs = specs.value) {
  if (!nextSpecs.length) {
    selectedSpec.value = null
    return
  }
  const matched = nextSpecs.find(item => String(item.id) === initialSpecId.value)
  selectedSpec.value = matched || nextSpecs[0]
}

async function fetchProduct() {
  if (!packageId.value) return
  loading.value = true
  try {
    const list = await getPackages()
    const matched = list.find(item => item.id === packageId.value) || null
    product.value = matched
    if (matched) form.playerCount = getPackagePlayerCount(matched)
    syncSelectedSpec(matched?.specs || [])
  } catch (error) {
    toast(getErrorMessage(error, '商品加载失败'))
  } finally {
    loading.value = false
  }
}

function selectSpec(spec: BossPackageSpec) {
  selectedSpec.value = spec
}

function adjustPlayerCount(delta: number) {
  const next = form.playerCount + delta
  if (next < 1) return
  if (next > MAX_PLAYER_COUNT) return toast(`下单人数最多 ${MAX_PLAYER_COUNT} 人`)
  form.playerCount = next
}

function adjustHours(delta: number) {
  const next = Math.round((form.bookedHours + delta) * 10) / 10
  if (next >= 0.5) form.bookedHours = next
}

function buildBossNote() {
  const parts = []
  if (selectedSpec.value) parts.push(`规格：${selectedSpec.value.name}，价格：¥${formatMoney(Number(selectedSpec.value.price || 0))}`)
  if (form.note.trim()) parts.push(form.note.trim())
  return parts.join('\n') || null
}

async function submitOrder() {
  if (!product.value) return toast('商品不存在')
  if (product.value.is_frontend_preset) return toast('该商品已在前端展示，请先在后端创建同名商品后再下单')
  if (specs.value.length && !selectedSpec.value) return toast('请选择规格')
  if (!getStorage<string>('token')) {
    toast('请先微信登录')
    go('/pages/client/login/index')
    return
  }
  if (!form.contact.trim()) return toast('请填写联系昵称')
  if (!form.gameId.trim()) return toast('请填写游戏ID/队伍码')

  const bossWechat = await ensureBossOpenid()
  if (!bossWechat) return toast('微信身份获取失败，请重新登录')

  submitting.value = true
  try {
    const unfinishedOrders = getUnfinishedOrders(await getMyBossOrders())
    if (unfinishedOrders.length) {
      showUnfinishedOrders(unfinishedOrders)
      return
    }
    const res = await createOrder({
      boss_wechat: bossWechat,
      game_id: form.gameId.trim(),
      package_id: product.value.id,
      required_players: isSpecProduct.value ? 1 : form.playerCount,
      addon_details: null,
      designated_players: null,
      boss_note: buildBossNote(),
      booked_hours: isSpecProduct.value ? 1 : form.bookedHours
    })
    setStorage('boss_wechat', form.contact.trim())
    success('下单成功')
    replace('/pages/boss/waiting/index', { orderNo: res.order_no })
  } catch (error) {
    toast(getErrorMessage(error, '创建订单失败'))
  } finally {
    submitting.value = false
  }
}

function goBack() {
  uni.navigateBack({ delta: 1 })
}

onLoad((query) => {
  const id = Number(query?.packageId)
  packageId.value = Number.isFinite(id) ? id : null
  initialSpecId.value = query?.specId ? String(query.specId) : ''
  form.contact = getStorage<string>('boss_wechat') || getClientProfile()?.nickname || ''
  fetchProduct()
})
</script>

<style lang="scss" scoped>
.shop-checkout-page { min-height: 100vh; background: #f7f7f7; color: #222; }
.checkout-scroll { height: 100vh; }
.product-card, .checkout-card { margin: 22rpx; padding: 24rpx; border-radius: 22rpx; background: #fff; box-sizing: border-box; }
.product-card { display: flex; gap: 20rpx; }
.product-image { width: 150rpx; height: 150rpx; flex-shrink: 0; border-radius: 12rpx; background: #f0f0f0; }
.product-main { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.product-name { color: #262626; font-size: 32rpx; font-weight: 900; line-height: 1.35; }
.product-desc { margin-top: 10rpx; color: #777; font-size: 24rpx; line-height: 1.4; }
.price-row { margin-top: auto; display: flex; align-items: baseline; color: #ef4f5f; }
.price-symbol { font-size: 26rpx; font-weight: 900; }
.price-value { margin-left: 4rpx; font-size: 42rpx; font-weight: 900; line-height: 1; }
.price-unit { margin-left: 6rpx; font-size: 22rpx; }
.card-title { margin-bottom: 22rpx; color: #222; font-size: 30rpx; font-weight: 900; }
.input-row { margin-top: 22rpx; }
.input-row:first-of-type { margin-top: 0; }
.input-label { display: block; margin-bottom: 12rpx; color: #666; font-size: 25rpx; font-weight: 800; }
.checkout-input, .checkout-textarea { width: 100%; box-sizing: border-box; border-radius: 18rpx; border: 1rpx solid #ededed; background: #fafafa; color: #222; font-size: 28rpx; }
.checkout-input { height: 88rpx; padding: 0 22rpx; }
.checkout-textarea { min-height: 160rpx; padding: 20rpx 22rpx; line-height: 1.45; }
.textarea-row { position: relative; }
.textarea-count { position: absolute; right: 18rpx; bottom: 14rpx; color: #aaa; font-size: 22rpx; }
.control-row { display: flex; gap: 18rpx; margin-top: 22rpx; }
.control-item { flex: 1; min-width: 0; }
.stepper { height: 88rpx; display: flex; align-items: center; justify-content: space-between; padding: 0 12rpx; border-radius: 18rpx; border: 1rpx solid #ededed; background: #fafafa; box-sizing: border-box; }
.step-btn { width: 54rpx; height: 54rpx; display: flex; align-items: center; justify-content: center; padding: 0; margin: 0; border-radius: 50%; color: #555; font-size: 26rpx; background: #fff; }
.step-btn.plus { color: #fff; background: #ef4f5f; }
.step-btn::after { border: none; }
.step-value { color: #222; font-size: 26rpx; font-weight: 900; }
.spec-grid { display: flex; flex-wrap: wrap; gap: 14rpx; }
.spec-chip { min-width: 220rpx; flex: 1; padding: 16rpx 18rpx; border-radius: 16rpx; border: 1rpx solid #ececec; background: #fafafa; box-sizing: border-box; }
.spec-chip text { display: block; }
.spec-chip text:first-child { color: #333; font-size: 24rpx; font-weight: 800; }
.spec-chip text:last-child { margin-top: 8rpx; color: #ef4f5f; font-size: 30rpx; font-weight: 900; }
.spec-chip.active { border-color: #ef4f5f; background: #fff1f3; }
.detail-row { display: flex; align-items: center; justify-content: space-between; gap: 28rpx; padding: 18rpx 0; border-bottom: 1rpx solid #f1f1f1; color: #666; font-size: 26rpx; }
.detail-row:last-child { border-bottom: none; }
.detail-row text:last-child { flex: 1; text-align: right; }
.total-row { color: #222; font-weight: 900; }
.total-row text:last-child { color: #ef4f5f; font-size: 34rpx; }
.empty-state { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24rpx; color: #888; font-size: 28rpx; }
.back-btn { min-width: 180rpx; height: 70rpx; line-height: 70rpx; border-radius: 999rpx; color: #fff; font-size: 26rpx; background: #ef4f5f; }
.back-btn::after { border: none; }
.bottom-spacer { height: calc(150rpx + env(safe-area-inset-bottom)); }
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; align-items: center; gap: 18rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); background: #fff; box-shadow: 0 -10rpx 30rpx rgba(0, 0, 0, 0.08); box-sizing: border-box; }
.bottom-price { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.bottom-price text:first-child { color: #888; font-size: 22rpx; }
.bottom-price text:last-child { color: #ef4f5f; font-size: 34rpx; font-weight: 900; }
.submit-btn { min-width: 210rpx; height: 82rpx; display: flex; align-items: center; justify-content: center; padding: 0 34rpx; margin: 0; border-radius: 999rpx; color: #fff; font-size: 29rpx; font-weight: 900; background: linear-gradient(135deg, #ff7583, #ef3f51); }
.submit-btn[disabled] { opacity: 0.56; }
.submit-btn::after { border: none; }
</style>
