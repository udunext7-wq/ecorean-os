# CLAUDE CODE 명령서 — Phase 4 Week 9 (마지막)
# 잔여 정리 + README + MASTER_PLAN v6.4 + v6.0 태그
# 추정 코드 0건 | 2026-04-30

---

## 0. 시작 전 확인

```bash
cd C:\Users\udune\ecorean-os
git status
git log --oneline -3
```
예상 HEAD: `8d021eb`

---

## 1. 확정된 슬롯 (사전 조사 완료)

```
[A] 잔여 XSS:        InspectionsPage L87, SettlementPage L92
[B] unmount 누락:    ContractPage 1개
[C] console.log:     2개 (정확 위치는 grep 재실행)
[D] README.md:       없음 → 신규 작성
[E] MASTER_PLAN:     v6.3까지, v6.4 추가 필요
[F] feature-flags:   PHASE_4I_COMPLETE: false → true
[G] git tag:         v5.7.0만 존재, v6.0 미생성
[H] 이미 해결:       build / dotenv / cytoscape / unmount 6개 / preload / currentPage
```

---

## 2. 작업 1: XSS 2곳 수정 (10분)

### 1-1. escapeHtml 유틸 존재 확인

```bash
ls modules-html/boc-v6/src/contract/utils/escape.cjs 2>nul || echo "없음"
cat modules-html/boc-v6/src/contract/utils/escape.cjs 2>nul
```

없으면 생성:

```javascript
// modules-html/boc-v6/src/contract/utils/escape.cjs
'use strict';

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

module.exports = { escapeHtml };
```

### 1-2. InspectionsPage.js L87 수정

```bash
grep -n "section_id\|require.*escape" modules-html/boc-v6/src/inspections/InspectionsPage.js
```

상단에 require 추가:
```javascript
const { escapeHtml: esc } = require('../contract/utils/escape.cjs');
```

L87 부근 수정:
```javascript
// 기존:
${ins.section_id || '-'}

// 수정:
${esc(ins.section_id) || '-'}
```

검수자/비고도 일괄 수정:
```javascript
${esc(ins.inspector) || '-'}
${esc(ins.notes)     || ''}
```

### 1-3. SettlementPage.js L92 수정

```bash
grep -n "customer_name\|require.*escape" modules-html/boc-v6/src/settlement/SettlementPage.js
```

상단에 require 추가:
```javascript
const { escapeHtml: esc } = require('../contract/utils/escape.cjs');
```

L92 수정:
```javascript
// 기존:
<td style="${TD}">${c.customer_name || '(암호화됨)'}</td>

// 수정:
<td style="${TD}">${esc(c.customer_name) || '(암호화됨)'}</td>
```

### 1-4. 추가 위치 전수 점검

```bash
# 사용자 입력 가능 변수 + ${} 직접 보간
grep -rn '\${[a-z_.]*\(name\|note\|vendor\|inspector\|address\|message\)' \
  modules-html/boc-v6/src/orders/ \
  modules-html/boc-v6/src/schedules/ \
  modules-html/boc-v6/src/inspections/ \
  modules-html/boc-v6/src/settlement/ 2>nul | grep -v "esc(" | head -10
```

발견되는 모든 곳에 esc() 적용.

---

## 3. 작업 2: ContractPage unmount 추가 (5분)

### 2-1. 현재 구조 확인

```bash
grep -n "constructor\|this\.controller\.subscribe\|addEventListener" \
  modules-html/boc-v6/src/contract/ContractPage.js | head -10
```

### 2-2. unmount 메서드 추가

ContractPage 클래스 마지막에 추가:
```javascript
unmount() {
  // 컨트롤러 구독 해제
  if (this.controller && this.controller.unsubscribeAll) {
    this.controller.unsubscribeAll();
  }
  this.containerEl.innerHTML = '';
}
```

---

## 4. 작업 3: console.log 정리 (5분)

```bash
# 잔존 console.log 위치 확인
grep -rn "console\.log" \
  modules-html/boc-v6/src/ \
  shell/src/ai/ \
  shell/src/closed-loop/ 2>nul | grep -v "__tests__\|test\.cjs\|build\|console\.error" | head -10
```

각 위치 확인 후:
- `[Module]` 형태 운영 로그 → 유지
- 디버그용 로그 → 제거

`console.error`는 모두 유지 (오류 추적).

---

## 5. 작업 4: README.md 작성 (15분)

파일: `README.md`

```markdown
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

\`\`\`
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
\`\`\`

## 시작하기

### 사전 요구사항

- Node.js 20+
- Windows 10/11 (현재 지원 환경)

### 설치 및 실행

\`\`\`bash
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
\`\`\`

## AI 임원 설정

\`.env\` 파일에서 프로바이더 선택:

\`\`\`
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
\`\`\`

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

\`\`\`bash
# 핵심 회귀 테스트
node shell/src/closed-loop/__tests__/Contract.test.cjs
node shell/src/closed-loop/__tests__/PurchaseOrder.test.cjs
node shell/src/closed-loop/__tests__/Schedule.test.cjs
node shell/src/closed-loop/__tests__/Inspection.test.cjs

# UI 테스트
node modules-html/boc-v6/src/contract/__tests__/ContractController.test.cjs
node modules-html/boc-v6/src/orders/__tests__/OrdersController.test.cjs
# ... (총 12개 테스트 스위트)
\`\`\`

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
\`\`\`

---

## 6. 작업 5: feature-flags + MASTER_PLAN v6.4 (10분)

### 5-1. PHASE_4I_COMPLETE = true

```bash
grep -n "PHASE_4I" shell/src/feature-flags/flags.cjs
```

수정:
```javascript
PHASE_4I_COMPLETE:    true,   // Week 9: 마무리 + v6.0 태그
USE_README:           true,
```

flags 테스트 Test 11 추가:
```javascript
// Test 11: Phase 4I + Week 9 완료
(function() {
  assert(isEnabled('PHASE_4I_COMPLETE') === true, 'PHASE_4I 완료');
})();
console.log('[PASS] feature-flags (11/11)');
```

### 5-2. MASTER_PLAN v6.4

`docs/MASTER_PLAN.md` 버전 테이블에 추가:
```markdown
| **v6.4** | **2026-04-30** | **§117.6 Phase 4 Week 9 완료 — 마무리 + README + v6.0 태그** |
```

Week 9 섹션 추가:
```markdown
- Week 9: 마무리 + v6.0 태그 ✅
  - XSS escapeHtml 전수 적용 (InspectionsPage, SettlementPage)
  - ContractPage unmount 추가
  - console.log 정리
  - README.md 신규 작성 (운영 가이드)
  - feature-flags PHASE_4I_COMPLETE
  - git tag v6.0 (Phase 4 완료 마크)
```

---

## 7. 작업 6: 전체 테스트 + 빌드 + 커밋 (10분)

### 6-1. 전체 테스트

```bash
# Closed Loop 회귀
node shell/src/closed-loop/__tests__/Contract.test.cjs
node shell/src/closed-loop/__tests__/PurchaseOrder.test.cjs
node shell/src/closed-loop/__tests__/Schedule.test.cjs
node shell/src/closed-loop/__tests__/Inspection.test.cjs

# AI + Week 5~8
node shell/tests/ai/AIProvider.test.cjs
node modules-html/boc-v6/src/ai-executive/__tests__/AIExecutive.test.cjs
node modules-html/boc-v6/src/contract/__tests__/ContractController.test.cjs
node modules-html/boc-v6/src/orders/__tests__/OrdersController.test.cjs
node modules-html/boc-v6/src/schedules/__tests__/ScheduleController.test.cjs
node modules-html/boc-v6/src/inspections/__tests__/InspectionController.test.cjs
node modules-html/boc-v6/src/settlement/__tests__/Settlement.test.cjs

# Feature flags 11/11 확인
node shell/src/feature-flags/__tests__/flags.test.cjs
```

### 6-2. 빌드

```bash
cd modules-html/boc-v6 && node build.cjs 2>&1 | tail -5 && cd ../..
```

### 6-3. 커밋

```bash
git add -A
git status --short
git commit -m "feat: Phase 4 Week 9 완료 — XSS 정리 + README + v6.4 (Phase 4 종료)"
```

---

## 8. 작업 7: git tag v6.0 + push (5분)

### 7-1. 태그 생성

```bash
git tag -a v6.0 -m "Phase 4 완료 — Closed Loop OS 완성 (Week 1~9)"
```

### 7-2. push (커밋 + 태그)

```bash
git push origin master
git push origin v6.0

# 확인
git log --oneline origin/master..HEAD
git tag -l "v6*"
```

---

## 9. Gate Test — Week 9 완료 기준

```
□ XSS 2곳 수정 완료
□ ContractPage unmount 추가
□ console.log 정리 완료
□ README.md 작성 완료
□ PHASE_4I_COMPLETE = true
□ feature-flags 11/11 PASS
□ MASTER_PLAN v6.4 기록
□ 전체 테스트 PASS
□ 빌드 정상
□ git commit 완료
□ git tag v6.0 생성
□ push 완료 (커밋 + 태그)
```

---

## 10. Phase 4 최종 통계

```
기간:        Week 1 ~ Week 9 (총 9 Week)
구현 라인:   ~6,000+ 라인 (모듈 + 테스트)
DB 마이그:   007개 (v6.0/001~007)
IPC 핸들러:  20+ 채널
페이지:      11개 (계약/발주/공정/검수/정산/토폴로지/AI 임원 등)
테스트:      80+ assertions
빌드:        12 entry esbuild ESM splitting
헌법 위반:   0건 (잔여)
```

---

## 11. Phase 5 예고

```
Phase 5: AI 인터뷰 + 현장 인식 + 운영 자동화
- AI 인터뷰: 영업 상담 자동화
- 현장 인식: CAD + 사진 기반 자동 측정
- AES-256-GCM 암호화 본격 구현
- ML Phase 1 학습 시작 (실거래 데이터 적재)
- 30% 자율 운영 목표
```

---

*ECOREAN BOC OS — Phase 4 Week 9 명령서*
*Phase 4 마무리 | v6.0 태그 | 2026-04-30*
