import type * as Kook from '@/api/kook'
export function errorText(e: any) {
  if (e?.handled) return '登录状态已变化，请重新登录后刷新'
  if (e?.statusCode === 503) return 'KOOK通知暂未开放，请稍后再试'
  if (e?.statusCode === 404) return '接口未部署或记录已不可用，请刷新重试'
  if (e?.statusCode === 403) return '请使用已审核陪玩师的微信账号；如仍受限请联系客服'
  if (e?.statusCode === 409) return '绑定状态有变化或账号已被绑定，请刷新后重试'
  if (e?.statusCode === 410) return '绑定码已过期，请重新获取'
  if (e?.statusCode === 429) return '操作频繁，请稍后再试'
  return '请求未完成，请刷新核对结果，不会自动重试'
}
export function deliveryText(status: string) {
  return ({ queued: '等待平台发送', sent: '平台已发送，不代表对方已读', failed: '平台发送失败', unknown: '发送结果未知，不自动重发', cancelled: '发送已取消' } as Record<string, string>)[status] || '发送状态暂不可用'
}
function requestId() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const n = Math.floor(Math.random() * 16); return (c === 'x' ? n : (n & 3) | 8).toString(16) }) }
export function initialState() {
  return { binding: null as Kook.Binding | null, challenge: null as Kook.Challenge | null, challengeId: '', code: '', busy: false, error: '', consent: false, delivery: null as Kook.Delivery | null, deliveryId: '', testRequestId: '', now: Date.now() }
}
export function createController(s: ReturnType<typeof initialState>, api: typeof Kook, ask: (text: string) => Promise<boolean>) {
  let epoch = 0
  function clearChallenge() { s.challenge = null; s.challengeId = ''; s.code = '' }
  async function run(task: (active: () => boolean) => Promise<void>) {
    if (s.busy) return
    const generation = epoch; s.busy = true; s.error = ''
    try { await task(() => generation === epoch) } catch (e: any) {
      if (generation === epoch) { s.error = errorText(e); if (e?.statusCode === 410 || e?.statusCode === 409) clearChallenge() }
    } finally { if (generation === epoch) s.busy = false }
  }
  const controller = {
    reset: () => { epoch++; Object.assign(s, initialState()) },
    // Hide invalidates in-flight UI updates; only non-secret IDs survive this page's lifetime.
    hide: () => { epoch++; s.busy = false; s.code = ''; if (s.challenge) s.challenge = { ...s.challenge, confirmation_nonce: undefined } },
    load: () => run(async active => {
      const b = await api.getBinding()
      if (!active()) return
      if (!['unbound', 'pending', 'awaiting_confirmation', 'bound'].includes(b?.status)) throw new Error('Invalid binding')
      s.binding = b
      const id = s.challengeId || b.challenge_id
      if (id) { const c = await api.getChallenge(id); if (active()) { s.challengeId = id; s.challenge = c } }
    }),
    cancel: () => run(async active => { if (!s.challengeId) return; await api.cancelChallenge(s.challengeId); if (active()) clearChallenge() }),
    remove: () => run(async active => {
      const version = s.binding?.binding_version
      if (!version || !(await ask('解绑后停止向此账号发送通知，已发送的历史消息不会撤回。确定解绑？')) || !active()) return
      await api.unbind(version)
      if (active()) { s.binding = { status: 'unbound', notifications_enabled: false }; clearChallenge(); s.delivery = null; s.deliveryId = ''; s.testRequestId = '' }
    }),
    toggle: (enabled: boolean) => run(async active => { const b = await api.setNotifications(enabled); if (active()) s.binding = b }),
    test: () => run(async active => {
      if (!s.binding?.notifications_enabled || s.delivery?.status === 'queued' || s.delivery?.status === 'unknown') return
      if (!s.testRequestId) s.testRequestId = requestId()
      const d = await api.sendTest(s.testRequestId)
      if (!active()) return
      if (!d.delivery_id || !['queued', 'sent', 'failed', 'unknown', 'cancelled'].includes(d.status)) throw new Error('Invalid delivery')
      s.delivery = d; s.deliveryId = d.delivery_id
    }),
    start: () => run(async active => {
      const rebind = s.binding?.status === 'bound'
      if (rebind && !(await ask('更换KOOK账号？新账号确认前保留原绑定。'))) return
      if (!active()) return
      const c = await api.createChallenge(rebind ? 'rebind' : 'bind')
      if (!active()) return
      if (!c.challenge_id || !c.code || !Number.isFinite(Date.parse(c.expires_at))) throw new Error('Invalid challenge')
      s.challengeId = c.challenge_id; s.code = c.code; s.challenge = { ...c, code: undefined, status: 'pending' }; s.consent = false
    }),
    poll: () => run(async active => {
      if (s.challengeId && !['expired', 'cancelled', 'confirmed'].includes(s.challenge?.status || '')) {
        const c = await api.getChallenge(s.challengeId)
        if (!active()) return
        s.challenge = c; if (c.status !== 'pending') s.code = ''
      }
      if (s.deliveryId) {
        const d = await api.getTest(s.deliveryId)
        if (active()) { s.delivery = d; if (['sent', 'failed', 'cancelled'].includes(d.status)) s.testRequestId = '' }
      }
    }),
    confirmBinding: () => run(async active => {
      if (s.challenge?.status !== 'awaiting_confirmation' || !s.challenge.confirmation_nonce || !(Date.parse(s.challenge.expires_at) > Date.now())) return
      if (!(await ask(`确认 ${s.challenge.masked_kook_user || ''} 是你本人的KOOK账号？`)) || !active()) return
      const b = await api.confirmChallenge(s.challengeId, s.challenge.confirmation_nonce, s.consent)
      if (active()) { if (b?.status !== 'bound' || !b.binding_version || typeof b.notifications_enabled !== 'boolean') throw new Error('Invalid binding'); s.binding = b; clearChallenge(); s.delivery = null; s.deliveryId = ''; s.testRequestId = '' }
    }),
    tick: (now: number) => { s.now = now; if (s.challenge && ['pending', 'awaiting_confirmation'].includes(s.challenge.status) && Date.parse(s.challenge.expires_at) <= now) { s.challenge = { ...s.challenge, status: 'expired', confirmation_nonce: undefined }; s.code = '' } }
  }
  return controller
}
