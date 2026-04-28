// ECOREAN BOC v5.6 — 공간 유형 23개 본 매트릭스
// SoT: docs/MASTER_PLAN.md §91 + 부록 J

const SPACES = {
  // 거주 (5)
  LIVING:           { name: '거실',     group: '거주', wet: false, plumbing: false, vent: 'natural' },
  MASTER_BEDROOM:   { name: '안방',     group: '거주', wet: false, plumbing: false, vent: 'natural' },
  BEDROOM:          { name: '침실',     group: '거주', wet: false, plumbing: false, vent: 'natural' },
  SMALL_BEDROOM:    { name: '작은방',   group: '거주', wet: false, plumbing: false, vent: 'natural' },
  STUDY:            { name: '서재',     group: '거주', wet: false, plumbing: false, vent: 'natural' },

  // 수도 (4)
  KITCHEN:          { name: '주방',     group: '수도', wet: true,  plumbing: true,  vent: 'mechanical', gas: true },
  DINING:           { name: '식당',     group: '수도', wet: false, plumbing: false, vent: 'natural' },
  BATHROOM:         { name: '욕실',     group: '수도', wet: true,  plumbing: true,  vent: 'mechanical', waterproof: true },
  POWDER_ROOM:      { name: '파우더룸',  group: '수도', wet: true,  plumbing: true,  vent: 'mechanical', waterproof: true },

  // 보조 (8)
  BALCONY:          { name: '발코니',   group: '보조', wet: true,  plumbing: false, vent: 'natural', waterproof: true },
  TERRACE:          { name: '테라스',   group: '보조', wet: true,  plumbing: false, vent: 'natural', waterproof: true },
  ROOFTOP:          { name: '옥상',     group: '보조', wet: true,  plumbing: false, vent: 'natural', waterproof: true },
  ENTRANCE:         { name: '현관',     group: '보조', wet: false, plumbing: false, vent: 'natural' },
  DRESSING:         { name: '드레스룸',  group: '보조', wet: false, plumbing: false, vent: 'natural' },
  PANTRY:           { name: '팬트리',   group: '보조', wet: false, plumbing: false, vent: 'natural' },
  UTILITY:          { name: '다용도실',  group: '보조', wet: true,  plumbing: true,  vent: 'mechanical' },
  BOILER:           { name: '보일러실',  group: '보조', wet: false, plumbing: true,  vent: 'mechanical', gas: true },

  // 연결 (2)
  HALLWAY:          { name: '복도',     group: '연결', wet: false, plumbing: false, vent: 'natural' },
  STAIRS:           { name: '계단',     group: '연결', wet: false, plumbing: false, vent: 'natural' },

  // 단독주택 추가 (4)
  ATTIC:            { name: '다락',     group: '단독', wet: false, plumbing: false, vent: 'natural' },
  BASEMENT:         { name: '지하실',   group: '단독', wet: true,  plumbing: false, vent: 'mechanical', waterproof: true },
  GARAGE:           { name: '차고',     group: '단독', wet: false, plumbing: false, vent: 'mechanical' },
  YARD:             { name: '마당',     group: '단독', wet: false, plumbing: false, vent: 'natural' }
};

function getAllSpaceKeys() {
  return Object.keys(SPACES);
}

function getSpace(key) {
  return SPACES[key] || null;
}

function getSpacesByGroup(group) {
  return Object.keys(SPACES).filter(function(k) {
    return SPACES[k].group === group;
  });
}

function isWet(key) { return SPACES[key] && SPACES[key].wet === true; }
function hasPlumbing(key) { return SPACES[key] && SPACES[key].plumbing === true; }
function needsWaterproof(key) { return SPACES[key] && SPACES[key].waterproof === true; }

module.exports = {
  SPACES: SPACES,
  getAllSpaceKeys: getAllSpaceKeys,
  getSpace: getSpace,
  getSpacesByGroup: getSpacesByGroup,
  isWet: isWet,
  hasPlumbing: hasPlumbing,
  needsWaterproof: needsWaterproof
};
