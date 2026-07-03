const {
  STATUSES, SECTION_DURATION_DAYS, createSchedule,
  generateSchedulesForContract, transition, toDBRow
} = require('../schedule/Schedule.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

(function() {
  assert(STATUSES.length === 5, '5 상태');
})();

(function() {
  const start = Date.now();
  const s = createSchedule({ contractId: 'c1', sectionId: 'bathroom', startDate: start });
  assert(s.durationDays === 5, '욕실 5일');
  assert(s.endDate === start + 5 * 24 * 60 * 60 * 1000, 'end 자동');
})();

(function() {
  const start = Date.now();
  const list = generateSchedulesForContract('c1', ['bathroom','kitchen','living'], start);
  assert(list.length === 3, '3 공정');
  assert(list[0].sectionId === 'bathroom', '욕실 첫 공정');
  assert(list[1].startDate === list[0].endDate, '의존 시점');
})();

(function() {
  const s = createSchedule({ contractId: 'c', sectionId: 'living', startDate: Date.now() });
  assert(transition(s, 'IN_PROGRESS').ok === true, '진행');
  assert(transition(s, 'COMPLETED').ok === true, '완료');
})();

(function() {
  const s = createSchedule({ contractId: 'c', sectionId: 'living', startDate: Date.now() });
  transition(s, 'IN_PROGRESS');
  transition(s, 'DELAYED');
  assert(transition(s, 'IN_PROGRESS').ok === true, '재개');
})();

console.log('[PASS] Schedule (5/5)');
