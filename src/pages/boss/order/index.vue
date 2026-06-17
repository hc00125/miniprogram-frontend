<template>
  <view class="club-page order-page">
    <view class="order-hero">
      <view class="order-hero__copy">
        <view class="order-hero__title">点单大厅</view>
        <view class="order-hero__sub">选择套餐、人数和时长，提交后客服立即安排</view>
      </view>
      <button class="refresh-btn" @tap="fetchData">刷新</button>
    </view>

    <view class="order-card">
      <view class="section-head">
        <text>选择套餐</text>
        <text>最多 {{ MAX_PLAYER_COUNT }} 人</text>
      </view>
      <scroll-view v-if="categories.length" scroll-x class="tabs" show-scrollbar="false">
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="tab"
          :class="{ active: activeCategory === cat.id }"
          @tap="handleCategoryTap(cat.id)"
        >
          {{ cat.name }}
        </view>
      </scroll-view>

      <view class="package-list">
        <view
          v-for="pkg in filteredPackages"
          :key="pkg.id"
          class="package-card"
          :class="{ active: selectedPackage?.id === pkg.id }"
          @tap="selectPackage(pkg)"
        >
          <view>
            <text class="package-name">{{ pkg.name }}</text>
            <text class="package-desc">{{ getPackagePlayerCount(pkg) }}人局 · {{ pkg.description || '默认套餐' }}</text>
          </view>
          <view class="package-price">
            <text>¥{{ formatMoney(getPackageBasePrice(pkg)) }}</text>
            <text>/时/人</text>
          </view>
        </view>
      </view>
      <view v-if="filteredPackages.length === 0" class="club-empty">该分类暂无套餐</view>
    </view>

    <view v-if="selectedPackage" class="order-card">
      <view class="section-head">
        <text>特殊陪</text>
        <text>剩余 {{ Math.max(remainingSlots - totalAddonCount, 0) }} 位</text>
      </view>
      <view class="addon-list">
        <view
          v-for="addon in addons"
          :key="addon.id"
          class="addon-item"
          :class="{ active: (addonCounts[addon.id] || 0) > 0 }"
        >
          <view>
            <text>{{ addon.name }}</text>
            <text>+¥{{ formatMoney(addon.price_per_player) }}/时</text>
          </view>
          <view class="counter">
            <button @tap="decrementAddon(addon.id)">−</button>
            <text>{{ addonCounts[addon.id] || 0 }}</text>
            <button class="plus" @tap="incrementAddon(addon.id)">+</button>
          </view>
        </view>
      </view>
    </view>

    <view v-if="selectedPackage" class="order-card">
      <view class="section-head">
        <text>订单信息</text>
        <button class="tiny-link" @tap="showDesignate = !showDesignate">{{ showDesignate ? '收起指定' : '指定陪玩' }} ›</button>
      </view>
      <input v-model="bossForm.wechat" class="club-input" placeholder="请输入您的联系昵称" />
      <input v-model="bossForm.gameId" class="club-input" placeholder="请输入游戏ID或队伍码" />
      <view class="inline-fields">
        <view class="field-box">
          <text>人数</text>
          <view class="counter">
            <button @tap="adjustPlayerCount(-1)">−</button>
            <text>{{ bossForm.playerCount }}</text>
            <button class="plus" @tap="adjustPlayerCount(1)">+</button>
          </view>
        </view>
        <view class="field-box">
          <text>预订时长</text>
          <view class="counter">
            <button @tap="adjustHours(-0.5)">−</button>
            <text>{{ formatHours(bossForm.bookedHours) }}</text>
            <button class="plus" @tap="adjustHours(0.5)">+</button>
          </view>
        </view>
      </view>
      <textarea v-model="bossForm.note" class="club-textarea" maxlength="60" placeholder="如有其他需求请备注（选填）" />

      <view v-if="showDesignate" class="designate-box">
        <input v-model="playerSearch" class="club-input" placeholder="搜索陪玩名称或类型" />
        <view class="player-list">
          <view
            v-for="player in filteredDesignatePlayers"
            :key="player.id"
            class="player-chip"
            :class="{ active: designatedPlayers.includes(player.id) }"
            @tap="togglePlayer(player.id)"
          >
            <text>{{ player.name }}</text>
            <text>{{ player.type_name }}{{ player.price_extra ? ' +¥' + player.price_extra + '/时' : '' }}</text>
          </view>
          <view v-if="filteredDesignatePlayers.length === 0" class="club-empty">暂无可指定陪玩</view>
        </view>
      </view>
    </view>

    <view v-if="selectedPackage" class="order-bottom-bar">
      <view>
        <text>预估</text>
        <text v-if="selectedPackage.is_custom">价格待定</text>
        <text v-else>¥{{ formatMoney(totalPrice) }}<text>/小时</text></text>
        <text>{{ orderSummaryText }} · 特殊陪{{ totalAddonCount }}项</text>
      </view>
      <button class="club-btn" :disabled="submitting" @tap="submitOrder">
        {{ submitting ? '提交中...' : '提交订单' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { createOrder, getAddons, getMyBossOrders, getOnlinePlayers, getPackageGroups, getPackages, queryBossOrders, type BossAddon, type BossOrderListItem, type BossPackage, type OnlinePlayer, type PackageGroup } from '@/api/boss'
import { formatHours } from '@/utils/format'
import { replace } from '@/utils/nav'
import { getClientProfile, syncClientProfile, type ClientProfile } from '@/utils/client'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { getStorage, setStorage } from '@/utils/storage'

interface Category extends PackageGroup { icon?: string }

const fallbackCategories: Category[] = [{ id: 1, name: '默认推荐', sort_order: 1 }]
const fallbackPackages: BossPackage[] = [
  { id: 1001, name: '四套四弹', player_count: 4, base_price: 15, description: '默认四人套餐', is_custom: false, group_id: 1, group_name: '默认推荐' },
  { id: 1002, name: '五套四弹', player_count: 5, base_price: 20, description: '默认五人套餐', is_custom: false, group_id: 1, group_name: '默认推荐' },
  { id: 1003, name: '五套五弹', player_count: 5, base_price: 25, description: '默认五人套餐', is_custom: false, group_id: 1, group_name: '默认推荐' },
  { id: 1004, name: '六套五弹', player_count: 6, base_price: 30, description: '默认六人套餐', is_custom: false, group_id: 1, group_name: '默认推荐' }
]
const fallbackAddons: BossAddon[] = [
  { id: 2001, name: '女陪', price_per_player: 20, priority: 2 },
  { id: 2002, name: '技术陪', price_per_player: 10, priority: 3 },
  { id: 2003, name: '金牌陪', price_per_player: 20, priority: 4 },
  { id: 2004, name: '明星陪', price_per_player: 25, priority: 5 }
]

const unfinishedStatuses = ['待接单', '进行中', '待支付']
const MAX_PLAYER_COUNT = 3

const packages = ref<BossPackage[]>([...fallbackPackages])
const addons = ref<BossAddon[]>([...fallbackAddons])
const onlinePlayers = ref<OnlinePlayer[]>([])
const categories = ref<Category[]>([...fallbackCategories])
const activeCategory = ref<number | null>(fallbackCategories[0].id)
const selectedPackage = ref<BossPackage | null>(fallbackPackages[0])
const addonCounts = reactive<Record<number, number>>({})
const designatedPlayers = ref<number[]>([])
const showDesignate = ref(false)
const playerSearch = ref('')
const submitting = ref(false)
const bossForm = reactive({ wechat: '', gameId: '', note: '', bookedHours: 1, playerCount: Math.min(fallbackPackages[0].player_count, MAX_PLAYER_COUNT) })

const filteredPackages = computed(() => {
  if (activeCategory.value === null) return packages.value
  const matched = packages.value.filter(pkg => pkg.group_id === activeCategory.value)
  return matched.length ? matched : packages.value
})
const sortedOnlinePlayers = computed(() => [...onlinePlayers.value].sort((a, b) => (a.type_name || '').localeCompare(b.type_name || '')))
const filteredDesignatePlayers = computed(() => {
  const q = playerSearch.value.trim().toLowerCase()
  if (!q) return sortedOnlinePlayers.value
  return sortedOnlinePlayers.value.filter(player => player.name.toLowerCase().includes(q) || player.type_name.toLowerCase().includes(q))
})
const totalAddonCount = computed(() => Object.values(addonCounts).reduce((sum, count) => sum + count, 0))
const remainingSlots = computed(() => Math.max(0, bossForm.playerCount - designatedPlayers.value.length))
const totalPrice = computed(() => {
  if (!selectedPackage.value || selectedPackage.value.is_custom) return 0
  let price = getPackageBasePrice(selectedPackage.value) * bossForm.playerCount
  for (const [id, count] of Object.entries(addonCounts)) {
    if (count > 0) price += getAddonPrice(Number(id)) * count
  }
  for (const id of designatedPlayers.value) {
    const player = onlinePlayers.value.find(item => item.id === id)
    if (player?.price_extra) price += player.price_extra
  }
  return price
})
const orderSummaryText = computed(() => selectedPackage.value ? `${selectedPackage.value.name} · ${bossForm.playerCount}人 · ${formatHours(bossForm.bookedHours)}` : '请选择套餐')

function toSafeNumber(value: unknown, fallback: number) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}
function getPackagePlayerCount(pkg: BossPackage | null | undefined) {
  return Math.max(1, toSafeNumber(pkg?.player_count, MAX_PLAYER_COUNT))
}
function getPackageBasePrice(pkg: BossPackage | null | undefined) {
  return Math.max(0, toSafeNumber(pkg?.base_price, 0))
}
function formatMoney(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}
function getAddonPrice(id: number) {
  return addons.value.find(addon => addon.id === id)?.price_per_player || 0
}
function ensureAddonCounts() {
  addons.value.forEach(addon => {
    if (addonCounts[addon.id] === undefined) addonCounts[addon.id] = 0
  })
}
function syncCategorySelection(nextCategories: Category[]) {
  if (!nextCategories.length) {
    activeCategory.value = null
    return
  }
  if (activeCategory.value === null || !nextCategories.some(cat => cat.id === activeCategory.value)) activeCategory.value = nextCategories[0].id
}
function syncPackageSelection(nextPackages: BossPackage[]) {
  if (!nextPackages.length) {
    selectedPackage.value = null
    return
  }
  if (!selectedPackage.value || !nextPackages.some(pkg => pkg.id === selectedPackage.value?.id)) {
    selectedPackage.value = nextPackages[0]
    bossForm.playerCount = Math.min(getPackagePlayerCount(nextPackages[0]), MAX_PLAYER_COUNT)
  }
}
function selectPackage(pkg: BossPackage) {
  selectedPackage.value = pkg
  bossForm.playerCount = Math.min(getPackagePlayerCount(pkg), MAX_PLAYER_COUNT)
  if (pkg.group_id !== null) activeCategory.value = pkg.group_id
  designatedPlayers.value = []
  for (const key in addonCounts) delete addonCounts[key]
  addons.value.forEach(addon => { addonCounts[addon.id] = 0 })
}
function handleCategoryTap(categoryId: number) {
  activeCategory.value = categoryId
  const nextPackages = packages.value.filter(pkg => pkg.group_id === categoryId)
  if (nextPackages.length && (!selectedPackage.value || !nextPackages.some(pkg => pkg.id === selectedPackage.value?.id))) selectPackage(nextPackages[0])
}
function incrementAddon(addonId: number) {
  if (totalAddonCount.value >= remainingSlots.value) return toast('特殊陪数量已达上限')
  addonCounts[addonId] = (addonCounts[addonId] || 0) + 1
}
function decrementAddon(addonId: number) {
  if ((addonCounts[addonId] || 0) > 0) addonCounts[addonId]--
}
function togglePlayer(playerId: number) {
  const index = designatedPlayers.value.indexOf(playerId)
  if (index >= 0) {
    designatedPlayers.value.splice(index, 1)
    return
  }
  if (designatedPlayers.value.length >= bossForm.playerCount) return toast('指定人数不能超过下单人数')
  designatedPlayers.value.push(playerId)
}
function adjustHours(delta: number) {
  const next = Math.round((bossForm.bookedHours + delta) * 10) / 10
  if (next >= 0.5) bossForm.bookedHours = next
}
function adjustPlayerCount(delta: number) {
  const next = bossForm.playerCount + delta
  if (next < 1) return
  if (next > MAX_PLAYER_COUNT) return toast(`下单人数最多 ${MAX_PLAYER_COUNT} 人`)
  bossForm.playerCount = next
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
async function checkUnfinishedOrders(bossWechat: string) {
  try {
    if (getStorage<string>('token')) return getUnfinishedOrders(await getMyBossOrders())
    return getUnfinishedOrders(await queryBossOrders(bossWechat))
  } catch {
    return []
  }
}
async function fetchData() {
  try {
    const [pkgRes, addonRes, playerRes, groupRes] = await Promise.all([getPackages(), getAddons(), getOnlinePlayers(), getPackageGroups()])
    const nextCategories = groupRes.length ? groupRes : fallbackCategories
    const nextPackages = pkgRes.length ? pkgRes : fallbackPackages
    const nextAddons = addonRes.length ? addonRes : fallbackAddons
    packages.value = nextPackages
    addons.value = nextAddons
    onlinePlayers.value = playerRes
    categories.value = nextCategories
    syncCategorySelection(nextCategories)
    syncPackageSelection(nextPackages)
    ensureAddonCounts()
  } catch (error) {
    packages.value = fallbackPackages
    addons.value = fallbackAddons
    categories.value = fallbackCategories
    onlinePlayers.value = []
    syncCategorySelection(fallbackCategories)
    syncPackageSelection(packages.value)
    ensureAddonCounts()
    toast(getErrorMessage(error, '加载失败，已显示默认套餐'))
  }
}
async function submitOrder() {
  if (!selectedPackage.value) return toast('请选择套餐')
  if (!getStorage<string>('token')) {
    toast('请先微信登录')
    replace('/pages/client/login/index')
    return
  }
  if (!bossForm.wechat.trim()) return toast('请填写联系昵称')
  if (!bossForm.gameId.trim()) return toast('请填写游戏ID/队伍码')
  const bossWechat = await ensureBossOpenid()
  if (!bossWechat) return toast('微信身份获取失败，请重新登录')
  submitting.value = true
  try {
    const unfinishedOrders = await checkUnfinishedOrders(bossWechat)
    if (unfinishedOrders.length) return toast('您有未完成的订单，请先完成后再下单')
    const addonDetails = Object.entries(addonCounts).filter(([, count]) => count > 0).map(([addon_id, count]) => ({ addon_id: Number(addon_id), count }))
    const res = await createOrder({
      boss_wechat: bossWechat,
      game_id: bossForm.gameId.trim(),
      package_id: selectedPackage.value.id,
      required_players: bossForm.playerCount,
      addon_details: addonDetails.length ? addonDetails : null,
      designated_players: designatedPlayers.value.length ? designatedPlayers.value : null,
      boss_note: bossForm.note.trim() || null,
      booked_hours: bossForm.bookedHours
    })
    setStorage('boss_wechat', bossForm.wechat.trim())
    success('下单成功')
    replace('/pages/boss/waiting/index', { orderNo: res.order_no })
  } catch (error) {
    toast(getErrorMessage(error, '创建订单失败'))
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  const savedBossWechat = getStorage<string>('boss_wechat')
  bossForm.wechat = savedBossWechat || bossForm.wechat
  fetchData()
})
</script>

<style lang="scss" scoped>
.order-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 180rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #fbf7ef 0%, #fffaf2 100%);
}
.order-hero,
.order-card {
  margin-bottom: 22rpx;
  padding: 28rpx;
  border-radius: 30rpx;
  background: #fff;
  box-shadow: 0 12rpx 30rpx rgba(39, 61, 42, 0.08);
}
.order-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #173426, #2f9b63);
  color: #fff;
}
.order-hero__title {
  font-size: 42rpx;
  font-weight: 900;
}
.order-hero__sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.86;
}
.refresh-btn,
.tiny-link {
  padding: 0 22rpx;
  height: 58rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  background: rgba(255, 255, 255, 0.92);
  color: #1f7c4b;
}
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18rpx;
  color: #172116;
  font-size: 30rpx;
  font-weight: 900;
}
.section-head text:last-child {
  color: #687665;
  font-size: 24rpx;
  font-weight: 500;
}
.tabs {
  white-space: nowrap;
  margin-bottom: 18rpx;
}
.tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 112rpx;
  height: 58rpx;
  margin-right: 12rpx;
  border-radius: 999rpx;
  background: #f7faf4;
  color: #687665;
  font-size: 25rpx;
  font-weight: 800;
}
.tab.active {
  background: #172116;
  color: #fff;
}
.package-list,
.addon-list,
.player-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.package-card,
.addon-item,
.player-chip,
.field-box {
  padding: 20rpx;
  border: 1px solid rgba(36, 55, 39, 0.08);
  border-radius: 24rpx;
  background: #fff;
}
.package-card,
.addon-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.package-card.active,
.addon-item.active,
.player-chip.active {
  border-color: #2f9b63;
  background: #f1fbf4;
}
.package-name,
.package-price text:first-child {
  display: block;
  font-size: 30rpx;
  font-weight: 900;
  color: #172116;
}
.package-desc,
.package-price text:last-child,
.addon-item text:last-child,
.player-chip text:last-child {
  display: block;
  margin-top: 6rpx;
  font-size: 23rpx;
  color: #687665;
}
.counter {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.counter button {
  width: 56rpx;
  height: 56rpx;
  padding: 0;
  border-radius: 18rpx;
  background: #f5f5f5;
  color: #172116;
  font-weight: 900;
}
.counter .plus {
  background: #2f9b63;
  color: #fff;
}
.club-input,
.club-textarea {
  width: 100%;
  margin-bottom: 18rpx;
  padding: 22rpx;
  box-sizing: border-box;
  border-radius: 22rpx;
  background: #f7faf4;
  color: #172116;
}
.club-textarea {
  min-height: 150rpx;
}
.inline-fields {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  margin-bottom: 18rpx;
}
.field-box > text {
  display: block;
  margin-bottom: 12rpx;
  color: #687665;
  font-size: 24rpx;
}
.order-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  justify-content: space-between;
  align-items: center;
 gap: 20rpx;
  padding: 20rpx 24rpx 20rpx;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
 background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 -8rpx 30rpx rgba(39, 61, 42, 0.10);
}
.order-bottom-bar > view {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  color: #687665;
  font-size: 22rpx;
}
.order-bottom-bar > view > text:nth-child(2) {
  color: #ef4f5f;
  font-size: 34rpx;
  font-weight: 900;
}
.club-btn {
  min-width: 220rpx;
  height: 76rpx;
  border-radius: 999rpx;
  background: #2f9b63;
  color: #fff;
  font-weight: 900;
}
</style>
