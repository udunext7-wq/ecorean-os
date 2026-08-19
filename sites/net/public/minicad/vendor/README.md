# MiniCAD vendor (외부 CDN 없이 동봉, 필요 시 지연 로드)

| 폴더 | 패키지 | 버전 | 라이선스 | 용도 |
|---|---|---|---|---|
| pdfjs/ | pdfjs-dist (legacy build) | 6.2.108 | Apache-2.0 | PDF 페이지 렌더(밑그림) + 연산자 목록(선 추출) |
| libredwg/ | @mlightcad/libredwg-web | 0.7.9 | GPL-3.0 | DWG → JSON (브라우저 WASM, ~10MB) |

갱신: scratch 폴더에서 `npm i pdfjs-dist @mlightcad/libredwg-web` 후 같은 파일명으로 복사.
libredwg-web 의 dist/libredwg-web.js 는 `../wasm/libredwg-web.js` 를 상대경로로 import 하므로 폴더 구조(dist/, wasm/)를 유지할 것.
