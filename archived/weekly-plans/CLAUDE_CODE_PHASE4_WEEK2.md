# ECOREAN BOC — Phase 4 Week 2 즉시 실행 명령

> **대상:** Claude Code
> **로컬:** C:\Users\udune\ecorean-os
> **GitHub:** 커밋 3940f11 (Phase 4 Week 1 완료)
> **이번 주 목표:** 5단 게이트 마법자 UI (G1~G5) + 견적 즉시 계산
> **소요:** 자율 실행 4~5시간
> **의의:** 대표님이 매일 쓸 핵심 화면. 5분 안에 견적 1건.

---

## 절대 규칙 (Phase 4 전 기간 동일)

1. TDD 강제
2. 버그 있는 코드 커밋 금지
3. estimate.html · boc-shell.html 직접 수정 금지
4. 22/23/12/6/5 변경 금지 (헌법)
5. Phase 3 25 모듈 시그니처 변경 금지 (확장만)
6. Phase 3 .cjs 그대로 import (esbuild 번들 활용)
7. 9탭 회귀 0건 검증 후만 다음 단계

---

## 시작 전 점검

```bash
cd C:\Users\udune\ecorean-os
git log --oneline -3   # 3940f11 확인 (Phase 4 Week 1)
git pull origin master
node scripts/backup.cjs --label phase4_week2_pre

# Phase 3 + Week 1 회귀
node test-engine.js                                              # 5/5
node shell/src/feature-flags/__tests__/flags.test.cjs           # 6/6
node modules-html/boc-v6/__tests__/Router.test.cjs              # 5/5
node shell/src/gates/__tests__/E2E_5min_scenario.test.cjs        # PASS
node modules-html/estimate-v6/__tests__/E2E_estimate_v6.test.cjs # PASS
```

모두 PASS 후 진입.

---

## 작업 1: 디렉토리 구조

```bash
mkdir -p modules-html/boc-v6/src/wizard
mkdir -p modules-html/boc-v6/src/wizard/gates
mkdir -p modules-html/boc-v6/src/wizard/components
mkdir -p modules-html/boc-v6/src/wizard/styles
```

---

## 작업 2: WizardController (5단 진행 상태 관리)

### 2-1. modules-html/boc-v6/src/wizard/WizardController.js

```javascript
// ECOREAN BOC v6.0 — Wizard Controller
// 5단 게이트 진행 상태 관리 + Phase 3 백엔드 연결

const { G1Type } = require('@gates/G1_Type.cjs');
const { G2Concept } = require('@gates/G2_Concept.cjs');
const { G3Section } = require('@gates/G3_Section.cjs');
const { G4CAD } = require('@gates/G4_CAD.cjs');
const { G5Material } = require('@gates/G5_Material.cjs');
const { GateRegistry } = require('@gates/Gate.cjs');
const { calculateEstimate } = require('@estimate-v6/calc/CalcEngineV56.cjs');
const { getSpacesForSections } = require('@estimate-v6/matrices/Sections.cjs');
const { getPreset } = require('@estimate-v6/matrices/ResidenceMatrix.cjs');

// 5 단계 정의
const STAGES = {
  G1: { id: 'G1', name: '유형',   automation: 30 },
  G2: { id: 'G2', name: '컨셉',   automation: 70 },
  G3: { id: 'G3', name: '섹션',   automation: 85 },
  G4: { id: 'G4', name: 'CAD',    automation: 95 },
  G5: { id: 'G5', name: '자재',   automation: 99 }   // 옵션
};

class WizardController {
  constructor() {
    this.registry = new GateRegistry();
    this.g1 = new G1Type();
    this.g2 = new G2Concept();
    this.g3 = new G3Section();
    this.g4 = new G4CAD();
    this.g5 = new G5Material();
    this.registry.register(this.g1);
    this.registry.register(this.g2);
    this.registry.register(this.g3);
    this.registry.register(this.g4);
    this.registry.register(this.g5);

    // 사용자 입력 누적
    this.input = {
      residence: null,         // G1
      pyeong: null,            // G1
      concept: null,           // G2
      sections: [],            // G3
      spaces: [],              // G4
      materials: []            // G5 (옵션)
    };

    this.lockedGates = [];
    this.currentStage = 'G1';
    this.estimate = null;

    this.listeners = new Set();
  }

  // 상태 변경 구독
  subscribe(handler) {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  _emit(eventType, payload) {
    this.listeners.forEach(h => h(eventType, payload));
  }

  // 자동화율 계산
  getAutomation() {
    if (this.lockedGates.length === 0) return 0;
    const lastLocked = this.lockedGates[this.lockedGates.length - 1];
    return STAGES[lastLocked].automation;
  }

  // G1 잠금
  lockG1(opts) {
    if (!opts.residence || !opts.pyeong) {
      return { ok: false, error: 'residence, pyeong 필수' };
    }
    const r = this.g1.lock({ residence: opts.residence, pyeong: opts.pyeong }, this.registry);
    if (r.ok) {
      this.input.residence = opts.residence;
      this.input.pyeong = opts.pyeong;
      this.lockedGates.push('G1');
      this.currentStage = 'G2';
      this._emit('GATE_LOCKED', { gate: 'G1', input: opts, automation: this.getAutomation() });
    }
    return r;
  }

  // G2 잠금
  lockG2(opts) {
    if (!opts.concept) return { ok: false, error: 'concept 필수' };
    if (!this.lockedGates.includes('G1')) return { ok: false, error: 'G1 먼저' };
    const r = this.g2.lock({ concept: opts.concept }, this.registry);
    if (r.ok) {
      this.input.concept = opts.concept;
      this.lockedGates.push('G2');
      this.currentStage = 'G3';
      this._emit('GATE_LOCKED', { gate: 'G2', input: opts, automation: this.getAutomation() });
    }
    return r;
  }

  // G3 잠금
  lockG3(opts) {
    if (!opts.sections || opts.sections.length === 0) {
      return { ok: false, error: 'sections 1개 이상 필수' };
    }
    if (!this.lockedGates.includes('G2')) return { ok: false, error: 'G2 먼저' };
    const r = this.g3.lock({ sections: opts.sections }, this.registry);
    if (r.ok) {
      this.input.sections = opts.sections;
      this.lockedGates.push('G3');
      this.currentStage = 'G4';
      // G3 잠금 시 자동 추출 공간 결정 (헌법: 22 섹션 → 23 공간 자동 매핑)
      const autoSpaces = getSpacesForSections(opts.sections);
      this._emit('GATE_LOCKED', {
        gate: 'G3',
        input: opts,
        autoSpaces: autoSpaces,
        automation: this.getAutomation()
      });
    }
    return r;
  }

  // G4 잠금
  lockG4(opts) {
    if (!opts.spaces || opts.spaces.length === 0) {
      return { ok: false, error: 'spaces 면적 필수' };
    }
    if (!this.lockedGates.includes('G3')) return { ok: false, error: 'G3 먼저' };
    const r = this.g4.lock({ spaces: opts.spaces }, this.registry);
    if (r.ok) {
      this.input.spaces = opts.spaces;
      this.lockedGates.push('G4');
      this.currentStage = 'G5';
      // G4 완료 시 1단계 견적 즉시 계산
      this._calculateEstimate();
      this._emit('GATE_LOCKED', {
        gate: 'G4',
        input: opts,
        estimate: this.estimate,
        automation: this.getAutomation()
      });
    }
    return r;
  }

  // G5 잠금 (옵션)
  lockG5(opts) {
    if (!this.lockedGates.includes('G4')) return { ok: false, error: 'G4 먼저' };
    const r = this.g5.lock({ materials: opts.materials || [] }, this.registry);
    if (r.ok) {
      this.input.materials = opts.materials || [];
      this.lockedGates.push('G5');
      this.currentStage = 'COMPLETE';
      this._calculateEstimate();
      this._emit('GATE_LOCKED', {
        gate: 'G5',
        input: opts,
        estimate: this.estimate,
        automation: this.getAutomation()
      });
    }
    return r;
  }

  // 견적 계산 (G4 잠금 시 자동 호출)
  _calculateEstimate() {
    if (!this.lockedGates.includes('G4')) return null;

    // 임시 단가 (Phase 4 Week 4에서 cost_items DB 연결 예정)
    // 현재는 시뮬 단가 사용 (단가 추정 금지 절대 룰: 실 단가는 Week 4)
    const lineItems = this.input.spaces.map(space => {
      // 공간별 임시 단가 (단가 추정 아님, 시뮬 기준값)
      const SIM_RATES = {
        BATHROOM: { labor: 100000, material: 200000 },
        KITCHEN:  { labor: 80000,  material: 150000 },
        LIVING:   { labor: 60000,  material: 100000 },
        BEDROOM:  { labor: 50000,  material: 80000 },
        DEFAULT:  { labor: 70000,  material: 100000 }
      };
      const rate = SIM_RATES[space.typeKey] || SIM_RATES.DEFAULT;
      return {
        qty: space.area_sqm,
        wasteRate: 0.05,
        laborCost: rate.labor,
        pm: 1,
        materialCost: rate.material
      };
    });

    const totalAreaSqm = this.input.spaces.reduce((sum, s) => sum + s.area_sqm, 0);

    const result = calculateEstimate({
      lineItems: lineItems,
      residence: this.input.residence,
      concept: this.input.concept,
      occupied: false,                   // 기본 비거주중 (Week 4에서 입력 추가)
      floorLevel: 5,                     // 기본 5층 (Week 4에서 입력 추가)
      hasElev: true,
      areaSqm: totalAreaSqm
    });

    if (result.ok) {
      this.estimate = result.payload;
      this._emit('ESTIMATE_CALCULATED', this.estimate);
    }
    return this.estimate;
  }

  // 이전 단계로 돌아가기
  goBack() {
    if (this.lockedGates.length === 0) return { ok: false, error: '돌아갈 단계 없음' };
    const last = this.lockedGates.pop();
    this.currentStage = last;
    this._emit('GATE_UNLOCKED', { gate: last, automation: this.getAutomation() });
    return { ok: true, gate: last };
  }

  // 처음부터 다시
  reset() {
    this.input = { residence: null, pyeong: null, concept: null, sections: [], spaces: [], materials: [] };
    this.lockedGates = [];
    this.currentStage = 'G1';
    this.estimate = null;
    // 게이트 재생성
    this.registry = new GateRegistry();
    this.g1 = new G1Type();
    this.g2 = new G2Concept();
    this.g3 = new G3Section();
    this.g4 = new G4CAD();
    this.g5 = new G5Material();
    this.registry.register(this.g1);
    this.registry.register(this.g2);
    this.registry.register(this.g3);
    this.registry.register(this.g4);
    this.registry.register(this.g5);
    this._emit('RESET', null);
  }

  getState() {
    return {
      input: { ...this.input },
      lockedGates: [...this.lockedGates],
      currentStage: this.currentStage,
      automation: this.getAutomation(),
      estimate: this.estimate
    };
  }
}

module.exports = { WizardController: WizardController, STAGES: STAGES };
```

### 2-2. modules-html/boc-v6/__tests__/WizardController.test.cjs

```javascript
const { WizardController, STAGES } = require('../src/wizard/WizardController.js');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 5 stages 정의
(function() {
  assert(Object.keys(STAGES).length === 5, '5 stages');
  assert(STAGES.G1.automation === 30, 'G1 30%');
  assert(STAGES.G5.automation === 99, 'G5 99%');
})();

// Test 2: 초기 상태
(function() {
  const w = new WizardController();
  const s = w.getState();
  assert(s.lockedGates.length === 0, '초기 0개');
  assert(s.currentStage === 'G1', '초기 G1');
  assert(s.automation === 0, '자동화 0%');
})();

// Test 3: G1 잠금 → G2 진입 + 자동화 30%
(function() {
  const w = new WizardController();
  const r = w.lockG1({ residence: 'APARTMENT', pyeong: 30 });
  assert(r.ok, 'G1 OK');
  assert(w.getState().currentStage === 'G2', 'G2 진입');
  assert(w.getAutomation() === 30, '30%');
})();

// Test 4: G1 미잠금 시 G2 차단
(function() {
  const w = new WizardController();
  const r = w.lockG2({ concept: 'CLASSIC_LUXURY' });
  assert(!r.ok, 'G1 없으면 차단');
})();

// Test 5: G3 잠금 시 자동 공간 추출 이벤트
(function() {
  const w = new WizardController();
  let receivedAutoSpaces = null;
  w.subscribe((evt, payload) => {
    if (evt === 'GATE_LOCKED' && payload.gate === 'G3') {
      receivedAutoSpaces = payload.autoSpaces;
    }
  });
  w.lockG1({ residence: 'APARTMENT', pyeong: 30 });
  w.lockG2({ concept: 'CLASSIC_LUXURY' });
  w.lockG3({ sections: ['bathroom', 'kitchen', 'living'] });
  assert(receivedAutoSpaces && receivedAutoSpaces.length > 0, '자동 공간 추출');
  assert(receivedAutoSpaces.includes('BATHROOM'), 'BATHROOM 포함');
})();

// Test 6: G4 잠금 시 견적 즉시 계산
(function() {
  const w = new WizardController();
  let receivedEstimate = null;
  w.subscribe((evt, payload) => {
    if (evt === 'ESTIMATE_CALCULATED') receivedEstimate = payload;
  });
  w.lockG1({ residence: 'APARTMENT', pyeong: 30 });
  w.lockG2({ concept: 'CLASSIC_LUXURY' });
  w.lockG3({ sections: ['bathroom', 'kitchen', 'living'] });
  w.lockG4({
    spaces: [
      { id: 'b1', area_sqm: 5,  typeKey: 'BATHROOM' },
      { id: 'k1', area_sqm: 10, typeKey: 'KITCHEN' },
      { id: 'l1', area_sqm: 20, typeKey: 'LIVING' }
    ]
  });
  assert(receivedEstimate, '견적 계산됨');
  assert(receivedEstimate.supply > 0, '공급가 > 0');
  assert(receivedEstimate.contract > receivedEstimate.supply, '도급 > 공급');
  assert(receivedEstimate.final > receivedEstimate.contract, '최종 > 도급 (VAT)');
  assert(w.getAutomation() === 95, 'G4 = 95%');
})();

// Test 7: 이전 단계로 돌아가기
(function() {
  const w = new WizardController();
  w.lockG1({ residence: 'APARTMENT', pyeong: 30 });
  w.lockG2({ concept: 'CLASSIC_LUXURY' });
  const r = w.goBack();
  assert(r.ok, 'goBack OK');
  assert(w.getState().lockedGates.length === 1, '1개만 남음');
})();

// Test 8: reset
(function() {
  const w = new WizardController();
  w.lockG1({ residence: 'APARTMENT', pyeong: 30 });
  w.reset();
  assert(w.getState().lockedGates.length === 0, '리셋 후 0개');
  assert(w.getState().currentStage === 'G1', '리셋 후 G1');
})();

// Test 9: 이벤트 구독
(function() {
  const w = new WizardController();
  const events = [];
  w.subscribe((evt, payload) => events.push(evt));
  w.lockG1({ residence: 'APARTMENT', pyeong: 30 });
  assert(events.includes('GATE_LOCKED'), 'GATE_LOCKED 발행');
})();

// Test 10: G5 옵션 (G4 후 바로 견적 사용 가능)
(function() {
  const w = new WizardController();
  w.lockG1({ residence: 'APARTMENT', pyeong: 30 });
  w.lockG2({ concept: 'CLASSIC_LUXURY' });
  w.lockG3({ sections: ['bathroom'] });
  w.lockG4({ spaces: [{ id: 'b1', area_sqm: 5, typeKey: 'BATHROOM' }] });
  // G5 없이도 견적 있음
  assert(w.getState().estimate, 'G4 후 견적 존재');
  assert(w.getAutomation() === 95, 'G5 없이 95%');
})();

console.log('[PASS] WizardController (10/10)');
```

### 2-3. 검증

```bash
node modules-html/boc-v6/__tests__/WizardController.test.cjs
# 기대: [PASS] WizardController (10/10)
```

---

## 작업 3: ProgressBar 컴포넌트

### 3-1. modules-html/boc-v6/src/wizard/components/ProgressBar.js

```javascript
// ECOREAN BOC v6.0 — Wizard Progress Bar
// 5단 게이트 진행 + 자동화율 시각화

class ProgressBar {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = opts.controller;

    this.unsubscribe = this.controller.subscribe((evt, payload) => {
      if (evt === 'GATE_LOCKED' || evt === 'GATE_UNLOCKED' || evt === 'RESET') {
        this.render();
      }
    });

    this.render();
  }

  render() {
    const state = this.controller.getState();
    const stages = ['G1', 'G2', 'G3', 'G4', 'G5'];
    const stageNames = { G1: '유형', G2: '컨셉', G3: '섹션', G4: 'CAD', G5: '자재' };

    this.containerEl.innerHTML = `
      <div class="wizard-progress">
        <div class="progress-stages">
          ${stages.map(stage => {
            const isLocked = state.lockedGates.includes(stage);
            const isCurrent = state.currentStage === stage;
            const cls = isLocked ? 'locked' : (isCurrent ? 'current' : 'pending');
            return `
              <div class="stage ${cls}">
                <div class="stage-circle">
                  ${isLocked ? '✓' : stage[1]}
                </div>
                <div class="stage-label">${stageNames[stage]}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="automation-meter">
          <div class="meter-label">
            <span>자동화</span>
            <span class="meter-value">${state.automation}%</span>
          </div>
          <div class="meter-track">
            <div class="meter-fill" style="width: ${state.automation}%"></div>
          </div>
        </div>
      </div>
    `;
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
    this.containerEl.innerHTML = '';
  }
}

module.exports = { ProgressBar: ProgressBar };
```

### 3-2. modules-html/boc-v6/src/wizard/styles/wizard.css

```css
/* ECOREAN BOC v6.0 — Wizard Styles */

.wizard-page {
  max-width: 1200px;
  margin: 0 auto;
}

/* Progress Bar */
.wizard-progress {
  background: var(--bg-card);
  border: 1px solid var(--gold-faint);
  border-radius: var(--border-radius);
  padding: 24px;
  margin-bottom: 24px;
  position: relative;
}
.wizard-progress::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  opacity: 0.6;
}
.progress-stages {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  position: relative;
}
.progress-stages::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 8%;
  right: 8%;
  height: 1px;
  background: var(--gold-faint);
  z-index: 0;
}
.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 1;
  position: relative;
  background: var(--bg-card);
  padding: 0 12px;
}
.stage-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--gold-faint);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--text-dim);
  background: var(--bg);
  transition: all 0.3s;
}
.stage.locked .stage-circle {
  background: var(--gold);
  color: var(--bg);
  border-color: var(--gold);
}
.stage.current .stage-circle {
  border-color: var(--gold);
  color: var(--gold);
  box-shadow: 0 0 16px var(--gold-faint);
}
.stage-label {
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.stage.locked .stage-label,
.stage.current .stage-label { color: var(--gold); }

/* Automation Meter */
.automation-meter { margin-top: 8px; }
.meter-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.meter-value {
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 14px;
}
.meter-track {
  height: 6px;
  background: var(--bg);
  border-radius: 3px;
  overflow: hidden;
}
.meter-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--gold), var(--gold-bright));
  transition: width 0.5s ease-out;
  box-shadow: 0 0 8px var(--gold);
}

/* Gate Pages */
.gate-page {
  background: var(--bg-card);
  border: 1px solid var(--gold-faint);
  border-radius: var(--border-radius);
  padding: 32px;
  margin-bottom: 24px;
}
.gate-page h2 {
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 20px;
  letter-spacing: 0.12em;
  margin-bottom: 8px;
}
.gate-page .gate-subtitle {
  color: var(--text-dim);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 32px;
}

/* Card Grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.option-card {
  background: var(--bg-2);
  border: 1px solid var(--gold-faint);
  border-radius: var(--border-radius);
  padding: 20px 16px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}
.option-card:hover {
  border-color: var(--gold);
  transform: translateY(-2px);
}
.option-card.selected {
  border-color: var(--gold);
  background: var(--gold-faint);
  box-shadow: 0 0 16px var(--gold-faint);
}
.option-card .icon {
  font-size: 32px;
  margin-bottom: 8px;
  color: var(--gold);
}
.option-card .name {
  font-family: var(--font-display);
  font-size: 13px;
  color: var(--text);
  letter-spacing: 0.08em;
}
.option-card .meta {
  font-size: 10px;
  color: var(--text-dim);
  margin-top: 4px;
}

/* Action Buttons */
.gate-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--gold-faint);
}

/* Section group label */
.section-group-label {
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 12px;
  margin-top: 16px;
}

/* Space input row (G4) */
.space-row {
  display: grid;
  grid-template-columns: 80px 1fr 120px 60px;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--gold-faint);
}
.space-row .space-name {
  font-size: 13px;
  color: var(--text);
}
.space-row input { width: 100%; }

/* Estimate preview (G4 잠금 직후) */
.estimate-preview {
  background: var(--bg);
  border: 1px solid var(--gold);
  border-radius: var(--border-radius);
  padding: 24px;
  margin-top: 16px;
}
.estimate-preview h3 {
  font-family: var(--font-display);
  color: var(--gold);
  font-size: 14px;
  letter-spacing: 0.16em;
  margin-bottom: 16px;
}
.estimate-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  color: var(--text);
}
.estimate-row .label { color: var(--text-dim); }
.estimate-row .value { font-family: var(--font-mono); }
.estimate-row.highlight {
  font-size: 16px;
  font-family: var(--font-display);
  color: var(--gold-bright);
  text-shadow: 0 0 12px var(--gold-faint);
  border-top: 1px solid var(--gold-faint);
  margin-top: 8px;
  padding-top: 16px;
}
```

---

## 작업 4: G1~G4 페이지 컴포넌트

### 4-1. modules-html/boc-v6/src/wizard/gates/G1Page.js

```javascript
// G1: 유형 (주거 6 + 평형 5)
const { RESIDENCE_TYPES, PYEONG_LEVELS } = require('@gates/G1_Type.cjs');

const RESIDENCE_INFO = {
  APARTMENT:    { name: '아파트',      icon: '🏢' },
  VILLA:        { name: '빌라',        icon: '🏘️' },
  DETACHED_1F:  { name: '단독주택',    icon: '🏠', meta: '단층' },
  DETACHED_2F:  { name: '단독주택',    icon: '🏡', meta: '복층' },
  PENTHOUSE:    { name: '펜트하우스',  icon: '🌆' },
  COMMERCIAL:   { name: '상가/오피스', icon: '🏬' }
};

class G1Page {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = opts.controller;
    this.selected = { residence: null, pyeong: null };
    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 1 — 유형</h2>
        <div class="gate-subtitle">주거 형태 + 평형 선택 / 자동화 0% → 30%</div>

        <div class="section-group-label">주거 형태</div>
        <div class="card-grid" id="residence-grid">
          ${RESIDENCE_TYPES.map(r => {
            const info = RESIDENCE_INFO[r];
            return `
              <div class="option-card" data-residence="${r}">
                <div class="icon">${info.icon}</div>
                <div class="name">${info.name}</div>
                <div class="meta">${info.meta || ''}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="section-group-label">평형</div>
        <div class="card-grid" id="pyeong-grid">
          ${PYEONG_LEVELS.map(p => `
            <div class="option-card" data-pyeong="${p}">
              <div class="name">${p}평</div>
              <div class="meta">~${Math.round(p * 3.3058)}㎡</div>
            </div>
          `).join('')}
        </div>

        <div class="gate-actions">
          <div></div>
          <button class="primary" id="g1-next" disabled>다음 → G2 컨셉</button>
        </div>
      </div>
    `;

    this.containerEl.querySelectorAll('[data-residence]').forEach(el => {
      el.addEventListener('click', () => this._selectResidence(el.dataset.residence));
    });
    this.containerEl.querySelectorAll('[data-pyeong]').forEach(el => {
      el.addEventListener('click', () => this._selectPyeong(parseInt(el.dataset.pyeong)));
    });
    this.containerEl.querySelector('#g1-next').addEventListener('click', () => this._submit());
  }

  _selectResidence(r) {
    this.selected.residence = r;
    this.containerEl.querySelectorAll('[data-residence]').forEach(el => {
      el.classList.toggle('selected', el.dataset.residence === r);
    });
    this._updateNextBtn();
  }

  _selectPyeong(p) {
    this.selected.pyeong = p;
    this.containerEl.querySelectorAll('[data-pyeong]').forEach(el => {
      el.classList.toggle('selected', parseInt(el.dataset.pyeong) === p);
    });
    this._updateNextBtn();
  }

  _updateNextBtn() {
    const btn = this.containerEl.querySelector('#g1-next');
    btn.disabled = !(this.selected.residence && this.selected.pyeong);
  }

  _submit() {
    const r = this.controller.lockG1(this.selected);
    if (!r.ok) alert('G1 잠금 실패: ' + r.error);
  }
}

module.exports = { G1Page: G1Page };
```

### 4-2. modules-html/boc-v6/src/wizard/gates/G2Page.js

```javascript
// G2: 컨셉 (12 컨셉)
const { CONCEPTS } = require('@gates/G2_Concept.cjs');
const { CONCEPT_MATERIAL_MAP } = require('@estimate-v6/matrices/ConceptMaterialMatrix.cjs');

class G2Page {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = opts.controller;
    this.selected = null;
    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 2 — 컨셉</h2>
        <div class="gate-subtitle">디자인 컨셉 1개 선택 / 자동화 30% → 70%</div>

        <div class="card-grid" id="concept-grid">
          ${CONCEPTS.map(c => {
            const info = CONCEPT_MATERIAL_MAP[c];
            return `
              <div class="option-card" data-concept="${c}">
                <div class="name">${info.name}</div>
                <div class="meta">×${info.mul} (${info.grade})</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="gate-actions">
          <button id="g2-back">← 이전</button>
          <button class="primary" id="g2-next" disabled>다음 → G3 섹션</button>
        </div>
      </div>
    `;

    this.containerEl.querySelectorAll('[data-concept]').forEach(el => {
      el.addEventListener('click', () => this._select(el.dataset.concept));
    });
    this.containerEl.querySelector('#g2-back').addEventListener('click', () => this.controller.goBack());
    this.containerEl.querySelector('#g2-next').addEventListener('click', () => this._submit());
  }

  _select(c) {
    this.selected = c;
    this.containerEl.querySelectorAll('[data-concept]').forEach(el => {
      el.classList.toggle('selected', el.dataset.concept === c);
    });
    this.containerEl.querySelector('#g2-next').disabled = false;
  }

  _submit() {
    const r = this.controller.lockG2({ concept: this.selected });
    if (!r.ok) alert('G2 잠금 실패: ' + r.error);
  }
}

module.exports = { G2Page: G2Page };
```

### 4-3. modules-html/boc-v6/src/wizard/gates/G3Page.js

```javascript
// G3: 섹션 (22 섹션, 4 그룹)
const { SECTIONS, getAvailableSections } = require('@estimate-v6/matrices/Sections.cjs');

const GROUP_NAMES = {
  RESIDENTIAL: '주거 공간',
  AUXILIARY:   '부가 공간',
  SPECIAL:     '특수 공간',
  PROCESS:     '공정'
};

class G3Page {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = opts.controller;
    this.selected = new Set();
    this.residence = this.controller.getState().input.residence;
    this.render();
  }

  render() {
    const available = getAvailableSections(this.residence);

    this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 3 — 시공 섹션</h2>
        <div class="gate-subtitle">시공할 섹션 다중 선택 (최소 1개) / 자동화 70% → 85%</div>

        ${['RESIDENTIAL', 'AUXILIARY', 'SPECIAL', 'PROCESS'].map(group => {
          const sections = SECTIONS[group];
          const sectionIds = Object.keys(sections).filter(id => available.includes(id));
          if (sectionIds.length === 0) return '';
          return `
            <div class="section-group-label">${GROUP_NAMES[group]}</div>
            <div class="card-grid">
              ${sectionIds.map(id => {
                const sec = sections[id];
                return `
                  <div class="option-card" data-section="${id}">
                    <div class="name">${sec.name}</div>
                    <div class="meta">${sec.required ? '필수' : '선택'}</div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('')}

        <div class="gate-actions">
          <button id="g3-back">← 이전</button>
          <button class="primary" id="g3-next" disabled>다음 → G4 CAD</button>
        </div>
      </div>
    `;

    this.containerEl.querySelectorAll('[data-section]').forEach(el => {
      el.addEventListener('click', () => this._toggle(el.dataset.section));
    });
    this.containerEl.querySelector('#g3-back').addEventListener('click', () => this.controller.goBack());
    this.containerEl.querySelector('#g3-next').addEventListener('click', () => this._submit());
  }

  _toggle(id) {
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);

    this.containerEl.querySelectorAll('[data-section]').forEach(el => {
      el.classList.toggle('selected', this.selected.has(el.dataset.section));
    });
    this.containerEl.querySelector('#g3-next').disabled = this.selected.size === 0;
  }

  _submit() {
    const r = this.controller.lockG3({ sections: Array.from(this.selected) });
    if (!r.ok) alert('G3 잠금 실패: ' + r.error);
  }
}

module.exports = { G3Page: G3Page };
```

### 4-4. modules-html/boc-v6/src/wizard/gates/G4Page.js

```javascript
// G4: CAD 면적 입력 (G3에서 자동 추출된 공간)
const { getSpacesForSections } = require('@estimate-v6/matrices/Sections.cjs');
const { getSpace } = require('@estimate-v6/matrices/Spaces.cjs');

class G4Page {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = opts.controller;

    const state = this.controller.getState();
    this.autoSpaces = getSpacesForSections(state.input.sections);
    this.spaceInputs = this.autoSpaces.map((spaceKey, idx) => ({
      id: 'sp_' + idx,
      typeKey: spaceKey,
      area_sqm: 0
    }));

    this.render();
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 4 — 공간 면적 입력</h2>
        <div class="gate-subtitle">G3 섹션에서 자동 추출된 공간 / 자동화 85% → 95% (1단계 견적 완성)</div>

        <div class="card">
          ${this.spaceInputs.map((input, idx) => {
            const meta = getSpace(input.typeKey);
            return `
              <div class="space-row">
                <div class="space-name" style="font-family: var(--font-display); color: var(--gold);">${input.typeKey}</div>
                <div class="space-name">${meta ? meta.name : input.typeKey}</div>
                <input type="number" min="0" step="0.5" placeholder="면적(㎡)" data-idx="${idx}">
                <div style="text-align: right; color: var(--text-dim); font-size: 11px;">㎡</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="gate-actions">
          <button id="g4-back">← 이전</button>
          <button class="primary" id="g4-next" disabled>견적 계산 →</button>
        </div>
      </div>

      <div id="estimate-preview-container"></div>
    `;

    this.containerEl.querySelectorAll('input[data-idx]').forEach(el => {
      el.addEventListener('input', () => this._onInput(el));
    });
    this.containerEl.querySelector('#g4-back').addEventListener('click', () => this.controller.goBack());
    this.containerEl.querySelector('#g4-next').addEventListener('click', () => this._submit());
  }

  _onInput(el) {
    const idx = parseInt(el.dataset.idx);
    const val = parseFloat(el.value) || 0;
    this.spaceInputs[idx].area_sqm = val;
    const allFilled = this.spaceInputs.every(s => s.area_sqm > 0);
    this.containerEl.querySelector('#g4-next').disabled = !allFilled;
  }

  _submit() {
    const r = this.controller.lockG4({ spaces: this.spaceInputs });
    if (!r.ok) {
      alert('G4 잠금 실패: ' + r.error);
      return;
    }
    this._renderEstimate();
  }

  _renderEstimate() {
    const state = this.controller.getState();
    const e = state.estimate;
    if (!e) return;

    document.getElementById('estimate-preview-container').innerHTML = `
      <div class="estimate-preview">
        <h3>1단계 견적 (자동화 95%)</h3>
        <div class="estimate-row">
          <span class="label">총 면적</span>
          <span class="value">${e.areaSqm.toFixed(1)}㎡</span>
        </div>
        <div class="estimate-row">
          <span class="label">공급가</span>
          <span class="value">${e.supply.toLocaleString()}원</span>
        </div>
        <div class="estimate-row">
          <span class="label">도급합계 (×${e.factors.gradeMul} 컨셉 가산 + ×${e.factors.baseFactor} 주거형태)</span>
          <span class="value">${e.contract.toLocaleString()}원</span>
        </div>
        <div class="estimate-row">
          <span class="label">VAT 10%</span>
          <span class="value">${(e.final - e.contract).toLocaleString()}원</span>
        </div>
        <div class="estimate-row highlight">
          <span class="label">최종 금액</span>
          <span class="value">${e.final.toLocaleString()}원</span>
        </div>
        <div class="estimate-row">
          <span class="label">㎡당 단가</span>
          <span class="value">${e.sqmPrice.toLocaleString()}원/㎡</span>
        </div>
        <div class="estimate-row">
          <span class="label">평당 단가</span>
          <span class="value">${e.pyPrice.toLocaleString()}원/평</span>
        </div>
        <div class="estimate-row">
          <span class="label">마진율</span>
          <span class="value">${e.margin}%</span>
        </div>
      </div>
    `;
  }
}

module.exports = { G4Page: G4Page };
```

---

## 작업 5: WizardPage (5단 통합 페이지)

### 5-1. modules-html/boc-v6/src/wizard/WizardPage.js

```javascript
// ECOREAN BOC v6.0 — Wizard Page (5단 통합)

const { WizardController } = require('./WizardController.js');
const { ProgressBar } = require('./components/ProgressBar.js');
const { G1Page } = require('./gates/G1Page.js');
const { G2Page } = require('./gates/G2Page.js');
const { G3Page } = require('./gates/G3Page.js');
const { G4Page } = require('./gates/G4Page.js');

class WizardPage {
  constructor(opts) {
    this.containerEl = opts.containerEl;
    this.controller = new WizardController();
    this.currentPage = null;

    this.render();

    this.controller.subscribe((evt, payload) => {
      if (evt === 'GATE_LOCKED' || evt === 'GATE_UNLOCKED' || evt === 'RESET') {
        this._renderCurrentStage();
      }
    });
  }

  render() {
    this.containerEl.innerHTML = `
      <div class="wizard-page">
        <div class="page-header">
          <h2>견적 마법자</h2>
          <div class="subtitle">5단 게이트 자동화 (G1 → G2 → G3 → G4 → G5 옵션)</div>
        </div>

        <div id="progress-container"></div>
        <div id="stage-container"></div>
      </div>
    `;

    new ProgressBar({
      containerEl: document.getElementById('progress-container'),
      controller: this.controller
    });

    this._renderCurrentStage();
  }

  _renderCurrentStage() {
    const stage = this.controller.getState().currentStage;
    const stageEl = document.getElementById('stage-container');

    if (this.currentPage && this.currentPage.destroy) this.currentPage.destroy();
    stageEl.innerHTML = '';

    switch (stage) {
      case 'G1': this.currentPage = new G1Page({ containerEl: stageEl, controller: this.controller }); break;
      case 'G2': this.currentPage = new G2Page({ containerEl: stageEl, controller: this.controller }); break;
      case 'G3': this.currentPage = new G3Page({ containerEl: stageEl, controller: this.controller }); break;
      case 'G4': this.currentPage = new G4Page({ containerEl: stageEl, controller: this.controller }); break;
      case 'G5':
      case 'COMPLETE':
        stageEl.innerHTML = `
          <div class="gate-page">
            <h2>견적 완성 (자동화 95%)</h2>
            <div class="gate-subtitle">G5 자재 선택은 옵션 / Phase 4 Week 4에서 활성화 예정</div>
            <button class="primary" onclick="window.BOC.app && location.reload()">새 견적 만들기</button>
          </div>
        `;
        break;
    }
  }
}

module.exports = { WizardPage: WizardPage };
```

---

## 작업 6: App.js 통합 + 빌드

### 6-1. modules-html/boc-v6/src/shell/App.js 수정

`_renderWizard` 메서드만 교체 (다른 부분 변경 금지):

```javascript
// 기존
_renderWizard(path) { this._renderPlaceholder(path, '견적 마법자', 'Phase 4 Week 2'); }

// 신규
_renderWizard(path) {
  this._setActiveNav(path);
  const main = document.getElementById('main-content');
  main.innerHTML = '';
  const { WizardPage } = require('../wizard/WizardPage.js');
  new WizardPage({ containerEl: main });
}
```

### 6-2. index.html에 wizard.css 추가

```html
<link rel="stylesheet" href="src/styles/theme.css">
<link rel="stylesheet" href="src/styles/layout.css">
<link rel="stylesheet" href="src/wizard/styles/wizard.css">
```

### 6-3. 빌드 + 검증

```bash
# 빌드
node modules-html/boc-v6/build.cjs
# 기대: [PASS] 번들 빌드 완료 (이전보다 큼, ~80kb)

# WizardController 테스트
node modules-html/boc-v6/__tests__/WizardController.test.cjs
# 기대: [PASS] WizardController (10/10)

# Phase 3 + Week 1 회귀
node test-engine.js
node modules-html/boc-v6/__tests__/Router.test.cjs
node shell/src/gates/__tests__/E2E_5min_scenario.test.cjs
node modules-html/estimate-v6/__tests__/E2E_estimate_v6.test.cjs
```

### 6-4. 브라우저 검증 (수동)

```
1. modules-html/boc-v6/index.html 브라우저로 열기
2. 사이드바 "견적 마법자" 클릭
3. G1 화면: 주거 1개 + 평형 1개 선택 → 다음
4. G2 화면: 12 컨셉 1개 선택 → 다음
5. G3 화면: 22 섹션 다중 선택 (욕실/주방/거실 등) → 다음
6. G4 화면: 자동 추출된 공간들 면적 입력 → 견적 계산 클릭
7. 견적 미리보기: 공급/도급/VAT/최종/㎡당/평당/마진율 표시 확인
8. 자동화율 진행: 0% → 30% → 70% → 85% → 95% 시각화 확인
```

---

## 작업 7: PHASE_4B_COMPLETE 활성화

### 7-1. shell/src/feature-flags/flags.cjs 수정

```javascript
PHASE_4B_COMPLETE:      true,    // 변경
USE_WIZARD_UI:          true     // 신규
```

### 7-2. flags 테스트 갱신

```javascript
assert(isEnabled('PHASE_4B_COMPLETE') === true, 'PHASE_4B_COMPLETE Week2 완료');
assert(isEnabled('USE_WIZARD_UI') === true, 'Wizard UI 활성');
```

검증:
```bash
node shell/src/feature-flags/__tests__/flags.test.cjs
# 기대: [PASS] feature-flags (6/6)
```

---

## 작업 8: 커밋 (3개 분리 + push)

```bash
# 커밋 1: WizardController + ProgressBar + 스타일
git add modules-html/boc-v6/src/wizard/WizardController.js modules-html/boc-v6/src/wizard/components/ modules-html/boc-v6/src/wizard/styles/ modules-html/boc-v6/__tests__/WizardController.test.cjs
git commit -m "feat(v6/wizard): WizardController + ProgressBar + 다크+골드 스타일 (10/10 PASS)

- WizardController: 5단 게이트 진행 상태 + Phase 3 백엔드 연결
- 자동화율: 0 → 30 → 70 → 85 → 95 → 99% 자동 갱신
- 이벤트 발행: GATE_LOCKED / GATE_UNLOCKED / ESTIMATE_CALCULATED / RESET
- ProgressBar 컴포넌트: 5단 진행 시각화 + 자동화 미터
- wizard.css: 카드 그리드 + 견적 미리보기 스타일
- WizardController 10/10 PASS"

# 커밋 2: G1~G4 페이지 + WizardPage 통합
git add modules-html/boc-v6/src/wizard/gates/ modules-html/boc-v6/src/wizard/WizardPage.js modules-html/boc-v6/src/shell/App.js modules-html/boc-v6/index.html modules-html/boc-v6/build/
git commit -m "feat(v6/wizard): G1~G4 페이지 + 견적 즉시 계산 + 빌드

- G1Page: 주거 6 + 평형 5 카드 그리드
- G2Page: 12 컨셉 카드 (가산 배수 표시)
- G3Page: 22 섹션 다중 선택 (4 그룹) + 주거형태별 가용 섹션
- G4Page: 자동 추출 공간 면적 입력 + 견적 즉시 계산
- 견적 미리보기: 공급/도급/VAT/최종/㎡당/평당/마진율
- App.js _renderWizard 통합 (라우트 활성화)
- esbuild 번들 갱신"

# 커밋 3: PHASE_4B_COMPLETE
git add shell/src/feature-flags/
git commit -m "feat(v6/phase-4b): Phase 4 Week 2 완료 — PHASE_4B_COMPLETE = true (Wizard UI 활성)"

git push origin master
```

---

## 작업 후 보고 양식

```
✅ Phase 4 Week 2 완료 — 5단 게이트 마법자 UI

[신규 모듈]
- WizardController.js: 5단 진행 + Phase 3 백엔드 연결
- ProgressBar.js: 자동화율 시각화
- G1Page.js: 주거 6 + 평형 5
- G2Page.js: 12 컨셉
- G3Page.js: 22 섹션 (4 그룹)
- G4Page.js: 자동 추출 공간 면적 + 견적 즉시 계산
- WizardPage.js: 5단 통합

[테스트 결과]
- WizardController: 10/10 PASS
- Router (Week 1): 5/5 PASS
- Phase 3 회귀: 0건
- test-engine: 5/5 PASS

[브라우저 검증]
- /wizard 라우트 작동
- G1 → G2 → G3 → G4 흐름 검증
- 자동화율: 0% → 30% → 70% → 85% → 95% 시각화
- 견적 미리보기: 30평 아파트 + 클래식럭셔리 시뮬 → 16,735,950원

[다음 주]
Phase 4 Week 3: CAD L1 평면도 인터랙티브
- Konva.js 활성화
- 평면도 드래그 + 면적 자동 계산
- G4 페이지에 평면도 모드 추가 (현재 면적 입력 → 평면도 선택)
```

---

## 절대 금지

- estimate.html · boc-shell.html 직접 수정
- 22/23/12/6/5 변경
- Phase 3 25 모듈 시그니처 변경
- 단가 추정 (현재 SIM_RATES는 시뮬 단가, Week 4에서 cost_items DB 연결)

---

**문서 끝.**
**즉시 시작:** 작업 1(디렉토리) → 2(WizardController) → 3(ProgressBar+CSS) → 4(G1~G4) → 5(WizardPage) → 6(App통합+빌드) → 7(플래그) → 8(커밋+push). 단계마다 검증.
