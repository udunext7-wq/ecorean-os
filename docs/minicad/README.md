# MiniCAD — 소스 위치·작업 규칙 (SSoT)

> **실서비스 소스 = `sites/net/public/minicad/`** (ecorean.net/minicad/ 로 배포되는 바로 그 파일)
> 2026-08-19 대표 지시로 루트 `minicad/` 분리본·Desktop `MiniCAD-v5.9-Galaxy` 사본을 폐기하고 여기로 일원화.
> 구 사본은 `archived/minicad-legacy-split-20260819/` (untracked, 배포 제외)에 보존.

## 파일 구조 (로드 순서 = 의존 순서)
```
sites/net/public/minicad/
├── index.html          진입점 — 모든 <script>/<link> 에 캐시버스터 ?v=TAG (변경 시 전부 일괄 bump)
├── css/style.css       테마(lime/architect) + 2026-08-19 태블릿 규칙(pointer-coarse, 퀵바, 통합 메뉴)
├── fonts/
└── js/
    ├── state.js        STATE 싱글턴
    ├── data.js         SPACE_TYPES / FLOOR_MATERIALS / WALL_MATERIALS / 라이브러리 데이터
    ├── library.js      라이브러리 심볼 도형
    ├── engine.js       Konva 스테이지·그룹·renderAll·VEF·스냅
    ├── tools.js        initTools() — 도구/이벤트(mousedown·touchstart…)·contextmenu·키보드
    ├── ui.js           initUI() — 패널·명령창·JSON·견적·refreshUI(포커스 보존 래퍼)
    ├── touch.js        initTouch() — 태블릿 터치·S펜 레이어 + 통합 컨텍스트 메뉴
    ├── estimate.js     자동 견적서(단가표)
    └── tests.js        자체 테스트 (?test=1) — 커밋 전 통과 필수
```
`engine.js` 가 전역(stage, container, groups…)을 만들고 tools/ui/touch 가 이름으로 참조 — **include 순서 변경 금지**.
초기화: `index.html initApp()` → `initKonva()` → `initTools()` → `initUI()` → `initTouch()`.

## 작업 절차
1. `sites/net/public/minicad/` 에서 수정 (다른 곳에 사본 만들지 않는다)
2. `index.html` 의 `?v=tabletN` 캐시버스터 일괄 bump (`sed -i 's/?v=tablet3/?v=tablet4/g' index.html` 식)
3. 로컬 검증: 정적 서버로 열어 `?test=1` 통과 확인 (데스크톱·터치 프로필 모두). 인증 게이트(`/ecorean-gate.js`, `/app-cloud.js`)는 스텁으로 대체 가능
4. 레포 `npm test` → commit → push(master)
5. 배포: Vercel 은 Git 미연결 → 레포 루트(또는 클린 worktree)에서 `vercel --prod --yes --scope ecorean` → `curl https://ecorean.net/minicad/ -H "Cookie: sb-gdcfqbdgubgpzusbtftf-auth-token=x"` 로 캐시태그 확인

## 헌법 (MiniCAD 적용분)
mm 정수만 · 단가 추정 금지(NEEDS_RESEARCH) · 방수 = CONDITIONAL · NEEDS_CONFIRMATION 누락 금지 · TDD(테스트 미통과 커밋 금지) · 출력은 평면 JSON 기본(2.5D 는 영업 토글, 인쇄/JSON/AI번들 시 강제 OFF) · promptKeyword 에 브랜드명 금지

## 이력 문서
- `HANDOVER_v5_8.md` — v5.6→v5.8 변경 요약 (구 분리본 시절 작성)
- `CLAUDE_CODE_KICKOFF_v5_8.md` — 초기 킥오프 (책임 범위·헌법 발췌)
- 이후 변경은 git log `-- sites/net/public/minicad` 가 기준
