"""
ML 학습 데이터 빌더
- completion_reports → XGBoost 학습 포맷 변환
- 자동 축적: 새 완료 보고서 추가 시 학습 데이터 갱신
"""
import json
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
REPORTS_DIR = BASE_DIR.parent / '생성파일저장' / 'completion-reports'
OUTPUT_FILE = BASE_DIR.parent / '생성파일저장' / 'ml-training-data.json'


def build_training_record(report: dict) -> dict | None:
    """완료 보고서 1건 → 학습 레코드 변환"""
    required = ['projectId', 'buildType', 'totalArea', 'completionItems']
    for f in required:
        if f not in report:
            return None

    items = []
    for item in report.get('completionItems', []):
        pid = item.get('processId') or item.get('id')
        est = item.get('estimatedCost', 0)
        act = item.get('actualCost', 0)
        if pid and est > 0 and act > 0:
            items.append({
                'processId': pid,
                'estimatedCost': est,
                'actualCost': act,
                'qty': item.get('qty', 1),
                'ratio': round(act / est, 4),
            })

    if not items:
        return None

    return {
        'projectId': report['projectId'],
        'buildType': report.get('buildType', 'apartment'),
        'totalArea': float(report.get('totalArea', 50)),
        'buildAge': int(report.get('buildAge', 10)),
        'region': float(report.get('region', 1.05)),
        'grade': report.get('grade', 'premium'),
        'spaceCount': int(report.get('spaceCount', 3)),
        'bathroomCount': int(report.get('bathroomCount', 1)),
        'actualItems': items,
        'recordedAt': report.get('completedAt', datetime.now().isoformat()),
    }


def add_record(report: dict) -> bool:
    """단일 완료 보고서를 학습 데이터에 추가"""
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    existing = []
    if OUTPUT_FILE.exists():
        try:
            existing = json.loads(OUTPUT_FILE.read_text(encoding='utf-8'))
        except Exception:
            pass

    existing_ids = {r['projectId'] for r in existing}
    record = build_training_record(report)

    if record is None:
        return False
    if record['projectId'] in existing_ids:
        print(f'[학습데이터] {record["projectId"]} 이미 존재 — 건너뜀')
        return False

    existing.append(record)
    OUTPUT_FILE.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print(f'[학습데이터] {record["projectId"]} 추가됨 — 총 {len(existing)}건')
    return True


def build_all() -> list:
    """모든 완료 보고서 → 학습 데이터 재구축"""
    print('[학습데이터] 전체 재구축 시작...')
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    records = []
    for f in sorted(REPORTS_DIR.glob('*.json')):
        try:
            data = json.loads(f.read_text(encoding='utf-8'))
            if isinstance(data, list):
                for report in data:
                    r = build_training_record(report)
                    if r:
                        records.append(r)
            elif isinstance(data, dict):
                r = build_training_record(data)
                if r:
                    records.append(r)
        except Exception as e:
            print(f'  [경고] {f.name}: {e}')

    # 데모 데이터 (실적 없을 때)
    if not records:
        records = _build_demo_records()
        print(f'[학습데이터] 실적 없음 — 데모 {len(records)}건 생성')

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding='utf-8'
    )
    print(f'[학습데이터] {OUTPUT_FILE} 저장 ({len(records)}건)')
    return records


def get_stats() -> dict:
    """학습 데이터 통계"""
    if not OUTPUT_FILE.exists():
        return {'count': 0, 'activated': False}
    try:
        data = json.loads(OUTPUT_FILE.read_text(encoding='utf-8'))
        count = len(data)
        process_ids = set()
        for r in data:
            for item in r.get('actualItems', []):
                process_ids.add(item['processId'])
        return {
            'count': count,
            'processCount': len(process_ids),
            'activated': count >= 100,
            'remaining': max(0, 100 - count),
        }
    except Exception:
        return {'count': 0, 'activated': False}


def _build_demo_records() -> list:
    """데모 학습 레코드 (초기 테스트용 5건)"""
    base = [
        ('DEMO-001', 'apartment', 85, 15, 1.05, 'premium', 4, 1),
        ('DEMO-002', 'officetel', 45, 8,  1.0,  'standard', 2, 1),
        ('DEMO-003', 'apartment', 110, 22, 1.05, 'luxury', 5, 2),
        ('DEMO-004', 'villa',     65, 30, 0.95, 'standard', 3, 1),
        ('DEMO-005', 'apartment', 95, 12, 1.1,  'premium', 4, 1),
    ]
    records = []
    for proj_id, btype, area, age, region, grade, spaces, baths in base:
        records.append({
            'projectId': proj_id,
            'buildType': btype,
            'totalArea': area,
            'buildAge': age,
            'region': region,
            'grade': grade,
            'spaceCount': spaces,
            'bathroomCount': baths,
            'actualItems': [
                {'processId': 'TILE_BT', 'estimatedCost': 450000, 'actualCost': 520000, 'qty': 9, 'ratio': 1.156},
                {'processId': 'PLB_RG',  'estimatedCost': 750000, 'actualCost': 900000, 'qty': 1, 'ratio': 1.200},
                {'processId': 'ELE_RG',  'estimatedCost': 600000, 'actualCost': 618000, 'qty': 1, 'ratio': 1.030},
            ],
            'recordedAt': datetime.now().isoformat(),
        })
    return records


if __name__ == '__main__':
    records = build_all()
    stats = get_stats()
    print(f'\n학습 데이터: {stats["count"]}건 | 공정: {stats.get("processCount",0)}개')
    ml_status = "가능" if stats["activated"] else f'불가 ({stats.get("remaining",0)}건 더 필요)'
    print(f'ML 활성화: {ml_status}')
