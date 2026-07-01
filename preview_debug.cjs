const ci = require('miniprogram-ci');
const fs = require('fs');

// Fix appid
const distConfigPath = '/www/wwwroot/miniprogram-frontend/dist/build/mp-weixin/project.config.json';
try {
  const config = JSON.parse(fs.readFileSync(distConfigPath, 'utf8'));
  if (config.appid !== 'wxfae874d4b11b3045') {
    config.appid = 'wxfae874d4b11b3045';
    fs.writeFileSync(distConfigPath, JSON.stringify(config, null, 2));
    console.log('[0] Fixed appid');
  }
} catch(e) {}

(async () => {
  try {
    console.log('[1] Init...');
    const project = new ci.Project({
      appid: 'wxfae874d4b11b3045',
      type: 'miniProgram',
      projectPath: '/www/wwwroot/miniprogram-frontend/dist/build/mp-weixin',
      privateKeyPath: '/root/.openclaw/workspace/wechat-keys/private.wxfae874d4b11b3045_1782615555643_c9f746.key',
      ignores: ['node_modules/**/*'],
    });

    console.log('[2] Starting upload test (short timeout)...');
    
    // Use a shorter timeout to catch where it hangs
    const result = await Promise.race([
      ci.upload({
        project,
        version: '0.0.1',
        desc: 'test connection',
        setting: { es6: true, minify: true },
        onProgressUpdate: (msg) => console.log('[Progress]', typeof msg === 'object' ? msg.title || msg.text || JSON.stringify(msg).substring(0,100) : msg),
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_30s')), 30000))
    ]);

    console.log('[3] Upload result:', JSON.stringify(result).substring(0, 500));
  } catch (e) {
    console.error('[FAIL]', e.message);
    console.error('[DONE] Test aborted');
    process.exit(0);
  }
})();
