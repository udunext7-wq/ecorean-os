"""
ECOREAN ML 파이프라인
- 100건 데이터 도달 시 자동 활성화
- XGBoost 단가 보정 모델
- 입력: 건물정보(유형/면적/연식/지역/등급) → 출력: 공정별 보정 계수
"""
import json
import sys
import os
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent.parent
TRAINING_DATA_FILE = BASE_DIR.parent / '생성파일저장' / 'ml-training-data.json'
MODEL_DIR = BASE_DIR.parent / '생성파일저장' / 'ml-models'
PREDICTIONS_FILE = BASE_DIR.parent / '생성파일저장' / 'ml-predictions.json'

ACTIVATION_THRESHOLD = 100  # 최소 100건 필요


def check_activation() -> tuple[bool, int]:
    """ML 활성화 조건 확인"""
    if not TRAINING_DATA_FILE.exists():
        return False, 0
    try:
        data = json.loads(TRAINING_DATA_FILE.read_text(encoding='utf-8'))
        count = len(data)
        return count >= ACTIVATION_THRESHOLD, count
    except Exception:
        return False, 0


def preprocess_features(record: dict) -> list:
    """
    프로젝트 레코드 → 특성 벡터
    특성: [건물유형, 총면적, 연식, 지역계수, 등급계수, 공간수, 욕실수]
    """
    build_type_map = {'apartment': 0, 'officetel': 1, 'villa': 2, 'house': 3}
    grade_map = {'standard': 1.0, 'premium': 1.3, 'luxury': 1.6}

    features = [
        build_type_map.get(record.get('buildType', 'apartment'), 0),
        float(record.get('totalArea', 50)),
        float(record.get('buildAge', 10)),
        float(record.get('region', 1.05)),
        float(grade_map.get(record.get('grade', 'premium'), 1.3)),
        int(record.get('spaceCount', 3)),
        int(record.get('bathroomCount', 1)),
    ]
    return features


def train_model(training_data: list) -> dict:
    """XGBoost 모델 학습"""
    try:
        import numpy as np
        import xgboost as xgb
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import mean_absolute_error

        # 공정별 모델 딕셔너리
        models = {}
        process_ids = set()
        for record in training_data:
            for item in record.get('actualItems', []):
                process_ids.add(item['processId'])

        for pid in process_ids:
            X, y = [], []
            for record in training_data:
                features = preprocess_features(record)
                for item in record.get('actualItems', []):
                    if item['processId'] == pid and item.get('estimatedCost', 0) > 0:
                        ratio = item['actualCost'] / item['estimatedCost']
                        X.append(features)
                        y.append(ratio)

            if len(X) < 10:
                continue

            X = np.array(X)
            y = np.array(y)

            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            model = xgb.XGBRegressor(
                n_estimators=100, max_depth=3, learning_rate=0.1,
                random_state=42, verbosity=0,
            )
            model.fit(X_train, y_train)
            pred = model.predict(X_test)
            mae = mean_absolute_error(y_test, pred)

            model_path = MODEL_DIR / f'model_{pid}.json'
            MODEL_DIR.mkdir(parents=True, exist_ok=True)
            model.save_model(str(model_path))

            models[pid] = {
                'processId': pid,
                'sampleCount': len(X),
                'mae': round(float(mae), 4),
                'modelPath': str(model_path),
                'trainedAt': datetime.now().isoformat(),
            }
            print(f'  [{pid}] 학습 완료 — MAE: {mae:.4f} (n={len(X)})')

        return models

    except ImportError as e:
        print(f'[ML] 패키지 없음: {e}')
        return {}


def predict(record: dict, models_meta: dict) -> dict:
    """학습된 모델로 단가 보정 예측"""
    try:
        import numpy as np
        import xgboost as xgb
    except ImportError:
        return {}

    features = np.array([preprocess_features(record)])
    predictions = {}

    for pid, meta in models_meta.items():
        try:
            model = xgb.XGBRegressor()
            model.load_model(meta['modelPath'])
            ratio = float(model.predict(features)[0])
            predictions[pid] = {
                'correctionRatio': round(ratio, 4),
                'correctionPct': round((ratio - 1) * 100, 1),
                'confidence': 'high' if meta['sampleCount'] >= 20 else 'medium',
            }
        except Exception:
            pass

    return predictions


def run(project_record: dict = None) -> dict:
    print('[ML 파이프라인] 시작...')
    activated, count = check_activation()

    if not activated:
        remaining = ACTIVATION_THRESHOLD - count
        print(f'[ML 파이프라인] 비활성화 — 현재 {count}건 / 필요 {ACTIVATION_THRESHOLD}건 ({remaining}건 더 필요)')
        return {
            'activated': False,
            'currentCount': count,
            'threshold': ACTIVATION_THRESHOLD,
            'remaining': remaining,
            'message': f'ML 기능은 {remaining}건의 완료 보고서가 더 쌓이면 자동 활성화됩니다.',
        }

    print(f'[ML 파이프라인] 활성화! ({count}건 데이터)')
    training_data = json.loads(TRAINING_DATA_FILE.read_text(encoding='utf-8'))
    models_meta = train_model(training_data)

    result = {
        'activated': True,
        'currentCount': count,
        'modelCount': len(models_meta),
        'models': models_meta,
        'trainedAt': datetime.now().isoformat(),
    }

    # 예측 요청이 있으면 실행
    if project_record and models_meta:
        predictions = predict(project_record, models_meta)
        result['predictions'] = predictions

    # 결과 저장
    PREDICTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    PREDICTIONS_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[ML 파이프라인] {len(models_meta)}개 모델 학습 완료')

    return result


if __name__ == '__main__':
    result = run()
    if result.get('activated'):
        print(f"모델 {result['modelCount']}개 학습 완료")
    else:
        print(result['message'])
