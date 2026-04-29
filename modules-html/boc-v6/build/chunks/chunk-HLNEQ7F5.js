import {
  __commonJS
} from "./chunk-GLFX53DW.js";

// shell/src/core-bus/CoreBus.cjs
var require_CoreBus = __commonJS({
  "shell/src/core-bus/CoreBus.cjs"(exports, module) {
    var CoreBus = class {
      constructor() {
        this.handlers = /* @__PURE__ */ new Map();
        this.schemas = /* @__PURE__ */ new Map();
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
            console.error("[CoreBus] Schema violation on " + eventType + ":", e.message);
            if (this.featureFlags.STRICT_SCHEMA) throw e;
          }
        }
        const entry = {
          eventType,
          payload,
          meta,
          timestamp: Date.now()
        };
        this.log.push(entry);
        if (this.log.length > 1e3) this.log.shift();
        const list = this.handlers.get(eventType) || [];
        list.forEach(function(h) {
          try {
            h(payload, meta);
          } catch (e) {
            console.error("[CoreBus] Handler error on " + eventType + ":", e.message);
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
          handlerCount: Array.from(this.handlers.values()).reduce(function(a, b) {
            return a + b.length;
          }, 0),
          eventTypes: Array.from(this.handlers.keys()),
          logSize: this.log.length,
          flags: Object.assign({}, this.featureFlags)
        };
      }
    };
    var coreBus = new CoreBus();
    module.exports = { CoreBus, coreBus };
  }
});

export {
  require_CoreBus
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vc2hlbGwvc3JjL2NvcmUtYnVzL0NvcmVCdXMuY2pzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvLyBFQ09SRUFOIEJPQyB2NS42IFx1MjAxNCBDb3JlIEJ1cyAoXHVDNzc0XHVCQ0E0XHVEMkI4IFx1RDVDOFx1QkUwQylcbi8vIFNvVDogZG9jcy9ncmFwaC5qc29uIFx1MjAxNCAyNCBcdUM1RTNcdUM5QzBcdUFDMDAgXHVDNzc0IFx1QkM4NFx1QzJBNFx1Qjk3QyBcdUQxQjVcdUFDRkNcbi8vIFx1QzgwOFx1QjMwMCBcdUFERENcdUNFNTk6IFx1QkFBOFx1QjRFMCBcdUQxQjVcdUMyRTBcdUM3NDAgXHVDNzc0IFx1RDVDOFx1QkUwQ1x1Qjk3QyBcdUQxQjVcdUFDRkMuIFx1QzlDMVx1QzgxMSBcdUQ1NjhcdUMyMTggXHVENjM4XHVDRDlDIFx1QUUwOFx1QzlDMC5cblxuY2xhc3MgQ29yZUJ1cyB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuaGFuZGxlcnMgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5zY2hlbWFzID0gbmV3IE1hcCgpO1xuICAgIHRoaXMubG9nID0gW107XG4gICAgdGhpcy5mZWF0dXJlRmxhZ3MgPSB7fTtcbiAgfVxuXG4gIHJlZ2lzdGVyU2NoZW1hKGV2ZW50VHlwZSwgc2NoZW1hKSB7XG4gICAgdGhpcy5zY2hlbWFzLnNldChldmVudFR5cGUsIHNjaGVtYSk7XG4gIH1cblxuICBvbihldmVudFR5cGUsIGhhbmRsZXIpIHtcbiAgICBpZiAoIXRoaXMuaGFuZGxlcnMuaGFzKGV2ZW50VHlwZSkpIHtcbiAgICAgIHRoaXMuaGFuZGxlcnMuc2V0KGV2ZW50VHlwZSwgW10pO1xuICAgIH1cbiAgICB0aGlzLmhhbmRsZXJzLmdldChldmVudFR5cGUpLnB1c2goaGFuZGxlcik7XG4gIH1cblxuICBlbWl0KGV2ZW50VHlwZSwgcGF5bG9hZCwgbWV0YSA9IHt9KSB7XG4gICAgY29uc3Qgc2NoZW1hID0gdGhpcy5zY2hlbWFzLmdldChldmVudFR5cGUpO1xuICAgIGlmIChzY2hlbWEgJiYgc2NoZW1hLnBhcnNlKSB7XG4gICAgICB0cnkge1xuICAgICAgICBzY2hlbWEucGFyc2UocGF5bG9hZCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tDb3JlQnVzXSBTY2hlbWEgdmlvbGF0aW9uIG9uICcgKyBldmVudFR5cGUgKyAnOicsIGUubWVzc2FnZSk7XG4gICAgICAgIGlmICh0aGlzLmZlYXR1cmVGbGFncy5TVFJJQ1RfU0NIRU1BKSB0aHJvdyBlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGVudHJ5ID0ge1xuICAgICAgZXZlbnRUeXBlOiBldmVudFR5cGUsXG4gICAgICBwYXlsb2FkOiBwYXlsb2FkLFxuICAgICAgbWV0YTogbWV0YSxcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgIH07XG4gICAgdGhpcy5sb2cucHVzaChlbnRyeSk7XG4gICAgaWYgKHRoaXMubG9nLmxlbmd0aCA+IDEwMDApIHRoaXMubG9nLnNoaWZ0KCk7XG5cbiAgICBjb25zdCBsaXN0ID0gdGhpcy5oYW5kbGVycy5nZXQoZXZlbnRUeXBlKSB8fCBbXTtcbiAgICBsaXN0LmZvckVhY2goZnVuY3Rpb24oaCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaChwYXlsb2FkLCBtZXRhKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignW0NvcmVCdXNdIEhhbmRsZXIgZXJyb3Igb24gJyArIGV2ZW50VHlwZSArICc6JywgZS5tZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBlbnRyeTtcbiAgfVxuXG4gIG9mZihldmVudFR5cGUsIGhhbmRsZXIpIHtcbiAgICBpZiAoIXRoaXMuaGFuZGxlcnMuaGFzKGV2ZW50VHlwZSkpIHJldHVybjtcbiAgICBjb25zdCBsaXN0ID0gdGhpcy5oYW5kbGVycy5nZXQoZXZlbnRUeXBlKTtcbiAgICBjb25zdCBpZHggPSBsaXN0LmluZGV4T2YoaGFuZGxlcik7XG4gICAgaWYgKGlkeCA+PSAwKSBsaXN0LnNwbGljZShpZHgsIDEpO1xuICB9XG5cbiAgZ2V0TG9nKGZpbHRlcikge1xuICAgIGlmICghZmlsdGVyKSByZXR1cm4gdGhpcy5sb2cuc2xpY2UoKTtcbiAgICByZXR1cm4gdGhpcy5sb2cuZmlsdGVyKGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmIChmaWx0ZXIuZXZlbnRUeXBlICYmIGUuZXZlbnRUeXBlICE9PSBmaWx0ZXIuZXZlbnRUeXBlKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAoZmlsdGVyLnNpbmNlICYmIGUudGltZXN0YW1wIDwgZmlsdGVyLnNpbmNlKSByZXR1cm4gZmFsc2U7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIHNldEZsYWcobmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLmZlYXR1cmVGbGFnc1tuYW1lXSA9IHZhbHVlO1xuICB9XG5cbiAgaXNFbmFibGVkKGZsYWdOYW1lKSB7XG4gICAgcmV0dXJuICEhdGhpcy5mZWF0dXJlRmxhZ3NbZmxhZ05hbWVdO1xuICB9XG5cbiAgc3RhdHMoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGhhbmRsZXJDb3VudDogQXJyYXkuZnJvbSh0aGlzLmhhbmRsZXJzLnZhbHVlcygpKS5yZWR1Y2UoZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gYSArIGIubGVuZ3RoOyB9LCAwKSxcbiAgICAgIGV2ZW50VHlwZXM6IEFycmF5LmZyb20odGhpcy5oYW5kbGVycy5rZXlzKCkpLFxuICAgICAgbG9nU2l6ZTogdGhpcy5sb2cubGVuZ3RoLFxuICAgICAgZmxhZ3M6IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuZmVhdHVyZUZsYWdzKVxuICAgIH07XG4gIH1cbn1cblxuY29uc3QgY29yZUJ1cyA9IG5ldyBDb3JlQnVzKCk7XG5cbm1vZHVsZS5leHBvcnRzID0geyBDb3JlQnVzOiBDb3JlQnVzLCBjb3JlQnVzOiBjb3Jl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
