# -*- coding: utf-8 -*-
"""도장공사 — KCS 41 47 00:2023 기준"""

TRADE = {}
TRADE['KEY'] = 'paint'
TRADE['DIR'] = 'painting'
TRADE['NAME'] = '도장공사'
TRADE['MARK'] = 'PAINTING'
TRADE['SUBTITLE'] = '140평 / 2층 / 바탕처리 · 내부 벽천장 · 목부 · 철부 · 외부 · 특수도장'
TRADE['CONTRACT_EN'] = 'PAINTING WORK CONTRACT'

TRADE['POS_TITLE'] = '색상 지정 위치도'
TRADE['POS_UNIT'] = '색상 지정'
TRADE['POS_SIZE_COL'] = '광택'
TRADE['POS_MARK'] = 'COLOR SCHEDULE · 도장 착수 전 실별 색상·광택 확정 필수'
TRADE['POS_EMPTY_HINT'] = '색상은 말로 정하면 반드시 어긋납니다. 실·부위별로 색번호와 광택을 등록하고, 현장 샘플 승인 사진을 함께 남기세요.'
TRADE['CONTRACT_POS_CLAUSE'] = '실별 색상·광택은 별첨 색상 지정 위치도에 따르며, 착수 전 현장 샘플로 건축주 승인을 받는다.'
TRADE['SPEC_TITLE'] = '도료 색상·사양 시방'

TRADE['WARRANTY'] = '준공일로부터 1년 [건설산업기본법 시행령 별표4 · 도장] (양 당사자 합의로 연장 가능)'
TRADE['DELAY_EXCEPT'] = '천재지변, 기온 5℃ 미만·상대습도 85% 초과 등 도장 금지 기상조건, 선행공정 지연 등 시공자 귀책이 아닌 사유는 제외한다.'
TRADE['LICENSE'] = '수급인은 건설산업기본법에 따른 도장·습식·방수·석공사업(주력분야 도장) 등록업체여야 하며(공사예정금액 1,500만원 미만의 경미한 건설공사는 예외), 등록증 사본을 별첨한다.'
TRADE['LICENSE_DOC'] = '도장·습식·방수·석공사업 등록증 사본'
TRADE['SAFETY'] = '유기용제 취급 구간은 산업안전보건법에 따라 환기·보호구·화기 관리 계획을 수립하고 시공한다.'

TRADE['LAWS'] = """          <li>KCS 41 47 00 (도장공사) 표준시방서에 따라 시공한다.</li>
          <li>바탕 함수율은 콘크리트·시멘트모르타르 7% 이하, 목재 8% 이하로 하고 바탕 pH는 9 이하를 확인한 뒤 도장한다 [KCS 41 47 00].</li>
          <li>기온 5℃ 미만이거나 상대습도 85%를 초과할 때, 눈·비·안개 시에는 도장하지 않는다. 권장 조건은 15~25℃·습도 75% 이하로 한다.</li>
          <li>도료는 KS M 6010(수성)·KS M 6020(조합)·KS M 6030(방청)·KS M 6040(래커)·KS M 5710(아크릴) 등 KS 인증품을 사용하고 시험성적서를 보관한다.</li>
          <li>도막두께는 KS M ISO 2808에 따라 측정하며, 수성·아크릴 도장의 건조 도막두께는 60~180㎛를 표준으로 한다.</li>
          <li>실내공기질 관리법 및 어린이활동공간 기준에 따라 중금속(납·카드뮴·수은·6가크롬) 합이 질량분율 0.1% 이하인 도료를 사용한다.</li>
          <li>도료 개봉은 담당원 입회하에 실시하고, 각 공정(하도·중도·상도)마다 담당원의 검사·승인을 받는다.</li>"""

TRADE['SUBSYSTEMS'] = """const SUBSYSTEMS = {
  common:  { name: '공통',      short: '공통', color: '#7B8597' },
  prep:    { name: '바탕처리',  short: '바탕', color: '#B85420' },
  inwall:  { name: '내부 벽천장', short: '내부', color: '#2E5B9E' },
  wood:    { name: '목부',      short: '목부', color: '#B8742E' },
  metal:   { name: '철부',      short: '철부', color: '#6B5B95' },
  ext:     { name: '외부',      short: '외부', color: '#0F6E56' },
  special: { name: '특수도장',  short: '특수', color: '#A32D2D' }
};"""

TRADE['PHASE_DAYS'] = """const PHASE_DEFAULT_DAYS = {
  P0: 6,   // 사전 단계
  P1: 2,   // 자재 반입·검수
  P2: 3,   // 바탕 상태 확인 (함수율·pH)
  P3: 7,   // 바탕 처리 (퍼티·연마)
  P4: 6,   // 1층 내부 도장
  P5: 5,   // 2층 내부 도장
  P6: 5,   // 목부·철부 도장
  P7: 6,   // 외부 도장
  P8: 3,   // 검사·보정
  P9: 2    // 준공 인도
};"""

TRADE['FLOORS'] = "'1F', '2F', '외부', '공용'"
TRADE['SIZES'] = "'무광', '저광', '반광', '유광', '기타'"
TRADE['ROOMS'] = "'거실', '주방', '안방', '침실', '욕실', '드레스룸', '현관', '복도', '계단실', '서재', '다용도실', '외벽', '기타'"

TRADE['POS_STATUS'] = """const SLEEVE_STATUS = {
  planned: '색상 검토중',
  marked: '샘플 승인',
  installed: '바탕 완료',
  used: '도장 완료',
  unused: '보류·변경'
};"""

TRADE['COLORS'] = """const DEFAULT_CIRCUIT_COLORS = [
  { color: '#F7F5F0', name: '화이트 (기본)', usage: '천장 전 실', applyTo: '수성 무광 [KS M 6010]', note: '하도 1회 + 상도 2회 · 60~180㎛' },
  { color: '#EFEAE1', name: '웜 화이트', usage: '거실·침실 벽', applyTo: '수성 저광', note: '색번호 확정 후 샘플 승인' },
  { color: '#DDD6C9', name: '그레이지', usage: '포인트 벽', applyTo: '수성 저광', note: '실별 지정 · 위치도 참조' },
  { color: '#3F4650', name: '차콜', usage: '포인트·몰딩', applyTo: '수성 반광', note: '진한 색은 상도 3회 필요' },
  { color: '#8C6239', name: '우드 스테인', usage: '목부 (문틀·창대·계단)', applyTo: '래커·바니시 [KS M 6040/6050]', note: '함수율 8% 이하 확인 후' },
  { color: '#B0B7C0', name: '방청 프라이머', usage: '철부 하도', applyTo: '광명단·아연분말 [KS M 6030]', note: '하도 1회 48시간 이상 건조' },
  { color: '#2E5B9E', name: '철부 상도', usage: '난간·철제 문·앵글', applyTo: '조합 도료 [KS M 6020]', note: '상도 2회 · 각 12시간 이상' },
  { color: '#6E7B8B', name: '외부 탄성 도료', usage: '외벽·파라펫', applyTo: '아크릴 탄성 [KS M 5710]', note: '균열 대응 · 도막 60~180㎛' },
  { color: '#0F6E56', name: '에폭시', usage: '보일러실·주차장 바닥', applyTo: '에폭시 2액형', note: '도막 100~600㎛ · 24시간 재도장' }
];"""

TRADE['CHECKLIST'] = """const CHECKLIST = [
  {
    id: 'P0', name: '사전 단계 · 설계·계약·법규', critical: false,
    items: [
      { id: 'P0-01', p: 'critical', t: '도장 범위 확정 (실별·부위별 · 천장/벽/목부/철부/외부)', c: '도면', s: 'common', doc: true },
      { id: 'P0-02', p: 'critical', t: '공사범위 경계 확정 (목공·도배·타일과의 인수인계 지점)', c: '계약', s: 'common', doc: true },
      { id: 'P0-03', p: 'critical', t: '계약서 본문 작성 및 서명', c: '계약', s: 'common', doc: true },
      { id: 'P0-04', p: 'high', t: '시방서 별첨 및 합의 (KCS 41 47 00 준수)', c: '계약', s: 'common', doc: true },
      { id: 'P0-05', p: 'high', t: '추가공사 단가표 첨부 (양 당사자 서명)', c: '계약', s: 'common', doc: true },
      { id: 'P0-06', p: 'high', t: '하자보수 범위·기간 명시 (도장 1년 · 별표4)', c: '계약', s: 'common', doc: true },
      { id: 'P0-07', p: 'critical', t: '도료 사양 확정 (제조사·품번·KS 인증 · 수성/아크릴/에폭시)', c: '자재', s: 'common', doc: true },
      { id: 'P0-08', p: 'critical', t: '실내공기질 등급 확인 — 중금속 합 0.1% 이하·친환경 인증', c: '법규', s: 'common', doc: true },
      { id: 'P0-09', p: 'critical', t: '실별 색상·광택 확정 및 색상 지정 위치도 작성', c: '설계', s: 'inwall', doc: true },
      { id: 'P0-10', p: 'critical', t: '현장 샘플 도장 후 건축주 승인 (조명 조건에서 확인)', c: '승인', s: 'inwall', doc: true },
      { id: 'P0-11', p: 'high', t: '도장 횟수·도막두께 기준 합의 (하도 1 + 상도 2 · 60~180㎛)', c: '계약', s: 'inwall', doc: true },
      { id: 'P0-12', p: 'high', t: '목부 마감 결정 (스테인·바니시·에나멜 · 투명/불투명)', c: '자재', s: 'wood', doc: true },
      { id: 'P0-13', p: 'high', t: '철부 방청 사양 결정 (하도 방청 + 상도 2회)', c: '자재', s: 'metal', doc: true },
      { id: 'P0-14', p: 'high', t: '외부 도료 사양 결정 (탄성·발수·내후성 등급)', c: '자재', s: 'ext', doc: true },
      { id: 'P0-15', p: 'medium', t: '특수도장 적용 부위 확정 (에폭시·방음·곰팡이 방지)', c: '설계', s: 'special', doc: true },
      { id: 'P0-16', p: 'high', t: '공정 순서 합의 (도장 → 바닥 마감 / 가구 반입 시점)', c: '공정', s: 'common', doc: true }
    ]
  },
  {
    id: 'P1', name: '자재 반입 · 검수', critical: false,
    items: [
      { id: 'P1-01', p: 'critical', t: '도료 KS 인증 확인 및 시험성적서 수령', c: '검수', s: 'common', doc: true },
      { id: 'P1-02', p: 'critical', t: '도료 색번호·광택 라벨 대조 (승인 샘플과 동일 로트 권장)', c: '검수', s: 'common', doc: true },
      { id: 'P1-03', p: 'high', t: '제조일자·유효기간 확인 (경화 불량 방지)', c: '검수', s: 'common', doc: true },
      { id: 'P1-04', p: 'critical', t: '도료 개봉은 담당원 입회하에 실시 [KCS 41 47 00]', c: '검수', s: 'common', doc: true },
      { id: 'P1-05', p: 'high', t: '퍼티·프라이머·희석제 규격 확인 (도료와 동일 계열)', c: '검수', s: 'prep', doc: false },
      { id: 'P1-06', p: 'high', t: '연마지 규격 확인 (P120~150 · 마무리 P240 [KS L 6003])', c: '검수', s: 'prep', doc: false },
      { id: 'P1-07', p: 'critical', t: '도료 보관 — 화기 금지·직사광 차단·환기 확보', c: '보관', s: 'common', doc: true },
      { id: 'P1-08', p: 'high', t: 'MSDS 비치 및 작업자 교육 (유기용제 취급)', c: '안전', s: 'common', doc: true },
      { id: 'P1-09', p: 'medium', t: '반입 수량 검수 및 소요량 재산정 (도포면적 기준)', c: '검수', s: 'common', doc: true }
    ]
  },
  {
    id: 'P2', name: '바탕 상태 확인 (함수율 · pH)', critical: true,
    items: [
      { id: 'P2-01', p: 'critical', t: '콘크리트 함수율 측정 7% 이하 확인 [KCS 41 47 00]', c: '바탕', s: 'prep', doc: true },
      { id: 'P2-02', p: 'critical', t: '시멘트모르타르 함수율 7% 이하 확인', c: '바탕', s: 'prep', doc: true },
      { id: 'P2-03', p: 'critical', t: '바탕 pH 9 이하 확인 (알칼리 잔존 시 도막 박리)', c: '바탕', s: 'prep', doc: true },
      { id: 'P2-04', p: 'critical', t: '양생기간 확인 — 콘크리트 하절기 3주·동절기 4주 이상', c: '바탕', s: 'prep', doc: true },
      { id: 'P2-05', p: 'critical', t: '모르타르 양생 확인 — 하절기 2주·동절기 3주 이상', c: '바탕', s: 'prep', doc: true },
      { id: 'P2-06', p: 'critical', t: '목부 함수율 8% 이하 확인 [KCS 41 47 00]', c: '바탕', s: 'wood', doc: true },
      { id: 'P2-07', p: 'critical', t: '시공 환경 확인 — 기온 5℃ 이상·상대습도 85% 이하', c: '환경', s: 'common', doc: true },
      { id: 'P2-08', p: 'high', t: '표면온도가 이슬점보다 높은지 확인 (결로 시 도장 금지)', c: '환경', s: 'common', doc: true },
      { id: 'P2-09', p: 'high', t: '바탕 균열·박리·백화 조사 및 보수 범위 확정', c: '바탕', s: 'prep', doc: true },
      { id: 'P2-10', p: 'high', t: '누수·결로 흔적 확인 (원인 미해결 시 도장 착수 금지)', c: '바탕', s: 'prep', doc: true },
      { id: 'P2-11', p: 'medium', t: '온습도 기록지 작성 시작 (일자별 · 도장 이력 근거)', c: '기록', s: 'common', doc: true }
    ]
  },
  {
    id: 'P3', name: '바탕 처리 (퍼티 · 연마)', critical: true,
    items: [
      { id: 'P3-01', p: 'critical', t: '먼지·기름·이형제 제거 및 청소 (도막 밀착 불량 방지)', c: '바탕', s: 'prep', doc: false },
      { id: 'P3-02', p: 'critical', t: '석고보드 이음부 조인트 테이프 + 퍼티 (3회 나눠 도포)', c: '퍼티', s: 'prep', doc: true },
      { id: 'P3-03', p: 'critical', t: '나사머리 방청 처리 후 퍼티 (녹 배임 방지)', c: '퍼티', s: 'prep', doc: false },
      { id: 'P3-04', p: 'high', t: '전면 퍼티 여부 확정 시공 (2종 전면 / 3종 이음부만)', c: '퍼티', s: 'prep', doc: true },
      { id: 'P3-05', p: 'critical', t: '퍼티 완전 건조 후 연마 (덜 마른 상태 연마 시 함몰)', c: '퍼티', s: 'prep', doc: false },
      { id: 'P3-06', p: 'high', t: '연마 P120~150 → 마무리 P240 [KS L 6003]', c: '연마', s: 'prep', doc: false },
      { id: 'P3-07', p: 'critical', t: '연마 후 분진 완전 제거 (진공 + 물걸레)', c: '연마', s: 'prep', doc: false },
      { id: 'P3-08', p: 'critical', t: '측광 검사 — 조명을 벽면에 비스듬히 비춰 요철 확인', c: '검사', s: 'prep', doc: true },
      { id: 'P3-09', p: 'high', t: '목부 옹이땜 (셀락니스 2회) 및 송진 처리', c: '바탕', s: 'wood', doc: false },
      { id: 'P3-10', p: 'high', t: '목부 구멍땜 퍼티 후 연마 [KS M 5713]', c: '바탕', s: 'wood', doc: false },
      { id: 'P3-11', p: 'critical', t: '철부 녹 제거 (손·기계 연마 또는 블라스트 [KS M ISO 8501])', c: '바탕', s: 'metal', doc: true },
      { id: 'P3-12', p: 'high', t: '아연도금면 처리 (프라이머 A종 / 황산아연 B종 / 풍화 C종)', c: '바탕', s: 'metal', doc: true },
      { id: 'P3-13', p: 'critical', t: '양생(마스킹) — 창호·바닥·가구·전기기구 전면 보양', c: '보양', s: 'common', doc: true },
      { id: 'P3-14', p: 'high', t: '바탕 처리 완료 사진 (실별 · 도장 전 상태 근거)', c: '기록', s: 'prep', doc: true }
    ]
  },
  {
    id: 'P4', name: '1층 내부 도장', critical: false,
    items: [
      { id: 'P4-01', p: 'critical', t: '하도(프라이머) 1회 도장 · 건조 3시간 이상', c: '도장', s: 'inwall', doc: true },
      { id: 'P4-02', p: 'critical', t: '하도 후 담당원 검사·승인 [KCS 41 47 00]', c: '검사', s: 'inwall', doc: true },
      { id: 'P4-03', p: 'critical', t: '상도 1회차 도장 (희석률 제조사 기준 준수)', c: '도장', s: 'inwall', doc: true },
      { id: 'P4-04', p: 'critical', t: '상도 2회차 도장 · 건조 3시간 이상 후 시행', c: '도장', s: 'inwall', doc: true },
      { id: 'P4-05', p: 'high', t: '진한 색상 구간 상도 3회 여부 판단 (은폐력 확인)', c: '도장', s: 'inwall', doc: false },
      { id: 'P4-06', p: 'high', t: '도장 중 온습도 기록 (5℃ 이상·85% 이하 유지)', c: '환경', s: 'common', doc: true },
      { id: 'P4-07', p: 'high', t: '롤러 자국·붓자국·흘러내림 즉시 보정', c: '품질', s: 'inwall', doc: false },
      { id: 'P4-08', p: 'high', t: '천장-벽 경계선 직선도 확인 (마스킹 라인)', c: '품질', s: 'inwall', doc: true },
      { id: 'P4-09', p: 'high', t: '모서리·구석 붓 마감 후 롤러 결 통일', c: '품질', s: 'inwall', doc: false },
      { id: 'P4-10', p: 'medium', t: '실별 도장 완료 사진 및 사용 도료 로트 기록', c: '기록', s: 'inwall', doc: true },
      { id: 'P4-11', p: 'high', t: '도장 중 환기 확보 (유기용제 사용 구간 필수)', c: '안전', s: 'common', doc: false }
    ]
  },
  {
    id: 'P5', name: '2층 내부 도장', critical: false,
    items: [
      { id: 'P5-01', p: 'critical', t: '2층 하도 1회 + 상도 2회 도장 (1층과 동일 사양)', c: '도장', s: 'inwall', doc: true },
      { id: 'P5-02', p: 'critical', t: '1층과 색상·광택 동일성 확인 (동일 로트 사용 권장)', c: '품질', s: 'inwall', doc: true },
      { id: 'P5-03', p: 'high', t: '계단실 고소부 도장 (안전 발판·안전대 확보)', c: '안전', s: 'common', doc: true },
      { id: 'P5-04', p: 'high', t: '경사 천장·박공 구간 도장 (다락·상부)', c: '도장', s: 'inwall', doc: false },
      { id: 'P5-05', p: 'high', t: '욕실·다용도실 곰팡이 방지 도료 적용 확인', c: '도장', s: 'special', doc: true },
      { id: 'P5-06', p: 'high', t: '도장 중 온습도 기록 (2층 · 일자별)', c: '환경', s: 'common', doc: true },
      { id: 'P5-07', p: 'medium', t: '2층 실별 도장 완료 사진', c: '기록', s: 'inwall', doc: true }
    ]
  },
  {
    id: 'P6', name: '목부 · 철부 도장', critical: false,
    items: [
      { id: 'P6-01', p: 'critical', t: '목부 함수율 8% 이하 재확인 후 착수', c: '바탕', s: 'wood', doc: true },
      { id: 'P6-02', p: 'critical', t: '목부 하도 1회 + 중도 2회 + 상도 3회 (래커 기준 [KS M 6040])', c: '도장', s: 'wood', doc: true },
      { id: 'P6-03', p: 'high', t: '중도 도막 90~200㎛ 확보 · 각 회차 2시간 이상 건조', c: '도장', s: 'wood', doc: true },
      { id: 'P6-04', p: 'high', t: '회차 사이 연마 (P240) 후 분진 제거', c: '연마', s: 'wood', doc: false },
      { id: 'P6-05', p: 'high', t: '문틀·문선·걸레받이 색상 일관성 확인', c: '품질', s: 'wood', doc: true },
      { id: 'P6-06', p: 'critical', t: '철부 방청 하도 1~2회 [KS M 6030] · 48시간 이상 건조', c: '도장', s: 'metal', doc: true },
      { id: 'P6-07', p: 'critical', t: '철부 상도 2회 [KS M 6020] · 각 12시간 이상 건조', c: '도장', s: 'metal', doc: true },
      { id: 'P6-08', p: 'high', t: '용접부·모서리 추가 도장 (도막 얇아지는 부위)', c: '도장', s: 'metal', doc: false },
      { id: 'P6-09', p: 'high', t: '난간·철제문 도막두께 측정 [KS M ISO 2808]', c: '검사', s: 'metal', doc: true },
      { id: 'P6-10', p: 'medium', t: '에폭시 특수도장 시공 (보일러실·주차장 · 24시간 재도장)', c: '도장', s: 'special', doc: true }
    ]
  },
  {
    id: 'P7', name: '외부 도장', critical: false,
    items: [
      { id: 'P7-01', p: 'critical', t: '외벽 바탕 함수율·균열 확인 및 보수 (탄성 도료 전)', c: '바탕', s: 'ext', doc: true },
      { id: 'P7-02', p: 'critical', t: '기상 확인 — 강우 예보 시 착수 금지 (건조 전 강우 = 재시공)', c: '환경', s: 'ext', doc: true },
      { id: 'P7-03', p: 'critical', t: '외벽 하도(실러) 1회 도장 · 흡수 조절', c: '도장', s: 'ext', doc: true },
      { id: 'P7-04', p: 'critical', t: '외벽 상도 2회 도장 (탄성·내후성 [KS M 5710])', c: '도장', s: 'ext', doc: true },
      { id: 'P7-05', p: 'high', t: '균열부 탄성 퍼티 선처리 후 도장', c: '바탕', s: 'ext', doc: false },
      { id: 'P7-06', p: 'high', t: '파라펫·상단부 발수 처리 (우수 침투 경로)', c: '도장', s: 'ext', doc: true },
      { id: 'P7-07', p: 'high', t: '창호 주변 마스킹 및 실란트 오염 방지', c: '보양', s: 'ext', doc: false },
      { id: 'P7-08', p: 'high', t: '외부 목부(데크·처마) 오일스테인 도장 · 목재 함수율 확인', c: '도장', s: 'wood', doc: true },
      { id: 'P7-09', p: 'medium', t: '외부 철부(난간·홈통) 방청 + 상도', c: '도장', s: 'metal', doc: false },
      { id: 'P7-10', p: 'high', t: '고소작업 안전 (비계·안전대·하부 통제)', c: '안전', s: 'common', doc: true }
    ]
  },
  {
    id: 'P8', name: '검사 · 보정', critical: false,
    items: [
      { id: 'P8-01', p: 'critical', t: '외관 검사 — 붓자국·얼룩·흘러내림·주름·거품 [KCS 41 47 00]', c: '검사', s: 'common', doc: true },
      { id: 'P8-02', p: 'critical', t: '색상·광택 일관성 검사 (실별·면별 · 자연광/조명 모두)', c: '검사', s: 'inwall', doc: true },
      { id: 'P8-03', p: 'critical', t: '도막두께 측정 [KS M ISO 2808] · 기준치 미달 구간 추가 도장', c: '검사', s: 'common', doc: true },
      { id: 'P8-04', p: 'critical', t: '건조 상태 평가 (지촉→고착→경화→완전건조 단계 확인)', c: '검사', s: 'common', doc: true },
      { id: 'P8-05', p: 'high', t: '측광 검사 재실시 — 퍼티 자국·요철 잔존 확인', c: '검사', s: 'prep', doc: true },
      { id: 'P8-06', p: 'high', t: '경계선·모서리 마감 보정 (마스킹 뜯김·번짐)', c: '보정', s: 'inwall', doc: false },
      { id: 'P8-07', p: 'high', t: '타 공정 오염 확인 및 보수 (바닥·창호·가구·전기기구)', c: '보정', s: 'common', doc: true },
      { id: 'P8-08', p: 'high', t: '보양재 제거 및 잔여 접착 흔적 제거', c: '정리', s: 'common', doc: false },
      { id: 'P8-09', p: 'medium', t: '보수 도장 이력 기록 (위치·사유·도료)', c: '기록', s: 'common', doc: true }
    ]
  },
  {
    id: 'P9', name: '준공 · 인도', critical: false,
    items: [
      { id: 'P9-01', p: 'critical', t: '최종 검수 (건축주 입회 · 지적사항 목록화)', c: '준공', s: 'common', doc: true },
      { id: 'P9-02', p: 'critical', t: '지적사항 보수 완료 및 재확인', c: '준공', s: 'common', doc: true },
      { id: 'P9-03', p: 'high', t: '색상 지정 위치도 최종본 인도 (재도장 시 근거)', c: '인도', s: 'inwall', doc: true },
      { id: 'P9-04', p: 'critical', t: '도료 시험성적서·KS 인증서·친환경 인증 일괄 제출', c: '인도', s: 'common', doc: true },
      { id: 'P9-05', p: 'high', t: '온습도 기록지 제출 (시공 조건 근거)', c: '인도', s: 'common', doc: true },
      { id: 'P9-06', p: 'high', t: '잔여 도료 인계 (보수용 · 색번호 라벨 부착)', c: '인도', s: 'common', doc: true },
      { id: 'P9-07', p: 'high', t: '하자보수 범위·기간 안내 및 연락처 전달', c: '인도', s: 'common', doc: true },
      { id: 'P9-08', p: 'high', t: '폐도료·용기 지정 폐기물 처리 (일반 배출 금지)', c: '준공', s: 'common', doc: true },
      { id: 'P9-09', p: 'medium', t: '준공 사진 촬영 (실별 · 내부·외부)', c: '기록', s: 'common', doc: true },
      { id: 'P9-10', p: 'high', t: '기성·잔금 정산 및 세금계산서 발행', c: '정산', s: 'common', doc: true }
    ]
  }
];"""

TRADE['MATERIALS'] = """const MATERIALS = [
  {
    cat: '내부 수성 도료', mark: 'WATER', s: 'inwall',
    items: [
      { id: 'M-WPRM', name: '수성 프라이머 (하도)', spec: '합성수지 에멀션 [KS M 6010]', usage: '천장·벽 하도 1회', applyFrom: '석고·모르타르', applyTo: '전 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-WTOP', name: '수성 상도 (무광)', spec: '[KS M 6010] · 도막 60~180㎛', usage: '천장 상도 2회', applyFrom: '천장', applyTo: '전 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-WTOPL', name: '수성 상도 (저광·반광)', spec: '[KS M 6010] · 오염 저항', usage: '벽 상도 2회', applyFrom: '벽면', applyTo: '전 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-ACRY', name: '아크릴 에나멜', spec: '[KS M 5710] · 도막 60~180㎛', usage: '고내구 벽면·포인트', applyFrom: '벽면', applyTo: '지정 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-ECO', name: '친환경 인증 도료', spec: '중금속 합 0.1% 이하 · 저VOC', usage: '침실·아이방', applyFrom: '벽·천장', applyTo: '지정 실', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '바탕 처리재', mark: 'PREP', s: 'prep',
    items: [
      { id: 'M-PUTTY', name: '수성 퍼티', spec: '내부 석고·모르타르용', usage: '이음부·전면 퍼티', applyFrom: '보드 이음', applyTo: '전 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-JTAPE', name: '조인트 테이프', spec: '메쉬 또는 종이 50mm', usage: '보드 이음부 균열 방지', applyFrom: '이음부', applyTo: '전 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-PPUTTY', name: '폴리에스테르 퍼티', spec: '[KS M 5713]', usage: '목부·철부 구멍땜', applyFrom: '결손부', applyTo: '목부·철부', brand: '', qty: '', status: 'mijung' },
      { id: 'M-SHELL', name: '셀락니스', spec: '옹이땜 전용', usage: '목부 옹이 처리 2회', applyFrom: '옹이', applyTo: '목부 전체', brand: '', qty: '', status: 'mijung' },
      { id: 'M-SAND1', name: '연마지 P120~150', spec: '[KS L 6003]', usage: '퍼티 1차 연마', applyFrom: '퍼티면', applyTo: '전 면', brand: '', qty: '', status: 'mijung' },
      { id: 'M-SAND2', name: '연마지 P240', spec: '[KS L 6003]', usage: '마무리 연마·모서리', applyFrom: '퍼티면', applyTo: '전 면', brand: '', qty: '', status: 'mijung' },
      { id: 'M-SEAL', name: '알칼리 차단 실러', spec: '아크릴 바니시 [KS M 5605]', usage: '흡수 방지·백화 차단', applyFrom: '모르타르', applyTo: '해당 구간', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '목부 도료', mark: 'WOOD', s: 'wood',
    items: [
      { id: 'M-LPRM', name: '래커 프라이머', spec: '[KS M 6040]', usage: '목부 하도 1회', applyFrom: '문틀·몰딩', applyTo: '목부 전체', brand: '', qty: '', status: 'mijung' },
      { id: 'M-LSURF', name: '래커 서페이서', spec: '[KS M 6040] · 90~200㎛', usage: '목부 중도 2회', applyFrom: '목부', applyTo: '목부 전체', brand: '', qty: '', status: 'mijung' },
      { id: 'M-LTOP', name: '래커 상도', spec: '[KS M 6040]', usage: '목부 상도 3회', applyFrom: '목부', applyTo: '목부 전체', brand: '', qty: '', status: 'mijung' },
      { id: 'M-STAIN', name: '오일 스테인', spec: '침투형 · 외부용 내후성', usage: '데크·처마 목부', applyFrom: '외부 목재', applyTo: '데크·처마', brand: '', qty: '', status: 'mijung' },
      { id: 'M-VARN', name: '바니시 (우레탄)', spec: '[KS M 6050]', usage: '목부 투명 마감', applyFrom: '계단·창대', applyTo: '지정 부위', brand: '', qty: '', status: 'mijung' },
      { id: 'M-WPRM2', name: '조합 목재 프라이머', spec: '[KS M 5318] · 외부용', usage: '외부 목부 하도', applyFrom: '외부 목재', applyTo: '외부', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '철부 도료', mark: 'METAL', s: 'metal',
    items: [
      { id: 'M-RUST', name: '방청 프라이머', spec: '광명단·아연분말 [KS M 6030]', usage: '철부 하도 1~2회', applyFrom: '난간·철제문', applyTo: '철부 전체', brand: '', qty: '', status: 'mijung' },
      { id: 'M-OIL', name: '조합 도료 (상도)', spec: '[KS M 6020] · 도막 60~120㎛', usage: '철부 상도 2회', applyFrom: '철부', applyTo: '철부 전체', brand: '', qty: '', status: 'mijung' },
      { id: 'M-ZNPR', name: '금속바탕처리 프라이머', spec: '아연도금면 A종용', usage: '아연도금면 처리', applyFrom: '아연도금', applyTo: '해당 부위', brand: '', qty: '', status: 'mijung' },
      { id: 'M-EPOX', name: '에폭시 2액형', spec: '도막 100~600㎛ · 24시간 재도장', usage: '보일러실·주차장 바닥', applyFrom: '바닥', applyTo: '지정 구간', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '외부 도료', mark: 'EXT', s: 'ext',
    items: [
      { id: 'M-ESEAL', name: '외부 실러 (하도)', spec: '흡수 조절·부착 증진', usage: '외벽 하도 1회', applyFrom: '외벽', applyTo: '전 외벽', brand: '', qty: '', status: 'mijung' },
      { id: 'M-ELAST', name: '탄성 도료', spec: '아크릴 탄성 [KS M 5710]', usage: '외벽 상도 2회 · 균열 대응', applyFrom: '외벽', applyTo: '전 외벽', brand: '', qty: '', status: 'mijung' },
      { id: 'M-EPUT', name: '탄성 퍼티', spec: '외부 균열 보수용', usage: '균열부 선처리', applyFrom: '균열부', applyTo: '해당 부위', brand: '', qty: '', status: 'mijung' },
      { id: 'M-WREP', name: '발수제', spec: '실란·실록산계', usage: '파라펫·상단 발수', applyFrom: '상부 노출면', applyTo: '해당 부위', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '특수 · 기능성', mark: 'SPEC', s: 'special',
    items: [
      { id: 'M-ANTI', name: '곰팡이 방지 도료', spec: '항곰팡이 기능성', usage: '욕실·다용도실', applyFrom: '천장·벽', applyTo: '습윤 부위', brand: '', qty: '', status: 'mijung' },
      { id: 'M-FIRE', name: '내화 도료', spec: '준불연 인증품', usage: '방화 요구 구간', applyFrom: '지정 부위', applyTo: '해당 구간', brand: '', qty: '', status: 'mijung' },
      { id: 'M-BOARD', name: '칠판·자석 도료', spec: '기능성 특수도료', usage: '아이방 포인트 벽', applyFrom: '벽면', applyTo: '지정 실', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '부자재 · 보양', mark: 'AUX', s: 'common',
    items: [
      { id: 'M-THIN', name: '도료용 희석제', spec: '[KS M 6060] · 도료 계열별', usage: '희석 (제조사 기준)', applyFrom: '도료', applyTo: '전 공정', brand: '', qty: '', status: 'mijung' },
      { id: 'M-MASK', name: '마스킹 테이프', spec: '18·24·48mm 도장용', usage: '경계선 보양', applyFrom: '창호·바닥', applyTo: '전 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-COVER', name: '보양 필름·부직포', spec: '바닥·가구 보호', usage: '전면 보양', applyFrom: '바닥·가구', applyTo: '전 실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-ROLL', name: '롤러·붓', spec: '모길이 도료별 선택', usage: '도장 공구', applyFrom: '-', applyTo: '전 공정', brand: '', qty: '', status: 'mijung' },
      { id: 'M-SPRAY', name: '에어리스 스프레이', spec: '대면적 도장용', usage: '외벽·천장 대면적', applyFrom: '-', applyTo: '해당 구간', brand: '', qty: '', status: 'mijung' }
    ]
  }
];"""

TRADE['CHANGE_ORDER'] = """const CHANGE_ORDER_REFERENCE = [
  { item: '내부 수성 도장 (하도 1 + 상도 2 · 천장)', mat: 3800, lab: 9500, unit: '㎡' },
  { item: '내부 수성 도장 (하도 1 + 상도 2 · 벽)', mat: 4200, lab: 10500, unit: '㎡' },
  { item: '친환경 인증 도료 상향 (저VOC)', mat: 3500, lab: 0, unit: '㎡' },
  { item: '진한 색상 상도 1회 추가 (은폐력 보강)', mat: 2100, lab: 5200, unit: '㎡' },
  { item: '전면 퍼티 추가 (2종 · 이음부 처리분 제외)', mat: 2800, lab: 11000, unit: '㎡' },
  { item: '알칼리 차단 실러 추가 도포', mat: 2400, lab: 4800, unit: '㎡' },
  { item: '포인트 벽 색상 분리 시공 (마스킹 포함)', mat: 5500, lab: 18000, unit: '㎡' },
  { item: '목부 도장 (하도 1 + 중도 2 + 상도 3)', mat: 7200, lab: 24000, unit: '㎡' },
  { item: '문틀·문선 도장 (1개소 · 양면)', mat: 12000, lab: 42000, unit: '개소' },
  { item: '걸레받이·몰딩 도장', mat: 2200, lab: 6500, unit: 'm' },
  { item: '철부 방청 + 상도 2회', mat: 6800, lab: 21000, unit: '㎡' },
  { item: '난간 도장 (계단·발코니)', mat: 8500, lab: 32000, unit: 'm' },
  { item: '외벽 탄성 도장 (실러 1 + 상도 2)', mat: 7500, lab: 16000, unit: '㎡' },
  { item: '외벽 균열 탄성 퍼티 보수', mat: 3200, lab: 12000, unit: 'm' },
  { item: '파라펫·상단 발수 처리', mat: 4500, lab: 9000, unit: '㎡' },
  { item: '에폭시 바닥 도장 (보일러실·주차장)', mat: 9500, lab: 22000, unit: '㎡' },
  { item: '곰팡이 방지 도료 (욕실·다용도실)', mat: 6500, lab: 12000, unit: '㎡' },
  { item: '외부 목부 오일스테인 (데크·처마)', mat: 6800, lab: 18000, unit: '㎡' },
  { item: '고소작업 할증 (비계 사용 구간)', mat: 0, lab: 45000, unit: '㎡' },
  { item: '도장 보수·재시공 (일당 기준)', mat: 0, lab: 300000, unit: '인·일' }
];"""

TRADE['COST_GRADES'] = """const COST_GRADES = {
  conservative: { name: '보수적', perPyeong: 45000 },
  standard: { name: '표준', perPyeong: 75000 },
  premium: { name: '고급', perPyeong: 140000 }
};"""

TRADE['COST_OPTIONS'] = """const COST_OPTIONS = [
  { id: 'opt1', name: '전 실 친환경 인증 도료 상향 (저VOC)', amount: 2800000 },
  { id: 'opt2', name: '전면 퍼티(2종) 전 실 적용', amount: 3800000 },
  { id: 'opt3', name: '외벽 탄성 도장 고급 등급 (내후성 상향)', amount: 3200000 },
  { id: 'opt4', name: '목부 전체 래커 6회 마감 (가구급 도장)', amount: 4500000 },
  { id: 'opt5', name: '포인트 색상 분리 시공 확대 (8개소)', amount: 1800000 }
];"""

TRADE['COST_OPT_INIT'] = "opt1: false, opt2: false, opt3: false, opt4: false, opt5: false"
