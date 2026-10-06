// Load the actual reactive theme and icon modules for older isolated SFC tests.
const fs=require('fs'),path=require('path'),ts=require('typescript'),vue=require('vue')
exports.loadIconModule=function(){const cache={};function load(file){if(cache[file])return cache[file];const m={exports:{}};cache[file]=m.exports;const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;new Function('require','module','exports',code)(id=>id==='vue'?vue:load(path.resolve(path.dirname(file),id+'.ts')),m,m.exports);return m.exports}return load(path.join(__dirname,'../src/utils/uiIcons.ts'))}

exports.loadIcons=()=>exports.loadIconModule().uiIcons
