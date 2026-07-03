// ECOREAN BOC v5.6 — Gate 추상 클래스
// 5단 자동화 게이트 (Cascade Automation)의 부모
// SoT: docs/MASTER_PLAN.md §109.4
//
// 절대 규칙:
//   - validate() 통과 후만 lock() 가능
//   - lock() 시 다음 게이트 활성화 이벤트 발행
//   - 직전 게이트 lock 안 됐으면 다음 게이트 진입 차단

const { coreBus } = require('../core-bus/CoreBus.cjs');

class Gate {
  constructor(opts) {
    this.id = opts.id;
    this.uri = opts.uri;
    this.eventOnLock = opts.eventOnLock;
    this.dependsOn = opts.dependsOn || null;
    this.locked = false;
    this.lockedPayload = null;
    this.lockedAt = null;
  }

  validate(input) {
    throw new Error(this.id + '.validate() 미구현');
  }

  process(input) {
    throw new Error(this.id + '.process() 미구현');
  }

  lock(input, gateRegistry) {
    if (this.dependsOn && gateRegistry) {
      const prev = gateRegistry.get(this.dependsOn);
      if (!prev || !prev.locked) {
        return {
          ok: false,
          errors: [this.id + ': 직전 게이트(' + this.dependsOn + ') 미잠금']
        };
      }
    }

    const validation = this.validate(input);
    if (validation.errors && validation.errors.length > 0) {
      return { ok: false, errors: validation.errors };
    }

    const result = this.process(input);
    if (!result.ok) return result;

    this.locked = true;
    this.lockedPayload = result.payload;
    this.lockedAt = Date.now();

    coreBus.emit(this.eventOnLock, result.payload, {
      gateId: this.id,
      uri: this.uri,
      lockedAt: this.lockedAt
    });

    return { ok: true, payload: result.payload };
  }

  unlock() {
    this.locked = false;
    this.lockedPayload = null;
    this.lockedAt = null;
  }

  status() {
    return {
      id: this.id,
      locked: this.locked,
      lockedAt: this.lockedAt,
      dependsOn: this.dependsOn
    };
  }
}

class GateRegistry {
  constructor() {
    this.gates = new Map();
  }

  register(gate) { this.gates.set(gate.id, gate); }
  get(id)        { return this.gates.get(id); }
  getAll()       { return Array.from(this.gates.values()); }
  unlockAll()    { this.gates.forEach(function(g) { g.unlock(); }); }
  getLocked()    { return this.getAll().filter(function(g) { return g.locked; }); }

  getNextActivatable() {
    const lockedIds = new Set(this.getLocked().map(function(g) { return g.id; }));
    return this.getAll().find(function(g) {
      if (g.locked) return false;
      if (!g.dependsOn) return true;
      return lockedIds.has(g.dependsOn);
    });
  }
}

module.exports = { Gate, GateRegistry };
