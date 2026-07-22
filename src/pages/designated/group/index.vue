<template>
  <view class="designated-page bottom-safe">
    <view class="page-head">
      <button class="back" @tap="goBack">‹</button>
      <view><text class="eyebrow">STATIC COMPOSITION</text><text class="page-title">指定陪玩组局</text></view>
      <button class="reset" @tap="resetDraft">重置</button>
    </view>

    <view class="hero">
      <text class="hero-kicker">一单 · 一次支付 · 一个静态组合 SKU</text>
      <text class="hero-title">先定统一装备，再挑指定陪玩</text>
      <text class="hero-sub">指定名额按陪玩对应的单人商品结算；剩余名额保留基础类型，进入公开抢单大厅。</text>
    </view>

    <view class="panel">
      <view class="panel-head"><view><text>1</text><text>组局配置</text></view><text>统一装备与时长</text></view>
      <view v-if="loadingCatalog" class="empty">正在加载可用套餐…</view>
      <template v-else>
        <view class="config-row">
          <text>基础套餐</text>
          <picker :range="packageLabels" :value="selectedPackageIndex" :disabled="configLocked" @change="selectPackageByIndex">
            <view class="picker-value">{{ selectedProduct?.name || '请选择套餐' }} <text>›</text></view>
          </picker>
        </view>
        <view v-if="selectedProduct" class="spec-block">
          <text class="field-label">基础规格</text>
          <view class="spec-grid">
            <view v-for="spec in visibleSpecs" :key="String(spec.id)" class="spec-chip" :class="{ active: String(spec.id) === String(draft.base_spec_id || ''), locked: configLocked }" @tap="selectSpec(spec)">
              <text>{{ spec.name }}</text>
              <text>{{ spec.required_player_type_name || '不限类型' }} · ¥{{ money(spec.price) }}/时</text>
            </view>
          </view>
        </view>
        <view class="config-row hours-row">
          <text>服务时长</text>
          <view class="stepper"><button :disabled="configLocked" @tap="changeHours(-1)">−</button><text>{{ draft.booked_hours }} 小时</text><button :disabled="configLocked" @tap="changeHours(1)">＋</button></view>
        </view>
        <view v-if="selectedProduct" class="config-hint">
          {{ draft.required_players }} 人组局 · {{ draft.base_player_type_name || '选择规格后显示基础类型' }} · {{ draft.base_spec_name || '未选择规格' }}
        </view>
        <text v-if="configLocked" class="config-lock-tip">已有指定陪玩，本局装备、基础等级、人数和时长已锁定；如需调整请先移除指定陪玩或重置草稿。</text>
      </template>
    </view>

    <view class="panel">
      <view class="panel-head"><view><text>2</text><text>指定陪玩</text></view><text>{{ draft.players.length }}/{{ draft.required_players }} 名</text></view>
      <view v-if="!draft.players.length" class="empty">
        <text>还没有指定陪玩</text>
        <text>每位陪玩都要选择一份与本组局兼容的单人商品。</text>
      </view>
      <view v-else class="player-list">
        <view v-for="player in draft.players" :key="player.id" class="player-row">
          <image v-if="player.avatar_url" :src="player.avatar_url" mode="aspectFill" class="avatar" />
          <view v-else class="avatar avatar-empty">{{ player.name.slice(0, 1) }}</view>
          <view class="player-info">
            <text>{{ player.name }}</text>
            <text>{{ player.billing_type_name || player.type_name || '陪玩师' }}</text>
            <text v-if="player.player_offer_id" class="offer-name">{{ player.package_name || '已选择兼容商品' }} · {{ player.spec_name || '默认规格' }}</text>
            <text v-else class="needs-offer">尚未选择 TA 的兼容商品</text>
          </view>
          <view class="row-actions"><button class="offer-btn" @tap="openOffer(player.id)">{{ player.player_offer_id ? '更换' : '选商品' }}</button><button class="remove-btn" @tap="removePlayer(player.id)">×</button></view>
        </view>
      </view>
      <button class="add-player" :disabled="!canChoosePlayer" @tap="openPlayerPicker">{{ draft.players.length ? '继续指定陪玩' : '选择陪玩' }}</button>
      <text v-if="!canChoosePlayer && draft.players.length < draft.required_players" class="disabled-tip">请先选择基础套餐和规格</text>
    </view>

    <view class="panel summary-panel">
      <view class="panel-head"><view><text>3</text><text>组合结算预览</text></view><text class="server-tag">服务端报价</text></view>
      <view class="summary-note">最终金额由服务端根据静态组合 SKU 锁定；此处不使用前端加价计算。</view>
      <view class="line-group">
        <text class="line-label">指定名额</text>
        <view v-if="designatedLines.length" v-for="line in designatedLines" :key="lineKey(line)" class="price-line"><text>{{ lineTitle(line) }}</text><text>{{ linePrice(line) }}</text></view>
        <view v-else-if="draft.players.length" v-for="player in draft.players" :key="`local-${player.id}`" class="price-line waiting"><text>{{ player.name }} · {{ player.package_name || '待选择兼容商品' }}</text><text>待报价</text></view>
        <text v-else class="no-line">选择陪玩后会展示各自的单人商品行</text>
      </view>
      <view class="line-group public-group">
        <text class="line-label">公开名额</text>
        <view v-if="publicLines.length" v-for="line in publicLines" :key="lineKey(line)" class="price-line"><text>{{ lineTitle(line) }}</text><text>{{ linePrice(line) }}</text></view>
        <view v-else class="price-line waiting"><text>{{ publicSlots }} 个 {{ draft.base_player_type_name || '基础' }}名额进入公开抢单</text><text>待报价</text></view>
      </view>
      <view class="sku-status" :class="skuStatus.className"><text>{{ skuStatus.label }}</text><text>{{ skuStatus.description }}</text></view>
      <view class="total-row"><view><text>预计总额</text><text>{{ draft.booked_hours }} 小时 · {{ totalPerHourText }}/时</text></view><strong>{{ totalAmountText }}</strong></view>
      <text v-if="draft.quote_error" class="quote-error">{{ draft.quote_error }}</text>
      <button class="quote-btn" :loading="syncing" :disabled="!canQuote" @tap="syncQuote(true)">{{ syncing ? '正在校验组合…' : '刷新组合报价' }}</button>
    </view>

    <view class="panel contact-panel">
      <view class="panel-head"><view><text>4</text><text>下单信息</text></view><text>提交后发出指定邀请</text></view>
      <input v-model="form.contact" class="input" placeholder="联系人昵称 / 微信号" maxlength="40" />
      <input v-model="form.gameId" class="input" placeholder="游戏 ID / 队伍码" maxlength="80" />
      <textarea v-model="form.note" class="note" placeholder="备注（可选）" maxlength="120" />
    </view>

    <view class="bottom-bar">
      <view><text>{{ submitHint }}</text><strong>{{ totalAmountText }}</strong></view>
      <button :disabled="!canSubmit || submitting" :loading="submitting" @tap="submit">{{ submitting ? '提交中…' : '确认组局并下单' }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
  createDesignatedDraft,
  quoteDesignatedDraft,
  submitDesignatedDraft,
  updateDesignatedDraft,
  type DesignatedDraftPayload,
  type DesignatedPricingLine,
  type DesignatedQuote
} from '@/api/designated'
import { getPackages, getPlayerList, type BossPackage, type BossPackageSpec, type OnlinePlayer } from '@/api/boss'
import { getErrorMessage, success, toast } from '@/utils/feedback'
import { go, replace } from '@/utils/nav'
import { getStorage, setStorage } from '@/utils/storage'
import {
  clearDesignatedDraft,
  createEmptyDesignatedDraft,
  draftFingerprint,
  getDesignatedDraft,
  saveDesignatedDraft,
  type DesignatedDraftPlayer,
  type DesignatedGroupDraft
} from '@/utils/designatedDraft'
import { getDesignatedPlayers } from '@/utils/designatedPlayer'

const products = ref<BossPackage[]>([])
const draft = ref<DesignatedGroupDraft>(getDesignatedDraft())
const loadingCatalog = ref(false)
const syncing = ref(false)
const submitting = ref(false)
const booted = ref(false)
const lastFingerprint = ref('')
const form = reactive({ contact: getStorage<string>('boss_wechat') || '', gameId: '', note: '' })
let pendingRoutePlayerIds: number[] = []

const selectedProduct = computed(() => products.value.find(item => item.id === Number(draft.value.package_id)) || null)
const packageLabels = computed(() => products.value.map(item => `${item.name} · ${item.player_count}人`))
const selectedPackageIndex = computed(() => Math.max(0, products.value.findIndex(item => item.id === selectedProduct.value?.id)))
const visibleSpecs = computed(() => (selectedProduct.value?.specs || []).filter(item => item.is_active !== false))
const publicSlots = computed(() => Math.max(0, draft.value.required_players - draft.value.players.length))
// A player is only "confirmed" after their compatible one-person SKU has
// been selected.  This keeps the player-first entry usable: the boss can pick
// total people/base tier/equipment/duration before confirming that first SKU.
const configLocked = computed(() => draft.value.players.some(player => Boolean(player.player_offer_id)))
const unselectedOfferPlayers = computed(() => draft.value.players.filter(player => !player.player_offer_id))
const canChoosePlayer = computed(() => Boolean(draft.value.base_spec_id) && draft.value.players.length < draft.value.required_players)
const canQuote = computed(() => Boolean(draft.value.base_spec_id) && draft.value.players.length > 0 && !unselectedOfferPlayers.value.length && !syncing.value)
const quote = computed<DesignatedQuote | null>(() => draft.value.quote || null)
const allLines = computed(() => draft.value.pricing_lines || quote.value?.lines || [])
const designatedLines = computed(() => allLines.value.filter(line => line.source === 'designated' || line.kind === 'designated' || line.line_type === 'designated' || Boolean(line.player_id)))
const publicLines = computed(() => allLines.value.filter(line => line.source === 'public' || line.kind === 'public' || line.line_type === 'public'))
const compositionSku = computed(() => draft.value.composition_sku || quote.value?.composition_sku || quote.value?.compositionSku || null)
const totalPerHour = computed(() => Number(quote.value?.total_price_per_hour || 0))
const totalAmount = computed(() => Number(quote.value?.total_amount || totalPerHour.value * draft.value.booked_hours || 0))
const totalPerHourText = computed(() => totalPerHour.value ? `¥${money(totalPerHour.value)}` : '待服务端报价')
const totalAmountText = computed(() => totalAmount.value ? `¥${money(totalAmount.value)}` : '待报价')
const skuStatus = computed(() => {
  const sku = compositionSku.value
  if (!draft.value.players.length) return { className: 'waiting', label: '等待组局', description: '至少指定一位陪玩后生成组合 SKU' }
  if (unselectedOfferPlayers.value.length) return { className: 'waiting', label: '待选择单人商品', description: '请为每位指定陪玩选择兼容商品' }
  if (!sku) return { className: draft.value.quote_error ? 'blocked' : 'waiting', label: draft.value.quote_error ? '组合 SKU 暂不可用' : '等待服务端校验', description: draft.value.quote_error || '刷新报价后检查虚拟商品绑定' }
  const binding = sku.virtual_product_binding
  const hasVirtualBinding = Boolean(sku.virtual_product_id || binding?.product_id)
  const ready = hasVirtualBinding && sku.is_configured !== false && sku.is_available !== false && sku.status !== 'missing_binding' && sku.status !== 'not_configured' && binding?.is_configured !== false && binding?.status !== 'missing'
  if (!ready) return { className: 'blocked', label: '静态组合 SKU 未配置', description: sku.unavailable_reason || binding?.message || '运营需绑定对应微信虚拟商品后才能下单' }
  return { className: 'ready', label: '静态组合 SKU 已就绪', description: sku.name || sku.sku_code || sku.composition_key || '已验证微信虚拟商品绑定' }
})
const compositionReady = computed(() => skuStatus.value.className === 'ready' && Boolean(quote.value))
const canSubmit = computed(() => Boolean(draft.value.draft_id) && compositionReady.value && quote.value?.can_submit !== false && !syncing.value && !submitting.value)
const submitHint = computed(() => {
  if (!draft.value.base_spec_id) return '先选择基础套餐和规格'
  if (!draft.value.players.length) return '至少指定一位陪玩'
  if (unselectedOfferPlayers.value.length) return '请完成每位陪玩的商品选择'
  if (!compositionReady.value) return skuStatus.value.label
  return `组合 SKU 已锁定 · ${draft.value.booked_hours} 小时`
})

function money(value: unknown) {
  const number = Number(value || 0)
  return Number.isInteger(number) ? String(number) : number.toFixed(2)
}
function lineKey(line: DesignatedPricingLine) { return String(line.id || `${line.source || line.kind || line.line_type}-${line.player_id || line.player_ids?.join('-') || line.title || line.detail || line.player_type_name || 'line'}`) }
function lineTitle(line: DesignatedPricingLine) {
  const names = line.player_names?.filter(Boolean).join('、') || line.names?.filter(Boolean).join('、') || line.player_name
  if (names) return `${names} · ${line.title || line.name || line.detail || line.player_type_name || '指定单人商品'}`
  return line.title || line.name || line.detail || line.player_type_name || '公开基础名额'
}
function linePrice(line: DesignatedPricingLine) {
  const amount = Number(line.amount_per_hour ?? line.amount ?? line.total_price_per_hour ?? line.price_per_hour ?? line.unit_price_per_hour ?? line.unit_price ?? 0)
  return amount ? `¥${money(amount)}/时` : '待报价'
}
function normalizePlayer(player: OnlinePlayer): DesignatedDraftPlayer {
  const raw = player as OnlinePlayer & { designated_billing_type_id?: number; designated_billing_type_name?: string; designated_billing_type?: { id: number; name: string }; type_priority?: number }
  return {
    id: Number(raw.id), name: raw.name, avatar_url: raw.avatar_url,
    type_id: Number(raw.type_id || raw.player_type?.id || 0) || null,
    type_name: raw.type_name || raw.player_type?.name || '陪玩师',
    type_priority: Number(raw.type_priority || raw.player_type?.priority || 0) || null,
    billing_type_id: Number(raw.designated_billing_type_id || raw.designated_billing_type?.id || raw.type_id || 0) || null,
    billing_type_name: raw.designated_billing_type_name || raw.designated_billing_type?.name || raw.type_name || raw.player_type?.name || '陪玩师',
    is_online: raw.is_online === true || raw.is_online === 1 || raw.is_online === '1'
  }
}
function persist() { draft.value = saveDesignatedDraft(draft.value) }
function clearQuote() { draft.value.quote = null; draft.value.composition_sku = null; draft.value.pricing_lines = []; draft.value.quote_error = null }
function selectPackageByIndex(event: { detail?: { value?: number | string } }) {
  if (configLocked.value) return toast('已有指定陪玩，请先移除指定陪玩或重置草稿后再改组局规则')
  const next = products.value[Number(event.detail?.value || 0)]
  if (!next) return
  applyProduct(next, true)
}
function applyProduct(product: BossPackage, clearSelections = false) {
  const raw = product as BossPackage & { package_family_id?: number; package_family_name?: string }
  draft.value.package_id = product.id
  draft.value.package_name = product.name
  draft.value.package_family_id = Number(raw.package_family_id || 0) || null
  draft.value.package_family_name = raw.package_family_name || null
  draft.value.required_players = Math.max(1, Math.min(3, Number(product.player_count || 1)))
  const available = (product.specs || []).filter(item => item.is_active !== false)
  const matching = available.find(item => String(item.id) === String(draft.value.base_spec_id || '')) || available[0] || null
  applySpec(matching, false)
  if (clearSelections) draft.value.players = draft.value.players.slice(0, draft.value.required_players).map(player => ({ ...player, player_offer_id: null, package_id: null, package_name: null, spec_id: null, spec_name: null }))
  draft.value.draft_id = null
  clearQuote(); persist(); void syncQuote()
}
function applySpec(spec: BossPackageSpec | null, persistAfter = true) {
  draft.value.base_spec_id = spec?.id || null
  draft.value.base_spec_name = spec?.name || null
  draft.value.base_player_type_id = Number(spec?.required_player_type_id || 0) || null
  draft.value.base_player_type_name = spec?.required_player_type_name || null
  if (persistAfter) { draft.value.draft_id = null; clearQuote(); persist(); void syncQuote() }
}
function selectSpec(spec: BossPackageSpec) {
  if (configLocked.value) return toast('已有指定陪玩，请先移除指定陪玩或重置草稿后再改基础规格')
  applySpec(spec)
}
function changeHours(delta: number) {
  if (configLocked.value) return toast('已有指定陪玩，请先移除指定陪玩或重置草稿后再改服务时长')
  const next = Math.max(1, Math.min(24, draft.value.booked_hours + delta))
  if (next === draft.value.booked_hours) return
  draft.value.booked_hours = next; clearQuote(); persist(); void syncQuote()
}
function openPlayerPicker() {
  if (!canChoosePlayer.value) return toast('请先选择基础套餐和规格')
  go('/pages/player/list/index', { designated: 1 })
}
function openOffer(playerId: number) {
  if (!draft.value.base_spec_id) return toast('请先选择基础套餐和规格')
  go('/pages/designated/offers/index', { playerId })
}
function removePlayer(playerId: number) {
  draft.value.players = draft.value.players.filter(player => player.id !== Number(playerId)); draft.value.draft_id = null; clearQuote(); persist(); void syncQuote()
}
function buildPayload(): DesignatedDraftPayload | null {
  if (!draft.value.base_spec_id) return null
  return {
    package_id: draft.value.package_id || null,
    base_package_id: draft.value.package_id || null,
    base_spec_id: draft.value.base_spec_id,
    required_players: draft.value.required_players,
    booked_hours: draft.value.booked_hours,
    designated_player_ids: draft.value.players.map(player => player.id),
    designated_offers: draft.value.players.map(player => ({ player_id: player.id, player_offer_id: player.player_offer_id || null, package_id: player.package_id || null, spec_id: player.spec_id || null }))
  }
}
function applyQuote(nextQuote: DesignatedQuote | null | undefined) {
  if (!nextQuote) return
  draft.value.quote = nextQuote
  draft.value.composition_sku = nextQuote.composition_sku || nextQuote.compositionSku || null
  draft.value.pricing_lines = nextQuote.lines || []
  draft.value.quote_error = nextQuote.configuration_error || null
}
async function syncQuote(showFeedback = false) {
  const payload = buildPayload()
  if (!payload || !draft.value.players.length || unselectedOfferPlayers.value.length) { persist(); return }
  syncing.value = true
  try {
    const result = draft.value.draft_id
      ? await updateDesignatedDraft(draft.value.draft_id, payload)
      : await createDesignatedDraft(payload)
    draft.value.draft_id = result.draft.id
    applyQuote(result.quote || result.draft.quote || result.draft.pricing)
    if (!draft.value.quote) applyQuote(await quoteDesignatedDraft(result.draft.id))
    draft.value.quote_error = draft.value.quote?.configuration_error || null
    persist()
    lastFingerprint.value = draftFingerprint(draft.value)
    if (showFeedback && compositionReady.value) success('组合 SKU 已校验')
  } catch (error) {
    draft.value.quote_error = getErrorMessage(error, '组合商品暂未配置，请稍后重试或联系运营')
    persist()
    if (showFeedback) toast(draft.value.quote_error)
  } finally { syncing.value = false }
}
async function hydrateRoutePlayers() {
  if (!pendingRoutePlayerIds.length) return
  try {
    const list = await getPlayerList()
    for (const id of pendingRoutePlayerIds) {
      const raw = (list || []).find(player => Number(player.id) === id)
      if (!raw || draft.value.players.some(player => player.id === id) || draft.value.players.length >= draft.value.required_players) continue
      draft.value.players.push(normalizePlayer(raw))
    }
    clearQuote(); persist()
  } catch { toast('陪玩信息加载失败，请从列表重新选择') }
  finally { pendingRoutePlayerIds = [] }
}
function pullDraftFromStorage() {
  const stored = getDesignatedDraft()
  if (!stored.updated_at || stored.updated_at === draft.value.updated_at) return
  draft.value = stored
}
function resetDraft() {
  clearDesignatedDraft(); draft.value = createEmptyDesignatedDraft(); lastFingerprint.value = ''
  if (products.value.length) applyProduct(products.value[0])
  toast('已重置本次指定组局')
}
async function submit() {
  if (!form.contact.trim() || !form.gameId.trim()) return toast('请填写联系人和游戏 ID / 队伍码')
  if (!canSubmit.value) { await syncQuote(true); if (!canSubmit.value) return }
  if (!draft.value.draft_id) return
  submitting.value = true
  try {
    setStorage('boss_wechat', form.contact.trim())
    const result = await submitDesignatedDraft(draft.value.draft_id, { boss_wechat: form.contact.trim(), game_id: form.gameId.trim(), boss_note: form.note.trim() || null })
    clearDesignatedDraft(); success('组局订单已创建')
    replace('/pages/boss/waiting/index', { orderNo: result.order_no })
  } catch (error) { toast(getErrorMessage(error, '创建指定组局失败')) }
  finally { submitting.value = false }
}
function goBack() { uni.navigateBack({ delta: 1 }) }

async function loadCatalog() {
  loadingCatalog.value = true
  try {
    products.value = (await getPackages()).filter(product => (
      product.product_type !== 'guarantee'
      && [1, 2, 3].includes(Number(product.player_count || 1))
      && Boolean(product.package_family_id)
      && (product.specs || []).some(spec => spec.is_active !== false && Boolean(spec.required_player_type_id))
    ))
    const initial = products.value.find(product => product.id === Number(draft.value.package_id)) || products.value.find(product => product.id === Number((draft.value as any).initial_package_id)) || null
    if (initial) applyProduct(initial)
    else if (!draft.value.package_id && products.value[0]) applyProduct(products.value[0])
    await hydrateRoutePlayers()
    if (draft.value.players.length && !unselectedOfferPlayers.value.length) await syncQuote()
  } catch (error) { toast(getErrorMessage(error, '基础套餐加载失败')) }
  finally { loadingCatalog.value = false; booted.value = true }
}

onLoad((query) => {
  draft.value = getDesignatedDraft()
  const packageId = Number(query?.packageId || query?.package_id || 0)
  const specId = query?.specId || query?.spec_id
  const ids = String(query?.playerIds || query?.playerId || '').split(',').map(Number).filter(Boolean)
  if (ids.length) pendingRoutePlayerIds = Array.from(new Set(ids)).slice(0, 3)
  if (packageId) {
    const changedPackage = Number(draft.value.package_id || 0) !== packageId
    draft.value.package_id = packageId
    ;(draft.value as any).initial_package_id = packageId
    draft.value.source = 'shop'
    draft.value.draft_id = null
    if (changedPackage) draft.value.players = draft.value.players.map(player => ({ ...player, player_offer_id: null, package_id: null, package_name: null, spec_id: null, spec_name: null }))
  }
  if (specId) draft.value.base_spec_id = String(specId)
  if (!ids.length && query?.fromSelection === '1') {
    pendingRoutePlayerIds = getDesignatedPlayers().map(player => player.id).slice(0, 3)
  }
  void loadCatalog()
})
onShow(() => {
  if (!booted.value) return
  const before = draftFingerprint(draft.value)
  pullDraftFromStorage()
  const after = draftFingerprint(draft.value)
  if (after !== before && after !== lastFingerprint.value && draft.value.players.length && !unselectedOfferPlayers.value.length) void syncQuote()
})
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';
.designated-page { min-height:100vh; padding:22rpx 22rpx calc(184rpx + env(safe-area-inset-bottom)); color:$text; background:radial-gradient(circle at 100% 0,rgba(216,161,68,.16),transparent 28%),linear-gradient(180deg,#fbf7ef,#eef7ee); box-sizing:border-box; }
.page-head { display:flex; align-items:center; justify-content:space-between; min-height:78rpx; margin-bottom:20rpx; }.page-head>view { display:flex; flex-direction:column; align-items:center; }.back,.reset { margin:0; padding:0; border:0; background:transparent; }.back { width:72rpx; height:72rpx; color:$text; font-size:58rpx; line-height:64rpx; }.reset { min-width:72rpx; color:$muted; font-size:24rpx; }.eyebrow { color:#a87520; font-size:18rpx; font-weight:900; letter-spacing:2rpx; }.page-title { margin-top:3rpx; font-size:31rpx; font-weight:900; }
.hero { position:relative; overflow:hidden; padding:34rpx 32rpx; margin-bottom:20rpx; border-radius:28rpx; color:#fff; background:linear-gradient(135deg,#1e6e47,#2f9b63 56%,#d8a144 160%); box-shadow:0 18rpx 36rpx rgba(31,124,75,.2); }.hero::after { content:''; position:absolute; right:-54rpx; bottom:-100rpx; width:280rpx; height:280rpx; border:34rpx solid rgba(255,255,255,.12); border-radius:50%; }.hero text { display:block; position:relative; z-index:1; }.hero-kicker { color:#e4d19b; font-size:20rpx; font-weight:900; letter-spacing:1rpx; }.hero-title { margin-top:14rpx; font-size:42rpx; font-weight:900; }.hero-sub { margin-top:12rpx; max-width:86%; color:rgba(255,255,255,.84); font-size:23rpx; line-height:1.52; }
.panel { margin-top:20rpx; overflow:hidden; border:1rpx solid rgba(36,55,39,.09); border-radius:26rpx; background:rgba(255,255,255,.93); box-shadow:0 10rpx 28rpx rgba(39,61,42,.06); }.panel-head { display:flex; align-items:center; justify-content:space-between; gap:16rpx; padding:24rpx 26rpx 18rpx; border-bottom:1rpx solid rgba(36,55,39,.07); }.panel-head>view { display:flex; align-items:center; gap:12rpx; }.panel-head>view text:first-child { width:36rpx; height:36rpx; display:flex; align-items:center; justify-content:center; border-radius:50%; color:#fff; font-size:21rpx; font-weight:900; background:$green; }.panel-head>view text:last-child { font-size:29rpx; font-weight:900; }.panel-head>text { color:$muted; font-size:20rpx; }.config-row { display:flex; align-items:center; justify-content:space-between; gap:18rpx; min-height:102rpx; padding:0 26rpx; border-bottom:1rpx solid rgba(36,55,39,.06); }.config-row>text { font-size:26rpx; font-weight:800; }.config-row picker { flex:1; min-width:0; }.picker-value { overflow:hidden; color:$green-deep; font-size:25rpx; font-weight:800; text-align:right; white-space:nowrap; text-overflow:ellipsis; }.picker-value text { margin-left:8rpx; color:$muted; font-size:32rpx; }.spec-block { padding:22rpx 26rpx; }.field-label,.line-label { display:block; color:$muted; font-size:22rpx; font-weight:800; }.spec-grid { display:flex; flex-wrap:wrap; gap:12rpx; margin-top:16rpx; }.spec-chip { flex:0 0 calc(50% - 6rpx); min-height:104rpx; padding:16rpx; border:1rpx solid rgba(36,55,39,.10); border-radius:16rpx; background:#f8faf7; box-sizing:border-box; }.spec-chip text { display:block; }.spec-chip text:first-child { font-size:24rpx; font-weight:900; line-height:1.3; }.spec-chip text:last-child { margin-top:8rpx; color:$muted; font-size:19rpx; }.spec-chip.active { border-color:$green; background:#eef9ef; }.spec-chip.active text:first-child { color:$green-deep; }.hours-row { border-bottom:0; }.stepper { display:flex; align-items:center; overflow:hidden; border-radius:16rpx; background:#f2f6f0; }.stepper button { width:58rpx; height:60rpx; padding:0; margin:0; color:$green-deep; font-size:31rpx; line-height:60rpx; background:#e5f0e5; }.stepper button::after,.bottom-bar button::after,.quote-btn::after,.add-player::after,.offer-btn::after,.remove-btn::after { border:none; }.stepper text { min-width:115rpx; color:$text; font-size:22rpx; font-weight:900; text-align:center; }.config-hint { margin:0 26rpx 24rpx; padding:15rpx 17rpx; border-radius:14rpx; color:#7c642e; font-size:21rpx; background:#fff7df; }.empty { display:flex; flex-direction:column; align-items:center; gap:10rpx; padding:40rpx 28rpx; color:$muted; font-size:24rpx; text-align:center; line-height:1.45; }
.player-list { padding:4rpx 24rpx; }.player-row { display:flex; align-items:center; gap:14rpx; min-height:116rpx; padding:14rpx 0; border-bottom:1rpx solid rgba(36,55,39,.07); }.avatar { width:72rpx; height:72rpx; flex-shrink:0; border-radius:22rpx; background:#eaf3e8; }.avatar-empty { display:flex; align-items:center; justify-content:center; color:#fff; font-size:30rpx; font-weight:900; background:$green; }.player-info { flex:1; min-width:0; }.player-info text { display:block; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }.player-info text:first-child { font-size:26rpx; font-weight:900; }.player-info text:nth-child(2) { margin-top:4rpx; color:$muted; font-size:20rpx; }.offer-name,.needs-offer { margin-top:5rpx; font-size:19rpx; }.offer-name { color:$green-deep; }.needs-offer { color:#b36c28; }.row-actions { display:flex; align-items:center; gap:8rpx; }.offer-btn,.remove-btn { margin:0; border-radius:13rpx; font-size:20rpx; }.offer-btn { min-width:88rpx; height:54rpx; color:$green-deep; background:#eaf7ed; }.remove-btn { width:48rpx; height:48rpx; padding:0; color:#a95d48; font-size:34rpx; line-height:46rpx; background:#fff0ed; }.add-player { display:flex; align-items:center; justify-content:center; width:calc(100% - 52rpx); height:74rpx; margin:18rpx 26rpx 24rpx; border:1rpx dashed rgba(47,155,99,.52); border-radius:16rpx; color:$green-deep; font-size:24rpx; font-weight:900; background:#f4fbf4; }.add-player[disabled] { color:#9ca69a; border-color:#d9ded7; background:#f5f6f4; }.disabled-tip { display:block; margin:-8rpx 26rpx 20rpx; color:#b36c28; font-size:20rpx; }
.summary-panel { padding-bottom:22rpx; }.summary-note { margin:18rpx 26rpx 8rpx; color:$muted; font-size:21rpx; line-height:1.45; }.server-tag { color:#a87520!important; }.line-group { padding:18rpx 26rpx 4rpx; }.public-group { margin-top:8rpx; }.price-line { display:flex; align-items:center; justify-content:space-between; gap:16rpx; margin-top:13rpx; color:$text; font-size:23rpx; }.price-line text:first-child { flex:1; min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }.price-line text:last-child { color:$green-deep; font-weight:900; }.price-line.waiting text { color:$muted; font-weight:500; }.no-line { display:block; margin-top:12rpx; color:$muted; font-size:21rpx; }.sku-status { display:flex; flex-direction:column; gap:4rpx; margin:22rpx 26rpx 0; padding:15rpx 17rpx; border-radius:16rpx; }.sku-status text:first-child { font-size:23rpx; font-weight:900; }.sku-status text:last-child { font-size:20rpx; line-height:1.4; }.sku-status.ready { color:#187444; background:#eaf8ed; }.sku-status.waiting { color:#896c27; background:#fff7df; }.sku-status.blocked { color:#a04d3d; background:#fff0ed; }.total-row { display:flex; align-items:flex-end; justify-content:space-between; margin:24rpx 26rpx 0; padding-top:20rpx; border-top:1rpx solid rgba(36,55,39,.08); }.total-row text { display:block; }.total-row text:first-child { font-size:26rpx; font-weight:900; }.total-row text:last-child { margin-top:5rpx; color:$muted; font-size:19rpx; }.total-row strong { color:#d85b3f; font-size:38rpx; }.quote-error { display:block; margin:14rpx 26rpx 0; color:#a04d3d; font-size:20rpx; line-height:1.4; }.quote-btn { width:calc(100% - 52rpx); height:72rpx; margin:20rpx 26rpx 0; border-radius:16rpx; color:$green-deep; font-size:24rpx; font-weight:900; background:#eaf7ed; }.quote-btn[disabled] { color:#9ba49a; background:#f1f3f0; }
.contact-panel { padding-bottom:24rpx; }.input,.note { width:calc(100% - 52rpx); box-sizing:border-box; margin:18rpx 26rpx 0; border:1rpx solid rgba(36,55,39,.10); border-radius:15rpx; color:$text; font-size:24rpx; background:#fafcf9; }.input { height:82rpx; padding:0 19rpx; }.note { height:136rpx; padding:17rpx 19rpx; }.bottom-bar { position:fixed; left:0; right:0; bottom:0; z-index:20; display:flex; align-items:center; justify-content:space-between; gap:18rpx; padding:16rpx 22rpx calc(16rpx + env(safe-area-inset-bottom)); background:rgba(255,255,255,.98); box-shadow:0 -10rpx 28rpx rgba(39,61,42,.09); }.bottom-bar>view { flex:1; min-width:0; }.bottom-bar text,.bottom-bar strong { display:block; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }.bottom-bar text { color:$muted; font-size:19rpx; }.bottom-bar strong { margin-top:4rpx; color:#d85b3f; font-size:31rpx; }.bottom-bar button { min-width:260rpx; height:82rpx; margin:0; border-radius:22rpx; color:#fff; font-size:25rpx; font-weight:900; background:linear-gradient(135deg,#65c980,$green-deep); }.bottom-bar button[disabled] { color:#fff; background:#b8c2b7; }
.spec-chip.locked { opacity: .62; }
.config-lock-tip { display: block; margin: 0 26rpx 24rpx; color: #8a6b31; font-size: 19rpx; line-height: 1.45; }
.stepper button[disabled] { color: #a3ada1; background: #edf0eb; }
</style>
