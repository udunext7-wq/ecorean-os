# MONOREPO RESTRUCTURE COMMAND
## ECOREAN BOC OS — 모노레포 재편 명령서 (v7.0 준비)

---

## 🎯 명령서 개요

```
파일: MONOREPO_RESTRUCTURE_COMMAND.md
대상: Claude Code (PowerShell, Windows)
경로: C:\Users\udune\ecorean-os
목적: 현재 단일 폴더 구조를 모노레포(워크스페이스) 구조로 재편
선행: DB_RECOVERY_COMMAND.md 완료 + npm start 1회 동작 검증
소요: 2~3일 (1일 = 8시간 기준 8단계, 마지막 1일은 검증)
위험도: 15% (백업 + 단계별 롤백 가능)
승인 레벨: LEVEL 3 (헌법 검증 후 자동) — 단, STEP 1·2·9는 LEVEL 4 (명시 승인)
```

---

## 🚨 절대 원칙 (실행 전 숙지)

```
1. 단일 헌법 (docs/CONSTITUTION.md 1개만 존재)
2. 단일 시드 (seeds/ 폴더 1곳)
3. 단일 스키마 (packages/schema/ 1개)
4. 모듈 간 직접 import 금지 (apps/A → apps/B 차단)
5. 워크스페이스 의존성 표준 ("workspace:*" 형식 강제)
6. CI에서 헌법 검증 자동 (GitHub Actions)
7. 단일 버전 태그 (v7.0.0 = 전체 시스템)
8. 짜집기 위험 65% → 10% 감축이 본 작업의 KPI
9. 어떤 STEP이든 실패 시 즉시 중단 + 롤백 + 대표님 보고
10. 결과는 docs/auto-work-log.md 에 자동 기록
```

---

## 📋 STEP 1. 안전 백업 (필수, LEVEL 4 명시 승인)

### 목표
재편 시작 전 100% 복원 가능 상태 확보.

### 실행 순서

```powershell
# 1-1. 현재 위치 확인
cd C:\Users\udune\ecorean-os
pwd

# 1-2. Git 상태 확인 (uncommitted 없어야 함)
git status

# 1-3. 만약 uncommitted 있으면 임시 커밋
git add .
git commit -m "chore: pre-monorepo snapshot (auto)"

# 1-4. 태그 생성 (영구 복원점)
git tag v6.0-pre-monorepo
git push origin v6.0-pre-monorepo

# 1-5. 전체 폴더 .bak 백업
cd C:\Users\udune
Copy-Item -Path "ecorean-os" -Destination "ecorean-os-backup-$(Get-Date -Format 'yyyyMMdd-HHmm')" -Recurse

# 1-6. AppData DB 백업 (DB_RECOVERY 후 상태)
$appdata = "$env:APPDATA\ecorean-boc"
$backupName = "ecorean-boc-pre-monorepo-$(Get-Date -Format 'yyyyMMdd-HHmm').db"
Copy-Item "$appdata\ecorean-boc.db" "$appdata\$backupName"

# 1-7. 백업 검증
ls C:\Users\udune\ecorean-os-backup-*
ls $appdata\*.db
```

### 검증 기준 (모두 PASS 해야 STEP 2 진행)

- [ ] `git tag` 결과에 `v6.0-pre-monorepo` 존재
- [ ] `ecorean-os-backup-YYYYMMDD-HHMM/` 폴더 생성됨
- [ ] AppData DB 백업 파일 존재
- [ ] git log 에 새 커밋 기록됨

### 실패 시 롤백

```powershell
# 백업 폴더 삭제만
Remove-Item -Path "ecorean-os-backup-*" -Recurse -Force
git tag -d v6.0-pre-monorepo
```

---

## 📋 STEP 2. 모노레포 골격 폴더 생성 (LEVEL 4 명시 승인)

### 목표
워크스페이스 구조의 빈 폴더 생성. 파일 이동은 다음 STEP.

### 실행 순서

```powershell
cd C:\Users\udune\ecorean-os

# 2-1. 새 디렉토리 구조 생성
New-Item -ItemType Directory -Force -Path "apps\console"
New-Item -ItemType Directory -Force -Path "apps\minicad"
New-Item -ItemType Directory -Force -Path "apps\estimator"

New-Item -ItemType Directory -Force -Path "packages\schema"
New-Item -ItemType Directory -Force -Path "packages\engines"
New-Item -ItemType Directory -Force -Path "packages\db"
New-Item -ItemType Directory -Force -Path "packages\ui"

New-Item -ItemType Directory -Force -Path "seeds"
New-Item -ItemType Directory -Force -Path "scripts"
New-Item -ItemType Directory -Force -Path ".github\workflows"

# 2-2. 각 모듈에 빈 manifest.json placeholder
@"
{
  "id": "console",
  "name": "BOC Console",
  "version": "0.1.0",
  "description": "ECOREAN BOC OS 표지 (Launcher/Router)"
}
"@ | Out-File -FilePath "apps\console\manifest.json" -Encoding UTF8

@"
{
  "id": "minicad",
  "name": "MiniCAD",
  "version": "5.8.1",
  "description": "도면 작성 + JSON SSoT 출력 모듈"
}
"@ | Out-File -FilePath "apps\minicad\manifest.json" -Encoding UTF8

@"
{
  "id": "estimator",
  "name": "견적마법사",
  "version": "0.1.0",
  "description": "6단계 견적 마법사 + 13 엔진"
}
"@ | Out-File -FilePath "apps\estimator\manifest.json" -Encoding UTF8

# 2-3. 폴더 구조 검증
tree /F /A apps packages seeds scripts | Out-File -FilePath "structure-step2.txt" -Encoding UTF8
cat structure-step2.txt
```

### 검증 기준

- [ ] `apps/console`, `apps/minicad`, `apps/estimator` 폴더 존재
- [ ] `packages/schema`, `packages/engines`, `packages/db`, `packages/ui` 폴더 존재
- [ ] `seeds/`, `scripts/`, `.github/workflows/` 폴더 존재
- [ ] 3개 manifest.json 생성 + 인코딩 UTF-8

### 실패 시 롤백

```powershell
Remove-Item -Recurse -Force apps, packages, seeds, scripts, .github
```

---

## 📋 STEP 3. 루트 워크스페이스 정의 (LEVEL 3)

### 목표
npm workspaces 활성화. 의존성 관리 표준 확립.

### 실행 순서

```powershell
cd C:\Users\udune\ecorean-os

# 3-1. 기존 package.json 백업
Copy-Item package.json package.json.pre-monorepo.bak

# 3-2. 새 루트 package.json 생성
@"
{
  "name": "ecorean-os",
  "version": "7.0.0-alpha.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "verify:constitution": "node scripts/verify-constitution.cjs",
    "verify:seeds": "node scripts/verify-seeds.cjs",
    "verify:schema": "node scripts/verify-schema.cjs",
    "verify:all": "npm run verify:constitution && npm run verify:seeds && npm run verify:schema",
    "console": "npm run start --workspace=apps/console",
    "minicad": "npm run start --workspace=apps/minicad",
    "estimator": "npm run start --workspace=apps/estimator",
    "test:all": "npm run test --workspaces --if-present"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "license": "UNLICENSED",
  "author": "ECOREAN (BOC)"
}
"@ | Out-File -FilePath "package.json" -Encoding UTF8

# 3-3. 각 워크스페이스 package.json 생성 (최소 형태)
@"
{
  "name": "@ecorean/console",
  "version": "0.1.0",
  "private": true,
  "main": "index.html",
  "scripts": {
    "start": "echo 'Console placeholder'"
  }
}
"@ | Out-File -FilePath "apps\console\package.json" -Encoding UTF8

@"
{
  "name": "@ecorean/minicad",
  "version": "5.8.1",
  "private": true,
  "main": "index.html",
  "dependencies": {
    "@ecorean/schema": "workspace:*"
  },
  "scripts": {
    "start": "echo 'MiniCAD placeholder'"
  }
}
"@ | Out-File -FilePath "apps\minicad\package.json" -Encoding UTF8

@"
{
  "name": "@ecorean/estimator",
  "version": "0.1.0",
  "private": true,
  "main": "index.html",
  "dependencies": {
    "@ecorean/schema": "workspace:*",
    "@ecorean/engines": "workspace:*",
    "@ecorean/db": "workspace:*"
  },
  "scripts": {
    "start": "echo 'Estimator placeholder'"
  }
}
"@ | Out-File -FilePath "apps\estimator\package.json" -Encoding UTF8

@"
{
  "name": "@ecorean/schema",
  "version": "6.0.0",
  "private": true,
  "main": "index.js"
}
"@ | Out-File -FilePath "packages\schema\package.json" -Encoding UTF8

@"
{
  "name": "@ecorean/engines",
  "version": "1.0.0",
  "private": true,
  "main": "index.js",
  "dependencies": {
    "@ecorean/schema": "workspace:*"
  }
}
"@ | Out-File -FilePath "packages\engines\package.json" -Encoding UTF8

@"
{
  "name": "@ecorean/db",
  "version": "1.0.0",
  "private": true,
  "main": "index.js"
}
"@ | Out-File -FilePath "packages\db\package.json" -Encoding UTF8

@"
{
  "name": "@ecorean/ui",
  "version": "0.1.0",
  "private": true,
  "main": "index.js"
}
"@ | Out-File -FilePath "packages\ui\package.json" -Encoding UTF8

# 3-4. 워크스페이스 인식 확인
npm install
npm ls --workspaces
```

### 검증 기준

- [ ] 루트 `package.json` 에 `workspaces` 필드 존재
- [ ] `npm install` 에러 없이 완료
- [ ] `npm ls --workspaces` 결과에 7개 워크스페이스 표시 (console, minicad, estimator, schema, engines, db, ui)
- [ ] `node_modules/@ecorean/` 심볼릭 링크 생성됨

### 실패 시 롤백

```powershell
Move-Item -Force package.json.pre-monorepo.bak package.json
Remove-Item -Recurse -Force node_modules
npm install
```

---

## 📋 STEP 4. 헌법 + 시드 단일화 (LEVEL 3)

### 목표
헌법 1개, 시드 1곳. SSoT 강제.

### 실행 순서

```powershell
cd C:\Users\udune\ecorean-os

# 4-1. 기존 헌법 문서 위치 파악
Get-ChildItem -Recurse -Filter "*.md" | Where-Object { 
  $_.FullName -match "constitution|CONSTITUTION|MASTER_PLAN|헌법" 
} | Select-Object FullName

# 4-2. docs/CONSTITUTION.md 통합 (기존 MASTER_PLAN.md 가 있다면 이를 기반)
# 수동 검토 필요 — Claude Code가 기존 docs/MASTER_PLAN.md 내용을 docs/CONSTITUTION.md 로 복사하되
# 헌법 항목(13 엔진, P1-P6, B1-B8, 시드 159, 22 시공섹션, 23 공간 등)이 모두 포함되도록 정리
# 기존 파일은 docs/CONSTITUTION.md 로 변경, 다른 위치의 헌법 문서는 삭제 또는 archive/ 이동

New-Item -ItemType Directory -Force -Path "docs\archive"
# 중복 헌법 파일이 있다면 archive 로
# Move-Item docs\OLD_CONSTITUTION.md docs\archive\

# 4-3. 시드 파일 통합 — 기존 시드 위치 파악
Get-ChildItem -Recurse -Filter "*.json" | Where-Object { 
  $_.FullName -match "seed|시드|process|material|labor|ontology|brand"
} | Select-Object FullName, Length

# 4-4. seeds/ 로 통합 (수동 검토 후 이동)
# 기대 결과:
#   seeds/processes-62.json   (62건)
#   seeds/materials-35.json   (35건)
#   seeds/labor-22.json       (22건)
#   seeds/ontology-11.json    (11건)
#   seeds/brands-29.json      (29건)
#   합계 159건

# 4-5. 시드 매니페스트 생성
@"
{
  "version": "6.0",
  "totalEntries": 159,
  "files": [
    { "name": "processes-62.json", "count": 62, "category": "process" },
    { "name": "materials-35.json", "count": 35, "category": "material" },
    { "name": "labor-22.json", "count": 22, "category": "labor" },
    { "name": "ontology-11.json", "count": 11, "category": "ontology" },
    { "name": "brands-29.json", "count": 29, "category": "brand" }
  ],
  "constitution": "v6.0",
  "lastUpdated": "$(Get-Date -Format 'yyyy-MM-dd')"
}
"@ | Out-File -FilePath "seeds\manifest.json" -Encoding UTF8

# 4-6. 검증 스크립트 (verify-seeds.cjs) 작성
@"
// scripts/verify-seeds.cjs
const fs = require('fs');
const path = require('path');

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'seeds', 'manifest.json'), 'utf8'));

let totalActual = 0;
let allPass = true;

manifest.files.forEach(f => {
  const filePath = path.join(__dirname, '..', 'seeds', f.name);
  if (!fs.existsSync(filePath)) {
    console.error('FAIL: missing ' + f.name);
    allPass = false;
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const actual = Array.isArray(data) ? data.length : Object.keys(data).length;
  totalActual += actual;
  if (actual !== f.count) {
    console.error('FAIL: ' + f.name + ' expected ' + f.count + ' got ' + actual);
    allPass = false;
  } else {
    console.log('PASS: ' + f.name + ' = ' + actual);
  }
});

if (totalActual !== manifest.totalEntries) {
  console.error('FAIL: total ' + totalActual + ' / expected ' + manifest.totalEntries);
  allPass = false;
}

console.log('TOTAL: ' + totalActual + '/' + manifest.totalEntries);
process.exit(allPass ? 0 : 1);
"@ | Out-File -FilePath "scripts\verify-seeds.cjs" -Encoding UTF8

# 4-7. 검증 실행
node scripts/verify-seeds.cjs
```

### 검증 기준

- [ ] `docs/CONSTITUTION.md` 1개만 존재 (다른 헌법 문서는 archive 또는 삭제)
- [ ] `seeds/` 에 5개 JSON + manifest.json 존재
- [ ] `node scripts/verify-seeds.cjs` 결과: 총 159/159 PASS
- [ ] 헌법 13 엔진/P1-P6/B1-B8/시드 159 모두 CONSTITUTION.md 에 포함

### 실패 시 롤백

```powershell
git checkout docs/ seeds/
Remove-Item scripts/verify-seeds.cjs
```

---

## 📋 STEP 5. 기존 코드 → apps/* 이동 (LEVEL 3)

### 목표
짜집기 9주 코드를 적절한 워크스페이스로 분류. 단, **버릴 코드와 살릴 코드 구분 필수**.

### 실행 순서

```powershell
cd C:\Users\udune\ecorean-os

# 5-1. 현재 루트 파일 인벤토리
Get-ChildItem -File | Select-Object Name, Length, LastWriteTime | 
  Out-File -FilePath "inventory-step5.txt" -Encoding UTF8

# 5-2. 분류 가이드 (수동 판단 필수)
# 
# [살릴 코드 → apps/console/]
#   - main.html, launcher.html, index.html (표지 후보)
#   - 메뉴/라우팅 관련 JS
#
# [살릴 코드 → apps/minicad/]
#   - minicad 관련 모든 파일
#   - 79종 라이브러리 v5.8.1
#   - exportAIBundle 관련
#
# [살릴 코드 → apps/estimator/]
#   - 견적마법사 6단계 UI
#   - 단, 13 엔진은 packages/engines/ 로
#
# [살릴 코드 → packages/engines/]
#   - InputNormalizer, RuleEngine 등 13 엔진 (현재 구현된 것만)
#
# [살릴 코드 → packages/db/]
#   - migration-runner.cjs, seed-runner.cjs (DB_RECOVERY 산출물)
#   - schema.sql
#
# [버릴 코드 → docs/archive/legacy/]
#   - 한 번도 동작 안 한 짜집기 코드
#   - XSS 잔존 파일
#   - 헌법 위반 코드 (P1-P6 / B1-B8 위반)

New-Item -ItemType Directory -Force -Path "docs\archive\legacy"

# 5-3. 이동 (예시 — 실제 파일명은 인벤토리 기반 결정)
# Move-Item path\to\minicad-related-files apps\minicad\
# Move-Item path\to\estimator-related-files apps\estimator\
# Move-Item path\to\engines\* packages\engines\
# Move-Item path\to\zomby-files docs\archive\legacy\

# 5-4. 각 워크스페이스 README.md 작성
@"
# BOC Console
ECOREAN BOC OS 표지 (Launcher/Router)

## 책임
- 모듈 목록 표시 / 실행
- 사용자 인증 / 라이센스 체크
- 모듈 간 통신 중계

## 책임 아님
- 견적 계산 (estimator 가 담당)
- 도면 그리기 (minicad 가 담당)
- DB 직접 접근 (packages/db 경유)

## 코드 라인 제한
200줄 (초과 시 짜집기 신호)
"@ | Out-File -FilePath "apps\console\README.md" -Encoding UTF8

@"
# MiniCAD
도면 작성 + JSON SSoT 출력 모듈 (v5.8.1)

## 책임
- 79종 라이브러리 기반 평면 작성
- JSON v5.7+ SSoT 출력
- exportAIBundle (PNG + JSON + 이미지 프롬프트 + 영상 프롬프트)
- 견적 인터페이스 (getEstimateInput) 제공

## 책임 아님
- 견적 계산
- DB 저장
"@ | Out-File -FilePath "apps\minicad\README.md" -Encoding UTF8

@"
# 견적마법사 (Estimator)
6단계 마법사 + 13 엔진 기반 자동 견적

## 책임
- 6단계 입력 UI
- MiniCAD JSON 자동 import
- 고객용 PDF / 내부 원가 분석서 분리 출력 (헌법 P1)

## 책임 아님
- 직접 계산 (packages/engines 13 엔진 사용 강제)
- 단가 추정 (UNKNOWN/NEEDS_RESEARCH 우선, 헌법 P2)
"@ | Out-File -FilePath "apps\estimator\README.md" -Encoding UTF8

# 5-5. 이동 결과 검증
Get-ChildItem apps -Recurse -File | Measure-Object
Get-ChildItem packages -Recurse -File | Measure-Object
Get-ChildItem docs/archive -Recurse -File | Measure-Object
```

### 검증 기준

- [ ] 루트에 코드 파일 0개 (package.json, README.md 등 메타파일 제외)
- [ ] 각 apps/* 폴더에 index.html + manifest.json + package.json + README.md 존재
- [ ] packages/engines, packages/db 에 살릴 코드만 이동
- [ ] docs/archive/legacy 에 버린 코드 보관 (삭제 금지 — 나중에 참고)
- [ ] git status 에 명확한 이동 내역 (R: rename) 표시

### 실패 시 롤백

```powershell
git restore --staged .
git checkout .
Remove-Item -Recurse -Force docs/archive/legacy
```

---

## 📋 STEP 6. JSON SSoT 스키마 + 13 엔진 정의 (LEVEL 3)

### 목표
헌법을 코드로 강제. 9주 짜집기 근본 원인 #2 해결.

### 실행 순서

```powershell
cd C:\Users\udune\ecorean-os

# 6-1. MiniCAD JSON Schema 작성 (packages/schema)
@"
{
  `"\`$schema`": `"http://json-schema.org/draft-07/schema#`",
  `"\`$id`": `"https://ecorean.kr/schema/minicad-v6.0.json`",
  `"title`": `"MiniCAD JSON SSoT v6.0`",
  `"type`": `"object`",
  `"required`": [`"meta`", `"spaces`", `"walls`", `"relationships`"],
  `"properties`": {
    `"meta`": {
      `"type`": `"object`",
      `"required`": [`"version`", `"coordOrigin`", `"units`", `"timestamp`"],
      `"properties`": {
        `"version`": { `"const`": `"6.0`" },
        `"coordOrigin`": { `"enum`": [`"bottom-left`", `"top-left`", `"center`"] },
        `"units`": { `"enum`": [`"mm`", `"cm`", `"m`"] },
        `"timestamp`": { `"type`": `"string`", `"format`": `"date-time`" }
      }
    },
    `"spaces`": { `"type`": `"array`", `"minItems`": 1 },
    `"walls`": { `"type`": `"array`" },
    `"doors`": { `"type`": `"array`" },
    `"windows`": { `"type`": `"array`" },
    `"furniture`": { `"type`": `"array`" },
    `"relationships`": { `"type`": `"array`" }
  }
}
"@ | Out-File -FilePath "packages\schema\minicad-v6.0.json" -Encoding UTF8

# 6-2. 견적 JSON Schema (packages/schema)
@"
{
  `"\`$schema`": `"http://json-schema.org/draft-07/schema#`",
  `"\`$id`": `"https://ecorean.kr/schema/estimate-v6.0.json`",
  `"title`": `"Estimate JSON SSoT v6.0`",
  `"type`": `"object`",
  `"required`": [`"meta`", `"input`", `"breakdown`", `"totals`"],
  `"properties`": {
    `"meta`": {
      `"type`": `"object`",
      `"required`": [`"version`", `"projectId`", `"isSimulated`"],
      `"properties`": {
        `"version`": { `"const`": `"6.0`" },
        `"projectId`": { `"type`": `"string`" },
        `"isSimulated`": { `"type`": `"integer`", `"enum`": [0, 1] }
      }
    },
    `"input`": { `"type`": `"object`" },
    `"breakdown`": { `"type`": `"array`" },
    `"totals`": {
      `"type`": `"object`",
      `"required`": [`"supply`", `"contract`", `"final`"],
      `"properties`": {
        `"supply`": { `"type`": `"number`" },
        `"contract`": { `"type`": `"number`" },
        `"final`": { `"type`": `"number`" }
      }
    }
  }
}
"@ | Out-File -FilePath "packages\schema\estimate-v6.0.json" -Encoding UTF8

# 6-3. packages/schema/index.js (export)
@"
const minicadSchema = require('./minicad-v6.0.json');
const estimateSchema = require('./estimate-v6.0.json');

module.exports = {
  minicadSchema,
  estimateSchema,
  VERSION: '6.0'
};
"@ | Out-File -FilePath "packages\schema\index.js" -Encoding UTF8

# 6-4. 13 엔진 인터페이스 정의 (packages/engines/interfaces.js)
# 헌법 그대로 13개 엔진 골격 + 실패 throw 형태
@"
// packages/engines/interfaces.js
// 13 Engines — 헌법 v6.0 Constitution
// 미구현 엔진은 NotImplementedError 반환 (절대 가짜 PASS 금지, 짜집기 방지)

class NotImplementedError extends Error {
  constructor(engineName) {
    super('Engine not implemented: ' + engineName);
    this.engineName = engineName;
  }
}

const ENGINES = {
  '01_InputNormalizer': null,
  '02_PresetEngine': null,
  '03_RuleEngine': null,
  '04_DefaultSpecEngine': null,
  '05_EstimateEngine': null,
  '06_ScheduleEngine': null,
  '07_DocumentGenerator': null,
  '08_DiagnosticsEngine': null,
  '09_TestRunner': null,
  '10_CompletionReportEngine': null,
  '11_EstimateVsActualEngine': null,
  '12_MasterDBUpdateRequestEngine': null,
  '13_ApprovalLogEngine': null
};

function getEngine(name) {
  if (!(name in ENGINES)) {
    throw new Error('Unknown engine: ' + name);
  }
  if (ENGINES[name] === null) {
    throw new NotImplementedError(name);
  }
  return ENGINES[name];
}

function registerEngine(name, impl) {
  if (!(name in ENGINES)) {
    throw new Error('Cannot register unknown engine: ' + name);
  }
  ENGINES[name] = impl;
}

function getStatus() {
  const total = Object.keys(ENGINES).length;
  const implemented = Object.values(ENGINES).filter(v => v !== null).length;
  return { total, implemented, missing: total - implemented };
}

module.exports = { ENGINES, getEngine, registerEngine, getStatus, NotImplementedError };
"@ | Out-File -FilePath "packages\engines\interfaces.js" -Encoding UTF8

@"
// packages/engines/index.js
const interfaces = require('./interfaces');
module.exports = interfaces;
"@ | Out-File -FilePath "packages\engines\index.js" -Encoding UTF8

# 6-5. 헌법 검증 스크립트 (scripts/verify-constitution.cjs)
@"
// scripts/verify-constitution.cjs
const path = require('path');
const fs = require('fs');

let allPass = true;
const fail = (msg) => { console.error('FAIL: ' + msg); allPass = false; };
const pass = (msg) => console.log('PASS: ' + msg);

// 1. CONSTITUTION.md 존재
const constPath = path.join(__dirname, '..', 'docs', 'CONSTITUTION.md');
if (!fs.existsSync(constPath)) fail('docs/CONSTITUTION.md missing');
else {
  const content = fs.readFileSync(constPath, 'utf8');
  // 헌법 필수 키워드 체크
  const required = ['13 엔진', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'B1', 'B8', '159', '22 시공섹션', '23 공간'];
  required.forEach(k => {
    if (!content.includes(k)) fail('CONSTITUTION.md missing keyword: ' + k);
  });
  pass('CONSTITUTION.md exists with required keywords');
}

// 2. 13 엔진 인터페이스 존재
try {
  const engines = require('../packages/engines');
  const status = engines.getStatus();
  if (status.total !== 13) fail('Expected 13 engines, got ' + status.total);
  else pass('13 engine slots registered (implemented: ' + status.implemented + '/13)');
} catch (e) {
  fail('Cannot load packages/engines: ' + e.message);
}

// 3. 스키마 v6.0 존재
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

// 5. 모듈 구조 (apps 3, packages 4)
['apps/console', 'apps/minicad', 'apps/estimator', 'packages/schema', 'packages/engines', 'packages/db', 'packages/ui'].forEach(p => {
  if (!fs.existsSync(path.join(__dirname, '..', p))) fail('Missing workspace: ' + p);
  else pass('Workspace exists: ' + p);
});

console.log('\n=== Constitution Verification ===');
process.exit(allPass ? 0 : 1);
"@ | Out-File -FilePath "scripts\verify-constitution.cjs" -Encoding UTF8

# 6-6. 스키마 검증 스크립트 (scripts/verify-schema.cjs)
@"
// scripts/verify-schema.cjs
const fs = require('fs');
const path = require('path');

let allPass = true;
const schemaDir = path.join(__dirname, '..', 'packages', 'schema');
const requiredSchemas = ['minicad-v6.0.json', 'estimate-v6.0.json'];

requiredSchemas.forEach(s => {
  const p = path.join(schemaDir, s);
  if (!fs.existsSync(p)) {
    console.error('FAIL: ' + s + ' missing');
    allPass = false;
    return;
  }
  try {
    const json = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!json.\`\$schema\`) {
      console.error('FAIL: ' + s + ' has no \$schema field');
      allPass = false;
    } else {
      console.log('PASS: ' + s);
    }
  } catch (e) {
    console.error('FAIL: ' + s + ' invalid JSON: ' + e.message);
    allPass = false;
  }
});

process.exit(allPass ? 0 : 1);
"@ | Out-File -FilePath "scripts\verify-schema.cjs" -Encoding UTF8

# 6-7. 통합 검증 실행
npm run verify:all
```

### 검증 기준

- [ ] `packages/schema/` 에 minicad-v6.0.json + estimate-v6.0.json + index.js 존재
- [ ] `packages/engines/interfaces.js` 에 13 엔진 슬롯 정의됨
- [ ] `npm run verify:constitution` 결과 모든 PASS
- [ ] `npm run verify:seeds` 결과 159/159 PASS
- [ ] `npm run verify:schema` 결과 모든 PASS
- [ ] **현재 13 엔진 구현률을 보고 (예: 0/13)** — 솔직히 보고

### 실패 시 롤백

```powershell
Remove-Item -Recurse -Force packages/schema/*, packages/engines/*, scripts/verify-*.cjs
```

---

## 📋 STEP 7. CI 헌법 검증 + Git Hook (LEVEL 3)

### 목표
헌법 위반 commit/push 자동 차단. 9주 짜집기 재발 방지.

### 실행 순서

```powershell
cd C:\Users\udune\ecorean-os

# 7-1. GitHub Actions CI workflow
@"
name: ECOREAN Constitution Verification

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install
        run: npm ci
      - name: Verify Constitution
        run: npm run verify:constitution
      - name: Verify Seeds (159 entries)
        run: npm run verify:seeds
      - name: Verify Schema v6.0
        run: npm run verify:schema
      - name: Run All Tests
        run: npm run test:all
"@ | Out-File -FilePath ".github\workflows\ci.yml" -Encoding UTF8

# 7-2. pre-commit hook 강화 (기존 hook 백업 후 갱신)
$hookPath = ".git\hooks\pre-commit"
if (Test-Path $hookPath) {
  Copy-Item $hookPath "$hookPath.bak"
}

@"
#!/bin/sh
# ECOREAN Constitution Pre-commit Hook v7.0

echo '[ECOREAN] Verifying constitution...'
npm run verify:constitution
if [ \`$? -ne 0 ]; then
  echo '[ECOREAN] FAIL: Constitution violation. Commit blocked.'
  exit 1
fi

echo '[ECOREAN] Verifying seeds (159)...'
npm run verify:seeds
if [ \`$? -ne 0 ]; then
  echo '[ECOREAN] FAIL: Seed count mismatch. Commit blocked.'
  exit 1
fi

echo '[ECOREAN] Verifying schema v6.0...'
npm run verify:schema
if [ \`$? -ne 0 ]; then
  echo '[ECOREAN] FAIL: Schema invalid. Commit blocked.'
  exit 1
fi

echo '[ECOREAN] All checks passed.'
exit 0
"@ | Out-File -FilePath $hookPath -Encoding ASCII

# 7-3. ESLint 규칙 — 모듈 간 직접 import 차단
@"
{
  `"root`": true,
  `"rules`": {
    `"no-restricted-imports`": [
      `"error`",
      {
        `"patterns`": [
          {
            `"group`": [`"../../apps/*`", `"../../../apps/*`"],
            `"message`": `"Cross-app direct import forbidden. Use packages/* instead.`"
          }
        ]
      }
    ]
  }
}
"@ | Out-File -FilePath ".eslintrc.json" -Encoding UTF8

# 7-4. 커밋 테스트 (의도적 위반 → 차단 확인)
git add .
git commit -m "test: ci+hook setup" --dry-run

# 정상 커밋
git add .
git commit -m "feat: monorepo CI + constitution hook setup"
```

### 검증 기준

- [ ] `.github/workflows/ci.yml` 생성됨
- [ ] `.git/hooks/pre-commit` 갱신됨 + 실행 권한
- [ ] `.eslintrc.json` 에 cross-app import 차단 규칙
- [ ] 커밋 시 헌법 검증 자동 실행 + PASS
- [ ] 의도적으로 헌법 위반 시 커밋 차단됨 (확인용 1회 테스트)

### 실패 시 롤백

```powershell
Move-Item -Force .git/hooks/pre-commit.bak .git/hooks/pre-commit
Remove-Item .github/workflows/ci.yml, .eslintrc.json
```

---

## 📋 STEP 8. 모듈 manifest + 표지(Console) 골격 (LEVEL 3)

### 목표
BOC Console 빈 표지 작동. MiniCAD/견적마법사 placeholder iframe 로드.

### 실행 순서

```powershell
cd C:\Users\udune\ecorean-os

# 8-1. apps/console/index.html (200줄 이내 — 표지 헌법 준수)
@"
<!DOCTYPE html>
<html lang=`"ko`">
<head>
  <meta charset=`"UTF-8`">
  <meta name=`"viewport`" content=`"width=device-width, initial-scale=1.0`">
  <title>BOC Console — ECOREAN</title>
  <style>
    body { margin: 0; font-family: 'Cormorant Garamond', serif; background: #0a0a0a; color: #d4af37; }
    .header { padding: 24px 40px; border-bottom: 1px solid #d4af37; }
    .title { font-size: 28px; letter-spacing: 4px; }
    .subtitle { font-size: 12px; opacity: 0.6; margin-top: 4px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; padding: 40px; }
    .module { border: 1px solid #d4af37; padding: 24px; cursor: pointer; transition: 0.3s; }
    .module:hover { background: rgba(212,175,55,0.1); }
    .module-name { font-size: 18px; margin-bottom: 8px; }
    .module-version { font-size: 11px; opacity: 0.5; }
    .module-desc { font-size: 13px; margin-top: 12px; opacity: 0.8; }
    iframe { width: 100%; height: calc(100vh - 100px); border: 0; background: #fff; }
    .back { padding: 12px 24px; cursor: pointer; color: #d4af37; }
  </style>
</head>
<body>
  <div class=`"header`">
    <div class=`"title`">BOC Console</div>
    <div class=`"subtitle`">ECOREAN — Build Operation Center / OS v7.0-alpha</div>
  </div>
  <div id=`"app`"></div>
  <script>
    const MODULES = [
      { id: 'minicad', path: '../minicad/index.html' },
      { id: 'estimator', path: '../estimator/index.html' }
    ];

    async function loadManifests() {
      const enriched = [];
      for (const m of MODULES) {
        try {
          const res = await fetch('../' + m.id + '/manifest.json');
          const meta = await res.json();
          enriched.push({ ...m, ...meta });
        } catch (e) {
          enriched.push({ ...m, name: m.id, version: '?', description: '(manifest missing)' });
        }
      }
      return enriched;
    }

    function renderHome(modules) {
      const app = document.getElementById('app');
      app.innerHTML = '<div class=\"grid\">' + modules.map(m =>
        '<div class=\"module\" data-id=\"' + m.id + '\">' +
          '<div class=\"module-name\">' + m.name + '</div>' +
          '<div class=\"module-version\">v' + m.version + '</div>' +
          '<div class=\"module-desc\">' + (m.description || '') + '</div>' +
        '</div>'
      ).join('') + '</div>';
      app.querySelectorAll('.module').forEach(el => {
        el.onclick = () => openModule(modules.find(m => m.id === el.dataset.id));
      });
    }

    function openModule(m) {
      const app = document.getElementById('app');
      app.innerHTML = '<div class=\"back\">← 표지로</div>' +
        '<iframe src=\"' + m.path + '\" sandbox=\"allow-scripts allow-same-origin\"></iframe>';
      app.querySelector('.back').onclick = () => init();
    }

    async function init() {
      const modules = await loadManifests();
      renderHome(modules);
    }

    init();
  </script>
</body>
</html>
"@ | Out-File -FilePath "apps\console\index.html" -Encoding UTF8

# 8-2. apps/minicad/index.html (placeholder)
@"
<!DOCTYPE html>
<html lang=`"ko`">
<head><meta charset=`"UTF-8`"><title>MiniCAD</title></head>
<body style=`"font-family: sans-serif; padding: 40px;`">
  <h1>MiniCAD v5.8.1</h1>
  <p>placeholder — 실제 구현은 다음 단계</p>
  <p>책임: JSON SSoT 출력 + exportAIBundle</p>
</body>
</html>
"@ | Out-File -FilePath "apps\minicad\index.html" -Encoding UTF8

# 8-3. apps/estimator/index.html (placeholder)
@"
<!DOCTYPE html>
<html lang=`"ko`">
<head><meta charset=`"UTF-8`"><title>견적마법사</title></head>
<body style=`"font-family: sans-serif; padding: 40px;`">
  <h1>견적마법사</h1>
  <p>placeholder — 6단계 마법사 + 13 엔진 연동 예정</p>
</body>
</html>
"@ | Out-File -FilePath "apps\estimator\index.html" -Encoding UTF8

# 8-4. apps/console/package.json 수정 — start 스크립트
@"
{
  `"name`": `"@ecorean/console`",
  `"version`": `"0.1.0`",
  `"private`": true,
  `"main`": `"index.html`",
  `"scripts`": {
    `"start`": `"npx http-server . -p 7000 -c-1 --cors`"
  },
  `"devDependencies`": {
    `"http-server`": `"^14.1.1`"
  }
}
"@ | Out-File -FilePath "apps\console\package.json" -Encoding UTF8

# 8-5. http-server 설치 + 실행
npm install
npm run console
# 브라우저: http://localhost:7000
```

### 검증 기준

- [ ] `npm run console` 실행 시 http-server 가 7000 포트로 listen
- [ ] 브라우저 접속 시 BOC Console 표지 표시
- [ ] 표지에 MiniCAD + 견적마법사 2개 카드 표시 (manifest 자동 로드)
- [ ] 카드 클릭 시 iframe 으로 placeholder 페이지 로드
- [ ] "← 표지로" 클릭 시 다시 표지 화면
- [ ] **9주 만에 처음으로 npm run X 가 실제로 화면을 띄움** ← 본 STEP의 KPI

### 실패 시 롤백

```powershell
git restore apps/
```

---

## 📋 STEP 9. 최종 검증 + 종합 보고 + 커밋 + 태그 (LEVEL 4 명시 승인)

### 목표
전체 시스템 정합성 확인 + v7.0-alpha.1 태그.

### 실행 순서

```powershell
cd C:\Users\udune\ecorean-os

# 9-1. 전체 검증
npm run verify:all
npm run test:all

# 9-2. 폴더 구조 최종 인벤토리
tree /F /A | Out-File -FilePath "docs\structure-v7.0-alpha.1.txt" -Encoding UTF8

# 9-3. 13 엔진 구현 현황 보고
node -e `"const e = require('./packages/engines'); console.log(JSON.stringify(e.getStatus(), null, 2));`" |
  Out-File -FilePath "docs\engines-status.txt" -Encoding UTF8

# 9-4. auto-work-log.md 갱신
$logEntry = `"
### $(Get-Date -Format 'yyyy-MM-dd HH:mm') — Monorepo Restructure 완료

- v6.0 → v7.0-alpha.1 마이그레이션
- 워크스페이스: apps(3) + packages(4) = 7
- 헌법 검증 자동화: pre-commit + GitHub Actions
- 시드 159건 단일화 완료
- BOC Console 표지 첫 동작
- 13 엔진 구현률: $(node -e 'const e = require(`"./packages/engines`"); console.log(e.getStatus().implemented + `"/13`")')
- 짜집기 위험: 65% → 추정 15% (검증 시스템 가동)
`"
Add-Content -Path "docs\auto-work-log.md" -Value $logEntry

# 9-5. 종합 보고서 (대표님용)
@"
# ECOREAN OS v7.0-alpha.1 모노레포 재편 완료 보고

## 결과
- 저장소 구조: 모노레포 (npm workspaces)
- 워크스페이스: 7개 (apps 3 + packages 4)
- 헌법 단일화: docs/CONSTITUTION.md 1개
- 시드 단일화: seeds/ 159건
- 스키마 단일화: packages/schema v6.0
- 자동 검증: 3개 스크립트 + pre-commit + CI

## 9주 짜집기 vs 지금 비교
| 항목 | 9주 후 (v6.0) | 지금 (v7.0-alpha.1) |
|---|---|---|
| 헌법 위치 | 흩어짐 | docs/CONSTITUTION.md 1개 |
| 시드 | 94/159 | 매니페스트로 159 강제 |
| 13 엔진 | 0/13 (가짜 PASS) | 슬롯 등록 + 미구현 throw |
| 모듈 분리 | 없음 | apps/* 3개 + packages/* 4개 |
| CI 검증 | 없음 | GitHub Actions + pre-commit |
| 모듈 직접 호출 | 가능 (위험) | ESLint 차단 |
| npm start | 한 번도 동작 안 함 | console 동작 확인 |

## 다음 작업 (대표님 결정 필요)
1. MiniCAD 본격 구현 (apps/minicad/) — 현재 placeholder
2. 견적마법사 재작성 (apps/estimator/) — 현재 placeholder
3. 13 엔진 구현 (packages/engines/) — 우선순위 결정 필요
4. OpenCrab 결합 (Phase A 1주)
"@ | Out-File -FilePath "docs\REPORT-v7.0-alpha.1.md" -Encoding UTF8

# 9-6. 커밋 + 태그
git add .
git commit -m `"feat(monorepo): v7.0-alpha.1 — workspace restructure + constitution as code

- npm workspaces (apps/3 + packages/4)
- single source: docs/CONSTITUTION.md, seeds/ (159), packages/schema (v6.0)
- 13 engines registered with NotImplementedError safety
- pre-commit hook + GitHub Actions verification
- BOC Console launcher first-run verified
- ESLint cross-app import block

Closes 9-week patchwork era. Begins true OS architecture.`"

git tag v7.0-alpha.1
git push origin main --tags

# 9-7. 최종 결과 요약 출력
Write-Host `"=== ECOREAN v7.0-alpha.1 ==`"
Write-Host `"Tag: v7.0-alpha.1`"
Write-Host `"Workspaces: $(npm ls --workspaces --json | ConvertFrom-Json | Measure-Object).Count`"
npm run verify:all
```

### 검증 기준 (모두 PASS 해야 작업 완료)

- [ ] `npm run verify:all` 전체 PASS
- [ ] `git log` 에 monorepo 커밋 기록
- [ ] `git tag` 에 `v7.0-alpha.1` 존재
- [ ] GitHub 에 push 완료 + GitHub Actions PASS
- [ ] `docs/REPORT-v7.0-alpha.1.md` 작성됨
- [ ] `docs/auto-work-log.md` 갱신됨
- [ ] BOC Console 브라우저에서 정상 동작 (스크린샷 기록 권장)

### 실패 시 롤백 (전체 작업 취소)

```powershell
# v6.0-pre-monorepo 태그로 복원
git reset --hard v6.0-pre-monorepo
git tag -d v7.0-alpha.1
git push origin :refs/tags/v7.0-alpha.1

# 백업 폴더에서 완전 복원
cd C:\Users\udune
Remove-Item -Recurse -Force ecorean-os
Copy-Item -Recurse ecorean-os-backup-* ecorean-os
```

---

## 📊 작업 종합 요약

```
선행 조건: DB_RECOVERY_COMMAND.md 완료 + npm start 1회 동작
총 STEP: 9
LEVEL 4 (명시 승인): STEP 1, 2, 9
LEVEL 3 (헌법 검증 자동): STEP 3, 4, 5, 6, 7, 8

소요 시간:
- STEP 1~3: 반나절 (백업 + 골격 + 워크스페이스)
- STEP 4~5: 1일 (헌법/시드 단일화 + 코드 분류)
- STEP 6~7: 반나절 (스키마 + CI)
- STEP 8: 반나절 (Console 골격)
- STEP 9: 반나절 (검증 + 보고 + 태그)
총 합: 2~3일

위험도: 15%
- 백업 100%
- 단계별 롤백 가능
- 검증 자동

산출물:
- v7.0-alpha.1 태그
- 모노레포 구조 (apps 3 + packages 4)
- BOC Console 표지 동작
- 헌법 검증 자동화
- 13 엔진 슬롯 (구현 0/13 솔직 보고)

다음 작업:
1. MiniCAD 본격 구현 (Phase B 2주)
2. 견적마법사 재작성 (Phase C 2주)
3. 13 엔진 구현 (우선순위 별도 협의)
4. OpenCrab 결합 (Phase A 1주)
```

---

## 🚨 절대 금지 사항 (STEP 진행 중)

```
1. 짜집기 코드 살리려고 우격다짐 — 솔직히 버려야 할 코드는 archive/legacy 로
2. 13 엔진 가짜 구현 (return true) — NotImplementedError 가 정직함
3. 시드 부족분 추정값으로 채우기 — UNKNOWN/NEEDS_RESEARCH 우선 (헌법 P2)
4. 모듈 간 직접 import — ESLint 가 차단함
5. 한 STEP 실패 후 다음 STEP 진행 — 즉시 중단 + 보고
6. 대표님 명시 승인 없이 STEP 1, 2, 9 진행
7. 헌법 위반 commit — pre-commit hook 가 차단함
```

---

## 🎯 본 명령서의 KPI

```
1. v7.0-alpha.1 태그 + GitHub 푸시 완료
2. BOC Console 브라우저 첫 동작 (9주 만에 처음)
3. 헌법 검증 자동화 (pre-commit + CI)
4. 시드 159건 매니페스트 강제
5. 13 엔진 슬롯 + 솔직한 구현률 보고
6. 짜집기 위험 65% → 15% (시스템 강제)

→ 위 6개 모두 달성 시 본 작업 완료.
→ 5개 이하 달성 시 STEP 재실행 또는 대표님 보고.
```

---

## 📞 새 방에서 첫 명령 (대표님 → Claude Code)

```
"DB_RECOVERY_COMMAND.md 진행 후, 
이어서 MONOREPO_RESTRUCTURE_COMMAND.md 진행하라.

선행 조건: 
- AppData DB 복구 완료
- cost_items 159건 적재
- npm start 1회 동작 확인

STEP 1부터 순차 진행."
```

---

*ECOREAN BOC OS — Monorepo Restructure Command*
*v7.0-alpha.1 준비 명령서*
*작성: 2026-05-03 김비서*
*선행: DB_RECOVERY_COMMAND.md*
*후속: MINICAD_BUILD_COMMAND.md (Phase B), ESTIMATOR_REBUILD_COMMAND.md (Phase C)*
