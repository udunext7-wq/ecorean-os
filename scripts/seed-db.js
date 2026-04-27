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
console.log('\n[1/8] cost_items 시딩...')

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
console.log('\n[2/8] labor_roles 시딩...')

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
console.log('\n[3/8] ontology_rules 시딩...')

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
console.log('\n[4/8] brands 시딩...')

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
console.log('\n[5/8] material_items → cost_items 보강 시딩...')

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
// 6. CalcEngine 내장 공정 → cost_items 보강 (엔진 동적 연동용)
// ════════════════════════════════════════════════════════════
let [ins6, sk6, er6] = [0, 0, 0]
console.log('\n[6/8] CalcEngine 내장 공정 → cost_items 시딩...')

const ENGINE_ITEMS = [
  { itemId:'WTP_BT',  itemName:'방수(욕실)',    level1:'방수',   level2:'방수',   unit:'㎡', laborCost:25000,  materialCost:8000,   wasteRate:0.10, duration:1   },
  { itemId:'TILE_BT', itemName:'바닥타일(욕실)',level1:'타일',   level2:'타일',   unit:'㎡', laborCost:22000,  materialCost:35000,  wasteRate:0.15, duration:1   },
  { itemId:'TILE_WL', itemName:'벽타일(욕실)',  level1:'타일',   level2:'타일',   unit:'㎡', laborCost:25000,  materialCost:30000,  wasteRate:0.15, duration:1   },
  { itemId:'TILE_KT', itemName:'주방타일',      level1:'타일',   level2:'타일',   unit:'㎡', laborCost:22000,  materialCost:28000,  wasteRate:0.15, duration:0.5 },
  { itemId:'GROUT',   itemName:'줄눈',          level1:'타일',   level2:'타일',   unit:'㎡', laborCost:8000,   materialCost:3000,   wasteRate:0.05, duration:0.5 },
  { itemId:'WP_BASIC',itemName:'도배(합지)',    level1:'마감',   level2:'도배',   unit:'㎡', laborCost:4500,   materialCost:2500,   wasteRate:0.10, duration:0.5 },
  { itemId:'WP_PRMR', itemName:'초배지',        level1:'마감',   level2:'도배',   unit:'㎡', laborCost:3000,   materialCost:1500,   wasteRate:0.10, duration:0.3 },
  { itemId:'FL_HB',   itemName:'강마루',        level1:'바닥재', level2:'바닥재', unit:'㎡', laborCost:15000,  materialCost:35000,  wasteRate:0.10, duration:0.5 },
  { itemId:'FL_VNL',  itemName:'장판',          level1:'바닥재', level2:'바닥재', unit:'㎡', laborCost:8000,   materialCost:12000,  wasteRate:0.05, duration:0.3 },
  { itemId:'MLD_BASE',itemName:'걸레받이',      level1:'몰딩',   level2:'몰딩',   unit:'m',  laborCost:5000,   materialCost:3000,   wasteRate:0.05, duration:0.2 },
  { itemId:'WIN_RPL', itemName:'창호교체',      level1:'창호',   level2:'창호',   unit:'식', laborCost:150000, materialCost:450000, wasteRate:0.05, duration:0.5 },
  { itemId:'WIN_FOAM',itemName:'우레탄폼',      level1:'창호',   level2:'창호',   unit:'식', laborCost:15000,  materialCost:5000,   wasteRate:0.05, duration:0.2 },
  { itemId:'DR_RPL',  itemName:'도어교체',      level1:'도어',   level2:'도어',   unit:'짝', laborCost:80000,  materialCost:250000, wasteRate:0.05, duration:0.3 },
  { itemId:'PLB_PIPE',itemName:'배관교체',      level1:'설비',   level2:'배관',   unit:'식', laborCost:350000, materialCost:150000, wasteRate:0.05, duration:2   },
  { itemId:'PLB_BOIR',itemName:'보일러교체',    level1:'설비',   level2:'배관',   unit:'식', laborCost:100000, materialCost:800000, wasteRate:0.02, duration:1   },
  { itemId:'ELE_WIRE',itemName:'전선교체',      level1:'전기',   level2:'전기',   unit:'식', laborCost:500000, materialCost:200000, wasteRate:0.05, duration:2   },
  { itemId:'ELE_OUT', itemName:'콘센트/스위치', level1:'전기',   level2:'전기',   unit:'개', laborCost:15000,  materialCost:8000,   wasteRate:0.05, duration:0.1 },
  { itemId:'KIT_CAB', itemName:'주방가구',      level1:'주방',   level2:'주방',   unit:'m',  laborCost:150000, materialCost:500000, wasteRate:0.02, duration:1   },
  { itemId:'SNT_WC',  itemName:'위생도기',      level1:'위생',   level2:'위생',   unit:'식', laborCost:80000,  materialCost:350000, wasteRate:0.02, duration:0.5 },
  { itemId:'VNT_FAN', itemName:'환풍기',        level1:'위생',   level2:'위생',   unit:'개', laborCost:30000,  materialCost:80000,  wasteRate:0.02, duration:0.3 },
  { itemId:'CEL_BTH', itemName:'욕실천장',      level1:'마감',   level2:'천장',   unit:'㎡', laborCost:18000,  materialCost:15000,  wasteRate:0.10, duration:0.3 },
  { itemId:'ASB_RMV', itemName:'석면제거',      level1:'특수',   level2:'특수',   unit:'㎡', laborCost:80000,  materialCost:20000,  wasteRate:0.10, duration:1   },
  { itemId:'EXP_BAL', itemName:'발코니확장',    level1:'발코니', level2:'발코니', unit:'㎡', laborCost:120000, materialCost:80000,  wasteRate:0.05, duration:1   },
  { itemId:'INS_BAL', itemName:'발코니단열',    level1:'발코니', level2:'발코니', unit:'㎡', laborCost:25000,  materialCost:35000,  wasteRate:0.10, duration:0.5 },
  { itemId:'SCREED',  itemName:'바닥미장',      level1:'토목',   level2:'토목',   unit:'㎡', laborCost:12000,  materialCost:8000,   wasteRate:0.05, duration:0.5 },
  { itemId:'MRB_FLR', itemName:'대리석',        level1:'특수',   level2:'특수',   unit:'㎡', laborCost:60000,  materialCost:150000, wasteRate:0.10, duration:1   },
  { itemId:'EPX_FLR', itemName:'에폭시',        level1:'특수',   level2:'특수',   unit:'㎡', laborCost:18000,  materialCost:22000,  wasteRate:0.05, duration:0.5 },
  { itemId:'SIGN',    itemName:'간판',          level1:'상업',   level2:'상업',   unit:'식', laborCost:200000, materialCost:500000, wasteRate:0.05, duration:1   },
  { itemId:'CNTR',    itemName:'카운터',        level1:'상업',   level2:'상업',   unit:'식', laborCost:300000, materialCost:700000, wasteRate:0.05, duration:2   },
  { itemId:'CCTV',    itemName:'CCTV',          level1:'상업',   level2:'상업',   unit:'식', laborCost:150000, materialCost:250000, wasteRate:0.02, duration:0.5 },
]

const stmtEI = db.prepare(`
  INSERT OR IGNORE INTO cost_items
    (itemId, itemName, level1, level2, unit, laborCost, materialCost,
     wasteRate, duration, dataStatus, status, createdAt, updatedAt)
  VALUES
    (@itemId,@itemName,@level1,@level2,@unit,@laborCost,@materialCost,
     @wasteRate,@duration,@dataStatus,@status,@createdAt,@updatedAt)
`)

for (const r of ENGINE_ITEMS) {
  try {
    const info = stmtEI.run({ ...r, dataStatus:'engine', status:'active', createdAt:now, updatedAt:now })
    if (info.changes > 0) ins6++; else sk6++
  } catch (e) { er6++; console.warn(`  [ERR] ${r.itemId}: ${e.message}`) }
}
console.log(`  → ${ENGINE_ITEMS.length}건 처리 (inserted:${ins6}, skipped:${sk6}, err:${er6})`)

// ════════════════════════════════════════════════════════════
// 7. region_coefficients (지역계수)
// ════════════════════════════════════════════════════════════
let [ins7, sk7, er7] = [0, 0, 0]
console.log('\n[7/8] region_coefficients 시딩...')

const REGIONS = [
  { id:'RC_SEO', regionName:'서울',   laborMul:1.00, materialMul:1.00, description:'수도권 기준' },
  { id:'RC_GGI', regionName:'경기',   laborMul:0.97, materialMul:0.98, description:'수도권' },
  { id:'RC_ICN', regionName:'인천',   laborMul:0.97, materialMul:0.98, description:'수도권' },
  { id:'RC_BSN', regionName:'부산',   laborMul:0.95, materialMul:0.96, description:'광역시' },
  { id:'RC_DGU', regionName:'대구',   laborMul:0.94, materialMul:0.95, description:'광역시' },
  { id:'RC_GJU', regionName:'광주',   laborMul:0.93, materialMul:0.94, description:'광역시' },
  { id:'RC_DJN', regionName:'대전',   laborMul:0.93, materialMul:0.94, description:'광역시' },
  { id:'RC_ULS', regionName:'울산',   laborMul:0.95, materialMul:0.95, description:'광역시' },
  { id:'RC_SJG', regionName:'세종',   laborMul:0.96, materialMul:0.96, description:'특별자치시' },
  { id:'RC_GWN', regionName:'강원',   laborMul:0.92, materialMul:0.93, description:'도(지역)' },
  { id:'RC_CBK', regionName:'충북',   laborMul:0.91, materialMul:0.92, description:'도(지역)' },
  { id:'RC_CNM', regionName:'충남',   laborMul:0.91, materialMul:0.92, description:'도(지역)' },
  { id:'RC_JBK', regionName:'전북',   laborMul:0.90, materialMul:0.91, description:'도(지역)' },
  { id:'RC_JNM', regionName:'전남',   laborMul:0.90, materialMul:0.91, description:'도(지역)' },
  { id:'RC_GBK', regionName:'경북',   laborMul:0.91, materialMul:0.92, description:'도(지역)' },
  { id:'RC_GNM', regionName:'경남',   laborMul:0.92, materialMul:0.93, description:'도(지역)' },
  { id:'RC_JEJ', regionName:'제주',   laborMul:0.96, materialMul:0.97, description:'도서지역' },
  { id:'RC_KNG', regionName:'개성공단',laborMul:0.85, materialMul:0.88, description:'특수지역' },
  { id:'RC_ETC', regionName:'기타',   laborMul:0.90, materialMul:0.91, description:'기타지역' },
]

const stmtRC = db.prepare(`
  INSERT OR IGNORE INTO region_coefficients
    (id, regionName, laborMul, materialMul, description, status, createdAt, updatedAt)
  VALUES
    (@id, @regionName, @laborMul, @materialMul, @description, @status, @createdAt, @updatedAt)
`)

for (const r of REGIONS) {
  try {
    const info = stmtRC.run({ ...r, status:'active', createdAt:now, updatedAt:now })
    if (info.changes > 0) ins7++; else sk7++
  } catch (e) { er7++; console.warn(`  [ERR] ${r.id}: ${e.message}`) }
}
console.log(`  → ${REGIONS.length}건 처리 (inserted:${ins7}, skipped:${sk7}, err:${er7})`)

// ════════════════════════════════════════════════════════════
// 8. vendors (협력업체 샘플)
// ════════════════════════════════════════════════════════════
let [ins8, sk8, er8] = [0, 0, 0]
console.log('\n[8/8] vendors 시딩...')

const VENDORS = [
  { id:'VND_001', name:'한국타일공업사',   category:'타일',   region:'서울', contact:'02-1234-5678', email:'tile@example.com',    rating:4.5, notes:'욕실·주방 전문' },
  { id:'VND_002', name:'대성도배기술',     category:'도배',   region:'경기', contact:'031-2345-6789',email:'wallpaper@example.com',rating:4.3, notes:'실크·합지 전문' },
  { id:'VND_003', name:'동국강마루',       category:'바닥재', region:'서울', contact:'02-3456-7890', email:'floor@example.com',    rating:4.7, notes:'강마루·온돌 전문' },
  { id:'VND_004', name:'삼성창호시스템',   category:'창호',   region:'인천', contact:'032-4567-8901',email:'window@example.com',   rating:4.4, notes:'PVC·알루미늄 창호' },
  { id:'VND_005', name:'현대배관설비',     category:'배관',   region:'부산', contact:'051-5678-9012',email:'plumb@example.com',    rating:4.2, notes:'배관·보일러 전문' },
  { id:'VND_006', name:'KT전기공사',       category:'전기',   region:'대구', contact:'053-6789-0123',email:'elec@example.com',     rating:4.6, notes:'전기공사 면허 보유' },
  { id:'VND_007', name:'명품주방가구',     category:'주방',   region:'서울', contact:'02-7890-1234', email:'kitchen@example.com',  rating:4.8, notes:'맞춤 주방가구 전문' },
  { id:'VND_008', name:'청정위생도기',     category:'위생',   region:'경기', contact:'031-8901-2345',email:'sanit@example.com',    rating:4.1, notes:'위생도기·욕조 전문' },
  { id:'VND_009', name:'발코니창호마스터', category:'발코니', region:'서울', contact:'02-9012-3456', email:'balcony@example.com',  rating:4.5, notes:'발코니 확장 전문' },
  { id:'VND_010', name:'대한방수전문',     category:'방수',   region:'대전', contact:'042-0123-4567',email:'water@example.com',    rating:4.3, notes:'욕실·옥상 방수 전문' },
]

const stmtVN = db.prepare(`
  INSERT OR IGNORE INTO vendors
    (id, name, category, region, contact, email, rating, notes, status, createdAt, updatedAt)
  VALUES
    (@id, @name, @category, @region, @contact, @email, @rating, @notes, @status, @createdAt, @updatedAt)
`)

for (const r of VENDORS) {
  try {
    const info = stmtVN.run({ ...r, status:'active', createdAt:now, updatedAt:now })
    if (info.changes > 0) ins8++; else sk8++
  } catch (e) { er8++; console.warn(`  [ERR] ${r.id}: ${e.message}`) }
}
console.log(`  → ${VENDORS.length}건 처리 (inserted:${ins8}, skipped:${sk8}, err:${er8})`)

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

const total = ins2 + ins3 + ins4 + ins5 + ins6 + ins7 + ins8 + inserted
console.log(`\n✅ 시드 완료 — 총 신규 입력: ${total}건`)
console.log(`   DB: ${DB_PATH}`)
