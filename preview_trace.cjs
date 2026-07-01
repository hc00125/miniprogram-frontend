// Monkey-patch the request module to add more visibility
const origReq = require('request');
const requestModule = require('/www/wwwroot/miniprogram-frontend/node_modules/miniprogram-ci/dist/utils/request');

// Wrap the request to add timing
const origRequestFn = requestModule.request;
requestModule.request = function(opt) {
  const url = (opt && opt.url) || 'unknown';
  console.log('[TRACE] Making request:', opt.method, url);
  console.log('[TRACE] Body length:', opt.body ? (typeof opt.body === 'string' ? opt.body.length : (opt.body.length || 'buffer:' + Buffer.byteLength(opt.body))) : 'none');
  const start = Date.now();
  const promise = origRequestFn.call(this, opt);
  return {
    then: function(resolve, reject) {
      return promise.then(
        (result) => {
          console.log('[TRACE] Request OK:', url, `(${Date.now()-start}ms)`);
          return resolve(result);
        },
        (err) => {
          console.log('[TRACE] Request FAIL:', url, err.message, `(${Date.now()-start}ms)`);
          return reject(err);
        }
      );
    },
    catch: function(reject) {
      return promise.catch(reject);
    }
  };
};

const ci = require('miniprogram-ci');
const fs = require('fs');

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

    console.log('[TRACE] Starting preview...');
    const result = await ci.preview({
      project,
      desc: 'AI preview test',
      setting: { es6: true, minify: true },
      qrcodeFormat: 'image',
      qrcodeOutputDest: '/tmp/preview_qr.png',
      useCOS: false,
    });

    console.log('[TRACE] Done!');
    console.log('Result:', JSON.stringify(result).substring(0, 500));
    if (fs.existsSync('/tmp/preview_qr.png')) {
      console.log('QR size:', fs.statSync('/tmp/preview_qr.png').size, 'bytes');
    }
  } catch (e) {
    console.error('[TRACE FAIL]', e.message);
    if (e.stack) console.error(e.stack.substring(0, 500));
    process.exit(1);
  }
})();
