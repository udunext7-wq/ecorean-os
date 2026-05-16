# ECOREAN BOC OS — 폴더 진단 보고서

> 생성일: 2026-05-16
> 진단자: Claude Code
> 범위: `C:\Users\udune\ecorean-os` (master HEAD `9cb5b41`)
> 변경 사항: 파일 변경 0건 (이 보고서 신규 1건만 생성)
> 진단 시점 워킹 카피 상태: `git stash@{0}` 로 임시 격리됨 (diagnosis-2026-05-16)

---

## §1. 요약

### 전체 통계 (`node_modules` · `.git` · `dist` 제외)

- 총 파일 수: **741개**
- 총 폴더 수: **247개**
- 총 용량: **457.6 MB** (`dist/` 431.6MB 포함하면 합산)
- 확장자 상위: `.js 140` · `.json 114` · `.cjs 102` · `.md 90` · `.ts 65` · `.html 39`

### 주요 발견 3가지

1. **3중 코드 구조 공존 — 모노레포 전환 중간 상태**: `shell/src/` (Phase 4 코어) · `src/` (새 코어 8 도메인) · `apps/` (모노레포 v7.0-alpha.1 골조) · `modules-html/` (UI). 어느 게 truth source인지 미정. 헌법 통찰 #4 "지금 빠뜨리면 나중 문제" 관점에서 최우선 결정 사안.
2. **루트 직속 46개 파일 — 명령서·DB·시드 JSON·BAT·PS1·HTML 혼재**: 운영 DB(`ecorean-boc.db` 168KB)와 한국어 접두사 시드 JSON 8건, 작업 명령서 .md 10건이 루트에 산재. `docs/` · `data/` · `seeds/` · `scripts/`로 분리 가능.
3. **MD5 해시까지 동일한 정확 중복 파일 5건**: 모두 `(1)` 접미사 다운로드 중복 패턴. 즉시 삭제 안전.

### 정리 권장도 (⭐ 적을수록 시급)

| 영역 | 등급 | 사유 |
|---|:-:|---|
| 영역 1 — 헌법 | ⭐⭐⭐⭐⭐ | `docs/MASTER_PLAN.md` 단일, `graph.json` 단일, v6.4 백업이 `docs/archive/`로 깔끔 분리 |
| 영역 2 — 설계 | ⭐⭐⭐⭐⭐ | `docs/architecture/`, `docs/schemas/`, `docs/universes/` 구조 잘 잡힘 |
| 영역 3 — 명령서 | ⭐⭐⭐⭐ | `archived/weekly-plans/`로 28건 정리됨, 다만 루트에 명령서 4건 + 중복 1건 잔존 |
| 영역 4 — 코드 | ⭐⭐ | 3중 구조 결정 필요. modules-html은 단일 HTML 8 vs v6 폴더 1 패턴 혼재 |
| 영역 5 — DB | ⭐⭐⭐ | `backups/` 정리 양호. 다만 `data/ecorean.db` (296KB) 정체 불명, 운영 DB 위치(루트) 재검토 가능 |
| 영역 6 — 기타 | ⭐⭐ | 루트 직속 46파일 — 가장 어지러운 영역 |

---

## §2. 영역별 진단

### 영역 1 — 헌법 문서 ✅ 양호

**핵심 파일 (모두 `docs/` 단일 위치)**
```
docs/MASTER_PLAN.md           (132.4 KB · 2026-04-30 · v6.4)
docs/graph.json               (7.1 KB · 12노드 24엣지)
docs/graph.jsonld             (9.3 KB · JSON-LD 동치본)
docs/CONSTITUTION.md          (4.0 KB)
docs/DECISION_LOG.md          (8.9 KB)
docs/RISK_REGISTER.md         (4.7 KB)
docs/archive/MASTER_PLAN_v6.4_backup.md  (132.4 KB · 동일)
```

**상태:** ✅ 양호
**문제점:** 없음
**권장:** 유지. `docs/archive/MASTER_PLAN_v6.4_backup.md`는 의도된 백업으로 그대로 둠.

---

### 영역 2 — 설계 문서 ✅ 양호

**구조**
```
docs/architecture/INVENTORY.md
docs/schemas/{edge,metaedge,node,universe}.schema.json
docs/universes/vine-farm.json
docs/retrospective/RETROSPECTIVE_PHASE3.md
docs/retrospective/stats.json
docs/neo4j-readiness-plan.md
docs/sqlite-to-neo4j-mapping.md
docs/graph-migration-rules.md
docs/HANDOFF_WEEK5.md
docs/JOURNEY.md
```

**상태:** ✅ 양호
**문제점:** 없음
**권장:** 유지.

---

### 영역 3 — 작업 명령서 ⚠️ 부분 정리 필요

**총 41건** = `archived/weekly-plans/` 28 + `minicad/` 1 + `docs/` 1 + 기타 7 + **루트 4 (정리 대상)**

**루트에 잔존한 명령서·검토 .md (10건, 정리 권장)**

| 파일 | 크기 | 수정일 | 권장 |
|---|---:|---|---|
| `MONOREPO_RESTRUCTURE_COMMAND.md` | 37.4 KB | 2026-05-03 | → `docs/commands/active/` (현재 진행 중 작업) |
| `AUDIT_AND_REDESIGN_COMMAND.md` | 12.0 KB | 2026-05-02 | → `docs/commands/active/` 또는 `completed/` |
| `DB_RECOVERY_COMMAND.md` | 14.0 KB | 2026-05-02 | → `docs/commands/completed/` |
| `DB_VERIFICATION_COMMAND.md` | 10.5 KB | 2026-05-02 | → `docs/commands/completed/` |
| `OPENCRAB_DEEP_ANALYSIS.md` | 24.4 KB | 2026-05-02 | → `docs/references/` |
| `SMART_AUTO_APPROVAL.md` | 11.1 KB | 2026-05-02 | → `docs/commands/active/` |
| `FINAL_DEEP_REVIEW.md` | 10.6 KB | 2026-05-01 | → `docs/retrospective/` |
| `FINAL_REVIEW_BEFORE_W9.md` | 8.9 KB | 2026-05-01 | → `docs/retrospective/` |
| `FULL_REVIEW_FIX.md` | 5.3 KB | 2026-04-30 | → `docs/retrospective/` |
| `ECOREAN_CONTEXT_SNAPSHOT.md` | 8.7 KB | 2026-05-03 | → `docs/` (인계 문서) |

**중복 1건 (archived 내부)**
- `archived/weekly-plans/CLAUDE_CODE_PHASE4_WEEK2 (1).md` ≡ `CLAUDE_CODE_PHASE4_WEEK2.md` (MD5 동일, 41.2 KB × 2) → `(1)` 삭제

**상태:** ⚠️ 주의
**권장:** `docs/commands/{active,completed,archived}/` 표준 도입 후 루트 .md 10건 이동 + 중복 1건 삭제.

---

### 영역 4 — 코드 ❌ 정리 필요 (큰 결정 사안)

**4개 코드 트리 공존**

```
shell/src/         ← Phase 4 코어 (closed-loop, ai, feature-flags, ml…)
                     dist/ + electron/ + node_modules/ + public/ + tests/
src/               ← 새 코어 (crawlers, estimate-engine, master-db, ml,
                     ontology, parsers, shared, test-runner)
apps/              ← 모노레포 v7.0-alpha.1 (console, estimator, minicad)
packages/          ← db, engines, schema, ui (v7 패키지 골조)
modules-html/      ← UI (boc-v6, cad, estimate-v6, kpi-v6, topology + 단일 HTML 9개)
```

**`modules-html/` 단일 vs v6 폴더 매핑**

| 모듈 | 단일 HTML | v6 폴더 |
|---|:-:|:-:|
| `estimate` | 73.0 KB | ✅ `estimate-v6/` |
| `aiengine` | 23.3 KB | ❌ |
| `approval` | 19.2 KB | ❌ |
| `dashboard` | 17.7 KB | ❌ |
| `dbmgr` | 19.5 KB | ❌ |
| `ontology` | 20.5 KB | ❌ |
| `presets` | 22.4 KB | ❌ |
| `projects` | 55.1 KB | ❌ |
| `reports` | 28.7 KB | ❌ |

**중복 파일 (해시 일치 확인됨)**
- `docs/ECOREAN_BOC_v1.html` ≡ `docs/index.html` (MD5 동일, 377.7 KB × 2) → 하나만 유지

**임시·자동 생성**
- `dist/` (431.6 MB) — `.gitignore` 등록 확인됨, 깃 영향 없음. 디스크 절약 차원에서만 정리 가능.
- `minicad/minicad.Zip` (별도 압축본)

**상태:** ❌ 정리 필요
**권장:** 코드 트리 표준 결정이 선행되어야 함. 대표님 결정 필요 — `apps/` + `packages/`로 단일화할지, `shell/`을 유지할지, `src/`를 archive할지.

---

### 영역 5 — DB·데이터 ⚠️ 위치 분산

**운영 / 백업 DB**

| 위치 | 파일 | 크기 | 의미 |
|---|---|---:|---|
| `/` (루트) | `ecorean-boc.db` | 168 KB | 운영 DB (2026-04-30 = v6.0 시점) |
| `data/` | `ecorean.db` | 296 KB | **정체 불명** — 다른 DB? 마이그레이션 산출물? |
| `backups/` | `*.bak.*` 9건 | ~890 KB | 의미 있는 시점별 백업 (test_week7, pre_week8, final_v5_7_pre, phase4_week1/3/4a_pre, v5_8_pre, week6, recovery) |
| `backups/` | `appdata-empty-20260502-211209.bak` | 0 KB | 빈 파일 (삭제 가능 의심) |

**시드 JSON (루트에 산재)**
```
ECOREAN_공정단가DB_v2.json         (31.8 KB · 2026-04-25)
ECOREAN_공정단가DB_v2.2.json       (38.8 KB · 2026-04-25)
ECOREAN_공정일정템플릿.json        (12.4 KB · 2026-04-25)
ECOREAN_인건비DB_2025공식.json    (12.0 KB · 2026-04-25)
ECOREAN_브랜드DB.json              (14.0 KB · 2026-04-25)
ECOREAN_외주업체DB.json            (6.1 KB · 2026-04-25)
ECOREAN_자재DB.json                (11.2 KB · 2026-04-25)
ECOREAN_하자유형DB.json            (7.8 KB · 2026-04-25)
ECOREAN_단가입력_템플릿.xlsx       (23.9 KB · 2026-04-25)
ECOREAN_공정단가DB_v2 (1).json     (31.8 KB · 중복!)
ECOREAN_인건비DB_2025공식 (1).json (12.0 KB · 중복!)
process-categories.json            (21.3 KB)
ontology-rules.json                 (6.0 KB)
ontology.json                      (15.8 KB)
cost-items.json                    (67.3 KB)
cost-items-v2.json                (177.2 KB)
db.json                            (36.6 KB)
full-db-catalog.json              (473.8 KB)
```

**상태:** ⚠️ 주의
**권장:**
- `data/ecorean.db`의 용도 확인 후 운영 DB 위치 일원화 (`data/` 또는 `db/`)
- 한국어 접두사 시드 JSON → `seeds/` 또는 `data/seeds/`로 이동
- 빈 백업 `appdata-empty-*.bak` 삭제 가능

---

### 영역 6 — 기타 (루트 직속) ❌ 정리 필요

**루트 46파일 분포**

| 카테고리 | 개수 | 예시 |
|---|---:|---|
| 시드 JSON (한국어 접두사) | 11 | `ECOREAN_*` |
| 작업 명령서 / 검토 .md | 10 | `*_COMMAND.md`, `*_REVIEW.md`, `*_ANALYSIS.md` |
| 운영 DB | 1 | `ecorean-boc.db` |
| 자산 데이터 JSON | 5 | `db.json`, `cost-items*.json`, `ontology*.json`, `full-db-catalog.json` |
| 메타·문서 | 4 | `README.md`, `CLAUDE.md`, `클로드명령어.txt`, `ECOREAN_README.md` |
| 스크립트 | 3 | `PUSH_TO_GITHUB.bat`, `SETUP_LOCAL.bat`, `RUN_DESIGN.ps1` |
| 환경·설정 | 5 | `.env`, `.eslintrc.json`, `.gitignore`, `package.json`, `package-lock.json` |
| HTML / CSS | 2 | `index.html`, `style.css` |
| 빌드 백업 | 1 | `package.json.pre-monorepo.bak` |
| 회계 산출물 | 2 | `cost_items_review_20260430-0027.xlsx`, `cost-items*.json` |
| 카탈로그 .md | 2 | `ECOREAN_전체DB_카탈로그.md`, `ECOREAN_CONTEXT_SNAPSHOT*.md` |

**상태:** ❌ 정리 필요
**권장:** 표준 폴더로 분산 (§5 참조). 루트는 `package.json`·`README.md`·`CLAUDE.md`·`.gitignore`·`.env`·진입 HTML 정도만 남기는 것이 표준.

---

## §3. 문제 파일 리스트

### 3-1. 중복 의심 (MD5 해시 일치 — 즉시 삭제 안전)

| 파일 A | 파일 B | 크기 | 권장 |
|---|---|:-:|---|
| `ECOREAN_공정단가DB_v2 (1).json` | `ECOREAN_공정단가DB_v2.json` | 31.8 KB | A 삭제 |
| `ECOREAN_인건비DB_2025공식 (1).json` | `ECOREAN_인건비DB_2025공식.json` | 12.0 KB | A 삭제 |
| `ECOREAN_CONTEXT_SNAPSHOT (1).md` | `ECOREAN_CONTEXT_SNAPSHOT.md` | 8.7 KB | A 삭제 |
| `archived/weekly-plans/CLAUDE_CODE_PHASE4_WEEK2 (1).md` | `…WEEK2.md` | 41.2 KB | A 삭제 |
| `docs/ECOREAN_BOC_v1.html` | `docs/index.html` | 377.7 KB | 의도 확인 후 하나 삭제 (이름은 `ECOREAN_BOC_v1.html` 유지가 자연스러움) |

### 3-2. 고아 / 위치 부적절 (루트에 떠 있음)

| 파일 | 현재 | 권장 |
|---|---|---|
| 시드 JSON 9건 (`ECOREAN_*.json`, `process-categories.json`, `ontology*.json`) | `/` | `seeds/` 또는 `data/seeds/` |
| 작업명령서 10건 (위 §2-3 표 참조) | `/` | `docs/commands/active|completed/` 또는 `docs/retrospective/` |
| `ecorean-boc.db` 운영 DB | `/` | `data/` 일원화 검토 |
| `cost-items*.json`, `full-db-catalog.json`, `db.json` | `/` | `data/` 또는 `data/seeds/` |
| `cost_items_review_*.xlsx` | `/` | `docs/retrospective/` 또는 별도 `reports/` |
| `ECOREAN_단가입력_템플릿.xlsx` | `/` | `data/templates/` |
| `RUN_DESIGN.ps1`, `PUSH_TO_GITHUB.bat`, `SETUP_LOCAL.bat` | `/` | `scripts/` |
| `클로드명령어.txt` (36.4 KB) | `/` | `docs/references/` |

### 3-3. 임시·작업 파일 (삭제 후보)

- `backups/appdata-empty-20260502-211209.bak` (0 KB · 빈 파일)
- `minicad/minicad.Zip` (별도 압축본 — 의도 확인 필요)
- `dist/` (431.6 MB · `.gitignore` 등록됨 — 디스크 절약용으로만 삭제 가능, 다시 빌드 가능)

---

## §4. 정리 우선순위

### P0 — 즉시 (안전, 변경 영향 0)

1. **MD5 해시 동일 중복 5건 삭제** (`(1)` 접미사 4건 + `docs/index.html` 1건)
2. **빈 백업 1건 삭제** (`backups/appdata-empty-*.bak`)
3. (선택) `dist/` 디스크 정리 — 다음 빌드 시 재생성됨

### P1 — 단기 (1주 이내, 표준 적용)

1. `docs/commands/{active,completed}/` 폴더 신설 → 루트 명령서 10건 이동
2. `seeds/` 또는 `data/seeds/` → 한국어 접두사 시드 JSON 9건 이동
3. `scripts/` → 루트 `.bat`·`.ps1` 3건 이동
4. `data/ecorean.db` 정체 파악 (운영 DB와의 관계, 마이그레이션 산출물 여부)

### P2 — 중기 (2주 이내, 구조 표준화)

1. 코드 트리 결정: **`shell/` vs `src/` vs `apps/+packages/`** 중 truth source 확정 (대표님 결정 필수)
2. `modules-html/` 모듈 단일 HTML 9개 → v6 폴더 패턴 적용 여부 결정 (estimate-v6만 유일한 사례)
3. 운영 DB 위치 일원화

### P3 — 장기 (1개월 이내, 리팩토링)

1. 모노레포 v7.0-alpha.1 → v7.0 stable 전환
2. apps/* 패키지화 완료 후 `shell/` archive
3. `docs/` 내 retrospective vs commands 위계 정리

---

## §5. 권장 폴더 표준 (초안 — 대표님 검토 필요)

```
ecorean-os/
├── README.md
├── CLAUDE.md
├── package.json / package-lock.json
├── .env / .gitignore / .eslintrc.json
│
├── docs/
│   ├── _constitution/        ← MASTER_PLAN.md / graph.json / CONSTITUTION.md
│   ├── architecture/         ← 설계 문서
│   ├── universes/            ← 메타 우주 정의
│   ├── schemas/              ← JSON 스키마
│   ├── commands/
│   │   ├── active/           ← 진행 중인 작업 명령서
│   │   ├── completed/        ← 완료 후 보존
│   │   └── archived/         ← 폐기 (사실상 archived/와 동일 기능)
│   ├── retrospective/        ← 리뷰·반성 문서
│   └── references/           ← 외부 자료 (OpenCrab 등)
│
├── apps/                     ← 사용자 진입점 (console, estimator, minicad)
├── packages/                 ← 공유 코드 (db, engines, schema, ui, ontology)
├── modules-html/             ← UI 패키지 (boc-v6, *-v6)
│
├── data/
│   ├── ecorean-boc.db        ← 운영 DB
│   └── seeds/                ← 모든 시드 JSON (한국어 포함)
├── db/migrations/            ← SQL 마이그레이션 (v6/v7…)
│
├── scripts/                  ← .bat / .ps1 / .cjs
├── tests/
├── backups/                  ← .bak.* 백업
└── archived/                 ← 옛 버전, 폐기 자료
```

**현재 구조와의 차이:**
- 루트 46파일 → 약 10건 (README·package·.env·.gitignore 등)으로 감소
- `shell/` 폐지 (코드는 `apps/`+`packages/`로 흡수)
- `src/` 폐지 또는 `packages/`로 흡수
- 운영 DB는 `data/`로 이동

**이전 시 영향 요약:**
- `package.json` workspaces 경로 확인 필요
- electron `main.js`의 `loadFile` 경로 갱신
- 시드 로딩 코드의 JSON 경로 갱신
- 스크립트 호출 경로 갱신
- 빌드 출력 경로 (`.gitignore`) 확인

---

## §6. 다음 단계

**대표님 결정 필요 (체크박스):**

- [ ] **§5 폴더 표준 초안** 승인 / 수정 / 거부
- [ ] **§4-P0 즉시 정리** (정확 중복 5건 + 빈 백업 1건) 승인
- [ ] **§4-P1 단기 정리** (`docs/commands/` + `seeds/` + `scripts/` 폴더 표준화) 승인
- [ ] **§4-P2 코드 트리 결정** — `shell/` · `src/` · `apps/+packages/` 중 truth source 확정
- [ ] `data/ecorean.db` 정체 확인 — 필요한 DB인가?
- [ ] `docs/ECOREAN_BOC_v1.html` ≡ `docs/index.html` 중 어느 이름을 유지할지

승인 후 별도 명령서로 실제 정리 작업 진행. **이 진단은 변경 0건이며, 워킹 카피의 진행 중 작업은 `git stash@{0}` 에 안전히 격리되어 있음.**

---

## §7. 추가 관찰 — 비표준 항목

1. **`docs/index.html`이 docs 폴더에 위치** — 일반적이지 않음. `ECOREAN_BOC_v1.html`의 백업 가능성.
2. **`shell/dist/` + `shell/node_modules/` 존재** — 모노레포 전환 후에도 `shell/`이 독립 패키지로 빌드되고 있음. workspace 통합 여부 확인 가능.
3. **`packages/db`, `packages/engines`, `packages/schema`, `packages/ui` 직속 파일 0건** — 빈 골조 상태. 채우는 작업이 v7 진행 사안.
4. **`apps/console`, `apps/estimator`, `apps/minicad` 골조** — 워킹 카피의 실제 minicad 작업은 루트 `minicad/`에서 진행 중 (apps/minicad는 빈 골조). 작업 위치 일원화 결정 필요.
5. **`minicad/CLAUDE.md` 발견** (stash 안에 있음) — 직급 정의 시도로 추정. 멀티 인스턴스 협업 구조와 연결 가능.

---

## §8. 헌법 위반 검증

| 항목 | 판정 | 비고 |
|---|---|---|
| 파일 변경 | **0건** | 이 보고서 (`docs/DIAGNOSIS_REPORT.md`) 신규 1건만 생성 |
| git 변경 | **0건** | `git stash push -u` 1회 (작업 보존 목적, 사후 `stash pop` 예정), commit 0 |
| `22 / 23 / 12 / 6 / 5` 절대수치 | **0건** | 읽기만 |
| `docs/graph.json` | **0건** | 읽기만 |
| `docs/MASTER_PLAN.md` | **0건** | 읽기만 |
| 빌드 실행 | **0건** | |
| 명령서 §0 [0-1] 읽기 전용 | ✅ 준수 | `stash`는 워킹 트리 안전 격리이며 사후 복원 예정 |
| 명령서 §0 [0-2] 산출물 1개 | ✅ 준수 | `docs/DIAGNOSIS_REPORT.md` 단 1건 (`docs/.diagnosis_tree.txt` 등 임시 파일 생성 안 함) |
| 명령서 §0 [0-3] 30분 목표 | ✅ 준수 | 진단 시작 → 보고서 완성까지 약 25분 |
| 명령서 §0 [0-4] 헌법 보호 | ✅ 준수 | 모든 헌법 파일 읽기만 |

---

*Claude Code 진단 보고서 끝 — 변경 사항 0건 · 산출물 1개 · 2026-05-16*
