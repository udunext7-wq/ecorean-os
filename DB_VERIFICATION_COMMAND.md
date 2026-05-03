# CLAUDE CODE — 백업 확인 + 원인 검증
# Phase 0-1: 백업 DB 확인 → 데이터 복구 시도
# Phase 0-2: 전체 원인 검증
# 2026-05-02

---

## 규칙: 조사 + 백업 비파괴적 확인만, 데이터 수정 금지

이 명령은 **조사 + 보고만** 합니다.
실제 DB 복원은 보고 검토 후 별도 명령으로 진행합니다.

---

# 📋 PHASE 0-1: 백업 DB 확인 (Track C)

## STEP 1: 모든 .db 파일 위치 파악

```powershell
Write-Host "=== 1-1. 시스템 전체 .db 파일 검색 ==="
Get-ChildItem C:\Users\udune -Recurse -Filter "*.db*" -ErrorAction SilentlyContinue | 
  Where-Object { $_.FullName -notmatch "node_modules|AppData\\Local" } |
  Select-Object FullName, Length, LastWriteTime |
  Format-Table -AutoSize

Write-Host ""
Write-Host "=== 1-2. AppData 내 ecorean-boc 폴더 ==="
Get-ChildItem "$env:APPDATA\ecorean-boc" -ErrorAction SilentlyContinue |
  Format-Table Name, Length, LastWriteTime -AutoSize

Write-Host ""
Write-Host "=== 1-3. 프로젝트 backups 폴더 ==="
Get-ChildItem "C:\Users\udune\ecorean-os\backups" -ErrorAction SilentlyContinue |
  Format-Table Name, Length, LastWriteTime -AutoSize
```

## STEP 2: 각 .db 파일 내부 검사 (비파괴)

```powershell
# DB 검사 스크립트 생성
$script = @'
const Database = require('better-sqlite3');
const path = process.argv[2];

try {
  // 읽기 전용으로 열기 (안전)
  const db = new Database(path, { readonly: true });
  
  // 테이블 목록
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('=== ' + path + ' ===');
  console.log('파일 크기: ' + require('fs').statSync(path).size + ' bytes');
  console.log('테이블 수: ' + tables.length);
  
  if (tables.length === 0) {
    console.log('  (비어있음)');
  } else {
    console.log('테이블 목록:');
    tables.forEach(t => {
      try {
        const count = db.prepare(`SELECT COUNT(*) as n FROM ${t.name}`).get();
        console.log(`  - ${t.name}: ${count.n}건`);
        
        // 핵심 테이블이면 샘플 확인
        if (['contracts', 'cost_items', 'purchase_orders', 'schedules', 'inspections'].includes(t.name) && count.n > 0) {
          const sample = db.prepare(`SELECT * FROM ${t.name} LIMIT 1`).get();
          console.log(`    샘플 컬럼: ${Object.keys(sample).join(', ')}`);
        }
      } catch(e) {
        console.log(`  - ${t.name}: 오류 (${e.message})`);
      }
    });
  }
  
  db.close();
  console.log('');
} catch(e) {
  console.log('=== ' + path + ' ===');
  console.log('열기 실패: ' + e.message);
  console.log('');
}
'@

$script | Out-File "$env:TEMP\db_inspect.js" -Encoding UTF8

# 실행할 DB 경로 목록 만들기
Write-Host ""
Write-Host "=== 2-1. 발견된 모든 .db 파일 검사 ==="
$dbFiles = @()
$dbFiles += Get-ChildItem "$env:APPDATA\ecorean-boc" -Filter "*.db*" -ErrorAction SilentlyContinue
$dbFiles += Get-ChildItem "C:\Users\udune\ecorean-os\backups" -Filter "*.db*" -ErrorAction SilentlyContinue
$dbFiles += Get-ChildItem "C:\Users\udune\ecorean-os" -Filter "*.db*" -Recurse -Depth 2 -ErrorAction SilentlyContinue | 
            Where-Object { $_.FullName -notmatch "node_modules" }

# 중복 제거
$uniqueDbFiles = $dbFiles | Sort-Object FullName -Unique

foreach ($f in $uniqueDbFiles) {
  Set-Location "C:\Users\udune\ecorean-os"
  node "$env:TEMP\db_inspect.js" "$($f.FullName)"
}
```

## STEP 3: 가장 데이터 많은 백업 식별

```powershell
Write-Host ""
Write-Host "=== 3-1. 백업 DB 데이터 비교 표 ==="
Write-Host "파일명 | 크기 | 수정일 | 테이블 수 | 데이터 건수"
Write-Host "-----------------------------------------"

# 위 STEP 2 결과를 바탕으로 가장 데이터 많은 DB 식별
# 보고서에 자동 정리됨
```

---

# 📋 PHASE 0-2: 원인 검증 (Track A)

## STEP 4: getBocContractDB() 호출 흐름 추적

```powershell
Write-Host ""
Write-Host "=== 4-1. getBocContractDB() 정의 위치 ==="
Select-String -Path "C:\Users\udune\ecorean-os\electron\main.js" -Pattern "function getBocContractDB|getBocContractDB\s*=" | 
  Format-Table LineNumber, Line -AutoSize

Write-Host ""
Write-Host "=== 4-2. getBocContractDB() 호출 위치 ==="
Select-String -Path "C:\Users\udune\ecorean-os\electron\main.js" -Pattern "getBocContractDB\(\)" |
  ForEach-Object { 
    Write-Host "Line $($_.LineNumber): $($_.Line.Trim())"
  }

Write-Host ""
Write-Host "=== 4-3. CREATE TABLE 위치 ==="
Select-String -Path "C:\Users\udune\ecorean-os\electron\main.js" -Pattern "CREATE TABLE" |
  ForEach-Object {
    Write-Host "Line $($_.LineNumber): $($_.Line.Trim())"
  }

Write-Host ""
Write-Host "=== 4-4. DB 경로 설정 ==="
Select-String -Path "C:\Users\udune\ecorean-os\electron\main.js" -Pattern "ecorean-boc\.db|getPath|userData" |
  Select-Object -First 10 |
  ForEach-Object {
    Write-Host "Line $($_.LineNumber): $($_.Line.Trim())"
  }
```

## STEP 5: 실제 앱 실행 흔적 검증

```powershell
Write-Host ""
Write-Host "=== 5-1. Electron 실행 가능 여부 ==="
$pkg = Get-Content "C:\Users\udune\ecorean-os\package.json" -Raw | ConvertFrom-Json
Write-Host "main: $($pkg.main)"
Write-Host "scripts.start: $($pkg.scripts.start)"

Write-Host ""
Write-Host "=== 5-2. 마지막 빌드 시각 ==="
$buildDir = "C:\Users\udune\ecorean-os\modules-html\boc-v6\build"
if (Test-Path $buildDir) {
  Get-ChildItem $buildDir | 
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 5 Name, LastWriteTime |
    Format-Table -AutoSize
}

Write-Host ""
Write-Host "=== 5-3. node_modules 설치 여부 ==="
if (Test-Path "C:\Users\udune\ecorean-os\node_modules") {
  $nm = Get-ChildItem "C:\Users\udune\ecorean-os\node_modules" -Directory | Measure-Object
  Write-Host "node_modules 패키지 수: $($nm.Count)"
} else {
  Write-Host "❌ node_modules 없음 — npm install 필요"
}

Write-Host ""
Write-Host "=== 5-4. better-sqlite3 설치 확인 ==="
if (Test-Path "C:\Users\udune\ecorean-os\node_modules\better-sqlite3") {
  Write-Host "✅ better-sqlite3 설치됨"
} else {
  Write-Host "❌ better-sqlite3 없음"
}

Write-Host ""
Write-Host "=== 5-5. Electron 설치 확인 ==="
if (Test-Path "C:\Users\udune\ecorean-os\node_modules\electron") {
  Write-Host "✅ electron 설치됨"
} else {
  Write-Host "❌ electron 없음"
}
```

## STEP 6: 마이그레이션 파일 vs 실제 적용 비교

```powershell
Write-Host ""
Write-Host "=== 6-1. 마이그레이션 파일 목록 ==="
Get-ChildItem "C:\Users\udune\ecorean-os\db\migrations" -Recurse -Filter "*.sql" |
  Format-Table Name, LastWriteTime -AutoSize

Write-Host ""
Write-Host "=== 6-2. 마이그레이션 자동 실행 시스템 존재 여부 ==="
$migrationRunner = Select-String -Path "C:\Users\udune\ecorean-os\electron\main.js","C:\Users\udune\ecorean-os\shell\src\*.cjs" -Pattern "migration|migrate" -ErrorAction SilentlyContinue
if ($migrationRunner) {
  $migrationRunner | Format-Table Filename, LineNumber, Line -AutoSize
} else {
  Write-Host "❌ 마이그레이션 자동 실행 시스템 없음"
  Write-Host "   → SQL 파일은 있지만 실행할 도구가 없음"
  Write-Host "   → main.js의 inline CREATE TABLE에만 의존"
}
```

## STEP 7: 단위 테스트 vs E2E 테스트 비교

```powershell
Write-Host ""
Write-Host "=== 7-1. 모든 테스트 파일 분류 ==="

$tests = Get-ChildItem "C:\Users\udune\ecorean-os" -Recurse -Filter "*.test.cjs" |
  Where-Object { $_.FullName -notmatch "node_modules" }

Write-Host "총 테스트 파일: $($tests.Count)"

$unitTests = $tests | Where-Object { $_.FullName -notmatch "e2e|integration" }
Write-Host "단위 테스트: $($unitTests.Count)"

$e2eTests = $tests | Where-Object { $_.FullName -match "e2e|integration" }
Write-Host "E2E 테스트: $($e2eTests.Count)"

Write-Host ""
Write-Host "→ E2E 테스트 0개 = 실제 동작 검증된 적 없음"
```

---

# 📋 PHASE 0-3: 종합 보고서

## STEP 8: 검증 보고서 작성

```powershell
Write-Host ""
Write-Host "=== 8-1. 보고서 자동 작성 ==="

$reportPath = "C:\Users\udune\DB_VERIFICATION_REPORT.md"

# (Claude Code가 위 모든 STEP 결과를 종합해서 다음 형식으로 보고서 작성)
```

보고서 형식:

```markdown
# DB 데이터 손실 원인 검증 보고서
## 작성일: 2026-05-02

## 1. 발견된 .db 파일 (전체)

| 파일 경로 | 크기 | 수정일 | 테이블 수 | 데이터 건수 |
|---|---|---|---|---|
| %APPDATA%\ecorean-boc\ecorean-boc.db | XKB | 날짜 | N개 | N건 |
| backups\ecorean-boc.db.bak.week6 | XKB | 날짜 | N개 | N건 |
| backups\ecorean-boc.db.bak.20260428... | XKB | 날짜 | N개 | N건 |

## 2. 가장 데이터 많은 백업

이름: [파일명]
- 테이블: contracts(N건), cost_items(N건), ...
- 복구 가능 여부: ✅ / ❌

## 3. 데이터 손실 원인 (확정)

원인 1: [확인된 원인]
원인 2: [확인된 원인]
...

## 4. 코드 흐름 분석

- getBocContractDB() 정의: main.js Line N
- 호출 위치: N개 핸들러
- CREATE TABLE 위치: main.js Line N
- 호출 트리거: 첫 IPC 호출 시

## 5. 앱 실행 흔적

- node_modules: ✅ / ❌
- electron: ✅ / ❌
- better-sqlite3: ✅ / ❌
- 마지막 빌드: 날짜
- E2E 테스트: 0개

## 6. 결론

[원인 확정]

## 7. 복구 권고

(가) 백업에서 복구 가능 → 어떤 백업을 어떻게 복구할지
(나) 백업도 비어있음 → 새로 시작 필요
(다) 일부 복구 + 새로 시작 혼합

## 8. 재발 방지

- E2E 테스트 시스템 구축
- 마이그레이션 자동 실행
- 일일 자동 백업
- 자기 진단 시스템에 DB 검증 추가
```

---

# ⚠️ 출력 파일

```
산출물:
1. /home/claude/DB_VERIFICATION_REPORT.md (Claude 보관용)
2. C:\Users\udune\DB_VERIFICATION_REPORT.md (대표님 검토용)

작성 후 두 파일 경로 보고하라.
```

---

# 🎯 보고 형식

작업 완료 후 1줄 요약:

```
## 검증 결과 요약

### 발견된 백업 DB
- N개 발견
- 데이터 있는 백업: N개
- 가장 많은 데이터: [파일명] - 테이블 N개, 데이터 N건

### 손실 원인 (확정)
- 1순위: [원인]
- 2순위: [원인]

### 복구 가능성
- 100% 복구: ✅ / ❌
- 부분 복구: N% 가능
- 완전 새로 시작: 필요/불필요

### 즉시 조치 가능
- (가) 백업 X에서 복구 → 1시간
- (나) 새로 시작 → 1일
- (다) 혼합 → 2시간

### 다음 명령 대기
- 대표님 결정 후 진행
```

---

## 중요 지침

```
1. 모든 .db 파일 비파괴적으로 열 것 (readonly)
2. 백업 파일 내용 변경 금지
3. 추정 금지 (실제 데이터 확인)
4. 가장 데이터 많은 백업 명확히 식별
5. 복구 가능성 정량 평가
6. 재발 방지 권고 포함
```
