<template>
  <view class="club-page order-page">
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @tap="goHome">
        <text class="nav-back">‹</text>
      </view>
      <text class="nav-title">点单大厅</text>
      <view class="nav-right"></view>
    </view>

    <scroll-view scroll-y class="order-scroll">
      <view class="order-panel">
        <view class="order-hero">
          <image class="order-hero__bg" :src="homeHero" mode="aspectFill" />
          <view class="order-hero__shade"></view>
          <view class="account-switch">
            <text>{{ bossForm.wechat?.[0] || '客' }}</text>
            <text>切换账号 ›</text>
          </view>
          <view class="order-hero__copy">
            <view class="order-hero__title">
              <text>选择今晚的</text>
              <text>开局阵容</text>
            </view>
            <view class="order-hero__sub">套餐、人数、时长一次选好</view>
          </view>
        </view>

        <view class="order-main-card">
          <view class="order-section package-section">
            <view class="order-section-head">
              <view class="section-title-wrap">
                <text class="section-line"></text>
                <text class="section-title">选择套餐</text>
              </view>
              <view class="section-side">
                <text class="section-more-hint">右滑查看更多</text>
                <text class="section-help">套餐说明 ?</text>
              </view>
            </view>
            <scroll-view v-if="categories.length" scroll-x class="tabs order-tabs" show-scrollbar="false">
              <view
                v-for="cat in categories"
                :key="cat.id"
                class="tab order-tab"
                :class="{ active: activeCategory === cat.id }"
                @tap="handleCategoryTap(cat.id)"
              >
                <text>{{ cat.name }}</text>
              </view>
            </scroll-view>

            <scroll-view scroll-x class="package-scroll" show-scrollbar="false">
              <view class="package-list package-row">
                <view
                  v-for="(pkg, index) in filteredPackages"
                  :key="pkg.id"
                  class="package-card"
                  :class="{ active: selectedPackage?.id === pkg.id }"
                  @tap="selectPackage(pkg)"
                >
                  <text v-if="selectedPackage?.id === pkg.id || index === 0" class="package-badge">人气推荐</text>
                  <text v-if="selectedPackage?.id === pkg.id" class="package-check">✓</text>
                  <view class="package-main">
                    <text class="package-name">{{ pkg.name }}</text>
                  </view>
                  <view class="package-price">
                    <text class="price-currency">¥</text>
                    <text class="price-value">{{ formatMoney(getPackageBasePrice(pkg)) }}</text>
                    <text class="price-unit">/时/人</text>
                  </view>
                </view>
              </view>
            </scroll-view>

            <view v-if="filteredPackages.length === 0" class="club-empty">该分类暂无套餐</view>
          </view>

          <view v-if="selectedPackage" class="order-section">
            <view class="order-section-head">
              <view class="section-title-wrap">
                <text class="section-line"></text>
                <text class="section-title">特殊陪</text>
                <text class="section-note">可多选</text>
              </view>
              <text class="section-help">剩余 {{ Math.max(remainingSlots - totalAddonCount, 0) }} 位</text>
            </view>
            <view class="special-grid">
              <view
                v-for="addon in addons"
                :key="addon.id"
                class="special-item"
                :class="{ active: (addonCounts[addon.id] || 0) > 0 }"
              >
                <view class="special-icon">
                  <text>{{ addon.name.slice(0, 1) }}</text>
                </view>
                <view class="special-main">
                  <text class="addon-name">{{ addon.name }}</text>
                  <text class="addon-price">+ ¥{{ formatMoney(addon.price_per_player) }}</text>
                </view>
                <view class="counter">
                  <button class="counter-btn" @tap="decrementAddon(addon.id)">−</button>
                  <text class="counter-value">{{ addonCounts[addon.id] || 0 }}</text>
                  <button class="counter-btn plus" @tap="incrementAddon(addon.id)">+</button>
                </view>
              </view>
            </view>
          </view>

          <view v-if="selectedPackage" class="order-section">
            <view class="order-section-head">
              <view class="section-title-wrap">
                <text class="section-line"></text>
                <text class="section-title">订单信息</text>
              </view>
              <button class="tiny-link designate-toggle" @tap="showDesignate = !showDesignate">
                {{ showDesignate ? '收起指定' : '指定陪玩' }} ›
              </button>
            </view>
            <view class="form-stack">
              <view class="input-row">
                <view class="club-section-title">联系昵称</view>
                <input
                  v-model="bossForm.wechat"
                  class="club-input"
                  placeholder="请输入您的联系昵称"
                  placeholder-style="color: #c5c5c5; font-size: 25rpx;"
                />
              </view>
              <view class="input-row">
                <view class="club-section-title">游戏ID / 队伍码</view>
                <input
                  v-model="bossForm.gameId"
                  class="club-input"
                  placeholder="请输入游戏ID或队伍码"
                  placeholder-style="color: #c5c5c5; font-size: 25rpx;"
                />
              </view>
              <view class="inline-fields">
                <view class="control-field">
                  <view class="club-section-title">人数</view>
                  <view class="hours-box">
                    <button class="counter-btn" @tap="adjustPlayerCount(-1)">−</button>
                    <text class="hours-text">{{ bossForm.playerCount }}</text>
                    <button class="counter-btn plus" @tap="adjustPlayerCount(1)">＋</button>
                  </view>
                </view>
                <view class="control-field">
                  <view class="club-section-title">预订时长</view>
                  <view class="hours-box">
                    <button class="counter-btn" @tap="adjustHours(-0.5)">−</button>
                    <text class="hours-text">{{ formatHours(bossForm.bookedHours) }}</text>
                    <button class="counter-btn plus" @tap="adjustHours(0.5)">＋</button>
                  </view>
                </view>
              </view>
              <view class="input-row textarea-row">
                <view class="club-section-title">订单备注</view>
                <textarea
                  v-model="bossForm.note"
                  class="club-textarea"
                  maxlength="60"
                  placeholder="如有其他需求请备注（选填）"
                  placeholder-style="color: #c5c5c5; font-size: 25rpx;"
                />
                <text class="textarea-count">{{ bossForm.note.length }}/60</text>
              </view>

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
                    <text class="avatar">{{ player.name?.[0] }}</text>
                    <view class="player-main">
                      <text>{{ player.name }}</text>
                      <text>{{ player.type_name }}{{ player.price_extra ? ' +¥' + player.price_extra + '/时' : '' }}</text>
                    </view>
                    <text v-if="designatedPlayers.includes(player.id)" class="check">✓</text>
                  </view>
                  <view v-if="filteredDesignatePlayers.length === 0" class="club-empty">暂无可指定陪玩</view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-if="selectedPackage" class="order-bottom-spacer"></view>
        <view v-if="selectedPackage" class="order-bottom-bar">
          <view>
            <text>预估 <text class="detail-link">明细 ›</text></text>
            <text v-if="selectedPackage.is_custom">价格待定</text>
            <text v-else>¥{{ formatMoney(totalPrice) }}<text>/小时</text></text>
            <text>{{ orderSummaryText }} · 特殊陪{{ totalAddonCount }}项</text>
          </view>
          <button class="club-btn" :disabled="submitting" @tap="submitOrder">
            {{ submitting ? '提交中...' : '提交订单' }}
          </button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createOrder, getAddons, getMyBossOrders, getOnlinePlayers, getPackageGroups, getPackages, queryBossOrders, type BossAddon, type BossOrderListItem, type BossPackage, type OnlinePlayer, type PackageGroup } from '@/api/boss'
import { formatHours } from '@/utils/format'
import { goMain, replace } from '@/utils/nav'
import { getClientProfile, syncClientProfile, type ClientProfile } from '@/utils/client'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { getStorage, setStorage } from '@/utils/storage'

interface Category extends PackageGroup { icon?: string }

const assetBase = '/images/home-redesign'
const homeHero = `${assetBase}/hero-lounge.jpg`
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
const statusBarHeight = ref(20)
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
function goHome() {
  goMain('home')
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

onLoad(() => {
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
  } catch (_e) {
    statusBarHeight.value = 20
  }
})
</script>

<style lang="scss" scoped>
.order-page {
  min-height: 100vh;
  box-sizing: border-box;
  background: #faf8f2;
}

.custom-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 28rpx;
  background: #fbf7ef;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-left {
  width: 80rpx;
  display: flex;
  align-items: center;
}

.nav-back {
  font-size: 48rpx;
  color: #172116;
  line-height: 1;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 900;
  color: #172116;
}

.nav-right {
  width: 80rpx;
}

.order-scroll {
  height: calc(100vh - 88rpx);
  background: #faf8f2;
}

.order-panel {
  min-height: 100vh;
  padding: 0 18rpx 356rpx;
  box-sizing: border-box;
  color: #202422;
  background: #faf8f2;
}

.order-hero {
  position: relative;
  height: 257rpx;
  margin: 0 0 -37rpx;
  padding: 0;
  border-radius: 32rpx 32rpx 0 0;
  overflow: hidden;
  background: #e8dfcf;
  box-shadow: none;
}

.order-hero__bg,
.order-hero__shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.order-hero__shade {
  background:
    linear-gradient(90deg, rgba(250, 248, 242, 0.96) 0%, rgba(250, 248, 242, 0.68) 46%, rgba(250, 248, 242, 0.08) 100%),
    linear-gradient(180deg, rgba(250, 248, 242, 0.00) 62%, rgba(250, 248, 242, 0.74) 100%);
}

.account-switch {
  position: absolute;
  z-index: 2;
  top: 18rpx;
  right: 18rpx;
  height: 56rpx;
  padding: 0 16rpx 0 8rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(255, 255, 255, 0.88);
  color: #605a4f;
  font-size: 24rpx;
  font-weight: 500;
  box-shadow: 0 8rpx 20rpx rgba(54, 41, 24, 0.08);
}

.account-switch text:first-child {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #1f6b4c;
  font-size: 20rpx;
  font-weight: 700;
}

.order-hero__copy {
  position: relative;
  z-index: 1;
  padding: 54rpx 0 0 34rpx;
}

.order-hero__title {
  display: flex;
  align-items: baseline;
  color: #202422;
  font-size: 47rpx;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0;
}

.order-hero__title text:last-child {
  margin-left: 6rpx;
  color: #1f6b4c;
}

.order-hero__sub {
  margin-top: 18rpx;
  color: #666b68;
  font-size: 25rpx;
  line-height: 1.4;
}

.order-main-card {
  position: relative;
  z-index: 1;
  padding: 28rpx 26rpx 34rpx;
  border-radius: 0 0 32rpx 32rpx;
  background: #fff;
  box-shadow: 0 14rpx 42rpx rgba(54, 41, 24, 0.06);
}

.order-section + .order-section {
  margin-top: 40rpx;
}

.order-section-head {
  min-height: 42rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.section-title-wrap {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.section-line {
  width: 8rpx;
  height: 46rpx;
  border-radius: 999rpx;
  background: #c6a46a;
  flex-shrink: 0;
}

.section-title {
  color: #202422;
  font-size: 31rpx;
  font-weight: 700;
}

.section-note {
  color: #666b68;
  font-size: 22rpx;
  white-space: nowrap;
}

.section-side {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14rpx;
  min-width: 0;
}

.section-more-hint {
  color: #2f9b63;
  font-size: 22rpx;
  font-weight: 700;
  white-space: nowrap;
}

.section-help {
  color: #776f62;
  font-size: 24rpx;
  white-space: nowrap;
}

.order-tabs {
  white-space: nowrap;
  margin-bottom: 26rpx;
}

.order-tab {
  min-width: 0;
  width: 152rpx;
  height: 62rpx;
  margin-right: 18rpx;
  padding: 0;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #333632;
  background: #fbf8f2;
  border: 1px solid #eee6da;
  box-shadow: none;
  font-size: 26rpx;
  font-weight: 500;
}

.order-tab.active {
  color: #fff;
  background: linear-gradient(180deg, #3d9671, #1f6b4c);
  border-color: #1f6b4c;
  box-shadow: 0 10rpx 20rpx rgba(31, 107, 76, 0.16);
}

.package-scroll {
  white-space: nowrap;
}

.package-row {
  display: inline-flex;
  flex-direction: row;
  gap: 24rpx;
  padding-bottom: 2rpx;
}

.package-card {
  position: relative;
  width: 215rpx;
  min-height: 206rpx;
  padding: 50rpx 18rpx 24rpx;
  box-sizing: border-box;
  border-radius: 25rpx;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 12rpx;
  vertical-align: top;
  background: #fffdf9;
  border: 1px solid #e6d5b8;
  box-shadow: none;
  overflow: hidden;
  text-align: center;
}

.package-card.active {
  background: linear-gradient(180deg, #f7fffb, #fbfdf9);
  border: 2px solid #1f6b4c;
  box-shadow: 0 10rpx 22rpx rgba(31, 107, 76, 0.08);
}

.package-badge {
  position: absolute;
  top: 18rpx;
  left: 16rpx;
  height: 42rpx;
  padding: 0 12rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  color: #8a6930;
  background: #f3e4c6;
  font-size: 22rpx;
  font-weight: 500;
}

.package-check {
  position: absolute;
  top: 18rpx;
  right: 14rpx;
  width: 46rpx;
  height: 46rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #1f6b4c;
  font-size: 30rpx;
  font-weight: 700;
}

.package-main {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding-bottom: 0;
}

.package-name {
  color: #282b29;
  font-size: 35rpx;
  font-weight: 600;
  line-height: 1.2;
}

.package-price {
  margin-top: 24rpx;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: center;
  gap: 4rpx;
  color: #b39158;
}

.package-card.active .package-price {
  color: #1f6b4c;
}

.price-currency {
  font-size: 25rpx;
}

.price-value {
  font-size: 53rpx;
  font-weight: 700;
  color: inherit;
}

.price-unit {
  font-size: 22rpx;
  color: inherit;
}

.special-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16rpx;
}

.special-item {
  min-height: 136rpx;
  padding: 16rpx 10rpx 12rpx;
  box-sizing: border-box;
  border-radius: 21rpx;
  display: grid;
  grid-template-columns: 44rpx 1fr;
  grid-template-rows: 56rpx 42rpx;
  column-gap: 8rpx;
  row-gap: 8rpx;
  align-items: center;
  background: #fffdf9;
  border: 1px solid #eee6da;
}

.special-item.active {
  background: #fffaf0;
  border-color: #e6d5b8;
}

.special-icon {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #274838, #172c24);
  color: #f1d59c;
  font-size: 24rpx;
  font-weight: 700;
}

.special-main,
.player-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3rpx;
}

.special-main {
  align-items: flex-start;
  text-align: left;
}

.addon-name {
  color: #202422;
  font-size: 24rpx;
  font-weight: 500;
  white-space: nowrap;
}

.addon-price {
  color: #b39158;
  font-size: 23rpx;
  white-space: nowrap;
}

.special-item .counter {
  grid-column: 1 / 3;
  display: grid;
  grid-template-columns: 38rpx 1fr 38rpx;
  align-items: center;
  gap: 8rpx;
}

.counter-btn {
  width: 38rpx;
  height: 38rpx;
  min-height: 38rpx;
  padding: 0;
  border-radius: 50%;
  border: 1px solid #1f6b4c;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fffdf9;
  color: #1f6b4c;
  font-size: 28rpx;
  font-weight: 500;
  line-height: 1;
}

.counter-btn.plus {
  background: #fffdf9;
  color: #1f6b4c;
}

.counter-value {
  min-width: 30rpx;
  color: #202422;
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
}

.tiny-link {
  color: #1f7c4b;
  font-size: 26rpx;
  font-weight: 900;
}

.designate-toggle {
  min-width: 150rpx;
  height: 50rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  border: 1px solid #e6d5b8;
  color: #8a6930;
  background: #fffdf9;
  font-size: 23rpx;
  font-weight: 600;
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.input-row {
  min-height: 63rpx;
  padding: 0 22rpx;
  border-radius: 18rpx;
  border: 1px solid #eee6da;
  background: #fffdf9;
  display: grid;
  grid-template-columns: 150rpx 1fr;
  align-items: center;
}

.club-section-title {
  margin: 0;
  color: #202422;
  font-size: 25rpx;
  font-weight: 400;
  white-space: nowrap;
}

.club-input {
  height: 62rpx;
  min-height: 62rpx;
  padding: 0 0 0 22rpx;
  border: 0;
  border-left: 1px solid #eee6da;
  border-radius: 0;
  background: transparent;
  color: #202422;
  font-size: 25rpx;
  box-shadow: none;
}

.inline-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.control-field {
  min-height: 63rpx;
  padding: 0 16rpx 0 22rpx;
  border-radius: 18rpx;
  border: 1px solid #eee6da;
  background: #fffdf9;
  display: grid;
  grid-template-columns: 88rpx 1fr;
  align-items: center;
  gap: 10rpx;
}

.hours-box {
  height: 48rpx;
  padding: 0;
  border: 1px solid #e2d7c8;
  border-radius: 12rpx;
  background: #fff;
  display: grid;
  grid-template-columns: 45rpx 1fr 45rpx;
  align-items: center;
  overflow: hidden;
}

.hours-box .counter-btn {
  width: 45rpx;
  height: 48rpx;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.hours-box .counter-btn:first-child {
  border-right: 1px solid #eee6da;
}

.hours-box .counter-btn:last-child {
  border-left: 1px solid #eee6da;
}

.hours-text {
  color: #202422;
  font-size: 28rpx;
  font-weight: 600;
  text-align: center;
}

.textarea-row {
  position: relative;
  min-height: 85rpx;
  grid-template-columns: 126rpx 1fr;
  align-items: start;
  padding-top: 18rpx;
  padding-bottom: 18rpx;
}

.club-textarea {
  min-height: 80rpx;
  padding: 0 0 0 22rpx;
  border: 0;
  border-left: 1px solid #eee6da;
  border-radius: 0;
  background: transparent;
  color: #202422;
  font-size: 25rpx;
  line-height: 1.4;
  box-shadow: none;
}

.textarea-count {
  position: absolute;
  right: 22rpx;
  bottom: 14rpx;
  color: #a8a8a8;
  font-size: 25rpx;
}

.designate-box {
  padding: 18rpx;
  border-radius: 20rpx;
  background: #faf8f2;
  border: 1px solid #eee6da;
}

.designate-box .club-input {
  height: 70rpx;
  min-height: 70rpx;
  padding: 0 18rpx;
  border: 1px solid #eee6da;
  border-radius: 16rpx;
  background: #fff;
}

.player-list {
  margin-top: 16rpx;
}

.player-chip {
  padding: 18rpx;
  border-radius: 24rpx;
  background: #fff;
  border: 1px solid #eee6da;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.player-chip.active {
  border-color: rgba(47, 155, 99, 0.42);
  background: #eef9ef;
}

.avatar {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1f6b4c;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.player-main text:first-child {
  font-size: 29rpx;
  font-weight: 900;
  color: #172116;
}

.player-main text:last-child {
  color: #687665;
  font-size: 23rpx;
}

.check {
  color: #1f7c4b;
  font-size: 32rpx;
  font-weight: 900;
}

.club-empty {
  padding: 24rpx;
  color: #8b9788;
  font-size: 25rpx;
  text-align: center;
}

.order-bottom-spacer {
  height: 300rpx;
  height: calc(300rpx + constant(safe-area-inset-bottom));
  height: calc(300rpx + env(safe-area-inset-bottom));
}

.order-bottom-bar {
  position: fixed;
  left: 18rpx;
  right: 18rpx;
  bottom: 132rpx;
  bottom: calc(132rpx + constant(safe-area-inset-bottom));
  bottom: calc(132rpx + env(safe-area-inset-bottom));
  z-index: 20;
  min-height: 138rpx;
  padding: 24rpx 26rpx 24rpx;
  padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  border-radius: 32rpx;
  background: #fff;
  box-shadow: 0 -8rpx 26rpx rgba(54, 41, 24, 0.10);
  display: grid;
  grid-template-columns: 1fr 270rpx;
  align-items: center;
  column-gap: 20rpx;
}

.order-bottom-bar view {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.order-bottom-bar view > text:first-child {
  color: #202422;
  font-size: 28rpx;
  font-weight: 500;
}

.detail-link {
  margin-left: 12rpx;
  padding: 5rpx 13rpx;
  border-radius: 999rpx;
  background: #f2eee5;
  color: #7b715f;
  font-size: 22rpx;
  font-weight: 400;
}

.order-bottom-bar view > text:nth-child(2) {
  color: #1f6b4c;
  font-size: 53rpx;
  font-weight: 700;
  line-height: 1.05;
}

.order-bottom-bar view > text:nth-child(2) text {
  margin-left: 6rpx;
  font-size: 24rpx;
  font-weight: 500;
}

.order-bottom-bar view > text:nth-child(3) {
  max-width: 340rpx;
  color: #666b68;
  font-size: 22rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-bottom-bar .club-btn {
  grid-column: 2;
  width: 270rpx;
  min-width: 270rpx;
  min-height: 72rpx;
  border-radius: 22rpx;
  background: linear-gradient(180deg, #3e9772, #1f6b4c);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  box-shadow: 0 10rpx 22rpx rgba(31, 107, 76, 0.18);
}
</style>
