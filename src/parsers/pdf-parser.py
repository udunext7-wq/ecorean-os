"""
PDF 도면 파서 — 이미지 변환 → OpenCV 치수선 감지 → 공간 면적 추출
출력: {spaces: [{name, width, length, height, area}]}
"""
import sys
import json
import math
import re
import io
import numpy as np

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    from pdfminer.high_level import extract_text, extract_pages
    from pdfminer.layout import LTTextBox, LTFigure, LTRect, LTLine, LTAnno
    HAS_PDF = True
except ImportError:
    HAS_PDF = False


DIM_PATTERN = re.compile(
    r'(\d+[\.,]\d+|\d{3,5})\s*(?:mm|m|㎡|M|MM)?',
    re.IGNORECASE,
)
SPACE_NAMES = {
    '거실': ['거실', 'LIVING', 'L/D', 'LDK'],
    '주방': ['주방', '부엌', 'KITCHEN', 'K', 'DK'],
    '욕실': ['욕실', '화장실', 'BATH', 'WC', 'T'],
    '침실': ['침실', 'BED', 'BR', '방'],
    '발코니': ['발코니', '베란다', 'BALCONY', 'BAL'],
    '현관': ['현관', 'ENTRANCE', 'FOYER'],
    '드레스룸': ['드레스', 'DRESS', 'CLOSET', 'WIC'],
    '다용도실': ['다용도', 'UTILITY', 'LAUNDRY'],
    '서재': ['서재', 'STUDY', 'OFFICE'],
}


def classify_space_text(text: str) -> str:
    tu = text.upper().strip()
    for stype, kws in SPACE_NAMES.items():
        for kw in kws:
            if kw.upper() in tu:
                return stype
    return text.strip() or '공간'


def extract_dims_from_text(text: str) -> list:
    """텍스트에서 치수 숫자 추출 → mm 단위로 변환"""
    dims = []
    for m in DIM_PATTERN.finditer(text):
        raw = m.group(1).replace(',', '.')
        try:
            val = float(raw)
            # 1~9000 범위를 mm로 판단, 크면 mm이미
            if 1 <= val <= 9:
                val *= 1000  # m → mm
            elif val > 9000:
                val /= 10   # 가끔 cm 단위
            dims.append(val)
        except ValueError:
            pass
    return dims


def pdf_to_images(filepath: str, dpi: int = 150):
    """PDF → PIL Image 리스트"""
    try:
        # pdf2image가 없으면 pdfminer만으로 처리
        from pdf2image import convert_from_path
        return convert_from_path(filepath, dpi=dpi)
    except ImportError:
        return []


def detect_rectangles_cv2(pil_img) -> list:
    """OpenCV로 사각형 감지 → 면적 후보 반환"""
    if not HAS_CV2 or pil_img is None:
        return []
    img = np.array(pil_img.convert('RGB'))
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    rects = []
    h_img, w_img = img.shape[:2]
    for cnt in contours:
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(approx)
            # 이미지 크기의 2%~60% 범위만 공간으로
            if (0.02 * w_img < w < 0.6 * w_img
                    and 0.02 * h_img < h < 0.6 * h_img):
                rects.append({'x': x, 'y': y, 'w': w, 'h': h,
                               'cx': x + w // 2, 'cy': y + h // 2})
    return rects


def parse_pdf_layout(filepath: str) -> dict:
    """pdfminer로 텍스트 박스 파싱 → 공간명+치수 추출"""
    if not HAS_PDF:
        return {'spaces': [], 'error': 'pdfminer not available'}

    spaces_raw = []
    try:
        for page_layout in extract_pages(filepath):
            page_w = float(page_layout.width)
            page_h = float(page_layout.height)
            texts = []
            for element in page_layout:
                if isinstance(element, LTTextBox):
                    txt = element.get_text().strip()
                    if txt:
                        cx = (element.x0 + element.x1) / 2
                        cy = (element.y0 + element.y1) / 2
                        texts.append({'text': txt, 'cx': cx, 'cy': cy,
                                      'w': element.x1 - element.x0,
                                      'h': element.y1 - element.y0})

            # 공간명 텍스트 찾기
            space_texts = []
            for t in texts:
                for stype, kws in SPACE_NAMES.items():
                    for kw in kws:
                        if kw.upper() in t['text'].upper():
                            space_texts.append({**t, 'type': stype})
                            break

            # 각 공간 텍스트 근처의 치수 텍스트 찾기
            for st in space_texts:
                nearby_dims = []
                for t in texts:
                    dist = math.hypot(t['cx'] - st['cx'], t['cy'] - st['cy'])
                    if dist < page_w * 0.15:
                        dims = extract_dims_from_text(t['text'])
                        nearby_dims.extend(dims)

                # 치수 필터: 500mm ~ 8000mm
                dims_filtered = [d for d in nearby_dims if 500 <= d <= 8000]
                dims_filtered.sort()

                if len(dims_filtered) >= 2:
                    w_mm = dims_filtered[-2]
                    l_mm = dims_filtered[-1]
                elif len(dims_filtered) == 1:
                    w_mm = l_mm = dims_filtered[0]
                else:
                    w_mm = l_mm = 3000  # 기본값

                w_m = round(w_mm / 1000, 2)
                l_m = round(l_mm / 1000, 2)
                area = round(w_m * l_m, 2)

                if 0.5 <= area <= 200:
                    spaces_raw.append({
                        'name': st['type'],
                        'rawName': st['text'][:20],
                        'width': w_m,
                        'length': l_m,
                        'height': 2.4,
                        'area': area,
                        'isWet': st['type'] in ['욕실', '주방', '다용도실'],
                        'source': 'pdf-text',
                    })
            break  # 1페이지만 처리

    except Exception as e:
        return {'spaces': [], 'error': str(e)}

    # 중복 제거 (같은 타입 + 면적 10% 이내)
    unique = []
    for s in spaces_raw:
        dup = any(
            u['name'] == s['name']
            and abs(u['area'] - s['area']) / max(u['area'], 0.1) < 0.1
            for u in unique
        )
        if not dup:
            unique.append(s)

    unique.sort(key=lambda x: -x['area'])
    return {
        'spaces': unique,
        'totalArea': round(sum(s['area'] for s in unique), 2),
        'spaceCount': len(unique),
        'source': filepath,
        'method': 'pdfminer-text',
    }


def parse_pdf(filepath: str) -> dict:
    """PDF 파싱 진입점 — 텍스트 파싱 우선, 실패 시 이미지 처리"""
    result = parse_pdf_layout(filepath)
    if result.get('spaces') and len(result['spaces']) > 0:
        return result

    # fallback: 이미지 변환 후 OpenCV
    images = pdf_to_images(filepath)
    if not images or not HAS_CV2:
        if not result.get('spaces'):
            result['spaces'] = _fallback_spaces()
            result['note'] = '자동 파싱 실패 — 기본 공간 템플릿 사용'
        return result

    img = images[0]
    rects = detect_rectangles_cv2(img)
    w_img, h_img = img.size
    spaces = []
    for i, r in enumerate(rects[:10]):
        scale = 0.005  # 픽셀 → m 대략값 (도면 스케일 미지)
        w_m = round(r['w'] * scale, 2)
        l_m = round(r['h'] * scale, 2)
        area = round(w_m * l_m, 2)
        if 0.5 <= area <= 100:
            spaces.append({
                'name': f'공간{i+1}',
                'rawName': '',
                'width': w_m, 'length': l_m, 'height': 2.4,
                'area': area, 'isWet': False,
                'source': 'pdf-cv2',
            })

    return {
        'spaces': spaces or _fallback_spaces(),
        'totalArea': round(sum(s['area'] for s in spaces), 2),
        'spaceCount': len(spaces),
        'source': filepath,
        'method': 'opencv',
        'note': '이미지 파싱 — 공간명 수동 확인 필요',
    }


def _fallback_spaces():
    return [
        {'name': '거실', 'rawName': '', 'width': 5.0, 'length': 4.0,
         'height': 2.4, 'area': 20.0, 'isWet': False, 'source': 'fallback'},
        {'name': '침실', 'rawName': '', 'width': 3.5, 'length': 3.0,
         'height': 2.4, 'area': 10.5, 'isWet': False, 'source': 'fallback'},
        {'name': '욕실', 'rawName': '', 'width': 1.8, 'length': 2.0,
         'height': 2.4, 'area': 3.6, 'isWet': True, 'source': 'fallback'},
    ]


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: pdf-parser.py <file.pdf>'}))
        sys.exit(1)
    result = parse_pdf(sys.argv[1])
    print(json.dumps(result, ensure_ascii=False, indent=2))
