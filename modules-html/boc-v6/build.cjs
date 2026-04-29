#!/usr/bin/env node
// 빌드 실행 스크립트
const esbuild = require('esbuild');
const { config } = require('./build.config.cjs');

async function build() {
  try {
    const result = await esbuild.build(config);
    console.log('[PASS] boc-v6 빌드 완료 (ESM + splitting)');
    if (config.outdir) console.log('  outdir: ' + config.outdir);
    if (config.outfile) console.log('  outfile: ' + config.outfile);
    if (result.warnings && result.warnings.length > 0) {
      console.warn('  경고: ' + result.warnings.length + '건');
    }
  } catch (e) {
    console.error('[FAIL] 빌드 실패:', e.message);
    process.exit(1);
  }
}

if (require.main === module) build();
module.exports = { build: build };
