# 미니폼·프리폼 E2E (헤드리스 크롬 CDP)

```
node tests/minicad-e2e/serve.cjs &          # 레포 루트를 :8090 으로
node tests/minicad-e2e/ff-sketchup.cjs      # 단독 프리폼 = 스케치업 100% (53건, 진짜 포인터·키)
node tests/minicad-e2e/linked-view.cjs      # 연동 뷰 회귀 (부팅 오류 0 · 옛 셸 그대로)
node tests/minicad-csg.cjs                  # 솔리드 도구 CSG 단위 (부피 검증)
```
크롬 경로 `C:/Program Files/Google/Chrome/Application/chrome.exe` (cdp.cjs). ws 는 레포 devDependency.
