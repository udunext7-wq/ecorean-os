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

// 5 단계 정의
const STAGES = {
  G1: { id: 'G1', name: '유형',   automation: 30 },
  G2: { id: 'G2', name: '컨셉',   automation: 70 },
  G3: { id: 'G3', name: '섹션',   automation: 85 },
  G4: { id: 'G4', name: 'CAD',    automation: 95 },
  G5: { id: 'G5', name: '자재',   automation: 99 }
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

    this.input = {
      residence: null,
      pyeong: null,
      concept: null,
      sections: [],
      spaces: [],
      materials: []
    };

    this.lockedGates = [];
    this.currentStage = 'G1';
    this.estimate = null;
    this.listeners = new Set();
  }

  subscribe(handler) {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  _emit(eventType, payload) {
    this.listeners.forEach(h => h(eventType, payload));
  }

  getAutomation() {
    if (this.lockedGates.length === 0) return 0;
    const lastLocked = this.lockedGates[this.lockedGates.length - 1];
    return STAGES[lastLocked].automation;
  }

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

  async lockG4(opts) {
    if (!opts.spaces || opts.spaces.length === 0) {
      return { ok: false, error: 'spaces 면적 필수' };
    }
    if (!this.lockedGates.includes('G3')) return { ok: false, error: 'G3 먼저' };
    const r = this.g4.lock({ spaces: opts.spaces }, this.registry);
    if (r.ok) {
      this.input.spaces = opts.spaces;
      this.lockedGates.push('G4');
      this.currentStage = 'G5';
      await this._calculateEstimate();
      this._emit('GATE_LOCKED', {
        gate: 'G4',
        input: opts,
        estimate: this.estimate,
        automation: this.getAutomation()
      });
    }
    return r;
  }

  async lockG5(opts) {
    if (!this.lockedGates.includes('G4')) return { ok: false, error: 'G4 먼저' };
    const r = this.g5.lock({ materials: opts.materials || [] }, this.registry);
    if (r.ok) {
      this.input.materials = opts.materials || [];
      this.lockedGates.push('G5');
      this.currentStage = 'COMPLETE';
      await this._calculateEstimate();
      this._emit('GATE_LOCKED', {
        gate: 'G5',
        input: opts,
        estimate: this.estimate,
        automation: this.getAutomation()
      });
    }
    return r;
  }

  async _calculateEstimate() {
    if (!this.lockedGates.includes('G4')) return null;

    let lineItems;

    // IPC를 통해 cost_items DB → lineItems 생성 (Electron 환경)
    if (typeof window !== 'undefined' && window.boc && window.boc.cost) {
      try {
        lineItems = await window.boc.cost.buildLineItems(
          this.input.spaces, this.input.concept, { tenantId: 'HQ' }
        );
      } catch (e) {
        console.error('[WizardController] IPC 실패:', e);
        lineItems = null;
      }
    }

    // 비-Electron 환경 fallback (테스트 / 브라우저 직접 열기)
    if (!lineItems) {
      const SIM_RATES = {
        BATHROOM: { labor: 100000, material: 200000 },
        KITCHEN:  { labor: 80000,  material: 150000 },
        LIVING:   { labor: 60000,  material: 100000 },
        BEDROOM:  { labor: 50000,  material: 80000 },
        DEFAULT:  { labor: 70000,  material: 100000 }
      };
      lineItems = this.input.spaces.map(space => {
        const rate = SIM_RATES[space.typeKey] || SIM_RATES.DEFAULT;
        return {
          qty: space.area_sqm,
          wasteRate: 0.05,
          laborCost: rate.labor,
          pm: 1,
          materialCost: rate.material,
          equipment: 0,
          accessory: 0,
          difficultyAdjust: 0
        };
      });
    }

    const totalAreaSqm = this.input.spaces.reduce((sum, s) => sum + s.area_sqm, 0);
    const ctx = this.input.context || {};

    const result = calculateEstimate({
      lineItems: lineItems,
      residence: this.input.residence,
      concept: this.input.concept,
      occupied: ctx.occupied === true,
      floorLevel: ctx.floorLevel || 1,
      hasElev: ctx.hasElev !== false,
      areaSqm: totalAreaSqm
    });

    if (result.ok) {
      this.estimate = result.payload;
      const unknownCount = lineItems.filter(li => li._meta && li._meta.hasUnknown).length;
      this.estimate._unknownCount = unknownCount;
      this._emit('ESTIMATE_CALCULATED', this.estimate);
    }
    return this.estimate;
  }

  goBack() {
    if (this.lockedGates.length === 0) return { ok: false, error: '돌아갈 단계 없음' };
    const last = this.lockedGates.pop();
    this.currentStage = last;
    this._emit('GATE_UNLOCKED', { gate: last, automation: this.getAutomation() });
    return { ok: true, gate: last };
  }

  reset() {
    this.input = { residence: null, pyeong: null, concept: null, sections: [], spaces: [], materials: [] };
    this.lockedGates = [];
    this.currentStage = 'G1';
    this.estimate = null;
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
