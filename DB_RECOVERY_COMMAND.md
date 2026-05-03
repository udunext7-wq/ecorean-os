# CLAUDE CODE — DB 복구 + 시딩 보완 + 재발 방지
# Phase 0-A: 기존 DB 복구 + cost_items 65건 보완 + 마이그레이션 자동화
# 2026-05-02

---

## 규칙

- LEVEL 1~3 자동 진행 (bypassPermissions 모드)
- LEVEL 4 (rm, drop, push, install)는 대표님 승인
- 헌법 자동 강제 (pre-commit hook)
- 모든 변경 전 자동 백업

---

# 📋 STEP 1: 안전 백업 (필수)

```powershell
Set-Location "C:\Users\udune\ecorean-os"

Write-Host "=== 1-1. 현재 데이터 안전 백업 ==="

# 타임스탬프 생성
$ts = Get-Date -Format "yyyyMMdd-HHmmss"

# 백업 폴더 확인
if (-not (Test-Path "backups")) { New-Item -ItemType Directory -Path "backups" }

# 데이터 있는 DB 백업 (안전 복사)
Copy-Item "ecorean-boc.db" "backups\ecorean-boc.db.recovery-$ts.bak"
Write-Host "✅ 백업: backups\ecorean-boc.db.recovery-$ts.bak"

# AppData 빈 DB도 백업 (혹시 모를 상황 대비)
$appdb = "$env:APPDATA\ecorean-boc\ecorean-boc.db"
if (Test-Path $appdb) {
  Copy-Item $appdb "backups\appdata-empty-$ts.bak"
  Write-Host "✅ AppData 빈 DB 백업: backups\appdata-empty-$ts.bak"
}

# git tag 백업
git tag -f "backup/before-db-recovery-$ts"
Write-Host "✅ Git 태그: backup/before-db-recovery-$ts"
```

---

# 📋 STEP 2: AppData 위치로 DB 복사

```powershell
Write-Host ""
Write-Host "=== 2-1. AppData 폴더 확인/생성 ==="

$appDataDir = "$env:APPDATA\ecorean-boc"
if (-not (Test-Path $appDataDir)) {
  New-Item -ItemType Directory -Path $appDataDir
  Write-Host "✅ 폴더 생성: $appDataDir"
} else {
  Write-Host "✅ 폴더 존재: $appDataDir"
}

Write-Host ""
Write-Host "=== 2-2. 데이터 있는 DB → AppData 복사 ==="

# 기존 AppData DB 제거 (0 bytes 파일)
$targetDb = "$env:APPDATA\ecorean-boc\ecorean-boc.db"
if (Test-Path $targetDb) {
  Remove-Item $targetDb
  Write-Host "✅ 기존 빈 DB 제거"
}

# 데이터 있는 DB 복사
Copy-Item "ecorean-boc.db" $targetDb
Write-Host "✅ 데이터 DB 복사 완료"

# 크기 확인
$srcSize = (Get-Item "ecorean-boc.db").Length
$dstSize = (Get-Item $targetDb).Length
Write-Host "원본 크기: $srcSize bytes"
Write-Host "복사본 크기: $dstSize bytes"

if ($srcSize -eq $dstSize) {
  Write-Host "✅ 크기 일치 — 복사 성공"
} else {
  Write-Host "❌ 크기 불일치 — 복사 실패"
  exit 1
}
```

---

# 📋 STEP 3: 복사된 DB 검증

```powershell
Write-Host ""
Write-Host "=== 3-1. AppData DB 내용 검증 ==="

$verifyScript = @'
const Database = require('better-sqlite3');
const path = process.argv[2];

const db = new Database(path, { readonly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

console.log('테이블 수:', tables.length);
console.log('');

const expectedTables = ['contracts', 'purchase_orders', 'schedules', 'inspections', 'cost_items'];

tables.forEach(t => {
  const count = db.prepare(`SELECT COUNT(*) as n FROM ${t.name}`).get();
  const isCore = expectedTables.includes(t.name);
  const marker = isCore ? '⭐' : '  ';
  console.log(`${marker} ${t.name}: ${count.n}건`);
});

db.close();
'@

$verifyScript | Out-File "verify_db.js" -Encoding UTF8
node verify_db.js "$env:APPDATA\ecorean-boc\ecorean-boc.db"
Remove-Item "verify_db.js"
```

---

# 📋 STEP 4: cost_items 65건 보완 시딩

```powershell
Write-Host ""
Write-Host "=== 4-1. 시드 데이터 파일 확인 ==="

Get-ChildItem "C:\Users\udune\ecorean-os\db\seeds\v6.0" -ErrorAction SilentlyContinue |
  Format-Table Name, Length, LastWriteTime -AutoSize

Write-Host ""
Write-Host "=== 4-2. 현재 cost_items 카테고리별 분포 ==="

$catScript = @'
const Database = require('better-sqlite3');
const db = new Database(process.argv[2], { readonly: true });

console.log('카테고리별 분포:');
const cats = db.prepare("SELECT category, COUNT(*) as n FROM cost_items GROUP BY category").all();
cats.forEach(c => console.log(`  ${c.category}: ${c.n}건`));

console.log('');
console.log('총합:', db.prepare("SELECT COUNT(*) as n FROM cost_items").get().n, '건');
console.log('목표:', 159, '건');
console.log('부족:', 159 - db.prepare("SELECT COUNT(*) as n FROM cost_items").get().n, '건');

db.close();
'@

$catScript | Out-File "cat_check.js" -Encoding UTF8
node cat_check.js "$env:APPDATA\ecorean-boc\ecorean-boc.db"
Remove-Item "cat_check.js"
```

---

# 📋 STEP 5: 부족분 시드 자동 적재

```powershell
Write-Host ""
Write-Host "=== 5-1. 헌법 시드 159건 명세 ==="
Write-Host "  공정: 62건"
Write-Host "  자재: 35건"
Write-Host "  노무비: 22건"
Write-Host "  온톨로지: 11건"
Write-Host "  브랜드: 29건"
Write-Host "  합계: 159건"
Write-Host ""

# db/seeds/v6.0/ 폴더의 시드 SQL 자동 실행
$seedScript = @'
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.argv[2];
const seedDir = process.argv[3];

const db = new Database(dbPath);

// 트랜잭션으로 안전하게 적재
const transaction = db.transaction((files) => {
  for (const file of files) {
    const sql = fs.readFileSync(path.join(seedDir, file), 'utf8');
    console.log(`적재 중: ${file}`);
    
    // 단순 SQL 실행 (UPSERT 형태로 작성된 시드 파일 가정)
    try {
      db.exec(sql);
      console.log(`  ✅ 완료`);
    } catch(e) {
      console.log(`  ⚠️  ${e.message.substring(0, 80)}`);
    }
  }
});

const seedFiles = fs.readdirSync(seedDir).filter(f => f.endsWith('.sql') || f.endsWith('.cjs'));
console.log('발견된 시드 파일:', seedFiles.length);
seedFiles.forEach(f => console.log(`  - ${f}`));
console.log('');

if (seedFiles.length > 0) {
  transaction(seedFiles);
}

// 결과 확인
const total = db.prepare("SELECT COUNT(*) as n FROM cost_items").get();
console.log('');
console.log('적재 후 cost_items:', total.n, '건');

db.close();
'@

$seedScript | Out-File "seed_load.js" -Encoding UTF8

if (Test-Path "C:\Users\udune\ecorean-os\db\seeds\v6.0") {
  node seed_load.js "$env:APPDATA\ecorean-boc\ecorean-boc.db" "C:\Users\udune\ecorean-os\db\seeds\v6.0"
} else {
  Write-Host "⚠️  db/seeds/v6.0/ 폴더 없음"
  Write-Host "   → 시드 SQL 파일 작성 필요"
  Write-Host "   → 별도 작업으로 진행"
}

Remove-Item "seed_load.js" -ErrorAction SilentlyContinue
```

---

# 📋 STEP 6: 마이그레이션 자동 실행 시스템 (재발 방지)

```powershell
Write-Host ""
Write-Host "=== 6-1. 마이그레이션 자동 실행 코드 작성 ==="
```

파일: `shell/src/db/migration-runner.cjs`

```javascript
'use strict';

// 마이그레이션 자동 실행 — 재발 방지
// 앱 시작 시 자동으로 db/migrations/ 의 모든 SQL 적용

const fs = require('fs');
const path = require('path');

function runMigrations(db, migrationsDir) {
  // 마이그레이션 추적 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);
  
  // 적용된 마이그레이션 조회
  const applied = new Set(
    db.prepare('SELECT filename FROM _migrations').all().map(r => r.filename)
  );
  
  // 마이그레이션 파일 목록 (정렬)
  if (!fs.existsSync(migrationsDir)) {
    console.log('[Migration] 마이그레이션 폴더 없음:', migrationsDir);
    return { applied: 0, skipped: 0 };
  }
  
  const files = fs.readdirSync(migrationsDir, { recursive: true })
    .filter(f => f.endsWith('_up.sql'))
    .sort();
  
  let appliedCount = 0;
  let skippedCount = 0;
  
  // 트랜잭션으로 안전하게
  const transaction = db.transaction(() => {
    for (const file of files) {
      if (applied.has(file)) {
        skippedCount++;
        continue;
      }
      
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      console.log('[Migration] 적용:', file);
      db.exec(sql);
      
      db.prepare('INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)')
        .run(file, Date.now());
      
      appliedCount++;
    }
  });
  
  transaction();
  
  return { applied: appliedCount, skipped: skippedCount };
}

module.exports = { runMigrations };
```

```powershell
Write-Host ""
Write-Host "=== 6-2. main.js의 getBocContractDB()에 마이그레이션 호출 추가 ==="
```

`electron/main.js` 수정 — `getBocContractDB()` 함수 안:

```javascript
function getBocContractDB() {
  if (_bocContractDB) return _bocContractDB;
  
  const dbPath = path.join(app.getPath('userData'), 'ecorean-boc.db');
  _bocContractDB = new Database(dbPath);
  
  // 🆕 마이그레이션 자동 실행 (재발 방지)
  const { runMigrations } = require('../shell/src/db/migration-runner.cjs');
  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
  const result = runMigrations(_bocContractDB, migrationsDir);
  console.log(`[DB] 마이그레이션 적용: ${result.applied}개 (스킵: ${result.skipped}개)`);
  
  // 기존 inline CREATE TABLE 코드 (하위 호환)
  _bocContractDB.exec(`...`);
  
  return _bocContractDB;
}
```

---

# 📋 STEP 7: 시드 자동 적재 시스템 (재발 방지)

파일: `shell/src/db/seed-runner.cjs`

```javascript
'use strict';

// 시드 데이터 자동 적재 — 재발 방지
// 앱 시작 시 자동으로 db/seeds/ 의 데이터 적용 (멱등)

const fs = require('fs');
const path = require('path');

function runSeeds(db, seedsDir) {
  if (!fs.existsSync(seedsDir)) {
    console.log('[Seed] 시드 폴더 없음:', seedsDir);
    return { loaded: 0 };
  }
  
  const files = fs.readdirSync(seedsDir, { recursive: true })
    .filter(f => f.endsWith('.sql') || f.endsWith('.cjs'))
    .sort();
  
  let loadedCount = 0;
  
  const transaction = db.transaction(() => {
    for (const file of files) {
      const filePath = path.join(seedsDir, file);
      
      if (file.endsWith('.sql')) {
        const sql = fs.readFileSync(filePath, 'utf8');
        console.log('[Seed] 적재:', file);
        db.exec(sql);
        loadedCount++;
      } else if (file.endsWith('.cjs')) {
        const seedFn = require(filePath);
        if (typeof seedFn === 'function') {
          seedFn(db);
          loadedCount++;
        }
      }
    }
  });
  
  transaction();
  
  // 헌법 검증
  const counts = {
    cost_items: db.prepare('SELECT COUNT(*) as n FROM cost_items').get().n,
  };
  
  console.log('[Seed] cost_items:', counts.cost_items, '건');
  
  if (counts.cost_items < 159) {
    console.warn(`[Seed] ⚠️  cost_items ${counts.cost_items}건 (목표 159건, ${159 - counts.cost_items}건 부족)`);
  }
  
  return { loaded: loadedCount, counts };
}

module.exports = { runSeeds };
```

`electron/main.js` 추가:

```javascript
// getBocContractDB() 안에 추가:
const { runSeeds } = require('../shell/src/db/seed-runner.cjs');
const seedsDir = path.join(__dirname, '..', 'db', 'seeds');
const seedResult = runSeeds(_bocContractDB, seedsDir);
console.log(`[DB] 시드 적재: ${seedResult.loaded}개 파일`);
```

---

# 📋 STEP 8: 최종 검증

```powershell
Write-Host ""
Write-Host "=== 8-1. 최종 DB 상태 확인 ==="

$finalScript = @'
const Database = require('better-sqlite3');
const db = new Database(process.argv[2], { readonly: true });

console.log('=== 최종 검증 ===');
console.log('');

const checks = [
  { name: 'contracts', expect: '> 0' },
  { name: 'purchase_orders', expect: '> 0' },
  { name: 'schedules', expect: '> 0' },
  { name: 'inspections', expect: '> 0' },
  { name: 'cost_items', expect: '= 159' },
];

let allPass = true;
checks.forEach(c => {
  try {
    const r = db.prepare(`SELECT COUNT(*) as n FROM ${c.name}`).get();
    const status = (c.name === 'cost_items' && r.n === 159) || 
                   (c.name !== 'cost_items' && r.n > 0) ? '✅' : '⚠️';
    if (status === '⚠️') allPass = false;
    console.log(`${status} ${c.name}: ${r.n}건 (기대: ${c.expect})`);
  } catch(e) {
    console.log(`❌ ${c.name}: ${e.message}`);
    allPass = false;
  }
});

console.log('');
console.log(allPass ? '✅ 모든 검증 통과' : '⚠️ 일부 검증 미흡 (대표님 검토 필요)');

db.close();
'@

$finalScript | Out-File "final_check.js" -Encoding UTF8
node final_check.js "$env:APPDATA\ecorean-boc\ecorean-boc.db"
Remove-Item "final_check.js"

Write-Host ""
Write-Host "=== 8-2. AppData DB 위치/크기 ==="
Get-Item "$env:APPDATA\ecorean-boc\ecorean-boc.db" | 
  Format-List FullName, Length, LastWriteTime
```

---

# 📋 STEP 9: 종합 보고

```markdown
# DB 복구 완료 보고서
## 2026-05-02

## 작업 결과

| 작업 | 상태 |
|---|---|
| 안전 백업 | ✅ |
| AppData 폴더 생성 | ✅ |
| 데이터 DB 복사 | ✅ |
| 시드 데이터 보완 | ✅/⚠️ (현재 N건) |
| 마이그레이션 자동 실행 시스템 | ✅ |
| 시드 자동 적재 시스템 | ✅ |
| 최종 검증 | ✅/⚠️ |

## 데이터 상태

- contracts: N건
- purchase_orders: N건
- schedules: N건
- inspections: N건
- cost_items: N건/159건

## 재발 방지 적용

- ✅ shell/src/db/migration-runner.cjs (마이그레이션 자동)
- ✅ shell/src/db/seed-runner.cjs (시드 자동)
- ✅ main.js getBocContractDB()에 통합

## 다음 단계

- npm start 테스트 (앱 실행 검증)
- 부족 시드 보완 (필요 시)
- Phase 0 종료, Phase 1 진입 준비
```

---

# ⚠️ 출력 파일

```
1. /home/claude/DB_RECOVERY_REPORT.md
2. C:\Users\udune\DB_RECOVERY_REPORT.md
```

---

# 🎯 보고 형식

```
## DB 복구 결과

### 핵심 결과
- AppData DB: ✅ 데이터 복원
- 시드: N건 / 159건 ([달성%])
- 재발 방지: ✅ 자동화 시스템 추가

### 적용된 자동화
- migration-runner.cjs
- seed-runner.cjs
- main.js 통합

### 남은 작업
- 시드 보완 N건 (필요 시)
- npm start 검증

### 다음 행동
대표님 결정 대기:
(가) npm start 실행 → 앱 실제 동작 검증
(나) 시드 보완 먼저 → 159건 채운 후 검증
```

---

## 중요 지침

```
1. 모든 LEVEL 1~3 자동 진행
2. LEVEL 4 (rm, drop, npm install) — 발생 시 대표님 승인
3. 헌법 위반 차단 (pre-commit hook)
4. 모든 변경 전 자동 백업 (git tag + .bak)
5. 추정 금지 — 실제 데이터 확인
6. 솔직한 보고 (자기 변호 금지)
```
