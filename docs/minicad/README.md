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
├── 3d/                 2026-09-01 3D 뷰 (별도 탭, Coohom 식 1단계) — [🧊 3D] 버튼 / `3d` 명령
│   ├── index.html      뷰어 페이지 (library.js + build3d.js + importmap → view3d.js)
│   ├── build3d.js      문서(JSON) → 3D 기본체 목록. THREE 무관 순수 계산 — 노드 테스트 tests/minicad-3d.cjs
│   └── view3d.js       three.js 장면·조감/걷기·조명·클릭 이름표·PNG/GLB/JSON 내보내기
└── vendor/three/       three.js r170 (module 빌드 + OrbitControls + GLTFExporter, MIT) — 외부 CDN 없음
```
3D 동기화: MiniCAD `open3DView()`(ui.js) 가 문서를 localStorage `minicad.3d.doc` 로 넘기고 새 탭을 연다. 이후 `saveHistory`/undo/redo 가 `push3D()` 를 불러 BroadcastChannel `minicad-3d` 로 300ms 묶음 전송 → 3D 탭이 즉시 다시 조립한다. 3D 탭이 먼저 열려 있으면 `hello` 를 보내와 전송이 켜진다.
3D 는 평면 데이터만으로 세운다 — 벽(두께·높이·마감색)/문·창(폭·높이·창턱, 인방·창턱 자동)/바닥·천장(공간 폴리곤)/가구·기구(종류별 높이 프로파일, build3d.js `FURN_H` 등)/조명(천장 높이에 부착, 발광 + 포인트라이트 최대 24)/기둥/계단(직선 도식). 벽 정렬(interior/exterior)은 아직 중심선으로만 세운다.
GLB 내보내기는 2단계(Blender/AI 렌더)용 — 객체 이름이 `kind:이름` 으로 들어간다.
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
