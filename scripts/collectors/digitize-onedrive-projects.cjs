#!/usr/bin/env node
// scripts/collectors/digitize-onedrive-projects.cjs
// C5 ECOREAN 자체 데이터 — OneDrive 견적서양식·사업계획서 폴더 디지털화 일회성 스크립트
// v1.0: 폴더 스캔 + 메타데이터 추출 + staging 진입 후보 생성 (실제 파일 내용 파싱은 v1.2)
// 헌법: P5 once:true 금지 — 재실행 시 같은 evidence_id로 멱등 동작

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SOURCES = [
  { label: '견적서양식', dir: 'C:\\Users\\udune\\OneDrive\\Desktop\\ECOREAN\\견적서양식', target: 'project' },
  { label: '사업계획서', dir: 'C:\\Users\\udune\\OneDrive\\Desktop\\ECOREAN\\사업계획서', target: 'project' }
];

const OUTPUT = path.resolve(__dirname, '..', '..', 'staging-onedrive.json');

const SUPPORTED_EXT = new Set(['.xlsx','.xls','.hwp','.pdf','.docx','.doc','.html','.json']);

function walk(dir, base, out) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === '_latest_ecorean_os') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, base, out);
    else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (!SUPPORTED_EXT.has(ext)) continue;
      const stat = fs.statSync(full);
      out.push({
        full,
        rel: path.relative(base, full).replace(/\\/g, '/'),
        ext,
        size: stat.size,
        mtimeMs: stat.mtimeMs
      });
    }
  }
}

function makeEvidenceId(label, rel, mtimeMs) {
  const hash = crypto.createHash('sha256').update(`${label}|${rel}|${mtimeMs}`).digest('hex').slice(0, 10);
  const slug = rel.replace(/[^A-Za-z0-9_\-]/g, '_').slice(-40);
  return `evd_onedrive_${hash}_${slug}`;
}

function toStagingRow(label, target, file) {
  const collectedAt = Date.now();
  return {
    evidence_id: makeEvidenceId(label, file.rel, file.mtimeMs),
    target_object: target,
    source_channel: 'C5',
    source_worker: 'internal-onedrive-oneoff',
    confidence: 'OFFICIAL', // 대표님 본인 자산 — 가장 신뢰. Gate-3에서 서명/검토 단계 별도
    payload: {
      onedrive_label: label,
      relative_path: file.rel,
      absolute_path: file.full,
      extension: file.ext,
      size_bytes: file.size,
      file_modified_at: new Date(file.mtimeMs).toISOString(),
      parsing_status: 'NEEDS_RESEARCH', // 본 v1.0은 메타만, 실제 파싱은 v1.2
      content_extracted: null
    },
    collected_at: collectedAt
  };
}

function main() {
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-n');
  const all = [];

  for (const src of SOURCES) {
    const found = [];
    walk(src.dir, src.dir, found);
    console.log(`[${src.label}] ${found.length} 파일 발견 → ${src.dir}`);
    for (const f of found) all.push(toStagingRow(src.label, src.target, f));
  }

  console.log(`\n총 ${all.length} staging row 생성됨.`);

  // 자가 점검: evidence_id 유일성 (P5 멱등성)
  const ids = all.map(r => r.evidence_id);
  const dup = ids.filter((id, i, arr) => arr.indexOf(id) !== i);
  if (dup.length > 0) {
    console.error(`[FAIL] evidence_id 중복 ${dup.length}건 — P5 위반`);
    process.exit(1);
  }
  console.log(`[PASS] evidence_id 유일성 (P5 멱등성) ${ids.length}건`);

  // 확장자 분포
  const extDist = {};
  for (const r of all) extDist[r.payload.extension] = (extDist[r.payload.extension] || 0) + 1;
  console.log(`확장자 분포: ${JSON.stringify(extDist)}`);

  if (dryRun) {
    console.log(`\n[dry-run] 출력 파일 미생성. ${OUTPUT} 에 저장하려면 --dry-run 빼고 다시 실행.`);
    return;
  }

  fs.writeFileSync(OUTPUT, JSON.stringify({ generatedAt: new Date().toISOString(), rows: all }, null, 2), 'utf8');
  console.log(`\n[OK] staging 후보 저장: ${OUTPUT}`);
  console.log(`다음 단계: v1.1에서 harness runtime이 이 JSON을 staging_collected_evidence 테이블로 ingest`);
}

if (require.main === module) main();

module.exports = { main, toStagingRow, makeEvidenceId };
