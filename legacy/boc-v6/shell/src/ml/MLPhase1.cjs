// ECOREAN BOC v5.6 — ML Phase 1 (수동 단계, 0~49건)
// 0~49건: 수동 / 50~99: 통계 / 100~499: XGBoost / 500+: DL
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', '..', 'ecorean-boc.db');

const PHASE_THRESHOLDS = {
  PHASE_1_MANUAL:    { min: 0,    max: 49,       algo: 'manual' },
  PHASE_2_STATS:     { min: 50,   max: 99,       algo: 'statistics' },
  PHASE_3_XGBOOST:   { min: 100,  max: 499,      algo: 'xgboost' },
  PHASE_4_DEEP:      { min: 500,  max: Infinity,  algo: 'deep_learning' }
};

function getCurrentPhase(realCount) {
  if (realCount <= 49)  return 'PHASE_1_MANUAL';
  if (realCount <= 99)  return 'PHASE_2_STATS';
  if (realCount <= 499) return 'PHASE_3_XGBOOST';
  return 'PHASE_4_DEEP';
}

function countLearningData(opts) {
  const includeSimulated = opts && opts.includeSimulated === true;
  const tenantId = (opts && opts.tenantId) || 'HQ';

  const db = new Database(DB_PATH);
  let real = 0;
  let sim = 0;
  try {
    real = db.prepare(`SELECT COUNT(*) as c FROM contracts WHERE status='COMPLETED' AND is_simulated=0 AND tenant_id=?`).get(tenantId).c;
    sim  = db.prepare(`SELECT COUNT(*) as c FROM contracts WHERE status='COMPLETED' AND is_simulated=1 AND tenant_id=?`).get(tenantId).c;
  } catch(e) {}
  db.close();

  return {
    real: real,
    simulated: includeSimulated ? sim : 0,
    total: includeSimulated ? real + sim : real,
    phase: getCurrentPhase(includeSimulated ? real + sim : real)
  };
}

function computeBasicStatistics(opts) {
  const tenantId = (opts && opts.tenantId) || 'HQ';
  const includeSimulated = opts && opts.includeSimulated === true;

  const db = new Database(DB_PATH);
  let rows = [];
  try {
    if (includeSimulated) {
      rows = db.prepare(`SELECT total_amount, final_amount, is_simulated FROM contracts WHERE status='COMPLETED' AND tenant_id=?`).all(tenantId);
    } else {
      rows = db.prepare(`SELECT total_amount, final_amount, is_simulated FROM contracts WHERE status='COMPLETED' AND is_simulated=0 AND tenant_id=?`).all(tenantId);
    }
  } catch(e) {}
  db.close();

  if (rows.length === 0) {
    return { count: 0, avgContract: 0, avgFinal: 0, phase: 'PHASE_1_MANUAL' };
  }

  const sumContract = rows.reduce(function(s, r) { return s + r.total_amount; }, 0);
  const sumFinal    = rows.reduce(function(s, r) { return s + r.final_amount; }, 0);

  return {
    count: rows.length,
    realCount: rows.filter(function(r) { return r.is_simulated === 0; }).length,
    simulatedCount: rows.filter(function(r) { return r.is_simulated === 1; }).length,
    avgContract: Math.round(sumContract / rows.length),
    avgFinal: Math.round(sumFinal / rows.length),
    phase: getCurrentPhase(rows.length)
  };
}

module.exports = { PHASE_THRESHOLDS, getCurrentPhase, countLearningData, computeBasicStatistics };
