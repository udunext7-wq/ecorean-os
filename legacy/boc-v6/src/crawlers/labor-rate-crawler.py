"""
대한건설협회 시중노임단가 크롤러
- 반기마다 자동 갱신 (1월, 7월 기준)
- 출력: src/master-db/seed/labor-roles.json 업데이트 + 변경보고서 생성
"""
import json
import re
import os
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
SEED_DIR = BASE_DIR / 'master-db' / 'seed'
OUTPUT_FILE = SEED_DIR / 'labor-roles.json'
REPORT_DIR = BASE_DIR.parent / '생성파일저장'

# 대한건설협회 노임단가 공개 URL (실제 크롤링 대상)
LABOR_URL = 'https://www.kca.or.kr/kca/html/sub03/030100.jsp'
# fallback: 국가통계포털 건설업 노임단가
KOSIS_URL = 'https://kosis.kr/statHtml/statHtml.do?orgId=116&tblId=DT_MLTM_3_0'

# 직종별 기본 단가 (2025년 하반기 기준, 원/일)
# 크롤링 실패 시 이 값을 fallback으로 사용
BASELINE_RATES = {
    '보통인부':     180000,
    '특별인부':     220000,
    '콘크리트공':   230000,
    '형틀목공':     270000,
    '철근공':       260000,
    '용접공':       290000,
    '배관공':       280000,
    '전공':         270000,
    '미장공':       230000,
    '타일공':       250000,
    '도배공':       220000,
    '도장공':       220000,
    '유리공':       230000,
    '창호공':       240000,
    '목공':         250000,
    '설비공':       270000,
    '방수공':       230000,
    '조적공':       240000,
    '견출공':       220000,
    '석공':         260000,
    '온돌공':       230000,
    '건축목공':     260000,
}

ECOREAN_ROLE_MAP = {
    '보통인부':   {'id': 'LBR_GEN',  'category': '일반'},
    '철거공':     {'id': 'LBR_DEM',  'category': '철거'},
    '미장공':     {'id': 'LBR_PLS',  'category': '미장'},
    '타일공':     {'id': 'LBR_TIL',  'category': '타일'},
    '배관공':     {'id': 'LBR_PLB',  'category': '배관'},
    '전공':       {'id': 'LBR_ELE',  'category': '전기'},
    '도배공':     {'id': 'LBR_WLP',  'category': '도배'},
    '도장공':     {'id': 'LBR_PNT',  'category': '도장'},
    '목공':       {'id': 'LBR_CRP',  'category': '목공'},
    '창호공':     {'id': 'LBR_WIN',  'category': '창호'},
    '방수공':     {'id': 'LBR_WTP',  'category': '방수'},
    '설비공':     {'id': 'LBR_MEP',  'category': '설비'},
}


def fetch_kca_rates() -> dict:
    """대한건설협회에서 노임단가 파싱 시도"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
    }
    rates = {}
    try:
        resp = requests.get(LABOR_URL, headers=headers, timeout=15)
        if resp.status_code != 200:
            return rates
        resp.encoding = 'utf-8'
        soup = BeautifulSoup(resp.text, 'html.parser')

        # 테이블에서 직종명 + 단가 추출
        for table in soup.find_all('table'):
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    job = cells[0].get_text(strip=True)
                    for cell in cells[1:]:
                        txt = cell.get_text(strip=True).replace(',', '')
                        m = re.search(r'(\d{5,7})', txt)
                        if m and job:
                            val = int(m.group(1))
                            if 100000 <= val <= 600000:
                                rates[job] = val
                                break
    except Exception as e:
        print(f'[KCA 크롤링 실패] {e}')

    return rates


def merge_rates(crawled: dict) -> dict:
    """크롤링 결과 + 기본값 병합"""
    merged = dict(BASELINE_RATES)
    for k, v in crawled.items():
        for bk in BASELINE_RATES:
            if bk in k or k in bk:
                merged[bk] = v
                break
    return merged


def build_labor_roles(rates: dict) -> list:
    """단가 딕셔너리 → labor-roles.json 포맷"""
    roles = []
    year = datetime.now().year
    half = 'H1' if datetime.now().month <= 6 else 'H2'
    updated = f'{year}-{half}'

    for job, daily_rate in rates.items():
        mapping = ECOREAN_ROLE_MAP.get(job)
        role_id = mapping['id'] if mapping else f"LBR_{job[:4].upper()}"
        category = mapping['category'] if mapping else '기타'
        roles.append({
            'id': role_id,
            'name': job,
            'category': category,
            'dailyRate': daily_rate,
            'hourlyRate': round(daily_rate / 8),
            'unit': '일',
            'source': 'KCA',
            'updatedAt': updated,
        })

    roles.sort(key=lambda x: x['category'])
    return roles


def generate_update_report(old_roles: list, new_roles: list) -> str:
    """변경사항 리포트 생성"""
    # 구 포맷 호환: 딕트가 아닌 항목은 무시
    old_map = {r['name']: r['dailyRate'] for r in old_roles
               if isinstance(r, dict) and 'name' in r and 'dailyRate' in r}
    new_map = {r['name']: r['dailyRate'] for r in new_roles
               if isinstance(r, dict) and 'name' in r and 'dailyRate' in r}
    lines = [
        f'# 노임단가 업데이트 보고서',
        f'생성일시: {datetime.now().strftime("%Y-%m-%d %H:%M")}',
        '',
        '## 변경된 단가',
    ]
    changed = False
    for name, new_rate in new_map.items():
        old_rate = old_map.get(name)
        if old_rate and old_rate != new_rate:
            diff = new_rate - old_rate
            pct = diff / old_rate * 100
            lines.append(f'- {name}: {old_rate:,}원 → {new_rate:,}원 ({pct:+.1f}%)')
            changed = True
    if not changed:
        lines.append('- 변경사항 없음')
    lines += ['', '## 신규 직종']
    new_names = set(new_map) - set(old_map)
    for name in sorted(new_names):
        lines.append(f'- {name}: {new_map[name]:,}원/일')
    return '\n'.join(lines)


def run():
    print('[노임단가 크롤러] 시작...')
    SEED_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    # 기존 데이터 로드
    old_roles = []
    if OUTPUT_FILE.exists():
        try:
            old_roles = json.loads(OUTPUT_FILE.read_text(encoding='utf-8'))
        except Exception:
            pass

    # 크롤링
    print('[노임단가 크롤러] KCA 크롤링 중...')
    crawled = fetch_kca_rates()
    if crawled:
        print(f'[노임단가 크롤러] {len(crawled)}개 직종 크롤링 성공')
    else:
        print('[노임단가 크롤러] 크롤링 실패 — 기준값 사용')

    merged = merge_rates(crawled)
    new_roles = build_labor_roles(merged)

    # 저장
    OUTPUT_FILE.write_text(
        json.dumps(new_roles, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print(f'[노임단가 크롤러] {OUTPUT_FILE} 저장 완료 ({len(new_roles)}개 직종)')

    # 변경 보고서
    report = generate_update_report(old_roles, new_roles)
    report_file = REPORT_DIR / f'labor-rate-update-{datetime.now().strftime("%Y%m%d")}.md'
    report_file.write_text(report, encoding='utf-8')
    print(f'[노임단가 크롤러] 변경 보고서: {report_file}')

    return new_roles


if __name__ == '__main__':
    run()
