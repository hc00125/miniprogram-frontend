// Upload pre-built output directly, skipping the compiler
const ci = require('miniprogram-ci');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const appid = 'wxfae874d4b11b3045';
const projectPath = '/www/wwwroot/miniprogram-frontend';
const distPath = path.join(projectPath, 'dist/build/mp-weixin');
const privateKeyPath = '/root/.openclaw/workspace/wechat-keys/private.wxfae874d4b11b3045_1782565425149_f0e8e0.key';

// Read private key
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

// Step 1: Collect all files from dist
function collectFiles(dir) {
  const files = {};
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      const sub = collectFiles(p);
      Object.assign(files, sub);
    } else if (stat.isFile()) {
      const relPath = '/' + path.relative(distPath, p).replace(/\\/g, '/');
      files[relPath] = fs.readFileSync(p);
    }
  }
  return files;
}

console.log('Collecting files...');
const files = collectFiles(distPath);
console.log('Files:', Object.keys(files).length);

// Step 2: Pack into the miniprogram-ci binary format
function pack(fileObj) {
  const B_PROTOCOL = 0, B_PROTOCOL_VERSION = 1, B_FILEINFO_LEN = 2;
  const B_FILEDATA_LEN = 3, B_PROTOCOL_END = 4;
  
  const header = [Buffer.alloc(1), Buffer.alloc(4), Buffer.alloc(4), Buffer.alloc(4), Buffer.alloc(1)];
  header[B_PROTOCOL][0] = 190;
  header[B_PROTOCOL_VERSION].writeInt32BE(0, 0);
  header[B_PROTOCOL_END][0] = 237;

  const keys = Object.keys(fileObj);
  const count = keys.length;
  const nameBuffers = [];
  const dataBuffers = [];

  for (const key of keys) {
    const name = key.startsWith('/') ? key : '/' + key;
    const nameBuf = Buffer.from(name);
    nameBuffers.push(nameBuf);
    const data = fileObj[key];
    dataBuffers.push(Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8'));
  }

  // Build file info section
  let offset = 18 + 12 * count + Buffer.concat(nameBuffers).length;
  const infoParts = [];
  for (let i = 0; i < count; i++) {
    const nameLen = Buffer.alloc(4);
    nameLen.writeInt32BE(nameBuffers[i].length, 0);
    const dataLen = Buffer.alloc(4);
    dataLen.writeInt32BE(dataBuffers[i].length, 0);
    const dataOffset = Buffer.alloc(4);
    dataOffset.writeInt32BE(offset, 0);
    infoParts.push(Buffer.concat([nameLen, nameBuffers[i], dataOffset, dataLen]));
    offset += dataBuffers[i].length;
  }

  const countBuf = Buffer.alloc(4);
  countBuf.writeInt32BE(count, 0);
  
  const infoSection = Buffer.concat([countBuf, ...infoParts]);
  const dataSection = Buffer.concat(dataBuffers);
  
  header[B_FILEINFO_LEN].writeInt32BE(infoSection.length, 0);
  header[B_FILEDATA_LEN].writeInt32BE(dataSection.length, 0);

  return Buffer.concat([Buffer.concat(header), infoSection, dataSection]);
}

console.log('Packing files...');
const packed = pack(files);
const gzipped = zlib.gzipSync(packed);
console.log('Packed size:', packed.length, 'Gzipped:', gzipped.length);

// Step 3: Get random string for signature
const https = require('https');

function httpsPost(url, data, contentType) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = typeof data === 'string' ? data : JSON.stringify(data);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': contentType || 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 60000,
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    console.log('Step 3: Getting random string...');
    const randResp = await httpsPost(
      'https://servicewechat.com/wxa/ci/getrandstr',
      JSON.stringify({ appid, clientRand: Math.floor(1e8 * Math.random()) })
    );
    const randData = JSON.parse(randResp);
    if (randData.errCode !== 0) throw new Error('getrandstr failed: ' + randResp);
    const randStr = randData.data.randomString;
    console.log('Random string:', randStr);
    
    // Step 4: Sign the request
    console.log('Step 4: Signing...');
    const signData = JSON.stringify({ appid, rand_str: randStr });
    const signature = crypto.privateEncrypt(
      { key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(signData)
    ).toString('base64');
    console.log('Signature:', signature.substring(0, 30) + '...');
    
    // Step 5: Build upload URL
    const params = new URLSearchParams({
      appid: appid,
      version: '1.0.0',
      desc: 'Manual upload test',
      robot: '1',
      type: 'miniProgram',
    });
    const uploadUrl = 'https://servicewechat.com/wxa/ci/upload?' + params.toString();
    console.log('Upload URL:', uploadUrl);
    
    // Step 6: Upload
    console.log('Step 5: Uploading (this may take a while)...');
    const uploadResp = await httpsPost(uploadUrl, gzipped, 'application/octet-stream');
    console.log('Upload response:', uploadResp.substring(0, 300));
    
  } catch (e) {
    console.error('FAIL:', e.message);
  }
}

main();
