# 미니폼·프리폼 E2E (헤드리스 크롬 CDP)

```
node tests/minicad-e2e/serve.cjs &          # 레포 루트를 :8090 으로
node tests/minicad-e2e/ff-sketchup.cjs      # 단독 프리폼 = 스케치업 100% 1차 (53건, 진짜 포인터·키)
node tests/minicad-e2e/ff-sketchup-2.cjs    # 2차: 면 밀기끌기·꼭짓점 xy·면 위 도형·면 축 회전·배율 그립·뒤집기·외곽 셸·면 오프셋 (31건)
node tests/minicad-e2e/ff-sketchup-3.cjs    # 3차: 재질(색상·이미지·Shift)·지우개·단면 목록·선택만 보기·애니메이션·그림자·통계·OBJ (24건)
node tests/minicad-e2e/linked-view.cjs      # 연동 뷰 회귀 (부팅 오류 0 · 옛 셸 그대로)
node tests/minicad-csg.cjs                  # 솔리드 도구 CSG 단위 (부피 검증)
```
크롬 경로 `C:/Program Files/Google/Chrome/Application/chrome.exe` (cdp.cjs). ws 는 레포 devDependency.
