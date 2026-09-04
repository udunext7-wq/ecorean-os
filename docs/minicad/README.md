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

### 미니폼(MiniForm) = 3D 모듈 제품명 (2026-09-04 대표 명명)
UI 표기·대화 모두 "미니폼". 코드 식별자(3d/ 경로·MC3D·명령 `3d`)는 유지.

### 스케치업 인터페이스 구조 전면 카피 (2026-09-04 대표 지시)
- **메뉴 바**(#menubar, 8개): 파일(PNG Ctrl+S·GLB·JSON·다시 받기) / 편집(undo·redo·삭제·선택해제) / 보기(조명·야간·천장·이름표·그림자·축 — ✓ 체크 표시) / 카메라(조감·걷기·아이소·위·정면·측면·전체) / 그리기(선 L·사각형 R) / 도구(전체) / 창(트레이·섹션) / 도움말(단축키표). 배선=`menuCmd`(view3d.js), 호버 전환·바깥 클릭 닫힘.
- **Default Tray**(#tray, 우측 5섹션 아코디언): 개체 정보(#props — 미선택 시 안내문 상주) / 재질(#paintpal — 고르면 페인트 도구 자동) / 구성요소(#addpal — 고르면 배치 도구 자동) / 스타일·표시(토글 6종) / 강사(#instructor — setTool 마다 도구 안내). `openTraySec`/`setTray`, 창 메뉴로 접기.
- **Large Tool Set 순서**(좌측): 선택 | 선·사각형 | 이동·밀기끌기·회전·배율 | 줄자 | 페인트·지우개 | 배치 | 팬·줌 (구분선 .tsep).
- **축 표시**: X빨강·평면Y초록·높이파랑(`buildAxes`, 보기 메뉴/스타일 패널 토글, build 마다 범위 재계산).
- 단축키 추가: **Ctrl+S=PNG 저장**, **?=단축키표 모달**(#keysmodal, Esc 닫힘 — Esc 는 모달→메뉴→동작취소→선택해제 순).
- 천장/이름표 토글은 `toggleCeil`/`toggleLabels` 로 일원화(툴바·메뉴·스타일 패널 공용), 상태 동기화는 `refreshStylePanel`.
- 스모크 검사: menus=8·traySecs=5·axes·instr.

### 점·선·면 구조 (2026-09-04 대표 지시 — 스케치업 기하 모델)
- **매핑**: 점=Vertex(STATE.vertices) · 선=벽/Edge(walls, v1Id/v2Id 공유) · 면=공간/Face(spaces, vertexIds) · **그룹=공간 단위**(면이 생기면 점·선·면+내부 배치가 spaceId 로 한 그룹 — 복사/삭제/이동 동반).
- **미니폼 R(사각형) = 면 생성**: op `addspace` → 2D `addSpace(polygon)` 그대로(점 4·선 4·면 1 일괄, 그룹) — 종전 '벽 4면(addrect)'에서 격상. 잠든 층은 스냅샷에 직접 생성.
- **미니폼 L(선) = 면 위에서 분할**: 뷰어 `segHitsSpace` 가 선분이 면을 가로지르는지 판정(양끝 내부/경계 교차 2회) → op `splitspace` → 2D `addLine`(분할·못 가로지르면 참조선, 잠긴 공간 보호). 빈 곳이면 종전대로 `addwall`. 잠든 층 분할은 거부+안내.
- **점·선·면 스냅(추론)**: `snap3` — 끝점(초록 ≤180mm) > 중간점(청록 ≤160) > 선 위(빨강 ≤120) > 10mm 격자. 스냅 마커 구체 + VCB 라벨에 스냅 이름. 스냅이 직교 추론보다 우선(스케치업과 동일). 데이터는 build 때 층별 `ST.snapData`(verts/walls/spaces/stats).
- **Entity Info 그룹 요약**: 면 선택 시 "그룹: 면 1 · 선(벽) N · 배치 N" (snapData.stats).
- 스모크: snapF=2·snapEnd=endpoint·snapSplit=공간id·snapWall=null. 테스트 [EDf] 5건(면 생성/분할/각 면 벽 소유/잠든 층).
- 2026-09-04 원점 기준점: 2D drawGrid 에 X빨강/Y초록 축선+파란 원점 링(#axis-*, 그리드 off 유지·인쇄 제외) + **양쪽 원점(0,0) 스냅** — 2D snapToEndpoint 에 원점 후보(끝점과 동급), 미니폼 snap3 kind 'origin'(파랑 마커 '원점(0,0)'). 테스트 [AX] 6건·스모크 snapOrg.
- 2026-09-04 사각형 UX(대표 피드백): 호버 스냅 마커(클릭 전), 첫 점 고정 구슬(startMk), 크기=반투명 면 고스트, **치수 입력 `가로,세로`**(vcbPair, 끌던 방향 부호), **생성 딜레이 제거** — 3D 발 편집은 `push3D(true)` 즉시 회신 + 낙관적 고스트(pendingG, 다음 build 때 실물 교체). E2E cdp-face 가 msPlan(평면 반영)/msRound(실물 교체) 실측.

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
- 2026-09-03 대지 제거 + 선/사각형 도구 (대표 지시):
  - **대지(전체 바닥 슬래브) 생성 안 함** — build3d 의 `_slab` 객체 제거, 방 바닥 폴리곤만. Blender 렌더에서도 튀어나온 받침판 사라짐. 그림자 받는 면은 방 바닥.
  - **L=선(벽 그리기)**: 3D 에서 클릭-클릭으로 벽 사슬 그리기(스케치업 Line) — 5° 안 직교 자동 스냅·Shift 강제 직교·숫자=길이(mm)·Esc/더블클릭=끝. **R=사각형**: 두 모서리 클릭=벽 4면(히스토리 꼬리 병합으로 Ctrl+Z 한 번에 취소 — 50개 상한에서도 동작하도록 `splice(len-4,3)`).
  - 활성 층은 2D 와 같은 `addWall` 경로(공간 귀속·vertex 공유·교차 분할), 잠든 층은 f.data 에 vertex+wall 직접 생성. op:'addwall'/'addrect' → `_apply3DWall`(ui.js).
  - 키 재배치: L=선(조명 토글은 💡 버튼만), R=사각형(회전 15° 퀵키 제거 — Q 도구·패널 버튼 사용, add 모드의 R=고스트 회전은 유지).
- 2026-09-03 배치(➕/G) + GLB 의미 탑재:
  - **3D 에서 새 객체 배치**: ➕ 도구 → #addpal(가구/위생/조명/전기/설비 전 라이브러리) → 고스트(가구는 buildFurniture 실형상, 반투명) → 바닥 클릭=배치(연속), R=회전, Esc=끝. 층은 커서 아래 객체의 층 자동. → `apply3DEdit op:'add'` → **ui.js `_apply3DAdd`**: 라이브러리 검증·makeId·findNearestSpace/makeLayerName·다운라이트 인치·선형등 length_mm, 잠든 층은 f.data 에.
  - **GLB**: 재질 이름 `MC_<hex>[_glass|_emit]`, 객체 그룹 extras.ecorean={kind,type,material(마감 코드),size_mm,wall_mm,floor} — Blender 파이썬이 코드→텍스처 자동 매핑 가능. 내보내기는 root.clone 후 sprite/광원 제거·userData 치환(원본 장면 무손상).
  - **함정 재발**: `LIBS` 도 window.FURNITURE_LIB 로 집다가 전부 null — **뷰어의 가구가 그동안 400×400 기본 상자로 세워지고 있었음**(이름·규격·팔레트 전멸). data.js/library.js 등 클래식 스크립트 const 는 반드시 typeof 전역 식별자로.
- 2026-09-03 텍스처·전층 견적·Blender 렌더:
  - **바닥 프로시저럴 텍스처**: build3d 바닥 프림에 `mcode`(floorMaterial) → 뷰어 `floorMat(code)` 가 캔버스 텍스처 생성(원목 널결/타일 줄눈 300·600각/마블 결/카펫 노이즈, 코드별 캐시). ShapeGeometry UV=m 단위라 `tex.repeat=1/S`(S=한 장의 실크기 m). 벽은 평색 유지.
  - **전층 합산 견적**: `_withFloorData(f,fn)`(ui.js — 잠든 층 데이터로 STATE 배열만 잠시 스왑, finally 복원) + `buildAutoEstimateAll()`(estimate.js — priceKey 별 물량 합산·층별 내역). 견적 카드에 [현재 층|Σ 전층 합산] 토글, `sendToEstimateOS` 는 다층이면 `estimateAllFloors` 동봉. 테스트 [FE] 5건(스위처 누수 검사 포함).
  - **Blender 2단계 (검증됨)**: `scripts/blender-glb-render.py` v2 — `blender -b -P ... -- in.glb out.png [samples] [view] [light]`
    - view: `iso`(낮은 앙각 외관)·`front`·`top`·`room`(최대 방)·`room:거실`(이름 부분 일치 — **실내 눈높이 1.5m 광각 컷**)
    - light: `day` / `night`(월드 어둡게 + 발광 40 — 조명 기구가 주인공)
    - 재질: GLB 에 실려 온 바닥 캔버스 텍스처는 유지(광만 조정), 없을 때만 Wave/Brick 프로시저럴. MC_*_glass/_emit → 유리/발광
    - extras 두 형태 수용: 정식 [⬇GLB]=`extras.ecorean`, 뷰어 루트 직접 parse=`extras.obj`(meta 포함) — `eco_of` 가 정규화
    - **Blender 5.2 실증**: 외관 iso + 거실 실내 주간/야간 렌더 성공(다운라이트 점등·코브 글로우·창 주야 표현·널결 바닥, 방 8개 자동 인식, 64샘플 ~15초)
    - 명령 예: `"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b -P scripts/blender-glb-render.py -- 도면.glb 거실.png 128 room:거실 night`
- 2026-09-04 **스케치업 동등화 완료 (인터페이스·도구·이동 컨트롤 전부, 프로토콜 5)** — 대표 지시 "인터페이스 및 모든 도구·이동 컨트롤을 스케치업과 동일하게, 미니캐드 호환 병행":
  - **선택**: Shift/Ctrl+클릭 추가·제거(`select(g,{toggle})`), **선택 상자**(`boxSelect` — →끌기=완전 포함, ←끌기=걸침 점선 `#selbox.cross`), 더블클릭=방(면+벽) `selectSpaceGroup` / 벽 이웃 `selectWallNeighbors`, 트리플=층 전체, Ctrl+A `selectAll`. 다중 선택 Entity Info 요약(종류별 개수·일괄 회전/잠금/복사/삭제/숨기기), 이동·회전(대표 중심 공전 — ui.js rotate 가 x,y 동반)·페인트·삭제 전부 다중 적용, `sendBatch` → ui.js `_apply3DBatch`(Ctrl+Z 한 번, `histSeq` 로 50 상한과 무관).
  - **우클릭 메뉴** `showCtx`(#ctxmenu — 개체정보·지우기·숨기기·잠금·회전·방/이웃 선택·전체보기·모두 보이기), Del/Backspace, **Shift+H 숨기기 · 편집▸모두 보이기**(`ST.hidden`), **잠금** op `lock`.
  - **Ctrl+C/X/V**: `copySel` → `ST.clip`(종류·규격·상대 위치), `pasteClip(ST.lastPtr)` = 마우스 위치에 batch add(인치·elev·w/h·flipped 동반 — `_apply3DAdd` 확장). **Ctrl+S = 평면 저장**(`{type:'save'}` → ui.js `_autosaveNow`), Ctrl+Shift+S=PNG.
  - **그리기**: L 선 사슬(`ST.op.chain`, 시작점 복귀=면 `addspace {pts,absorb,merge}` — 사슬 벽 흡수·Ctrl+Z 한 번), **C 원**(`addcircle {cx,cy,r}` → 2D `addCircleSpace`, `6s`=다각형), **A 호**(3클릭 → 벽 조각 batch, `arcPts`), **F 오프셋**(`offsetPoly` 안쪽 면), **D 치수 · 문자**(3D 주석 `ST.annots`). 추론: 끝점>원점>교차점>중간점>선/안내선, 픽셀 기준 반경(`mmPerPx`), **Shift=방향 고정**, ←→ 축, **↓ = 가까운 벽에 평행/수직**(`_guideDirAt`), from-점 추론(점선), 50mm 내 닫힘 힌트. VCB: `[x,y]` 절대·`<dx,dy>` 상대·`3000,2000` 사각형·음수=반대.
  - **줄자 T = 안내선**: 선/중간점에서 시작 → 평행 안내선(숫자=간격), Shift=두 점 안내선, `ST.guides`(점선 0x9A9AFF)·스냅 'guide'·편집▸안내선 삭제.
  - **VCB 후속 입력**(`vcbPostOn/Enter`): 동작 확정 직후 숫자=되돌려 그 값으로, **x3 · *3 · /3 = 배열 복사**(`arrayCopy` — 외부/내부 배열, `ST.lastMove`).
  - **문·창 = 벽 위 슬라이드**(`beginSlide`, build3d meta.wall/along → `set {x,y}`), **밀기끌기 벽 옆면 = 두께**(`set {thickness}` 30..600), 회전 도구 2단계(중심 클릭→각도기 `_protractor`), 배율 Shift=비균등.
  - **카메라**: 궤도 도구 O(좌드래그), 배면/좌/우(7/8/9), **이전/다음 시점**(`camPush/camPrev/camNext`), **평행 투영**(`setOrtho` — OrthographicCamera 교체·`_orthoFit`), Shift+Z 전체.
  - **표시**: **X-ray**(X — `setXray`, 재질 공유 대비 `material.userData._xr` 에 원본 저장), 태양 시각 슬라이더 `#st-sun`(`setSunT` → 그림자 방향·길이), **태그(레이어)** `#tags`(`TAG_OF`·`ST.tags` → `refreshVisibility`), **아웃라이너** `#outliner`(층>객체, 클릭 선택·더블클릭 확대, 열려 있을 때만 렌더 `_olDirty`), **장면** `#scenes`(localStorage `minicad.3d.scenes` — 시점·모드·투영·야간·천장·X-ray·태양·층).
  - **단축키 표(?)·메뉴·툴바(19 버튼)·트레이 8 섹션** 갱신. `MC3DVIEW` 는 `get camera()`(카메라 교체 대응) + select/boxSelect/sendBatch/setOrtho/setXray/copySel/pasteClip/addGuide/sceneAdd/… 노출.
  - 검증: `tests/minicad-3d.cjs`(프로토콜 짝·op 목록·index.html DOM·함수 존재), `?test=1` [ED] +25건(batch/rotate xy/lock/add 규격/thickness/opening xy/addspace pts·absorb·merge/addcircle/save), `cdp-3d.cjs` SKETCHUP 블록(전체선택·상자·우클릭·X-ray·투영·장면·아웃라이너·복사/붙여넣기·단축키). 캐시 `tablet103` / `3d17`.
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
