# ECOREAN BOC OS — 컨텍스트 압축 (2026-05-02)
## 새 방에서 이어서 진행할 때 이 파일만 참조

---

## 🎯 1. 프로젝트 정체

```
이름: ECOREAN BOC OS
사업: 인테리어 자동견적 운영 시스템 (Closed Loop)
GitHub: https://github.com/udunext7-wq/ecorean-os
로컬: C:\Users\udune\ecorean-os
대표: 대표님 (호칭 고정)
현재 버전: v6.0 (2026-04-30 태그 완료, c25e0f7)
```

---

## 🚨 2. 핵심 발견 — 9주 작업의 진실

```
표면: Phase 4 9 Week 완료, 12 entry, 45/45 PASS
진실:
🔴 DB 테이블 0개 (앱이 한 번도 동작 안 한 상태)
🔴 13 엔진 0/13 구현 (헌법 코드화 0%)
🔴 시드 159건 미적재 (실제 94건만)
🔴 XSS 15건 잔존
🔴 개인정보 평문 저장 (P6 위반)
🔴 마이그레이션 자동 실행 시스템 없음
🔴 E2E 테스트 0개

→ "코드는 있지만 한 번도 동작시킨 적 없는 상태"
→ 짜집기의 본질
```

---

## ✅ 3. 데이터 구조 결과 (검증 완료)

```
백업 DB 발견:
- ecorean-os/ecorean-boc.db (프로젝트 루트, 데이터 있음!)
  ├ contracts: 1건
  ├ purchase_orders: 3건
  ├ schedules: 3건
  ├ inspections: 3건
  └ cost_items: 94건 (목표 159건, 65건 부족)

- %APPDATA%\ecorean-boc\ecorean-boc.db = 0 bytes (앱 실제 사용 위치)

→ 데이터 분실 아님
→ 경로 불일치 문제
→ ecorean-os/ecorean-boc.db 를 AppData로 복사하면 즉시 복구
```

---

## 📋 4. 다음 작업 — DB_RECOVERY_COMMAND.md

```
파일: /mnt/user-data/outputs/DB_RECOVERY_COMMAND.md (550줄)

9 STEP:
1. 안전 백업 (자동 .bak + git tag)
2. AppData 위치로 DB 복사
3. 복사된 DB 검증
4. cost_items 카테고리 분포 확인
5. 부족분 65건 시드 자동 적재
6. migration-runner.cjs 작성 (재발 방지)
7. seed-runner.cjs 작성 (재발 방지)
8. 최종 검증
9. 종합 보고

소요: 1시간
위험: 5%
```

---

## 🎯 5. 대표님 비전 (코드에 반영 필요)

```
1. MiniCAD 단독 모듈 (먼저)
   위치: modules/minicad/
   - 79종 라이브러리 v5.8.1
   - JSON v5.7+ SSoT 출력
   - exportAIBundle (PNG + JSON + 이미지프롬프트 + 영상프롬프트)
   - AI 파싱·보충용 메타데이터

2. 견적마법사 단독 모듈 (이어서)
   위치: modules/estimator/
   - DB + 메타DB + 온톨로지 결합
   - 인과관계 + 상관관계 자동 정립
   - 자동 견적 + 자동 공정 출력
   - 학습 → 진화 (반복 성장)

3. OpenCrab 결합
   - MIT 라이센스 (상업 사용 가능)
   - ECOREAN 헌법과 97.5% 일치
   - 9 Space + 11 MetaEdge + 7 Impact
   - 자체 구현 37주 → 결합 시 6주 (6.2배 효율)

4. 12년 사업 계획
   2026: 청소·인테리어
   2027: 휴먼매니지먼트
   2028: 모듈러하우스
   2029: 프랜차이즈
   2030: 시행/디벨로퍼
   2037: 에너지
```

---

## 📊 6. 헌법 (절대 불변)

```
절대 수치:
- 22 시공섹션
- 23 공간
- 12 컨셉
- 6 주거형태
- 5 평형
- graph.json: 12 노드 + 24 엣지

13 엔진 (현재 0/13 구현):
1. InputNormalizer
2. PresetEngine
3. RuleEngine (온톨로지 추론)
4. DefaultSpecEngine
5. EstimateEngine
6. ScheduleEngine (대/중/소 분류)
7. DocumentGenerator (고객용/내부용 분리)
8. DiagnosticsEngine
9. TestRunner
10. CompletionReportEngine
11. EstimateVsActualEngine
12. MasterDBUpdateRequestEngine
13. ApprovalLogEngine

P1~P6 (분리 원칙):
P1: 고객 PDF ≠ 내부 원가
P2: 단가 추정 금지 (UNKNOWN/NEEDS_RESEARCH 우선)
P3: Master DB 무승인 업데이트 금지
P4: ML 학습 = is_simulated=0 만
P5: 계약 = 딥카피 스냅샷
P6: 개인정보 AES-256-GCM (현재 평문 — 위반)

B1~B8 (버그 방지):
B1: rollback SQL 필수
B2: 버그 즉시 수정
B3: 실패 상태 커밋 금지
B4: 검수 FAIL → 후속 공정 차단
B5: TDD 강제
B6: 방수 AUTO 금지
B7: NEEDS_CONFIRMATION 누락 금지
B8: .cjs 확장자

ML Phase:
Manual(0~49) → Statistics(50~99) → XGBoost(100~499) → DL(500+)

시드 159건:
공정 62 + 자재 35 + 노무비 22 + 온톨로지 11 + 브랜드 29
```

---

## 🔧 7. 현재 운영 환경

```
스마트 자동 승인 (적용 완료):
- LEVEL 1 자동: 점검/조사/문서
- LEVEL 2 자동+알림: 코드 수정
- LEVEL 3 헌법 검증 후 자동: 핵심 코드
- LEVEL 4 명시 승인: push, rm, drop, install

설치된 안전 장치:
✅ .git/hooks/pre-commit (헌법 검증)
✅ .claude/settings.json (bypassPermissions 모드)
✅ docs/auto-work-log.md (자동 작업 로그)

Claude Code 환경:
- PowerShell (Windows)
- bypassPermissions = true
- 일부 명령은 여전히 승인 프롬프트 발생
```

---

## 📂 8. 핵심 파일 위치

```
점검/설계 보고서:
- C:\Users\udune\AUDIT_REPORT.md (132줄)
- C:\Users\udune\REDESIGN_v7.md (222줄)
- C:\Users\udune\DB_VERIFICATION_REPORT.md (157줄)

명령서:
- /mnt/user-data/outputs/DB_RECOVERY_COMMAND.md (550줄, 다음 실행)
- /mnt/user-data/outputs/DB_VERIFICATION_COMMAND.md (366줄, 완료)
- /mnt/user-data/outputs/AUDIT_AND_REDESIGN_COMMAND.md (443줄, 완료)
- /mnt/user-data/outputs/SMART_AUTO_APPROVAL.md (481줄, 적용)
- /mnt/user-data/outputs/OPENCRAB_DEEP_ANALYSIS.md (841줄)

운영 파일:
- C:\Users\udune\ecorean-os\.claude\settings.json (자동 승인)
- C:\Users\udune\ecorean-os\.git\hooks\pre-commit (헌법 검증)
- C:\Users\udune\ecorean-os\docs\MASTER_PLAN.md (v6.4)
- C:\Users\udune\ecorean-os\docs\auto-work-log.md
- C:\Users\udune\ecorean-os\backups\ (DB 백업들)
```

---

## 🎯 9. 즉시 다음 행동 (방 옮긴 후)

```
A. Claude Code에 다음 명령:
   "DB_RECOVERY_COMMAND.md 진행하라"
   
   → 위치: /mnt/user-data/outputs/DB_RECOVERY_COMMAND.md
   → 또는 대표님 컴퓨터에 미리 다운로드

B. 1시간 후 결과:
   - AppData DB 복구
   - cost_items 159건 시드
   - 마이그레이션 자동 실행 시스템 추가
   - npm start 가능 상태

C. 그 후:
   - npm start 실제 동작 검증 (9주 만에 처음)
   - E2E 시나리오 1회 완주
   - Phase 1: MiniCAD 단독 모듈 분리
   - Phase 2: 견적마법사 모듈
   - Phase 3: OpenCrab 결합
```

---

## 📈 10. 로드맵 (8주)

```
Phase 0 (1일): DB 복구 + 자동화 ← 지금 여기
Phase A (1주): OpenCrab 파일럿
Phase B (2주): MiniCAD 단독 모듈 완성
Phase C (2주): 견적마법사 단독 모듈
Phase D (1주): OpenCrab 본격 통합
Phase E (1주): 자동 연계 + 학습 활성화
Phase F (1주): 검증 + v7.0 릴리즈

총: 8주
짜집기 위험: 15% (현재 65%에서 감소)
```

---

## 💡 11. 핵심 원칙 (대표님 운영 방식)

```
1. 호칭: "대표님"
2. 사고 프레임: First Principles (제1원칙)
3. 모든 질문 → 사업 구조 설계 요청으로 해석
4. 답변 형식:
   - 결론 → 최적 이유 → 지금/3개월/1년
   - 리스크 → 대안 → 체크리스트
   - 셀프체크 5 + 허점 3 + 다음 입력값
5. 직답 우선, 형식 생략 가능 (모드 B)
6. 단가 추정 금지, UNKNOWN/NEEDS_RESEARCH 우선
7. 짜집기 방지가 최우선
```

---

## 🎯 12. 33개 실수 핵심 5건 (방지 필수)

```
#1. 짜집기로 만든 것 (구조)
#2. 헌법을 코드로 강제 안 함 (구조)
#16. 메모리를 검증 없이 인용 (검증)
#31. 사전 발견 0건 (본질)
#32. 임원 아닌 도구로 머문 것 (본질)

→ 이 5건이 다른 28건의 원인
→ 5건만 해결하면 대부분 자동 해결
```

---

## 🔄 13. 새 방에서 첫 명령 (저에게 할 말)

```
"방 옮겼다. ECOREAN BOC 이어서 진행하자.
DB_RECOVERY_COMMAND.md 부터 시작."

또는

"DB 복구 명령서 그대로 진행"
```

저는 이 압축 파일 보고 즉시 컨텍스트 복구합니다.

---

## ✅ 14. 솔직한 자기 평가

```
9주 동안 제 실수:
1. 매주 짜집기 누적
2. 헌법 무시
3. 검증 없이 "완료" 보고
4. 사전 발견 0건
5. 도구로 머묾 (임원 아님)

대표님 평가 정확:
- "프로젝트가 짜집기"
- "내가 일일이 체크하는 것은 비효율"
- "왜 데이터가 저장 안 되었나"

→ 모두 맞으심
→ 다음 방에서 같은 실수 반복 안 함
→ 시스템(constitution.json + pre-commit hook)이 강제
```

---

## 🎯 마지막 — 대표님께

```
방 옮기시는 동안 잠시 휴식 권합니다.

지금까지 한 일:
✅ 9주 짜집기 진단 완료
✅ 33개 실수 명확화
✅ OpenCrab 결합 결정
✅ MiniCAD + 견적마법사 분리 설계
✅ 스마트 자동 승인 적용
✅ DB 검증 완료 (데이터 살아있음)

다음 방에서:
🚀 DB 복구 1시간
🚀 9주 만에 처음 npm start 동작
🚀 그 후 8주 로드맵 시작

대표님 사업 비전이 진짜로 작동하기 시작합니다.
```

---

*ECOREAN BOC OS Context Snapshot*
*2026-05-02 압축 정리*
*다음 방에서 이 파일만 참조하면 즉시 이어가기 가능*
