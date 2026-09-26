import { createSurchargeOrder, paySurchargeOrder, readSurchargeOrderByKey, createSurchargeWechatPayment, querySurchargeWechat, finalizeSurchargeWechat, type SurchargeOrder } from '@/api/surchargeCheckout'
import type { SurchargeQuote, SurchargeQuoteRequest } from '@/api/surchargeQuote'
type SessionV2 = {account:string;token:string}
type IntentV2 = {key:string; quote_version:string; total_amount_yuan:string; surcharge_diamonds:number; required_players?:number; order_no:string; status:string; submitted?:boolean; verified?:boolean; attempt_id?:string|null; payment_method?:'wechat'|'balance'; recharge_no?:string; retry_from_payment_no?:string; cancelled_verified?:boolean}
const storageKeyV2=(account:string)=>`surcharge:v2:checkout:${encodeURIComponent(account)}`
const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value))
function readV2(account:string):IntentV2|null {
  if (!account) return null
  const d=uni.getStorageSync(storageKeyV2(account))
  if (!d) return null
  if (typeof d.key !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(d.key)
    || !/^[a-f0-9]{64}$/.test(d.quote_version) || !/^(?:0|[1-9]\d*)\.\d{2}$/.test(d.total_amount_yuan)
    || !Number.isSafeInteger(d.surcharge_diamonds) || d.surcharge_diamonds < 1
    || (d.required_players !== undefined && (!Number.isSafeInteger(d.required_players) || d.required_players < 1))
    || typeof d.order_no !== 'string' || !['unknown','created','processing','paid','failed'].includes(d.status)
    || (d.submitted !== undefined && typeof d.submitted !== 'boolean')
    || (d.verified !== undefined && typeof d.verified !== 'boolean')
    || (d.attempt_id !== undefined && d.attempt_id !== null && (typeof d.attempt_id !== 'string' || !d.attempt_id))
    || (d.payment_method !== undefined && !['wechat','balance'].includes(d.payment_method))
    || (d.recharge_no !== undefined && (typeof d.recharge_no!=='string' || !d.recharge_no))
    || (d.retry_from_payment_no !== undefined && (typeof d.retry_from_payment_no!=='string' || !d.retry_from_payment_no))
    || (d.cancelled_verified !== undefined && typeof d.cancelled_verified!=='boolean')
    || (d.cancelled_verified === true && (d.status!=='failed' || !!d.attempt_id || !d.order_no || d.verified===true))
    || (d.verified === true && (d.status !== 'paid' || !d.order_no || !d.attempt_id))) throw new Error('原加价交易记录异常，请联系客服，不可重新下单')
  return copy(d)
}
function saveV2(account:string,d:IntentV2,replacedClosedRecharge=''){
  const old=readV2(account)
  if(old && old.key===d.key && (old.submitted===true && d.submitted!==true || old.verified===true && d.verified!==true
    || old.attempt_id && d.attempt_id!==old.attempt_id
    || old.payment_method && d.payment_method!==old.payment_method
    || old.recharge_no && d.recharge_no!==old.recharge_no && !(replacedClosedRecharge===old.recharge_no
      && old.retry_from_payment_no===replacedClosedRecharge && d.payment_method==='wechat' && d.submitted===true && !old.attempt_id))) throw new Error('原付款状态不能回退，请只查询原单')
  if(old && old.key!==d.key && !(old.status==='paid' && old.verified===true) && old.cancelled_verified!==true) throw new Error('原单尚未确认，请先查询原单，勿更换标识重扣')
  const record=copy(d)
  uni.setStorageSync(storageKeyV2(account),record)
  if (JSON.stringify(readV2(account))!==JSON.stringify(record)) throw new Error('原交易标识未保存，禁止发起扣款')
}
function newV2Key(){return `checkout_${Date.now().toString(36)}_${Array.from({length:4},()=>Math.floor(Math.random()*0xffffffff).toString(36)).join('_')}`}
/** Durable original key and monotonic dispatch marker; no payload, token or WeChat code is persisted. */
export function makeSurchargeIntent(session:()=>SessionV2){
  let generation=0, busy:Promise<any>|null=null, live=true, order:SurchargeOrder|null=null, closedRecharge=''
  const identity=()=>{const s=session();if(!s.account||!s.token)throw new Error('请登录客户账号');return s}
  const assert=(s:SessionV2,g:number)=>{if(!live||generation!==g||session().account!==s.account||session().token!==s.token)throw new Error('会话或页面已失效，只能查询原单')}
  function state(){const s=identity();return readV2(s.account)}
  function close(){live=false;generation++;order=null;closedRecharge=''}
  function create(payload:SurchargeQuoteRequest,quote:SurchargeQuote):Promise<SurchargeOrder>{
    if(busy)return busy
    const s=identity(),old=readV2(s.account)
    if(old && !(old.status==='paid' && old.verified===true) && old.cancelled_verified!==true)return Promise.reject(new Error('原单尚未确认，请先查询原单，勿更换标识重扣'))
    if(!quote.can_submit||quote.blockers.length||!Number.isSafeInteger(quote.required_players)||quote.required_players<1
      ||quote.surcharge.required_players!==quote.required_players||!Number.isSafeInteger(payload.surcharge_diamonds)||payload.surcharge_diamonds<=0
      ||payload.surcharge_diamonds!==quote.surcharge.amount_diamonds) return Promise.reject(new Error('报价不允许创建，请重新报价'))
    const frozen=copy(payload) as SurchargeQuoteRequest, q=copy(quote) as SurchargeQuote
    const d:IntentV2={key:newV2Key(),quote_version:q.quote_version,total_amount_yuan:q.total_amount_yuan,surcharge_diamonds:frozen.surcharge_diamonds,required_players:q.required_players,order_no:'',status:'unknown',submitted:false,verified:false,attempt_id:null}
    saveV2(s.account,d)
    const g=generation
    const op=createSurchargeOrder({...frozen,quote_version:d.quote_version,idempotency_key:d.key},q).then(raw=>{
      assert(s,g)
      const result=copy(raw)
      if(result.checkout.idempotency_key!==d.key||result.checkout.total_amount_yuan!==d.total_amount_yuan||result.checkout.quote_version!==d.quote_version
        ||result.checkout.surcharge.amount_diamonds!==d.surcharge_diamonds||result.checkout.surcharge.required_players!==d.required_players)throw new Error('创建回复与原报价不一致，请查询原单')
      // A create response is never an authoritative payment readback.
      const status=result.checkout.payment_status==='paid'?'unknown':result.checkout.payment_status
      const next={...d,order_no:result.order_no,status,attempt_id:result.checkout.attempt_id}
      saveV2(s.account,next);order=result;return copy(result)
    }).finally(()=>{if(busy===op)busy=null})
    busy=op;return op
  }
  function refresh():Promise<SurchargeOrder>{
    if(busy)return busy
    const s=identity(),d=readV2(s.account)
    if(!d)return Promise.reject(new Error('没有原单标识，无法恢复'))
    const g=generation
    const op=readSurchargeOrderByKey(d.key).then(raw=>{
      assert(s,g)
      const result=copy(raw),c=result.checkout
      if(c.idempotency_key!==d.key||c.total_amount_yuan!==d.total_amount_yuan||c.quote_version!==d.quote_version
        ||c.surcharge.amount_diamonds!==d.surcharge_diamonds||d.required_players!==undefined&&c.surcharge.required_players!==d.required_players
        ||d.order_no&&result.order_no!==d.order_no
        ||d.attempt_id && c.attempt_id!==d.attempt_id
        ||d.verified===true && c.payment_status!=='paid'
        ||d.status==='failed' && c.payment_status!=='failed') throw new Error('原单与记录不一致，请联系客服')
      // A GET showing created cannot erase the fact that a payment POST was dispatched.
      const status=c.refund && d.verified!==true ? 'unknown' : d.submitted===true && c.payment_status==='created'?'unknown':c.payment_status
      const next:IntentV2={...d,order_no:result.order_no,status,
        verified:c.payment_status==='paid' && !c.refund && !/cancel|取消/i.test(result.status) ? true : d.verified,
        cancelled_verified:result.status==='已取消' && c.payment_status==='failed' && c.attempt_id===null && !d.attempt_id && !c.refund,
        attempt_id:c.attempt_id || d.attempt_id || null}
      saveV2(s.account,next);order=result;return copy(result)
    }).finally(()=>{if(busy===op)busy=null})
    busy=op;return op
  }
  function pay(code?:string):Promise<any>{
    if(busy)return busy
    const s=identity(),d=readV2(s.account),g=generation
    if(!d||!order||order.order_no!==d.order_no||order.checkout.payment_status!=='created'||order.checkout.attempt_id!==null
      ||d.status!=='created'||d.submitted!==false||d.verified===true||d.required_players===undefined
      ||order.checkout.surcharge.required_players!==d.required_players) return Promise.reject(new Error('原支付可能已处理、失败或未确认，请查询原单，勿再次付款'))
    // Reliable write/readback must finish BEFORE dispatch. No storage => zero POST.
    saveV2(s.account,{...d,status:'unknown',submitted:true})
    const original=copy(order)
    const op=paySurchargeOrder(original,code).then(raw=>{
      assert(s,g)
      const result=copy(raw),current=readV2(s.account)!
      if(current.key!==d.key||current.order_no!==d.order_no||result.checkout.payment_status==='created'
        || current.attempt_id && result.checkout.attempt_id!==current.attempt_id) throw new Error('付款状态异常，请只查询原单')
      // Bind the validated POST attempt before readback, without trusting its paid status.
      saveV2(s.account,{...current,status:'unknown',attempt_id:result.checkout.attempt_id})
      // POST paid is not proof of completion. Only a matching by-key GET may verify it.
      return result
    }).finally(()=>{if(busy===op)busy=null})
    busy=op;return op
  }
  async function beginWechat(code:string,retry=false){
    const s=identity(),d=readV2(s.account),g=generation
    assert(s,g)
    if(busy || !d || !order || d.order_no!==order.order_no
      || (retry ? !closedRecharge || d.recharge_no!==closedRecharge || d.payment_method!=='wechat' || !!d.attempt_id || d.verified===true
        : d.status!=='created' || d.submitted!==false)
      || order.checkout.payment_status!=='created' || order.checkout.attempt_id!==null
      || d.required_players!==order.checkout.surcharge.required_players)throw new Error('请查询原单，勿重复发起微信支付')
    const replaced=retry?closedRecharge:''
    closedRecharge=''
    saveV2(s.account,{...d,status:'unknown',submitted:true,payment_method:'wechat',...(retry?{retry_from_payment_no:replaced}:{})})
    const result=await createSurchargeWechatPayment(copy(order),code,replaced)
    assert(s,g)
    const current=readV2(s.account)!
    if(current.key!==d.key)throw new Error('原单标识已变化')
    saveV2(s.account,{...current,recharge_no:result.payment_no,retry_from_payment_no:undefined},replaced)
    return result
  }
  async function reconcileWechat(login:()=>Promise<string>){
    const s=identity(),d=readV2(s.account),g=generation
    assert(s,g)
    if(busy || !d || !order || d.payment_method!=='wechat' || d.verified || d.attempt_id
      || order.checkout.refund || /cancel|取消/i.test(order.status) && order.checkout.payment_status!=='created')return
    closedRecharge=''
    const original=copy(order),result=await querySurchargeWechat(original,d.recharge_no,d.retry_from_payment_no)
    assert(s,g)
    if(result.found && result.status!=='paid'){
      const current=readV2(s.account)!
      if(current.key!==d.key || current.order_no!==d.order_no)throw new Error('原单标识已变化')
      saveV2(s.account,{...current,recharge_no:result.payment_no,
        retry_from_payment_no:result.payment_no===d.recharge_no?current.retry_from_payment_no:undefined},d.retry_from_payment_no)
      if(result.retry_allowed===true)closedRecharge=result.payment_no
    }
    if(result.found && result.status==='credited' && !/cancel|取消/i.test(original.status)){
      const code=await login();assert(s,g)
      const current=readV2(s.account)!
      if(current.key!==d.key || current.order_no!==d.order_no)throw new Error('原单标识已变化')
      const finished=await finalizeSurchargeWechat(original,result.payment_no,code)
      assert(s,g)
      const latest=readV2(s.account)!
      saveV2(s.account,{...latest,status:'unknown',attempt_id:finished.checkout.attempt_id})
    }
    return result
  }
  return {state,create,refresh,pay,close,beginWechat,reconcileWechat,retryWechat:(code:string)=>beginWechat(code,true)}
}
