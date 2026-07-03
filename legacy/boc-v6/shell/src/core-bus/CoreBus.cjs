// ECOREAN BOC v5.6 — Core Bus (이벤트 허브)
// SoT: docs/graph.json — 24 엣지가 이 버스를 통과
// 절대 규칙: 모든 통신은 이 허브를 통과. 직접 함수 호출 금지.

class CoreBus {
  constructor() {
    this.handlers = new Map();
    this.schemas = new Map();
    this.log = [];
    this.featureFlags = {};
  }

  registerSchema(eventType, schema) {
    this.schemas.set(eventType, schema);
  }

  on(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType).push(handler);
  }

  emit(eventType, payload, meta = {}) {
    const schema = this.schemas.get(eventType);
    if (schema && schema.parse) {
      try {
        schema.parse(payload);
      } catch (e) {
        console.error('[CoreBus] Schema violation on ' + eventType + ':', e.message);
        if (this.featureFlags.STRICT_SCHEMA) throw e;
      }
    }

    const entry = {
      eventType: eventType,
      payload: payload,
      meta: meta,
      timestamp: Date.now()
    };
    this.log.push(entry);
    if (this.log.length > 1000) this.log.shift();

    const list = this.handlers.get(eventType) || [];
    list.forEach(function(h) {
      try {
        h(payload, meta);
      } catch (e) {
        console.error('[CoreBus] Handler error on ' + eventType + ':', e.message);
      }
    });

    return entry;
  }

  off(eventType, handler) {
    if (!this.handlers.has(eventType)) return;
    const list = this.handlers.get(eventType);
    const idx = list.indexOf(handler);
    if (idx >= 0) list.splice(idx, 1);
  }

  getLog(filter) {
    if (!filter) return this.log.slice();
    return this.log.filter(function(e) {
      if (filter.eventType && e.eventType !== filter.eventType) return false;
      if (filter.since && e.timestamp < filter.since) return false;
      return true;
    });
  }

  setFlag(name, value) {
    this.featureFlags[name] = value;
  }

  isEnabled(flagName) {
    return !!this.featureFlags[flagName];
  }

  stats() {
    return {
      handlerCount: Array.from(this.handlers.values()).reduce(function(a, b) { return a + b.length; }, 0),
      eventTypes: Array.from(this.handlers.keys()),
      logSize: this.log.length,
      flags: Object.assign({}, this.featureFlags)
    };
  }
}

const coreBus = new CoreBus();

module.exports = { CoreBus: CoreBus, coreBus: coreBus };
