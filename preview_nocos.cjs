const ci = require('miniprogram-ci');
const fs = require('fs');

// Fix appid in dist
const cfgPath = '/www/wwwroot/miniprogram-frontend/dist/build/mp-weixin/project.config.json';
try {
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  if (cfg.appid !== 'wxfae874d4b11b3045') {
    cfg.appid = 'wxfae874d4b11b3045';
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  }
} catch(e) {}

(async () => {
  try {
    const project = new ci.Project({
      appid: 'wxfae874d4b11b3045',
      type: 'miniProgram',
      projectPath: '/www/wwwroot/miniprogram-frontend/dist/build/mp-weixin',
      privateKeyPath: '/root/.openclaw/workspace/wechat-keys/private.wxfae874d4b11b3045_1782615555643_c9f746.key',
      ignores: ['node_modules/**/*'],
    });

    console.log('[Preview] Starting with useCOS=false...');
    const result = await ci.preview({
      project,
      desc: 'AI preview',
      setting: { es6: true, minify: true },
      qrcodeFormat: 'image',
      qrcodeOutputDest: '/tmp/preview_qr.png',
      useCOS: false,
    });

    console.log('[Preview] Done!');
    console.log('Result:', JSON.stringify(result).substring(0, 500));
    if (fs.existsSync('/tmp/preview_qr.png')) {
      console.log('QR size:', fs.statSync('/tmp/preview_qr.png').size, 'bytes');
    }
  } catch (e) {
    console.error('FAIL:', e.message);
    process.exit(1);
  }
})();
