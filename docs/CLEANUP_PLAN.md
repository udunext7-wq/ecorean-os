# ECOREAN BOC OS — 정리 마스터 플랜

> 작성일: 2026-05-16
> 작성자: Claude Code (대표님 승인 기반)
> 근거 문서: [`docs/DIAGNOSIS_REPORT.md`](./DIAGNOSIS_REPORT.md)
> 기준 커밋: `9cb5b41` (master HEAD, v6.0 출시 후 minicad v5.8 진행)

---

## §0. 정리 원칙 (대표님 헌법에서 직접 유도)

| 원칙 | 출처 | 의미 |
|---|---|---|
| **"왜 나눴나?"에 답할 수 없는 분류는 만들지 않는다** | 통찰 #6 + 김비서 패턴 #2 | 폴더 하나를 추가할 때마다 "이 폴더만의 책임"을 한 줄로 적을 수 있어야 함 |
| **인터페이스·식별자·구조는 지금 잡는다** | 통찰 #4 | 코드 트리·운영 DB 위치·시드 위치는 이번 정리에 확정. 시각·디테일은 나중 |
| **온톨로지로 동적 관리** | 통찰 #3 | 시드 JSON·룰·매핑은 코드와 분리. `seeds/`·`data/`에 격리해 대표 승인으로만 변경 |
| **고객용/내부용 분리** | 헌법 P1 | 고객 산출물(PDF·리포트)과 내부 운영물(명령서·리뷰·DB) 명확 분리 |
| **rollback 가능** | 헌법 B1 | 모든 정리 단계는 git 커밋 단위로 분리, 각 커밋 rollback 가능 |

---

## §1. 목표 폴더 구조 (After)

각 폴더의 **책임 한 줄**을 명시한다. 추가/변경 시 이 줄에 답할 수 있어야 한다.

```
ecorean-os/
├── README.md                   책임: 프로젝트 첫 진입자에게 핵심 안내
├── CLAUDE.md                   책임: AI 보조자가 따라야 할 작업 헌법
├── package.json·.env·.gitignore·.eslintrc.json
│
├── docs/                       책임: 변경 빈도 낮고 영구성 높은 문서
│   ├── _constitution/          책임: 절대 수정 금지인 헌법 (MASTER_PLAN, CONSTITUTION, graph.json)
│   ├── architecture/           책임: 설계 결정·인벤토리·리스크
│   ├── schemas/                책임: JSON 스키마 (edge/node/universe/metaedge)
│   ├── universes/              책임: 메타 우주 정의 (vine-farm 등)
│   ├── commands/
│   │   ├── active/             책임: 현재 진행 중인 작업 명령서
│   │   ├── completed/          책임: 완료 후 보존되는 작업 명령서
│   │   └── archived/           책임: 폐기된 명령서 (사실상 /archived/와 통합)
│   ├── retrospective/          책임: 회고·검토·반성 문서
│   ├── handoffs/               책임: 채팅·세션 인계 문서
│   └── references/             책임: 외부 자료·작업자용 참고
│
├── apps/                       책임: 사용자가 실제 실행하는 진입점 (Electron 단위)
│   ├── console/                책임: BOC 메인 앱
│   ├── estimator/              책임: 견적 단독 앱
│   └── minicad/                책임: MiniCAD 단독 앱
│
├── packages/                   책임: 여러 앱이 공유하는 코드 (npm workspace 패키지)
│   ├── db/                     책임: DB 어댑터·마이그레이션 런너
│   ├── engines/                책임: 견적 엔진·계산 엔진
│   ├── schema/                 책임: 타입·스키마 정의
│   ├── ui/                     책임: 공유 UI 컴포넌트
│   ├── ontology/               책임: 온톨로지 룰
│   └── harness/                책임: 수집 하니스 (g2b 등)
│
├── modules-html/               책임: Phase 4 UI 모듈 (boc-v6 + 단일 HTML들)
│   ├── boc-v6/  cad/  estimate-v6/  kpi-v6/  topology/
│   └── aiengine.html  approval.html  dashboard.html  dbmgr.html
│       ontology.html  presets.html  projects.html  reports.html
│
├── data/                       책임: 운영 데이터 (코드 아님)
│   ├── ecorean-boc.db          (운영 DB ← 루트에서 이동)
│   ├── seeds/                  책임: 시드 JSON (한국어 접두사 ECOREAN_* 포함)
│   │   └── ontology/           (housings-6, spaces-23, policies-14 등)
│   ├── templates/              책임: 입력 템플릿 (xlsx)
│   └── catalogs/               책임: 카탈로그·인덱스 JSON
│
├── db/migrations/              책임: SQL 마이그레이션 (v6/v7/v7.1…)
├── scripts/                    책임: 운영·빌드·검증 스크립트 (.bat·.ps1·.cjs)
├── tests/                      책임: 통합·E2E 테스트
├── backups/                    책임: DB 백업 (날짜+의미 태그)
├── archived/                   책임: 폐기 (옛 버전·옛 명령서·old-html)
├── dist/                       책임: 빌드 산출물 (gitignore)
└── node_modules/               책임: 의존성 (gitignore)
```

---

## §2. 항목별 이동 매핑 + 사유

### §2.1 시드 JSON 12건 → `data/seeds/`

| 현재 | 목표 | 왜 |
|---|---|---|
| `/ECOREAN_*.json` (9건) | `data/seeds/` | 시드는 데이터, 코드 빌드와 분리. ML 학습·승인 로그가 올바르게 작동(P4) |
| `/cost-items.json`, `cost-items-v2.json` | `data/seeds/` | 동일 |
| `/db.json` | `data/seeds/legacy/` | 옛 시드(v6.0 이전) 보존하되 격리 |
| `/full-db-catalog.json` | `data/catalogs/` | 시드 아니라 인덱스 |
| `/ontology*.json` | `data/seeds/` | 통찰 #3 "동적 관리" |
| `/process-categories.json` | `data/seeds/` | 동일 |
| `/ECOREAN_단가입력_템플릿.xlsx` | `data/templates/` | 입력 템플릿, 시드 아님 |

### §2.2 명령서·검토·스냅샷 11건 → `docs/...`

| 현재 | 목표 | 왜 |
|---|---|---|
| `/MONOREPO_RESTRUCTURE_COMMAND.md` | `docs/commands/active/` | 진행 중 (v7.0-alpha 작업과 연결) |
| `/AUDIT_AND_REDESIGN_COMMAND.md` | `docs/commands/active/` | 진행 중 가능성 |
| `/DB_RECOVERY_COMMAND.md` | `docs/commands/completed/` | 2026-05-02 완료 |
| `/DB_VERIFICATION_COMMAND.md` | `docs/commands/completed/` | 동일 |
| `/SMART_AUTO_APPROVAL.md` | `docs/commands/active/` | 미적용 룰 가능성 |
| `/FINAL_DEEP_REVIEW.md` `/FINAL_REVIEW_BEFORE_W9.md` `/FULL_REVIEW_FIX.md` | `docs/retrospective/` | 검토·반성 자산 |
| `/OPENCRAB_DEEP_ANALYSIS.md` | `docs/references/` | 외부 도구 분석 |
| `/ECOREAN_CONTEXT_SNAPSHOT.md` | `docs/handoffs/` | 채팅 인계용 |
| `/클로드명령어.txt` (36KB) | `docs/references/` | 작업자 참고 |
| `/ECOREAN_README.md` | `docs/references/` 또는 삭제 | 메인 README와 중복 검토 |

### §2.3 운영 데이터 / DB

| 현재 | 목표 | 왜 |
|---|---|---|
| `/ecorean-boc.db` (168KB) | `data/ecorean-boc.db` | 데이터는 데이터 폴더. 코드와 섞이면 백업·git 정책 혼란 |
| `/data/ecorean.db` (296KB) | **정체 파악 후 결정** | 마이그레이션 산출물이면 폐기 |

### §2.4 스크립트·빌드 부산물

| 현재 | 목표 | 왜 |
|---|---|---|
| `/PUSH_TO_GITHUB.bat` `/SETUP_LOCAL.bat` `/RUN_DESIGN.ps1` | `scripts/` | 스크립트 일원화 |
| `/package.json.pre-monorepo.bak` | 삭제 | `git tag v6.0-pre-monorepo`로 이미 보존 |
| `/index.html` `/style.css` | 제거 또는 `archived/old-html/` | 진입점 의도 불명 (실제 진입점은 shell/ 또는 apps/) |

### §2.5 정확 중복 (MD5 동일 — 즉시 삭제)

| 파일 | 행동 |
|---|---|
| `/ECOREAN_공정단가DB_v2 (1).json` ≡ v2.json | 삭제 |
| `/ECOREAN_인건비DB_2025공식 (1).json` ≡ 공식.json | 삭제 |
| `/ECOREAN_CONTEXT_SNAPSHOT (1).md` ≡ SNAPSHOT.md | 삭제 |
| `/archived/weekly-plans/CLAUDE_CODE_PHASE4_WEEK2 (1).md` ≡ WEEK2.md | 삭제 |
| `/docs/ECOREAN_BOC_v1.html` ≡ `/docs/index.html` | `index.html` 삭제 |
| `/backups/appdata-empty-20260502-211209.bak` (0 byte) | 삭제 |

### §2.6 헌법 문서 → `docs/_constitution/`

| 현재 | 목표 | 왜 |
|---|---|---|
| `/docs/MASTER_PLAN.md` | `/docs/_constitution/MASTER_PLAN.md` | 가장 중요한 단일 진실원, 언더스코어로 최상단 정렬 |
| `/docs/CONSTITUTION.md` | `/docs/_constitution/CONSTITUTION.md` | 동일 |
| `/docs/graph.json`·`graph.jsonld` | `/docs/_constitution/` | 헌법의 일부 (12노드+24엣지) |

### §2.7 코드 트리 (Phase 2 — 옵션 결정 필요)

```
옵션 A: apps/ + packages/ 단일화 (v7 방향)
   shell/ → archived/shell-v6/
   src/   → packages/ 안으로 분산

옵션 B: shell/ 유지 (v6 안정)
   apps/, packages/ → archived/ 또는 삭제

옵션 C: 점진적 (현 상태 유지, 새 작업만 v7)
```

---

## §3. 실행 계획 (Phase 0~3)

### 🟢 Phase 0 — 즉시 (5분, 변경 영향 0)

1. MD5 동일 중복 5건 삭제
2. 빈 백업 1건 삭제
3. `git commit -m "chore: remove md5-duplicate and empty files (6 files, 0 functional change)"`

**위험:** 없음 / **롤백:** `git revert <commit>` 1회

### 🟡 Phase 1 — 단기 (1주, 폴더 표준 도입)

1. 표준 폴더 생성 (`docs/_constitution/`, `docs/commands/{active,completed,archived}/`, `docs/handoffs/`, `docs/references/`, `data/seeds/{,legacy,ontology}/`, `data/templates/`, `data/catalogs/`)
2. 시드 JSON 이동 (12건)
3. 명령서·검토·스냅샷 이동 (10건)
4. 스크립트 이동 (3건)
5. 헌법 이동 (4건)
6. 운영 DB 이동 (`/ecorean-boc.db` → `data/`)
7. **코드 내 경로 참조 갱신** (이게 핵심 리스크)
   - 시드 로딩 코드 (`shell/src/**`, `src/master-db/seed/**`)
   - HTML `<script src=…>`
   - electron `main.js`의 `loadFile`
   - `package.json` scripts
8. 빌드·검증 (`npm install` · `npm start` · 9탭 동작 · `verify-constitution` · `verify-seeds`)
9. `git commit -m "chore: standardize folder layout"`

**위험:** 코드 경로 누락 / **검증:** 빌드 성공 + 9탭 + 헌법 점검 / **롤백:** revert

### 🟠 Phase 2 — 중기 (2주, 코드 트리 truth source 확정)

**선결 조건:** 옵션 A/B/C 결정

옵션 A(v7) 선택 시:
- `src/*` → `packages/*` 분산
- `shell/src/` → `apps/console/services/` 흡수
- ~~`/minicad/` → `apps/minicad/` 통합~~ → **2026-08-19 D-060: 루트 `/minicad/` 폐기, 소스 SSoT = `sites/net/public/minicad/`** (apps/minicad 은 자리표시자)
- `modules-html/` 단일 HTML 8개 v6 폴더 패턴 적용 여부 결정
- 회귀 테스트 12 스위트 PASS 필수

**위험:** 매우 큼 / **롤백:** `git tag v6.0-pre-restructure` 박고 진행

### 🔵 Phase 3 — 장기 (1개월, 폴리싱)

1. `modules-html/` 단일 HTML → v6 폴더 패턴 통일
2. `dist/` 정리 정책 (CI만 빌드)
3. `backups/` 자동 회전
4. README·CLAUDE·ECOREAN_README 통합
5. `data/ecorean.db` vs `ecorean-boc.db` 일원화

---

## §4. 헌법 위반 사전 점검

| 조항 | 영향 | 보호 방법 |
|---|---|---|
| 22/23/12/6/5 절대수치 | 없음 | graph.json 이동만, 내용 0건 수정 |
| P3 Master DB 무승인 | DB 이동 시 영향 | Phase 1·3에서 단순 이동, 스키마·데이터 0건 수정 |
| B1 rollback SQL 필수 | 없음 (구조만) | 각 커밋 revert 가능 |
| B5 TDD 강제 | Phase 2에서 영향 | 12 테스트 스위트 PASS 후에만 진행 |

---

## §5. 진행 상태 추적

| Phase | 상태 | 커밋 | 완료일 |
|---|---|---|---|
| Phase 0 | ⏳ 시작 예정 | – | – |
| Phase 1 | 🚫 대표님 결정 대기 | – | – |
| Phase 2 | 🚫 옵션 A/B/C 결정 대기 | – | – |
| Phase 3 | 🚫 Phase 2 후 | – | – |

진행되면 이 표를 갱신한다.

---

*ECOREAN BOC OS 정리 마스터 플랜 — Phase 0~3 / 2026-05-16*
