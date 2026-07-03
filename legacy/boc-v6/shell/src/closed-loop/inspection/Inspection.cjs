// ECOREAN BOC v5.6 — Inspection (검수 모듈)
// 절대 룰: 검수 실패 후 후속 공정 진행 금지
const RESULTS = ['PASS','FAIL','CONDITIONAL_PASS','PENDING'];

function createInspection(opts) {
  if (!opts.scheduleId) throw new Error('Inspection: scheduleId 필수');
  if (!opts.sectionId) throw new Error('Inspection: sectionId 필수');

  return {
    id: opts.id || ('insp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    scheduleId: opts.scheduleId,
    tenantId: opts.tenantId || 'HQ',
    sectionId: opts.sectionId,
    inspector: opts.inspector || 'TBD',
    inspectedAt: opts.inspectedAt || null,
    result: opts.result || 'PENDING',
    notes: opts.notes || '',
    defects: opts.defects || [],
    needsResearch: opts.needsResearch === true,
    isSimulated: opts.isSimulated === true,
    createdAt: opts.createdAt || Date.now()
  };
}

function recordResult(inspection, opts) {
  if (!RESULTS.includes(opts.result)) {
    return { ok: false, error: '미정의 결과: ' + opts.result };
  }
  inspection.result = opts.result;
  inspection.inspectedAt = opts.inspectedAt || Date.now();
  inspection.inspector = opts.inspector || inspection.inspector;
  inspection.notes = opts.notes || '';
  inspection.defects = opts.defects || [];
  inspection.needsResearch = opts.needsResearch === true;
  return { ok: true, inspection: inspection };
}

// 절대 룰 — 검수 실패 후 후속 공정 진행 금지
function canProceedAfter(inspection) {
  if (inspection.result === 'PENDING') return { ok: false, reason: '검수 미실시' };
  if (inspection.result === 'FAIL') return { ok: false, reason: '검수 실패 — 후속 공정 진행 금지' };
  if (inspection.result === 'CONDITIONAL_PASS' && inspection.needsResearch) {
    return { ok: false, reason: 'NEEDS_RESEARCH 미해결' };
  }
  return { ok: true };
}

function toDBRow(i) {
  return {
    id: i.id,
    schedule_id: i.scheduleId,
    tenant_id: i.tenantId,
    section_id: i.sectionId,
    inspector: i.inspector,
    inspected_at: i.inspectedAt,
    result: i.result,
    notes: i.notes,
    defects_json: JSON.stringify(i.defects || []),
    needs_research: i.needsResearch ? 1 : 0,
    is_simulated: i.isSimulated ? 1 : 0,
    created_at: i.createdAt
  };
}

module.exports = { RESULTS, createInspection, recordResult, canProceedAfter, toDBRow };
