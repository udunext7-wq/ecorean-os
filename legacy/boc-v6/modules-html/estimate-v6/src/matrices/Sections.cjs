// ECOREAN BOC v5.6 — 시공 섹션 22개 본 매트릭스
// SoT: docs/MASTER_PLAN.md §6 STEP 0 + 부록 I

const SECTIONS = {
  // 그룹 A: 주거 공간 (6) — 필수
  RESIDENTIAL: {
    living:    { name: '거실',           group: 'A', required: true,  spaces: ['LIVING'] },
    bedroom:   { name: '침실',           group: 'A', required: true,  spaces: ['MASTER_BEDROOM','BEDROOM','SMALL_BEDROOM'] },
    kitchen:   { name: '주방',           group: 'A', required: true,  spaces: ['KITCHEN'] },
    bathroom:  { name: '욕실',           group: 'A', required: true,  spaces: ['BATHROOM'] },
    balcony:   { name: '발코니/테라스',   group: 'A', required: false, spaces: ['BALCONY','TERRACE'] },
    entrance:  { name: '현관',           group: 'A', required: true,  spaces: ['ENTRANCE'] }
  },
  // 그룹 B: 부가 공간 (6) — 평형/필요시
  AUXILIARY: {
    dressing:  { name: '드레스룸',       group: 'B', required: false, spaces: ['DRESSING'] },
    study:     { name: '서재',           group: 'B', required: false, spaces: ['STUDY'] },
    dining:    { name: '식당',           group: 'B', required: false, spaces: ['DINING'] },
    pantry:    { name: '팬트리',         group: 'B', required: false, spaces: ['PANTRY'] },
    utility:   { name: '다용도실',       group: 'B', required: false, spaces: ['UTILITY'] },
    powder:    { name: '파우더룸',       group: 'B', required: false, spaces: ['POWDER_ROOM'] }
  },
  // 그룹 C: 특수 공간 (5) — 단독/대형
  SPECIAL: {
    boiler:    { name: '보일러실',       group: 'C', required: false, spaces: ['BOILER'],     residences: ['DETACHED_1F','DETACHED_2F','VILLA'] },
    hallway:   { name: '복도',           group: 'C', required: false, spaces: ['HALLWAY'] },
    stairs:    { name: '계단',           group: 'C', required: false, spaces: ['STAIRS'],     residences: ['DETACHED_2F'] },
    rooftop:   { name: '옥상',           group: 'C', required: false, spaces: ['ROOFTOP'],    residences: ['DETACHED_1F','DETACHED_2F','PENTHOUSE'] },
    basement:  { name: '지하/다락',      group: 'C', required: false, spaces: ['BASEMENT','ATTIC'], residences: ['DETACHED_1F','DETACHED_2F'] }
  },
  // 그룹 D: 공정 (5) — 전체 영향
  PROCESS: {
    plumbing:  { name: '배관',           group: 'D', required: true,  type: 'process' },
    electric:  { name: '전기',           group: 'D', required: true,  type: 'process' },
    window:    { name: '창호',           group: 'D', required: true,  type: 'process' },
    insulation:{ name: '단열(외벽)',      group: 'D', required: false, type: 'process', residences: ['DETACHED_1F','DETACHED_2F','PENTHOUSE'] },
    exterior:  { name: '외장/지붕',       group: 'D', required: false, type: 'process', residences: ['DETACHED_1F','DETACHED_2F'] }
  }
};

function getAllSectionIds() {
  const ids = [];
  ['RESIDENTIAL','AUXILIARY','SPECIAL','PROCESS'].forEach(function(group) {
    Object.keys(SECTIONS[group]).forEach(function(id) { ids.push(id); });
  });
  return ids;
}

function getSpacesForSections(sectionIds) {
  const result = new Set();
  const all = SECTIONS;
  sectionIds.forEach(function(secId) {
    ['RESIDENTIAL','AUXILIARY','SPECIAL','PROCESS'].forEach(function(group) {
      const sec = all[group][secId];
      if (sec && sec.spaces) {
        sec.spaces.forEach(function(s) { result.add(s); });
      }
    });
  });
  return Array.from(result);
}

function getAvailableSections(residence) {
  const ids = [];
  ['RESIDENTIAL','AUXILIARY','SPECIAL','PROCESS'].forEach(function(group) {
    Object.keys(SECTIONS[group]).forEach(function(id) {
      const sec = SECTIONS[group][id];
      if (!sec.residences || sec.residences.includes(residence)) {
        ids.push(id);
      }
    });
  });
  return ids;
}

function getSection(id) {
  let result = null;
  ['RESIDENTIAL','AUXILIARY','SPECIAL','PROCESS'].forEach(function(group) {
    if (SECTIONS[group][id]) result = SECTIONS[group][id];
  });
  return result;
}

module.exports = {
  SECTIONS: SECTIONS,
  getAllSectionIds: getAllSectionIds,
  getSpacesForSections: getSpacesForSections,
  getAvailableSections: getAvailableSections,
  getSection: getSection
};
