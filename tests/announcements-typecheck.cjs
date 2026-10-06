// Semantic-check the new announcement API and actual SFC scripts, not the entire legacy graph.
const path=require('node:path'),fs=require('node:fs'),ts=require('typescript'),{parse,compileScript}=require('@vue/compiler-sfc')
const root=path.join(__dirname,'..'),cfg=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile),parsed=ts.parseJsonConfigFileContent(cfg.config,ts.sys,root)
const normalize=file=>path.resolve(file).replace(/\\/g,'/')
const virtual=new Map()
for(const file of ['src/components/HomeAnnouncements.vue','src/pages/client/announcements/index.vue']){
 const name=normalize(path.join(root,file+'.ts')),descriptor=parse(fs.readFileSync(path.join(root,file),'utf8')).descriptor
 virtual.set(name,compileScript(descriptor,{id:file}).content)
}
const targets=[normalize(path.join(root,'src/api/announcements.ts')),...virtual.keys()]
const host=ts.createCompilerHost(parsed.options),get=host.getSourceFile.bind(host),exists=host.fileExists.bind(host),read=host.readFile.bind(host)
host.getSourceFile=(name,...args)=>virtual.has(normalize(name))?ts.createSourceFile(name,virtual.get(normalize(name)),args[0],true):get(name,...args)
host.fileExists=name=>virtual.has(normalize(name))||exists(name);host.readFile=name=>virtual.get(normalize(name))??read(name)
const program=ts.createProgram([...targets,...parsed.fileNames.filter(p=>p.endsWith('.d.ts'))],parsed.options,host),diagnostics=ts.getPreEmitDiagnostics(program),scoped=diagnostics.filter(d=>!d.file||targets.includes(normalize(d.file.fileName)))
for(const d of diagnostics)console.log((scoped.includes(d)?'SCOPED: ':'DEPENDENCY (outside scope): ')+ts.formatDiagnostic(d,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}))
console.log(JSON.stringify({targets:targets.map(f=>path.relative(root,f)),scoped_errors:scoped.length,dependency_diagnostics_not_claimed_fixed:diagnostics.length-scoped.length}))
process.exitCode=scoped.length?1:0
