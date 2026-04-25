"""
ECOREAN 통계 분석 엔진
- completion_reports 데이터에서 예상 vs 실제 오차 분석
- 보정 제안 JSON 생성 → BOC 완료보고 탭 표시
"""
import json
import math
import statistics
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
REPORTS_DIR = BASE_DIR.parent / '생성파일저장' / 'completion-reports'
OUTPUT_FILE = BASE_DIR.parent / '생성파일저장' / 'statistics-result.json'
DB_UPDATE_REQUESTS = BASE_DIR.parent / '생성파일저장' / 'db-update-requests.json'

MIN_SAMPLES = 3  # 최소 3건 이상 실적 있는 항목만 처리


def load_completion_reports() -> list:
    """완료 보고서 JSON 파일들 로드"""
    reports = []
    if not REPORTS_DIR.exists():
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        return reports

    for f in REPORTS_DIR.glob('*.json'):
        try:
            data = json.loads(f.read_text(encoding='utf-8'))
            if isinstance(data, list):
                reports.extend(data)
            elif isinstance(data, dict) and 'completionItems' in data:
                reports.append(data)
        except Exception:
            pass
    return reports


def extract_line_items(reports: list) -> dict:
    """
    공정 ID별 실적 데이터 집계
    반환: {processId: [{estimated, actual, qty, projectId}]}
    """
    items_by_process = {}

    for report in reports:
        proj_id = report.get('projectId', 'unknown')
        items = report.get('completionItems', [])

        for item in items:
            pid = item.get('processId') or item.get('id')
            if not pid:
                continue
            estimated = item.get('estimatedCost') or item.get('sup', 0)
            actual = item.get('actualCost') or item.get('actual', 0)
            qty = item.get('qty', 1)

            if estimated <= 0 or actual <= 0:
                continue

            if pid not in items_by_process:
                items_by_process[pid] = []
            items_by_process[pid].append({
                'estimated': estimated,
                'actual': actual,
                'qty': qty,
                'projectId': proj_id,
                'overrunPct': round((actual - estimated) / estimated * 100, 1),
            })

    return items_by_process


def analyze_process(pid: str, samples: list) -> dict:
    """단일 공정 통계 분석"""
    n = len(samples)
    overruns = [s['overrunPct'] for s in samples]
    mean_overrun = round(statistics.mean(overruns), 1)
    median_overrun = round(statistics.median(overruns), 1)
    stdev = round(statistics.stdev(overruns), 1) if n >= 2 else 0

    # 보정 제안 계산
    if abs(mean_overrun) < 5:
        correction_needed = False
        correction_pct = 0
        severity = 'ok'
    elif abs(mean_overrun) < 15:
        correction_needed = True
        correction_pct = round(mean_overrun * 0.5, 1)
        severity = 'warn'
    else:
        correction_needed = True
        correction_pct = round(mean_overrun * 0.7, 1)
        severity = 'error'

    return {
        'processId': pid,
        'sampleCount': n,
        'meanOverrunPct': mean_overrun,
        'medianOverrunPct': median_overrun,
        'stdevPct': stdev,
        'correctionNeeded': correction_needed,
        'correctionPct': correction_pct,
        'severity': severity,
        'message': _build_message(pid, mean_overrun, n),
        'samples': samples,
    }


def _build_message(pid: str, mean_overrun: float, n: int) -> str:
    if abs(mean_overrun) < 5:
        return f'정상 범위 ({n}건 실적)'
    direction = '초과' if mean_overrun > 0 else '절감'
    return f'이 공정은 평균 {abs(mean_overrun):.1f}% {direction} 발생 ({n}건 실적)'


def build_db_update_requests(stats: list) -> list:
    """DB 업데이트 요청 목록 생성"""
    requests_list = []
    for stat in stats:
        if stat['correctionNeeded']:
            requests_list.append({
                'id': f'DBU-{stat["processId"]}-{datetime.now().strftime("%Y%m")}',
                'processId': stat['processId'],
                'currentMultiplier': 1.0,
                'suggestedMultiplier': round(1.0 + stat['correctionPct'] / 100, 3),
                'reason': stat['message'],
                'sampleCount': stat['sampleCount'],
                'severity': stat['severity'],
                'status': 'pending',
                'createdAt': datetime.now().isoformat(),
                'approvedBy': None,
            })
    return requests_list


def run() -> dict:
    print('[통계 엔진] 시작...')
    reports = load_completion_reports()
    print(f'[통계 엔진] 완료 보고서 {len(reports)}건 로드')

    if not reports:
        print('[통계 엔진] 실적 데이터 없음 — 데모 데이터 생성')
        reports = _demo_reports()

    items_by_process = extract_line_items(reports)
    print(f'[통계 엔진] {len(items_by_process)}개 공정 실적 발견')

    stats = []
    for pid, samples in items_by_process.items():
        if len(samples) >= MIN_SAMPLES:
            stat = analyze_process(pid, samples)
            stats.append(stat)
            print(f'  [{pid}] {stat["message"]}')

    # 심각도 순 정렬
    severity_order = {'error': 0, 'warn': 1, 'ok': 2}
    stats.sort(key=lambda x: (severity_order.get(x['severity'], 3), -x['sampleCount']))

    result = {
        'generatedAt': datetime.now().isoformat(),
        'reportCount': len(reports),
        'processCount': len(stats),
        'stats': stats,
        'summary': {
            'errors': sum(1 for s in stats if s['severity'] == 'error'),
            'warnings': sum(1 for s in stats if s['severity'] == 'warn'),
            'ok': sum(1 for s in stats if s['severity'] == 'ok'),
        }
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[통계 엔진] 결과 저장: {OUTPUT_FILE}')

    # DB 업데이트 요청 생성
    db_updates = build_db_update_requests(stats)
    if db_updates:
        existing = []
        if DB_UPDATE_REQUESTS.exists():
            try:
                existing = json.loads(DB_UPDATE_REQUESTS.read_text(encoding='utf-8'))
            except Exception:
                pass
        existing_ids = {r['id'] for r in existing}
        new_updates = [r for r in db_updates if r['id'] not in existing_ids]
        all_updates = existing + new_updates
        DB_UPDATE_REQUESTS.write_text(
            json.dumps(all_updates, ensure_ascii=False, indent=2),
            encoding='utf-8'
        )
        print(f'[통계 엔진] DB 업데이트 요청 {len(new_updates)}건 생성')

    return result


def _demo_reports():
    """데모 실적 데이터"""
    return [
        {'projectId': 'DEMO-001', 'completionItems': [
            {'processId': 'TILE_BT', 'estimatedCost': 500000, 'actualCost': 580000, 'qty': 10},
            {'processId': 'PLB_RG',  'estimatedCost': 800000, 'actualCost': 950000, 'qty': 1},
            {'processId': 'ELE_RG',  'estimatedCost': 600000, 'actualCost': 640000, 'qty': 1},
        ]},
        {'projectId': 'DEMO-002', 'completionItems': [
            {'processId': 'TILE_BT', 'estimatedCost': 450000, 'actualCost': 540000, 'qty': 9},
            {'processId': 'PLB_RG',  'estimatedCost': 750000, 'actualCost': 900000, 'qty': 1},
            {'processId': 'ELE_RG',  'estimatedCost': 580000, 'actualCost': 610000, 'qty': 1},
        ]},
        {'projectId': 'DEMO-003', 'completionItems': [
            {'processId': 'TILE_BT', 'estimatedCost': 520000, 'actualCost': 612000, 'qty': 11},
            {'processId': 'PLB_RG',  'estimatedCost': 900000, 'actualCost': 1050000, 'qty': 1},
            {'processId': 'ELE_RG',  'estimatedCost': 620000, 'actualCost': 635000, 'qty': 1},
        ]},
    ]


if __name__ == '__main__':
    result = run()
    print(f'\n요약: 오류 {result["summary"]["errors"]}건 | '
          f'경고 {result["summary"]["warnings"]}건 | '
          f'정상 {result["summary"]["ok"]}건')
