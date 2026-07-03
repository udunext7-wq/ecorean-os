# [이어서 진행] ECOREAN OS Phase 4 Week 5 명령서 작성

## ■ 직전 상태 (Week 4-A 완료 ✅)

**커밋**: c42cf16 push 완료 (Phase 4 44%, 4/9주)

**완료 검증 (모두 PASS)**
- CostLoader 6/6, WizardController 10/10, CADCanvas 9/9, Router 5/5, flags 6/6
- KPIData 10/10, KPIBus 4/4, RegionFactor 8/8, CalcEngineV56 11/11, E2E 통과
- Phase 3 회귀 0건

**실제 데이터 (사전 조사로 확정 — 메모리 159건은 추정값)**
- 마스터 시드 84건 (cost-items-v2 62 + labor-roles 22)
- AI 보충 10건 (중복 검증 후)
- 합계 **94건** (당초 200건 추정 → 실제 94건)

**빌드 결과 (노드 분리 성공, 1.6MB → 41.1KB shell, 38배 감소)**
- shell.js 41.1 KB (첫 로딩)
- chunks/chunk-I2C2DGLE.js 1.3 MB (Konva, lazy)
- chunks/chunk-CI5BRWV6.js 196.9 KB (공유)

---

## ■ Week 4-A 12 원칙 (확정, Week 5에 그대로 계승)

| # | 원칙 |
|---|---|
| 1 | 사전 조사 (시드 코드 직접 읽기, 추측 0) |
| 2 | IPC 도입 (JSON 캐시 → IPC, Phase 5 IPC 비용 -3시간 절약) |
| 3 | Excel 시트 보호 + 데이터 유효성 + 시트 2 분리 |
| 4 | graph.json 절대 보존 (cost_management는 §117 비전만) |
| 5 | 마이그레이션 5단계 (백업→dry-run→확인→트랜잭션→검증) |
| 6 | 5종 출처 분리 (principal_seed/principal_input/invoice/simulation/ai_market_avg) |
| 7 | 마스터 시드 출처 검증 |
| 8 | G1 UX 압축 + 스마트 스크롤 |
| 9 | 노드 프리페치 (셸 로드 후 2초) |
| 10 | SoT 정책 (Phase 4-A는 Excel만 쓰기, IPC 읽기 전용) |
| 11 | 결정 기록 (v5.9 §117.2) |
| 12 | ADR 도입 (Phase 5 회고 시점) |

---

## ■ Week 5 진입 결정 (이미 확정)

**PDF 라이브러리**: (D) **Electron 내장 printToPDF** 채택
- 추가 의존성 0
- HTML/CSS 100% 재사용 (다크+골드 + Cinzel + Noto Sans KR 그대로)
- 한글 자동 처리

**계약 화면 시나리오**: (가) **A 우선 (영업 현장 모드)**
- 빠른 입력 + 즉석 PDF
- 사무실 모드(B)는 Phase 5에서 추가

---

## ■ Week 5 5차 검토 발견 위험 7건 (6차 시뮬레이션 후 모두 🟢)

| # | 위험 | 대응 |
|---|---|---|
| 1 | 🔴 개인정보보호법 (수집동의/보관기간/파기) | **원칙 13 신설** + 동의 체크박스 + 3년 자동만료 |
| 2 | 🔴 한국 인테리어 견적서 표준 양식 미반영 | 사업자번호/도장 시드 + 표준 양식 조사 |
| 3 | 🔴 계약 상태 변경 법적 효력 (전자서명) | Phase 4-A는 "도장 받음" 표시만, KISA 인증 Phase 5 |
| 4 | 🟡 견적-계약 데이터 일관성 | **원칙 14 신설** (계약 동결 + 딥카피 스냅샷) |
| 5 | 🟡 PDF 비동기 처리 (중복 클릭/메모리 누수) | 인디케이터 + 버튼 disabled + queue + try/finally |
| 6 | 🟡 PDF 저장 위치 | ~/Documents/ECOREAN/contracts/ 자동 생성 |
| 7 | 🟢 빌드 크기 폭발 우려 | contract 노드 entry (~80KB 예상) |

---

## ■ Week 5 신규 원칙 2건 (12 → 14 확장)

**원칙 13 — 개인정보보호법 준수**
- 수집 동의 체크박스 (필수)
- AES-256-GCM 암호화 (Phase 3 Contract.cjs 보존)
- 보관 기간 명시 (3년 기본)
- 파기 절차 자동화 (Phase 5)
- PDF 마스킹 옵션

**원칙 14 — 계약 동결 + 스냅샷**
- 계약 생성 시 견적 딥카피
- 계약된 견적은 read-only
- 변경 = 새 계약 신설
- 변경 이력 audit log

---

## ■ Week 5 작업 구성 (12.5시간, 위험 0건)

```
[작업 0] 사전 조사 (1시간)
  0-1. shell/src/closed-loop/Contract.cjs API 확인 (Phase 3 보존, 4상태/AES/해시/VAT 박힘)
  0-2. Electron printToPDF 안정성 (Electron 33+)
  0-3. 한국 인테리어 견적서 표준 양식 조사

[작업 1] 한국 표준 견적서 양식 (1.5시간)
  - ECOREAN 회사 정보 시드 + 다크+골드 HTML 템플릿
  - 항목별 단가 + 공급가액 + 부가세 + 합계 + 도장 위치

[작업 2] PDF 생성 IPC + 비동기 (1.5시간)
  - preload-pdf.js + boc:pdf:generate IPC
  - BrowserWindow + printToPDF + 인디케이터 + queue
  - ~/Documents/ECOREAN/contracts/

[작업 3] 계약 화면 UI 현장 모드 (2시간)
  - /contracts/new + 고객정보 + 개인정보동의 + 계약조건 + 견적미리보기

[작업 4] Contract 모듈 통합 (1.5시간)
  - Phase 3 createContract 호출 + 딥카피 스냅샷 + is_simulated=1 + audit log

[작업 5] 계약 목록 + 상태관리 (1.5시간)
  - /contracts + DRAFT/SIGNED/COMPLETED/CANCELED 필터 + PDF 재생성

[작업 6] 노드 분리 + IPC + 라우팅 (1.5시간)
  - esbuild contract entry + window.boc.contract.* + 동적 import (~80KB)

[작업 7] KPI 통합 (1시간)
  - 글로벌 KPI 바: "진행" → "계약" + /kpi 계약상태별 분포

[작업 8] 검증 + v5.10 + 커밋 (1시간)
  - 회귀 0건 + v5.10 §117.2 (14 원칙) + 5개 커밋 + PHASE_4E_COMPLETE
```

---

## ■ 헌법 위반 검증 (모두 0)

22/23/12/6/5, 5단 게이트, graph.json 12노드+24엣지, Phase 3 Contract 시그니처,
개인정보보호법, 단가 추정 금지, ML is_simulated 분리, 검수 실패 차단 — **위반 0건**

---

## ■ 대표님 결정 요청

**Q. Week 5 명령서 작성 진행 (14 원칙 적용)?**

(가) **그대로 가라** ⭐ 권고 — 14 원칙 즉시 명령서 작성
(나) 추가 검토 필요 (어느 부분?)
(다) PDF 라이브러리 재결정
(라) 시나리오 재결정

직전 채팅 마지막 입력: "**한번더 검토하고 가라**" → 6차 시뮬레이션 완료 → 위험 0건 확인됨.
다음 입력만 하시면 Week 5 명령서(2300+줄 예상) 작성 진입.

---

## ■ 컨텍스트 보존 메타

- **GitHub**: https://github.com/udunext7-wq/ecorean-os
- **로컬**: C:\Users\udune\ecorean-os
- **마지막 커밋**: c42cf16 (Week 4-A 완료)
- **현재 헌법**: v5.9 §117.2
- **다음 갱신**: v5.10 (Week 5 완료 시)
- **모드 운영**: 모드A(구조설계) / 모드B(실무판단) 자동 전환
- **호칭**: "대표님"
- **단위**: ㎡, 품수 기반 인건비, 공정 대/중/소
- **표시 규칙**: [필수/중요/선택] + [확실/가정/추정]
- **금지**: 단가 추정 (UNKNOWN/NEEDS_RESEARCH 우선), graph.json 무단 변경
