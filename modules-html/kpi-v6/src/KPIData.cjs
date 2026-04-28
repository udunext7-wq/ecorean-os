// ECOREAN BOC v5.6 — KPI 디지털 계기판 11항목
// SoT: docs/MASTER_PLAN.md §107

const KPI_FIELDS = [
  { key: 'supply',       label: '공급가',         unit: '원',    format: 'currency' },
  { key: 'contract',     label: '도급합계',       unit: '원',    format: 'currency' },
  { key: 'final',        label: '최종(VAT)',      unit: '원',    format: 'currency' },
  { key: 'areaSqm',      label: '총 면적',        unit: '㎡',    format: 'decimal' },
  { key: 'sqmPrice',     label: '㎡당 단가',      unit: '원/㎡', format: 'currency' },
  { key: 'pyPrice',      label: '평당 단가',      unit: '원/평', format: 'currency' },
  { key: 'margin',       label: '마진율',         unit: '%',     format: 'percent' },
  { key: 'sectionCount', label: '시공섹션',       unit: '건',    format: 'integer' },
  { key: 'spaceCount',   label: '공간',           unit: '개',    format: 'integer' },
  { key: 'duration',     label: '예상 공기',      unit: '일',    format: 'integer' },
  { key: 'automation',   label: '자동화율',       unit: '%',     format: 'percent' }
];

function emptyKPIData() {
  const data = {};
  KPI_FIELDS.forEach(function(f) { data[f.key] = 0; });
  return data;
}

function fromEstimate(estimate, context) {
  const ctx = context || {};
  return {
    supply:       estimate.supply || 0,
    contract:     estimate.contract || 0,
    final:        estimate.final || 0,
    areaSqm:      estimate.areaSqm || 0,
    sqmPrice:     estimate.sqmPrice || 0,
    pyPrice:      estimate.pyPrice || 0,
    margin:       estimate.margin || 0,
    sectionCount: ctx.sectionCount || 0,
    spaceCount:   ctx.spaceCount || 0,
    duration:     ctx.duration || 0,
    automation:   ctx.automation || 0
  };
}

function format(value, formatType) {
  if (value == null) return '-';
  switch (formatType) {
    case 'currency':
      return Math.round(value).toLocaleString('ko-KR');
    case 'decimal':
      return parseFloat(value).toFixed(1);
    case 'percent':
      return parseFloat(value).toFixed(1);
    case 'integer':
      return Math.round(value).toString();
    default:
      return String(value);
  }
}

// G1=30, G2=70, G3=85, G4=95, G5=99
function automationFromGates(lockedCount) {
  const map = [0, 30, 70, 85, 95, 99];
  return map[Math.min(lockedCount, 5)] || 0;
}

function validateKPIData(data) {
  const errors = [];
  KPI_FIELDS.forEach(function(f) {
    if (typeof data[f.key] !== 'number') {
      errors.push(f.key + ' 숫자 아님');
    }
  });
  return errors;
}

module.exports = {
  KPI_FIELDS: KPI_FIELDS,
  emptyKPIData: emptyKPIData,
  fromEstimate: fromEstimate,
  format: format,
  automationFromGates: automationFromGates,
  validateKPIData: validateKPIData
};
