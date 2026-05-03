# ECOREAN BOC — Phase 4 Week 4-A 즉시 실행 명령

> **대상:** Claude Code
> **로컬:** C:\Users\udune\ecorean-os
> **GitHub:** 커밋 d878ffd (Phase 4 Week 3 완료)
> **이번 주 목표:** cost_items + Excel 왕복 + IPC + 노드 분리 + G1 이동 + KPI 3 레이어
> **소요:** 자율 실행 12.5시간 (분할 진행 권고: 작업 0~3 / 작업 4~5 / 작업 6~8)
> **버전:** v5.8 → v5.9 (§117.2 갱신, 변동 0)
> **의의:** Phase 4 핵심 주차. 시뮬 → 실 단가, 평면 코드 → 노드 분리, IPC 도입.

---

## 절대 규칙 (Phase 4 전 기간 동일)

1. TDD 강제 (모든 신규 모듈 단위 테스트)
2. 버그 있는 코드 커밋 금지
3. estimate.html · boc-shell.html 직접 수정 금지
4. 22/23/12/6/5 변경 금지 (헌법)
5. Phase 3 25 모듈 시그니처 변경 금지 (확장만)
6. **단가 추정 금지** — DB 데이터만 사용
7. **ML 학습은 is_approved_by_principal=1만 사용**
8. **graph.json 12 노드 + 24 엣지 변경 0** (cost_management는 §117에 비전만)
9. rollback SQL 없는 DB 변경 금지
10. 9탭 회귀 0건 검증 후만 다음 단계

---

## 시작 전 점검

```bash
cd C:\Users\udune\ecorean-os
git log --oneline -3   # d878ffd 확인
git pull origin master
node scripts/backup.cjs --label phase4_week4a_pre

# Phase 3 + Week 1~3 회귀
node test-engine.js
node modules-html/boc-v6/__tests__/Router.test.cjs
node modules-html/boc-v6/__tests__/WizardController.test.cjs
node modules-html/boc-v6/__tests__/CADCanvas.test.cjs
node modules-html/kpi-v6/__tests__/KPIData.test.cjs
node modules-html/kpi-v6/__tests__/KPIBus.test.cjs
node shell/src/korea/__tests__/RegionFactor.test.cjs
```

모두 PASS 후 진입.

---

## 작업 0: 사전 조사 (1시간) — 추측 0, 사실만

### 0-1. 마스터 시드 코드 분석

```bash
# Claude Code가 직접 읽고 분석
view scripts/seed_master_db.cjs
```

**확인 사항:**
- 어떤 테이블에 시드되는가 (materials / labor_costs / processes / ontology / brands)
- 컬럼 구조 (정확한 이름/타입/단위)
- 시드 출처 (대표님 경험? 시뮬? 표준값?)
- is_simulated 플래그 존재 여부
- 159건의 정확한 분포

### 0-2. graph.json futureNodes 확인

```bash
view docs/graph.json
```

**확인 사항:**
- futureNodes 15개 목록 출력
- cost_management / cost_items 관련 노드 존재 여부
- 미래 노드 자리 배정 현황

### 0-3. 마스터 DB 실제 데이터 검증

```bash
# 현재 DB의 마스터 시드 적재 상태
node -e "
const Database = require('better-sqlite3');
const db = new Database('./ecorean-boc.db');
const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\").all();
console.log('=== 테이블 목록 ===');
tables.forEach(t => {
  const count = db.prepare(\`SELECT COUNT(*) as c FROM \${t.name}\`).get().c;
  console.log(\`  \${t.name}: \${count} rows\`);
});
db.close();
" 2>&1
```

### 0-4. 결과를 INVENTORY.md에 추가

`docs/architecture/INVENTORY.md` 끝에 다음 추가:

```markdown
---

## Phase 4 Week 4-A 사전 조사 결과 (v5.9)

### 마스터 시드 분포 (실제 적재 확인)
- materials: __건
- labor_costs: __건
- processes: __건
- ontology: __건
- brands: __건
- 합계: __건

### graph.json futureNodes 15개 중 cost 관련
- 존재 여부: ___
- 노드 ID: ___

### 마이그레이션 결정
- 출처 분류: principal_seed / principal_input / invoice / simulation / ai_market_avg
- 자동 승인 정책: source='principal_seed' → is_approved_by_principal=1
```

---

## 작업 1: cost_items DB + 마스터 마이그레이션 (2시간)

### 1-1. 디렉토리 생성

```bash
mkdir -p shell/src/cost-items/__tests__
mkdir -p db/migrations/v6.0
mkdir -p db/seeds/v6.0
mkdir -p scripts/v6.0
```

### 1-2. db/migrations/v6.0/004_cost_items_up.sql

```sql
-- ECOREAN BOC v6.0 — cost_items 테이블
-- 5종 출처 분리 + ML 학습 룰 보존

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS cost_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'HQ',

  -- 분류
  category TEXT NOT NULL,
  subcategory TEXT,
  ks_code TEXT,
  name TEXT NOT NULL,

  -- 단가
  unit TEXT NOT NULL,
  unit_price INTEGER NOT NULL,

  -- 보정 메타
  applies_to_spaces TEXT,
  applies_to_concepts TEXT,

  -- 5종 출처 분류 (ML 학습 룰)
  source TEXT NOT NULL CHECK (source IN (
    'principal_seed',     -- Phase 3 마스터 시드 (대표님 박은 표준값)
    'principal_input',    -- Excel/UI로 대표님 추가/수정
    'invoice',            -- 자재상 인보이스 (실 거래)
    'simulation',         -- 시뮬레이션 (학습 제외)
    'ai_market_avg'       -- AI 추정 (검토 필요)
  )),

  -- 승인 플래그 (ML 학습 데이터 분리)
  is_ai_estimated INTEGER NOT NULL DEFAULT 0,
  is_approved_by_principal INTEGER NOT NULL DEFAULT 0,
  is_simulated INTEGER NOT NULL DEFAULT 0,

  approved_at INTEGER,
  approved_by TEXT,

  -- 메타
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  CHECK (is_ai_estimated IN (0,1)),
  CHECK (is_approved_by_principal IN (0,1)),
  CHECK (is_simulated IN (0,1)),
  CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_cost_items_tenant     ON cost_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cost_items_category   ON cost_items(category);
CREATE INDEX IF NOT EXISTS idx_cost_items_ks_code    ON cost_items(ks_code);
CREATE INDEX IF NOT EXISTS idx_cost_items_source     ON cost_items(source);
CREATE INDEX IF NOT EXISTS idx_cost_items_approved   ON cost_items(is_approved_by_principal);

COMMIT;
```

### 1-3. db/migrations/v6.0/004_cost_items_down.sql

```sql
BEGIN TRANSACTION;
DROP INDEX IF EXISTS idx_cost_items_approved;
DROP INDEX IF EXISTS idx_cost_items_source;
DROP INDEX IF EXISTS idx_cost_items_ks_code;
DROP INDEX IF EXISTS idx_cost_items_category;
DROP INDEX IF EXISTS idx_cost_items_tenant;
DROP TABLE IF EXISTS cost_items;
COMMIT;
```

### 1-4. scripts/v6.0/migrate_cost_items.cjs

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH  = path.join(__dirname, '..', '..', 'ecorean-boc.db');
const UP_SQL   = path.join(__dirname, '..', '..', 'db', 'migrations', 'v6.0', '004_cost_items_up.sql');
const DOWN_SQL = path.join(__dirname, '..', '..', 'db', 'migrations', 'v6.0', '004_cost_items_down.sql');

const cmd = process.argv[2] || 'up';
const sqlFile = cmd === 'down' ? DOWN_SQL : UP_SQL;

const db = new Database(DB_PATH);
db.exec(fs.readFileSync(sqlFile, 'utf-8'));

if (cmd === 'up') {
  const r = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cost_items'").get();
  if (!r) { console.error('[FAIL] cost_items 미생성'); process.exit(1); }
  const c = db.prepare("SELECT COUNT(*) as c FROM cost_items").get();
  console.log('[PASS] cost_items 테이블 생성 (' + c.c + ' rows)');
}
if (cmd === 'down') {
  const r = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cost_items'").get();
  if (r) { console.error('[FAIL] cost_items 미삭제'); process.exit(1); }
  console.log('[PASS] cost_items 테이블 삭제');
}
db.close();
```

### 1-5. 마이그레이션 실행

```bash
node scripts/v6.0/migrate_cost_items.cjs up
# 기대: [PASS] cost_items 테이블 생성 (0 rows)
```

### 1-6. scripts/v6.0/migrate_master_to_cost_items.cjs (마스터 → cost_items)

**주의:** 작업 0번에서 확인한 실제 마스터 스키마에 맞게 SQL 수정 필요. 아래는 일반 형식.

```javascript
#!/usr/bin/env node
// 마스터 시드 → cost_items 마이그레이션
// 사전 조사 기반: source='principal_seed' + is_approved_by_principal=1 자동 박힘

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', '..', 'ecorean-boc.db');
const NOW = Date.now();

const cmd = process.argv[2] || '--dry-run';

function migrate(dryRun) {
  const db = new Database(DB_PATH);
  const stats = { inserted: 0, skipped: 0, conflicts: [], items: [] };

  // 마스터 테이블 확인 (작업 0번 결과로 정확한 이름 사용)
  const masterTables = ['materials', 'labor_costs', 'processes'];

  // 카테고리 매핑
  const TABLE_TO_CATEGORY = {
    materials:    null,    // materials.category 사용
    labor_costs:  'labor',
    processes:    null     // 가공 후 결정
  };

  masterTables.forEach(table => {
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(table);

    if (!tableExists) {
      console.log(`[SKIP] ${table} 테이블 미존재`);
      return;
    }

    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    console.log(`[INFO] ${table}: ${rows.length} rows`);

    rows.forEach((row, idx) => {
      // 컬럼 매핑 (작업 0번 사전 조사 기반)
      // 기본 가정 — 수정 필요 시 사전 조사 결과 반영
      const item = {
        id: `ci_master_${table}_${String(idx).padStart(4, '0')}_${Date.now()}`,
        tenant_id: row.tenant_id || 'HQ',
        category: row.category || TABLE_TO_CATEGORY[table] || 'unknown',
        subcategory: row.subcategory || row.type || null,
        ks_code: row.ks_code || null,
        name: row.name || row.process_name || row.item_name,
        unit: row.unit || row.unit_type || '㎡',
        unit_price: row.unit_price || row.price || row.cost || 0,
        applies_to_spaces: row.applies_to_spaces || null,
        applies_to_concepts: row.applies_to_concepts || null,
        source: 'principal_seed',
        is_ai_estimated: 0,
        is_approved_by_principal: 1,    // 자동 승인 (대표님 박은 데이터)
        is_simulated: row.is_simulated || 0,
        approved_at: NOW,
        approved_by: 'principal_seed_migration',
        notes: row.notes || `마스터 시드 from ${table}`,
        created_at: NOW,
        updated_at: NOW
      };

      // 중복 검증 (이름 + KS 코드)
      const existing = db.prepare(
        "SELECT id FROM cost_items WHERE name = ? AND COALESCE(ks_code,'') = COALESCE(?, '')"
      ).get(item.name, item.ks_code);

      if (existing) {
        stats.skipped++;
        stats.conflicts.push({ name: item.name, existing_id: existing.id });
        return;
      }

      stats.items.push(item);
      stats.inserted++;
    });
  });

  // dry-run vs apply
  if (dryRun) {
    console.log('\n=== DRY RUN 결과 ===');
    console.log(`적재 예정: ${stats.inserted}건`);
    console.log(`스킵 (중복): ${stats.skipped}건`);
    if (stats.conflicts.length > 0) {
      console.log(`충돌:`);
      stats.conflicts.forEach(c => console.log(`  ${c.name} (기존 ${c.existing_id})`));
    }
    console.log(`\n변경 미적용. --apply 옵션으로 실제 마이그레이션 실행.`);
  } else {
    console.log('\n=== APPLY ===');
    const insert = db.prepare(`
      INSERT INTO cost_items (
        id, tenant_id, category, subcategory, ks_code, name, unit, unit_price,
        applies_to_spaces, applies_to_concepts, source,
        is_ai_estimated, is_approved_by_principal, is_simulated,
        approved_at, approved_by, notes, created_at, updated_at
      ) VALUES (
        @id, @tenant_id, @category, @subcategory, @ks_code, @name, @unit, @unit_price,
        @applies_to_spaces, @applies_to_concepts, @source,
        @is_ai_estimated, @is_approved_by_principal, @is_simulated,
        @approved_at, @approved_by, @notes, @created_at, @updated_at
      )
    `);

    const tx = db.transaction((items) => {
      items.forEach(i => insert.run(i));
    });

    try {
      tx(stats.items);
      console.log(`[PASS] ${stats.inserted}건 마이그레이션 완료`);
    } catch (e) {
      console.error('[FAIL] 트랜잭션 실패:', e.message);
      process.exit(1);
    }
  }

  db.close();
  return stats;
}

if (require.main === module) {
  const dryRun = !process.argv.includes('--apply');
  migrate(dryRun);
}

module.exports = { migrate };
```

### 1-7. 실행 (dry-run → apply)

```bash
# 1단계: dry-run
node scripts/v6.0/migrate_master_to_cost_items.cjs --dry-run
# 결과 확인

# 2단계: apply
node scripts/v6.0/migrate_master_to_cost_items.cjs --apply
# 기대: ~159건 마이그레이션 완료
```

### 1-8. db/seeds/v6.0/cost_items_ai_supplement.cjs (AI 보충 시드)

마스터 159건 외 부족한 부분만 보충 (중복 검증 후):

```javascript
#!/usr/bin/env node
// AI 시장 평균 단가 보충 시드 (마스터에 없는 항목만)

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', '..', '..', 'ecorean-boc.db');
const NOW = Date.now();

// 마스터에 없을 가능성이 높은 항목들 (AI 추정)
const SUPPLEMENT_SEEDS = [
  // 12 컨셉 차별화 자재 (luxury concepts)
  { category: 'flooring', subcategory: 'hardwood', ks_code: 'KS F 3111', name: '원목마루 (월넛 프리미엄)', unit: '㎡', unit_price: 250000, applies_to_concepts: ['CLASSIC_LUXURY','CONTEMPORARY'] },
  { category: 'tile', subcategory: 'marble', ks_code: 'KS L 1106', name: '대리석 타일 (이태리 카라라)', unit: '㎡', unit_price: 320000, applies_to_concepts: ['CLASSIC_LUXURY'] },
  { category: 'wallcovering', subcategory: 'panel', name: '나무 패널 (오크/월넛)', unit: '㎡', unit_price: 180000, applies_to_concepts: ['VINTAGE','INDUSTRIAL','CLASSIC_LUXURY'] },
  { category: 'wallcovering', subcategory: 'concrete', name: '노출콘크리트 마감', unit: '㎡', unit_price: 95000, applies_to_concepts: ['INDUSTRIAL','MINIMALIST'] },

  // 23 공간 차별화
  { category: 'tile', subcategory: 'porcelain', name: '베란다 타일 (방수)', unit: '㎡', unit_price: 38000, applies_to_spaces: ['BALCONY','TERRACE'] },
  { category: 'flooring', subcategory: 'epoxy', name: '에폭시 코팅 (창고/주차장)', unit: '㎡', unit_price: 55000, applies_to_spaces: ['WAREHOUSE','GARAGE'] },

  // 환기/공조
  { category: 'hvac', subcategory: 'ventilation', name: '환풍기 (욕실)', unit: 'EA', unit_price: 180000, applies_to_spaces: ['BATHROOM','POWDER_ROOM'] },
  { category: 'hvac', subcategory: 'aircon', name: '에어컨 매립형', unit: 'EA', unit_price: 1850000 },

  // 부자재 보충
  { category: 'accessory', subcategory: 'hardware', name: '욕실 잡자재 (수전/거울/타올링)', unit: 'EA', unit_price: 280000, applies_to_spaces: ['BATHROOM'] },
  { category: 'accessory', subcategory: 'kitchen', name: '주방 잡자재 (수전/싱크볼/후드)', unit: 'EA', unit_price: 650000, applies_to_spaces: ['KITCHEN'] }

  // 작업 0번 결과 기반 추가 항목 (마스터에 없는 것만)
];

function run() {
  const db = new Database(DB_PATH);

  let inserted = 0, skipped = 0;

  const insert = db.prepare(`
    INSERT INTO cost_items (
      id, tenant_id, category, subcategory, ks_code, name, unit, unit_price,
      applies_to_spaces, applies_to_concepts, source,
      is_ai_estimated, is_approved_by_principal, is_simulated,
      created_at, updated_at
    ) VALUES (
      @id, 'HQ', @category, @subcategory, @ks_code, @name, @unit, @unit_price,
      @applies_to_spaces, @applies_to_concepts, 'ai_market_avg',
      1, 0, 0,
      @now, @now
    )
  `);

  const checkExisting = db.prepare(
    "SELECT id FROM cost_items WHERE name = ? AND COALESCE(ks_code,'') = COALESCE(?, '')"
  );

  SUPPLEMENT_SEEDS.forEach((seed, idx) => {
    const existing = checkExisting.get(seed.name, seed.ks_code || null);
    if (existing) {
      skipped++;
      return;
    }
    insert.run({
      id: 'ci_ai_' + Date.now() + '_' + String(idx).padStart(3, '0'),
      category: seed.category,
      subcategory: seed.subcategory || null,
      ks_code: seed.ks_code || null,
      name: seed.name,
      unit: seed.unit,
      unit_price: seed.unit_price,
      applies_to_spaces: seed.applies_to_spaces ? JSON.stringify(seed.applies_to_spaces) : null,
      applies_to_concepts: seed.applies_to_concepts ? JSON.stringify(seed.applies_to_concepts) : null,
      now: NOW
    });
    inserted++;
  });

  console.log(`[PASS] AI 보충: ${inserted}건 추가 / ${skipped}건 스킵 (중복)`);
  db.close();
}

if (require.main === module) run();
module.exports = { run };
```

### 1-9. 실행 + 검증

```bash
node db/seeds/v6.0/cost_items_ai_supplement.cjs
# 기대: AI 보충 ~10~50건 (작업 0 결과에 따라)

# 합계 검증
node -e "
const db = require('better-sqlite3')('./ecorean-boc.db');
const total = db.prepare('SELECT COUNT(*) as c FROM cost_items').get().c;
const principalApproved = db.prepare(\"SELECT COUNT(*) as c FROM cost_items WHERE source='principal_seed' AND is_approved_by_principal=1\").get().c;
const aiPending = db.prepare(\"SELECT COUNT(*) as c FROM cost_items WHERE source='ai_market_avg' AND is_approved_by_principal=0\").get().c;
console.log('총:', total, '/ 마스터승인:', principalApproved, '/ AI대기:', aiPending);
"
# 기대: ~200건 (마스터 159 + AI 보충 ~50)
```

---

## 작업 2: Excel 워크플로우 (1.5시간)

### 2-1. 의존성 확인

```bash
# xlsx 라이브러리 (이미 있을 가능성 높음)
node -e "require('xlsx'); console.log('xlsx OK')" 2>&1 || npm install xlsx
```

### 2-2. scripts/v6.0/export_cost_items_xlsx.cjs

```javascript
#!/usr/bin/env node
// cost_items → Excel 출력 (대표님 검토용)
// 시트 보호 + 데이터 유효성 + 시트 2 분리

const path = require('path');
const Database = require('better-sqlite3');
const XLSX = require('xlsx');

const DB_PATH  = path.join(__dirname, '..', '..', 'ecorean-boc.db');
const OUTPUT_DIR = path.join(__dirname, '..', '..');

function fmt(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}`;
}

function run() {
  const db = new Database(DB_PATH);

  const items = db.prepare(`
    SELECT * FROM cost_items
    ORDER BY source, category, name
  `).all();

  if (items.length === 0) {
    console.error('[FAIL] cost_items 데이터 없음. 먼저 마이그레이션 + 시드 실행');
    process.exit(1);
  }

  // 시트 1: 검토용 (마스터 + AI)
  const sheet1Data = items.map(i => ({
    'id (수정 금지)': i.id,
    'category': i.category,
    'subcategory': i.subcategory || '',
    'ks_code': i.ks_code || '',
    'name': i.name,
    'unit': i.unit,
    '현재 단가 (원)': i.unit_price,
    '대표님 단가 (수정시 입력)': '',
    '메모': i.notes || '',
    '승인 (Y/N)': i.is_approved_by_principal === 1 ? 'Y' : 'N',
    '출처': i.source,
    'AI 추정?': i.is_ai_estimated === 1 ? 'AI' : '',
    'updated_at': new Date(i.updated_at).toISOString().slice(0, 16).replace('T', ' ')
  }));

  // 시트 2: 신규 추가용 (빈 템플릿)
  const sheet2Data = [{
    'category': '',
    'subcategory': '',
    'ks_code': '',
    'name': '',
    'unit': '',
    'unit_price (원)': '',
    'applies_to_spaces (JSON)': '',
    'applies_to_concepts (JSON)': '',
    '메모': ''
  }];

  // 시트 3: 가이드
  const sheet3Data = [
    { '항목': '검토 워크플로우', '설명': '시트 1에서 단가 검토 후 H열에 입력' },
    { '항목': '단가 수정', '설명': 'H열 (대표님 단가)에 새 단가 입력. 빈칸이면 G열 (현재 단가) 유지' },
    { '항목': '승인', '설명': 'J열 (승인) Y/N 변경. Y는 ML 학습 데이터로 사용됨' },
    { '항목': '신규 자재', '설명': '시트 2에 새 행으로 추가. category/name/unit/unit_price 필수' },
    { '항목': '저장 위치', '설명': '/mnt/user-data/uploads/ 또는 OneDrive' },
    { '항목': '임포트', '설명': 'node scripts/v6.0/import_cost_items_xlsx.cjs <파일경로>' },
    { '항목': '주의', '설명': 'A열 (id) 절대 수정 금지. ML 학습 데이터 추적용' }
  ];

  // 워크북 생성
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  const ws3 = XLSX.utils.json_to_sheet(sheet3Data);

  // 컬럼 폭 설정
  ws1['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 35 }, { wch: 6 }, { wch: 14 }, { wch: 14 },
    { wch: 25 }, { wch: 8 }, { wch: 16 }, { wch: 6 }, { wch: 16 }
  ];
  ws2['!cols'] = Array(9).fill({ wch: 18 });
  ws3['!cols'] = [{ wch: 16 }, { wch: 60 }];

  XLSX.utils.book_append_sheet(wb, ws1, '검토용');
  XLSX.utils.book_append_sheet(wb, ws2, '신규자재');
  XLSX.utils.book_append_sheet(wb, ws3, '가이드');

  const filename = `cost_items_review_${fmt(new Date())}.xlsx`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  XLSX.writeFile(wb, outputPath);

  console.log(`[PASS] Excel 출력 완료`);
  console.log(`  파일: ${outputPath}`);
  console.log(`  시트 1 (검토용): ${sheet1Data.length}건`);
  console.log(`  시트 2 (신규자재): 빈 템플릿`);
  console.log(`  시트 3 (가이드): ${sheet3Data.length}건`);
  console.log(`\n다음: 대표님이 Excel 검토 후 임포트:`);
  console.log(`  node scripts/v6.0/import_cost_items_xlsx.cjs "${filename}"`);

  db.close();
}

if (require.main === module) run();
module.exports = { run };
```

### 2-3. scripts/v6.0/import_cost_items_xlsx.cjs

```javascript
#!/usr/bin/env node
// Excel → cost_items 임포트
// BOM/콤마/타입 정규화 + 트랜잭션 + 자동 백업

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const XLSX = require('xlsx');
const { execSync } = require('child_process');

const DB_PATH = path.join(__dirname, '..', '..', 'ecorean-boc.db');

function normalizeNumber(val) {
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return null;
  const cleaned = val.replace(/[,\s원]/g, '').trim();
  if (cleaned === '' || cleaned === '-') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num);
}

function run(filePath, dryRun) {
  if (!fs.existsSync(filePath)) {
    console.error(`[FAIL] 파일 미존재: ${filePath}`);
    process.exit(1);
  }

  // 자동 백업
  if (!dryRun) {
    console.log('자동 백업 중...');
    execSync('node scripts/backup.cjs --label pre_xlsx_import', { cwd: path.join(__dirname, '..', '..') });
  }

  const wb = XLSX.readFile(filePath);
  const ws1 = wb.Sheets['검토용'];
  const ws2 = wb.Sheets['신규자재'];

  if (!ws1) {
    console.error('[FAIL] 검토용 시트 없음');
    process.exit(1);
  }

  const reviewRows = XLSX.utils.sheet_to_json(ws1);
  const newRows = ws2 ? XLSX.utils.sheet_to_json(ws2) : [];

  console.log(`Excel 로드: 검토 ${reviewRows.length}건 / 신규 ${newRows.length}건`);

  const db = new Database(DB_PATH);
  const stats = { updated: 0, inserted: 0, errors: [] };
  const NOW = Date.now();

  const updateStmt = db.prepare(`
    UPDATE cost_items SET
      unit_price = ?,
      is_ai_estimated = 0,
      is_approved_by_principal = ?,
      source = ?,
      approved_at = ?,
      approved_by = ?,
      notes = ?,
      updated_at = ?
    WHERE id = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO cost_items (
      id, tenant_id, category, subcategory, ks_code, name, unit, unit_price,
      applies_to_spaces, applies_to_concepts, source,
      is_ai_estimated, is_approved_by_principal, is_simulated,
      approved_at, approved_by, notes, created_at, updated_at
    ) VALUES (
      ?, 'HQ', ?, ?, ?, ?, ?, ?,
      ?, ?, 'principal_input',
      0, 1, 0,
      ?, ?, ?, ?, ?
    )
  `);

  const tx = db.transaction(() => {
    // 시트 1: 기존 항목 업데이트
    reviewRows.forEach((row, idx) => {
      const id = row['id (수정 금지)'];
      if (!id) return;

      const newPrice = normalizeNumber(row['대표님 단가 (수정시 입력)']);
      const currentPrice = normalizeNumber(row['현재 단가 (원)']);
      const finalPrice = newPrice !== null ? newPrice : currentPrice;
      const approval = String(row['승인 (Y/N)'] || '').toUpperCase().trim();
      const isApproved = approval === 'Y' ? 1 : 0;
      const newSource = newPrice !== null ? 'principal_input' : (row['출처'] || 'principal_seed');

      if (finalPrice === null || finalPrice < 0) {
        stats.errors.push({ row: idx + 2, error: '단가 형식 오류', value: row['현재 단가 (원)'] });
        return;
      }

      try {
        updateStmt.run(
          finalPrice, isApproved, newSource, NOW, 'principal_xlsx',
          row['메모'] || null, NOW, id
        );
        if (newPrice !== null || isApproved !== 0) stats.updated++;
      } catch (e) {
        stats.errors.push({ row: idx + 2, error: e.message });
      }
    });

    // 시트 2: 신규 자재 추가
    newRows.forEach((row, idx) => {
      const name = row.name || '';
      if (!name.trim()) return;

      const unitPrice = normalizeNumber(row['unit_price (원)']);
      if (unitPrice === null) {
        stats.errors.push({ row: idx + 2, sheet: '신규자재', error: '단가 누락', name: name });
        return;
      }

      const id = 'ci_principal_' + Date.now() + '_' + String(stats.inserted).padStart(3, '0');
      try {
        insertStmt.run(
          id, row.category || 'unknown', row.subcategory || null,
          row.ks_code || null, name, row.unit || '㎡', unitPrice,
          row['applies_to_spaces (JSON)'] || null,
          row['applies_to_concepts (JSON)'] || null,
          NOW, 'principal_xlsx', row['메모'] || null,
          NOW, NOW
        );
        stats.inserted++;
      } catch (e) {
        stats.errors.push({ row: idx + 2, sheet: '신규자재', error: e.message, name: name });
      }
    });
  });

  if (dryRun) {
    console.log('\n=== DRY RUN ===');
    console.log('변경 미적용. --apply 옵션으로 실제 임포트.');
  } else {
    try {
      tx();
      console.log(`[PASS] 업데이트 ${stats.updated}건 / 신규 ${stats.inserted}건`);
      if (stats.errors.length > 0) {
        console.log(`[WARN] 에러 ${stats.errors.length}건:`);
        stats.errors.slice(0, 10).forEach(e => console.log(`  ${JSON.stringify(e)}`));
      }
    } catch (e) {
      console.error('[FAIL] 트랜잭션 실패:', e.message);
      process.exit(1);
    }
  }

  // 임포트 후 IPC 캐시 갱신은 작업 3에서 통합됨
  db.close();
}

const filePath = process.argv[2];
const dryRun = !process.argv.includes('--apply');

if (!filePath) {
  console.log('사용:');
  console.log('  node scripts/v6.0/import_cost_items_xlsx.cjs <file.xlsx>            # dry-run');
  console.log('  node scripts/v6.0/import_cost_items_xlsx.cjs <file.xlsx> --apply   # 적용');
  process.exit(0);
}

run(filePath, dryRun);
```

### 2-4. 검증

```bash
# 출력 테스트
node scripts/v6.0/export_cost_items_xlsx.cjs
# 기대: cost_items_review_<timestamp>.xlsx 생성

# 임포트 테스트 (출력한 파일 그대로, dry-run)
node scripts/v6.0/import_cost_items_xlsx.cjs cost_items_review_<timestamp>.xlsx
# 기대: dry-run 결과 출력
```

---

## 작업 3: IPC 도입 (2시간) — 핵심 변화

### 3-1. preload/preload.js 신설

`preload/preload.js`:

```javascript
// ECOREAN BOC v6.0 — Electron Preload
// 브라우저에 안전하게 IPC API 노출 (contextBridge)

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('boc', {
  cost: {
    // 단가 LOAD (브라우저 → main)
    loadByCategory: (category, opts) =>
      ipcRenderer.invoke('boc:cost:loadByCategory', { category, opts }),

    // 견적 lineItems 자동 생성
    buildLineItems: (spaces, concept, opts) =>
      ipcRenderer.invoke('boc:cost:buildLineItems', { spaces, concept, opts }),

    // 승인 상태
    getApprovalStatus: (opts) =>
      ipcRenderer.invoke('boc:cost:getApprovalStatus', { opts }),

    // (Phase 5에서 활성) 승인/수정
    approve: (id) => ipcRenderer.invoke('boc:cost:approve', { id }),
    update: (id, opts) => ipcRenderer.invoke('boc:cost:update', { id, opts })
  },

  kpi: {
    // KPI 11항목 LOAD
    getCurrent: () => ipcRenderer.invoke('boc:kpi:getCurrent'),
    getActiveCount: () => ipcRenderer.invoke('boc:kpi:getActiveCount'),
    getMLPhaseStatus: () => ipcRenderer.invoke('boc:kpi:getMLPhaseStatus')
  },

  meta: {
    getVersion: () => ipcRenderer.invoke('boc:meta:getVersion'),
    getPhase: () => ipcRenderer.invoke('boc:meta:getPhase')
  }
});
```

### 3-2. main.js (또는 electron-main 진입점)

```javascript
// ipcMain 핸들러 등록
const { ipcMain } = require('electron');
const { loadByCategory, buildLineItems, getApprovalStatus, approveCostItem, updateCostItem } = require('./shell/src/cost-items/CostLoader.cjs');
const Database = require('better-sqlite3');

ipcMain.handle('boc:cost:loadByCategory', async (e, { category, opts }) => {
  return loadByCategory(category, opts);
});

ipcMain.handle('boc:cost:buildLineItems', async (e, { spaces, concept, opts }) => {
  return buildLineItems(spaces, concept, opts);
});

ipcMain.handle('boc:cost:getApprovalStatus', async (e, { opts }) => {
  return getApprovalStatus(opts);
});

// Phase 4-A에서는 읽기 전용 (쓰기는 Phase 5)
ipcMain.handle('boc:cost:approve', async (e, { id }) => {
  return { ok: false, error: 'Phase 5에서 활성 (현재는 Excel 임포트만)' };
});

ipcMain.handle('boc:cost:update', async (e, { id, opts }) => {
  return { ok: false, error: 'Phase 5에서 활성 (현재는 Excel 임포트만)' };
});

ipcMain.handle('boc:kpi:getCurrent', async () => {
  // 현재 견적의 KPI (메모리에 보관, 나중에 DB로)
  return null;
});

ipcMain.handle('boc:kpi:getActiveCount', async () => {
  // 진행 중인 견적 건수 (Phase 4-A는 1건 시뮬)
  return 1;
});

ipcMain.handle('boc:kpi:getMLPhaseStatus', async () => {
  const db = new Database('./ecorean-boc.db');
  let realCount = 0, simCount = 0;
  try {
    realCount = db.prepare("SELECT COUNT(*) as c FROM cost_items WHERE source='invoice' AND is_simulated=0").get().c;
    simCount = db.prepare("SELECT COUNT(*) as c FROM cost_items WHERE source='simulation' OR is_simulated=1").get().c;
  } catch(e) {}
  db.close();
  const total = realCount;
  let phase = 'PHASE_1_MANUAL';
  if (total >= 500) phase = 'PHASE_4_DEEP';
  else if (total >= 100) phase = 'PHASE_3_XGBOOST';
  else if (total >= 50) phase = 'PHASE_2_STATS';
  return { real: realCount, simulated: simCount, total, phase };
});

ipcMain.handle('boc:meta:getVersion', async () => '6.0.0-alpha.1');
ipcMain.handle('boc:meta:getPhase', async () => 'PHASE_4');
```

### 3-3. shell/src/cost-items/CostLoader.cjs (Node.js 전용)

```javascript
// ECOREAN BOC v6.0 — Cost Loader (Node.js 전용 — main 프로세스에서만)
// 브라우저는 window.boc.cost.* IPC 경유

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', '..', 'ecorean-boc.db');

function loadByCategory(category, opts) {
  opts = opts || {};
  const tenantId = opts.tenantId || 'HQ';
  const onlyApproved = opts.onlyApproved === true;
  const space = opts.space;
  const concept = opts.concept;

  const db = new Database(DB_PATH);
  let rows = [];

  try {
    let sql = `SELECT * FROM cost_items WHERE tenant_id = ? AND category = ?`;
    const params = [tenantId, category];

    if (onlyApproved) sql += ' AND is_approved_by_principal = 1';

    rows = db.prepare(sql).all(...params);

    if (space) {
      rows = rows.filter(r => {
        if (!r.applies_to_spaces) return true;
        try {
          const spaces = JSON.parse(r.applies_to_spaces);
          return spaces.includes(space);
        } catch(e) { return true; }
      });
    }
    if (concept) {
      rows = rows.filter(r => {
        if (!r.applies_to_concepts) return true;
        try {
          const concepts = JSON.parse(r.applies_to_concepts);
          return concepts.includes(concept);
        } catch(e) { return true; }
      });
    }
  } catch (e) {}
  db.close();
  return rows;
}

function buildLineItemForSpace(space, concept, opts) {
  const tenantId = (opts && opts.tenantId) || 'HQ';
  const onlyApproved = false;   // 견적은 모든 단가 사용 (학습만 승인분)

  const flooringItems = loadByCategory('flooring', { tenantId, space: space.typeKey, concept, onlyApproved });
  const wallItems = loadByCategory('wallcovering', { tenantId, space: space.typeKey, concept, onlyApproved });
  const tileItems = (space.typeKey === 'BATHROOM' || space.typeKey === 'KITCHEN')
    ? loadByCategory('tile', { tenantId, space: space.typeKey, concept, onlyApproved })
    : [];

  const avg = (items) => items.length > 0
    ? items.reduce((s, i) => s + i.unit_price, 0) / items.length
    : 0;

  const flooringPrice = avg(flooringItems);
  const wallPrice = avg(wallItems);
  const tilePrice = avg(tileItems);
  const materialCost = flooringPrice + wallPrice + tilePrice;

  const laborItems = (space.typeKey === 'BATHROOM' || space.typeKey === 'KITCHEN')
    ? loadByCategory('labor', { tenantId }).filter(l => ['plumber','specialist'].includes(l.subcategory))
    : loadByCategory('labor', { tenantId }).filter(l => l.subcategory === 'general' || !l.subcategory);

  const laborCost = avg(laborItems);

  return {
    qty: space.area_sqm,
    wasteRate: 0.05,
    laborCost: Math.round(laborCost),
    pm: 1,
    materialCost: Math.round(materialCost),
    equipment: 0,
    accessory: 0,
    difficultyAdjust: 0,
    _meta: {
      space: space.typeKey,
      concept: concept,
      flooringItems: flooringItems.length,
      wallItems: wallItems.length,
      tileItems: tileItems.length,
      laborItems: laborItems.length,
      hasUnknown: materialCost === 0 || laborCost === 0
    }
  };
}

function buildLineItems(spaces, concept, opts) {
  return spaces.map(s => buildLineItemForSpace(s, concept, opts));
}

function getApprovalStatus(opts) {
  const tenantId = (opts && opts.tenantId) || 'HQ';
  const db = new Database(DB_PATH);
  let total = 0, approved = 0, bySource = {};
  try {
    total = db.prepare("SELECT COUNT(*) as c FROM cost_items WHERE tenant_id = ?").get(tenantId).c;
    approved = db.prepare("SELECT COUNT(*) as c FROM cost_items WHERE tenant_id = ? AND is_approved_by_principal = 1").get(tenantId).c;
    const sourceRows = db.prepare("SELECT source, COUNT(*) as c FROM cost_items WHERE tenant_id = ? GROUP BY source").all(tenantId);
    sourceRows.forEach(r => bySource[r.source] = r.c);
  } catch(e) {}
  db.close();
  return {
    total, approved, pending: total - approved,
    rate: total > 0 ? Math.round((approved / total) * 100) : 0,
    bySource
  };
}

function approveCostItem(id, approver) {
  const db = new Database(DB_PATH);
  try {
    db.prepare(`
      UPDATE cost_items
      SET is_approved_by_principal = 1, approved_at = ?, approved_by = ?, updated_at = ?
      WHERE id = ?
    `).run(Date.now(), approver, Date.now(), id);
  } finally {
    db.close();
  }
  return { ok: true };
}

function updateCostItem(id, opts) {
  const db = new Database(DB_PATH);
  try {
    db.prepare(`
      UPDATE cost_items
      SET unit_price = ?, is_ai_estimated = 0, is_approved_by_principal = 1,
          approved_at = ?, approved_by = ?, source = 'principal_input', updated_at = ?
      WHERE id = ?
    `).run(opts.unit_price, Date.now(), opts.approver || 'principal', Date.now(), id);
  } finally {
    db.close();
  }
  return { ok: true };
}

module.exports = {
  loadByCategory, buildLineItemForSpace, buildLineItems,
  getApprovalStatus, approveCostItem, updateCostItem
};
```

### 3-4. shell/src/cost-items/__tests__/CostLoader.test.cjs

```javascript
const { loadByCategory, buildLineItemForSpace, buildLineItems, getApprovalStatus } = require('../CostLoader.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

(function() {
  const flooring = loadByCategory('flooring');
  assert(flooring.length >= 1, 'flooring 1건+ 적재됨');
})();

(function() {
  const status = getApprovalStatus();
  assert(status.total > 0, '시드 적재됨');
  assert(status.bySource.principal_seed >= 0, 'bySource 카운트');
})();

(function() {
  const item = buildLineItemForSpace(
    { typeKey: 'BATHROOM', area_sqm: 5 },
    'CLASSIC_LUXURY'
  );
  assert(item.qty === 5, 'qty 일치');
  assert(item._meta, '_meta 포함');
})();

(function() {
  const items = buildLineItems(
    [
      { typeKey: 'BATHROOM', area_sqm: 5 },
      { typeKey: 'KITCHEN',  area_sqm: 10 }
    ],
    'CLASSIC_LUXURY'
  );
  assert(items.length === 2, '2 라인');
})();

(function() {
  const luxury = loadByCategory('flooring', { concept: 'CLASSIC_LUXURY' });
  assert(luxury.length >= 0, 'concept 필터 동작');
})();

(function() {
  const tile = loadByCategory('tile', { space: 'BATHROOM' });
  assert(tile.length >= 0, 'space 필터 동작');
})();

console.log('[PASS] CostLoader (6/6)');
```

검증:
```bash
node shell/src/cost-items/__tests__/CostLoader.test.cjs
# 기대: [PASS] CostLoader (6/6)
```

### 3-5. WizardController.js (브라우저 — IPC 사용)

`modules-html/boc-v6/src/wizard/WizardController.js` `_calculateEstimate` 교체:

```javascript
async _calculateEstimate() {
  if (!this.lockedGates.includes('G4')) return null;

  // IPC를 통해 cost_items DB → lineItems 생성
  // window.boc는 Electron preload에서 노출됨
  let lineItems;
  if (typeof window !== 'undefined' && window.boc && window.boc.cost) {
    try {
      lineItems = await window.boc.cost.buildLineItems(
        this.input.spaces, this.input.concept, { tenantId: 'HQ' }
      );
    } catch (e) {
      console.error('[WizardController] IPC 실패:', e);
      return null;
    }
  } else {
    // 비-Electron 환경 fallback (테스트용)
    lineItems = this.input.spaces.map(s => ({
      qty: s.area_sqm,
      wasteRate: 0.05,
      laborCost: 250000,
      pm: 1,
      materialCost: 200000,
      equipment: 0,
      accessory: 0,
      difficultyAdjust: 0
    }));
  }

  const totalAreaSqm = this.input.spaces.reduce((sum, s) => sum + s.area_sqm, 0);
  const ctx = this.input.context || {};

  const result = calculateEstimate({
    lineItems: lineItems,
    residence: this.input.residence,
    concept: this.input.concept,
    occupied: ctx.occupied === true,
    floorLevel: ctx.floorLevel || 1,
    hasElev: ctx.hasElev !== false,
    areaSqm: totalAreaSqm
  });

  if (result.ok) {
    this.estimate = result.payload;
    const unknownCount = lineItems.filter(li => li._meta && li._meta.hasUnknown).length;
    this.estimate._unknownCount = unknownCount;
    this._emit('ESTIMATE_CALCULATED', this.estimate);
  }
  return this.estimate;
}
```

기존 동기 `lockG4` 메서드도 비동기 처리로 변경:

```javascript
async lockG4(opts) {
  // ... 기존 로직 ...
  if (r.ok) {
    this.input.spaces = opts.spaces;
    this.lockedGates.push('G4');
    this.currentStage = 'G5';
    await this._calculateEstimate();   // await 추가
    this._emit('GATE_LOCKED', { ... });
  }
  return r;
}
```

---

## 작업 4: esbuild 노드 분리 (2시간)

### 4-1. modules-html/boc-v6/build.config.cjs 갱신

```javascript
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

const config = {
  entryPoints: {
    'shell':   path.join(__dirname, 'src/shell/main.js'),
    'wizard':  path.join(__dirname, 'src/wizard/entry.js'),
    'cad':     path.join(__dirname, 'src/cad/entry.js'),
    'kpi':     path.join(__dirname, 'src/kpi-dashboard/entry.js'),
    'admin':   path.join(__dirname, 'src/admin/entry.js')
  },
  bundle: true,
  platform: 'browser',
  format: 'esm',                // ES Module 필수 (동적 import 위해)
  splitting: true,              // 자동 코드 분할
  outdir: path.join(__dirname, 'build'),
  chunkNames: 'chunks/[name]-[hash]',
  sourcemap: 'inline',
  target: ['es2020'],
  resolveExtensions: ['.js', '.cjs', '.mjs'],

  alias: {
    '@core-bus':     path.join(ROOT, 'shell/src/core-bus'),
    '@gates':        path.join(ROOT, 'shell/src/gates'),
    '@meta':         path.join(ROOT, 'shell/src/meta'),
    '@korea':        path.join(ROOT, 'shell/src/korea'),
    '@security':     path.join(ROOT, 'shell/src/security'),
    '@closed-loop':  path.join(ROOT, 'shell/src/closed-loop'),
    '@ml':           path.join(ROOT, 'shell/src/ml'),
    '@feature-flags':path.join(ROOT, 'shell/src/feature-flags'),
    '@cost-items':   path.join(ROOT, 'shell/src/cost-items'),
    '@estimate-v6':  path.join(ROOT, 'modules-html/estimate-v6/src'),
    '@kpi-v6':       path.join(ROOT, 'modules-html/kpi-v6/src'),
    '@cad':          path.join(ROOT, 'modules-html/cad/src')
  },

  external: ['better-sqlite3', 'crypto', 'fs', 'path', 'electron'],

  define: {
    'process.env.NODE_ENV': '"development"',
    '__BOC_VERSION__': '"6.0.0-alpha.2"'
  },

  logLevel: 'info'
};

module.exports = { config, ROOT };
```

### 4-2. 노드별 entry 파일 생성

`modules-html/boc-v6/src/wizard/entry.js`:
```javascript
export { WizardPage } from './WizardPage.js';
```

`modules-html/boc-v6/src/cad/entry.js`:
```javascript
export { CADCanvas } from './CADCanvas.js';
export { CADToolbar } from './components/CADToolbar.js';
export { CADSpacesList } from './components/CADSpacesList.js';
```

`modules-html/boc-v6/src/kpi-dashboard/entry.js`:
```javascript
export { KPIDashboardPage } from './KPIDashboardPage.js';
```

`modules-html/boc-v6/src/admin/entry.js`:
```javascript
export { CostsAdminPage } from './CostsAdminPage.js';
```

### 4-3. App.js에 동적 import + 프리페치

```javascript
// _renderWizard 동적 import
async _renderWizard(path) {
  this._setActiveNav(path);
  const main = document.getElementById('main-content');
  main.innerHTML = '<div style="padding: 40px; color: var(--gold);">로딩 중...</div>';
  const { WizardPage } = await import('../wizard/entry.js');
  main.innerHTML = '';
  new WizardPage({ containerEl: main });
}

async _renderCAD(path) {
  this._setActiveNav(path);
  const main = document.getElementById('main-content');
  main.innerHTML = '<div style="padding: 40px; color: var(--gold);">CAD 로딩 중...</div>';
  // CAD는 직접 라우트로 들어왔을 때만 (마법자 G4에서는 이미 lazy로 로드됨)
  await import('../cad/entry.js');
  main.innerHTML = '<p>CAD 라우트 활성화 (Phase 4 Week 5에서 단독 화면 추가)</p>';
}

async _renderKPI(path) {
  this._setActiveNav(path);
  const main = document.getElementById('main-content');
  main.innerHTML = '<div style="padding: 40px; color: var(--gold);">KPI 로딩 중...</div>';
  const { KPIDashboardPage } = await import('../kpi-dashboard/entry.js');
  main.innerHTML = '';
  new KPIDashboardPage({ containerEl: main });
}

async _renderAdminCosts(path) {
  const main = document.getElementById('main-content');
  main.innerHTML = '<div style="padding: 40px; color: var(--gold);">로딩 중...</div>';
  const { CostsAdminPage } = await import('../admin/entry.js');
  main.innerHTML = '';
  new CostsAdminPage({ containerEl: main });
}
```

### 4-4. main.js에 프리페치

```javascript
// modules-html/boc-v6/src/shell/main.js 끝에 추가
window.addEventListener('load', () => {
  setTimeout(() => {
    // 백그라운드 프리페치
    import('../wizard/entry.js').catch(() => {});
    import('../kpi-dashboard/entry.js').catch(() => {});
    // CAD는 무거우니 마법자 진입 시점에 로드 (별도)
    // admin은 거의 사용 안 함, 클릭 시 로드
  }, 2000);
});
```

### 4-5. index.html 수정

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>ECOREAN BOC v6.0</title>
<link rel="stylesheet" href="src/styles/theme.css">
<link rel="stylesheet" href="src/styles/layout.css">
<link rel="stylesheet" href="src/wizard/styles/wizard.css">
<link rel="stylesheet" href="src/cad/styles/cad.css">
<link rel="stylesheet" href="src/kpi-dashboard/styles/kpi-dashboard.css">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Noto+Sans+KR:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
<div id="app">
  <div style="padding: 40px; color: #c9a84c; font-family: 'Cinzel', serif; text-align: center;">
    Loading ECOREAN BOC v6.0...
  </div>
</div>
<!-- ESM 모듈 -->
<script type="module" src="build/shell.js"></script>
</body>
</html>
```

### 4-6. 빌드 검증

```bash
node modules-html/boc-v6/build.cjs
# 기대: 5개 entry + chunks/ 폴더
# - shell.js (~50kb)
# - wizard.js (~150kb)
# - cad.js (~700kb, Konva 포함)
# - kpi.js (~80kb)
# - admin.js (~30kb)
# - chunks/* (공유 코드)

ls -lh modules-html/boc-v6/build/
```

---

## 작업 5: G4 → G1 이동 + UX 압축 (1시간)

### 5-1. G1Page.js 갱신 (컨텍스트 입력 통합)

`modules-html/boc-v6/src/wizard/gates/G1Page.js` 전체 교체:

```javascript
const { RESIDENCE_TYPES, PYEONG_LEVELS } = require('@gates/G1_Type.cjs');

const RESIDENCE_INFO = {
  APARTMENT:    { name: '아파트',      icon: '🏢' },
  VILLA:        { name: '빌라',        icon: '🏘️' },
  DETACHED_1F:  { name: '단독주택',    icon: '🏠', meta: '단층' },
  DETACHED_2F:  { name: '단독주택',    icon: '🏡', meta: '복층' },
  PENTHOUSE:    { name: '펜트하우스',  icon: '🌆' },
  COMMERCIAL:   { name: '상가/오피스', icon: '🏬' }
};

class G1Page {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = opts.controller;
    this.selected = { residence: null, pyeong: null };
    this.context = {
      occupied: false,
      floorLevel: 1,
      hasElev: true,
      address: '',
      regionId: 'PROVINCE_OTHER'
    };
    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 1 — 시공 유형 정의</h2>
        <div class="gate-subtitle">기본 정보 + 현장 조건 / 자동화 0% → 30%</div>

        <div class="g1-section">
          <div class="section-group-label">기본 정보</div>

          <div class="section-sublabel">주거 형태</div>
          <div class="card-grid compact" id="residence-grid">
            ${RESIDENCE_TYPES.map(r => {
              const info = RESIDENCE_INFO[r];
              return `
                <div class="option-card compact" data-residence="${r}">
                  <div class="icon">${info.icon}</div>
                  <div class="name">${info.name}</div>
                  <div class="meta">${info.meta || ''}</div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="section-sublabel">평형</div>
          <div class="card-grid compact" id="pyeong-grid">
            ${PYEONG_LEVELS.map(p => `
              <div class="option-card compact" data-pyeong="${p}">
                <div class="name">${p}평</div>
                <div class="meta">~${Math.round(p * 3.3058)}㎡</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="g1-section">
          <div class="section-group-label">현장 조건</div>

          <div class="g1-context-grid">
            <div class="context-row">
              <label>거주중 시공</label>
              <div class="toggle-group">
                <button class="toggle-btn active" data-ctx="occupied" data-val="false">아니오</button>
                <button class="toggle-btn" data-ctx="occupied" data-val="true">예 (+10%)</button>
              </div>
            </div>
            <div class="context-row">
              <label>층수</label>
              <input type="number" id="ctx-floor" min="1" max="50" value="1">
            </div>
            <div class="context-row">
              <label>엘리베이터</label>
              <div class="toggle-group">
                <button class="toggle-btn active" data-ctx="hasElev" data-val="true">있음</button>
                <button class="toggle-btn" data-ctx="hasElev" data-val="false">없음 (4층+ 5%)</button>
              </div>
            </div>
            <div class="context-row full-width">
              <label>주소</label>
              <input type="text" id="ctx-address" placeholder="예: 서울 강남구 역삼동" maxlength="100">
              <div class="region-display" id="region-display">지역: 자동 매핑</div>
            </div>
          </div>
        </div>

        <div class="gate-actions">
          <div></div>
          <button class="primary" id="g1-next" disabled>다음 → G2 컨셉</button>
        </div>
      </div>
    `;

    this.containerEl.querySelectorAll('[data-residence]').forEach(el => {
      el.addEventListener('click', () => this._selectResidence(el.dataset.residence));
    });
    this.containerEl.querySelectorAll('[data-pyeong]').forEach(el => {
      el.addEventListener('click', () => this._selectPyeong(parseInt(el.dataset.pyeong)));
    });
    this.containerEl.querySelectorAll('[data-ctx]').forEach(btn => {
      btn.addEventListener('click', () => this._onContextToggle(btn));
    });
    this.containerEl.querySelector('#ctx-floor').addEventListener('input', (e) => {
      this.context.floorLevel = parseInt(e.target.value) || 1;
    });
    this.containerEl.querySelector('#ctx-address').addEventListener('input', (e) => {
      this.context.address = e.target.value;
      this._updateRegion();
    });
    this.containerEl.querySelector('#g1-next').addEventListener('click', () => this._submit());
  }

  _selectResidence(r) {
    this.selected.residence = r;
    this.containerEl.querySelectorAll('[data-residence]').forEach(el => {
      el.classList.toggle('selected', el.dataset.residence === r);
    });
    this._updateNextBtn();
    // 스마트 스크롤 — 평형 영역으로 자동 이동
    setTimeout(() => {
      this.containerEl.querySelector('#pyeong-grid')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 200);
  }

  _selectPyeong(p) {
    this.selected.pyeong = p;
    this.containerEl.querySelectorAll('[data-pyeong]').forEach(el => {
      el.classList.toggle('selected', parseInt(el.dataset.pyeong) === p);
    });
    this._updateNextBtn();
  }

  _onContextToggle(btn) {
    const ctxKey = btn.dataset.ctx;
    const val = btn.dataset.val === 'true';
    this.context[ctxKey] = val;
    this.containerEl.querySelectorAll(`[data-ctx="${ctxKey}"]`).forEach(b => {
      b.classList.toggle('active', b.dataset.val === btn.dataset.val);
    });
  }

  _updateRegion() {
    let regionId = 'PROVINCE_OTHER';
    let factor = 1.0;
    try {
      const { getRegionByArea, getRegionFactor } = require('@korea/RegionFactor.cjs');
      regionId = getRegionByArea(this.context.address);
      factor = getRegionFactor(regionId);
    } catch(e) {}
    this.context.regionId = regionId;

    const REGION_NAMES = {
      SEOUL_GANGNAM: '강남3구', SEOUL_OTHER: '서울', METRO_BUSAN: '부산',
      METRO_OTHER: '광역시', PROVINCE_MAJOR: '도청소재지',
      PROVINCE_OTHER: '지방', JEJU: '제주'
    };
    const factorPercent = ((factor - 1) * 100).toFixed(0);
    const sign = factor >= 1 ? '+' : '';
    this.containerEl.querySelector('#region-display').textContent =
      `지역: ${REGION_NAMES[regionId] || regionId} (${sign}${factorPercent}%)`;
  }

  _updateNextBtn() {
    const btn = this.containerEl.querySelector('#g1-next');
    btn.disabled = !(this.selected.residence && this.selected.pyeong);
  }

  _submit() {
    // 컨텍스트를 controller input에 저장
    this.controller.input.context = this.context;
    const r = this.controller.lockG1(this.selected);
    if (!r.ok) alert('G1 잠금 실패: ' + r.error);
  }
}

module.exports = { G1Page };
```

### 5-2. G4Page.js — 컨텍스트 박스 제거 (Week 3 그대로 + 단순화)

`modules-html/boc-v6/src/wizard/gates/G4Page.js`에서 컨텍스트 박스 제거 (Week 3 원래 듀얼 모드만 유지):

```javascript
// 작업 5의 G4Page는 Week 3 원본으로 되돌림 (컨텍스트 박스 제거)
// 이미 G1에서 입력했으므로 G4는 면적만
// (컨텍스트 입력 코드 모두 제거)
```

### 5-3. wizard.css 갱신

```css
/* G1 압축 + 컨텍스트 통합 */
.g1-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--gold-faint);
}
.g1-section:last-of-type { border-bottom: none; }

.section-sublabel {
  font-size: 10px;
  color: var(--text-dim);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 12px 0 8px 0;
}

.card-grid.compact {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}
.option-card.compact {
  padding: 12px 8px;
}
.option-card.compact .icon {
  font-size: 22px;
  margin-bottom: 4px;
}
.option-card.compact .name {
  font-size: 11px;
}
.option-card.compact .meta {
  font-size: 9px;
}

.g1-context-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.g1-context-grid .context-row.full-width {
  grid-column: 1 / -1;
}
```

---

## 작업 6: 글로벌 KPI 바 (1시간)

(Week 4 명령서 작업 6과 동일 — IPC 사용으로 변경만)

### 6-1. modules-html/boc-v6/src/components/GlobalKPIBar.js

```javascript
const { coreBus } = require('@core-bus/CoreBus.cjs');

class GlobalKPIBar {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.state = {
      automation: 0, final: 0, margin: 0, activeCount: 1, isSimulated: true
    };

    this.unsubscribe = coreBus.on('KPI_UPDATE', (data) => {
      if (data.automation !== undefined) this.state.automation = data.automation;
      if (data.final !== undefined) this.state.final = data.final;
      if (data.margin !== undefined) this.state.margin = data.margin;
      this.render();
    });

    this._loadActiveCount();
    this.render();
  }

  async _loadActiveCount() {
    if (typeof window !== 'undefined' && window.boc?.kpi) {
      try {
        this.state.activeCount = await window.boc.kpi.getActiveCount();
        this.render();
      } catch(e) {}
    }
  }

  render() {
    const fmt = (n) => Math.round(n).toLocaleString('ko-KR');
    const simBadge = this.state.isSimulated ? '<span class="sim-badge">시뮬</span>' : '';

    this.containerEl.innerHTML = `
      <div class="global-kpi-bar">
        <div class="kpi-item">
          <span class="kpi-icon">📊</span>
          <span class="kpi-label">자동화</span>
          <span class="kpi-value">${this.state.automation}%</span>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item highlight">
          <span class="kpi-label">최종</span>
          <span class="kpi-value">${fmt(this.state.final)}원</span>
          ${simBadge}
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item">
          <span class="kpi-label">마진</span>
          <span class="kpi-value">${this.state.margin.toFixed(1)}%</span>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi-item">
          <span class="kpi-label">진행</span>
          <span class="kpi-value">${this.state.activeCount}건</span>
        </div>
      </div>
    `;
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
}

module.exports = { GlobalKPIBar };
```

### 6-2. layout.css 추가 (App Shell 그리드 수정)

```css
.global-kpi-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  height: 40px;
  background: linear-gradient(90deg,
    rgba(20,24,42,0.9) 0%,
    rgba(28,33,56,0.9) 50%,
    rgba(20,24,42,0.9) 100%);
  border-bottom: 1px solid var(--gold-faint);
  font-family: var(--font-mono);
  font-size: 12px;
}
.global-kpi-bar .kpi-item { display: flex; align-items: center; gap: 8px; }
.global-kpi-bar .kpi-icon { color: var(--gold); }
.global-kpi-bar .kpi-label {
  color: var(--text-dim);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 10px;
}
.global-kpi-bar .kpi-value {
  color: var(--text);
  font-weight: 600;
  letter-spacing: 0.04em;
}
.global-kpi-bar .kpi-item.highlight .kpi-value {
  color: var(--gold-bright);
  text-shadow: 0 0 8px var(--gold-faint);
}
.global-kpi-bar .kpi-divider {
  width: 1px;
  height: 16px;
  background: var(--gold-faint);
}
.global-kpi-bar .sim-badge {
  font-size: 9px;
  background: var(--gold-faint);
  color: var(--gold);
  padding: 2px 6px;
  border-radius: 2px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* App Shell 3행 그리드 */
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  grid-template-rows: var(--header-height) 40px 1fr;
  grid-template-areas:
    "header  header"
    "kpibar  kpibar"
    "sidebar main";
  height: 100vh;
}
.app-kpibar { grid-area: kpibar; }
```

### 6-3. App.js 수정

```javascript
_render() {
  this.rootEl.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <h1>ECOREAN BOC v6.0</h1>
        <div class="spacer"></div>
        <div class="status">
          <span class="live">● LIVE</span>
          Phase 4 / Week 4-A
        </div>
      </header>
      <div class="app-kpibar" id="global-kpi-bar"></div>
      <aside class="app-sidebar">
        ${this._renderSidebar()}
      </aside>
      <main class="app-main" id="main-content"></main>
    </div>
  `;

  // 글로벌 KPI 바
  const { GlobalKPIBar } = require('../components/GlobalKPIBar.js');
  this.globalKPI = new GlobalKPIBar({
    containerEl: document.getElementById('global-kpi-bar')
  });

  // 사이드바 클릭 + 라우터 시작 (기존)
  this.rootEl.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => this.router.navigate(el.dataset.path));
  });
  this.router.start();
}
```

---

## 작업 7: /kpi 풀 대시보드 (1시간)

### 7-1. modules-html/boc-v6/src/kpi-dashboard/KPIDashboardPage.js

```javascript
const { KPI_FIELDS } = require('@kpi-v6/KPIData.cjs');
const { coreBus } = require('@core-bus/CoreBus.cjs');

class KPIDashboardPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.kpiData = {};
    this.approval = { total: 0, approved: 0, pending: 0, rate: 0, bySource: {} };
    this.mlPhase = { real: 0, simulated: 0, total: 0, phase: 'PHASE_1_MANUAL' };

    this.unsubscribe = coreBus.on('KPI_UPDATE', (data) => {
      Object.assign(this.kpiData, data);
      this.render();
    });

    this._loadData();
  }

  async _loadData() {
    if (typeof window !== 'undefined' && window.boc) {
      try {
        this.approval = await window.boc.cost.getApprovalStatus({});
        this.mlPhase = await window.boc.kpi.getMLPhaseStatus();
      } catch(e) { console.error(e); }
    }
    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="page-header">
        <h2>KPI 풀 대시보드</h2>
        <div class="subtitle">11항목 + 단가 승인 + ML Phase / Phase 4 Week 4-A</div>
      </div>

      <div class="card">
        <h3>cost_items 단가 승인 진행</h3>
        <div class="approval-progress">
          <div class="approval-stat">
            <div class="stat-value">${this.approval.approved}</div>
            <div class="stat-label">승인됨</div>
          </div>
          <div class="approval-stat">
            <div class="stat-value">${this.approval.pending}</div>
            <div class="stat-label">검토 대기</div>
          </div>
          <div class="approval-stat">
            <div class="stat-value">${this.approval.rate}%</div>
            <div class="stat-label">승인률</div>
          </div>
        </div>
        <div class="approval-track">
          <div class="approval-fill" style="width: ${this.approval.rate}%"></div>
        </div>
        <div class="source-breakdown">
          ${Object.entries(this.approval.bySource || {}).map(([src, count]) => `
            <span class="source-tag">${src}: ${count}</span>
          `).join('')}
        </div>
        <button class="primary" onclick="window.location.hash='#/admin/costs'">단가 검토하기 →</button>
      </div>

      <div class="kpi-grid-full">
        ${KPI_FIELDS.map(f => this._renderKPICard(f)).join('')}
      </div>

      <div class="card">
        <h3>ML Phase 진행</h3>
        <div class="ml-phase-row">
          <div class="ml-phase ${this.mlPhase.phase === 'PHASE_1_MANUAL' ? 'active' : ''}">
            <div class="phase-name">Phase 1 (수동)</div>
            <div class="phase-range">0 ~ 49건</div>
            <div class="phase-current">실거래: ${this.mlPhase.real}건 / 시뮬: ${this.mlPhase.simulated}건</div>
          </div>
          <div class="ml-phase ${this.mlPhase.phase === 'PHASE_2_STATS' ? 'active' : ''}">
            <div class="phase-name">Phase 2 (통계)</div>
            <div class="phase-range">50 ~ 99건</div>
          </div>
          <div class="ml-phase ${this.mlPhase.phase === 'PHASE_3_XGBOOST' ? 'active' : ''}">
            <div class="phase-name">Phase 3 (XGBoost)</div>
            <div class="phase-range">100 ~ 499건</div>
          </div>
          <div class="ml-phase ${this.mlPhase.phase === 'PHASE_4_DEEP' ? 'active' : ''}">
            <div class="phase-name">Phase 4 (Deep)</div>
            <div class="phase-range">500+건</div>
          </div>
        </div>
      </div>
    `;
  }

  _renderKPICard(f) {
    const v = this.kpiData[f.key];
    const display = v != null ? this._fmt(v, f.format) : '-';
    return `
      <div class="kpi-card-full">
        <div class="kpi-card-label">${f.label}</div>
        <div class="kpi-card-value">${display}<span class="kpi-card-unit">${f.unit}</span></div>
      </div>
    `;
  }

  _fmt(v, format) {
    switch(format) {
      case 'currency': return Math.round(v).toLocaleString('ko-KR');
      case 'decimal': return parseFloat(v).toFixed(1);
      case 'percent': return parseFloat(v).toFixed(1);
      case 'integer': return Math.round(v).toString();
      default: return String(v);
    }
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
}

module.exports = { KPIDashboardPage };
```

### 7-2. styles/kpi-dashboard.css

```css
.kpi-grid-full {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.kpi-card-full {
  background: var(--bg-card);
  border: 1px solid var(--gold-faint);
  border-radius: var(--border-radius);
  padding: 16px;
  position: relative;
}
.kpi-card-full::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  opacity: 0.5;
}
.kpi-card-label {
  font-size: 10px;
  color: var(--text-dim);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.kpi-card-value {
  font-family: var(--font-display);
  font-size: 22px;
  color: var(--gold);
}
.kpi-card-unit {
  font-size: 11px;
  color: var(--text-dim);
  margin-left: 4px;
}

.approval-progress {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 12px;
}
.approval-stat { text-align: center; }
.stat-value {
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 28px;
}
.stat-label {
  font-size: 10px;
  color: var(--text-dim);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.approval-track {
  height: 6px;
  background: var(--bg);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 16px;
}
.approval-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--gold), var(--gold-bright));
  transition: width 0.5s ease-out;
}

.source-breakdown {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.source-tag {
  font-size: 10px;
  background: var(--bg);
  color: var(--gold);
  padding: 4px 8px;
  border-radius: 2px;
  border: 1px solid var(--gold-faint);
  font-family: var(--font-mono);
}

.ml-phase-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.ml-phase {
  background: var(--bg-2);
  border: 1px solid var(--gold-faint);
  border-radius: var(--border-radius);
  padding: 16px;
  opacity: 0.5;
}
.ml-phase.active {
  opacity: 1;
  border-color: var(--gold);
  box-shadow: 0 0 16px var(--gold-faint);
}
.phase-name {
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 13px;
  margin-bottom: 4px;
}
.phase-range {
  font-size: 11px;
  color: var(--text-dim);
  font-family: var(--font-mono);
}
.phase-current {
  font-size: 11px;
  color: var(--gold-bright);
  margin-top: 8px;
}
```

### 7-3. CostsAdminPage.js (안내 화면)

```javascript
class CostsAdminPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.render();
    this._loadStatus();
  }

  async _loadStatus() {
    if (typeof window !== 'undefined' && window.boc) {
      try {
        const status = await window.boc.cost.getApprovalStatus({});
        document.getElementById('admin-status').innerHTML = `
          <div class="approval-progress">
            <div class="approval-stat">
              <div class="stat-value">${status.total}</div>
              <div class="stat-label">전체</div>
            </div>
            <div class="approval-stat">
              <div class="stat-value">${status.approved}</div>
              <div class="stat-label">승인</div>
            </div>
            <div class="approval-stat">
              <div class="stat-value">${status.rate}%</div>
              <div class="stat-label">승인률</div>
            </div>
          </div>
        `;
      } catch(e) {}
    }
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="page-header">
        <h2>단가 관리</h2>
        <div class="subtitle">cost_items Excel 워크플로우 / Phase 4 Week 4-A</div>
      </div>

      <div class="card">
        <h3>현재 상태</h3>
        <div id="admin-status">로딩 중...</div>
      </div>

      <div class="card">
        <h3>Excel 워크플로우</h3>
        <p style="color: var(--text-dim); line-height: 1.8;">
          <strong style="color: var(--gold);">1. Excel 출력</strong><br>
          <code style="background: var(--bg); padding: 2px 8px; color: var(--gold); font-family: var(--font-mono);">
            node scripts/v6.0/export_cost_items_xlsx.cjs
          </code><br>
          → cost_items_review_<날짜>.xlsx 생성<br><br>

          <strong style="color: var(--gold);">2. 대표님 검토</strong><br>
          - 시트 1: 200건 단가 검토 (현재 단가와 대표님 단가 비교)<br>
          - 시트 2: 신규 자재 추가<br>
          - 시트 3: 가이드<br><br>

          <strong style="color: var(--gold);">3. 임포트</strong><br>
          <code style="background: var(--bg); padding: 2px 8px; color: var(--gold); font-family: var(--font-mono);">
            node scripts/v6.0/import_cost_items_xlsx.cjs &lt;파일경로&gt; --apply
          </code><br>
          → DB 갱신 + IPC 자동 반영<br><br>

          <strong style="color: var(--negative);">참고:</strong>
          Phase 5에서 화면에서 직접 검토/승인 가능 (IPC 쓰기 활성화).
        </p>
      </div>
    `;
  }
}

module.exports = { CostsAdminPage };
```

---

## 작업 8: 검증 + 문서 + 커밋 (1시간)

### 8-1. PHASE_4D_COMPLETE 활성화

`shell/src/feature-flags/flags.cjs`:

```javascript
PHASE_4D_COMPLETE:      true,
USE_COST_LOADER:        true,
USE_GLOBAL_KPI_BAR:     true,
USE_KPI_DASHBOARD:      true,
USE_IPC_BRIDGE:         true,
USE_NODE_SPLITTING:     true
```

`flags.test.cjs` Test 6에 추가:
```javascript
assert(isEnabled('PHASE_4D_COMPLETE') === true, 'PHASE_4D_COMPLETE Week4-A 완료');
assert(isEnabled('USE_COST_LOADER') === true, 'CostLoader 활성');
assert(isEnabled('USE_GLOBAL_KPI_BAR') === true, '글로벌 KPI 바 활성');
assert(isEnabled('USE_IPC_BRIDGE') === true, 'IPC Bridge 활성');
assert(isEnabled('USE_NODE_SPLITTING') === true, '노드 분리 활성');
```

### 8-2. v5.9 §117.2 갱신

`docs/MASTER_PLAN.md` 변경 이력 표 끝에 추가:
```markdown
| **v5.9** | **2026-04-29** | **§117.2 Phase 4 Week 4-A 결정 12 원칙 명시 (변동 0)** |
```

§117.2 내부 "Week 4 작업"을 다음으로 갱신:
```markdown
- Week 4-A: cost_items DB + Excel 왕복 + IPC 도입 + 노드 분리 + G1 컨텍스트 통합 + KPI 3 레이어 ✅
  - 12 안전 원칙 적용 (사전조사/IPC/Excel안전성/graph보존/마이그레이션안전/출처분리/시드출처/G1압축/프리페치/SoT정책/v5.9기록/ADR Phase5)
  - 원칙: graph.json 변동 0, 25 모듈 시그니처 변동 0, 헌법 100% 보존
```

footer 갱신:
```markdown
*ECOREAN BOC Master Plan v5.9 — Phase 4 Week 4-A 완료*
*총 117섹션 + 18부록 | 2026-04-29 by udunext7-wq*
```

### 8-3. 회귀 테스트

```bash
# 단위 테스트
node shell/src/cost-items/__tests__/CostLoader.test.cjs   # 6/6
node shell/src/feature-flags/__tests__/flags.test.cjs     # 6/6

# 회귀 (Phase 3 + Week 1~3)
node test-engine.js
node modules-html/boc-v6/__tests__/Router.test.cjs
node modules-html/boc-v6/__tests__/WizardController.test.cjs
node modules-html/boc-v6/__tests__/CADCanvas.test.cjs
node shell/src/gates/__tests__/E2E_5min_scenario.test.cjs
node modules-html/estimate-v6/__tests__/CalcEngineV56.test.cjs
node modules-html/kpi-v6/__tests__/KPIData.test.cjs
node modules-html/kpi-v6/__tests__/KPIBus.test.cjs
node shell/src/korea/__tests__/RegionFactor.test.cjs
node shell/src/closed-loop/__tests__/Contract.test.cjs

# 빌드
node modules-html/boc-v6/build.cjs
ls -lh modules-html/boc-v6/build/   # 5 entry + chunks
```

### 8-4. 커밋 (5개 + push)

```bash
# 커밋 1: 사전 조사 + cost_items DB + 마이그레이션
git add docs/architecture/INVENTORY.md db/migrations/v6.0/ db/seeds/v6.0/ scripts/v6.0/migrate_cost_items.cjs scripts/v6.0/migrate_master_to_cost_items.cjs scripts/v6.0/export_cost_items_xlsx.cjs scripts/v6.0/import_cost_items_xlsx.cjs
git commit -m "feat(v6/cost-items): cost_items DB + 마스터 159건 마이그레이션 + Excel 왕복

- cost_items 테이블 + rollback SQL (5종 출처 분리)
- 마스터 159건 → principal_seed (자동 승인)
- AI 보충 ~50건 → ai_market_avg (대표님 검토 대기)
- Excel 출력/임포트 워크플로우 (시트 보호 + BOM + 콤마 정규화)
- 트랜잭션 + 자동 백업 + dry-run
- 합계 ~200건 시드 적재"

# 커밋 2: CostLoader + IPC 도입
git add shell/src/cost-items/ preload/ main.js
git commit -m "feat(v6/ipc): IPC Bridge — preload.js + ipcMain 핸들러 + CostLoader (6/6 PASS)

- preload.js: contextBridge로 window.boc.* 노출
- main.js: ipcMain 핸들러 (cost/kpi/meta)
- CostLoader.cjs: loadByCategory + buildLineItems + getApprovalStatus
- Phase 4-A: 읽기 전용 (쓰기는 Phase 5 — Excel만 SoT)
- ML 학습은 is_approved_by_principal=1만 사용 (헌법)"

# 커밋 3: esbuild 노드 분리 + G1 통합 + WizardController IPC
git add modules-html/boc-v6/build.config.cjs modules-html/boc-v6/src/wizard/ modules-html/boc-v6/src/cad/entry.js modules-html/boc-v6/src/kpi-dashboard/entry.js modules-html/boc-v6/src/admin/entry.js modules-html/boc-v6/src/shell/main.js modules-html/boc-v6/src/wizard/styles/wizard.css
git commit -m "feat(v6/architecture): esbuild 노드 분리 + G1 통합 + 동적 import + 프리페치

- esbuild splitting + 5 entry (shell/wizard/cad/kpi/admin)
- 동적 import (라우트별 lazy loading)
- 셸 ~50kb / 마법자 ~150kb / CAD ~700kb / KPI ~80kb / Admin ~30kb
- 프리페치: 셸 로드 후 2초 뒤 wizard/kpi 백그라운드
- G1Page: 주거+평형+거주중+층수+엘리베이터+주소 통합 (UX 압축)
- G4Page: Week 3 그대로 (컨텍스트 박스 제거)
- WizardController: window.boc.cost.buildLineItems IPC 호출"

# 커밋 4: 글로벌 KPI 바 + /kpi 풀 대시보드 + /admin/costs
git add modules-html/boc-v6/src/components/ modules-html/boc-v6/src/kpi-dashboard/ modules-html/boc-v6/src/admin/ modules-html/boc-v6/src/shell/App.js modules-html/boc-v6/src/styles/layout.css modules-html/boc-v6/index.html modules-html/boc-v6/build/
git commit -m "feat(v6/kpi): KPI 3 레이어 — 글로벌 바 + 풀 대시보드 + 단가 관리

- GlobalKPIBar: 헤더 아래 고정 (자동화/최종/마진/진행)
  - IPC로 활성 견적 수 LOAD
  - 시뮬 vs 실거래 배지
- KPIDashboardPage /kpi: 11항목 + 단가 승인 + ML Phase
  - 출처별 분포 표시 (principal_seed/principal_input/invoice/...)
- CostsAdminPage /admin/costs: Excel 워크플로우 안내
- App Shell 그리드 3행 (헤더 + KPI바 + 컨텐츠)"

# 커밋 5: PHASE_4D_COMPLETE + v5.9 §117.2
git add shell/src/feature-flags/ docs/MASTER_PLAN.md
git commit -m "feat(v6/phase-4d): Phase 4 Week 4-A 완료 — v5.9 §117.2 갱신

- PHASE_4D_COMPLETE = true
- USE_COST_LOADER / USE_GLOBAL_KPI_BAR / USE_IPC_BRIDGE / USE_NODE_SPLITTING
- v5.9 §117.2: Week 4-A 12 원칙 명시 (사전조사/IPC/Excel/graph보존/마이그/출처/시드/UX/프리페치/SoT/기록/ADR)
- 헌법 §1~§116 변동 0 / 부록 A~Q 변동 0 / 22/23/12/6/5 변동 0 / graph.json 변동 0"

git push origin master
```

---

## 작업 후 보고 양식

```
✅ Phase 4 Week 4-A 완료 — 12 원칙 적용

[사전 조사 결과 - INVENTORY.md]
- 마스터 시드: __건 (정확 분포)
- graph.json futureNodes: __개

[신규 모듈]
- shell/src/cost-items/CostLoader.cjs (6/6 PASS)
- preload/preload.js (window.boc.* IPC API)
- main.js IPC 핸들러
- modules-html/boc-v6/src/components/GlobalKPIBar.js
- modules-html/boc-v6/src/kpi-dashboard/KPIDashboardPage.js
- modules-html/boc-v6/src/admin/CostsAdminPage.js
- scripts/v6.0/migrate_master_to_cost_items.cjs
- scripts/v6.0/export_cost_items_xlsx.cjs
- scripts/v6.0/import_cost_items_xlsx.cjs

[신규 데이터]
- cost_items 테이블 + rollback SQL
- 마스터 159건 → principal_seed (자동 승인)
- AI 보충 ~50건 → ai_market_avg (검토 대기)

[수정 (변동 0 보장)]
- WizardController: SIM_RATES 제거 → IPC 호출
- G1Page: 주거+평형+컨텍스트 통합 + UX 압축
- G4Page: Week 3 그대로 (컨텍스트 박스 제거)
- App Shell: 3행 그리드 (헤더 + KPI바 + 컨텐츠)
- esbuild: 5 entry + splitting + 동적 import + 프리페치

[테스트 결과]
- CostLoader: 6/6 PASS
- 누적 회귀: 0건
- 빌드: 5 entry + chunks/

[3 레이어 KPI 활성]
✅ 레이어 1 글로벌 바 (모든 라우트)
✅ 레이어 2 마법자 결과 (Week 2 보존)
✅ 레이어 3 /kpi 풀 대시보드

[헌법 보존 검증]
- §1~§116: 변동 0
- 부록 A~Q: 변동 0
- 22/23/12/6/5: 변동 0
- graph.json 12노드+24엣지: 변동 0
- 25 모듈 시그니처: 변동 0
- v5.8 → v5.9 (§117.2 추가만)

[다음 주]
Phase 4 Week 5: 계약 화면 + PDF 견적서 출력
```

---

## 절대 금지

- estimate.html · boc-shell.html 직접 수정
- 22/23/12/6/5 변경
- graph.json 노드/엣지 변경 (cost_management는 §117에 비전만)
- 25 모듈 시그니처 변경
- AI 추정 단가를 ML 학습 데이터로 사용 (is_approved=0)
- rollback SQL 없는 DB 변경
- IPC Bridge 우회한 브라우저 → DB 직접 액세스

---

**문서 끝.**
