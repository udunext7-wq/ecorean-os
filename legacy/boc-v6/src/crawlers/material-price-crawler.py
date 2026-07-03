"""
건자재 물가정보 크롤러
- 물가정보 포털, 한국물가협회 등 참조
- 출력: src/master-db/brands/brand-price-db.json 업데이트 후보
"""
import json
import re
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
BRAND_DB_FILE = BASE_DIR / 'master-db' / 'brands' / 'brand-price-db.json'
REPORT_DIR = BASE_DIR.parent / '생성파일저장'

# 참조 URL (실제 크롤링 가능한 공개 데이터 소스)
SOURCES = {
    'kamsi': 'https://www.kamsi.or.kr/price/priceList.do',  # 건자재유통협회
    'e2price': 'https://www.e2price.co.kr/',                 # 물가정보
}

# 주요 자재 기준 단가 (2025년 기준, 원/㎡ 또는 원/개)
BASELINE_MATERIALS = {
    '타일': [
        {'grade': 'domestic', 'name': '국산 타일 (300×300)', 'unit': '㎡', 'price': 18000},
        {'grade': 'import',   'name': '수입 타일 (300×600)', 'unit': '㎡', 'price': 35000},
        {'grade': 'luxury',   'name': '이탈리아 타일',       'unit': '㎡', 'price': 65000},
    ],
    '강마루': [
        {'grade': 'standard', 'name': '합판 마루',       'unit': '㎡', 'price': 22000},
        {'grade': 'premium',  'name': '강마루 (12mm)',   'unit': '㎡', 'price': 38000},
        {'grade': 'luxury',   'name': '원목 마루',       'unit': '㎡', 'price': 85000},
    ],
    'LVT': [
        {'grade': 'standard', 'name': 'PVC 장판',    'unit': '㎡', 'price': 12000},
        {'grade': 'premium',  'name': 'LVT 바닥재', 'unit': '㎡', 'price': 28000},
    ],
    '벽지': [
        {'grade': 'paper',  'name': '합지 벽지',   'unit': '롤', 'price': 8000},
        {'grade': 'silk',   'name': '실크 벽지',   'unit': '롤', 'price': 18000},
        {'grade': 'wide',   'name': '광폭 실크',   'unit': '롤', 'price': 35000},
    ],
    '수성페인트': [
        {'grade': 'standard', 'name': '일반 수성페인트 (18L)', 'unit': '통', 'price': 45000},
        {'grade': 'premium',  'name': '친환경 수성페인트',      'unit': '통', 'price': 85000},
    ],
    '욕실위생도기': [
        {'grade': 'standard', 'name': '국산 위생도기 세트',  'unit': '세트', 'price': 250000},
        {'grade': 'premium',  'name': '중상급 위생도기 세트', 'unit': '세트', 'price': 550000},
        {'grade': 'luxury',   'name': '수입 위생도기 세트',  'unit': '세트', 'price': 1500000},
    ],
    '수전': [
        {'grade': 'standard', 'name': '국산 수전 세트',  'unit': '세트', 'price': 80000},
        {'grade': 'premium',  'name': '중상급 수전 세트', 'unit': '세트', 'price': 200000},
        {'grade': 'luxury',   'name': '수입 수전 세트',  'unit': '세트', 'price': 500000},
    ],
    '창호': [
        {'grade': 'double', 'name': '이중창 시스템창호 (㎡)', 'unit': '㎡', 'price': 180000},
        {'grade': 'triple', 'name': '삼중창 시스템창호 (㎡)', 'unit': '㎡', 'price': 280000},
        {'grade': 'loe',    'name': '로이 삼중창 (㎡)',        'unit': '㎡', 'price': 380000},
    ],
    '주방가구': [
        {'grade': 'standard', 'name': '주방가구 (일반, LF)',   'unit': '연장m', 'price': 350000},
        {'grade': 'premium',  'name': '주방가구 (고급, 필름)',  'unit': '연장m', 'price': 650000},
        {'grade': 'luxury',   'name': '주방가구 (럭셔리, 도장)', 'unit': '연장m', 'price': 1200000},
    ],
}


def fetch_material_prices() -> dict:
    """건자재 물가정보 포털에서 시장가 파싱 시도"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
    }
    prices = {}
    try:
        resp = requests.get(SOURCES['kamsi'], headers=headers, timeout=15)
        if resp.status_code == 200:
            resp.encoding = 'utf-8'
            soup = BeautifulSoup(resp.text, 'html.parser')
            for row in soup.select('table tr'):
                cells = row.find_all('td')
                if len(cells) >= 3:
                    name = cells[0].get_text(strip=True)
                    price_txt = cells[-1].get_text(strip=True).replace(',', '')
                    m = re.search(r'(\d{4,8})', price_txt)
                    if m and name:
                        prices[name] = int(m.group(1))
    except Exception as e:
        print(f'[자재물가 크롤링 실패] {e}')
    return prices


def build_price_db(crawled: dict) -> dict:
    """크롤링 결과 + 기준값으로 최종 DB 구성"""
    db = {}
    year = datetime.now().year
    month = datetime.now().month
    updated = f'{year}-{month:02d}'

    for category, items in BASELINE_MATERIALS.items():
        db[category] = []
        for item in items:
            # 크롤링 데이터에서 매칭 시도
            matched_price = None
            for crawled_name, crawled_price in crawled.items():
                if any(kw in crawled_name for kw in item['name'].split()[:2]):
                    matched_price = crawled_price
                    break

            db[category].append({
                **item,
                'price': matched_price or item['price'],
                'priceSource': 'crawled' if matched_price else 'baseline',
                'updatedAt': updated,
            })

    return db


def generate_price_report(old_db: dict, new_db: dict) -> str:
    lines = [
        f'# 건자재 물가 업데이트 보고서',
        f'생성일시: {datetime.now().strftime("%Y-%m-%d %H:%M")}',
        '',
    ]
    for category, items in new_db.items():
        old_items = {i['grade']: i for i in old_db.get(category, [])}
        section_lines = []
        for item in items:
            old_item = old_items.get(item['grade'])
            if old_item and old_item['price'] != item['price']:
                diff = item['price'] - old_item['price']
                pct = diff / old_item['price'] * 100
                section_lines.append(
                    f"  - {item['name']}: {old_item['price']:,}원 → {item['price']:,}원 ({pct:+.1f}%)"
                )
        if section_lines:
            lines.append(f'## {category}')
            lines.extend(section_lines)

    if len(lines) <= 3:
        lines.append('## 변경사항 없음')
    return '\n'.join(lines)


def run():
    print('[자재물가 크롤러] 시작...')
    BRAND_DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    old_db = {}
    if BRAND_DB_FILE.exists():
        try:
            old_db = json.loads(BRAND_DB_FILE.read_text(encoding='utf-8'))
        except Exception:
            pass

    print('[자재물가 크롤러] 물가정보 수집 중...')
    crawled = fetch_material_prices()
    print(f'[자재물가 크롤러] 크롤링 {len(crawled)}개 항목')

    new_db = build_price_db(crawled)

    # 업데이트 후보 저장
    candidate_file = BRAND_DB_FILE.parent / f'brand-price-candidate-{datetime.now().strftime("%Y%m%d")}.json'
    candidate_file.write_text(json.dumps(new_db, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[자재물가 크롤러] 후보 파일: {candidate_file}')

    # 변경 보고서
    report = generate_price_report(old_db, new_db)
    report_file = REPORT_DIR / f'material-price-update-{datetime.now().strftime("%Y%m%d")}.md'
    report_file.write_text(report, encoding='utf-8')
    print(f'[자재물가 크롤러] 보고서: {report_file}')

    print('[자재물가 크롤러] 완료')
    return new_db


if __name__ == '__main__':
    run()
