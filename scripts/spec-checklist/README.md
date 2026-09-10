# 공종별 시방서 체크리스트 생성기

`sites/net/public/spec/{carpentry,painting,tilework}/index.html` 을 만들어 낸 도구다.
기계설비 체크리스트(`spec/mechanical/index.html`, v3)를 **골격**으로 삼고 **데이터 계층과 UI 문구만** 갈아끼운다.
CSS·모듈 구조·렌더 함수·이벤트 핸들러는 공종과 무관하므로 건드리지 않는다.

원본 스킬은 `F:\ECOREAN\개발프로그램\시방서체킹\boc-construction-checklist.zip` (SKILL.md + trades/*.md).

## 쓰는 법

```bash
cd scripts/spec-checklist
python build_spec.py                                   # 3종 생성 (덮어쓴다)
NODE_PATH=../../node_modules node validate.js carpentry painting tilework
NODE_PATH=../../node_modules node boot.js     carpentry painting tilework
```

`validate.js` 는 JS 구문·태그 균형·탭/페이지 수·데이터 계층 수치·저장소 키 격리를 본다.
`boot.js` 는 jsdom 으로 실제 부팅시켜 렌더까지 도는지, 콘솔 오류가 없는지 본다.
둘 다 기존 운영 파일(mechanical·interior·electrical)도 통과해야 한다 — 회귀 기준선이다.

## 공종을 추가할 때

`data_<trade>.py` 를 하나 더 만들고 `build_spec.py` 의 import 목록에 넣는다. 필요한 키는 기존 파일을 보면 된다.
빠뜨리면 빌드가 KeyError 로 죽으므로 조용히 잘못 나가지 않는다.

**작성 전에 법규를 검색할 것.** 학습된 기억으로 KCS 번호를 쓰지 않는다 — 개정이 잦다.
이번 3종의 근거는 KCS 41 33 01(목공사 일반)·KCS 41 47 00:2023(도장공사)·KCS 41 48 01(타일공사),
하자담보책임기간은 건설산업기본법 시행령 별표4다.

## 함정 두 개

1. **문자열 치환 순서.** 긴 문장이 짧은 문구를 품고 있다(`[ + 슬리브 추가 ]` ⊂ 빈 목록 안내문,
   `디퓨저·실외기 위치도` ⊂ 계약서 조항). 짧은 것을 먼저 바꾸면 긴 것이 매칭에 실패한다 →
   짧은 공통어는 목록 맨 뒤에 둔다. 치환 대상이 0건이면 빌드가 죽으므로 순서가 틀리면 바로 드러난다.
2. **저장소 이름공간.** 세 페이지가 같은 도메인(ecorean.net)에 올라가므로
   `<trade>-checklist-state` 와 `photo:<trade>:` 로 반드시 갈라야 한다.
   원본은 사진을 `photo:` 하나에 몰아넣고 초기화 때 `storage.list('photo:')` 로 전부 지우기 때문에,
   갈라 두지 않으면 **한 공종을 초기화할 때 다른 공종 사진까지 날아간다.** `validate.js` 가 이걸 검사한다.
