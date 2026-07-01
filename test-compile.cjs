// Test: just compile and pack without uploading
const ci = require('miniprogram-ci');
const zlib = require('zlib');

const projectPath = '/www/wwwroot/miniprogram-frontend';
const privateKeyPath = '/root/.openclaw/workspace/wechat-keys/private.wxfae874d4b11b3045_1782565425149_f0e8e0.key';

(async () => {
  try {
    console.log('[1] Init project');
    const project = new ci.Project({
      appid: 'wxfae874d4b11b3045',
      type: 'miniProgram',
      projectPath: projectPath,
      privateKeyPath: privateKeyPath,
      ignores: ['node_modules/**/*'],
    });
    
    console.log('[2] Getting compiler...');
    // Get the private compiler function
    const { getCompiler } = require('miniprogram-ci/dist/ci/getcompiler');
    const { pack } = require('miniprogram-ci/dist/ci/utils/pack');
    
    const compiler = await getCompiler(project, { es6: true });
    console.log('[3] Compiling...');
    const result = await compiler.compile({
      setting: { es6: true, minify: true },
      resultType: 'prod',
      disableSpreadingUsingComponents: true,
    });
    console.log('[4] Compiled OK. Type:', typeof result, 'Keys:', Object.keys(result).join(', '));
    
    console.log('[5] Packing...');
    const packed = pack(result);
    console.log('[6] Packed. Buffer size:', packed.buffer.length);
    
    console.log('[7] Gzipping...');
    const gzipped = zlib.gzipSync(packed.buffer);
    console.log('[8] Gzipped size:', gzipped.length);
    
    console.log('[DONE] All steps completed!');
    
  } catch(e) {
    console.error('[FAIL]', e.message, e.stack);
  }
  process.exit(0);
})();
