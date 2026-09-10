# -*- coding: utf-8 -*-
"""목공사 (실내 수장 목공) — KCS 41 33 01 / KCS 41 51 01 · 04 기준"""

TRADE = {}
TRADE['KEY'] = 'wood'
TRADE['DIR'] = 'carpentry'
TRADE['NAME'] = '목공사'
TRADE['MARK'] = 'CARPENTRY'
TRADE['SUBTITLE'] = '140평 / 2층 / 천장틀 · 벽체틀 · 보드 · 문틀 · 몰딩 · 가구 하지'
TRADE['CONTRACT_EN'] = 'CARPENTRY WORK CONTRACT'

TRADE['POS_TITLE'] = '보강 합판 위치도'
TRADE['POS_UNIT'] = '보강'
TRADE['POS_SIZE_COL'] = '보강 사양'
TRADE['POS_MARK'] = 'BACKING LOCATIONS · 보드 덮기 전 100% 확정 필수'
TRADE['POS_EMPTY_HINT'] = '보드를 덮으면 보강 위치는 다시 못 잡습니다. TV·선반·세면대·수건걸이·커튼박스·붙박이장 등 하중이 걸릴 자리를 먼저 등록하세요.'
TRADE['CONTRACT_POS_CLAUSE'] = '보강 합판 위치는 별첨 보강 합판 위치도에 따라 시공하며, 보드 덮기 전 100% 확정한다.'
TRADE['SPEC_TITLE'] = '목부재 규격 시방'

TRADE['WARRANTY'] = '준공일로부터 1년 [건설산업기본법 시행령 별표4 · 실내건축] (양 당사자 합의로 연장 가능)'
TRADE['DELAY_EXCEPT'] = '천재지변, 선행공정(골조·설비·전기) 지연, 자재 수급 불가 등 시공자 귀책이 아닌 사유는 제외한다.'
TRADE['LICENSE'] = '수급인은 건설산업기본법에 따른 실내건축공사업 등록업체여야 하며(공사예정금액 1,500만원 미만의 경미한 건설공사는 예외), 등록증 사본을 별첨한다.'
TRADE['LICENSE_DOC'] = '실내건축공사업 등록증 사본'
TRADE['SAFETY'] = '고소작업(우마·비계)·목재 절단기 사용은 산업안전보건법에 따라 안전 계획을 수립하고 시공한다.'

TRADE['LAWS'] = """          <li>KCS 41 33 01 (목공사 일반) 및 KCS 41 51 01 (수장공사 일반)·KCS 41 51 04 (벽공사)에 따라 시공한다.</li>
          <li>목재 함수율은 구조용 19% 이하, 수장용 15% 이하를 적용한다 [KCS 41 33 01 표 2.1-1]. 변재의 나이테 간격이 10mm 이상인 목재는 사용하지 않는다.</li>
          <li>구조용 목재·합집성재·합판은 KS F 3020 (침엽수 구조용재)·KS F 3021 (구조용 집성재)·KS F 3113 (구조용 합판) 인증품을 사용한다.</li>
          <li>방부처리 목재는 KS F 3025에 적합한 공인 공장 처리품을 사용하고, 현장 절단면은 동일 약제로 도포한다.</li>
          <li>실내공기질 관리법에 따라 보드·접착제는 폼알데하이드 방출량 E0 등급 이상을 사용하고 시험성적서를 제출한다.</li>
          <li>건축법 시행령 제61조 및 화재안전기준에 따라 마감재의 난연 성능 적용 대상 여부를 확인하고 해당 시 준불연 이상 자재를 사용한다.</li>
          <li>못 지름은 목재 두께의 1/6 이하, 못 길이는 측면 부재 두께의 2~4배로 한다 [KCS 41 33 01].</li>"""

TRADE['SUBSYSTEMS'] = """const SUBSYSTEMS = {
  common: { name: '공통',      short: '공통', color: '#7B8597' },
  ceil:   { name: '천장',      short: '천장', color: '#2E5B9E' },
  wall:   { name: '벽체',      short: '벽체', color: '#B85420' },
  floor:  { name: '바닥 하지', short: '바닥', color: '#0F6E56' },
  door:   { name: '문틀·문선', short: '문틀', color: '#6B5B95' },
  mold:   { name: '몰딩·마감', short: '몰딩', color: '#B8742E' },
  built:  { name: '가구 하지', short: '가구', color: '#A32D2D' }
};"""

TRADE['PHASE_DAYS'] = """const PHASE_DEFAULT_DAYS = {
  P0: 7,   // 사전 단계
  P1: 2,   // 자재 반입·검수
  P2: 3,   // 바탕 확인·먹매김
  P3: 8,   // 1층 천장틀·벽체틀
  P4: 2,   // 설비·전기 간섭 조정
  P5: 7,   // 2층 천장틀·벽체틀
  P6: 9,   // 보드 시공
  P7: 8,   // 문틀·몰딩·걸레받이
  P8: 3,   // 검사·보수
  P9: 2    // 준공 인도
};"""

TRADE['FLOORS'] = "'1F', '2F', '다락', '공용'"
TRADE['SIZES'] = "'합판 11.5T', '합판 15T', '합판 18T', '각재 30×30', '각재 69×30', '기타'"
TRADE['ROOMS'] = "'거실', '주방', '안방', '침실', '욕실', '드레스룸', '현관', '복도', '계단실', '서재', '다용도실', '기타'"

TRADE['POS_STATUS'] = """const SLEEVE_STATUS = {
  planned: '계획',
  marked: '현장 마킹',
  installed: '보강 완료',
  used: '보드 덮음',
  unused: '취소·미시공'
};"""

TRADE['COLORS'] = """const DEFAULT_CIRCUIT_COLORS = [
  { color: '#C8A165', name: '사재다루끼', usage: '천장틀·벽체틀 상·하지', applyTo: '30×30×3600 · 12본/단', note: '함수율 15% 이하 · 휨 있는 본 제외' },
  { color: '#A9752F', name: '사재투바이', usage: '천장 주틀·개구부 보강', applyTo: '69×30×3600 · 6본/단', note: '스팬 900 초과 구간 필수' },
  { color: '#E4D9C3', name: '석고보드 9.5T', usage: '천장 1겹·벽 1겹', applyTo: '900×1800 · GB-R', note: 'KS F 3504 · 이음 엇갈림' },
  { color: '#D8C9AC', name: '석고보드 12.5T', usage: '벽체 2겹·차음 구간', applyTo: '900×2400 · GB-R', note: '방화·차음 요구 구간' },
  { color: '#8FA9C4', name: '방수석고 9.5T', usage: '욕실·다용도실 천장', applyTo: '900×1800 · GB-S', note: '습윤 부위 전용 (녹색)' },
  { color: '#B5651D', name: '미송합판 15T', usage: '하중 보강 (TV·선반·수전)', applyTo: '1220×2440', note: '보강 위치도 등록분에 한함' },
  { color: '#8C6239', name: '일반합판 11.5T', usage: '가구 하지·문틀 보강', applyTo: '1220×2440', note: '가구 도면 확정 후 시공' },
  { color: '#6E7B8B', name: '경량철골 (M-BAR)', usage: '평천장 달대·캐링', applyTo: '19×25 · 달대 @900', note: '목틀 대체 구간 · 처짐 관리' }
];"""

TRADE['CHECKLIST'] = """const CHECKLIST = [
  {
    id: 'P0', name: '사전 단계 · 설계·계약·법규', critical: false,
    items: [
      { id: 'P0-01', p: 'critical', t: '목공 도면 확정 (천장 전개도·벽체 상세·단면) · 변경 시 비용 발생 명시', c: '도면', s: 'common', doc: true },
      { id: 'P0-02', p: 'critical', t: '설비·전기·소방 도면과 통합 검토 (천장 속 간섭 0)', c: '도면', s: 'common', doc: true },
      { id: 'P0-03', p: 'critical', t: '공사범위 경계 확정 (목공·가구·도장·도배·타일 인수인계 지점)', c: '계약', s: 'common', doc: true },
      { id: 'P0-04', p: 'critical', t: '계약서 본문 작성 및 서명', c: '계약', s: 'common', doc: true },
      { id: 'P0-05', p: 'high', t: '시방서 별첨 및 합의 (KCS 41 33 01 · KCS 41 51 01 준수)', c: '계약', s: 'common', doc: true },
      { id: 'P0-06', p: 'high', t: '추가공사 단가표 첨부 (양 당사자 서명)', c: '계약', s: 'common', doc: true },
      { id: 'P0-07', p: 'high', t: '하자보수 범위·기간 명시 (실내건축 1년 · 별표4)', c: '계약', s: 'common', doc: true },
      { id: 'P0-08', p: 'critical', t: '실내공기질 등급 확정 (보드·접착제 E0 이상) · 시험성적서 요구', c: '법규', s: 'common', doc: true },
      { id: 'P0-09', p: 'high', t: '난연 성능 적용 대상 여부 확인 [건축법 시행령 제61조]', c: '법규', s: 'common', doc: true },
      { id: 'P0-10', p: 'critical', t: '층고·천장고 확정 (마감 후 유효 천장고 기록)', c: '설계', s: 'ceil', doc: true },
      { id: 'P0-11', p: 'high', t: '천장 형식 결정 (평천장·우물천장·커튼박스·간접등박스)', c: '설계', s: 'ceil', doc: true },
      { id: 'P0-12', p: 'high', t: '목틀 vs 경량철골(M-BAR) 구간 결정 (스팬·하중 기준)', c: '시공방식', s: 'ceil', doc: true },
      { id: 'P0-13', p: 'high', t: '벽체 구성 확정 (석고 겹수·차음재·이보드 단열 유무)', c: '설계', s: 'wall', doc: true },
      { id: 'P0-14', p: 'critical', t: '보강 합판 필요 위치 사전 확정 (TV·선반·수전·커튼·붙박이장)', c: '설계', s: 'wall', doc: true },
      { id: 'P0-15', p: 'high', t: '문틀 사양 결정 (재질·규격·문선 형태·히든/무문선 여부)', c: '자재', s: 'door', doc: true },
      { id: 'P0-16', p: 'high', t: '몰딩·걸레받이 사양 결정 (형태·재질·높이·마이너스 여부)', c: '자재', s: 'mold', doc: true },
      { id: 'P0-17', p: 'high', t: '가구 도면 수령 및 하지 요구사항 확인 (주방·붙박이·신발장)', c: '도면', s: 'built', doc: true },
      { id: 'P0-18', p: 'medium', t: '바닥 마감재 결정 확인 (마루/타일에 따라 하지 두께가 달라진다)', c: '설계', s: 'floor', doc: true }
    ]
  },
  {
    id: 'P1', name: '자재 반입 · 검수', critical: false,
    items: [
      { id: 'P1-01', p: 'critical', t: '목재 함수율 측정 (수장용 15% 이하 · 구조용 19% 이하)', c: '검수', s: 'common', doc: true },
      { id: 'P1-02', p: 'high', t: '변재 나이테 간격 10mm 이상 목재 반출 [KCS 41 33 01]', c: '검수', s: 'common', doc: false },
      { id: 'P1-03', p: 'high', t: '휨·옹이·갈라짐 있는 각재 선별 (단 단위 전수 확인)', c: '검수', s: 'common', doc: false },
      { id: 'P1-04', p: 'critical', t: '석고보드 KS 인증·등급 확인 (GB-R / GB-S 방수 구분)', c: '검수', s: 'common', doc: true },
      { id: 'P1-05', p: 'critical', t: '보드·접착제 폼알데하이드 시험성적서 수령 (E0 이상)', c: '검수', s: 'common', doc: true },
      { id: 'P1-06', p: 'high', t: '합판 등급·두께 확인 (구조 보강용은 KS F 3113)', c: '검수', s: 'wall', doc: true },
      { id: 'P1-07', p: 'critical', t: '자재 보관 — 지면 200mm 이상 이격·평탄 고임목·천막 보호', c: '보관', s: 'common', doc: false },
      { id: 'P1-08', p: 'high', t: '석고보드 세워서 보관 (눕혀 쌓으면 처짐·모서리 파손)', c: '보관', s: 'common', doc: false },
      { id: 'P1-09', p: 'high', t: '반입 수량 검수 및 납품서 대조 (단·장 단위)', c: '검수', s: 'common', doc: true },
      { id: 'P1-10', p: 'medium', t: '타카핀·나사 규격 확인 (422·DT50·JST38 등 용도별)', c: '검수', s: 'common', doc: false }
    ]
  },
  {
    id: 'P2', name: '바탕 확인 · 먹매김', critical: true,
    items: [
      { id: 'P2-01', p: 'critical', t: '골조 수직·수평 실측 (오차 부위 기록 · 목틀로 보정할 범위 확정)', c: '실측', s: 'common', doc: true },
      { id: 'P2-02', p: 'critical', t: '기준 먹선 (레벨·통심) 전 층 일괄 표시', c: '먹매김', s: 'common', doc: true },
      { id: 'P2-03', p: 'critical', t: '천장 레벨 먹매김 (실별 마감 천장고 확정 · 최저 보 하단 확인)', c: '먹매김', s: 'ceil', doc: true },
      { id: 'P2-04', p: 'high', t: '벽체 먹매김 (경량벽 위치·개구부 폭·문틀 중심)', c: '먹매김', s: 'wall', doc: true },
      { id: 'P2-05', p: 'critical', t: '설비 덕트·배관 최저 높이 확인 (천장 속 가용 높이 확보)', c: '간섭', s: 'ceil', doc: true },
      { id: 'P2-06', p: 'critical', t: '콘크리트 함수 상태 확인 (젖은 바탕에 목틀 직결 금지)', c: '바탕', s: 'common', doc: false },
      { id: 'P2-07', p: 'high', t: '방수 완료 구간 확인 (욕실·다용도실 — 방수층 손상 금지 표시)', c: '바탕', s: 'common', doc: true },
      { id: 'P2-08', p: 'high', t: '창호 개구부 실측 (창틀 시공 오차 반영)', c: '실측', s: 'wall', doc: true },
      { id: 'P2-09', p: 'high', t: '바닥 레벨 확인 (난방배관·미장 두께 반영한 최종 바닥선)', c: '실측', s: 'floor', doc: true },
      { id: 'P2-10', p: 'medium', t: '계단 실측 (챌판·디딤판 치수 · 단높이 균일성)', c: '실측', s: 'common', doc: true }
    ]
  },
  {
    id: 'P3', name: '1층 천장틀 · 벽체틀', critical: false,
    items: [
      { id: 'P3-01', p: 'critical', t: '천장 달대 앵커 고정 (@900 이하 · 콘크리트핀 JST 규격 준수)', c: '시공', s: 'ceil', doc: true },
      { id: 'P3-02', p: 'critical', t: '천장 주틀 수평 확인 (레이저 레벨 · 처짐 3mm 이내)', c: '시공', s: 'ceil', doc: true },
      { id: 'P3-03', p: 'high', t: '천장 반자틀 간격 @300~450 유지 (보드 이음 위치에 부재 배치)', c: '시공', s: 'ceil', doc: false },
      { id: 'P3-04', p: 'high', t: '우물천장·커튼박스 틀 제작 (도면 치수 대비 ±3mm)', c: '시공', s: 'ceil', doc: true },
      { id: 'P3-05', p: 'high', t: '간접등 박스 내부 치수 확인 (등기구·전원 여유 공간)', c: '시공', s: 'ceil', doc: true },
      { id: 'P3-06', p: 'critical', t: '경량벽 상·하런너 고정 및 수직 확인 (수직 오차 3mm/m 이내)', c: '시공', s: 'wall', doc: true },
      { id: 'P3-07', p: 'high', t: '벽체 스터드 간격 @450 이하 유지', c: '시공', s: 'wall', doc: false },
      { id: 'P3-08', p: 'critical', t: '개구부(문·창) 보강틀 시공 (상인방·수직 보강)', c: '시공', s: 'wall', doc: true },
      { id: 'P3-09', p: 'critical', t: '보강 합판 시공 — 위치도 등록분 전수 (TV·선반·수전·커튼)', c: '보강', s: 'wall', doc: true },
      { id: 'P3-10', p: 'high', t: '이보드·단열재 시공 부위 확인 (외벽 접합부 결로 방지)', c: '시공', s: 'wall', doc: true },
      { id: 'P3-11', p: 'high', t: '차음 구간 흡음재 충전 (침실·욕실 인접벽)', c: '시공', s: 'wall', doc: false },
      { id: 'P3-12', p: 'medium', t: '점검구 위치 확보 (분배기·밸브·덕트 — 설비와 대조)', c: '시공', s: 'ceil', doc: true }
    ]
  },
  {
    id: 'P4', name: '설비 · 전기 간섭 조정', critical: true,
    items: [
      { id: 'P4-01', p: 'critical', t: '천장 속 설비·전기 배선 완료 확인 (보드 덮기 전 최종)', c: '간섭', s: 'ceil', doc: true },
      { id: 'P4-02', p: 'critical', t: '조명 위치 실물 대조 (도면 vs 현장 · 반자틀과 충돌 없음)', c: '간섭', s: 'ceil', doc: true },
      { id: 'P4-03', p: 'critical', t: '디퓨저·환기구·스프링클러 개구 위치 확정 및 보강', c: '간섭', s: 'ceil', doc: true },
      { id: 'P4-04', p: 'critical', t: '벽체 내 배관·배선 완료 확인 (콘센트·스위치 박스 수평)', c: '간섭', s: 'wall', doc: true },
      { id: 'P4-05', p: 'critical', t: '보강 합판 위치 최종 확인 사진 촬영 (보드 덮으면 못 찾는다)', c: '기록', s: 'wall', doc: true },
      { id: 'P4-06', p: 'high', t: '천장 속 배관 단열·보온 완료 확인 (결로수 낙하 방지)', c: '간섭', s: 'ceil', doc: false },
      { id: 'P4-07', p: 'high', t: '설비 점검구 개구 치수 확정 (기구 규격 + 여유 20mm)', c: '간섭', s: 'ceil', doc: true },
      { id: 'P4-08', p: 'high', t: '가구 전기·급배수 인출 위치 대조 (주방·세면대·드레스룸)', c: '간섭', s: 'built', doc: true }
    ]
  },
  {
    id: 'P5', name: '2층 천장틀 · 벽체틀', critical: false,
    items: [
      { id: 'P5-01', p: 'critical', t: '2층 천장 달대 앵커 고정 및 수평 확인', c: '시공', s: 'ceil', doc: true },
      { id: 'P5-02', p: 'high', t: '2층 반자틀 간격·이음 부재 배치', c: '시공', s: 'ceil', doc: false },
      { id: 'P5-03', p: 'high', t: '경사 천장·박공 구간 틀 제작 (다락·계단 상부)', c: '시공', s: 'ceil', doc: true },
      { id: 'P5-04', p: 'critical', t: '2층 경량벽 수직·개구부 보강', c: '시공', s: 'wall', doc: true },
      { id: 'P5-05', p: 'critical', t: '2층 보강 합판 시공 (위치도 등록분 전수)', c: '보강', s: 'wall', doc: true },
      { id: 'P5-06', p: 'high', t: '층간 소음 대응 — 2층 바닥 하지 완충 구간 확인', c: '시공', s: 'floor', doc: true },
      { id: 'P5-07', p: 'high', t: '계단실 벽·난간 하지 시공 (난간 하중 보강 필수)', c: '보강', s: 'common', doc: true },
      { id: 'P5-08', p: 'medium', t: '다락 수납 하지 및 점검구 계획', c: '시공', s: 'built', doc: false }
    ]
  },
  {
    id: 'P6', name: '보드 시공 (석고 · 합판)', critical: false,
    items: [
      { id: 'P6-01', p: 'critical', t: '보드 이음 엇갈림 시공 (십자 이음 금지)', c: '시공', s: 'ceil', doc: true },
      { id: 'P6-02', p: 'critical', t: '욕실·다용도실 방수석고(GB-S) 적용 확인', c: '자재', s: 'ceil', doc: true },
      { id: 'P6-03', p: 'high', t: '천장 보드 나사·타카 간격 @150~200 (가장자리 @150)', c: '시공', s: 'ceil', doc: false },
      { id: 'P6-04', p: 'high', t: '나사머리 보드면보다 0.5~1mm 함몰 (돌출 금지)', c: '시공', s: 'common', doc: false },
      { id: 'P6-05', p: 'critical', t: '개구부 모서리 보드 L자 재단 (이음선이 모서리와 일치 금지 — 균열 원인)', c: '시공', s: 'wall', doc: true },
      { id: 'P6-06', p: 'high', t: '벽체 2겹 시공 구간 이음 위치 엇갈림', c: '시공', s: 'wall', doc: false },
      { id: 'P6-07', p: 'high', t: '보드-바닥 이격 10mm 유지 (습기 흡상 방지)', c: '시공', s: 'wall', doc: false },
      { id: 'P6-08', p: 'critical', t: '조명·디퓨저·점검구 타공 (도면 좌표 대조 후 시공)', c: '시공', s: 'ceil', doc: true },
      { id: 'P6-09', p: 'high', t: '코너비드 시공 (외부 모서리 전체)', c: '시공', s: 'wall', doc: false },
      { id: 'P6-10', p: 'high', t: '보드 시공 완료 사진 (실별 · 보강 위치 표시 포함)', c: '기록', s: 'common', doc: true },
      { id: 'P6-11', p: 'medium', t: '보드 잔재 정리 및 폐기물 분리 배출', c: '정리', s: 'common', doc: false },
      { id: 'P6-12', p: 'high', t: '가구 하지 합판 시공 (주방·붙박이장·신발장 도면 대조)', c: '보강', s: 'built', doc: true }
    ]
  },
  {
    id: 'P7', name: '문틀 · 몰딩 · 걸레받이', critical: false,
    items: [
      { id: 'P7-01', p: 'critical', t: '문틀 수직·수평·직각 확인 (대각선 오차 3mm 이내)', c: '시공', s: 'door', doc: true },
      { id: 'P7-02', p: 'critical', t: '문틀 하부 레벨 — 마감 바닥선 기준 설치 (마루/타일 두께 반영)', c: '시공', s: 'door', doc: true },
      { id: 'P7-03', p: 'high', t: '문틀 고정 및 뒤채움 (우레탄폼 과충전 금지 — 문틀 배부름)', c: '시공', s: 'door', doc: false },
      { id: 'P7-04', p: 'high', t: '문선(케이싱) 이음부 밀착 · 코너 45도 정합', c: '시공', s: 'door', doc: false },
      { id: 'P7-05', p: 'high', t: '히든·무문선 구간 보드 마감 정밀도 확인 (도장 후 티가 난다)', c: '시공', s: 'door', doc: true },
      { id: 'P7-06', p: 'high', t: '천장 몰딩 시공 (코너 정합·직선도)', c: '시공', s: 'mold', doc: false },
      { id: 'P7-07', p: 'high', t: '마이너스 몰딩 구간 줄눈 폭 균일 확인', c: '시공', s: 'mold', doc: true },
      { id: 'P7-08', p: 'high', t: '걸레받이 시공 (바닥 마감 후 · 높이 균일·이음 최소화)', c: '시공', s: 'mold', doc: false },
      { id: 'P7-09', p: 'medium', t: '창호 하부 창대·젠다이 시공', c: '시공', s: 'mold', doc: false },
      { id: 'P7-10', p: 'high', t: '계단 디딤판·챌판·난간 하지 마감', c: '시공', s: 'common', doc: true },
      { id: 'P7-11', p: 'medium', t: '점검구 프레임 설치 및 개폐 확인', c: '시공', s: 'ceil', doc: false }
    ]
  },
  {
    id: 'P8', name: '검사 · 보수', critical: false,
    items: [
      { id: 'P8-01', p: 'critical', t: '천장 수평 전수 검사 (레이저 · 처짐·단차 3mm 이내)', c: '검사', s: 'ceil', doc: true },
      { id: 'P8-02', p: 'critical', t: '벽체 수직·평활도 검사 (2m 자 기준 3mm 이내)', c: '검사', s: 'wall', doc: true },
      { id: 'P8-03', p: 'critical', t: '보강 합판 위치 최종 대조 (위치도 vs 실제 · 사진 기록)', c: '검사', s: 'wall', doc: true },
      { id: 'P8-04', p: 'high', t: '문 개폐 시험 (전 세대 문틀 · 뒤틀림·간섭 확인)', c: '검사', s: 'door', doc: true },
      { id: 'P8-05', p: 'high', t: '보드 이음·나사 함몰 상태 확인 (도장·도배 전 최종)', c: '검사', s: 'common', doc: false },
      { id: 'P8-06', p: 'high', t: '몰딩·걸레받이 이음 벌어짐 보수', c: '보수', s: 'mold', doc: false },
      { id: 'P8-07', p: 'high', t: '후속 공정 인수인계 (도장·도배 담당자 입회 확인)', c: '인계', s: 'common', doc: true },
      { id: 'P8-08', p: 'medium', t: '타공 위치 오차분 보수 및 재시공 목록 정리', c: '보수', s: 'ceil', doc: true }
    ]
  },
  {
    id: 'P9', name: '준공 · 인도', critical: false,
    items: [
      { id: 'P9-01', p: 'critical', t: '최종 검수 (건축주 입회 · 지적사항 목록화)', c: '준공', s: 'common', doc: true },
      { id: 'P9-02', p: 'critical', t: '지적사항 보수 완료 및 재확인', c: '준공', s: 'common', doc: true },
      { id: 'P9-03', p: 'high', t: '보강 합판 위치도 최종본 인도 (건축주 보관용)', c: '인도', s: 'wall', doc: true },
      { id: 'P9-04', p: 'high', t: '자재 시험성적서·KS 인증서 일괄 제출 (E0 등급 포함)', c: '인도', s: 'common', doc: true },
      { id: 'P9-05', p: 'high', t: '하자보수 범위·기간 안내 및 연락처 전달', c: '인도', s: 'common', doc: true },
      { id: 'P9-06', p: 'high', t: '잔여 자재 정리·반출 및 현장 청소', c: '준공', s: 'common', doc: false },
      { id: 'P9-07', p: 'medium', t: '준공 사진 촬영 (실별 · 천장·벽·문틀)', c: '기록', s: 'common', doc: true },
      { id: 'P9-08', p: 'high', t: '기성·잔금 정산 및 세금계산서 발행', c: '정산', s: 'common', doc: true }
    ]
  }
];"""

TRADE['MATERIALS'] = """const MATERIALS = [
  {
    cat: '구조 각재', mark: 'LUMBER', s: 'common',
    items: [
      { id: 'M-DRSH', name: '사재다루끼 (잇승각)', spec: '30×30×3600 · 12본/단 · 함수율 15% 이하', usage: '천장·벽 반자틀', applyFrom: '천장·벽', applyTo: '전 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-TBS', name: '사재투바이', spec: '69×30×3600 · 6본/단', usage: '천장 주틀·개구부 보강', applyFrom: '주틀', applyTo: '스팬 900 초과', brand: '', qty: '', status: 'mijung' },
      { id: 'M-SPF212', name: '구조재 SPF 2×12', spec: '38×286×3600 [KS F 3020]', usage: '개구부 상인방·계단', applyFrom: '개구부', applyTo: '보강', brand: '', qty: '', status: 'mijung' },
      { id: 'M-SPF24', name: '구조재 SPF 2×4', spec: '38×89×3600 [KS F 3020]', usage: '경량벽 스터드·런너', applyFrom: '경량벽', applyTo: '전 층', brand: '', qty: '', status: 'mijung' },
      { id: 'M-PRSV', name: '방부처리 각재', spec: 'KS F 3025 · 공인 공장 처리', usage: '토대·습윤 접촉부', applyFrom: '바닥 접촉', applyTo: '욕실·발코니', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '보드류', mark: 'BOARD', s: 'ceil',
    items: [
      { id: 'M-GYP95', name: '일반 석고보드 9.5T', spec: '900×1800 · GB-R [KS F 3504]', usage: '천장 1겹·벽 1겹', applyFrom: '천장·벽', applyTo: '전 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-GYP125', name: '일반 석고보드 12.5T', spec: '900×2400 · GB-R', usage: '벽 2겹·차음 구간', applyFrom: '벽체', applyTo: '침실 인접', brand: '', qty: '', status: 'mijung' },
      { id: 'M-GYPS', name: '방수 석고보드 9.5T', spec: '900×1800 · GB-S (녹색)', usage: '욕실·다용도실 천장', applyFrom: '습윤 부위', applyTo: '욕실 4개소', brand: '', qty: '', status: 'mijung' },
      { id: 'M-GYPF', name: '방화 석고보드 12.5T', spec: '900×2400 · GB-F', usage: '방화 구획·보일러실', applyFrom: '방화 구획', applyTo: '해당 구간', brand: '', qty: '', status: 'mijung' },
      { id: 'M-EB13', name: '일반 이보드 13T', spec: '900×2400 · XPS+PP · 도배용', usage: '외벽 결로 방지 하지', applyFrom: '외벽 내측', applyTo: '전 실', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '합판 · 보강재', mark: 'PLY', s: 'wall',
    items: [
      { id: 'M-MSP15', name: '미송합판 (유절) 15T', spec: '1220×2440', usage: 'TV·선반·수전 하중 보강', applyFrom: '벽체 내부', applyTo: '보강 위치도 등록분', brand: '', qty: '', status: 'mijung' },
      { id: 'M-PLY115', name: '일반합판 11.5T', spec: '1220×2440', usage: '가구 하지·문틀 보강', applyFrom: '가구 접합부', applyTo: '주방·붙박이', brand: '', qty: '', status: 'mijung' },
      { id: 'M-PLY18', name: '구조용 합판 18T', spec: '1220×2440 [KS F 3113]', usage: '계단·난간 하지', applyFrom: '계단실', applyTo: '난간 고정부', brand: '', qty: '', status: 'mijung' },
      { id: 'M-MDF', name: 'MDF 15T', spec: '1220×2440 · E0 등급', usage: '몰딩·창대 제작', applyFrom: '몰딩', applyTo: '도장 마감부', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '경량철골 · 천장 부속', mark: 'MBAR', s: 'ceil',
    items: [
      { id: 'M-MBAR', name: 'M-BAR (경량 천장틀)', spec: '19×25 아연도', usage: '평천장 반자틀', applyFrom: '천장', applyTo: '대공간', brand: '', qty: '', status: 'mijung' },
      { id: 'M-CARRY', name: '캐링 채널', spec: '38×12 아연도', usage: '천장 주틀', applyFrom: '달대', applyTo: 'M-BAR', brand: '', qty: '', status: 'mijung' },
      { id: 'M-HANG', name: '행거·달대볼트', spec: 'M8 · @900 이하', usage: '천장 매달기', applyFrom: '슬래브', applyTo: '캐링', brand: '', qty: '', status: 'mijung' },
      { id: 'M-ACCESS', name: '점검구 프레임', spec: '450×450 / 600×600 알루미늄', usage: '설비 점검', applyFrom: '천장', applyTo: '분배기·밸브부', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '문틀 · 문선', mark: 'DOOR', s: 'door',
    items: [
      { id: 'M-DFRM', name: '문틀 (ABS/멤브레인)', spec: '벽두께별 주문 제작', usage: '실내 도어 문틀', applyFrom: '개구부', applyTo: '전 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-DCAS', name: '문선 (케이싱)', spec: '60~90mm 폭', usage: '문틀 마감', applyFrom: '문틀 둘레', applyTo: '전 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-DHID', name: '히든 문틀 (무문선)', spec: '알루미늄 프레임 매립형', usage: '무문선 구간', applyFrom: '개구부', applyTo: '지정 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-PUF', name: '우레탄폼', spec: '700ml · 저팽창 (문틀용)', usage: '문틀 뒤채움', applyFrom: '문틀 배면', applyTo: '전 문틀', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '몰딩 · 걸레받이', mark: 'MOLD', s: 'mold',
    items: [
      { id: 'M-CMOLD', name: '천장 몰딩', spec: 'MDF 또는 PS · 도장/필름', usage: '천장-벽 접합부', applyFrom: '천장 둘레', applyTo: '전 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-MMOLD', name: '마이너스 몰딩', spec: '알루미늄 10~15mm', usage: '무몰딩 줄눈 마감', applyFrom: '천장·벽', applyTo: '지정 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-BASE', name: '걸레받이', spec: '높이 60~100mm · 도장/필름', usage: '벽-바닥 접합부', applyFrom: '벽 하부', applyTo: '전 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-SILL', name: '창대·젠다이', spec: '집성목 또는 인조대리석', usage: '창호 하부 마감', applyFrom: '창 하부', applyTo: '전 창호', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '단열 · 차음재', mark: 'INSUL', s: 'wall',
    items: [
      { id: 'M-GW50', name: '글라스울 50T', spec: '밀도 24K 이상', usage: '경량벽 차음', applyFrom: '스터드 사이', applyTo: '침실·욕실 인접', brand: '', qty: '', status: 'mijung' },
      { id: 'M-XPS30', name: 'XPS 단열재 30T', spec: '압출법 보온판 1호', usage: '외벽 접합부 결로 방지', applyFrom: '외벽 내측', applyTo: '전 외벽', brand: '', qty: '', status: 'mijung' },
      { id: 'M-EPS30', name: 'EPS 단열재 30T', spec: '비드법 2종 [KS M 3808]', usage: '바닥 하지 단열', applyFrom: '바닥', applyTo: '2층 슬래브', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '고정·접합 자재', mark: 'FASTEN', s: 'common',
    items: [
      { id: 'M-422', name: 'ㄷ자 스테이플 422 (22mm)', spec: '4mm폭 · 1갑 5,000발', usage: '목재-목재 접합', applyFrom: '반자틀', applyTo: '주틀', brand: '', qty: '', status: 'mijung' },
      { id: 'M-DT50', name: '일자핀 DT50 (50mm)', spec: '2.2mm · 1갑 3,000발', usage: '각재 고정', applyFrom: '목틀', applyTo: '목틀', brand: '', qty: '', status: 'mijung' },
      { id: 'M-JST38', name: 'JST 콘크리트핀 38mm', spec: '테이프접합 · 본드 병행', usage: '목재-콘크리트 고정', applyFrom: '달대·런너', applyTo: '슬래브·바닥', brand: '', qty: '', status: 'mijung' },
      { id: 'M-SCR25', name: '석고 나사 25mm', spec: '흑색 부식방지', usage: '석고보드 1겹 고정', applyFrom: '보드', applyTo: '목틀·M-BAR', brand: '', qty: '', status: 'mijung' },
      { id: 'M-SCR38', name: '석고 나사 38mm', spec: '흑색 부식방지', usage: '석고보드 2겹 고정', applyFrom: '보드', applyTo: '목틀', brand: '', qty: '', status: 'mijung' },
      { id: 'M-BOND', name: '목공본드 (오공205)', spec: '초산비닐 800g', usage: '목재 접합 보강', applyFrom: '접합부', applyTo: '전 공정', brand: '', qty: '', status: 'mijung' },
      { id: 'M-CBEAD', name: '코너비드', spec: '아연도 또는 PVC 2400', usage: '외부 모서리 보호', applyFrom: '모서리', applyTo: '전 구간', brand: '', qty: '', status: 'mijung' },
      { id: 'M-SILG', name: '실리콘 (일반)', spec: '290ml · 무초산', usage: '이음·단부 마감', applyFrom: '접합부', applyTo: '전 공정', brand: '', qty: '', status: 'mijung' }
    ]
  }
];"""

TRADE['CHANGE_ORDER'] = """const CHANGE_ORDER_REFERENCE = [
  { item: '평천장 추가 시공 (목틀 + 석고 1겹)', mat: 38000, lab: 62000, unit: '㎡' },
  { item: '우물천장 제작 (단높이 200mm 기준)', mat: 45000, lab: 120000, unit: 'm' },
  { item: '간접등 박스 제작 (커튼박스 겸용)', mat: 40000, lab: 110000, unit: 'm' },
  { item: '커튼박스 단독 제작', mat: 32000, lab: 85000, unit: 'm' },
  { item: '경량벽 신설 (스터드 + 석고 양면 1겹)', mat: 42000, lab: 78000, unit: '㎡' },
  { item: '벽체 석고 2겹 추가 (차음 보강)', mat: 14000, lab: 26000, unit: '㎡' },
  { item: '차음재 충전 (글라스울 50T 24K)', mat: 9000, lab: 12000, unit: '㎡' },
  { item: '보강 합판 추가 (15T · 900×900 기준)', mat: 28000, lab: 45000, unit: '개소' },
  { item: '이보드 13T 시공 (외벽 결로 방지)', mat: 18500, lab: 22000, unit: '㎡' },
  { item: '문틀 추가 설치 (ABS 일반 · 문선 포함)', mat: 180000, lab: 120000, unit: '개소' },
  { item: '히든(무문선) 문틀 추가', mat: 420000, lab: 260000, unit: '개소' },
  { item: '천장 몰딩 추가 (MDF 도장용)', mat: 6500, lab: 12000, unit: 'm' },
  { item: '마이너스 몰딩 시공 (알루미늄 매립)', mat: 14000, lab: 26000, unit: 'm' },
  { item: '걸레받이 추가 (높이 80mm)', mat: 7500, lab: 13000, unit: 'm' },
  { item: '점검구 신설 (450×450 알루미늄)', mat: 35000, lab: 45000, unit: '개소' },
  { item: '창대·젠다이 제작 (집성목 폭 200mm)', mat: 38000, lab: 55000, unit: 'm' },
  { item: '가구 하지 합판 시공 (11.5T)', mat: 22000, lab: 35000, unit: '㎡' },
  { item: '계단 디딤판·챌판 하지 (단당)', mat: 55000, lab: 95000, unit: '단' },
  { item: '경사·박공 천장 추가 (다락·상부)', mat: 48000, lab: 105000, unit: '㎡' },
  { item: '목공 보수·재시공 (일당 기준)', mat: 0, lab: 320000, unit: '인·일' }
];"""

TRADE['COST_GRADES'] = """const COST_GRADES = {
  conservative: { name: '보수적', perPyeong: 150000 },
  standard: { name: '표준', perPyeong: 220000 },
  premium: { name: '고급', perPyeong: 350000 }
};"""

TRADE['COST_OPTIONS'] = """const COST_OPTIONS = [
  { id: 'opt1', name: '전 실 우물천장 + 간접등 박스', amount: 6500000 },
  { id: 'opt2', name: '무문선(히든) 문틀 전환 · 8개소', amount: 4800000 },
  { id: 'opt3', name: '마이너스 몰딩 전면 적용 (무몰딩 마감)', amount: 3600000 },
  { id: 'opt4', name: '전 실 석고 2겹 + 차음재 보강', amount: 4200000 },
  { id: 'opt5', name: '보드·접착제 SE0 등급 상향 (친환경)', amount: 2200000 }
];"""

TRADE['COST_OPT_INIT'] = "opt1: false, opt2: false, opt3: false, opt4: false, opt5: false"
