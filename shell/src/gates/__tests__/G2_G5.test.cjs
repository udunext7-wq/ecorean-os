const { G2Concept, CONCEPTS } = require('../G2_Concept.cjs');
const { G3Section } = require('../G3_Section.cjs');
const { G4CAD } = require('../G4_CAD.cjs');
const { G5Material } = require('../G5_Material.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// G2 Tests
(function() {
  assert(CONCEPTS.length === 12, '컨셉 12개');
  const g = new G2Concept();
  const r = g.lock({ concept: 'CLASSIC_LUXURY' });
  assert(r.ok === true, 'G2 lock');
  assert(r.payload.gradeMul === 1.8, 'gradeMul 1.8');
  assert(r.payload.smartHome === false, 'smartHome false');

  const g2 = new G2Concept();
  const r2 = g2.lock({ concept: 'SMART_HOME' });
  assert(r2.payload.smartHome === true, 'smartHome true');
})();

// G3 Tests
(function() {
  const g = new G3Section();
  const r = g.lock({ sections: ['bathroom','kitchen','living'] });
  assert(r.ok === true, 'G3 lock');
  assert(r.payload.autoSpaces.includes('BATHROOM'), 'auto BATHROOM');
  assert(r.payload.autoSpaces.includes('KITCHEN'), 'auto KITCHEN');
  assert(r.payload.autoSpaces.includes('LIVING'), 'auto LIVING');
})();

// G3 validate 실패 — 빈 배열
(function() {
  const g = new G3Section();
  const r = g.lock({ sections: [] });
  assert(r.ok === false, 'G3 빈 배열 차단');
})();

// G4 Tests
(function() {
  const g = new G4CAD();
  const r = g.lock({
    spaces: [
      { id: 's1', area_sqm: 20 },
      { id: 's2', area_sqm: 15 }
    ]
  });
  assert(r.ok === true, 'G4 lock');
  assert(r.payload.totalAreaSqm === 35, 'totalAreaSqm 35');
  assert(r.payload.stage1EstimateReady === true, '1단계 견적 가능');
})();

// G5 Tests
(function() {
  const g = new G5Material();
  const r = g.lock({ materials: [{ id: 'mat1', name: '강마루' }] });
  assert(r.ok === true, 'G5 lock');
  assert(r.payload.stage2EstimateReady === true, '2단계 견적 가능');
})();

console.log('[PASS] G2_G5 (5/5)');
