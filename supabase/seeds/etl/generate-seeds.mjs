// ECOREAN OS — JSON 원본 → Supabase 시드 SQL 생성기
// 원칙: 원본 JSON은 읽기 전용 (cost-items-v2.json은 CLAUDE.md 보호파일 — 절대 수정 금지)
//       단가 추정 금지 — 값 충돌은 자동 병합하지 않고 diff 리포트로 출력, 사람이 확인
// 실행: node supabase/seeds/etl/generate-seeds.mjs   (저장소 루트 기준)
// 출력: supabase/seeds/seed_*.sql (멱등 upsert, 문장당 50행 청크) + 콘솔 diff 리포트

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DATA = join(ROOT, 'assets', 'data');
const OUT = join(ROOT, 'supabase', 'seeds');
mkdirSync(OUT, { recursive: true });

const files = {};
function loadJson(rel) {
  const p = join(DATA, rel);
  const buf = readFileSync(p);
  files[rel] = { sha256: createHash('sha256').update(buf).digest('hex'), count: 0 };
  return JSON.parse(buf.toString('utf8'));
}

// ── SQL 리터럴 헬퍼 ──
const S = v => v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const N = v => (v == null || v === '' || Number.isNaN(Number(v))) ? 'null' : String(Number(v));
const I = v => (v == null || v === '' || Number.isNaN(Number(v))) ? 'null' : String(Math.round(Number(v)));
const B = v => v ? 'true' : 'false';
const ARR = a => !a || !a.length ? "'{}'" : `array[${a.map(S).join(',')}]::text[]`;
const JB = o => `${S(JSON.stringify(o ?? {}))}::jsonb`;
const D = v => v == null ? 'null' : S(v); // date 문자열

const CHUNK = 50;
function upsertSql(table, cols, rows, conflictCols, updateCols) {
  const stmts = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const vals = rows.slice(i, i + CHUNK).map(r => `(${r.join(',')})`).join(',\n');
    const upd = updateCols.map(c => `${c} = excluded.${c}`).join(', ');
    stmts.push(`insert into public.${table} (${cols.join(',')})\nvalues\n${vals}\non conflict (${conflictCols.join(',')}) do update set ${upd}, updated_at = now();`);
  }
  return stmts.join('\n\n');
}

function writeSeed(name, sql, batchInserts) {
  const body = `-- 자동 생성: generate-seeds.mjs — 직접 수정 금지, 원본 JSON 수정 후 재생성\n-- 멱등: on conflict do update\n\n${sql}\n\n${batchInserts.join('\n')}\n`;
  writeFileSync(join(OUT, name), body, { encoding: 'utf8' });
  console.log(`✔ ${name} 생성`);
}

function batchSql(dataset, rel, count) {
  files[rel].count = count;
  return `insert into public.import_batches (dataset_name, file_name, file_sha256, record_count)\nvalues (${S(dataset)}, ${S(rel)}, ${S(files[rel].sha256)}, ${count})\non conflict (dataset_name, file_sha256) do update set record_count = excluded.record_count, imported_at = now();`;
}

const report = [];

// ════════════════ 1. cost_items ════════════════
const c2 = loadJson('cost-items-v2.json');
// 파일 내 중복 코드: 후행(최신) 우선, 탈락분 리포트
const byCode = new Map();
const dropped = [];
for (const it of c2.items) {
  if (byCode.has(it.code)) dropped.push(it.code);
  byCode.set(it.code, it);
}
if (dropped.length) report.push(`[cost-items-v2] 파일 내 중복 코드 ${dropped.length}건 — 후행 항목 채택: ${[...new Set(dropped)].join(', ')}`);

const ciCols = ['tenant_id','code','major_category','middle_category','name','unit',
  'labor_cost','material_cost','equipment_cost','accessory_cost','waste_rate','default_margin_rate',
  'default_duration','lead_time_days','trigger_type','quantity_formula',
  'source','source_detail','source_date','data_status','origin_dataset','notes'];
const ciUpd = ciCols.filter(c => !['tenant_id','code'].includes(c));

const baseRows = [...byCode.values()].map(it => [
  `'HQ'`, S(it.code), S(it.majorCategory), S(it.middleCategory), S(it.name), S(it.unit),
  I(it.laborCost) === 'null' ? '0' : I(it.laborCost), I(it.materialCost) === 'null' ? '0' : I(it.materialCost), '0', '0',
  'null', N(it.defaultMarginRate), I(it.defaultDuration), 'null', 'null', 'null',
  `'principal_seed'`, S('ECOREAN_original.html 추출 (v3.0.0)'), 'null', `'INTERNAL_ESTIMATED'`,
  S('cost-items-v2.json'), 'null',
]);

const v22 = loadJson('ECOREAN_공정단가DB_v2.2.json');
const enrichRows = v22.costItems.map(it => [
  `'HQ'`, S(it.itemId), S(it.majorCategory), S(it.middleCategory), S(it.itemName), S(it.unit),
  I(it.laborCost) === 'null' ? '0' : I(it.laborCost), I(it.materialCost) === 'null' ? '0' : I(it.materialCost),
  I(it.equipmentCost) === 'null' ? '0' : I(it.equipmentCost), I(it.accessoryCost) === 'null' ? '0' : I(it.accessoryCost),
  N(it.wasteRate), 'null', I(it.defaultDuration), I(it.leadTimeDays), S(it.triggerType), S(it.quantityFormula),
  `'principal_seed'`, S(it.source), D(it.sourceDate), S(it.dataStatus ?? 'NEEDS_RESEARCH'),
  S('ECOREAN_공정단가DB_v2.2.json'), S(it.notes),
]);

// diff: v2.2 vs cost-v2 코드 겹침 시 단가 차이 리포트
for (const it of v22.costItems) {
  const base = byCode.get(it.itemId);
  if (base && (base.laborCost !== it.laborCost || base.materialCost !== it.materialCost)) {
    report.push(`[단가충돌] ${it.itemId} (${it.itemName}): cost-v2 노무 ${base.laborCost}/자재 ${base.materialCost} → v2.2 노무 ${it.laborCost}/자재 ${it.materialCost} (v2.2 채택됨 — 확인 필요)`);
  }
}

writeSeed('seed_01_cost_items.sql',
  upsertSql('cost_items', ciCols, baseRows, ['tenant_id','code'], ciUpd)
  + '\n\n-- ── v2.2 enrich (v2.2 우선 — 출처 메타 보유) ──\n\n'
  + upsertSql('cost_items', ciCols, enrichRows, ['tenant_id','code'], ciUpd),
  [batchSql('cost_items:base', 'cost-items-v2.json', baseRows.length),
   batchSql('cost_items:enrich', 'ECOREAN_공정단가DB_v2.2.json', enrichRows.length)]);

// seeds-legacy processes-62 — 삽입하지 않고 v2.2와 대조만
const p62 = loadJson('seeds-legacy/processes-62.json');
const v22ById = new Map(v22.costItems.map(i => [i.itemId, i]));
let p62diff = 0;
for (const it of p62) {
  const v = v22ById.get(it.itemId);
  if (!v) { report.push(`[seeds-legacy] processes-62의 ${it.itemId} 가 v2.2에 없음`); continue; }
  if (v.laborCost !== it.laborCost || v.materialCost !== it.materialCost) {
    p62diff++;
    report.push(`[seeds-legacy] ${it.itemId} 단가 불일치: seeds 노무 ${it.laborCost}/자재 ${it.materialCost} vs v2.2 노무 ${v.laborCost}/자재 ${v.materialCost}`);
  }
}
if (!p62diff) report.push('[seeds-legacy] processes-62 ↔ v2.2: 단가 전건 일치 (삽입 생략 정당)');

// ════════════════ 2. materials ════════════════
const mat = loadJson('ECOREAN_자재DB.json');
const matCols = ['tenant_id','mat_id','name','unit','unit_price','coverage_per_unit','process_code',
  'brand','spec','lead_days','source','source_detail','data_status','origin_dataset'];
const matRows = mat.items.map(it => [
  `'HQ'`, S(it.matId), S(it.name), S(it.unit), I(it.unitPrice), N(it.coveragePerUnit), S(it.processId),
  S(it.brand), S(it.spec), I(it.leadDays), `'principal_seed'`, S(mat._meta.priceBase),
  S(it.status ?? 'NEEDS_RESEARCH'), S('ECOREAN_자재DB.json'),
]);
writeSeed('seed_02_materials.sql',
  upsertSql('materials', matCols, matRows, ['tenant_id','mat_id'], matCols.filter(c => !['tenant_id','mat_id'].includes(c))),
  [batchSql('materials', 'ECOREAN_자재DB.json', matRows.length)]);

// ════════════════ 3. brands ════════════════
const br = loadJson('ECOREAN_브랜드DB.json');
const brCols = ['tenant_id','brand_id','category','brand','product','unit','supply_price','retail_price',
  'grade','lead_days','attrs','source','source_detail','data_status','origin_dataset'];
const brRows = [];
for (const [cat, arr] of Object.entries(br)) {
  if (cat === '_meta' || !Array.isArray(arr)) continue;
  for (const it of arr) {
    const attrs = {};
    for (const k of ['thickness','feature','rollWidth','rollLength','sqmPerRoll']) if (it[k] != null) attrs[k] = it[k];
    brRows.push([
      `'HQ'`, S(it.brandId), S(cat), S(it.brand), S(it.product), S(it.unit),
      I(it.supplyPrice), I(it.retailPrice), S(it.grade), I(it.leadDays), JB(attrs),
      `'principal_seed'`, S(it.source ?? br._meta.source), S(it.status ?? 'NEEDS_RESEARCH'), S('ECOREAN_브랜드DB.json'),
    ]);
  }
}
writeSeed('seed_03_brands.sql',
  upsertSql('brands', brCols, brRows, ['tenant_id','brand_id'], brCols.filter(c => !['tenant_id','brand_id'].includes(c))),
  [batchSql('brands', 'ECOREAN_브랜드DB.json', brRows.length)]);

// seeds-legacy brands-29 대조
const b29 = loadJson('seeds-legacy/brands-29.json');
const brById = new Map(brRows.map(r => [r[1], r]));
const b29missing = b29.filter(x => !brById.has(S(x.id)));
if (b29missing.length) report.push(`[seeds-legacy] brands-29 중 브랜드DB에 없는 id ${b29missing.length}건: ${b29missing.map(x => x.id).join(', ')}`);
else report.push('[seeds-legacy] brands-29 ↔ 브랜드DB: id 전건 존재 (삽입 생략 정당)');

// ════════════════ 4. labor_roles ════════════════
const lab = loadJson('ECOREAN_인건비DB_2025공식.json');
const labCols = ['tenant_id','role_id','role_name','grade','daily_rate_official','daily_rate_ecorean','hourly_rate',
  'productivity','regional_factor','source','source_detail','source_date','data_status','origin_dataset','notes'];
const labUpd = labCols.filter(c => !['tenant_id','role_id'].includes(c));
const labRows = lab.laborRoles.map(it => [
  `'HQ'`, S(it.roleId), S(it.roleName), S(it.grade), I(it.dailyRate_official), I(it.dailyRate_ecorean), 'null',
  JB(it.sqmPerDay), JB(it.regionalFactor), `'principal_seed'`, S(it.source), D(it.sourceDate),
  `'OFFICIAL'`, S('ECOREAN_인건비DB_2025공식.json'), S(it.notes),
]);
// seeds-legacy labor-22: 공식 18에 없는 직종만 추가
const l22 = loadJson('seeds-legacy/labor-22.json');
const names18 = new Set(lab.laborRoles.map(r => r.roleName));
const l22add = l22.filter(x => !names18.has(x.name));
const l22Rows = l22add.map(it => [
  `'HQ'`, S(it.id), S(it.name), `'일반'`, I(it.dailyRate), 'null', I(it.hourlyRate),
  `'{}'::jsonb`, `'{}'::jsonb`, `'principal_seed'`, S(`${it.source} (${it.updatedAt})`), 'null',
  `'OFFICIAL'`, S('seeds-legacy/labor-22.json'), S(it.category ? `분류: ${it.category}` : null),
]);
report.push(`[인건비] 공식 18건 + seeds-legacy 추가 ${l22Rows.length}건 (${l22add.map(x => x.name).join(', ')})`);
writeSeed('seed_04_labor_roles.sql',
  upsertSql('labor_roles', labCols, labRows, ['tenant_id','role_id'], labUpd)
  + '\n\n-- ── seeds-legacy 누락 직종 보충 ──\n\n'
  + upsertSql('labor_roles', labCols, l22Rows, ['tenant_id','role_id'], labUpd),
  [batchSql('labor_roles:official', 'ECOREAN_인건비DB_2025공식.json', labRows.length),
   batchSql('labor_roles:legacy', 'seeds-legacy/labor-22.json', l22Rows.length)]);

// ════════════════ 5. subcontractors ════════════════
const sub = loadJson('ECOREAN_외주업체DB.json');
const subCols = ['tenant_id','sub_id','category','name','unit','price_min','price_max','price_typical',
  'source','data_status','origin_dataset','notes'];
const subRows = sub.items.map(it => [
  `'HQ'`, S(it.subId), S(it.category), S(it.name), S(it.unit), I(it.priceMin), I(it.priceMax), I(it.priceTypical),
  `'principal_seed'`, `'INTERNAL_ESTIMATED'`, S('ECOREAN_외주업체DB.json'), S(it.notes),
]);
writeSeed('seed_05_subcontractors.sql',
  upsertSql('subcontractors', subCols, subRows, ['tenant_id','sub_id'], subCols.filter(c => !['tenant_id','sub_id'].includes(c))),
  [batchSql('subcontractors', 'ECOREAN_외주업체DB.json', subRows.length)]);

// ════════════════ 6. defect_types ════════════════
const def = loadJson('ECOREAN_하자유형DB.json');
const defCols = ['tenant_id','defect_id','category','name','severity','typical_cause','repair_method',
  'repair_cost_min','repair_cost_max','warranty_years','prevention','responsibility','check_timing',
  'source','data_status','origin_dataset'];
const defRows = def.items.map(it => [
  `'HQ'`, S(it.defectId), S(it.category), S(it.name), S(it.severity), S(it.typicalCause), S(it.repairMethod),
  I(it.repairCost_min), I(it.repairCost_max), I(it.warrantyYears), S(it.prevention), S(it.responsibility), S(it.checkTiming),
  `'principal_seed'`, `'INTERNAL_ESTIMATED'`, S('ECOREAN_하자유형DB.json'),
]);
writeSeed('seed_06_defect_types.sql',
  upsertSql('defect_types', defCols, defRows, ['tenant_id','defect_id'], defCols.filter(c => !['tenant_id','defect_id'].includes(c))),
  [batchSql('defect_types', 'ECOREAN_하자유형DB.json', defRows.length)]);

// ════════════════ 7. schedule_templates ════════════════
const sch = loadJson('ECOREAN_공정일정템플릿.json');
const schCols = ['tenant_id','process_code','process_name','default_start_day','default_duration',
  'predecessors','successors','critical_path','worker_role','min_workers','curring_hours','lead_time_days',
  'source','data_status','origin_dataset','notes'];
const schRows = sch.items.map(it => [
  `'HQ'`, S(it.processId), S(it.processName), I(it.defaultStartDay), I(it.defaultDuration),
  ARR(it.predecessors), ARR(it.successors), B(it.criticalPath), S(it.workerRole), I(it.minWorkers),
  N(it.curringHours), I(it.leadTimeDays), `'principal_seed'`, `'INTERNAL_ESTIMATED'`,
  S('ECOREAN_공정일정템플릿.json'), S(it.notes),
]);
writeSeed('seed_07_schedule_templates.sql',
  upsertSql('schedule_templates', schCols, schRows, ['tenant_id','process_code'], schCols.filter(c => !['tenant_id','process_code'].includes(c))),
  [batchSql('schedule_templates', 'ECOREAN_공정일정템플릿.json', schRows.length)]);

// ════════════════ 8. process_categories ════════════════
const pc = loadJson('process-categories.json');
const pcCols = ['tenant_id','code','exposure','input_type','module','condition','formula','enabled','origin_dataset'];
const pcRows = pc.items.map(it => [
  `'HQ'`, S(it.code), S(it.exposure), S(it.inputType), S(it.module), S(it.condition), S(it.formula),
  B(it.enabled), S('process-categories.json'),
]);
writeSeed('seed_08_process_categories.sql',
  upsertSql('process_categories', pcCols, pcRows, ['tenant_id','code'], pcCols.filter(c => !['tenant_id','code'].includes(c))),
  [batchSql('process_categories', 'process-categories.json', pcRows.length)]);

// ════════════════ 9. process_groups + legacy_processes (db.json) ════════════════
const db = loadJson('db.json');
const pgCols = ['tenant_id','code','name','color','origin_dataset'];
const pgRows = db.categories.map(c => [`'HQ'`, S(c.id), S(c.name), S(c.color), S('db.json')]);
const lpCols = ['tenant_id','code','group_code','name','unit','price','labor_cost','material_cost',
  'source','data_status','origin_dataset','notes'];
const lpRows = db.processes.map(p => [
  `'HQ'`, S(p.id), S(p.cat), S(p.name), S(p.unit), I(p.price), I(p.labor), I(p.material),
  `'principal_seed'`, `'INTERNAL_ESTIMATED'`, S('db.json'), S(p.note || null),
]);
writeSeed('seed_09_process_groups_legacy.sql',
  upsertSql('process_groups', pgCols, pgRows, ['tenant_id','code'], pgCols.filter(c => !['tenant_id','code'].includes(c)))
  + '\n\n'
  + upsertSql('legacy_processes', lpCols, lpRows, ['tenant_id','code'], lpCols.filter(c => !['tenant_id','code'].includes(c))),
  [batchSql('process_groups+legacy_processes', 'db.json', pgRows.length + lpRows.length)]);

// ════════════════ 10. ontology_rules ════════════════
const ont = loadJson('ontology.json');
const or2 = loadJson('ontology-rules.json');
const onCols = ['tenant_id','rule_id','trigger_code','trigger_name','relation','targets','target_names',
  'default_target','condition','quantity_calc','qty_formulas','priority','description','raw','origin_dataset'];
const onUpd = onCols.filter(c => !['tenant_id','rule_id'].includes(c));
const onRows1 = ont.rules.map(r => [
  `'HQ'`, S(r.id), S(r.trigger), S(r.triggerName), S(r.relation), ARR(r.requires), ARR(r.requiresNames),
  S(r.defaultTarget), 'null', 'null', JB(r.qtyFormulas), I(r.priority), S(r.description), JB(r), S('ontology.json'),
]);
const onRows2 = or2.rules.map((r, i) => [
  `'HQ'`, S(`OR-${String(i + 1).padStart(3, '0')}`), 'null', S(r.triggerProcess), S(r.relationshipType),
  "'{}'", "'{}'", 'null', S(r.condition), S(r.quantityCalc), `'{}'::jsonb`, 'null', S(r.note), JB(r), S('ontology-rules.json'),
]);
writeSeed('seed_10_ontology_rules.sql',
  upsertSql('ontology_rules', onCols, onRows1, ['tenant_id','rule_id'], onUpd)
  + '\n\n'
  + upsertSql('ontology_rules', onCols, onRows2, ['tenant_id','rule_id'], onUpd),
  [batchSql('ontology_rules:structured', 'ontology.json', onRows1.length),
   batchSql('ontology_rules:nl', 'ontology-rules.json', onRows2.length)]);

// ════════════════ 11. db_catalog ════════════════
const cat = loadJson('full-db-catalog.json');
const dcCols = ['tenant_id','category','subcategory','item_name','required_data_fields','source_candidates',
  'priority','data_status','owner','update_cycle','connections','origin_dataset','notes'];
const dcRows = cat.catalog.map(c => [
  `'HQ'`, S(c.category), S(c.subcategory), S(c.itemName), ARR(c.requiredDataFields), ARR(c.sourceCandidates),
  I(c.priority), S(c.dataStatus ?? 'NEEDS_RESEARCH'), S(c.owner), S(c.updateCycle), ARR(c.connections),
  S('full-db-catalog.json'), S(c.notes),
]);
writeSeed('seed_11_db_catalog.sql',
  upsertSql('db_catalog', dcCols, dcRows, ['tenant_id','category','subcategory','item_name'],
    dcCols.filter(c => !['tenant_id','category','subcategory','item_name'].includes(c))),
  [batchSql('db_catalog', 'full-db-catalog.json', dcRows.length)]);

// ════════════════ 고아 참조 리포트 ════════════════
const allCodes = new Set([...byCode.keys(), ...v22.costItems.map(i => i.itemId)]);
const pcOrphans = pc.items.filter(i => !allCodes.has(i.code)).map(i => i.code);
if (pcOrphans.length) report.push(`[고아] process_categories 중 cost_items에 없는 코드 ${pcOrphans.length}건: ${pcOrphans.join(', ')}`);
const schOrphans = new Set();
for (const it of sch.items) {
  for (const p of [...(it.predecessors || []), ...(it.successors || []), it.processId]) if (!allCodes.has(p)) schOrphans.add(p);
}
if (schOrphans.size) report.push(`[고아] schedule_templates 참조 중 cost_items에 없는 코드: ${[...schOrphans].join(', ')}`);
const matOrphans = mat.items.filter(i => i.processId && !allCodes.has(i.processId)).map(i => `${i.matId}→${i.processId}`);
if (matOrphans.length) report.push(`[고아] materials.process_code 미존재: ${matOrphans.join(', ')}`);
const pCodes = new Set(db.processes.map(p => p.id));
const ontOrphans = ont.rules.flatMap(r => [r.trigger, ...(r.requires || [])]).filter(c => !pCodes.has(c));
if (ontOrphans.length) report.push(`[고아] ontology 참조 중 legacy_processes(P코드)에 없는 코드: ${[...new Set(ontOrphans)].join(', ')}`);

// ════════════════ 요약 ════════════════
console.log('\n═══ 생성 요약 ═══');
console.log(`cost_items: base ${baseRows.length} + enrich ${enrichRows.length} (겹침 ${v22.costItems.filter(i => byCode.has(i.itemId)).length})`);
console.log(`materials ${matRows.length} / brands ${brRows.length} / labor ${labRows.length}+${l22Rows.length} / subs ${subRows.length} / defects ${defRows.length}`);
console.log(`schedule ${schRows.length} / process_categories ${pcRows.length} / groups ${pgRows.length} / legacy_processes ${lpRows.length}`);
console.log(`ontology ${onRows1.length}+${onRows2.length} / db_catalog ${dcRows.length}`);
console.log('\n═══ Diff / 검토 리포트 ═══');
for (const r of report) console.log('· ' + r);
