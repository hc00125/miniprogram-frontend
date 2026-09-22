// Offline-only compilation harness. It never edits pages.json in the real tree,
// never uploads, and contains no fake production product or wallet fallback.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const root = path.join(__dirname, '..')
const scratch = process.env.TMPDIR || '/root/.hermes/cache/scratch'
const target = fs.mkdtempSync(path.join(scratch, 'gift-compile-'))
for (const name of ['src', 'static', 'package.json', 'vite.config.ts', 'tsconfig.json']) {
  fs.cpSync(path.join(root, name), path.join(target, name), { recursive: true })
}
fs.symlinkSync(path.join(root, 'node_modules'), path.join(target, 'node_modules'), 'dir')
const pagesPath = path.join(target, 'src/pages.json')
const pages = JSON.parse(fs.readFileSync(pagesPath, 'utf8'))
pages.pages.push({ path: 'pages/gift-foundation-test/index', style: { navigationBarTitleText: '仅隔离编译测试' } })
fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2))
fs.mkdirSync(path.join(target, 'src/pages/gift-foundation-test'), { recursive: true })
fs.writeFileSync(path.join(target, 'src/pages/gift-foundation-test/index.vue'), `<template><GiftSheet :open="true" account-id="compile-only" :recipient="{ id: 'compile-only', name: '隔离编译测试' }" /></template><script setup lang="ts">import GiftSheet from '@/components/gifts/GiftSheet.vue'</script>`)
const result = spawnSync('npm', ['run', 'build:mp-weixin'], { cwd: target, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production' }, timeout: 600000 })
fs.writeFileSync(path.join(target, 'build.log'), (result.stdout || '') + (result.stderr || ''))
console.log('Isolated build:', target)
assert.equal(result.status, 0, (result.stderr || '').slice(-4000))
const dist = path.join(target, 'dist/build/mp-weixin')
for (const name of ['GiftSheet', 'GiftGrid']) {
  for (const ext of ['js', 'json', 'wxml', 'wxss']) assert.ok(fs.statSync(path.join(dist, 'components/gifts', `${name}.${ext}`)).size > 0)
}
const wxml = fs.readFileSync(path.join(dist, 'components/gifts/GiftSheet.wxml'), 'utf8')
const wxss = fs.readFileSync(path.join(dist, 'components/gifts/GiftSheet.wxss'), 'utf8')
assert.match(wxml, /暂未开放/)
assert.match(wxml, /我的礼物/)
assert.match(wxml, /购买后赠送/)
assert.match(wxss, /safe-area-inset-bottom/)
assert.match(wxss, /min-height:92rpx/)
const productionApp = JSON.parse(fs.readFileSync(path.join(root, 'dist/build/mp-weixin/app.json'), 'utf8'))
assert.ok(!productionApp.pages.some(p => p.includes('gift-foundation-test')))
assert.ok(!fs.existsSync(path.join(root, 'dist/build/mp-weixin/components/gifts/GiftSheet.js')))
console.log('Verified isolated SFC JS/JSON/WXML/WXSS, disabled CTA, safe area, button size; production app has no gift entry/components.')
