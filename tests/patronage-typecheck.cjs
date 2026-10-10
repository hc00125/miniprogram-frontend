// Semantic-check actual SFC scripts + patronage modules without changing project dependencies.
const path=require('node:path'),fs=require('node:fs'),ts=require('typescript'),{parse,compileScript}=require('@vue/compiler-sfc')
const root=path.join(__dirname,'..'),cfg=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile),parsed=ts.parseJsonConfigFileContent(cfg.config,ts.sys,root)
const key=name=>{const normalized=path.resolve(name).replace(/\\/g,'/');return ts.sys.useCaseSensitiveFileNames?normalized:normalized.toLowerCase()}
const virtual=new Map()
const sfcFiles=['src/pages/client/patronage/index.vue','src/pages/client/patronage/records.vue','src/components/PatronageCrowns.vue','src/components/PatronageWallPanel.vue','src/pages/boss/home/index.vue','src/pages/player/list/index.vue','src/components/gifts/GiftHost.vue','src/pages/client/patronage-wall/index.vue','src/pages/client/rankings/index.vue','src/pages/client/patronage-announcements/index.vue','src/components/VipSummaryCard.vue','src/pages/client/profile/index.vue','src/pages/client/account/index.vue']
for(const file of sfcFiles){
 const name=path.join(root,file+'.ts'),descriptor=parse(fs.readFileSync(path.join(root,file),'utf8')).descriptor
 virtual.set(key(name),compileScript(descriptor,{id:file}).content)
}
const targets=['src/api/patronage.ts','src/api/patronageWall.ts','src/utils/patronagePaymentIntent.ts','src/utils/sessionExpiry.ts'].map(f=>path.join(root,f)).concat(sfcFiles.map(file=>path.join(root,file+'.ts')))
const host=ts.createCompilerHost(parsed.options),get=host.getSourceFile.bind(host),exists=host.fileExists.bind(host),read=host.readFile.bind(host)
host.getSourceFile=(name,...args)=>virtual.has(key(name))?ts.createSourceFile(name,virtual.get(key(name)),args[0],true):get(name,...args)
host.fileExists=name=>virtual.has(key(name))||exists(name);host.readFile=name=>virtual.get(key(name))??read(name)
const targetKeys=new Set(targets.map(key))
const program=ts.createProgram([...targets,...parsed.fileNames.filter(p=>p.endsWith('.d.ts'))],parsed.options,host),diagnostics=ts.getPreEmitDiagnostics(program),scoped=diagnostics.filter(d=>!d.file||targetKeys.has(key(d.file.fileName)))
for(const d of diagnostics)console.log((scoped.includes(d)?'SCOPED: ':'DEPENDENCY (pre-existing, outside scope): ')+ts.formatDiagnostic(d,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}))
console.log(JSON.stringify({targets:targets.map(f=>path.relative(root,f)),scoped_errors:scoped.length,dependency_diagnostics_not_claimed_fixed:diagnostics.length-scoped.length}))
process.exitCode=scoped.length?1:0
