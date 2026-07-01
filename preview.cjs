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

    console.log('[2] Starting preview (with 300s timeout)...');
    
    const result = await Promise.race([
      ci.preview({
        project,
        desc: 'AI server preview',
        setting: { es6: true, minify: true },
        qrcodeFormat: 'image',
        qrcodeOutputDest: '/tmp/preview_qr.png',
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT_600s')), 600000)
      )
    ]);

    console.log('[3] Done, result:', JSON.stringify(result));

    if (fs.existsSync('/tmp/preview_qr.png')) {
      console.log('[4] QR OK, size:', fs.statSync('/tmp/preview_qr.png').size);
    } else {
      console.log('[4] QR NOT FOUND');
    }

  } catch (e) {
    console.error('[FAIL]', e.message);
    process.exit(1);
  }
})();
