# engines/ — 백엔드 두뇌 (13 엔진)

판단·계산·규칙·변환 로직. 순수 함수. UI 없음.
앱 팩이 이것을 호출한다. AI Agent도 같은 엔진 호출.

각 엔진: engine.manifest.ts + index.ts + logic/ + __tests__/ (필수)
금지: React/JSX import (P2 위반). 화면 코드. 다른 앱 import.
