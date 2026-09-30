const vue = require('vue')
const { harness, nodes } = require('./commerce-sfc-harness.cjs')
const tick = () => new Promise(setImmediate)
function setup(file, apiOverrides={}, props={}) {
 const life={load:[],show:[],hide:[],unload:[],unmount:[]},calls=[]
 const apiProxy={};let epoch=0
 const h=harness({vue:{...vue,onUnmounted:f=>life.unmount.push(f),onBeforeUnmount:f=>life.unmount.push(f)},'@dcloudio/uni-app':{onLoad:f=>life.load.push(f),onShow:f=>life.show.push(f),onHide:f=>life.hide.push(f),onUnload:f=>life.unload.push(f)},'@/api/patronage':apiProxy,'@/utils/sessionExpiry':{SESSION_EXPIRED_EVENT:'session:expired',getClientSessionGeneration:()=>String(epoch),handleSessionExpiry:()=>null},'@/utils/nav':{go:(...args)=>calls.push(args)}})
 h.uni.navigateTo=o=>calls.push(o);h.uni.request=o=>{throw Error(`Unexpected request ${o.method} ${o.url}`)}
 h.uni.setStorageSync=(k,v)=>{h.storage[k]=structuredClone(v)}
 const api=h.load('src/api/patronage.ts')
 Object.assign(apiProxy,api,apiOverrides)
 const ui=h
 const C=ui.load(file).default,scope=vue.effectScope(),draw=scope.run(()=>C.setup(props,{expose(){}}))
 const tree=()=>nodes(draw({},[])),text=()=>tree().filter(n=>typeof n.children==='string').map(n=>n.children).join('|'),action=id=>tree().find(n=>n.props?.['data-action']===id)
 return {h,ui,life,calls,scope,tree,text,action,api,relogin:()=>epoch++}
}
const catalog=()=>({contract_version:'1.0',purchase_enabled:false,commission_rate:'0.25',player:{id:7,name:'陪玩甲',avatar_url:'',hourly_rate_yuan:'50.00'},packages:[{code:'day',kind:'naming',name:'日冠',duration_days:1,amount_yuan:'188.00',amount_diamonds:'1880.0',available:true,blockers:[]},{code:'day_pass',kind:'day_pass',name:'包天',duration_days:null,amount_yuan:'340.00',amount_diamonds:'3400.0',available:true,blockers:[],bonus_naming_days:7}]})
const quote=()=>({contract_version:'1.0',player_id:7,package_code:'day',amount_yuan:'188.00',amount_diamonds:'1880.0',commission_rate:'0.25',platform_amount_yuan:'47.00',player_amount_yuan:'141.00',price_version:'a'.repeat(64),available_diamonds:'2000.0',can_submit:false,blockers:['PURCHASE_NOT_ENABLED']})
module.exports={setup,tick,catalog,quote}
