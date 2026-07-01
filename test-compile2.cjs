// Test compile in isolation
const ci = require('miniprogram-ci');
const projectPath = '/www/wwwroot/miniprogram-frontend';
const privateKeyPath = '/root/.openclaw/workspace/wechat-keys/private.wxfae874d4b11b3045_1782565425149_f0e8e0.key';

(async () => {
  process.stderr.write('[TEST] Creating project...\n');
  const project = new ci.Project({
    appid: 'wxfae874d4b11b3045',
    type: 'miniProgram',
    projectPath: projectPath,
    privateKeyPath: privateKeyPath,
    ignores: ['node_modules/**/*'],
  });
  
  process.stderr.write('[TEST] Getting compiler...\n');
  const { getCompiler } = require('miniprogram-ci/dist/ci/getcompiler');
  const compiler = await getCompiler(project, { es6: true, minify: true });
  
  process.stderr.write('[TEST] Compiling...\n');
  const startTime = Date.now();
  
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      process.stderr.write('[TIMEOUT] Compile not resolved after 30s\n');
      reject(new Error('compile timeout'));
    }, 30000);
    
    compiler.compile({
      setting: { es6: true, minify: true },
      resultType: 'prod',
      disableSpreadingUsingComponents: true,
    }).then(r => {
      clearTimeout(timer);
      resolve(r);
    }).catch(e => {
      clearTimeout(timer);
      reject(e);
    });
  });
  
  const elapsed = Date.now() - startTime;
  process.stderr.write(`[TEST] Compile DONE in ${elapsed}ms. Keys: ${Object.keys(result).slice(0, 5).join(', ')}...\n`);
  process.exit(0);
})();
