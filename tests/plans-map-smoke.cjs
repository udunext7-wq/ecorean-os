// 평면도 카탈로그 첫 화면(지도) 스모크 테스트
// 브라우저 없이 확인할 수 있는 범위: 스크립트가 예외 없이 끝까지 돌고, 첫 화면이 지도이며,
// 단지 묶음·패널 연결에 필요한 DOM 이 실제로 존재하는지.
const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('sites/net/public/catalog/plans/index.html', 'utf8');
const rows = [
  { id: '1', complex_name: 'A아파트', address: '서울 강남구 1', region_sido: '서울', region_gugun: '강남구', area_type: '84A', exclusive_area_m2: 84.9, lat: 37.5, lng: 127.05, image_path: 'lttot/1/a.webp', plan_path: 'lttot/1/a.json', source: 'public', source_note: '건설사 분양홈페이지 공개 평면도 원본' },
  { id: '2', complex_name: 'A아파트', address: '서울 강남구 1', region_sido: '서울', region_gugun: '강남구', area_type: '59A', exclusive_area_m2: 59.4, lat: 37.5, lng: 127.05, image_path: 'lttot/1/b.webp', source: 'public', source_note: '건설사 분양홈페이지 공개 평면도 원본' },
  { id: '3', complex_name: 'B아파트', address: '부산 해운대구 2', region_sido: '부산', region_gugun: '해운대구', area_type: '74B', lat: 35.16, lng: 129.16, image_path: 'lttot/2/c.webp', source: 'public', source_note: '건설사 분양홈페이지 공개 평면도 원본' },
];
const errs = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://ecorean.net/catalog/plans/',
  beforeParse(w) {
    w.fetch = (u, o) => {
      if (String(u).includes('plans_region_counts')) return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify([{ region_sido: '서울', plans: 2, complexes: 1 }])) });
      if (String(u).includes('/floor_plans')) return Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(rows)) });
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
    };
    w.alert = () => {};
    w.onerror = (m) => errs.push(String(m));
    w.addEventListener('error', e => errs.push(String(e.message)));
  },
});
const d = dom.window.document;
setTimeout(() => {
  const fail = [];
  const ck = (c, m) => { if (!c) fail.push(m); };
  ck(!errs.length, '스크립트 오류: ' + errs.slice(0, 2).join(' | '));
  ck(d.getElementById('mapWrap').style.display === '', '첫 화면이 지도가 아님');
  ck(d.querySelector('.wrap:not(#mapWrap)').style.display === 'none', '목록이 숨겨지지 않음');
  ck(d.getElementById('mapBtn').textContent === '📋 목록', '지도 버튼 라벨이 목록 전환이 아님');
  ['cxPanel', 'cxName', 'cxAddr', 'cxList', 'cxClose', 'cxIndex', 'cxIndexList', 'cxIndexMin'].forEach(id => ck(d.getElementById(id), '패널 DOM 없음: ' + id));
  ck(d.getElementById('mapToolbar'), '지도 밖 툴바가 없음');
  ck(d.getElementById('map').children.length === 0, '지도 캔버스 위에 얹은 요소가 있음: ' + d.getElementById('map').innerHTML.slice(0,60));
  ck(d.querySelector('.map-shell'), '3단 배치(map-shell)가 없음');
  const ix = d.querySelectorAll('#cxIndexList .ix');
  ck(ix.length === 2, '지도 위 단지 목록이 2건이 아님: ' + ix.length);
  ck(/A아파트/.test(d.getElementById('cxIndexList').textContent), '목록에 단지명이 없음');
  ck(/서울 강남구/.test(d.getElementById('cxIndexList').textContent), '목록에 주소가 없음');
  const cards = d.querySelectorAll('#grid .card');
  ck(cards.length === 3, '목록 카드 3개가 아님: ' + cards.length);
  // 단지 묶음 로직 단위 검증 — 같은 단지의 여러 평형이 점 하나로 묶여야 한다
  //  (평형마다 점을 찍고 좌표를 밀어내던 옛 방식은 없는 위치에 마커를 만들었다)
  const src = html;
  const grab = name => {
    const i = src.indexOf('function ' + name + '(');
    if (i < 0) return null;
    let depth = 0, j = src.indexOf('{', i);
    for (let k = j; k < src.length; k++) {
      if (src[k] === '{') depth++;
      else if (src[k] === '}') { depth--; if (!depth) return src.slice(i, k + 1); }
    }
    return null;
  };
  const fnSrc = grab('complexKey') + String.fromCharCode(10) + grab('buildComplexes');
  ck(fnSrc.length > 100, '단지 묶음 함수를 찾지 못함');
  const state = { rows, complexes: null, complexByKey: null };
  new Function('state', fnSrc + '; return buildComplexes();')(state);
  ck(state.complexes.length === 2, '단지 묶음 개수가 2가 아님: ' + (state.complexes && state.complexes.length));
  const a = state.complexes.find(c => c.name === 'A아파트');
  ck(a && a.rows.length === 2, 'A아파트 평형 2개로 묶이지 않음');
  ck(a && a.lat === 37.5 && a.lng === 127.05, 'A아파트 좌표가 원본과 다름(좌표를 흔들면 안 된다)');

  if (fail.length) { fail.forEach(m => console.error('  ❌ ' + m)); process.exit(1); }
  console.log('✅ 카탈로그 지도 첫 화면 스모크 통과 (행 3건 · 패널 DOM · 단지 묶음 2건 · 오류 0)');
  process.exit(0);
}, 900);
