"""
DXF/DWG 도면 파서 — 공간 폴리라인 → 면적 추출
출력: {spaces: [{name, width, length, height, area}]}
"""
import sys
import json
import math
import re
import ezdxf
from ezdxf.math import Vec3


SPACE_KEYWORDS = [
    '거실', '침실', '주방', '욕실', '화장실', '발코니', '베란다',
    '현관', '복도', '다용도실', '드레스룸', '서재', '방', '실',
    'LIVING', 'BEDROOM', 'KITCHEN', 'BATH', 'BALCONY', 'HALL',
    'ROOM', 'TOILET', 'LAUNDRY', 'CLOSET', 'STUDY',
]

DEFAULT_CEILING = 2.4


def polyline_area(points: list) -> float:
    """Shoelace formula — 2D 폴리라인 면적(㎡)"""
    n = len(points)
    if n < 3:
        return 0.0
    area = 0.0
    for i in range(n):
        j = (i + 1) % n
        area += points[i][0] * points[j][1]
        area -= points[j][0] * points[i][1]
    return abs(area) / 2.0


def bounding_box(points: list):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    w = max(xs) - min(xs)
    h = max(ys) - min(ys)
    return w, h


def detect_scale(doc) -> float:
    """도면 단위 추정: mm면 0.001, m면 1.0"""
    units = doc.header.get('$INSUNITS', 0)
    unit_map = {1: 0.0254, 2: 0.001, 3: 0.01, 4: 1.0, 5: 0.9144}
    return unit_map.get(units, 0.001)  # 기본 mm


def extract_text_near(msp, cx: float, cy: float, radius: float = 5000) -> str:
    """폴리라인 중심 근처 텍스트 반환"""
    candidates = []
    for e in msp.query('TEXT MTEXT'):
        try:
            if e.dxftype() == 'TEXT':
                pos = e.dxf.insert
                txt = e.dxf.text.strip()
            else:
                pos = e.dxf.insert
                txt = e.plain_mtext().strip()
            dist = math.hypot(pos.x - cx, pos.y - cy)
            if dist < radius and txt:
                candidates.append((dist, txt))
        except Exception:
            continue
    if not candidates:
        return ''
    candidates.sort(key=lambda x: x[0])
    return candidates[0][1]


def classify_space(name: str) -> str:
    nl = name.upper()
    if any(k in nl for k in ['거실', 'LIVING', 'LDK']):
        return '거실'
    if any(k in nl for k in ['주방', 'KITCHEN', '키친']):
        return '주방'
    if any(k in nl for k in ['욕실', '화장실', 'BATH', 'TOILET', 'WC']):
        return '욕실'
    if any(k in nl for k in ['침실', 'BEDROOM', 'BED', '방']):
        return '침실'
    if any(k in nl for k in ['발코니', '베란다', 'BALCONY']):
        return '발코니'
    if any(k in nl for k in ['현관', 'ENTRANCE', 'HALL']):
        return '현관'
    if any(k in nl for k in ['드레스', 'DRESS', 'CLOSET', '옷방']):
        return '드레스룸'
    if any(k in nl for k in ['다용도', 'LAUNDRY', 'UTILITY']):
        return '다용도실'
    if any(k in nl for k in ['서재', 'STUDY', 'OFFICE']):
        return '서재'
    return name or '공간'


def parse_dxf(filepath: str) -> dict:
    try:
        doc = ezdxf.readfile(filepath)
    except Exception as e:
        return {'error': str(e), 'spaces': []}

    msp = doc.modelspace()
    scale = detect_scale(doc)
    spaces = []

    # 닫힌 폴리라인/LWPOLYLINE 수집
    polys = []
    for e in msp.query('LWPOLYLINE POLYLINE'):
        try:
            if e.dxftype() == 'LWPOLYLINE':
                pts = [(v[0], v[1]) for v in e.get_points()]
                closed = e.closed
            else:
                pts = [(v.dxf.location.x, v.dxf.location.y)
                       for v in e.vertices if hasattr(v.dxf, 'location')]
                closed = bool(e.dxf.flags & 1)

            if len(pts) < 3:
                continue
            area_raw = polyline_area(pts)
            area_m2 = area_raw * scale * scale
            # 0.5㎡ ~ 200㎡ 범위만 공간으로 인식
            if 0.5 <= area_m2 <= 200:
                cx = sum(p[0] for p in pts) / len(pts)
                cy = sum(p[1] for p in pts) / len(pts)
                polys.append({'pts': pts, 'area': area_m2, 'cx': cx, 'cy': cy})
        except Exception:
            continue

    # HATCH 레이어에서 공간 인식 (폴리라인 없을 때 보조)
    for e in msp.query('HATCH'):
        try:
            for boundary in e.paths:
                pts = [(v[0], v[1]) for v in boundary.vertices] if hasattr(boundary, 'vertices') else []
                if len(pts) < 3:
                    continue
                area_raw = polyline_area(pts)
                area_m2 = area_raw * scale * scale
                if 0.5 <= area_m2 <= 200:
                    cx = sum(p[0] for p in pts) / len(pts)
                    cy = sum(p[1] for p in pts) / len(pts)
                    polys.append({'pts': pts, 'area': area_m2, 'cx': cx, 'cy': cy})
        except Exception:
            continue

    # 중복 제거 (면적 오차 5% 이내 + 중심 거리 1000 이내)
    unique = []
    for p in polys:
        dup = False
        for u in unique:
            if (abs(p['area'] - u['area']) / max(u['area'], 0.001) < 0.05
                    and math.hypot(p['cx'] - u['cx'], p['cy'] - u['cy']) * scale < 1.0):
                dup = True
                break
        if not dup:
            unique.append(p)

    for i, poly in enumerate(unique):
        raw_name = extract_text_near(msp, poly['cx'], poly['cy'])
        space_type = classify_space(raw_name)
        w_raw, h_raw = bounding_box(poly['pts'])
        w_m = round(w_raw * scale, 2)
        l_m = round(h_raw * scale, 2)
        area = round(poly['area'], 2)
        # 바운딩박스가 면적과 크게 다르면(비정형) 면적에서 역산
        if w_m * l_m > 0 and abs(w_m * l_m - area) / area > 0.4:
            w_m = round(math.sqrt(area), 2)
            l_m = w_m

        spaces.append({
            'name': space_type,
            'rawName': raw_name,
            'width': max(w_m, 0.1),
            'length': max(l_m, 0.1),
            'height': DEFAULT_CEILING,
            'area': area,
            'isWet': space_type in ['욕실', '주방', '다용도실'],
            'source': 'dxf',
        })

    # 면적 내림차순 정렬
    spaces.sort(key=lambda x: -x['area'])

    return {
        'spaces': spaces,
        'totalArea': round(sum(s['area'] for s in spaces), 2),
        'spaceCount': len(spaces),
        'scale': scale,
        'source': filepath,
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: dwg-parser.py <file.dxf>'}))
        sys.exit(1)
    result = parse_dxf(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False, indent=2))
