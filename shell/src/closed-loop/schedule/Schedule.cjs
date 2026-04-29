// ECOREAN BOC v5.6 — Schedule (공정 일정 모듈)
const STATUSES = ['PLANNED','IN_PROGRESS','COMPLETED','DELAYED','BLOCKED'];

const SECTION_DURATION_DAYS = {
  bathroom: 5, kitchen: 4, living: 3, bedroom: 2, balcony: 2,
  entrance: 1, dressing: 2, study: 2, dining: 1, pantry: 1,
  utility: 2, powder: 2, plumbing: 3, electric: 3, window: 2,
  insulation: 4, exterior: 7, boiler: 2, hallway: 1, stairs: 2,
  rooftop: 3, basement: 3
};

function createSchedule(opts) {
  if (!opts.contractId) throw new Error('Schedule: contractId 필수');
  if (!opts.sectionId) throw new Error('Schedule: sectionId 필수');
  if (!opts.startDate) throw new Error('Schedule: startDate 필수');

  const duration = opts.durationDays || SECTION_DURATION_DAYS[opts.sectionId] || 3;
  const endDate = opts.endDate || (opts.startDate + duration * 24 * 60 * 60 * 1000);

  return {
    id: opts.id || ('sch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
    contractId: opts.contractId,
    tenantId: opts.tenantId || 'HQ',
    sectionId: opts.sectionId,
    taskName: opts.taskName || (opts.sectionId + ' 공정'),
    startDate: opts.startDate,
    endDate: endDate,
    durationDays: duration,
    dependencies: opts.dependencies || [],
    status: opts.status || 'PLANNED',
    isSimulated: opts.isSimulated === true,
    createdAt: opts.createdAt || Date.now()
  };
}

function generateSchedulesForContract(contractId, sections, startDate, opts) {
  const schedules = [];
  let cursor = startDate;
  sections.forEach(function(secId) {
    const duration = SECTION_DURATION_DAYS[secId] || 3;
    const sched = createSchedule({
      contractId: contractId,
      tenantId: (opts && opts.tenantId) || 'HQ',
      sectionId: secId,
      startDate: cursor,
      durationDays: duration,
      isSimulated: opts && opts.isSimulated
    });
    schedules.push(sched);
    cursor = sched.endDate;
  });
  return schedules;
}

function transition(sched, newStatus) {
  if (!STATUSES.includes(newStatus)) return { ok: false, error: '미정의' };
  const valid = {
    PLANNED:     ['IN_PROGRESS','BLOCKED','DELAYED'],
    IN_PROGRESS: ['COMPLETED','DELAYED','BLOCKED'],
    COMPLETED:   [],
    DELAYED:     ['IN_PROGRESS','BLOCKED'],
    BLOCKED:     ['PLANNED','IN_PROGRESS']
  };
  if (!valid[sched.status].includes(newStatus)) {
    return { ok: false, error: sched.status + ' → ' + newStatus };
  }
  sched.status = newStatus;
  return { ok: true, sched: sched };
}

function toDBRow(s) {
  return {
    id: s.id,
    contract_id: s.contractId,
    tenant_id: s.tenantId,
    section_id: s.sectionId,
    task_name: s.taskName,
    start_date: s.startDate,
    end_date: s.endDate,
    duration_days: s.durationDays,
    dependencies: JSON.stringify(s.dependencies),
    status: s.status,
    is_simulated: s.isSimulated ? 1 : 0,
    created_at: s.createdAt
  };
}

module.exports = { STATUSES, SECTION_DURATION_DAYS, createSchedule, generateSchedulesForContract, transition, toDBRow };
