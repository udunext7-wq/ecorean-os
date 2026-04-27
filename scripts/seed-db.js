/**
 * ECOREAN BOC — DB 시드 스크립트
 * 실행: node scripts/seed-db.js
 * 대상: Electron userData DB 또는 --local 플래그 시 ./data/ecorean.db
 */
'use strict'

const path = require('path')
const fs   = require('fs')
const os   = require('os')

// ── DB 경로 ───────────────────────────────────────────────
const LOCAL  = process.argv.includes('--local')
const DB_PATH = process.env.SEED_DB_PATH || (
  LOCAL
    ? path.join(__dirname, '..', 'data', 'ecorean.db')
    : path.join(os.homedir(), 'AppData', 'Roaming', 'ECOREAN BOC', 'ecorean.db')
)
const DB_DIR = path.dirname(DB_PATH)
const SCHEMA_FILE = path.join(__dirname, '..', 'shared', 'db', 'schema.sql')
const ROOT       = path.join(__dirname, '..')

fs.mkdirSync(DB_DIR, { recursive: true })

const Database = require('better-sqlite3')
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = OFF')  // 시드 중 FK 비활성화

// 스키마 적용
db.exec(fs.readFileSync(SCHEMA_FILE, 'utf8'))
console.log('[Schema] 적용 완료 →', DB_PATH)

const now = new Date().toISOString()

// ── 유틸 ──────────────────────────────────────────────────
let inserted = 0, skipped = 0, errors = 0

function run(stmt, row, label) {
  try {
    const info = stmt.run(row)
    if (info.changes > 0) inserted++
    else skipped++
  } catch (e) {
    errors++
    console.warn(`  [ERR] ${label}: ${e.message}`)
  }
}

// ════════════════════════════════════════════════════════════
// 1. cost_items (공정 단가)
// ════════════════════════════════════════════════════════════
console.log('\n[1/5] cost_items 시딩...')

const ciRaw  = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/master-db/seed/cost-items-v2.json'), 'utf8'))
const ciItems = ciRaw.costItems || []

const stmtCI = db.prepare(`
  INSERT OR IGNORE INTO cost_items
    (itemId, itemName, level1, level2, level3, level4, unit,
     laborCost, materialCost, wasteRate, duration,
     formula, spaceTypes, isRequired, dataStatus, status, createdAt, updatedAt)
  VALUES
    (@itemId,@itemName,@level1,@level2,@level3,@level4,@unit,
     @laborCost,@materialCost,@wasteRate,@duration,
     @formula,@spaceTypes,@isRequired,@dataStatus,@status,@createdAt,@updatedAt)
`)

for (const r of ciItems) {
  run(stmtCI, {
    itemId:       r.itemId || r.id || ('CI_' + Date.now() + Math.random()),
    itemName:     r.itemName || r.name || '',
    level1:       r.majorCategory  || r.level1 || '',
    level2:       r.middleCategory || r.level2 || '',
    level3:       r.minorCategory  || r.level3 || '',
    level4:       r.spec           || r.level4 || '',
    unit:         r.unit  || '㎡',
    laborCost:    r.laborCost    || 0,
    materialCost: r.materialCost || (r.equipmentCost||0) + (r.accessoryCost||0),
    wasteRate:    r.wasteRate    || 0,
    duration:     r.defaultDuration || r.duration || 1,
    formula:      r.quantityFormula || r.formula || '',
    spaceTypes:   JSON.stringify(r.spaceTypes || r.applicableSpaces || []),
    isRequired:   r.triggerType === 'AUTO' ? 0 : (r.isRequired ? 1 : 0),
    dataStatus:   r.dataStatus || 'manual',
    status:       'active',
    createdAt:    now,
    updatedAt:    now,
  }, r.itemId)
}
console.log(`  → ${ciItems.length}건 처리 (inserted:${inserted}, skipped:${skipped}, err:${errors})`)

// ════════════════════════════════════════════════════════════
// 2. labor_roles (노무비 직종)
// ════════════════════════════════════════════════════════════
let [ins2, sk2, er2] = [0, 0, 0]
console.log('\n[2/5] labor_roles 시딩...')

const lrRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/master-db/seed/labor-roles.json'), 'utf8'))
const lrItems = Array.isArray(lrRaw) ? lrRaw : (lrRaw.items || [])

const stmtLR = db.prepare(`
  INSERT OR IGNORE INTO labor_roles
    (id, roleName, dailyWage, unit, region, status, createdAt, updatedAt)
  VALUES
    (@id, @roleName, @dailyWage, @unit, @region, @status, @createdAt, @updatedAt)
`)

for (const r of lrItems) {
  try {
    const info = stmtLR.run({
      id:        r.id || ('LBR_' + (r.name || r.roleName)),
      roleName:  r.name || r.roleName || '',
      dailyWage: r.dailyRate || r.dailyWage || 0,
      unit:      r.unit || '일',
      region:    r.region || '',
      status:    'active',
      createdAt: now,
      updatedAt: now,
    })
    if (info.changes > 0) ins2++; else sk2++
  } catch (e) { er2++; console.warn(`  [ERR] ${r.id}: ${e.message}`) }
}
console.log(`  → ${lrItems.length}건 처리 (inserted:${ins2}, skipped:${sk2}, err:${er2})`)

// ════════════════════════════════════════════════════════════
// 3. ontology_rules (자동 연결 규칙)
// ════════════════════════════════════════════════════════════
let [ins3, sk3, er3] = [0, 0, 0]
console.log('\n[3/5] ontology_rules 시딩...')

const ocRaw   = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/master-db/seed/ontology-candidates.json'), 'utf8'))
const ocItems = Array.isArray(ocRaw) ? ocRaw : (ocRaw.rules || ocRaw.items || [])

const stmtOC = db.prepare(`
  INSERT OR IGNORE INTO ontology_rules
    (ruleId, trigger, linked, triggerType, condition, confidenceLevel,
     status, approvedBy, approvedAt, source, createdAt, updatedAt)
  VALUES
    (@ruleId,@trigger,@linked,@triggerType,@condition,@confidenceLevel,
     @status,@approvedBy,@approvedAt,@source,@createdAt,@updatedAt)
`)

for (const r of ocItems) {
  try {
    const info = stmtOC.run({
      ruleId:          r.id || ('OR_' + Date.now() + Math.random()),
      trigger:         r.trigger || r.triggerProcessId || '',
      linked:          r.triggered || r.linkedProcessId || '',
      triggerType:     r.type === 'AUTO_INCLUDE' ? 'AUTO' : (r.triggerType || 'AUTO'),
      condition:       r.condition || '',
      confidenceLevel: r.confidence || 1.0,
      status:          r.status === 'pending' ? 'active' : (r.status || 'active'),
      approvedBy:      r.approvedBy || 'seed',
      approvedAt:      r.approvedAt || now,
      source:          r.evidence ? 'manual' : 'manual',
      createdAt:       now,
      updatedAt:       now,
    })
    if (info.changes > 0) ins3++; else sk3++
  } catch (e) { er3++; console.warn(`  [ERR] ${r.id}: ${e.message}`) }
}
console.log(`  → ${ocItems.length}건 처리 (inserted:${ins3}, skipped:${sk3}, err:${er3})`)

// ════════════════════════════════════════════════════════════
// 4. brands (브랜드 단가)
// ════════════════════════════════════════════════════════════
let [ins4, sk4, er4] = [0, 0, 0]
console.log('\n[4/5] brands 시딩...')

const bpRaw = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/master-db/brands/brand-price-db.json'), 'utf8'))
const BRAND_CATS = ['flooring', 'wallpaper', 'windows', 'kitchen', 'bathroom', 'lighting', 'door']
const brandItems = []
for (const cat of BRAND_CATS) {
  if (Array.isArray(bpRaw[cat])) {
    bpRaw[cat].forEach(b => brandItems.push({ ...b, _cat: cat }))
  }
}

const stmtBR = db.prepare(`
  INSERT OR IGNORE INTO brands
    (id, name, category, product, grade, price, unit, status, createdAt, updatedAt)
  VALUES
    (@id,@name,@category,@product,@grade,@price,@unit,@status,@createdAt,@updatedAt)
`)

for (const r of brandItems) {
  try {
    const info = stmtBR.run({
      id:       r.brandId || r.id || ('BR_' + Date.now() + Math.random()),
      name:     r.brand   || r.name || '',
      category: r._cat    || r.category || '',
      product:  r.product || '',
      grade:    r.grade   || '',
      price:    r.supplyPrice || r.retailPrice || r.price || 0,
      unit:     r.unit || '',
      status:   'active',
      createdAt: now,
      updatedAt: now,
    })
    if (info.changes > 0) ins4++; else sk4++
  } catch (e) { er4++; console.warn(`  [ERR] ${r.brandId}: ${e.message}`) }
}
console.log(`  → ${brandItems.length}건 처리 (inserted:${ins4}, skipped:${sk4}, err:${er4})`)

// ════════════════════════════════════════════════════════════
// 5. material → cost_items 보강 (자재 정보)
// ════════════════════════════════════════════════════════════
let [ins5, sk5, er5] = [0, 0, 0]
console.log('\n[5/5] material_items → cost_items 보강 시딩...')

const miRaw   = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/master-db/seed/material-items.json'), 'utf8'))
const miItems = miRaw.items || []

const stmtMI = db.prepare(`
  INSERT OR IGNORE INTO cost_items
    (itemId, itemName, level1, level2, unit, laborCost, materialCost,
     wasteRate, duration, dataStatus, status, createdAt, updatedAt)
  VALUES
    (@itemId,@itemName,@level1,@level2,@unit,@laborCost,@materialCost,
     @wasteRate,@duration,@dataStatus,@status,@createdAt,@updatedAt)
`)

for (const r of miItems) {
  try {
    const info = stmtMI.run({
      itemId:       r.matId || ('MAT_' + Date.now() + Math.random()),
      itemName:     r.name || '',
      level1:       '자재',
      level2:       r.processId || '',
      unit:         r.unit || '개',
      laborCost:    0,
      materialCost: r.unitPrice || 0,
      wasteRate:    0,
      duration:     r.leadDays || 1,
      dataStatus:   r.status || 'manual',
      status:       'active',
      createdAt:    now,
      updatedAt:    now,
    })
    if (info.changes > 0) ins5++; else sk5++
  } catch (e) { er5++; console.warn(`  [ERR] ${r.matId}: ${e.message}`) }
}
console.log(`  → ${miItems.length}건 처리 (inserted:${ins5}, skipped:${sk5}, err:${er5})`)

// ════════════════════════════════════════════════════════════
// 검증
// ════════════════════════════════════════════════════════════
console.log('\n=== 최종 검증 ===')
const tables = ['cost_items','labor_roles','ontology_rules','brands','processes','vendors','region_coefficients']
for (const t of tables) {
  try {
    const row = db.prepare(`SELECT COUNT(*) AS cnt FROM ${t}`).get()
    console.log(`  ${t}: ${row.cnt}건`)
  } catch (e) {
    console.log(`  ${t}: 오류 - ${e.message}`)
  }
}

db.pragma('foreign_keys = ON')
db.close()

const total = ins2 + ins3 + ins4 + ins5 + inserted
console.log(`\n✅ 시드 완료 — 총 신규 입력: ${total}건`)
console.log(`   DB: ${DB_PATH}`)
