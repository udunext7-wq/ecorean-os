# -*- coding: utf-8 -*-
"""타일공사 — KCS 41 48 00 / KCS 41 48 01 기준"""

TRADE = {}
TRADE['KEY'] = 'tile'
TRADE['DIR'] = 'tilework'
TRADE['NAME'] = '타일공사'
TRADE['MARK'] = 'TILEWORK'
TRADE['SUBTITLE'] = '140평 / 2층 / 바탕·방수 · 바닥타일 · 벽타일 · 욕실 · 외부현관 · 줄눈'
TRADE['CONTRACT_EN'] = 'TILE WORK CONTRACT'

TRADE['POS_TITLE'] = '타일 기준선·구배 위치도'
TRADE['POS_UNIT'] = '기준선'
TRADE['POS_SIZE_COL'] = '타일 규격'
TRADE['POS_MARK'] = 'SETTING-OUT & SLOPE · 붙임 착수 전 실별 기준선·구배 확정 필수'
TRADE['POS_EMPTY_HINT'] = '타일은 붙이고 나면 못 옮깁니다. 실·부위별 기준선(통줄눈 기점)과 배수 구배·드레인 위치를 먼저 등록하고 승인 사진을 남기세요.'
TRADE['CONTRACT_POS_CLAUSE'] = '타일 기준선·나누기 및 배수 구배는 별첨 타일 기준선·구배 위치도에 따르며, 붙임 착수 전 건축주 승인을 받는다.'
TRADE['SPEC_TITLE'] = '타일 규격·부위 시방'

TRADE['WARRANTY'] = '준공일로부터 1년 [건설산업기본법 시행령 별표4 · 미장·타일], 방수 시공 부분은 3년 [동 별표4 · 방수] (양 당사자 합의로 연장 가능)'
TRADE['DELAY_EXCEPT'] = '천재지변, 선행공정(방수·미장·설비) 지연, 양생기간 확보를 위한 대기 등 시공자 귀책이 아닌 사유는 제외한다.'
TRADE['LICENSE'] = '수급인은 건설산업기본법에 따른 도장·습식·방수·석공사업(주력분야 습식·타일) 등록업체여야 하며(공사예정금액 1,500만원 미만의 경미한 건설공사는 예외), 등록증 사본을 별첨한다.'
TRADE['LICENSE_DOC'] = '도장·습식·방수·석공사업 등록증 사본'
TRADE['SAFETY'] = '타일 절단기·습식 작업 구간은 산업안전보건법에 따라 분진·감전·미끄럼 안전 계획을 수립하고 시공한다.'

TRADE['LAWS'] = """          <li>KCS 41 48 00 및 KCS 41 48 01 (타일공사) 표준시방서에 따라 시공한다.</li>
          <li>붙임 모르타르 두께와 오픈타임은 공법별 기준을 준수한다 — 떠붙이기 12~24mm·15분 이내·1.2㎡ 이하, 압착붙이기 5~7mm·15분 이내·1.2㎡ 이하, 개량압착 3~5mm·30분 이내·1.5㎡ 이하, 동시줄눈 5~8mm·20분 이내·1.5㎡ 이하 [KCS 41 48 01 표 3.2-1].</li>
          <li>붙임 후 두들김(타음) 검사를 실시하고, 떠붙이기 기준 뒷채움률 80% 이상을 확보한다.</li>
          <li>접착강도는 재령 4주에 0.39N/㎟ 이상으로 하며, 200㎡당 1매를 시험한다 [KCS 41 48 01].</li>
          <li>줄눈은 붙임 3시간 경과 후 줄눈파기, 24시간 경과 후 시공하며, 신축줄눈은 약 3m 간격으로 구조체 신축줄눈 위치와 일치시킨다.</li>
          <li>붙임 후 3일간 진동·보행을 금지하고, 줄눈 경화 후 7일간 통행을 금지한다. 외장타일은 여름철(25℃ 이상) 3~4일, 봄·가을(10~20℃) 1주일 이상 양생한다.</li>
          <li>자재는 KS L 1001(도자기질 타일)·KS L 1592(타일 시멘트)·KS L 1593(타일용 접착제)·KS L 5201(포틀랜드 시멘트) 인증품을 사용한다.</li>
          <li>욕실·발코니 등 방수 부위는 KCS 41 40 (방수공사)에 따라 방수층을 시공·확인한 뒤 타일을 붙인다.</li>"""

TRADE['SUBSYSTEMS'] = """const SUBSYSTEMS = {
  common: { name: '공통',       short: '공통', color: '#7B8597' },
  prep:   { name: '바탕·방수',  short: '바탕', color: '#B85420' },
  floor:  { name: '바닥타일',   short: '바닥', color: '#2E5B9E' },
  wall:   { name: '벽타일',     short: '벽',   color: '#3B82A8' },
  bath:   { name: '욕실',       short: '욕실', color: '#0F6E56' },
  ext:    { name: '외부·현관',  short: '외부', color: '#6B5B95' },
  grout:  { name: '줄눈·마감',  short: '줄눈', color: '#B8742E' }
};"""

TRADE['PHASE_DAYS'] = """const PHASE_DEFAULT_DAYS = {
  P0: 7,   // 사전 단계
  P1: 2,   // 자재 반입·검수
  P2: 4,   // 바탕·방수 확인
  P3: 3,   // 타일 나누기·기준선
  P4: 6,   // 1층 바닥 타일
  P5: 7,   // 1층 벽 타일 (욕실·주방)
  P6: 8,   // 2층 타일
  P7: 5,   // 줄눈·실리콘
  P8: 4,   // 검사 (타음·접착강도)
  P9: 2    // 준공 인도
};"""

TRADE['FLOORS'] = "'1F', '2F', '옥외', '공용'"
TRADE['SIZES'] = "'300×300', '300×600', '600×600', '600×1200', '900×1800', '모자이크', '기타'"
TRADE['ROOMS'] = "'거실', '주방', '현관', '욕실', '다용도실', '세탁실', '발코니', '테라스', '보일러실', '계단실', '상가 화장실', '기타'"

TRADE['POS_STATUS'] = """const SLEEVE_STATUS = {
  planned: '계획',
  marked: '먹매김 완료',
  installed: '바탕·방수 완료',
  used: '타일 붙임 완료',
  unused: '보수·재시공 필요'
};"""

TRADE['COLORS'] = """const DEFAULT_CIRCUIT_COLORS = [
  { color: '#E8E0D2', name: '크림 포세린 600각', usage: '현관·세탁실 바닥', applyTo: '600×600 [KS L 1001]', note: '줄눈 5~6mm · 논슬립 확인' },
  { color: '#B9B7B2', name: '그레이 포세린 600각', usage: '욕실 바닥', applyTo: '600×600', note: '구배 1/50 이상 · 드레인 방향' },
  { color: '#C4C2BD', name: '그레이 포세린 600×1200', usage: '욕실 벽', applyTo: '600×1200', note: '개량압착 3~5mm · 오픈타임 30분' },
  { color: '#9AA0A6', name: '그레이 포세린 테라스', usage: '테라스 바닥', applyTo: '600×600', note: '외부 · 동결융해 저항 등급 확인' },
  { color: '#EDE4D3', name: '크림 자기질 300각', usage: '상가 화장실·보일러실 바닥', applyTo: '300×300 · 16pcs/1.44㎡', note: '줄눈 3mm' },
  { color: '#F0E8D8', name: '크림 자기질 300×600', usage: '상가 화장실 벽', applyTo: '300×600', note: '압착붙이기 5~7mm · 15분' },
  { color: '#3E5C76', name: '블루 모자이크', usage: '다용도실 벽 포인트', applyTo: '45×195 모자이크', note: '판형붙이기 · 줄눈 2mm' },
  { color: '#5A5A5A', name: '줄눈재 (그레이)', usage: '바닥·벽 일반 줄눈', applyTo: '시멘트계 줄눈재', note: '붙임 24시간 후 시공' },
  { color: '#8B8178', name: '실리콘 (무초산)', usage: '코너·이종재 접합부', applyTo: '방곰팡이 실리콘', note: '줄눈 대신 실리콘 처리 구간' }
];"""

TRADE['CHECKLIST'] = """const CHECKLIST = [
  {
    id: 'P0', name: '사전 단계 · 설계·계약·법규', critical: false,
    items: [
      { id: 'P0-01', p: 'critical', t: '타일 도면 확정 (실별 전개도·나누기도·패턴)', c: '도면', s: 'common', doc: true },
      { id: 'P0-02', p: 'critical', t: '공사범위 경계 확정 (방수·미장·설비·도장과 인수인계 지점)', c: '계약', s: 'common', doc: true },
      { id: 'P0-03', p: 'critical', t: '계약서 본문 작성 및 서명', c: '계약', s: 'common', doc: true },
      { id: 'P0-04', p: 'high', t: '시방서 별첨 및 합의 (KCS 41 48 00 · 41 48 01 준수)', c: '계약', s: 'common', doc: true },
      { id: 'P0-05', p: 'high', t: '추가공사 단가표 첨부 (양 당사자 서명)', c: '계약', s: 'common', doc: true },
      { id: 'P0-06', p: 'high', t: '하자보수 범위·기간 명시 (미장·타일 1년 / 방수 3년 · 별표4)', c: '계약', s: 'common', doc: true },
      { id: 'P0-07', p: 'critical', t: '타일 사양 확정 (품번·규격·색상·소재·흡수율 등급)', c: '자재', s: 'common', doc: true },
      { id: 'P0-08', p: 'critical', t: '실별 소요 면적 산출 및 로스율 반영 (일반 5~10% · 패턴 15% 이상)', c: '물량', s: 'common', doc: true },
      { id: 'P0-09', p: 'critical', t: '붙임공법 결정 (떠붙이기·압착·개량압착·접착·동시줄눈)', c: '시공방식', s: 'common', doc: true },
      { id: 'P0-10', p: 'critical', t: '방수 사양·범위 확정 (욕실 벽 높이·발코니·세탁실)', c: '설계', s: 'prep', doc: true },
      { id: 'P0-11', p: 'critical', t: '바닥 구배 계획 (욕실 1/50 이상 · 드레인 위치·개수)', c: '설계', s: 'floor', doc: true },
      { id: 'P0-12', p: 'high', t: '줄눈 폭·색상 결정 (내부 일반 5~6mm · 소형 3mm · 모자이크 2mm)', c: '설계', s: 'grout', doc: true },
      { id: 'P0-13', p: 'high', t: '신축줄눈 계획 (약 3m 간격 · 구조체 신축줄눈과 일치)', c: '설계', s: 'grout', doc: true },
      { id: 'P0-14', p: 'high', t: '논슬립 등급 확인 (욕실·현관·테라스 미끄럼 저항)', c: '자재', s: 'floor', doc: true },
      { id: 'P0-15', p: 'high', t: '외부 타일 동결융해 저항 확인 (테라스·현관 노출부)', c: '자재', s: 'ext', doc: true },
      { id: 'P0-16', p: 'high', t: '공정 순서 합의 (방수 → 타일 → 위생기구 · 양생 기간 반영)', c: '공정', s: 'common', doc: true },
      { id: 'P0-17', p: 'medium', t: '문틀·걸레받이와 바닥 레벨 조정 협의 (목공과 사전 합의)', c: '공정', s: 'floor', doc: true }
    ]
  },
  {
    id: 'P1', name: '자재 반입 · 검수', critical: false,
    items: [
      { id: 'P1-01', p: 'critical', t: '타일 KS L 1001 인증 및 품번·색상 대조 (승인 샘플 기준)', c: '검수', s: 'common', doc: true },
      { id: 'P1-02', p: 'critical', t: '동일 로트(색차) 확인 — 로트 다르면 색 튄다', c: '검수', s: 'common', doc: true },
      { id: 'P1-03', p: 'critical', t: '타일 치수 편차·휨 확인 (대형 타일일수록 치명적)', c: '검수', s: 'common', doc: true },
      { id: 'P1-04', p: 'high', t: '파손·모서리 깨짐 선별 및 반품 처리', c: '검수', s: 'common', doc: false },
      { id: 'P1-05', p: 'high', t: '흡수율 등급 확인 (자기질·석기질·도기질 구분)', c: '검수', s: 'common', doc: true },
      { id: 'P1-06', p: 'critical', t: '타일 시멘트·접착제 규격 확인 [KS L 1592 / KS L 1593]', c: '검수', s: 'common', doc: true },
      { id: 'P1-07', p: 'high', t: '줄눈재 색상·규격 확인 (승인 색상과 대조)', c: '검수', s: 'grout', doc: true },
      { id: 'P1-08', p: 'high', t: '방수재 규격·유효기간 확인', c: '검수', s: 'prep', doc: true },
      { id: 'P1-09', p: 'critical', t: '자재 보관 — 평탄 바닥·세워 쌓기·우수 차단', c: '보관', s: 'common', doc: false },
      { id: 'P1-10', p: 'high', t: '반입 수량 검수 및 납품서 대조 (박스·㎡ 단위)', c: '검수', s: 'common', doc: true },
      { id: 'P1-11', p: 'medium', t: '여유분 확보 확인 (보수용 · 준공 후 인계분 포함)', c: '검수', s: 'common', doc: true }
    ]
  },
  {
    id: 'P2', name: '바탕 · 방수 확인', critical: true,
    items: [
      { id: 'P2-01', p: 'critical', t: '바탕 평활도 확인 (2m 자 기준 · 대형 타일은 3mm 이내)', c: '바탕', s: 'prep', doc: true },
      { id: 'P2-02', p: 'critical', t: '바탕 청소 — 먼지·레이턴스·이형제 제거', c: '바탕', s: 'prep', doc: false },
      { id: 'P2-03', p: 'critical', t: '바탕 균열·들뜸 조사 및 보수 (타일 균열의 원인)', c: '바탕', s: 'prep', doc: true },
      { id: 'P2-04', p: 'critical', t: '방수층 시공 완료 확인 [KCS 41 40] · 도막 두께·모서리 보강', c: '방수', s: 'prep', doc: true },
      { id: 'P2-05', p: 'critical', t: '담수 시험 실시 (24시간 이상 · 누수 없음 확인)', c: '방수', s: 'prep', doc: true },
      { id: 'P2-06', p: 'critical', t: '욕실 벽 방수 높이 확인 (샤워부스 구간 상향 적용)', c: '방수', s: 'bath', doc: true },
      { id: 'P2-07', p: 'critical', t: '드레인·배수구 주변 방수 보강 확인 (누수 최다 발생부)', c: '방수', s: 'bath', doc: true },
      { id: 'P2-08', p: 'high', t: '설비 배관 관통부 방수 처리 확인', c: '방수', s: 'prep', doc: true },
      { id: 'P2-09', p: 'critical', t: '바탕 양생 완료 확인 (미장 후 충분한 건조 · 함수 과다 시 백화)', c: '바탕', s: 'prep', doc: true },
      { id: 'P2-10', p: 'high', t: '방수층 손상 금지 표시 및 통행 통제', c: '보양', s: 'prep', doc: false },
      { id: 'P2-11', p: 'high', t: '방수 시공 사진 기록 (부위별 · 하자 분쟁 근거)', c: '기록', s: 'prep', doc: true },
      { id: 'P2-12', p: 'medium', t: '바탕 흡수 조절 (건조 과다 시 물축임 · 과습 시 대기)', c: '바탕', s: 'prep', doc: false }
    ]
  },
  {
    id: 'P3', name: '타일 나누기 · 기준선', critical: true,
    items: [
      { id: 'P3-01', p: 'critical', t: '실별 실측 후 타일 나누기 확정 (반쪽 타일 최소화)', c: '먹매김', s: 'common', doc: true },
      { id: 'P3-02', p: 'critical', t: '기준선(통줄눈 기점) 먹매김 — 시선이 닿는 면 기준', c: '먹매김', s: 'common', doc: true },
      { id: 'P3-03', p: 'critical', t: '바닥-벽 줄눈 통일 여부 확정 (통줄눈 맞춤 시 오차 0 필요)', c: '먹매김', s: 'common', doc: true },
      { id: 'P3-04', p: 'critical', t: '욕실 바닥 구배 먹매김 (드레인 방향 1/50 이상)', c: '먹매김', s: 'bath', doc: true },
      { id: 'P3-05', p: 'high', t: '문틀·걸레받이 접합 레벨 확인 (마감 두께 반영)', c: '먹매김', s: 'floor', doc: true },
      { id: 'P3-06', p: 'high', t: '위생기구·수전 위치 대조 (줄눈이 기구 중심과 맞는지)', c: '먹매김', s: 'bath', doc: true },
      { id: 'P3-07', p: 'high', t: '점검구·환기구 위치 반영 (타일 재단 최소화)', c: '먹매김', s: 'wall', doc: true },
      { id: 'P3-08', p: 'critical', t: '신축줄눈 위치 표시 (약 3m 간격 · 구조체와 일치)', c: '먹매김', s: 'grout', doc: true },
      { id: 'P3-09', p: 'high', t: '나누기도 건축주 승인 (착수 후 변경 = 전면 재시공)', c: '승인', s: 'common', doc: true },
      { id: 'P3-10', p: 'medium', t: '기준선 사진 기록 (실별 · 위치도 등록)', c: '기록', s: 'common', doc: true }
    ]
  },
  {
    id: 'P4', name: '1층 바닥 타일', critical: false,
    items: [
      { id: 'P4-01', p: 'critical', t: '붙임 모르타르 두께 준수 (공법별 기준 [KCS 41 48 01])', c: '시공', s: 'floor', doc: true },
      { id: 'P4-02', p: 'critical', t: '오픈타임 준수 — 압착 15분·개량압착 30분 이내 (경화 후 붙이면 탈락)', c: '시공', s: 'floor', doc: true },
      { id: 'P4-03', p: 'critical', t: '1회 붙임 면적 준수 (압착 1.2㎡ / 개량압착 1.5㎡ 이하)', c: '시공', s: 'floor', doc: true },
      { id: 'P4-04', p: 'critical', t: '뒷채움 확보 — 두들김으로 밀착 (공극은 파손·탈락 원인)', c: '시공', s: 'floor', doc: true },
      { id: 'P4-05', p: 'critical', t: '현관·세탁실 구배 및 물 고임 확인 (물 부어 확인)', c: '품질', s: 'floor', doc: true },
      { id: 'P4-06', p: 'high', t: '줄눈 폭 균일 유지 (스페이서 사용 · 5~6mm 기준)', c: '시공', s: 'grout', doc: false },
      { id: 'P4-07', p: 'high', t: '단차(립피지) 확인 — 대형 타일은 레벨링 시스템 사용', c: '품질', s: 'floor', doc: true },
      { id: 'P4-08', p: 'critical', t: '붙임 후 3일간 진동·보행 금지 표시 및 통제', c: '양생', s: 'floor', doc: true },
      { id: 'P4-09', p: 'high', t: '재단면 마감 확인 (모서리 그라인딩·코너재 적용)', c: '품질', s: 'floor', doc: false },
      { id: 'P4-10', p: 'high', t: '붙임 완료 사진 (실별 · 로트 번호 기록)', c: '기록', s: 'floor', doc: true }
    ]
  },
  {
    id: 'P5', name: '1층 벽 타일 (욕실 · 주방)', critical: false,
    items: [
      { id: 'P5-01', p: 'critical', t: '벽타일 붙임공법 준수 (개량압착 3~5mm · 오픈타임 30분)', c: '시공', s: 'wall', doc: true },
      { id: 'P5-02', p: 'critical', t: '하부 첫 단 수평 확인 (여기가 틀어지면 전면이 틀어진다)', c: '시공', s: 'wall', doc: true },
      { id: 'P5-03', p: 'critical', t: '벽면 수직·평활도 확인 (600×1200 대형은 더 엄격)', c: '품질', s: 'wall', doc: true },
      { id: 'P5-04', p: 'critical', t: '욕실 벽 타일 방수층 손상 없이 시공 확인', c: '시공', s: 'bath', doc: true },
      { id: 'P5-05', p: 'high', t: '수전·점검구 타공 위치 정확도 (줄눈과 관계 확인)', c: '시공', s: 'bath', doc: true },
      { id: 'P5-06', p: 'high', t: '코너 마감 방식 확인 (코너재 / 45도 접합)', c: '품질', s: 'wall', doc: true },
      { id: 'P5-07', p: 'high', t: '주방 벽타일 상부 마감선 확인 (상부장 하단과 정합)', c: '시공', s: 'wall', doc: true },
      { id: 'P5-08', p: 'critical', t: '두들김 검사 — 벽타일 들뜸 즉시 재시공', c: '검사', s: 'wall', doc: true },
      { id: 'P5-09', p: 'high', t: '줄눈 폭 균일 및 통줄눈 직선도 확인', c: '품질', s: 'grout', doc: true },
      { id: 'P5-10', p: 'medium', t: '모자이크·포인트 타일 판형붙이기 (줄눈 2mm)', c: '시공', s: 'wall', doc: false }
    ]
  },
  {
    id: 'P6', name: '2층 타일', critical: false,
    items: [
      { id: 'P6-01', p: 'critical', t: '2층 욕실 방수 완료 및 담수 시험 확인', c: '방수', s: 'prep', doc: true },
      { id: 'P6-02', p: 'critical', t: '2층 바닥 구배 및 드레인 확인 (누수 시 1층 피해)', c: '시공', s: 'bath', doc: true },
      { id: 'P6-03', p: 'critical', t: '2층 벽·바닥 타일 붙임 (1층과 동일 공법·오픈타임 준수)', c: '시공', s: 'wall', doc: true },
      { id: 'P6-04', p: 'high', t: '1층과 색상·로트 동일성 확인', c: '품질', s: 'common', doc: true },
      { id: 'P6-05', p: 'high', t: '사우나·건식 구간 별도 사양 적용 확인', c: '시공', s: 'bath', doc: true },
      { id: 'P6-06', p: 'critical', t: '테라스 타일 시공 (외부 · 구배·배수·동결융해 확인)', c: '시공', s: 'ext', doc: true },
      { id: 'P6-07', p: 'high', t: '테라스 신축줄눈 시공 (약 3m 간격 · 온도 변형 대응)', c: '시공', s: 'ext', doc: true },
      { id: 'P6-08', p: 'critical', t: '외장타일 양생 — 여름 3~4일 / 봄·가을 1주일 이상', c: '양생', s: 'ext', doc: true },
      { id: 'P6-09', p: 'high', t: '계단실 논슬립 처리 확인 (미끄럼 사고 방지)', c: '시공', s: 'floor', doc: true },
      { id: 'P6-10', p: 'high', t: '두들김 검사 (2층 전 구간)', c: '검사', s: 'common', doc: true }
    ]
  },
  {
    id: 'P7', name: '줄눈 · 실리콘', critical: false,
    items: [
      { id: 'P7-01', p: 'critical', t: '붙임 3시간 경과 후 줄눈파기 [KCS 41 48 01]', c: '줄눈', s: 'grout', doc: true },
      { id: 'P7-02', p: 'critical', t: '붙임 24시간 경과 후 줄눈 시공 (조기 시공 시 백화)', c: '줄눈', s: 'grout', doc: true },
      { id: 'P7-03', p: 'high', t: '줄눈 충전 깊이 균일 확인 (함몰·과충전 없이)', c: '줄눈', s: 'grout', doc: false },
      { id: 'P7-04', p: 'high', t: '줄눈재 색상 일관성 확인 (동일 배합·동일 시점 시공)', c: '줄눈', s: 'grout', doc: true },
      { id: 'P7-05', p: 'critical', t: '이종재 접합부·코너는 줄눈 대신 실리콘 처리 (균열 방지)', c: '실리콘', s: 'grout', doc: true },
      { id: 'P7-06', p: 'critical', t: '욕실 실리콘 방곰팡이·무초산 제품 사용 확인', c: '실리콘', s: 'bath', doc: true },
      { id: 'P7-07', p: 'high', t: '위생기구·욕조 주변 실리콘 마감 (기구 설치 후)', c: '실리콘', s: 'bath', doc: false },
      { id: 'P7-08', p: 'high', t: '줄눈 잔재 제거 및 타일면 세척 (경화 전 제거)', c: '마감', s: 'grout', doc: false },
      { id: 'P7-09', p: 'critical', t: '줄눈 경화 후 7일간 통행 금지 [KCS 41 48 01]', c: '양생', s: 'grout', doc: true },
      { id: 'P7-10', p: 'medium', t: '백화 발생 여부 관찰 및 초기 제거', c: '품질', s: 'grout', doc: true }
    ]
  },
  {
    id: 'P8', name: '검사 (타음 · 접착강도)', critical: false,
    items: [
      { id: 'P8-01', p: 'critical', t: '두들김(타음) 검사 전수 실시 — 고무망치 [KCS 41 48 01]', c: '검사', s: 'common', doc: true },
      { id: 'P8-02', p: 'critical', t: '뒷채움률 80% 이상 확인 (떠붙이기 기준) · 미달 구간 재시공', c: '검사', s: 'common', doc: true },
      { id: 'P8-03', p: 'critical', t: '접착강도 시험 — 재령 4주 0.39N/㎟ 이상 · 200㎡당 1매', c: '검사', s: 'common', doc: true },
      { id: 'P8-04', p: 'critical', t: '들뜸·부착 불량 구간 표시 및 재시공 목록 작성', c: '검사', s: 'common', doc: true },
      { id: 'P8-05', p: 'critical', t: '욕실 물빠짐 최종 확인 (물 부어 드레인 유입 확인)', c: '검사', s: 'bath', doc: true },
      { id: 'P8-06', p: 'high', t: '줄눈 균열·함몰 검사 및 보수', c: '검사', s: 'grout', doc: true },
      { id: 'P8-07', p: 'high', t: '타일 단차·평활도 검사 (2m 자 · 손끝 확인)', c: '검사', s: 'common', doc: true },
      { id: 'P8-08', p: 'high', t: '색차·오염·스크래치 검사 (조명 각도 바꿔 확인)', c: '검사', s: 'common', doc: true },
      { id: 'P8-09', p: 'high', t: '외부 타일 배수·구배 재확인 (강우 시 고임 없음)', c: '검사', s: 'ext', doc: true },
      { id: 'P8-10', p: 'medium', t: '재시공 이력 기록 (위치·사유·조치)', c: '기록', s: 'common', doc: true }
    ]
  },
  {
    id: 'P9', name: '준공 · 인도', critical: false,
    items: [
      { id: 'P9-01', p: 'critical', t: '최종 검수 (건축주 입회 · 지적사항 목록화)', c: '준공', s: 'common', doc: true },
      { id: 'P9-02', p: 'critical', t: '지적사항 보수 완료 및 재확인', c: '준공', s: 'common', doc: true },
      { id: 'P9-03', p: 'critical', t: '접착강도 시험성적서 제출 [KCS 41 48 01]', c: '인도', s: 'common', doc: true },
      { id: 'P9-04', p: 'critical', t: '방수 시공·담수 시험 기록 제출 (하자 3년 대상)', c: '인도', s: 'prep', doc: true },
      { id: 'P9-05', p: 'high', t: '타일 KS 인증서·품번·로트 기록 제출', c: '인도', s: 'common', doc: true },
      { id: 'P9-06', p: 'high', t: '기준선·구배 위치도 최종본 인도', c: '인도', s: 'common', doc: true },
      { id: 'P9-07', p: 'high', t: '여유 타일 인계 (보수용 · 품번 라벨 부착)', c: '인도', s: 'common', doc: true },
      { id: 'P9-08', p: 'high', t: '하자보수 범위·기간 안내 (타일 1년 / 방수 3년)', c: '인도', s: 'common', doc: true },
      { id: 'P9-09', p: 'high', t: '타일 유지관리 안내 (세제·산성 세정제 주의)', c: '인도', s: 'common', doc: true },
      { id: 'P9-10', p: 'high', t: '잔재·폐타일 반출 및 현장 청소', c: '준공', s: 'common', doc: false },
      { id: 'P9-11', p: 'medium', t: '준공 사진 촬영 (실별 · 바닥·벽·줄눈)', c: '기록', s: 'common', doc: true },
      { id: 'P9-12', p: 'high', t: '기성·잔금 정산 및 세금계산서 발행', c: '정산', s: 'common', doc: true }
    ]
  }
];"""

TRADE['MATERIALS'] = """const MATERIALS = [
  {
    cat: '바닥 타일', mark: 'FLOOR', s: 'floor',
    items: [
      { id: 'M-FCR60', name: '크림 포세린 600각', spec: '600×600 · 포세린 [KS L 1001]', usage: '현관·세탁실 바닥', applyFrom: '현관', applyTo: '세탁실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-FGR60', name: '그레이 포세린 600각', spec: '600×600 · 포세린', usage: '욕실 바닥', applyFrom: '1층 욕실', applyTo: '2층 욕실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-FTR60', name: '테라스 포세린 600각', spec: '600×600 · 동결융해 저항', usage: '테라스 바닥', applyFrom: '테라스', applyTo: '외부 노출부', brand: '', qty: '', status: 'mijung' },
      { id: 'M-FCR30', name: '크림 자기질 300각', spec: '300×300 · 16pcs/1.44㎡', usage: '상가 화장실·보일러실 바닥', applyFrom: '상가', applyTo: '보일러실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-FNS', name: '논슬립 타일', spec: '미끄럼 저항 등급 확인', usage: '계단·욕실 바닥', applyFrom: '계단실', applyTo: '습윤 구간', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '벽 타일', mark: 'WALL', s: 'wall',
    items: [
      { id: 'M-WGR612', name: '그레이 포세린 600×1200', spec: '600×1200 · 포세린', usage: '욕실 벽', applyFrom: '1층 욕실', applyTo: '2층 욕실', brand: '', qty: '', status: 'mijung' },
      { id: 'M-WCR36', name: '크림 자기질 300×600', spec: '300×600 · 자기질', usage: '상가 화장실 벽', applyFrom: '상가 화장실', applyTo: '벽면', brand: '', qty: '', status: 'mijung' },
      { id: 'M-WMOS', name: '모자이크 타일', spec: '45×195mm · 판형', usage: '다용도실 벽 포인트', applyFrom: '다용도실', applyTo: '포인트 벽', brand: '', qty: '', status: 'mijung' },
      { id: 'M-WKIT', name: '주방 벽타일', spec: '규격 도면 참조', usage: '주방 벽·상부장 하부', applyFrom: '주방', applyTo: '조리대 상부', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '붙임재 · 접착제', mark: 'BOND', s: 'common',
    items: [
      { id: 'M-TCEM', name: '타일 시멘트', spec: '[KS L 1592] 도자기질 타일 시멘트', usage: '압착·개량압착 붙임', applyFrom: '바탕', applyTo: '타일 배면', brand: '', qty: '', status: 'mijung' },
      { id: 'M-TADH', name: '타일용 접착제', spec: '[KS L 1593]', usage: '접착붙이기 공법', applyFrom: '바탕', applyTo: '타일 배면', brand: '', qty: '', status: 'mijung' },
      { id: 'M-CEM', name: '포틀랜드 시멘트', spec: '[KS L 5201] 1종', usage: '떠붙이기 모르타르', applyFrom: '바탕', applyTo: '붙임 모르타르', brand: '', qty: '', status: 'mijung' },
      { id: 'M-SAND', name: '모래 (세척사)', spec: '입도 조정 · 염분 제거', usage: '붙임 모르타르 배합', applyFrom: '-', applyTo: '모르타르', brand: '', qty: '', status: 'mijung' },
      { id: 'M-LADH', name: '대형타일 전용 접착제', spec: 'C2TE 등급 이상 권장', usage: '600×1200 이상 대형', applyFrom: '바탕', applyTo: '대형 타일', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '방수 자재', mark: 'WATER', s: 'prep',
    items: [
      { id: 'M-WPRF', name: '도막 방수재', spec: '[KCS 41 40] 준수 · 2회 이상 도포', usage: '욕실·발코니 방수층', applyFrom: '바닥·벽', applyTo: '방수 구간', brand: '', qty: '', status: 'mijung' },
      { id: 'M-WTAPE', name: '방수 보강 테이프', spec: '코너·조인트용', usage: '모서리·관통부 보강', applyFrom: '코너', applyTo: '드레인 주변', brand: '', qty: '', status: 'mijung' },
      { id: 'M-DRAIN', name: '드레인 (배수구)', spec: '트랩 일체형 · 규격 도면 참조', usage: '욕실·발코니 배수', applyFrom: '바닥', applyTo: '배수 입상', brand: '', qty: '', status: 'mijung' },
      { id: 'M-PRIM', name: '방수 프라이머', spec: '바탕 흡수 조절·부착 증진', usage: '방수 하도', applyFrom: '바탕', applyTo: '방수 구간', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '줄눈 · 실링재', mark: 'GROUT', s: 'grout',
    items: [
      { id: 'M-GRT', name: '줄눈재 (시멘트계)', spec: '색상 승인분 · 줄눈 3~6mm', usage: '바닥·벽 일반 줄눈', applyFrom: '타일 사이', applyTo: '전 구간', brand: '', qty: '', status: 'mijung' },
      { id: 'M-GRTE', name: '에폭시 줄눈재', spec: '내오염·내약품', usage: '주방·오염 우려 구간', applyFrom: '타일 사이', applyTo: '지정 구간', brand: '', qty: '', status: 'mijung' },
      { id: 'M-SILA', name: '방곰팡이 실리콘 (무초산)', spec: '욕실 전용', usage: '코너·기구 주변', applyFrom: '이종재 접합부', applyTo: '욕실 전체', brand: '', qty: '', status: 'mijung' },
      { id: 'M-EXPJ', name: '신축줄눈재', spec: '탄성 실링재', usage: '신축줄눈 (3m 간격)', applyFrom: '구조체 줄눈', applyTo: '타일면', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '마감 부속', mark: 'TRIM', s: 'common',
    items: [
      { id: 'M-CTRIM', name: '코너 마감재 (코너비드)', spec: '알루미늄 또는 PVC', usage: '외부 모서리 마감', applyFrom: '모서리', applyTo: '벽 코너', brand: '', qty: '', status: 'mijung' },
      { id: 'M-SPAC', name: '스페이서 (줄눈 간격재)', spec: '2·3·5·6mm', usage: '줄눈 폭 균일 유지', applyFrom: '타일 사이', applyTo: '전 구간', brand: '', qty: '', status: 'mijung' },
      { id: 'M-LEVEL', name: '타일 레벨링 시스템', spec: '클립·쐐기형', usage: '대형 타일 단차 방지', applyFrom: '타일 사이', applyTo: '600 이상', brand: '', qty: '', status: 'mijung' },
      { id: 'M-THRES', name: '문지방·경계 마감재', spec: '이종 마감 경계용', usage: '타일-마루 경계', applyFrom: '문틀 하부', applyTo: '경계부', brand: '', qty: '', status: 'mijung' }
    ]
  },
  {
    cat: '공구 · 소모품', mark: 'TOOL', s: 'common',
    items: [
      { id: 'M-CUT', name: '타일 절단기 (습식)', spec: '대형 타일 대응', usage: '타일 재단', applyFrom: '-', applyTo: '전 공정', brand: '', qty: '', status: 'mijung' },
      { id: 'M-TROW', name: '흙손·톱니흙손', spec: '공법별 톱니 규격', usage: '붙임 모르타르 도포', applyFrom: '-', applyTo: '전 공정', brand: '', qty: '', status: 'mijung' },
      { id: 'M-MALL', name: '고무망치', spec: '두들김 검사·밀착', usage: '뒷채움 확보·타음 검사', applyFrom: '-', applyTo: '전 공정', brand: '', qty: '', status: 'mijung' },
      { id: 'M-PROT', name: '보양재', spec: '부직포·합판', usage: '시공 후 보행 보호', applyFrom: '타일면', applyTo: '통행 구간', brand: '', qty: '', status: 'mijung' }
    ]
  }
];"""

TRADE['CHANGE_ORDER'] = """const CHANGE_ORDER_REFERENCE = [
  { item: '바닥 타일 600각 시공 (붙임·줄눈 포함)', mat: 24000, lab: 33000, unit: '㎡' },
  { item: '벽 타일 600×1200 시공 (개량압착)', mat: 38000, lab: 46000, unit: '㎡' },
  { item: '벽 타일 300×600 시공 (압착)', mat: 16000, lab: 30000, unit: '㎡' },
  { item: '바닥 타일 300각 시공', mat: 13000, lab: 28000, unit: '㎡' },
  { item: '대형 타일 900×1800 시공 (2인 작업)', mat: 72000, lab: 95000, unit: '㎡' },
  { item: '모자이크 타일 시공 (판형)', mat: 42000, lab: 55000, unit: '㎡' },
  { item: '패턴 시공 할증 (헤링본·쉐브론)', mat: 0, lab: 28000, unit: '㎡' },
  { item: '덧방 시공 (기존 타일 위 · 프라이머 포함)', mat: 6500, lab: 14000, unit: '㎡' },
  { item: '기존 타일 철거 및 폐기물 처리', mat: 0, lab: 26000, unit: '㎡' },
  { item: '방수 도막 2회 시공 (프라이머 포함)', mat: 12000, lab: 22000, unit: '㎡' },
  { item: '방수 보강 (코너·관통부 테이프)', mat: 4500, lab: 9000, unit: 'm' },
  { item: '담수 시험 (24시간 · 실당)', mat: 0, lab: 85000, unit: '실' },
  { item: '바탕 미장 보수 (평활도 조정)', mat: 8000, lab: 18000, unit: '㎡' },
  { item: '구배 조정 미장 (욕실 바닥)', mat: 9500, lab: 24000, unit: '㎡' },
  { item: '드레인 교체·이설', mat: 45000, lab: 85000, unit: '개소' },
  { item: '코너 마감재 시공 (알루미늄)', mat: 8500, lab: 12000, unit: 'm' },
  { item: '에폭시 줄눈 상향 (내오염)', mat: 9000, lab: 11000, unit: '㎡' },
  { item: '신축줄눈 시공 (탄성 실링)', mat: 5500, lab: 12000, unit: 'm' },
  { item: '실리콘 마감 (방곰팡이 무초산)', mat: 3500, lab: 8500, unit: 'm' },
  { item: '타일 보수·재시공 (일당 기준)', mat: 0, lab: 350000, unit: '인·일' }
];"""

TRADE['COST_GRADES'] = """const COST_GRADES = {
  conservative: { name: '보수적', perPyeong: 120000 },
  standard: { name: '표준', perPyeong: 200000 },
  premium: { name: '고급', perPyeong: 320000 }
};"""

TRADE['COST_OPTIONS'] = """const COST_OPTIONS = [
  { id: 'opt1', name: '욕실 벽 600×1200 대형 타일 전환 (4개소)', amount: 5200000 },
  { id: 'opt2', name: '전 구간 에폭시 줄눈 상향 (내오염)', amount: 2400000 },
  { id: 'opt3', name: '거실·주방 바닥 타일 900×1800 적용', amount: 6800000 },
  { id: 'opt4', name: '방수 사양 상향 (도막 3회 + 코너 전면 보강)', amount: 2900000 },
  { id: 'opt5', name: '패턴 시공 적용 (헤링본 포인트 3개소)', amount: 1900000 }
];"""

TRADE['COST_OPT_INIT'] = "opt1: false, opt2: false, opt3: false, opt4: false, opt5: false"
