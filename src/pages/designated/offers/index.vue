<template>
  <view class="offers-page">
    <view class="topbar"><button @tap="goBack">‹</button><view><text>为 {{ player?.name || '陪玩师' }} 选择商品</text><text>只展示后台分配、与本次组局兼容的单人商品</text></view></view>

    <view v-if="draft.base_spec_id" class="group-context">
      <text>本次组局</text>
      <strong>{{ draft.package_name || '基础套餐' }} · {{ draft.base_spec_name || '基础规格' }}</strong>
      <text>{{ draft.required_players }} 人 · {{ draft.booked_hours }} 小时 · {{ draft.base_player_type_name || '基础类型' }}</text>
    </view>
    <view v-else class="blocked-card"><text>请先完成组局配置</text><button @tap="backToGroup">返回组局页</button></view>

    <view v-if="player" class="player-card">
      <image v-if="player.avatar_url" :src="player.avatar_url" mode="aspectFill" />
      <view v-else class="avatar-placeholder">{{ player.name.slice(0, 1) }}</view>
      <view><text>{{ player.name }}</text><text>{{ player.billing_type_name || player.type_name || '陪玩师' }} · 指定名额</text></view>
    </view>

    <view v-if="loading" class="state">正在加载 TA 可售的装备商品…</view>
    <view v-else-if="loadError" class="state error"><text>{{ loadError }}</text><button @tap="loadOffers">重新加载</button></view>
    <view v-else-if="!choices.length" class="state"><text>该陪玩暂未分配与本组局兼容的单人商品</text><text>请更换陪玩或联系运营配置商品族。</text></view>
    <view v-else class="offer-list">
      <view v-for="choice in choices" :key="choice.key" class="offer-card" :class="{ active: selectedChoice?.key === choice.key }" @tap="selectedChoice = choice">
        <view class="offer-head"><view><text>{{ choice.package.name }}</text><text>{{ choice.familyName }}</text></view><text v-if="selectedChoice?.key === choice.key" class="check">✓</text></view>
        <text class="spec-name">{{ choice.spec.name }}</text>
        <view class="offer-meta"><text>{{ choice.spec.required_player_type_name || choice.offer.designated_billing_type_name || player?.billing_type_name || '指定陪玩' }} · 单人商品</text><strong v-if="Number(choice.spec.price || 0)">¥{{ money(choice.spec.price) }}/时</strong><text v-else>价格以组合报价为准</text></view>
        <text class="offer-note">{{ choice.fallbackTier ? '该陪玩未返回指定计费等级，提交后将由服务端再次校验兼容性。' : '加入后会回到组局清单，由服务端重新命中静态组合 SKU。' }}</text>
      </view>
    </view>

    <view v-if="choices.length" class="bottom"><view><text>{{ selectedChoice ? selectedChoice.package.name : '请选择一个兼容商品' }}</text><text>{{ selectedChoice?.spec.name || '' }}</text></view><button :disabled="!selectedChoice" @tap="confirmChoice">加入本次组局</button></view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getPlayerDesignatedOffers, type DesignatedOfferPackage, type DesignatedOfferSpec, type PlayerOffer } from '@/api/designated'
import { getPlayerList, type OnlinePlayer } from '@/api/boss'
import { getErrorMessage, toast } from '@/utils/feedback'
import { backToRoute } from '@/utils/nav'
import { getDesignatedDraft, saveDesignatedDraft, type DesignatedDraftPlayer, type DesignatedGroupDraft } from '@/utils/designatedDraft'

interface OfferChoice {
  key: string
  offer: PlayerOffer
  package: DesignatedOfferPackage
  spec: DesignatedOfferSpec
  familyName: string
  fallbackTier: boolean
}

const draft = ref<DesignatedGroupDraft>(getDesignatedDraft())
const playerId = ref<number | null>(null)
const player = ref<DesignatedDraftPlayer | null>(null)
const choices = ref<OfferChoice[]>([])
const selectedChoice = ref<OfferChoice | null>(null)
const loading = ref(false)
const loadError = ref('')

function money(value: unknown) { const number = Number(value || 0); return Number.isInteger(number) ? String(number) : number.toFixed(2) }
function normalizePlayer(raw: OnlinePlayer): DesignatedDraftPlayer {
  const item = raw as OnlinePlayer & { designated_billing_type_id?: number; designated_billing_type_name?: string; designated_billing_type?: { id: number; name: string }; type_priority?: number; is_online?: unknown }
  return {
    id: Number(item.id), name: item.name, avatar_url: item.avatar_url,
    type_id: Number(item.type_id || item.player_type?.id || 0) || null,
    type_name: item.type_name || item.player_type?.name || '陪玩师',
    type_priority: Number(item.type_priority || item.player_type?.priority || 0) || null,
    billing_type_id: Number(item.designated_billing_type_id || item.designated_billing_type?.id || item.type_id || 0) || null,
    billing_type_name: item.designated_billing_type_name || item.designated_billing_type?.name || item.type_name || item.player_type?.name || '陪玩师',
    is_online: item.is_online === true || item.is_online === 1 || item.is_online === '1'
  }
}
function flattenOffers(offers: PlayerOffer[]) {
  const familyId = Number(draft.value.package_family_id || 0)
  const result: OfferChoice[] = []
  for (const offer of offers) {
    if (offer.is_active === false || offer.is_available === false || offer.is_compatible === false) continue
    const packages = offer.packages?.length
      ? offer.packages
      : offer.package_family?.packages?.length
        ? offer.package_family.packages
        : offer.package ? [offer.package] : []
    for (const packageItem of packages) {
      const packageFamilyId = Number(packageItem.package_family_id || offer.package_family_id || offer.package_family?.id || 0)
      if (familyId && packageFamilyId && familyId !== packageFamilyId) continue
      if (Number(packageItem.player_count || 1) !== 1) continue
      const activeSpecs = (packageItem.specs || []).filter(spec => spec.is_active !== false)
      const billingTypeId = Number(offer.designated_billing_type_id || 0)
      const tierSpecs = billingTypeId
        ? activeSpecs.filter(spec => Number(spec.required_player_type_id || 0) === billingTypeId)
        : activeSpecs
      // If the offer did not expose a billing tier at all, keep a visibly
      // provisional fallback.  A known tier with no matching spec is an
      // operations configuration issue and must not be selectable.
      const fallbackTier = !billingTypeId
      for (const spec of tierSpecs) {
        result.push({
          key: `${offer.id}-${packageItem.id}-${spec.id}`,
          offer, package: packageItem, spec,
          familyName: packageItem.package_family_name || offer.package_family_name || offer.package_family?.name || draft.value.package_family_name || '兼容装备商品',
          fallbackTier
        })
      }
    }
  }
  return result
}
async function loadPlayer() {
  if (!playerId.value || player.value) return
  try {
    const list = await getPlayerList()
    const found = (list || []).find(item => Number(item.id) === playerId.value)
    if (found) player.value = normalizePlayer(found)
  } catch { /* an existing persisted player snapshot is sufficient */ }
}
async function loadOffers() {
  if (!playerId.value) return
  if (!draft.value.base_spec_id) { loadError.value = '请先返回组局页选择基础套餐和规格'; return }
  loading.value = true; loadError.value = ''
  try {
    await loadPlayer()
    const result = await getPlayerDesignatedOffers(playerId.value, draft.value.package_family_id)
    choices.value = flattenOffers(result.offers || [])
    const previous = player.value && draft.value.players.find(item => item.id === player.value?.id)
    selectedChoice.value = choices.value.find(choice => String(choice.offer.id) === String(previous?.player_offer_id || '') && String(choice.spec.id) === String(previous?.spec_id || '')) || choices.value[0] || null
  } catch (error) { loadError.value = getErrorMessage(error, '可售商品加载失败，请稍后重试') }
  finally { loading.value = false }
}
function confirmChoice() {
  const choice = selectedChoice.value
  const current = player.value
  if (!choice || !current) return toast('陪玩信息不完整，请返回重试')
  const existingIndex = draft.value.players.findIndex(item => item.id === current.id)
  if (existingIndex < 0 && draft.value.players.length >= draft.value.required_players) return toast(`本次组局最多指定 ${draft.value.required_players} 名陪玩`)
  const next: DesignatedDraftPlayer = {
    ...(existingIndex >= 0 ? draft.value.players[existingIndex] : current),
    player_offer_id: choice.offer.id,
    package_id: choice.package.id,
    package_name: choice.package.name,
    spec_id: choice.spec.id,
    spec_name: choice.spec.name,
    package_family_id: choice.package.package_family_id || choice.offer.package_family_id || choice.offer.package_family?.id || null,
    package_family_name: choice.package.package_family_name || choice.offer.package_family_name || choice.offer.package_family?.name || null
  }
  if (existingIndex >= 0) draft.value.players.splice(existingIndex, 1, next)
  else draft.value.players.push(next)
  draft.value.draft_id = null
  draft.value.quote = null
  draft.value.composition_sku = null
  draft.value.pricing_lines = []
  draft.value.quote_error = null
  saveDesignatedDraft(draft.value)
  backToGroup()
}
function goBack() { uni.navigateBack({ delta: 1 }) }
function backToGroup() { backToRoute('/pages/designated/group/index') }

onLoad((query) => {
  draft.value = getDesignatedDraft()
  playerId.value = Number(query?.playerId || query?.player_id || 0) || null
  player.value = draft.value.players.find(item => item.id === playerId.value) || null
  void loadOffers()
})
</script>

<style lang="scss" scoped>
@import '@/styles/theme.scss';
.offers-page { min-height:100vh; padding:24rpx 22rpx calc(142rpx + env(safe-area-inset-bottom)); box-sizing:border-box; color:$text; background:linear-gradient(180deg,#fbf7ef,#eff8ef); }.topbar { display:flex; align-items:center; gap:14rpx; }.topbar button { width:72rpx; height:72rpx; padding:0; margin:0; color:$text; font-size:58rpx; line-height:64rpx; border:0; background:transparent; }.topbar view { flex:1; min-width:0; }.topbar text { display:block; }.topbar text:first-child { font-size:31rpx; font-weight:900; }.topbar text:last-child { margin-top:4rpx; overflow:hidden; color:$muted; font-size:19rpx; white-space:nowrap; text-overflow:ellipsis; }.group-context { display:flex; flex-direction:column; gap:7rpx; padding:22rpx 24rpx; margin-top:20rpx; border-radius:22rpx; color:#fff; background:linear-gradient(135deg,#1f7c4b,#4caf72); }.group-context text:first-child { color:#ddedcf; font-size:19rpx; font-weight:900; }.group-context strong { font-size:27rpx; }.group-context text:last-child { color:rgba(255,255,255,.8); font-size:21rpx; }.player-card { display:flex; align-items:center; gap:16rpx; padding:22rpx 24rpx; margin-top:18rpx; border-radius:22rpx; background:#fff; box-shadow:0 10rpx 26rpx rgba(39,61,42,.06); }.player-card image,.avatar-placeholder { width:78rpx; height:78rpx; flex-shrink:0; border-radius:24rpx; background:$green; }.avatar-placeholder { display:flex; align-items:center; justify-content:center; color:#fff; font-size:32rpx; font-weight:900; }.player-card text { display:block; }.player-card text:first-child { font-size:28rpx; font-weight:900; }.player-card text:last-child { margin-top:5rpx; color:$muted; font-size:21rpx; }.state,.blocked-card { display:flex; flex-direction:column; align-items:center; gap:12rpx; padding:72rpx 30rpx; margin-top:20rpx; border-radius:22rpx; color:$muted; font-size:24rpx; text-align:center; line-height:1.5; background:rgba(255,255,255,.72); }.state.error { color:#a14c3e; }.state button,.blocked-card button { height:62rpx; padding:0 26rpx; margin:0; border-radius:999rpx; color:$green-deep; font-size:22rpx; background:#eaf7ed; }.offer-list { display:flex; flex-direction:column; gap:16rpx; margin-top:20rpx; }.offer-card { padding:22rpx 23rpx; border:2rpx solid transparent; border-radius:23rpx; background:#fff; box-shadow:0 10rpx 26rpx rgba(39,61,42,.06); }.offer-card.active { border-color:$green; background:#f6fcf6; }.offer-head { display:flex; justify-content:space-between; gap:12rpx; }.offer-head view { min-width:0; }.offer-head text { display:block; }.offer-head text:first-child { overflow:hidden; font-size:28rpx; font-weight:900; white-space:nowrap; text-overflow:ellipsis; }.offer-head text:last-child { margin-top:5rpx; color:#a87520; font-size:19rpx; }.check { width:42rpx; height:42rpx; display:flex; align-items:center; justify-content:center; flex-shrink:0; border-radius:50%; color:#fff; font-size:25rpx; font-weight:900; background:$green; }.spec-name { display:block; margin-top:19rpx; color:$green-deep; font-size:25rpx; font-weight:900; }.offer-meta { display:flex; align-items:center; justify-content:space-between; gap:12rpx; margin-top:13rpx; color:$muted; font-size:21rpx; }.offer-meta text { flex:1; min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }.offer-meta strong { color:#d85b3f; font-size:26rpx; }.offer-note { display:block; margin-top:15rpx; padding-top:14rpx; border-top:1rpx solid rgba(36,55,39,.07); color:$muted; font-size:19rpx; line-height:1.45; }.bottom { position:fixed; left:0; right:0; bottom:0; z-index:20; display:flex; align-items:center; justify-content:space-between; gap:16rpx; padding:16rpx 22rpx calc(16rpx + env(safe-area-inset-bottom)); background:rgba(255,255,255,.98); box-shadow:0 -10rpx 28rpx rgba(39,61,42,.09); }.bottom view { flex:1; min-width:0; }.bottom text { display:block; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }.bottom text:first-child { font-size:23rpx; font-weight:900; }.bottom text:last-child { margin-top:3rpx; color:$muted; font-size:19rpx; }.bottom button { min-width:220rpx; height:78rpx; margin:0; border-radius:22rpx; color:#fff; font-size:25rpx; font-weight:900; background:linear-gradient(135deg,#65c980,$green-deep); }.bottom button::after { border:none; }.bottom button[disabled] { background:#b8c2b7; }
</style>
