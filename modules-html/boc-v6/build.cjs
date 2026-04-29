#!/usr/bin/env node
// 빌드 실행 스크립트
const esbuild = require('esbuild');
const { config } = require('./build.config.cjs');

async function build() {
  try {
    const result = await esbuild.build(config);
    console.log('[PASS] boc-v6 번들 빌드 완료');
    console.log('  결과: ' + config.outfile);
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
