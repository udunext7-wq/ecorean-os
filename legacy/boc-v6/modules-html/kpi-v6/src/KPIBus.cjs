// ECOREAN BOC v5.6 — KPIBus
// estimate 결과 → KPI 디지털 계기판 자동 갱신
// CoreBus 위 얇은 래퍼

const { coreBus } = require('../../../shell/src/core-bus/CoreBus.cjs');
const { fromEstimate, automationFromGates } = require('./KPIData.cjs');

const EVENTS = {
  KPI_UPDATE:   'KPI_UPDATE',
  KPI_OBSERVED: 'KPI_OBSERVED'
};

function publishKPIUpdate(estimate, context) {
  const kpiData = fromEstimate(estimate, context);
  coreBus.emit(EVENTS.KPI_UPDATE, kpiData, {
    timestamp: Date.now(),
    source: 'estimate-v6'
  });
  return kpiData;
}

function publishAutomationUpdate(lockedGateCount) {
  const automation = automationFromGates(lockedGateCount);
  coreBus.emit(EVENTS.KPI_UPDATE, { automation: automation }, {
    timestamp: Date.now(),
    source: 'gates',
    partial: true
  });
  return automation;
}

function onKPIUpdate(handler) {
  coreBus.on(EVENTS.KPI_UPDATE, handler);
}

function publishKPIObserved(kpiData) {
  coreBus.emit(EVENTS.KPI_OBSERVED, kpiData, {
    timestamp: Date.now(),
    source: 'kpi-v6'
  });
}

module.exports = {
  EVENTS: EVENTS,
  publishKPIUpdate: publishKPIUpdate,
  publishAutomationUpdate: publishAutomationUpdate,
  onKPIUpdate: onKPIUpdate,
  publishKPIObserved: publishKPIObserved
};
