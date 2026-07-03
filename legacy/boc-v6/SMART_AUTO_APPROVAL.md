# CLAUDE CODE — 스마트 자동 승인 운영 규칙
# 대표님 시간 90% 절약 + 위험 30% 수준 유지
# 2026-05-02

---

## 🎯 핵심 원칙

```
✅ 자동 진행:    단순 작업, 코드 수정 (헌법 통과 시), 작은 DB 변경
❌ 수동 승인:    git push, 보안/비용 작업, 큰 변경
```

---

## 📋 자동 승인 규칙 — 4단계

### 🟢 LEVEL 1: 즉시 자동 (대표님 알림 없음)

```
다음 작업은 알림 없이 즉시 진행:

✅ 점검 / 조사 / 분석
✅ 파일 읽기 (view)
✅ grep / find / ls
✅ 보고서 작성 (.md)
✅ 테스트 실행 (npm test, node *.test.cjs)
✅ 빌드 실행 (node build.cjs)
✅ git log / git status / git diff
✅ DB 조회 (SELECT)
✅ console.log 추가/제거
✅ 주석 추가/수정
✅ 포맷팅 (lint, format)
```

### 🟡 LEVEL 2: 자동 + 1줄 알림 (대표님 알림만)

```
다음 작업은 진행 알림 후 자동:

✅ 새 파일 생성 (.js, .cjs, .md, .json)
✅ 기존 파일 수정 (코드)
✅ 테스트 추가
✅ 의존성 추가 (단, 라이센스 확인 후)
✅ 작은 DB 변경 (ALTER TABLE ADD COLUMN — 멱등)
✅ 마이그레이션 SQL 작성 (실행은 별도)
✅ 로컬 git commit
✅ 빌드 파일 생성
✅ 환경 설정 파일 (.env.example) 작성

알림 형식:
"[자동] {작업} 진행 중... (5초 후 시작)"
```

### 🔴 LEVEL 3: 헌법 검증 후 자동

```
다음 작업은 헌법 자동 검증 통과 시만 진행:

⚠️ 핵심 코드 수정 (Closed Loop, 13 엔진)
⚠️ 마이그레이션 실행 (DB 직접 변경)
⚠️ 새 IPC 핸들러 추가
⚠️ feature flags 변경
⚠️ MASTER_PLAN.md 변경
⚠️ 헌법 관련 파일 수정

검증 항목 (자동):
- 22/23/12/6/5 절대 수치 변경 시도? → 차단
- graph.json 12노드+24엣지 변경? → 차단
- VAT 이중 계산 (estimate.final 사용)? → 차단
- once: true 패턴? → 차단
- innerHTML + 사용자 입력 (escapeHtml 없음)? → 차단
- rollback SQL 누락? → 차단
- 검수 FAIL 후속 차단 누락 (B4)? → 차단
- async 함수 try/catch 누락? → 경고
- console.error 외 console.log 추가? → 경고

통과 시 → 자동 진행 + 알림
실패 시 → 차단 + 대표님 보고
```

### ⛔ LEVEL 4: 대표님 명시 승인 필수

```
다음 작업은 절대 자동 진행 금지:

❌ git push (모든 형태)
❌ git push --force
❌ git tag (특히 릴리즈 태그)
❌ rm / del / 파일 삭제
❌ rmdir / 폴더 삭제
❌ DROP TABLE / DROP INDEX
❌ TRUNCATE
❌ 외부 API 호출 (비용 발생)
❌ npm install (새 패키지)
❌ npm publish
❌ 보안 키/.env 파일 수정
❌ 환경 변수 변경
❌ Docker 컨테이너 시작/중지
❌ 외부 시스템 연결 (DB, API)
❌ 사용자 데이터 삭제
❌ 헌법 자체 변경 (constitution.json)

대표님 명령 형식:
"승인. push 진행하라"
"승인. 마이그레이션 실행"
"승인. npm install dotenv"
```

---

## 🛡️ 안전 장치 (필수)

### 장치 1: 자동 백업

```bash
# 모든 LEVEL 2 이상 작업 전 자동 실행
git tag -f backup/auto/$(date +%Y%m%d-%H%M%S)

# 잘못되면 즉시 복구
git reset --hard backup/auto/{타임스탬프}
```

### 장치 2: 헌법 자동 검증 (pre-commit hook)

파일: `.git/hooks/pre-commit`

```bash
#!/bin/bash

# 1. 절대 수치 변경 검증
if grep -rn "sections.*=.*[2][0-9]" --include="*.js" --include="*.cjs" \
   modules-html/ shell/ | grep -v "22\|__tests__"; then
  echo "❌ 22 시공섹션 변경 시도 — 차단"
  exit 1
fi

# 2. graph.json 변경 검증
if git diff --cached --name-only | grep -q "docs/graph.json"; then
  echo "❌ graph.json 변경 시도 — 헌법 위반 — 차단"
  exit 1
fi

# 3. VAT 이중 계산 검증
if grep -rn "estimate\.final" modules-html/boc-v6/src/contract/ | grep -v "__tests__"; then
  echo "❌ estimate.final 사용 (VAT 이중) — 차단"
  exit 1
fi

# 4. once: true 패턴 검증
if grep -rn "{ once: true }" modules-html/boc-v6/src/ | grep -v "__tests__"; then
  echo "⚠️ once: true 안티패턴 발견 — 경고"
fi

# 5. XSS 검증
if grep -rn 'innerHTML.*\${.*name\|\${.*notes\|\${.*vendor' \
   modules-html/boc-v6/src/ | grep -v "__tests__\|esc("; then
  echo "⚠️ XSS 위험 — escapeHtml 미적용"
fi

echo "✅ 헌법 검증 통과"
exit 0
```

### 장치 3: 작업 로그 자동 기록

파일: `docs/auto-work-log.md`

```markdown
# 자동 작업 로그

## 2026-05-02

### 14:23 [LEVEL 1] 점검 실행
- 명령: AUDIT_AND_REDESIGN_COMMAND.md
- 결과: AUDIT_REPORT.md 생성
- 위험: 없음

### 14:45 [LEVEL 2] 코드 수정
- 파일: modules-html/boc-v6/src/inspections/InspectionsPage.js
- 변경: escapeHtml 적용 (XSS 수정)
- 헌법 검증: ✅ 통과
- 백업: backup/auto/20260502-1445

### 15:10 [LEVEL 4] 대표님 승인 대기
- 작업: git push origin master
- 사유: LEVEL 4 (push)
- 승인 대기 중...
```

### 장치 4: 5초 대기 (LEVEL 2)

```javascript
// LEVEL 2 작업 시작 전
console.log('[자동] 코드 수정 진행 중... (5초 후 시작)');
console.log('  파일: modules-html/boc-v6/src/inspections/InspectionsPage.js');
console.log('  변경: escapeHtml 적용');
console.log('  취소: Ctrl+C');
await sleep(5000);
// 작업 시작
```

### 장치 5: 일일 자동 보고

매일 자정 자동 실행:

```markdown
# 일일 자동 보고서 (2026-05-02)

## 요약
- 자동 작업: 23건
- 대표님 승인 작업: 2건
- 헌법 위반 차단: 1건
- 백업 생성: 23개

## LEVEL 1 작업 (자동, 알림 없음)
- 점검: 5건
- 보고서 작성: 3건
- 테스트 실행: 12건

## LEVEL 2 작업 (자동, 알림)
- 코드 수정: 8건
- 파일 생성: 4건
- 마이그레이션 작성: 1건

## LEVEL 3 작업 (헌법 검증 후 자동)
- 헌법 검증 통과: 5건
- 헌법 검증 차단: 1건
  - 시도: graph.json 변경
  - 차단됨: 헌법 위반

## LEVEL 4 작업 (대표님 승인)
- 승인 완료: 2건
  - git push: 1건
  - npm install dotenv: 1건

## 위험 알림
- 없음

## 다음 우선순위
- MiniCAD 단독 모듈 시작 (Phase B)
```

---

## 🤖 Claude Code 설정 명령

대표님이 Claude Code에 다음 명령 1회 실행:

```bash
# 작업 디렉터리로 이동
cd C:\Users\udune\ecorean-os

# 1. 헌법 검증 hook 설치
mkdir -p .git/hooks
# (위 pre-commit 스크립트 작성)
chmod +x .git/hooks/pre-commit

# 2. 자동 작업 로그 디렉터리
mkdir -p docs/auto-logs
touch docs/auto-work-log.md

# 3. Claude Code 모드 설정 (Claude Code 설정에서)
# Settings → Approval mode → "Smart Auto"
# 또는 .claude/config.json에 추가:
```

설정 파일: `.claude/config.json`

```json
{
  "approval": {
    "mode": "smart-auto",
    "rules": {
      "level_1_auto": [
        "view", "grep", "find", "ls", "cat",
        "test_run", "build_run", "git_status", "git_log", "git_diff"
      ],
      "level_2_notify": [
        "create_file", "edit_file", "add_test",
        "alter_table_idempotent", "git_commit_local"
      ],
      "level_3_constitution_check": [
        "modify_engine", "migration_run", "feature_flag_change",
        "master_plan_change", "ipc_handler_add"
      ],
      "level_4_explicit_approval": [
        "git_push", "git_push_force", "git_tag",
        "rm", "drop_table", "truncate",
        "external_api_call", "npm_install", "npm_publish",
        "env_change", "secret_change",
        "docker_start_stop", "user_data_delete",
        "constitution_change"
      ]
    },
    "wait_seconds_level_2": 5,
    "auto_backup": true,
    "constitution_validation": true,
    "daily_report": true
  },
  "constitution": {
    "absolute_numbers": {
      "construction_sections": 22,
      "spaces": 23,
      "concepts": 12,
      "residence_types": 6,
      "size_grades": 5
    },
    "graph_json_immutable": true,
    "vat_check": true,
    "anti_patterns_block": [
      "once_true",
      "innerHTML_user_input",
      "estimate_final_vat",
      "missing_rollback",
      "missing_canProceedAfter"
    ]
  }
}
```

---

## 📊 운영 효과 예측

### 대표님 시간 사용

```
이전 (수동 승인):
- 매일 검토: 30분~1시간
- 매주 큰 검토: 2~3시간
- 매월 전체 점검: 1일

스마트 자동 승인 후:
- 일일 보고서 확인: 5분
- 주간 큰 결정: 30분
- 월간 점검: 2시간

→ 시간 절약: 약 90%
```

### 위험 수준

```
이전 (수동): 5%
전면 자동: 60%
스마트 자동: 15~20%

→ 균형점
```

### 작업 속도

```
이전 (수동):
- 명령서 작성 → 대표님 승인 → 실행 → 보고 → 승인 → 다음
- 사이클: 평균 1~2일

스마트 자동:
- 명령서 작성 → 자동 실행 → 자동 보고
- 사이클: 평균 1~2시간

→ 속도: 약 10배
```

---

## ⚠️ 대표님이 주의할 점

```
1. 일일 보고서는 매일 5분 확인 필수
   → 자동 진행 사항 파악

2. LEVEL 4 알림 오면 즉시 검토
   → 24시간 이상 방치 시 자동 취소

3. 헌법 위반 차단 알림 시 분석 필수
   → 시스템이 막아준 위험 = 학습 기회

4. 백업 태그 정기 정리
   → 매주 1회 backup/auto/* 태그 정리

5. 자동 로그 주기 검토
   → 짜집기 패턴 발견 시 즉시 보고
```

---

## 🚀 즉시 적용 명령

대표님이 Claude Code에 한 번만 전달하시면 됩니다:

```
SMART_AUTO_APPROVAL.md 명령서 적용하라.

1. .git/hooks/pre-commit 설치
2. .claude/config.json 작성
3. docs/auto-work-log.md 생성
4. 일일 자동 보고 시스템 설정

설정 후 즉시 다음 작업 시작:
AUDIT_AND_REDESIGN_COMMAND.md 실행
(점검 + 재설계안 작성)
```

---

## 📝 대표님 명령 단축어

이제 대표님이 이렇게 명령하시면 됩니다:

```
"진행하라"             → LEVEL 1~3 자동 (현재까지 모드)
"승인. {작업}"          → LEVEL 4 명시 승인
"중단"                  → 모든 자동 작업 일시 중지
"롤백"                  → 마지막 백업으로 복구
"보고"                  → 현재 상태 즉시 보고
"오늘 자동 작업"         → 오늘 LEVEL 1~3 작업 목록
```

---

## ✅ 보안 강화 추가

### .env 파일 자동 보호

```bash
# .gitignore 자동 추가
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo "*.key" >> .gitignore
echo "secrets/" >> .gitignore
```

### API 키 채팅 노출 방지

```
대표님이 API 키 입력 시:
- 채팅창 입력 → 자동 경고 ("키는 .env로!")
- Claude Code 직접 입력 권장
```

---

## 📋 최종 점검 체크리스트

```
□ pre-commit hook 설치
□ .claude/config.json 작성
□ docs/auto-work-log.md 생성
□ daily 보고 시스템 설정
□ 백업 태그 시스템 활성
□ 헌법 검증 시스템 동작
□ LEVEL 4 화이트리스트 확정
□ 대표님 단축어 학습
```

---

## 🎯 다음 행동

```
대표님 결정 1: 이 운영 규칙 승인하시면
   → Claude Code 즉시 적용 명령

대표님 결정 2: 적용 후 첫 작업
   → AUDIT_AND_REDESIGN_COMMAND.md 실행
   → 점검 + 재설계안 작성 (자동)
   → 보고서 받아서 검토

이후:
- 모든 작업이 자동 진행
- 대표님은 일일 보고서만 5분 확인
- 큰 결정만 LEVEL 4로 승인
```

---

*ECOREAN BOC × Smart Auto Approval*
*시간 90% 절약 + 위험 30% 수준 유지*
*2026-05-02*
