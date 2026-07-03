const {
  SECTIONS, getAllSectionIds, getSpacesForSections,
  getAvailableSections, getSection
} = require('../src/matrices/Sections.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

// Test 1: 22개 섹션 (6+6+5+5)
(function() {
  const all = getAllSectionIds();
  assert(all.length === 22, '22 섹션: 실제 ' + all.length);
})();

// Test 2: 그룹별 개수
(function() {
  assert(Object.keys(SECTIONS.RESIDENTIAL).length === 6, '주거 6');
  assert(Object.keys(SECTIONS.AUXILIARY).length === 6, '부가 6');
  assert(Object.keys(SECTIONS.SPECIAL).length === 5, '특수 5');
  assert(Object.keys(SECTIONS.PROCESS).length === 5, '공정 5');
})();

// Test 3: 섹션 → 공간 매핑
(function() {
  const spaces = getSpacesForSections(['bathroom','kitchen','living']);
  assert(spaces.includes('BATHROOM'), 'BATHROOM');
  assert(spaces.includes('KITCHEN'), 'KITCHEN');
  assert(spaces.includes('LIVING'), 'LIVING');
})();

// Test 4: bedroom → 3공간
(function() {
  const spaces = getSpacesForSections(['bedroom']);
  assert(spaces.length === 3, 'bedroom 3공간');
  assert(spaces.includes('MASTER_BEDROOM'), 'MASTER_BEDROOM');
})();

// Test 5: 아파트 — 단독 전용 섹션 제외
(function() {
  const apt = getAvailableSections('APARTMENT');
  assert(!apt.includes('boiler'), '아파트는 보일러 없음');
  assert(!apt.includes('exterior'), '아파트는 외장 없음');
  assert(apt.includes('living'), '아파트도 거실');
})();

// Test 6: 단독주택 복층 — 모든 특수 섹션
(function() {
  const det = getAvailableSections('DETACHED_2F');
  assert(det.includes('boiler'), '단독 보일러');
  assert(det.includes('stairs'), '단독 복층 계단');
  assert(det.includes('rooftop'), '단독 옥상');
  assert(det.includes('exterior'), '단독 외장');
})();

// Test 7: 펜트하우스 — 옥상만
(function() {
  const pent = getAvailableSections('PENTHOUSE');
  assert(pent.includes('rooftop'), '펜트 옥상');
  assert(!pent.includes('basement'), '펜트 지하 없음');
})();

// Test 8: getSection 정상
(function() {
  const sec = getSection('bathroom');
  assert(sec.name === '욕실', '욕실 이름');
  assert(sec.group === 'A', '욕실 그룹 A');
  assert(sec.required === true, '욕실 필수');
})();

console.log('[PASS] Sections (8/8)');
