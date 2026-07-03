// scripts/verify-constitution.cjs
const path = require('path');
const fs = require('fs');

let allPass = true;
const fail = (msg) => { console.error('FAIL: ' + msg); allPass = false; };
const pass = (msg) => console.log('PASS: ' + msg);

// 1. CONSTITUTION.md 존재 + 필수 키워드
const constPath = path.join(__dirname, '..', 'docs', 'CONSTITUTION.md');
if (!fs.existsSync(constPath)) {
  fail('docs/CONSTITUTION.md missing');
} else {
  const content = fs.readFileSync(constPath, 'utf8');
  const required = ['13 엔진', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'B1', 'B8', '159', '22 시공섹션', '23 공간'];
  required.forEach(k => {
    if (!content.includes(k)) fail('CONSTITUTION.md missing keyword: ' + k);
  });
  pass('CONSTITUTION.md exists with required keywords');
}

// 2. 13 엔진 슬롯
try {
  const engines = require('../packages/engines');
  const status = engines.getStatus();
  if (status.total !== 13) fail('Expected 13 engines, got ' + status.total);
  else pass('13 engine slots registered (implemented: ' + status.implemented + '/13)');
} catch (e) {
  fail('Cannot load packages/engines: ' + e.message);
}

// 3. 스키마 v6.0
try {
  const schema = require('../packages/schema');
  if (schema.VERSION !== '6.0') fail('Schema version mismatch: ' + schema.VERSION);
  else pass('Schema v6.0 exported');
} catch (e) {
  fail('Cannot load packages/schema: ' + e.message);
}

// 4. 시드 매니페스트 159건
try {
  const seedManifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'seeds', 'manifest.json'), 'utf8'));
  if (seedManifest.totalEntries !== 159) fail('Seed total != 159: ' + seedManifest.totalEntries);
  else pass('Seed manifest = 159 entries');
} catch (e) {
  fail('Cannot read seeds/manifest.json: ' + e.message);
}

// 5. 워크스페이스 구조 (apps 3 + packages 4)
['apps/console', 'apps/minicad', 'apps/estimator', 'packages/schema', 'packages/engines', 'packages/db', 'packages/ui'].forEach(p => {
  if (!fs.existsSync(path.join(__dirname, '..', p))) fail('Missing workspace: ' + p);
  else pass('Workspace exists: ' + p);
});

console.log('\n=== Constitution Verification ===');
process.exit(allPass ? 0 : 1);
