const ci = require('miniprogram-ci');
const fs = require('fs');
const http = require('http');
const https = require('https');

// Monitor HTTP requests
const origRequest = https.request;
https.request = function(...args) {
  console.log('[HTTPS] Request to:', args[0]?.hostname || args[0]);
  const start = Date.now();
  const req = origRequest.apply(this, args);
  req.on('response', (res) => {
    console.log('[HTTPS] Response:', res.statusCode, `(${Date.now() - start}ms)`);
  });
  req.on('error', (e) => {
    console.log('[HTTPS] Error:', e.message, `(${Date.now() - start}ms)`);
  });
  return req;
};

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

    console.log('[2] Starting preview...');
    const result = await ci.preview({
      project,
      desc: 'AI preview',
      setting: { es6: true, minify: true },
      qrcodeFormat: 'image',
      qrcodeOutputDest: '/tmp/preview_qr.png',
    });

    console.log('[3] Result:', JSON.stringify(result).substring(0, 500));
    if (fs.existsSync('/tmp/preview_qr.png')) {
      console.log('[4] QR OK!', fs.statSync('/tmp/preview_qr.png').size, 'bytes');
    }
  } catch (e) {
    console.error('[FAIL]', e.message);
    process.exit(1);
  }
})();
