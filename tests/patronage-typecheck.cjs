// Semantic-check actual SFC scripts + patronage modules without changing project dependencies.
const path=require('node:path'),fs=require('node:fs'),ts=require('typescript'),{parse,compileScript}=require('@vue/compiler-sfc')
const root=path.join(__dirname,'..'),cfg=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile),parsed=ts.parseJsonConfigFileContent(cfg.config,ts.sys,root)
const virtual=new Map()
for(const file of ['src/pages/client/patronage/index.vue','src/pages/client/patronage/records.vue']){
 const name=path.join(root,file+'.ts'),descriptor=parse(fs.readFileSync(path.join(root,file),'utf8')).descriptor
 virtual.set(name,compileScript(descriptor,{id:file}).content)
}
const targets=['src/api/patronage.ts','src/utils/patronagePaymentIntent.ts','src/utils/sessionExpiry.ts'].map(f=>path.join(root,f)).concat([...virtual.keys()])
const host=ts.createCompilerHost(parsed.options),get=host.getSourceFile.bind(host),exists=host.fileExists.bind(host),read=host.readFile.bind(host)
host.getSourceFile=(name,...args)=>virtual.has(name)?ts.createSourceFile(name,virtual.get(name),args[0],true):get(name,...args)
host.fileExists=name=>virtual.has(name)||exists(name);host.readFile=name=>virtual.get(name)||read(name)
const program=ts.createProgram([...targets,...parsed.fileNames.filter(p=>p.endsWith('.d.ts'))],parsed.options,host),diagnostics=ts.getPreEmitDiagnostics(program),scoped=diagnostics.filter(d=>!d.file||targets.includes(d.file.fileName))
for(const d of diagnostics)console.log((scoped.includes(d)?'SCOPED: ':'DEPENDENCY (pre-existing, outside scope): ')+ts.formatDiagnostic(d,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}))
console.log(JSON.stringify({targets:targets.map(f=>path.relative(root,f)),scoped_errors:scoped.length,dependency_diagnostics_not_claimed_fixed:diagnostics.length-scoped.length}))
process.exitCode=scoped.length?1:0
