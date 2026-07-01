const ci = require('miniprogram-ci');
const fs = require('fs');

const projectPath = '/www/wwwroot/miniprogram-frontend';
const privateKeyPath = '/root/.openclaw/workspace/wechat-keys/private.wxfae874d4b11b3045_1782565425149_f0e8e0.key';

(async () => {
  try {
    console.log('[1] Initializing project...');
    const project = new ci.Project({
      appid: 'wxfae874d4b11b3045',
      type: 'miniProgram',
      projectPath: projectPath,
      privateKeyPath: privateKeyPath,
      ignores: ['node_modules/**/*'],
    });

    console.log('[2] Uploading to WeChat (experience version, useCOS: false)...');
    const result = await ci.upload({
      project,
      version: '1.0.0',
      desc: `Auto deploy ${new Date().toLocaleString('zh-CN')}`,
      setting: { es6: true, minify: true },
      useCOS: false,
      onProgressUpdate: (task, info) => {
        if (info && info.status) console.log(`  [${task}] ${info.status}: ${info.message || ''}`);
      },
    });
    console.log('[3] Upload done:', JSON.stringify(result));

  } catch (e) {
    console.error('[FAIL]', e.message);
    process.exit(1);
  }
})();
