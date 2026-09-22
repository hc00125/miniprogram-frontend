import { BASE_URL } from '@/utils/request'
import { handleSessionExpiry } from '@/utils/sessionExpiry'

declare const wx: any

export type ComplaintCategory = 'service' | 'fee' | 'account' | 'other'
export type ComplaintStatus = 'pending' | 'processing' | 'awaiting_user' | 'resolved' | 'closed'
export interface ComplaintAttachment { id: number; name: string; content_url: string }
export interface ComplaintMessage { id?: number; content: string; author: string; created_at: string; attachments: ComplaintAttachment[] }
export interface Complaint {
  number: string; category: ComplaintCategory; description: string; status: ComplaintStatus
  order_no: string; contact: string; created_at: string; updated_at: string
  attachments: ComplaintAttachment[]; messages: ComplaintMessage[]
  status_history: { from_status: ComplaintStatus; to_status: ComplaintStatus; created_at: string }[]
}
export interface ComplaintPage { results: Complaint[]; next: string | null; count?: number }
const ROOT = '/support/complaints/'
const FILES = '/support/complaint-attachments/'
function token() { return String(uni.getStorageSync('token') || '') }
function url(path: string) { return `${BASE_URL.replace(/\/$/, '')}${path}` }
// /support in the shared request helper prefers admin_token. This user-only adapter
// deliberately binds token and reuses the existing expiry handler, never replaying writes.
function request<T>(method: 'GET' | 'POST', path: string, data?: any): Promise<T> {
  const sentToken = token()
  return new Promise((resolve, reject) => {
    uni.request({ url: url(path), method, data, header: { Authorization: `Bearer ${sentToken}` },
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (sentToken !== token()) { reject({ handled: true, code: 'STALE_SESSION' }); return }
          resolve(res.data as T)
        } else {
          const error = typeof res.data === 'object' ? res.data : { detail: `请求失败（${res.statusCode}）` }
          reject(handleSessionExpiry(res.statusCode, error, path, 'token', sentToken) || { ...error as any, statusCode: res.statusCode })
        }
      }, fail: reject
    })
  })
}
function normalizeMessage(message: any): ComplaintMessage {
  return { ...message, author: typeof message.author === 'string' ? message.author : message.author_role === 'user' ? '我' : '平台客服', attachments: message.attachments || [] }
}
export async function getComplaint(number: string): Promise<Complaint> {
  const data = await request<Complaint>('GET', `${ROOT}${encodeURIComponent(number)}/`)
  return { ...data, attachments: data.attachments || [], messages: (data.messages || []).map(normalizeMessage), status_history: data.status_history || [] }
}
export async function addComplaintMessage(number: string, status: ComplaintStatus, content: string, attachmentIds: number[]) {
  if (status === 'closed') throw new Error('工单已关闭，不能继续补充')
  if (!content.trim() || Array.from(content.trim()).length > 1000) throw new Error('请填写补充内容（1—1000字），可附图片')
  if (attachmentIds.length > 3) throw new Error('最多上传3张图片')
  return normalizeMessage(await request<ComplaintMessage>('POST', `${ROOT}${encodeURIComponent(number)}/messages/`, { content: content.trim(), attachment_ids: attachmentIds }))
}
export interface LocalComplaintImage { path: string; size: number; id?: number }
export async function chooseComplaintImages(count: number): Promise<LocalComplaintImage[]> {
  if (count < 1) throw new Error('最多上传3张图片')
  const privacy: any = typeof wx !== 'undefined' ? wx : uni
  if (typeof privacy.getPrivacySetting !== 'function') throw new Error('当前微信版本不支持隐私授权，请升级微信')
  await new Promise<void>((resolve, reject) => privacy.getPrivacySetting({
    success: (result: any) => result.needAuthorization ? reject({ privacyRequired: true }) : resolve(), fail: reject
  }))
  return new Promise((resolve, reject) => uni.chooseMedia({
    count: Math.min(count, 3), mediaType: ['image'], sourceType: ['album', 'camera'],
    success: result => {
      const images = result.tempFiles.map(file => ({ path: file.tempFilePath, size: file.size }))
      if (images.some(file => !file.size || file.size > 5 * 1024 * 1024)) { reject(new Error('每张图片须不超过5MB')); return }
      resolve(images)
    }, fail: reject
  }))
}
export async function uploadComplaintImage(file: LocalComplaintImage): Promise<ComplaintAttachment> {
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('每张图片须不超过5MB')
  const sentToken = token()
  return new Promise((resolve, reject) => uni.uploadFile({
    url: url(FILES), filePath: file.path, name: 'file', header: { Authorization: `Bearer ${sentToken}` },
    success: res => {
      let data: any
      try { data = JSON.parse(res.data) } catch { reject(new Error('图片上传响应异常，请重试')); return }
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (sentToken !== token()) { reject({ handled: true }); return }
        if (!data.id) { reject(new Error('图片上传未返回附件编号')); return }
        resolve(data)
      } else reject(handleSessionExpiry(res.statusCode, data, FILES, 'token', sentToken) || { ...data, statusCode: res.statusCode })
    }, fail: reject
  }))
}
export function downloadComplaintImage(file: ComplaintAttachment): Promise<string> {
  // Construct from the trusted base + ID, never send credentials to content_url origins.
  const path = `${FILES}${encodeURIComponent(file.id)}/content/`
  const sentToken = token()
  return new Promise((resolve, reject) => uni.downloadFile({
    url: url(path), header: { Authorization: `Bearer ${sentToken}` },
    success: res => {
      if (sentToken !== token()) { reject({ handled: true }); return }
      if (res.statusCode === 200 && res.tempFilePath) { resolve(res.tempFilePath); return }
      // downloadFile does not expose the JSON error body. A GET to the same private
      // endpoint on 401/403 lets the shared handler distinguish expiry from permission.
      if (res.statusCode === 401 || res.statusCode === 403) {
        request('GET', path).then(() => reject(new Error('图片加载失败，请重试')), reject)
      } else reject(new Error(`图片加载失败（${res.statusCode}）`))
    }, fail: reject
  }))
}
// Short-lived in-memory drafts survive the existing login redirect; never persist
// private complaint materials or tokens to disk. A different user cannot restore them.
const drafts = new Map<string, { at: number; value: any }>()
export function complaintDraftOwner() {
  if (!token()) return ''
  const profile = uni.getStorageSync('client_profile')
  return profile?.id ? `client:${profile.id}` : profile?.code ? `client:${profile.code}` : ''
}
export function saveComplaintDraft(owner: string, kind: string, value: any) {
  if (!owner) return
  const key = `${owner}:${kind}`
  if (value === null) { drafts.delete(key); return }
  if (drafts.size >= 5 && !drafts.has(key)) drafts.delete(drafts.keys().next().value!)
  drafts.set(key, { at: Date.now(), value: JSON.parse(JSON.stringify(value)) })
}
export function readComplaintDraft(owner: string, kind: string) {
  if (!owner) return null
  const key = `${owner}:${kind}`, draft = drafts.get(key)
  if (!draft || Date.now() - draft.at > 30 * 60 * 1000) { drafts.delete(key); return null }
  return JSON.parse(JSON.stringify(draft.value))
}
export function listComplaints(page = 1) { return request<ComplaintPage>('GET', ROOT, { page }) }
export const categoryLabels: Record<ComplaintCategory, string> = { service: '服务问题', fee: '费用争议', account: '账号问题', other: '其他' }
export const statusLabels: Record<ComplaintStatus, string> = { pending: '待处理', processing: '处理中', awaiting_user: '待补充', resolved: '已解决', closed: '已关闭' }
export interface ComplaintForm { category: ComplaintCategory; description: string; order_no: string; contact: string; attachment_ids: number[] }
export interface SubmissionState { busy: boolean; number: string; clientRequestId: string; fingerprint?: string }
export function newRequestId() { return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` }
export function validateComplaint(form: ComplaintForm) {
  if (!Object.prototype.hasOwnProperty.call(categoryLabels, form.category)) throw new Error('请选择投诉类型')
  const length = Array.from(form.description.trim()).length
  if (length < 10 || length > 1000) throw new Error('问题描述须为10—1000字')
  if (form.attachment_ids.length > 3) throw new Error('最多上传3张图片')
}
export async function submitComplaint(state: SubmissionState, form: ComplaintForm) {
  if (state.busy || state.number) return
  validateComplaint(form)
  const fingerprint = JSON.stringify(form)
  if (state.fingerprint && state.fingerprint !== fingerprint) state.clientRequestId = newRequestId()
  state.fingerprint = fingerprint
  state.busy = true
  try {
    const result = await request<Complaint>('POST', ROOT, { ...form, description: form.description.trim(), client_request_id: state.clientRequestId })
    if (!result.number) throw new Error('未收到工单编号，请先到我的反馈核对后再重试')
    state.number = result.number
    return result
  } finally { state.busy = false }
}
