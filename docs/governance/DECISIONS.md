# DECISIONS.md — ECOREAN OS 결정 기록 (변경 금지)

> 목적: 이미 확정된 결정을 박제하여 재논의를 차단한다.
> 규칙: 이 문서의 결정은 "번복 절차"를 거치지 않는 한 재논의하지 않는다.
> 클로드코드는 이 문서를 위반하는 코드를 작성하지 않는다.
> 최종 갱신: 2026-07-01

---

## 이 문서를 읽는 법

```
각 결정 = ID / 결정 내용 / 근거 / 결정 주체 / 날짜 / 상태
상태: CONFIRMED(확정) / SUPERSEDED(대체됨) / DEPRECATED(폐기)
번복하려면: 하단 "결정 번복 절차" 참조
```

---

## D-CORE. 핵심 아키텍처 결정

### D-001. BOC v2.0 신규 설계
- **결정**: 지금보다 나은 BOC를 신규로 설계한다. 기존 boc-v6는 봉인(학습 자산으로 보존)하고, 그 위에 얹지 않는다.
- **근거**: 진행방향 문서가 "처음부터 모듈식 재설계"를 명시. 짜집기 재발 위험 60~70% 회피. 원칙 "두 번 일하지 않음".
- **결정 주체**: 대표 (2026-07-01)
- **상태**: CONFIRMED

### D-002. 트랜잭션 DB = Supabase
- **결정**: PostgreSQL 트랜잭션층은 Supabase(클라우드)를 사용한다. 로컬 PostgreSQL을 쓰지 않는다.
- **근거**: "모든 것을 연계한 자동화"가 목표. 웹 운영·협업·RLS·실시간 기능 필요. 로컬 PG는 자동화·협업에 걸림돌.
- **결정 주체**: 대표 (2026-07-01)
- **상태**: CONFIRMED

### D-003. 온톨로지 엔진 = Neo4j, 온톨로지 구성 시점부터 가동
- **결정**: 온톨로지는 Neo4j로 구성한다. Phase 1(온톨로지 구성) 시점부터 Neo4j를 실제로 가동한다. 나중에 도입하지 않는다.
- **근거**: 온톨로지가 시스템의 헌법. RuleEngine의 추론 근거. 대표 명시 지시.
- **결정 주체**: 대표 (2026-07-01)
- **상태**: CONFIRMED

### D-004. Neo4j ↔ PostgreSQL 연결 방식 (3단계)
- **결정**:
  - Phase 1: Neo4j 온톨로지 가동 (ID/코드 체계 확정)
  - Phase 2: PostgreSQL 스키마가 Neo4j ID를 FK로 참조하도록 설계 (논리적 연결)
  - Phase 8: 실시간 동기화 구간 실제 구축 (물리적 연결)
- **근거**: "처음부터 연계"(Phase 2 논리연결)와 "복잡도 통제"(물리동기화는 Phase 8)를 동시에 달성. 원칙 "단계별 작업".
- **결정 주체**: 대표 승인 (2026-07-01)
- **상태**: CONFIRMED

---

## D-STACK. 기술 스택 결정 (기존 확정 계승)

### D-010. 사이트 프레임워크 = Next.js 14 (모노레포)
- **결정**: 웹은 Next.js 14 App Router 단일 모노레포. 별도 백엔드 서버 없이 API Route 사용.
- **근거**: 코어(디자인·인증·DB) 공유. 앱 팩 확장 구조. MASTER 문서 계승.
- **상태**: CONFIRMED

### D-011. 인증 = Supabase Auth
- **결정**: 인증·권한은 Supabase Auth + RLS. 5역할 모델.
- **상태**: CONFIRMED

### D-012. 파일 저장 = Supabase Storage
- **상태**: CONFIRMED

### D-013. 지식 IP = Obsidian (로컬), 팀 협업 = Notion (클라우드)
- **결정**: 핵심 지식 IP는 로컬 Obsidian. 팀 공유는 Notion.
- **상태**: CONFIRMED

### D-014. 자동화 = n8n + MCP/API
- **결정**: 워크플로우 자동화는 n8n. AI 호출 통로는 MCP/API.
- **상태**: CONFIRMED

### D-015. 배포 = Vercel (Next.js), 도메인 = kr + net
- **결정**: Next.js는 Vercel 배포. ecorean.kr(고객) + ecorean.net(내부).
- **상태**: CONFIRMED

---

## D-DOMAIN. 도메인 · 역할 결정

### D-020. 2도메인 물리 분리
- **결정**: ecorean.kr = 고객 대면(Public + Customer). ecorean.net = 내부 운영(BOC + MiniCAD + System + Partner).
- **상태**: CONFIRMED

### D-021. 5단계 역할 체계
- **결정**:
  1. 서치 고객 (visitor/lead) — kr 공개, 상담만
  2. 상업고객 (business_customer) — kr + 제한된 MiniCAD/견적(본인만)
  3. 일반 직원 (staff) — net, 배정 프로젝트, 재무 제외
  4. 관리자 (admin) — net, BOC 전체, 재무·승인
  5. 마스터 (master) — 전체 무제한 + 시스템·삭제·권한
- **결정**: 접근 제어 주체는 도메인이 아니라 role(RLS). 상업고객이 net 접속 시 kr로 리다이렉트.
- **결정 주체**: 대표 (2026-07-01)
- **상태**: CONFIRMED

---

## D-ARCH. 구조 원칙 결정

### D-030. 엔진 팩 vs 앱 팩 분리 (P2 도구 우선)
- **결정**: 견적·발주·변환 등 로직은 엔진(함수/API)으로 먼저 만든다. UI에 로직을 박지 않는다. 앱 팩은 엔진을 호출하는 얇은 화면.
- **근거**: 발주서 앱이든 AI Agent든 같은 엔진 재사용. 앱이 100개여도 엔진은 13개.
- **상태**: CONFIRMED

### D-031. 13 엔진 구성
- **결정**: InputNormalizer, PresetEngine, RuleEngine, DefaultSpecEngine, EstimateEngine, ScheduleEngine, DocumentGenerator, DiagnosticsEngine, CompletionReportEngine, EstimateVsActualEngine, MasterDBUpdateEngine, ApprovalLogEngine, ProcurementEngine.
- **상태**: CONFIRMED

### D-032. 팩 로더는 나중에
- **결정**: 동적 팩 로더(켜고 끄기)는 앱 팩 3~4개 쌓인 후(Phase 8 이후) 구축. 지금은 논리적 팩(규약 준수 폴더)만.
- **근거**: 처음부터 로더 만들면 본체를 못 만드는 오버엔지니어링. 패턴 검증 후 구축.
- **상태**: CONFIRMED

---

## D-DB. 데이터 경계 결정 (동기화 지옥 방지)

### D-040. DB 2개 경계 3원칙
- **결정**:
  1. 같은 개념을 두 DB에 정의하지 않는다 (정의는 Neo4j에만)
  2. PostgreSQL은 Neo4j ID를 참조만 한다 (복제·재정의 금지)
  3. 운영결과 → 규칙보정은 배치 환류만 (실시간 양방향 금지)
- **상태**: CONFIRMED

### D-041. 네이밍 규칙
- **결정**: 테이블은 snake_case 복수형. PK는 id. FK는 참조테이블_id. 코드체계 PRJ/EST/PO-YYYY-NNNN.
- **상태**: CONFIRMED

---

## D-CONST. 헌법 규칙 (절대 위반 금지)

### D-050. ECOREAN OS 헌법 10조
- **결정**: 아래는 클로드코드가 절대 위반할 수 없는 규칙.
  1. 방수 = CONDITIONAL only, AUTO 금지
  2. NEEDS_CONFIRMATION 누락 금지
  3. Master DB 무승인 업데이트 금지
  4. rollback 없이 DB 변경 금지
  5. 고객용/내부용 혼합 금지
  6. 부분공사인데 전체공정 자동생성 금지
  7. 발주 리드타임 무시 금지
  8. 검수 실패 후 후속공정 진행 금지
  9. 단가 추정 금지 → UNKNOWN/NEEDS_RESEARCH 사용
  10. TDD 강제 적용, 버그있는 코드 커밋 절대 금지
- **상태**: CONFIRMED (절대)

### D-051. 대표 승인 필수 항목
- **결정**: Master DB 변경, 재무 승인, git push, 데이터 삭제, 보안/비용 관련은 대표 명시 승인 필요(Smart Approval L4).
- **상태**: CONFIRMED

---

## 결정 번복 절차

```
이미 확정된(CONFIRMED) 결정을 바꾸려면:
1. 왜 바꿔야 하는지 근거 명시
2. 바꿀 때 영향받는 다른 결정/코드 목록 작성
3. 대표 명시 승인
4. 기존 결정을 SUPERSEDED로 표시 (삭제하지 않음)
5. 새 결정을 새 ID로 추가하며 "supersedes D-XXX" 기록

이 절차 없이 CONFIRMED 결정을 무시하는 코드는 작성 금지.
```

---

## 변경 이력

| 날짜 | 변경 | 주체 |
|------|------|------|
| 2026-07-01 | 최초 작성. D-001~D-051 확정. | 대표 + 김비서 |
