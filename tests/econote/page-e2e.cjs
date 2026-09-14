/* EcoNote 실제 페이지(index.html + econote-editor.js)를 jsdom 으로 띄워 핵심 흐름을 재현한다
   실행: node tests/econote/page-e2e.cjs
   - 가짜 Supabase(REST/Storage)를 fetch 로 끼운다. 외부 script/link 는 뗀다.
   - 편집기 번들은 원래 자리(인라인 스크립트 직전)에 인라인으로 끼워 실제 로딩 순서와 같게 한다 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '../../sites/net/public/work/notes');
const BUNDLE = fs.readFileSync(path.join(ROOT, 'econote-editor.js'), 'utf8');
/* 번들은 실제와 같은 자리(인라인 스크립트 직전)에서 평가한다 — beforeParse 시점엔 document.body 가 없어 ProseMirror 가 죽는다 */
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .replace(/<style id="ecorean-gate-style">[^<]*<\/style>/, '')
  .replace(/<script[^>]*src="\/work\/notes\/econote-editor\.js[^"]*"><\/script>/, () => '<script>' + BUNDLE + '</script>')
  .replace(/<script src="[^"]*"><\/script>/g, '')
  .replace(/<link[^>]*>/g, '');

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ── 가짜 서버 ── */
function makeServer() {
  const db = { econote_pages: [], econote_versions: [], econote_files: [], profiles: [{ id: 'u-kim', display_name: '김직원', role: 'staff', email: 'kim@x' }] };
  const log = [];
  let seq = 0;
  const now = () => new Date().toISOString();
  function parseFilters(qs) {
    const f = [];
    for (const [k, v] of qs) {
      if (['select', 'order', 'limit', 'or'].includes(k)) continue;
      const m = v.match(/^(eq|is|in)\.(.*)$/); if (!m) continue;
      f.push({ k, op: m[1], v: m[2] });
    }
    return f;
  }
  function match(row, f) {
    return f.every(x => {
      const val = row[x.k];
      if (x.op === 'eq') return String(val) === x.v;
      if (x.op === 'is') return x.v === 'null' ? val == null : val != null;
      if (x.op === 'in') return x.v.slice(1, -1).split(',').includes(String(val));
      return true;
    });
  }
  function bumpUpdate(old, patch) {
    const n = Object.assign({}, old, patch);
    if (JSON.stringify(n.content) !== JSON.stringify(old.content) || n.title !== old.title) {
      db.econote_versions.push({ id: ++seq, page_id: old.id, rev: old.rev, title: old.title, content: old.content, saved_by: old.updated_by, saved_by_name: old.updated_by_name, saved_at: now() });
      n.rev = old.rev + 1;
    }
    n.updated_at = now();
    return n;
  }
  async function fetch(url, opts) {
    opts = opts || {}; const u = new URL(url); const method = opts.method || 'GET';
    log.push(method + ' ' + u.pathname + u.search);
    const json = (b, st, total) => ({ ok: (st || 200) < 300, status: st || 200, text: async () => (b == null ? '' : JSON.stringify(b)), headers: { get: k => (k === 'content-range' && total != null) ? '0-0/' + total : null } });
    if (srv.delay) await sleep(srv.delay);
    if (u.pathname.startsWith('/storage/v1/')) {
      const p = u.pathname.slice('/storage/v1/'.length);
      if (p.startsWith('object/sign/')) { const b = JSON.parse(opts.body); return json(b.paths.map(x => ({ error: null, path: x, signedURL: '/object/sign/econote-media/' + x + '?token=T' }))); }
      if (method === 'POST' && p.startsWith('object/econote-media/')) return json({ Key: p.slice(7) });
      if (method === 'DELETE') return json([]);
      return json({ error: 'nope' }, 404);
    }
    const table = u.pathname.replace('/rest/v1/', '');
    const rows = db[table]; if (!rows) return json({ message: 'no table ' + table }, 404);
    const f = parseFilters(u.searchParams);
    if (method === 'GET') {
      let out = rows.filter(r => match(r, f));
      const or = u.searchParams.get('or');
      if (or) { const q = decodeURIComponent(or).match(/ilike\.\*(.*?)\*/)[1].toLowerCase(); out = out.filter(r => (r.title || '').toLowerCase().includes(q) || (r.content_text || '').toLowerCase().includes(q)); }
      const ord = u.searchParams.get('order'); if (ord && ord.startsWith('updated_at.desc')) out = out.slice().sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
      const lim = parseInt(u.searchParams.get('limit') || '0', 10);
      return json(lim ? out.slice(0, lim) : out, 200, out.length);
    }
    if (method === 'POST') { const b = JSON.parse(opts.body); const r = Object.assign({ id: 'p' + (++seq), rev: 1, created_at: now(), updated_at: now(), deleted_at: null, icon: null, content_text: '', sort_order: 0 }, b); rows.push(r); return json([r], 201); }
    if (method === 'PATCH') {
      const b = JSON.parse(opts.body); const hit = rows.filter(r => match(r, f)); const out = [];
      hit.forEach(r => { const n = table === 'econote_pages' ? bumpUpdate(r, b) : Object.assign({}, r, b); rows[rows.indexOf(r)] = n; out.push(n); });
      return json(out);
    }
    if (method === 'DELETE') { const hit = rows.filter(r => match(r, f)); hit.forEach(r => rows.splice(rows.indexOf(r), 1)); return json([]); }
    return json({ message: 'bad' }, 400);
  }
  const srv = { db, log, fetch, delay: 0 };
  return srv;
}

function openPage(srv, url) {
  const errors = [];
  const dom = new JSDOM(HTML, {
    url: url || 'https://ecorean.net/work/notes/', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      win.fetch = srv.fetch;
      win.ECOREAN_AUTH = { session: { access_token: 'tk', user: { id: 'u-kim' } }, fresh: () => Promise.resolve({ access_token: 'tk', user: { id: 'u-kim' } }) };
      win.scrollTo = () => {};
      win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      win.HTMLElement.prototype.scrollIntoView = function () {};
      win.URL.createObjectURL = () => 'blob:x'; win.URL.revokeObjectURL = () => {};
      const rect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} });
      const rects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} });
      win.Range.prototype.getBoundingClientRect = rect; win.Range.prototype.getClientRects = rects;
      win.Element.prototype.getClientRects = rects;
      win.addEventListener('error', e => errors.push(e.message));
    }
  });
  const w = dom.window;
  return { dom, w, errors, $: s => w.document.querySelector(s), E: () => w.__ECONOTE };
}

(async () => {
  console.log('EcoNote page E2E');
  /* 1. 빈 상태 부팅 → 안내문 → 새 페이지 → 제목 입력 → 자동 저장 */
  {
    const srv = makeServer(); const pg = openPage(srv); const { w, $, E } = pg;
    await sleep(120);
    ok(w.EcoTiptap && w.EcoTiptap.Editor, '1 번들 전역 EcoTiptap 존재');
    ok(/아직 페이지가 없습니다/.test($('#tree').textContent), '1 빈 트리 안내');
    ok($('#meName').textContent === '김직원', '1 프로필 이름 표시');
    $('#newRootBtn').click(); await sleep(120);
    ok(srv.db.econote_pages.length === 1, '1 새 페이지 POST');
    ok(E().editor && $('#editor .ProseMirror'), '1 편집기 생성');
    ok($('#pageEl').style.display === '' && $('#welcome').style.display === 'none', '1 페이지 화면 전환');
    $('#pgTitle').value = '현장 회의록'; $('#pgTitle').dispatchEvent(new w.Event('input'));
    E().editor.commands.setContent('<h2>안건</h2><p>타일 발주 확인</p>');
    ok(E().dirty === true && /저장 안 됨/.test($('#saveSt').textContent), '1 입력 후 dirty');
    await sleep(1700);
    const row = srv.db.econote_pages[0];
    ok(row.title === '현장 회의록' && row.rev === 2 && /타일 발주 확인/.test(row.content_text), '1 자동 저장(PATCH) 반영 rev=2: ' + row.rev);
    ok(/저장됨/.test($('#saveSt').textContent), '1 저장됨 표시');
    ok(srv.db.econote_versions.length === 1, '1 이전 버전 1건 보관');
    ok(/현장 회의록/.test($('#tree').textContent), '1 트리 제목 갱신');
    /* 2. 하위 페이지 + 브레드크럼 */
    $('#subBtn').click(); await sleep(120);
    ok(srv.db.econote_pages.length === 2 && srv.db.econote_pages[1].parent_id === row.id, '2 하위 페이지 parent_id');
    ok(/현장 회의록/.test($('#crumb').textContent), '2 브레드크럼에 상위 제목');
    /* 3. 슬래시 메뉴 */
    E().editor.commands.focus('start');
    $('#editor .ProseMirror').dispatchEvent(new w.KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    E().editor.commands.insertContent('/'); await sleep(30);
    ok($('#slash').classList.contains('show') && $('#slash .it'), '3 슬래시 메뉴 열림');
    E().editor.commands.insertContent('표'); await sleep(30);
    ok($('#slash .it') && /표/.test($('#slash .it').textContent) && $('#slash').querySelectorAll('.it').length === 1, '3 슬래시 필터');
    $('#editor .ProseMirror').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await sleep(30);
    ok(E().editor.isActive('table') && !$('#slash').classList.contains('show'), '3 Enter → 표 삽입, "/표" 텍스트 제거: ' + E().editor.getText());
    ok($('#bar').classList.contains('in-table'), '3 표 안에서 표 도구 노출');
    /* 4. 충돌 감지: 서버가 먼저 바뀐 뒤 저장 → 배너 */
    await sleep(1700);
    const sub = srv.db.econote_pages[1];
    srv.db.econote_pages[1] = Object.assign({}, sub, { rev: sub.rev + 5, title: '남이 고침' });
    E().editor.commands.insertContent('내 수정'); await sleep(1700);
    ok($('#conflict').classList.contains('show') && /충돌/.test($('#saveSt').textContent), '4 rev 불일치 → 충돌 배너');
    $('#cfForce').click(); await sleep(200);
    ok(srv.db.econote_pages[1].content_text.includes('내 수정') && !$('#conflict').classList.contains('show'), '4 덮어쓰기 → 서버 반영·배너 닫힘');
    /* 5. YouTube → 임베드 */
    E().editor.commands.setYoutubeVideo({ src: 'https://youtu.be/dQw4w9WgXcQ' });
    ok($('#editor iframe') && /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/.test($('#editor iframe').src), '5 YouTube 임베드 iframe: ' + ($('#editor iframe') && $('#editor iframe').src));
    ok(w.EcoTiptap.isValidYoutubeUrl('https://www.youtube.com/watch?v=abc123XYZ_-') && !w.EcoTiptap.isValidYoutubeUrl('https://vimeo.com/1'), '5 YouTube 주소 판별');
    /* 6. 휴지통 → 목록 → 복원 */
    await sleep(1700);
    $('#delBtn').click(); await sleep(30); $('#mOk').click(); await sleep(150);
    ok(srv.db.econote_pages[1].deleted_at && $('#welcome').style.display === '', '6 휴지통으로(soft delete)');
    $('#trashBtn').click(); await sleep(30);
    ok($('#tree .node') && /제목 없음/.test($('#tree .node').textContent) && $('#treeLabel').textContent === '휴지통' && $('#tree').querySelectorAll('.node').length === 1, '6 휴지통 목록(지운 하위 페이지 1건만): ' + $('#tree').textContent);
    $('#tree .node').click(); await sleep(150);
    ok(E().cur && E().cur.deleted_at && $('#pgTitle').readOnly && $('#bar').style.display === 'none', '6 휴지통 페이지는 읽기 전용');
    $('#delBtn').click(); await sleep(30); $('#mRestore').click(); await sleep(250);
    ok(!srv.db.econote_pages[1].deleted_at && !$('#pgTitle').readOnly, '6 복원 → 편집 가능');
    /* 7. 검색 */
    $('#q').value = '타일'; $('#q').dispatchEvent(new w.Event('input')); await sleep(350);
    ok($('#tree .result') && /현장 회의록/.test($('#tree .result').textContent), '7 본문 검색 결과');
    ok(pg.errors.length === 0, '전역 오류 0: ' + pg.errors.join(' | '));
  }
  /* 8. 서버 이미지: path → 서명 URL 로 복원해서 열기, 저장 시 src 제거 */
  {
    const srv = makeServer();
    srv.db.econote_pages.push({ id: 'pimg', parent_id: null, title: '사진', rev: 1, icon: '📷', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '현장' }] }, { type: 'image', attrs: { src: '', path: 'pimg/a.webp', alt: 'a' } }] }, content_text: '현장', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null, sort_order: 0 });
    const pg = openPage(srv, 'https://ecorean.net/work/notes/?p=pimg'); const { w, $, E } = pg;
    await sleep(200);
    const img = $('#editor img');
    ok(img && /storage\/v1\/object\/sign\/econote-media\/pimg\/a\.webp\?token=T/.test(img.src), '8 딥링크 열기 + 서명 URL 주입: ' + (img && img.src));
    ok(srv.log.some(l => /POST \/storage\/v1\/object\/sign\/econote-media/.test(l)), '8 일괄 서명 요청');
    ok($('#pgIcon').textContent === '📷', '8 아이콘 표시');
    E().editor.commands.insertContentAt(E().editor.state.doc.content.size, '<p>추가</p>'); await sleep(1700);
    const saved = srv.db.econote_pages[0].content;
    const imgNode = saved.content.find(n => n.type === 'image');
    ok(imgNode && imgNode.attrs.src === '' && imgNode.attrs.path === 'pimg/a.webp', '8 저장 문서에는 서명 URL 대신 path 만: ' + JSON.stringify(imgNode && imgNode.attrs));
    /* 9. 폴링: 다른 직원 수정 → 화면 갱신 */
    const n0 = srv.log.length; await E().poll(); await sleep(50);
    ok(srv.log.length - n0 === 1 && /limit=1/.test(srv.log[srv.log.length - 1]), '9 변화 없으면 폴링은 프로브 1건으로 끝: ' + srv.log.slice(n0).join(' | '));
    srv.db.econote_pages[0] = Object.assign({}, srv.db.econote_pages[0], { rev: 99, title: '남이 바꾼 제목', updated_by_name: '이사님', updated_at: new Date(Date.now() + 5000).toISOString() });
    $('#paper').scrollTop = 300;
    const n1 = srv.log.length; await E().poll(); await sleep(200);
    ok($('#pgTitle').value === '남이 바꾼 제목' && E().cur.rev === 99, '9 폴링으로 남의 수정 반영');
    ok(srv.log.slice(n1).length === 3 && /limit=1/.test(srv.log[n1]), '9 변화 있으면 프로브→목록→페이지 3건: ' + srv.log.slice(n1).join(' | '));
    ok($('#editor .ProseMirror') && E().editor.isEditable, '9 편집기 재사용(파괴 없이 문서 교체)');
    /* 10. 저장 요청이 나가 있는 동안의 편집은 유실되지 않는다 */
    srv.delay = 250;
    E().editor.commands.insertContentAt(E().editor.state.doc.content.size, '<p>첫 편집</p>'); await sleep(1500);
    E().editor.commands.insertContentAt(E().editor.state.doc.content.size, '<p>요청 중 편집</p>'); await sleep(1200);
    srv.delay = 0;
    ok(/첫 편집/.test(srv.db.econote_pages[0].content_text) && /요청 중 편집/.test(srv.db.econote_pages[0].content_text) && !E().dirty, '10 요청 중 편집도 뒤이어 저장: ' + JSON.stringify(srv.db.econote_pages[0].content_text.slice(-30)) + ' dirty=' + E().dirty);
    /* 11. 충돌이 걸린 상태에서는 다른 페이지로 이동하지 않는다(미저장분 보호) */
    srv.db.econote_pages.push({ id: 'p2', parent_id: null, title: '둘째', rev: 1, content: { type: 'doc', content: [{ type: 'paragraph' }] }, content_text: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null, sort_order: 1 });
    srv.db.econote_pages[0] = Object.assign({}, srv.db.econote_pages[0], { rev: 500 });
    E().editor.commands.insertContentAt(E().editor.state.doc.content.size, '<p>충돌 편집</p>'); await sleep(50);
    await E().openPage('p2'); await sleep(100);
    ok(E().cur.id === 'pimg' && $('#conflict').classList.contains('show'), '11 충돌 시 이동 중단 + 배너: cur=' + E().cur.id);
    ok(pg.errors.length === 0, '전역 오류 0: ' + pg.errors.join(' | '));
  }
  console.log('  ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
