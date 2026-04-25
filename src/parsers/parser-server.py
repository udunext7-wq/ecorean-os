"""
ECOREAN 파서 서버 — Flask 로컬 서버 (포트 5001)
POST /parse/dxf  → DXF 파싱 결과
POST /parse/pdf  → PDF 파싱 결과
GET  /health     → 서버 상태 확인
"""
import os
import sys
import json
import tempfile
import traceback
from pathlib import Path

from flask import Flask, request, jsonify
from flask import make_response

# 파서 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent))

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB


def cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
    return response


@app.after_request
def after_request(response):
    return cors(response)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'server': 'ECOREAN Parser Server v1.0',
        'endpoints': ['/parse/dxf', '/parse/pdf'],
    })


@app.route('/parse/dxf', methods=['POST', 'OPTIONS'])
def parse_dxf_endpoint():
    if request.method == 'OPTIONS':
        return cors(make_response('', 200))

    if 'file' not in request.files:
        return jsonify({'error': '파일이 없습니다. multipart/form-data로 file 필드를 전송하세요.'}), 400

    f = request.files['file']
    if not f.filename:
        return jsonify({'error': '파일명이 없습니다.'}), 400

    ext = Path(f.filename).suffix.lower()
    if ext not in ('.dxf', '.dwg'):
        return jsonify({'error': f'지원하지 않는 형식: {ext}. .dxf 또는 .dwg 파일을 업로드하세요.'}), 400

    # 임시 파일 저장
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        f.save(tmp.name)
        tmp_path = tmp.name

    try:
        from dwg_parser import parse_dxf
        result = parse_dxf(tmp_path)
    except Exception as e:
        result = {'error': str(e), 'traceback': traceback.format_exc(), 'spaces': []}
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    return jsonify(result)


@app.route('/parse/pdf', methods=['POST', 'OPTIONS'])
def parse_pdf_endpoint():
    if request.method == 'OPTIONS':
        return cors(make_response('', 200))

    if 'file' not in request.files:
        return jsonify({'error': '파일이 없습니다.'}), 400

    f = request.files['file']
    ext = Path(f.filename).suffix.lower()
    if ext != '.pdf':
        return jsonify({'error': f'지원하지 않는 형식: {ext}. .pdf 파일을 업로드하세요.'}), 400

    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
        f.save(tmp.name)
        tmp_path = tmp.name

    try:
        from pdf_parser import parse_pdf
        result = parse_pdf(tmp_path)
    except Exception as e:
        result = {'error': str(e), 'traceback': traceback.format_exc(), 'spaces': []}
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    return jsonify(result)


@app.route('/parse/demo', methods=['GET'])
def parse_demo():
    """데모 데이터 반환 (실제 파일 없이 테스트용)"""
    demo = {
        'spaces': [
            {'name': '거실', 'rawName': '거실/LDK', 'width': 5.2, 'length': 4.5,
             'height': 2.4, 'area': 23.4, 'isWet': False, 'source': 'demo'},
            {'name': '주방', 'rawName': 'KITCHEN', 'width': 3.2, 'length': 2.8,
             'height': 2.4, 'area': 8.96, 'isWet': True, 'source': 'demo'},
            {'name': '침실', 'rawName': '안방', 'width': 4.0, 'length': 3.5,
             'height': 2.4, 'area': 14.0, 'isWet': False, 'source': 'demo'},
            {'name': '침실', 'rawName': '침실2', 'width': 3.0, 'length': 3.0,
             'height': 2.4, 'area': 9.0, 'isWet': False, 'source': 'demo'},
            {'name': '욕실', 'rawName': '욕실', 'width': 1.8, 'length': 2.2,
             'height': 2.4, 'area': 3.96, 'isWet': True, 'source': 'demo'},
            {'name': '발코니', 'rawName': '발코니', 'width': 5.2, 'length': 1.2,
             'height': 2.4, 'area': 6.24, 'isWet': False, 'source': 'demo'},
        ],
        'totalArea': 65.56,
        'spaceCount': 6,
        'source': 'demo',
        'note': '데모 데이터입니다. 실제 도면을 업로드하세요.',
    }
    return jsonify(demo)


if __name__ == '__main__':
    port = int(os.environ.get('PARSER_PORT', 5001))
    print(f'ECOREAN Parser Server 시작 — http://localhost:{port}')
    print(f'  GET  /health     — 서버 상태 확인')
    print(f'  POST /parse/dxf  — DXF 도면 파싱')
    print(f'  POST /parse/pdf  — PDF 도면 파싱')
    print(f'  GET  /parse/demo — 데모 데이터')
    app.run(host='127.0.0.1', port=port, debug=False)
