/* ══════════════════════════════════════════════════════════════════
   ECOREAN 견적OS ↔ BOC 공정관리 연계 엔진 — ECOREAN.WorkPackage.v1
   ------------------------------------------------------------------
   왜 필요한가:
     견적OS(TAB11)의 공정표는  일수 = base + 계수×면적  의 개략식이라
     "몇 ㎡를 몇 명이 며칠에" 라는 실물량 근거가 없다.
     BOC 공정관리(PMS)는 선행공정·인력·자재·게이트를 갖췄지만
     일수는 템플릿 기본값 × 면적비율 추정이다.
     → 견적의 실물량·노무비를 PMS 공정에 주입해 일수·인력·자재를 실산출한다.

   산출 모델:
     인일(man-day) = Σ 노무비 ÷ 직종별 일당
     일수           = max( ceil(인일 ÷ 투입인력), 코드별 최소일수(dr), 1 )
     인력           = 직종별 인일 ÷ 일수  (최소 1명)
     ※ 양생·시험·게이트 공정은 물량과 무관 → 템플릿 일수 유지

   전송 경로: localStorage 브리지(같은 브라우저) + APP_CLOUD(기기 간)
   ────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var SCHEMA = 'ECOREAN.WorkPackage.v1';
  var APP = 'boc-workpackage';
  var LS_KEY = 'ecorean_wp_bridge_v1';
  var LS_SEEN = 'ecorean_wp_seen_v1';
  var LS_WAGE = 'ecorean_wp_wage_v1';

  /* ── 직종별 일당(원/인일) — 2026 시중노임 근사. 사용자가 조정 가능 ── */
  var WAGE_DEFAULT = {
    '소장': 350000, '관리': 300000, '잡역': 180000, '보통인부': 180000,
    '철거공': 220000, '목공': 270000, '경량철골': 260000, '비계공': 250000,
    '방수공': 260000, '미장공': 270000, '타일공': 300000, '석공': 320000,
    '도장공': 250000, '도배공': 240000, '바닥공': 250000,
    '전기공': 280000, '통신공': 260000, '배관공': 280000, '가스공': 290000,
    '덕트공': 260000, '난방공': 260000, '에어컨공': 260000,
    '가구공': 260000, '금속공': 270000, '유리공': 260000, '창호공': 270000,
    '청소': 160000
  };

  function getWage() {
    var w = {}, k;
    for (k in WAGE_DEFAULT) w[k] = WAGE_DEFAULT[k];
    try {
      var raw = JSON.parse(localStorage.getItem(LS_WAGE) || '{}');
      for (k in raw) if (raw[k] > 0) w[k] = +raw[k];
    } catch (e) {}
    return w;
  }
  function setWage(obj) {
    try { localStorage.setItem(LS_WAGE, JSON.stringify(obj || {})); } catch (e) {}
  }

  /* ── 견적 단가코드 → BOC 공정 매핑 ────────────────────────────
       ph    : 대상 공정 id (BOC 템플릿 기준)
       split : 두 공정으로 나뉘는 항목 [[공정,비중],...]  (예: 콘센트=배선+기구)
       tr    : 대표 직종 (일당 → 인일 환산 기준)
     ──────────────────────────────────────────────────────────── */
  var MAP = {
    /* 기획관리 */
    MNG_PM: { ph: 'PRE', tr: '관리' }, MNG_DS: { ph: 'PRE', tr: '관리' }, MNG_PH: { ph: 'PRE', tr: '관리' },
    /* 사전공정 */
    PRE_PR: { ph: 'PRE', tr: '잡역' }, PRE_PR2: { ph: 'PRE', tr: '잡역' },
    PRE_FL: { ph: 'DEM', tr: '철거공' }, PRE_TL: { ph: 'DEM', tr: '철거공' },
    PRE_WL: { ph: 'DEM', tr: '철거공' }, PRE_CL: { ph: 'DEM', tr: '철거공' },
    PRE_BT: { ph: 'DEM', tr: '철거공' }, PRE_KT: { ph: 'DEM', tr: '철거공' },
    PRE_WS: { ph: 'DEM_OUT', tr: '잡역' }, PRE_LF: { ph: 'DEM_OUT', tr: '잡역' }, PRE_EV: { ph: 'DEM_OUT', tr: '잡역' },
    /* 목공골조 */
    CARP_CF: { ph: 'CEIL_F', tr: '경량철골' }, CARP_UM: { ph: 'CEIL_F', tr: '목공' },
    CARP_UM2: { ph: 'CEIL_F', tr: '목공' }, CARP_IB: { ph: 'CEIL_F', tr: '목공' }, CARP_CB2: { ph: 'CEIL_F', tr: '목공' },
    CARP_CB: { ph: 'CEIL_M', tr: '목공' },
    CARP_PT: { ph: 'FRM', tr: '경량철골' },
    CARP_IN: { ph: 'WALL', tr: '목공' }, CARP_BA: { ph: 'WALL', tr: '목공' },
    CARP_DW: { ph: 'DOOR', tr: '목공' }, CARP_DW2: { ph: 'DOOR', tr: '목공' },
    CARP_AW: { ph: 'WOOD_F', tr: '목공' },
    /* 전기 — 배선(1차) / 기구(2차) 분할 */
    ELE_WR: { ph: 'ELC_R', tr: '전기공' }, ELE_DB: { ph: 'ELC_R', tr: '전기공' }, ELE_DB2: { ph: 'ELC_R', tr: '전기공' },
    ELE_HL: { ph: 'ELC_R', tr: '전기공' }, ELE_HF: { ph: 'ELC_R', tr: '전기공' },
    ELE_EV: { ph: 'ELC_R', tr: '전기공' }, ELE_EM: { ph: 'ELC_R', tr: '전기공' },
    ELE_OT: { split: [['ELC_R', 0.6], ['FIX_LIT', 0.4]], tr: '전기공' },
    ELE_OT2: { split: [['ELC_R', 0.6], ['FIX_LIT', 0.4]], tr: '전기공' },
    ELE_OT3: { split: [['ELC_R', 0.6], ['FIX_LIT', 0.4]], tr: '전기공' },
    ELE_SW: { split: [['ELC_R', 0.5], ['FIX_LIT', 0.5]], tr: '전기공' },
    ELE_SW2: { split: [['ELC_R', 0.5], ['FIX_LIT', 0.5]], tr: '전기공' },
    ELE_LT: { ph: 'FIX_LIT', tr: '전기공' }, ELE_LT2: { ph: 'FIX_LIT', tr: '전기공' }, ELE_LT3: { ph: 'FIX_LIT', tr: '전기공' },
    ELE_IL: { ph: 'FIX_LIT', tr: '전기공' }, ELE_FD: { ph: 'FIX_LIT', tr: '전기공' },
    ELE_IP: { split: [['ELC_R', 0.4], ['FIX_LIT', 0.6]], tr: '통신공' },
    ELE_TV: { split: [['ELC_R', 0.5], ['FIX_LIT', 0.5]], tr: '통신공' },
    ELE_AC: { split: [['ELC_R', 0.5], ['HVAC_R', 0.5]], tr: '전기공' },
    ELE_VN: { split: [['ELC_R', 0.4], ['FIX_AC', 0.6]], tr: '전기공' },
    ELE_VN2: { split: [['ELC_R', 0.4], ['FIX_AC', 0.6]], tr: '전기공' },
    /* 설비 — 배관(1차) / 기구(2차) / 보일러·가스 */
    PLM_WBS: { ph: 'PLB_R', tr: '배관공' }, PLM_WBD: { ph: 'PLB_R', tr: '배관공' },
    PLM_TLS: { ph: 'PLB_R', tr: '배관공' }, PLM_TLD: { ph: 'PLB_R', tr: '배관공' },
    PLM_SHS: { ph: 'PLB_R', tr: '배관공' }, PLM_SHD: { ph: 'PLB_R', tr: '배관공' },
    PLM_BTS: { ph: 'PLB_R', tr: '배관공' }, PLM_BTD: { ph: 'PLB_R', tr: '배관공' },
    PLM_SKS: { ph: 'PLB_R', tr: '배관공' }, PLM_WMS: { ph: 'PLB_R', tr: '배관공' }, PLM_WM: { ph: 'PLB_R', tr: '배관공' },
    PLM_DWS: { ph: 'PLB_R', tr: '배관공' }, PLM_TR: { ph: 'PLB_R', tr: '배관공' }, PLM_TD: { ph: 'PLB_R', tr: '배관공' },
    PLM_RD: { ph: 'PLB_R', tr: '배관공' },
    PLM_WBF: { ph: 'FIX_SAN', tr: '배관공' }, PLM_TLI: { ph: 'FIX_SAN', tr: '배관공' }, PLM_TLB: { ph: 'FIX_SAN', tr: '배관공' },
    PLM_SHF: { ph: 'FIX_SAN', tr: '배관공' }, PLM_SHR: { ph: 'FIX_SAN', tr: '배관공' }, PLM_BTI: { ph: 'FIX_SAN', tr: '배관공' },
    PLM_TB: { ph: 'FIX_SAN', tr: '배관공' }, PLM_TB2: { ph: 'FIX_SAN', tr: '배관공' }, PLM_SKF: { ph: 'FIX_SAN', tr: '배관공' },
    PLM_TP: { ph: 'FIX_SAN', tr: '배관공' }, PLM_SF: { ph: 'FIX_SAN', tr: '배관공' }, PLM_SF2: { ph: 'FIX_SAN', tr: '배관공' },
    PLM_OD: { ph: 'FIX_SAN', tr: '배관공' }, PLM_FT2: { ph: 'FIX_SAN', tr: '배관공' }, PLM_FT3: { ph: 'FIX_SAN', tr: '배관공' },
    PLM_FT4: { ph: 'FIX_SAN', tr: '배관공' },
    PLM_BL: { ph: 'PLB_BLR', tr: '배관공' }, PLM_HW: { ph: 'PLB_BLR', tr: '배관공' }, PLM_WH: { ph: 'PLB_BLR', tr: '배관공' },
    PLM_GS: { ph: 'PLB_BLR', tr: '가스공' },
    /* 습식 */
    WET_WP: { ph: 'WPF', tr: '방수공' }, WET_WP2: { ph: 'WPF', tr: '방수공' }, WET_WP3: { ph: 'WPF', tr: '방수공' },
    WET_SL: { ph: 'WPF', tr: '미장공' },
    WET_TW_CE: { ph: 'TIL', tr: '타일공' }, WET_TW_PO: { ph: 'TIL', tr: '타일공' }, WET_TW_MA: { ph: 'TIL', tr: '석공' },
    WET_TF_CE: { ph: 'TIL', tr: '타일공' }, WET_TF_PO: { ph: 'TIL', tr: '타일공' }, WET_TF_MA: { ph: 'TIL', tr: '석공' },
    WET_KT: { ph: 'TIL', tr: '타일공' }, WET_GR: { ph: 'TIL', tr: '타일공' }, WET_GR2: { ph: 'TIL', tr: '타일공' },
    WET_MS: { ph: 'FLH', tr: '미장공' },
    /* 창호·금속 */
    WIN_SY: { ph: 'WIN', tr: '창호공' }, WIN_SY2: { ph: 'WIN', tr: '창호공' }, WIN_SY3: { ph: 'WIN', tr: '창호공' },
    WIN_SYL: { ph: 'WIN', tr: '창호공' }, WIN_AL: { ph: 'WIN', tr: '창호공' }, WIN_AL2: { ph: 'WIN', tr: '창호공' },
    WIN_FD: { ph: 'WIN', tr: '창호공' }, WIN_FD2: { ph: 'WIN', tr: '창호공' },
    WIN_EN: { ph: 'WIN', tr: '창호공' }, WIN_EN2: { ph: 'WIN', tr: '창호공' },
    WIN_SC: { ph: 'WIN', tr: '창호공' }, WIN_SC2: { ph: 'WIN', tr: '창호공' },
    WIN_MD: { ph: 'DOOR', tr: '목공' }, WIN_MD2: { ph: 'DOOR', tr: '목공' },
    WIN_GL: { ph: 'METAL', tr: '유리공' }, WIN_RL: { ph: 'METAL', tr: '금속공' },
    WIN_BL: { ph: 'FIX_ACC', tr: '잡역' }, WIN_BL2: { ph: 'FIX_ACC', tr: '잡역' },
    /* 수장 */
    FIN_PT: { ph: 'PNT', tr: '도장공' },
    FIN_PA: { ph: 'PNT', tr: '도장공' }, FIN_PA2: { ph: 'PNT', tr: '도장공' }, FIN_PA3: { ph: 'PNT', tr: '도장공' },
    FIN_PA4: { ph: 'PNT', tr: '도장공' }, FIN_PA5: { ph: 'PNT', tr: '도장공' }, FIN_PA6: { ph: 'PNT', tr: '도장공' },
    FIN_WP: { ph: 'PNT', tr: '도배공' }, FIN_WP2: { ph: 'PNT', tr: '도배공' }, FIN_WP3: { ph: 'PNT', tr: '도배공' },
    FIN_WP4: { ph: 'PNT', tr: '도배공' }, FIN_WC: { ph: 'PNT', tr: '도배공' },
    FIN_FM: { ph: 'PNT', tr: '도장공' }, FIN_MC: { ph: 'PNT', tr: '미장공' },
    FIN_MR: { ph: 'FLR', tr: '바닥공' }, FIN_MR2: { ph: 'FLR', tr: '바닥공' }, FIN_MR3: { ph: 'FLR', tr: '바닥공' },
    FIN_LV: { ph: 'FLR', tr: '바닥공' }, FIN_LV2: { ph: 'FLR', tr: '바닥공' },
    FIN_OW: { ph: 'FLR', tr: '바닥공' }, FIN_OW2: { ph: 'FLR', tr: '바닥공' },
    FIN_SP: { ph: 'FLR', tr: '바닥공' }, FIN_SP2: { ph: 'FLR', tr: '바닥공' },
    FIN_JP: { ph: 'FLR', tr: '바닥공' }, FIN_CR: { ph: 'FLR', tr: '바닥공' }, FIN_DK: { ph: 'FLR', tr: '바닥공' },
    FIN_BB: { ph: 'FLR', tr: '바닥공' }, FIN_BB2: { ph: 'FLR', tr: '바닥공' },
    FIN_ML: { ph: 'WOOD_F', tr: '목공' }, FIN_ML2: { ph: 'WOOD_F', tr: '목공' },
    FIN_AW: { ph: 'WOOD_F', tr: '목공' }, FIN_AW2: { ph: 'WOOD_F', tr: '목공' },
    FIN_TX: { ph: 'CEIL_M', tr: '경량철골' }, FIN_MT: { ph: 'CEIL_M', tr: '경량철골' },
    FIN_SL: { ph: 'SIL', tr: '잡역' }, FIN_SL2: { ph: 'SIL', tr: '잡역' },
    /* 욕실마감 */
    BTH_CL: { ph: 'CEIL_W', tr: '경량철골' }, BTH_CL2: { ph: 'CEIL_W', tr: '경량철골' },
    BTH_MR: { ph: 'FIX_ACC', tr: '잡역' }, BTH_MC: { ph: 'FIX_ACC', tr: '잡역' },
    BTH_AC: { ph: 'FIX_ACC', tr: '잡역' }, BTH_HK: { ph: 'FIX_ACC', tr: '잡역' },
    BTH_TP: { ph: 'FIX_ACC', tr: '잡역' }, BTH_SR: { ph: 'FIX_ACC', tr: '잡역' }, BTH_FL: { ph: 'FIX_ACC', tr: '잡역' },
    BTH_SH: { ph: 'METAL', tr: '유리공' }, BTH_SD: { ph: 'METAL', tr: '유리공' },
    BTH_VN: { ph: 'FIX_AC', tr: '에어컨공' }, BTH_SB: { ph: 'FIX_SAN', tr: '배관공' },
    BTH_UD: { ph: 'FURN_B', tr: '가구공' },
    /* 주방마감 */
    KIT_HV: { ph: 'FURN_K', tr: '가구공' }, KIT_HV2: { ph: 'FURN_K', tr: '가구공' },
    KIT_CP: { ph: 'FURN_K', tr: '가구공' }, KIT_IH: { ph: 'FURN_K', tr: '가구공' },
    KIT_OV: { ph: 'FURN_K', tr: '가구공' }, KIT_DW: { ph: 'FURN_K', tr: '가구공' },
    KIT_MS: { ph: 'FURN_K', tr: '가구공' }, KIT_RF: { ph: 'FURN_K', tr: '가구공' },
    KIT_WF: { ph: 'FURN_K', tr: '가구공' }, KIT_BK: { ph: 'TIL', tr: '타일공' },
    /* 가구 */
    CAB_KT_L: { ph: 'FURN_K', tr: '가구공' }, CAB_KT_U: { ph: 'FURN_K', tr: '가구공' },
    CAB_KT_D: { ph: 'FURN_K', tr: '가구공' }, CAB_KT_C: { ph: 'FURN_K', tr: '가구공' },
    CAB_CT_IM: { ph: 'FURN_K', tr: '가구공' }, CAB_CT_QZ: { ph: 'FURN_K', tr: '가구공' },
    CAB_CT_CE: { ph: 'FURN_K', tr: '가구공' }, CAB_CT_MR: { ph: 'FURN_K', tr: '가구공' },
    CAB_CT_SS: { ph: 'FURN_K', tr: '가구공' }, CAB_IS: { ph: 'FURN_K', tr: '가구공' },
    CAB_BL: { ph: 'FURN_B', tr: '가구공' }, CAB_BL2: { ph: 'FURN_B', tr: '가구공' }, CAB_BL3: { ph: 'FURN_B', tr: '가구공' },
    CAB_BL_HG: { ph: 'FURN_B', tr: '가구공' }, CAB_BL_DW: { ph: 'FURN_B', tr: '가구공' },
    CAB_SH: { ph: 'FURN_B', tr: '가구공' }, CAB_TL: { ph: 'FURN_B', tr: '가구공' },
    CAB_TV: { ph: 'FURN_B', tr: '가구공' }, CAB_BK: { ph: 'FURN_B', tr: '가구공' },
    CAB_WD: { ph: 'FURN_B', tr: '가구공' }, CAB_VN: { ph: 'FURN_B', tr: '가구공' }, CAB_VN2: { ph: 'FURN_B', tr: '가구공' },
    /* 에어컨·공조 */
    AC_IN: { ph: 'FIX_AC', tr: '에어컨공' }, AC_IN2: { ph: 'FIX_AC', tr: '에어컨공' }, AC_IN3: { ph: 'FIX_AC', tr: '에어컨공' },
    AC_DF: { ph: 'FIX_AC', tr: '에어컨공' },
    AC_HV: { split: [['HVAC_R', 0.5], ['FIX_AC', 0.5]], tr: '덕트공' },
    AC_HV2: { split: [['HVAC_R', 0.5], ['FIX_AC', 0.5]], tr: '덕트공' },
    /* 스마트홈 */
    SMT_WP: { ph: 'FIX_LIT', tr: '통신공' }, SMT_DL: { ph: 'FIX_LIT', tr: '통신공' },
    SMT_SC: { ph: 'FIX_LIT', tr: '통신공' }, SMT_SE: { ph: 'FIX_LIT', tr: '통신공' },
    SMT_SL: { ph: 'FIX_LIT', tr: '전기공' }, SMT_CU: { ph: 'FIX_ACC', tr: '전기공' },
    /* 발코니·외부 */
    EXT_EX: { ph: 'FRM', tr: '목공' }, EXT_IN: { ph: 'WALL', tr: '목공' },
    EXT_SC: { ph: 'WIN', tr: '창호공' }, EXT_SC2: { ph: 'WIN', tr: '창호공' },
    EXT_FL: { ph: 'FLH', tr: '미장공' }, EXT_WP: { ph: 'WPF', tr: '방수공' },
    /* 준공·인도 */
    END_BK: { ph: 'CL_RGH', tr: '잡역' },
    END_CL: { ph: 'CL_FIN', tr: '청소' }, END_CL2: { ph: 'CL_FIN', tr: '청소' },
    END_FI: { ph: 'FIX_CHK', tr: '관리' }, END_WR: { ph: 'FIX_CHK', tr: '잡역' },
    END_PH: { ph: 'HND', tr: '관리' }, END_KY: { ph: 'HND', tr: '관리' }
  };

  /* 코드가 매핑표에 없을 때의 접두어 폴백 */
  var PREFIX = {
    MNG: { ph: 'PRE', tr: '관리' }, PRE: { ph: 'DEM', tr: '철거공' }, CARP: { ph: 'CEIL_F', tr: '목공' },
    ELE: { ph: 'ELC_R', tr: '전기공' }, PLM: { ph: 'PLB_R', tr: '배관공' }, WET: { ph: 'TIL', tr: '타일공' },
    WIN: { ph: 'WIN', tr: '창호공' }, FIN: { ph: 'PNT', tr: '도장공' }, BTH: { ph: 'FIX_ACC', tr: '잡역' },
    KIT: { ph: 'FURN_K', tr: '가구공' }, CAB: { ph: 'FURN_B', tr: '가구공' }, AC: { ph: 'FIX_AC', tr: '에어컨공' },
    SMT: { ph: 'FIX_LIT', tr: '통신공' }, EXT: { ph: 'WIN', tr: '창호공' }, END: { ph: 'CL_FIN', tr: '청소' }
  };

  /* 템플릿마다 공정 id 체계가 다름(실내건축·RC신축·쌍용동·부분시공) →
     대상 공정이 없으면 아래 순서로 흡수한다. 끝까지 못 찾으면 '흡수 불가'로 보고. */
  var FALLBACK = {
    PRE: ['PRE', 'DEM'],
    DEM: ['DEM', 'PRE'],
    DEM_OUT: ['DEM_OUT', 'DEM', 'PRE', 'CLEAN', 'CL_RGH', 'CLN'],
    FRM: ['FRM', 'IW_WALL', 'CARP', 'WALL'],
    CEIL_F: ['CEIL_F', 'IW_CEIL', 'CARP', 'FRM', 'IW_WALL'],
    CEIL_M: ['CEIL_M', 'IW_CEIL', 'CARP', 'CEIL_F', 'IW_WALL'],
    WALL: ['WALL', 'IW_WALL', 'CARP', 'FRM'],
    WPF: ['WPF', 'TIL'],
    TIL: ['TIL', 'WPF'],
    FLH: ['FLH', 'HEAT_AX', 'FLR'],
    PLB_R: ['PLB_R', 'PLB', 'PLB_BLR'],
    PLB_BLR: ['PLB_BLR', 'PLB_R', 'PLB', 'HEAT_AX'],
    ELC_R: ['ELC_R', 'ELC_IN', 'ELC', 'ELC_CHK'],
    HVAC_R: ['HVAC_R', 'AC_PIPE', 'AC_SET', 'FIX_AC'],
    WIN: ['WIN', 'FACADE', 'ENTDOOR', 'METAL', 'GLASS', 'FRM', 'CARP'],
    PNT: ['PNT', 'WALLP'],
    FLR: ['FLR', 'FLH'],
    DOOR: ['DOOR', 'ENTDOOR', 'CARP', 'WOOD_F', 'FUR'],
    WOOD_F: ['WOOD_F', 'CARP', 'DOOR', 'SIL'],
    FURN_K: ['FURN_K', 'FURN', 'FUR'],
    FURN_B: ['FURN_B', 'FURN', 'FUR', 'FURN_K'],
    METAL: ['METAL', 'GLASS', 'WIN', 'FACADE'],
    CEIL_W: ['CEIL_W', 'CEIL_M', 'IW_CEIL', 'CARP', 'TIL'],
    FIX_SAN: ['FIX_SAN', 'FIX', 'PLB'],
    FIX_LIT: ['FIX_LIT', 'LIT', 'ELC_CHK', 'ELC', 'FIX'],
    FIX_AC: ['FIX_AC', 'AC_SET', 'AC_PIPE', 'FIX'],
    FIX_ACC: ['FIX_ACC', 'FIX', 'SIL', 'FIX_SAN'],
    SIL: ['SIL', 'FIX_ACC', 'FIX'],
    CL_RGH: ['CL_RGH', 'CLEAN', 'CLN'],
    CL_FIN: ['CL_FIN', 'CLEAN', 'CLN'],
    FIX_CHK: ['FIX_CHK', 'CHK', 'HND'],
    HND: ['HND', 'GOV']
  };

  /* 표준 공정 정의 — 견적엔 있으나 템플릿엔 없는 공정을 새로 만들 때 사용.
     ORDER 는 실내건축 표준 시공 순서이며 삽입 위치와 선행관계를 정한다. */
  var ORDER = ['PRE', 'DEM', 'DEM_OUT', 'FRM', 'WPF', 'WP_TEST', 'PLB_R', 'PLB_BLR', 'PLB_TEST',
    'HVAC_R', 'ELC_R', 'CEIL_F', 'WALL', 'CEIL_M', 'FLH', 'FLH_TEST', 'WIN', 'TIL', 'CEIL_W',
    'PNT', 'FLR', 'DOOR', 'WOOD_F', 'FURN_K', 'FURN_B', 'METAL', 'FIX_SAN', 'FIX_LIT',
    'FIX_AC', 'FIX_ACC', 'SIL', 'CL_RGH', 'CL_FIN', 'FIX_CHK', 'HND'];
  var PHASE_DEF = {
    PRE: { nm: '현장조사·실측·보양', sub: '실측·보양·준비', cat: 'prep', cp: 1 },
    DEM: { nm: '철거·해체', sub: '마감·습식·설비 철거', cat: 'demo', cp: 1 },
    DEM_OUT: { nm: '폐기물 반출·정리', sub: '분리·반출', cat: 'demo', cp: 1 },
    FRM: { nm: '조적·가벽·구조보수', sub: '가벽 신설·구조보강', cat: 'frame', cp: 1 },
    WPF: { nm: '방수(욕실·발코니)', sub: '바닥·벽 방수', cat: 'wp', cp: 1 },
    WP_TEST: { nm: '방수 담수시험 ★게이트', sub: '48h 침수시험', cat: 'wp', cp: 1 },
    PLB_R: { nm: '설비 배관(급배수·난방)', sub: '급배수·난방관 배관', cat: 'plb', cp: 1 },
    PLB_BLR: { nm: '보일러·가스 배관', sub: '보일러·가스관', cat: 'plb', cp: 0 },
    PLB_TEST: { nm: '배관 수압·가스시험 ★게이트', sub: '수압·누설 시험', cat: 'plb', cp: 1 },
    HVAC_R: { nm: '환기·에어컨 배관', sub: '덕트·냉매관 매립', cat: 'hvac', cp: 0 },
    ELC_R: { nm: '전기 배관·입선', sub: '전등·전열·통신 배관/배선', cat: 'elec', cp: 1 },
    CEIL_F: { nm: '천장틀·하지', sub: '천정틀+등박스+점검구', cat: 'ceil', cp: 1 },
    WALL: { nm: '벽체 석고·미장·면처리', sub: '석고·조인트·면처리', cat: 'wall', cp: 1 },
    CEIL_M: { nm: '천장 석고·마감틀', sub: '천장 석고+점검구', cat: 'ceil', cp: 1 },
    FLH: { nm: '바닥난방·방통', sub: '단열+난방관+방통', cat: 'floor_h', cp: 1 },
    FLH_TEST: { nm: '난방시험·방통양생 ★게이트', sub: '가동+양생/함수율', cat: 'floor_h', cp: 1 },
    WIN: { nm: '창호·현관문 설치', sub: '시스템창호·현관문·방충망', cat: 'win', cp: 1 },
    TIL: { nm: '타일·석재(욕실·현관)', sub: '바닥·벽 타일+석재', cat: 'tile', cp: 0 },
    CEIL_W: { nm: '욕실 천장 마감', sub: 'SMC·루버 천장', cat: 'ceil', cp: 0 },
    PNT: { nm: '도장·도배', sub: '천장·벽 마감', cat: 'paint', cp: 1 },
    FLR: { nm: '바닥마감(마루·장판)', sub: '마루·장판 시공', cat: 'floor_f', cp: 1 },
    DOOR: { nm: '내부도어·중문 설치', sub: '도어+하드웨어', cat: 'wood', cp: 0 },
    WOOD_F: { nm: '몰딩·아트월·목공마감', sub: '몰딩·디테일', cat: 'wood', cp: 0 },
    FURN_K: { nm: '주방가구 설치', sub: '상·하부장+상판+빌트인', cat: 'furn', cp: 1 },
    FURN_B: { nm: '붙박이·신발장·수납', sub: '붙박이장·신발장', cat: 'furn', cp: 0 },
    METAL: { nm: '금속·유리·파티션', sub: '난간·유리·거울', cat: 'metal', cp: 0 },
    FIX_SAN: { nm: '위생도기 설치', sub: '양변기·세면·욕조·수전', cat: 'fix', cp: 1 },
    FIX_LIT: { nm: '조명·전기기구 설치', sub: '조명+스위치+콘센트 마감', cat: 'fix', cp: 1 },
    FIX_AC: { nm: '에어컨·환기기구 설치', sub: '실내외기+환기팬+그릴', cat: 'fix', cp: 0 },
    FIX_ACC: { nm: '욕실 액세서리·기타기구', sub: '거울·선반·수건걸이', cat: 'fix', cp: 0 },
    SIL: { nm: '실란트·코킹·터치업', sub: '전체 마감 보수', cat: 'fin', cp: 1 },
    CL_RGH: { nm: '거친청소', sub: '잔재 반출+1차청소', cat: 'fin', cp: 1 },
    CL_FIN: { nm: '정밀청소·입주청소', sub: '입주 전 전문청소', cat: 'fin', cp: 1 },
    FIX_CHK: { nm: '하자 전수점검 ★게이트', sub: '전공종 작동·마감 점검', cat: 'fin', cp: 1 },
    HND: { nm: '준공·인도', sub: '검수·인도·AS', cat: 'fin', cp: 1 }
  };

  /* 자재 리드타임(일) — 발주 시점 역산용. 키워드 우선순위 순서대로 검사 */
  var LEAD = [
    [/주방가구|싱크대|하부장|상부장|키큰장|아일랜드/, 21],
    [/붙박이|드레스룸|시스템장|신발장|책장|거실장|수납장/, 21],
    [/상판|대리석|쿼츠|스테인리스/, 14],
    [/창호|이중창|삼중창|폴딩|현관문|방화문|새시|중문/, 14],
    [/보일러|온수기|전열교환|시스템에어컨/, 14],
    [/도어|문틀|포켓도어/, 10],
    [/양변기|변기|세면|욕조|자쿠지|수전|비데|샤워부스/, 10],
    [/타일|석재|포세린|세라믹/, 7],
    [/마루|LVT|SPC|원목|장판|카펫|데크/, 7],
    [/조명|등기구|월패드|도어락|인덕션|쿡탑|오븐|식기세척|후드|정수기|냉장고|전자레인지/, 7],
    [/에어컨|환기|제습|블라인드|거울|파티션|난간/, 7],
    [/벽지|도배|페인트|도장|퍼티|실리콘|줄눈|방수/, 5]
  ];
  function leadOf(nm) {
    for (var i = 0; i < LEAD.length; i++) if (LEAD[i][0].test(nm)) return LEAD[i][1];
    return 5;
  }

  /* 물량과 무관하게 템플릿 일수를 지키는 공정(양생·시험·게이트·인도) */
  function isGate(p) {
    if (!p) return false;
    if (+p.cure > 0) return true;
    return /게이트|시험|양생|담수|점검|검수|인도|준공/.test(p.nm || '');
  }

  var r2 = function (v) { return Math.round((+v || 0) * 100) / 100; };
  var r1 = function (v) { return Math.round((+v || 0) * 10) / 10; };

  function ruleFor(code) {
    if (MAP[code]) return MAP[code];
    var pre = String(code || '').split('_')[0];
    return PREFIX[pre] || null;
  }

  /* ══ 1. 견적 → 워크패키지 ══════════════════════════════════════ */
  function build(ctx) {
    ctx = ctx || {};
    var S = ctx.S || {}, lines = ctx.lines || [], sum = ctx.summary || {}, DB = ctx.DB || {};
    var wage = getWage();
    var packs = {}, unmapped = [];

    function pack(key) {
      if (!packs[key]) packs[key] = {
        key: key, manDays: 0, labor: 0, mat: 0, sup: 0, minDays: 1,
        trades: {}, items: [], materials: []
      };
      return packs[key];
    }

    lines.forEach(function (l) {
      var rule = ruleFor(l.code);
      if (!rule) { unmapped.push({ code: l.code, nm: l.nm, sup: +l.sup || 0 }); return; }
      var trade = rule.tr || '잡역';
      var dayWage = wage[trade] || 200000;
      var dr = (DB[l.code] && +DB[l.code].dr) || 1;
      var targets = rule.split || [[rule.ph, 1]];
      targets.forEach(function (t) {
        var p = pack(t[0]), w = t[1];
        var lb = (+l.lb || 0) * w, mt = (+l.mt || 0) * w, md = lb / dayWage;
        p.manDays += md; p.labor += lb; p.mat += mt; p.sup += (+l.sup || 0) * w;
        p.trades[trade] = (p.trades[trade] || 0) + md;
        if (dr > p.minDays) p.minDays = dr;
        p.items.push({
          code: l.code, nm: l.nm, u: l.u, q: r2((+l.q || 0) * w),
          lb: Math.round(lb), mt: Math.round(mt), md: r2(md), mj: l.mj, sub: l.md
        });
      });
    });

    /* 같은 단가코드가 공간별로 쪼개져 들어오므로 코드 단위로 합산한다.
       (공간별 내역은 spaces 와 ［공간］ 지시로 따로 전달) */
    function mergeByCode(list) {
      var m = {}, order = [];
      list.forEach(function (it) {
        var k = it.code;
        if (!m[k]) { m[k] = { code: it.code, nm: it.nm, u: it.u, q: 0, lb: 0, mt: 0, md: 0, mj: it.mj, sub: it.sub }; order.push(k); }
        m[k].q += it.q; m[k].lb += it.lb; m[k].mt += it.mt; m[k].md += it.md;
      });
      return order.map(function (k) {
        var it = m[k];
        it.q = r2(it.q); it.md = r2(it.md);
        it.lb = Math.round(it.lb); it.mt = Math.round(it.mt);
        return it;
      });
    }

    var arr = [], k, t;
    for (k in packs) {
      var p = packs[k];
      p.manDays = r1(p.manDays); p.labor = Math.round(p.labor);
      p.mat = Math.round(p.mat); p.sup = Math.round(p.sup);
      for (t in p.trades) p.trades[t] = r1(p.trades[t]);
      p.items = mergeByCode(p.items);
      p.materials = p.items.filter(function (it) { return it.mt > 0; })
        .map(function (it) { return { nm: it.nm, q: it.q, u: it.u, amt: it.mt, lead: leadOf(it.nm) }; })
        .sort(function (a, b) { return b.amt - a.amt; });
      arr.push(p);
    }

    return {
      schema: SCHEMA,
      sentAt: new Date().toISOString(),
      from: ctx.from || '견적OS',
      project: {
        name: S.name || '', addr: S.addr || '', mgr: S.mgr || '', tel: S.tel || '',
        startDate: S.startDate || '', buildingType: S.buildingType || '',
        area: +S.area || 0, floors: S.floors || 1, ceilingH: S.ceilingH || 2400,
        pkg: S.pkg || '', demolition: S.demolition || ''
      },
      totals: {
        supply: sum.supply || 0, labor: sum.labor || 0, mat: sum.mat || 0,
        total: sum.total || 0, perPy: sum.perPy || 0,
        manDays: r1(arr.reduce(function (s, p) { return s + p.manDays; }, 0))
      },
      spaces: (S.spaces || []).map(function (s) {
        return {
          fl: s.fl, nm: s.nm, type: s.type, area: +s.area || 0, perim: +s.perim || 0,
          h: +s.h || 2400, wet: !!s.wet, flF: s.flF, wlF: s.wlF
        };
      }),
      wage: wage,
      packages: arr,
      unmapped: unmapped
    };
  }

  /* ══ 2. 워크패키지 → 공정 반영 계획(diff) ══════════════════════ */
  function resolveIndex(key, phases) {
    var chain = FALLBACK[key] || [key];
    for (var c = 0; c < chain.length; c++) {
      for (var i = 0; i < phases.length; i++) if (phases[i].id === chain[c]) return i;
    }
    return -1;
  }

  var HELPER = /^(잡역|보통인부)$/;

  /* 기능공 인원 상한 — 작업면(현장) 제약. 템플릿 cap 우선, 없으면 기준인력의 2배 */
  function crewCapOf(p, tmplCrewTotal) {
    var n = 0, k;
    if (p && p.cap) { for (k in p.cap) n += +p.cap[k] || 0; }
    if (n > 0) return n;
    return Math.max((tmplCrewTotal || 0) * 2, (tmplCrewTotal || 0) + 2, 3);
  }

  /* 주어진 일수에 물량을 소화할 직종별 인원 (올림 — 물량 미소화 방지) */
  function crewFor(trades, dur) {
    var crew = {}, total = 0, t, n;
    for (t in trades) {
      n = Math.ceil(trades[t] / dur);
      if (n > 0) { crew[t] = n; total += n; }
    }
    return { crew: crew, total: total };
  }

  /* 인일 + 현장 인력상한 → 일수/직종별 인원 산출
     - 기능공은 상한(cap) 이상 투입하지 않고, 초과분은 일수로 흡수
     - 잡역은 보조인력이므로 일수 계산에서 빼고 기능공 3명당 1명 배치
     - fixedDur 가 주어지면 그 일수에 맞춰 인원만 재배분 */
  function sizePhase(pk, tmplSkilled, cap, tmplHelper, fixedDur) {
    var lim = cap > 0 ? cap : Math.max((tmplSkilled || 0) * 2, 3);
    var dur, c, g;
    if (fixedDur > 0) {
      dur = Math.max(fixedDur, pk.minDays, 1);
      c = crewFor(pk.trades, dur);
    } else {
      dur = Math.max(pk.minDays, Math.ceil(pk.manDays / Math.max(1, Math.min(tmplSkilled || 3, lim))), 1);
      for (g = 0; g < 40; g++) {
        c = crewFor(pk.trades, dur);
        if (c.total <= lim) break;
        dur++;                            /* 상한 초과 → 하루 늘려 재배분 */
      }
    }
    var crew = c.crew, total = c.total;
    if (!total) { crew['잡역'] = 1; total = 1; }
    else if (tmplHelper > 0) {
      var h = Math.max(1, Math.min(tmplHelper, Math.round(total / 3)));
      crew['잡역'] = (crew['잡역'] || 0) + h;
      total += h;
    }
    return { dur: dur, crew: crew, crewTotal: total };
  }

  function crewTotalOf(p, skipHelper) {
    var n = 0, bc = p.baseCrew, k;
    if (bc) {
      for (k in bc) { if (skipHelper && HELPER.test(k)) continue; n += +bc[k] || 0; }
      return n;
    }
    (p.crew || '').split(',').forEach(function (s) {
      var x = s.split(':');
      if (skipHelper && HELPER.test((x[0] || '').trim())) return;
      n += parseInt(x[1]) || 0;
    });
    return n;
  }
  function helperOf(p) {
    var n = 0, bc = p.baseCrew, k;
    if (bc) { for (k in bc) if (HELPER.test(k)) n += +bc[k] || 0; return n; }
    (p.crew || '').split(',').forEach(function (s) {
      var x = s.split(':');
      if (HELPER.test((x[0] || '').trim())) n += parseInt(x[1]) || 0;
    });
    return n;
  }
  function crewStr(obj) {
    var a = [], k;
    for (k in obj) a.push(k + ':' + obj[k]);
    return a.join(',');
  }

  /* mode:
       'safe' (기본) 견적일수와 템플릿일수 중 긴 쪽 — 견적 누락 항목이 있어도 공기가 무너지지 않음
       'est'         견적 실물량 그대로 — 견적이 완전할 때 가장 정확
  */
  function plan(phases, wp, opts) {
    opts = opts || {};
    var mode = opts.mode || 'safe';
    phases = phases || [];
    var byIdx = {}, rows = [], orphan = [];
    (wp.packages || []).forEach(function (pk) {
      var i = resolveIndex(pk.key, phases);
      if (i < 0) { orphan.push(pk); return; }
      if (!byIdx[i]) byIdx[i] = [];
      byIdx[i].push(pk);
    });

    phases.forEach(function (p, i) {
      var list = byIdx[i];
      if (!list) {
        rows.push({
          idx: i, id: p.id, nm: p.nm, matched: false, gate: isGate(p),
          dur0: p.dur, dur1: p.dur, crew0: p.crew, crew1: p.crew,
          manDays: 0, labor: 0, mat: 0, sup: 0, items: 0
        });
        return;
      }
      /* 같은 공정으로 흡수된 패키지 병합 */
      var m = { key: p.id, manDays: 0, labor: 0, mat: 0, sup: 0, minDays: 1, trades: {}, items: [], materials: [] };
      list.forEach(function (pk) {
        m.manDays += pk.manDays; m.labor += pk.labor; m.mat += pk.mat; m.sup += pk.sup;
        if (pk.minDays > m.minDays) m.minDays = pk.minDays;
        for (var t in pk.trades) m.trades[t] = (m.trades[t] || 0) + pk.trades[t];
        m.items = m.items.concat(pk.items);
        m.materials = m.materials.concat(pk.materials);
      });
      m.manDays = r1(m.manDays);
      var gate = isGate(p);
      var skilled = crewTotalOf(p, true);
      var sz = sizePhase(m, skilled, crewCapOf(p, skilled), helperOf(p));
      /* 템플릿의 상주 인력(소장·관리·신호수 등)은 물량과 무관하므로 유지 */
      if (p.fixCrew) for (var fj in p.fixCrew) sz.crew[fj] = p.fixCrew[fj];
      var durEst = sz.dur;
      var dur1 = gate ? p.dur : (mode === 'est' ? durEst : Math.max(durEst, p.dur || 1));
      if (!gate && dur1 !== durEst) {
        /* 늘어난 일수에 맞춰 인원을 다시 묽게 배분 */
        sz = sizePhase(m, skilled, crewCapOf(p, skilled), helperOf(p), dur1);
        if (p.fixCrew) for (var fj2 in p.fixCrew) sz.crew[fj2] = p.fixCrew[fj2];
      }
      var absorbed = [];
      list.forEach(function (pk) { if (pk.key !== p.id) absorbed.push(pk.key); });
      rows.push({
        idx: i, id: p.id, nm: p.nm, matched: true, gate: gate, absorbed: absorbed,
        dur0: p.dur, dur1: dur1, durEst: durEst,
        crew0: p.crew, crew1: gate ? p.crew : crewStr(sz.crew),
        manDays: m.manDays, labor: m.labor, mat: m.mat, sup: m.sup,
        thin: !gate && m.manDays < (skilled * (p.dur || 1)) * 0.4,
        items: m.items.length, _merged: m, _size: sz
      });
    });

    var d0 = 0, d1 = 0;
    rows.forEach(function (r) { d0 += r.dur0; d1 += r.dur1; });
    return {
      mode: mode, rows: rows, orphan: orphan,
      matched: rows.filter(function (r) { return r.matched; }).length,
      dropCandidates: rows.filter(function (r) { return !r.matched && !r.gate; }).length,
      thin: rows.filter(function (r) { return r.thin; }).length,
      sumDur0: d0, sumDur1: d1,
      orphanAmt: orphan.reduce(function (s, p) { return s + p.sup; }, 0)
    };
  }

  /* ══ 3. 실제 반영 ══════════════════════════════════════════════ */
  /* 공정 삭제 시 선행관계를 이어붙여 체인이 끊기지 않게 한다 */
  function removeRewire(phases, id) {
    var i = -1, k;
    for (k = 0; k < phases.length; k++) if (phases[k].id === id) { i = k; break; }
    if (i < 0) return;
    var deps = phases[i].dep || [];
    phases.forEach(function (q) {
      if (!q.dep || q.dep.indexOf(id) < 0) return;
      var next = [];
      q.dep.forEach(function (d) {
        if (d !== id) { if (next.indexOf(d) < 0) next.push(d); }
        else deps.forEach(function (x) { if (next.indexOf(x) < 0 && x !== q.id) next.push(x); });
      });
      q.dep = next;
    });
    phases.splice(i, 1);
  }

  /* 템플릿 고유 공정 id → 표준 공정 id.
     쌍용동 CARP·부분시공 PLB 처럼 이름이 다른 공정도 시공 순서상 제자리를 찾게 한다.
     여기 없는 id 는 '순서 미정'으로 두고 삽입 위치 판단에서 건너뛴다. */
  var ALIAS = {
    /* 부분시공 */
    PLB: 'PLB_R', ELC: 'ELC_R', FUR: 'FURN_K', FIX: 'FIX_SAN', CLN: 'CL_FIN',
    /* 쌍용동 실내건축 */
    HEAT_AX: 'FLH', FACADE: 'WIN', ENTDOOR: 'WIN', AC_PIPE: 'HVAC_R', ELC_IN: 'ELC_R',
    CARP: 'CEIL_F', ELC_CHK: 'FIX_LIT', GLASS: 'METAL', AC_SET: 'FIX_AC', LIT: 'FIX_LIT',
    WALLP: 'PNT', FURN: 'FURN_K', CCTV: 'FIX_LIT', CLEAN: 'CL_FIN', CHK: 'FIX_CHK',
    /* RC 신축 */
    IW_WALL: 'WALL', IW_CEIL: 'CEIL_M', INS: 'WALL', EXT: 'WIN', GOV: 'HND'
  };

  function orderIdx(id) {
    var i = ORDER.indexOf(ALIAS[id] || id);
    return i < 0 ? -1 : i;
  }

  /* 견적 패키지 하나로 표준 공정 객체를 만든다 */
  function makePhase(pk) {
    var d = PHASE_DEF[pk.key];
    if (!d) return null;
    var sz = sizePhase(pk, 0, 0, 1);
    return {
      id: pk.key, nm: d.nm, sub: d.sub, dur: sz.dur, dep: [], cat: d.cat, cp: d.cp,
      tasks: pk.items.slice()
        .sort(function (a, b) { return (b.lb + b.mt) - (a.lb + a.mt); })
        .slice(0, 12)
        .map(function (it) { return '［견적］' + it.nm + ' ' + it.q + it.u; }),
      crew: crewStr(sz.crew), mat: '', cure: 0,
      baseCrew: sz.crew, fixCrew: {}, baseDur: sz.dur, prop: false,
      offset: 0, lock: '', status: 'todo', durSrc: 'est', addedBy: 'estimate',
      est: {
        manDays: pk.manDays, labor: pk.labor, mat: pk.mat, sup: pk.sup,
        trades: pk.trades, minDays: pk.minDays, items: pk.items, materials: pk.materials
      }
    };
  }

  /* 표준 시공 순서에 맞는 자리에 끼워넣고 앞뒤 선행관계를 잇는다.
     순서를 알 수 없는 공정(-1)은 건너뛰어 위치 판단을 방해하지 않게 한다. */
  function insertOrdered(phases, ph) {
    var oi = orderIdx(ph.id), i, pi, lastSmaller = -1, firstLarger = -1;
    for (i = 0; i < phases.length; i++) {
      pi = orderIdx(phases[i].id);
      if (pi < 0) continue;
      if (pi <= oi) lastSmaller = i;
      else { firstLarger = i; break; }
    }
    var at;
    if (lastSmaller >= 0) at = lastSmaller + 1;
    else if (firstLarger >= 0) at = firstLarger;
    else at = phases.length;

    var prev = at > 0 ? phases[at - 1] : null;
    ph.dep = prev ? [prev.id] : [];
    var next = phases[at] || null;
    if (next && next.dep && next.dep.indexOf(ph.id) < 0) next.dep.push(ph.id);
    phases.splice(at, 0, ph);
  }

  /* MiniCAD 도면에서 넘어온 공간 정보를 공정별 현장 지시로 바꾼다.
     "어느 방에 무엇을" 이 빠지면 공정표가 있어도 현장에서 다시 도면을 봐야 한다. */
  function spaceNotes(spaces) {
    var out = {};
    if (!spaces || !spaces.length) return out;
    function grp(list, keyFn) {
      var m = {}, k;
      list.forEach(function (s) {
        k = keyFn(s) || '미지정';
        if (!m[k]) m[k] = { names: [], area: 0 };
        m[k].names.push(s.nm || s.type || '');
        m[k].area += +s.area || 0;
      });
      var arr = [];
      for (k in m) arr.push(k + ': ' + m[k].names.join('·') + ' (' + (Math.round(m[k].area * 10) / 10) + '㎡)');
      return arr;
    }
    var wet = spaces.filter(function (s) { return s.wet; });
    var dry = spaces.filter(function (s) { return !s.wet; });
    if (wet.length) {
      var wetTxt = '습식공간 ' + wet.length + '개소 — ' +
        wet.map(function (s) { return (s.nm || s.type) + ' ' + (Math.round(s.area * 10) / 10) + '㎡'; }).join(', ');
      ['WPF', 'WP_TEST', 'TIL', 'CEIL_W', 'FIX_SAN', 'FIX_ACC'].forEach(function (id) { out[id] = [wetTxt]; });
    }
    var fl = grp(spaces, function (s) { return s.flF; });
    if (fl.length) out.FLR = fl;
    var wl = grp(dry, function (s) { return s.wlF; });
    if (wl.length) out.PNT = wl;
    var byFloor = grp(spaces, function (s) { return s.fl; });
    if (byFloor.length) out.PRE = byFloor;
    return out;
  }

  function apply(proj, wp, opts) {
    opts = opts || {};
    var pl = opts.plan || plan(proj.phases, wp, opts), applied = 0, dropped = [];
    var notes = spaceNotes(wp.spaces);

    pl.rows.forEach(function (r) {
      var p = proj.phases[r.idx];
      /* 양생·시험 기간은 면적과 무관 — 견적 매칭 여부와 상관없이 면적 비례에서 제외 */
      if (r.gate) { p.prop = false; p.durSrc = 'gate'; }
      if (!r.matched) return;
      var m = r._merged;
      p.est = {
        manDays: m.manDays, labor: m.labor, mat: m.mat, sup: m.sup,
        trades: m.trades, minDays: m.minDays,
        items: m.items, materials: m.materials
      };
      p.estAt = wp.sentAt;
      if (!r.gate) {
        p.dur = r.dur1;
        p.baseDur = r.dur1;
        p.crew = r.crew1;
        p.baseCrew = r._size.crew;
        p.prop = false;              /* 실물량 기준 → 면적 재비례 금지 */
        p.durSrc = 'est';
      } else {
        /* 양생·시험 기간은 면적과 무관 — 면적 슬라이더가 늘리지 못하게 고정 */
        p.prop = false;
        p.durSrc = 'gate';
      }
      if (opts.mergeTasks !== false && m.items.length) {
        var base = (p.tasks || []).filter(function (t) {
          var s = String(t);
          return s.indexOf('［견적］') !== 0 && s.indexOf('［공간］') !== 0;
        });
        var add = m.items.slice()
          .sort(function (a, b) { return (b.lb + b.mt) - (a.lb + a.mt); })
          .slice(0, 12)
          .map(function (it) { return '［견적］' + it.nm + ' ' + it.q + it.u; });
        var sp = (notes[p.id] || []).map(function (t) { return '［공간］' + t; });
        p.tasks = base.concat(sp, add);
      }
      applied++;
    });

    if (opts.dropUnused) {
      var kill = [];
      pl.rows.forEach(function (r) {
        if (r.matched || r.gate) return;
        kill.push(r.id);
        dropped.push(r.id + ' ' + r.nm);
      });
      kill.forEach(function (id) { removeRewire(proj.phases, id); });
    }

    /* 견적엔 있는데 이 템플릿에 대응 공정이 없는 패키지 → 표준 공정으로 신설 */
    var added = [];
    if (opts.addMissing) {
      pl.orphan.slice()
        .sort(function (a, b) { return orderIdx(a.key) - orderIdx(b.key); })
        .forEach(function (pk) {
          var ph = makePhase(pk);
          if (!ph) return;
          if (notes[ph.id]) ph.tasks = notes[ph.id].map(function (t) { return '［공간］' + t; }).concat(ph.tasks);
          insertOrdered(proj.phases, ph);
          added.push(ph.id + ' ' + ph.nm);
          applied++;
        });
    }

    proj.estimateLink = {
      schema: wp.schema, sentAt: wp.sentAt, from: wp.from,
      total: wp.totals.total, supply: wp.totals.supply,
      labor: wp.totals.labor, mat: wp.totals.mat,
      manDays: wp.totals.manDays, area: wp.project.area,
      name: wp.project.name || '', addr: wp.project.addr || '',
      mode: pl.mode, appliedAt: new Date().toISOString(), applied: applied,
      dropped: dropped, added: added,
      orphanAmt: opts.addMissing ? 0 : pl.orphanAmt, thin: pl.thin
    };
    proj.estimateSpaces = wp.spaces || [];   /* MiniCAD 도면 기준 공간 목록 — 인쇄물·현장 확인용 */
    if (wp.project.area > 0) {
      proj.area = String(wp.project.area);
      proj.areaBaseRef = wp.project.area;   /* 견적 면적이 곧 기준면적 */
    }
    if (wp.project.startDate) proj.startDate = wp.project.startDate;

    return { applied: applied, dropped: dropped, added: added, plan: pl };
  }

  /* ══ 4. 브리지(같은 브라우저) ══════════════════════════════════ */
  function bridgePush(wp) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(wp)); return true; }
    catch (e) { return false; }
  }
  function bridgePeek() {
    try {
      var d = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      return (d && d.schema === SCHEMA) ? d : null;
    } catch (e) { return null; }
  }
  function bridgeSeen() { try { return localStorage.getItem(LS_SEEN) || ''; } catch (e) { return ''; } }
  function bridgeMarkSeen(ts) { try { localStorage.setItem(LS_SEEN, ts || ''); } catch (e) {} }
  function bridgeClear() { try { localStorage.removeItem(LS_KEY); } catch (e) {} }

  /* ══ 5. 클라우드(기기 간) — APP_CLOUD(app_documents) 사용 ══════ */
  function cloudReady() { return !!(window.APP_CLOUD && window.APP_CLOUD.ready()); }
  function cloudSave(wp) {
    if (!cloudReady()) return Promise.reject(new Error('로그인 세션이 없습니다'));
    var key = 'wp_' + wp.sentAt.replace(/[^0-9]/g, '').slice(0, 14);
    var title = (wp.project.name || '무제 현장') + ' · ' +
      (wp.project.area ? wp.project.area + '㎡ · ' : '') +
      Math.round((wp.totals.total || 0) / 10000).toLocaleString() + '만원';
    return window.APP_CLOUD.save(APP, key, title, wp).then(function () { return key; });
  }
  function cloudList() {
    if (!cloudReady()) return Promise.reject(new Error('로그인 세션이 없습니다'));
    return window.APP_CLOUD.list(APP);
  }
  function cloudLoad(key) {
    if (!cloudReady()) return Promise.reject(new Error('로그인 세션이 없습니다'));
    return window.APP_CLOUD.load(APP, key).then(function (row) { return row ? row.data : null; });
  }
  function cloudRemove(key) {
    if (!cloudReady()) return Promise.reject(new Error('로그인 세션이 없습니다'));
    return window.APP_CLOUD.remove(APP, key);
  }

  window.ECOREAN_WP = {
    SCHEMA: SCHEMA, APP: APP,
    MAP: MAP, FALLBACK: FALLBACK, WAGE_DEFAULT: WAGE_DEFAULT,
    ORDER: ORDER, ALIAS: ALIAS, PHASE_DEF: PHASE_DEF,
    makePhase: makePhase, insertOrdered: insertOrdered, orderIdx: orderIdx,
    getWage: getWage, setWage: setWage, leadOf: leadOf, isGate: isGate,
    build: build, plan: plan, apply: apply, removeRewire: removeRewire,
    crewTotalOf: crewTotalOf, helperOf: helperOf, crewStr: crewStr,
    bridgePush: bridgePush, bridgePeek: bridgePeek, bridgeSeen: bridgeSeen,
    bridgeMarkSeen: bridgeMarkSeen, bridgeClear: bridgeClear,
    cloudReady: cloudReady, cloudSave: cloudSave, cloudList: cloudList,
    cloudLoad: cloudLoad, cloudRemove: cloudRemove
  };
})();
