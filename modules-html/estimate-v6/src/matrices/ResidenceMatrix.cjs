// ECOREAN BOC v5.6 — 6 주거형태 + 5 평형 매트릭스
// SoT: docs/MASTER_PLAN.md §97 + §104 + 부록 K, L

const RESIDENCES = {
  APARTMENT:    { name: '아파트',         exterior: false, multiFloor: false, baseFactor: 1.0  },
  VILLA:        { name: '빌라',           exterior: false, multiFloor: false, baseFactor: 1.0  },
  DETACHED_1F:  { name: '단독주택(단층)',  exterior: true,  multiFloor: false, baseFactor: 1.15 },
  DETACHED_2F:  { name: '단독주택(복층)',  exterior: true,  multiFloor: true,  baseFactor: 1.20 },
  PENTHOUSE:    { name: '펜트하우스',      exterior: true,  multiFloor: false, baseFactor: 1.25 },
  COMMERCIAL:   { name: '상가/오피스',     exterior: false, multiFloor: false, baseFactor: 0.95 }
};

const PYEONG_PRESETS = {
  24: { sqm: 79,  spaces: 7,  spaceList: ['LIVING','MASTER_BEDROOM','BEDROOM','KITCHEN','BATHROOM','BALCONY','ENTRANCE'] },
  30: { sqm: 99,  spaces: 11, spaceList: ['LIVING','MASTER_BEDROOM','BEDROOM','SMALL_BEDROOM','KITCHEN','BATHROOM','POWDER_ROOM','DRESSING','BALCONY','TERRACE','ENTRANCE'] },
  34: { sqm: 112, spaces: 13, spaceList: ['LIVING','MASTER_BEDROOM','BEDROOM','SMALL_BEDROOM','STUDY','KITCHEN','DINING','BATHROOM','POWDER_ROOM','DRESSING','BALCONY','UTILITY','ENTRANCE'] },
  40: { sqm: 132, spaces: 15, spaceList: ['LIVING','MASTER_BEDROOM','BEDROOM','SMALL_BEDROOM','STUDY','KITCHEN','DINING','BATHROOM','POWDER_ROOM','DRESSING','PANTRY','BALCONY','UTILITY','HALLWAY','ENTRANCE'] },
  50: { sqm: 165, spaces: 18, spaceList: ['LIVING','MASTER_BEDROOM','BEDROOM','SMALL_BEDROOM','STUDY','KITCHEN','DINING','BATHROOM','POWDER_ROOM','DRESSING','PANTRY','BALCONY','TERRACE','UTILITY','BOILER','HALLWAY','ENTRANCE'] }
};

function getResidence(id) { return RESIDENCES[id] || null; }
function getPreset(pyeong) { return PYEONG_PRESETS[pyeong] || null; }
function getAllResidences() { return Object.keys(RESIDENCES); }
function getAllPyeongs() { return Object.keys(PYEONG_PRESETS).map(Number); }

module.exports = {
  RESIDENCES: RESIDENCES,
  PYEONG_PRESETS: PYEONG_PRESETS,
  getResidence: getResidence,
  getPreset: getPreset,
  getAllResidences: getAllResidences,
  getAllPyeongs: getAllPyeongs
};
