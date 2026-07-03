"""
온톨로지 규칙 후보 생성기
- 표준시방서/표준품셈 텍스트에서 공정 간 연관 관계 추출
- 출력: src/master-db/seed/ontology-candidates.json
- 대표 승인 후 ontology-rules.json에 반영
"""
import json
import re
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from pathlib import Path
from itertools import combinations

BASE_DIR = Path(__file__).parent.parent
SEED_DIR = BASE_DIR / 'master-db' / 'seed'
CANDIDATES_FILE = SEED_DIR / 'ontology-candidates.json'
REPORT_DIR = BASE_DIR.parent / '생성파일저장'

# 공정 키워드 매핑 (텍스트 → DB ID)
PROCESS_KEYWORDS = {
    '타일': 'TILE_BT',
    '줄눈': 'TILE_GRF',
    '도배': 'WLP_PP',
    '초배': 'WLP_UB',
    '걸레받이': 'FLR_SK',
    '바닥재': 'FLR_HW',
    '강마루': 'FLR_HW',
    'LVT': 'FLR_LV',
    '수성페인트': 'PNT_WP',
    '퍼티': 'PNT_PT',
    '프라이머': 'PNT_PRM',
    'LGS': 'LGS_FR',
    '경량칸막이': 'LGS_FR',
    '석고보드': 'LGS_GB',
    '방수': 'WTP_BT',
    '보호몰탈': 'WTP_PM',
    '철거': 'DEM_FL',
    '폐기물': 'DEM_WS',
    '보양': 'DEM_PT',
    '창호': 'WIN_SYS',
    '우레탄폼': 'WIN_PU',
    '석면': 'ASB_RM',
    '배관': 'PLB_RG',
    '갈바나이즈': 'PLB_RG',
    '분전반': 'ELE_RG',
    '실리콘': 'FIN_SLK',
    '코킹': 'FIN_SLK',
}

# 연관 관계 텍스트 패턴
RELATION_PATTERNS = [
    # "A 시공 후 B 시공"
    r'(\S{2,8})\s*(?:공사|시공|작업)\s*후\s*(\S{2,8})\s*(?:공사|시공|작업)',
    # "A 다음 B"
    r'(\S{2,8})\s*다음\s*(?:에는?|)\s*(\S{2,8})',
    # "A에는 반드시 B"
    r'(\S{2,8})\s*에는?\s*반드시\s*(\S{2,8})',
    # "A를 할 경우 B 포함"
    r'(\S{2,8})\s*(?:을|를)\s*(?:시공|설치|할)\s*경우\s*.*?(\S{2,8})\s*(?:포함|포함하여|함께)',
    # "A 공사 시 B 필요"
    r'(\S{2,8})\s*공사\s*시\s*(\S{2,8})\s*(?:필요|설치)',
]

# 표준시방서 관련 공개 텍스트 URL
STANDARD_SOURCES = [
    'https://www.kcsc.re.kr/StandardCode/Page',  # 건설기준원
]


def fetch_standard_text() -> str:
    """표준시방서 공개 텍스트 수집 시도"""
    headers = {'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ko-KR,ko;q=0.9'}
    texts = []
    for url in STANDARD_SOURCES:
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                resp.encoding = 'utf-8'
                soup = BeautifulSoup(resp.text, 'html.parser')
                for p in soup.find_all(['p', 'li', 'td']):
                    txt = p.get_text(strip=True)
                    if len(txt) > 20:
                        texts.append(txt)
        except Exception:
            pass
    return '\n'.join(texts)


def extract_relations_from_text(text: str) -> list:
    """텍스트에서 공정 간 연관 관계 추출"""
    relations = []
    for pattern in RELATION_PATTERNS:
        for m in re.finditer(pattern, text):
            from_kw = m.group(1)
            to_kw = m.group(2)
            from_id = _match_process(from_kw)
            to_id = _match_process(to_kw)
            if from_id and to_id and from_id != to_id:
                relations.append({
                    'trigger': from_id,
                    'triggered': to_id,
                    'triggerKeyword': from_kw,
                    'triggeredKeyword': to_kw,
                    'evidence': m.group(0)[:80],
                })
    return relations


def _match_process(keyword: str) -> str | None:
    for kw, pid in PROCESS_KEYWORDS.items():
        if kw in keyword:
            return pid
    return None


def build_rule_candidates(relations: list) -> list:
    """관계 목록 → 규칙 후보 형식으로 변환"""
    # 중복 제거 및 빈도 집계
    freq = {}
    evidence_map = {}
    for r in relations:
        key = (r['trigger'], r['triggered'])
        freq[key] = freq.get(key, 0) + 1
        if key not in evidence_map:
            evidence_map[key] = r['evidence']

    candidates = []
    for (trigger, triggered), count in sorted(freq.items(), key=lambda x: -x[1]):
        candidates.append({
            'id': f'CAND-{trigger[:4]}-{triggered[:4]}-{datetime.now().strftime("%Y%m")}',
            'trigger': trigger,
            'triggered': triggered,
            'type': 'AUTO_INCLUDE',
            'condition': 'always',
            'note': f'자동 감지 후보 (증거: {count}건)',
            'evidence': evidence_map[(trigger, triggered)],
            'status': 'pending',
            'createdAt': datetime.now().isoformat(),
            'approvedBy': None,
        })

    return candidates


def build_rule_candidates_from_known() -> list:
    """알려진 연관 관계에서 규칙 후보 생성 (크롤링 보완용)"""
    known_relations = [
        # (trigger, triggered, condition, type)
        ('TILE_BT', 'TILE_GRF', 'always', 'AUTO_INCLUDE'),
        ('TILE_BW', 'TILE_GRF', 'always', 'AUTO_INCLUDE'),
        ('WLP_PP',  'WLP_UB',   'always', 'AUTO_INCLUDE'),
        ('FLR_HW',  'FLR_SK',   'always', 'AUTO_INCLUDE'),
        ('FLR_LV',  'FLR_SK',   'always', 'AUTO_INCLUDE'),
        ('PNT_WP',  'PNT_PT',   'always', 'AUTO_INCLUDE'),
        ('PNT_WP',  'PNT_PRM',  'always', 'AUTO_INCLUDE'),
        ('LGS_FR',  'LGS_GB',   'always', 'AUTO_INCLUDE'),
        ('WIN_SYS', 'WIN_PU',   'always', 'AUTO_INCLUDE'),
        ('DEM_FL',  'DEM_WS',   'always', 'AUTO_INCLUDE'),
        ('DEM_FL',  'DEM_PT',   'always', 'AUTO_INCLUDE'),
        ('WTP_BT',  'WTP_PM',   'buildAge>10', 'CONDITIONAL'),
        ('PLB_RG',  'PLB_SAN',  'hasBath', 'CONDITIONAL'),
        ('ELE_RG',  'ELE_OUT',  'always', 'AUTO_INCLUDE'),
        ('TILE_BT', 'WTP_BT',   'isWet', 'WARN_IF_MISSING'),
    ]

    candidates = []
    for trigger, triggered, condition, rtype in known_relations:
        candidates.append({
            'id': f'KNOWN-{trigger[:4]}-{triggered[:4]}',
            'trigger': trigger,
            'triggered': triggered,
            'type': rtype,
            'condition': condition,
            'note': '알려진 연관 관계 (검토 후 승인)',
            'evidence': 'domain knowledge',
            'status': 'pending',
            'createdAt': datetime.now().isoformat(),
            'approvedBy': None,
        })

    return candidates


def run():
    print('[온톨로지 크롤러] 시작...')
    SEED_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    # 기존 후보 로드
    existing = []
    if CANDIDATES_FILE.exists():
        try:
            existing = json.loads(CANDIDATES_FILE.read_text(encoding='utf-8'))
        except Exception:
            pass
    existing_ids = {c['id'] for c in existing}

    # 크롤링
    print('[온톨로지 크롤러] 표준시방서 텍스트 수집...')
    text = fetch_standard_text()
    crawled_relations = extract_relations_from_text(text) if text else []
    print(f'[온톨로지 크롤러] 텍스트 관계 {len(crawled_relations)}개 추출')

    # 후보 생성
    crawled_candidates = build_rule_candidates(crawled_relations)
    known_candidates = build_rule_candidates_from_known()
    all_candidates = known_candidates + crawled_candidates

    # 중복 제거
    new_candidates = [c for c in all_candidates if c['id'] not in existing_ids]
    final_candidates = existing + new_candidates

    CANDIDATES_FILE.write_text(
        json.dumps(final_candidates, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print(f'[온톨로지 크롤러] {CANDIDATES_FILE} 저장 ({len(final_candidates)}개 후보)')

    # 보고서
    report_lines = [
        f'# 온톨로지 규칙 후보 보고서',
        f'생성: {datetime.now().strftime("%Y-%m-%d %H:%M")}',
        f'신규 후보: {len(new_candidates)}개 | 전체: {len(final_candidates)}개',
        '',
        '## 신규 후보 (승인 대기)',
    ]
    for c in new_candidates:
        report_lines.append(f"- [{c['id']}] {c['trigger']} → {c['triggered']} ({c['type']}, {c['condition']})")

    report_file = REPORT_DIR / f'ontology-candidates-{datetime.now().strftime("%Y%m%d")}.md'
    report_file.write_text('\n'.join(report_lines), encoding='utf-8')
    print(f'[온톨로지 크롤러] 보고서: {report_file}')

    return final_candidates


if __name__ == '__main__':
    run()
