import {
  require_CADCanvas,
  require_CADSpacesList,
  require_CADToolbar,
  require_Spaces
} from "./chunk-I2C2DGLE.js";
import {
  require_CoreBus
} from "./chunk-HLNEQ7F5.js";
import {
  __commonJS
} from "./chunk-GLFX53DW.js";

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
      async lockG4(opts) {
        if (!opts.spaces || opts.spaces.length === 0) {
          return { ok: false, error: "spaces \uBA74\uC801 \uD544\uC218" };
        }
        if (!this.lockedGates.includes("G3")) return { ok: false, error: "G3 \uBA3C\uC800" };
        const r = this.g4.lock({ spaces: opts.spaces }, this.registry);
        if (r.ok) {
          this.input.spaces = opts.spaces;
          this.lockedGates.push("G4");
          this.currentStage = "G5";
          await this._calculateEstimate();
          this._emit("GATE_LOCKED", {
            gate: "G4",
            input: opts,
            estimate: this.estimate,
            automation: this.getAutomation()
          });
        }
        return r;
      }
      async lockG5(opts) {
        if (!this.lockedGates.includes("G4")) return { ok: false, error: "G4 \uBA3C\uC800" };
        const r = this.g5.lock({ materials: opts.materials || [] }, this.registry);
        if (r.ok) {
          this.input.materials = opts.materials || [];
          this.lockedGates.push("G5");
          this.currentStage = "COMPLETE";
          await this._calculateEstimate();
          this._emit("GATE_LOCKED", {
            gate: "G5",
            input: opts,
            estimate: this.estimate,
            automation: this.getAutomation()
          });
        }
        return r;
      }
      async _calculateEstimate() {
        if (!this.lockedGates.includes("G4")) return null;
        let lineItems;
        if (typeof window !== "undefined" && window.boc && window.boc.cost) {
          try {
            lineItems = await window.boc.cost.buildLineItems(
              this.input.spaces,
              this.input.concept,
              { tenantId: "HQ" }
            );
          } catch (e) {
            console.error("[WizardController] IPC \uC2E4\uD328:", e);
            lineItems = null;
          }
        }
        if (!lineItems) {
          const SIM_RATES = {
            BATHROOM: { labor: 1e5, material: 2e5 },
            KITCHEN: { labor: 8e4, material: 15e4 },
            LIVING: { labor: 6e4, material: 1e5 },
            BEDROOM: { labor: 5e4, material: 8e4 },
            DEFAULT: { labor: 7e4, material: 1e5 }
          };
          lineItems = this.input.spaces.map((space) => {
            const rate = SIM_RATES[space.typeKey] || SIM_RATES.DEFAULT;
            return {
              qty: space.area_sqm,
              wasteRate: 0.05,
              laborCost: rate.labor,
              pm: 1,
              materialCost: rate.material,
              equipment: 0,
              accessory: 0,
              difficultyAdjust: 0
            };
          });
        }
        const totalAreaSqm = this.input.spaces.reduce((sum, s) => sum + s.area_sqm, 0);
        const ctx = this.input.context || {};
        const result = calculateEstimate({
          lineItems,
          residence: this.input.residence,
          concept: this.input.concept,
          occupied: ctx.occupied === true,
          floorLevel: ctx.floorLevel || 1,
          hasElev: ctx.hasElev !== false,
          areaSqm: totalAreaSqm
        });
        if (result.ok) {
          this.estimate = result.payload;
          const unknownCount = lineItems.filter((li) => li._meta && li._meta.hasUnknown).length;
          this.estimate._unknownCount = unknownCount;
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

// shell/src/korea/RegionFactor.cjs
var require_RegionFactor = __commonJS({
  "shell/src/korea/RegionFactor.cjs"(exports, module) {
    var REGION_FACTORS = {
      SEOUL_GANGNAM: { name: "\uC11C\uC6B8 \uAC15\uB0A83\uAD6C", factor: 1.2, areas: ["\uAC15\uB0A8\uAD6C", "\uC11C\uCD08\uAD6C", "\uC1A1\uD30C\uAD6C"] },
      SEOUL_OTHER: { name: "\uC11C\uC6B8 \uAE30\uD0C0", factor: 1.1, areas: ["\uC885\uB85C\uAD6C", "\uC911\uAD6C", "\uC6A9\uC0B0\uAD6C", "\uC131\uB3D9\uAD6C", "\uAD11\uC9C4\uAD6C", "\uB3D9\uB300\uBB38\uAD6C", "\uC911\uB791\uAD6C", "\uC131\uBD81\uAD6C", "\uAC15\uBD81\uAD6C", "\uB3C4\uBD09\uAD6C", "\uB178\uC6D0\uAD6C", "\uC740\uD3C9\uAD6C", "\uC11C\uB300\uBB38\uAD6C", "\uB9C8\uD3EC\uAD6C", "\uC591\uCC9C\uAD6C", "\uAC15\uC11C\uAD6C", "\uAD6C\uB85C\uAD6C", "\uAE08\uCC9C\uAD6C", "\uC601\uB4F1\uD3EC\uAD6C", "\uB3D9\uC791\uAD6C", "\uAD00\uC545\uAD6C", "\uAC15\uB3D9\uAD6C"] },
      METRO_BUSAN: { name: "\uBD80\uC0B0", factor: 1.05, areas: ["\uBD80\uC0B0"] },
      METRO_OTHER: { name: "\uAD11\uC5ED\uC2DC", factor: 1, areas: ["\uB300\uAD6C", "\uC778\uCC9C", "\uB300\uC804", "\uAD11\uC8FC", "\uC6B8\uC0B0"] },
      PROVINCE_MAJOR: { name: "\uB3C4\uCCAD\uC18C\uC7AC\uC9C0", factor: 0.95, areas: ["\uC218\uC6D0", "\uCD98\uCC9C", "\uCCAD\uC8FC", "\uC804\uC8FC", "\uCC3D\uC6D0", "\uD3EC\uD56D"] },
      PROVINCE_OTHER: { name: "\uAE30\uD0C0 \uC9C0\uBC29", factor: 0.9, areas: [] },
      JEJU: { name: "\uC81C\uC8FC", factor: 1.15, areas: ["\uC81C\uC8FC", "\uC11C\uADC0\uD3EC"] }
    };
    function getRegionByArea(area) {
      if (!area) return null;
      const upper = area.toString();
      for (let regionId in REGION_FACTORS) {
        const region = REGION_FACTORS[regionId];
        if (region.areas.some(function(a) {
          return upper.includes(a);
        })) {
          return regionId;
        }
      }
      return "PROVINCE_OTHER";
    }
    function getRegionFactor(regionId) {
      const r = REGION_FACTORS[regionId];
      return r ? r.factor : 1;
    }
    function getRegionFactorByArea(area) {
      const regionId = getRegionByArea(area);
      return getRegionFactor(regionId);
    }
    function getAllRegions() {
      return Object.keys(REGION_FACTORS);
    }
    module.exports = {
      REGION_FACTORS,
      getRegionByArea,
      getRegionFactor,
      getRegionFactorByArea,
      getAllRegions
    };
  }
});

// modules-html/boc-v6/src/wizard/gates/G1Page.js
var require_G1Page = __commonJS({
  "modules-html/boc-v6/src/wizard/gates/G1Page.js"(exports, module) {
    var { RESIDENCE_TYPES, PYEONG_LEVELS } = require_G1_Type();
    var RESIDENCE_INFO = {
      APARTMENT: { name: "\uC544\uD30C\uD2B8", icon: "\u{1F3E2}", meta: "" },
      VILLA: { name: "\uBE4C\uB77C", icon: "\u{1F3D8}", meta: "" },
      DETACHED_1F: { name: "\uB2E8\uB3C5\uC8FC\uD0DD", icon: "\u{1F3E0}", meta: "\uB2E8\uCE35" },
      DETACHED_2F: { name: "\uB2E8\uB3C5\uC8FC\uD0DD", icon: "\u{1F3E1}", meta: "\uBCF5\uCE35" },
      PENTHOUSE: { name: "\uD39C\uD2B8\uD558\uC6B0\uC2A4", icon: "\u{1F306}", meta: "" },
      COMMERCIAL: { name: "\uC0C1\uAC00/\uC624\uD53C\uC2A4", icon: "\u{1F3EC}", meta: "" }
    };
    var G1Page = class {
      constructor(opts) {
        this.containerEl = opts.containerEl;
        this.controller = opts.controller;
        this.selected = { residence: null, pyeong: null };
        this.context = {
          occupied: false,
          floorLevel: 1,
          hasElev: true,
          address: "",
          regionId: "PROVINCE_OTHER"
        };
        this.render();
      }
      render() {
        this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 1 \u2014 \uC2DC\uACF5 \uC720\uD615 \uC815\uC758</h2>
        <div class="gate-subtitle">\uAE30\uBCF8 \uC815\uBCF4 + \uD604\uC7A5 \uC870\uAC74 / \uC790\uB3D9\uD654 0% \u2192 30%</div>

        <div class="g1-section">
          <div class="section-group-label">\uAE30\uBCF8 \uC815\uBCF4</div>

          <div class="section-sublabel">\uC8FC\uAC70 \uD615\uD0DC</div>
          <div class="card-grid compact" id="residence-grid">
            ${RESIDENCE_TYPES.map((r) => {
          const info = RESIDENCE_INFO[r] || { name: r, icon: "\u{1F3E0}", meta: "" };
          return `
                <div class="option-card compact" data-residence="${r}">
                  <div class="icon">${info.icon}</div>
                  <div class="name">${info.name}</div>
                  <div class="meta">${info.meta}</div>
                </div>
              `;
        }).join("")}
          </div>

          <div class="section-sublabel">\uD3C9\uD615</div>
          <div class="card-grid compact" id="pyeong-grid">
            ${PYEONG_LEVELS.map((p) => `
              <div class="option-card compact" data-pyeong="${p}">
                <div class="name">${p}\uD3C9</div>
                <div class="meta">~${Math.round(p * 3.3058)}\u33A1</div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="g1-section">
          <div class="section-group-label">\uD604\uC7A5 \uC870\uAC74</div>

          <div class="g1-context-grid">
            <div class="context-row">
              <label>\uAC70\uC8FC\uC911 \uC2DC\uACF5</label>
              <div class="toggle-group">
                <button class="toggle-btn active" data-ctx="occupied" data-val="false">\uC544\uB2C8\uC624</button>
                <button class="toggle-btn" data-ctx="occupied" data-val="true">\uC608 (+10%)</button>
              </div>
            </div>
            <div class="context-row">
              <label>\uCE35\uC218</label>
              <input type="number" id="ctx-floor" min="1" max="50" value="1" style="width:70px; background: var(--bg); border: 1px solid var(--gold-faint); color: var(--text); padding: 4px 8px; border-radius: 4px;">
            </div>
            <div class="context-row">
              <label>\uC5D8\uB9AC\uBCA0\uC774\uD130</label>
              <div class="toggle-group">
                <button class="toggle-btn active" data-ctx="hasElev" data-val="true">\uC788\uC74C</button>
                <button class="toggle-btn" data-ctx="hasElev" data-val="false">\uC5C6\uC74C (4\uCE35+5%)</button>
              </div>
            </div>
            <div class="context-row full-width">
              <label>\uC8FC\uC18C</label>
              <input type="text" id="ctx-address" placeholder="\uC608: \uC11C\uC6B8 \uAC15\uB0A8\uAD6C \uC5ED\uC0BC\uB3D9" maxlength="100" style="flex:1; background: var(--bg); border: 1px solid var(--gold-faint); color: var(--text); padding: 4px 8px; border-radius: 4px;">
              <div class="region-display" id="region-display">\uC9C0\uC5ED: \uC790\uB3D9 \uB9E4\uD551</div>
            </div>
          </div>
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
        this.containerEl.querySelectorAll("[data-ctx]").forEach((btn) => {
          btn.addEventListener("click", () => this._onContextToggle(btn));
        });
        this.containerEl.querySelector("#ctx-floor").addEventListener("input", (e) => {
          this.context.floorLevel = parseInt(e.target.value) || 1;
        });
        this.containerEl.querySelector("#ctx-address").addEventListener("input", (e) => {
          this.context.address = e.target.value;
          this._updateRegion();
        });
        this.containerEl.querySelector("#g1-next").addEventListener("click", () => this._submit());
      }
      _selectResidence(r) {
        this.selected.residence = r;
        this.containerEl.querySelectorAll("[data-residence]").forEach((el) => {
          el.classList.toggle("selected", el.dataset.residence === r);
        });
        this._updateNextBtn();
        setTimeout(() => {
          this.containerEl.querySelector("#pyeong-grid")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 200);
      }
      _selectPyeong(p) {
        this.selected.pyeong = p;
        this.containerEl.querySelectorAll("[data-pyeong]").forEach((el) => {
          el.classList.toggle("selected", parseInt(el.dataset.pyeong) === p);
        });
        this._updateNextBtn();
      }
      _onContextToggle(btn) {
        const ctxKey = btn.dataset.ctx;
        const val = btn.dataset.val === "true";
        this.context[ctxKey] = val;
        this.containerEl.querySelectorAll(`[data-ctx="${ctxKey}"]`).forEach((b) => {
          b.classList.toggle("active", b.dataset.val === btn.dataset.val);
        });
      }
      _updateRegion() {
        let regionId = "PROVINCE_OTHER";
        let factor = 1;
        try {
          const { getRegionByArea, getRegionFactor } = require_RegionFactor();
          regionId = getRegionByArea(this.context.address);
          factor = getRegionFactor(regionId);
        } catch (e) {
        }
        this.context.regionId = regionId;
        const REGION_NAMES = {
          SEOUL_GANGNAM: "\uAC15\uB0A83\uAD6C",
          SEOUL_OTHER: "\uC11C\uC6B8",
          METRO_BUSAN: "\uBD80\uC0B0",
          METRO_OTHER: "\uAD11\uC5ED\uC2DC",
          PROVINCE_MAJOR: "\uB3C4\uCCAD\uC18C\uC7AC\uC9C0",
          PROVINCE_OTHER: "\uC9C0\uBC29",
          JEJU: "\uC81C\uC8FC"
        };
        const factorPercent = ((factor - 1) * 100).toFixed(0);
        const sign = factor >= 1 ? "+" : "";
        const el = this.containerEl.querySelector("#region-display");
        if (el) el.textContent = `\uC9C0\uC5ED: ${REGION_NAMES[regionId] || regionId} (${sign}${factorPercent}%)`;
      }
      _updateNextBtn() {
        const btn = this.containerEl.querySelector("#g1-next");
        if (btn) btn.disabled = !(this.selected.residence && this.selected.pyeong);
      }
      _submit() {
        this.controller.input.context = this.context;
        const r = this.controller.lockG1(this.selected);
        if (r && typeof r.then === "function") {
          r.then((res) => {
            if (res && !res.ok) alert("G1 \uC7A0\uAE08 \uC2E4\uD328: " + res.error);
          });
        } else {
          if (r && !r.ok) alert("G1 \uC7A0\uAE08 \uC2E4\uD328: " + r.error);
        }
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

// modules-html/boc-v6/src/wizard/gates/G4Page.js
var require_G4Page = __commonJS({
  "modules-html/boc-v6/src/wizard/gates/G4Page.js"(exports, module) {
    var { getSpacesForSections } = require_Sections();
    var { getSpace } = require_Spaces();
    var { CADCanvas } = require_CADCanvas();
    var { CADToolbar } = require_CADToolbar();
    var { CADSpacesList } = require_CADSpacesList();
    var G4Page = class {
      constructor(opts) {
        this.containerEl = opts.containerEl;
        this.controller = opts.controller;
        const state = this.controller.getState();
        this.autoSpaces = getSpacesForSections(state.input.sections);
        this.mode = "numeric";
        this.spaceInputs = this.autoSpaces.map((spaceKey, idx) => ({
          id: "sp_" + idx,
          typeKey: spaceKey,
          area_sqm: 0
        }));
        this.cadCanvas = null;
        this.cadSpaces = [];
        this.render();
      }
      render() {
        this.containerEl.innerHTML = `
      <div class="gate-page">
        <h2>STEP 4 \u2014 \uACF5\uAC04 \uBA74\uC801 \uC785\uB825</h2>
        <div class="gate-subtitle">\uC790\uB3D9\uD654 85% \u2192 95% (1\uB2E8\uACC4 \uACAC\uC801 \uC644\uC131)</div>

        <div class="mode-toggle">
          <button data-mode="numeric" class="${this.mode === "numeric" ? "active" : ""}">\uC22B\uC790 \uC785\uB825</button>
          <button data-mode="cad" class="${this.mode === "cad" ? "active" : ""}">\u{1F4D0} \uD3C9\uBA74\uB3C4</button>
        </div>

        <div id="g4-mode-content"></div>

        <div class="gate-actions">
          <button id="g4-back">\u2190 \uC774\uC804</button>
          <button class="primary" id="g4-next" disabled>\uACAC\uC801 \uACC4\uC0B0 \u2192</button>
        </div>
      </div>

      <div id="estimate-preview-container"></div>
    `;
        this.containerEl.querySelectorAll("[data-mode]").forEach((btn) => {
          btn.addEventListener("click", () => this._switchMode(btn.dataset.mode));
        });
        this.containerEl.querySelector("#g4-back").addEventListener("click", () => this.controller.goBack());
        this.containerEl.querySelector("#g4-next").addEventListener("click", () => this._submit());
        this._renderModeContent();
      }
      _switchMode(mode) {
        this.mode = mode;
        this.containerEl.querySelectorAll("[data-mode]").forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.mode === mode);
        });
        this._renderModeContent();
      }
      _renderModeContent() {
        const contentEl = this.containerEl.querySelector("#g4-mode-content");
        if (this.cadCanvas) {
          this.cadCanvas.destroy();
          this.cadCanvas = null;
        }
        if (this.mode === "numeric") {
          this._renderNumericMode(contentEl);
        } else {
          this._renderCADMode(contentEl);
        }
      }
      _renderNumericMode(el) {
        el.innerHTML = `
      <div class="card">
        ${this.spaceInputs.map((input, idx) => {
          const meta = getSpace(input.typeKey);
          return `
            <div class="space-row">
              <div class="space-name" style="font-family: var(--font-display); color: var(--gold);">${input.typeKey}</div>
              <div class="space-name">${meta ? meta.name : input.typeKey}</div>
              <input type="number" min="0" step="0.5" placeholder="\uBA74\uC801(\u33A1)" data-idx="${idx}" value="${input.area_sqm || ""}">
              <div style="text-align: right; color: var(--text-dim); font-size: 11px;">\u33A1</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
        el.querySelectorAll("input[data-idx]").forEach((inp) => {
          inp.addEventListener("input", () => this._onNumericInput(inp));
        });
        this._updateNextBtn();
      }
      _renderCADMode(el) {
        el.innerHTML = `
      <div id="cad-toolbar-container"></div>
      <div class="cad-canvas-wrapper">
        <div id="cad-canvas-container" style="width: 100%; height: 500px;"></div>
        <div class="canvas-hint">\uC0AC\uAC01\uD615 \uB3C4\uAD6C \u2192 \uB4DC\uB798\uADF8\uD558\uC5EC \uACF5\uAC04 \uCD94\uAC00</div>
      </div>
      <div id="cad-spaces-container"></div>
    `;
        setTimeout(() => {
          const canvasContainer = document.getElementById("cad-canvas-container");
          const wrapperWidth = canvasContainer.clientWidth || 800;
          this.cadCanvas = new CADCanvas({
            containerEl: canvasContainer,
            width: wrapperWidth,
            height: 500,
            scale: 50
          });
          new CADToolbar({
            containerEl: document.getElementById("cad-toolbar-container"),
            canvas: this.cadCanvas
          });
          new CADSpacesList({
            containerEl: document.getElementById("cad-spaces-container"),
            canvas: this.cadCanvas
          });
          this.cadCanvas.onAreaChange((spaces) => {
            this.cadSpaces = spaces.filter((s) => s.typeKey !== "UNKNOWN" && s.area_sqm > 0);
            this._updateNextBtn();
          });
        }, 50);
      }
      _onNumericInput(inp) {
        const idx = parseInt(inp.dataset.idx);
        const val = parseFloat(inp.value) || 0;
        this.spaceInputs[idx].area_sqm = val;
        this._updateNextBtn();
      }
      _updateNextBtn() {
        const btn = this.containerEl.querySelector("#g4-next");
        if (!btn) return;
        if (this.mode === "numeric") {
          btn.disabled = !this.spaceInputs.every((s) => s.area_sqm > 0);
        } else {
          btn.disabled = this.cadSpaces.length === 0;
        }
      }
      _submit() {
        const spaces = this.mode === "numeric" ? this.spaceInputs : this.cadSpaces;
        const r = this.controller.lockG4({ spaces });
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
          <span class="label">\uB3C4\uAE09\uD569\uACC4 (\xD7${e.factors.gradeMul} \uCEE8\uC149 + \xD7${e.factors.baseFactor} \uC8FC\uAC70)</span>
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
          <span class="label">\u33A1\uB2F9 / \uD3C9\uB2F9</span>
          <span class="value">${e.sqmPrice.toLocaleString()} / ${e.pyPrice.toLocaleString()}\uC6D0</span>
        </div>
      </div>
    `;
      }
      destroy() {
        if (this.cadCanvas) this.cadCanvas.destroy();
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

export {
  require_WizardPage
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vc2hlbGwvc3JjL2dhdGVzL0dhdGUuY2pzIiwgIi4uLy4uLy4uLy4uL3NoZWxsL3NyYy9nYXRlcy9HMV9UeXBlLmNqcyIsICIuLi8uLi8uLi8uLi9zaGVsbC9zcmMvZ2F0ZXMvRzJfQ29uY2VwdC5janMiLCAiLi4vLi4vLi4vLi4vc2hlbGwvc3JjL2dhdGVzL0czX1NlY3Rpb24uY2pzIiwgIi4uLy4uLy4uLy4uL3NoZWxsL3NyYy9nYXRlcy9HNF9DQUQuY2pzIiwgIi4uLy4uLy4uLy4uL3NoZWxsL3NyYy9nYXRlcy9HNV9NYXRlcmlhbC5janMiLCAiLi4vLi4vLi4vZXN0aW1hdGUtdjYvc3JjL21hdHJpY2VzL1Jlc2lkZW5jZU1hdHJpeC5janMiLCAiLi4vLi4vLi4vZXN0aW1hdGUtdjYvc3JjL21hdHJpY2VzL0NvbmNlcHRNYXRlcmlhbE1hdHJpeC5janMiLCAiLi4vLi4vLi4vZXN0aW1hdGUtdjYvc3JjL2NhbGMvQ2FsY0VuZ2luZVY1Ni5janMiLCAiLi4vLi4vLi4vZXN0aW1hdGUtdjYvc3JjL21hdHJpY2VzL1NlY3Rpb25zLmNqcyIsICIuLi8uLi9zcmMvd2l6YXJkL1dpemFyZENvbnRyb2xsZXIuanMiLCAiLi4vLi4vc3JjL3dpemFyZC9jb21wb25lbnRzL1Byb2dyZXNzQmFyLmpzIiwgIi4uLy4uLy4uLy4uL3NoZWxsL3NyYy9rb3JlYS9SZWdpb25GYWN0b3IuY2pzIiwgIi4uLy4uL3NyYy93aXphcmQvZ2F0ZXMvRzFQYWdlLmpzIiwgIi4uLy4uL3NyYy93aXphcmQvZ2F0ZXMvRzJQYWdlLmpzIiwgIi4uLy4uL3NyYy93aXphcmQvZ2F0ZXMvRzNQYWdlLmpzIiwgIi4uLy4uL3NyYy93aXphcmQvZ2F0ZXMvRzRQYWdlLmpzIiwgIi4uLy4uL3NyYy93aXphcmQvV2l6YXJkUGFnZS5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLy8gRUNPUkVBTiBCT0MgdjUuNiBcdTIwMTQgR2F0ZSBcdUNEOTRcdUMwQzEgXHVEMDc0XHVCNzk4XHVDMkE0XG4vLyA1XHVCMkU4IFx1Qzc5MFx1QjNEOVx1RDY1NCBcdUFDOENcdUM3NzRcdUQyQjggKENhc2NhZGUgQXV0b21hdGlvbilcdUM3NTggXHVCRDgwXHVCQUE4XG4vLyBTb1Q6IGRvY3MvTUFTVEVSX1BMQU4ubWQgXHUwMEE3MTA5LjRcbi8vXG4vLyBcdUM4MDhcdUIzMDAgXHVBRERDXHVDRTU5OlxuLy8gICAtIHZhbGlkYXRlKCkgXHVEMUI1XHVBQ0ZDIFx1RDZDNFx1QjlDQyBsb2NrKCkgXHVBQzAwXHVCMkE1XG4vLyAgIC0gbG9jaygpIFx1QzJEQyBcdUIyRTRcdUM3NEMgXHVBQzhDXHVDNzc0XHVEMkI4IFx1RDY1Q1x1QzEzMVx1RDY1NCBcdUM3NzRcdUJDQTRcdUQyQjggXHVCQzFDXHVENTg5XG4vLyAgIC0gXHVDOUMxXHVDODA0IFx1QUM4Q1x1Qzc3NFx1RDJCOCBsb2NrIFx1QzU0OCBcdUI0MTBcdUM3M0NcdUJBNzQgXHVCMkU0XHVDNzRDIFx1QUM4Q1x1Qzc3NFx1RDJCOCBcdUM5QzRcdUM3ODUgXHVDQzI4XHVCMkU4XG5cbmNvbnN0IHsgY29yZUJ1cyB9ID0gcmVxdWlyZSgnLi4vY29yZS1idXMvQ29yZUJ1cy5janMnKTtcblxuY2xhc3MgR2F0ZSB7XG4gIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICB0aGlzLmlkID0gb3B0cy5pZDtcbiAgICB0aGlzLnVyaSA9IG9wdHMudXJpO1xuICAgIHRoaXMuZXZlbnRPbkxvY2sgPSBvcHRzLmV2ZW50T25Mb2NrO1xuICAgIHRoaXMuZGVwZW5kc09uID0gb3B0cy5kZXBlbmRzT24gfHwgbnVsbDtcbiAgICB0aGlzLmxvY2tlZCA9IGZhbHNlO1xuICAgIHRoaXMubG9ja2VkUGF5bG9hZCA9IG51bGw7XG4gICAgdGhpcy5sb2NrZWRBdCA9IG51bGw7XG4gIH1cblxuICB2YWxpZGF0ZShpbnB1dCkge1xuICAgIHRocm93IG5ldyBFcnJvcih0aGlzLmlkICsgJy52YWxpZGF0ZSgpIFx1QkJGOFx1QUQ2Q1x1RDYwNCcpO1xuICB9XG5cbiAgcHJvY2VzcyhpbnB1dCkge1xuICAgIHRocm93IG5ldyBFcnJvcih0aGlzLmlkICsgJy5wcm9jZXNzKCkgXHVCQkY4XHVBRDZDXHVENjA0Jyk7XG4gIH1cblxuICBsb2NrKGlucHV0LCBnYXRlUmVnaXN0cnkpIHtcbiAgICBpZiAodGhpcy5kZXBlbmRzT24gJiYgZ2F0ZVJlZ2lzdHJ5KSB7XG4gICAgICBjb25zdCBwcmV2ID0gZ2F0ZVJlZ2lzdHJ5LmdldCh0aGlzLmRlcGVuZHNPbik7XG4gICAgICBpZiAoIXByZXYgfHwgIXByZXYubG9ja2VkKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgb2s6IGZhbHNlLFxuICAgICAgICAgIGVycm9yczogW3RoaXMuaWQgKyAnOiBcdUM5QzFcdUM4MDQgXHVBQzhDXHVDNzc0XHVEMkI4KCcgKyB0aGlzLmRlcGVuZHNPbiArICcpIFx1QkJGOFx1QzdBMFx1QUUwOCddXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdmFsaWRhdGlvbiA9IHRoaXMudmFsaWRhdGUoaW5wdXQpO1xuICAgIGlmICh2YWxpZGF0aW9uLmVycm9ycyAmJiB2YWxpZGF0aW9uLmVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4geyBvazogZmFsc2UsIGVycm9yczogdmFsaWRhdGlvbi5lcnJvcnMgfTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLnByb2Nlc3MoaW5wdXQpO1xuICAgIGlmICghcmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0O1xuXG4gICAgdGhpcy5sb2NrZWQgPSB0cnVlO1xuICAgIHRoaXMubG9ja2VkUGF5bG9hZCA9IHJlc3VsdC5wYXlsb2FkO1xuICAgIHRoaXMubG9ja2VkQXQgPSBEYXRlLm5vdygpO1xuXG4gICAgY29yZUJ1cy5lbWl0KHRoaXMuZXZlbnRPbkxvY2ssIHJlc3VsdC5wYXlsb2FkLCB7XG4gICAgICBnYXRlSWQ6IHRoaXMuaWQsXG4gICAgICB1cmk6IHRoaXMudXJpLFxuICAgICAgbG9ja2VkQXQ6IHRoaXMubG9ja2VkQXRcbiAgICB9KTtcblxuICAgIHJldHVybiB7IG9rOiB0cnVlLCBwYXlsb2FkOiByZXN1bHQucGF5bG9hZCB9O1xuICB9XG5cbiAgdW5sb2NrKCkge1xuICAgIHRoaXMubG9ja2VkID0gZmFsc2U7XG4gICAgdGhpcy5sb2NrZWRQYXlsb2FkID0gbnVsbDtcbiAgICB0aGlzLmxvY2tlZEF0ID0gbnVsbDtcbiAgfVxuXG4gIHN0YXR1cygpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICBsb2NrZWQ6IHRoaXMubG9ja2VkLFxuICAgICAgbG9ja2VkQXQ6IHRoaXMubG9ja2VkQXQsXG4gICAgICBkZXBlbmRzT246IHRoaXMuZGVwZW5kc09uXG4gICAgfTtcbiAgfVxufVxuXG5jbGFzcyBHYXRlUmVnaXN0cnkge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmdhdGVzID0gbmV3IE1hcCgpO1xuICB9XG5cbiAgcmVnaXN0ZXIoZ2F0ZSkgeyB0aGlzLmdhdGVzLnNldChnYXRlLmlkLCBnYXRlKTsgfVxuICBnZXQoaWQpICAgICAgICB7IHJldHVybiB0aGlzLmdhdGVzLmdldChpZCk7IH1cbiAgZ2V0QWxsKCkgICAgICAgeyByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmdhdGVzLnZhbHVlcygpKTsgfVxuICB1bmxvY2tBbGwoKSAgICB7IHRoaXMuZ2F0ZXMuZm9yRWFjaChmdW5jdGlvbihnKSB7IGcudW5sb2NrKCk7IH0pOyB9XG4gIGdldExvY2tlZCgpICAgIHsgcmV0dXJuIHRoaXMuZ2V0QWxsKCkuZmlsdGVyKGZ1bmN0aW9uKGcpIHsgcmV0dXJuIGcubG9ja2VkOyB9KTsgfVxuXG4gIGdldE5leHRBY3RpdmF0YWJsZSgpIHtcbiAgICBjb25zdCBsb2NrZWRJZHMgPSBuZXcgU2V0KHRoaXMuZ2V0TG9ja2VkKCkubWFwKGZ1bmN0aW9uKGcpIHsgcmV0dXJuIGcuaWQ7IH0pKTtcbiAgICByZXR1cm4gdGhpcy5nZXRBbGwoKS5maW5kKGZ1bmN0aW9uKGcpIHtcbiAgICAgIGlmIChnLmxvY2tlZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKCFnLmRlcGVuZHNPbikgcmV0dXJuIHRydWU7XG4gICAgICByZXR1cm4gbG9ja2VkSWRzLmhhcyhnLmRlcGVuZHNPbik7XG4gICAgfSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IEdhdGUsIEdhdGVSZWdpc3RyeSB9O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY1LjYgXHUyMDE0IEcxIFx1QzcyMFx1RDYxNSBcdUFDOENcdUM3NzRcdUQyQjhcbi8vIFx1Qzc4NVx1QjgyNTogXHVDOEZDXHVBQzcwXHVENjE1XHVEMERDKDYpICsgXHVEM0M5XHVENjE1KDUpICAvICBcdUM3OTBcdUIzRDlcdUQ2NTRcdUM3Mjg6IDAlIFx1MjE5MiAzMCVcblxuY29uc3QgeyBHYXRlIH0gPSByZXF1aXJlKCcuL0dhdGUuY2pzJyk7XG5cbmNvbnN0IFJFU0lERU5DRV9UWVBFUyA9IFtcbiAgJ0FQQVJUTUVOVCcsICdWSUxMQScsICdERVRBQ0hFRF8xRicsICdERVRBQ0hFRF8yRicsICdQRU5USE9VU0UnLCAnQ09NTUVSQ0lBTCdcbl07XG5cbmNvbnN0IFBZRU9OR19MRVZFTFMgPSBbMjQsIDMwLCAzNCwgNDAsIDUwXTtcblxuY2xhc3MgRzFUeXBlIGV4dGVuZHMgR2F0ZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKHtcbiAgICAgIGlkOiAnZzFfdHlwZScsXG4gICAgICB1cmk6ICd1cm46ZWNvcmVhbjp1bml2ZXJzZToxOm5vZGU6ZzFfdHlwZScsXG4gICAgICBldmVudE9uTG9jazogJ0dBVEUxX0xPQ0tFRCcsXG4gICAgICBkZXBlbmRzT246IG51bGxcbiAgICB9KTtcbiAgfVxuXG4gIHZhbGlkYXRlKGlucHV0KSB7XG4gICAgY29uc3QgZXJyb3JzID0gW107XG4gICAgaWYgKCFpbnB1dCkgeyByZXR1cm4geyBlcnJvcnM6IFsnaW5wdXQgXHVCMjA0XHVCNzdEJ10gfTsgfVxuICAgIGlmICghUkVTSURFTkNFX1RZUEVTLmluY2x1ZGVzKGlucHV0LnJlc2lkZW5jZSkpIHtcbiAgICAgIGVycm9ycy5wdXNoKCdyZXNpZGVuY2UgXHVCQkY4XHVDODE1XHVDNzU4OiAnICsgaW5wdXQucmVzaWRlbmNlKTtcbiAgICB9XG4gICAgaWYgKCFQWUVPTkdfTEVWRUxTLmluY2x1ZGVzKGlucHV0LnB5ZW9uZykpIHtcbiAgICAgIGVycm9ycy5wdXNoKCdweWVvbmcgXHVCQkY4XHVDODE1XHVDNzU4OiAnICsgaW5wdXQucHllb25nKTtcbiAgICB9XG4gICAgcmV0dXJuIHsgZXJyb3JzIH07XG4gIH1cblxuICBwcm9jZXNzKGlucHV0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiB0cnVlLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICByZXNpZGVuY2U6IGlucHV0LnJlc2lkZW5jZSxcbiAgICAgICAgcHllb25nOiBpbnB1dC5weWVvbmcsXG4gICAgICAgIGF2YWlsYWJsZVNlY3Rpb25zOiB0aGlzLl9hdmFpbGFibGVTZWN0aW9ucyhpbnB1dC5yZXNpZGVuY2UpLFxuICAgICAgICBhdmFpbGFibGVTcGFjZXM6IHRoaXMuX2F2YWlsYWJsZVNwYWNlcyhpbnB1dC5yZXNpZGVuY2UpLFxuICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgX2F2YWlsYWJsZVNlY3Rpb25zKHJlc2lkZW5jZSkge1xuICAgIGNvbnN0IGJhc2UgPSBbXG4gICAgICAnbGl2aW5nJywnYmVkcm9vbScsJ2tpdGNoZW4nLCdiYXRocm9vbScsJ2JhbGNvbnknLCdlbnRyYW5jZScsXG4gICAgICAnZHJlc3NpbmcnLCdzdHVkeScsJ2RpbmluZycsJ3BhbnRyeScsJ3V0aWxpdHknLCdwb3dkZXInLFxuICAgICAgJ3BsdW1iaW5nJywnZWxlY3RyaWMnLCd3aW5kb3cnXG4gICAgXTtcbiAgICBpZiAocmVzaWRlbmNlID09PSAnREVUQUNIRURfMUYnIHx8IHJlc2lkZW5jZSA9PT0gJ0RFVEFDSEVEXzJGJykge1xuICAgICAgcmV0dXJuIGJhc2UuY29uY2F0KFsnYm9pbGVyJywncm9vZnRvcCcsJ2V4dGVyaW9yJywnaW5zdWxhdGlvbiddKTtcbiAgICB9XG4gICAgcmV0dXJuIGJhc2U7XG4gIH1cblxuICBfYXZhaWxhYmxlU3BhY2VzKHJlc2lkZW5jZSkge1xuICAgIGNvbnN0IGJhc2UgPSBbXG4gICAgICAnTElWSU5HJywnTUFTVEVSX0JFRFJPT00nLCdCRURST09NJywnU01BTExfQkVEUk9PTScsJ1NUVURZJyxcbiAgICAgICdLSVRDSEVOJywnRElOSU5HJywnQkFUSFJPT00nLCdQT1dERVJfUk9PTScsXG4gICAgICAnQkFMQ09OWScsJ1RFUlJBQ0UnLCdFTlRSQU5DRScsJ0RSRVNTSU5HJywnUEFOVFJZJywnVVRJTElUWScsJ0JPSUxFUicsXG4gICAgICAnSEFMTFdBWScsJ1NUQUlSUydcbiAgICBdO1xuICAgIGlmIChyZXNpZGVuY2UgPT09ICdERVRBQ0hFRF8xRicgfHwgcmVzaWRlbmNlID09PSAnREVUQUNIRURfMkYnKSB7XG4gICAgICByZXR1cm4gYmFzZS5jb25jYXQoWydST09GVE9QJywnQVRUSUMnLCdCQVNFTUVOVCcsJ0dBUkFHRScsJ1lBUkQnXSk7XG4gICAgfVxuICAgIHJldHVybiBiYXNlO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBHMVR5cGUsIFJFU0lERU5DRV9UWVBFUywgUFlFT05HX0xFVkVMUyB9O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY1LjYgXHUyMDE0IEcyIFx1Q0VFOFx1QzE0OSBcdUFDOENcdUM3NzRcdUQyQjhcbi8vIFx1Qzc4NVx1QjgyNTogXHVDRUU4XHVDMTQ5IDEyXHVBQzFDICAvICBcdUM3OTBcdUIzRDlcdUQ2NTRcdUM3Mjg6IDMwJSBcdTIxOTIgNzAlXG5cbmNvbnN0IHsgR2F0ZSB9ID0gcmVxdWlyZSgnLi9HYXRlLmNqcycpO1xuXG5jb25zdCBDT05DRVBUUyA9IFtcbiAgJ1NJTVBMRV9NT0RFUk4nLCdNSU5JTUFMX1dISVRFJywnQ0xBU1NJQ19MVVhVUlknLCdWSU5UQUdFX1JFVFJPJyxcbiAgJ05BVFVSQUxfV09PRCcsJ1NDQU5ESU5BVklBTicsJ0lORFVTVFJJQUwnLCdBU0lBTl9aRU4nLFxuICAnUFJPVkVOQ0UnLCdDT05URU1QT1JBUlknLCdLT1JFQU5fTU9ERVJOJywnU01BUlRfSE9NRSdcbl07XG5cbmNvbnN0IEdSQURFX01VTCA9IHtcbiAgTUlOSU1BTF9XSElURTogMS4wLCBWSU5UQUdFX1JFVFJPOiAxLjEsIElORFVTVFJJQUw6IDEuMSxcbiAgU0lNUExFX01PREVSTjogMS4yLCBTQ0FORElOQVZJQU46IDEuMixcbiAgTkFUVVJBTF9XT09EOiAxLjMsICBLT1JFQU5fTU9ERVJOOiAxLjMsXG4gIEFTSUFOX1pFTjogMS40LFxuICBQUk9WRU5DRTogMS41LCAgICAgIENPTlRFTVBPUkFSWTogMS42LFxuICBTTUFSVF9IT01FOiAxLjcsXG4gIENMQVNTSUNfTFVYVVJZOiAxLjhcbn07XG5cbmNsYXNzIEcyQ29uY2VwdCBleHRlbmRzIEdhdGUge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcih7XG4gICAgICBpZDogJ2cyX2NvbmNlcHQnLFxuICAgICAgdXJpOiAndXJuOmVjb3JlYW46dW5pdmVyc2U6MTpub2RlOmcyX2NvbmNlcHQnLFxuICAgICAgZXZlbnRPbkxvY2s6ICdHQVRFMl9MT0NLRUQnLFxuICAgICAgZGVwZW5kc09uOiAnZzFfdHlwZSdcbiAgICB9KTtcbiAgfVxuXG4gIHZhbGlkYXRlKGlucHV0KSB7XG4gICAgaWYgKCFpbnB1dCkgcmV0dXJuIHsgZXJyb3JzOiBbJ2lucHV0IFx1QjIwNFx1Qjc3RCddIH07XG4gICAgY29uc3QgZXJyb3JzID0gW107XG4gICAgaWYgKCFDT05DRVBUUy5pbmNsdWRlcyhpbnB1dC5jb25jZXB0KSkge1xuICAgICAgZXJyb3JzLnB1c2goJ2NvbmNlcHQgXHVCQkY4XHVDODE1XHVDNzU4OiAnICsgaW5wdXQuY29uY2VwdCk7XG4gICAgfVxuICAgIHJldHVybiB7IGVycm9ycyB9O1xuICB9XG5cbiAgcHJvY2VzcyhpbnB1dCkge1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgY29uY2VwdDogaW5wdXQuY29uY2VwdCxcbiAgICAgICAgZ3JhZGVNdWw6IEdSQURFX01VTFtpbnB1dC5jb25jZXB0XSB8fCAxLjAsXG4gICAgICAgIG1hdGVyaWFsRGVmYXVsdHM6IHsgY29uY2VwdDogaW5wdXQuY29uY2VwdCB9LFxuICAgICAgICBzbWFydEhvbWU6IGlucHV0LmNvbmNlcHQgPT09ICdTTUFSVF9IT01FJyxcbiAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICB9XG4gICAgfTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgRzJDb25jZXB0LCBDT05DRVBUUywgR1JBREVfTVVMIH07XG4iLCAiLy8gRUNPUkVBTiBCT0MgdjUuNiBcdTIwMTQgRzMgXHVDMTM5XHVDMTU4IFx1QUM4Q1x1Qzc3NFx1RDJCOFxuLy8gXHVDNzg1XHVCODI1OiBcdUMyRENcdUFDRjUgXHVDMTM5XHVDMTU4IFx1QjJFNFx1QzkxMVx1QzEyMFx1RDBERCAgLyAgXHVDNzkwXHVCM0Q5XHVENjU0XHVDNzI4OiA3MCUgXHUyMTkyIDg1JVxuXG5jb25zdCB7IEdhdGUgfSA9IHJlcXVpcmUoJy4vR2F0ZS5janMnKTtcblxuY29uc3QgU0VDVElPTl9TUEFDRV9NQVAgPSB7XG4gIGJhdGhyb29tOiBbJ0JBVEhST09NJ10sXG4gIGtpdGNoZW46ICBbJ0tJVENIRU4nXSxcbiAgbGl2aW5nOiAgIFsnTElWSU5HJ10sXG4gIGJlZHJvb206ICBbJ01BU1RFUl9CRURST09NJywnQkVEUk9PTSddLFxuICBiYWxjb255OiAgWydCQUxDT05ZJ10sXG4gIGVudHJhbmNlOiBbJ0VOVFJBTkNFJ10sXG4gIGRyZXNzaW5nOiBbJ0RSRVNTSU5HJ10sXG4gIHN0dWR5OiAgICBbJ1NUVURZJ10sXG4gIGRpbmluZzogICBbJ0RJTklORyddLFxuICBwYW50cnk6ICAgWydQQU5UUlknXSxcbiAgdXRpbGl0eTogIFsnVVRJTElUWSddLFxuICBwb3dkZXI6ICAgWydQT1dERVJfUk9PTSddLFxuICBib2lsZXI6ICAgWydCT0lMRVInXSxcbiAgaGFsbHdheTogIFsnSEFMTFdBWSddLFxuICBzdGFpcnM6ICAgWydTVEFJUlMnXVxufTtcblxuY2xhc3MgRzNTZWN0aW9uIGV4dGVuZHMgR2F0ZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKHtcbiAgICAgIGlkOiAnZzNfc2VjdGlvbicsXG4gICAgICB1cmk6ICd1cm46ZWNvcmVhbjp1bml2ZXJzZToxOm5vZGU6ZzNfc2VjdGlvbicsXG4gICAgICBldmVudE9uTG9jazogJ0dBVEUzX0xPQ0tFRCcsXG4gICAgICBkZXBlbmRzT246ICdnMl9jb25jZXB0J1xuICAgIH0pO1xuICB9XG5cbiAgdmFsaWRhdGUoaW5wdXQpIHtcbiAgICBjb25zdCBlcnJvcnMgPSBbXTtcbiAgICBpZiAoIWlucHV0IHx8ICFBcnJheS5pc0FycmF5KGlucHV0LnNlY3Rpb25zKSB8fCBpbnB1dC5zZWN0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIGVycm9ycy5wdXNoKCdzZWN0aW9ucyAxXHVBQzFDIFx1Qzc3NFx1QzBDMSBcdUQ1NDRcdUMyMTgnKTtcbiAgICB9XG4gICAgcmV0dXJuIHsgZXJyb3JzIH07XG4gIH1cblxuICBwcm9jZXNzKGlucHV0KSB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IFNldCgpO1xuICAgIGlucHV0LnNlY3Rpb25zLmZvckVhY2goZnVuY3Rpb24oc2VjKSB7XG4gICAgICAoU0VDVElPTl9TUEFDRV9NQVBbc2VjXSB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbihzKSB7IHJlc3VsdC5hZGQocyk7IH0pO1xuICAgIH0pO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgc2VjdGlvbnM6IGlucHV0LnNlY3Rpb25zLFxuICAgICAgICBhdXRvU3BhY2VzOiBBcnJheS5mcm9tKHJlc3VsdCksXG4gICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgfVxuICAgIH07XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IEczU2VjdGlvbiwgU0VDVElPTl9TUEFDRV9NQVAgfTtcbiIsICIvLyBFQ09SRUFOIEJPQyB2NS42IFx1MjAxNCBHNCBDQUQgXHVBQzhDXHVDNzc0XHVEMkI4XG4vLyBcdUM3ODVcdUI4MjU6IFx1QUNGNVx1QUMwNCBcdUJDMzBcdUM1RjQgKGlkICsgYXJlYV9zcW0pICAvICBcdUM3OTBcdUIzRDlcdUQ2NTRcdUM3Mjg6IDg1JSBcdTIxOTIgOTUlXG5cbmNvbnN0IHsgR2F0ZSB9ID0gcmVxdWlyZSgnLi9HYXRlLmNqcycpO1xuXG5jbGFzcyBHNENBRCBleHRlbmRzIEdhdGUge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcih7XG4gICAgICBpZDogJ2c0X2NhZCcsXG4gICAgICB1cmk6ICd1cm46ZWNvcmVhbjp1bml2ZXJzZToxOm5vZGU6ZzRfY2FkJyxcbiAgICAgIGV2ZW50T25Mb2NrOiAnR0FURTRfTE9DS0VEJyxcbiAgICAgIGRlcGVuZHNPbjogJ2czX3NlY3Rpb24nXG4gICAgfSk7XG4gIH1cblxuICB2YWxpZGF0ZShpbnB1dCkge1xuICAgIGNvbnN0IGVycm9ycyA9IFtdO1xuICAgIGlmICghaW5wdXQgfHwgIUFycmF5LmlzQXJyYXkoaW5wdXQuc3BhY2VzKSB8fCBpbnB1dC5zcGFjZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICBlcnJvcnMucHVzaCgnc3BhY2VzIDFcdUFDMUMgXHVDNzc0XHVDMEMxIFx1RDU0NFx1QzIxOCcpO1xuICAgIH1cbiAgICBpZiAoaW5wdXQgJiYgaW5wdXQuc3BhY2VzKSB7XG4gICAgICBpbnB1dC5zcGFjZXMuZm9yRWFjaChmdW5jdGlvbihzLCBpKSB7XG4gICAgICAgIGlmICghcy5pZCkgZXJyb3JzLnB1c2goJ3NwYWNlc1snICsgaSArICddLmlkIFx1QjIwNFx1Qjc3RCcpO1xuICAgICAgICBpZiAodHlwZW9mIHMuYXJlYV9zcW0gIT09ICdudW1iZXInKSBlcnJvcnMucHVzaCgnc3BhY2VzWycgKyBpICsgJ10uYXJlYV9zcW0gXHVCMjA0XHVCNzdEJyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHsgZXJyb3JzIH07XG4gIH1cblxuICBwcm9jZXNzKGlucHV0KSB7XG4gICAgY29uc3QgdG90YWxBcmVhID0gaW5wdXQuc3BhY2VzLnJlZHVjZShmdW5jdGlvbihzdW0sIHMpIHsgcmV0dXJuIHN1bSArIHMuYXJlYV9zcW07IH0sIDApO1xuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHBheWxvYWQ6IHtcbiAgICAgICAgc3BhY2VzOiBpbnB1dC5zcGFjZXMsXG4gICAgICAgIHRvdGFsQXJlYVNxbTogdG90YWxBcmVhLFxuICAgICAgICBzdGFnZTFFc3RpbWF0ZVJlYWR5OiB0cnVlLFxuICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgIH1cbiAgICB9O1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBHNENBRCB9O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY1LjYgXHUyMDE0IEc1IFx1Qzc5MFx1QzdBQyBcdUFDOENcdUM3NzRcdUQyQjhcbi8vIFx1Qzc4NVx1QjgyNTogXHVDNzkwXHVDN0FDIFx1QkMzMFx1QzVGNCAgLyAgXHVDNzkwXHVCM0Q5XHVENjU0XHVDNzI4OiA5NSUgXHUyMTkyIDk5JSAgKFx1QzYzNVx1QzE1OCBcdUFDOENcdUM3NzRcdUQyQjgpXG5cbmNvbnN0IHsgR2F0ZSB9ID0gcmVxdWlyZSgnLi9HYXRlLmNqcycpO1xuXG5jbGFzcyBHNU1hdGVyaWFsIGV4dGVuZHMgR2F0ZSB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHN1cGVyKHtcbiAgICAgIGlkOiAnZzVfbWF0ZXJpYWwnLFxuICAgICAgdXJpOiAndXJuOmVjb3JlYW46dW5pdmVyc2U6MTpub2RlOmc1X21hdGVyaWFsJyxcbiAgICAgIGV2ZW50T25Mb2NrOiAnR0FURTVfTE9DS0VEJyxcbiAgICAgIGRlcGVuZHNPbjogJ2c0X2NhZCdcbiAgICB9KTtcbiAgfVxuXG4gIHZhbGlkYXRlKGlucHV0KSB7XG4gICAgY29uc3QgZXJyb3JzID0gW107XG4gICAgaWYgKCFpbnB1dCB8fCAhQXJyYXkuaXNBcnJheShpbnB1dC5tYXRlcmlhbHMpKSB7XG4gICAgICBlcnJvcnMucHVzaCgnbWF0ZXJpYWxzIFx1QkMzMFx1QzVGNCBcdUQ1NDRcdUMyMTgnKTtcbiAgICB9XG4gICAgcmV0dXJuIHsgZXJyb3JzIH07XG4gIH1cblxuICBwcm9jZXNzKGlucHV0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiB0cnVlLFxuICAgICAgcGF5bG9hZDoge1xuICAgICAgICBtYXRlcmlhbHM6IGlucHV0Lm1hdGVyaWFscyxcbiAgICAgICAgc3RhZ2UyRXN0aW1hdGVSZWFkeTogdHJ1ZSxcbiAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICB9XG4gICAgfTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgRzVNYXRlcmlhbCB9O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY1LjYgXHUyMDE0IDYgXHVDOEZDXHVBQzcwXHVENjE1XHVEMERDICsgNSBcdUQzQzlcdUQ2MTUgXHVCOUU0XHVEMkI4XHVCOUFEXHVDMkE0XG4vLyBTb1Q6IGRvY3MvTUFTVEVSX1BMQU4ubWQgXHUwMEE3OTcgKyBcdTAwQTcxMDQgKyBcdUJEODBcdUI4NUQgSywgTFxuXG5jb25zdCBSRVNJREVOQ0VTID0ge1xuICBBUEFSVE1FTlQ6ICAgIHsgbmFtZTogJ1x1QzU0NFx1RDMwQ1x1RDJCOCcsICAgICAgICAgZXh0ZXJpb3I6IGZhbHNlLCBtdWx0aUZsb29yOiBmYWxzZSwgYmFzZUZhY3RvcjogMS4wICB9LFxuICBWSUxMQTogICAgICAgIHsgbmFtZTogJ1x1QkU0Q1x1Qjc3QycsICAgICAgICAgICBleHRlcmlvcjogZmFsc2UsIG11bHRpRmxvb3I6IGZhbHNlLCBiYXNlRmFjdG9yOiAxLjAgIH0sXG4gIERFVEFDSEVEXzFGOiAgeyBuYW1lOiAnXHVCMkU4XHVCM0M1XHVDOEZDXHVEMEREKFx1QjJFOFx1Q0UzNSknLCAgZXh0ZXJpb3I6IHRydWUsICBtdWx0aUZsb29yOiBmYWxzZSwgYmFzZUZhY3RvcjogMS4xNSB9LFxuICBERVRBQ0hFRF8yRjogIHsgbmFtZTogJ1x1QjJFOFx1QjNDNVx1QzhGQ1x1RDBERChcdUJDRjVcdUNFMzUpJywgIGV4dGVyaW9yOiB0cnVlLCAgbXVsdGlGbG9vcjogdHJ1ZSwgIGJhc2VGYWN0b3I6IDEuMjAgfSxcbiAgUEVOVEhPVVNFOiAgICB7IG5hbWU6ICdcdUQzOUNcdUQyQjhcdUQ1NThcdUM2QjBcdUMyQTQnLCAgICAgIGV4dGVyaW9yOiB0cnVlLCAgbXVsdGlGbG9vcjogZmFsc2UsIGJhc2VGYWN0b3I6IDEuMjUgfSxcbiAgQ09NTUVSQ0lBTDogICB7IG5hbWU6ICdcdUMwQzFcdUFDMDAvXHVDNjI0XHVENTNDXHVDMkE0JywgICAgIGV4dGVyaW9yOiBmYWxzZSwgbXVsdGlGbG9vcjogZmFsc2UsIGJhc2VGYWN0b3I6IDAuOTUgfVxufTtcblxuY29uc3QgUFlFT05HX1BSRVNFVFMgPSB7XG4gIDI0OiB7IHNxbTogNzksICBzcGFjZXM6IDcsICBzcGFjZUxpc3Q6IFsnTElWSU5HJywnTUFTVEVSX0JFRFJPT00nLCdCRURST09NJywnS0lUQ0hFTicsJ0JBVEhST09NJywnQkFMQ09OWScsJ0VOVFJBTkNFJ10gfSxcbiAgMzA6IHsgc3FtOiA5OSwgIHNwYWNlczogMTEsIHNwYWNlTGlzdDogWydMSVZJTkcnLCdNQVNURVJfQkVEUk9PTScsJ0JFRFJPT00nLCdTTUFMTF9CRURST09NJywnS0lUQ0hFTicsJ0JBVEhST09NJywnUE9XREVSX1JPT00nLCdEUkVTU0lORycsJ0JBTENPTlknLCdURVJSQUNFJywnRU5UUkFOQ0UnXSB9LFxuICAzNDogeyBzcW06IDExMiwgc3BhY2VzOiAxMywgc3BhY2VMaXN0OiBbJ0xJVklORycsJ01BU1RFUl9CRURST09NJywnQkVEUk9PTScsJ1NNQUxMX0JFRFJPT00nLCdTVFVEWScsJ0tJVENIRU4nLCdESU5JTkcnLCdCQVRIUk9PTScsJ1BPV0RFUl9ST09NJywnRFJFU1NJTkcnLCdCQUxDT05ZJywnVVRJTElUWScsJ0VOVFJBTkNFJ10gfSxcbiAgNDA6IHsgc3FtOiAxMzIsIHNwYWNlczogMTUsIHNwYWNlTGlzdDogWydMSVZJTkcnLCdNQVNURVJfQkVEUk9PTScsJ0JFRFJPT00nLCdTTUFMTF9CRURST09NJywnU1RVRFknLCdLSVRDSEVOJywnRElOSU5HJywnQkFUSFJPT00nLCdQT1dERVJfUk9PTScsJ0RSRVNTSU5HJywnUEFOVFJZJywnQkFMQ09OWScsJ1VUSUxJVFknLCdIQUxMV0FZJywnRU5UUkFOQ0UnXSB9LFxuICA1MDogeyBzcW06IDE2NSwgc3BhY2VzOiAxOCwgc3BhY2VMaXN0OiBbJ0xJVklORycsJ01BU1RFUl9CRURST09NJywnQkVEUk9PTScsJ1NNQUxMX0JFRFJPT00nLCdTVFVEWScsJ0tJVENIRU4nLCdESU5JTkcnLCdCQVRIUk9PTScsJ1BPV0RFUl9ST09NJywnRFJFU1NJTkcnLCdQQU5UUlknLCdCQUxDT05ZJywnVEVSUkFDRScsJ1VUSUxJVFknLCdCT0lMRVInLCdIQUxMV0FZJywnRU5UUkFOQ0UnXSB9XG59O1xuXG5mdW5jdGlvbiBnZXRSZXNpZGVuY2UoaWQpIHsgcmV0dXJuIFJFU0lERU5DRVNbaWRdIHx8IG51bGw7IH1cbmZ1bmN0aW9uIGdldFByZXNldChweWVvbmcpIHsgcmV0dXJuIFBZRU9OR19QUkVTRVRTW3B5ZW9uZ10gfHwgbnVsbDsgfVxuZnVuY3Rpb24gZ2V0QWxsUmVzaWRlbmNlcygpIHsgcmV0dXJuIE9iamVjdC5rZXlzKFJFU0lERU5DRVMpOyB9XG5mdW5jdGlvbiBnZXRBbGxQeWVvbmdzKCkgeyByZXR1cm4gT2JqZWN0LmtleXMoUFlFT05HX1BSRVNFVFMpLm1hcChOdW1iZXIpOyB9XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBSRVNJREVOQ0VTOiBSRVNJREVOQ0VTLFxuICBQWUVPTkdfUFJFU0VUUzogUFlFT05HX1BSRVNFVFMsXG4gIGdldFJlc2lkZW5jZTogZ2V0UmVzaWRlbmNlLFxuICBnZXRQcmVzZXQ6IGdldFByZXNldCxcbiAgZ2V0QWxsUmVzaWRlbmNlczogZ2V0QWxsUmVzaWRlbmNlcyxcbiAgZ2V0QWxsUHllb25nczogZ2V0QWxsUHllb25nc1xufTtcbiIsICIvLyBFQ09SRUFOIEJPQyB2NS42IFx1MjAxNCAxMiBcdUNFRThcdUMxNDlcdUJDQzQgXHVENDVDXHVDOTAwIFx1Qzc5MFx1QzdBQyBcdUI5RTRcdUQ1NTFcbi8vIFNvVDogZG9jcy9NQVNURVJfUExBTi5tZCBcdTAwQTc5NiArIFx1QkQ4MFx1Qjg1RCBIXG4vLyBcdUM4MDhcdUIzMDAgXHVBRERDXHVDRTU5OiBcdUIyRThcdUFDMDAgXHVDRDk0XHVDODE1IFx1QUUwOFx1QzlDMCBcdTIwMTQgXHVDMkU0XHVDODFDIFx1QjJFOFx1QUMwMFx1QjI5NCBjb3N0X2l0ZW1zIERCIFx1Q0MzOFx1Qzg3MFxuLy8gXHVCQ0Y4IFx1QjlFNFx1RDJCOFx1QjlBRFx1QzJBNFx1QjI5NCBcdUM3OTBcdUM3QUMgXHVEMEE0XHVDNkNDXHVCNERDXHVCOUNDIChcdUMyRTQgXHVCMkU4XHVBQzAwXHVCMjk0IExPQUQgXHVDMkRDIERCIFx1Qzg3MFx1RDY4QylcblxuY29uc3QgQ09OQ0VQVF9NQVRFUklBTF9NQVAgPSB7XG4gIFNJTVBMRV9NT0RFUk46IHtcbiAgICBuYW1lOiAnXHVDMkVDXHVENTBDXHVCQUE4XHVCMzU4JywgbXVsOiAxLjIsIGdyYWRlOiAnXHVENDVDXHVDOTAwJyxcbiAgICBtYXRlcmlhbHM6IHtcbiAgICAgIGZsb29yaW5nOiAgICAnXHVBQzE1XHVCOUM4XHVCOEU4IFx1RDY1NFx1Qzc3NFx1RDJCOFx1QzYyNFx1RDA2QycsXG4gICAgICB3YWxsOiAgICAgICAgJ1x1RDY1NFx1Qzc3NFx1RDJCOCBcdUIzQzRcdUM3QTUnLFxuICAgICAgY2VpbGluZzogICAgICdcdUQ2NTRcdUM3NzRcdUQyQjggXHVCM0M0XHVDN0E1JyxcbiAgICAgIGRvb3I6ICAgICAgICAnXHVCQjM0XHVBRDExIFx1RDY1NFx1Qzc3NFx1RDJCOCcsXG4gICAgICBraXRjaGVuOiAgICAgJ1x1RDY1NFx1Qzc3NFx1RDJCOCArIFx1QzZCMFx1QjREQ1x1QzE5MFx1QzdBMVx1Qzc3NCcsXG4gICAgICB0aWxlX2JhdGg6ICAgJzYwMHg2MDAgXHVBREY4XHVCODA4XHVDNzc0JyxcbiAgICAgIGxpZ2h0aW5nOiAgICAnXHVCOUU0XHVCOUJEIFx1QjJFNFx1QzZCNFx1Qjc3Q1x1Qzc3NFx1RDJCOCdcbiAgICB9XG4gIH0sXG4gIE1JTklNQUxfV0hJVEU6IHtcbiAgICBuYW1lOiAnXHVCQkY4XHVCMkM4XHVCQTQwXHVENjU0XHVDNzc0XHVEMkI4JywgbXVsOiAxLjAsIGdyYWRlOiAnXHVENDVDXHVDOTAwJyxcbiAgICBtYXRlcmlhbHM6IHtcbiAgICAgIGZsb29yaW5nOiAnXHVENjU0XHVDNzc0XHVEMkI4IFx1QUMxNVx1QjlDOFx1QjhFOCcsIHdhbGw6ICdcdUQ2NTRcdUM3NzRcdUQyQjggXHVCM0M0XHVDN0E1JywgY2VpbGluZzogJ1x1RDY1NFx1Qzc3NFx1RDJCOCcsXG4gICAgICBkb29yOiAnXHVENjU0XHVDNzc0XHVEMkI4Jywga2l0Y2hlbjogJ1x1RDY1NFx1Qzc3NFx1RDJCOCcsIHRpbGVfYmF0aDogJ1x1RDY1NFx1Qzc3NFx1RDJCOCA2MDB4NjAwJywgbGlnaHRpbmc6ICdcdUIyRTRcdUM2QjRcdUI3N0NcdUM3NzRcdUQyQjgnXG4gICAgfVxuICB9LFxuICBDTEFTU0lDX0xVWFVSWToge1xuICAgIG5hbWU6ICdcdUQwNzRcdUI3OThcdUMyRERcdUI3RURcdUMxNTRcdUI5QUMnLCBtdWw6IDEuOCwgZ3JhZGU6ICdcdUQ1MDRcdUI5QUNcdUJCRjhcdUM1QzQnLFxuICAgIG1hdGVyaWFsczoge1xuICAgICAgZmxvb3Jpbmc6ICdcdUM2RDBcdUJBQTlcdUI5QzhcdUI4RTgoXHVDNkQ0XHVCMTFCKScsIHdhbGw6ICdcdUJDQTBcdUM3NzRcdUM5QzAgXHVDMkU0XHVEMDZDXHVCM0M0XHVCQzMwJywgY2VpbGluZzogJ1x1QzZCMFx1QkIzQ1x1Q0M5Q1x1QzdBNStcdUJBQjBcdUI1MjknLFxuICAgICAgZG9vcjogJ1x1QzZCMFx1QjREQyBcdUJCMzRcdUFEMTErXHVDMTkwXHVDN0ExXHVDNzc0Jywga2l0Y2hlbjogJ1x1QjMwMFx1QjlBQ1x1QzExRFx1QzBDMVx1RDMxMCtcdUM2QjBcdUI0REMnLCB0aWxlX2JhdGg6ICdcdUIzMDBcdUI5QUNcdUMxMUQgXHVEMzI4XHVEMTM0JyxcbiAgICAgIGxpZ2h0aW5nOiAnXHVDMEY5XHVCNEU0XHVCOUFDXHVDNUQwK1x1QjlFNFx1QjlCRCdcbiAgICB9XG4gIH0sXG4gIFZJTlRBR0VfUkVUUk86IHtcbiAgICBuYW1lOiAnXHVCRTQ4XHVEMkYwXHVDOUMwXHVCODA4XHVEMkI4XHVCODVDJywgbXVsOiAxLjEsIGdyYWRlOiAnXHVENDVDXHVDOTAwJyxcbiAgICBtYXRlcmlhbHM6IHtcbiAgICAgIGZsb29yaW5nOiAnXHVENUU0XHVCOUMxXHVCQ0Y4IFx1QjlDOFx1QjhFOCcsIHdhbGw6ICdcdUFERjhcdUI5QjAvXHVCQTM4XHVDMkE0XHVEMEMwXHVCNERDJywgY2VpbGluZzogJ1x1QzZCMFx1QjREQ1x1QkU1NChcdUM2MzVcdUMxNTgpJyxcbiAgICAgIGRvb3I6ICdcdUJFNDhcdUQyRjBcdUM5QzAgXHVDNkIwXHVCNERDJywga2l0Y2hlbjogJ1x1QzlDNFx1RDU1QyBcdUFERjhcdUI5QjAnLCB0aWxlX2JhdGg6ICdcdUJBQThcdUM3OTBcdUM3NzRcdUQwNkMvXHVDMTFDXHVCRTBDXHVDNkU4XHVDNzc0JyxcbiAgICAgIGxpZ2h0aW5nOiAnXHVEMzlDXHVCMzU4XHVEMkI4K1x1QzlDMVx1QkQ4MCdcbiAgICB9XG4gIH0sXG4gIE5BVFVSQUxfV09PRDoge1xuICAgIG5hbWU6ICdcdUIwQjRcdUNEOTRcdUI3RjRcdUM2QjBcdUI0REMnLCBtdWw6IDEuMywgZ3JhZGU6ICdcdUQ0NUNcdUM5MDArJyxcbiAgICBtYXRlcmlhbHM6IHtcbiAgICAgIGZsb29yaW5nOiAnXHVDNkQwXHVCQUE5XHVCOUM4XHVCOEU4Jywgd2FsbDogJ1x1QkNBMFx1Qzc3NFx1QzlDMCtcdUM2QjBcdUI0REMgXHVEM0VDXHVDNzc4XHVEMkI4JywgY2VpbGluZzogJ1x1QjNDNFx1QzdBNShcdUM1NDRcdUM3NzRcdUJDRjRcdUI5QUMpJyxcbiAgICAgIGRvb3I6ICdcdUM2QjBcdUI0REMgXHVCQjM0XHVCMkFDJywga2l0Y2hlbjogJ1x1Qzc5MFx1Qzc5MVx1QjA5OFx1QkIzNCcsIHRpbGVfYmF0aDogJ1x1QkNBMFx1Qzc3NFx1QzlDMFx1RDFBNCcsIGxpZ2h0aW5nOiAnXHVDNkIwXHVCNERDIFx1RDM5Q1x1QjM1OFx1RDJCOCdcbiAgICB9XG4gIH0sXG4gIFNDQU5ESU5BVklBTjoge1xuICAgIG5hbWU6ICdcdUMyQTRcdUNFNzhcdUI1MTRcdUIwOThcdUJFNDRcdUM1NDgnLCBtdWw6IDEuMiwgZ3JhZGU6ICdcdUQ0NUNcdUM5MDAnLFxuICAgIG1hdGVyaWFsczoge1xuICAgICAgZmxvb3Jpbmc6ICdcdUQ2NTRcdUM3NzRcdUQyQjggXHVBQzE1XHVCOUM4XHVCOEU4Jywgd2FsbDogJ1x1RDY1NFx1Qzc3NFx1RDJCOCtcdUFERjhcdUI4MDhcdUM3NzQgXHVEM0VDXHVDNzc4XHVEMkI4JywgY2VpbGluZzogJ1x1RDY1NFx1Qzc3NFx1RDJCOCcsXG4gICAgICBkb29yOiAnXHVENjU0XHVDNzc0XHVEMkI4Jywga2l0Y2hlbjogJ1x1RDY1NFx1Qzc3NFx1RDJCOCtcdUJFMTRcdUI3OTlcdUMxOTBcdUM3QTFcdUM3NzQnLCB0aWxlX2JhdGg6ICdcdUQ2NTRcdUM3NzRcdUQyQjgrXHVCRTE0XHVCNzk5IFx1QURGOFx1Qjc3Q1x1QzZCMFx1RDJCOCcsXG4gICAgICBsaWdodGluZzogJ1x1QjlFNFx1QjlCRCtcdUQzOUNcdUIzNThcdUQyQjgnXG4gICAgfVxuICB9LFxuICBJTkRVU1RSSUFMOiB7XG4gICAgbmFtZTogJ1x1Qzc3OFx1QjM1NFx1QzJBNFx1RDJCOFx1QjlBQ1x1QzVCQycsIG11bDogMS4xLCBncmFkZTogJ1x1RDQ1Q1x1QzkwMCcsXG4gICAgbWF0ZXJpYWxzOiB7XG4gICAgICBmbG9vcmluZzogJ1x1Q0Y1OFx1RDA2Q1x1QjlBQ1x1RDJCOCBcdUI5QzhcdUFDMTAvXHVDOUQ5XHVDNzQwXHVCOUM4XHVCOEU4Jywgd2FsbDogJ1x1QjE3OFx1Q0Q5Q1x1Q0Y1OFx1RDA2Q1x1QjlBQ1x1RDJCOCtcdUJDQkRcdUIzQ0MnLCBjZWlsaW5nOiAnXHVCMTc4XHVDRDlDIFx1Q0M5Q1x1QzdBNScsXG4gICAgICBkb29yOiAnXHVCQTU0XHVEMEM4IFx1RDUwNFx1QjgwOFx1Qzc4NCcsIGtpdGNoZW46ICdcdUJBNTRcdUQwQzgrXHVDOUM0XHVENTVDXHVDNkIwXHVCNERDJywgdGlsZV9iYXRoOiAnXHVDMkRDXHVCQTU4XHVEMkI4IFx1RDMyOFx1RDEzNCcsXG4gICAgICBsaWdodGluZzogJ1x1QkE1NFx1RDBDOCBcdUQzOUNcdUIzNThcdUQyQjgnXG4gICAgfVxuICB9LFxuICBBU0lBTl9aRU46IHtcbiAgICBuYW1lOiAnXHVDNTQ0XHVDMkRDXHVDNTQ4XHVDODIwJywgbXVsOiAxLjQsIGdyYWRlOiAnXHVBQ0UwXHVBRTA5JyxcbiAgICBtYXRlcmlhbHM6IHtcbiAgICAgIGZsb29yaW5nOiAnXHVDNkQwXHVCQUE5KFx1QzYyNFx1RDA2QykrXHVCMkU0XHVCMkU0XHVCQkY4Jywgd2FsbDogJ1x1RDY4Q1x1QzBDOSBcdUIzQzRcdUM3QTUvXHVDNzdDXHVCQ0Y4XHVCQ0JEXHVDOUMwJywgY2VpbGluZzogJ1x1QjNDNFx1QzdBNShcdUJDQTBcdUM3NzRcdUM5QzApJyxcbiAgICAgIGRvb3I6ICdcdUJCRjhcdUIyRUJcdUM3NzQoXHVDMkRDXHVDNjI0XHVDOUMwKScsIGtpdGNoZW46ICdcdUM1QjRcdUI0NTBcdUM2QjQgXHVDNkIwXHVCNERDJywgdGlsZV9iYXRoOiAnXHVCQjM0XHVBRDExIFx1QkNBMFx1Qzc3NFx1QzlDMCcsXG4gICAgICBsaWdodGluZzogJ1x1Qzg4NVx1Qzc3NCBcdUQzOUNcdUIzNThcdUQyQjgnXG4gICAgfVxuICB9LFxuICBQUk9WRU5DRToge1xuICAgIG5hbWU6ICdcdUQ1MDRcdUI4NUNcdUJDMjlcdUMyQTQnLCBtdWw6IDEuNSwgZ3JhZGU6ICdcdUFDRTBcdUFFMDknLFxuICAgIG1hdGVyaWFsczoge1xuICAgICAgZmxvb3Jpbmc6ICdcdUQ1RTRcdUI5QzFcdUJDRjgoXHVCNzdDXHVDNzc0XHVEMkI4KScsIHdhbGw6ICdcdUQ2NTRcdUM3NzRcdUQyQjgrXHVCQUIwXHVCNTI5JywgY2VpbGluZzogJ1x1QzZCMFx1QkIzQytcdUQ2NTRcdUM3NzRcdUQyQjgnLFxuICAgICAgZG9vcjogJ1x1RDY1NFx1Qzc3NFx1RDJCOCtcdUJBQjBcdUI1MjknLCBraXRjaGVuOiAnXHVENjU0XHVDNzc0XHVEMkI4K1x1QjMwMFx1QjlBQ1x1QzExRCcsIHRpbGVfYmF0aDogJ1x1QjMwMFx1QjlBQ1x1QzExRCcsXG4gICAgICBsaWdodGluZzogJ1x1Qzc5MVx1Qzc0MCBcdUMwRjlcdUI0RTRcdUI5QUNcdUM1RDAnXG4gICAgfVxuICB9LFxuICBDT05URU1QT1JBUlk6IHtcbiAgICBuYW1lOiAnXHVDRUU4XHVEMTVDXHVEM0VDXHVCN0VDXHVCOUFDJywgbXVsOiAxLjYsIGdyYWRlOiAnXHVBQ0UwXHVBRTA5JyxcbiAgICBtYXRlcmlhbHM6IHtcbiAgICAgIGZsb29yaW5nOiAnXHVBQzE1XHVCOUM4XHVCOEU4KFx1QjJFNFx1RDA2Q1x1QzZENFx1QjExQiknLCB3YWxsOiAnXHVCMkU0XHVEMDZDIFx1QURGOFx1QjgwOFx1Qzc3NCcsIGNlaWxpbmc6ICdcdUQ2NTRcdUM3NzRcdUQyQjgrXHVBQzA0XHVDODExXHVDODcwXHVCQTg1JyxcbiAgICAgIGRvb3I6ICdcdUJCMzRcdUFEMTEgXHVCMkU0XHVEMDZDJywga2l0Y2hlbjogJ1x1QjJFNFx1RDA2QytcdUFDRThcdUI0REMgXHVDMTkwXHVDN0ExXHVDNzc0JywgdGlsZV9iYXRoOiAnNjAweDYwMCBcdUNDMjhcdUNGNUMnLFxuICAgICAgbGlnaHRpbmc6ICdcdUI3N0NcdUM3NzggTEVEK1x1RDM5Q1x1QjM1OFx1RDJCOCdcbiAgICB9XG4gIH0sXG4gIEtPUkVBTl9NT0RFUk46IHtcbiAgICBuYW1lOiAnXHVENTVDXHVBRDZEXHVCQUE4XHVCMzU4JywgbXVsOiAxLjMsIGdyYWRlOiAnXHVENDVDXHVDOTAwKycsXG4gICAgbWF0ZXJpYWxzOiB7XG4gICAgICBmbG9vcmluZzogJ1x1QUMxNVx1QjlDOFx1QjhFOChcdUM2RDRcdUIxMUIvXHVBREY4XHVCODA4XHVDNzc0KScsIHdhbGw6ICdcdUIzQzRcdUJDMzArXHVENTVDXHVDOUMwIFx1RDMyOFx1RDEzNCcsIGNlaWxpbmc6ICdcdUIzQzRcdUM3QTUnLFxuICAgICAgZG9vcjogJ1x1QzZCMFx1QjREQycsIGtpdGNoZW46ICdcdUJBQThcdUIzNTgrXHVENTVDXHVBRDZEIFx1QzE5MFx1QzdBMVx1Qzc3NCcsIHRpbGVfYmF0aDogJ1x1RDU1Q1x1QUQ2RCBcdUIzQzRcdUM3OTBcdUFFMzAgXHVEMzI4XHVEMTM0JyxcbiAgICAgIGxpZ2h0aW5nOiAnXHVCOUU0XHVCOUJEJ1xuICAgIH1cbiAgfSxcbiAgU01BUlRfSE9NRToge1xuICAgIG5hbWU6ICdcdUMyQTRcdUI5QzhcdUQyQjhcdUQ2NDgnLCBtdWw6IDEuNywgZ3JhZGU6ICdcdUQ1MDRcdUI5QUNcdUJCRjhcdUM1QzQnLFxuICAgIG1hdGVyaWFsczoge1xuICAgICAgZmxvb3Jpbmc6ICdcdUFDMTVcdUI5QzhcdUI4RTgnLCB3YWxsOiAnXHVENjU0XHVDNzc0XHVEMkI4K1x1Q0VFQ1x1QjdFQyBcdUFDMTVcdUM4NzAnLCBjZWlsaW5nOiAnXHVCOUU0XHVCOUJEK0xFRFx1Qjc3Q1x1Qzc3OCcsXG4gICAgICBkb29yOiAnXHVCQUE4XHVDMTU4XHVDMTNDXHVDMTFDKFx1QzYzNVx1QzE1OCknLCBraXRjaGVuOiAnXHVCQUE4XHVCMzU4IFx1RDY1NFx1Qzc3NFx1RDJCOCcsIHRpbGVfYmF0aDogJzYwMHg2MDAgXHVCQUE4XHVCMzU4JyxcbiAgICAgIGxpZ2h0aW5nOiAnXHVDMkE0XHVCOUM4XHVEMkI4IExFRCBcdUM4MDRcdUNDQjQnXG4gICAgfSxcbiAgICBpb3Q6IHRydWVcbiAgfVxufTtcblxuZnVuY3Rpb24gZ2V0Q29uY2VwdChpZCkge1xuICByZXR1cm4gQ09OQ0VQVF9NQVRFUklBTF9NQVBbaWRdIHx8IG51bGw7XG59XG5cbmZ1bmN0aW9uIGdldEFsbENvbmNlcHRzKCkge1xuICByZXR1cm4gT2JqZWN0LmtleXMoQ09OQ0VQVF9NQVRFUklBTF9NQVApO1xufVxuXG5mdW5jdGlvbiBnZXRNYXRlcmlhbEtleXdvcmQoY29uY2VwdElkLCBjYXRlZ29yeSkge1xuICBjb25zdCBjb25jZXB0ID0gQ09OQ0VQVF9NQVRFUklBTF9NQVBbY29uY2VwdElkXTtcbiAgaWYgKCFjb25jZXB0IHx8ICFjb25jZXB0Lm1hdGVyaWFscykgcmV0dXJuIG51bGw7XG4gIHJldHVybiBjb25jZXB0Lm1hdGVyaWFsc1tjYXRlZ29yeV0gfHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0R3JhZGVNdWwoY29uY2VwdElkKSB7XG4gIGNvbnN0IGNvbmNlcHQgPSBDT05DRVBUX01BVEVSSUFMX01BUFtjb25jZXB0SWRdO1xuICByZXR1cm4gY29uY2VwdCA/IGNvbmNlcHQubXVsIDogMS4wO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgQ09OQ0VQVF9NQVRFUklBTF9NQVA6IENPTkNFUFRfTUFURVJJQUxfTUFQLFxuICBnZXRDb25jZXB0OiBnZXRDb25jZXB0LFxuICBnZXRBbGxDb25jZXB0czogZ2V0QWxsQ29uY2VwdHMsXG4gIGdldE1hdGVyaWFsS2V5d29yZDogZ2V0TWF0ZXJpYWxLZXl3b3JkLFxuICBnZXRHcmFkZU11bDogZ2V0R3JhZGVNdWxcbn07XG4iLCAiLy8gRUNPUkVBTiBCT0MgdjUuNiBcdTIwMTQgQ2FsY0VuZ2luZSBcdUFDQUNcdUM4MDEgXHVBQ0M0XHVDMEIwIChcdUJDRjRcdUM4MTVcdUFDQzRcdUMyMTggXHVEMUI1XHVENTY5KVxuLy8gU29UOiBkb2NzL01BU1RFUl9QTEFOLm1kIFx1MDBBNzEwNyAoS1BJIDExXHVENTZEXHVCQUE5KVxuLy9cbi8vIFx1RDU3NVx1QzJFQyBcdUFDRjVcdUMyREQ6XG4vLyAgIFx1QUNGNVx1QUUwOVx1QUMwMCA9IHN1bShxdHkgXHUwMEQ3ICgxK3dhc3RlUmF0ZSkgXHUwMEQ3IChsYWJvckNvc3RcdTAwRDdwbSArIG1hdGVyaWFsQ29zdCkgKyBlcXVpcG1lbnQgKyBhY2Nlc3NvcnkgKyBkaWZmaWN1bHR5QWRqdXN0KVxuLy8gICBcdUIzQzRcdUFFMDlcdUQ1NjlcdUFDQzQgPSBcdUFDRjVcdUFFMDlcdUFDMDAgXHUwMEQ3IGJhc2VGYWN0b3IgXHUwMEQ3IGdyYWRlTXVsIFx1MDBENyBvY2N1cGllZEZhY3RvciBcdTAwRDcgZWxldmF0b3JGYWN0b3Jcbi8vICAgXHVDRDVDXHVDODg1ID0gXHVCM0M0XHVBRTA5XHVENTY5XHVBQ0M0IFx1MDBENyAxLjEwIChWQVQpXG4vL1xuLy8gXHVCQ0Y0XHVDODE1XHVBQ0M0XHVDMjE4OlxuLy8gICAtIGJhc2VGYWN0b3I6IFx1QzhGQ1x1QUM3MFx1RDYxNVx1RDBEQ1x1QkNDNCAoMC45NSB+IDEuMjUpXG4vLyAgIC0gZ3JhZGVNdWw6IFx1Q0VFOFx1QzE0OVx1QkNDNCAoMS4wIH4gMS44KVxuLy8gICAtIG9jY3VwaWVkRmFjdG9yOiBcdUFDNzBcdUM4RkNcdUM5MTEgXHVDMkRDXHVBQ0Y1IFx1MDBENzEuMTBcbi8vICAgLSBlbGV2YXRvckZhY3RvcjogNFx1Q0UzNSsgXHVCQjM0XHVDNUQ4XHVCOUFDXHVCQ0EwXHVDNzc0XHVEMTMwIFx1MDBENzEuMDUgKFx1QzU5MVx1QzkxMVx1QkU0NClcbi8vXG4vLyBcdUM4MDhcdUIzMDAgXHVBRERDXHVDRTU5OiBcdUIyRThcdUFDMDAgXHVDRDk0XHVDODE1IFx1QUUwOFx1QzlDMCBcdTIwMTQgXHVDMkU0XHVDODFDIGNvc3RfaXRlbXMgREJcdUM1RDBcdUMxMUMgTE9BRFxuXG5jb25zdCB7IGdldFJlc2lkZW5jZSB9ID0gcmVxdWlyZSgnLi4vbWF0cmljZXMvUmVzaWRlbmNlTWF0cml4LmNqcycpO1xuY29uc3QgeyBnZXRHcmFkZU11bCB9ID0gcmVxdWlyZSgnLi4vbWF0cmljZXMvQ29uY2VwdE1hdGVyaWFsTWF0cml4LmNqcycpO1xuXG5jb25zdCBWQVRfUkFURSA9IDAuMTA7XG5jb25zdCBCQVNFX0NPTlRSQUNUX1JBVElPID0gMS4xNTtcblxuZnVuY3Rpb24gY2FsY1N1cHBseUFtb3VudChsaW5lSXRlbXMpIHtcbiAgbGV0IHRvdGFsID0gMDtcbiAgbGluZUl0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXQpIHtcbiAgICBjb25zdCBxdHkgPSBpdC5xdHkgfHwgMDtcbiAgICBjb25zdCB3YXN0ZSA9IGl0Lndhc3RlUmF0ZSB8fCAwO1xuICAgIGNvbnN0IGxhYm9yID0gaXQubGFib3JDb3N0IHx8IDA7XG4gICAgY29uc3QgcG0gPSBpdC5wbSB8fCAwO1xuICAgIGNvbnN0IG1hdGVyaWFsID0gaXQubWF0ZXJpYWxDb3N0IHx8IDA7XG4gICAgY29uc3QgZXF1aXAgPSBpdC5lcXVpcG1lbnQgfHwgMDtcbiAgICBjb25zdCBhY2Nlc3MgPSBpdC5hY2Nlc3NvcnkgfHwgMDtcbiAgICBjb25zdCBkaWZmID0gaXQuZGlmZmljdWx0eUFkanVzdCB8fCAwO1xuXG4gICAgY29uc3QgbGluZUNvc3QgPSBxdHkgKiAoMSArIHdhc3RlKSAqIChsYWJvciAqIHBtICsgbWF0ZXJpYWwpICsgZXF1aXAgKyBhY2Nlc3MgKyBkaWZmO1xuICAgIHRvdGFsICs9IGxpbmVDb3N0O1xuICB9KTtcbiAgcmV0dXJuIE1hdGgucm91bmQodG90YWwpO1xufVxuXG5mdW5jdGlvbiBjYWxjQ29udHJhY3RBbW91bnQoc3VwcGx5LCBvcHRzKSB7XG4gIGNvbnN0IGJhc2VGYWN0b3IgICAgICA9IG9wdHMuYmFzZUZhY3RvciB8fCAxLjA7XG4gIGNvbnN0IGdyYWRlTXVsICAgICAgICA9IG9wdHMuZ3JhZGVNdWwgfHwgMS4wO1xuICBjb25zdCBvY2N1cGllZEZhY3RvciAgPSBvcHRzLm9jY3VwaWVkID8gMS4xMCA6IDEuMDtcbiAgY29uc3QgZWxldmF0b3JGYWN0b3IgID0gb3B0cy5mbG9vckxldmVsID49IDQgJiYgIW9wdHMuaGFzRWxldiA/IDEuMDUgOiAxLjA7XG5cbiAgcmV0dXJuIE1hdGgucm91bmQoXG4gICAgc3VwcGx5ICogQkFTRV9DT05UUkFDVF9SQVRJTyAqIGJhc2VGYWN0b3IgKiBncmFkZU11bCAqIG9jY3VwaWVkRmFjdG9yICogZWxldmF0b3JGYWN0b3JcbiAgKTtcbn1cblxuZnVuY3Rpb24gY2FsY0ZpbmFsQW1vdW50KGNvbnRyYWN0KSB7XG4gIHJldHVybiBNYXRoLnJvdW5kKGNvbnRyYWN0ICogKDEgKyBWQVRfUkFURSkpO1xufVxuXG5mdW5jdGlvbiBjYWxjdWxhdGVFc3RpbWF0ZShpbnB1dCkge1xuICBpZiAoIWlucHV0IHx8ICFBcnJheS5pc0FycmF5KGlucHV0LmxpbmVJdGVtcykpIHtcbiAgICByZXR1cm4geyBvazogZmFsc2UsIGVycm9yczogWydsaW5lSXRlbXMgXHVCQzMwXHVDNUY0IFx1RDU0NFx1QzIxOCddIH07XG4gIH1cblxuICBjb25zdCBzdXBwbHkgPSBjYWxjU3VwcGx5QW1vdW50KGlucHV0LmxpbmVJdGVtcyk7XG5cbiAgY29uc3QgcmVzaWRlbmNlRGF0YSA9IGdldFJlc2lkZW5jZShpbnB1dC5yZXNpZGVuY2UpO1xuICBjb25zdCBiYXNlRmFjdG9yID0gcmVzaWRlbmNlRGF0YSA/IHJlc2lkZW5jZURhdGEuYmFzZUZhY3RvciA6IDEuMDtcbiAgY29uc3QgZ3JhZGVNdWwgPSBnZXRHcmFkZU11bChpbnB1dC5jb25jZXB0KTtcblxuICBjb25zdCBjb250cmFjdCA9IGNhbGNDb250cmFjdEFtb3VudChzdXBwbHksIHtcbiAgICBiYXNlRmFjdG9yOiBiYXNlRmFjdG9yLFxuICAgIGdyYWRlTXVsOiBncmFkZU11bCxcbiAgICBvY2N1cGllZDogaW5wdXQub2NjdXBpZWQsXG4gICAgZmxvb3JMZXZlbDogaW5wdXQuZmxvb3JMZXZlbCxcbiAgICBoYXNFbGV2OiBpbnB1dC5oYXNFbGV2XG4gIH0pO1xuXG4gIGNvbnN0IGZpbmFsMiA9IGNhbGNGaW5hbEFtb3VudChjb250cmFjdCk7XG5cbiAgY29uc3QgYXJlYVNxbSA9IGlucHV0LmFyZWFTcW0gfHwgMDtcbiAgY29uc3Qgc3FtUHJpY2UgPSBhcmVhU3FtID4gMCA/IE1hdGgucm91bmQoZmluYWwyIC8gYXJlYVNxbSkgOiAwO1xuICBjb25zdCBweVByaWNlID0gYXJlYVNxbSA+IDAgPyBNYXRoLnJvdW5kKGZpbmFsMiAvIChhcmVhU3FtIC8gMy4zMDU4KSkgOiAwO1xuXG4gIGNvbnN0IG1hcmdpbiA9IGNvbnRyYWN0ID4gMCA/ICgoY29udHJhY3QgLSBzdXBwbHkpIC8gY29udHJhY3QgKiAxMDApIDogMDtcblxuICByZXR1cm4ge1xuICAgIG9rOiB0cnVlLFxuICAgIHBheWxvYWQ6IHtcbiAgICAgIHN1cHBseTogc3VwcGx5LFxuICAgICAgY29udHJhY3Q6IGNvbnRyYWN0LFxuICAgICAgZmluYWw6IGZpbmFsMixcbiAgICAgIGFyZWFTcW06IGFyZWFTcW0sXG4gICAgICBzcW1QcmljZTogc3FtUHJpY2UsXG4gICAgICBweVByaWNlOiBweVByaWNlLFxuICAgICAgbWFyZ2luOiBwYXJzZUZsb2F0KG1hcmdpbi50b0ZpeGVkKDEpKSxcbiAgICAgIGZhY3RvcnM6IHtcbiAgICAgICAgYmFzZUZhY3RvcjogYmFzZUZhY3RvcixcbiAgICAgICAgZ3JhZGVNdWw6IGdyYWRlTXVsLFxuICAgICAgICBvY2N1cGllZDogISFpbnB1dC5vY2N1cGllZCxcbiAgICAgICAgZWxldmF0b3I6IGlucHV0LmZsb29yTGV2ZWwgPj0gNCAmJiAhaW5wdXQuaGFzRWxldlxuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNhbGNTdXBwbHlBbW91bnQ6IGNhbGNTdXBwbHlBbW91bnQsXG4gIGNhbGNDb250cmFjdEFtb3VudDogY2FsY0NvbnRyYWN0QW1vdW50LFxuICBjYWxjRmluYWxBbW91bnQ6IGNhbGNGaW5hbEFtb3VudCxcbiAgY2FsY3VsYXRlRXN0aW1hdGU6IGNhbGN1bGF0ZUVzdGltYXRlLFxuICBWQVRfUkFURTogVkFUX1JBVEUsXG4gIEJBU0VfQ09OVFJBQ1RfUkFUSU86IEJBU0VfQ09OVFJBQ1RfUkFUSU9cbn07XG4iLCAiLy8gRUNPUkVBTiBCT0MgdjUuNiBcdTIwMTQgXHVDMkRDXHVBQ0Y1IFx1QzEzOVx1QzE1OCAyMlx1QUMxQyBcdUJDRjggXHVCOUU0XHVEMkI4XHVCOUFEXHVDMkE0XG4vLyBTb1Q6IGRvY3MvTUFTVEVSX1BMQU4ubWQgXHUwMEE3NiBTVEVQIDAgKyBcdUJEODBcdUI4NUQgSVxuXG5jb25zdCBTRUNUSU9OUyA9IHtcbiAgLy8gXHVBREY4XHVCOEY5IEE6IFx1QzhGQ1x1QUM3MCBcdUFDRjVcdUFDMDQgKDYpIFx1MjAxNCBcdUQ1NDRcdUMyMThcbiAgUkVTSURFTlRJQUw6IHtcbiAgICBsaXZpbmc6ICAgIHsgbmFtZTogJ1x1QUM3MFx1QzJFNCcsICAgICAgICAgICBncm91cDogJ0EnLCByZXF1aXJlZDogdHJ1ZSwgIHNwYWNlczogWydMSVZJTkcnXSB9LFxuICAgIGJlZHJvb206ICAgeyBuYW1lOiAnXHVDRTY4XHVDMkU0JywgICAgICAgICAgIGdyb3VwOiAnQScsIHJlcXVpcmVkOiB0cnVlLCAgc3BhY2VzOiBbJ01BU1RFUl9CRURST09NJywnQkVEUk9PTScsJ1NNQUxMX0JFRFJPT00nXSB9LFxuICAgIGtpdGNoZW46ICAgeyBuYW1lOiAnXHVDOEZDXHVCQzI5JywgICAgICAgICAgIGdyb3VwOiAnQScsIHJlcXVpcmVkOiB0cnVlLCAgc3BhY2VzOiBbJ0tJVENIRU4nXSB9LFxuICAgIGJhdGhyb29tOiAgeyBuYW1lOiAnXHVDNjk1XHVDMkU0JywgICAgICAgICAgIGdyb3VwOiAnQScsIHJlcXVpcmVkOiB0cnVlLCAgc3BhY2VzOiBbJ0JBVEhST09NJ10gfSxcbiAgICBiYWxjb255OiAgIHsgbmFtZTogJ1x1QkMxQ1x1Q0Y1NFx1QjJDOC9cdUQxNENcdUI3N0NcdUMyQTQnLCAgIGdyb3VwOiAnQScsIHJlcXVpcmVkOiBmYWxzZSwgc3BhY2VzOiBbJ0JBTENPTlknLCdURVJSQUNFJ10gfSxcbiAgICBlbnRyYW5jZTogIHsgbmFtZTogJ1x1RDYwNFx1QUQwMCcsICAgICAgICAgICBncm91cDogJ0EnLCByZXF1aXJlZDogdHJ1ZSwgIHNwYWNlczogWydFTlRSQU5DRSddIH1cbiAgfSxcbiAgLy8gXHVBREY4XHVCOEY5IEI6IFx1QkQ4MFx1QUMwMCBcdUFDRjVcdUFDMDQgKDYpIFx1MjAxNCBcdUQzQzlcdUQ2MTUvXHVENTQ0XHVDNjk0XHVDMkRDXG4gIEFVWElMSUFSWToge1xuICAgIGRyZXNzaW5nOiAgeyBuYW1lOiAnXHVCNERDXHVCODA4XHVDMkE0XHVCOEY4JywgICAgICAgZ3JvdXA6ICdCJywgcmVxdWlyZWQ6IGZhbHNlLCBzcGFjZXM6IFsnRFJFU1NJTkcnXSB9LFxuICAgIHN0dWR5OiAgICAgeyBuYW1lOiAnXHVDMTFDXHVDN0FDJywgICAgICAgICAgIGdyb3VwOiAnQicsIHJlcXVpcmVkOiBmYWxzZSwgc3BhY2VzOiBbJ1NUVURZJ10gfSxcbiAgICBkaW5pbmc6ICAgIHsgbmFtZTogJ1x1QzJERFx1QjJGOScsICAgICAgICAgICBncm91cDogJ0InLCByZXF1aXJlZDogZmFsc2UsIHNwYWNlczogWydESU5JTkcnXSB9LFxuICAgIHBhbnRyeTogICAgeyBuYW1lOiAnXHVEMzJDXHVEMkI4XHVCOUFDJywgICAgICAgICBncm91cDogJ0InLCByZXF1aXJlZDogZmFsc2UsIHNwYWNlczogWydQQU5UUlknXSB9LFxuICAgIHV0aWxpdHk6ICAgeyBuYW1lOiAnXHVCMkU0XHVDNkE5XHVCM0M0XHVDMkU0JywgICAgICAgZ3JvdXA6ICdCJywgcmVxdWlyZWQ6IGZhbHNlLCBzcGFjZXM6IFsnVVRJTElUWSddIH0sXG4gICAgcG93ZGVyOiAgICB7IG5hbWU6ICdcdUQzMENcdUM2QjBcdUIzNTRcdUI4RjgnLCAgICAgICBncm91cDogJ0InLCByZXF1aXJlZDogZmFsc2UsIHNwYWNlczogWydQT1dERVJfUk9PTSddIH1cbiAgfSxcbiAgLy8gXHVBREY4XHVCOEY5IEM6IFx1RDJCOVx1QzIxOCBcdUFDRjVcdUFDMDQgKDUpIFx1MjAxNCBcdUIyRThcdUIzQzUvXHVCMzAwXHVENjE1XG4gIFNQRUNJQUw6IHtcbiAgICBib2lsZXI6ICAgIHsgbmFtZTogJ1x1QkNGNFx1Qzc3Q1x1QjdFQ1x1QzJFNCcsICAgICAgIGdyb3VwOiAnQycsIHJlcXVpcmVkOiBmYWxzZSwgc3BhY2VzOiBbJ0JPSUxFUiddLCAgICAgcmVzaWRlbmNlczogWydERVRBQ0hFRF8xRicsJ0RFVEFDSEVEXzJGJywnVklMTEEnXSB9LFxuICAgIGhhbGx3YXk6ICAgeyBuYW1lOiAnXHVCQ0Y1XHVCM0M0JywgICAgICAgICAgIGdyb3VwOiAnQycsIHJlcXVpcmVkOiBmYWxzZSwgc3BhY2VzOiBbJ0hBTExXQVknXSB9LFxuICAgIHN0YWlyczogICAgeyBuYW1lOiAnXHVBQ0M0XHVCMkU4JywgICAgICAgICAgIGdyb3VwOiAnQycsIHJlcXVpcmVkOiBmYWxzZSwgc3BhY2VzOiBbJ1NUQUlSUyddLCAgICAgcmVzaWRlbmNlczogWydERVRBQ0hFRF8yRiddIH0sXG4gICAgcm9vZnRvcDogICB7IG5hbWU6ICdcdUM2MjVcdUMwQzEnLCAgICAgICAgICAgZ3JvdXA6ICdDJywgcmVxdWlyZWQ6IGZhbHNlLCBzcGFjZXM6IFsnUk9PRlRPUCddLCAgICByZXNpZGVuY2VzOiBbJ0RFVEFDSEVEXzFGJywnREVUQUNIRURfMkYnLCdQRU5USE9VU0UnXSB9LFxuICAgIGJhc2VtZW50OiAgeyBuYW1lOiAnXHVDOUMwXHVENTU4L1x1QjJFNFx1Qjc3RCcsICAgICAgZ3JvdXA6ICdDJywgcmVxdWlyZWQ6IGZhbHNlLCBzcGFjZXM6IFsnQkFTRU1FTlQnLCdBVFRJQyddLCByZXNpZGVuY2VzOiBbJ0RFVEFDSEVEXzFGJywnREVUQUNIRURfMkYnXSB9XG4gIH0sXG4gIC8vIFx1QURGOFx1QjhGOSBEOiBcdUFDRjVcdUM4MTUgKDUpIFx1MjAxNCBcdUM4MDRcdUNDQjQgXHVDNjAxXHVENUE1XG4gIFBST0NFU1M6IHtcbiAgICBwbHVtYmluZzogIHsgbmFtZTogJ1x1QkMzMFx1QUQwMCcsICAgICAgICAgICBncm91cDogJ0QnLCByZXF1aXJlZDogdHJ1ZSwgIHR5cGU6ICdwcm9jZXNzJyB9LFxuICAgIGVsZWN0cmljOiAgeyBuYW1lOiAnXHVDODA0XHVBRTMwJywgICAgICAgICAgIGdyb3VwOiAnRCcsIHJlcXVpcmVkOiB0cnVlLCAgdHlwZTogJ3Byb2Nlc3MnIH0sXG4gICAgd2luZG93OiAgICB7IG5hbWU6ICdcdUNDM0RcdUQ2MzgnLCAgICAgICAgICAgZ3JvdXA6ICdEJywgcmVxdWlyZWQ6IHRydWUsICB0eXBlOiAncHJvY2VzcycgfSxcbiAgICBpbnN1bGF0aW9uOnsgbmFtZTogJ1x1QjJFOFx1QzVGNChcdUM2NzhcdUJDQkQpJywgICAgICBncm91cDogJ0QnLCByZXF1aXJlZDogZmFsc2UsIHR5cGU6ICdwcm9jZXNzJywgcmVzaWRlbmNlczogWydERVRBQ0hFRF8xRicsJ0RFVEFDSEVEXzJGJywnUEVOVEhPVVNFJ10gfSxcbiAgICBleHRlcmlvcjogIHsgbmFtZTogJ1x1QzY3OFx1QzdBNS9cdUM5QzBcdUJEOTUnLCAgICAgICBncm91cDogJ0QnLCByZXF1aXJlZDogZmFsc2UsIHR5cGU6ICdwcm9jZXNzJywgcmVzaWRlbmNlczogWydERVRBQ0hFRF8xRicsJ0RFVEFDSEVEXzJGJ10gfVxuICB9XG59O1xuXG5mdW5jdGlvbiBnZXRBbGxTZWN0aW9uSWRzKCkge1xuICBjb25zdCBpZHMgPSBbXTtcbiAgWydSRVNJREVOVElBTCcsJ0FVWElMSUFSWScsJ1NQRUNJQUwnLCdQUk9DRVNTJ10uZm9yRWFjaChmdW5jdGlvbihncm91cCkge1xuICAgIE9iamVjdC5rZXlzKFNFQ1RJT05TW2dyb3VwXSkuZm9yRWFjaChmdW5jdGlvbihpZCkgeyBpZHMucHVzaChpZCk7IH0pO1xuICB9KTtcbiAgcmV0dXJuIGlkcztcbn1cblxuZnVuY3Rpb24gZ2V0U3BhY2VzRm9yU2VjdGlvbnMoc2VjdGlvbklkcykge1xuICBjb25zdCByZXN1bHQgPSBuZXcgU2V0KCk7XG4gIGNvbnN0IGFsbCA9IFNFQ1RJT05TO1xuICBzZWN0aW9uSWRzLmZvckVhY2goZnVuY3Rpb24oc2VjSWQpIHtcbiAgICBbJ1JFU0lERU5USUFMJywnQVVYSUxJQVJZJywnU1BFQ0lBTCcsJ1BST0NFU1MnXS5mb3JFYWNoKGZ1bmN0aW9uKGdyb3VwKSB7XG4gICAgICBjb25zdCBzZWMgPSBhbGxbZ3JvdXBdW3NlY0lkXTtcbiAgICAgIGlmIChzZWMgJiYgc2VjLnNwYWNlcykge1xuICAgICAgICBzZWMuc3BhY2VzLmZvckVhY2goZnVuY3Rpb24ocykgeyByZXN1bHQuYWRkKHMpOyB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBBcnJheS5mcm9tKHJlc3VsdCk7XG59XG5cbmZ1bmN0aW9uIGdldEF2YWlsYWJsZVNlY3Rpb25zKHJlc2lkZW5jZSkge1xuICBjb25zdCBpZHMgPSBbXTtcbiAgWydSRVNJREVOVElBTCcsJ0FVWElMSUFSWScsJ1NQRUNJQUwnLCdQUk9DRVNTJ10uZm9yRWFjaChmdW5jdGlvbihncm91cCkge1xuICAgIE9iamVjdC5rZXlzKFNFQ1RJT05TW2dyb3VwXSkuZm9yRWFjaChmdW5jdGlvbihpZCkge1xuICAgICAgY29uc3Qgc2VjID0gU0VDVElPTlNbZ3JvdXBdW2lkXTtcbiAgICAgIGlmICghc2VjLnJlc2lkZW5jZXMgfHwgc2VjLnJlc2lkZW5jZXMuaW5jbHVkZXMocmVzaWRlbmNlKSkge1xuICAgICAgICBpZHMucHVzaChpZCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gaWRzO1xufVxuXG5mdW5jdGlvbiBnZXRTZWN0aW9uKGlkKSB7XG4gIGxldCByZXN1bHQgPSBudWxsO1xuICBbJ1JFU0lERU5USUFMJywnQVVYSUxJQVJZJywnU1BFQ0lBTCcsJ1BST0NFU1MnXS5mb3JFYWNoKGZ1bmN0aW9uKGdyb3VwKSB7XG4gICAgaWYgKFNFQ1RJT05TW2dyb3VwXVtpZF0pIHJlc3VsdCA9IFNFQ1RJT05TW2dyb3VwXVtpZF07XG4gIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgU0VDVElPTlM6IFNFQ1RJT05TLFxuICBnZXRBbGxTZWN0aW9uSWRzOiBnZXRBbGxTZWN0aW9uSWRzLFxuICBnZXRTcGFjZXNGb3JTZWN0aW9uczogZ2V0U3BhY2VzRm9yU2VjdGlvbnMsXG4gIGdldEF2YWlsYWJsZVNlY3Rpb25zOiBnZXRBdmFpbGFibGVTZWN0aW9ucyxcbiAgZ2V0U2VjdGlvbjogZ2V0U2VjdGlvblxufTtcbiIsICIvLyBFQ09SRUFOIEJPQyB2Ni4wIFx1MjAxNCBXaXphcmQgQ29udHJvbGxlclxuLy8gNVx1QjJFOCBcdUFDOENcdUM3NzRcdUQyQjggXHVDOUM0XHVENTg5IFx1QzBDMVx1RDBEQyBcdUFEMDBcdUI5QUMgKyBQaGFzZSAzIFx1QkMzMVx1QzVENFx1QjREQyBcdUM1RjBcdUFDQjBcblxuY29uc3QgeyBHMVR5cGUgfSA9IHJlcXVpcmUoJ0BnYXRlcy9HMV9UeXBlLmNqcycpO1xuY29uc3QgeyBHMkNvbmNlcHQgfSA9IHJlcXVpcmUoJ0BnYXRlcy9HMl9Db25jZXB0LmNqcycpO1xuY29uc3QgeyBHM1NlY3Rpb24gfSA9IHJlcXVpcmUoJ0BnYXRlcy9HM19TZWN0aW9uLmNqcycpO1xuY29uc3QgeyBHNENBRCB9ID0gcmVxdWlyZSgnQGdhdGVzL0c0X0NBRC5janMnKTtcbmNvbnN0IHsgRzVNYXRlcmlhbCB9ID0gcmVxdWlyZSgnQGdhdGVzL0c1X01hdGVyaWFsLmNqcycpO1xuY29uc3QgeyBHYXRlUmVnaXN0cnkgfSA9IHJlcXVpcmUoJ0BnYXRlcy9HYXRlLmNqcycpO1xuY29uc3QgeyBjYWxjdWxhdGVFc3RpbWF0ZSB9ID0gcmVxdWlyZSgnQGVzdGltYXRlLXY2L2NhbGMvQ2FsY0VuZ2luZVY1Ni5janMnKTtcbmNvbnN0IHsgZ2V0U3BhY2VzRm9yU2VjdGlvbnMgfSA9IHJlcXVpcmUoJ0Blc3RpbWF0ZS12Ni9tYXRyaWNlcy9TZWN0aW9ucy5janMnKTtcblxuLy8gNSBcdUIyRThcdUFDQzQgXHVDODE1XHVDNzU4XG5jb25zdCBTVEFHRVMgPSB7XG4gIEcxOiB7IGlkOiAnRzEnLCBuYW1lOiAnXHVDNzIwXHVENjE1JywgICBhdXRvbWF0aW9uOiAzMCB9LFxuICBHMjogeyBpZDogJ0cyJywgbmFtZTogJ1x1Q0VFOFx1QzE0OScsICAgYXV0b21hdGlvbjogNzAgfSxcbiAgRzM6IHsgaWQ6ICdHMycsIG5hbWU6ICdcdUMxMzlcdUMxNTgnLCAgIGF1dG9tYXRpb246IDg1IH0sXG4gIEc0OiB7IGlkOiAnRzQnLCBuYW1lOiAnQ0FEJywgICAgYXV0b21hdGlvbjogOTUgfSxcbiAgRzU6IHsgaWQ6ICdHNScsIG5hbWU6ICdcdUM3OTBcdUM3QUMnLCAgIGF1dG9tYXRpb246IDk5IH1cbn07XG5cbmNsYXNzIFdpemFyZENvbnRyb2xsZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnJlZ2lzdHJ5ID0gbmV3IEdhdGVSZWdpc3RyeSgpO1xuICAgIHRoaXMuZzEgPSBuZXcgRzFUeXBlKCk7XG4gICAgdGhpcy5nMiA9IG5ldyBHMkNvbmNlcHQoKTtcbiAgICB0aGlzLmczID0gbmV3IEczU2VjdGlvbigpO1xuICAgIHRoaXMuZzQgPSBuZXcgRzRDQUQoKTtcbiAgICB0aGlzLmc1ID0gbmV3IEc1TWF0ZXJpYWwoKTtcbiAgICB0aGlzLnJlZ2lzdHJ5LnJlZ2lzdGVyKHRoaXMuZzEpO1xuICAgIHRoaXMucmVnaXN0cnkucmVnaXN0ZXIodGhpcy5nMik7XG4gICAgdGhpcy5yZWdpc3RyeS5yZWdpc3Rlcih0aGlzLmczKTtcbiAgICB0aGlzLnJlZ2lzdHJ5LnJlZ2lzdGVyKHRoaXMuZzQpO1xuICAgIHRoaXMucmVnaXN0cnkucmVnaXN0ZXIodGhpcy5nNSk7XG5cbiAgICB0aGlzLmlucHV0ID0ge1xuICAgICAgcmVzaWRlbmNlOiBudWxsLFxuICAgICAgcHllb25nOiBudWxsLFxuICAgICAgY29uY2VwdDogbnVsbCxcbiAgICAgIHNlY3Rpb25zOiBbXSxcbiAgICAgIHNwYWNlczogW10sXG4gICAgICBtYXRlcmlhbHM6IFtdXG4gICAgfTtcblxuICAgIHRoaXMubG9ja2VkR2F0ZXMgPSBbXTtcbiAgICB0aGlzLmN1cnJlbnRTdGFnZSA9ICdHMSc7XG4gICAgdGhpcy5lc3RpbWF0ZSA9IG51bGw7XG4gICAgdGhpcy5saXN0ZW5lcnMgPSBuZXcgU2V0KCk7XG4gIH1cblxuICBzdWJzY3JpYmUoaGFuZGxlcikge1xuICAgIHRoaXMubGlzdGVuZXJzLmFkZChoYW5kbGVyKTtcbiAgICByZXR1cm4gKCkgPT4gdGhpcy5saXN0ZW5lcnMuZGVsZXRlKGhhbmRsZXIpO1xuICB9XG5cbiAgX2VtaXQoZXZlbnRUeXBlLCBwYXlsb2FkKSB7XG4gICAgdGhpcy5saXN0ZW5lcnMuZm9yRWFjaChoID0+IGgoZXZlbnRUeXBlLCBwYXlsb2FkKSk7XG4gIH1cblxuICBnZXRBdXRvbWF0aW9uKCkge1xuICAgIGlmICh0aGlzLmxvY2tlZEdhdGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDA7XG4gICAgY29uc3QgbGFzdExvY2tlZCA9IHRoaXMubG9ja2VkR2F0ZXNbdGhpcy5sb2NrZWRHYXRlcy5sZW5ndGggLSAxXTtcbiAgICByZXR1cm4gU1RBR0VTW2xhc3RMb2NrZWRdLmF1dG9tYXRpb247XG4gIH1cblxuICBsb2NrRzEob3B0cykge1xuICAgIGlmICghb3B0cy5yZXNpZGVuY2UgfHwgIW9wdHMucHllb25nKSB7XG4gICAgICByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAncmVzaWRlbmNlLCBweWVvbmcgXHVENTQ0XHVDMjE4JyB9O1xuICAgIH1cbiAgICBjb25zdCByID0gdGhpcy5nMS5sb2NrKHsgcmVzaWRlbmNlOiBvcHRzLnJlc2lkZW5jZSwgcHllb25nOiBvcHRzLnB5ZW9uZyB9LCB0aGlzLnJlZ2lzdHJ5KTtcbiAgICBpZiAoci5vaykge1xuICAgICAgdGhpcy5pbnB1dC5yZXNpZGVuY2UgPSBvcHRzLnJlc2lkZW5jZTtcbiAgICAgIHRoaXMuaW5wdXQucHllb25nID0gb3B0cy5weWVvbmc7XG4gICAgICB0aGlzLmxvY2tlZEdhdGVzLnB1c2goJ0cxJyk7XG4gICAgICB0aGlzLmN1cnJlbnRTdGFnZSA9ICdHMic7XG4gICAgICB0aGlzLl9lbWl0KCdHQVRFX0xPQ0tFRCcsIHsgZ2F0ZTogJ0cxJywgaW5wdXQ6IG9wdHMsIGF1dG9tYXRpb246IHRoaXMuZ2V0QXV0b21hdGlvbigpIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcjtcbiAgfVxuXG4gIGxvY2tHMihvcHRzKSB7XG4gICAgaWYgKCFvcHRzLmNvbmNlcHQpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdjb25jZXB0IFx1RDU0NFx1QzIxOCcgfTtcbiAgICBpZiAoIXRoaXMubG9ja2VkR2F0ZXMuaW5jbHVkZXMoJ0cxJykpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdHMSBcdUJBM0NcdUM4MDAnIH07XG4gICAgY29uc3QgciA9IHRoaXMuZzIubG9jayh7IGNvbmNlcHQ6IG9wdHMuY29uY2VwdCB9LCB0aGlzLnJlZ2lzdHJ5KTtcbiAgICBpZiAoci5vaykge1xuICAgICAgdGhpcy5pbnB1dC5jb25jZXB0ID0gb3B0cy5jb25jZXB0O1xuICAgICAgdGhpcy5sb2NrZWRHYXRlcy5wdXNoKCdHMicpO1xuICAgICAgdGhpcy5jdXJyZW50U3RhZ2UgPSAnRzMnO1xuICAgICAgdGhpcy5fZW1pdCgnR0FURV9MT0NLRUQnLCB7IGdhdGU6ICdHMicsIGlucHV0OiBvcHRzLCBhdXRvbWF0aW9uOiB0aGlzLmdldEF1dG9tYXRpb24oKSB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG4gIH1cblxuICBsb2NrRzMob3B0cykge1xuICAgIGlmICghb3B0cy5zZWN0aW9ucyB8fCBvcHRzLnNlY3Rpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ3NlY3Rpb25zIDFcdUFDMUMgXHVDNzc0XHVDMEMxIFx1RDU0NFx1QzIxOCcgfTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmxvY2tlZEdhdGVzLmluY2x1ZGVzKCdHMicpKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnRzIgXHVCQTNDXHVDODAwJyB9O1xuICAgIGNvbnN0IHIgPSB0aGlzLmczLmxvY2soeyBzZWN0aW9uczogb3B0cy5zZWN0aW9ucyB9LCB0aGlzLnJlZ2lzdHJ5KTtcbiAgICBpZiAoci5vaykge1xuICAgICAgdGhpcy5pbnB1dC5zZWN0aW9ucyA9IG9wdHMuc2VjdGlvbnM7XG4gICAgICB0aGlzLmxvY2tlZEdhdGVzLnB1c2goJ0czJyk7XG4gICAgICB0aGlzLmN1cnJlbnRTdGFnZSA9ICdHNCc7XG4gICAgICBjb25zdCBhdXRvU3BhY2VzID0gZ2V0U3BhY2VzRm9yU2VjdGlvbnMob3B0cy5zZWN0aW9ucyk7XG4gICAgICB0aGlzLl9lbWl0KCdHQVRFX0xPQ0tFRCcsIHtcbiAgICAgICAgZ2F0ZTogJ0czJyxcbiAgICAgICAgaW5wdXQ6IG9wdHMsXG4gICAgICAgIGF1dG9TcGFjZXM6IGF1dG9TcGFjZXMsXG4gICAgICAgIGF1dG9tYXRpb246IHRoaXMuZ2V0QXV0b21hdGlvbigpXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG4gIH1cblxuICBhc3luYyBsb2NrRzQob3B0cykge1xuICAgIGlmICghb3B0cy5zcGFjZXMgfHwgb3B0cy5zcGFjZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnc3BhY2VzIFx1QkE3NFx1QzgwMSBcdUQ1NDRcdUMyMTgnIH07XG4gICAgfVxuICAgIGlmICghdGhpcy5sb2NrZWRHYXRlcy5pbmNsdWRlcygnRzMnKSkgcmV0dXJuIHsgb2s6IGZhbHNlLCBlcnJvcjogJ0czIFx1QkEzQ1x1QzgwMCcgfTtcbiAgICBjb25zdCByID0gdGhpcy5nNC5sb2NrKHsgc3BhY2VzOiBvcHRzLnNwYWNlcyB9LCB0aGlzLnJlZ2lzdHJ5KTtcbiAgICBpZiAoci5vaykge1xuICAgICAgdGhpcy5pbnB1dC5zcGFjZXMgPSBvcHRzLnNwYWNlcztcbiAgICAgIHRoaXMubG9ja2VkR2F0ZXMucHVzaCgnRzQnKTtcbiAgICAgIHRoaXMuY3VycmVudFN0YWdlID0gJ0c1JztcbiAgICAgIGF3YWl0IHRoaXMuX2NhbGN1bGF0ZUVzdGltYXRlKCk7XG4gICAgICB0aGlzLl9lbWl0KCdHQVRFX0xPQ0tFRCcsIHtcbiAgICAgICAgZ2F0ZTogJ0c0JyxcbiAgICAgICAgaW5wdXQ6IG9wdHMsXG4gICAgICAgIGVzdGltYXRlOiB0aGlzLmVzdGltYXRlLFxuICAgICAgICBhdXRvbWF0aW9uOiB0aGlzLmdldEF1dG9tYXRpb24oKVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByO1xuICB9XG5cbiAgYXN5bmMgbG9ja0c1KG9wdHMpIHtcbiAgICBpZiAoIXRoaXMubG9ja2VkR2F0ZXMuaW5jbHVkZXMoJ0c0JykpIHJldHVybiB7IG9rOiBmYWxzZSwgZXJyb3I6ICdHNCBcdUJBM0NcdUM4MDAnIH07XG4gICAgY29uc3QgciA9IHRoaXMuZzUubG9jayh7IG1hdGVyaWFsczogb3B0cy5tYXRlcmlhbHMgfHwgW10gfSwgdGhpcy5yZWdpc3RyeSk7XG4gICAgaWYgKHIub2spIHtcbiAgICAgIHRoaXMuaW5wdXQubWF0ZXJpYWxzID0gb3B0cy5tYXRlcmlhbHMgfHwgW107XG4gICAgICB0aGlzLmxvY2tlZEdhdGVzLnB1c2goJ0c1Jyk7XG4gICAgICB0aGlzLmN1cnJlbnRTdGFnZSA9ICdDT01QTEVURSc7XG4gICAgICBhd2FpdCB0aGlzLl9jYWxjdWxhdGVFc3RpbWF0ZSgpO1xuICAgICAgdGhpcy5fZW1pdCgnR0FURV9MT0NLRUQnLCB7XG4gICAgICAgIGdhdGU6ICdHNScsXG4gICAgICAgIGlucHV0OiBvcHRzLFxuICAgICAgICBlc3RpbWF0ZTogdGhpcy5lc3RpbWF0ZSxcbiAgICAgICAgYXV0b21hdGlvbjogdGhpcy5nZXRBdXRvbWF0aW9uKClcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcjtcbiAgfVxuXG4gIGFzeW5jIF9jYWxjdWxhdGVFc3RpbWF0ZSgpIHtcbiAgICBpZiAoIXRoaXMubG9ja2VkR2F0ZXMuaW5jbHVkZXMoJ0c0JykpIHJldHVybiBudWxsO1xuXG4gICAgbGV0IGxpbmVJdGVtcztcblxuICAgIC8vIElQQ1x1Qjk3QyBcdUQxQjVcdUQ1NzQgY29zdF9pdGVtcyBEQiBcdTIxOTIgbGluZUl0ZW1zIFx1QzBERFx1QzEzMSAoRWxlY3Ryb24gXHVENjU4XHVBQ0JEKVxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuYm9jICYmIHdpbmRvdy5ib2MuY29zdCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbGluZUl0ZW1zID0gYXdhaXQgd2luZG93LmJvYy5jb3N0LmJ1aWxkTGluZUl0ZW1zKFxuICAgICAgICAgIHRoaXMuaW5wdXQuc3BhY2VzLCB0aGlzLmlucHV0LmNvbmNlcHQsIHsgdGVuYW50SWQ6ICdIUScgfVxuICAgICAgICApO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdbV2l6YXJkQ29udHJvbGxlcl0gSVBDIFx1QzJFNFx1RDMyODonLCBlKTtcbiAgICAgICAgbGluZUl0ZW1zID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBcdUJFNDQtRWxlY3Ryb24gXHVENjU4XHVBQ0JEIGZhbGxiYWNrIChcdUQxNENcdUMyQTRcdUQyQjggLyBcdUJFMENcdUI3N0NcdUM2QjBcdUM4MDAgXHVDOUMxXHVDODExIFx1QzVGNFx1QUUzMClcbiAgICBpZiAoIWxpbmVJdGVtcykge1xuICAgICAgY29uc3QgU0lNX1JBVEVTID0ge1xuICAgICAgICBCQVRIUk9PTTogeyBsYWJvcjogMTAwMDAwLCBtYXRlcmlhbDogMjAwMDAwIH0sXG4gICAgICAgIEtJVENIRU46ICB7IGxhYm9yOiA4MDAwMCwgIG1hdGVyaWFsOiAxNTAwMDAgfSxcbiAgICAgICAgTElWSU5HOiAgIHsgbGFib3I6IDYwMDAwLCAgbWF0ZXJpYWw6IDEwMDAwMCB9LFxuICAgICAgICBCRURST09NOiAgeyBsYWJvcjogNTAwMDAsICBtYXRlcmlhbDogODAwMDAgfSxcbiAgICAgICAgREVGQVVMVDogIHsgbGFib3I6IDcwMDAwLCAgbWF0ZXJpYWw6IDEwMDAwMCB9XG4gICAgICB9O1xuICAgICAgbGluZUl0ZW1zID0gdGhpcy5pbnB1dC5zcGFjZXMubWFwKHNwYWNlID0+IHtcbiAgICAgICAgY29uc3QgcmF0ZSA9IFNJTV9SQVRFU1tzcGFjZS50eXBlS2V5XSB8fCBTSU1fUkFURVMuREVGQVVMVDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBxdHk6IHNwYWNlLmFyZWFfc3FtLFxuICAgICAgICAgIHdhc3RlUmF0ZTogMC4wNSxcbiAgICAgICAgICBsYWJvckNvc3Q6IHJhdGUubGFib3IsXG4gICAgICAgICAgcG06IDEsXG4gICAgICAgICAgbWF0ZXJpYWxDb3N0OiByYXRlLm1hdGVyaWFsLFxuICAgICAgICAgIGVxdWlwbWVudDogMCxcbiAgICAgICAgICBhY2Nlc3Nvcnk6IDAsXG4gICAgICAgICAgZGlmZmljdWx0eUFkanVzdDogMFxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgdG90YWxBcmVhU3FtID0gdGhpcy5pbnB1dC5zcGFjZXMucmVkdWNlKChzdW0sIHMpID0+IHN1bSArIHMuYXJlYV9zcW0sIDApO1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuaW5wdXQuY29udGV4dCB8fCB7fTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGNhbGN1bGF0ZUVzdGltYXRlKHtcbiAgICAgIGxpbmVJdGVtczogbGluZUl0ZW1zLFxuICAgICAgcmVzaWRlbmNlOiB0aGlzLmlucHV0LnJlc2lkZW5jZSxcbiAgICAgIGNvbmNlcHQ6IHRoaXMuaW5wdXQuY29uY2VwdCxcbiAgICAgIG9jY3VwaWVkOiBjdHgub2NjdXBpZWQgPT09IHRydWUsXG4gICAgICBmbG9vckxldmVsOiBjdHguZmxvb3JMZXZlbCB8fCAxLFxuICAgICAgaGFzRWxldjogY3R4Lmhhc0VsZXYgIT09IGZhbHNlLFxuICAgICAgYXJlYVNxbTogdG90YWxBcmVhU3FtXG4gICAgfSk7XG5cbiAgICBpZiAocmVzdWx0Lm9rKSB7XG4gICAgICB0aGlzLmVzdGltYXRlID0gcmVzdWx0LnBheWxvYWQ7XG4gICAgICBjb25zdCB1bmtub3duQ291bnQgPSBsaW5lSXRlbXMuZmlsdGVyKGxpID0+IGxpLl9tZXRhICYmIGxpLl9tZXRhLmhhc1Vua25vd24pLmxlbmd0aDtcbiAgICAgIHRoaXMuZXN0aW1hdGUuX3Vua25vd25Db3VudCA9IHVua25vd25Db3VudDtcbiAgICAgIHRoaXMuX2VtaXQoJ0VTVElNQVRFX0NBTENVTEFURUQnLCB0aGlzLmVzdGltYXRlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZXN0aW1hdGU7XG4gIH1cblxuICBnb0JhY2soKSB7XG4gICAgaWYgKHRoaXMubG9ja2VkR2F0ZXMubGVuZ3RoID09PSAwKSByZXR1cm4geyBvazogZmFsc2UsIGVycm9yOiAnXHVCM0NDXHVDNTQ0XHVBQzA4IFx1QjJFOFx1QUNDNCBcdUM1QzZcdUM3NEMnIH07XG4gICAgY29uc3QgbGFzdCA9IHRoaXMubG9ja2VkR2F0ZXMucG9wKCk7XG4gICAgdGhpcy5jdXJyZW50U3RhZ2UgPSBsYXN0O1xuICAgIHRoaXMuX2VtaXQoJ0dBVEVfVU5MT0NLRUQnLCB7IGdhdGU6IGxhc3QsIGF1dG9tYXRpb246IHRoaXMuZ2V0QXV0b21hdGlvbigpIH0pO1xuICAgIHJldHVybiB7IG9rOiB0cnVlLCBnYXRlOiBsYXN0IH07XG4gIH1cblxuICByZXNldCgpIHtcbiAgICB0aGlzLmlucHV0ID0geyByZXNpZGVuY2U6IG51bGwsIHB5ZW9uZzogbnVsbCwgY29uY2VwdDogbnVsbCwgc2VjdGlvbnM6IFtdLCBzcGFjZXM6IFtdLCBtYXRlcmlhbHM6IFtdIH07XG4gICAgdGhpcy5sb2NrZWRHYXRlcyA9IFtdO1xuICAgIHRoaXMuY3VycmVudFN0YWdlID0gJ0cxJztcbiAgICB0aGlzLmVzdGltYXRlID0gbnVsbDtcbiAgICB0aGlzLnJlZ2lzdHJ5ID0gbmV3IEdhdGVSZWdpc3RyeSgpO1xuICAgIHRoaXMuZzEgPSBuZXcgRzFUeXBlKCk7XG4gICAgdGhpcy5nMiA9IG5ldyBHMkNvbmNlcHQoKTtcbiAgICB0aGlzLmczID0gbmV3IEczU2VjdGlvbigpO1xuICAgIHRoaXMuZzQgPSBuZXcgRzRDQUQoKTtcbiAgICB0aGlzLmc1ID0gbmV3IEc1TWF0ZXJpYWwoKTtcbiAgICB0aGlzLnJlZ2lzdHJ5LnJlZ2lzdGVyKHRoaXMuZzEpO1xuICAgIHRoaXMucmVnaXN0cnkucmVnaXN0ZXIodGhpcy5nMik7XG4gICAgdGhpcy5yZWdpc3RyeS5yZWdpc3Rlcih0aGlzLmczKTtcbiAgICB0aGlzLnJlZ2lzdHJ5LnJlZ2lzdGVyKHRoaXMuZzQpO1xuICAgIHRoaXMucmVnaXN0cnkucmVnaXN0ZXIodGhpcy5nNSk7XG4gICAgdGhpcy5fZW1pdCgnUkVTRVQnLCBudWxsKTtcbiAgfVxuXG4gIGdldFN0YXRlKCkge1xuICAgIHJldHVybiB7XG4gICAgICBpbnB1dDogeyAuLi50aGlzLmlucHV0IH0sXG4gICAgICBsb2NrZWRHYXRlczogWy4uLnRoaXMubG9ja2VkR2F0ZXNdLFxuICAgICAgY3VycmVudFN0YWdlOiB0aGlzLmN1cnJlbnRTdGFnZSxcbiAgICAgIGF1dG9tYXRpb246IHRoaXMuZ2V0QXV0b21hdGlvbigpLFxuICAgICAgZXN0aW1hdGU6IHRoaXMuZXN0aW1hdGVcbiAgICB9O1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBXaXphcmRDb250cm9sbGVyOiBXaXphcmRDb250cm9sbGVyLCBTVEFHRVM6IFNUQUdFUyB9O1xuIiwgIi8vIEVDT1JFQU4gQk9DIHY2LjAgXHUyMDE0IFdpemFyZCBQcm9ncmVzcyBCYXJcbi8vIDVcdUIyRTggXHVBQzhDXHVDNzc0XHVEMkI4IFx1QzlDNFx1RDU4OSArIFx1Qzc5MFx1QjNEOVx1RDY1NFx1QzcyOCBcdUMyRENcdUFDMDFcdUQ2NTRcblxuY2xhc3MgUHJvZ3Jlc3NCYXIge1xuICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgdGhpcy5jb250YWluZXJFbCA9IG9wdHMuY29udGFpbmVyRWw7XG4gICAgdGhpcy5jb250cm9sbGVyID0gb3B0cy5jb250cm9sbGVyO1xuXG4gICAgdGhpcy51bnN1YnNjcmliZSA9IHRoaXMuY29udHJvbGxlci5zdWJzY3JpYmUoKGV2dCkgPT4ge1xuICAgICAgaWYgKGV2dCA9PT0gJ0dBVEVfTE9DS0VEJyB8fCBldnQgPT09ICdHQVRFX1VOTE9DS0VEJyB8fCBldnQgPT09ICdSRVNFVCcpIHtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLmNvbnRyb2xsZXIuZ2V0U3RhdGUoKTtcbiAgICBjb25zdCBzdGFnZXMgPSBbJ0cxJywgJ0cyJywgJ0czJywgJ0c0JywgJ0c1J107XG4gICAgY29uc3Qgc3RhZ2VOYW1lcyA9IHsgRzE6ICdcdUM3MjBcdUQ2MTUnLCBHMjogJ1x1Q0VFOFx1QzE0OScsIEczOiAnXHVDMTM5XHVDMTU4JywgRzQ6ICdDQUQnLCBHNTogJ1x1Qzc5MFx1QzdBQycgfTtcblxuICAgIHRoaXMuY29udGFpbmVyRWwuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cIndpemFyZC1wcm9ncmVzc1wiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3Mtc3RhZ2VzXCI+XG4gICAgICAgICAgJHtzdGFnZXMubWFwKHN0YWdlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlzTG9ja2VkID0gc3RhdGUubG9ja2VkR2F0ZXMuaW5jbHVkZXMoc3RhZ2UpO1xuICAgICAgICAgICAgY29uc3QgaXNDdXJyZW50ID0gc3RhdGUuY3VycmVudFN0YWdlID09PSBzdGFnZTtcbiAgICAgICAgICAgIGNvbnN0IGNscyA9IGlzTG9ja2VkID8gJ2xvY2tlZCcgOiAoaXNDdXJyZW50ID8gJ2N1cnJlbnQnIDogJ3BlbmRpbmcnKTtcbiAgICAgICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdGFnZSAke2Nsc31cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3RhZ2UtY2lyY2xlXCI+XG4gICAgICAgICAgICAgICAgICAke2lzTG9ja2VkID8gJ1x1MjcxMycgOiBzdGFnZVsxXX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3RhZ2UtbGFiZWxcIj4ke3N0YWdlTmFtZXNbc3RhZ2VdfTwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgfSkuam9pbignJyl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiYXV0b21hdGlvbi1tZXRlclwiPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZXRlci1sYWJlbFwiPlxuICAgICAgICAgICAgPHNwYW4+XHVDNzkwXHVCM0Q5XHVENjU0PC9zcGFuPlxuICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJtZXRlci12YWx1ZVwiPiR7c3RhdGUuYXV0b21hdGlvbn0lPC9zcGFuPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZXRlci10cmFja1wiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1ldGVyLWZpbGxcIiBzdHlsZT1cIndpZHRoOiAke3N0YXRlLmF1dG9tYXRpb259JVwiPjwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIGA7XG4gIH1cblxuICBkZXN0cm95KCkge1xuICAgIGlmICh0aGlzLnVuc3Vic2NyaWJlKSB0aGlzLnVuc3Vic2NyaWJlKCk7XG4gICAgdGhpcy5jb250YWluZXJFbC5pbm5lckhUTUwgPSAnJztcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgUHJvZ3Jlc3NCYXI6IFByb2dyZXNzQmFyIH07XG4iLCAiLy8gRUNPUkVBTiBCT0MgdjUuNiBcdTIwMTQgXHVDOUMwXHVDNUVEXHVCQ0M0IFx1QjJFOFx1QUMwMCBcdUJDRjRcdUM4MTVcbmNvbnN0IFJFR0lPTl9GQUNUT1JTID0ge1xuICBTRU9VTF9HQU5HTkFNOiAgeyBuYW1lOiAnXHVDMTFDXHVDNkI4IFx1QUMxNVx1QjBBODNcdUFENkMnLCBmYWN0b3I6IDEuMjAsIGFyZWFzOiBbJ1x1QUMxNVx1QjBBOFx1QUQ2QycsJ1x1QzExQ1x1Q0QwOFx1QUQ2QycsJ1x1QzFBMVx1RDMwQ1x1QUQ2QyddIH0sXG4gIFNFT1VMX09USEVSOiAgICB7IG5hbWU6ICdcdUMxMUNcdUM2QjggXHVBRTMwXHVEMEMwJywgICAgZmFjdG9yOiAxLjEwLCBhcmVhczogWydcdUM4ODVcdUI4NUNcdUFENkMnLCdcdUM5MTFcdUFENkMnLCdcdUM2QTlcdUMwQjBcdUFENkMnLCdcdUMxMzFcdUIzRDlcdUFENkMnLCdcdUFEMTFcdUM5QzRcdUFENkMnLCdcdUIzRDlcdUIzMDBcdUJCMzhcdUFENkMnLCdcdUM5MTFcdUI3OTFcdUFENkMnLCdcdUMxMzFcdUJEODFcdUFENkMnLCdcdUFDMTVcdUJEODFcdUFENkMnLCdcdUIzQzRcdUJEMDlcdUFENkMnLCdcdUIxNzhcdUM2RDBcdUFENkMnLCdcdUM3NDBcdUQzQzlcdUFENkMnLCdcdUMxMUNcdUIzMDBcdUJCMzhcdUFENkMnLCdcdUI5QzhcdUQzRUNcdUFENkMnLCdcdUM1OTFcdUNDOUNcdUFENkMnLCdcdUFDMTVcdUMxMUNcdUFENkMnLCdcdUFENkNcdUI4NUNcdUFENkMnLCdcdUFFMDhcdUNDOUNcdUFENkMnLCdcdUM2MDFcdUI0RjFcdUQzRUNcdUFENkMnLCdcdUIzRDlcdUM3OTFcdUFENkMnLCdcdUFEMDBcdUM1NDVcdUFENkMnLCdcdUFDMTVcdUIzRDlcdUFENkMnXSB9LFxuICBNRVRST19CVVNBTjogICAgeyBuYW1lOiAnXHVCRDgwXHVDMEIwJywgICAgICAgICBmYWN0b3I6IDEuMDUsIGFyZWFzOiBbJ1x1QkQ4MFx1QzBCMCddIH0sXG4gIE1FVFJPX09USEVSOiAgICB7IG5hbWU6ICdcdUFEMTFcdUM1RURcdUMyREMnLCAgICAgICBmYWN0b3I6IDEuMDAsIGFyZWFzOiBbJ1x1QjMwMFx1QUQ2QycsJ1x1Qzc3OFx1Q0M5QycsJ1x1QjMwMFx1QzgwNCcsJ1x1QUQxMVx1QzhGQycsJ1x1QzZCOFx1QzBCMCddIH0sXG4gIFBST1ZJTkNFX01BSk9SOiB7IG5hbWU6ICdcdUIzQzRcdUNDQURcdUMxOENcdUM3QUNcdUM5QzAnLCAgIGZhY3RvcjogMC45NSwgYXJlYXM6IFsnXHVDMjE4XHVDNkQwJywnXHVDRDk4XHVDQzlDJywnXHVDQ0FEXHVDOEZDJywnXHVDODA0XHVDOEZDJywnXHVDQzNEXHVDNkQwJywnXHVEM0VDXHVENTZEJ10gfSxcbiAgUFJPVklOQ0VfT1RIRVI6IHsgbmFtZTogJ1x1QUUzMFx1RDBDMCBcdUM5QzBcdUJDMjknLCAgICBmYWN0b3I6IDAuOTAsIGFyZWFzOiBbXSB9LFxuICBKRUpVOiAgICAgICAgICAgeyBuYW1lOiAnXHVDODFDXHVDOEZDJywgICAgICAgICBmYWN0b3I6IDEuMTUsIGFyZWFzOiBbJ1x1QzgxQ1x1QzhGQycsJ1x1QzExQ1x1QURDMFx1RDNFQyddIH1cbn07XG5cbmZ1bmN0aW9uIGdldFJlZ2lvbkJ5QXJlYShhcmVhKSB7XG4gIGlmICghYXJlYSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHVwcGVyID0gYXJlYS50b1N0cmluZygpO1xuXG4gIGZvciAobGV0IHJlZ2lvbklkIGluIFJFR0lPTl9GQUNUT1JTKSB7XG4gICAgY29uc3QgcmVnaW9uID0gUkVHSU9OX0ZBQ1RPUlNbcmVnaW9uSWRdO1xuICAgIGlmIChyZWdpb24uYXJlYXMuc29tZShmdW5jdGlvbihhKSB7IHJldHVybiB1cHBlci5pbmNsdWRlcyhhKTsgfSkpIHtcbiAgICAgIHJldHVybiByZWdpb25JZDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuICdQUk9WSU5DRV9PVEhFUic7XG59XG5cbmZ1bmN0aW9uIGdldFJlZ2lvbkZhY3RvcihyZWdpb25JZCkge1xuICBjb25zdCByID0gUkVHSU9OX0ZBQ1RPUlNbcmVnaW9uSWRdO1xuICByZXR1cm4gciA/IHIuZmFjdG9yIDogMS4wO1xufVxuXG5mdW5jdGlvbiBnZXRSZWdpb25GYWN0b3JCeUFyZWEoYXJlYSkge1xuICBjb25zdCByZWdpb25JZCA9IGdldFJlZ2lvbkJ5QXJlYShhcmVhKTtcbiAgcmV0dXJuIGdldFJlZ2lvbkZhY3RvcihyZWdpb25JZCk7XG59XG5cbmZ1bmN0aW9uIGdldEFsbFJlZ2lvbnMoKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhSRUdJT05fRkFDVE9SUyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBSRUdJT05fRkFDVE9SUzogUkVHSU9OX0ZBQ1RPUlMsXG4gIGdldFJlZ2lvbkJ5QXJlYTogZ2V0UmVnaW9uQnlBcmVhLFxuICBnZXRSZWdpb25GYWN0b3I6IGdldFJlZ2lvbkZhY3RvcixcbiAgZ2V0UmVnaW9uRmFjdG9yQnlBcmVhOiBnZXRSZWdpb25GYWN0b3JCeUFyZWEsXG4gIGdldEFsbFJlZ2lvbnM6IGdldEFsbFJlZ2lvbnNcbn07XG4iLCAiY29uc3QgeyBSRVNJREVOQ0VfVFlQRVMsIFBZRU9OR19MRVZFTFMgfSA9IHJlcXVpcmUoJ0BnYXRlcy9HMV9UeXBlLmNqcycpO1xuXG5jb25zdCBSRVNJREVOQ0VfSU5GTyA9IHtcbiAgQVBBUlRNRU5UOiAgICB7IG5hbWU6ICdcdUM1NDRcdUQzMENcdUQyQjgnLCAgICAgIGljb246ICdcdUQ4M0NcdURGRTInLCBtZXRhOiAnJyB9LFxuICBWSUxMQTogICAgICAgIHsgbmFtZTogJ1x1QkU0Q1x1Qjc3QycsICAgICAgICBpY29uOiAnXHVEODNDXHVERkQ4JywgbWV0YTogJycgfSxcbiAgREVUQUNIRURfMUY6ICB7IG5hbWU6ICdcdUIyRThcdUIzQzVcdUM4RkNcdUQwREQnLCAgICBpY29uOiAnXHVEODNDXHVERkUwJywgbWV0YTogJ1x1QjJFOFx1Q0UzNScgfSxcbiAgREVUQUNIRURfMkY6ICB7IG5hbWU6ICdcdUIyRThcdUIzQzVcdUM4RkNcdUQwREQnLCAgICBpY29uOiAnXHVEODNDXHVERkUxJywgbWV0YTogJ1x1QkNGNVx1Q0UzNScgfSxcbiAgUEVOVEhPVVNFOiAgICB7IG5hbWU6ICdcdUQzOUNcdUQyQjhcdUQ1NThcdUM2QjBcdUMyQTQnLCAgaWNvbjogJ1x1RDgzQ1x1REYwNicsIG1ldGE6ICcnIH0sXG4gIENPTU1FUkNJQUw6ICAgeyBuYW1lOiAnXHVDMEMxXHVBQzAwL1x1QzYyNFx1RDUzQ1x1QzJBNCcsIGljb246ICdcdUQ4M0NcdURGRUMnLCBtZXRhOiAnJyB9XG59O1xuXG5jbGFzcyBHMVBhZ2Uge1xuICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgdGhpcy5jb250YWluZXJFbCA9IG9wdHMuY29udGFpbmVyRWw7XG4gICAgdGhpcy5jb250cm9sbGVyID0gb3B0cy5jb250cm9sbGVyO1xuICAgIHRoaXMuc2VsZWN0ZWQgPSB7IHJlc2lkZW5jZTogbnVsbCwgcHllb25nOiBudWxsIH07XG4gICAgdGhpcy5jb250ZXh0ID0ge1xuICAgICAgb2NjdXBpZWQ6IGZhbHNlLFxuICAgICAgZmxvb3JMZXZlbDogMSxcbiAgICAgIGhhc0VsZXY6IHRydWUsXG4gICAgICBhZGRyZXNzOiAnJyxcbiAgICAgIHJlZ2lvbklkOiAnUFJPVklOQ0VfT1RIRVInXG4gICAgfTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgcmVuZGVyKCkge1xuICAgIHRoaXMuY29udGFpbmVyRWwuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cImdhdGUtcGFnZVwiPlxuICAgICAgICA8aDI+U1RFUCAxIFx1MjAxNCBcdUMyRENcdUFDRjUgXHVDNzIwXHVENjE1IFx1QzgxNVx1Qzc1ODwvaDI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJnYXRlLXN1YnRpdGxlXCI+XHVBRTMwXHVCQ0Y4IFx1QzgxNVx1QkNGNCArIFx1RDYwNFx1QzdBNSBcdUM4NzBcdUFDNzQgLyBcdUM3OTBcdUIzRDlcdUQ2NTQgMCUgXHUyMTkyIDMwJTwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3M9XCJnMS1zZWN0aW9uXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInNlY3Rpb24tZ3JvdXAtbGFiZWxcIj5cdUFFMzBcdUJDRjggXHVDODE1XHVCQ0Y0PC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwic2VjdGlvbi1zdWJsYWJlbFwiPlx1QzhGQ1x1QUM3MCBcdUQ2MTVcdUQwREM8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiY2FyZC1ncmlkIGNvbXBhY3RcIiBpZD1cInJlc2lkZW5jZS1ncmlkXCI+XG4gICAgICAgICAgICAke1JFU0lERU5DRV9UWVBFUy5tYXAociA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBSRVNJREVOQ0VfSU5GT1tyXSB8fCB7IG5hbWU6IHIsIGljb246ICdcdUQ4M0NcdURGRTAnLCBtZXRhOiAnJyB9O1xuICAgICAgICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJvcHRpb24tY2FyZCBjb21wYWN0XCIgZGF0YS1yZXNpZGVuY2U9XCIke3J9XCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaWNvblwiPiR7aW5mby5pY29ufTwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm5hbWVcIj4ke2luZm8ubmFtZX08L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZXRhXCI+JHtpbmZvLm1ldGF9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICB9KS5qb2luKCcnKX1cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJzZWN0aW9uLXN1YmxhYmVsXCI+XHVEM0M5XHVENjE1PC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImNhcmQtZ3JpZCBjb21wYWN0XCIgaWQ9XCJweWVvbmctZ3JpZFwiPlxuICAgICAgICAgICAgJHtQWUVPTkdfTEVWRUxTLm1hcChwID0+IGBcbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm9wdGlvbi1jYXJkIGNvbXBhY3RcIiBkYXRhLXB5ZW9uZz1cIiR7cH1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibmFtZVwiPiR7cH1cdUQzQzk8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWV0YVwiPn4ke01hdGgucm91bmQocCAqIDMuMzA1OCl9XHUzM0ExPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCkuam9pbignJyl9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3M9XCJnMS1zZWN0aW9uXCI+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cInNlY3Rpb24tZ3JvdXAtbGFiZWxcIj5cdUQ2MDRcdUM3QTUgXHVDODcwXHVBQzc0PC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiZzEtY29udGV4dC1ncmlkXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGV4dC1yb3dcIj5cbiAgICAgICAgICAgICAgPGxhYmVsPlx1QUM3MFx1QzhGQ1x1QzkxMSBcdUMyRENcdUFDRjU8L2xhYmVsPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidG9nZ2xlLWdyb3VwXCI+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInRvZ2dsZS1idG4gYWN0aXZlXCIgZGF0YS1jdHg9XCJvY2N1cGllZFwiIGRhdGEtdmFsPVwiZmFsc2VcIj5cdUM1NDRcdUIyQzhcdUM2MjQ8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidG9nZ2xlLWJ0blwiIGRhdGEtY3R4PVwib2NjdXBpZWRcIiBkYXRhLXZhbD1cInRydWVcIj5cdUM2MDggKCsxMCUpPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGV4dC1yb3dcIj5cbiAgICAgICAgICAgICAgPGxhYmVsPlx1Q0UzNVx1QzIxODwvbGFiZWw+XG4gICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgaWQ9XCJjdHgtZmxvb3JcIiBtaW49XCIxXCIgbWF4PVwiNTBcIiB2YWx1ZT1cIjFcIiBzdHlsZT1cIndpZHRoOjcwcHg7IGJhY2tncm91bmQ6IHZhcigtLWJnKTsgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tZ29sZC1mYWludCk7IGNvbG9yOiB2YXIoLS10ZXh0KTsgcGFkZGluZzogNHB4IDhweDsgYm9yZGVyLXJhZGl1czogNHB4O1wiPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGV4dC1yb3dcIj5cbiAgICAgICAgICAgICAgPGxhYmVsPlx1QzVEOFx1QjlBQ1x1QkNBMFx1Qzc3NFx1RDEzMDwvbGFiZWw+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ0b2dnbGUtZ3JvdXBcIj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidG9nZ2xlLWJ0biBhY3RpdmVcIiBkYXRhLWN0eD1cImhhc0VsZXZcIiBkYXRhLXZhbD1cInRydWVcIj5cdUM3ODhcdUM3NEM8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidG9nZ2xlLWJ0blwiIGRhdGEtY3R4PVwiaGFzRWxldlwiIGRhdGEtdmFsPVwiZmFsc2VcIj5cdUM1QzZcdUM3NEMgKDRcdUNFMzUrNSUpPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGV4dC1yb3cgZnVsbC13aWR0aFwiPlxuICAgICAgICAgICAgICA8bGFiZWw+XHVDOEZDXHVDMThDPC9sYWJlbD5cbiAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgaWQ9XCJjdHgtYWRkcmVzc1wiIHBsYWNlaG9sZGVyPVwiXHVDNjA4OiBcdUMxMUNcdUM2QjggXHVBQzE1XHVCMEE4XHVBRDZDIFx1QzVFRFx1QzBCQ1x1QjNEOVwiIG1heGxlbmd0aD1cIjEwMFwiIHN0eWxlPVwiZmxleDoxOyBiYWNrZ3JvdW5kOiB2YXIoLS1iZyk7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWdvbGQtZmFpbnQpOyBjb2xvcjogdmFyKC0tdGV4dCk7IHBhZGRpbmc6IDRweCA4cHg7IGJvcmRlci1yYWRpdXM6IDRweDtcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJlZ2lvbi1kaXNwbGF5XCIgaWQ9XCJyZWdpb24tZGlzcGxheVwiPlx1QzlDMFx1QzVFRDogXHVDNzkwXHVCM0Q5IFx1QjlFNFx1RDU1MTwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgY2xhc3M9XCJnYXRlLWFjdGlvbnNcIj5cbiAgICAgICAgICA8ZGl2PjwvZGl2PlxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJwcmltYXJ5XCIgaWQ9XCJnMS1uZXh0XCIgZGlzYWJsZWQ+XHVCMkU0XHVDNzRDIFx1MjE5MiBHMiBcdUNFRThcdUMxNDk8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuXG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1yZXNpZGVuY2VdJykuZm9yRWFjaChlbCA9PiB7XG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuX3NlbGVjdFJlc2lkZW5jZShlbC5kYXRhc2V0LnJlc2lkZW5jZSkpO1xuICAgIH0pO1xuICAgIHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtcHllb25nXScpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLl9zZWxlY3RQeWVvbmcocGFyc2VJbnQoZWwuZGF0YXNldC5weWVvbmcpKSk7XG4gICAgfSk7XG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1jdHhdJykuZm9yRWFjaChidG4gPT4ge1xuICAgICAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5fb25Db250ZXh0VG9nZ2xlKGJ0bikpO1xuICAgIH0pO1xuICAgIHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcignI2N0eC1mbG9vcicpLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKGUpID0+IHtcbiAgICAgIHRoaXMuY29udGV4dC5mbG9vckxldmVsID0gcGFyc2VJbnQoZS50YXJnZXQudmFsdWUpIHx8IDE7XG4gICAgfSk7XG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjY3R4LWFkZHJlc3MnKS5hZGRFdmVudExpc3RlbmVyKCdpbnB1dCcsIChlKSA9PiB7XG4gICAgICB0aGlzLmNvbnRleHQuYWRkcmVzcyA9IGUudGFyZ2V0LnZhbHVlO1xuICAgICAgdGhpcy5fdXBkYXRlUmVnaW9uKCk7XG4gICAgfSk7XG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjZzEtbmV4dCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5fc3VibWl0KCkpO1xuICB9XG5cbiAgX3NlbGVjdFJlc2lkZW5jZShyKSB7XG4gICAgdGhpcy5zZWxlY3RlZC5yZXNpZGVuY2UgPSByO1xuICAgIHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtcmVzaWRlbmNlXScpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuY2xhc3NMaXN0LnRvZ2dsZSgnc2VsZWN0ZWQnLCBlbC5kYXRhc2V0LnJlc2lkZW5jZSA9PT0gcik7XG4gICAgfSk7XG4gICAgdGhpcy5fdXBkYXRlTmV4dEJ0bigpO1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjcHllb25nLWdyaWQnKT8uc2Nyb2xsSW50b1ZpZXcoeyBiZWhhdmlvcjogJ3Ntb290aCcsIGJsb2NrOiAnbmVhcmVzdCcgfSk7XG4gICAgfSwgMjAwKTtcbiAgfVxuXG4gIF9zZWxlY3RQeWVvbmcocCkge1xuICAgIHRoaXMuc2VsZWN0ZWQucHllb25nID0gcDtcbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLXB5ZW9uZ10nKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgIGVsLmNsYXNzTGlzdC50b2dnbGUoJ3NlbGVjdGVkJywgcGFyc2VJbnQoZWwuZGF0YXNldC5weWVvbmcpID09PSBwKTtcbiAgICB9KTtcbiAgICB0aGlzLl91cGRhdGVOZXh0QnRuKCk7XG4gIH1cblxuICBfb25Db250ZXh0VG9nZ2xlKGJ0bikge1xuICAgIGNvbnN0IGN0eEtleSA9IGJ0bi5kYXRhc2V0LmN0eDtcbiAgICBjb25zdCB2YWwgPSBidG4uZGF0YXNldC52YWwgPT09ICd0cnVlJztcbiAgICB0aGlzLmNvbnRleHRbY3R4S2V5XSA9IHZhbDtcbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoYFtkYXRhLWN0eD1cIiR7Y3R4S2V5fVwiXWApLmZvckVhY2goYiA9PiB7XG4gICAgICBiLmNsYXNzTGlzdC50b2dnbGUoJ2FjdGl2ZScsIGIuZGF0YXNldC52YWwgPT09IGJ0bi5kYXRhc2V0LnZhbCk7XG4gICAgfSk7XG4gIH1cblxuICBfdXBkYXRlUmVnaW9uKCkge1xuICAgIGxldCByZWdpb25JZCA9ICdQUk9WSU5DRV9PVEhFUic7XG4gICAgbGV0IGZhY3RvciA9IDEuMDtcbiAgICB0cnkge1xuICAgICAgY29uc3QgeyBnZXRSZWdpb25CeUFyZWEsIGdldFJlZ2lvbkZhY3RvciB9ID0gcmVxdWlyZSgnQGtvcmVhL1JlZ2lvbkZhY3Rvci5janMnKTtcbiAgICAgIHJlZ2lvbklkID0gZ2V0UmVnaW9uQnlBcmVhKHRoaXMuY29udGV4dC5hZGRyZXNzKTtcbiAgICAgIGZhY3RvciA9IGdldFJlZ2lvbkZhY3RvcihyZWdpb25JZCk7XG4gICAgfSBjYXRjaChlKSB7fVxuICAgIHRoaXMuY29udGV4dC5yZWdpb25JZCA9IHJlZ2lvbklkO1xuXG4gICAgY29uc3QgUkVHSU9OX05BTUVTID0ge1xuICAgICAgU0VPVUxfR0FOR05BTTogJ1x1QUMxNVx1QjBBODNcdUFENkMnLCBTRU9VTF9PVEhFUjogJ1x1QzExQ1x1QzZCOCcsIE1FVFJPX0JVU0FOOiAnXHVCRDgwXHVDMEIwJyxcbiAgICAgIE1FVFJPX09USEVSOiAnXHVBRDExXHVDNUVEXHVDMkRDJywgUFJPVklOQ0VfTUFKT1I6ICdcdUIzQzRcdUNDQURcdUMxOENcdUM3QUNcdUM5QzAnLFxuICAgICAgUFJPVklOQ0VfT1RIRVI6ICdcdUM5QzBcdUJDMjknLCBKRUpVOiAnXHVDODFDXHVDOEZDJ1xuICAgIH07XG4gICAgY29uc3QgZmFjdG9yUGVyY2VudCA9ICgoZmFjdG9yIC0gMSkgKiAxMDApLnRvRml4ZWQoMCk7XG4gICAgY29uc3Qgc2lnbiA9IGZhY3RvciA+PSAxID8gJysnIDogJyc7XG4gICAgY29uc3QgZWwgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNyZWdpb24tZGlzcGxheScpO1xuICAgIGlmIChlbCkgZWwudGV4dENvbnRlbnQgPSBgXHVDOUMwXHVDNUVEOiAke1JFR0lPTl9OQU1FU1tyZWdpb25JZF0gfHwgcmVnaW9uSWR9ICgke3NpZ259JHtmYWN0b3JQZXJjZW50fSUpYDtcbiAgfVxuXG4gIF91cGRhdGVOZXh0QnRuKCkge1xuICAgIGNvbnN0IGJ0biA9IHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcignI2cxLW5leHQnKTtcbiAgICBpZiAoYnRuKSBidG4uZGlzYWJsZWQgPSAhKHRoaXMuc2VsZWN0ZWQucmVzaWRlbmNlICYmIHRoaXMuc2VsZWN0ZWQucHllb25nKTtcbiAgfVxuXG4gIF9zdWJtaXQoKSB7XG4gICAgdGhpcy5jb250cm9sbGVyLmlucHV0LmNvbnRleHQgPSB0aGlzLmNvbnRleHQ7XG4gICAgY29uc3QgciA9IHRoaXMuY29udHJvbGxlci5sb2NrRzEodGhpcy5zZWxlY3RlZCk7XG4gICAgaWYgKHIgJiYgdHlwZW9mIHIudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgci50aGVuKHJlcyA9PiB7IGlmIChyZXMgJiYgIXJlcy5vaykgYWxlcnQoJ0cxIFx1QzdBMFx1QUUwOCBcdUMyRTRcdUQzMjg6ICcgKyByZXMuZXJyb3IpOyB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHIgJiYgIXIub2spIGFsZXJ0KCdHMSBcdUM3QTBcdUFFMDggXHVDMkU0XHVEMzI4OiAnICsgci5lcnJvcik7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBHMVBhZ2UgfTtcbiIsICIvLyBHMjogXHVDRUU4XHVDMTQ5ICgxMiBcdUNFRThcdUMxNDkpXG5jb25zdCB7IENPTkNFUFRTIH0gPSByZXF1aXJlKCdAZ2F0ZXMvRzJfQ29uY2VwdC5janMnKTtcbmNvbnN0IHsgQ09OQ0VQVF9NQVRFUklBTF9NQVAgfSA9IHJlcXVpcmUoJ0Blc3RpbWF0ZS12Ni9tYXRyaWNlcy9Db25jZXB0TWF0ZXJpYWxNYXRyaXguY2pzJyk7XG5cbmNsYXNzIEcyUGFnZSB7XG4gIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsID0gb3B0cy5jb250YWluZXJFbDtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBvcHRzLmNvbnRyb2xsZXI7XG4gICAgdGhpcy5zZWxlY3RlZCA9IG51bGw7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHJlbmRlcigpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJnYXRlLXBhZ2VcIj5cbiAgICAgICAgPGgyPlNURVAgMiBcdTIwMTQgXHVDRUU4XHVDMTQ5PC9oMj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImdhdGUtc3VidGl0bGVcIj5cdUI1MTRcdUM3OTBcdUM3NzggXHVDRUU4XHVDMTQ5IDFcdUFDMUMgXHVDMTIwXHVEMEREIC8gXHVDNzkwXHVCM0Q5XHVENjU0IDMwJSBcdTIxOTIgNzAlPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNhcmQtZ3JpZFwiIGlkPVwiY29uY2VwdC1ncmlkXCI+XG4gICAgICAgICAgJHtDT05DRVBUUy5tYXAoYyA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0gQ09OQ0VQVF9NQVRFUklBTF9NQVBbY107XG4gICAgICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwib3B0aW9uLWNhcmRcIiBkYXRhLWNvbmNlcHQ9XCIke2N9XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm5hbWVcIj4ke2luZm8gPyBpbmZvLm5hbWUgOiBjfTwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZXRhXCI+JHtpbmZvID8gJ1x1MDBENycgKyBpbmZvLm11bCArICcgKCcgKyBpbmZvLmdyYWRlICsgJyknIDogJyd9PC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICB9KS5qb2luKCcnKX1cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBjbGFzcz1cImdhdGUtYWN0aW9uc1wiPlxuICAgICAgICAgIDxidXR0b24gaWQ9XCJnMi1iYWNrXCI+XHUyMTkwIFx1Qzc3NFx1QzgwNDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJwcmltYXJ5XCIgaWQ9XCJnMi1uZXh0XCIgZGlzYWJsZWQ+XHVCMkU0XHVDNzRDIFx1MjE5MiBHMyBcdUMxMzlcdUMxNTg8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuXG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1jb25jZXB0XScpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLl9zZWxlY3QoZWwuZGF0YXNldC5jb25jZXB0KSk7XG4gICAgfSk7XG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjZzItYmFjaycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5jb250cm9sbGVyLmdvQmFjaygpKTtcbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNnMi1uZXh0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLl9zdWJtaXQoKSk7XG4gIH1cblxuICBfc2VsZWN0KGMpIHtcbiAgICB0aGlzLnNlbGVjdGVkID0gYztcbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLWNvbmNlcHRdJykuZm9yRWFjaChlbCA9PiB7XG4gICAgICBlbC5jbGFzc0xpc3QudG9nZ2xlKCdzZWxlY3RlZCcsIGVsLmRhdGFzZXQuY29uY2VwdCA9PT0gYyk7XG4gICAgfSk7XG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjZzItbmV4dCcpLmRpc2FibGVkID0gZmFsc2U7XG4gIH1cblxuICBfc3VibWl0KCkge1xuICAgIGNvbnN0IHIgPSB0aGlzLmNvbnRyb2xsZXIubG9ja0cyKHsgY29uY2VwdDogdGhpcy5zZWxlY3RlZCB9KTtcbiAgICBpZiAoIXIub2spIGFsZXJ0KCdHMiBcdUM3QTBcdUFFMDggXHVDMkU0XHVEMzI4OiAnICsgci5lcnJvcik7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IEcyUGFnZTogRzJQYWdlIH07XG4iLCAiLy8gRzM6IFx1QzEzOVx1QzE1OCAoMjIgXHVDMTM5XHVDMTU4LCA0IFx1QURGOFx1QjhGOSlcbmNvbnN0IHsgU0VDVElPTlMsIGdldEF2YWlsYWJsZVNlY3Rpb25zIH0gPSByZXF1aXJlKCdAZXN0aW1hdGUtdjYvbWF0cmljZXMvU2VjdGlvbnMuY2pzJyk7XG5cbmNvbnN0IEdST1VQX05BTUVTID0ge1xuICBSRVNJREVOVElBTDogJ1x1QzhGQ1x1QUM3MCBcdUFDRjVcdUFDMDQnLFxuICBBVVhJTElBUlk6ICAgJ1x1QkQ4MFx1QUMwMCBcdUFDRjVcdUFDMDQnLFxuICBTUEVDSUFMOiAgICAgJ1x1RDJCOVx1QzIxOCBcdUFDRjVcdUFDMDQnLFxuICBQUk9DRVNTOiAgICAgJ1x1QUNGNVx1QzgxNSdcbn07XG5cbmNsYXNzIEczUGFnZSB7XG4gIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsID0gb3B0cy5jb250YWluZXJFbDtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBvcHRzLmNvbnRyb2xsZXI7XG4gICAgdGhpcy5zZWxlY3RlZCA9IG5ldyBTZXQoKTtcbiAgICB0aGlzLnJlc2lkZW5jZSA9IHRoaXMuY29udHJvbGxlci5nZXRTdGF0ZSgpLmlucHV0LnJlc2lkZW5jZTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgcmVuZGVyKCkge1xuICAgIGNvbnN0IGF2YWlsYWJsZSA9IGdldEF2YWlsYWJsZVNlY3Rpb25zKHRoaXMucmVzaWRlbmNlKTtcblxuICAgIHRoaXMuY29udGFpbmVyRWwuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cImdhdGUtcGFnZVwiPlxuICAgICAgICA8aDI+U1RFUCAzIFx1MjAxNCBcdUMyRENcdUFDRjUgXHVDMTM5XHVDMTU4PC9oMj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImdhdGUtc3VidGl0bGVcIj5cdUMyRENcdUFDRjVcdUQ1NjAgXHVDMTM5XHVDMTU4IFx1QjJFNFx1QzkxMSBcdUMxMjBcdUQwREQgKFx1Q0Q1Q1x1QzE4QyAxXHVBQzFDKSAvIFx1Qzc5MFx1QjNEOVx1RDY1NCA3MCUgXHUyMTkyIDg1JTwvZGl2PlxuXG4gICAgICAgICR7WydSRVNJREVOVElBTCcsICdBVVhJTElBUlknLCAnU1BFQ0lBTCcsICdQUk9DRVNTJ10ubWFwKGdyb3VwID0+IHtcbiAgICAgICAgICBjb25zdCBzZWN0aW9ucyA9IFNFQ1RJT05TW2dyb3VwXTtcbiAgICAgICAgICBpZiAoIXNlY3Rpb25zKSByZXR1cm4gJyc7XG4gICAgICAgICAgY29uc3Qgc2VjdGlvbklkcyA9IE9iamVjdC5rZXlzKHNlY3Rpb25zKS5maWx0ZXIoaWQgPT4gYXZhaWxhYmxlLmluY2x1ZGVzKGlkKSk7XG4gICAgICAgICAgaWYgKHNlY3Rpb25JZHMubGVuZ3RoID09PSAwKSByZXR1cm4gJyc7XG4gICAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzZWN0aW9uLWdyb3VwLWxhYmVsXCI+JHtHUk9VUF9OQU1FU1tncm91cF19PC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY2FyZC1ncmlkXCI+XG4gICAgICAgICAgICAgICR7c2VjdGlvbklkcy5tYXAoaWQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlYyA9IHNlY3Rpb25zW2lkXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm9wdGlvbi1jYXJkXCIgZGF0YS1zZWN0aW9uPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm5hbWVcIj4ke3NlYy5uYW1lfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWV0YVwiPiR7c2VjLnJlcXVpcmVkID8gJ1x1RDU0NFx1QzIxOCcgOiAnXHVDMTIwXHVEMEREJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgIH0pLmpvaW4oJycpfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgYDtcbiAgICAgICAgfSkuam9pbignJyl9XG5cbiAgICAgICAgPGRpdiBjbGFzcz1cImdhdGUtYWN0aW9uc1wiPlxuICAgICAgICAgIDxidXR0b24gaWQ9XCJnMy1iYWNrXCI+XHUyMTkwIFx1Qzc3NFx1QzgwNDwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJwcmltYXJ5XCIgaWQ9XCJnMy1uZXh0XCIgZGlzYWJsZWQ+XHVCMkU0XHVDNzRDIFx1MjE5MiBHNCBDQUQ8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuXG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1zZWN0aW9uXScpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLl90b2dnbGUoZWwuZGF0YXNldC5zZWN0aW9uKSk7XG4gICAgfSk7XG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjZzMtYmFjaycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5jb250cm9sbGVyLmdvQmFjaygpKTtcbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNnMy1uZXh0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLl9zdWJtaXQoKSk7XG4gIH1cblxuICBfdG9nZ2xlKGlkKSB7XG4gICAgaWYgKHRoaXMuc2VsZWN0ZWQuaGFzKGlkKSkgdGhpcy5zZWxlY3RlZC5kZWxldGUoaWQpO1xuICAgIGVsc2UgdGhpcy5zZWxlY3RlZC5hZGQoaWQpO1xuXG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1zZWN0aW9uXScpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuY2xhc3NMaXN0LnRvZ2dsZSgnc2VsZWN0ZWQnLCB0aGlzLnNlbGVjdGVkLmhhcyhlbC5kYXRhc2V0LnNlY3Rpb24pKTtcbiAgICB9KTtcbiAgICB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNnMy1uZXh0JykuZGlzYWJsZWQgPSB0aGlzLnNlbGVjdGVkLnNpemUgPT09IDA7XG4gIH1cblxuICBfc3VibWl0KCkge1xuICAgIGNvbnN0IHIgPSB0aGlzLmNvbnRyb2xsZXIubG9ja0czKHsgc2VjdGlvbnM6IEFycmF5LmZyb20odGhpcy5zZWxlY3RlZCkgfSk7XG4gICAgaWYgKCFyLm9rKSBhbGVydCgnRzMgXHVDN0EwXHVBRTA4IFx1QzJFNFx1RDMyODogJyArIHIuZXJyb3IpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBHM1BhZ2U6IEczUGFnZSB9O1xuIiwgIi8vIEc0OiBDQUQgXHVCQTc0XHVDODAxIFx1Qzc4NVx1QjgyNSBcdTIwMTQgXHVCNEMwXHVDNUJDIFx1QkFBOFx1QjREQyAoXHVDMjJCXHVDNzkwIFx1Qzc4NVx1QjgyNSBcdTIxOTQgXHVEM0M5XHVCQTc0XHVCM0M0KVxuY29uc3QgeyBnZXRTcGFjZXNGb3JTZWN0aW9ucyB9ID0gcmVxdWlyZSgnQGVzdGltYXRlLXY2L21hdHJpY2VzL1NlY3Rpb25zLmNqcycpO1xuY29uc3QgeyBnZXRTcGFjZSB9ID0gcmVxdWlyZSgnQGVzdGltYXRlLXY2L21hdHJpY2VzL1NwYWNlcy5janMnKTtcbmNvbnN0IHsgQ0FEQ2FudmFzIH0gPSByZXF1aXJlKCcuLi8uLi9jYWQvQ0FEQ2FudmFzLmpzJyk7XG5jb25zdCB7IENBRFRvb2xiYXIgfSA9IHJlcXVpcmUoJy4uLy4uL2NhZC9jb21wb25lbnRzL0NBRFRvb2xiYXIuanMnKTtcbmNvbnN0IHsgQ0FEU3BhY2VzTGlzdCB9ID0gcmVxdWlyZSgnLi4vLi4vY2FkL2NvbXBvbmVudHMvQ0FEU3BhY2VzTGlzdC5qcycpO1xuXG5jbGFzcyBHNFBhZ2Uge1xuICBjb25zdHJ1Y3RvcihvcHRzKSB7XG4gICAgdGhpcy5jb250YWluZXJFbCA9IG9wdHMuY29udGFpbmVyRWw7XG4gICAgdGhpcy5jb250cm9sbGVyID0gb3B0cy5jb250cm9sbGVyO1xuXG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLmNvbnRyb2xsZXIuZ2V0U3RhdGUoKTtcbiAgICB0aGlzLmF1dG9TcGFjZXMgPSBnZXRTcGFjZXNGb3JTZWN0aW9ucyhzdGF0ZS5pbnB1dC5zZWN0aW9ucyk7XG5cbiAgICB0aGlzLm1vZGUgPSAnbnVtZXJpYyc7XG5cbiAgICB0aGlzLnNwYWNlSW5wdXRzID0gdGhpcy5hdXRvU3BhY2VzLm1hcCgoc3BhY2VLZXksIGlkeCkgPT4gKHtcbiAgICAgIGlkOiAnc3BfJyArIGlkeCxcbiAgICAgIHR5cGVLZXk6IHNwYWNlS2V5LFxuICAgICAgYXJlYV9zcW06IDBcbiAgICB9KSk7XG5cbiAgICB0aGlzLmNhZENhbnZhcyA9IG51bGw7XG4gICAgdGhpcy5jYWRTcGFjZXMgPSBbXTtcblxuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgdGhpcy5jb250YWluZXJFbC5pbm5lckhUTUwgPSBgXG4gICAgICA8ZGl2IGNsYXNzPVwiZ2F0ZS1wYWdlXCI+XG4gICAgICAgIDxoMj5TVEVQIDQgXHUyMDE0IFx1QUNGNVx1QUMwNCBcdUJBNzRcdUM4MDEgXHVDNzg1XHVCODI1PC9oMj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImdhdGUtc3VidGl0bGVcIj5cdUM3OTBcdUIzRDlcdUQ2NTQgODUlIFx1MjE5MiA5NSUgKDFcdUIyRThcdUFDQzQgXHVBQ0FDXHVDODAxIFx1QzY0NFx1QzEzMSk8L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzPVwibW9kZS10b2dnbGVcIj5cbiAgICAgICAgICA8YnV0dG9uIGRhdGEtbW9kZT1cIm51bWVyaWNcIiBjbGFzcz1cIiR7dGhpcy5tb2RlID09PSAnbnVtZXJpYycgPyAnYWN0aXZlJyA6ICcnfVwiPlx1QzIyQlx1Qzc5MCBcdUM3ODVcdUI4MjU8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIGRhdGEtbW9kZT1cImNhZFwiIGNsYXNzPVwiJHt0aGlzLm1vZGUgPT09ICdjYWQnID8gJ2FjdGl2ZScgOiAnJ31cIj5cdUQ4M0RcdURDRDAgXHVEM0M5XHVCQTc0XHVCM0M0PC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgaWQ9XCJnNC1tb2RlLWNvbnRlbnRcIj48L2Rpdj5cblxuICAgICAgICA8ZGl2IGNsYXNzPVwiZ2F0ZS1hY3Rpb25zXCI+XG4gICAgICAgICAgPGJ1dHRvbiBpZD1cImc0LWJhY2tcIj5cdTIxOTAgXHVDNzc0XHVDODA0PC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInByaW1hcnlcIiBpZD1cImc0LW5leHRcIiBkaXNhYmxlZD5cdUFDQUNcdUM4MDEgXHVBQ0M0XHVDMEIwIFx1MjE5MjwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGlkPVwiZXN0aW1hdGUtcHJldmlldy1jb250YWluZXJcIj48L2Rpdj5cbiAgICBgO1xuXG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1tb2RlXScpLmZvckVhY2goYnRuID0+IHtcbiAgICAgIGJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuX3N3aXRjaE1vZGUoYnRuLmRhdGFzZXQubW9kZSkpO1xuICAgIH0pO1xuICAgIHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvcignI2c0LWJhY2snKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuY29udHJvbGxlci5nb0JhY2soKSk7XG4gICAgdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjZzQtbmV4dCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5fc3VibWl0KCkpO1xuXG4gICAgdGhpcy5fcmVuZGVyTW9kZUNvbnRlbnQoKTtcbiAgfVxuXG4gIF9zd2l0Y2hNb2RlKG1vZGUpIHtcbiAgICB0aGlzLm1vZGUgPSBtb2RlO1xuICAgIHRoaXMuY29udGFpbmVyRWwucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtbW9kZV0nKS5mb3JFYWNoKGJ0biA9PiB7XG4gICAgICBidG4uY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJywgYnRuLmRhdGFzZXQubW9kZSA9PT0gbW9kZSk7XG4gICAgfSk7XG4gICAgdGhpcy5fcmVuZGVyTW9kZUNvbnRlbnQoKTtcbiAgfVxuXG4gIF9yZW5kZXJNb2RlQ29udGVudCgpIHtcbiAgICBjb25zdCBjb250ZW50RWwgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNnNC1tb2RlLWNvbnRlbnQnKTtcblxuICAgIGlmICh0aGlzLmNhZENhbnZhcykge1xuICAgICAgdGhpcy5jYWRDYW52YXMuZGVzdHJveSgpO1xuICAgICAgdGhpcy5jYWRDYW52YXMgPSBudWxsO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm1vZGUgPT09ICdudW1lcmljJykge1xuICAgICAgdGhpcy5fcmVuZGVyTnVtZXJpY01vZGUoY29udGVudEVsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcmVuZGVyQ0FETW9kZShjb250ZW50RWwpO1xuICAgIH1cbiAgfVxuXG4gIF9yZW5kZXJOdW1lcmljTW9kZShlbCkge1xuICAgIGVsLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgY2xhc3M9XCJjYXJkXCI+XG4gICAgICAgICR7dGhpcy5zcGFjZUlucHV0cy5tYXAoKGlucHV0LCBpZHgpID0+IHtcbiAgICAgICAgICBjb25zdCBtZXRhID0gZ2V0U3BhY2UoaW5wdXQudHlwZUtleSk7XG4gICAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzcGFjZS1yb3dcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInNwYWNlLW5hbWVcIiBzdHlsZT1cImZvbnQtZmFtaWx5OiB2YXIoLS1mb250LWRpc3BsYXkpOyBjb2xvcjogdmFyKC0tZ29sZCk7XCI+JHtpbnB1dC50eXBlS2V5fTwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwic3BhY2UtbmFtZVwiPiR7bWV0YSA/IG1ldGEubmFtZSA6IGlucHV0LnR5cGVLZXl9PC9kaXY+XG4gICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbWluPVwiMFwiIHN0ZXA9XCIwLjVcIiBwbGFjZWhvbGRlcj1cIlx1QkE3NFx1QzgwMShcdTMzQTEpXCIgZGF0YS1pZHg9XCIke2lkeH1cIiB2YWx1ZT1cIiR7aW5wdXQuYXJlYV9zcW0gfHwgJyd9XCI+XG4gICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJ0ZXh0LWFsaWduOiByaWdodDsgY29sb3I6IHZhcigtLXRleHQtZGltKTsgZm9udC1zaXplOiAxMXB4O1wiPlx1MzNBMTwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgYDtcbiAgICAgICAgfSkuam9pbignJyl9XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuXG4gICAgZWwucXVlcnlTZWxlY3RvckFsbCgnaW5wdXRbZGF0YS1pZHhdJykuZm9yRWFjaChpbnAgPT4ge1xuICAgICAgaW5wLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKCkgPT4gdGhpcy5fb25OdW1lcmljSW5wdXQoaW5wKSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLl91cGRhdGVOZXh0QnRuKCk7XG4gIH1cblxuICBfcmVuZGVyQ0FETW9kZShlbCkge1xuICAgIGVsLmlubmVySFRNTCA9IGBcbiAgICAgIDxkaXYgaWQ9XCJjYWQtdG9vbGJhci1jb250YWluZXJcIj48L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJjYWQtY2FudmFzLXdyYXBwZXJcIj5cbiAgICAgICAgPGRpdiBpZD1cImNhZC1jYW52YXMtY29udGFpbmVyXCIgc3R5bGU9XCJ3aWR0aDogMTAwJTsgaGVpZ2h0OiA1MDBweDtcIj48L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNhbnZhcy1oaW50XCI+XHVDMEFDXHVBQzAxXHVENjE1IFx1QjNDNFx1QUQ2QyBcdTIxOTIgXHVCNERDXHVCNzk4XHVBREY4XHVENTU4XHVDNUVDIFx1QUNGNVx1QUMwNCBcdUNEOTRcdUFDMDA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBpZD1cImNhZC1zcGFjZXMtY29udGFpbmVyXCI+PC9kaXY+XG4gICAgYDtcblxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgY29uc3QgY2FudmFzQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhZC1jYW52YXMtY29udGFpbmVyJyk7XG4gICAgICBjb25zdCB3cmFwcGVyV2lkdGggPSBjYW52YXNDb250YWluZXIuY2xpZW50V2lkdGggfHwgODAwO1xuXG4gICAgICB0aGlzLmNhZENhbnZhcyA9IG5ldyBDQURDYW52YXMoe1xuICAgICAgICBjb250YWluZXJFbDogY2FudmFzQ29udGFpbmVyLFxuICAgICAgICB3aWR0aDogd3JhcHBlcldpZHRoLFxuICAgICAgICBoZWlnaHQ6IDUwMCxcbiAgICAgICAgc2NhbGU6IDUwXG4gICAgICB9KTtcblxuICAgICAgbmV3IENBRFRvb2xiYXIoe1xuICAgICAgICBjb250YWluZXJFbDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhZC10b29sYmFyLWNvbnRhaW5lcicpLFxuICAgICAgICBjYW52YXM6IHRoaXMuY2FkQ2FudmFzXG4gICAgICB9KTtcblxuICAgICAgbmV3IENBRFNwYWNlc0xpc3Qoe1xuICAgICAgICBjb250YWluZXJFbDogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhZC1zcGFjZXMtY29udGFpbmVyJyksXG4gICAgICAgIGNhbnZhczogdGhpcy5jYWRDYW52YXNcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmNhZENhbnZhcy5vbkFyZWFDaGFuZ2Uoc3BhY2VzID0+IHtcbiAgICAgICAgdGhpcy5jYWRTcGFjZXMgPSBzcGFjZXMuZmlsdGVyKHMgPT4gcy50eXBlS2V5ICE9PSAnVU5LTk9XTicgJiYgcy5hcmVhX3NxbSA+IDApO1xuICAgICAgICB0aGlzLl91cGRhdGVOZXh0QnRuKCk7XG4gICAgICB9KTtcbiAgICB9LCA1MCk7XG4gIH1cblxuICBfb25OdW1lcmljSW5wdXQoaW5wKSB7XG4gICAgY29uc3QgaWR4ID0gcGFyc2VJbnQoaW5wLmRhdGFzZXQuaWR4KTtcbiAgICBjb25zdCB2YWwgPSBwYXJzZUZsb2F0KGlucC52YWx1ZSkgfHwgMDtcbiAgICB0aGlzLnNwYWNlSW5wdXRzW2lkeF0uYXJlYV9zcW0gPSB2YWw7XG4gICAgdGhpcy5fdXBkYXRlTmV4dEJ0bigpO1xuICB9XG5cbiAgX3VwZGF0ZU5leHRCdG4oKSB7XG4gICAgY29uc3QgYnRuID0gdGhpcy5jb250YWluZXJFbC5xdWVyeVNlbGVjdG9yKCcjZzQtbmV4dCcpO1xuICAgIGlmICghYnRuKSByZXR1cm47XG4gICAgaWYgKHRoaXMubW9kZSA9PT0gJ251bWVyaWMnKSB7XG4gICAgICBidG4uZGlzYWJsZWQgPSAhdGhpcy5zcGFjZUlucHV0cy5ldmVyeShzID0+IHMuYXJlYV9zcW0gPiAwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYnRuLmRpc2FibGVkID0gdGhpcy5jYWRTcGFjZXMubGVuZ3RoID09PSAwO1xuICAgIH1cbiAgfVxuXG4gIF9zdWJtaXQoKSB7XG4gICAgY29uc3Qgc3BhY2VzID0gdGhpcy5tb2RlID09PSAnbnVtZXJpYycgPyB0aGlzLnNwYWNlSW5wdXRzIDogdGhpcy5jYWRTcGFjZXM7XG4gICAgY29uc3QgciA9IHRoaXMuY29udHJvbGxlci5sb2NrRzQoeyBzcGFjZXM6IHNwYWNlcyB9KTtcbiAgICBpZiAoIXIub2spIHtcbiAgICAgIGFsZXJ0KCdHNCBcdUM3QTBcdUFFMDggXHVDMkU0XHVEMzI4OiAnICsgci5lcnJvcik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX3JlbmRlckVzdGltYXRlKCk7XG4gIH1cblxuICBfcmVuZGVyRXN0aW1hdGUoKSB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLmNvbnRyb2xsZXIuZ2V0U3RhdGUoKTtcbiAgICBjb25zdCBlID0gc3RhdGUuZXN0aW1hdGU7XG4gICAgaWYgKCFlKSByZXR1cm47XG5cbiAgICBjb25zdCBwcmV2aWV3RWwgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNlc3RpbWF0ZS1wcmV2aWV3LWNvbnRhaW5lcicpO1xuICAgIGlmICghcHJldmlld0VsKSByZXR1cm47XG5cbiAgICBwcmV2aWV3RWwuaW5uZXJIVE1MID0gYFxuICAgICAgPGRpdiBjbGFzcz1cImVzdGltYXRlLXByZXZpZXdcIj5cbiAgICAgICAgPGgzPjFcdUIyRThcdUFDQzQgXHVBQ0FDXHVDODAxIChcdUM3OTBcdUIzRDlcdUQ2NTQgOTUlKTwvaDM+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJlc3RpbWF0ZS1yb3dcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cImxhYmVsXCI+XHVDRDFEIFx1QkE3NFx1QzgwMTwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cInZhbHVlXCI+JHtlLmFyZWFTcW0udG9GaXhlZCgxKX1cdTMzQTE8L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZXN0aW1hdGUtcm93XCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbFwiPlx1QUNGNVx1QUUwOVx1QUMwMDwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cInZhbHVlXCI+JHtlLnN1cHBseS50b0xvY2FsZVN0cmluZygpfVx1QzZEMDwvc3Bhbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJlc3RpbWF0ZS1yb3dcIj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cImxhYmVsXCI+XHVCM0M0XHVBRTA5XHVENTY5XHVBQ0M0IChcdTAwRDcke2UuZmFjdG9ycy5ncmFkZU11bH0gXHVDRUU4XHVDMTQ5ICsgXHUwMEQ3JHtlLmZhY3RvcnMuYmFzZUZhY3Rvcn0gXHVDOEZDXHVBQzcwKTwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cInZhbHVlXCI+JHtlLmNvbnRyYWN0LnRvTG9jYWxlU3RyaW5nKCl9XHVDNkQwPC9zcGFuPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImVzdGltYXRlLXJvd1wiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwibGFiZWxcIj5WQVQgMTAlPC9zcGFuPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwidmFsdWVcIj4keyhlLmZpbmFsIC0gZS5jb250cmFjdCkudG9Mb2NhbGVTdHJpbmcoKX1cdUM2RDA8L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZXN0aW1hdGUtcm93IGhpZ2hsaWdodFwiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwibGFiZWxcIj5cdUNENUNcdUM4ODUgXHVBRTA4XHVDNTYxPC9zcGFuPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwidmFsdWVcIj4ke2UuZmluYWwudG9Mb2NhbGVTdHJpbmcoKX1cdUM2RDA8L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZXN0aW1hdGUtcm93XCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJsYWJlbFwiPlx1MzNBMVx1QjJGOSAvIFx1RDNDOVx1QjJGOTwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cInZhbHVlXCI+JHtlLnNxbVByaWNlLnRvTG9jYWxlU3RyaW5nKCl9IC8gJHtlLnB5UHJpY2UudG9Mb2NhbGVTdHJpbmcoKX1cdUM2RDA8L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgYDtcbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgaWYgKHRoaXMuY2FkQ2FudmFzKSB0aGlzLmNhZENhbnZhcy5kZXN0cm95KCk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IEc0UGFnZTogRzRQYWdlIH07XG4iLCAiLy8gRUNPUkVBTiBCT0MgdjYuMCBcdTIwMTQgV2l6YXJkIFBhZ2UgKDVcdUIyRTggXHVEMUI1XHVENTY5KVxuXG5jb25zdCB7IFdpemFyZENvbnRyb2xsZXIgfSA9IHJlcXVpcmUoJy4vV2l6YXJkQ29udHJvbGxlci5qcycpO1xuY29uc3QgeyBQcm9ncmVzc0JhciB9ID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL1Byb2dyZXNzQmFyLmpzJyk7XG5jb25zdCB7IEcxUGFnZSB9ID0gcmVxdWlyZSgnLi9nYXRlcy9HMVBhZ2UuanMnKTtcbmNvbnN0IHsgRzJQYWdlIH0gPSByZXF1aXJlKCcuL2dhdGVzL0cyUGFnZS5qcycpO1xuY29uc3QgeyBHM1BhZ2UgfSA9IHJlcXVpcmUoJy4vZ2F0ZXMvRzNQYWdlLmpzJyk7XG5jb25zdCB7IEc0UGFnZSB9ID0gcmVxdWlyZSgnLi9nYXRlcy9HNFBhZ2UuanMnKTtcblxuY2xhc3MgV2l6YXJkUGFnZSB7XG4gIGNvbnN0cnVjdG9yKG9wdHMpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsID0gb3B0cy5jb250YWluZXJFbDtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBuZXcgV2l6YXJkQ29udHJvbGxlcigpO1xuICAgIHRoaXMuY3VycmVudFBhZ2UgPSBudWxsO1xuXG4gICAgdGhpcy5yZW5kZXIoKTtcblxuICAgIHRoaXMuY29udHJvbGxlci5zdWJzY3JpYmUoKGV2dCkgPT4ge1xuICAgICAgaWYgKGV2dCA9PT0gJ0dBVEVfTE9DS0VEJyB8fCBldnQgPT09ICdHQVRFX1VOTE9DS0VEJyB8fCBldnQgPT09ICdSRVNFVCcpIHtcbiAgICAgICAgdGhpcy5fcmVuZGVyQ3VycmVudFN0YWdlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgdGhpcy5jb250YWluZXJFbC5pbm5lckhUTUwgPSBgXG4gICAgICA8ZGl2IGNsYXNzPVwid2l6YXJkLXBhZ2VcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInBhZ2UtaGVhZGVyXCI+XG4gICAgICAgICAgPGgyPlx1QUNBQ1x1QzgwMSBcdUI5QzhcdUJDOTVcdUM3OTA8L2gyPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJzdWJ0aXRsZVwiPjVcdUIyRTggXHVBQzhDXHVDNzc0XHVEMkI4IFx1Qzc5MFx1QjNEOVx1RDY1NCAoRzEgXHUyMTkyIEcyIFx1MjE5MiBHMyBcdTIxOTIgRzQgXHUyMTkyIEc1IFx1QzYzNVx1QzE1OCk8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgPGRpdiBpZD1cInByb2dyZXNzLWNvbnRhaW5lclwiPjwvZGl2PlxuICAgICAgICA8ZGl2IGlkPVwic3RhZ2UtY29udGFpbmVyXCI+PC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICBgO1xuXG4gICAgbmV3IFByb2dyZXNzQmFyKHtcbiAgICAgIGNvbnRhaW5lckVsOiB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNwcm9ncmVzcy1jb250YWluZXInKSxcbiAgICAgIGNvbnRyb2xsZXI6IHRoaXMuY29udHJvbGxlclxuICAgIH0pO1xuXG4gICAgdGhpcy5fcmVuZGVyQ3VycmVudFN0YWdlKCk7XG4gIH1cblxuICBfcmVuZGVyQ3VycmVudFN0YWdlKCkge1xuICAgIGNvbnN0IHN0YWdlID0gdGhpcy5jb250cm9sbGVyLmdldFN0YXRlKCkuY3VycmVudFN0YWdlO1xuICAgIGNvbnN0IHN0YWdlRWwgPSB0aGlzLmNvbnRhaW5lckVsLnF1ZXJ5U2VsZWN0b3IoJyNzdGFnZS1jb250YWluZXInKTtcblxuICAgIGlmICh0aGlzLmN1cnJlbnRQYWdlICYmIHRoaXMuY3VycmVudFBhZ2UuZGVzdHJveSkgdGhpcy5jdXJyZW50UGFnZS5kZXN0cm95KCk7XG4gICAgc3RhZ2VFbC5pbm5lckhUTUwgPSAnJztcblxuICAgIHN3aXRjaCAoc3RhZ2UpIHtcbiAgICAgIGNhc2UgJ0cxJzogdGhpcy5jdXJyZW50UGFnZSA9IG5ldyBHMVBhZ2UoeyBjb250YWluZXJFbDogc3RhZ2VFbCwgY29udHJvbGxlcjogdGhpcy5jb250cm9sbGVyIH0pOyBicmVhaztcbiAgICAgIGNhc2UgJ0cyJzogdGhpcy5jdXJyZW50UGFnZSA9IG5ldyBHMlBhZ2UoeyBjb250YWluZXJFbDogc3RhZ2VFbCwgY29udHJvbGxlcjogdGhpcy5jb250cm9sbGVyIH0pOyBicmVhaztcbiAgICAgIGNhc2UgJ0czJzogdGhpcy5jdXJyZW50UGFnZSA9IG5ldyBHM1BhZ2UoeyBjb250YWluZXJFbDogc3RhZ2VFbCwgY29udHJvbGxlcjogdGhpcy5jb250cm9sbGVyIH0pOyBicmVhaztcbiAgICAgIGNhc2UgJ0c0JzogdGhpcy5jdXJyZW50UGFnZSA9IG5ldyBHNFBhZ2UoeyBjb250YWluZXJFbDogc3RhZ2VFbCwgY29udHJvbGxlcjogdGhpcy5jb250cm9sbGVyIH0pOyBicmVhaztcbiAgICAgIGNhc2UgJ0c1JzpcbiAgICAgIGNhc2UgJ0NPTVBMRVRFJzpcbiAgICAgICAgc3RhZ2VFbC5pbm5lckhUTUwgPSBgXG4gICAgICAgICAgPGRpdiBjbGFzcz1cImdhdGUtcGFnZVwiPlxuICAgICAgICAgICAgPGgyPlx1QUNBQ1x1QzgwMSBcdUM2NDRcdUMxMzEgKFx1Qzc5MFx1QjNEOVx1RDY1NCA5NSUpPC9oMj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJnYXRlLXN1YnRpdGxlXCI+RzUgXHVDNzkwXHVDN0FDIFx1QzEyMFx1RDBERFx1Qzc0MCBcdUM2MzVcdUMxNTggLyBQaGFzZSA0IFdlZWsgNFx1QzVEMFx1QzExQyBcdUQ2NUNcdUMxMzFcdUQ2NTQgXHVDNjA4XHVDODE1PC9kaXY+XG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwicHJpbWFyeVwiIG9uY2xpY2s9XCJsb2NhdGlvbi5yZWxvYWQoKVwiPlx1QzBDOCBcdUFDQUNcdUM4MDEgXHVCOUNDXHVCNEU0XHVBRTMwPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgV2l6YXJkUGFnZTogV2l6YXJkUGFnZSB9O1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBU0EsUUFBTSxFQUFFLFFBQVEsSUFBSTtBQUVwQixRQUFNLE9BQU4sTUFBVztBQUFBLE1BQ1QsWUFBWSxNQUFNO0FBQ2hCLGFBQUssS0FBSyxLQUFLO0FBQ2YsYUFB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
