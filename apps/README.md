# apps/ — 프론트 얼굴 (앱 팩)

화면·입력·표시. 엔진을 호출하는 얇은 UI. 계속 추가.

각 앱: pack.manifest.ts (필수) + page.tsx + components/
새 앱: 이 폴더에 폴더만 추가 + manifest 작성. (pack-contract.md 5장)
금지: 계산 로직(→engines/). 공통 컴포넌트(→core/ui/). 다른 앱 import.
