"""
ECOREAN 크롤러 스케줄러
- 매일 새벽 2시 자동 실행
- 노임단가: 반기마다 (1/7월)
- 자재물가: 주마다 (월요일)
- 온톨로지 후보: 월마다 (1일)
"""
import sys
import json
import logging
import importlib.util
import schedule
import time
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent
LOG_DIR = BASE_DIR.parent.parent / '생성파일저장'
LOG_DIR.mkdir(parents=True, exist_ok=True)


def _load(filename: str):
    """하이픈 포함 파일명 동적 로드"""
    spec = importlib.util.spec_from_file_location(
        filename.replace('-', '_').replace('.py', ''),
        BASE_DIR / filename,
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / 'crawler-scheduler.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ]
)
log = logging.getLogger('crawler-scheduler')


def run_labor_crawler():
    try:
        now = datetime.now()
        if now.month not in (1, 7):
            log.info('[노임단가] 비실행 월 — 1월/7월에만 실행')
            return
        log.info('[노임단가] 크롤링 시작')
        mod = _load('labor-rate-crawler.py')
        result = mod.run()
        log.info(f'[노임단가] 완료 — {len(result)}개 직종')
    except Exception as e:
        log.error(f'[노임단가] 오류: {e}')


def run_material_crawler():
    try:
        log.info('[자재물가] 크롤링 시작')
        mod = _load('material-price-crawler.py')
        mod.run()
        log.info('[자재물가] 완료')
    except Exception as e:
        log.error(f'[자재물가] 오류: {e}')


def run_ontology_crawler():
    try:
        now = datetime.now()
        # 매월 1일에만 실행
        if now.day != 1:
            log.info('[온톨로지] 비실행일 — 매월 1일에만 실행')
            return
        log.info('[온톨로지] 후보 생성 시작')
        mod = _load('ontology-crawler.py')
        result = mod.run()
        log.info(f'[온톨로지] 완료 — {len(result)}개 후보')
    except Exception as e:
        log.error(f'[온톨로지] 오류: {e}')


def run_all_daily():
    """매일 새벽 2시 실행 (force=True 이면 날짜 조건 무시)"""
    force = '--run-now' in sys.argv
    log.info('=== 일일 크롤러 배치 시작 ===')
    if force:
        log.info('[강제 실행] 날짜 조건 무시하고 모두 실행')
        _run_forced()
    else:
        run_labor_crawler()
        run_material_crawler()
        run_ontology_crawler()
    log.info('=== 일일 크롤러 배치 완료 ===')

    # 실행 로그 JSON 저장
    log_entry = {
        'timestamp': datetime.now().isoformat(),
        'status': 'completed',
    }
    log_file = LOG_DIR / 'crawler-run-log.json'
    logs = []
    if log_file.exists():
        try:
            logs = json.loads(log_file.read_text(encoding='utf-8'))
        except Exception:
            pass
    logs.append(log_entry)
    logs = logs[-30:]  # 최근 30건만 유지
    log_file.write_text(json.dumps(logs, ensure_ascii=False, indent=2), encoding='utf-8')


def _run_forced():
    """날짜 조건 무시하고 모든 크롤러 강제 실행"""
    log.info('[노임단가] 강제 실행')
    try:
        mod = _load('labor-rate-crawler.py')
        result = mod.run()
        log.info(f'[노임단가] 완료 — {len(result)}개 직종')
    except Exception as e:
        log.error(f'[노임단가] 오류: {e}')

    log.info('[자재물가] 강제 실행')
    try:
        mod = _load('material-price-crawler.py')
        mod.run()
        log.info('[자재물가] 완료')
    except Exception as e:
        log.error(f'[자재물가] 오류: {e}')

    log.info('[온톨로지] 강제 실행')
    try:
        mod = _load('ontology-crawler.py')
        result = mod.run()
        log.info(f'[온톨로지] 완료 — {len(result)}개 후보')
    except Exception as e:
        log.error(f'[온톨로지] 오류: {e}')


def setup_schedule():
    # 매일 새벽 02:00 전체 실행
    schedule.every().day.at('02:00').do(run_all_daily)
    # 매주 월요일 02:30 자재물가 추가 실행
    schedule.every().monday.at('02:30').do(run_material_crawler)
    log.info('스케줄 등록 완료:')
    log.info('  - 매일 02:00 — 일일 배치 (노임/자재/온톨로지)')
    log.info('  - 매주 월요일 02:30 — 자재물가 추가')


def main():
    log.info('ECOREAN 크롤러 스케줄러 시작')
    setup_schedule()

    # --run-now 인자 시 즉시 실행
    if '--run-now' in sys.argv:
        log.info('[즉시 실행] --run-now 인자 감지')
        run_all_daily()
        return

    log.info('스케줄러 대기 중... (Ctrl+C로 종료)')
    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == '__main__':
    main()
