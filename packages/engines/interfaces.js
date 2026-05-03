// packages/engines/interfaces.js
// 13 Engines — 헌법 v7.0 Constitution (B4: 13개 절대)
// 미구현 엔진은 NotImplementedError throw (P6: 가짜 PASS 절대 금지)

class NotImplementedError extends Error {
  constructor(engineName) {
    super('Engine not implemented: ' + engineName);
    this.engineName = engineName;
  }
}

const ENGINES = {
  '01_InputNormalizer': null,
  '02_PresetEngine': null,
  '03_RuleEngine': null,
  '04_DefaultSpecEngine': null,
  '05_EstimateEngine': null,
  '06_ScheduleEngine': null,
  '07_DocumentGenerator': null,
  '08_DiagnosticsEngine': null,
  '09_TestRunner': null,
  '10_CompletionReportEngine': null,
  '11_EstimateVsActualEngine': null,
  '12_MasterDBUpdateRequestEngine': null,
  '13_ApprovalLogEngine': null
};

function getEngine(name) {
  if (!(name in ENGINES)) throw new Error('Unknown engine: ' + name);
  if (ENGINES[name] === null) throw new NotImplementedError(name);
  return ENGINES[name];
}

function registerEngine(name, impl) {
  if (!(name in ENGINES)) throw new Error('Cannot register unknown engine: ' + name);
  ENGINES[name] = impl;
}

function getStatus() {
  const total = Object.keys(ENGINES).length;
  const implemented = Object.values(ENGINES).filter(v => v !== null).length;
  return { total, implemented, missing: total - implemented };
}

module.exports = { ENGINES, getEngine, registerEngine, getStatus, NotImplementedError };
