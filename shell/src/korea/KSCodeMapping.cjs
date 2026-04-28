// ECOREAN BOC v5.6 — KS 자재 코드 매핑
const KS_CATEGORY_MAP = {
  flooring: {
    name: '바닥재',
    ks_groups: ['KS F 3110', 'KS F 3111', 'KS M 3802'],
    types: {
      laminate:    { name: '강화마루',  ks: 'KS F 3110' },
      hardwood:    { name: '원목마루',  ks: 'KS F 3111' },
      vinyl:       { name: 'PVC 시트',  ks: 'KS M 3802' },
      tile:        { name: '타일',      ks: 'KS L 1001' }
    }
  },
  wallcovering: {
    name: '벽지',
    ks_groups: ['KS M 7305'],
    types: {
      paper:       { name: '종이벽지',  ks: 'KS M 7305' },
      silk:        { name: '실크벽지',  ks: 'KS M 7305' },
      paint:       { name: '도장',      ks: 'KS M 6010' }
    }
  },
  ceiling: {
    name: '천장재',
    ks_groups: ['KS F 3501'],
    types: {
      gypsum:      { name: '석고보드',  ks: 'KS F 3504' },
      paint:       { name: '도장',      ks: 'KS M 6010' }
    }
  },
  door: {
    name: '문',
    ks_groups: ['KS F 3109'],
    types: {
      wood:        { name: '목재 문',   ks: 'KS F 3109' },
      steel:       { name: '강제 문',   ks: 'KS F 4520' },
      sliding:     { name: '미닫이',    ks: 'KS F 3109' }
    }
  },
  window: {
    name: '창호',
    ks_groups: ['KS F 3117', 'KS F 3221'],
    types: {
      pvc:         { name: 'PVC 창',    ks: 'KS F 3117' },
      aluminum:    { name: '알루미늄',  ks: 'KS F 3221' },
      lowE:        { name: '로이유리',  ks: 'KS L 2003' }
    }
  },
  tile: {
    name: '타일',
    ks_groups: ['KS L 1001'],
    types: {
      ceramic:     { name: '도자기',    ks: 'KS L 1001' },
      porcelain:   { name: '자기',      ks: 'KS L 1001' },
      marble:      { name: '대리석',    ks: 'KS L 1106' }
    }
  },
  plumbing: {
    name: '배관',
    ks_groups: ['KS B 5301', 'KS B 5341'],
    types: {
      water:       { name: '급수관',    ks: 'KS B 5301' },
      drain:       { name: '배수관',    ks: 'KS B 5341' },
      gas:         { name: '가스관',    ks: 'KS B 5311' }
    }
  },
  electric: {
    name: '전기',
    ks_groups: ['KS C IEC 60364'],
    types: {
      wire:        { name: '전선',      ks: 'KS C IEC 60364' },
      outlet:      { name: '콘센트',    ks: 'KS C 8301' },
      switch:      { name: '스위치',    ks: 'KS C 8302' }
    }
  }
};

function getKSCategory(category) {
  return KS_CATEGORY_MAP[category] || null;
}

function getAllCategories() {
  return Object.keys(KS_CATEGORY_MAP);
}

function getKSCode(category, type) {
  const cat = KS_CATEGORY_MAP[category];
  if (!cat || !cat.types[type]) return null;
  return cat.types[type].ks;
}

function lookupByKSCode(ksCode) {
  const results = [];
  Object.keys(KS_CATEGORY_MAP).forEach(function(cat) {
    const c = KS_CATEGORY_MAP[cat];
    Object.keys(c.types).forEach(function(t) {
      if (c.types[t].ks === ksCode) {
        results.push({ category: cat, type: t, name: c.types[t].name });
      }
    });
  });
  return results;
}

// 'KS C IEC 60364' 형식도 올바르게 매칭하는 정규식
function isValidKSFormat(code) {
  if (typeof code !== 'string') return false;
  return /^KS\s+[A-Z]+\s+(IEC\s+)?\d+$/.test(code);
}

module.exports = {
  KS_CATEGORY_MAP: KS_CATEGORY_MAP,
  getKSCategory: getKSCategory,
  getAllCategories: getAllCategories,
  getKSCode: getKSCode,
  lookupByKSCode: lookupByKSCode,
  isValidKSFormat: isValidKSFormat
};
