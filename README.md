# ECOREAN BOC OS

ECOREAN/BOC 인테리어 자동견적 운영 시스템 — Closed Loop Operating System

## 개요

견적→계약→발주→공정→현장→검수→하자→정산→피드백→Master DB 업데이트까지의
완전 자동화된 인테리어 공사 관리 OS.

## 핵심 특징

- **시스템 기반 운영**: 사람 의존성 최소화, 복제 가능한 구조
- **Closed Loop**: 데이터 입력→처리→저장→피드백 완전 자동
- **AI 임원 통합**: Claude/OpenAI/Gemini/Ollama 멀티 프로바이더
- **TDD 강제**: 모든 모듈 테스트 우선 개발

## 기술 스택

- **Frontend**: Vanilla JS + esbuild ESM splitting
- **Backend**: Electron + Better-SQLite3
- **AI**: 멀티 프로바이더 (Claude/OpenAI/Gemini/Ollama)
- **시각화**: Cytoscape.js (시스템 토폴로지)

## 프로젝트 구조

```
ecorean-os/
├── electron/          # Electron 메인 프로세스 + IPC 핸들러
├── preload/           # boc-v6 preload (window.boc.*)
├── shell/             # 핵심 로직
│   ├── src/
│   │   ├── ai/             # AI 멀티 프로바이더
│   │   ├── closed-loop/    # 계약/발주/공정/검수
│   │   ├── feature-flags/  # 플래그 시스템
│   │   └── ...
│   └── tests/
├── modules-html/
│   ├── boc-v6/        # 메인 UI (Phase 4)
│   │   └── src/
│   │       ├── contract/   # 계약 + PDF
│   │       ├── orders/     # 발주
│   │       ├── schedules/  # 공정
│   │       ├── inspections/# 검수
│   │       ├── settlement/ # 정산
│   │       ├── topology/   # 시스템 토폴로지
│   │       ├── ai-executive/ # AI 임원
│   │       └── ...
│   └── estimate-v6/   # 견적 엔진 (CalcEngineV56)
├── db/migrations/v6.0/  # DB 마이그레이션
└── docs/
    ├── MASTER_PLAN.md   # 전체 설계 문서
    └── graph.json       # 시스템 토폴로지 (12노드+24엣지)
```

## 시작하기

### 사전 요구사항

- Node.js 20+
- Windows 10/11 (현재 지원 환경)

### 설치 및 실행

```bash
# 의존성 설치
npm install

# AI 임원 사용 시 .env 설정 (선택)
cp .env.example .env  # 또는 직접 작성
# BOC_AI_PROVIDER=claude (또는 openai/gemini/ollama)
# BOC_AI_KEY=your-api-key

# 개발 모드 실행
npm start

# 빌드 (boc-v6 only)
cd modules-html/boc-v6 && node build.cjs
```

## AI 임원 설정

`.env` 파일에서 프로바이더 선택:

```
# Claude (Anthropic)
BOC_AI_PROVIDER=claude
BOC_AI_KEY=sk-ant-...
BOC_AI_MODEL=claude-sonnet-4-20250514

# OpenAI
BOC_AI_PROVIDER=openai
BOC_AI_KEY=sk-...
BOC_AI_MODEL=gpt-4o

# Gemini (Google)
BOC_AI_PROVIDER=gemini
BOC_AI_KEY=AIza...
BOC_AI_MODEL=gemini-1.5-flash

# Ollama (로컬, 무료)
BOC_AI_PROVIDER=ollama
BOC_AI_MODEL=llama3
BOC_OLLAMA_URL=http://localhost:11434
```

## 핵심 원칙

### P1~P6 (분리 원칙)
- P1: 고객 PDF ≠ 내부 원가
- P2: 단가 추정 금지 (UNKNOWN/NEEDS_RESEARCH 우선)
- P3: Master DB 무승인 업데이트 금지
- P4: ML 학습 = is_simulated=0 만
- P5: 계약 = 딥카피 스냅샷
- P6: 개인정보 AES-256-GCM (Phase 5 예정)

### B1~B8 (버그 방지)
- B1: rollback SQL 필수
- B2: 버그 즉시 수정
- B3: 실패 상태 커밋 금지
- B4: 검수 FAIL → 후속 공정 차단
- B5: TDD 강제
- B6: 방수 AUTO 금지
- B7: NEEDS_CONFIRMATION 누락 금지
- B8: .cjs 확장자

### 절대 수치 (헌법)
- 22 시공 섹션
- 23 공간
- 12 컨셉
- 6 주거형태
- 5 평형
- graph.json: 12 노드 + 24 엣지

## 테스트

```bash
# 핵심 회귀 테스트
node shell/src/closed-loop/__tests__/Contract.test.cjs
node shell/src/closed-loop/__tests__/PurchaseOrder.test.cjs
node shell/src/closed-loop/__tests__/Schedule.test.cjs
node shell/src/closed-loop/__tests__/Inspection.test.cjs

# UI 테스트
node modules-html/boc-v6/src/contract/__tests__/ContractController.test.cjs
node modules-html/boc-v6/src/orders/__tests__/OrdersController.test.cjs
# ... (총 12개 테스트 스위트)
```

## 버전 이력

| 버전 | 일자       | 내용                                           |
|------|-----------|------------------------------------------------|
| v6.0 | 2026-04-30 | Phase 4 완료 — 9 Week 마침                   |
| v5.7 | 2026-04-XX | Phase 3 완료 — 9탭 통합                       |
| v5.6 | 2026-04-XX | Phase 2 완료 — 토폴로지 + ML 단계             |

## 라이선스

Proprietary — ECOREAN/BOC 내부 사용

## 문의

대표: ECOREAN/BOC
