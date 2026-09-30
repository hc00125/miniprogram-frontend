<template>
  <view class="patronage-page">
    <view class="intro-card">
      <text class="eyebrow">冠名 · 包天</text>
      <view v-if="catalog?.player" class="player-row">
        <image v-if="catalog.player.avatar_url" class="avatar" :src="catalog.player.avatar_url" mode="aspectFill" />
        <view><text class="title">{{ catalog.player.name }}</text><text class="muted">为喜欢的陪玩留下你的支持</text></view>
      </view>
      <text v-else class="title">冠名与包天</text>
      <text class="notice">{{ catalog?.purchase_enabled === true ? '使用现有钻石余额，确认后购买。' : '购买尚未开放，仅可查看套餐与报价。' }}</text>
    </view>

    <view v-if="loading" class="card muted">正在加载套餐…</view>
    <view v-else-if="error" class="card"><text class="notice">{{ error }}</text><button class="secondary" data-action="retry" @tap="loadCatalog">重新加载</button></view>
    <template v-else-if="catalog">
      <view class="card">
        <text class="section-title">选择套餐</text>
        <view v-if="!catalog.packages.length" class="muted">暂无可展示的套餐</view>
        <view class="package-grid">
          <button v-for="item in catalog.packages" :key="item.code" class="package-option" :class="{ selected: selected?.code === item.code }" :disabled="!item.available || busy" :data-action="`package-${item.code}`" @tap="selectPackage(item)">
            <text class="package-name">{{ item.name }}</text>
            <text class="price">{{ item.amount_diamonds === null ? '暂未配置' : `${item.amount_diamonds} 钻` }}</text>
            <text class="muted">{{ item.code === 'day_pass' ? '赠送一周冠名' : item.code === 'year' ? '365天（1年）' : `${item.duration_days}天` }}</text>
            <text v-if="!item.available" class="blocker">{{ item.blockers.includes('HOURLY_RATE_UNSET') ? '包天时薪暂未设置' : '当前套餐暂不可用' }}</text>
          </button>
        </view>
      </view>
      <view v-if="selected" class="card">
        <text class="section-title">{{ selected.name }}说明</text>
        <template v-if="selected.code === 'day_pass'">
          <text class="body-copy">包天时薪由后台按0.5元步长设置；价格按时薪 × 8 × 0.85 计价。</text>
          <text class="body-copy">赠送一周冠名（7天），按同一规则累加。</text>
          <text class="muted">8小时仅为计价说明，不限制服务时长，不自动计时或完单。</text>
        </template>
        <text v-else class="body-copy">冠名在陪玩详情展示，到期后结束展示。</text>
        <text class="body-copy">付款成功后生效；同老板同陪玩续购累加，未到期从原到期日延长，已到期从本次付款起算。</text>
        <text class="body-copy">支持多位老板同时冠名，不独占、不锁单，不影响其他老板下单或陪玩接单。</text>
      </view>
      <view class="card quote-card">
        <text class="section-title">服务端报价</text>
        <text v-if="quoting" class="muted">正在获取报价…</text>
        <text v-else-if="quoteError" class="notice">{{ quoteError }}</text>
        <template v-else-if="quote">
          <view class="quote-row"><text>本次报价</text><text class="price">{{ quote.amount_diamonds }} 钻</text></view>
          <view class="quote-row muted"><text>可用钻石（已扣预留）</text><text>{{ quote.available_diamonds }} 钻</text></view>
          <text v-for="reason in quote.blockers" :key="reason" class="notice">{{ blockerLabel(reason) }}</text>
        </template>
        <text v-else class="muted">{{ loggedIn ? '请选择可用套餐查看报价' : '登录后可查看本人可用钻石与报价' }}</text>
        <button v-if="!loggedIn" class="secondary" data-action="login" @tap="openLogin">去登录</button>
        <button v-else-if="selected && !quoting" class="secondary" data-action="quote" @tap="selectPackage(selected)">刷新报价</button>
      </view>
    </template>
    <view v-if="loggedIn" class="card">
      <text class="section-title">交易核对</text>
      <text v-if="paymentMessage" class="notice">{{ paymentMessage }}</text>
      <text v-if="intent" class="body-copy">原交易：{{ intent.purchase_no || '尚未取得订单号' }} · {{ intent.payment_status === 'prepared' ? '尚未发送' : patronagePaymentLabel(intent.payment_status) }}</text>
      <button v-if="intent?.dispatch_started" class="secondary" data-action="recover" :disabled="busy" @tap="recover">查询原交易</button>
      <button v-if="intent && (!intent.dispatch_started || intent.confirmed_by_key)" class="secondary" data-action="buy-again" :disabled="busy || !ready" @tap="buy(true)">{{ intent.dispatch_started ? '明确再次购买' : '放弃未发送意图并重新购买' }}</button>
      <text class="muted">{{ pendingCount === null ? '未决交易尚未核对，暂不能新购' : `服务端未决交易 ${pendingCount} 笔` }}</text>
      <text v-if="pendingCount" class="notice">存在未决交易，禁止新购。此处仅列首屏；未显示的记录同样阻止购买，请查询原单或联系客服核实。</text>
      <button class="secondary" data-action="pending" :disabled="busy" @tap="refreshPending">重新查证未决交易</button>
      <view v-for="item in pendingRecords" :key="item.idempotency_key">
        <text class="body-copy">{{ item.player_name }} · {{ item.package_name }} · {{ patronagePaymentLabel(item.payment_status) }}</text>
        <button class="secondary" :data-action="`pending-${item.purchase_no}`" :disabled="busy" @tap="recoverPending(item)">查询此原单</button>
      </view>
    </view>
    <view class="card">
      <text class="muted">暂不提供自助退款，如有问题请找客服人工核实处理。</text>
      <button class="secondary" data-action="support" @tap="openSupport">联系客服</button>
    </view>
    <view class="purchase-footer">
      <text class="muted">{{ purchaseReason }}</text>
      <button class="purchase-button" data-action="purchase" :disabled="!canPurchase" :loading="busy" @tap="buy(false)">确认购买</button>
      <button class="records-link" data-action="records" @tap="openRecords">我的冠名 / 包天记录 ›</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { getPatronageCatalog, getPatronageQuote, getPatronagePending, createPatronagePaymentAdapter, patronagePaymentLabel, patronageSession, type PatronageRecord, type PatronageCatalog, type PatronagePackage, type PatronageQuote } from '@/api/patronage'
import { SESSION_EXPIRED_EVENT, getClientSessionGeneration } from '@/utils/sessionExpiry'
import { go } from '@/utils/nav'
import { createPatronagePaymentIntent, type PatronageIntent } from '@/utils/patronagePaymentIntent'
import { getClientPlatform, isIOSPurchaseEnabled } from '@/utils/purchaseAvailability'

const playerId = ref<number | undefined>()
const catalog = ref<PatronageCatalog | null>(null)
const selected = ref<PatronagePackage | null>(null)
const quote = ref<PatronageQuote | null>(null)
const loading = ref(false), quoting = ref(false), loggedIn = ref(false)
const error = ref(''), quoteError = ref('')
let visible = false, generation = 0, quoteGeneration = 0
function blockerLabel(reason: string) {
  const labels: Record<string, string> = { PURCHASE_NOT_ENABLED: '购买尚未开放', HOURLY_RATE_UNSET: '包天时薪暂未设置', PRICE_PRECISION_UNSUPPORTED: '当前价格精度暂不支持结算', INSUFFICIENT_BALANCE: '可用钻石不足', ACCOUNT_RESTRICTED: '当前账户受限' }
  return labels[reason] || '当前报价暂不可用于购买'
}
async function loadCatalog() {
  const current = ++generation, session = stamp()
  ++quoteGeneration
  catalog.value = null; selected.value = null; quote.value = null; error.value = ''; quoteError.value = ''; quoting.value = false
  loggedIn.value = Boolean(patronageSession())
  if (!playerId.value) { error.value = '未找到陪玩，请从陪玩详情进入'; return }
  loading.value = true
  try {
    const result = await getPatronageCatalog(playerId.value)
    if (!visible || current !== generation || session !== stamp()) return
    if (result.player?.id !== playerId.value) throw new Error('陪玩信息不匹配，请重新进入')
    catalog.value = result
    const first = result.packages.find(item => item.available)
    if (first) await selectPackage(first)
  } catch (e) {
    if (visible && current === generation && session === stamp()) error.value = '套餐加载失败，请稍后重试；购买尚未开放'
  } finally { if (current === generation) loading.value = false }
}
async function selectPackage(item: PatronagePackage) {
  if (!visible || busy.value || !item.available || !playerId.value) return
  selected.value = item; quote.value = null; quoteError.value = ''
  const current = ++quoteGeneration, session = stamp()
  loggedIn.value = Boolean(patronageSession())
  if (!loggedIn.value) { quoting.value = false; return }
  quoting.value = true
  try {
    const result = await getPatronageQuote(playerId.value, item.code)
    if (!visible || current !== quoteGeneration || session !== stamp()) return
    quote.value = result
  } catch {
    if (visible && current === quoteGeneration && session === stamp()) quoteError.value = '报价暂不可用，请刷新重试；不会扣款'
  } finally { if (current === quoteGeneration) quoting.value = false }
}
function clearPage() {
  controller?.invalidate(); controller = null; controllerReady.value = false; busy.value = false; intent.value = null; pendingCount.value = null; pendingRecords.value = []; paymentMessage.value = ''
  ++generation; ++quoteGeneration
  catalog.value = null; selected.value = null; quote.value = null; error.value = ''; quoteError.value = ''; loading.value = false; quoting.value = false
}
function hide() { visible = false; clearPage() }
function expired(key: string) { if (key === 'token') { clearPage(); loggedIn.value = false; error.value = '登录已过期，请重新登录' } }
function openLogin() { go('/pages/client/login/index') }
function openSupport() { go('/pages/client/customer-service/index') }
function openRecords() { go('/pages/client/patronage/records') }
onLoad(query => { const raw = String(query?.playerId || ''); playerId.value = /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : undefined })
onShow(async () => {
  visible = true
  const owner = stamp(), loadingTask = loadCatalog(), ticket = generation
  await loadingTask
  if (guard(ticket, owner) && loggedIn.value) { initController(); await refreshPending() }
})
onHide(hide); onUnload(hide)
uni.$on(SESSION_EXPIRED_EVENT, expired)
onUnmounted(() => { hide(); uni.$off(SESSION_EXPIRED_EVENT, expired) })
const controllerReady = ref(false)
const busy = ref(false), paymentMessage = ref(''), pendingCount = ref<number | null>(null)
const pendingRecords = ref<PatronageRecord[]>([]), intent = ref<PatronageIntent | null>(null)
const adapter = createPatronagePaymentAdapter()
let controller: ReturnType<typeof createPatronagePaymentIntent> | null = null
const account = () => String(uni.getStorageSync('client_profile')?.id || '')
const stamp = () => JSON.stringify([patronageSession(), account(), getClientSessionGeneration()])
function guard(ticket: number, owner: string) { return visible && ticket === generation && owner === stamp() }
function initController() {
  controllerReady.value = false
  controller?.invalidate()
  const token = patronageSession(), owner = account()
  if (!token || !owner) { paymentMessage.value = '请重新登录后核对交易'; return }
  controller = createPatronagePaymentIntent({
    session: () => ({ accountId: patronageSession() === token ? account() : '', loginGeneration: getClientSessionGeneration() }),
    adapter, pending: getPatronagePending,
    newKey: () => `patronage-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  })
  try { intent.value = controller.snapshot(); controllerReady.value = true } catch (e) { paymentMessage.value = message(e); controller = null }
}
function message(e: any) { return typeof e?.detail === 'string' ? e.detail : e?.message || '交易状态暂不可确认，请查询原单或联系客服' }
const platformBlocked = () => getClientPlatform() === 'ios' && !isIOSPurchaseEnabled()
const ready = computed(() => controllerReady.value && selected.value?.available === true && !selected.value.blockers.length && loggedIn.value && catalog.value?.purchase_enabled === true && quote.value?.can_submit === true && !quote.value.blockers.length && pendingCount.value === 0 && !quoting.value && !loading.value && !platformBlocked())
const canPurchase = computed(() => ready.value && !busy.value && (!intent.value || !intent.value.dispatch_started))
const purchaseReason = computed(() => {
  if (!loggedIn.value) return '请先登录'
  if (!controllerReady.value) return '交易恢复记录尚未就绪，请重新进入或联系客服'
  if (platformBlocked()) return 'iOS端虚拟支付当前未启用'
  if (catalog.value?.purchase_enabled !== true) return '购买尚未开放'
  if (intent.value?.dispatch_started) return intent.value.confirmed_by_key ? '原交易已核实，再购请点击明确再次购买' : '原交易待确认，只能查询原交易'
  if (pendingCount.value !== 0) return pendingCount.value === null ? '请先核对服务端未决交易' : '服务端存在未决交易，禁止新购'
  return quote.value?.blockers.length ? quote.value.blockers.map(blockerLabel).join('；') : !ready.value ? '请获取可购买报价' : '点击后需再次确认；不会自动充值'
})
async function checkPending(ticket: number, owner: string) {
  pendingCount.value = null
  const page = await getPatronagePending()
  if (!guard(ticket, owner)) throw new Error('页面或登录状态已变化')
  pendingRecords.value = page.results; pendingCount.value = page.count
  return page.count === 0 && !page.next && !page.results.length
}
async function refreshPending() {
  if (busy.value || !visible || !loggedIn.value) return
  const ticket = generation, owner = stamp(); busy.value = true
  try { await checkPending(ticket, owner) } catch (e) { if (guard(ticket, owner)) paymentMessage.value = message(e) }
  finally { if (guard(ticket, owner)) busy.value = false }
}
function confirmedMessage() {
  intent.value = controller!.snapshot()
  paymentMessage.value = intent.value?.confirmed_by_key && intent.value.payment_status === 'paid' ? '购买成功，冠名权益与收益已由服务端确认。' : intent.value?.confirmed_by_key ? '原交易失败已核实，可明确再次购买。' : '交易结果待确认，请查询原交易；不会重新扣款。'
}
async function buy(again: boolean) {
  if (busy.value || !ready.value || (!again && !canPurchase.value) || !controller) return
  const ticket = generation, owner = stamp(), c = controller, q = quote.value!, name = selected.value?.name || '套餐'
  busy.value = true; paymentMessage.value = ''
  try {
    if (!await checkPending(ticket, owner)) throw new Error('服务端存在未决交易，请先核对')
    const accepted = await new Promise<boolean>(resolve => uni.showModal({ title: again ? '确认再次购买' : '确认购买', content: `${catalog.value?.player?.name} · ${name}，消费 ${q.amount_diamonds} 钻。${again ? '将归档上一意图并开始新的一笔。' : ''}`, confirmText: '确认购买', success: r => resolve(r.confirm), fail: () => resolve(false) }))
    if (!guard(ticket, owner) || !accepted) return
    const freshCatalog = await getPatronageCatalog(q.player_id)
    if (!guard(ticket, owner)) return
    catalog.value = freshCatalog
    const fresh = await getPatronageQuote(q.player_id, q.package_code)
    if (!guard(ticket, owner)) return
    quote.value = fresh
    const freshPackage = freshCatalog.packages.find(item => item.code === q.package_code)
    selected.value = freshPackage || null
    if (!freshPackage?.available || freshPackage.blockers.length || freshCatalog.player?.id !== q.player_id || freshCatalog.purchase_enabled !== true || !fresh.can_submit || fresh.blockers.length || platformBlocked()) throw new Error('购买条件已变化，请重新查看报价')
    if (fresh.price_version !== q.price_version || fresh.amount_diamonds !== q.amount_diamonds || fresh.amount_yuan !== q.amount_yuan) throw new Error('价格已变化，请重新确认报价')
    if (again) await c.startNew(fresh); else c.prepare(fresh)
    if (!guard(ticket, owner)) return
    intent.value = c.snapshot()
    const code = await new Promise<string>((resolve, reject) => uni.login({ provider: 'weixin', success: r => r.code ? resolve(r.code) : reject(new Error('微信登录失败，未发起付款')), fail: () => reject(new Error('微信登录失败，未发起付款')) }))
    if (!guard(ticket, owner)) return
    if (!await checkPending(ticket, owner)) throw new Error('服务端存在未决交易，请先核对')
    await c.dispatch(code)
    if (!guard(ticket, owner)) return
    // A POST receipt is not final confirmation. Only original-key GET can unlock.
    await c.recover()
    if (guard(ticket, owner)) confirmedMessage()
  } catch (e) {
    if (guard(ticket, owner)) {
      try { intent.value = c.snapshot() } catch { /* Keep last view; never unlock a damaged journal. */ }
      paymentMessage.value = `${message(e)}${intent.value?.dispatch_started ? '；仅可查询原交易，不会重新提交。' : ''}`
    }
  } finally { if (guard(ticket, owner)) busy.value = false }
}
async function recover() {
  if (busy.value || !controller || !visible) return
  const ticket = generation, owner = stamp(), c = controller; busy.value = true
  try { await c.recover(); if (guard(ticket, owner)) confirmedMessage() }
  catch (e) { if (guard(ticket, owner)) paymentMessage.value = message(e) }
  finally { if (guard(ticket, owner)) busy.value = false }
}
async function recoverPending(item: PatronageRecord) {
  if (busy.value || !visible) return
  if (intent.value?.idempotency_key === item.idempotency_key) { await recover(); return }
  const ticket = generation, owner = stamp(); busy.value = true
  try {
    const result = await adapter.byKey(item.idempotency_key)
    if (!guard(ticket, owner)) return
    if (result.purchase_no !== item.purchase_no || result.price_version !== item.price_version || result.player_id !== item.player_id || result.package_code !== item.package_code) throw new Error('原单信息不匹配')
    paymentMessage.value = `原单 ${result.purchase_no}：${patronagePaymentLabel(result.payment_status)}；仅查询，不会重提购买。`
    await checkPending(ticket, owner)
  } catch (e) { if (guard(ticket, owner)) paymentMessage.value = message(e) }
  finally { if (guard(ticket, owner)) busy.value = false }
}
</script>

<style scoped>
.patronage-page{min-height:100vh;box-sizing:border-box;padding:24rpx 24rpx calc(260rpx + env(safe-area-inset-bottom));background:#f7f3ea;color:#172116}.intro-card,.card{padding:28rpx;margin-bottom:22rpx;border-radius:28rpx;background:#fff;box-shadow:0 12rpx 28rpx rgba(39,61,42,.06)}.intro-card{background:linear-gradient(135deg,#fff,#eef8e7)}.eyebrow{display:block;color:#1f7c4b;font-size:23rpx;font-weight:700}.player-row{display:flex;align-items:center;gap:20rpx;margin-top:16rpx}.avatar{width:96rpx;height:96rpx;border-radius:24rpx}.title{display:block;font-size:38rpx;font-weight:800}.section-title{display:block;margin-bottom:20rpx;font-size:29rpx;font-weight:800}.muted{display:block;color:#687665;font-size:23rpx;line-height:1.6}.notice{display:block;margin-top:16rpx;color:#8f6535;font-size:24rpx;line-height:1.6}.body-copy{display:block;margin:14rpx 0;font-size:25rpx;line-height:1.7}.package-grid{display:grid;grid-template-columns:1fr 1fr;gap:16rpx}.package-option{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;width:100%;min-height:184rpx;box-sizing:border-box;margin:0;padding:22rpx 18rpx;border:2rpx solid #edf0e7;border-radius:22rpx;background:#fafbf7;text-align:left;line-height:1.6}.package-option.selected{border-color:#2f9b63;background:#eef8e7}.package-option[disabled]{opacity:.65;color:#687665}.package-name{font-size:28rpx;font-weight:800}.price{color:#1f7c4b;font-size:29rpx;font-weight:800;word-break:break-all}.blocker{font-size:22rpx;color:#8f6535}.quote-row{display:flex;align-items:center;justify-content:space-between;gap:20rpx;margin:14rpx 0}.secondary{display:flex;align-items:center;justify-content:center;width:100%;min-height:76rpx;box-sizing:border-box;margin:20rpx 0 0;padding:16rpx 24rpx;border-radius:20rpx;background:#eef8e7;color:#1f7c4b;font-size:25rpx}.purchase-footer{position:fixed;left:0;right:0;bottom:0;padding:16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));background:#fffaf2;border-top:1rpx solid #e7eadf;text-align:center}.purchase-button{background:#1f7c4b;color:#fff;display:flex;align-items:center;justify-content:center;width:100%;min-height:84rpx;box-sizing:border-box;margin:10rpx 0;padding:20rpx;border-radius:24rpx;font-size:28rpx;font-weight:800}.purchase-button[disabled]{background:#e2e9df;color:#71816e}.records-link{display:block;width:100%;margin:0;padding:8rpx;color:#1f7c4b;background:transparent;font-size:23rpx}button::after{border:0}
</style>
