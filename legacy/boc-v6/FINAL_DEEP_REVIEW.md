# CLAUDE CODE — Week 9 진입 전 최종 깊이 검토
# 7개 문제 확인 + 즉시 수정 + 전체 테스트
# 2026-04-30

---

## 규칙: 확인 → 문제 있으면 즉시 수정 → 테스트 → 보고

---

## 문제 1 (🔴): 빌드 결과물 git 추적 여부

### 1-1. 확인

```bash
# .gitignore에 build 폴더 등록 여부
grep -n "build" .gitignore modules-html/boc-v6/.gitignore 2>nul

# 현재 추적 중인 빌드 파일 목록
git ls-files modules-html/boc-v6/build/ | head -10

# 추적되고 있으면 결과 있음
```

### 1-2. 추적 중이면 수정

```bash
# .gitignore에 추가
echo "" >> modules-html/boc-v6/.gitignore
echo "# 빌드 결과물 (자동 생성)" >> modules-html/boc-v6/.gitignore
echo "build/" >> modules-html/boc-v6/.gitignore
echo "build/*" >> modules-html/boc-v6/.gitignore

# 이미 추적 중인 파일 git에서 제거 (실제 파일은 유지)
git rm -r --cached modules-html/boc-v6/build/

# 다시 빌드 실행 — 정상 동작 확인
cd modules-html/boc-v6 && node build.cjs 2>&1 | tail -3 && cd ../..

# git status 확인 — build/ 폴더 파일 untracked로 표시되어야 함
git status --short | head -10
```

> ⚠️ Phase 5에서 배포 시 빌드 결과물이 필요하면 별도 release 브랜치 또는 GitHub Releases 사용.
> Phase 4 개발 단계에서는 git에서 제외.

---

## 문제 2 (🔴): dotenv 의존성

### 2-1. 확인

```bash
grep -n "dotenv" package.json
node -e "require('dotenv')" 2>&1
```

### 2-2. 없으면 추가

```bash
npm install dotenv --save
# package.json dependencies에 등록 확인
grep -A2 "dependencies" package.json | grep dotenv
```

---

## 문제 3 (🟡): Cytoscape.js 오프라인 대응

### 3-1. 확인

```bash
grep -n "cytoscape\|cdnjs\|googleapis" \
  modules-html/boc-v6/src/topology/TopologyPage.js
```

### 3-2. CDN 사용 중이면 수정 — 로컬 번들 또는 fallback

**옵션 A (간단): npm install + esbuild 번들 포함**

```bash
npm install cytoscape --save
```

TopologyPage.js 수정:
```javascript
// 기존 (CDN):
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/.../cytoscape.min.js';

// 수정 (npm):
const cytoscape = require('cytoscape');
// 직접 사용
```

**단점**: 토폴로지 노드 번들 크기 증가 (약 300KB)

**옵션 B (권고): 오프라인 안내 + CDN 실패 시 메시지**

```javascript
_loadCytoscape() {
  return new Promise((resolve, reject) => {
    if (window.cytoscape) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.26.0/cytoscape.min.js';
    script.onload  = resolve;
    script.onerror = () => reject(new Error('Cytoscape.js 로드 실패 — 인터넷 연결을 확인하거나 npm install cytoscape 실행 후 빌드'));
    setTimeout(() => reject(new Error('Cytoscape.js 로드 타임아웃 (10초)')), 10000);
    document.head.appendChild(script);
  });
}
```

> Week 9에서 운영 배포 전 옵션 A로 전환 권고.
> Phase 4에서는 옵션 B로 안내 메시지만 추가.

권고: **옵션 A (npm install)**

---

## 문제 4 (🟡): 페이지 unmount 메모리 누수

### 4-1. 각 페이지 unmount 메서드 존재 확인

```bash
for f in \
  modules-html/boc-v6/src/contract/ContractPage.js \
  modules-html/boc-v6/src/orders/OrdersPage.js \
  modules-html/boc-v6/src/schedules/SchedulesPage.js \
  modules-html/boc-v6/src/inspections/InspectionsPage.js \
  modules-html/boc-v6/src/topology/TopologyPage.js \
  modules-html/boc-v6/src/ai-executive/AIExecutivePage.js \
  modules-html/boc-v6/src/settlement/SettlementPage.js; do
  echo "=== $f ==="
  grep -n "unmount\|destroy\|removeEventListener" "$f" | head -3
done
```

### 4-2. App.js 라우트 전환 시 unmount 호출 확인

```bash
grep -n "unmount\|currentPage" modules-html/boc-v6/src/shell/App.js | head -15
```

### 4-3. 누락 발견 시 추가

각 페이지에 unmount 메서드 추가:

**TopologyPage** (Cytoscape destroy 필수):
```javascript
unmount() {
  if (this._cy) { this._cy.destroy(); this._cy = null; }
  if (this._clickHandler) {
    this.containerEl.removeEventListener('click', this._clickHandler);
  }
  this.containerEl.innerHTML = '';
}
```

(Cytoscape 생성 시 `this._cy = window.cytoscape({...})` 로 인스턴스 보관)

**SettlementPage**:
```javascript
unmount() {
  if (this._actualInputHandler) {
    this.containerEl.removeEventListener('click', this._actualInputHandler);
  }
  this.containerEl.innerHTML = '';
}
```

**AIExecutivePage**:
```javascript
unmount() {
  this.messages = [];
  this.containerEl.innerHTML = '';
}
```

**OrdersPage / SchedulesPage / InspectionsPage**:
```javascript
unmount() {
  if (this._clickHandler) {
    this.containerEl.removeEventListener('click', this._clickHandler);
  }
  this.containerEl.innerHTML = '';
}
```

### 4-4. App.js 라우트 전환 시 unmount 호출

```javascript
_renderOrders(path) {
  this._setActiveNav(path);
  // 이전 페이지 unmount
  if (this.currentPage?.unmount) this.currentPage.unmount();

  const main = document.getElementById('main-content');
  main.innerHTML = '';
  try {
    const { OrdersPage } = require('../orders/OrdersPage.js');
    this.currentPage = new OrdersPage({
      containerEl: main,
      contractId:  this.currentContract?.id || null
    });
  } catch(e) {
    main.innerHTML = `<div class="card"><p style="color:var(--negative)">발주 로드 실패: ${e.message}</p></div>`;
  }
}
```

> 7개 라우트 메서드 (_renderOrders, _renderSchedules, _renderInspections, _renderTopology, _renderAIExecutive, _renderSettlement, _renderContracts) 전부 동일 패턴 적용.

---

## 문제 5 (🟡): preload 두 파일 동기화

### 5-1. 양쪽 비교

```bash
diff <(grep -E "^\s+[a-z]+:" preload/preload.js | sort) \
     <(grep -E "^\s+[a-z]+:" electron/preload.js | sort)
```

### 5-2. 차이 있으면 수정

`updateActual`이 한쪽에만 있을 가능성:
```bash
grep -n "updateActual" preload/preload.js electron/preload.js
```

누락된 쪽에 동일 항목 추가.

### 5-3. boc 객체 전체 일치 확인

```bash
echo "=== preload/preload.js boc 항목 ==="
grep -E "create:|list:|update|generate|transition|record|query|getConfig|countLearning|measure" preload/preload.js | sort

echo "=== electron/preload.js boc 항목 ==="
grep -E "create:|list:|update|generate|transition|record|query|getConfig|countLearning|measure" electron/preload.js | sort
```

---

## 문제 6 (🟡): XSS — escapeHtml 미적용

### 6-1. 확인

```bash
grep -rn "innerHTML\|escape\|esc(" \
  modules-html/boc-v6/src/orders/ \
  modules-html/boc-v6/src/schedules/ \
  modules-html/boc-v6/src/inspections/ \
  modules-html/boc-v6/src/settlement/ 2>nul | grep -v "test\|build" | head -20
```

### 6-2. 공통 escape 유틸 추가

파일: `modules-html/boc-v6/src/contract/utils/escape.cjs`

```javascript
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

### 6-3. 사용자 입력 표시 위치에 적용

각 페이지에서 사용자 입력값(고객명, 업체명, 비고 등) 표시 시 escapeHtml() 적용:

**OrdersPage.js**:
```javascript
const { escapeHtml: esc } = require('../contract/utils/escape.cjs');

// ${o.vendor_name || '-'}        → ${esc(o.vendor_name) || '-'}
// ${o.category   || '-'}         → ${esc(o.category)   || '-'}
```

**SchedulesPage.js**:
```javascript
// ${s.section_id || '-'}         → ${esc(s.section_id) || '-'}
```

**InspectionsPage.js**:
```javascript
// ${ins.inspector || '-'}         → ${esc(ins.inspector) || '-'}
// ${ins.notes     || ''}          → ${esc(ins.notes)     || ''}
```

**SettlementPage.js**:
```javascript
// 고객명 표시 부분
// 'UNKNOWN' or '(암호화됨)' 둘 다 안전 (사용자 입력 아님) — 적용 불필요
```

> ⚠️ 시스템 생성 ID/상태값은 영문/숫자라 XSS 위험 없음 → 모든 곳에 적용 필요 없음.
> 사용자 입력값(name, vendor, notes, category, inspector)에만 적용.

---

## 문제 7 (🟢): console.log 정리

### 7-1. 디버그 로그 위치 확인

```bash
grep -rn "console\.log" \
  modules-html/boc-v6/src/ \
  shell/src/ai/ \
  shell/src/closed-loop/ 2>nul | grep -v "__tests__\|test.cjs\|build" | head -20
```

### 7-2. 운영 로그만 남기고 디버그 제거

`console.error` → 유지 (오류 추적)
`console.log('[Module]', ...)` → 유지 (운영 진단용)
`console.log('debug...', ...)` → 제거

> Week 9 정리 작업에 포함. Week 9 진입 전에는 안전한 부분만 검토.

---

## 전체 테스트 + 빌드 + 커밋 + push

```bash
# 모든 테스트
node modules-html/boc-v6/src/settlement/__tests__/Settlement.test.cjs
node modules-html/boc-v6/src/ai-executive/__tests__/AIExecutive.test.cjs
node modules-html/boc-v6/src/contract/__tests__/ContractController.test.cjs
node modules-html/boc-v6/src/orders/__tests__/OrdersController.test.cjs
node modules-html/boc-v6/src/schedules/__tests__/ScheduleController.test.cjs
node modules-html/boc-v6/src/inspections/__tests__/InspectionController.test.cjs
node shell/tests/ai/AIProvider.test.cjs
node shell/src/feature-flags/__tests__/flags.test.cjs
node shell/src/closed-loop/__tests__/Contract.test.cjs
node shell/src/closed-loop/__tests__/PurchaseOrder.test.cjs
node shell/src/closed-loop/__tests__/Schedule.test.cjs
node shell/src/closed-loop/__tests__/Inspection.test.cjs

# 빌드
cd modules-html/boc-v6 && node build.cjs 2>&1 | tail -5 && cd ../..

# 커밋 + push
git add -A
git status --short
git commit -m "fix: Week9 진입 전 최종 검토 수정 — build 추적 + dotenv + unmount + XSS + preload 동기화"
git push origin master
```

---

## 보고 형식

```
## Week 9 진입 전 최종 검토 결과

### 문제 1: 빌드 결과물 git 추적
- 추적 여부: [있었음/없었음]
- 수정: [.gitignore 추가 / 필요 없음]

### 문제 2: dotenv 의존성
- package.json 등록: [있었음/없었음]
- 수정: [npm install / 필요 없음]

### 문제 3: Cytoscape CDN
- CDN 사용: [예/아니오]
- 수정: [npm 전환 완료 / 안내 추가 / 필요 없음]

### 문제 4: 페이지 unmount
- 누락 페이지 수: [N개]
- 수정: [N개 추가]

### 문제 5: preload 동기화
- 차이 항목: [없음 / 목록]
- 수정: [완료 / 필요 없음]

### 문제 6: XSS escapeHtml
- 미적용 위치: [N개]
- 수정: [완료 / 필요 없음]

### 문제 7: console.log
- 디버그 로그 수: [N개]
- 조치: [Week 9에서 정리]

### 테스트
- 전체: [N/N PASS]

### push
- 완료 여부: [완료/미완료]

### 최종 판정
- [✅ Week 9 진입 가능 / ❌ 남은 문제]
```
