// ECOREAN BOC v5.6 — 지역별 단가 보정
const REGION_FACTORS = {
  SEOUL_GANGNAM:  { name: '서울 강남3구', factor: 1.20, areas: ['강남구','서초구','송파구'] },
  SEOUL_OTHER:    { name: '서울 기타',    factor: 1.10, areas: ['종로구','중구','용산구','성동구','광진구','동대문구','중랑구','성북구','강북구','도봉구','노원구','은평구','서대문구','마포구','양천구','강서구','구로구','금천구','영등포구','동작구','관악구','강동구'] },
  METRO_BUSAN:    { name: '부산',         factor: 1.05, areas: ['부산'] },
  METRO_OTHER:    { name: '광역시',       factor: 1.00, areas: ['대구','인천','대전','광주','울산'] },
  PROVINCE_MAJOR: { name: '도청소재지',   factor: 0.95, areas: ['수원','춘천','청주','전주','창원','포항'] },
  PROVINCE_OTHER: { name: '기타 지방',    factor: 0.90, areas: [] },
  JEJU:           { name: '제주',         factor: 1.15, areas: ['제주','서귀포'] }
};

function getRegionByArea(area) {
  if (!area) return null;
  const upper = area.toString();

  for (let regionId in REGION_FACTORS) {
    const region = REGION_FACTORS[regionId];
    if (region.areas.some(function(a) { return upper.includes(a); })) {
      return regionId;
    }
  }
  return 'PROVINCE_OTHER';
}

function getRegionFactor(regionId) {
  const r = REGION_FACTORS[regionId];
  return r ? r.factor : 1.0;
}

function getRegionFactorByArea(area) {
  const regionId = getRegionByArea(area);
  return getRegionFactor(regionId);
}

function getAllRegions() {
  return Object.keys(REGION_FACTORS);
}

module.exports = {
  REGION_FACTORS: REGION_FACTORS,
  getRegionByArea: getRegionByArea,
  getRegionFactor: getRegionFactor,
  getRegionFactorByArea: getRegionFactorByArea,
  getAllRegions: getAllRegions
};
