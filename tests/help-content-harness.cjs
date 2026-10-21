// Pure help-content reader: no node:test registration or external requests.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../src/content/help.ts'), 'utf8')
const moduleObject = { exports: {} }
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, { module: moduleObject, exports: moduleObject.exports })
function helpSection(articleId, sectionId) {
  const article = moduleObject.exports.helpArticles.find(item => item.id === articleId)
  const section = article?.sections.find(item => item.id === sectionId)
  if (!section) throw Error(`Missing help section: ${articleId}/${sectionId}`)
  return section.paragraphs.join('\n')
}
module.exports = { helpSection }
