// Direct HTTPS preview — bypasses miniprogram-ci's broken compile
// Generates a QR code image you can scan in WeChat DevTools
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const https = require('https');

const APPID = 'wxfae874d4b11b3045';
const PROJECT_ROOT = '/www/wwwroot/miniprogram-frontend';
const DIST_PATH = path.join(PROJECT_ROOT, 'dist/build/mp-weixin');
const PRIVATE_KEY_PATH = '/root/.openclaw/workspace/wechat-keys/private.wxfae874d4b11b3045_1782565425149_f0e8e0.key';
const QR_OUTPUT = '/tmp/preview_qr.png';
const CI_VERSION = '2.1.31';
const DOMAIN = 'https://servicewechat.com';

function httpPost(url, body, contentType) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, port: 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 180000,
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('HTTP timeout')); });
    req.write(body);
    req.end();
  });
}

function collectFiles(dir, baseDir) {
  const files = {};
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      Object.assign(files, collectFiles(p, baseDir));
    } else if (stat.isFile()) {
      const rel = '/' + path.relative(baseDir, p).replace(/\\/g, '/');
      files[rel] = fs.readFileSync(p);
    }
  }
  return files;
}

function packFileMap(fileMap) {
  const H_PROTOCOL = 0, H_VERSION = 1, H_FILEINFO = 2, H_FILEDATA = 3, H_END = 4;
  const hdr = [Buffer.alloc(1), Buffer.alloc(4), Buffer.alloc(4), Buffer.alloc(4), Buffer.alloc(1)];
  hdr[H_PROTOCOL][0] = 190;
  hdr[H_VERSION].writeInt32BE(0, 0);
  hdr[H_END][0] = 237;

  const keys = Object.keys(fileMap);
  const nameBufs = [], dataBufs = [];
  let totalNameLen = 0;

  for (const key of keys) {
    const name = key.startsWith('/') ? key : '/' + key;
    const nb = Buffer.from(name);
    nameBufs.push(nb);
    totalNameLen += nb.length;
    dataBufs.push(Buffer.isBuffer(fileMap[key]) ? fileMap[key] : Buffer.from(fileMap[key], 'utf8'));
  }

  let dataOffset = 18 + 12 * keys.length + totalNameLen;
  const infoParts = [];
  for (let i = 0; i < keys.length; i++) {
    const nl = Buffer.alloc(4); nl.writeInt32BE(nameBufs[i].length, 0);
    const dl = Buffer.alloc(4); dl.writeInt32BE(dataBufs[i].length, 0);
    const doff = Buffer.alloc(4); doff.writeInt32BE(dataOffset, 0);
    infoParts.push(Buffer.concat([nl, nameBufs[i], doff, dl]));
    dataOffset += dataBufs[i].length;
  }

  const cnt = Buffer.alloc(4); cnt.writeInt32BE(keys.length, 0);
  const infoSection = Buffer.concat([cnt, ...infoParts]);
  const dataSection = Buffer.concat(dataBufs);

  hdr[H_FILEINFO].writeInt32BE(infoSection.length, 0);
  hdr[H_FILEDATA].writeInt32BE(dataSection.length, 0);

  return Buffer.concat([Buffer.concat(hdr), infoSection, dataSection]);
}

async function main() {
  try {
    console.log('=== WeChat Mini-Program Direct Preview (QR Code) ===\n');

    // Read private key
    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

    // Collect files
    console.log('[1/6] Collecting files from dist...');
    const files = collectFiles(DIST_PATH, DIST_PATH);
    console.log(`       ${Object.keys(files).length} files found`);

    // Get random string for signature
    console.log('[2/6] Getting random string...');
    const randStr = Math.floor(1e8 * Math.random());
    const randResp = await httpPost(
      DOMAIN + '/wxa/ci/getrandstr',
      JSON.stringify({ appid: APPID, clientRand: randStr }),
      'application/json'
    );
    const randData = JSON.parse(randResp.body);
    if (randData.errCode !== 0) throw new Error('getrandstr failed: ' + randResp.body);
    const randomString = randData.data.randomString;
    console.log(`       randomString: ${randomString}`);

    // Generate signature
    console.log('[3/6] Generating signature...');
    const signPayload = JSON.stringify({ appid: APPID, rand_str: randomString });
    const signature = crypto.privateEncrypt(
      { key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(signPayload)
    ).toString('base64');

    // Add signature file
    console.log('[4/6] Adding ci.signature...');
    files['/ci.signature'] = JSON.stringify({
      signature: signature,
      version: CI_VERSION,
    });

    // Pack and gzip
    console.log('[5/6] Packing and compressing...');
    const packed = packFileMap(files);
    const gzipped = zlib.gzipSync(packed);
    console.log(`       packed: ${(packed.length / 1024).toFixed(1)} KB`);
    console.log(`       gzipped: ${(gzipped.length / 1024).toFixed(1)} KB`);

    // Build preview URL (same params as upload but endpoint different)
    const queryParams = new URLSearchParams({
      appid: APPID,
      type: 'miniProgram',
      version: '1.0.0',
      desc: 'Server preview ' + new Date().toISOString().slice(0, 16).replace('T', ' '),
      robot: '1',
      codeprotect: '0',
      'debugLaunchInfo': JSON.stringify({ scene: 1011 }),
    });

    const previewUrl = DOMAIN + '/wxa/ci/testSourceURL?' + queryParams.toString();

    // Upload for preview
    console.log('[6/6] Uploading to WeChat preview...');
    console.log(`       Waiting for QR code...`);

    const resp = await httpPost(previewUrl, gzipped, 'application/octet-stream');

    if (resp.status === 200) {
      const parsed = JSON.parse(resp.body);
      console.log(`\n       errCode: ${parsed.errCode}`);

      // The qrcode_img may be at top level or nested inside body
      const qrImg = parsed.qrcode_img || (parsed.body && parsed.body.qrcode_img) || parsed.qrcode_buffer;
      if (parsed.errCode === 0 && qrImg) {
        // Decode base64 QR code and save
        const qrBuffer = Buffer.from(qrImg, 'base64');
        fs.writeFileSync(QR_OUTPUT, qrBuffer);
        console.log(`\n✅ Preview QR saved to: ${QR_OUTPUT}`);
        console.log(`   Size: ${(qrBuffer.length / 1024).toFixed(1)} KB`);
      } else if (parsed.errCode === 0 && parsed.qrcode_url) {
        console.log(`\n✅ Preview QR URL: ${parsed.qrcode_url}`);
      } else {
        console.log(`\n⚠️  Response: ${JSON.stringify(parsed, null, 2)}`);
      }
    } else {
      console.log(`\n❌ HTTP ${resp.status}: ${resp.body.substring(0, 200)}`);
    }

  } catch (e) {
    console.error('\n❌ FAILED:', e.message);
    process.exit(1);
  }
}

main();
