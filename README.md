# ECOREAN OS

인테리어/건설 자동화 BOC 시스템. 온톨로지 기반 폐쇄 루프 견적·시공 관리 플랫폼.

## 이 레포를 읽는 순서

```
1. docs/governance/DECISIONS.md      ← 확정된 결정 (변경 금지)
2. docs/governance/repo-boundary.md  ← 폴더 경계 지도
3. docs/governance/pack-contract.md  ← 팩 규약
```

클로드코드는 코드 작성 전 위 3개 문서를 반드시 읽는다.

## 구조 (4레이어)

```
core/       모든 팩이 공유하는 기반 (디자인·인증·DB·UI)
engines/    백엔드 두뇌 (13 엔진, 순수 함수)
apps/       프론트 얼굴 (앱 팩, 계속 추가)
shared/     앱·엔진 공유 (스키마·타입·유틸)
sites/      도메인별 Next.js 호스트 (net=ecorean.net, kr=ecorean.kr) — 앱 팩을 마운트만

ontology/   Neo4j 온톨로지 정의 (로컬 SSoT)
supabase/   트랜잭션 DB (마이그레이션·RLS)
```

## 핵심 공식

```
견적 항목 = Space(공간) × Process(공정) × Material(자재)
```

## 현재 상태

Phase 0 (경계 확정 + 규약) 완료 + boc 앱 v0.1 (마스터 DB 조회, 읽기 전용)
다음: Phase 1 (Neo4j 온톨로지 구성)

## 로컬 실행

```bash
npm install          # 루트에서 1회 (의존성은 루트 package.json 통합 관리)
npm run dev          # sites/net 개발 서버 (http://localhost:3100)
npm test             # vitest (헌법 10조: 커밋 전 필수)
npm run build        # 프로덕션 빌드
```

주의: 이 레포가 있는 D: 드라이브는 exFAT라 심볼릭 링크가 안 된다.
npm 워크스페이스 링크를 쓰지 않으며, next 실행은 scripts/run-next.mjs 가
readlink errno 교정 패치를 주입한다 (scripts/fix-exfat-readlink.cjs).

## 기술 스택

Next.js 14 · Supabase (PostgreSQL/Auth/Storage/RLS) · Neo4j · Vercel · n8n
