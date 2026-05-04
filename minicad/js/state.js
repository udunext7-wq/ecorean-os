'use strict';
// ===== STATE =====
const STATE={
  scale:80,gridSize:100,ceilingHeight:2400,projectName:'신규 인테리어',
  vertices:[],  // VEF: 모든 점의 단일 진실 원천 [{id,x,y}]
  spaces:[],walls:[],openings:[],furniture:[],fixtures:[],lights:[],electric:[],texts:[],measures:[],
  circles:[],arcs:[], // v5.3: 원·아크
  hvac:[], // v5.6: 공조/소방
  selectedTool:'select',selectedSpaceType:'LIVING',selectedLib:null,
  selectedId:null,selectedKind:null,
  boxSelection:[], // v5.3: 다중 선택 [{kind,id},...]
  zoom:1,offsetX:200,offsetY:100,
  showGrid:true,showDimensions:true,
  snap:{grid:true,endpoint:true,ortho:true},
  shiftPressed:false,
  history:[],historyIdx:-1,measureFirst:null,
  layers:{walls:true,spaces:true,openings:true,furniture:true,fixtures:true,lights:true,electric:true,dimensions:true,text:true,circles:true,arcs:true,hvac:true},
  estimateConfig:{},
  cmdHistory:[],cmdHistoryIdx:-1,
  cmdMode:null,cmdData:{}, // v5.1: 단계별 프롬프트 모드
  rotateState:null, // 공간 회전 핸들 드래그 상태 {spaceId,cxMm,cyMm,lastAngle,totalAngle}
  snapMarker:null, // v5.2: 현재 스냅 위치 (글로우 표시용)
  isMobile:false,  // v5.2: 모바일 디바이스 감지 (런타임)
  // ===== v5.7: 2.5D 토글 (기본 OFF, 시공 정확도 우선) =====
  plus2D:false,
  // ===== v5.8: 영상 동선 커스텀 순서 (null=면적순 자동, array=사용자 지정 spaceId 배열) =====
  videoSequenceOrder:null,
  // ===== v5.7: AI 생성 파이프라인 SSoT 메타 (이미지·영상 모델 프롬프트 힌트) =====
  aiPromptHints:{
    style:'modern_luxury',         // modern_luxury | scandinavian | industrial | wabi_sabi | korean_modern | minimal | classic | bohemian | mid_century | art_deco | contemporary | rustic | hotel_lux | natural_organic
    mood:'warm_sophisticated',     // warm_sophisticated | cool_calm | bright_airy | cozy_intimate | dramatic | serene | energetic
    lighting:'natural_warm_3000K', // natural_warm_3000K | bright_daylight_5000K | cool_4000K | golden_hour | evening_ambient
    materialPalette:['walnut','white_oak','brass','beige_paint'],
    cameraSuggestion:'isometric_eye_level' // isometric_eye_level | top_down | wide_angle | dolly_in | orbit
  },
};
