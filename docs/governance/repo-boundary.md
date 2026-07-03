# repo-boundary.md — 모노레포 경계 지도 (변경 시 승인 필요)

> 목적: 무엇이 어디에 들어가는지 물리적 경계를 못 박는다.
> 규칙: 이 경계를 벗어난 위치에 파일을 만들지 않는다. 경계가 모호하면 여기를 갱신하고 진행.
> 근거: DECISIONS.md D-010(모노레포), D-030(엔진/앱 분리), D-032(팩 로더 나중)
> 최종 갱신: 2026-07-01

---

## 1. 최상위 경계 (4개 레이어 + 거버넌스)

```
ecorean-os/                    ← 모노레포 루트
│
├── docs/                      거버넌스·설계 문서 (코드 아님)
│   └── governance/            DECISIONS / repo-boundary / pack-contract
│
├── core/                      ★ 모든 팩이 공유하는 기반 (한 번 만들고 재사용)
├── engines/                   ★ 백엔드 두뇌 (13 엔진, 순수 함수)
├── apps/                      ★ 프론트 얼굴 (앱 팩, 계속 추가)
├── shared/                    ★ 앱·엔진 공유 (스키마·타입·유틸)
│
├── ontology/                  Neo4j 온톨로지 정의·시드 (로컬 SSoT)
├── supabase/                  DB 마이그레이션·RLS·시드
│
├── package.json               모노레포 워크스페이스 설정
├── turbo.json                 (또는 pnpm-workspace) 빌드 orchestration
└── .github/                   CI·pre-commit hook (규약 강제)
```

---

## 2. 각 경계의 책임 (무엇이 들어가고 안 들어가는가)

### 2.1 core/ — 공유 기반

```
core/
├── design/        디자인 시스템 (컬러·타이포·간격 토큰, Tailwind config)
├── auth/          인증·권한 로직 (Supabase Auth 래퍼, 5역할, RLS 헬퍼)
├── db/            DB 클라이언트·타입 (Supabase client, 생성된 타입)
├── ui/            공통 컴포넌트 (Button, Card, Badge, Input, Table, Modal…)
└── ontology-client/  Neo4j 조회 클라이언트 (앱이 온톨로지 읽을 때)

들어감: 2개 이상의 앱/엔진이 공유하는 것
안 들어감: 특정 앱에만 쓰이는 컴포넌트 (그건 그 앱 폴더로)
규칙: core를 수정하면 모든 앱에 영향 → 신중히. 승인 대상.
```

### 2.2 engines/ — 백엔드 두뇌

```
engines/
├── input-normalizer/
├── preset/
├── rule/              ★ 온톨로지 추론 (Neo4j 연결) — 최우선
├── default-spec/
├── estimate/          견적 산출
├── schedule/          공정표 생성
├── procurement/       발주 생성
├── document-generator/
├── diagnostics/
├── completion-report/
├── estimate-vs-actual/
├── masterdb-update/
└── approval-log/

들어감: 판단·계산·규칙·변환 로직 (순수 함수)
안 들어감: UI 코드, React 컴포넌트, 화면 (P2 위반)
규칙: 각 엔진은 입력 스키마 + 출력 스키마 고정. UI 의존성 0.
       AI Agent도 같은 엔진 호출.
```

### 2.3 apps/ — 프론트 얼굴

```
apps/
├── homepage/      공개 홈페이지        [zone: kr]
├── customer/      고객 대시보드        [zone: kr, role: business_customer]
├── boc/           관리자 BOC          [zone: net, role: staff+]
├── system/        시스템 관리          [zone: net, role: master]
├── partner/       시공팀 (모바일)      [zone: net, role: contractor]
├── minicad/       도면 입력           [zone: both, role: designer+]
├── order-form/    발주서 앱            → engines/procurement 호출
├── schedule/      공정표 앱            → engines/schedule 호출
├── site-report/   공사일보 앱
├── board/         아티팩트 보드         (포트폴리오 + 자유제작)
└── estimate/      자동 견적 앱          → engines/estimate 호출

들어감: 화면·입력·표시 (엔진을 호출하는 얇은 UI)
안 들어감: 견적/발주 계산 로직 (그건 engines/로)
규칙: 각 앱은 pack.manifest.ts 필수 (pack-contract.md 참조).
       새 앱은 이 폴더에 폴더만 추가하면 됨 (무한 확장).
```

### 2.4 shared/ — 공유 자원

```
shared/
├── schemas/       입출력 JSON 스키마 (엔진 검증용, Zod)
├── types/         공통 TypeScript 타입
├── utils/         공통 유틸 함수
├── pdf-generator/ PDF 출력 (견적서·일보 공용)
└── constants/     상수 (헌법 규칙 코드화, 코드 체계)

들어감: 앱과 엔진 양쪽이 쓰는 것
안 들어감: 특정 앱/엔진 전용 (그건 각자 폴더로)
```

### 2.5 ontology/ — Neo4j 정의 (로컬 SSoT)

```
ontology/
├── schema/        노드·관계 타입 정의
├── seeds/         자동연계 7종 시드 + 마스터 노드
└── queries/       재사용 Cypher 쿼리

들어감: 온톨로지 "정의" (공간·공정·자재·규칙)
안 들어감: 트랜잭션 데이터 (그건 supabase/)
규칙: D-040 경계 1 — 정의는 여기에만. PostgreSQL은 여기 ID만 참조.
```

### 2.6 supabase/ — 트랜잭션 DB

```
supabase/
├── migrations/    테이블 생성 SQL (순차 번호)
├── policies/      RLS 정책 (5역할)
└── seeds/         초기 데이터 (roles 등)

들어감: 트랜잭션 스키마·RLS·초기데이터
안 들어감: 온톨로지 정의 복제 (D-040 경계 2 위반)
규칙: 테이블은 Neo4j ID를 FK로 참조만.
```

---

## 3. 의존성 방향 규칙 (화살표는 "호출 가능" 방향)

```
apps/  ──→  engines/  ──→  ontology/ (Neo4j)
  │           │
  │           └──→  shared/schemas (입출력 검증)
  │
  ├──→  core/  (디자인·인증·UI·db)
  └──→  shared/ (타입·유틸·pdf)

engines/  ──→  supabase/ (트랜잭션 읽기/쓰기)
core/db   ──→  supabase/

금지된 방향 (위반 시 pre-commit 차단):
✗ engines/ 가 apps/ 를 import (엔진이 UI에 의존 = P2 위반)
✗ core/ 가 특정 app/ 을 import (코어가 앱에 의존)
✗ apps/ 끼리 직접 import (앱 간 결합 → 팩 독립성 파괴)
   → 앱 간 연동은 engines/ 또는 shared/ 를 경유
✗ supabase/ 에 온톨로지 정의 복제 (D-040 위반)
```

---

## 4. 새 파일을 만들 때 판단 순서

```
1. 이것은 로직인가 화면인가?
   로직 → engines/ 또는 shared/
   화면 → apps/{앱}/ 또는 core/ui/ (공통이면)

2. 2개 이상이 공유하는가?
   예 → core/ 또는 shared/
   아니오 → 해당 앱/엔진 폴더

3. 온톨로지 정의인가 트랜잭션인가?
   정의 → ontology/
   트랜잭션 → supabase/

4. 경계가 모호하면?
   → 이 문서(repo-boundary.md)에 새 경계를 추가하고 진행.
      임의 위치에 만들지 않음.
```

---

## 5. pre-commit 강제 규칙 (짜집기 차단)

```
.github/ 의 hook이 커밋 시 검사:
├─ apps/{앱}/ 에 pack.manifest.ts 없으면 → 차단
├─ engines/ 에 React/JSX import 발견 → 차단 (P2 위반)
├─ apps/ 끼리 직접 import → 차단
├─ supabase/ 에 온톨로지 정의 중복 → 경고
└─ core/ 수정 시 → 승인 라벨 필요 (영향 범위 큼)
```

---

## 변경 이력

| 날짜 | 변경 | 주체 |
|------|------|------|
| 2026-07-01 | 최초 작성. 4레이어 경계 + 의존성 방향 확정. | 대표 + 김비서 |
