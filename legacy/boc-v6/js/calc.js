/* ECOREAN 견적 계산 엔진 */
'use strict';

const CALC = (() => {
  let DB = null;
  let ONTO = null;

  async function init() {
    const [dbRes, ontoRes] = await Promise.all([
      fetch('./db.json'),
      fetch('./ontology.json')
    ]);
    DB = await dbRes.json();
    ONTO = await ontoRes.json();
  }

  function getProcess(id) {
    return DB.processes.find(p => p.id === id) || null;
  }

  function getCategory(id) {
    return DB.categories.find(c => c.id === id) || null;
  }

  function getAllProcesses() {
    return DB ? DB.processes : [];
  }

  function getAllCategories() {
    return DB ? DB.categories : [];
  }

  /* 면적 0이면 즉시 0원 반환 */
  function calcItem(processId, qty, overridePrice = null) {
    if (!qty || qty <= 0) return { total: 0, labor: 0, material: 0, qty: 0 };
    const proc = getProcess(processId);
    if (!proc) return { total: 0, labor: 0, material: 0, qty: 0 };
    const unitPrice = overridePrice !== null ? overridePrice : proc.price;
    return {
      total: Math.round(unitPrice * qty),
      labor: Math.round(proc.labor * qty),
      material: Math.round(proc.material * qty),
      qty,
      unitPrice
    };
  }

  /* 견적서 아이템 배열 → 합계 계산 */
  function calcEstimate(items) {
    if (!items || items.length === 0) return { subtotal: 0, labor: 0, material: 0, vat: 0, total: 0 };
    let subtotal = 0, labor = 0, material = 0;
    const details = items.map(item => {
      const qty = parseFloat(item.qty) || 0;
      if (qty <= 0) {
        return { ...item, total: 0, labor: 0, material: 0, qty: 0 };
      }
      const proc = getProcess(item.processId);
      if (!proc) return { ...item, total: 0, labor: 0, material: 0 };
      const up = item.overridePrice !== undefined ? item.overridePrice : proc.price;
      const t = Math.round(up * qty);
      const l = Math.round(proc.labor * qty);
      const m = Math.round(proc.material * qty);
      subtotal += t;
      labor += l;
      material += m;
      return { ...item, processName: proc.name, unit: proc.unit, unitPrice: up, total: t, labor: l, material: m };
    });
    const vat = Math.round(subtotal * 0.1);
    return { details, subtotal, labor, material, vat, total: subtotal + vat };
  }

  /* 온톨로지 규칙 - 트리거 공정에 연결된 권장/필수 공정 반환 */
  function getOntologyLinks(processId) {
    if (!ONTO) return [];
    return ONTO.rules.filter(r => r.trigger === processId);
  }

  /* ─── 수량 계산식 적용 ─────────────────────────────────────────
   * formula types:
   *   multiply  → round(triggerQty × factor, 2)
   *   perimeter → ceil(sqrt(triggerQty) × 4)  — 면적→둘레 추정
   *   fixed     → value (고정값)
   *   manual    → null (수동 입력 필요)
   * ────────────────────────────────────────────────────────────── */
  function applyFormula(triggerQty, formula) {
    if (!formula || !triggerQty || triggerQty <= 0) return null;
    switch (formula.type) {
      case 'multiply':
        return Math.round(triggerQty * (formula.factor ?? 1) * 100) / 100;
      case 'perimeter':
        return Math.ceil(Math.sqrt(triggerQty) * 4);
      case 'fixed':
        return formula.value;
      case 'manual':
      default:
        return null;
    }
  }

  /* 현재 아이템 목록에 없는 필수 공정 찾기 (suggestedQty 포함) */
  function getMissingRequired(items) {
    if (!ONTO) return [];
    const itemMap = new Map(items.map(i => [i.processId, i]));
    const missing = [];
    itemMap.forEach((item, pid) => {
      const rules = getOntologyLinks(pid);
      rules.forEach(rule => {
        if (rule.relation !== 'REQUIRES') return;
        rule.requires.forEach((req, idx) => {
          if (itemMap.has(req)) return;
          const formula = rule.qtyFormulas ? rule.qtyFormulas[req] : null;
          const triggerQty = parseFloat(item.qty) || 0;
          missing.push({
            rule,
            missingId: req,
            missingName: rule.requiresNames[idx],
            triggerId: pid,
            triggerName: rule.triggerName,
            suggestedQty: applyFormula(triggerQty, formula),
            formula
          });
        });
      });
    });
    return missing;
  }

  /* 현재 아이템 목록에 없는 권장 공정 찾기 (suggestedQty 포함) */
  function getMissingRecommended(items) {
    if (!ONTO) return [];
    const itemMap = new Map(items.map(i => [i.processId, i]));
    const recommended = [];
    itemMap.forEach((item, pid) => {
      const rules = getOntologyLinks(pid);
      rules.forEach(rule => {
        if (rule.relation !== 'RECOMMENDS') return;
        rule.requires.forEach((req, idx) => {
          if (itemMap.has(req)) return;
          const formula = rule.qtyFormulas ? rule.qtyFormulas[req] : null;
          const triggerQty = parseFloat(item.qty) || 0;
          recommended.push({
            rule,
            missingId: req,
            missingName: rule.requiresNames[idx],
            triggerId: pid,
            triggerName: rule.triggerName,
            suggestedQty: applyFormula(triggerQty, formula),
            formula
          });
        });
      });
    });
    return recommended;
  }

  /* 누락 필수+권장 공정을 한 번에 반환 */
  function getRequiredWithQty(items) {
    return {
      required: getMissingRequired(items),
      recommended: getMissingRecommended(items)
    };
  }

  /* 누락 필수 공정을 자동으로 아이템 배열에 추가해 반환
   * - 이미 포함된 공정은 건너뜀
   * - suggestedQty가 null(manual)인 경우 qty=0으로 추가해 사용자에게 입력 유도 */
  function autoExpandItems(items) {
    const result = [...items];
    const addedIds = new Set(items.map(i => i.processId));

    getMissingRequired(items).forEach(m => {
      if (addedIds.has(m.missingId)) return;
      addedIds.add(m.missingId);
      result.push({
        processId: m.missingId,
        qty: m.suggestedQty ?? 0,
        autoAdded: true,
        triggerId: m.triggerId,
        formula: m.formula
      });
    });

    return result;
  }

  /* 카테고리별 합계 */
  function calcByCategory(details) {
    const map = {};
    details.forEach(d => {
      const proc = getProcess(d.processId);
      if (!proc) return;
      const cat = proc.cat;
      if (!map[cat]) map[cat] = { total: 0, labor: 0, material: 0, items: [] };
      map[cat].total += d.total;
      map[cat].labor += d.labor;
      map[cat].material += d.material;
      map[cat].items.push(d);
    });
    return map;
  }

  /* 면적 기반 자동 견적 (공정ID, 면적) */
  function quickCalc(processId, area) {
    if (!area || area <= 0) return 0;
    const proc = getProcess(processId);
    if (!proc) return 0;
    return Math.round(proc.price * area);
  }

  /* 숫자 → 한국 통화 포맷 */
  function formatKRW(n) {
    if (!n && n !== 0) return '-';
    return Math.round(n).toLocaleString('ko-KR') + '원';
  }

  /* 만 단위 변환 */
  function toMan(n) {
    return Math.round(n / 10000);
  }

  /* 그룹 패키지 로드 */
  function getGroup(groupId) {
    if (!ONTO) return null;
    return ONTO.groups.find(g => g.id === groupId) || null;
  }

  function getAllGroups() {
    return ONTO ? ONTO.groups : [];
  }

  function getAllRules() {
    return ONTO ? ONTO.rules : [];
  }

  /* 공정 검색 */
  function searchProcesses(keyword) {
    if (!DB || !keyword) return [];
    const kw = keyword.toLowerCase();
    return DB.processes.filter(p =>
      p.name.toLowerCase().includes(kw) ||
      p.note.toLowerCase().includes(kw) ||
      p.unit.toLowerCase().includes(kw)
    );
  }

  return {
    init,
    getProcess,
    getCategory,
    getAllProcesses,
    getAllCategories,
    calcItem,
    calcEstimate,
    applyFormula,
    getOntologyLinks,
    getMissingRequired,
    getMissingRecommended,
    getRequiredWithQty,
    autoExpandItems,
    calcByCategory,
    quickCalc,
    formatKRW,
    toMan,
    getGroup,
    getAllGroups,
    getAllRules,
    searchProcesses
  };
})();
