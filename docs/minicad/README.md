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
3D 는 평면 데이터만으로 세운다 — 벽(두께·높이·마감색)/문·창(폭·높이·창턱, 인방·창턱 자동)/바닥·천장(공간 폴리곤)/가구·기구(종류별 높이 프로파일, build3d.js `FURN_H` 등)/조명(천장 높이에 부착, 발광 + 포인트라이트 최대 24)/기둥/계단(직선 도식). 벽 정렬(interior/exterior)은 2D `_wallAlignOffsetPx` 와 같은 규칙(`wallAlignOffset`, 일반벽=우측 법선 ±t/2 · 내력벽=내력벽 무게중심 방향)으로 몸체를 밀고, 꺾여 만나는 모서리는 이웃 벽 바깥 면까지 끝을 늘려 메운다(`cornerExtension`).
GLB 내보내기는 2단계(Blender/AI 렌더)용 — 객체 이름이 `kind:이름` 으로 들어간다.

### 층(Floor) 시트 — 2026-09-03
- 대표 요구: 층을 한 시퀀스에 겹쳐 그리면 z 도 없고 버벅임 → **층마다 별도 시트, 저장은 한 문서**.
- 구조: **활성 층만 STATE 배열에 산다**(도구·렌더·견적·인쇄 전부 활성 층 대상 — 다른 층 렌더 비용 0). 잠든 층은 `STATE.floors[].data` 에 JSON 스냅샷(undo 스냅샷과 같은 방식), 히스토리도 층별 보관. 핵심 함수: `switchFloor`/`addFloor({copy})`/`deleteFloor`/`renameFloor`/`_floorsExport`(ui.js).
- UI: 상단 브랜드 옆 `#floor-bar` 탭(클릭=전환, 더블클릭=이름, [+]=빈 층, Shift+[+]=구조 복제), 명령 `fl`·`fl 2`·`fl add`·`fl copy`·`fl del 2`·`fl name 이름`.
- 저장 스키마: 최상위 배열 = 활성 층(기존 스키마 그대로) + `floors:[{id,name,level,active}|{...,data}]` + `activeFloorId` → 서버 저장(`buildJSON`)·자동저장(`buildAutosavePayload`)·3D 전송 모두 한 문서. 옛 저장본(floors 없음)은 1층짜리로 열린다. 견적 프로파일에서는 floors 제거.
- 복제 시 `_remapFloorIds` 로 id 접미사 재부여(전 층이 한 문서/3D 에 섞이므로 유일해야 함).
- 3D: `buildScene` 이 `splitFloors` 로 층을 나눠 층마다 `buildFloorScene` → `obj.z0`(층 바닥 표고 = 아래층 누적 층높이, 층높이=최대 천장고+슬래브 300mm) 로 적층. 다층이면 obj.id 에 `층id:` 접두. 뷰어는 층 필터 버튼(전층/층별), 걷기 모드는 선택 층 눈높이로.
- 주의: 견적·인쇄·DXF·AI 번들은 **활성 층 기준** — 전 층 합산이 필요하면 층을 돌며 합쳐야 한다(미구현).
- 층 삭제: 활성 탭의 ✕(확인창) 또는 `fl del`(현재 층)/`fl del 2`. 마지막 한 층은 못 지운다.

### 클립보드 Ctrl+C/V/X — 2026-09-03
- 선택된 **모든 종류** 복사(`copySelection`): 공간은 소속 벽·문창·안의 객체 동반(`spaceContainedObjects`), 벽은 꼭짓점·그 벽의 문창 동반. 좌표 굳힘은 undo 스냅샷과 같은 JSON 왕복.
- 붙여넣기(`pasteClipboard`): `_remapFloorIds` 로 id 재부여(v1Id/vertexIds/wallId/spaceId·회로 lightIds/lightGang/jumpIds 까지) → **마우스 커서 위치**로 이동(커서 없으면 +600mm) → reinstallVEF → 붙인 것들 선택 상태. 벽 없이 온 문창은 `findNearestWallId` 재부착. 잠금은 해제되어 붙는다.
- 클립보드는 층 바깥(전역 `_clipboard` + localStorage `minicad.clipboard`) — **다른 층·다른 탭**에 붙여넣기 가능. Ctrl+X = 복사+삭제(잠긴 객체는 deleteSelected 가 걸러줌).
- 키 가드: INPUT/TEXTAREA 포커스·텍스트 드래그 선택 중·인쇄 설정창 열림에는 브라우저 기본 동작 유지.
- 테스트: tests.js [CP] 11건 (커서 위치·다중·공간 동반·층 건너·원상복구).

### 3D v2 — 직접 편집·한 창 분할·증분/유휴 렌더 (2026-09-03)
- **한 창 통합**: [🧊 3D] 클릭 = 우측 분할 패널(`#pane3d` iframe → 3d/index.html, `body.split3d` + `handleResize()`), Shift+클릭/`3d tab` = 별도 탭, `3d off` 닫기. iframe 은 첫 열기에만 src 지정(지연 로드).
- **3D 직접 편집**: 조감에서 가구·기구·조명·전기·설비·기둥을 **드래그=이동**(10mm 스냅, 층 바닥 평면 레이캐스트), R/속성패널=15° 회전, Del=삭제, 속성 패널(#props)에서 벽 높이·마감 / 공간 바닥재·천장재·천장고 / 문창 폭·높이·창턱 / 다운라이트 인치 수정 → BroadcastChannel `{type:'edit',op,kind,id,floorId,patch}` → **ui.js `apply3DEdit`** 가 평면에 반영(활성 층=STATE+saveHistory→undo 가능, 잠든 층=floors[].data, 잠금 보호, set 은 화이트리스트, 벽·공간 delete 거부). 반영 → push3D → 3D 재조립으로 루프 완결.
- **층별 증분 재조립**: 뷰어가 `MC3D.splitFloors`+`buildFloorScene` 로 층마다 그룹을 만들고 층 JSON 해시가 같으면 재사용(`ST.floorCache`) — 한 층 수정 시 다른 층 메시는 그대로.
- **유휴 렌더 0**: needRender 플래그 — 카메라·드래그·장면 변화 때만 render, `shadowMap.autoUpdate=false`(변화 시 needsUpdate). 대형 도면 자동 성능(메시 3500↑ 그림자 자동 OFF·pixelRatio 하향, 사용자가 그림자 버튼 만지면 자동 해제).
- **조작**: 더블클릭=그 객체/방으로 줌, 시점 프리셋 ⌂⬓⬒◨(키 3/4/5/6), 🌗 주/야 무드, 걷기 유지.
- 주의: 뷰어 구조가 root>층그룹>객체그룹 2단 — 스모크·테스트는 `MC3DVIEW.objCount()`/`ST.floorCache` 를 본다(`ST.root.children`=층 수). 3d/index.html 은 이제 data.js 도 로드(재질 드롭다운).

### 스케치업식 도구 체계 (2026-09-03, 대표 결정: "스케치업과 동일 아니 그 이상")
- 좌측 도구 바(#tools) + 단축키: **Space 선택 · M 이동 · Q 회전 · P 밀기끌기 · B 페인트 · E 지우개 · T 줄자**. 마우스: 휠버튼 드래그=궤도, 우클릭 드래그=팬, 휠=줌(+빈 곳 좌드래그 궤도 유지).
- 방식도 스케치업식: **클릭-이동-클릭(스티키)**, 동작 중 **숫자 입력(VCB #vcb)=정확한 값**(이동 mm·회전 °·밀기끌기 mm, Enter 확정), 이동 중 **←→=축 고정**, Esc=취소, Shift+Z=전체 보기. 다음 클릭=확정(회전·밀기끌기·스티키 이동은 pointerdown 에서 commit).
- 밀기끌기: 벽 클릭→위아래 = `height_mm`(미리보기는 그룹 scale.y), 천장 클릭 = 그 공간 `ceilingHeight_mm`. 25mm 스냅, 최소 300.
- 페인트: 팔레트(#paintpal, 벽/바닥/천장 재질 — data.js)에서 고르고 면 클릭 → set finishMaterial/floorMaterial/ceilingMaterial (견적 연동).
- 줄자: 두 점 클릭 → mm/m 표시 (THREE.Line, depthTest off).
- **그 이상**: 모든 편집이 평면·견적 실시간 반영 + **Ctrl+Z/Y 가 MiniCAD 히스토리로 왕복**(apply3DEdit op:'undo'/'redo').
- **함정(실제로 당함): 클래식 스크립트(data.js)의 최상위 const 는 `window.X` 로 안 잡힌다** — 모듈에서는 전역 렉시컬 식별자로 직접 참조(`typeof X!=='undefined'?X:null`, view3d.js MATS). window.WALL_MATERIALS 는 undefined 라 팔레트가 비어 있었다.
- 도구 키(M/Q/P/B/E/T/Space)는 조감 모드에서만 — 걷기 모드의 Q/E(위아래)와 충돌 방지.
- 2026-09-03 추가(대표 지시 "스케치업 구조 정확히 카피 + 3D 는 별도 창"):
  - **[🧊 3D] 클릭 = 별도 창이 기본**(open3DView), Shift+클릭/`3d split`=분할 패널, `3d`=별도 창.
  - 스케치업 정합 추가: **S=배율**(가구·기구·설비 footprint w/h — apply3DEdit set 화이트리스트에 w/h, SCALABLE set), **O=궤도(선택) · H=팬 · Z=줌**(orbit.mouseButtons.LEFT 전환), **Ctrl+이동=복사**(op:'clone' — 사본 미리보기는 g.clone(true), MiniCAD 가 JSON 복제+makeId; movable 종류만), **밀기끌기 더블클릭=직전 값 반복**(ST.lastPP), 하단 #hint = 도구별 수정자 안내(스케치업 상태바 식).
  - 미구현(의미 모델과 충돌): Line/Rectangle/Circle/Arc 그리기(면·엣지 모델링), Offset, 그룹/컴포넌트 — 작도는 2D 평면이 담당.
- 2026-09-03 배치(➕/G) + GLB 의미 탑재:
  - **3D 에서 새 객체 배치**: ➕ 도구 → #addpal(가구/위생/조명/전기/설비 전 라이브러리) → 고스트(가구는 buildFurniture 실형상, 반투명) → 바닥 클릭=배치(연속), R=회전, Esc=끝. 층은 커서 아래 객체의 층 자동. → `apply3DEdit op:'add'` → **ui.js `_apply3DAdd`**: 라이브러리 검증·makeId·findNearestSpace/makeLayerName·다운라이트 인치·선형등 length_mm, 잠든 층은 f.data 에.
  - **GLB**: 재질 이름 `MC_<hex>[_glass|_emit]`, 객체 그룹 extras.ecorean={kind,type,material(마감 코드),size_mm,wall_mm,floor} — Blender 파이썬이 코드→텍스처 자동 매핑 가능. 내보내기는 root.clone 후 sprite/광원 제거·userData 치환(원본 장면 무손상).
  - **함정 재발**: `LIBS` 도 window.FURNITURE_LIB 로 집다가 전부 null — **뷰어의 가구가 그동안 400×400 기본 상자로 세워지고 있었음**(이름·규격·팔레트 전멸). data.js/library.js 등 클래식 스크립트 const 는 반드시 typeof 전역 식별자로.
- 2026-09-03 텍스처·전층 견적·Blender 렌더:
  - **바닥 프로시저럴 텍스처**: build3d 바닥 프림에 `mcode`(floorMaterial) → 뷰어 `floorMat(code)` 가 캔버스 텍스처 생성(원목 널결/타일 줄눈 300·600각/마블 결/카펫 노이즈, 코드별 캐시). ShapeGeometry UV=m 단위라 `tex.repeat=1/S`(S=한 장의 실크기 m). 벽은 평색 유지.
  - **전층 합산 견적**: `_withFloorData(f,fn)`(ui.js — 잠든 층 데이터로 STATE 배열만 잠시 스왑, finally 복원) + `buildAutoEstimateAll()`(estimate.js — priceKey 별 물량 합산·층별 내역). 견적 카드에 [현재 층|Σ 전층 합산] 토글, `sendToEstimateOS` 는 다층이면 `estimateAllFloors` 동봉. 테스트 [FE] 5건(스위처 누수 검사 포함).
  - **Blender 2단계 (검증됨)**: `scripts/blender-glb-render.py` — `blender -b -P ... -- in.glb out.png [samples] [view=iso|front|top]`. GLB extras.ecorean/재질명 MC_* 로 유리·발광·바닥(원목 Wave/타일 Brick 노드) 자동 변환, 카메라 자동 프레이밍, Cycles+디노이즈. **Blender 5.2 로 실렌더 확인(151객체 48샘플 10초)**. GLB 는 3D 뷰 [⬇GLB] 또는 스모크가 만드는 test.glb.
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
