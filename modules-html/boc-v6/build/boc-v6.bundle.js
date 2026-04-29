var BOC = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // modules-html/boc-v6/src/router/Router.js
  var require_Router = __commonJS({
    "modules-html/boc-v6/src/router/Router.js"(exports, module) {
      var Router = class {
        constructor() {
          this.routes = /* @__PURE__ */ new Map();
          this.notFoundHandler = null;
          this.beforeHooks = [];
          this.currentPath = null;
        }
        register(path, handler, opts) {
          this.routes.set(path, {
            handler,
            meta: opts && opts.meta || {}
          });
        }
        setNotFound(handler) {
          this.notFoundHandler = handler;
        }
        beforeEach(hook) {
          this.beforeHooks.push(hook);
        }
        start() {
          window.addEventListener("hashchange", this._onHashChange.bind(this));
          this._onHashChange();
        }
        navigate(path) {
          window.location.hash = path;
        }
        _onHashChange() {
          const hash = window.location.hash || "#/";
          const path = hash.replace(/^#/, "") || "/";
          for (let hook of this.beforeHooks) {
            const result = hook(path, this.currentPath);
            if (result === false) return;
          }
          const route = this.routes.get(path);
          if (route) {
            this.currentPath = path;
            route.handler(path, route.meta);
          } else if (this.notFoundHandler) {
            this.notFoundHandler(path);
          }
        }
        getCurrentPath() {
          return this.currentPath;
        }
      };
      module.exports = { Router };
    }
  });

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

  // shell/src/gates/Gate.cjs
  var require_Gate = __commonJS({
    "shell/src/gates/Gate.cjs"(exports, module) {
      var { coreBus } = require_CoreBus();
      var Gate = class {
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
          throw new Error(this.id + ".validate() \uBBF8\uAD6C\uD604");
        }
        process(input) {
          throw new Error(this.id + ".process() \uBBF8\uAD6C\uD604");
        }
        lock(input, gateRegistry) {
          if (this.dependsOn && gateRegistry) {
            const prev = gateRegistry.get(this.dependsOn);
            if (!prev || !prev.locked) {
              return {
                ok: false,
                errors: [this.id + ": \uC9C1\uC804 \uAC8C\uC774\uD2B8(" + this.dependsOn + ") \uBBF8\uC7A0\uAE08"]
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
      };
      var GateRegistry = class {
        constructor() {
          this.gates = /* @__PURE__ */ new Map();
        }
        register(gate) {
          this.gates.set(gate.id, gate);
        }
        get(id) {
          return this.gates.get(id);
        }
        getAll() {
          return Array.from(this.gates.values());
        }
        unlockAll() {
          this.gates.forEach(function(g) {
            g.unlock();
          });
        }
        getLocked() {
          return this.getAll().filter(function(g) {
            return g.locked;
          });
        }
        getNextActivatable() {
          const lockedIds = new Set(this.getLocked().map(function(g) {
            return g.id;
          }));
          return this.getAll().find(function(g) {
            if (g.locked) return false;
            if (!g.dependsOn) return true;
            return lockedIds.has(g.dependsOn);
          });
        }
      };
      module.exports = { Gate, GateRegistry };
    }
  });

  // shell/src/gates/G1_Type.cjs
  var require_G1_Type = __commonJS({
    "shell/src/gates/G1_Type.cjs"(exports, module) {
      var { Gate } = require_Gate();
      var RESIDENCE_TYPES = [
        "APARTMENT",
        "VILLA",
        "DETACHED_1F",
        "DETACHED_2F",
        "PENTHOUSE",
        "COMMERCIAL"
      ];
      var PYEONG_LEVELS = [24, 30, 34, 40, 50];
      var G1Type = class extends Gate {
        constructor() {
          super({
            id: "g1_type",
            uri: "urn:ecorean:universe:1:node:g1_type",
            eventOnLock: "GATE1_LOCKED",
            dependsOn: null
          });
        }
        validate(input) {
          const errors = [];
          if (!input) {
            return { errors: ["input \uB204\uB77D"] };
          }
          if (!RESIDENCE_TYPES.includes(input.residence)) {
            errors.push("residence \uBBF8\uC815\uC758: " + input.residence);
          }
          if (!PYEONG_LEVELS.includes(input.pyeong)) {
            errors.push("pyeong \uBBF8\uC815\uC758: " + input.pyeong);
          }
          return { errors };
        }
        process(input) {
          return {
            ok: true,
            payload: {
              residence: input.residence,
              pyeong: input.pyeong,
              availableSections: this._availableSections(input.residence),
              availableSpaces: this._availableSpaces(input.residence),
              timestamp: Date.now()
            }
          };
        }
        _availableSections(residence) {
          const base = [
            "living",
            "bedroom",
            "kitchen",
            "bathroom",
            "balcony",
            "entrance",
            "dressing",
            "study",
            "dining",
            "pantry",
            "utility",
            "powder",
            "plumbing",
            "electric",
            "window"
          ];
          if (residence === "DETACHED_1F" || residence === "DETACHED_2F") {
            return base.concat(["boiler", "rooftop", "exterior", "insulation"]);
          }
          return base;
        }
        _availableSpaces(residence) {
          const base = [
            "LIVING",
            "MASTER_BEDROOM",
            "BEDROOM",
            "SMALL_BEDROOM",
            "STUDY",
            "KITCHEN",
            "DINING",
            "BATHROOM",
            "POWDER_ROOM",
            "BALCONY",
            "TERRACE",
            "ENTRANCE",
            "DRESSING",
            "PANTRY",
            "UTILITY",
            "BOILER",
            "HALLWAY",
            "STAIRS"
          ];
          if (residence === "DETACHED_1F" || residence === "DETACHED_2F") {
            return base.concat(["ROOFTOP", "ATTIC", "BASEMENT", "GARAGE", "YARD"]);
          }
          return base;
        }
      };
      module.exports = { G1Type, RESIDENCE_TYPES, PYEONG_LEVELS };
    }
  });

  // shell/src/gates/G2_Concept.cjs
  var require_G2_Concept = __commonJS({
    "shell/src/gates/G2_Concept.cjs"(exports, module) {
      var { Gate } = require_Gate();
      var CONCEPTS = [
        "SIMPLE_MODERN",
        "MINIMAL_WHITE",
        "CLASSIC_LUXURY",
        "VINTAGE_RETRO",
        "NATURAL_WOOD",
        "SCANDINAVIAN",
        "INDUSTRIAL",
        "ASIAN_ZEN",
        "PROVENCE",
        "CONTEMPORARY",
        "KOREAN_MODERN",
        "SMART_HOME"
      ];
      var GRADE_MUL = {
        MINIMAL_WHITE: 1,
        VINTAGE_RETRO: 1.1,
        INDUSTRIAL: 1.1,
        SIMPLE_MODERN: 1.2,
        SCANDINAVIAN: 1.2,
        NATURAL_WOOD: 1.3,
        KOREAN_MODERN: 1.3,
        ASIAN_ZEN: 1.4,
        PROVENCE: 1.5,
        CONTEMPORARY: 1.6,
        SMART_HOME: 1.7,
        CLASSIC_LUXURY: 1.8
      };
      var G2Concept = class extends Gate {
        constructor() {
          super({
            id: "g2_concept",
            uri: "urn:ecorean:universe:1:node:g2_concept",
            eventOnLock: "GATE2_LOCKED",
            dependsOn: "g1_type"
          });
        }
        validate(input) {
          if (!input) return { errors: ["input \uB204\uB77D"] };
          const errors = [];
          if (!CONCEPTS.includes(input.concept)) {
            errors.push("concept \uBBF8\uC815\uC758: " + input.concept);
          }
          return { errors };
        }
        process(input) {
          return {
            ok: true,
            payload: {
              concept: input.concept,
              gradeMul: GRADE_MUL[input.concept] || 1,
              materialDefaults: { concept: input.concept },
              smartHome: input.concept === "SMART_HOME",
              timestamp: Date.now()
            }
          };
        }
      };
      module.exports = { G2Concept, CONCEPTS, GRADE_MUL };
    }
  });

  // shell/src/gates/G3_Section.cjs
  var require_G3_Section = __commonJS({
    "shell/src/gates/G3_Section.cjs"(exports, module) {
      var { Gate } = require_Gate();
      var SECTION_SPACE_MAP = {
        bathroom: ["BATHROOM"],
        kitchen: ["KITCHEN"],
        living: ["LIVING"],
        bedroom: ["MASTER_BEDROOM", "BEDROOM"],
        balcony: ["BALCONY"],
        entrance: ["ENTRANCE"],
        dressing: ["DRESSING"],
        study: ["STUDY"],
        dining: ["DINING"],
        pantry: ["PANTRY"],
        utility: ["UTILITY"],
        powder: ["POWDER_ROOM"],
        boiler: ["BOILER"],
        hallway: ["HALLWAY"],
        stairs: ["STAIRS"]
      };
      var G3Section = class extends Gate {
        constructor() {
          super({
            id: "g3_section",
            uri: "urn:ecorean:universe:1:node:g3_section",
            eventOnLock: "GATE3_LOCKED",
            dependsOn: "g2_concept"
          });
        }
        validate(input) {
          const errors = [];
          if (!input || !Array.isArray(input.sections) || input.sections.length === 0) {
            errors.push("sections 1\uAC1C \uC774\uC0C1 \uD544\uC218");
          }
          return { errors };
        }
        process(input) {
          const result = /* @__PURE__ */ new Set();
          input.sections.forEach(function(sec) {
            (SECTION_SPACE_MAP[sec] || []).forEach(function(s) {
              result.add(s);
            });
          });
          return {
            ok: true,
            payload: {
              sections: input.sections,
              autoSpaces: Array.from(result),
              timestamp: Date.now()
            }
          };
        }
      };
      module.exports = { G3Section, SECTION_SPACE_MAP };
    }
  });

  // shell/src/gates/G4_CAD.cjs
  var require_G4_CAD = __commonJS({
    "shell/src/gates/G4_CAD.cjs"(exports, module) {
      var { Gate } = require_Gate();
      var G4CAD = class extends Gate {
        constructor() {
          super({
            id: "g4_cad",
            uri: "urn:ecorean:universe:1:node:g4_cad",
            eventOnLock: "GATE4_LOCKED",
            dependsOn: "g3_section"
          });
        }
        validate(input) {
          const errors = [];
          if (!input || !Array.isArray(input.spaces) || input.spaces.length === 0) {
            errors.push("spaces 1\uAC1C \uC774\uC0C1 \uD544\uC218");
          }
          if (input && input.spaces) {
            input.spaces.forEach(function(s, i) {
              if (!s.id) errors.push("spaces[" + i + "].id \uB204\uB77D");
              if (typeof s.area_sqm !== "number") errors.push("spaces[" + i + "].area_sqm \uB204\uB77D");
            });
          }
          return { errors };
        }
        process(input) {
          const totalArea = input.spaces.reduce(function(sum, s) {
            return sum + s.area_sqm;
          }, 0);
          return {
            ok: true,
            payload: {
              spaces: input.spaces,
              totalAreaSqm: totalArea,
              stage1EstimateReady: true,
              timestamp: Date.now()
            }
          };
        }
      };
      module.exports = { G4CAD };
    }
  });

  // shell/src/gates/G5_Material.cjs
  var require_G5_Material = __commonJS({
    "shell/src/gates/G5_Material.cjs"(exports, module) {
      var { Gate } = require_Gate();
      var G5Material = class extends Gate {
        constructor() {
          super({
            id: "g5_material",
            uri: "urn:ecorean:universe:1:node:g5_material",
            eventOnLock: "GATE5_LOCKED",
            dependsOn: "g4_cad"
          });
        }
        validate(input) {
          const errors = [];
          if (!input || !Array.isArray(input.materials)) {
            errors.push("materials \uBC30\uC5F4 \uD544\uC218");
          }
          return { errors };
        }
        process(input) {
          return {
            ok: true,
            payload: {
              materials: input.materials,
              stage2EstimateReady: true,
              timestamp: Date.now()
            }
          };
        }
      };
      module.exports = { G5Material };
    }
  });

  // modules-html/estimate-v6/src/matrices/ResidenceMatrix.cjs
  var require_ResidenceMatrix = __commonJS({
    "modules-html/estimate-v6/src/matrices/ResidenceMatrix.cjs"(exports, module) {
      var RESIDENCES = {
        APARTMENT: { name: "\uC544\uD30C\uD2B8", exterior: false, multiFloor: false, baseFactor: 1 },
        VILLA: { name: "\uBE4C\uB77C", exterior: false, multiFloor: false, baseFactor: 1 },
        DETACHED_1F: { name: "\uB2E8\uB3C5\uC8FC\uD0DD(\uB2E8\uCE35)", exterior: true, multiFloor: false, baseFactor: 1.15 },
        DETACHED_2F: { name: "\uB2E8\uB3C5\uC8FC\uD0DD(\uBCF5\uCE35)", exterior: true, multiFloor: true, baseFactor: 1.2 },
        PENTHOUSE: { name: "\uD39C\uD2B8\uD558\uC6B0\uC2A4", exterior: true, multiFloor: false, baseFactor: 1.25 },
        COMMERCIAL: { name: "\uC0C1\uAC00/\uC624\uD53C\uC2A4", exterior: false, multiFloor: false, baseFactor: 0.95 }
      };
      var PYEONG_PRESETS = {
        24: { sqm: 79, spaces: 7, spaceList: ["LIVING", "MASTER_BEDROOM", "BEDROOM", "KITCHEN", "BATHROOM", "BALCONY", "ENTRANCE"] },
        30: { sqm: 99, spaces: 11, spaceList: ["LIVING", "MASTER_BEDROOM", "BEDROOM", "SMALL_BEDROOM", "KITCHEN", "BATHROOM", "POWDER_ROOM", "DRESSING", "BALCONY", "TERRACE", "ENTRANCE"] },
        34: { sqm: 112, spaces: 13, spaceList: ["LIVING", "MASTER_BEDROOM", "BEDROOM", "SMALL_BEDROOM", "STUDY", "KITCHEN", "DINING", "BATHROOM", "POWDER_ROOM", "DRESSING", "BALCONY", "UTILITY", "ENTRANCE"] },
        40: { sqm: 132, spaces: 15, spaceList: ["LIVING", "MASTER_BEDROOM", "BEDROOM", "SMALL_BEDROOM", "STUDY", "KITCHEN", "DINING", "BATHROOM", "POWDER_ROOM", "DRESSING", "PANTRY", "BALCONY", "UTILITY", "HALLWAY", "ENTRANCE"] },
        50: { sqm: 165, spaces: 18, spaceList: ["LIVING", "MASTER_BEDROOM", "BEDROOM", "SMALL_BEDROOM", "STUDY", "KITCHEN", "DINING", "BATHROOM", "POWDER_ROOM", "DRESSING", "PANTRY", "BALCONY", "TERRACE", "UTILITY", "BOILER", "HALLWAY", "ENTRANCE"] }
      };
      function getResidence(id) {
        return RESIDENCES[id] || null;
      }
      function getPreset(pyeong) {
        return PYEONG_PRESETS[pyeong] || null;
      }
      function getAllResidences() {
        return Object.keys(RESIDENCES);
      }
      function getAllPyeongs() {
        return Object.keys(PYEONG_PRESETS).map(Number);
      }
      module.exports = {
        RESIDENCES,
        PYEONG_PRESETS,
        getResidence,
        getPreset,
        getAllResidences,
        getAllPyeongs
      };
    }
  });

  // modules-html/estimate-v6/src/matrices/ConceptMaterialMatrix.cjs
  var require_ConceptMaterialMatrix = __commonJS({
    "modules-html/estimate-v6/src/matrices/ConceptMaterialMatrix.cjs"(exports, module) {
      var CONCEPT_MATERIAL_MAP = {
        SIMPLE_MODERN: {
          name: "\uC2EC\uD50C\uBAA8\uB358",
          mul: 1.2,
          grade: "\uD45C\uC900",
          materials: {
            flooring: "\uAC15\uB9C8\uB8E8 \uD654\uC774\uD2B8\uC624\uD06C",
            wall: "\uD654\uC774\uD2B8 \uB3C4\uC7A5",
            ceiling: "\uD654\uC774\uD2B8 \uB3C4\uC7A5",
            door: "\uBB34\uAD11 \uD654\uC774\uD2B8",
            kitchen: "\uD654\uC774\uD2B8 + \uC6B0\uB4DC\uC190\uC7A1\uC774",
            tile_bath: "600x600 \uADF8\uB808\uC774",
            lighting: "\uB9E4\uB9BD \uB2E4\uC6B4\uB77C\uC774\uD2B8"
          }
        },
        MINIMAL_WHITE: {
          name: "\uBBF8\uB2C8\uBA40\uD654\uC774\uD2B8",
          mul: 1,
          grade: "\uD45C\uC900",
          materials: {
            flooring: "\uD654\uC774\uD2B8 \uAC15\uB9C8\uB8E8",
            wall: "\uD654\uC774\uD2B8 \uB3C4\uC7A5",
            ceiling: "\uD654\uC774\uD2B8",
            door: "\uD654\uC774\uD2B8",
            kitchen: "\uD654\uC774\uD2B8",
            tile_bath: "\uD654\uC774\uD2B8 600x600",
            lighting: "\uB2E4\uC6B4\uB77C\uC774\uD2B8"
          }
        },
        CLASSIC_LUXURY: {
          name: "\uD074\uB798\uC2DD\uB7ED\uC154\uB9AC",
          mul: 1.8,
          grade: "\uD504\uB9AC\uBBF8\uC5C4",
          materials: {
            flooring: "\uC6D0\uBAA9\uB9C8\uB8E8(\uC6D4\uB11B)",
            wall: "\uBCA0\uC774\uC9C0 \uC2E4\uD06C\uB3C4\uBC30",
            ceiling: "\uC6B0\uBB3C\uCC9C\uC7A5+\uBAB0\uB529",
            door: "\uC6B0\uB4DC \uBB34\uAD11+\uC190\uC7A1\uC774",
            kitchen: "\uB300\uB9AC\uC11D\uC0C1\uD310+\uC6B0\uB4DC",
            tile_bath: "\uB300\uB9AC\uC11D \uD328\uD134",
            lighting: "\uC0F9\uB4E4\uB9AC\uC5D0+\uB9E4\uB9BD"
          }
        },
        VINTAGE_RETRO: {
          name: "\uBE48\uD2F0\uC9C0\uB808\uD2B8\uB85C",
          mul: 1.1,
          grade: "\uD45C\uC900",
          materials: {
            flooring: "\uD5E4\uB9C1\uBCF8 \uB9C8\uB8E8",
            wall: "\uADF8\uB9B0/\uBA38\uC2A4\uD0C0\uB4DC",
            ceiling: "\uC6B0\uB4DC\uBE54(\uC635\uC158)",
            door: "\uBE48\uD2F0\uC9C0 \uC6B0\uB4DC",
            kitchen: "\uC9C4\uD55C \uADF8\uB9B0",
            tile_bath: "\uBAA8\uC790\uC774\uD06C/\uC11C\uBE0C\uC6E8\uC774",
            lighting: "\uD39C\uB358\uD2B8+\uC9C1\uBD80"
          }
        },
        NATURAL_WOOD: {
          name: "\uB0B4\uCD94\uB7F4\uC6B0\uB4DC",
          mul: 1.3,
          grade: "\uD45C\uC900+",
          materials: {
            flooring: "\uC6D0\uBAA9\uB9C8\uB8E8",
            wall: "\uBCA0\uC774\uC9C0+\uC6B0\uB4DC \uD3EC\uC778\uD2B8",
            ceiling: "\uB3C4\uC7A5(\uC544\uC774\uBCF4\uB9AC)",
            door: "\uC6B0\uB4DC \uBB34\uB2AC",
            kitchen: "\uC790\uC791\uB098\uBB34",
            tile_bath: "\uBCA0\uC774\uC9C0\uD1A4",
            lighting: "\uC6B0\uB4DC \uD39C\uB358\uD2B8"
          }
        },
        SCANDINAVIAN: {
          name: "\uC2A4\uCE78\uB514\uB098\uBE44\uC548",
          mul: 1.2,
          grade: "\uD45C\uC900",
          materials: {
            flooring: "\uD654\uC774\uD2B8 \uAC15\uB9C8\uB8E8",
            wall: "\uD654\uC774\uD2B8+\uADF8\uB808\uC774 \uD3EC\uC778\uD2B8",
            ceiling: "\uD654\uC774\uD2B8",
            door: "\uD654\uC774\uD2B8",
            kitchen: "\uD654\uC774\uD2B8+\uBE14\uB799\uC190\uC7A1\uC774",
            tile_bath: "\uD654\uC774\uD2B8+\uBE14\uB799 \uADF8\uB77C\uC6B0\uD2B8",
            lighting: "\uB9E4\uB9BD+\uD39C\uB358\uD2B8"
          }
        },
        INDUSTRIAL: {
          name: "\uC778\uB354\uC2A4\uD2B8\uB9AC\uC5BC",
          mul: 1.1,
          grade: "\uD45C\uC900",
          materials: {
            flooring: "\uCF58\uD06C\uB9AC\uD2B8 \uB9C8\uAC10/\uC9D9\uC740\uB9C8\uB8E8",
            wall: "\uB178\uCD9C\uCF58\uD06C\uB9AC\uD2B8+\uBCBD\uB3CC",
            ceiling: "\uB178\uCD9C \uCC9C\uC7A5",
            door: "\uBA54\uD0C8 \uD504\uB808\uC784",
            kitchen: "\uBA54\uD0C8+\uC9C4\uD55C\uC6B0\uB4DC",
            tile_bath: "\uC2DC\uBA58\uD2B8 \uD328\uD134",
            lighting: "\uBA54\uD0C8 \uD39C\uB358\uD2B8"
          }
        },
        ASIAN_ZEN: {
          name: "\uC544\uC2DC\uC548\uC820",
          mul: 1.4,
          grade: "\uACE0\uAE09",
          materials: {
            flooring: "\uC6D0\uBAA9(\uC624\uD06C)+\uB2E4\uB2E4\uBBF8",
            wall: "\uD68C\uC0C9 \uB3C4\uC7A5/\uC77C\uBCF8\uBCBD\uC9C0",
            ceiling: "\uB3C4\uC7A5(\uBCA0\uC774\uC9C0)",
            door: "\uBBF8\uB2EB\uC774(\uC2DC\uC624\uC9C0)",
            kitchen: "\uC5B4\uB450\uC6B4 \uC6B0\uB4DC",
            tile_bath: "\uBB34\uAD11 \uBCA0\uC774\uC9C0",
            lighting: "\uC885\uC774 \uD39C\uB358\uD2B8"
          }
        },
        PROVENCE: {
          name: "\uD504\uB85C\uBC29\uC2A4",
          mul: 1.5,
          grade: "\uACE0\uAE09",
          materials: {
            flooring: "\uD5E4\uB9C1\uBCF8(\uB77C\uC774\uD2B8)",
            wall: "\uD654\uC774\uD2B8+\uBAB0\uB529",
            ceiling: "\uC6B0\uBB3C+\uD654\uC774\uD2B8",
            door: "\uD654\uC774\uD2B8+\uBAB0\uB529",
            kitchen: "\uD654\uC774\uD2B8+\uB300\uB9AC\uC11D",
            tile_bath: "\uB300\uB9AC\uC11D",
            lighting: "\uC791\uC740 \uC0F9\uB4E4\uB9AC\uC5D0"
          }
        },
        CONTEMPORARY: {
          name: "\uCEE8\uD15C\uD3EC\uB7EC\uB9AC",
          mul: 1.6,
          grade: "\uACE0\uAE09",
          materials: {
            flooring: "\uAC15\uB9C8\uB8E8(\uB2E4\uD06C\uC6D4\uB11B)",
            wall: "\uB2E4\uD06C \uADF8\uB808\uC774",
            ceiling: "\uD654\uC774\uD2B8+\uAC04\uC811\uC870\uBA85",
            door: "\uBB34\uAD11 \uB2E4\uD06C",
            kitchen: "\uB2E4\uD06C+\uACE8\uB4DC \uC190\uC7A1\uC774",
            tile_bath: "600x600 \uCC28\uCF5C",
            lighting: "\uB77C\uC778 LED+\uD39C\uB358\uD2B8"
          }
        },
        KOREAN_MODERN: {
          name: "\uD55C\uAD6D\uBAA8\uB358",
          mul: 1.3,
          grade: "\uD45C\uC900+",
          materials: {
            flooring: "\uAC15\uB9C8\uB8E8(\uC6D4\uB11B/\uADF8\uB808\uC774)",
            wall: "\uB3C4\uBC30+\uD55C\uC9C0 \uD328\uD134",
            ceiling: "\uB3C4\uC7A5",
            door: "\uC6B0\uB4DC",
            kitchen: "\uBAA8\uB358+\uD55C\uAD6D \uC190\uC7A1\uC774",
            tile_bath: "\uD55C\uAD6D \uB3C4\uC790\uAE30 \uD328\uD134",
            lighting: "\uB9E4\uB9BD"
          }
        },
        SMART_HOME: {
          name: "\uC2A4\uB9C8\uD2B8\uD648",
          mul: 1.7,
          grade: "\uD504\uB9AC\uBBF8\uC5C4",
          materials: {
            flooring: "\uAC15\uB9C8\uB8E8",
            wall: "\uD654\uC774\uD2B8+\uCEEC\uB7EC \uAC15\uC870",
            ceiling: "\uB9E4\uB9BD+LED\uB77C\uC778",
            door: "\uBAA8\uC158\uC13C\uC11C(\uC635\uC158)",
            kitchen: "\uBAA8\uB358 \uD654\uC774\uD2B8",
            tile_bath: "600x600 \uBAA8\uB358",
            lighting: "\uC2A4\uB9C8\uD2B8 LED \uC804\uCCB4"
          },
          iot: true
        }
      };
      function getConcept(id) {
        return CONCEPT_MATERIAL_MAP[id] || null;
      }
      function getAllConcepts() {
        return Object.keys(CONCEPT_MATERIAL_MAP);
      }
      function getMaterialKeyword(conceptId, category) {
        const concept = CONCEPT_MATERIAL_MAP[conceptId];
        if (!concept || !concept.materials) return null;
        return concept.materials[category] || null;
      }
      function getGradeMul(conceptId) {
        const concept = CONCEPT_MATERIAL_MAP[conceptId];
        return concept ? concept.mul : 1;
      }
      module.exports = {
        CONCEPT_MATERIAL_MAP,
        getConcept,
        getAllConcepts,
        getMaterialKeyword,
        getGradeMul
      };
    }
  });

  // modules-html/estimate-v6/src/calc/CalcEngineV56.cjs
  var require_CalcEngineV56 = __commonJS({
    "modules-html/estimate-v6/src/calc/CalcEngineV56.cjs"(exports, module) {
      var { getResidence } = require_ResidenceMatrix();
      var { getGradeMul } = require_ConceptMaterialMatrix();
      var VAT_RATE = 0.1;
      var BASE_CONTRACT_RATIO = 1.15;
      function calcSupplyAmount(lineItems) {
        let total = 0;
        lineItems.forEach(function(it) {
          const qty = it.qty || 0;
          const waste = it.wasteRate || 0;
          const labor = it.laborCost || 0;
          const pm = it.pm || 0;
          const material = it.materialCost || 0;
          const equip = it.equipment || 0;
          const access = it.accessory || 0;
          const diff = it.difficultyAdjust || 0;
          const lineCost = qty * (1 + waste) * (labor * pm + material) + equip + access + diff;
          total += lineCost;
        });
        return Math.round(total);
      }
      function calcContractAmount(supply, opts) {
        const baseFactor = opts.baseFactor || 1;
        const gradeMul = opts.gradeMul || 1;
        const occupiedFactor = opts.occupied ? 1.1 : 1;
        const elevatorFactor = opts.floorLevel >= 4 && !opts.hasElev ? 1.05 : 1;
        return Math.round(
          supply * BASE_CONTRACT_RATIO * baseFactor * gradeMul * occupiedFactor * elevatorFactor
        );
      }
      function calcFinalAmount(contract) {
        return Math.round(contract * (1 + VAT_RATE));
      }
      function calculateEstimate(input) {
        if (!input || !Array.isArray(input.lineItems)) {
          return { ok: false, errors: ["lineItems \uBC30\uC5F4 \uD544\uC218"] };
        }
        const supply = calcSupplyAmount(input.lineItems);
        const residenceData = getResidence(input.residence);
        const baseFactor = residenceData ? residenceData.baseFactor : 1;
        const gradeMul = getGradeMul(input.concept);
        const contract = calcContractAmount(supply, {
          baseFactor,
          gradeMul,
          occupied: input.occupied,
          floorLevel: input.floorLevel,
          hasElev: input.hasElev
        });
        const final2 = calcFinalAmount(contract);
        const areaSqm = input.areaSqm || 0;
        const sqmPrice = areaSqm > 0 ? Math.round(final2 / areaSqm) : 0;
        const pyPrice = areaSqm > 0 ? Math.round(final2 / (areaSqm / 3.3058)) : 0;
        const margin = contract > 0 ? (contract - supply) / contract * 100 : 0;
        return {
          ok: true,
          payload: {
            supply,
            contract,
            final: final2,
            areaSqm,
            sqmPrice,
            pyPrice,
            margin: parseFloat(margin.toFixed(1)),
            factors: {
              baseFactor,
              gradeMul,
              occupied: !!input.occupied,
              elevator: input.floorLevel >= 4 && !input.hasElev
            }
          }
        };
      }
      module.exports = {
        calcSupplyAmount,
        calcContractAmount,
        calcFinalAmount,
        calculateEstimate,
        VAT_RATE,
        BASE_CONTRACT_RATIO
      };
    }
  });

  // modules-html/estimate-v6/src/matrices/Sections.cjs
  var require_Sections = __commonJS({
    "modules-html/estimate-v6/src/matrices/Sections.cjs"(exports, module) {
      var SECTIONS = {
        // 그룹 A: 주거 공간 (6) — 필수
        RESIDENTIAL: {
          living: { name: "\uAC70\uC2E4", group: "A", required: true, spaces: ["LIVING"] },
          bedroom: { name: "\uCE68\uC2E4", group: "A", required: true, spaces: ["MASTER_BEDROOM", "BEDROOM", "SMALL_BEDROOM"] },
          kitchen: { name: "\uC8FC\uBC29", group: "A", required: true, spaces: ["KITCHEN"] },
          bathroom: { name: "\uC695\uC2E4", group: "A", required: true, spaces: ["BATHROOM"] },
          balcony: { name: "\uBC1C\uCF54\uB2C8/\uD14C\uB77C\uC2A4", group: "A", required: false, spaces: ["BALCONY", "TERRACE"] },
          entrance: { name: "\uD604\uAD00", group: "A", required: true, spaces: ["ENTRANCE"] }
        },
        // 그룹 B: 부가 공간 (6) — 평형/필요시
        AUXILIARY: {
          dressing: { name: "\uB4DC\uB808\uC2A4\uB8F8", group: "B", required: false, spaces: ["DRESSING"] },
          study: { name: "\uC11C\uC7AC", group: "B", required: false, spaces: ["STUDY"] },
          dining: { name: "\uC2DD\uB2F9", group: "B", required: false, spaces: ["DINING"] },
          pantry: { name: "\uD32C\uD2B8\uB9AC", group: "B", required: false, spaces: ["PANTRY"] },
          utility: { name: "\uB2E4\uC6A9\uB3C4\uC2E4", group: "B", required: false, spaces: ["UTILITY"] },
          powder: { name: "\uD30C\uC6B0\uB354\uB8F8", group: "B", required: false, spaces: ["POWDER_ROOM"] }
        },
        // 그룹 C: 특수 공간 (5) — 단독/대형
        SPECIAL: {
          boiler: { name: "\uBCF4\uC77C\uB7EC\uC2E4", group: "C", required: false, spaces: ["BOILER"], residences: ["DETACHED_1F", "DETACHED_2F", "VILLA"] },
          hallway: { name: "\uBCF5\uB3C4", group: "C", required: false, spaces: ["HALLWAY"] },
          stairs: { name: "\uACC4\uB2E8", group: "C", required: false, spaces: ["STAIRS"], residences: ["DETACHED_2F"] },
          rooftop: { name: "\uC625\uC0C1", group: "C", required: false, spaces: ["ROOFTOP"], residences: ["DETACHED_1F", "DETACHED_2F", "PENTHOUSE"] },
          basement: { name: "\uC9C0\uD558/\uB2E4\uB77D", group: "C", required: false, spaces: ["BASEMENT", "ATTIC"], residences: ["DETACHED_1F", "DETACHED_2F"] }
        },
        // 그룹 D: 공정 (5) — 전체 영향
        PROCESS: {
          plumbing: { name: "\uBC30\uAD00", group: "D", required: true, type: "process" },
          electric: { name: "\uC804\uAE30", group: "D", required: true, type: "process" },
          window: { name: "\uCC3D\uD638", group: "D", required: true, type: "process" },
          insulation: { name: "\uB2E8\uC5F4(\uC678\uBCBD)", group: "D", required: false, type: "process", residences: ["DETACHED_1F", "DETACHED_2F", "PENTHOUSE"] },
          exterior: { name: "\uC678\uC7A5/\uC9C0\uBD95", group: "D", required: false, type: "process", residences: ["DETACHED_1F", "DETACHED_2F"] }
        }
      };
      function getAllSectionIds() {
        const ids = [];
        ["RESIDENTIAL", "AUXILIARY", "SPECIAL", "PROCESS"].forEach(function(group) {
          Object.keys(SECTIONS[group]).forEach(function(id) {
            ids.push(id);
          });
        });
        return ids;
      }
      function getSpacesForSections(sectionIds) {
        const result = /* @__PURE__ */ new Set();
        const all = SECTIONS;
        sectionIds.forEach(function(secId) {
          ["RESIDENTIAL", "AUXILIARY", "SPECIAL", "PROCESS"].forEach(function(group) {
            const sec = all[group][secId];
            if (sec && sec.spaces) {
              sec.spaces.forEach(function(s) {
                result.add(s);
              });
            }
          });
        });
        return Array.from(result);
      }
      function getAvailableSections(residence) {
        const ids = [];
        ["RESIDENTIAL", "AUXILIARY", "SPECIAL", "PROCESS"].forEach(function(group) {
          Object.keys(SECTIONS[group]).forEach(function(id) {
            const sec = SECTIONS[group][id];
            if (!sec.residences || sec.residences.includes(residence)) {
              ids.push(id);
            }
          });
        });
        return ids;
      }
      function getSection(id) {
        let result = null;
        ["RESIDENTIAL", "AUXILIARY", "SPECIAL", "PROCESS"].forEach(function(group) {
          if (SECTIONS[group][id]) result = SECTIONS[group][id];
        });
        return result;
      }
      module.exports = {
        SECTIONS,
        getAllSectionIds,
        getSpacesForSections,
        getAvailableSections,
        getSection
      };
    }
  });

  // modules-html/boc-v6/src/wizard/WizardController.js
  var require_WizardController = __commonJS({
    "modules-html/boc-v6/src/wizard/WizardController.js"(exports, module) {
      var { G1Type } = require_G1_Type();
      var { G2Concept } = require_G2_Concept();
      var { G3Section } = require_G3_Section();
      var { G4CAD } = require_G4_CAD();
      var { G5Material } = require_G5_Material();
      var { GateRegistry } = require_Gate();
      var { calculateEstimate } = require_CalcEngineV56();
      var { getSpacesForSections } = require_Sections();
      var STAGES = {
        G1: { id: "G1", name: "\uC720\uD615", automation: 30 },
        G2: { id: "G2", name: "\uCEE8\uC149", automation: 70 },
        G3: { id: "G3", name: "\uC139\uC158", automation: 85 },
        G4: { id: "G4", name: "CAD", automation: 95 },
        G5: { id: "G5", name: "\uC790\uC7AC", automation: 99 }
      };
      var WizardController = class {
        constructor() {
          this.registry = new GateRegistry();
          this.g1 = new G1Type();
          this.g2 = new G2Concept();
          this.g3 = new G3Section();
          this.g4 = new G4CAD();
          this.g5 = new G5Material();
          this.registry.register(this.g1);
          this.registry.register(this.g2);
          this.registry.register(this.g3);
          this.registry.register(this.g4);
          this.registry.register(this.g5);
          this.input = {
            residence: null,
            pyeong: null,
            concept: null,
            sections: [],
            spaces: [],
            materials: []
          };
          this.lockedGates = [];
          this.currentStage = "G1";
          this.estimate = null;
          this.listeners = /* @__PURE__ */ new Set();
        }
        subscribe(handler) {
          this.listeners.add(handler);
          return () => this.listeners.delete(handler);
        }
        _emit(eventType, payload) {
          this.listeners.forEach((h) => h(eventType, payload));
        }
        getAutomation() {
          if (this.lockedGates.length === 0) return 0;
          const lastLocked = this.lockedGates[this.lockedGates.length - 1];
          return STAGES[lastLocked].automation;
        }
        lockG1(opts) {
          if (!opts.residence || !opts.pyeong) {
            return { ok: false, error: "residence, pyeong \uD544\uC218" };
          }
          const r = this.g1.lock({ residence: opts.residence, pyeong: opts.pyeong }, this.registry);
          if (r.ok) {
            this.input.residence = opts.residence;
            this.input.pyeong = opts.pyeong;
            this.lockedGates.push("G1");
            this.currentStage = "G2";
            this._emit("GATE_LOCKED", { gate: "G1", input: opts, automation: this.getAutomation() });
          }
          return r;
        }
        lockG2(opts) {
          if (!opts.concept) return { ok: false, error: "concept \uD544\uC218" };
          if (!this.lockedGates.includes("G1")) return { ok: false, error: "G1 \uBA3C\uC800" };
          const r = this.g2.lock({ concept: opts.concept }, this.registry);
          if (r.ok) {
            this.input.concept = opts.concept;
            this.lockedGates.push("G2");
            this.currentStage = "G3";
            this._emit("GATE_LOCKED", { gate: "G2", input: opts, automation: this.getAutomation() });
          }
          return r;
        }
        lockG3(opts) {
          if (!opts.sections || opts.sections.length === 0) {
            return { ok: false, error: "sections 1\uAC1C \uC774\uC0C1 \uD544\uC218" };
          }
          if (!this.lockedGates.includes("G2")) return { ok: false, error: "G2 \uBA3C\uC800" };
          const r = this.g3.lock({ sections: opts.sections }, this.registry);
          if (r.ok) {
            this.input.sections = opts.sections;
            this.lockedGates.push("G3");
            this.currentStage = "G4";
            const autoSpaces = getSpacesForSections(opts.sections);
            this._emit("GATE_LOCKED", {
              gate: "G3",
              input: opts,
              autoSpaces,
              automation: this.getAutomation()
            });
          }
          return r;
        }
        lockG4(opts) {
          if (!opts.spaces || opts.spaces.length === 0) {
            return { ok: false, error: "spaces \uBA74\uC801 \uD544\uC218" };
          }
          if (!this.lockedGates.includes("G3")) return { ok: false, error: "G3 \uBA3C\uC800" };
          const r = this.g4.lock({ spaces: opts.spaces }, this.registry);
          if (r.ok) {
            this.input.spaces = opts.spaces;
            this.lockedGates.push("G4");
            this.currentStage = "G5";
            this._calculateEstimate();
            this._emit("GATE_LOCKED", {
              gate: "G4",
              input: opts,
              estimate: this.estimate,
              automation: this.getAutomation()
            });
          }
          return r;
        }
        lockG5(opts) {
          if (!this.lockedGates.includes("G4")) return { ok: false, error: "G4 \uBA3C\uC800" };
          const r = this.g5.lock({ materials: opts.materials || [] }, this.registry);
          if (r.ok) {
            this.input.materials = opts.materials || [];
            this.lockedGates.push("G5");
            this.currentStage = "COMPLETE";
            this._calculateEstimate();
            this._emit("GATE_LOCKED", {
              gate: "G5",
              input: opts,
              estimate: this.estimate,
              automation: this.getAutomation()
            });
          }
          return r;
        }
        _calculateEstimate() {
          if (!this.lockedGates.includes("G4")) return null;
          const SIM_RATES = {
            BATHROOM: { labor: 1e5, material: 2e5 },
            KITCHEN: { labor: 8e4, material: 15e4 },
            LIVING: { labor: 6e4, material: 1e5 },
            BEDROOM: { labor: 5e4, material: 8e4 },
            DEFAULT: { labor: 7e4, material: 1e5 }
          };
          const lineItems = this.input.spaces.map((space) => {
            const rate = SIM_RATES[space.typeKey] || SIM_RATES.DEFAULT;
            return {
              qty: space.area_sqm,
              wasteRate: 0.05,
              laborCost: rate.labor,
              pm: 1,
              materialCost: rate.material
            };
          });
          const totalAreaSqm = this.input.spaces.reduce((sum, s) => sum + s.area_sqm, 0);
          const result = calculateEstimate({
            lineItems,
            residence: this.input.residence,
            concept: this.input.concept,
            occupied: false,
            floorLevel: 5,
            hasElev: true,
            areaSqm: totalAreaSqm
          });
          if (result.ok) {
            this.estimate = result.payload;
            this._emit("ESTIMATE_CALCULATED", this.estimate);
          }
          return this.estimate;
        }
        goBack() {
          if (this.lockedGates.length === 0) return { ok: false, error: "\uB3CC\uC544\uAC08 \uB2E8\uACC4 \uC5C6\uC74C" };
          const last = this.lockedGates.pop();
          this.currentStage = last;
          this._emit("GATE_UNLOCKED", { gate: last, automation: this.getAutomation() });
          return { ok: true, gate: last };
        }
        reset() {
          this.input = { residence: null, pyeong: null, concept: null, sections: [], spaces: [], materials: [] };
          this.lockedGates = [];
          this.currentStage = "G1";
          this.estimate = null;
          this.registry = new GateRegistry();
          this.g1 = new G1Type();
          this.g2 = new G2Concept();
          this.g3 = new G3Section();
          this.g4 = new G4CAD();
          this.g5 = new G5Material();
          this.registry.register(this.g1);
          this.registry.register(this.g2);
          this.registry.register(this.g3);
          this.registry.register(this.g4);
          this.registry.register(this.g5);
          this._emit("RESET", null);
        }
        getState() {
          return {
            input: { ...this.input },
            lockedGates: [...this.lockedGates],
            currentStage: this.currentStage,
            automation: this.getAutomation(),
            estimate: this.estimate
          };
        }
      };
      module.exports = { WizardController, STAGES };
    }
  });

  // modules-html/boc-v6/src/wizard/components/ProgressBar.js
  var require_ProgressBar = __commonJS({
    "modules-html/boc-v6/src/wizard/components/ProgressBar.js"(exports, module) {
      var ProgressBar = class {
        constructor(opts) {
          this.containerEl = opts.containerEl;
          this.controller = opts.controller;
          this.unsubscribe = this.controller.subscribe((evt) => {
            if (evt === "GATE_LOCKED" || evt === "GATE_UNLOCKED" || evt === "RESET") {
              this.render();
            }
          });
          this.render();
        }
        render() {
          const state = this.controller.getState();
          const stages = ["G1", "G2", "G3", "G4", "G5"];
          const stageNames = { G1: "\uC720\uD615", G2: "\uCEE8\uC149", G3: "\uC139\uC158", G4: "CAD", G5: "\uC790\uC7AC" };
          this.containerEl.innerHTML = `
      <div class="wizard-progress">
        <div class="progress-stages">
          ${stages.map((stage) => {
            const isLocked = state.lockedGates.includes(stage);
            const isCurrent = state.currentStage === stage;
            const cls = isLocked ? "locked" : isCurrent ? "current" : "pending";
            return `
              <div class="stage ${cls}">
                <div class="stage-circle">
                  ${isLocked ? "\u2713" : stage[1]}
                </div>
                <div class="stage-label">${stageNames[stage]}</div>
              </div>
            `;
          }).join("")}
        </div>
        <div class="automation-meter">
          <div class="meter-label">
            <span>\uC790\uB3D9\uD654</span>
            <span class="meter-value">${state.automation}%</span>
          </div>
          <div class="meter-track">
            <div class="meter-fill" style="width: ${state.automation}%"></div>
          </div>
        </div>
      </div>
    `;
        }
        destroy() {
          if (this.unsubscribe) this.unsubscribe();
          this.containerEl.innerHTML = "";
        }
      };
      module.exports = { ProgressBar };
    }
  });

  // modules-html/boc-v6/src/wizard/gates/G1Page.js
  var require_G1Page = __commonJS({
    "modules-html/boc-v6/src/wizard/gates/G1Page.js"(exports, module) {
      var { RESIDENCE_TYPES, PYEONG_LEVELS } = require_G1_Type();
      var RESIDENCE_INFO = {
        APARTMENT: { name: "\uC544\uD30C\uD2B8", icon: "\u{1F3E2}" },
        VILLA: { name: "\uBE4C\uB77C", icon: "\u{1F3D8}\uFE0F" },
        DETACHED_1F: { name: "\uB2E8\uB3C5\uC8FC\uD0DD", icon: "\u{1F3E0}", meta: "\uB2E8\uCE35" },
        DETACHED_2F: { name: "\uB2E8\uB3C5\uC8FC\uD0DD", icon: "\u{1F3E1}", meta: "\uBCF5\uCE35" },
        PENTHOUSE: { name: "\uD39C\uD2B8\uD558\uC6B0\uC2A4", icon: "\u{1F306}" },
        COMMERCIAL: { name: "\uC0C1\uAC00/\uC624\uD53C\uC2A4", icon: "\u{1F3EC}" }
      };
      var G1Page = class {
        constructor(opts) {
          this.containerEl = opts.containerEl;
          this.controller = opts.controller;
          this.selected = { residence: null, pyeong: null };
          this.render();
        }
        render() {
          this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 1 \u2014 \uC720\uD615</h2>
        <div class="gate-subtitle">\uC8FC\uAC70 \uD615\uD0DC + \uD3C9\uD615 \uC120\uD0DD / \uC790\uB3D9\uD654 0% \u2192 30%</div>

        <div class="section-group-label">\uC8FC\uAC70 \uD615\uD0DC</div>
        <div class="card-grid" id="residence-grid">
          ${RESIDENCE_TYPES.map((r) => {
            const info = RESIDENCE_INFO[r];
            return `
              <div class="option-card" data-residence="${r}">
                <div class="icon">${info.icon}</div>
                <div class="name">${info.name}</div>
                <div class="meta">${info.meta || ""}</div>
              </div>
            `;
          }).join("")}
        </div>

        <div class="section-group-label">\uD3C9\uD615</div>
        <div class="card-grid" id="pyeong-grid">
          ${PYEONG_LEVELS.map((p) => `
            <div class="option-card" data-pyeong="${p}">
              <div class="name">${p}\uD3C9</div>
              <div class="meta">~${Math.round(p * 3.3058)}\u33A1</div>
            </div>
          `).join("")}
        </div>

        <div class="gate-actions">
          <div></div>
          <button class="primary" id="g1-next" disabled>\uB2E4\uC74C \u2192 G2 \uCEE8\uC149</button>
        </div>
      </div>
    `;
          this.containerEl.querySelectorAll("[data-residence]").forEach((el) => {
            el.addEventListener("click", () => this._selectResidence(el.dataset.residence));
          });
          this.containerEl.querySelectorAll("[data-pyeong]").forEach((el) => {
            el.addEventListener("click", () => this._selectPyeong(parseInt(el.dataset.pyeong)));
          });
          this.containerEl.querySelector("#g1-next").addEventListener("click", () => this._submit());
        }
        _selectResidence(r) {
          this.selected.residence = r;
          this.containerEl.querySelectorAll("[data-residence]").forEach((el) => {
            el.classList.toggle("selected", el.dataset.residence === r);
          });
          this._updateNextBtn();
        }
        _selectPyeong(p) {
          this.selected.pyeong = p;
          this.containerEl.querySelectorAll("[data-pyeong]").forEach((el) => {
            el.classList.toggle("selected", parseInt(el.dataset.pyeong) === p);
          });
          this._updateNextBtn();
        }
        _updateNextBtn() {
          const btn = this.containerEl.querySelector("#g1-next");
          btn.disabled = !(this.selected.residence && this.selected.pyeong);
        }
        _submit() {
          const r = this.controller.lockG1(this.selected);
          if (!r.ok) alert("G1 \uC7A0\uAE08 \uC2E4\uD328: " + r.error);
        }
      };
      module.exports = { G1Page };
    }
  });

  // modules-html/boc-v6/src/wizard/gates/G2Page.js
  var require_G2Page = __commonJS({
    "modules-html/boc-v6/src/wizard/gates/G2Page.js"(exports, module) {
      var { CONCEPTS } = require_G2_Concept();
      var { CONCEPT_MATERIAL_MAP } = require_ConceptMaterialMatrix();
      var G2Page = class {
        constructor(opts) {
          this.containerEl = opts.containerEl;
          this.controller = opts.controller;
          this.selected = null;
          this.render();
        }
        render() {
          this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 2 \u2014 \uCEE8\uC149</h2>
        <div class="gate-subtitle">\uB514\uC790\uC778 \uCEE8\uC149 1\uAC1C \uC120\uD0DD / \uC790\uB3D9\uD654 30% \u2192 70%</div>

        <div class="card-grid" id="concept-grid">
          ${CONCEPTS.map((c) => {
            const info = CONCEPT_MATERIAL_MAP[c];
            return `
              <div class="option-card" data-concept="${c}">
                <div class="name">${info ? info.name : c}</div>
                <div class="meta">${info ? "\xD7" + info.mul + " (" + info.grade + ")" : ""}</div>
              </div>
            `;
          }).join("")}
        </div>

        <div class="gate-actions">
          <button id="g2-back">\u2190 \uC774\uC804</button>
          <button class="primary" id="g2-next" disabled>\uB2E4\uC74C \u2192 G3 \uC139\uC158</button>
        </div>
      </div>
    `;
          this.containerEl.querySelectorAll("[data-concept]").forEach((el) => {
            el.addEventListener("click", () => this._select(el.dataset.concept));
          });
          this.containerEl.querySelector("#g2-back").addEventListener("click", () => this.controller.goBack());
          this.containerEl.querySelector("#g2-next").addEventListener("click", () => this._submit());
        }
        _select(c) {
          this.selected = c;
          this.containerEl.querySelectorAll("[data-concept]").forEach((el) => {
            el.classList.toggle("selected", el.dataset.concept === c);
          });
          this.containerEl.querySelector("#g2-next").disabled = false;
        }
        _submit() {
          const r = this.controller.lockG2({ concept: this.selected });
          if (!r.ok) alert("G2 \uC7A0\uAE08 \uC2E4\uD328: " + r.error);
        }
      };
      module.exports = { G2Page };
    }
  });

  // modules-html/boc-v6/src/wizard/gates/G3Page.js
  var require_G3Page = __commonJS({
    "modules-html/boc-v6/src/wizard/gates/G3Page.js"(exports, module) {
      var { SECTIONS, getAvailableSections } = require_Sections();
      var GROUP_NAMES = {
        RESIDENTIAL: "\uC8FC\uAC70 \uACF5\uAC04",
        AUXILIARY: "\uBD80\uAC00 \uACF5\uAC04",
        SPECIAL: "\uD2B9\uC218 \uACF5\uAC04",
        PROCESS: "\uACF5\uC815"
      };
      var G3Page = class {
        constructor(opts) {
          this.containerEl = opts.containerEl;
          this.controller = opts.controller;
          this.selected = /* @__PURE__ */ new Set();
          this.residence = this.controller.getState().input.residence;
          this.render();
        }
        render() {
          const available = getAvailableSections(this.residence);
          this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 3 \u2014 \uC2DC\uACF5 \uC139\uC158</h2>
        <div class="gate-subtitle">\uC2DC\uACF5\uD560 \uC139\uC158 \uB2E4\uC911 \uC120\uD0DD (\uCD5C\uC18C 1\uAC1C) / \uC790\uB3D9\uD654 70% \u2192 85%</div>

        ${["RESIDENTIAL", "AUXILIARY", "SPECIAL", "PROCESS"].map((group) => {
            const sections = SECTIONS[group];
            if (!sections) return "";
            const sectionIds = Object.keys(sections).filter((id) => available.includes(id));
            if (sectionIds.length === 0) return "";
            return `
            <div class="section-group-label">${GROUP_NAMES[group]}</div>
            <div class="card-grid">
              ${sectionIds.map((id) => {
              const sec = sections[id];
              return `
                  <div class="option-card" data-section="${id}">
                    <div class="name">${sec.name}</div>
                    <div class="meta">${sec.required ? "\uD544\uC218" : "\uC120\uD0DD"}</div>
                  </div>
                `;
            }).join("")}
            </div>
          `;
          }).join("")}

        <div class="gate-actions">
          <button id="g3-back">\u2190 \uC774\uC804</button>
          <button class="primary" id="g3-next" disabled>\uB2E4\uC74C \u2192 G4 CAD</button>
        </div>
      </div>
    `;
          this.containerEl.querySelectorAll("[data-section]").forEach((el) => {
            el.addEventListener("click", () => this._toggle(el.dataset.section));
          });
          this.containerEl.querySelector("#g3-back").addEventListener("click", () => this.controller.goBack());
          this.containerEl.querySelector("#g3-next").addEventListener("click", () => this._submit());
        }
        _toggle(id) {
          if (this.selected.has(id)) this.selected.delete(id);
          else this.selected.add(id);
          this.containerEl.querySelectorAll("[data-section]").forEach((el) => {
            el.classList.toggle("selected", this.selected.has(el.dataset.section));
          });
          this.containerEl.querySelector("#g3-next").disabled = this.selected.size === 0;
        }
        _submit() {
          const r = this.controller.lockG3({ sections: Array.from(this.selected) });
          if (!r.ok) alert("G3 \uC7A0\uAE08 \uC2E4\uD328: " + r.error);
        }
      };
      module.exports = { G3Page };
    }
  });

  // modules-html/estimate-v6/src/matrices/Spaces.cjs
  var require_Spaces = __commonJS({
    "modules-html/estimate-v6/src/matrices/Spaces.cjs"(exports, module) {
      var SPACES = {
        // 거주 (5)
        LIVING: { name: "\uAC70\uC2E4", group: "\uAC70\uC8FC", wet: false, plumbing: false, vent: "natural" },
        MASTER_BEDROOM: { name: "\uC548\uBC29", group: "\uAC70\uC8FC", wet: false, plumbing: false, vent: "natural" },
        BEDROOM: { name: "\uCE68\uC2E4", group: "\uAC70\uC8FC", wet: false, plumbing: false, vent: "natural" },
        SMALL_BEDROOM: { name: "\uC791\uC740\uBC29", group: "\uAC70\uC8FC", wet: false, plumbing: false, vent: "natural" },
        STUDY: { name: "\uC11C\uC7AC", group: "\uAC70\uC8FC", wet: false, plumbing: false, vent: "natural" },
        // 수도 (4)
        KITCHEN: { name: "\uC8FC\uBC29", group: "\uC218\uB3C4", wet: true, plumbing: true, vent: "mechanical", gas: true },
        DINING: { name: "\uC2DD\uB2F9", group: "\uC218\uB3C4", wet: false, plumbing: false, vent: "natural" },
        BATHROOM: { name: "\uC695\uC2E4", group: "\uC218\uB3C4", wet: true, plumbing: true, vent: "mechanical", waterproof: true },
        POWDER_ROOM: { name: "\uD30C\uC6B0\uB354\uB8F8", group: "\uC218\uB3C4", wet: true, plumbing: true, vent: "mechanical", waterproof: true },
        // 보조 (8)
        BALCONY: { name: "\uBC1C\uCF54\uB2C8", group: "\uBCF4\uC870", wet: true, plumbing: false, vent: "natural", waterproof: true },
        TERRACE: { name: "\uD14C\uB77C\uC2A4", group: "\uBCF4\uC870", wet: true, plumbing: false, vent: "natural", waterproof: true },
        ROOFTOP: { name: "\uC625\uC0C1", group: "\uBCF4\uC870", wet: true, plumbing: false, vent: "natural", waterproof: true },
        ENTRANCE: { name: "\uD604\uAD00", group: "\uBCF4\uC870", wet: false, plumbing: false, vent: "natural" },
        DRESSING: { name: "\uB4DC\uB808\uC2A4\uB8F8", group: "\uBCF4\uC870", wet: false, plumbing: false, vent: "natural" },
        PANTRY: { name: "\uD32C\uD2B8\uB9AC", group: "\uBCF4\uC870", wet: false, plumbing: false, vent: "natural" },
        UTILITY: { name: "\uB2E4\uC6A9\uB3C4\uC2E4", group: "\uBCF4\uC870", wet: true, plumbing: true, vent: "mechanical" },
        BOILER: { name: "\uBCF4\uC77C\uB7EC\uC2E4", group: "\uBCF4\uC870", wet: false, plumbing: true, vent: "mechanical", gas: true },
        // 연결 (2)
        HALLWAY: { name: "\uBCF5\uB3C4", group: "\uC5F0\uACB0", wet: false, plumbing: false, vent: "natural" },
        STAIRS: { name: "\uACC4\uB2E8", group: "\uC5F0\uACB0", wet: false, plumbing: false, vent: "natural" },
        // 단독주택 추가 (4)
        ATTIC: { name: "\uB2E4\uB77D", group: "\uB2E8\uB3C5", wet: false, plumbing: false, vent: "natural" },
        BASEMENT: { name: "\uC9C0\uD558\uC2E4", group: "\uB2E8\uB3C5", wet: true, plumbing: false, vent: "mechanical", waterproof: true },
        GARAGE: { name: "\uCC28\uACE0", group: "\uB2E8\uB3C5", wet: false, plumbing: false, vent: "mechanical" },
        YARD: { name: "\uB9C8\uB2F9", group: "\uB2E8\uB3C5", wet: false, plumbing: false, vent: "natural" }
      };
      function getAllSpaceKeys() {
        return Object.keys(SPACES);
      }
      function getSpace(key) {
        return SPACES[key] || null;
      }
      function getSpacesByGroup(group) {
        return Object.keys(SPACES).filter(function(k) {
          return SPACES[k].group === group;
        });
      }
      function isWet(key) {
        return SPACES[key] && SPACES[key].wet === true;
      }
      function hasPlumbing(key) {
        return SPACES[key] && SPACES[key].plumbing === true;
      }
      function needsWaterproof(key) {
        return SPACES[key] && SPACES[key].waterproof === true;
      }
      module.exports = {
        SPACES,
        getAllSpaceKeys,
        getSpace,
        getSpacesByGroup,
        isWet,
        hasPlumbing,
        needsWaterproof
      };
    }
  });

  // modules-html/boc-v6/src/wizard/gates/G4Page.js
  var require_G4Page = __commonJS({
    "modules-html/boc-v6/src/wizard/gates/G4Page.js"(exports, module) {
      var { getSpacesForSections } = require_Sections();
      var { getSpace } = require_Spaces();
      var G4Page = class {
        constructor(opts) {
          this.containerEl = opts.containerEl;
          this.controller = opts.controller;
          const state = this.controller.getState();
          this.autoSpaces = getSpacesForSections(state.input.sections);
          this.spaceInputs = this.autoSpaces.map((spaceKey, idx) => ({
            id: "sp_" + idx,
            typeKey: spaceKey,
            area_sqm: 0
          }));
          this.render();
        }
        render() {
          this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 4 \u2014 \uACF5\uAC04 \uBA74\uC801 \uC785\uB825</h2>
        <div class="gate-subtitle">G3 \uC139\uC158\uC5D0\uC11C \uC790\uB3D9 \uCD94\uCD9C\uB41C \uACF5\uAC04 / \uC790\uB3D9\uD654 85% \u2192 95% (1\uB2E8\uACC4 \uACAC\uC801 \uC644\uC131)</div>

        <div class="card">
          ${this.spaceInputs.map((input, idx) => {
            const meta = getSpace(input.typeKey);
            return `
              <div class="space-row">
                <div class="space-name" style="font-family: var(--font-display); color: var(--gold);">${input.typeKey}</div>
                <div class="space-name">${meta ? meta.name : input.typeKey}</div>
                <input type="number" min="0" step="0.5" placeholder="\uBA74\uC801(\u33A1)" data-idx="${idx}">
                <div style="text-align: right; color: var(--text-dim); font-size: 11px;">\u33A1</div>
              </div>
            `;
          }).join("")}
        </div>

        <div class="gate-actions">
          <button id="g4-back">\u2190 \uC774\uC804</button>
          <button class="primary" id="g4-next" disabled>\uACAC\uC801 \uACC4\uC0B0 \u2192</button>
        </div>
      </div>

      <div id="estimate-preview-container"></div>
    `;
          this.containerEl.querySelectorAll("input[data-idx]").forEach((el) => {
            el.addEventListener("input", () => this._onInput(el));
          });
          this.containerEl.querySelector("#g4-back").addEventListener("click", () => this.controller.goBack());
          this.containerEl.querySelector("#g4-next").addEventListener("click", () => this._submit());
        }
        _onInput(el) {
          const idx = parseInt(el.dataset.idx);
          const val = parseFloat(el.value) || 0;
          this.spaceInputs[idx].area_sqm = val;
          const allFilled = this.spaceInputs.every((s) => s.area_sqm > 0);
          this.containerEl.querySelector("#g4-next").disabled = !allFilled;
        }
        _submit() {
          const r = this.controller.lockG4({ spaces: this.spaceInputs });
          if (!r.ok) {
            alert("G4 \uC7A0\uAE08 \uC2E4\uD328: " + r.error);
            return;
          }
          this._renderEstimate();
        }
        _renderEstimate() {
          const state = this.controller.getState();
          const e = state.estimate;
          if (!e) return;
          const previewEl = this.containerEl.querySelector("#estimate-preview-container");
          if (!previewEl) return;
          previewEl.innerHTML = `
      <div class="estimate-preview">
        <h3>1\uB2E8\uACC4 \uACAC\uC801 (\uC790\uB3D9\uD654 95%)</h3>
        <div class="estimate-row">
          <span class="label">\uCD1D \uBA74\uC801</span>
          <span class="value">${e.areaSqm.toFixed(1)}\u33A1</span>
        </div>
        <div class="estimate-row">
          <span class="label">\uACF5\uAE09\uAC00</span>
          <span class="value">${e.supply.toLocaleString()}\uC6D0</span>
        </div>
        <div class="estimate-row">
          <span class="label">\uB3C4\uAE09\uD569\uACC4</span>
          <span class="value">${e.contract.toLocaleString()}\uC6D0</span>
        </div>
        <div class="estimate-row">
          <span class="label">VAT 10%</span>
          <span class="value">${(e.final - e.contract).toLocaleString()}\uC6D0</span>
        </div>
        <div class="estimate-row highlight">
          <span class="label">\uCD5C\uC885 \uAE08\uC561</span>
          <span class="value">${e.final.toLocaleString()}\uC6D0</span>
        </div>
        <div class="estimate-row">
          <span class="label">\u33A1\uB2F9 \uB2E8\uAC00</span>
          <span class="value">${e.sqmPrice.toLocaleString()}\uC6D0/\u33A1</span>
        </div>
        <div class="estimate-row">
          <span class="label">\uD3C9\uB2F9 \uB2E8\uAC00</span>
          <span class="value">${e.pyPrice.toLocaleString()}\uC6D0/\uD3C9</span>
        </div>
        <div class="estimate-row">
          <span class="label">\uB9C8\uC9C4\uC728</span>
          <span class="value">${e.margin}%</span>
        </div>
      </div>
    `;
        }
      };
      module.exports = { G4Page };
    }
  });

  // modules-html/boc-v6/src/wizard/WizardPage.js
  var require_WizardPage = __commonJS({
    "modules-html/boc-v6/src/wizard/WizardPage.js"(exports, module) {
      var { WizardController } = require_WizardController();
      var { ProgressBar } = require_ProgressBar();
      var { G1Page } = require_G1Page();
      var { G2Page } = require_G2Page();
      var { G3Page } = require_G3Page();
      var { G4Page } = require_G4Page();
      var WizardPage = class {
        constructor(opts) {
          this.containerEl = opts.containerEl;
          this.controller = new WizardController();
          this.currentPage = null;
          this.render();
          this.controller.subscribe((evt) => {
            if (evt === "GATE_LOCKED" || evt === "GATE_UNLOCKED" || evt === "RESET") {
              this._renderCurrentStage();
            }
          });
        }
        render() {
          this.containerEl.innerHTML = `
      <div class="wizard-page">
        <div class="page-header">
          <h2>\uACAC\uC801 \uB9C8\uBC95\uC790</h2>
          <div class="subtitle">5\uB2E8 \uAC8C\uC774\uD2B8 \uC790\uB3D9\uD654 (G1 \u2192 G2 \u2192 G3 \u2192 G4 \u2192 G5 \uC635\uC158)</div>
        </div>

        <div id="progress-container"></div>
        <div id="stage-container"></div>
      </div>
    `;
          new ProgressBar({
            containerEl: this.containerEl.querySelector("#progress-container"),
            controller: this.controller
          });
          this._renderCurrentStage();
        }
        _renderCurrentStage() {
          const stage = this.controller.getState().currentStage;
          const stageEl = this.containerEl.querySelector("#stage-container");
          if (this.currentPage && this.currentPage.destroy) this.currentPage.destroy();
          stageEl.innerHTML = "";
          switch (stage) {
            case "G1":
              this.currentPage = new G1Page({ containerEl: stageEl, controller: this.controller });
              break;
            case "G2":
              this.currentPage = new G2Page({ containerEl: stageEl, controller: this.controller });
              break;
            case "G3":
              this.currentPage = new G3Page({ containerEl: stageEl, controller: this.controller });
              break;
            case "G4":
              this.currentPage = new G4Page({ containerEl: stageEl, controller: this.controller });
              break;
            case "G5":
            case "COMPLETE":
              stageEl.innerHTML = `
          <div class="gate-page">
            <h2>\uACAC\uC801 \uC644\uC131 (\uC790\uB3D9\uD654 95%)</h2>
            <div class="gate-subtitle">G5 \uC790\uC7AC \uC120\uD0DD\uC740 \uC635\uC158 / Phase 4 Week 4\uC5D0\uC11C \uD65C\uC131\uD654 \uC608\uC815</div>
            <button class="primary" onclick="location.reload()">\uC0C8 \uACAC\uC801 \uB9CC\uB4E4\uAE30</button>
          </div>
        `;
              break;
          }
        }
      };
      module.exports = { WizardPage };
    }
  });

  // modules-html/boc-v6/src/shell/App.js
  var require_App = __commonJS({
    "modules-html/boc-v6/src/shell/App.js"(exports, module) {
      var { Router } = require_Router();
      var App2 = class {
        constructor(opts) {
          this.rootEl = opts.rootEl || document.getElementById("app");
          this.router = new Router();
          this.currentPage = null;
          this._setupRoutes();
          this._render();
        }
        _setupRoutes() {
          this.router.register("/", this._renderHome.bind(this), { meta: { title: "\uB300\uC2DC\uBCF4\uB4DC" } });
          this.router.register("/wizard", this._renderWizard.bind(this), { meta: { title: "\uACAC\uC801 \uB9C8\uBC95\uC790" } });
          this.router.register("/cad", this._renderCAD.bind(this), { meta: { title: "CAD \uD3C9\uBA74\uB3C4" } });
          this.router.register("/kpi", this._renderKPI.bind(this), { meta: { title: "KPI \uB300\uC2DC\uBCF4\uB4DC" } });
          this.router.register("/contracts", this._renderContracts.bind(this), { meta: { title: "\uACC4\uC57D" } });
          this.router.register("/orders", this._renderOrders.bind(this), { meta: { title: "\uBC1C\uC8FC" } });
          this.router.register("/schedules", this._renderSchedules.bind(this), { meta: { title: "\uACF5\uC815" } });
          this.router.register("/inspections", this._renderInspections.bind(this), { meta: { title: "\uAC80\uC218" } });
          this.router.register("/topology", this._renderTopology.bind(this), { meta: { title: "\uC2DC\uC2A4\uD15C \uD1A0\uD3F4\uB85C\uC9C0" } });
          this.router.register("/ai-executive", this._renderAIExecutive.bind(this), { meta: { title: "AI \uC784\uC6D0" } });
          this.router.setNotFound(this._render404.bind(this));
        }
        _render() {
          this.rootEl.innerHTML = `
      <div class="app-shell">
        <header class="app-header">
          <h1>ECOREAN BOC v6.0</h1>
          <div class="spacer"></div>
          <div class="status">
            <span class="live">\u25CF LIVE</span>
            Phase 4 / Week 1
          </div>
        </header>
        <aside class="app-sidebar">${this._renderSidebar()}</aside>
        <main class="app-main" id="main-content"></main>
      </div>
    `;
          this.rootEl.querySelectorAll(".nav-item").forEach((el) => {
            el.addEventListener("click", () => {
              const path = el.dataset.path;
              this.router.navigate(path);
            });
          });
          this.router.start();
        }
        _renderSidebar() {
          return `
      <div class="nav-section">
        <div class="label">\uBA54\uC778</div>
        <div class="nav-item" data-path="/">\uB300\uC2DC\uBCF4\uB4DC</div>
        <div class="nav-item" data-path="/wizard">\uACAC\uC801 \uB9C8\uBC95\uC790</div>
      </div>
      <div class="nav-section">
        <div class="label">\uC81C\uC791</div>
        <div class="nav-item" data-path="/cad">CAD \uD3C9\uBA74\uB3C4</div>
        <div class="nav-item" data-path="/kpi">KPI \uACC4\uAE30\uD310</div>
      </div>
      <div class="nav-section">
        <div class="label">Closed Loop</div>
        <div class="nav-item" data-path="/contracts">\uACC4\uC57D</div>
        <div class="nav-item" data-path="/orders">\uBC1C\uC8FC</div>
        <div class="nav-item" data-path="/schedules">\uACF5\uC815</div>
        <div class="nav-item" data-path="/inspections">\uAC80\uC218</div>
      </div>
      <div class="nav-section">
        <div class="label">\uC2DC\uC2A4\uD15C</div>
        <div class="nav-item" data-path="/topology">\uD1A0\uD3F4\uB85C\uC9C0</div>
        <div class="nav-item" data-path="/ai-executive">AI \uC784\uC6D0</div>
      </div>
    `;
        }
        _setActiveNav(path) {
          this.rootEl.querySelectorAll(".nav-item").forEach((el) => {
            el.classList.toggle("active", el.dataset.path === path);
          });
        }
        _renderPageHeader(title, subtitle) {
          return `
      <div class="page-header">
        <h2>${title}</h2>
        <div class="subtitle">${subtitle || ""}</div>
      </div>
    `;
        }
        _renderHome(path) {
          this._setActiveNav(path);
          document.getElementById("main-content").innerHTML = `
      ${this._renderPageHeader("\uB300\uC2DC\uBCF4\uB4DC", "ECOREAN BOC v6.0 \u2014 Phase 4 Week 1")}
      <div class="card">
        <h3>9\uC8FC Phase 3 \uC644\uC8FC \u2705</h3>
        <p style="color: var(--text-dim); line-height: 1.6;">
          52\uAC1C \uD30C\uC77C / 33 \uD14C\uC2A4\uD2B8 / 147+ assertions / \uD68C\uADC0 0\uAC74<br/>
          \uB9C8\uC2A4\uD130\uD50C\uB79C \uC7AC\uC791\uC131 0\uD68C / TDD \uAC15\uC81C \uC791\uB3D9 3\uD68C<br/>
          \uC2DC\uBBAC\uB808\uC774\uC158 1\uAC74 (30\uD3C9 \uC544\uD30C\uD2B8 + \uD074\uB798\uC2DD\uB7ED\uC154\uB9AC, 16,735,950\uC6D0)
        </p>
      </div>
      <div class="card">
        <h3>Phase 4 \uC9C4\uC785</h3>
        <p style="color: var(--text-dim); line-height: 1.6;">
          Week 1 \uC644\uB8CC: boc-v6 \uC178 + \uB77C\uC6B0\uD305 + \uB2E4\uD06C \uD14C\uB9C8 + esbuild<br/>
          Week 2 \uC9C4\uC785: 5\uB2E8 \uAC8C\uC774\uD2B8 \uB9C8\uBC95\uC790 UI (G1~G5)
        </p>
      </div>
    `;
        }
        _renderPlaceholder(path, title, weekTarget) {
          this._setActiveNav(path);
          document.getElementById("main-content").innerHTML = `
      ${this._renderPageHeader(title, weekTarget + " \uD65C\uC131\uD654 \uC608\uC815")}
      <div class="card">
        <h3>\uC900\uBE44 \uC911</h3>
        <p style="color: var(--text-dim);">\uBCF8 \uD654\uBA74\uC740 ${weekTarget}\uC5D0\uC11C \uD65C\uC131\uD654\uB429\uB2C8\uB2E4.</p>
      </div>
    `;
        }
        _renderWizard(path) {
          this._setActiveNav(path);
          const main = document.getElementById("main-content");
          main.innerHTML = "";
          const { WizardPage } = require_WizardPage();
          new WizardPage({ containerEl: main });
        }
        _renderCAD(path) {
          this._renderPlaceholder(path, "CAD \uD3C9\uBA74\uB3C4", "Phase 4 Week 3");
        }
        _renderKPI(path) {
          this._renderPlaceholder(path, "KPI \uACC4\uAE30\uD310", "Phase 4 Week 4");
        }
        _renderContracts(path) {
          this._renderPlaceholder(path, "\uACC4\uC57D", "Phase 4 Week 5");
        }
        _renderOrders(path) {
          this._renderPlaceholder(path, "\uBC1C\uC8FC", "Phase 4 Week 6");
        }
        _renderSchedules(path) {
          this._renderPlaceholder(path, "\uACF5\uC815", "Phase 4 Week 6");
        }
        _renderInspections(path) {
          this._renderPlaceholder(path, "\uAC80\uC218", "Phase 4 Week 6");
        }
        _renderTopology(path) {
          this._renderPlaceholder(path, "\uC2DC\uC2A4\uD15C \uD1A0\uD3F4\uB85C\uC9C0", "Phase 4 Week 7");
        }
        _renderAIExecutive(path) {
          this._renderPlaceholder(path, "AI \uC784\uC6D0 \uB300\uC2DC\uBCF4\uB4DC", "Phase 4 Week 7");
        }
        _render404(path) {
          document.getElementById("main-content").innerHTML = `
      ${this._renderPageHeader("404", "\uACBD\uB85C \uC5C6\uC74C: " + path)}
      <div class="card">
        <p style="color: var(--text-dim);">\uC694\uCCAD\uD558\uC2E0 \uACBD\uB85C\uB294 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.</p>
        <button onclick="location.hash='#/'">\uD648\uC73C\uB85C</button>
      </div>
    `;
        }
      };
      module.exports = { App: App2 };
    }
  });

  // modules-html/boc-v6/src/shell/main.js
  var { App } = require_App();
  document.addEventListener("DOMContentLoaded", function() {
    const app = new App({ rootEl: document.getElementById("app") });
    window.BOC = window.BOC || {};
    window.BOC.app = app;
    console.log("%c ECOREAN BOC v6.0 ", "background: #c9a84c; color: #0a0e1a; font-weight: bold; padding: 4px 8px;");
    console.log("Phase 4 Week 1 \u2014 boc-v6 \uC178 \uC2DC\uC791");
  });
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3JvdXRlci9Sb3V0ZXIuanMiLCAiLi4vLi4vLi4vc2hlbGwvc3JjL2NvcmUtYnVzL0NvcmVCdXMuY2pzIiwgIi4uLy4uLy4uL3NoZWxsL3NyYy9nYXRlcy9HYXRlLmNqcyIsICIuLi8uLi8uLi9zaGVsbC9zcmMvZ2F0ZXMvRzFfVHlwZS5janMiLCAiLi4vLi4vLi4vc2hlbGwvc3JjL2dhdGVzL0cyX0NvbmNlcHQuY2pzIiwgIi4uLy4uLy4uL3NoZWxsL3NyYy9nYXRlcy9HM19TZWN0aW9uLmNqcyIsICIuLi8uLi8uLi9zaGVsbC9zcmMvZ2F0ZXMvRzRfQ0FELmNqcyIsICIuLi8uLi8uLi9zaGVsbC9zcmMvZ2F0ZXMvRzVfTWF0ZXJpYWwuY2pzIiwgIi4uLy4uL2VzdGltYXRlLXY2L3NyYy9tYXRyaWNlcy9SZXNpZGVuY2VNYXRyaXguY2pzIiwgIi4uLy4uL2VzdGltYXRlLXY2L3NyYy9tYXRyaWNlcy9Db25jZXB0TWF0ZXJpYWxNYXRyaXguY2pzIiwgIi4uLy4uL2VzdGltYXRlLXY2L3NyYy9jYWxjL0NhbGNFbmdpbmVWNTYuY2pzIiwgIi4uLy4uL2VzdGltYXRlLXY2L3NyYy9tYXRyaWNlcy9TZWN0aW9ucy5janMiLCAiLi4vc3JjL3dpemFyZC9XaXphcmRDb250cm9sbGVyLmpzIiwgIi4uL3NyYy93aXphcmQvY29tcG9uZW50cy9Qcm9ncmVzc0Jhci5qcyIsICIuLi9zcmMvd2l6YXJkL2dhdGVzL0cxUGFnZS5qcyIsICIuLi9zcmMvd2l6YXJkL2dhdGVzL0cyUGFnZS5qcyIsICIuLi9zcmMvd2l6YXJkL2dhdGVzL0czUGFnZS5qcyIsICIuLi8uLi9lc3RpbWF0ZS12Ni9zcmMvbWF0cmljZXMvU3BhY2VzLmNqcyIsICIuLi9zcmMvd2l6YXJkL2dhdGVzL0c0UGFnZS5qcyIsICIuLi9zcmMvd2l6YXJkL1dpemFyZFBhZ2UuanMiLCAiLi4vc3JjL3NoZWxsL0FwcC5qcyIsICIuLi9zcmMvc2hlbGwvbWFpbi5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLy8gRUNPUkVBTiBCT0MgdjYuMCBcdTIwMTQgSGFzaC1iYXNlZCBTUEEgUm91dGVyXG5cbmNsYXNzIFJvdXRlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMucm91dGVzID0gbmV3IE1hcCgpO1xuICAgIHRoaXMubm90Rm91bmRIYW5kbGVyID0gbnVsbDtcbiAgICB0aGlzLmJlZm9yZUhvb2tzID0gW107XG4gICAgdGhpcy5jdXJyZW50UGF0aCA9IG51bGw7XG4gIH1cblxuICByZWdpc3RlcihwYXRoLCBoYW5kbGVyLCBvcHRzKSB7XG4gICAgdGhpcy5yb3V0ZXMuc2V0KHBhdGgsIHtcbiAgICAgIGhhbmRsZXI6IGhhbmRsZXIsXG4gICAgICBtZXRhOiAob3B0cyAmJiBvcHRzLm1ldGEpIHx8IHt9XG4gICAgfSk7XG4gIH1cblxuICBzZXROb3RGb3VuZChoYW5kbGVyKSB7XG4gICAgdGhpcy5ub3RGb3VuZEhhbmRsZXIgPSBoYW5kbGVyO1xuICB9XG5cbiAgYmVmb3JlRWFjaChob29rKSB7XG4gICAgdGhpcy5iZWZvcmVIb29rcy5wdXNoKGhvb2spO1xuICB9XG5cbiAgc3RhcnQoKSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2hhc2hjaGFuZ2UnLCB0aGlzLl9vbkhhc2hDaGFuZ2UuYmluZCh0aGlzKSk7XG4gICAgdGhpcy5fb25IYXNoQ2hhbmdlKCk7XG4gIH1cblxuICBuYXZpZ2F0ZShwYXRoKSB7XG4gICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBwYXRoO1xuICB9XG5cbiAgX29uSGFzaENoYW5nZSgpIHtcbiAgICBjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2ggfHwgJyMvJztcbiAgICBjb25zdCBwYXRoID0gaGFzaC5yZXBsYWNlKC9eIy8sICcnKSB8fCAnLyc7XG5cbiAgICBmb3IgKGxldCBob29rIG9mIHRoaXMuYmVmb3JlSG9va3MpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGhvb2socGF0aCwgdGhpcy5jdXJyZW50UGF0aCk7XG4gICAgICBpZiAocmVzdWx0ID09PSBmYWxzZSkgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHJvdXRlID0gdGhpcy5yb3V0ZXMuZ2V0KHBhdGgpO1xuICAgIGlmIChyb3V0ZSkge1xuICAgICAgdGhpcy5jdXJyZW50UGF0aCA9IHBhdGg7XG4gICAgICByb3V0ZS5oYW5kbGVyKHBhdGgsIHJvdXRlLm1ldGEpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5ub3RGb3VuZEhhbmRsZXIpIHtcbiAgICAgIHRoaXMubm90Rm91bmRIYW5kbGVyKHBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIGdldEN1cnJlbnRQYXRoKCkge1xuICAgIHJldHVybiB0aGlzLmN1cnJlbnRQYXRoO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBSb3V0ZXI6IFJvdXRlciB9O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY1LjYgXHUyMDE0IENvcmUgQnVzIChcdUM3NzRcdUJDQTRcdUQyQjggXHVENUM4XHVCRTBDKVxuLy8gU29UOiBkb2NzL2dyYXBoLmpzb24gXHUyMDE0IDI0IFx1QzVFM1x1QzlDMFx1QUMwMCBcdUM3NzQgXHVCQzg0XHVDMkE0XHVCOTdDIFx1RDFCNVx1QUNGQ1xuLy8gXHVDODA4XHVCMzAwIFx1QUREQ1x1Q0U1OTogXHVCQUE4XHVCNEUwIFx1RDFCNVx1QzJFMFx1Qzc0MCBcdUM3NzQgXHVENUM4XHVCRTBDXHVCOTdDIFx1RDFCNVx1QUNGQy4gXHVDOUMxXHVDODExIFx1RDU2OFx1QzIxOCBcdUQ2MzhcdUNEOUMgXHVBRTA4XHVDOUMwLlxuXG5jbGFzcyBDb3JlQnVzIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5oYW5kbGVycyA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLnNjaGVtYXMgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5sb2cgPSBbXTtcbiAgICB0aGlzLmZlYXR1cmVGbGFncyA9IHt9O1xuICB9XG5cbiAgcmVnaXN0ZXJTY2hlbWEoZXZlbnRUeXBlLCBzY2hlbWEpIHtcbiAgICB0aGlzLnNjaGVtYXMuc2V0KGV2ZW50VHlwZSwgc2NoZW1hKTtcbiAgfVxuXG4gIG9uKGV2ZW50VHlwZSwgaGFuZGxlcikge1xuICAgIGlmICghdGhpcy5oYW5kbGVycy5oYXMoZXZlbnRUeXBlKSkge1xuICAgICAgdGhpcy5oYW5kbGVycy5zZXQoZXZlbnRUeXBlLCBbXSk7XG4gICAgfVxuICAgIHRoaXMuaGFuZGxlcnMuZ2V0KGV2ZW50VHlwZSkucHVzaChoYW5kbGVyKTtcbiAgfVxuXG4gIGVtaXQoZXZlbnRUeXBlLCBwYXlsb2FkLCBtZXRhID0ge30pIHtcbiAgICBjb25zdCBzY2hlbWEgPSB0aGlzLnNjaGVtYXMuZ2V0KGV2ZW50VHlwZSk7XG4gICAgaWYgKHNjaGVtYSAmJiBzY2hlbWEucGFyc2UpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHNjaGVtYS5wYXJzZShwYXlsb2FkKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignW0NvcmVCdXNdIFNjaGVtYSB2aW9sYXRpb24gb24gJyArIGV2ZW50VHlwZSArICc6JywgZS5tZXNzYWdlKTtcbiAgICAgICAgaWYgKHRoaXMuZmVhdHVyZUZsYWdzLlNUUklDVF9TQ0hFTUEpIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZW50cnkgPSB7XG4gICAgICBldmVudFR5cGU6IGV2ZW50VHlwZSxcbiAgICAgIHBheWxvYWQ6IHBheWxvYWQsXG4gICAgICBtZXRhOiBtZXRhLFxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgfTtcbiAgICB0aGlzLmxvZy5wdXNoKGVudHJ5KTtcbiAgICBpZiAodGhpcy5sb2cubGVuZ3RoID4gMTAwMCkgdGhpcy5sb2cuc2hpZnQoKTtcblxuICAgIGNvbnN0IGxpc3QgPSB0aGlzLmhhbmRsZXJzLmdldChldmVudFR5cGUpIHx8IFtdO1xuICAgIGxpc3QuZm9yRWFjaChmdW5jdGlvbihoKSB7XG4gICAgICB0cnkge1xuICAgICAgICBoKHBheWxvYWQsIG1ldGEpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdbQ29yZUJ1c10gSGFuZGxlciBlcnJvciBvbiAnICsgZXZlbnRUeXBlICsgJzonLCBlLm1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGVudHJ5O1xuICB9XG5cbiAgb2ZmKGV2ZW50VHlwZSwgaGFuZGxlcikge1xuICAgIGlmICghdGhpcy5oYW5kbGVycy5oYXMoZXZlbnRUeXBlKSkgcmV0dXJuO1xuICAgIGNvbnN0IGxpc3QgPSB0aGlzLmhhbmRsZXJzLmdldChldmVudFR5cGUpO1xuICAgIGNvbnN0IGlkeCA9IGxpc3QuaW5kZXhPZihoYW5kbGVyKTtcbiAgICBpZiAoaWR4ID49IDApIGxpc3Quc3BsaWNlKGlkeCwgMSk7XG4gIH1cblxuICBnZXRMb2coZmlsdGVyKSB7XG4gICAgaWYgKCFmaWx0ZXIpIHJldHVybiB0aGlzLmxvZy5zbGljZSgpO1xuICAgIHJldHVybiB0aGlzLmxvZy5maWx0ZXIoZnVuY3Rpb24oZSkge1xuICAgICAgaWYgKGZpbHRlci5ldmVudFR5cGUgJiYgZS5ldmVudFR5cGUgIT09IGZpbHRlci5ldmVudFR5cGUpIHJldHVybiBmYWxzZTtcbiAgICAgIGlmIChmaWx0ZXIuc2luY2UgJiYgZS50aW1lc3RhbXAgPCBmaWx0ZXIuc2luY2UpIHJldHVybiBmYWxzZTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgc2V0RmxhZyhuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMuZmVhdHVyZUZsYWdzW25hbWVdID0gdmFsdWU7XG4gIH1cblxuICBpc0VuYWJsZWQoZmxhZ05hbWUpIHtcbiAgICByZXR1cm4gISF0aGlzLmZlYXR1cmVGbGFnc1tmbGFnTmFtZV07XG4gIH1cblxuICBzdGF0cygpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaGFuZGxlckNvdW50OiBBcnJheS5mcm9tKHRoaXMuaGFuZGxlcnMudmFsdWVzKCkpLnJlZHVjZShmdW5jdGlvbihhLCBiKSB7IHJldHVybiBhICsgYi5sZW5ndGg7IH0sIDApLFxuICAgICAgZXZlbnRUeXBlczogQXJyYXkuZnJvbSh0aGlzLmhhbmRsZXJzLmtleXMoKSksXG4gICAgICBsb2dTaXplOiB0aGlzLmxvZy5sZW5ndGgsXG4gICAgICBmbGFnczogT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5mZWF0dXJlRmxhZ3MpXG4gICAgfTtcbiAgfVxufVxuXG5jb25zdCBjb3JlQnVzID0gbmV3IENvcmVCdXMoKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7IENvcmVCdXM6IENvcmVCdXMsIGNvcmVCdXM6IGNvcmVCdXMgfTtcbiIsICIvLyBFQ09SRUFOIEJPQyB2NS42IFx1MjAxNCBHYXRlIFx1Q0Q5NFx1QzBDMSBcdUQwNzRcdUI3OThcdUMyQTRcbi8vIDVcdUIyRTggXHVDNzkwXHVCM0Q5XHVENjU0IFx1QUM4Q1x1Qzc3NFx1RDJCOCAoQ2FzY2FkZSBBdXRvbWF0aW9uKVx1Qzc1OCBcdUJEODBcdUJBQThcbi8vIFNvVDogZG9jcy9NQVNURVJfUExBTi5tZCBcdTAwQTcxMDkuNFxuLy9cbi8vIFx1QzgwOFx1QjMwMCBcdUFERENcdUNFNTk6XG4vLyAgIC0gdmFsaWRhdGUoKSBcdUQxQjVcdUFDRkMgXHVENkM0XHVCOUNDIGxvY2soKSBcdUFDMDBcdUIyQTVcbi8vICAgLSBsb2NrKCkgXHVDMkRDIFx1QjJFNFx1Qzc0QyBcdUFDOENcdUM3NzRcdUQyQjggXHVENjVDXHVDMTMxXHVENjU0IFx1Qzc3NFx1QkNBNFx1RDJCOCBcdUJDMUNcdUQ1ODlcbi8vICAgLSBcdUM5QzFcdUM4MDQgXHVBQzhDXHVDNzc0XHVEMkI4IGxvY2sgXHVDNTQ4IFx1QjQxMFx1QzczQ1x1QkE3NCBcdUIyRTRcdUM3NEMgXHVBQzhDXHVDNzc0XHVEMkI4IFx1QzlDNFx1Qzc4NSBcdUNDMjhcdUIyRThcblxuY29uc3QgeyBjb3JlQnVzIH0gPSByZXF1aXJlKCcuLi9jb3JlLWJ1cy9Db3JlQnVzLmNqcycpO1xuXG5jbGFzcyBHYXRlIHtcbiAgY29uc3RydWN0b3Iob3B0cykge1xuICAgIHRoaXMuaWQgPSBvcHRzLmlkO1xuICAgIHRoaXMudXJpID0gb3B0cy51cmk7XG4gICAgdGhpcy5ldmVudE9uTG9jayA9IG9wdHMuZXZlbnRPbkxvY2s7XG4gICAgdGhpcy5kZXBlbmRzT24gPSBvcHRzLmRlcGVuZHNPbiB8fCBudWxsO1xuICAgIHRoaXMubG9ja2VkID0gZmFsc2U7XG4gICAgdGhpcy5sb2NrZWRQYXlsb2FkID0gbnVsbDtcbiAgICB0aGlzLmxvY2tlZEF0ID0gbnVsbDtcbiAgfVxuXG4gIHZhbGlkYXRlKGlucHV0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHRoaXMuaWQgKyAnLnZhbGlkYXRlKCkgXHVCQkY4XHVBRDZDXHVENjA0Jyk7XG4gIH1cblxuICBwcm9jZXNzKGlucHV0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKHRoaXMuaWQgKyAnLnByb2Nlc3MoKSBcdUJCRjhcdUFENkNcdUQ2MDQnKTtcbiAgfVxuXG4gIGxvY2soaW5wdXQsIGdhdGVSZWdpc3RyeSkge1xuICAgIGlmICh0aGlzLmRlcGVuZHNPbiAmJiBnYXRlUmVnaXN0cnkpIHtcbiAgICAgIGNvbnN0IHByZXYgPSBnYXRlUmVnaXN0cnkuZ2V0KHRoaXMuZGVwZW5kc09uKTtcbiAgICAgIGlmICghcHJldiB8fCAhcHJldi5sb2NrZWQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBvazogZmFsc2UsXG4gICAgICAgICAgZXJyb3JzOiBbdGhpcy5pZCArICc6IFx1QzlDMVx1QzgwNCBcdUFDOENcdUM3NzRcdUQyQjgoJyArIHRoaXMuZGVwZW5kc09uICsgJykgXHVCQkY4XHVDN0EwXHVBRTA4J11cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB2YWxpZGF0aW9uID0gdGhpcy52YWxpZGF0ZShpbnB1dCk7XG4gICAgaWYgKHZhbGlkYXRpb24uZXJyb3JzICYmIHZhbGlkYXRpb24uZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3JzOiB2YWxpZGF0aW9uLmVycm9ycyB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucHJvY2VzcyhpbnB1dCk7XG4gICAgaWYgKCFyZXN1bHQub2spIHJldHVybiByZXN1bHQ7XG5cbiAgICB0aGlzLmxvY2tlZCA9IHRydWU7XG4gICAgdGhpcy5sb2NrZWRQYXlsb2FkID0gcmVzdWx0LnBheWxvYWQ7XG4gICAgdGhpcy5sb2NrZWRBdCA9IERhdGUubm93KCk7XG5cbiAgICBjb3JlQnVzLmVtaXQodGhpcy5ldmVudE9uTG9jaywgcmVzdWx0LnBheWxvYWQsIHtcbiAgICAgIGdhdGVJZDogdGhpcy5pZCxcbiAgICAgIHVyaTogdGhpcy51cmksXG4gICAgICBsb2NrZWRBdDogdGhpcy5sb2NrZWRBdFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHsgb2s6IHRydWUsIHBheWxvYWQ6IHJlc3VsdC5wYXlsb2FkIH07XG4gIH1cblxuICB1bmxvY2soKSB7XG4gICAgdGhpcy5sb2NrZWQgPSBmYWxzZTtcbiAgICB0aGlzLmxvY2tlZFBheWxvYWQgPSBudWxsO1xuICAgIHRoaXMubG9ja2VkQXQgPSBudWxsO1xuICB9XG5cbiAgc3RhdHVzKCkge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogdGhpcy5pZCxcbiAgICAgIGxvY2tlZDogdGhpcy5sb2NrZWQsXG4gICAgICBsb2NrZWRBdDogdGhpcy5sb2NrZWRBdCxcbiAgICAgIGRlcGVuZHNPbjogdGhpcy5kZXBlbmRzT25cbiAgICB9O1xuICB9XG59XG5cbmNsYXNzIEdhdGVSZWdpc3RyeSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuZ2F0ZXMgPSBuZXcgTWFwKCk7XG4gIH1cblxuICByZWdpc3RlcihnYXRlKSB7IHRoaXMuZ2F0ZXMuc2V0KGdhdGUuaWQsIGdhdGUpOyB9XG4gIGdldChpZCkgICAgICAgIHsgcmV0dXJuIHRoaXMuZ2F0ZXMuZ2V0KGlkKTsgfVxuICBnZXRBbGwoKSAgICAgICB7IHJldHVybiBBcnJheS5mcm9tKHRoaXMuZ2F0ZXMudmFsdWVzKCkpOyB9XG4gIHVubG9ja0FsbCgpICAgIHsgdGhpcy5nYXRlcy5mb3JFYWNoKGZ1bmN0aW9uKGcpIHsgZy51bmxvY2soKTsgfSk7IH1cbiAgZ2V0TG9ja2VkKCkgICAgeyByZXR1cm4gdGhpcy5nZXRBbGwoKS5maWx0ZXIoZnVuY3Rpb24oZykgeyByZXR1cm4gZy5sb2NrZWQ7IH0pOyB9XG5cbiAgZ2V0TmV4dEFjdGl2YXRhYmxlKCkge1xuICAgIGNvbnN0IGxvY2tlZElkcyA9IG5ldyBTZXQodGhpcy5nZXRMb2NrZWQoKS5tYXAoZnVuY3Rpb24oZykgeyByZXR1cm4gZy5pZDsgfSkpO1xuICAgIHJldHVybiB0aGlzLmdldEFsbCgpLmZpbmQoZnVuY3Rpb24oZykge1xuICAgICAgaWYgKGcubG9ja2VkKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAoIWcuZGVwZW5kc09uKSByZXR1cm4gdHJ1ZTtcbiAgICAgIHJldHVybiBsb2NrZWRJZHMuaGFzKGcuZGVwZW5kc09uKTtcbiAgICB9KTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgR2F0ZSwgR2F0ZVJlZ2lzdHJ5IH07XG4iLCAiLy8gRUNPUkVBTiBCT0MgdjUuNiBcdTIwMTQgRzEgXHVDNzIwXHVENjE1IFx1QUM4Q1x1Qzc3NFx1RDJCOFxuLy8gXHVDNzg1XHVCODI1OiBcdUM4RkNcdUFDNzBcdUQ2MTVcdUQwREMoNikgKyBcdUQzQzlcdUQ2MTUoNSkgIC8gIFx1Qzc5MFx1QjNEOVx1RDY1NFx1QzcyODogMCUgXHUyMTkyIDMwJVxuXG5jb25zdCB7IEdhdGUgfSA9IHJlcXVpcmUoJy4vR2F0ZS5janMnKTtcblxuY29uc3QgUkVTSURFTkNFX1RZUEVTID0gW1xuICAnQVBBUlRNRU5UJywgJ1ZJTExBJywgJ0RFVEFDSEVEXzFGJywgJ0RFVEFDSEVEXzJGJywgJ1BFTlRIT1VTRScsICdDT01NRVJDSUFMJ1xuXTtcblxuY29uc3QgUFlFT05HX0xFVkVMUyA9IFsyNCwgMzAsIDM0LCA0MCwgNTBdO1xuXG5jbGFzcyBHMVR5cGUgZXh0ZW5kcyBHYXRlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoe1xuICAgICAgaWQ6ICdnMV90eXBlJyxcbiAgICAgIHVyaTogJ3VybjplY29yZWFuOnVuaXZlcnNlOjE6bm9kZTpnMV90eXBlJyxcbiAgICAgIGV2ZW50T25Mb2NrOiAnR0FURTFfTE9DS0VEJyxcbiAgICAgIGRlcGVuZHNPbjogbnVsbFxuICAgIH0pO1xuICB9XG5cbiAgdmFsaWRhdGUoaW5wdXQpIHtcbiAgICBjb25zdCBlcnJvcnMgPSBbXTtcbiAgICBpZiAoIWlucHV0KSB7IHJldHVybiB7IGVycm9yczogWydpbnB1dCBcdUIyMDRcdUI3N0QnXSB9OyB9XG4gICAgaWYgKCFSRVNJREVOQ0VfVFlQRVMuaW5jbHVkZXMoaW5wdXQucmVzaWRlbmNlKSkge1xuICAgICAgZXJyb3JzLnB1c2goJ3Jlc2lkZW5jZSBcdUJCRjhcdUM4MTVcdUM3NTg6ICcgKyBpbnB1dC5yZXNpZGVuY2UpO1xuICAgIH1cbiAgICBpZiAoIVBZRU9OR19MRVZFTFMuaW5jbHVkZXMoaW5wdXQucHllb25nKSkge1xuICAgICAgZXJyb3JzLnB1c2goJ3B5ZW9uZyBcdUJCRjhcdUM4MTVcdUM3NTg6ICcgKyBpbnB1dC5weWVvbmcpO1xuICAgIH1cbiAgICByZXR1cm4geyBlcnJvcnMgfTtcbiAgfVxuXG4gIHByb2Nlc3MoaW5wdXQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgb2s6IHRydWUsXG4gICAgICBwYXlsb2FkOiB7XG4gICAgICAgIHJlc2lkZW5jZTogaW5wdXQucmVzaWRlbmNlLFxuICAgICAgICBweWVvbmc6IGlucHV0LnB5ZW9uZyxcbiAgICAgICAgYXZhaWxhYmxlU2VjdGlvbnM6IHRoaXMuX2F2YWlsYWJsZVNlY3Rpb25zKGlucHV0LnJlc2lkZW5jZSksXG4gICAgICAgIGF2YWlsYWJsZVNwYWNlczogdGhpcy5fYXZhaWxhYmxlU3BhY2VzKGlucHV0LnJlc2lkZW5jZSksXG4gICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBfYXZhaWxhYmxlU2VjdGlvbnMocmVzaWRlbmNlKSB7XG4gICAgY29uc3QgYmFzZSA9IFtcbiAgICAgICdsaXZpbmcnLCdiZWRyb29tJywna2l0Y2hlbicsJ2JhdGhyb29tJywnYmFsY29ueScsJ2VudHJhbmNlJyxcbiAgICAgICdkcmVzc2luZycsJ3N0dWR5JywnZGluaW5nJywncGFudHJ5JywndXRpbGl0eScsJ3Bvd2RlcicsXG4gICAgICAncGx1bWJpbmcnLCdlbGVjdHJpYycsJ3dpbmRvdydcbiAgICBdO1xuICAgIGlmIChyZXNpZGVuY2UgPT09ICdERVRBQ0hFRF8xRicgfHwgcmVzaWRlbmNlID09PSAnREVUQUNIRURfMkYnKSB7XG4gICAgICByZXR1cm4gYmFzZS5jb25jYXQoWydib2lsZXInLCdyb29mdG9wJywnZXh0ZXJpb3InLCdpbnN1bGF0aW9uJ10pO1xuICAgIH1cbiAgICByZXR1cm4gYmFzZTtcbiAgfVxuXG4gIF9hdmFpbGFibGVTcGFjZXMocmVzaWRlbmNlKSB7XG4gICAgY29uc3QgYmFzZSA9IFtcbiAgICAgICdMSVZJTkcnLCdNQVNURVJfQkVEUk9PTScsJ0JFRFJPT00nLCdTTUFMTF9CRURST09NJywnU1RVRFknLFxuICAgICAgJ0tJVENIRU4nLCdESU5JTkcnLCdCQVRIUk9PTScsJ1BPV0RFUl9ST09NJyxcbiAgICAgICdCQUxDT05ZJywnVEVSUkFDRScsJ0VOVFJBTkNFJywnRFJFU1NJTkcnLCdQQU5UUlknLCdVVElMSVRZJywnQk9JTEVSJyxcbiAgICAgICdIQUxMV0FZJywnU1RBSVJTJ1xuICAgIF07XG4gICAgaWYgKHJlc2lkZW5jZSA9PT0gJ0RFVEFDSEVEXzFGJyB8fCByZXNpZGVuY2UgPT09ICdERVRBQ0hFRF8yRicpIHtcbiAgICAgIHJldHVybiBiYXNlLmNvbmNhdChbJ1JPT0ZUT1AnLCdBVFRJQycsJ0JBU0VNRU5UJywnR0FSQUdFJywnWUFSRCddKTtcbiAgICB9XG4gICAgcmV0dXJuIGJhc2U7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IEcxVHlwZSwgUkVTSURFTkNFX1RZUEVTLCBQWUVPTkdfTEVWRUxTIH07XG4iLCAiLy8gRUNPUkVBTiBCT0MgdjUuNiBcdTIwMTQgRzIgXHVDRUU4XHVDMTQ5IFx1QUM4Q1x1Qzc3NFx1RDJCOFxuLy8gXHVDNzg1XHVCODI1OiBcdUNFRThcdUMxNDkgMTJcdUFDMUMgIC8gIFx1Qzc5MFx1QjNEOVx1RDY1NFx1QzcyODogMzAlIFx1MjE5MiA3MCVcblxuY29uc3QgeyBHYXRlIH0gPSByZXF1aXJlKCcuL0dhdGUuY2pzJyk7XG5cbmNvbnN0IENPTkNFUFRTID0gW1xuICAnU0lNUExFX01PREVSTicsJ01JTklNQUxfV0hJVEUnLCdDTEFTU0lDX0xVWFVSWScsJ1ZJTlRBR0VfUkVUUk8nLFxuICAnTkFUVVJBTF9XT09EJywnU0NBTkRJTkFWSUFOJywnSU5EVVNUUklBTCcsJ0FTSUFOX1pFTicsXG4gICdQUk9WRU5DRScsJ0NPTlRFTVBPUkFSWScsJ0tPUkVBTl9NT0RFUk4nLCdTTUFSVF9IT01FJ1xuXTtcblxuY29uc3QgR1JBREVfTVVMID0ge1xuICBNSU5JTUFMX1dISVRFOiAxLjAsIFZJTlRBR0VfUkVUUk86IDEuMSwgSU5EVVNUUklBTDogMS4xLFxuICBTSU1QTEVfTU9ERVJOOiAxLjIsIFNDQU5ESU5BVklBTjogMS4yLFxuICBOQVRVUkFMX1dPT0Q6IDEuMywgIEtPUkVBTl9NT0RFUk46IDEuMyxcbiAgQVNJQU5fWkVOOiAxLjQsXG4gIFBST1ZFTkNFOiAxLjUsICAgICAgQ09OVEVNUE9SQVJZOiAxLjYsXG4gIFNNQVJUX0hPTUU6IDEuNyxcbiAgQ0xBU1NJQ19MVVhVUlk6IDEuOFxufTtcblxuY2xhc3MgRzJDb25jZXB0IGV4dGVuZHMgR2F0ZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKHtcbiAgICAgIGlkOiAnZzJfY29uY2VwdCcsXG4gICAgICB1cmk6ICd1cm46ZWNvcmVhbjp1bml2ZXJzZToxOm5vZGU6ZzJfY29uY2VwdCcsXG4gICAgICBldmVudE9uTG9jazogJ0dBVEUyX0xPQ0tFRCcsXG4gICAgICBkZXBlbmRzT246ICdnMV90eXBlJ1xuICAgIH0pO1xuICB9XG5cbiAgdmFsaWRhdGUoaW5wdXQpIHtcbiAgICBpZiAoIWlucHV0KSByZXR1cm4geyBlcnJvcnM6IFsnaW5wdXQgXHVCMjA0XHVCNzdEJ10gfTtcbiAgICBjb25zdCBlcnJvcnMgPSBbXTtcbiAgICBpZiAoIUNPTkNFUFRTLmluY2x1ZGVzKGlucHV0LmNvbmNlcHQpKSB7XG4gICAgICBlcnJvcnMucHVzaCgnY29uY2VwdCBcdUJCRjhcdUM4MTVcdUM3NTg6ICcgKyBpbnB1dC5jb25jZXB0KTtcbiAgICB9XG4gICAgcmV0dXJuIHsgZXJyb3JzIH07XG4gIH1cblxuICBwcm9jZXNzKGlucHV0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiB0cnVlLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBjb25jZXB0OiBpbnB1dC5jb25jZXB0LFxuICAgICAgICBncmFkZU11bDogR1JBREVfTVVMW2lucHV0LmNvbmNlcHRdIHx8IDEuMCxcbiAgICAgICAgbWF0ZXJpYWxEZWZhdWx0czogeyBjb25jZXB0OiBpbnB1dC5jb25jZXB0IH0sXG4gICAgICAgIHNtYXJ0SG9tZTogaW5wdXQuY29uY2VwdCA9PT0gJ1NNQVJUX0hPTUUnLFxuICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgIH1cbiAgICB9O1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBHMkNvbmNlcHQsIENPTkNFUFRTLCBHUkFERV9NVUwgfTtcbiIsICIvLyBFQ09SRUFOIEJPQyB2NS42IFx1MjAxNCBHMyBcdUMxMzlcdUMxNTggXHVBQzhDXHVDNzc0XHVEMkI4XG4vLyBcdUM3ODVcdUI4MjU6IFx1QzJEQ1x1QUNGNSBcdUMxMzlcdUMxNTggXHVCMkU0XHVDOTExXHVDMTIwXHVEMEREICAvICBcdUM3OTBcdUIzRDlcdUQ2NTRcdUM3Mjg6IDcwJSBcdTIxOTIgODUlXG5cbmNvbnN0IHsgR2F0ZSB9ID0gcmVxdWlyZSgnLi9HYXRlLmNqcycpO1xuXG5jb25zdCBTRUNUSU9OX1NQQUNFX01BUCA9IHtcbiAgYmF0aHJvb206IFsnQkFUSFJPT00nXSxcbiAga2l0Y2hlbjogIFsnS0lUQ0hFTiddLFxuICBsaXZpbmc6ICAgWydMSVZJTkcnXSxcbiAgYmVkcm9vbTogIFsnTUFTVEVSX0JFRFJPT00nLCdCRURST09NJ10sXG4gIGJhbGNvbnk6ICBbJ0JBTENPTlknXSxcbiAgZW50cmFuY2U6IFsnRU5UUkFOQ0UnXSxcbiAgZHJlc3Npbmc6IFsnRFJFU1NJTkcnXSxcbiAgc3R1ZHk6ICAgIFsnU1RVRFknXSxcbiAgZGluaW5nOiAgIFsnRElOSU5HJ10sXG4gIHBhbnRyeTogICBbJ1BBTlRSWSddLFxuICB1dGlsaXR5OiAgWydVVElMSVRZJ10sXG4gIHBvd2RlcjogICBbJ1BPV0RFUl9ST09NJ10sXG4gIGJvaWxlcjogICBbJ0JPSUxFUiddLFxuICBoYWxsd2F5OiAgWydIQUxMV0FZJ10sXG4gIHN0YWlyczogICBbJ1NUQUlSUyddXG59O1xuXG5jbGFzcyBHM1NlY3Rpb24gZXh0ZW5kcyBHYXRlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoe1xuICAgICAgaWQ6ICdnM19zZWN0aW9uJyxcbiAgICAgIHVyaTogJ3VybjplY29yZWFuOnVuaXZlcnNlOjE6bm9kZTpnM19zZWN0aW9uJyxcbiAgICAgIGV2ZW50T25Mb2NrOiAnR0FURTNfTE9DS0VEJyxcbiAgICAgIGRlcGVuZHNPbjogJ2cyX2NvbmNlcHQnXG4gICAgfSk7XG4gIH1cblxuICB2YWxpZGF0ZShpbnB1dCkge1xuICAgIGNvbnN0IGVycm9ycyA9IFtdO1xuICAgIGlmICghaW5wdXQgfHwgIUFycmF5LmlzQXJyYXkoaW5wdXQuc2VjdGlvbnMpIHx8IGlucHV0LnNlY3Rpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZXJyb3JzLnB1c2goJ3NlY3Rpb25zIDFcdUFDMUMgXHVDNzc0XHVDMEMxIFx1RDU0NFx1QzIxOCcpO1xuICAgIH1cbiAgICByZXR1cm4geyBlcnJvcnMgfTtcbiAgfVxuXG4gIHByb2Nlc3MoaW5wdXQpIHtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgU2V0KCk7XG4gICAgaW5wdXQuc2VjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihzZWMpIHtcbiAgICAgIChTRUNUSU9OX1NQQUNFX01BUFtzZWNdIHx8IFtdKS5mb3JFYWNoKGZ1bmN0aW9uKHMpIHsgcmVzdWx0LmFkZChzKTsgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiB0cnVlLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBzZWN0aW9uczogaW5wdXQuc2VjdGlvbnMsXG4gICAgICAgIGF1dG9TcGFjZXM6IEFycmF5LmZyb20ocmVzdWx0KSxcbiAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICB9XG4gICAgfTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgRzNTZWN0aW9uLCBTRUNUSU9OX1NQQUNFX01BUCB9O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY1LjYgXHUyMDE0IEc0IENBRCBcdUFDOENcdUM3NzRcdUQyQjhcbi8vIFx1Qzc4NVx1QjgyNTogXHVBQ0Y1XHVBQzA0IFx1QkMzMFx1QzVGNCAoaWQgKyBhcmVhX3NxbSkgIC8gIFx1Qzc5MFx1QjNEOVx1RDY1NFx1QzcyODogODUlIFx1MjE5MiA5NSVcblxuY29uc3QgeyBHYXRlIH0gPSByZXF1aXJlKCcuL0dhdGUuY2pzJyk7XG5cbmNsYXNzIEc0Q0FEIGV4dGVuZHMgR2F0ZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKHtcbiAgICAgIGlkOiAnZzRfY2FkJyxcbiAgICAgIHVyaTogJ3VybjplY29yZWFuOnVuaXZlcnNlOjE6bm9kZTpnNF9jYWQnLFxuICAgICAgZXZlbnRPbkxvY2s6ICdHQVRFNF9MT0NLRUQnLFxuICAgICAgZGVwZW5kc09uOiAnZzNfc2VjdGlvbidcbiAgICB9KTtcbiAgfVxuXG4gIHZhbGlkYXRlKGlucHV0KSB7XG4gICAgY29uc3QgZXJyb3JzID0gW107XG4gICAgaWYgKCFpbnB1dCB8fCAhQXJyYXkuaXNBcnJheShpbnB1dC5zcGFjZXMpIHx8IGlucHV0LnNwYWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIGVycm9ycy5wdXNoKCdzcGFjZXMgMVx1QUMxQyBcdUM3NzRcdUMwQzEgXHVENTQ0XHVDMjE4Jyk7XG4gICAgfVxuICAgIGlmIChpbnB1dCAmJiBpbnB1dC5zcGFjZXMpIHtcbiAgICAgIGlucHV0LnNwYWNlcy5mb3JFYWNoKGZ1bmN0aW9uKHMsIGkpIHtcbiAgICAgICAgaWYgKCFzLmlkKSBlcnJvcnMucHVzaCgnc3BhY2VzWycgKyBpICsgJ10uaWQgXHVCMjA0XHVCNzdEJyk7XG4gICAgICAgIGlmICh0eXBlb2Ygcy5hcmVhX3NxbSAhPT0gJ251bWJlcicpIGVycm9ycy5wdXNoKCdzcGFjZXNbJyArIGkgKyAnXS5hcmVhX3NxbSBcdUIyMDRcdUI3N0QnKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4geyBlcnJvcnMgfTtcbiAgfVxuXG4gIHByb2Nlc3MoaW5wdXQpIHtcbiAgICBjb25zdCB0b3RhbEFyZWEgPSBpbnB1dC5zcGFjZXMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgcykgeyByZXR1cm4gc3VtICsgcy5hcmVhX3NxbTsgfSwgMCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiB0cnVlLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBzcGFjZXM6IGlucHV0LnNwYWNlcyxcbiAgICAgICAgdG90YWxBcmVhU3FtOiB0b3RhbEFyZWEsXG4gICAgICAgIHN0YWdlMUVzdGltYXRlUmVhZHk6IHRydWUsXG4gICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgfVxuICAgIH07XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IEc0Q0FEIH07XG4iLCAiLy8gRUNPUkVBTiBCT0MgdjUuNiBcdTIwMTQgRzUgXHVDNzkwXHVDN0FDIFx1QUM4Q1x1Qzc3NFx1RDJCOFxuLy8gXHVDNzg1XHVCODI1OiBcdUM3OTBcdUM3QUMgXHVCQzMwXHVDNUY0ICAvICBcdUM3OTBcdUIzRDlcdUQ2NTRcdUM3Mjg6IDk1JSBcdTIxOTIgOTklICAoXHVDNjM1XHVDMTU4IFx1QUM4Q1x1Qzc3NFx1RDJCOClcblxuY29uc3QgeyBHYXRlIH0gPSByZXF1aXJlKCcuL0dhdGUuY2pzJyk7XG5cbmNsYXNzIEc1TWF0ZXJpYWwgZXh0ZW5kcyBHYXRlIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoe1xuICAgICAgaWQ6ICdnNV9tYXRlcmlhbCcsXG4gICAgICB1cmk6ICd1cm46ZWNvcmVhbjp1bml2ZXJzZToxOm5vZGU6ZzVfbWF0ZXJpYWwnLFxuICAgICAgZXZlbnRPbkxvY2s6ICdHQVRFNV9MT0NLRUQnLFxuICAgICAgZGVwZW5kc09uOiAnZzRfY2FkJ1xuICAgIH0pO1xuICB9XG5cbiAgdmFsaWRhdGUoaW5wdXQpIHtcbiAgICBjb25zdCBlcnJvcnMgPSBbXTtcbiAgICBpZiAoIWlucHV0IHx8ICFBcnJheS5pc0FycmF5KGlucHV0Lm1hdGVyaWFscykpIHtcbiAgICAgIGVycm9ycy5wdXNoKCdtYXRlcmlhbHMgXHVCQzMwXHVDNUY0IFx1RDU0NFx1QzIxOCcpO1xuICAgIH1cbiAgICByZXR1cm4geyBlcnJvcnMgfTtcbiAgfVxuXG4gIHByb2Nlc3MoaW5wdXQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgb2s6IHRydWUsXG4gICAgICBwYXlsb2FkOiB7XG4gICAgICAgIG1hdGVyaWFsczogaW5wdXQubWF0ZXJpYWxzLFxuICAgICAgICBzdGFnZTJFc3RpbWF0ZVJlYWR5OiB0cnVlLFxuICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgIH1cbiAgICB9O1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBHNU1hdGVyaWFsIH07XG4iLCAiLy8gRUNPUkVBTiBCT0MgdjUuNiBcdTIwMTQgNiBcdUM4RkNcdUFDNzBcdUQ2MTVcdUQwREMgKyA1IFx1RDNDOVx1RDYxNSBcdUI5RTRcdUQyQjhcdUI5QURcdUMyQTRcbi8vIFNvVDogZG9jcy9NQVNURVJfUExBTi5tZCBcdTAwQTc5NyArIFx1MDBBNzEwNCArIFx1QkQ4MFx1Qjg1RCBLLCBMXG5cbmNvbnN0IFJFU0lERU5DRVMgPSB7XG4gIEFQQVJUTUVOVDogICAgeyBuYW1lOiAnXHVDNTQ0XHVEMzBDXHVEMkI4JywgICAgICAgICBleHRlcmlvcjogZmFsc2UsIG11bHRpRmxvb3I6IGZhbHNlLCBiYXNlRmFjdG9yOiAxLjAgIH0sXG4gIFZJTExBOiAgICAgICAgeyBuYW1lOiAnXHVCRTRDXHVCNzdDJywgICAgICAgICAgIGV4dGVyaW9yOiBmYWxzZSwgbXVsdGlGbG9vcjogZmFsc2UsIGJhc2VGYWN0b3I6IDEuMCAgfSxcbiAgREVUQUNIRURfMUY6ICB7IG5hbWU6ICdcdUIyRThcdUIzQzVcdUM4RkNcdUQwREQoXHVCMkU4XHVDRTM1KScsICBleHRlcmlvcjogdHJ1ZSwgIG11bHRpRmxvb3I6IGZhbHNlLCBiYXNlRmFjdG9yOiAxLjE1IH0sXG4gIERFVEFDSEVEXzJGOiAgeyBuYW1lOiAnXHVCMkU4XHVCM0M1XHVDOEZDXHVEMEREKFx1QkNGNVx1Q0UzNSknLCAgZXh0ZXJpb3I6IHRydWUsICBtdWx0aUZsb29yOiB0cnVlLCAgYmFzZUZhY3RvcjogMS4yMCB9LFxuICBQRU5USE9VU0U6ICAgIHsgbmFtZTogJ1x1RDM5Q1x1RDJCOFx1RDU1OFx1QzZCMFx1QzJBNCcsICAgICAgZXh0ZXJpb3I6IHRydWUsICBtdWx0aUZsb29yOiBmYWxzZSwgYmFzZUZhY3RvcjogMS4yNSB9LFxuICBDT01NRVJDSUFMOiAgIHsgbmFtZTogJ1x1QzBDMVx1QUMwMC9cdUM2MjRcdUQ1M0NcdUMyQTQnLCAgICAgZXh0ZXJpb3I6IGZhbHNlLCBtdWx0aUZsb29yOiBmYWxzZSwgYmFzZUZhY3RvcjogMC45NSB9XG59O1xuXG5jb25zdCBQWUVPTkdfUFJFU0VUUyA9IHtcbiAgMjQ6IHsgc3FtOiA3OSwgIHNwYWNlczogNywgIHNwYWNlTGlzdDogWydMSVZJTkcnLCdNQVNURVJfQkVEUk9PTScsJ0JFRFJPT00nLCdLSVRDSEVOJywnQkFUSFJPT00nLCdCQUxDT05ZJywnRU5UUkFOQ0UnXSB9LFxuICAzMDogeyBzcW06IDk5LCAgc3BhY2VzOiAxMSwgc3BhY2VMaXN0OiBbJ0xJVklORycsJ01BU1RFUl9CRURST09NJywnQkVEUk9PTScsJ1NNQUxMX0JFRFJPT00nLCdLSVRDSEVOJywnQkFUSFJPT00nLCdQT1dERVJfUk9PTScsJ0RSRVNTSU5HJywnQkFMQ09OWScsJ1RFUlJBQ0UnLCdFTlRSQU5DRSddIH0sXG4gIDM0OiB7IHNxbTogMTEyLCBzcGFjZXM6IDEzLCBzcGFjZUxpc3Q6IFsnTElWSU5HJywnTUFTVEVSX0JFRFJPT00nLCdCRURST09NJywnU01BTExfQkVEUk9PTScsJ1NUVURZJywnS0lUQ0hFTicsJ0RJTklORycsJ0JBVEhST09NJywnUE9XREVSX1JPT00nLCdEUkVTU0lORycsJ0JBTENPTlknLCdVVElMSVRZJywnRU5UUkFOQ0UnXSB9LFxuICA0MDogeyBzcW06IDEzMiwgc3BhY2VzOiAxNSwgc3BhY2VMaXN0OiBbJ0xJVklORycsJ01BU1RFUl9CRURST09NJywnQkVEUk9PTScsJ1NNQUxMX0JFRFJPT00nLCdTVFVEWScsJ0tJVENIRU4nLCdESU5JTkcnLCdCQVRIUk9PTScsJ1BPV0RFUl9ST09NJywnRFJFU1NJTkcnLCdQQU5UUlknLCdCQUxDT05ZJywnVVRJTElUWScsJ0hBTExXQVknLCdFTlRSQU5DRSddIH0sXG4gIDUwOiB7IHNxbTogMTY1LCBzcGFjZXM6IDE4LCBzcGFjZUxpc3Q6IFsnTElWSU5HJywnTUFTVEVSX0JFRFJPT00nLCdCRURST09NJywnU01BTExfQkVEUk9PTScsJ1NUVURZJywnS0lUQ0hFTicsJ0RJTklORycsJ0JBVEhST09NJywnUE9XREVSX1JPT00nLCdEUkVTU0lORycsJ1BBTlRSWScsJ0JBTENPTlknLCdURVJSQUNFJywnVVRJTElUWScsJ0JPSUxFUicsJ0hBTExXQVknLCdFTlRSQU5DRSddIH1cbn07XG5cbmZ1bmN0aW9uIGdldFJlc2lkZW5jZShpZCkgeyByZXR1cm4gUkVTSURFTkNFU1tpZF0gfHwgbnVsbDsgfVxuZnVuY3Rpb24gZ2V0UHJlc2V0KHB5ZW9uZykgeyByZXR1cm4gUFlFT05HX1BSRVNFVFNbcHllb25nXSB8fCBudWxsOyB9XG5mdW5jdGlvbiBnZXRBbGxSZXNpZGVuY2VzKCkgeyByZXR1cm4gT2JqZWN0LmtleXMoUkVTSURFTkNFUyk7IH1cbmZ1bmN0aW9uIGdldEFsbFB5ZW9uZ3MoKSB7IHJldHVybiBPYmplY3Qua2V5cyhQWUVPTkdfUFJFU0VUUykubWFwKE51bWJlcik7IH1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIFJFU0lERU5DRVM6IFJFU0lERU5DRVMsXG4gIFBZRU9OR19QUkVTRVRTOiBQWUVPTkdfUFJFU0VUUyxcbiAgZ2V0UmVzaWRlbmNlOiBnZXRSZXNpZGVuY2UsXG4gIGdldFByZXNldDogZ2V0UHJlc2V0LFxuICBnZXRBbGxSZXNpZGVuY2VzOiBnZXRBbGxSZXNpZGVuY2VzLFxuICBnZXRBbGxQeWVvbmdzOiBnZXRBbGxQeWVvbmdzXG59O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY1LjYgXHUyMDE0IDEyIFx1Q0VFOFx1QzE0OVx1QkNDNCBcdUQ0NUNcdUM5MDAgXHVDNzkwXHVDN0FDIFx1QjlFNFx1RDU1MVxuLy8gU29UOiBkb2NzL01BU1RFUl9QTEFOLm1kIFx1MDBBNzk2ICsgXHVCRDgwXHVCODVEIEhcbi8vIFx1QzgwOFx1QjMwMCBcdUFERENcdUNFNTk6IFx1QjJFOFx1QUMwMCBcdUNEOTRcdUM4MTUgXHVBRTA4XHVDOUMwIFx1MjAxNCBcdUMyRTRcdUM4MUMgXHVCMkU4XHVBQzAwXHVCMjk0IGNvc3RfaXRlbXMgREIgXHVDQzM4XHVDODcwXG4vLyBcdUJDRjggXHVCOUU0XHVEMkI4XHVCOUFEXHVDMkE0XHVCMjk0IFx1Qzc5MFx1QzdBQyBcdUQwQTRcdUM2Q0NcdUI0RENcdUI5Q0MgKFx1QzJFNCBcdUIyRThcdUFDMDBcdUIyOTQgTE9BRCBcdUMyREMgREIgXHVDODcwXHVENjhDKVxuXG5jb25zdCBDT05DRVBUX01BVEVSSUFMX01BUCA9IHtcbiAgU0lNUExFX01PREVSTjoge1xuICAgIG5hbWU6ICdcdUMyRUNcdUQ1MENcdUJBQThcdUIzNTgnLCBtdWw6IDEuMiwgZ3JhZGU6ICdcdUQ0NUNcdUM5MDAnLFxuICAgIG1hdGVyaWFsczoge1xuICAgICAgZmxvb3Jpbmc6ICAgICdcdUFDMTVcdUI5QzhcdUI4RTggXHVENjU0XHVDNzc0XHVEMkI4XHVDNjI0XHVEMDZDJyxcbiAgICAgIHdhbGw6ICAgICAgICAnXHVENjU0XHVDNzc0XHVEMkI4IFx1QjNDNFx1QzdBNScsXG4gICAgICBjZWlsaW5nOiAgICAgJ1x1RDY1NFx1Qzc3NFx1RDJCOCBcdUIzQzRcdUM3QTUnLFxuICAgICAgZG9vcjogICAgICAgICdcdUJCMzRcdUFEMTEgXHVENjU0XHVDNzc0XHVEMkI4JyxcbiAgICAgIGtpdGNoZW46ICAgICAnXHVENjU0XHVDNzc0XHVEMkI4ICsgXHVDNkIwXHVCNERDXHVDMTkwXHVDN0ExXHVDNzc0JyxcbiAgICAgIHRpbGVfYmF0aDogICAnNjAweDYwMCBcdUFERjhcdUI4MDhcdUM3NzQnLFxuICAgICAgbGlnaHRpbmc6ICAgICdcdUI5RTRcdUI5QkQgXHVCMkU0XHVDNkI0XHVCNzdDXHVDNzc0XHVEMkI4J1xuICAgIH1cbiAgfSxcbiAgTUlOSU1BTF9XSElURToge1xuICAgIG5hbWU6ICdcdUJCRjhcdUIyQzhcdUJBNDBcdUQ2NTRcdUM3NzRcdUQyQjgnLCBtdWw6IDEuMCwgZ3JhZGU6ICdcdUQ0NUNcdUM5MDAnLFxuICAgIG1hdGVyaWFsczoge1xuICAgICAgZmxvb3Jpbmc6ICdcdUQ2NTRcdUM3NzRcdUQyQjggXHVBQzE1XHVCOUM4XHVCOEU4Jywgd2FsbDogJ1x1RDY1NFx1Qzc3NFx1RDJCOCBcdUIzQzRcdUM3QTUnLCBjZWlsaW5nOiAnXHVENjU0XHVDNzc0XHVEMkI4JyxcbiAgICAgIGRvb3I6ICdcdUQ2NTRcdUM3NzRcdUQyQjgnLCBraXRjaGVuOiAnXHVENjU0XHVDNzc0XHVEMkI4JywgdGlsZV9iYXRoOiAnXHVENjU0XHVDNzc0XHVEMkI4IDYwMHg2MDAnLCBsaWdodGluZzogJ1x1QjJFNFx1QzZCNFx1Qjc3Q1x1Qzc3NFx1RDJCOCdcbiAgICB9XG4gIH0sXG4gIENMQVNTSUNfTFVYVVJZOiB7XG4gICAgbmFtZTogJ1x1RDA3NFx1Qjc5OFx1QzJERFx1QjdFRFx1QzE1NFx1QjlBQycsIG11bDogMS44LCBncmFkZTogJ1x1RDUwNFx1QjlBQ1x1QkJGOFx1QzVDNCcsXG4gICAgbWF0ZXJpYWxzOiB7XG4gICAgICBmbG9vcmluZzogJ1x1QzZEMFx1QkFBOVx1QjlDOFx1QjhFOChcdUM2RDRcdUIxMUIpJywgd2FsbDogJ1x1QkNBMFx1Qzc3NFx1QzlDMCBcdUMyRTRcdUQwNkNcdUIzQzRcdUJDMzAnLCBjZWlsaW5nOiAnXHVDNkIwXHVCQjNDXHVDQzlDXHVDN0E1K1x1QkFCMFx1QjUyOScsXG4gICAgICBkb29yOiAnXHVDNkIwXHVCNERDIFx1QkIzNFx1QUQxMStcdUMxOTBcdUM3QTFcdUM3NzQnLCBraXRjaGVuOiAnXHVCMzAwXHVCOUFDXHVDMTFEXHVDMEMxXHVEMzEwK1x1QzZCMFx1QjREQycsIHRpbGVfYmF0aDogJ1x1QjMwMFx1QjlBQ1x1QzExRCBcdUQzMjhcdUQxMzQnLFxuICAgICAgbGlnaHRpbmc6ICdcdUMwRjlcdUI0RTRcdUI5QUNcdUM1RDArXHVCOUU0XHVCOUJEJ1xuICAgIH1cbiAgfSxcbiAgVklOVEFHRV9SRVRSTzoge1xuICAgIG5hbWU6ICdcdUJFNDhcdUQyRjBcdUM5QzBcdUI4MDhcdUQyQjhcdUI4NUMnLCBtdWw6IDEuMSwgZ3JhZGU6ICdcdUQ0NUNcdUM5MDAnLFxuICAgIG1hdGVyaWFsczoge1xuICAgICAgZmxvb3Jpbmc6ICdcdUQ1RTRcdUI5QzFcdUJDRjggXHVCOUM4XHVCOEU4Jywgd2FsbDogJ1x1QURGOFx1QjlCMC9cdUJBMzhcdUMyQTRcdUQwQzBcdUI0REMnLCBjZWlsaW5nOiAnXHVDNkIwXHVCNERDXHVCRTU0KFx1QzYzNVx1QzE1OCknLFxuICAgICAgZG9vcjogJ1x1QkU0OFx1RDJGMFx1QzlDMCBcdUM2QjBcdUI0REMnLCBraXRjaGVuOiAnXHVDOUM0XHVENTVDIFx1QURGOFx1QjlCMCcsIHRpbGVfYmF0aDogJ1x1QkFBOFx1Qzc5MFx1Qzc3NFx1RDA2Qy9cdUMxMUNcdUJFMENcdUM2RThcdUM3NzQnLFxuICAgICAgbGlnaHRpbmc6ICdcdUQzOUNcdUIzNThcdUQyQjgrXHVDOUMxXHVCRDgwJ1xuICAgIH1cbiAgfSxcbiAgTkFUVVJBTF9XT09EOiB7XG4gICAgbmFtZTogJ1x1QjBCNFx1Q0Q5NFx1QjdGNFx1QzZCMFx1QjREQycsIG11bDogMS4zLCBncmFkZTogJ1x1RDQ1Q1x1QzkwMCsnLFxuICAgIG1hdGVyaWFsczoge1xuICAgICAgZmxvb3Jpbmc6ICdcdUM2RDBcdUJBQTlcdUI5QzhcdUI4RTgnLCB3YWxsOiAnXHVCQ0EwXHVDNzc0XHVDOUMwK1x1QzZCMFx1QjREQyBcdUQzRUNcdUM3NzhcdUQyQjgnLCBjZWlsaW5nOiAnXHVCM0M0XHVDN0E1KFx1QzU0NFx1Qzc3NFx1QkNGNFx1QjlBQyknLFxuICAgICAgZG9vcjogJ1x1QzZCMFx1QjREQyBcdUJCMzRcdUIyQUMnLCBraXRjaGVuOiAnXHVDNzkwXHVDNzkxXHVCMDk4XHVCQjM0JywgdGlsZV9iYXRoOiAnXHVCQ0EwXHVDNzc0XHVDOUMwXHVEMUE0JywgbGlnaHRpbmc6ICdcdUM2QjBcdUI0REMgXHVEMzlDXHVCMzU4XHVEMkI4J1xuICAgIH1cbiAgfSxcbiAgU0NBTkRJTkFWSUFOOiB7XG4gICAgbmFtZTogJ1x1QzJBNFx1Q0U3OFx1QjUxNFx1QjA5OFx1QkU0NFx1QzU0OCcsIG11bDogMS4yLCBncmFkZTogJ1x1RDQ1Q1x1QzkwMCcsXG4gICAgbWF0ZXJpYWxzOiB7XG4gICAgICBmbG9vcmluZzogJ1x1RDY1NFx1Qzc3NFx1RDJCOCBcdUFDMTVcdUI5QzhcdUI4RTgnLCB3YWxsOiAnXHVENjU0XHVDNzc0XHVEMkI4K1x1QURGOFx1QjgwOFx1Qzc3NCBcdUQzRUNcdUM3NzhcdUQyQjgnLCBjZWlsaW5nOiAnXHVENjU0XHVDNzc0XHVEMkI4JyxcbiAgICAgIGRvb3I6ICdcdUQ2NTRcdUM3NzRcdUQyQjgnLCBraXRjaGVuOiAnXHVENjU0XHVDNzc0XHVEMkI4K1x1QkUxNFx1Qjc5OVx1QzE5MFx1QzdBMVx1Qzc3NCcsIHRpbGVfYmF0aDogJ1x1RDY1NFx1Qzc3NFx1RDJCOCtcdUJFMTRcdUI3OTkgXHVBREY4XHVCNzdDXHVDNkIwXHVEMkI4JyxcbiAgICAgIGxpZ2h0aW5nOiAnXHVCOUU0XHVCOUJEK1x1RDM5Q1x1QjM1OFx1RDJCOCdcbiAgICB9XG4gIH0sXG4gIElORFVTVFJJQUw6IHtcbiAgICBuYW1lOiAnXHVDNzc4XHVCMzU0XHVDMkE0XHVEMkI4XHVCOUFDXHVDNUJDJywgbXVsOiAxLjEsIGdyYWRlOiAnXHVENDVDXHVDOTAwJyxcbiAgICBtYXRlcmlhbHM6IHtcbiAgICAgIGZsb29yaW5nOiAnXHVDRjU4XHVEMDZDXHVCOUFDXHVEMkI4IFx1QjlDOFx1QUMxMC9cdUM5RDlcdUM3NDBcdUI5QzhcdUI4RTgnLCB3YWxsOiAnXHVCMTc4XHVDRDlDXHVDRjU4XHVEMDZDXHVCOUFDXHVEMkI4K1x1QkNCRFx1QjNDQycsIGNlaWxpbmc6ICdcdUIxNzhcdUNEOUMgXHVDQzlDXHVDN0E1JyxcbiAgICAgIGRvb3I6ICdcdUJBNTRcdUQwQzggXHVENTA0XHVCODA4XHVDNzg0Jywga2l0Y2hlbjogJ1x1QkE1NFx1RDBDOCtcdUM5QzRcdUQ1NUNcdUM2QjBcdUI0REMnLCB0aWxlX2JhdGg6ICdcdUMyRENcdUJBNThcdUQyQjggXHVEMzI4XHVEMTM0JyxcbiAgICAgIGxpZ2h0aW5nOiAnXHVCQTU0XHVEMEM4IFx1RDM5Q1x1QjM1OFx1RDJCOCdcbiAgICB9XG4gIH0sXG4gIEFTSUFOX1pFTjoge1xuICAgIG5hbWU6ICdcdUM1NDRcdUMyRENcdUM1NDhcdUM4MjAnLCBtdWw6IDEuNCwgZ3JhZGU6ICdcdUFDRTBcdUFFMDknLFxuICAgIG1hdGVyaWFsczoge1xuICAgICAgZmxvb3Jpbmc6ICdcdUM2RDBcdUJBQTkoXHVDNjI0XHVEMDZDKStcdUIyRTRcdUIyRTRcdUJCRjgnLCB3YWxsOiAnXHVENjhDXHVDMEM5IFx1QjNDNFx1QzdBNS9cdUM3N0NcdUJDRjhcdUJDQkRcdUM5QzAnLCBjZWlsaW5nOiAnXHVCM0M0XHVDN0E1KFx1QkNBMFx1Qzc3NFx1QzlDMCknLFxuICAgICAgZG9vcjogJ1x1QkJGOFx1QjJFQlx1Qzc3NChcdUMyRENcdUM2MjRcdUM5QzApJywga2l0Y2hlbjogJ1x1QzVCNFx1QjQ1MFx1QzZCNCBcdUM2QjBcdUI0REMnLCB0aWxlX2JhdGg6ICdcdUJCMzRcdUFEMTEgXHVCQ0EwXHVDNzc0XHVDOUMwJyxcbiAgICAgIGxpZ2h0aW5nOiAnXHVDODg1XHVDNzc0IFx1RDM5Q1x1QjM1OFx1RDJCOCdcbiAgICB9XG4gIH0sXG4gIFBST1ZFTkNFOiB7XG4gICAgbmFtZTogJ1x1RDUwNFx1Qjg1Q1x1QkMyOVx1QzJBNCcsIG11bDogMS41LCBncmFkZTogJ1x1QUNFMFx1QUUwOScsXG4gICAgbWF0ZXJpYWxzOiB7XG4gICAgICBmbG9vcmluZzogJ1x1RDVFNFx1QjlDMVx1QkNGOChcdUI3N0NcdUM3NzRcdUQyQjgpJywgd2FsbDogJ1x1RDY1NFx1Qzc3NFx1RDJCOCtcdUJBQjBcdUI1MjknLCBjZWlsaW5nOiAnXHVDNkIwXHVCQjNDK1x1RDY1NFx1Qzc3NFx1RDJCOCcsXG4gICAgICBkb29yOiAnXHVENjU0XHVDNzc0XHVEMkI4K1x1QkFCMFx1QjUyOScsIGtpdGNoZW46ICdcdUQ2NTRcdUM3NzRcdUQyQjgrXHVCMzAwXHVCOUFDXHVDMTFEJywgdGlsZV9iYXRoOiAnXHVCMzAwXHVCOUFDXHVDMTFEJyxcbiAgICAgIGxpZ2h0aW5nOiAnXHVDNzkxXHVDNzQwIFx1QzBGOVx1QjRFNFx1QjlBQ1x1QzVEMCdcbiAgICB9XG4gIH0sXG4gIENPTlRFTVBPUkFSWToge1xuICAgIG5hbWU6ICdcdUNFRThcdUQxNUNcdUQzRUNcdUI3RUNcdUI5QUMnLCBtdWw6IDEuNiwgZ3JhZGU6ICdcdUFDRTBcdUFFMDknLFxuICAgIG1hdGVyaWFsczoge1xuICAgICAgZmxvb3Jpbmc6ICdcdUFDMTVcdUI5QzhcdUI4RTgoXHVCMkU0XHVEMDZDXHVDNkQ0XHVCMTFCKScsIHdhbGw6ICdcdUIyRTRcdUQwNkMgXHVBREY4XHVCODA4XHVDNzc0JywgY2VpbGluZzogJ1x1RDY1NFx1Qzc3NFx1RDJCOCtcdUFDMDRcdUM4MTFcdUM4NzBcdUJBODUnLFxuICAgICAgZG9vcjogJ1x1QkIzNFx1QUQxMSBcdUIyRTRcdUQwNkMnLCBraXRjaGVuOiAnXHVCMkU0XHVEMDZDK1x1QUNFOFx1QjREQyBcdUMxOTBcdUM3QTFcdUM3NzQnLCB0aWxlX2JhdGg6ICc2MDB4NjAwIFx1Q0MyOFx1Q0Y1QycsXG4gICAgICBsaWdodGluZzogJ1x1Qjc3Q1x1Qzc3OCBMRUQrXHVEMzlDXHVCMzU4XHVEMkI4J1xuICAgIH1cbiAgfSxcbiAgS09SRUFOX01PREVSTjoge1xuICAgIG5hbWU6ICdcdUQ1NUNcdUFENkRcdUJBQThcdUIzNTgnLCBtdWw6IDEuMywgZ3JhZGU6ICdcdUQ0NUNcdUM5MDArJyxcbiAgICBtYXRlcmlhbHM6IHtcbiAgICAgIGZsb29yaW5nOiAnXHVBQzE1XHVCOUM4XHVCOEU4KFx1QzZENFx1QjExQi9cdUFERjhcdUI4MDhcdUM3NzQpJywgd2FsbDogJ1x1QjNDNFx1QkMzMCtcdUQ1NUNcdUM5QzAgXHVEMzI4XHVEMTM0JywgY2VpbGluZzogJ1x1QjNDNFx1QzdBNScsXG4gICAgICBkb29yOiAnXHVDNkIwXHVCNERDJywga2l0Y2hlbjogJ1x1QkFBOFx1QjM1OCtcdUQ1NUNcdUFENkQgXHVDMTkwXHVDN0ExXHVDNzc0JywgdGlsZV9iYXRoOiAnXHVENTVDXHVBRDZEIFx1QjNDNFx1Qzc5MFx1QUUzMCBcdUQzMjhcdUQxMzQnLFxuICAgICAgbGlnaHRpbmc6ICdcdUI5RTRcdUI5QkQnXG4gICAgfVxuICB9LFxuICBTTUFSVF9IT01FOiB7XG4gICAgbmFtZTogJ1x1QzJBNFx1QjlDOFx1RDJCOFx1RDY0OCcsIG11bDogMS43LCBncmFkZTogJ1x1RDUwNFx1QjlBQ1x1QkJGOFx1QzVDNCcsXG4gICAgbWF0ZXJpYWxzOiB7XG4gICAgICBmbG9vcmluZzogJ1x1QUMxNVx1QjlDOFx1QjhFOCcsIHdhbGw6ICdcdUQ2NTRcdUM3NzRcdUQyQjgrXHVDRUVDXHVCN0VDIFx1QUMxNVx1Qzg3MCcsIGNlaWxpbmc6ICdcdUI5RTRcdUI5QkQrTEVEXHVCNzdDXHVDNzc4JyxcbiAgICAgIGRvb3I6ICdcdUJBQThcdUMxNThcdUMxM0NcdUMxMUMoXHVDNjM1XHVDMTU4KScsIGtpdGNoZW46ICdcdUJBQThcdUIzNTggXHVENjU0XHVDNzc0XHVEMkI4JywgdGlsZV9iYXRoOiAnNjAweDYwMCBcdUJBQThcdUIzNTgnLFxuICAgICAgbGlnaHRpbmc6ICdcdUMyQTRcdUI5QzhcdUQyQjggTEVEIFx1QzgwNFx1Q0NCNCdcbiAgICB9LFxuICAgIGlvdDogdHJ1ZVxuICB9XG59O1xuXG5mdW5jdGlvbiBnZXRDb25jZXB0KGlkKSB7XG4gIHJldHVybiBDT05DRVBUX01BVEVSSUFMX01BUFtpZF0gfHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0QWxsQ29uY2VwdHMoKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhDT05DRVBUX01BVEVSSUFMX01BUCk7XG59XG5cbmZ1bmN0aW9uIGdldE1hdGVyaWFsS2V5d29yZChjb25jZXB0SWQsIGNhdGVnb3J5KSB7XG4gIGNvbnN0IGNvbmNlcHQgPSBDT05DRVBUX01BVEVSSUFMX01BUFtjb25jZXB0SWRdO1xuICBpZiAoIWNvbmNlcHQgfHwgIWNvbmNlcHQubWF0ZXJpYWxzKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIGNvbmNlcHQubWF0ZXJpYWxzW2NhdGVnb3J5XSB8fCBudWxsO1xufVxuXG5mdW5jdGlvbiBnZXRHcmFkZU11bChjb25jZXB0SWQpIHtcbiAgY29uc3QgY29uY2VwdCA9IENPTkNFUFRfTUFURVJJQUxfTUFQW2NvbmNlcHRJZF07XG4gIHJldHVybiBjb25jZXB0ID8gY29uY2VwdC5tdWwgOiAxLjA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBDT05DRVBUX01BVEVSSUFMX01BUDogQ09OQ0VQVF9NQVRFUklBTF9NQVAsXG4gIGdldENvbmNlcHQ6IGdldENvbmNlcHQsXG4gIGdldEFsbENvbmNlcHRzOiBnZXRBbGxDb25jZXB0cyxcbiAgZ2V0TWF0ZXJpYWxLZXl3b3JkOiBnZXRNYXRlcmlhbEtleXdvcmQsXG4gIGdldEdyYWRlTXVsOiBnZXRHcmFkZU11bFxufTtcbiIsICIvLyBFQ09SRUFOIEJPQyB2NS42IFx1MjAxNCBDYWxjRW5naW5lIFx1QUNBQ1x1QzgwMSBcdUFDQzRcdUMwQjAgKFx1QkNGNFx1QzgxNVx1QUNDNFx1QzIxOCBcdUQxQjVcdUQ1NjkpXG4vLyBTb1Q6IGRvY3MvTUFTVEVSX1BMQU4ubWQgXHUwMEE3MTA3IChLUEkgMTFcdUQ1NkRcdUJBQTkpXG4vL1xuLy8gXHVENTc1XHVDMkVDIFx1QUNGNVx1QzJERDpcbi8vICAgXHVBQ0Y1XHVBRTA5XHVBQzAwID0gc3VtKHF0eSBcdTAwRDcgKDErd2FzdGVSYXRlKSBcdTAwRDcgKGxhYm9yQ29zdFx1MDBEN3BtICsgbWF0ZXJpYWxDb3N0KSArIGVxdWlwbWVudCArIGFjY2Vzc29yeSArIGRpZmZpY3VsdHlBZGp1c3QpXG4vLyAgIFx1QjNDNFx1QUUwOVx1RDU2OVx1QUNDNCA9IFx1QUNGNVx1QUUwOVx1QUMwMCBcdTAwRDcgYmFzZUZhY3RvciBcdTAwRDcgZ3JhZGVNdWwgXHUwMEQ3IG9jY3VwaWVkRmFjdG9yIFx1MDBENyBlbGV2YXRvckZhY3RvclxuLy8gICBcdUNENUNcdUM4ODUgPSBcdUIzQzRcdUFFMDlcdUQ1NjlcdUFDQzQgXHUwMEQ3IDEuMTAgKFZBVClcbi8vXG4vLyBcdUJDRjRcdUM4MTVcdUFDQzRcdUMyMTg6XG4vLyAgIC0gYmFzZUZhY3RvcjogXHVDOEZDXHVBQzcwXHVENjE1XHVEMERDXHVCQ0M0ICgwLjk1IH4gMS4yNSlcbi8vICAgLSBncmFkZU11bDogXHVDRUU4XHVDMTQ5XHVCQ0M0ICgxLjAgfiAxLjgpXG4vLyAgIC0gb2NjdXBpZWRGYWN0b3I6IFx1QUM3MFx1QzhGQ1x1QzkxMSBcdUMyRENcdUFDRjUgXHUwMEQ3MS4xMFxuLy8gICAtIGVsZXZhdG9yRmFjdG9yOiA0XHVDRTM1KyBcdUJCMzRcdUM1RDhcdUI5QUNcdUJDQTBcdUM3NzRcdUQxMzAgXHUwMEQ3MS4wNSAoXHVDNTkxXHVDOTExXHVCRTQ0KVxuLy9cbi8vIFx1QzgwOFx1QjMwMCBcdUFERENcdUNFNTk6IFx1QjJFOFx1QUMwMCBcdUNEOTRcdUM4MTUgXHVBRTA4XHVDOUMwIFx1MjAxNCBcdUMyRTRcdUM4MUMgY29zdF9pdGVtcyBEQlx1QzVEMFx1QzExQyBMT0FEXG5cbmNvbnN0IHsgZ2V0UmVzaWRlbmNlIH0gPSByZXF1aXJlKCcuLi9tYXRyaWNlcy9SZXNpZGVuY2VNYXRyaXguY2pzJyk7XG5jb25zdCB7IGdldEdyYWRlTXVsIH0gPSByZXF1aXJlKCcuLi9tYXRyaWNlcy9Db25jZXB0TWF0ZXJpYWxNYXRyaXguY2pzJyk7XG5cbmNvbnN0IFZBVF9SQVRFID0gMC4xMDtcbmNvbnN0IEJBU0VfQ09OVFJBQ1RfUkFUSU8gPSAxLjE1O1xuXG5mdW5jdGlvbiBjYWxjU3VwcGx5QW1vdW50KGxpbmVJdGVtcykge1xuICBsZXQgdG90YWwgPSAwO1xuICBsaW5lSXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdCkge1xuICAgIGNvbnN0IHF0eSA9IGl0LnF0eSB8fCAwO1xuICAgIGNvbnN0IHdhc3RlID0gaXQud2FzdGVSYXRlIHx8IDA7XG4gICAgY29uc3QgbGFib3IgPSBpdC5sYWJvckNvc3QgfHwgMDtcbiAgICBjb25zdCBwbSA9IGl0LnBtIHx8IDA7XG4gICAgY29uc3QgbWF0ZXJpYWwgPSBpdC5tYXRlcmlhbENvc3QgfHwgMDtcbiAgICBjb25zdCBlcXVpcCA9IGl0LmVxdWlwbWVudCB8fCAwO1xuICAgIGNvbnN0IGFjY2VzcyA9IGl0LmFjY2Vzc29yeSB8fCAwO1xuICAgIGNvbnN0IGRpZmYgPSBpdC5kaWZmaWN1bHR5QWRqdXN0IHx8IDA7XG5cbiAgICBjb25zdCBsaW5lQ29zdCA9IHF0eSAqICgxICsgd2FzdGUpICogKGxhYm9yICogcG0gKyBtYXRlcmlhbCkgKyBlcXVpcCArIGFjY2VzcyArIGRpZmY7XG4gICAgdG90YWwgKz0gbGluZUNvc3Q7XG4gIH0pO1xuICByZXR1cm4gTWF0aC5yb3VuZCh0b3RhbCk7XG59XG5cbmZ1bmN0aW9uIGNhbGNDb250cmFjdEFtb3VudChzdXBwbHksIG9wdHMpIHtcbiAgY29uc3QgYmFzZUZhY3RvciAgICAgID0gb3B0cy5iYXNlRmFjdG9yIHx8IDEuMDtcbiAgY29uc3QgZ3JhZGVNdWwgICAgICAgID0gb3B0cy5ncmFkZU11bCB8fCAxLjA7XG4gIGNvbnN0IG9jY3VwaWVkRmFjdG9yICA9IG9wdHMub2NjdXBpZWQgPyAxLjEwIDogMS4wO1xuICBjb25zdCBlbGV2YXRvckZhY3RvciAgPSBvcHRzLmZsb29yTGV2ZWwgPj0gNCAmJiAhb3B0cy5oYXNFbGV2ID8gMS4wNSA6IDEuMDtcblxuICByZXR1cm4gTWF0aC5yb3VuZChcbiAgICBzdXBwbHkgKiBCQVNFX0NPTlRSQUNUX1JBVElPICogYmFzZUZhY3RvciAqIGdyYWRlTXVsICogb2NjdXBpZWRGYWN0b3IgKiBlbGV2YXRvckZhY3RvclxuICApO1xufVxuXG5mdW5jdGlvbiBjYWxjRmluYWxBbW91bnQoY29udHJhY3QpIHtcbiAgcmV0dXJuIE1hdGgucm91bmQoY29udHJhY3QgKiAoMSArIFZBVF9SQVRFKSk7XG59XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZUVzdGltYXRlKGlucHV0KSB7XG4gIGlmICghaW5wdXQgfHwgIUFycmF5LmlzQXJyYXkoaW5wdXQubGluZUl0ZW1zKSkge1xuICAgIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3JzOiBbJ2xpbmVJdGVtcyBcdUJDMzBcdUM1RjQgXHVENTQ0XHVDMjE4J10gfTtcbiAgfVxuXG4gIGNvbnN0IHN1cHBseSA9IGNhbGNTdXBwbHlBbW91bnQoaW5wdXQubGluZUl0ZW1zKTtcblxuICBjb25zdCByZXNpZGVuY2VEYXRhID0gZ2V0UmVzaWRlbmNlKGlucHV0LnJlc2lkZW5jZSk7XG4gIGNvbnN0IGJhc2VGYWN0b3IgPSByZXNpZGVuY2VEYXRhID8gcmVzaWRlbmNlRGF0YS5iYXNlRmFjdG9yIDogMS4wO1xuICBjb25zdCBncmFkZU11bCA9IGdldEdyYWRlTXVsKGlucHV0LmNvbmNlcHQpO1xuXG4gIGNvbnN0IGNvbnRyYWN0ID0gY2FsY0NvbnRyYWN0QW1vdW50KHN1cHBseSwge1xuICAgIGJhc2VGYWN0b3I6IGJhc2VGYWN0b3IsXG4gICAgZ3JhZGVNdWw6IGdyYWRlTXVsLFxuICAgIG9jY3VwaWVkOiBpbnB1dC5vY2N1cGllZCxcbiAgICBmbG9vckxldmVsOiBpbnB1dC5mbG9vckxldmVsLFxuICAgIGhhc0VsZXY6IGlucHV0Lmhhc0VsZXZcbiAgfSk7XG5cbiAgY29uc3QgZmluYWwyID0gY2FsY0ZpbmFsQW1vdW50KGNvbnRyYWN0KTtcblxuICBjb25zdCBhcmVhU3FtID0gaW5wdXQuYXJlYVNxbSB8fCAwO1xuICBjb25zdCBzcW1QcmljZSA9IGFyZWFTcW0gPiAwID8gTWF0aC5yb3VuZChmaW5hbDIgLyBhcmVhU3FtKSA6IDA7XG4gIGNvbnN0IHB5UHJpY2UgPSBhcmVhU3FtID4gMCA/IE1hdGgucm91bmQoZmluYWwyIC8gKGFyZWFTcW0gLyAzLjMwNTgpKSA6IDA7XG5cbiAgY29uc3QgbWFyZ2luID0gY29udHJhY3QgPiAwID8gKChjb250cmFjdCAtIHN1cHBseSkgLyBjb250cmFjdCAqIDEwMCkgOiAwO1xuXG4gIHJldHVybiB7XG4gICAgb2s6IHRydWUsXG4gICAgcGF5bG9hZDoge1xuICAgICAgc3VwcGx5OiBzdXBwbHksXG4gICAgICBjb250cmFjdDogY29udHJhY3QsXG4gICAgICBmaW5hbDogZmluYWwyLFxuICAgICAgYXJlYVNxbTogYXJlYVNxbSxcbiAgICAgIHNxbVByaWNlOiBzcW1QcmljZSxcbiAgICAgIHB5UHJpY2U6IHB5UHJpY2UsXG4gICAgICBtYXJnaW46IHBhcnNlRmxvYXQobWFyZ2luLnRvRml4ZWQoMSkpLFxuICAgICAgZmFjdG9yczoge1xuICAgICAgICBiYXNlRmFjdG9yOiBiYXNlRmFjdG9yLFxuICAgICAgICBncmFkZU11bDogZ3JhZGVNdWwsXG4gICAgICAgIG9jY3VwaWVkOiAhIWlucHV0Lm9jY3VwaWVkLFxuICAgICAgICBlbGV2YXRvcjogaW5wdXQuZmxvb3JMZXZlbCA+PSA0ICYmICFpbnB1dC5oYXNFbGV2XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY2FsY1N1cHBseUFtb3VudDogY2FsY1N1cHBseUFtb3VudCxcbiAgY2FsY0NvbnRyYWN0QW1vdW50OiBjYWxjQ29udHJhY3RBbW91bnQsXG4gIGNhbGNGaW5hbEFtb3VudDogY2FsY0ZpbmFsQW1vdW50LFxuICBjYWxjdWxhdGVFc3RpbWF0ZTogY2FsY3VsYXRlRXN0aW1hdGUsXG4gIFZBVF9SQVRFOiBWQVRfUkFURSxcbiAgQkFTRV9DT05UUkFDVF9SQVRJTzogQkFTRV9DT05UUkFDVF9SQVRJT1xufTtcbiIsICIvLyBFQ09SRUFOIEJPQyB2NS42IFx1MjAxNCBcdUMyRENcdUFDRjUgXHVDMTM5XHVDMTU4IDIyXHVBQzFDIFx1QkNGOCBcdUI5RTRcdUQyQjhcdUI5QURcdUMyQTRcbi8vIFNvVDogZG9jcy9NQVNURVJfUExBTi5tZCBcdTAwQTc2IFNURVAgMCArIFx1QkQ4MFx1Qjg1RCBJXG5cbmNvbnN0IFNFQ1RJT05TID0ge1xuICAvLyBcdUFERjhcdUI4RjkgQTogXHVDOEZDXHVBQzcwIFx1QUNGNVx1QUMwNCAoNikgXHUyMDE0IFx1RDU0NFx1QzIxOFxuICBSRVNJREVOVElBTDoge1xuICAgIGxpdmluZzogICAgeyBuYW1lOiAnXHVBQzcwXHVDMkU0JywgICAgICAgICAgIGdyb3VwOiAnQScsIHJlcXVpcmVkOiB0cnVlLCAgc3BhY2VzOiBbJ0xJVklORyddIH0sXG4gICAgYmVkcm9vbTogICB7IG5hbWU6ICdcdUNFNjhcdUMyRTQnLCAgICAgICAgICAgZ3JvdXA6ICdBJywgcmVxdWlyZWQ6IHRydWUsICBzcGFjZXM6IFsnTUFTVEVSX0JFRFJPT00nLCdCRURST09NJywnU01BTExfQkVEUk9PTSddIH0sXG4gICAga2l0Y2hlbjogICB7IG5hbWU6ICdcdUM4RkNcdUJDMjknLCAgICAgICAgICAgZ3JvdXA6ICdBJywgcmVxdWlyZWQ6IHRydWUsICBzcGFjZXM6IFsnS0lUQ0hFTiddIH0sXG4gICAgYmF0aHJvb206ICB7IG5hbWU6ICdcdUM2OTVcdUMyRTQnLCAgICAgICAgICAgZ3JvdXA6ICdBJywgcmVxdWlyZWQ6IHRydWUsICBzcGFjZXM6IFsnQkFUSFJPT00nXSB9LFxuICAgIGJhbGNvbnk6ICAgeyBuYW1lOiAnXHVCQzFDXHVDRjU0XHVCMkM4L1x1RDE0Q1x1Qjc3Q1x1QzJBNCcsICAgZ3JvdXA6ICdBJywgcmVxdWlyZWQ6IGZhbHNlLCBzcGFjZXM6IFsnQkFMQ09OWScsJ1RFUlJBQ0UnXSB9LFxuICAgIGVudHJhbmNlOiAgeyBuYW1lOiAnXHVENjA0XHVBRDAwJywgICAgICAgICAgIGdyb3VwOiAnQScsIHJlcXVpcmVkOiB0cnVlLCAgc3BhY2VzOiBbJ0VOVFJBTkNFJ10gfVxuICB9LFxuICAvLyBcdUFERjhcdUI4RjkgQjogXHVCRDgwXHVBQzAwIFx1QUNGNVx1QUMwNCAoNikgXHUyMDE0IFx1RDNDOVx1RDYxNS9cdUQ1NDRcdUM2OTRcdUMyRENcbiAgQVVYSUxJQVJZOiB7XG4gICAgZHJlc3Npbmc6ICB7IG5hbWU6ICdcdUI0RENcdUI4MDhcdUMyQTRcdUI4RjgnLCAgICAgICBncm91cDogJ0InLCByZXF1aXJlZDogZmFsc2UsIHNwYWNlczogWydEUkVTU0lORyddIH0sXG4gICAgc3R1ZHk6ICAgICB7IG5hbWU6ICdcdUMxMUNcdUM3QUMnLCAgICAgICAgICAgZ3JvdXA6ICdCJywgcmVxdWlyZWQ6IGZhbHNlLCBzcGFjZXM6IFsnU1RVRFknXSB9LFxuICAgIGRpbmluZzogICAgeyBuYW1lOiAnXHVDMkREXHVCMkY5JywgICAgICAgICAgIGdyb3VwOiAnQicsIHJlcXVpcmVkOiBmYWxzZSwgc3BhY2VzOiBbJ0RJTklORyddIH0sXG4gICAgcGFudHJ5OiAgICB7IG5hbWU6ICdcdUQzMkNcdUQyQjhcdUI5QUMnLCAgICAgICAgIGdyb3VwOiAnQicsIHJlcXVpcmVkOiBmYWxzZSwgc3BhY2VzOiBbJ1BBTlRSWSddIH0sXG4gICAgdXRpbGl0eTogICB7IG5hbWU6ICdcdUIyRTRcdUM2QTlcdUIzQzRcdUMyRTQnLCAgICAgICBncm91cDogJ0InLCByZXF1aXJlZDogZmFsc2UsIHNwYWNlczogWydVVElMSVRZJ10gfSxcbiAgICBwb3dkZXI6ICAgIHsgbmFtZTogJ1x1RDMwQ1x1QzZCMFx1QjM1NFx1QjhGOCcsICAgICAgIGdyb3VwOiAnQicsIHJlcXVpcmVkOiBmYWxzZSwgc3BhY2VzOiBbJ1BPV0RFUl9ST09NJ10gfVxuICB9LFxuICAvLyBcdUFERjhcdUI4RjkgQzogXHVEMkI5XHVDMjE4IFx1QUNGNVx1QUMwNCAoNSkgXHUyMDE0IFx1QjJFOFx1QjNDNS9cdUIzMDBcdUQ2MTVcbiAgU1BFQ0lBTDoge1xuICAgIGJvaWxlcjogICAgeyBuYW1lOiAnXHVCQ0Y0XHVDNzdDXHVCN0VDXHVDMkU0JywgICAgICAgZ3JvdXA6ICdDJywgcmVxdWlyZWQ6IGZhbHNlLCBzcGFjZXM6IFsnQk9JTEVSJ10sICAgICByZXNpZGVuY2VzOiBbJ0RFVEFDSEVEXzFGJywnREVUQUNIRURfMkYnLCdWSUxMQSddIH0sXG4gICAgaGFsbHdheTogICB7IG5hbWU6ICdcdUJDRjVcdUIzQzQnLCAgICAgICAgICAgZ3JvdXA6ICdDJywgcmVxdWlyZWQ6IGZhbHNlLCBzcGFjZXM6IFsnSEFMTFdBWSddIH0sXG4gICAgc3RhaXJzOiAgICB7IG5hbWU6ICdcdUFDQzRcdUIyRTgnLCAgICAgICAgICAgZ3JvdXA6ICdDJywgcmVxdWlyZWQ6IGZhbHNlLCBzcGFjZXM6IFsnU1RBSVJTJ10sICAgICByZXNpZGVuY2VzOiBbJ0RFVEFDSEVEXzJGJ10gfSxcbiAgICByb29mdG9wOiAgIHsgbmFtZTogJ1x1QzYyNVx1QzBDMScsICAgICAgICAgICBncm91cDogJ0MnLCByZXF1aXJlZDogZmFsc2UsIHNwYWNlczogWydST09GVE9QJ10sICAgIHJlc2lkZW5jZXM6IFsnREVUQUNIRURfMUYnLCdERVRBQ0hFRF8yRicsJ1BFTlRIT1VTRSddIH0sXG4gICAgYmFzZW1lbnQ6ICB7IG5hbWU6ICdcdUM5QzBcdUQ1NTgvXHVCMkU0XHVCNzdEJywgICAgICBncm91cDogJ0MnLCByZXF1aXJlZDogZmFsc2UsIHNwYWNlczogWydCQVNFTUVOVCcsJ0FUVElDJ10sIHJlc2lkZW5jZXM6IFsnREVUQUNIRURfMUYnLCdERVRBQ0hFRF8yRiddIH1cbiAgfSxcbiAgLy8gXHVBREY4XHVCOEY5IEQ6IFx1QUNGNVx1QzgxNSAoNSkgXHUyMDE0IFx1QzgwNFx1Q0NCNCBcdUM2MDFcdUQ1QTVcbiAgUFJPQ0VTUzoge1xuICAgIHBsdW1iaW5nOiAgeyBuYW1lOiAnXHVCQzMwXHVBRDAwJywgICAgICAgICAgIGdyb3VwOiAnRCcsIHJlcXVpcmVkOiB0cnVlLCAgdHlwZTogJ3Byb2Nlc3MnIH0sXG4gICAgZWxlY3RyaWM6ICB7IG5hbWU6ICdcdUM4MDRcdUFFMzAnLCAgICAgICAgICAgZ3JvdXA6ICdEJywgcmVxdWlyZWQ6IHRydWUsICB0eXBlOiAncHJvY2VzcycgfSxcbiAgICB3aW5kb3c6ICAgIHsgbmFtZTogJ1x1Q0MzRFx1RDYzOCcsICAgICAgICAgICBncm91cDogJ0QnLCByZXF1aXJlZDogdHJ1ZSwgIHR5cGU6ICdwcm9jZXNzJyB9LFxuICAgIGluc3VsYXRpb246eyBuYW1lOiAnXHVCMkU4XHVDNUY0KFx1QzY3OFx1QkNCRCknLCAgICAgIGdyb3VwOiAnRCcsIHJlcXVpcmVkOiBmYWxzZSwgdHlwZTogJ3Byb2Nlc3MnLCByZXNpZGVuY2VzOiBbJ0RFVEFDSEVEXzFGJywnREVUQUNIRURfMkYnLCdQRU5USE9VU0UnXSB9LFxuICAgIGV4dGVyaW9yOiAgeyBuYW1lOiAnXHVDNjc4XHVDN0E1L1x1QzlDMFx1QkQ5NScsICAgICAgIGdyb3VwOiAnRCcsIHJlcXVpcmVkOiBmYWxzZSwgdHlwZTogJ3Byb2Nlc3MnLCByZXNpZGVuY2VzOiBbJ0RFVEFDSEVEXzFGJywnREVUQUNIRURfMkYnXSB9XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGdldEFsbFNlY3Rpb25JZHMoKSB7XG4gIGNvbnN0IGlkcyA9IFtdO1xuICBbJ1JFU0lERU5USUFMJywnQVVYSUxJQVJZJywnU1BFQ0lBTCcsJ1BST0NFU1MnXS5mb3JFYWNoKGZ1bmN0aW9uKGdyb3VwKSB7XG4gICAgT2JqZWN0LmtleXMoU0VDVElPTlNbZ3JvdXBdKS5mb3JFYWNoKGZ1bmN0aW9uKGlkKSB7IGlkcy5wdXNoKGlkKTsgfSk7XG4gIH0pO1xuICByZXR1cm4gaWRzO1xufVxuXG5mdW5jdGlvbiBnZXRTcGFjZXNGb3JTZWN0aW9ucyhzZWN0aW9uSWRzKSB7XG4gIGNvbnN0IHJlc3VsdCA9IG5ldyBTZXQoKTtcbiAgY29uc3QgYWxsID0gU0VDVElPTlM7XG4gIHNlY3Rpb25JZHMuZm9yRWFjaChmdW5jdGlvbihzZWNJZCkge1xuICAgIFsnUkVTSURFTlRJQUwnLCdBVVhJTElBUlknLCdTUEVDSUFMJywnUFJPQ0VTUyddLmZvckVhY2goZnVuY3Rpb24oZ3JvdXApIHtcbiAgICAgIGNvbnN0IHNlYyA9IGFsbFtncm91cF1bc2VjSWRdO1xuICAgICAgaWYgKHNlYyAmJiBzZWMuc3BhY2VzKSB7XG4gICAgICAgIHNlYy5zcGFjZXMuZm9yRWFjaChmdW5jdGlvbihzKSB7IHJlc3VsdC5hZGQocyk7IH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIEFycmF5LmZyb20ocmVzdWx0KTtcbn1cblxuZnVuY3Rpb24gZ2V0QXZhaWxhYmxlU2VjdGlvbnMocmVzaWRlbmNlKSB7XG4gIGNvbnN0IGlkcyA9IFtdO1xuICBbJ1JFU0lERU5USUFMJywnQVVYSUxJQVJZJywnU1BFQ0lBTCcsJ1BST0NFU1MnXS5mb3JFYWNoKGZ1bmN0aW9uKGdyb3VwKSB7XG4gICAgT2JqZWN0LmtleXMoU0VDVElPTlNbZ3JvdXBdKS5mb3JFYWNoKGZ1bmN0aW9uKGlkKSB7XG4gICAgICBjb25zdCBzZWMgPSBTRUNUSU9OU1tncm91cF1baWRdO1xuICAgICAgaWYgKCFzZWMucmVzaWRlbmNlcyB8fCBzZWMucmVzaWRlbmNlcy5pbmNsdWRlcyhyZXNpZGVuY2UpKSB7XG4gICAgICAgIGlkcy5wdXNoKGlkKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBpZHM7XG59XG5cbmZ1bmN0aW9uIGdldFNlY3Rpb24oaWQpIHtcbiAgbGV0IHJlc3VsdCA9IG51bGw7XG4gIFsnUkVTSURFTlRJQUwnLCdBVVhJTElBUlknLCdTUEVDSUFMJywnUFJPQ0VTUyddLmZvckVhY2goZnVuY3Rpb24oZ3JvdXApIHtcbiAgICBpZiAoU0VDVElPTlNbZ3JvdXBdW2lkXSkgcmVzdWx0ID0gU0VDVElPTlNbZ3JvdXBdW2lkXTtcbiAgfSk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBTRUNUSU9OUzogU0VDVElPTlMsXG4gIGdldEFsbFNlY3Rpb25JZHM6IGdldEFsbFNlY3Rpb25JZHMsXG4gIGdldFNwYWNlc0ZvclNlY3Rpb25zOiBnZXRTcGFjZXNGb3JTZWN0aW9ucyxcbiAgZ2V0QXZhaWxhYmxlU2VjdGlvbnM6IGdldEF2YWlsYWJsZVNlY3Rpb25zLFxuICBnZXRTZWN0aW9uOiBnZXRTZWN0aW9uXG59O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY2LjAgXHUyMDE0IFdpemFyZCBDb250cm9sbGVyXG4vLyA1XHVCMkU4IFx1QUM4Q1x1Qzc3NFx1RDJCOCBcdUM5QzRcdUQ1ODkgXHVDMEMxXHVEMERDIFx1QUQwMFx1QjlBQyArIFBoYXNlIDMgXHVCQzMxXHVDNUQ0XHVCNERDIFx1QzVGMFx1QUNCMFxuXG5jb25zdCB7IEcxVHlwZSB9ID0gcmVxdWlyZSgnQGdhdGVzL0cxX1R5cGUuY2pzJyk7XG5jb25zdCB7IEcyQ29uY2VwdCB9ID0gcmVxdWlyZSgnQGdhdGVzL0cyX0NvbmNlcHQuY2pzJyk7XG5jb25zdCB7IEczU2VjdGlvbiB9ID0gcmVxdWlyZSgnQGdhdGVzL0czX1NlY3Rpb24uY2pzJyk7XG5jb25zdCB7IEc0Q0FEIH0gPSByZXF1aXJlKCdAZ2F0ZXMvRzRfQ0FELmNqcycpO1xuY29uc3QgeyBHNU1hdGVyaWFsIH0gPSByZXF1aXJlKCdAZ2F0ZXMvRzVfTWF0ZXJpYWwuY2pzJyk7XG5jb25zdCB7IEdhdGVSZWdpc3RyeSB9ID0gcmVxdWlyZSgnQGdhdGVzL0dhdGUuY2pzJyk7XG5jb25zdCB7IGNhbGN1bGF0ZUVzdGltYXRlIH0gPSByZXF1aXJlKCdAZXN0aW1hdGUtdjYvY2FsYy9DYWxjRW5naW5lVjU2LmNqcycpO1xuY29uc3QgeyBnZXRTcGFjZXNGb3JTZWN0aW9ucyB9ID0gcmVxdWlyZSgnQGVzdGltYXRlLXY2L21hdHJpY2VzL1NlY3Rpb25zLmNqcycpO1xuXG4vLyA1IFx1QjJFOFx1QUNDNCBcdUM4MTVcdUM3NThcbmNvbnN0IFNUQUdFUyA9IHtcbiAgRzE6IHsgaWQ6ICdHMScsIG5hbWU6ICdcdUM3MjBcdUQ2MTUnLCAgIGF1dG9tYXRpb246IDMwIH0sXG4gIEcyOiB7IGlkOiAnRzInLCBuYW1lOiAnXHVDRUU4XHVDMTQ5JywgICBhdXRvbWF0aW9uOiA3MCB9LFxuICBHMzogeyBpZDogJ0czJywgbmFtZTogJ1x1QzEzOVx1QzE1OCcsICAgYXV0b21hdGlvbjogODUgfSxcbiAgRzQ6IHsgaWQ6ICdHNCcsIG5hbWU6ICdDQUQnLCAgICBhdXRvbWF0aW9uOiA5NSB9LFxuICBHNTogeyBpZDogJ0c1JywgbmFtZTogJ1x1Qzc5MFx1QzdBQycsICAgYXV0b21hdGlvbjogOTkgfVxufTtcblxuY2xhc3MgV2l6YXJkQ29udHJvbGxlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMucmVnaXN0cnkgPSBuZXcgR2F0ZVJlZ2lzdHJ5KCk7XG4gICAgdGhpcy5nMSA9IG5ldyBHMVR5cGUoKTtcbiAgICB0aGlzLmcyID0gbmV3IEcyQ29uY2VwdCgpO1xuICAgIHRoaXMuZzMgPSBuZXcgRzNTZWN0aW9uKCk7XG4gICAgdGhpcy5nNCA9IG5ldyBHNENBRCgpO1xuICAgIHRoaXMuZzUgPSBuZXcgRzVNYXRlcmlhbCgpO1xuICAgIHRoaXMucmVnaXN0cnkucmVnaXN0ZXIodGhpcy5nMSk7XG4gICAgdGhpcy5yZWdpc3RyeS5yZWdpc3Rlcih0aGlzLmcyKTtcbiAgICB0aGlzLnJlZ2lzdHJ5LnJlZ2lzdGVyKHRoaXMuZzMpO1xuICAgIHRoaXMucmVnaXN0cnkucmVnaXN0ZXIodGhpcy5nNCk7XG4gICAgdGhpcy5yZWdpc3RyeS5yZWdpc3Rlcih0aGlzLmc1KTtcblxuICAgIHRoaXMuaW5wdXQgPSB7XG4gICAgICByZXNpZGVuY2U6IG51bGwsXG4gICAgICBweWVvbmc6IG51bGwsXG4gICAgICBjb25jZXB0OiBudWxsLFxuICAgICAgc2VjdGlvbnM6IFtdLFxuICAgICAgc3BhY2VzOiBbXSxcbiAgICAgIG1hdGVyaWFsczogW11cbiAgICB9O1xuXG4gICAgdGhpcy5sb2NrZWRHYXRlcyA9IFtdO1xuICAgIHRoaXMuY3VycmVudFN0YWdlID0gJ0cxJztcbiAgICB0aGlzLmVzdGltYXRlID0gbnVsbDtcbiAgICB0aGlzLmxpc3RlbmVycyA9IG5ldyBTZXQoKTtcbiAgfVxuXG4gIHN1YnNjcmliZShoYW5kbGVyKSB7XG4gICAgdGhpcy5saXN0ZW5lcnMuYWRkKGhhbmRsZXIpO1xuICAgIHJldHVybiAoKSA9PiB0aGlzLmxpc3RlbmVycy5kZWxldGUoaGFuZGxlcik7XG4gIH1cblxuICBfZW1pdChldmVudFR5cGUsIHBheWxvYWQpIHtcbiAgICB0aGlzLmxpc3RlbmVycy5mb3JFYWNoKGggPT4gaChldmVudFR5cGUsIHBheWxvYWQpKTtcbiAgfVxuXG4gIGdldEF1dG9tYXRpb24oKSB7XG4gICAgaWYgKHRoaXMubG9ja2VkR2F0ZXMubGVuZ3RoID09PSAwKSByZXR1cm4gMDtcbiAgICBjb25zdCBsYXN0TG9ja2VkID0gdGhpcy5sb2NrZWRHYXRlc1t0aGlzLmxvY2tlZEdhdGVzLmxlbmd0aCAtIDFdO1xuICAgIHJldHVybiBTVEFHRVNbbGFzdExvY2tlZF0uYXV0b21hdGlvbjtcbiAgfVxuXG4gIGxvY2tHMShvcHRzKSB7XG4gICAgaWYgKCFvcHRzLnJlc2lkZW5jZSB8fCAhb3B0cy5weWVvbmcpIHtcbiAgICAgIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdyZXNpZGVuY2UsIHB5ZW9uZyBcdUQ1NDRcdUMyMTgnIH07XG4gICAgfVxuICAgIGNvbnN0IHIgPSB0aGlzLmcxLmxvY2soeyByZXNpZGVuY2U6IG9wdHMucmVzaWRlbmNlLCBweWVvbmc6IG9wdHMucHllb25nIH0sIHRoaXMucmVnaXN0cnkpO1xuICAgIGlmIChyLm9rKSB7XG4gICAgICB0aGlzLmlucHV0LnJlc2lkZW5jZSA9IG9wdHMucmVzaWRlbmNlO1xuICAgICAgdGhpcy5pbnB1dC5weWVvbmcgPSBvcHRzLnB5ZW9uZztcbiAgICAgIHRoaXMubG9ja2VkR2F0ZXMucHVzaCgnRzEnKTtcbiAgICAgIHRoaXMuY3VycmVudFN0YWdlID0gJ0cyJztcbiAgICAgIHRoaXMuX2VtaXQoJ0dBVEVfTE9DS0VEJywgeyBnYXRlOiAnRzEnLCBpbnB1dDogb3B0cywgYXV0b21hdGlvbjogdGhpcy5nZXRBdXRvbWF0aW9uKCkgfSk7XG4gICAgfVxuICAgIHJldHVybiByO1xuICB9XG5cbiAgbG9ja0cyKG9wdHMpIHtcbiAgICBpZiAoIW9wdHMuY29uY2VwdCkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ2NvbmNlcHQgXHVENTQ0XHVDMjE4JyB9O1xuICAgIGlmICghdGhpcy5sb2NrZWRHYXRlcy5pbmNsdWRlcygnRzEnKSkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0cxIFx1QkEzQ1x1QzgwMCcgfTtcbiAgICBjb25zdCByID0gdGhpcy5nMi5sb2NrKHsgY29uY2VwdDogb3B0cy5jb25jZXB0IH0sIHRoaXMucmVnaXN0cnkpO1xuICAgIGlmIChyLm9rKSB7XG4gICAgICB0aGlzLmlucHV0LmNvbmNlcHQgPSBvcHRzLmNvbmNlcHQ7XG4gICAgICB0aGlzLmxvY2tlZEdhdGVzLnB1c2goJ0cyJyk7XG4gICAgICB0aGlzLmN1cnJlbnRTdGFnZSA9ICdHMyc7XG4gICAgICB0aGlzLl9lbWl0KCdHQVRFX0xPQ0tFRCcsIHsgZ2F0ZTogJ0cyJywgaW5wdXQ6IG9wdHMsIGF1dG9tYXRpb246IHRoaXMuZ2V0QXV0b21hdGlvbigpIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcjtcbiAgfVxuXG4gIGxvY2tHMyhvcHRzKSB7XG4gICAgaWYgKCFvcHRzLnNlY3Rpb25zIHx8IG9wdHMuc2VjdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnc2VjdGlvbnMgMVx1QUMxQyBcdUM3NzRcdUMwQzEgXHVENTQ0XHVDMjE4JyB9O1xuICAgIH1cbiAgICBpZiAoIXRoaXMubG9ja2VkR2F0ZXMuaW5jbHVkZXMoJ0cyJykpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdHMiBcdUJBM0NcdUM4MDAnIH07XG4gICAgY29uc3QgciA9IHRoaXMuZzMubG9jayh7IHNlY3Rpb25zOiBvcHRzLnNlY3Rpb25zIH0sIHRoaXMucmVnaXN0cnkpO1xuICAgIGlmIChyLm9rKSB7XG4gICAgICB0aGlzLmlucHV0LnNlY3Rpb25zID0gb3B0cy5zZWN0aW9ucztcbiAgICAgIHRoaXMubG9ja2VkR2F0ZXMucHVzaCgnRzMnKTtcbiAgICAgIHRoaXMuY3VycmVudFN0YWdlID0gJ0c0JztcbiAgICAgIGNvbnN0IGF1dG9TcGFjZXMgPSBnZXRTcGFjZXNGb3JTZWN0aW9ucyhvcHRzLnNlY3Rpb25zKTtcbiAgICAgIHRoaXMuX2VtaXQoJ0dBVEVfTE9DS0VEJywge1xuICAgICAgICBnYXRlOiAnRzMnLFxuICAgICAgICBpbnB1dDogb3B0cyxcbiAgICAgICAgYXV0b1NwYWNlczogYXV0b1NwYWNlcyxcbiAgICAgICAgYXV0b21hdGlvbjogdGhpcy5nZXRBdXRvbWF0aW9uKClcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcjtcbiAgfVxuXG4gIGxvY2tHNChvcHRzKSB7XG4gICAgaWYgKCFvcHRzLnNwYWNlcyB8fCBvcHRzLnNwYWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdzcGFjZXMgXHVCQTc0XHVDODAxIFx1RDU0NFx1QzIxOCcgfTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmxvY2tlZEdhdGVzLmluY2x1ZGVzKCdHMycpKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnRzMgXHVCQTNDXHVDODAwJyB9O1xuICAgIGNvbnN0IHIgPSB0aGlzLmc0LmxvY2soeyBzcGFjZXM6IG9wdHMuc3BhY2VzIH0sIHRoaXMucmVnaXN0cnkpO1xuICAgIGlmIChyLm9rKSB7XG4gICAgICB0aGlzLmlucHV0LnNwYWNlcyA9IG9wdHMuc3BhY2VzO1xuICAgICAgdGhpcy5sb2NrZWRHYXRlcy5wdXNoKCdHNCcpO1xuICAgICAgdGhpcy5jdXJyZW50U3RhZ2UgPSAnRzUnO1xuICAgICAgdGhpcy5fY2FsY3VsYXRlRXN0aW1hdGUoKTtcbiAgICAgIHRoaXMuX2VtaXQoJ0dBVEVfTE9DS0VEJywge1xuICAgICAgICBnYXRlOiAnRzQnLFxuICAgICAgICBpbnB1dDogb3B0cyxcbiAgICAgICAgZXN0aW1hdGU6IHRoaXMuZXN0aW1hdGUsXG4gICAgICAgIGF1dG9tYXRpb246IHRoaXMuZ2V0QXV0b21hdGlvbigpXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG4gIH1cblxuICBsb2NrRzUob3B0cykge1xuICAgIGlmICghdGhpcy5sb2NrZWRHYXRlcy5pbmNsdWRlcygnRzQnKSkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0c0IFx1QkEzQ1x1QzgwMCcgfTtcbiAgICBjb25zdCByID0gdGhpcy5nNS5sb2NrKHsgbWF0ZXJpYWxzOiBvcHRzLm1hdGVyaWFscyB8fCBbXSB9LCB0aGlzLnJlZ2lzdHJ5KTtcbiAgICBpZiAoci5vaykge1xuICAgICAgdGhpcy5pbnB1dC5tYXRlcmlhbHMgPSBvcHRzLm1hdGVyaWFscyB8fCBbXTtcbiAgICAgIHRoaXMubG9ja2VkR2F0ZXMucHVzaCgnRzUnKTtcbiAgICAgIHRoaXMuY3VycmVudFN0YWdlID0gJ0NPTVBMRVRFJztcbiAgICAgIHRoaXMuX2NhbGN1bGF0ZUVzdGltYXRlKCk7XG4gICAgICB0aGlzLl9lbWl0KCdHQVRFX0xPQ0tFRCcsIHtcbiAgICAgICAgZ2F0ZTogJ0c1JyxcbiAgICAgICAgaW5wdXQ6IG9wdHMsXG4gICAgICAgIGVzdGltYXRlOiB0aGlzLmVzdGltYXRlLFxuICAgICAgICBhdXRvbWF0aW9uOiB0aGlzLmdldEF1dG9tYXRpb24oKVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByO1xuICB9XG5cbiAgX2NhbGN1bGF0ZUVzdGltYXRlKCkge1xuICAgIGlmICghdGhpcy5sb2NrZWRHYXRlcy5pbmNsdWRlcygnRzQnKSkgcmV0dXJuIG51bGw7XG5cbiAgICAvLyBcdUMyRENcdUJCQUMgXHVCMkU4XHVBQzAwIChXZWVrIDRcdUM1RDBcdUMxMUMgY29zdF9pdGVtcyBEQiBcdUM1RjBcdUFDQjAgXHVDNjA4XHVDODE1KVxuICAgIGNvbnN0IFNJTV9SQVRFUyA9IHtcbiAgICAgIEJBVEhST09NOiB7IGxhYm9yOiAxMDAwMDAsIG1hdGVyaWFsOiAyMDAwMDAgfSxcbiAgICAgIEtJVENIRU46ICB7IGxhYm9yOiA4MDAwMCwgIG1hdGVyaWFsOiAxNTAwMDAgfSxcbiAgICAgIExJVklORzogICB7IGxhYm9yOiA2MDAwMCwgIG1hdGVyaWFsOiAxMDAwMDAgfSxcbiAgICAgIEJFRFJPT006ICB7IGxhYm9yOiA1MDAwMCwgIG1hdGVyaWFsOiA4MDAwMCB9LFxuICAgICAgREVGQVVMVDogIHsgbGFib3I6IDcwMDAwLCAgbWF0ZXJpYWw6IDEwMDAwMCB9XG4gICAgfTtcblxuICAgIGNvbnN0IGxpbmVJdGVtcyA9IHRoaXMuaW5wdXQuc3BhY2VzLm1hcChzcGFjZSA9PiB7XG4gICAgICBjb25zdCByYXRlID0gU0lNX1JBVEVTW3NwYWNlLnR5cGVLZXldIHx8IFNJTV9SQVRFUy5ERUZBVUxUO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcXR5OiBzcGFjZS5hcmVhX3NxbSxcbiAgICAgICAgd2FzdGVSYXRlOiAwLjA1LFxuICAgICAgICBsYWJvckNvc3Q6IHJhdGUubGFib3IsXG4gICAgICAgIHBtOiAxLFxuICAgICAgICBtYXRlcmlhbENvc3Q6IHJhdGUubWF0ZXJpYWxcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICBjb25zdCB0b3RhbEFyZWFTcW0gPSB0aGlzLmlucHV0LnNwYWNlcy5yZWR1Y2UoKHN1bSwgcykgPT4gc3VtICsgcy5hcmVhX3NxbSwgMCk7XG5cbiAgICBjb25zdCByZXN1bHQgPSBjYWxjdWxhdGVFc3RpbWF0ZSh7XG4gICAgICBsaW5lSXRlbXM6IGxpbmVJdGVtcyxcbiAgICAgIHJlc2lkZW5jZTogdGhpcy5pbnB1dC5yZXNpZGVuY2UsXG4gICAgICBjb25jZXB0OiB0aGlzLmlucHV0LmNvbmNlcHQsXG4gICAgICBvY2N1cGllZDogZmFsc2UsXG4gICAgICBmbG9vckxldmVsOiA1LFxuICAgICAgaGFzRWxldjogdHJ1ZSxcbiAgICAgIGFyZWFTcW06IHRvdGFsQXJlYVNxbVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3VsdC5vaykge1xuICAgICAgdGhpcy5lc3RpbWF0ZSA9IHJlc3VsdC5wYXlsb2FkO1xuICAgICAgdGhpcy5fZW1pdCgnRVNUSU1BVEVfQ0FMQ1VMQVRFRCcsIHRoaXMuZXN0aW1hdGUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5lc3RpbWF0ZTtcbiAgfVxuXG4gIGdvQmFjaygpIHtcbiAgICBpZiAodGhpcy5sb2NrZWRHYXRlcy5sZW5ndGggPT09IDApIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdcdUIzQ0NcdUM1NDRcdUFDMDggXHVCMkU4XHVBQ0M0IFx1QzVDNlx1Qzc0QycgfTtcbiAgICBjb25zdCBsYXN0ID0gdGhpcy5sb2NrZWRHYXRlcy5wb3AoKTtcbiAgICB0aGlzLmN1cnJlbnRTdGFnZSA9IGxhc3Q7XG4gICAgdGhpcy5fZW1pdCgnR0FURV9VTkxPQ0tFRCcsIHsgZ2F0ZTogbGFzdCwgYXV0b21hdGlvbjogdGhpcy5nZXRBdXRvbWF0aW9uKCkgfSk7XG4gICAgcmV0dXJuIHsgb2s6IHRydWUsIGdhdGU6IGxhc3QgfTtcbiAgfVxuXG4gIHJlc2V0KCkge1xuICAgIHRoaXMuaW5wdXQgPSB7IHJlc2lkZW5jZTogbnVsbCwgcHllb25nOiBudWxsLCBjb25jZXB0OiBudWxsLCBzZWN0aW9uczogW10sIHNwYWNlczogW10sIG1hdGVyaWFsczogW10gfTtcbiAgICB0aGlzLmxvY2tlZEdhdGVzID0gW107XG4gICAgdGhpcy5jdXJyZW50U3RhZ2UgPSAnRzEnO1xuICAgIHRoaXMuZXN0aW1hdGUgPSBudWxsO1xuICAgIHRoaXMucmVnaXN0cnkgPSBuZXcgR2F0ZVJlZ2lzdHJ5KCk7XG4gICAgdGhpcy5nMSA9IG5ldyBHMVR5cGUoKTtcbiAgICB0aGlzLmcyID0gbmV3IEcyQ29uY2VwdCgpO1xuICAgIHRoaXMuZzMgPSBuZXcgRzNTZWN0aW9uKCk7XG4gICAgdGhpcy5nNCA9IG5ldyBHNENBRCgpO1xuICAgIHRoaXMuZzUgPSBuZXcgRzVNYXRlcmlhbCgpO1xuICAgIHRoaXMucmVnaXN0cnkucmVnaXN0ZXIodGhpcy5nMSk7XG4gICAgdGhpcy5yZWdpc3RyeS5yZWdpc3Rlcih0aGlzLmcyKTtcbiAgICB0aGlzLnJlZ2lzdHJ5LnJlZ2lzdGVyKHRoaXMuZzMpO1xuICAgIHRoaXMucmVnaXN0cnkucmVnaXN0ZXIodGhpcy5nNCk7XG4gICAgdGhpcy5yZWdpc3RyeS5yZWdpc3Rlcih0aGlzLmc1KTtcbiAgICB0aGlzLl9lbWl0KCdSRVNFVCcsIG51bGwpO1xuICB9XG5cbiAgZ2V0U3RhdGUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlucHV0OiB7IC4uLnRoaXMuaW5wdXQgfSxcbiAgICAgIGxvY2tlZEdhdGVzOiBbLi4udGhpcy5sb2NrZWRHYXRlc10sXG4gICAgICBjdXJyZW50U3RhZ2U6IHRoaXMuY3VycmVudFN0YWdlLFxuICAgICAgYXV0b21hdGlvbjogdGhpcy5nZXRBdXRvbWF0aW9uKCksXG4gICAgICBlc3RpbWF0ZTogdGhpcy5lc3RpbWF0ZVxuICAgIH07XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IFdpemFyZENvbnRyb2xsZXI6IFdpemFyZENvbnRyb2xsZXIsIFNUQUdFUzogU1RBR0VTIH07XG4iLCAiLy8gRUNPUkVBTiBCT0MgdjYuMCBcdTIwMTQgV2l6YXJkIFByb2dyZXNzIEJhclxuLy8gNVx1QjJFOCBcdUFDOENcdUM3NzRcdUQyQjggXHVDOUM0XHVENTg5ICsgXHVDNzkwXHVCM0Q5XHVENjU0XHVDNzI4IFx1QzJEQ1x1QUMwMVx1RDY1NFxuXG5jbGFzcyBQcm9ncmVzc0JhciB7XG4gIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsID0gb3B0cy5jb250YWluZXJFbDtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBvcHRzLmNvbnRyb2xsZXI7XG5cbiAgICB0aGlzLnVuc3Vic2NyaWJlID0gdGhpcy5jb250cm9sbGVyLnN1YnNjcmliZSgoZXZ0KSA9PiB7XG4gICAgICBpZiAoZXZ0ID09PSAnR0FURV9MT0NLRUQnIHx8IGV2dCA9PT0gJ0dBVEVfVU5MT0NLRUQnIHx8IGV2dCA9PT0gJ1JFU0VUJykge1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICBjb25zdCBzdGF0ZSA9IHRoaXMuY29udHJvbGxlci5nZXRTdGF0ZSgpO1xuICAgIGNvbnN0IHN0YWdlcyA9IFsnRzEnLCAnRzInLCAnRzMnLCAnRzQnLCAnRzUnXTtcbiAgICBjb25zdCBzdGFnZU5hbWVzID0geyBHMTogJ1x1QzcyMFx1RDYxNScsIEcyOiAnXHVDRUU4XHVDMTQ5JywgRzM6ICdcdUMxMzlcdUMxNTgnLCBHNDogJ0NBRCcsIEc1OiAnXHVDNzkwXHVDN0FDJyB9O1xuXG4gICAgdGhpcy5jb250YWluZXJFbC5pbm5lckhUTUwgPSBgXG4gICAgICA8ZGl2IGNsYXNzPVwid2l6YXJkLXByb2dyZXNzXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzcy1zdGFnZXNcIj5cbiAgICAgICAgICAke3N0YWdlcy5tYXAoc3RhZ2UgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXNMb2NrZWQgPSBzdGF0ZS5sb2NrZWRHYXRlcy5pbmNsdWRlcyhzdGFnZSk7XG4gICAgICAgICAgICBjb25zdCBpc0N1cnJlbnQgPSBzdGF0ZS5jdXJyZW50U3RhZ2UgPT09IHN0YWdlO1xuICAgICAgICAgICAgY29uc3QgY2xzID0gaXNMb2NrZWQgPyAnbG9ja2VkJyA6IChpc0N1cnJlbnQgPyAnY3VycmVudCcgOiAncGVuZGluZycpO1xuICAgICAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN0YWdlICR7Y2xzfVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGFnZS1jaXJjbGVcIj5cbiAgICAgICAgICAgICAgICAgICR7aXNMb2NrZWQgPyAnXHUyNzEzJyA6IHN0YWdlWzFdfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGFnZS1sYWJlbFwiPiR7c3RhZ2VOYW1lc1tzdGFnZV19PC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICB9KS5qb2luKCcnKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJhdXRvbWF0aW9uLW1ldGVyXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cIm1ldGVyLWxhYmVsXCI+XG4gICAgICAgICAgICA8c3Bhbj5cdUM3OTBcdUIzRDlcdUQ2NTQ8L3NwYW4+XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cIm1ldGVyLXZhbHVlXCI+JHtzdGF0ZS5hdXRvbWF0aW9ufSU8L3NwYW4+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cIm1ldGVyLXRyYWNrXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWV0ZXItZmlsbFwiIHN0eWxlPVwid2lkdGg6ICR7c3RhdGUuYXV0b21hdGlvbn0lXCI+PC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgaWYgKHRoaXMudW5zdWJzY3JpYmUpIHRoaXMudW5zdWJzY3JpYmUoKTtcbiAgICB0aGlzLmNvbnRhaW5lckVsLmlubmVySFRNTCA9ICcnO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBQcm9ncmVzc0JhcjogUHJvZ3Jlc3NCYXIgfTtcbiIsICIvLyBHMTogXHVDNzIwXHVENjE1IChcdUM4RkNcdUFDNzAgNiArIFx1RDNDOVx1RDYxNSA1KVxuY29uc3QgeyBSRVNJREVOQ0VfVFlQRVMsIFBZRU9OR19MRVZFTFMgfSA9IHJlcXVpcmUoJ0BnYXRlcy9HMV9UeXBlLmNqcycpO1xuXG5jb25zdCBSRVNJREVOQ0VfSU5GTyA9IHtcbiAgQVBBUlRNRU5UOiAgICB7IG5hbWU6ICdcdUM1NDRcdUQzMENcdUQyQjgnLCAgICAgIGljb246ICdcdUQ4M0NcdURGRTInIH0sXG4gIFZJTExBOiAgICAgICAgeyBuYW1lOiAnXHVCRTRDXHVCNzdDJywgICAgICAgIGljb246ICdcdUQ4M0NcdURGRDhcdUZFMEYnIH0sXG4gIERFVEFDSEVEXzFGOiAgeyBuYW1lOiAnXHVCMkU4XHVCM0M1XHVDOEZDXHVEMEREJywgICAgaWNvbjogJ1x1RDgzQ1x1REZFMCcsIG1ldGE6ICdcdUIyRThcdUNFMzUnIH0sXG4gIERFVEFDSEVEXzJGOiAgeyBuYW1lOiAnXHVCMkU4XHVCM0M1XHVDOEZDXHVEMEREJywgICAgaWNvbjogJ1x1RDgzQ1x1REZFMScsIG1ldGE6ICdcdUJDRjVcdUNFMzUnIH0sXG4gIFBFTlRIT1VTRTogICAgeyBuYW1lOiAnXHVEMzlDXHVEMkI4XHVENTU4XHVDNkIwXHVDMkE0JywgIGljb246ICdcdUQ4M0NcdURGMDYnIH0sXG4gIENPTU1FUkNJQUw6ICAgeyBuYW1lOiAnXHVDMEMxXHVBQzAwL1x1QzYyNFx1RDUzQ1x1QzJBNCcsIGljb246ICdcdUQ4M0NcdURGRUMnIH1cbn07XG5cbmNsYXNzIEcxUGFnZSB7XG4gIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsID0gb3B0cy5jb250YWluZXJFbDtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBvcHRzLmNvbnRyb2xsZXI7XG4gICAgdGhpcy5zZWxlY3RlZCA9IHsgcmVzaWRlbmNlOiBudWxsLCBweWVvbmc6IG51bGwgfTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgcmVuZGVyKCkge1xuICAgIHRoaXMuY29udGFpbmVyRWwuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cImdhdGUtcGFnZVwiPlxuICAgICAgICA8aDI+U1RFUCAxIFx1MjAxNCBcdUM3MjBcdUQ2MTU8L2gyPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZ2F0ZS1zdWJ0aXRsZVwiPlx1QzhGQ1x1QUM3MCBcdUQ2MTVcdUQwREMgKyBcdUQzQzlcdUQ2MTUgXHVDMTIwXHVEMEREIC8gXHVDNzkwXHVCM0Q5XHVENjU0IDAlIFx1MjE5MiAzMCU8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzPVwic2VjdGlvbi1ncm91cC1sYWJlbFwiPlx1QzhGQ1x1QUM3MCBcdUQ2MTVcdUQwREM8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNhcmQtZ3JpZFwiIGlkPVwicmVzaWRlbmNlLWdyaWRcIj5cbiAgICAgICAgICAke1JFU0lERU5DRV9UWVBFUy5tYXAociA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0gUkVTSURFTkNFX0lORk9bcl07XG4gICAgICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwib3B0aW9uLWNhcmRcIiBkYXRhLXJlc2lkZW5jZT1cIiR7cn1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaWNvblwiPiR7aW5mby5pY29ufTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJuYW1lXCI+JHtpbmZvLm5hbWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1ldGFcIj4ke2luZm8ubWV0YSB8fCAnJ308L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgIH0pLmpvaW4oJycpfVxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzPVwic2VjdGlvbi1ncm91cC1sYWJlbFwiPlx1RDNDOVx1RDYxNTwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY2FyZC1ncmlkXCIgaWQ9XCJweWVvbmctZ3JpZFwiPlxuICAgICAgICAgICR7UFlFT05HX0xFVkVMUy5tYXAocCA9PiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwib3B0aW9uLWNhcmRcIiBkYXRhLXB5ZW9uZz1cIiR7cH1cIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm5hbWVcIj4ke3B9XHVEM0M5PC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZXRhXCI+fiR7TWF0aC5yb3VuZChwICogMy4zMDU4KX1cdTMzQTE8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIGApLmpvaW4oJycpfVxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzPVwiZ2F0ZS1hY3Rpb25zXCI+XG4gICAgICAgICAgPGRpdj48L2Rpdj5cbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwicHJpbWFyeVwiIGlkPVwiZzEtbmV4dFwiIGRpc2FibGVkPlx1QjJFNFx1Qzc0QyBcdTIxOTIgRzIgXHVDRUU4XHVDMTQ5PC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcblxuICAgIHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtcmVzaWRlbmNlXScpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLl9zZWxlY3RSZXNpZGVuY2UoZWwuZGF0YXNldC5yZXNpZGVuY2UpKTtcbiAgICB9KTtcbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLXB5ZW9uZ10nKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5fc2VsZWN0UHllb25nKHBhcnNlSW50KGVsLmRhdGFzZXQucHllb25nKSkpO1xuICAgIH0pO1xuICAgIHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcignI2cxLW5leHQnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuX3N1Ym1pdCgpKTtcbiAgfVxuXG4gIF9zZWxlY3RSZXNpZGVuY2Uocikge1xuICAgIHRoaXMuc2VsZWN0ZWQucmVzaWRlbmNlID0gcjtcbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLXJlc2lkZW5jZV0nKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgIGVsLmNsYXNzTGlzdC50b2dnbGUoJ3NlbGVjdGVkJywgZWwuZGF0YXNldC5yZXNpZGVuY2UgPT09IHIpO1xuICAgIH0pO1xuICAgIHRoaXMuX3VwZGF0ZU5leHRCdG4oKTtcbiAgfVxuXG4gIF9zZWxlY3RQeWVvbmcocCkge1xuICAgIHRoaXMuc2VsZWN0ZWQucHllb25nID0gcDtcbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLXB5ZW9uZ10nKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgIGVsLmNsYXNzTGlzdC50b2dnbGUoJ3NlbGVjdGVkJywgcGFyc2VJbnQoZWwuZGF0YXNldC5weWVvbmcpID09PSBwKTtcbiAgICB9KTtcbiAgICB0aGlzLl91cGRhdGVOZXh0QnRuKCk7XG4gIH1cblxuICBfdXBkYXRlTmV4dEJ0bigpIHtcbiAgICBjb25zdCBidG4gPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNnMS1uZXh0Jyk7XG4gICAgYnRuLmRpc2FibGVkID0gISh0aGlzLnNlbGVjdGVkLnJlc2lkZW5jZSAmJiB0aGlzLnNlbGVjdGVkLnB5ZW9uZyk7XG4gIH1cblxuICBfc3VibWl0KCkge1xuICAgIGNvbnN0IHIgPSB0aGlzLmNvbnRyb2xsZXIubG9ja0cxKHRoaXMuc2VsZWN0ZWQpO1xuICAgIGlmICghci5vaykgYWxlcnQoJ0cxIFx1QzdBMFx1QUUwOCBcdUMyRTRcdUQzMjg6ICcgKyByLmVycm9yKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgRzFQYWdlOiBHMVBhZ2UgfTtcbiIsICIvLyBHMjogXHVDRUU4XHVDMTQ5ICgxMiBcdUNFRThcdUMxNDkpXG5jb25zdCB7IENPTkNFUFRTIH0gPSByZXF1aXJlKCdAZ2F0ZXMvRzJfQ29uY2VwdC5janMnKTtcbmNvbnN0IHsgQ09OQ0VQVF9NQVRFUklBTF9NQVAgfSA9IHJlcXVpcmUoJ0Blc3RpbWF0ZS12Ni9tYXRyaWNlcy9Db25jZXB0TWF0ZXJpYWxNYXRyaXguY2pzJyk7XG5cbmNsYXNzIEcyUGFnZSB7XG4gIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsID0gb3B0cy5jb250YWluZXJFbDtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBvcHRzLmNvbnRyb2xsZXI7XG4gICAgdGhpcy5zZWxlY3RlZCA9IG51bGw7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJnYXRlLXBhZ2VcIj5cbiAgICAgICAgPGgyPlNURVAgMiBcdTIwMTQgXHVDRUU4XHVDMTQ5PC9oMj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImdhdGUtc3VidGl0bGVcIj5cdUI1MTRcdUM3OTBcdUM3NzggXHVDRUU4XHVDMTQ5IDFcdUFDMUMgXHVDMTIwXHVEMEREIC8gXHVDNzkwXHVCM0Q5XHVENjU0IDMwJSBcdTIxOTIgNzAlPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNhcmQtZ3JpZFwiIGlkPVwiY29uY2VwdC1ncmlkXCI+XG4gICAgICAgICAgJHtDT05DRVBUUy5tYXAoYyA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0gQ09OQ0VQVF9NQVRFUklBTF9NQVBbY107XG4gICAgICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwib3B0aW9uLWNhcmRcIiBkYXRhLWNvbmNlcHQ9XCIke2N9XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm5hbWVcIj4ke2luZm8gPyBpbmZvLm5hbWUgOiBjfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZXRhXCI+JHtpbmZvID8gJ1x1MDBENycgKyBpbmZvLm11bCArICcgKCcgKyBpbmZvLmdyYWRlICsgJyknIDogJyd9PC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICB9KS5qb2luKCcnKX1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzcz1cImdhdGUtYWN0aW9uc1wiPlxuICAgICAgICAgIDxidXR0b24gaWQ9XCJnMi1iYWNrXCI+XHUyMTkwIFx1Qzc3NFx1QzgwNDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJwcmltYXJ5XCIgaWQ9XCJnMi1uZXh0XCIgZGlzYWJsZWQ+XHVCMkU0XHVDNzRDIFx1MjE5MiBHMyBcdUMxMzlcdUMxNTg8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuXG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1jb25jZXB0XScpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLl9zZWxlY3QoZWwuZGF0YXNldC5jb25jZXB0KSk7XG4gICAgfSk7XG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjZzItYmFjaycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5jb250cm9sbGVyLmdvQmFjaygpKTtcbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNnMi1uZXh0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLl9zdWJtaXQoKSk7XG4gIH1cblxuICBfc2VsZWN0KGMpIHtcbiAgICB0aGlzLnNlbGVjdGVkID0gYztcbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLWNvbmNlcHRdJykuZm9yRWFjaChlbCA9PiB7XG4gICAgICBlbC5jbGFzc0xpc3QudG9nZ2xlKCdzZWxlY3RlZCcsIGVsLmRhdGFzZXQuY29uY2VwdCA9PT0gYyk7XG4gICAgfSk7XG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjZzItbmV4dCcpLmRpc2FibGVkID0gZmFsc2U7XG4gIH1cblxuICBfc3VibWl0KCkge1xuICAgIGNvbnN0IHIgPSB0aGlzLmNvbnRyb2xsZXIubG9ja0cyKHsgY29uY2VwdDogdGhpcy5zZWxlY3RlZCB9KTtcbiAgICBpZiAoIXIub2spIGFsZXJ0KCdHMiBcdUM3QTBcdUFFMDggXHVDMkU0XHVEMzI4OiAnICsgci5lcnJvcik7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IEcyUGFnZTogRzJQYWdlIH07XG4iLCAiLy8gRzM6IFx1QzEzOVx1QzE1OCAoMjIgXHVDMTM5XHVDMTU4LCA0IFx1QURGOFx1QjhGOSlcbmNvbnN0IHsgU0VDVElPTlMsIGdldEF2YWlsYWJsZVNlY3Rpb25zIH0gPSByZXF1aXJlKCdAZXN0aW1hdGUtdjYvbWF0cmljZXMvU2VjdGlvbnMuY2pzJyk7XG5cbmNvbnN0IEdST1VQX05BTUVTID0ge1xuICBSRVNJREVOVElBTDogJ1x1QzhGQ1x1QUM3MCBcdUFDRjVcdUFDMDQnLFxuICBBVVhJTElBUlk6ICAgJ1x1QkQ4MFx1QUMwMCBcdUFDRjVcdUFDMDQnLFxuICBTUEVDSUFMOiAgICAgJ1x1RDJCOVx1QzIxOCBcdUFDRjVcdUFDMDQnLFxuICBQUk9DRVNTOiAgICAgJ1x1QUNGNVx1QzgxNSdcbn07XG5cbmNsYXNzIEczUGFnZSB7XG4gIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsID0gb3B0cy5jb250YWluZXJFbDtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBvcHRzLmNvbnRyb2xsZXI7XG4gICAgdGhpcy5zZWxlY3RlZCA9IG5ldyBTZXQoKTtcbiAgICB0aGlzLnJlc2lkZW5jZSA9IHRoaXMuY29udHJvbGxlci5nZXRTdGF0ZSgpLmlucHV0LnJlc2lkZW5jZTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgcmVuZGVyKCkge1xuICAgIGNvbnN0IGF2YWlsYWJsZSA9IGdldEF2YWlsYWJsZVNlY3Rpb25zKHRoaXMucmVzaWRlbmNlKTtcblxuICAgIHRoaXMuY29udGFpbmVyRWwuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cImdhdGUtcGFnZVwiPlxuICAgICAgICA8aDI+U1RFUCAzIFx1MjAxNCBcdUMyRENcdUFDRjUgXHVDMTM5XHVDMTU4PC9oMj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImdhdGUtc3VidGl0bGVcIj5cdUMyRENcdUFDRjVcdUQ1NjAgXHVDMTM5XHVDMTU4IFx1QjJFNFx1QzkxMSBcdUMxMjBcdUQwREQgKFx1Q0Q1Q1x1QzE4QyAxXHVBQzFDKSAvIFx1Qzc5MFx1QjNEOVx1RDY1NCA3MCUgXHUyMTkyIDg1JTwvZGl2PlxuXG4gICAgICAgICR7WydSRVNJREVOVElBTCcsICdBVVhJTElBUlknLCAnU1BFQ0lBTCcsICdQUk9DRVNTJ10ubWFwKGdyb3VwID0+IHtcbiAgICAgICAgICBjb25zdCBzZWN0aW9ucyA9IFNFQ1RJT05TW2dyb3VwXTtcbiAgICAgICAgICBpZiAoIXNlY3Rpb25zKSByZXR1cm4gJyc7XG4gICAgICAgICAgY29uc3Qgc2VjdGlvbklkcyA9IE9iamVjdC5rZXlzKHNlY3Rpb25zKS5maWx0ZXIoaWQgPT4gYXZhaWxhYmxlLmluY2x1ZGVzKGlkKSk7XG4gICAgICAgICAgaWYgKHNlY3Rpb25JZHMubGVuZ3RoID09PSAwKSByZXR1cm4gJyc7XG4gICAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzZWN0aW9uLWdyb3VwLWxhYmVsXCI+JHtHUk9VUF9OQU1FU1tncm91cF19PC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY2FyZC1ncmlkXCI+XG4gICAgICAgICAgICAgICR7c2VjdGlvbklkcy5tYXAoaWQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlYyA9IHNlY3Rpb25zW2lkXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm9wdGlvbi1jYXJkXCIgZGF0YS1zZWN0aW9uPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm5hbWVcIj4ke3NlYy5uYW1lfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWV0YVwiPiR7c2VjLnJlcXVpcmVkID8gJ1x1RDU0NFx1QzIxOCcgOiAnXHVDMTIwXHVEMEREJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgIH0pLmpvaW4oJycpfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgYDtcbiAgICAgICAgfSkuam9pbignJyl9XG5cbiAgICAgICAgPGRpdiBjbGFzcz1cImdhdGUtYWN0aW9uc1wiPlxuICAgICAgICAgIDxidXR0b24gaWQ9XCJnMy1iYWNrXCI+XHUyMTkwIFx1Qzc3NFx1QzgwNDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJwcmltYXJ5XCIgaWQ9XCJnMy1uZXh0XCIgZGlzYWJsZWQ+XHVCMkU0XHVDNzRDIFx1MjE5MiBHNCBDQUQ8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuXG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1zZWN0aW9uXScpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLl90b2dnbGUoZWwuZGF0YXNldC5zZWN0aW9uKSk7XG4gICAgfSk7XG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjZzMtYmFjaycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5jb250cm9sbGVyLmdvQmFjaygpKTtcbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNnMy1uZXh0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLl9zdWJtaXQoKSk7XG4gIH1cblxuICBfdG9nZ2xlKGlkKSB7XG4gICAgaWYgKHRoaXMuc2VsZWN0ZWQuaGFzKGlkKSkgdGhpcy5zZWxlY3RlZC5kZWxldGUoaWQpO1xuICAgIGVsc2UgdGhpcy5zZWxlY3RlZC5hZGQoaWQpO1xuXG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1zZWN0aW9uXScpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuY2xhc3NMaXN0LnRvZ2dsZSgnc2VsZWN0ZWQnLCB0aGlzLnNlbGVjdGVkLmhhcyhlbC5kYXRhc2V0LnNlY3Rpb24pKTtcbiAgICB9KTtcbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNnMy1uZXh0JykuZGlzYWJsZWQgPSB0aGlzLnNlbGVjdGVkLnNpemUgPT09IDA7XG4gIH1cblxuICBfc3VibWl0KCkge1xuICAgIGNvbnN0IHIgPSB0aGlzLmNvbnRyb2xsZXIubG9ja0czKHsgc2VjdGlvbnM6IEFycmF5LmZyb20odGhpcy5zZWxlY3RlZCkgfSk7XG4gICAgaWYgKCFyLm9rKSBhbGVydCgnRzMgXHVDN0EwXHVBRTA4IFx1QzJFNFx1RDMyODogJyArIHIuZXJyb3IpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBHM1BhZ2U6IEczUGFnZSB9O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY1LjYgXHUyMDE0IFx1QUNGNVx1QUMwNCBcdUM3MjBcdUQ2MTUgMjNcdUFDMUMgXHVCQ0Y4IFx1QjlFNFx1RDJCOFx1QjlBRFx1QzJBNFxuLy8gU29UOiBkb2NzL01BU1RFUl9QTEFOLm1kIFx1MDBBNzkxICsgXHVCRDgwXHVCODVEIEpcblxuY29uc3QgU1BBQ0VTID0ge1xuICAvLyBcdUFDNzBcdUM4RkMgKDUpXG4gIExJVklORzogICAgICAgICAgIHsgbmFtZTogJ1x1QUM3MFx1QzJFNCcsICAgICBncm91cDogJ1x1QUM3MFx1QzhGQycsIHdldDogZmFsc2UsIHBsdW1iaW5nOiBmYWxzZSwgdmVudDogJ25hdHVyYWwnIH0sXG4gIE1BU1RFUl9CRURST09NOiAgIHsgbmFtZTogJ1x1QzU0OFx1QkMyOScsICAgICBncm91cDogJ1x1QUM3MFx1QzhGQycsIHdldDogZmFsc2UsIHBsdW1iaW5nOiBmYWxzZSwgdmVudDogJ25hdHVyYWwnIH0sXG4gIEJFRFJPT006ICAgICAgICAgIHsgbmFtZTogJ1x1Q0U2OFx1QzJFNCcsICAgICBncm91cDogJ1x1QUM3MFx1QzhGQycsIHdldDogZmFsc2UsIHBsdW1iaW5nOiBmYWxzZSwgdmVudDogJ25hdHVyYWwnIH0sXG4gIFNNQUxMX0JFRFJPT006ICAgIHsgbmFtZTogJ1x1Qzc5MVx1Qzc0MFx1QkMyOScsICAgZ3JvdXA6ICdcdUFDNzBcdUM4RkMnLCB3ZXQ6IGZhbHNlLCBwbHVtYmluZzogZmFsc2UsIHZlbnQ6ICduYXR1cmFsJyB9LFxuICBTVFVEWTogICAgICAgICAgICB7IG5hbWU6ICdcdUMxMUNcdUM3QUMnLCAgICAgZ3JvdXA6ICdcdUFDNzBcdUM4RkMnLCB3ZXQ6IGZhbHNlLCBwbHVtYmluZzogZmFsc2UsIHZlbnQ6ICduYXR1cmFsJyB9LFxuXG4gIC8vIFx1QzIxOFx1QjNDNCAoNClcbiAgS0lUQ0hFTjogICAgICAgICAgeyBuYW1lOiAnXHVDOEZDXHVCQzI5JywgICAgIGdyb3VwOiAnXHVDMjE4XHVCM0M0Jywgd2V0OiB0cnVlLCAgcGx1bWJpbmc6IHRydWUsICB2ZW50OiAnbWVjaGFuaWNhbCcsIGdhczogdHJ1ZSB9LFxuICBESU5JTkc6ICAgICAgICAgICB7IG5hbWU6ICdcdUMyRERcdUIyRjknLCAgICAgZ3JvdXA6ICdcdUMyMThcdUIzQzQnLCB3ZXQ6IGZhbHNlLCBwbHVtYmluZzogZmFsc2UsIHZlbnQ6ICduYXR1cmFsJyB9LFxuICBCQVRIUk9PTTogICAgICAgICB7IG5hbWU6ICdcdUM2OTVcdUMyRTQnLCAgICAgZ3JvdXA6ICdcdUMyMThcdUIzQzQnLCB3ZXQ6IHRydWUsICBwbHVtYmluZzogdHJ1ZSwgIHZlbnQ6ICdtZWNoYW5pY2FsJywgd2F0ZXJwcm9vZjogdHJ1ZSB9LFxuICBQT1dERVJfUk9PTTogICAgICB7IG5hbWU6ICdcdUQzMENcdUM2QjBcdUIzNTRcdUI4RjgnLCAgZ3JvdXA6ICdcdUMyMThcdUIzQzQnLCB3ZXQ6IHRydWUsICBwbHVtYmluZzogdHJ1ZSwgIHZlbnQ6ICdtZWNoYW5pY2FsJywgd2F0ZXJwcm9vZjogdHJ1ZSB9LFxuXG4gIC8vIFx1QkNGNFx1Qzg3MCAoOClcbiAgQkFMQ09OWTogICAgICAgICAgeyBuYW1lOiAnXHVCQzFDXHVDRjU0XHVCMkM4JywgICBncm91cDogJ1x1QkNGNFx1Qzg3MCcsIHdldDogdHJ1ZSwgIHBsdW1iaW5nOiBmYWxzZSwgdmVudDogJ25hdHVyYWwnLCB3YXRlcnByb29mOiB0cnVlIH0sXG4gIFRFUlJBQ0U6ICAgICAgICAgIHsgbmFtZTogJ1x1RDE0Q1x1Qjc3Q1x1QzJBNCcsICAgZ3JvdXA6ICdcdUJDRjRcdUM4NzAnLCB3ZXQ6IHRydWUsICBwbHVtYmluZzogZmFsc2UsIHZlbnQ6ICduYXR1cmFsJywgd2F0ZXJwcm9vZjogdHJ1ZSB9LFxuICBST09GVE9QOiAgICAgICAgICB7IG5hbWU6ICdcdUM2MjVcdUMwQzEnLCAgICAgZ3JvdXA6ICdcdUJDRjRcdUM4NzAnLCB3ZXQ6IHRydWUsICBwbHVtYmluZzogZmFsc2UsIHZlbnQ6ICduYXR1cmFsJywgd2F0ZXJwcm9vZjogdHJ1ZSB9LFxuICBFTlRSQU5DRTogICAgICAgICB7IG5hbWU6ICdcdUQ2MDRcdUFEMDAnLCAgICAgZ3JvdXA6ICdcdUJDRjRcdUM4NzAnLCB3ZXQ6IGZhbHNlLCBwbHVtYmluZzogZmFsc2UsIHZlbnQ6ICduYXR1cmFsJyB9LFxuICBEUkVTU0lORzogICAgICAgICB7IG5hbWU6ICdcdUI0RENcdUI4MDhcdUMyQTRcdUI4RjgnLCAgZ3JvdXA6ICdcdUJDRjRcdUM4NzAnLCB3ZXQ6IGZhbHNlLCBwbHVtYmluZzogZmFsc2UsIHZlbnQ6ICduYXR1cmFsJyB9LFxuICBQQU5UUlk6ICAgICAgICAgICB7IG5hbWU6ICdcdUQzMkNcdUQyQjhcdUI5QUMnLCAgIGdyb3VwOiAnXHVCQ0Y0XHVDODcwJywgd2V0OiBmYWxzZSwgcGx1bWJpbmc6IGZhbHNlLCB2ZW50OiAnbmF0dXJhbCcgfSxcbiAgVVRJTElUWTogICAgICAgICAgeyBuYW1lOiAnXHVCMkU0XHVDNkE5XHVCM0M0XHVDMkU0JywgIGdyb3VwOiAnXHVCQ0Y0XHVDODcwJywgd2V0OiB0cnVlLCAgcGx1bWJpbmc6IHRydWUsICB2ZW50OiAnbWVjaGFuaWNhbCcgfSxcbiAgQk9JTEVSOiAgICAgICAgICAgeyBuYW1lOiAnXHVCQ0Y0XHVDNzdDXHVCN0VDXHVDMkU0JywgIGdyb3VwOiAnXHVCQ0Y0XHVDODcwJywgd2V0OiBmYWxzZSwgcGx1bWJpbmc6IHRydWUsICB2ZW50OiAnbWVjaGFuaWNhbCcsIGdhczogdHJ1ZSB9LFxuXG4gIC8vIFx1QzVGMFx1QUNCMCAoMilcbiAgSEFMTFdBWTogICAgICAgICAgeyBuYW1lOiAnXHVCQ0Y1XHVCM0M0JywgICAgIGdyb3VwOiAnXHVDNUYwXHVBQ0IwJywgd2V0OiBmYWxzZSwgcGx1bWJpbmc6IGZhbHNlLCB2ZW50OiAnbmF0dXJhbCcgfSxcbiAgU1RBSVJTOiAgICAgICAgICAgeyBuYW1lOiAnXHVBQ0M0XHVCMkU4JywgICAgIGdyb3VwOiAnXHVDNUYwXHVBQ0IwJywgd2V0OiBmYWxzZSwgcGx1bWJpbmc6IGZhbHNlLCB2ZW50OiAnbmF0dXJhbCcgfSxcblxuICAvLyBcdUIyRThcdUIzQzVcdUM4RkNcdUQwREQgXHVDRDk0XHVBQzAwICg0KVxuICBBVFRJQzogICAgICAgICAgICB7IG5hbWU6ICdcdUIyRTRcdUI3N0QnLCAgICAgZ3JvdXA6ICdcdUIyRThcdUIzQzUnLCB3ZXQ6IGZhbHNlLCBwbHVtYmluZzogZmFsc2UsIHZlbnQ6ICduYXR1cmFsJyB9LFxuICBCQVNFTUVOVDogICAgICAgICB7IG5hbWU6ICdcdUM5QzBcdUQ1NThcdUMyRTQnLCAgIGdyb3VwOiAnXHVCMkU4XHVCM0M1Jywgd2V0OiB0cnVlLCAgcGx1bWJpbmc6IGZhbHNlLCB2ZW50OiAnbWVjaGFuaWNhbCcsIHdhdGVycHJvb2Y6IHRydWUgfSxcbiAgR0FSQUdFOiAgICAgICAgICAgeyBuYW1lOiAnXHVDQzI4XHVBQ0UwJywgICAgIGdyb3VwOiAnXHVCMkU4XHVCM0M1Jywgd2V0OiBmYWxzZSwgcGx1bWJpbmc6IGZhbHNlLCB2ZW50OiAnbWVjaGFuaWNhbCcgfSxcbiAgWUFSRDogICAgICAgICAgICAgeyBuYW1lOiAnXHVCOUM4XHVCMkY5JywgICAgIGdyb3VwOiAnXHVCMkU4XHVCM0M1Jywgd2V0OiBmYWxzZSwgcGx1bWJpbmc6IGZhbHNlLCB2ZW50OiAnbmF0dXJhbCcgfVxufTtcblxuZnVuY3Rpb24gZ2V0QWxsU3BhY2VLZXlzKCkge1xuICByZXR1cm4gT2JqZWN0LmtleXMoU1BBQ0VTKTtcbn1cblxuZnVuY3Rpb24gZ2V0U3BhY2Uoa2V5KSB7XG4gIHJldHVybiBTUEFDRVNba2V5XSB8fCBudWxsO1xufVxuXG5mdW5jdGlvbiBnZXRTcGFjZXNCeUdyb3VwKGdyb3VwKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhTUEFDRVMpLmZpbHRlcihmdW5jdGlvbihrKSB7XG4gICAgcmV0dXJuIFNQQUNFU1trXS5ncm91cCA9PT0gZ3JvdXA7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBpc1dldChrZXkpIHsgcmV0dXJuIFNQQUNFU1trZXldICYmIFNQQUNFU1trZXldLndldCA9PT0gdHJ1ZTsgfVxuZnVuY3Rpb24gaGFzUGx1bWJpbmcoa2V5KSB7IHJldHVybiBTUEFDRVNba2V5XSAmJiBTUEFDRVNba2V5XS5wbHVtYmluZyA9PT0gdHJ1ZTsgfVxuZnVuY3Rpb24gbmVlZHNXYXRlcnByb29mKGtleSkgeyByZXR1cm4gU1BBQ0VTW2tleV0gJiYgU1BBQ0VTW2tleV0ud2F0ZXJwcm9vZiA9PT0gdHJ1ZTsgfVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgU1BBQ0VTOiBTUEFDRVMsXG4gIGdldEFsbFNwYWNlS2V5czogZ2V0QWxsU3BhY2VLZXlzLFxuICBnZXRTcGFjZTogZ2V0U3BhY2UsXG4gIGdldFNwYWNlc0J5R3JvdXA6IGdldFNwYWNlc0J5R3JvdXAsXG4gIGlzV2V0OiBpc1dldCxcbiAgaGFzUGx1bWJpbmc6IGhhc1BsdW1iaW5nLFxuICBuZWVkc1dhdGVycHJvb2Y6IG5lZWRzV2F0ZXJwcm9vZlxufTtcbiIsICIvLyBHNDogQ0FEIFx1QkE3NFx1QzgwMSBcdUM3ODVcdUI4MjUgKEczXHVDNUQwXHVDMTFDIFx1Qzc5MFx1QjNEOSBcdUNEOTRcdUNEOUNcdUI0MUMgXHVBQ0Y1XHVBQzA0KVxuY29uc3QgeyBnZXRTcGFjZXNGb3JTZWN0aW9ucyB9ID0gcmVxdWlyZSgnQGVzdGltYXRlLXY2L21hdHJpY2VzL1NlY3Rpb25zLmNqcycpO1xuY29uc3QgeyBnZXRTcGFjZSB9ID0gcmVxdWlyZSgnQGVzdGltYXRlLXY2L21hdHJpY2VzL1NwYWNlcy5janMnKTtcblxuY2xhc3MgRzRQYWdlIHtcbiAgY29uc3RydWN0b3Iob3B0cykge1xuICAgIHRoaXMuY29udGFpbmVyRWwgPSBvcHRzLmNvbnRhaW5lckVsO1xuICAgIHRoaXMuY29udHJvbGxlciA9IG9wdHMuY29udHJvbGxlcjtcblxuICAgIGNvbnN0IHN0YXRlID0gdGhpcy5jb250cm9sbGVyLmdldFN0YXRlKCk7XG4gICAgdGhpcy5hdXRvU3BhY2VzID0gZ2V0U3BhY2VzRm9yU2VjdGlvbnMoc3RhdGUuaW5wdXQuc2VjdGlvbnMpO1xuICAgIHRoaXMuc3BhY2VJbnB1dHMgPSB0aGlzLmF1dG9TcGFjZXMubWFwKChzcGFjZUtleSwgaWR4KSA9PiAoe1xuICAgICAgaWQ6ICdzcF8nICsgaWR4LFxuICAgICAgdHlwZUtleTogc3BhY2VLZXksXG4gICAgICBhcmVhX3NxbTogMFxuICAgIH0pKTtcblxuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgdGhpcy5jb250YWluZXJFbC5pbm5lckhUTUwgPSBgXG4gICAgICA8ZGl2IGNsYXNzPVwiZ2F0ZS1wYWdlXCI+XG4gICAgICAgIDxoMj5TVEVQIDQgXHUyMDE0IFx1QUNGNVx1QUMwNCBcdUJBNzRcdUM4MDEgXHVDNzg1XHVCODI1PC9oMj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImdhdGUtc3VidGl0bGVcIj5HMyBcdUMxMzlcdUMxNThcdUM1RDBcdUMxMUMgXHVDNzkwXHVCM0Q5IFx1Q0Q5NFx1Q0Q5Q1x1QjQxQyBcdUFDRjVcdUFDMDQgLyBcdUM3OTBcdUIzRDlcdUQ2NTQgODUlIFx1MjE5MiA5NSUgKDFcdUIyRThcdUFDQzQgXHVBQ0FDXHVDODAxIFx1QzY0NFx1QzEzMSk8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzPVwiY2FyZFwiPlxuICAgICAgICAgICR7dGhpcy5zcGFjZUlucHV0cy5tYXAoKGlucHV0LCBpZHgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG1ldGEgPSBnZXRTcGFjZShpbnB1dC50eXBlS2V5KTtcbiAgICAgICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzcGFjZS1yb3dcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3BhY2UtbmFtZVwiIHN0eWxlPVwiZm9udC1mYW1pbHk6IHZhcigtLWZvbnQtZGlzcGxheSk7IGNvbG9yOiB2YXIoLS1nb2xkKTtcIj4ke2lucHV0LnR5cGVLZXl9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInNwYWNlLW5hbWVcIj4ke21ldGEgPyBtZXRhLm5hbWUgOiBpbnB1dC50eXBlS2V5fTwvZGl2PlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbWluPVwiMFwiIHN0ZXA9XCIwLjVcIiBwbGFjZWhvbGRlcj1cIlx1QkE3NFx1QzgwMShcdTMzQTEpXCIgZGF0YS1pZHg9XCIke2lkeH1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjogcmlnaHQ7IGNvbG9yOiB2YXIoLS10ZXh0LWRpbSk7IGZvbnQtc2l6ZTogMTFweDtcIj5cdTMzQTE8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgIH0pLmpvaW4oJycpfVxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzPVwiZ2F0ZS1hY3Rpb25zXCI+XG4gICAgICAgICAgPGJ1dHRvbiBpZD1cImc0LWJhY2tcIj5cdTIxOTAgXHVDNzc0XHVDODA0PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInByaW1hcnlcIiBpZD1cImc0LW5leHRcIiBkaXNhYmxlZD5cdUFDQUNcdUM4MDEgXHVBQ0M0XHVDMEIwIFx1MjE5MjwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGlkPVwiZXN0aW1hdGUtcHJldmlldy1jb250YWluZXJcIj48L2Rpdj5cbiAgICBgO1xuXG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dFtkYXRhLWlkeF0nKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKCkgPT4gdGhpcy5fb25JbnB1dChlbCkpO1xuICAgIH0pO1xuICAgIHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcignI2c0LWJhY2snKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuY29udHJvbGxlci5nb0JhY2soKSk7XG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjZzQtbmV4dCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5fc3VibWl0KCkpO1xuICB9XG5cbiAgX29uSW5wdXQoZWwpIHtcbiAgICBjb25zdCBpZHggPSBwYXJzZUludChlbC5kYXRhc2V0LmlkeCk7XG4gICAgY29uc3QgdmFsID0gcGFyc2VGbG9hdChlbC52YWx1ZSkgfHwgMDtcbiAgICB0aGlzLnNwYWNlSW5wdXRzW2lkeF0uYXJlYV9zcW0gPSB2YWw7XG4gICAgY29uc3QgYWxsRmlsbGVkID0gdGhpcy5zcGFjZUlucHV0cy5ldmVyeShzID0+IHMuYXJlYV9zcW0gPiAwKTtcbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNnNC1uZXh0JykuZGlzYWJsZWQgPSAhYWxsRmlsbGVkO1xuICB9XG5cbiAgX3N1Ym1pdCgpIHtcbiAgICBjb25zdCByID0gdGhpcy5jb250cm9sbGVyLmxvY2tHNCh7IHNwYWNlczogdGhpcy5zcGFjZUlucHV0cyB9KTtcbiAgICBpZiAoIXIub2spIHtcbiAgICAgIGFsZXJ0KCdHNCBcdUM3QTBcdUFFMDggXHVDMkU0XHVEMzI4OiAnICsgci5lcnJvcik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX3JlbmRlckVzdGltYXRlKCk7XG4gIH1cblxuICBfcmVuZGVyRXN0aW1hdGUoKSB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLmNvbnRyb2xsZXIuZ2V0U3RhdGUoKTtcbiAgICBjb25zdCBlID0gc3RhdGUuZXN0aW1hdGU7XG4gICAgaWYgKCFlKSByZXR1cm47XG5cbiAgICBjb25zdCBwcmV2aWV3RWwgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNlc3RpbWF0ZS1wcmV2aWV3LWNvbnRhaW5lcicpO1xuICAgIGlmICghcHJldmlld0VsKSByZXR1cm47XG5cbiAgICBwcmV2aWV3RWwuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cImVzdGltYXRlLXByZXZpZXdcIj5cbiAgICAgICAgPGgzPjFcdUIyRThcdUFDQzQgXHVBQ0FDXHVDODAxIChcdUM3OTBcdUIzRDlcdUQ2NTQgOTUlKTwvaDM+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJlc3RpbWF0ZS1yb3dcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cImxhYmVsXCI+XHVDRDFEIFx1QkE3NFx1QzgwMTwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cInZhbHVlXCI+JHtlLmFyZWFTcW0udG9GaXhlZCgxKX1cdTMzQTE8L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZXN0aW1hdGUtcm93XCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbFwiPlx1QUNGNVx1QUUwOVx1QUMwMDwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cInZhbHVlXCI+JHtlLnN1cHBseS50b0xvY2FsZVN0cmluZygpfVx1QzZEMDwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJlc3RpbWF0ZS1yb3dcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cImxhYmVsXCI+XHVCM0M0XHVBRTA5XHVENTY5XHVBQ0M0PC9zcGFuPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwidmFsdWVcIj4ke2UuY29udHJhY3QudG9Mb2NhbGVTdHJpbmcoKX1cdUM2RDA8L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZXN0aW1hdGUtcm93XCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbFwiPlZBVCAxMCU8L3NwYW4+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJ2YWx1ZVwiPiR7KGUuZmluYWwgLSBlLmNvbnRyYWN0KS50b0xvY2FsZVN0cmluZygpfVx1QzZEMDwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJlc3RpbWF0ZS1yb3cgaGlnaGxpZ2h0XCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbFwiPlx1Q0Q1Q1x1Qzg4NSBcdUFFMDhcdUM1NjE8L3NwYW4+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJ2YWx1ZVwiPiR7ZS5maW5hbC50b0xvY2FsZVN0cmluZygpfVx1QzZEMDwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJlc3RpbWF0ZS1yb3dcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cImxhYmVsXCI+XHUzM0ExXHVCMkY5IFx1QjJFOFx1QUMwMDwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cInZhbHVlXCI+JHtlLnNxbVByaWNlLnRvTG9jYWxlU3RyaW5nKCl9XHVDNkQwL1x1MzNBMTwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJlc3RpbWF0ZS1yb3dcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cImxhYmVsXCI+XHVEM0M5XHVCMkY5IFx1QjJFOFx1QUMwMDwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cInZhbHVlXCI+JHtlLnB5UHJpY2UudG9Mb2NhbGVTdHJpbmcoKX1cdUM2RDAvXHVEM0M5PC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImVzdGltYXRlLXJvd1wiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwibGFiZWxcIj5cdUI5QzhcdUM5QzRcdUM3Mjg8L3NwYW4+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJ2YWx1ZVwiPiR7ZS5tYXJnaW59JTwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBHNFBhZ2U6IEc0UGFnZSB9O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY2LjAgXHUyMDE0IFdpemFyZCBQYWdlICg1XHVCMkU4IFx1RDFCNVx1RDU2OSlcblxuY29uc3QgeyBXaXphcmRDb250cm9sbGVyIH0gPSByZXF1aXJlKCcuL1dpemFyZENvbnRyb2xsZXIuanMnKTtcbmNvbnN0IHsgUHJvZ3Jlc3NCYXIgfSA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9Qcm9ncmVzc0Jhci5qcycpO1xuY29uc3QgeyBHMVBhZ2UgfSA9IHJlcXVpcmUoJy4vZ2F0ZXMvRzFQYWdlLmpzJyk7XG5jb25zdCB7IEcyUGFnZSB9ID0gcmVxdWlyZSgnLi9nYXRlcy9HMlBhZ2UuanMnKTtcbmNvbnN0IHsgRzNQYWdlIH0gPSByZXF1aXJlKCcuL2dhdGVzL0czUGFnZS5qcycpO1xuY29uc3QgeyBHNFBhZ2UgfSA9IHJlcXVpcmUoJy4vZ2F0ZXMvRzRQYWdlLmpzJyk7XG5cbmNsYXNzIFdpemFyZFBhZ2Uge1xuICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgdGhpcy5jb250YWluZXJFbCA9IG9wdHMuY29udGFpbmVyRWw7XG4gICAgdGhpcy5jb250cm9sbGVyID0gbmV3IFdpemFyZENvbnRyb2xsZXIoKTtcbiAgICB0aGlzLmN1cnJlbnRQYWdlID0gbnVsbDtcblxuICAgIHRoaXMucmVuZGVyKCk7XG5cbiAgICB0aGlzLmNvbnRyb2xsZXIuc3Vic2NyaWJlKChldnQpID0+IHtcbiAgICAgIGlmIChldnQgPT09ICdHQVRFX0xPQ0tFRCcgfHwgZXZ0ID09PSAnR0FURV9VTkxPQ0tFRCcgfHwgZXZ0ID09PSAnUkVTRVQnKSB7XG4gICAgICAgIHRoaXMuX3JlbmRlckN1cnJlbnRTdGFnZSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcmVuZGVyKCkge1xuICAgIHRoaXMuY29udGFpbmVyRWwuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cIndpemFyZC1wYWdlXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJwYWdlLWhlYWRlclwiPlxuICAgICAgICAgIDxoMj5cdUFDQUNcdUM4MDEgXHVCOUM4XHVCQzk1XHVDNzkwPC9oMj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwic3VidGl0bGVcIj41XHVCMkU4IFx1QUM4Q1x1Qzc3NFx1RDJCOCBcdUM3OTBcdUIzRDlcdUQ2NTQgKEcxIFx1MjE5MiBHMiBcdTIxOTIgRzMgXHUyMTkyIEc0IFx1MjE5MiBHNSBcdUM2MzVcdUMxNTgpPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgaWQ9XCJwcm9ncmVzcy1jb250YWluZXJcIj48L2Rpdj5cbiAgICAgICAgPGRpdiBpZD1cInN0YWdlLWNvbnRhaW5lclwiPjwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcblxuICAgIG5ldyBQcm9ncmVzc0Jhcih7XG4gICAgICBjb250YWluZXJFbDogdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjcHJvZ3Jlc3MtY29udGFpbmVyJyksXG4gICAgICBjb250cm9sbGVyOiB0aGlzLmNvbnRyb2xsZXJcbiAgICB9KTtcblxuICAgIHRoaXMuX3JlbmRlckN1cnJlbnRTdGFnZSgpO1xuICB9XG5cbiAgX3JlbmRlckN1cnJlbnRTdGFnZSgpIHtcbiAgICBjb25zdCBzdGFnZSA9IHRoaXMuY29udHJvbGxlci5nZXRTdGF0ZSgpLmN1cnJlbnRTdGFnZTtcbiAgICBjb25zdCBzdGFnZUVsID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjc3RhZ2UtY29udGFpbmVyJyk7XG5cbiAgICBpZiAodGhpcy5jdXJyZW50UGFnZSAmJiB0aGlzLmN1cnJlbnRQYWdlLmRlc3Ryb3kpIHRoaXMuY3VycmVudFBhZ2UuZGVzdHJveSgpO1xuICAgIHN0YWdlRWwuaW5uZXJIVE1MID0gJyc7XG5cbiAgICBzd2l0Y2ggKHN0YWdlKSB7XG4gICAgICBjYXNlICdHMSc6IHRoaXMuY3VycmVudFBhZ2UgPSBuZXcgRzFQYWdlKHsgY29udGFpbmVyRWw6IHN0YWdlRWwsIGNvbnRyb2xsZXI6IHRoaXMuY29udHJvbGxlciB9KTsgYnJlYWs7XG4gICAgICBjYXNlICdHMic6IHRoaXMuY3VycmVudFBhZ2UgPSBuZXcgRzJQYWdlKHsgY29udGFpbmVyRWw6IHN0YWdlRWwsIGNvbnRyb2xsZXI6IHRoaXMuY29udHJvbGxlciB9KTsgYnJlYWs7XG4gICAgICBjYXNlICdHMyc6IHRoaXMuY3VycmVudFBhZ2UgPSBuZXcgRzNQYWdlKHsgY29udGFpbmVyRWw6IHN0YWdlRWwsIGNvbnRyb2xsZXI6IHRoaXMuY29udHJvbGxlciB9KTsgYnJlYWs7XG4gICAgICBjYXNlICdHNCc6IHRoaXMuY3VycmVudFBhZ2UgPSBuZXcgRzRQYWdlKHsgY29udGFpbmVyRWw6IHN0YWdlRWwsIGNvbnRyb2xsZXI6IHRoaXMuY29udHJvbGxlciB9KTsgYnJlYWs7XG4gICAgICBjYXNlICdHNSc6XG4gICAgICBjYXNlICdDT01QTEVURSc6XG4gICAgICAgIHN0YWdlRWwuaW5uZXJIVE1MID0gYFxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJnYXRlLXBhZ2VcIj5cbiAgICAgICAgICAgIDxoMj5cdUFDQUNcdUM4MDEgXHVDNjQ0XHVDMTMxIChcdUM3OTBcdUIzRDlcdUQ2NTQgOTUlKTwvaDI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZ2F0ZS1zdWJ0aXRsZVwiPkc1IFx1Qzc5MFx1QzdBQyBcdUMxMjBcdUQwRERcdUM3NDAgXHVDNjM1XHVDMTU4IC8gUGhhc2UgNCBXZWVrIDRcdUM1RDBcdUMxMUMgXHVENjVDXHVDMTMxXHVENjU0IFx1QzYwOFx1QzgxNTwvZGl2PlxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInByaW1hcnlcIiBvbmNsaWNrPVwibG9jYXRpb24ucmVsb2FkKClcIj5cdUMwQzggXHVBQ0FDXHVDODAxIFx1QjlDQ1x1QjRFNFx1QUUzMDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IFdpemFyZFBhZ2U6IFdpemFyZFBhZ2UgfTtcbiIsICIvLyBFQ09SRUFOIEJPQyB2Ni4wIFx1MjAxNCBBcHAgXHVCQTU0XHVDNzc4IFx1Q0VFOFx1RDE0Q1x1Qzc3NFx1QjEwOFxuY29uc3QgeyBSb3V0ZXIgfSA9IHJlcXVpcmUoJy4uL3JvdXRlci9Sb3V0ZXIuanMnKTtcblxuY2xhc3MgQXBwIHtcbiAgY29uc3RydWN0b3Iob3B0cykge1xuICAgIHRoaXMucm9vdEVsID0gb3B0cy5yb290RWwgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FwcCcpO1xuICAgIHRoaXMucm91dGVyID0gbmV3IFJvdXRlcigpO1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSBudWxsO1xuXG4gICAgdGhpcy5fc2V0dXBSb3V0ZXMoKTtcbiAgICB0aGlzLl9yZW5kZXIoKTtcbiAgfVxuXG4gIF9zZXR1cFJvdXRlcygpIHtcbiAgICB0aGlzLnJvdXRlci5yZWdpc3RlcignLycsIHRoaXMuX3JlbmRlckhvbWUuYmluZCh0aGlzKSwgeyBtZXRhOiB7IHRpdGxlOiAnXHVCMzAwXHVDMkRDXHVCQ0Y0XHVCNERDJyB9IH0pO1xuICAgIHRoaXMucm91dGVyLnJlZ2lzdGVyKCcvd2l6YXJkJywgdGhpcy5fcmVuZGVyV2l6YXJkLmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ1x1QUNBQ1x1QzgwMSBcdUI5QzhcdUJDOTVcdUM3OTAnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy9jYWQnLCB0aGlzLl9yZW5kZXJDQUQuYmluZCh0aGlzKSwgeyBtZXRhOiB7IHRpdGxlOiAnQ0FEIFx1RDNDOVx1QkE3NFx1QjNDNCcgfSB9KTtcbiAgICB0aGlzLnJvdXRlci5yZWdpc3RlcignL2twaScsIHRoaXMuX3JlbmRlcktQSS5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdLUEkgXHVCMzAwXHVDMkRDXHVCQ0Y0XHVCNERDJyB9IH0pO1xuICAgIHRoaXMucm91dGVyLnJlZ2lzdGVyKCcvY29udHJhY3RzJywgdGhpcy5fcmVuZGVyQ29udHJhY3RzLmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ1x1QUNDNFx1QzU3RCcgfSB9KTtcbiAgICB0aGlzLnJvdXRlci5yZWdpc3RlcignL29yZGVycycsIHRoaXMuX3JlbmRlck9yZGVycy5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdcdUJDMUNcdUM4RkMnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy9zY2hlZHVsZXMnLCB0aGlzLl9yZW5kZXJTY2hlZHVsZXMuYmluZCh0aGlzKSwgeyBtZXRhOiB7IHRpdGxlOiAnXHVBQ0Y1XHVDODE1JyB9IH0pO1xuICAgIHRoaXMucm91dGVyLnJlZ2lzdGVyKCcvaW5zcGVjdGlvbnMnLCB0aGlzLl9yZW5kZXJJbnNwZWN0aW9ucy5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdcdUFDODBcdUMyMTgnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy90b3BvbG9neScsIHRoaXMuX3JlbmRlclRvcG9sb2d5LmJpbmQodGhpcyksIHsgbWV0YTogeyB0aXRsZTogJ1x1QzJEQ1x1QzJBNFx1RDE1QyBcdUQxQTBcdUQzRjRcdUI4NUNcdUM5QzAnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIucmVnaXN0ZXIoJy9haS1leGVjdXRpdmUnLCB0aGlzLl9yZW5kZXJBSUV4ZWN1dGl2ZS5iaW5kKHRoaXMpLCB7IG1ldGE6IHsgdGl0bGU6ICdBSSBcdUM3ODRcdUM2RDAnIH0gfSk7XG4gICAgdGhpcy5yb3V0ZXIuc2V0Tm90Rm91bmQodGhpcy5fcmVuZGVyNDA0LmJpbmQodGhpcykpO1xuICB9XG5cbiAgX3JlbmRlcigpIHtcbiAgICB0aGlzLnJvb3RFbC5pbm5lckhUTUwgPSBgXG4gICAgICA8ZGl2IGNsYXNzPVwiYXBwLXNoZWxsXCI+XG4gICAgICAgIDxoZWFkZXIgY2xhc3M9XCJhcHAtaGVhZGVyXCI+XG4gICAgICAgICAgPGgxPkVDT1JFQU4gQk9DIHY2LjA8L2gxPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJzcGFjZXJcIj48L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwic3RhdHVzXCI+XG4gICAgICAgICAgICA8c3BhbiBjbGFzcz1cImxpdmVcIj5cdTI1Q0YgTElWRTwvc3Bhbj5cbiAgICAgICAgICAgIFBoYXNlIDQgLyBXZWVrIDFcbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9oZWFkZXI+XG4gICAgICAgIDxhc2lkZSBjbGFzcz1cImFwcC1zaWRlYmFyXCI+JHt0aGlzLl9yZW5kZXJTaWRlYmFyKCl9PC9hc2lkZT5cbiAgICAgICAgPG1haW4gY2xhc3M9XCJhcHAtbWFpblwiIGlkPVwibWFpbi1jb250ZW50XCI+PC9tYWluPlxuICAgICAgPC9kaXY+XG4gICAgYDtcblxuICAgIHRoaXMucm9vdEVsLnF1ZXJ5U2VsZWN0b3JBbGwoJy5uYXYtaXRlbScpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IHBhdGggPSBlbC5kYXRhc2V0LnBhdGg7XG4gICAgICAgIHRoaXMucm91dGVyLm5hdmlnYXRlKHBhdGgpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnJvdXRlci5zdGFydCgpO1xuICB9XG5cbiAgX3JlbmRlclNpZGViYXIoKSB7XG4gICAgcmV0dXJuIGBcbiAgICAgIDxkaXYgY2xhc3M9XCJuYXYtc2VjdGlvblwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwibGFiZWxcIj5cdUJBNTRcdUM3Nzg8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCIgZGF0YS1wYXRoPVwiL1wiPlx1QjMwMFx1QzJEQ1x1QkNGNFx1QjREQzwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIiBkYXRhLXBhdGg9XCIvd2l6YXJkXCI+XHVBQ0FDXHVDODAxIFx1QjlDOFx1QkM5NVx1Qzc5MDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwibmF2LXNlY3Rpb25cIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+XHVDODFDXHVDNzkxPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi9jYWRcIj5DQUQgXHVEM0M5XHVCQTc0XHVCM0M0PC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi9rcGlcIj5LUEkgXHVBQ0M0XHVBRTMwXHVEMzEwPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJuYXYtc2VjdGlvblwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwibGFiZWxcIj5DbG9zZWQgTG9vcDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIiBkYXRhLXBhdGg9XCIvY29udHJhY3RzXCI+XHVBQ0M0XHVDNTdEPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJuYXYtaXRlbVwiIGRhdGEtcGF0aD1cIi9vcmRlcnNcIj5cdUJDMUNcdUM4RkM8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCIgZGF0YS1wYXRoPVwiL3NjaGVkdWxlc1wiPlx1QUNGNVx1QzgxNTwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIiBkYXRhLXBhdGg9XCIvaW5zcGVjdGlvbnNcIj5cdUFDODBcdUMyMTg8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cIm5hdi1zZWN0aW9uXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPlx1QzJEQ1x1QzJBNFx1RDE1QzwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwibmF2LWl0ZW1cIiBkYXRhLXBhdGg9XCIvdG9wb2xvZ3lcIj5cdUQxQTBcdUQzRjRcdUI4NUNcdUM5QzA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cIm5hdi1pdGVtXCIgZGF0YS1wYXRoPVwiL2FpLWV4ZWN1dGl2ZVwiPkFJIFx1Qzc4NFx1QzZEMDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcbiAgfVxuXG4gIF9zZXRBY3RpdmVOYXYocGF0aCkge1xuICAgIHRoaXMucm9vdEVsLnF1ZXJ5U2VsZWN0b3JBbGwoJy5uYXYtaXRlbScpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJywgZWwuZGF0YXNldC5wYXRoID09PSBwYXRoKTtcbiAgICB9KTtcbiAgfVxuXG4gIF9yZW5kZXJQYWdlSGVhZGVyKHRpdGxlLCBzdWJ0aXRsZSkge1xuICAgIHJldHVybiBgXG4gICAgICA8ZGl2IGNsYXNzPVwicGFnZS1oZWFkZXJcIj5cbiAgICAgICAgPGgyPiR7dGl0bGV9PC9oMj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInN1YnRpdGxlXCI+JHtzdWJ0aXRsZSB8fCAnJ308L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gIH1cblxuICBfcmVuZGVySG9tZShwYXRoKSB7XG4gICAgdGhpcy5fc2V0QWN0aXZlTmF2KHBhdGgpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWluLWNvbnRlbnQnKS5pbm5lckhUTUwgPSBgXG4gICAgICAke3RoaXMuX3JlbmRlclBhZ2VIZWFkZXIoJ1x1QjMwMFx1QzJEQ1x1QkNGNFx1QjREQycsICdFQ09SRUFOIEJPQyB2Ni4wIFx1MjAxNCBQaGFzZSA0IFdlZWsgMScpfVxuICAgICAgPGRpdiBjbGFzcz1cImNhcmRcIj5cbiAgICAgICAgPGgzPjlcdUM4RkMgUGhhc2UgMyBcdUM2NDRcdUM4RkMgXHUyNzA1PC9oMz5cbiAgICAgICAgPHAgc3R5bGU9XCJjb2xvcjogdmFyKC0tdGV4dC1kaW0pOyBsaW5lLWhlaWdodDogMS42O1wiPlxuICAgICAgICAgIDUyXHVBQzFDIFx1RDMwQ1x1Qzc3QyAvIDMzIFx1RDE0Q1x1QzJBNFx1RDJCOCAvIDE0NysgYXNzZXJ0aW9ucyAvIFx1RDY4Q1x1QURDMCAwXHVBQzc0PGJyLz5cbiAgICAgICAgICBcdUI5QzhcdUMyQTRcdUQxMzBcdUQ1MENcdUI3OUMgXHVDN0FDXHVDNzkxXHVDMTMxIDBcdUQ2OEMgLyBUREQgXHVBQzE1XHVDODFDIFx1Qzc5MVx1QjNEOSAzXHVENjhDPGJyLz5cbiAgICAgICAgICBcdUMyRENcdUJCQUNcdUI4MDhcdUM3NzRcdUMxNTggMVx1QUM3NCAoMzBcdUQzQzkgXHVDNTQ0XHVEMzBDXHVEMkI4ICsgXHVEMDc0XHVCNzk4XHVDMkREXHVCN0VEXHVDMTU0XHVCOUFDLCAxNiw3MzUsOTUwXHVDNkQwKVxuICAgICAgICA8L3A+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJjYXJkXCI+XG4gICAgICAgIDxoMz5QaGFzZSA0IFx1QzlDNFx1Qzc4NTwvaDM+XG4gICAgICAgIDxwIHN0eWxlPVwiY29sb3I6IHZhcigtLXRleHQtZGltKTsgbGluZS1oZWlnaHQ6IDEuNjtcIj5cbiAgICAgICAgICBXZWVrIDEgXHVDNjQ0XHVCOENDOiBib2MtdjYgXHVDMTc4ICsgXHVCNzdDXHVDNkIwXHVEMzA1ICsgXHVCMkU0XHVEMDZDIFx1RDE0Q1x1QjlDOCArIGVzYnVpbGQ8YnIvPlxuICAgICAgICAgIFdlZWsgMiBcdUM5QzRcdUM3ODU6IDVcdUIyRTggXHVBQzhDXHVDNzc0XHVEMkI4IFx1QjlDOFx1QkM5NVx1Qzc5MCBVSSAoRzF+RzUpXG4gICAgICAgIDwvcD5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gIH1cblxuICBfcmVuZGVyUGxhY2Vob2xkZXIocGF0aCwgdGl0bGUsIHdlZWtUYXJnZXQpIHtcbiAgICB0aGlzLl9zZXRBY3RpdmVOYXYocGF0aCk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21haW4tY29udGVudCcpLmlubmVySFRNTCA9IGBcbiAgICAgICR7dGhpcy5fcmVuZGVyUGFnZUhlYWRlcih0aXRsZSwgd2Vla1RhcmdldCArICcgXHVENjVDXHVDMTMxXHVENjU0IFx1QzYwOFx1QzgxNScpfVxuICAgICAgPGRpdiBjbGFzcz1cImNhcmRcIj5cbiAgICAgICAgPGgzPlx1QzkwMFx1QkU0NCBcdUM5MTE8L2gzPlxuICAgICAgICA8cCBzdHlsZT1cImNvbG9yOiB2YXIoLS10ZXh0LWRpbSk7XCI+XHVCQ0Y4IFx1RDY1NFx1QkE3NFx1Qzc0MCAke3dlZWtUYXJnZXR9XHVDNUQwXHVDMTFDIFx1RDY1Q1x1QzEzMVx1RDY1NFx1QjQyOVx1QjJDOFx1QjJFNC48L3A+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuICB9XG5cbiAgX3JlbmRlcldpemFyZChwYXRoKSB7XG4gICAgdGhpcy5fc2V0QWN0aXZlTmF2KHBhdGgpO1xuICAgIGNvbnN0IG1haW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFpbi1jb250ZW50Jyk7XG4gICAgbWFpbi5pbm5lckhUTUwgPSAnJztcbiAgICBjb25zdCB7IFdpemFyZFBhZ2UgfSA9IHJlcXVpcmUoJy4uL3dpemFyZC9XaXphcmRQYWdlLmpzJyk7XG4gICAgbmV3IFdpemFyZFBhZ2UoeyBjb250YWluZXJFbDogbWFpbiB9KTtcbiAgfVxuICBfcmVuZGVyQ0FEKHBhdGgpICAgICAgICAgeyB0aGlzLl9yZW5kZXJQbGFjZWhvbGRlcihwYXRoLCAnQ0FEIFx1RDNDOVx1QkE3NFx1QjNDNCcsICdQaGFzZSA0IFdlZWsgMycpOyB9XG4gIF9yZW5kZXJLUEkocGF0aCkgICAgICAgICB7IHRoaXMuX3JlbmRlclBsYWNlaG9sZGVyKHBhdGgsICdLUEkgXHVBQ0M0XHVBRTMwXHVEMzEwJywgJ1BoYXNlIDQgV2VlayA0Jyk7IH1cbiAgX3JlbmRlckNvbnRyYWN0cyhwYXRoKSAgIHsgdGhpcy5fcmVuZGVyUGxhY2Vob2xkZXIocGF0aCwgJ1x1QUNDNFx1QzU3RCcsICdQaGFzZSA0IFdlZWsgNScpOyB9XG4gIF9yZW5kZXJPcmRlcnMocGF0aCkgICAgICB7IHRoaXMuX3JlbmRlclBsYWNlaG9sZGVyKHBhdGgsICdcdUJDMUNcdUM4RkMnLCAnUGhhc2UgNCBXZWVrIDYnKTsgfVxuICBfcmVuZGVyU2NoZWR1bGVzKHBhdGgpICAgeyB0aGlzLl9yZW5kZXJQbGFjZWhvbGRlcihwYXRoLCAnXHVBQ0Y1XHVDODE1JywgJ1BoYXNlIDQgV2VlayA2Jyk7IH1cbiAgX3JlbmRlckluc3BlY3Rpb25zKHBhdGgpIHsgdGhpcy5fcmVuZGVyUGxhY2Vob2xkZXIocGF0aCwgJ1x1QUM4MFx1QzIxOCcsICdQaGFzZSA0IFdlZWsgNicpOyB9XG4gIF9yZW5kZXJUb3BvbG9neShwYXRoKSAgICB7IHRoaXMuX3JlbmRlclBsYWNlaG9sZGVyKHBhdGgsICdcdUMyRENcdUMyQTRcdUQxNUMgXHVEMUEwXHVEM0Y0XHVCODVDXHVDOUMwJywgJ1BoYXNlIDQgV2VlayA3Jyk7IH1cbiAgX3JlbmRlckFJRXhlY3V0aXZlKHBhdGgpIHsgdGhpcy5fcmVuZGVyUGxhY2Vob2xkZXIocGF0aCwgJ0FJIFx1Qzc4NFx1QzZEMCBcdUIzMDBcdUMyRENcdUJDRjRcdUI0REMnLCAnUGhhc2UgNCBXZWVrIDcnKTsgfVxuXG4gIF9yZW5kZXI0MDQocGF0aCkge1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYWluLWNvbnRlbnQnKS5pbm5lckhUTUwgPSBgXG4gICAgICAke3RoaXMuX3JlbmRlclBhZ2VIZWFkZXIoJzQwNCcsICdcdUFDQkRcdUI4NUMgXHVDNUM2XHVDNzRDOiAnICsgcGF0aCl9XG4gICAgICA8ZGl2IGNsYXNzPVwiY2FyZFwiPlxuICAgICAgICA8cCBzdHlsZT1cImNvbG9yOiB2YXIoLS10ZXh0LWRpbSk7XCI+XHVDNjk0XHVDQ0FEXHVENTU4XHVDMkUwIFx1QUNCRFx1Qjg1Q1x1QjI5NCBcdUM4NzRcdUM3QUNcdUQ1NThcdUM5QzAgXHVDNTRBXHVDMkI1XHVCMkM4XHVCMkU0LjwvcD5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPVwibG9jYXRpb24uaGFzaD0nIy8nXCI+XHVENjQ4XHVDNzNDXHVCODVDPC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBBcHA6IEFwcCB9O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY2LjAgXHUyMDE0IFx1QzlDNFx1Qzc4NVx1QzgxMFxuY29uc3QgeyBBcHAgfSA9IHJlcXVpcmUoJy4vQXBwLmpzJyk7XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbigpIHtcbiAgY29uc3QgYXBwID0gbmV3IEFwcCh7IHJvb3RFbDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2FwcCcpIH0pO1xuICB3aW5kb3cuQk9DID0gd2luZG93LkJPQyB8fCB7fTtcbiAgd2luZG93LkJPQy5hcHAgPSBhcHA7XG4gIGNvbnNvbGUubG9nKCclYyBFQ09SRUFOIEJPQyB2Ni4wICcsICdiYWNrZ3JvdW5kOiAjYzlhODRjOyBjb2xvcjogIzBhMGUxYTsgZm9udC13ZWlnaHQ6IGJvbGQ7IHBhZGRpbmc6IDRweCA4cHg7Jyk7XG4gIGNvbnNvbGUubG9nKCdQaGFzZSA0IFdlZWsgMSBcdTIwMTQgYm9jLXY2IFx1QzE3OCBcdUMyRENcdUM3OTEnKTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7OztBQUFBO0FBQUE7QUFFQSxVQUFNLFNBQU4sTUFBYTtBQUFBLFFBQ1gsY0FBYztBQUNaLGVBQUssU0FBUyxvQkFBSSxJQUFJO0FBQ3RCLGVBQUssa0JBQWtCO0FBQ3ZCLGVBQUssY0FBYyxDQUFDO0FBQ3BCLGVBQUssY0FBYztBQUFBLFFBQ3JCO0FBQUEsUUFFQSxTQUFTLE1BQU0sU0FBUyxNQUFNO0FBQzVCLGVBQUssT0FBTyxJQUFJLE1BQU07QUFBQSxZQUNwQjtBQUFBLFlBQ0EsTUFBTyxRQUFRLEtBQUssUUFBUyxDQUFDO0FBQUEsVUFDaEMsQ0FBQztBQUFBLFFBQ0g7QUFBQSxRQUVBLFlBQVksU0FBUztBQUNuQixlQUFLLGtCQUFrQjtBQUFBLFFBQ3pC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
