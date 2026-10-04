const vue=require('vue')
const {harness,nodes}=require('./commerce-sfc-harness.cjs')
const tick=()=>new Promise(setImmediate)
const row=(kind='gift',id=1)=>({id:`${kind}:${id}`,kind,boss_name:'老板甲',player_id:7,player_name:'陪玩乙',item_name:kind==='gift'?'玫瑰':'周冠',quantity:1,occurred_at:'2026-09-30T12:00:00+08:00',text:kind==='gift'?'老板「老板甲」赠送「陪玩乙」「玫瑰」×1':'老板「老板甲」为「陪玩乙」开通「周冠」'})
function setup(file,initialProps={}){
 const life={load:[],show:[],hide:[],unload:[],unmount:[]},calls=[],requests=[]
 const h=harness({vue:{...vue,resolveComponent:name=>name,onBeforeUnmount:f=>life.unmount.push(f)},'@dcloudio/uni-app':{onLoad:f=>life.load.push(f),onShow:f=>life.show.push(f),onHide:f=>life.hide.push(f),onUnload:f=>life.unload.push(f)},'@/utils/nav':{go:(...a)=>calls.push(a)}})
 h.uni.request=o=>requests.push(o);h.uni.setNavigationBarTitle=o=>calls.push(['title',o.title])
 const scope=vue.effectScope(),props=vue.reactive(initialProps),C=h.load(file).default
 const draw=scope.run(()=>C.setup(props,{expose(){}})),tree=()=>nodes(draw({},[]))
 const text=()=>tree().filter(n=>typeof n.children==='string').map(n=>n.children).join('|')
 const action=id=>tree().find(n=>n.props?.['data-action']===id)
 const respond=(r,rows=[row(r.data.kind)],count=rows.length)=>r.success({statusCode:200,data:{count,page:r.data.page,page_size:r.data.page_size,results:rows}})
 const close=()=>{life.unmount.forEach(f=>f());scope.stop()}
 return {h,life,calls,requests,props,tree,text,action,respond,close}
}
module.exports={setup,row,tick}
