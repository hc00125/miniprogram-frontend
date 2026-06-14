<template>
  <view class="club-page home-page bottom-safe">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-left" @tap="goHome">
        <text class="nav-back">‹</text>
      </view>
      <text class="nav-title">{{ navTitle }}</text>
      <view class="nav-right"></view>
    </view>

    <swiper class="main-swiper" :current="mainPageIndex" :duration="260" @change="handleMainPageChange">
      <swiper-item>
        <scroll-view scroll-y class="main-pane">
          <view class="landing">
            <view class="home-topbar">
              <view class="brand-lockup">
                <view class="brand-mark">
                  <text>竞</text>
                </view>
                <view class="brand-copy">
                  <view class="brand">偷吃电竞</view>
                  <view class="welcome">|  欢迎来到偷吃电竞，今晚一起开局</view>
                </view>
              </view>
              <button class="wechat-capsule" @tap="goProfile">
                <text>•••</text>
                <text></text>
              </button>
            </view>

            <view class="hero-poster">
              <image class="hero-bg" :src="homeHero" mode="aspectFill" />
              <view class="hero-glass"></view>
              <view class="hero-copy">
                <view class="hero-title">今晚开局，不等队友</view>
                <view class="hero-sub">在线陪玩 · 快速接单 · 明星阵容</view>
                <view class="hero-actions">
                  <button class="hero-btn hero-btn--primary" @tap="startOrder">立即点单 <text>›</text></button>
                  <button class="hero-btn hero-btn--light" @tap="() => goMain('query')">
                    <text class="btn-icon">▤</text>
                    我的订单
                  </button>
                </view>
                <view class="hero-dots">
                  <text></text>
                  <text></text>
                  <text></text>
                </view>
              </view>
            </view>

            <view class="quick-grid">
              <view
                v-for="action in quickActions"
                :key="action.title"
                class="quick-card"
                @tap="action.tap"
              >
                <image class="quick-art" :src="action.icon" mode="aspectFit" />
                <view class="quick-main">
                  <text>{{ action.title }}</text>
                  <text>{{ action.desc }}</text>
                </view>
                <text class="quick-arrow">›</text>
              </view>
            </view>

            <view class="notice-bar">
              <text class="notice-avatar">●</text>
              <text class="notice-text">18分钟前用户下单 · 金牌陪已接单</text>
              <text class="notice-arrow">›</text>
            </view>

            <view class="section-head">
              <view>
                <text>已入驻陪玩</text>
                <text>精选在线阵容</text>
              </view>
              <button @tap="goPlayerList">全部陪玩 ›</button>
            </view>
            <scroll-view scroll-x class="player-showcase" show-scrollbar="false">
              <view v-for="(player, index) in featuredPlayers" :key="player.id" class="show-player">
                <image class="show-photo" :src="playerAvatarFor(index)" mode="aspectFill" />
                <view class="player-status" :class="{ busy: player.status === '忙碌' }">
                  {{ player.status || (player.is_online ? '在线' : '可预约') }}
                </view>
                <view class="show-name">{{ player.name }}</view>
                <view class="show-type">{{ player.type_name || '优质陪玩' }}</view>
                <view class="show-meta">
                  <text>★ {{ player.avg_rating || '5.0' }}</text>
                  <text v-if="player.price_extra">+¥{{ player.price_extra }}/时</text>
                  <text v-else>可指定</text>
                </view>
              </view>
            </scroll-view>

            <view class="section-head package-head">
              <view>
                <text>热门套餐</text>
                <text>高频选择，快速开局</text>
              </view>
              <button @tap="startOrder">更多套餐 ›</button>
            </view>
            <view class="hot-packages">
              <view
                v-for="(pkg, index) in packages.slice(0, 2)"
                :key="pkg.id"
                class="hot-package"
                @tap="startOrder(pkg)"
              >
                <image class="package-bg" :src="packageImageFor(index)" mode="aspectFill" />
                <view class="package-shade"></view>
                <view class="hot-copy">
                  <text>{{ pkg.name }}</text>
                  <text>{{ getPackagePlayerCount(pkg) }}位陪玩 · {{ pkg.description || '适合深夜车队' }}</text>
                </view>
                <view class="hot-price">
                  <text>¥{{ formatMoney(getPackageBasePrice(pkg)) }}</text>
                  <text>/时/人</text>
                </view>
              </view>
            </view>

          </view>
        </scroll-view>
      </swiper-item>

      <swiper-item>
        <scroll-view scroll-y class="main-pane order-scroll">
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
                  <text class="section-help">套餐说明 ?</text>
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
      </swiper-item>
    </swiper>

    <MainBottomTabs :active="mainTabActive" @select="handleMainTabSelect" />

    <view v-if="showPlayers" class="sheet-mask" @tap="showPlayers = false">
      <view class="sheet club-card" @tap.stop>
        <view class="club-card__hd">
          <text class="club-card__title">在线陪玩 {{ onlinePlayers.length }} 人</text>
          <button class="tiny-link" @tap="showPlayers = false">关闭</button>
        </view>
        <scroll-view scroll-y class="sheet-body">
          <view v-if="onlinePlayers.length === 0" class="club-empty">暂无在线陪玩</view>
          <view v-for="player in sortedOnlinePlayers" :key="player.id" class="player-row">
            <text class="avatar">{{ player.name?.[0] }}</text>
            <view class="player-main">
              <text>{{ player.name }}</text>
              <text>{{ player.type_name }} · {{ player.status }}</text>
            </view>
            <text v-if="player.avg_rating" class="rating">★{{ player.avg_rating }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { createOrder, getAddons, getMyBossOrders, getOnlinePlayers, getPackageGroups, getPackages, queryBossOrders, type BossAddon, type BossOrderListItem, type BossPackage, type OnlinePlayer, type PackageGroup } from '@/api/boss'
import MainBottomTabs from '@/components/MainBottomTabs.vue'
import { formatHours } from '@/utils/format'
import { replace, relaunch, navigateToTab, type MainTab } from '@/utils/nav'
import { getClientProfile, syncClientProfile, type ClientProfile } from '@/utils/client'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { getStorage, setStorage } from '@/utils/storage'

interface Category extends PackageGroup { icon: string }

const assetBase = '/images/home-redesign'
const homeHero = `${assetBase}/hero-lounge.jpg`
const playerVisuals = [
  `${assetBase}/player-deer.png`,
  `${assetBase}/player-chen.png`,
  `${assetBase}/player-star.png`
]
const packageVisuals = [
  `${assetBase}/package-five.png`,
  `${assetBase}/package-six.png`
]
const quickActions = [
  { title: '点单大厅', desc: '海量陪玩 · 快速响应', icon: `${assetBase}/icon-order.png`, tap: () => startOrder() },
  { title: '订单进度', desc: '实时查看 · 进度跟踪', icon: `${assetBase}/icon-progress.png`, tap: () => goMain('query') },
  { title: '陪玩入驻', desc: '加入我们 · 收益多多', icon: `${assetBase}/icon-player.png`, tap: () => goPlayerList() },
  { title: '个人中心', desc: '我的资料 · 会员特权', icon: `${assetBase}/icon-profile.png`, tap: () => goProfile() }
]

const fallbackCategories: Category[] = [
  { id: 1, name: '默认推荐', sort_order: 1, icon: '✦' }
]

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

const packageDisplayOverrides: Record<string, Partial<Pick<BossPackage, 'name' | 'base_price' | 'description'>>> = {
  四套娱乐陪: { name: '四套四弹', base_price: 15, description: '默认四人套餐' },
  四套四弹: { base_price: 15 },
  五套四弹: { base_price: 20 },
  五套五蛋陪: { name: '五套五弹', base_price: 25, description: '默认五人套餐' },
  五套五弹陪: { name: '五套五弹', base_price: 25, description: '默认五人套餐' },
  五套五弹: { base_price: 25 },
  六套五弹陪: { name: '六套五弹', base_price: 30, description: '默认六人套餐' },
  六套五弹: { base_price: 30 }
}

const addonPriceOverrides: Record<string, number> = {
  女陪: 20
}

const unfinishedStatuses = ['待接单', '进行中', '待支付']
const unfinishedOrderMessage = '您有未完成的订单，请先完成后再下单'

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
const showPlayers = ref(false)
const mainPageIndex = ref(0)
const statusBarHeight = ref(20) // 默认值，onLoad 时获取真实高度
const playerSearch = ref('')
const submitting = ref(false)
const bossForm = reactive({ wechat: '', gameId: '', note: '', bookedHours: 1, playerCount: Math.min(fallbackPackages[0].player_count, MAX_PLAYER_COUNT) })
let playerRefreshTimer: ReturnType<typeof setInterval> | null = null

const iconMap: Record<string, string> = {
  单陪: '单',
  双陪: '双',
  三陪: '三',
  自定义: '定'
}

const filteredPackages = computed(() => {
  if (activeCategory.value === null) return packages.value
  const matchedPackages = packages.value.filter(pkg => pkg.group_id === activeCategory.value)
  return matchedPackages.length ? matchedPackages : packages.value
})

const sortedOnlinePlayers = computed(() => [...onlinePlayers.value].sort((a, b) => (a.type_name || '').localeCompare(b.type_name || '')))

const featuredPlayers = computed(() => {
  const fallback = [
    { id: -1, name: '小鹿', type_id: 1, type_name: '女陪', avg_rating: 4.9, total_orders: 36, status: '在线', price_extra: 20 },
    { id: -2, name: '阿辰', type_id: 2, type_name: '技术陪', avg_rating: 5.0, total_orders: 48, status: '在线', price_extra: 10 },
    { id: -3, name: '星野', type_id: 3, type_name: '金牌陪', avg_rating: 4.8, total_orders: 29, status: '忙碌', price_extra: 20 }
  ] as OnlinePlayer[]
  return (onlinePlayers.value.length ? onlinePlayers.value : fallback).slice(0, 6)
})

const filteredDesignatePlayers = computed(() => {
  const q = playerSearch.value.trim().toLowerCase()
  if (!q) return sortedOnlinePlayers.value
  return sortedOnlinePlayers.value.filter(player => player.name.toLowerCase().includes(q) || player.type_name.toLowerCase().includes(q))
})

const totalAddonCount = computed(() => Object.values(addonCounts).reduce((sum, count) => sum + count, 0))

const remainingSlots = computed(() => Math.max(0, bossForm.playerCount - designatedPlayers.value.length))

const displayOnlineCount = computed(() => onlinePlayers.value.length || 18)

const activeAddons = computed(() => {
  const result: Record<number, number> = {}
  for (const [id, count] of Object.entries(addonCounts)) {
    if (count > 0) result[Number(id)] = count
  }
  return result
})

const designatedPlayersWithExtra = computed(() => designatedPlayers.value
  .map(id => onlinePlayers.value.find(player => player.id === id))
  .filter(player => player && player.price_extra > 0) as OnlinePlayer[])

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

const orderSummaryText = computed(() => {
  if (!selectedPackage.value) return '请选择套餐'
  return `${selectedPackage.value.name} · ${bossForm.playerCount}人 · ${formatHours(bossForm.bookedHours)}`
})

const mainTabActive = computed<MainTab>(() => mainPageIndex.value === 1 ? 'order' : 'home')

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

function startOrder(pkg?: BossPackage) {
  if (pkg) selectPackage(pkg)
  mainPageIndex.value = 1
}

const navTitle = computed(() => mainPageIndex.value === 1 ? '点单大厅' : '偷吃电竞')

function goHome() {
  mainPageIndex.value = 0
}

function handleMainPageChange(event: { detail: { current: number } }) {
  mainPageIndex.value = event.detail.current
}

function syncNavTitle(_index: number) {
  // 标题由自定义导航栏的 navTitle 计算属性驱动
}

function goPlayerList() {
  goMain('players')
}

function goProfile() {
  goMain('profile')
}

function handleMainTabSelect(tab: MainTab) {
  if (tab === 'home') {
    mainPageIndex.value = 0
    return
  }
  if (tab === 'order') {
    startOrder()
    return
  }
  if (tab === 'profile' && !getClientProfile()) {
    relaunch('/pages/client/login/index')
    return
  }
  navigateToTab(tab as 'query' | 'players' | 'profile')
}

function goMain(tab: MainTab = 'home') {
  handleMainTabSelect(tab)
}


function playerAvatarFor(index: number) {
  return playerVisuals[index % playerVisuals.length]
}

function packageImageFor(index: number) {
  return packageVisuals[index % packageVisuals.length]
}

function getBossOpenid(profile: ClientProfile | null = getClientProfile()) {
  return profile?.openid || profile?.open_id || profile?.wechat_openid || ''
}

function getBossDisplayName(profile: ClientProfile | null = getClientProfile()) {
  return profile?.nickname?.trim() || ''
}

function isOpenidLike(value: string) {
  return /^o[a-zA-Z0-9_-]{10,}$/.test(value.trim())
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

function formatMoney(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

function normalizePackage(pkg: BossPackage): BossPackage {
  const override = packageDisplayOverrides[pkg.name]
  const merged = override ? { ...pkg, ...override } : pkg
  return {
    ...merged,
    player_count: getPackagePlayerCount(merged),
    base_price: getPackageBasePrice(merged),
    description: merged.description || '默认套餐'
  }
}

function normalizePackages(sourcePackages: BossPackage[], sourceCategories: Category[] = fallbackCategories) {
  const normalized = sourcePackages.map(normalizePackage)
  const defaultGroupId = normalized.find(pkg => pkg.group_id !== null)?.group_id ?? sourceCategories[0]?.id ?? fallbackCategories[0].id
  const byName = new Map(normalized.map(pkg => [pkg.name, pkg]))

  return fallbackPackages.map((fallback, index) => {
    const current = byName.get(fallback.name)
    if (current) return { ...current, ...fallback, id: current.id, group_id: current.group_id ?? defaultGroupId }
    return { ...fallback, id: fallback.id + 9000 + index, group_id: defaultGroupId }
  })
}

function normalizeAddon(addon: BossAddon): BossAddon {
  const price = addonPriceOverrides[addon.name]
  return price === undefined ? addon : { ...addon, price_per_player: price }
}

function getAddonName(id: number) {
  return addons.value.find(addon => addon.id === id)?.name || ''
}

function getAddonPrice(id: number) {
  return addons.value.find(addon => addon.id === id)?.price_per_player || 0
}

function ensureAddonCounts() {
  addons.value.forEach(addon => {
    if (addonCounts[addon.id] === undefined) {
      addonCounts[addon.id] = 0
    }
  })
}

function syncCategorySelection(nextCategories: Category[]) {
  if (!nextCategories.length) {
    activeCategory.value = null
    return
  }
  if (activeCategory.value === null || !nextCategories.some(cat => cat.id === activeCategory.value)) {
    activeCategory.value = nextCategories[0].id
  }
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

function trimAddons(notify = false) {
  let total = totalAddonCount.value
  if (total <= remainingSlots.value) return
  const addonIds = Object.keys(addonCounts).map(Number).reverse()
  for (const id of addonIds) {
    while (addonCounts[id] > 0 && total > remainingSlots.value) {
      addonCounts[id]--
      total--
    }
  }
  if (notify) toast('已按人数上限调整特殊陪数量')
}

function trimDesignatedPlayers(notify = false) {
  if (designatedPlayers.value.length <= bossForm.playerCount) return
  designatedPlayers.value.splice(bossForm.playerCount)
  if (notify) toast('已按人数上限调整指定陪玩')
}

function selectPackage(pkg: BossPackage) {
  const safePackage = normalizePackage(pkg)
  selectedPackage.value = safePackage
  bossForm.playerCount = Math.min(getPackagePlayerCount(safePackage), MAX_PLAYER_COUNT)
  if (safePackage.group_id !== null) {
    activeCategory.value = safePackage.group_id
  }
  designatedPlayers.value = []
  for (const key in addonCounts) delete addonCounts[key]
  addons.value.forEach(addon => { addonCounts[addon.id] = 0 })
}

function handleCategoryTap(categoryId: number) {
  activeCategory.value = categoryId
  const nextPackages = packages.value.filter(pkg => pkg.group_id === categoryId)
  if (nextPackages.length && (!selectedPackage.value || !nextPackages.some(pkg => pkg.id === selectedPackage.value?.id))) {
    selectPackage(nextPackages[0])
  }
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
  if (designatedPlayers.value.length >= bossForm.playerCount) {
    toast('指定人数不能超过下单人数')
    return
  }
  designatedPlayers.value.push(playerId)
  trimAddons()
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
  trimDesignatedPlayers(true)
  trimAddons(true)
}

async function fetchData() {
  try {
    const [pkgRes, addonRes, playerRes, groupRes] = await Promise.all([
      getPackages(),
      getAddons(),
      getOnlinePlayers(),
      getPackageGroups()
    ])

    const nextCategories = (groupRes.length ? groupRes : fallbackCategories).map(group => ({
      ...group,
      icon: iconMap[group.name] || '荐'
    }))
    const nextPackages = normalizePackages(pkgRes.length ? pkgRes : fallbackPackages, nextCategories)
    const nextAddons = (addonRes.length ? addonRes : fallbackAddons).map(normalizeAddon)

    packages.value = nextPackages
    addons.value = nextAddons
    onlinePlayers.value = playerRes
    categories.value = nextCategories

    syncCategorySelection(nextCategories)
    syncPackageSelection(nextPackages)
    ensureAddonCounts()
  } catch (error) {
    packages.value = normalizePackages(fallbackPackages)
    addons.value = fallbackAddons.map(normalizeAddon)
    categories.value = fallbackCategories
    onlinePlayers.value = []
    syncCategorySelection(fallbackCategories)
    syncPackageSelection(packages.value)
    ensureAddonCounts()
    toast(getErrorMessage(error, '加载失败，已显示默认套餐'))
  }
}

async function refreshOnlinePlayers() {
  try {
    onlinePlayers.value = await getOnlinePlayers()
  } catch {
    // keep current list
  }
}

function getUnfinishedOrders(orders: BossOrderListItem[]) {
  return orders.filter(order => unfinishedStatuses.includes(order.status))
}

function showUnfinishedOrders(orders: BossOrderListItem[]) {
  const orderLines = orders
    .slice(0, 5)
    .map(order => `${order.order_no}（${order.status}）`)
    .join('\n')
  const moreText = orders.length > 5 ? `\n等 ${orders.length} 个未完成订单` : ''
  uni.showModal({
    title: '无法下单',
    content: `${unfinishedOrderMessage}\n${orderLines}${moreText}`,
    showCancel: false,
    confirmColor: '#2f9b63'
  })
}

async function checkUnfinishedOrders(bossWechat: string) {
  try {
    if (getStorage<string>('token')) {
      return getUnfinishedOrders(await getMyBossOrders())
    }
    return getUnfinishedOrders(await queryBossOrders(bossWechat))
  } catch {
    return []
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
    if (unfinishedOrders.length) {
      showUnfinishedOrders(unfinishedOrders)
      return
    }

    const addonDetails = Object.entries(addonCounts)
      .filter(([, count]) => count > 0)
      .map(([addon_id, count]) => ({ addon_id: Number(addon_id), count }))

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
  bossForm.wechat = savedBossWechat && !isOpenidLike(savedBossWechat)
    ? savedBossWechat
    : getBossDisplayName() || bossForm.wechat
  fetchData()
  playerRefreshTimer = setInterval(refreshOnlinePlayers, 15000)
})

onShow(() => {
})

onLoad((options = {}) => {
  // 获取状态栏高度适配 custom navbar
  try {
    const info = uni.getSystemInfoSync()
    statusBarHeight.value = info.statusBarHeight || 20
  } catch (_e) {
    statusBarHeight.value = 20
  }
  const tab = String(options.tab || 'home')
  if (tab === 'order') {
    mainPageIndex.value = 1
  } else if (tab === 'query') {
    goMain('query')
  } else if (tab === 'players') {
    goMain('players')
  } else if (tab === 'profile') {
    goMain('profile')
  }
})

onUnmounted(() => {
  if (playerRefreshTimer) clearInterval(playerRefreshTimer)
})
</script>

<style lang="scss" scoped>
.home-page {
  padding-bottom: 168rpx;
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

.topbar {
  padding: 8rpx 2rpx 4rpx;
}

.brand-lockup {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.brand-mark {
  width: 72rpx;
  height: 72rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #f8e5ad;
  font-size: 30rpx;
  font-weight: 900;
  background: linear-gradient(145deg, #173426, #2d7650);
  box-shadow: 0 14rpx 28rpx rgba(31, 124, 75, 0.18);
}

.brand {
  color: #173426;
  font-size: 44rpx;
  font-weight: 900;
  line-height: 1.05;
}

.welcome {
  margin-top: 10rpx;
  color: #7d8978;
  font-size: 24rpx;
  line-height: 1.25;
}

.profile-dot,
.order-topbar button {
  width: 72rpx;
  height: 72rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.94);
  color: #1f7c4b;
  font-size: 26rpx;
  font-weight: 900;
  box-shadow: 0 12rpx 28rpx rgba(39, 61, 42, 0.10);
}

.profile-dot {
  border: 1px solid rgba(47, 155, 99, 0.12);
}

.hero-poster {
  position: relative;
  min-height: 492rpx;
  padding: 28rpx;
  border-radius: 36rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #173426;
  box-shadow: 0 24rpx 54rpx rgba(39, 61, 42, 0.16);
}

.hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hero-shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(11, 23, 16, 0.18) 0%, rgba(11, 23, 16, 0.20) 36%, rgba(11, 23, 16, 0.64) 100%),
    linear-gradient(90deg, rgba(12, 22, 16, 0.62) 0%, rgba(12, 22, 16, 0.24) 52%, rgba(255, 255, 255, 0.06) 100%);
}

.hero-topline,
.hero-copy {
  position: relative;
  z-index: 1;
}

.hero-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.hero-badge {
  display: inline-flex;
  margin-top: 12rpx;
  padding: 9rpx 18rpx;
  border-radius: 999rpx;
  color: #f8efd7;
  font-size: 22rpx;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.26);
}

.hero-title {
  max-width: 560rpx;
  color: #fffaf0;
  font-size: 58rpx;
  font-weight: 900;
  line-height: 1.12;
  text-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.30);
}

.hero-sub {
  margin-top: 16rpx;
  max-width: 540rpx;
  color: rgba(255, 255, 255, 0.86);
  font-size: 25rpx;
  line-height: 1.45;
}

.hero-actions {
  margin-top: 30rpx;
  display: flex;
  gap: 18rpx;
  flex-wrap: wrap;
}

.hero-btn {
  min-width: 208rpx;
  min-height: 78rpx;
  border-radius: 999rpx;
}

.hero-actions .club-btn--ghost {
  color: #8b611b;
  background: rgba(255, 252, 244, 0.94);
  border: 1px solid rgba(216, 161, 68, 0.44);
}

.online-panel {
  position: relative;
  z-index: 1;
  width: 126rpx;
  height: 126rpx;
  border-radius: 34rpx;
  background: rgba(20, 31, 23, 0.86);
  color: #dff4d9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 18rpx 34rpx rgba(0, 0, 0, 0.18);
}

.online-panel text:first-child {
  color: #e8ba5e;
  font-size: 44rpx;
  font-weight: 900;
}

.online-panel text:last-child {
  margin-top: 2rpx;
  font-size: 21rpx;
}

.notice-bar {
  margin-top: 24rpx;
  padding: 18rpx 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(216, 161, 68, 0.22);
  box-shadow: 0 10rpx 24rpx rgba(39, 61, 42, 0.06);
  color: #5f6f5d;
  font-size: 24rpx;
}

.notice-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 16rpx;
  background: #fff7df;
  color: #a87520;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  flex-shrink: 0;
}

.notice-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.notice-arrow {
  color: #a87520;
  font-size: 38rpx;
  line-height: 1;
}

.quick-grid {
  margin-top: 24rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18rpx;
}

.quick-card {
  min-height: 152rpx;
  padding: 22rpx 18rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(36, 55, 39, 0.08);
  display: grid;
  grid-template-columns: 64rpx 1fr 24rpx;
  column-gap: 14rpx;
  align-items: center;
  box-shadow: 0 12rpx 30rpx rgba(39, 61, 42, 0.07);
}

.quick-card.primary {
  background: linear-gradient(135deg, #fff9e8, rgba(255, 255, 255, 0.96));
  border-color: rgba(216, 161, 68, 0.26);
}

.quick-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 22rpx;
  background: linear-gradient(145deg, #172116, #264435);
  color: #d8a144;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 900;
}

.quick-icon.clock {
  background: linear-gradient(145deg, #edf8ef, #d9f0dd);
  color: #1f7c4b;
}

.quick-icon.shield {
  background: linear-gradient(145deg, #fff7df, #f1ddac);
  color: #9a6a16;
}

.quick-icon.user {
  background: linear-gradient(145deg, #eef5ff, #dfe9f7);
  color: #54718f;
}

.quick-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.quick-main text:first-child {
  color: #172116;
  font-size: 29rpx;
  font-weight: 900;
}

.quick-main text:last-child {
  color: #7a8775;
  font-size: 22rpx;
  line-height: 1.25;
}

.quick-arrow {
  color: #c79a4c;
  font-size: 38rpx;
  line-height: 1;
}

.section-head {
  margin-top: 34rpx;
  margin-bottom: 18rpx;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20rpx;
}

.section-head view {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.section-head text:first-child {
  color: #172116;
  font-size: 34rpx;
  font-weight: 900;
}

.section-head text:last-child {
  color: #687665;
  font-size: 23rpx;
}

.section-head button {
  flex-shrink: 0;
  color: #1f7c4b;
  font-size: 24rpx;
  font-weight: 900;
}

.player-showcase {
  white-space: nowrap;
}

.show-player {
  position: relative;
  width: 214rpx;
  min-height: 314rpx;
  margin-right: 18rpx;
  padding: 22rpx;
  display: inline-flex;
  flex-direction: column;
  gap: 10rpx;
  vertical-align: top;
  border-radius: 28rpx;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(24, 38, 29, 0.02), rgba(24, 38, 29, 0.68)),
    linear-gradient(145deg, #f8f4ea, #e9f5ec);
  border: 1px solid rgba(36, 55, 39, 0.09);
  box-shadow: 0 14rpx 30rpx rgba(39, 61, 42, 0.10);
}

.show-player::before {
  content: '';
  position: absolute;
  left: -30rpx;
  right: -30rpx;
  bottom: -80rpx;
  height: 190rpx;
  background: linear-gradient(180deg, rgba(31, 124, 75, 0), rgba(31, 124, 75, 0.74));
}

.player-status {
  position: absolute;
  top: 18rpx;
  right: 18rpx;
  z-index: 1;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  color: #1f7c4b;
  font-size: 20rpx;
  font-weight: 900;
  background: rgba(239, 251, 239, 0.92);
}

.player-status.busy {
  color: #a87520;
  background: rgba(255, 247, 223, 0.94);
}

.show-avatar,
.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #65c980, #1f7c4b);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  flex-shrink: 0;
}

.show-avatar {
  position: relative;
  z-index: 1;
  width: 112rpx;
  height: 112rpx;
  margin-top: 42rpx;
  font-size: 46rpx;
  box-shadow: 0 16rpx 28rpx rgba(31, 124, 75, 0.22);
}

.show-name,
.show-type,
.show-meta {
  position: relative;
  z-index: 1;
}

.show-name {
  margin-top: 16rpx;
  color: #fff;
  font-size: 32rpx;
  font-weight: 900;
  text-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.24);
}

.show-type {
  align-self: flex-start;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  color: #8b611b;
  background: rgba(255, 247, 223, 0.92);
  font-size: 22rpx;
  font-weight: 800;
}

.show-meta {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  gap: 10rpx;
  color: #fff6dc;
  font-size: 22rpx;
  font-weight: 900;
}

.hot-packages {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18rpx;
}

.hot-package {
  min-height: 156rpx;
  padding: 22rpx;
  border-radius: 28rpx;
  background:
    radial-gradient(circle at 88% 12%, rgba(244, 201, 112, 0.28), transparent 28%),
    linear-gradient(135deg, rgba(23, 33, 22, 0.96), rgba(31, 124, 75, 0.88));
  border: 1px solid rgba(216, 161, 68, 0.24);
  box-shadow: 0 16rpx 34rpx rgba(39, 61, 42, 0.12);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20rpx;
  overflow: hidden;
}

.hot-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.hot-copy text:nth-child(2) {
  color: #fffaf0;
  font-size: 34rpx;
  font-weight: 900;
}

.hot-copy text:nth-child(3) {
  color: rgba(255, 255, 255, 0.78);
  font-size: 23rpx;
  line-height: 1.35;
}

.hot-price {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  color: #f4c970;
}

.hot-price text:first-child {
  font-size: 42rpx;
  font-weight: 900;
}

.hot-price text:last-child {
  font-size: 22rpx;
  font-weight: 800;
}

.home-page {
  height: 100vh;
  padding: 0;
  overflow: hidden;
  background: linear-gradient(180deg, #fffdf8 0%, #fbf6ec 48%, #f7f8f2 100%);
}

.main-swiper,
.main-pane {
  width: 100%;
  height: 100vh;
}

.main-pane {
  box-sizing: border-box;
}

.landing {
  min-height: 100vh;
  padding: 18rpx 16rpx 168rpx;
  box-sizing: border-box;
}

.home-topbar {
  min-height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  padding: 6rpx 6rpx 18rpx 8rpx;
}

.brand-lockup {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.brand-mark {
  width: 62rpx;
  height: 62rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #f3d188;
  font-size: 24rpx;
  font-weight: 900;
  background: linear-gradient(145deg, #173426, #2b7453);
  box-shadow: 0 10rpx 20rpx rgba(31, 124, 75, 0.18);
}

.brand-copy {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.brand {
  color: #174a36;
  font-size: 40rpx;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
}

.welcome {
  color: #8a8f8a;
  font-size: 22rpx;
  line-height: 1.25;
  white-space: nowrap;
}

.wechat-capsule {
  width: 158rpx;
  height: 58rpx;
  flex-shrink: 0;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(34, 33, 26, 0.10);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 8rpx 24rpx rgba(39, 61, 42, 0.08);
}

.wechat-capsule text:first-child {
  color: #111;
  font-size: 28rpx;
  font-weight: 900;
  line-height: 1;
}

.wechat-capsule text:last-child {
  width: 36rpx;
  height: 36rpx;
  border: 7rpx solid #111;
  border-radius: 50%;
  box-sizing: border-box;
}

.hero-poster {
  min-height: 460rpx;
  padding: 0;
  border-radius: 28rpx;
  overflow: hidden;
  display: block;
  background: #173426;
  box-shadow: 0 20rpx 48rpx rgba(39, 61, 42, 0.12);
}

.hero-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hero-glass {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.06) 46%, rgba(255, 248, 231, 0.70) 100%),
    linear-gradient(90deg, rgba(255, 252, 242, 0.36), rgba(255, 255, 255, 0.02) 55%, rgba(20, 66, 48, 0.15));
}

.hero-copy {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 24rpx;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 30rpx;
  text-align: center;
}

.hero-title {
  max-width: 670rpx;
  color: #174a36;
  font-size: 60rpx;
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: 0;
  text-shadow: 0 8rpx 24rpx rgba(255, 255, 255, 0.52);
}

.hero-sub {
  margin-top: 16rpx;
  color: #283c34;
  font-size: 24rpx;
  line-height: 1.38;
}

.hero-actions {
  margin-top: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  flex-wrap: nowrap;
}

.hero-btn {
  height: 74rpx;
  min-height: 74rpx;
  padding: 0 44rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  font-size: 27rpx;
  font-weight: 900;
}

.hero-btn--primary {
  min-width: 224rpx;
  color: #fff;
  background: linear-gradient(135deg, #63bd8e, #1f7c58);
  box-shadow: 0 12rpx 26rpx rgba(31, 124, 75, 0.25);
}

.hero-btn--light {
  min-width: 224rpx;
  color: #b48237;
  background: rgba(255, 252, 245, 0.95);
  border: 1px solid rgba(216, 161, 68, 0.50);
}

.btn-icon {
  color: #c69545;
  font-size: 28rpx;
}

.hero-dots {
  margin-top: 16rpx;
  display: flex;
  gap: 20rpx;
}

.hero-dots text {
  width: 34rpx;
  height: 9rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
}

.hero-dots text:first-child {
  background: #2c8760;
}

.quick-grid {
  margin-top: 20rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.quick-card {
  min-height: 112rpx;
  padding: 16rpx 16rpx 16rpx 14rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(216, 190, 151, 0.28);
  display: grid;
  grid-template-columns: 76rpx 1fr 24rpx;
  column-gap: 12rpx;
  align-items: center;
  box-shadow: 0 10rpx 28rpx rgba(75, 61, 35, 0.06);
}

.quick-art {
  width: 76rpx;
  height: 76rpx;
}

.quick-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.quick-main text:first-child {
  color: #161817;
  font-size: 27rpx;
  font-weight: 900;
}

.quick-main text:last-child {
  color: #72766f;
  font-size: 20rpx;
  line-height: 1.25;
}

.quick-arrow {
  color: #b98538;
  font-size: 36rpx;
  line-height: 1;
}

.notice-bar {
  margin-top: 20rpx;
  padding: 18rpx 22rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  border-radius: 18rpx;
  background: rgba(255, 252, 245, 0.94);
  border: 1px solid rgba(216, 161, 68, 0.32);
  box-shadow: none;
  color: #61655f;
  font-size: 25rpx;
}

.notice-avatar {
  width: 26rpx;
  height: 26rpx;
  border-radius: 50%;
  background: transparent;
  color: #4da06e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
}

.notice-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.notice-arrow {
  color: #9d722f;
  font-size: 34rpx;
  line-height: 1;
}

.section-head {
  margin-top: 26rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.section-head view {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 12rpx;
}

.section-head text:first-child {
  color: #111;
  font-size: 34rpx;
  font-weight: 900;
}

.section-head text:last-child {
  color: #747b73;
  font-size: 22rpx;
}

.section-head button {
  flex-shrink: 0;
  color: #315a75;
  font-size: 24rpx;
  font-weight: 500;
}

.player-showcase {
  white-space: nowrap;
}

.show-player {
  position: relative;
  width: 226rpx;
  height: 322rpx;
  min-height: 322rpx;
  margin-right: 18rpx;
  padding: 0;
  display: inline-flex;
  flex-direction: column;
  justify-content: flex-end;
  vertical-align: top;
  border-radius: 18rpx;
  overflow: hidden;
  background: #174a36;
  border: 1px solid rgba(216, 190, 151, 0.24);
  box-shadow: 0 14rpx 28rpx rgba(39, 61, 42, 0.10);
}

.show-player::before {
  content: '';
  position: absolute;
  inset: 42% 0 0;
  z-index: 1;
  background: linear-gradient(180deg, rgba(24, 70, 52, 0), rgba(20, 73, 53, 0.92));
}

.show-photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.player-status {
  position: absolute;
  top: 16rpx;
  right: 14rpx;
  z-index: 2;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  color: #1f7c4b;
  font-size: 20rpx;
  font-weight: 900;
  background: rgba(239, 251, 239, 0.92);
}

.player-status.busy {
  color: #a87520;
  background: rgba(255, 247, 223, 0.94);
}

.show-name,
.show-type,
.show-meta {
  position: relative;
  z-index: 2;
  margin-left: 18rpx;
  margin-right: 18rpx;
}

.show-name {
  color: #fff;
  font-size: 32rpx;
  font-weight: 900;
  text-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.24);
}

.show-type {
  align-self: flex-start;
  margin-top: 6rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  color: #8b611b;
  background: rgba(255, 247, 223, 0.92);
  font-size: 21rpx;
  font-weight: 800;
}

.show-meta {
  margin-top: 10rpx;
  margin-bottom: 14rpx;
  display: flex;
  justify-content: space-between;
  gap: 8rpx;
  color: #fff4d0;
  font-size: 22rpx;
  font-weight: 900;
}

.package-head {
  margin-top: 28rpx;
}

.hot-packages {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.hot-package {
  position: relative;
  min-height: 176rpx;
  padding: 20rpx;
  border-radius: 18rpx;
  background: #153f30;
  border: 1px solid rgba(216, 161, 68, 0.24);
  box-shadow: 0 16rpx 34rpx rgba(39, 61, 42, 0.10);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14rpx;
  overflow: hidden;
}

.package-bg,
.package-shade {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.package-shade {
  background: linear-gradient(180deg, rgba(18, 60, 45, 0.08), rgba(13, 48, 36, 0.82));
}

.hot-copy,
.hot-price {
  position: relative;
  z-index: 1;
}

.hot-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.hot-copy text:first-child {
  color: #fffaf0;
  font-size: 30rpx;
  font-weight: 900;
}

.hot-copy text:last-child {
  color: rgba(255, 255, 255, 0.82);
  font-size: 20rpx;
  line-height: 1.28;
}

.hot-price {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  gap: 3rpx;
  color: #f4c970;
}

.hot-price text:first-child {
  font-size: 34rpx;
  font-weight: 900;
}

.hot-price text:last-child {
  font-size: 18rpx;
  font-weight: 800;
}

.order-topbar {
  height: 96rpx;
}

.order-topbar view {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  text-align: center;
}

.order-topbar text:first-child {
  color: #111;
  font-size: 34rpx;
  font-weight: 900;
}

.order-topbar text:last-child {
  display: none;
}

.order-scroll {
  background:
    radial-gradient(circle at 11% 1%, rgba(217, 164, 65, 0.18), transparent 32%),
    radial-gradient(circle at 93% 22%, rgba(111, 168, 123, 0.15), transparent 30%),
    linear-gradient(145deg, #f8f2e8 0%, #eef6ea 53%, #eaf0f7 100%);
}

.order-panel {
  min-height: 100vh;
  padding: 42rpx 42rpx 250rpx;
  box-sizing: border-box;
}

.order-topbar button {
  min-width: 64rpx;
  height: 64rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.92);
  color: #111;
  font-size: 32rpx;
  font-weight: 900;
  box-shadow: 0 8rpx 22rpx rgba(42, 36, 22, 0.07);
}

.order-topbar button:last-child {
  min-width: 92rpx;
  color: #315c46;
  font-size: 24rpx;
}

.order-hero {
  position: relative;
  min-height: 348rpx;
  margin-bottom: 34rpx;
  padding: 36rpx;
  border-radius: 48rpx;
  overflow: hidden;
  border: 0;
  box-shadow: 0 22rpx 44rpx rgba(27, 40, 31, 0.14);
  background: #172116;
}

.order-hero__bg,
.order-hero__shade,
.order-hero__ambient {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.order-hero__shade {
  background:
    linear-gradient(135deg, rgba(18, 27, 22, 0.96) 0%, rgba(37, 73, 54, 0.82) 56%, rgba(185, 134, 49, 0.58) 100%),
    linear-gradient(90deg, rgba(16, 23, 17, 0.42), rgba(16, 23, 17, 0.04));
}

.order-hero__ambient {
  inset: auto -42rpx -92rpx auto;
  width: 306rpx;
  height: 306rpx;
  border-radius: 50%;
  background: rgba(225, 180, 91, 0.18);
}

.account-switch {
  position: absolute;
  z-index: 1;
  top: 32rpx;
  right: 32rpx;
  height: 58rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 8rpx 24rpx rgba(39, 61, 42, 0.10);
  color: #665b4c;
  font-size: 22rpx;
}

.order-hero__stat {
  position: absolute;
  z-index: 1;
  right: 58rpx;
  top: 116rpx;
  width: 118rpx;
  height: 118rpx;
  border-radius: 34rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #d7ecd3;
  background: rgba(16, 23, 17, 0.82);
}

.order-hero__stat text:first-child {
  color: #e1b45b;
  font-size: 38rpx;
  font-weight: 900;
}

.order-hero__stat text:last-child {
  margin-top: 4rpx;
  font-size: 24rpx;
  font-weight: 800;
}

.account-switch text:first-child {
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #204d3a;
  font-size: 20rpx;
  font-weight: 900;
}

.order-hero__copy {
  position: relative;
  z-index: 1;
  max-width: 520rpx;
  padding-top: 24rpx;
}

.order-hero__kicker {
  margin-bottom: 32rpx;
  color: #e1b45b;
  font-size: 24rpx;
  font-weight: 900;
}

.order-hero__title {
  color: #fff;
  font-size: 58rpx;
  line-height: 1.16;
  font-weight: 900;
  display: flex;
  flex-direction: column;
}

.order-hero__title::first-letter {
  color: #fff;
}

.order-hero__sub {
  margin-top: 26rpx;
  color: #dde9d8;
  font-size: 25rpx;
  line-height: 1.42;
}

.order-panel > .club-card {
  margin-top: 24rpx;
  border-radius: 34rpx;
  border-color: #e1e8dc;
  box-shadow: none;
  background: #fff;
}

.order-panel > .club-card:last-of-type {
  border-radius: 34rpx;
}

.order-panel > .club-card:first-of-type {
  margin-top: 0;
  border-top: 1px solid #e1e8dc;
}

.order-panel .club-card__hd {
  padding: 32rpx 36rpx 16rpx;
  border-bottom: 0;
}

.order-panel .club-card__title {
  position: relative;
  padding-left: 0;
  font-size: 40rpx;
}

.order-panel .club-card__title::before {
  content: none;
}

.order-panel .card-hint {
  margin-top: 10rpx;
  color: #8d8778;
  font-size: 21rpx;
}

.order-panel .club-card__bd {
  padding: 16rpx 36rpx 36rpx;
}

.order-panel .tabs {
  margin-bottom: 24rpx;
}

.order-panel .tab {
  min-width: 130rpx;
  height: 62rpx;
  margin-right: 18rpx;
  padding: 0 28rpx;
  justify-content: center;
  border-radius: 999rpx;
  color: #4c4b48;
  background: linear-gradient(180deg, #fffdf8, #f8f2e9);
  border-color: rgba(216, 190, 151, 0.38);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.5);
}

.order-panel .tab.active {
  color: #fff;
  background: linear-gradient(135deg, #5fb78a, #1f7c58);
  border-color: transparent;
  box-shadow: 0 10rpx 24rpx rgba(31, 124, 75, 0.18);
}

.order-panel .package-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24rpx;
}

.order-panel .package-card {
  position: relative;
  min-height: 152rpx;
  padding: 28rpx 36rpx;
  border-radius: 34rpx;
  flex-direction: row;
  justify-content: space-between;
  text-align: left;
  background: #fff;
  border-color: #e1e8dc;
  overflow: hidden;
}

.order-panel .package-card.active {
  background: #fff;
  border-color: #70c773;
  border-width: 2px;
  box-shadow: 0 18rpx 42rpx rgba(27, 40, 31, 0.13);
}

.order-panel .package-card.active::after {
  content: '当前选中';
  position: absolute;
  left: 36rpx;
  bottom: 14rpx;
  width: auto;
  height: 34rpx;
  padding: 0 22rpx;
  border-radius: 17rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #267d4a;
  background: #eef8ec;
  font-size: 19rpx;
  font-weight: 800;
}

.order-panel .package-main {
  align-items: flex-start;
  padding-bottom: 24rpx;
}

.order-panel .package-name {
  color: #172116;
  font-size: 36rpx;
}

.order-panel .package-sub {
  margin-top: 12rpx;
  color: #70806b;
  font-size: 26rpx;
}

.order-panel .package-price {
  margin-top: 0;
  align-items: flex-end;
  flex-shrink: 0;
}

.order-panel .price-value {
  color: #267d4a;
  font-size: 46rpx;
}

.order-panel .price-unit {
  color: #8c7650;
}

.order-panel .special-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
}

.order-panel .special-item {
  min-height: 58rpx;
  padding: 18rpx 22rpx;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  border-radius: 22rpx;
  background: #f7faf4;
  border-color: #e2e8dc;
}

.order-panel .special-item.active {
  background: #fff8e6;
  border-color: #f1ddac;
}

.order-panel .special-main {
  align-items: flex-start;
  text-align: left;
}

.order-panel .addon-name {
  font-size: 24rpx;
}

.order-panel .addon-price {
  color: #b48943;
  font-size: 20rpx;
}

.order-panel .counter {
  gap: 10rpx;
}

.order-panel .counter-btn {
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  background: #fff;
  border: 1px solid rgba(31, 124, 75, 0.38);
  color: #1f7c4b;
  font-size: 26rpx;
}

.order-panel .counter-btn.plus {
  background: #fff;
  color: #1f7c4b;
}

.order-panel .counter-value {
  min-width: 34rpx;
  font-size: 26rpx;
}

.order-panel .form-stack {
  gap: 14rpx;
}

.order-panel .club-section-title {
  margin-bottom: 8rpx;
  color: #272b27;
  font-size: 24rpx;
}

.order-panel .club-input,
.order-panel .club-textarea,
.order-panel .hours-box {
  border-radius: 18rpx;
  background: #fffdf8;
  border-color: rgba(216, 190, 151, 0.30);
  box-shadow: inset 0 1rpx 0 rgba(255,255,255,.7);
}

.order-panel .club-input {
  height: 86rpx;
  min-height: 86rpx;
}

.order-panel .club-textarea {
  min-height: 128rpx;
}

.order-panel .inline-fields {
  gap: 14rpx;
}

.order-panel .field-hint {
  color: #9c927f;
}

.order-bottom-bar {
  left: 42rpx;
  right: 42rpx;
  bottom: 38rpx;
  z-index: 12;
  padding: 30rpx 38rpx calc(30rpx + env(safe-area-inset-bottom));
  border-radius: 38rpx;
  background: #172116;
  border: 0;
  box-shadow: 0 22rpx 44rpx rgba(27, 40, 31, 0.18);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.order-bottom-bar text:first-child {
  color: #fff;
  font-size: 30rpx;
  font-weight: 900;
}

.order-bottom-bar view {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.order-bottom-bar text:nth-child(2) {
  color: #b9c8b4;
  font-size: 24rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-bottom-bar text:last-child {
  color: #e1b45b;
  font-size: 42rpx;
}

.order-bottom-bar .club-btn {
  min-width: 260rpx;
  min-height: 88rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #5eb486, #1f7c58);
  box-shadow: 0 14rpx 30rpx rgba(31, 124, 75, 0.22);
}

.tiny-link {
  color: #1f7c4b;
  font-size: 26rpx;
  font-weight: 900;
}

.card-hint {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8b9788;
  line-height: 1.45;
}

.tabs {
  white-space: nowrap;
  margin-bottom: 20rpx;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 22rpx;
  margin-right: 12rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #687665;
  font-size: 26rpx;
  border: 1px solid rgba(36, 55, 39, 0.09);
}

.tab.active {
  background: #172116;
  color: #fff;
}

.package-list,
.special-grid,
.player-list,
.form-stack {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.package-card {
  padding: 24rpx;
  border-radius: 28rpx;
  background: #fff;
  border: 1px solid rgba(36, 55, 39, 0.09);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.package-card.active {
  border-color: rgba(47, 155, 99, 0.48);
  background: #f2fbef;
  box-shadow: 0 12rpx 28rpx rgba(47, 155, 99, 0.14);
}

.package-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.package-name {
  font-size: 31rpx;
  font-weight: 900;
  color: #172116;
}

.package-sub {
  font-size: 23rpx;
  color: #687665;
}

.package-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}

.price-value {
  color: #1f7c4b;
  font-size: 34rpx;
  font-weight: 900;
}

.price-unit {
  color: #8b9788;
  font-size: 22rpx;
}

.special-item,
.player-chip,
.player-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx;
  border-radius: 24rpx;
  background: #fff;
  border: 1px solid rgba(36, 55, 39, 0.09);
}

.special-item.active,
.player-chip.active {
  border-color: rgba(47, 155, 99, 0.42);
  background: #eef9ef;
}

.special-main,
.player-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.addon-name,
.player-main text:first-child {
  font-size: 29rpx;
  font-weight: 900;
  color: #172116;
}

.addon-price,
.player-main text:last-child {
  color: #687665;
  font-size: 23rpx;
}

.counter {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.counter-btn {
  width: 58rpx;
  height: 58rpx;
  border-radius: 20rpx;
  background: #eef7ee;
  color: #1f7c4b;
  font-size: 34rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.counter-btn.plus {
  background: #1f7c4b;
  color: #fff;
}

.counter-value {
  min-width: 34rpx;
  text-align: center;
  color: #172116;
  font-size: 30rpx;
  font-weight: 900;
}

.inline-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
}

.hours-box {
  height: 92rpx;
  padding: 0 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 24rpx;
  background: #fff;
  border: 1px solid rgba(36, 55, 39, 0.09);
}

.hours-text {
  font-size: 28rpx;
  font-weight: 900;
  color: #172116;
}

.field-hint {
  margin-top: -6rpx;
  font-size: 22rpx;
  color: #8b9788;
  line-height: 1.45;
}

.designate-box {
  padding: 20rpx;
  border-radius: 28rpx;
  background: #f7faf4;
}

.check {
  color: #1f7c4b;
  font-size: 32rpx;
  font-weight: 900;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.32);
  display: flex;
  align-items: flex-end;
  z-index: 30;
}

.sheet {
  width: 100%;
  border-radius: 36rpx 36rpx 0 0;
  max-height: 78vh;
}

.sheet-body {
  max-height: 58vh;
  padding: 20rpx 28rpx 36rpx;
}

.rating {
  color: #a87520;
  font-weight: 900;
}

.order-scroll {
  background: #faf8f2;
}

.order-panel {
  min-height: 100vh;
  padding: 0 18rpx calc(500rpx + 2 * env(safe-area-inset-bottom));
  box-sizing: border-box;
  color: #202422;
  background: #faf8f2;
}

.order-topbar {
  height: 82rpx;
  margin-bottom: 18rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-topbar view {
  flex: 1;
  text-align: center;
}

.order-topbar text:first-child {
  color: #111;
  font-size: 35rpx;
  font-weight: 600;
}

.order-topbar text:last-child {
  display: none;
}

.order-topbar button {
  margin: 0;
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.order-back {
  width: 52rpx;
  height: 62rpx;
  color: #111;
  font-size: 54rpx;
  font-weight: 400;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.order-capsule {
  width: 160rpx;
  height: 56rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.46);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-capsule text:first-child {
  color: #111;
  font-size: 30rpx;
  letter-spacing: 4rpx;
}

.order-capsule text:last-child {
  width: 38rpx;
  height: 38rpx;
  border: 8rpx solid #111;
  border-radius: 50%;
  box-sizing: border-box;
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

.section-help {
  color: #776f62;
  font-size: 24rpx;
  white-space: nowrap;
}

.order-tabs {
  white-space: nowrap;
  margin-bottom: 26rpx;
}

.order-panel .order-tabs {
  margin-bottom: 26rpx;
}

.order-tab {
  width: 152rpx;
  height: 62rpx;
  margin-right: 18rpx;
  padding: 0;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fbf8f2;
  border: 1px solid #eee6da;
  color: #333632;
  font-size: 26rpx;
  font-weight: 500;
}

.order-panel .order-tab {
  min-width: 0;
  width: 152rpx;
  height: 62rpx;
  margin-right: 18rpx;
  padding: 0;
  border-radius: 999rpx;
  justify-content: center;
  color: #333632;
  background: #fbf8f2;
  border-color: #eee6da;
  box-shadow: none;
}

.order-tab.active {
  color: #fff;
  background: linear-gradient(180deg, #3d9671, #1f6b4c);
  border-color: #1f6b4c;
  box-shadow: 0 10rpx 20rpx rgba(31, 107, 76, 0.16);
}

.order-panel .order-tab.active {
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

.order-panel .package-row {
  display: inline-flex;
  grid-template-columns: none;
  flex-direction: row;
  gap: 24rpx;
  padding-bottom: 2rpx;
}

.order-panel .package-card,
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

.order-panel .package-card.active,
.package-card.active {
  background: linear-gradient(180deg, #f7fffb, #fbfdf9);
  border: 2px solid #1f6b4c;
  box-shadow: 0 10rpx 22rpx rgba(31, 107, 76, 0.08);
}

.order-panel .package-card.active::after {
  content: none;
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
}

.order-panel .package-main {
  align-items: center;
  padding-bottom: 0;
}

.package-name {
  color: #282b29;
  font-size: 35rpx;
  font-weight: 600;
  line-height: 1.2;
}

.order-panel .package-name {
  color: #282b29;
  font-size: 35rpx;
  font-weight: 600;
}

.package-sub {
  color: #666b68;
  font-size: 24rpx;
  line-height: 1.3;
}

.order-panel .package-sub {
  margin-top: 0;
  color: #666b68;
  font-size: 24rpx;
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

.order-panel .package-price {
  margin-top: 24rpx;
  flex-direction: row;
  align-items: baseline;
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

.order-panel .price-value {
  color: inherit;
  font-size: 53rpx;
}

.price-unit {
  font-size: 22rpx;
  color: inherit;
}

.order-panel .price-unit {
  color: inherit;
}

.package-people {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.package-people text {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: currentColor;
  color: #aa9772;
  position: relative;
}

.package-people text::after {
  content: '';
  position: absolute;
  left: -4rpx;
  right: -4rpx;
  top: 16rpx;
  height: 12rpx;
  border-radius: 12rpx 12rpx 5rpx 5rpx;
  background: currentColor;
}

.package-card.active .package-people text {
  color: #1f6b4c;
}

.special-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16rpx;
}

.order-panel .special-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16rpx;
}

.order-panel .special-item,
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

.order-panel .special-item.active,
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

.special-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3rpx;
}

.order-panel .special-main {
  align-items: flex-start;
  text-align: left;
}

.addon-name {
  color: #202422;
  font-size: 24rpx;
  font-weight: 500;
  white-space: nowrap;
}

.order-panel .addon-name {
  font-size: 24rpx;
}

.addon-price {
  color: #b39158;
  font-size: 23rpx;
  white-space: nowrap;
}

.order-panel .addon-price {
  color: #b39158;
  font-size: 23rpx;
}

.special-item .counter {
  grid-column: 1 / 3;
  display: grid;
  grid-template-columns: 38rpx 1fr 38rpx;
  align-items: center;
  gap: 8rpx;
}

.counter-btn,
.order-panel .counter-btn {
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

.counter-btn.plus,
.order-panel .counter-btn.plus {
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

.order-panel .form-stack {
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

.order-panel .club-input,
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

.order-panel .inline-fields {
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

.order-panel .club-textarea,
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
  background: #fff;
  border-color: #eee6da;
}

.order-bottom-bar {
  position: fixed;
  left: 18rpx;
  right: 18rpx;
  bottom: calc(160rpx + env(safe-area-inset-bottom));
  z-index: 20;
  min-height: 138rpx;
  padding: 24rpx 26rpx calc(24rpx + env(safe-area-inset-bottom));
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
