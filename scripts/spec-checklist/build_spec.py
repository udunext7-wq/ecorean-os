# -*- coding: utf-8 -*-
"""
기계설비 체크리스트(v3)를 골격으로 삼아 공종별 시방서 체크리스트를 생성한다.
아키텍처(CSS·모듈·렌더 함수·이벤트)는 건드리지 않고 데이터 계층과 UI 문구만 교체한다.
  - 블록 교체: 앵커(const NAME) ~ 종료줄(^]; 또는 ^};)까지를 통째로 갈아끼운다
  - 문자열 교체: 공종 고유 UI 문구를 1:1 로 바꾼다 (전부 등장 횟수를 확인한다)
"""
import io, os, re, sys

BASE = r'C:\Users\udune\ecorean-os\sites\net\public\spec\mechanical\index.html'
OUTROOT = r'C:\Users\udune\ecorean-os\sites\net\public\spec'


def replace_block(lines, anchor, new_text, terminator):
    """anchor 로 시작하는 줄부터 terminator 줄까지를 new_text 로 교체."""
    start = None
    for i, l in enumerate(lines):
        if l.startswith(anchor):
            start = i
            break
    if start is None:
        raise SystemExit('anchor not found: ' + anchor)
    end = None
    for j in range(start, len(lines)):
        if lines[j].rstrip() == terminator:
            end = j
            break
    if end is None:
        raise SystemExit('terminator not found for: ' + anchor)
    return lines[:start] + new_text.rstrip('\n').split('\n') + lines[end + 1:]


def build(trade):
    src = io.open(BASE, encoding='utf-8').read()
    lines = src.split('\n')

    # ── 1. 데이터 블록 교체 ──────────────────────────────
    for anchor, key, term in [
        ('const SUBSYSTEMS',             'SUBSYSTEMS',   '};'),
        ('const CHECKLIST',              'CHECKLIST',    '];'),
        ('const MATERIALS',              'MATERIALS',    '];'),
        ('const DEFAULT_CIRCUIT_COLORS', 'COLORS',       '];'),
        ('const PHASE_DEFAULT_DAYS',     'PHASE_DAYS',   '};'),
        ('const SLEEVE_STATUS',          'POS_STATUS',   '};'),
        ('const CHANGE_ORDER_REFERENCE', 'CHANGE_ORDER', '];'),
        ('const COST_GRADES',            'COST_GRADES',  '};'),
        ('const COST_OPTIONS',           'COST_OPTIONS', '];'),
    ]:
        lines = replace_block(lines, anchor, trade[key], term)

    out = '\n'.join(lines)

    # ── 2. 한 줄짜리 상수 교체 ───────────────────────────
    singles = [
        ("const DEFAULT_SUBTITLE = '140평 / 2층 / 냉난방 · 환기 · 바닥난방 · 급수 · 배수 · 가스 · 보일러';",
         "const DEFAULT_SUBTITLE = '%s';" % trade['SUBTITLE']),
        ("const SLEEVE_FLOORS = ['1F', '2F', '옥상', '실외기실'];",
         "const SLEEVE_FLOORS = [%s];" % trade['FLOORS']),
        ("const SLEEVE_SIZES = ['Φ32', 'Φ50', 'Φ75', 'Φ100', 'Φ150', 'Φ200', '기타'];",
         "const SLEEVE_SIZES = [%s];" % trade['SIZES']),
        ("const SLEEVE_ROOMS = ['거실', '주방', '안방', '침실', '욕실', '드레스룸', '보일러실', '실외기실', '다용도실', '계단실', '서재', '기타'];",
         "const SLEEVE_ROOMS = [%s];" % trade['ROOMS']),
        ("let costOptions = { erv_premium: false, sac_extra: false, smart_int: false, cu_premium: false, humid: false };",
         "let costOptions = { %s };" % trade['COST_OPT_INIT']),
    ]

    # ── 3. UI 문구 교체 (공종 고유) ──────────────────────
    ui = [
        # 저장소 — 공종별로 갈라야 같은 도메인에서 안 섞인다
        ("'mech-checklist-state'", "'%s-checklist-state'" % trade['KEY']),
        ("'photo:mech:'", "'photo:%s:'" % trade['KEY']),
        # 헤더 · 푸터 · 문서 제목
        ('BOC · MECHANICAL · v1.0', 'BOC · %s · v1.0' % trade['MARK']),
        ('<title>BOC 설비공사 체크리스트 · 140평 2층</title>',
         '<title>BOC %s 체크리스트 · 140평 2층</title>' % trade['NAME']),
        ('기계설비공사 통합 체크리스트', '%s 통합 체크리스트' % trade['NAME']),
        ('140평 / 2층 / 냉난방 · 환기 · 바닥난방 · 급수 · 배수 · 가스 · 보일러', trade['SUBTITLE']),
        ('BOC ECOREAN · MECHANICAL CHECKLIST · 2026',
         'BOC ECOREAN · %s CHECKLIST · 2026' % trade['MARK']),
        ('`BOC설비공사_백업_', '`BOC%s_백업_' % trade['NAME']),
        # 현장 정보 · 계약금액
        ('<div class="project-section-title">설비공사 협력업체</div>',
         '<div class="project-section-title">%s 협력업체</div>' % trade['NAME']),
        ('<label>설비공사업체</label>', '<label>%s업체</label>' % trade['NAME']),
        ('<label>설비공사 금액 (원)</label>', '<label>%s 금액 (원)</label>' % trade['NAME']),
        ('<span>현재 입력 — 설비공사 계약금액</span>',
         '<span>현재 입력 — %s 계약금액</span>' % trade['NAME']),
        # 위치도 모듈 (공종마다 개념이 다르다)
        # ★ 긴 문자열이 짧은 문자열을 품고 있다 — 반드시 긴 것부터 (순서 바꾸면 매칭 실패)
        ('아직 등록된 슬리브가 없습니다. 우측 상단 [ + 슬리브 추가 ] 버튼으로 추가하세요.',
         '아직 등록된 %s가 없습니다. 우측 상단 [ + %s 추가 ] 버튼으로 추가하세요.' % (trade['POS_UNIT'], trade['POS_UNIT'])),
        ('1층 슬래브 타설 전 모든 슬리브 위치를 등록하고 100% 매립 상태로 만들어야 합니다.', trade['POS_EMPTY_HINT']),
        ('[ + 슬리브 추가 ]', '[ + %s 추가 ]' % trade['POS_UNIT']),
        ('슬리브 위치 목록', '%s 목록' % trade['POS_TITLE']),
        ('SLEEVE LOCATIONS · 1층 슬래브 타설 전 100% 확정 필수', trade['POS_MARK']),
        ('<th style="width:10%">슬리브 규격</th>', '<th style="width:10%%">%s</th>' % trade['POS_SIZE_COL']),
        ('해당 층에 등록된 슬리브가 없습니다.', '해당 층에 등록된 %s가 없습니다.' % trade['POS_UNIT']),
        ("addLog('슬리브'", "addLog('%s'" % trade['POS_UNIT']),
        ('`슬리브 ${s.id}', '`%s ${s.id}' % trade['POS_UNIT']),
        # 계약서
        ('<div class="contract-doc-title">설비공사 도급계약서</div>',
         '<div class="contract-doc-title">%s 도급계약서</div>' % trade['NAME']),
        ('MECHANICAL WORK CONTRACT', trade['CONTRACT_EN']),
        ("'설비공사: ' + p.elecVendor", "'%s: ' + p.elecVendor" % trade['NAME']),
        ('<li>설비공사 금액:', '<li>%s 금액:' % trade['NAME']),
        ('<li>본 계약의 설비공사 범위는 별첨 시방서 및 자재 목록에 따른다.</li>',
         '<li>본 계약의 %s 범위는 별첨 시방서 및 자재 목록에 따른다.</li>' % trade['NAME']),
        ('<li>덕트·배관 색상 코드 시방대로 시공한다 (별첨).</li>',
         '<li>%s대로 시공한다 (별첨).</li>' % trade['SPEC_TITLE']),
        ('<li>슬리브 위치는 별첨 디퓨저·실외기 위치도에 따라 시공하며, 1층 슬래브 타설 전 100% 확정한다.</li>',
         '<li>%s</li>' % trade['CONTRACT_POS_CLAUSE']),
        ('<li>하자보수 기간: 준공일로부터 설비공사 2년 (열교환기·압축기 5년)</li>',
         '<li>하자보수 기간: %s</li>' % trade['WARRANTY']),
        ('<li>하자보수 범위: 본 계약의 설비공사 시공 부분 일체</li>',
         '<li>하자보수 범위: 본 계약의 %s 시공 부분 일체</li>' % trade['NAME']),
        ('<li>천재지변, 한전 송전 지연, 사용전검사 일정 등 시공자 귀책이 아닌 사유는 제외한다.</li>',
         '<li>%s</li>' % trade['DELAY_EXCEPT']),
        ('<li>수급인은 기계설비공사업 면허 보유자여야 하며, 면허사본을 별첨한다.</li>',
         '<li>%s</li>' % trade['LICENSE']),
        ('<li>가설전기는 산업안전보건법에 따라 안전 계획을 수립하고 시공한다.</li>',
         '<li>%s</li>' % trade['SAFETY']),
        ('3. 덕트·배관 색상 시방 (${state.circuitColors.length}색)<br>',
         '3. %s (${state.circuitColors.length}항목)<br>' % trade['SPEC_TITLE']),
        ('4. 디퓨저·실외기 위치도 (${state.sleeves.length}개소)<br>',
         '4. %s (${state.sleeves.length}개소)<br>' % trade['POS_TITLE']),
        ('6. 기계설비공사업 면허사본<br>', '6. %s<br>' % trade['LICENSE_DOC']),
        ('1. 시방서 (설비공사 통합 체크리스트)<br>',
         '1. 시방서 (%s 통합 체크리스트)<br>' % trade['NAME']),
        # 주석
        ('// 단계별 기본 소요일 (140평 2층 단독주택 설비공사 표준)',
         '// 단계별 기본 소요일 (140평 2층 단독주택 %s 표준)' % trade['NAME']),
        # 주석 (코드 식별자 SLEEVE_* 는 아키텍처라 그대로 두고 한글 주석만 바꾼다)
        ('/* ★ 슬리브·추가공사 테이블 — 가로 스크롤 + 헤더 nowrap */',
         '/* ★ %s·추가공사 테이블 — 가로 스크롤 + 헤더 nowrap */' % trade['POS_UNIT']),
        ('/* 슬리브 위치도: 카드형 모드 강제 */', '/* %s: 카드형 모드 강제 */' % trade['POS_TITLE']),
        ('// 슬리브 필터 + 추가공사 필터 핸들러 (이벤트 위임)',
         '// %s 필터 + 추가공사 필터 핸들러 (이벤트 위임)' % trade['POS_UNIT']),
        # 짧은 공통어 — 위의 긴 문장들을 먼저 처리한 뒤 남은 것만 (부분 문자열이라 순서가 중요)
        ('덕트·배관 색상 코드 시방', trade['SPEC_TITLE']),
        ('덕트·배관 색상 시방', trade['SPEC_TITLE']),
        ('디퓨저·실외기 위치도', trade['POS_TITLE']),
    ]

    for a, b in singles + ui:
        n = out.count(a)
        if n == 0:
            raise SystemExit('[%s] 치환 대상 없음: %r' % (trade['KEY'], a[:70]))
        out = out.replace(a, b)

    # 제11조 (법령 준수) 본문 통째 교체
    old11 = re.search(
        r'(<div class="contract-section-title">제11조 \(법령 준수\)</div>\s*<ol>)(.*?)(</ol>)',
        out, re.S)
    if not old11:
        raise SystemExit('제11조 블록을 찾지 못했다')
    out = out[:old11.start(2)] + '\n' + trade['LAWS'].rstrip('\n') + '\n        ' + out[old11.end(2):]

    # 남은 설비 흔적 확인 (계약서 법령 조항은 이미 교체됨)
    # '디퓨저'는 제외 — 목공이 천장에 디퓨저 개구를 뚫는 식의 정당한 타 공종 참조가 있다
    leftovers = [w for w in ['기계설비', '설비공사', '슬리브', 'MECHANICAL', 'mech-checklist', 'photo:mech']
                 if w in out]
    if leftovers:
        ctx = []
        for w in leftovers:
            for m in re.finditer(re.escape(w), out):
                ctx.append(out[max(0, m.start() - 70):m.start() + 50].replace('\n', '|'))
        io.open('leftover_ctx.txt', 'w', encoding='utf-8').write('\n---\n'.join(ctx))
        raise SystemExit('[%s] 설비 문구 잔존: %s (leftover_ctx.txt 참조)' % (trade['KEY'], leftovers))

    d = os.path.join(OUTROOT, trade['DIR'])
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, 'index.html'), 'w', encoding='utf-8', newline='\n').write(out)
    return trade['DIR'], len(out)


if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import data_carpentry, data_painting, data_tile
    for mod in (data_carpentry, data_painting, data_tile):
        d, n = build(mod.TRADE)
        print('%-12s %8d bytes' % (d, n))
