/* EcoNote 실제 페이지(index.html + econote-editor.js)를 jsdom 으로 띄워 핵심 흐름을 재현한다
   실행: node tests/econote/page-e2e.cjs
   - 가짜 Supabase(REST/Storage)를 fetch 로 끼운다. 외부 script/link 는 뗀다.
   - 편집기 번들은 원래 자리(인라인 스크립트 직전)에 인라인으로 끼워 실제 로딩 순서와 같게 한다
     (beforeParse 에서 평가하면 document.body 가 없어 ProseMirror 가 죽는다) */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const XLSX = require('../../scripts/econote/node_modules/xlsx');
const fflate = require('../../scripts/econote/node_modules/fflate');

const ROOT = path.join(__dirname, '../../sites/net/public/work/notes');
const BUNDLE = fs.readFileSync(path.join(ROOT, 'econote-editor.js'), 'utf8');
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
  const db = { econote_pages: [], econote_versions: [], econote_files: [], econote_user_prefs: [], profiles: [{ id: 'u-kim', display_name: '김직원', role: 'staff', email: 'kim@x' }] };
  const log = [];
  let seq = 0;
  const now = () => new Date().toISOString();
  function parseFilters(qs) {
    const f = [];
    for (const [k, v] of qs) {
      if (['select', 'order', 'limit', 'or', 'on_conflict'].includes(k)) continue;
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
    n.updated_at = new Date(Date.now() + (++seq)).toISOString();
    return n;
  }
  const srv = { db, log, delay: 0, blobs: {} };
  srv.fetch = async function (url, opts) {
    opts = opts || {}; const u = new URL(url); const method = opts.method || 'GET';
    log.push(method + ' ' + u.pathname + u.search);
    const json = (b, st, total) => ({ ok: (st || 200) < 300, status: st || 200, text: async () => (b == null ? '' : JSON.stringify(b)), headers: { get: k => (k === 'content-range' && total != null) ? '0-0/' + total : null } });
    if (srv.delay) await sleep(srv.delay);
    if (u.pathname.startsWith('/storage/v1/')) {
      const p = u.pathname.slice('/storage/v1/'.length);
      if (method === 'POST' && p.startsWith('object/sign/')) { const b = JSON.parse(opts.body); return json(b.paths.map(x => ({ error: null, path: x, signedURL: '/object/sign/econote-media/' + x + '?token=T' }))); }
      if (method === 'POST' && p.startsWith('object/econote-media/')) { srv.blobs[p.slice('object/econote-media/'.length)] = { body: opts.body, type: (opts.headers || {})['Content-Type'] }; return json({ Key: p.slice(7) }); }
      if (method === 'GET' && p.startsWith('object/sign/econote-media/')) { const b = srv.blobs[p.slice('object/sign/econote-media/'.length)]; if (!b) return json({ error: 'nofile' }, 404); return { ok: true, status: 200, arrayBuffer: async () => { if (b.body.arrayBuffer) return b.body.arrayBuffer(); const fr = new srv.win.FileReader(); await new Promise(res => { fr.onload = res; fr.readAsArrayBuffer(b.body); }); return Uint8Array.from(new Uint8Array(fr.result)).buffer; /* jsdom realm 의 ArrayBuffer 는 Node realm 의 XLSX 에서 instanceof 가 실패해 문자열로 취급된다 → 이쪽 realm 으로 복사. 브라우저는 realm 이 하나라 해당 없음 */ }, text: async () => '' }; }
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
    if (method === 'POST') {
      const b = JSON.parse(opts.body); const list = Array.isArray(b) ? b : [b]; const out = [];
      const conflictKey = u.searchParams.get('on_conflict');
      list.forEach(x => {
        if (conflictKey) { const i = rows.findIndex(r => r[conflictKey] === x[conflictKey]); if (i >= 0) { rows[i] = Object.assign({}, rows[i], x); out.push(rows[i]); return; } }
        const r = Object.assign({ id: 'p' + (++seq), rev: 1, created_at: now(), updated_at: now(), deleted_at: null, icon: null, content_text: '', sort_order: 0, props: {} }, x); rows.push(r); out.push(r);
      });
      return json(out, 201);
    }
    if (method === 'PATCH') {
      const b = JSON.parse(opts.body); const hit = rows.filter(r => match(r, f)); const out = [];
      hit.forEach(r => { const n = table === 'econote_pages' ? bumpUpdate(r, b) : Object.assign({}, r, b); rows[rows.indexOf(r)] = n; out.push(n); });
      return json(out);
    }
    if (method === 'DELETE') { const hit = rows.filter(r => match(r, f)); hit.forEach(r => rows.splice(rows.indexOf(r), 1)); return json([]); }
    return json({ message: 'bad' }, 400);
  };
  return srv;
}

function openPage(srv, url) {
  const errors = [], downloads = [];
  const dom = new JSDOM(HTML, {
    url: url || 'https://ecorean.net/work/notes/', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      win.fetch = srv.fetch;
      win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      win.ECOREAN_AUTH = { session: { access_token: 'tk', user: { id: 'u-kim' } }, fresh: () => Promise.resolve({ access_token: 'tk', user: { id: 'u-kim' } }) };
      win.scrollTo = () => {}; win.open = () => null; win.print = () => {};
      win.HTMLElement.prototype.scrollIntoView = function () {};
      win.URL.createObjectURL = () => 'blob:x'; win.URL.revokeObjectURL = () => {};
      const rect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} });
      const rects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} });
      win.Range.prototype.getBoundingClientRect = rect; win.Range.prototype.getClientRects = rects;
      win.Element.prototype.getClientRects = rects;
      win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      win.XLSX = XLSX; win.fflate = fflate; /* CDN 대신 로컬 SheetJS · fflate */
      if (!win.TextDecoder) win.TextDecoder = TextDecoder; if (!win.TextEncoder) win.TextEncoder = TextEncoder;
      const oc = win.HTMLAnchorElement.prototype.click; win.HTMLAnchorElement.prototype.click = function () { if (this.hasAttribute('download')) { downloads.push(this.download); return; } oc.call(this); };
      win.addEventListener('error', e => errors.push(e.message));
    }
  });
  const w = dom.window; srv.win = w;
  return { dom, w, errors, downloads, $: s => w.document.querySelector(s), $$: s => Array.from(w.document.querySelectorAll(s)), E: () => w.__ECONOTE };
}
function key(w, el, k, extra) { el.dispatchEvent(new w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, extra || {}))); }
function dragEvent(w, type, dt) { const e = new w.Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(e, 'dataTransfer', { value: dt }); Object.defineProperty(e, 'clientY', { value: 5 }); return e; }

(async () => {
  console.log('EcoNote page E2E (v2)');
  /* ───── A. 기본 흐름 ───── */
  {
    const srv = makeServer(); const pg = openPage(srv); const { w, $, $$, E } = pg;
    await sleep(150);
    ok(w.EcoTiptap && w.EcoTiptap.Editor && w.EcoTiptap.Callout && w.EcoTiptap.DragHandle, 'A1 번들 전역 EcoTiptap + 확장(Callout·DragHandle)');
    ok(/아직 페이지가 없습니다/.test($('#tree').textContent), 'A1 빈 트리 안내');
    ok($('#meName').textContent === '김직원' && $('#meAv').textContent === '김', 'A1 프로필 이름·아바타');
    $('#newRootBtn').click(); await sleep(150);
    ok(srv.db.econote_pages.length === 1, 'A1 새 페이지 POST');
    ok(E().editor && $('#editor .ProseMirror'), 'A1 편집기 생성');
    ok(!$('#tplBar').classList.contains('hide'), 'A1 빈 페이지엔 템플릿 안내');
    $('#pgTitle').value = '현장 회의록'; $('#pgTitle').dispatchEvent(new w.Event('input'));
    E().editor.commands.setContent('<h2>안건</h2><p>타일 발주 확인</p>');
    ok(E().dirty === true && /저장 안 됨/.test($('#saveSt').textContent), 'A1 입력 후 dirty');
    ok($('#tplBar').classList.contains('hide'), 'A1 입력하면 템플릿 안내 숨김');
    await sleep(1700);
    const row = srv.db.econote_pages[0];
    ok(row.title === '현장 회의록' && row.rev === 2 && /타일 발주 확인/.test(row.content_text), 'A1 자동 저장 rev=2: ' + row.rev);
    ok(srv.db.econote_versions.length === 1 && /현장 회의록/.test($('#tree').textContent), 'A1 이전 버전 보관 + 트리 제목');
    ok(w.document.title.indexOf('현장 회의록') === 0, 'A1 문서 제목 갱신');
    /* 하위 페이지: 트리 hover + 버튼 */
    $('#tree [data-add]').click(); await sleep(150);
    ok(srv.db.econote_pages.length === 2 && srv.db.econote_pages[1].parent_id === row.id, 'A2 하위 페이지 parent_id');
    ok(/현장 회의록/.test($('#crumb').textContent), 'A2 브레드크럼');
    /* 슬래시 */
    E().editor.commands.focus('start');
    key(w, $('#editor .ProseMirror'), '/'); E().editor.commands.insertContent('/'); await sleep(30);
    ok($('#slash').classList.contains('show') && $$('#slash .it').length === 22 && $$('#slash .grp').length === 4, 'A3 슬래시 메뉴 22종 4그룹: ' + $$('#slash .it').length);
    E().editor.commands.insertContent('콜'); await sleep(30);
    ok($$('#slash .it').length === 1 && /콜아웃/.test($('#slash .it').textContent), 'A3 슬래시 필터 "콜"');
    key(w, $('#editor .ProseMirror'), 'Enter'); await sleep(30);
    ok(E().editor.isActive('callout') && !$('#slash').classList.contains('show'), 'A3 Enter → 콜아웃 삽입');
    ok($('#editor div[data-callout] .co-icon') && $('#editor div[data-callout] .co-icon').textContent === '💡', 'A3 콜아웃 렌더(아이콘)');
    E().editor.chain().focus().unsetCallout().run();
    /* 토글·형광펜·글자색·정렬·표 */
    E().editor.chain().focus('end').setDetails().run(); await sleep(20);
    ok($('#editor div[data-type="details"]'), 'A4 토글 블록');
    E().editor.chain().focus('end').insertContentAt(E().editor.state.doc.content.size, '<p>강조</p>').run();
    let tf = 0; E().editor.state.doc.descendants((n, pos) => { if (n.isText && n.text === '강조') tf = pos; });
    E().editor.chain().setTextSelection({ from: tf, to: tf + 2 }).setHighlight({ color: 'var(--hl-y)' }).setColor('#dc2626').setTextAlign('center').run();
    const html = E().editor.getHTML();
    ok(/<mark[^>]*hl-y/.test(html) && /color:\s*#dc2626|color: rgb\(220, 38, 38\)/.test(html) && /text-align:\s*center/.test(html), 'A4 형광펜·글자색·정렬 HTML: ' + html.slice(-220));
    E().editor.chain().focus('end').insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run(); await sleep(30);
    ok($('#bar').classList.contains('in-table') && $$('#editor table th').length === 2, 'A4 표 + 표 도구');
    /* 충돌 */
    await sleep(1700);
    const sub = srv.db.econote_pages[1];
    srv.db.econote_pages[1] = Object.assign({}, sub, { rev: sub.rev + 5, title: '남이 고침' });
    E().editor.commands.insertContent('내 수정'); await sleep(1700);
    ok($('#conflict').classList.contains('show') && /충돌/.test($('#saveSt').textContent), 'A5 rev 불일치 → 충돌 배너');
    $('#cfForce').click(); await sleep(200);
    ok(srv.db.econote_pages[1].content_text.includes('내 수정') && !$('#conflict').classList.contains('show'), 'A5 덮어쓰기');
    /* YouTube */
    E().editor.commands.setYoutubeVideo({ src: 'https://youtu.be/dQw4w9WgXcQ' });
    ok($('#editor iframe') && /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/.test($('#editor iframe').src), 'A6 YouTube 임베드');
    await sleep(1700);
    /* Delete 키 → 휴지통 */
    const node = $('#tree .node.on'); node.focus(); key(w, node, 'Delete'); await sleep(40);
    ok($('#modalBg').classList.contains('show') && /휴지통으로 보내기/.test($('#modalBox').textContent), 'A7 Delete 키 → 확인창');
    $('#mOk').click(); await sleep(200);
    ok(srv.db.econote_pages[1].deleted_at && $('#welcome').style.display === '', 'A7 휴지통으로(soft delete) + 안내 화면');
    $('#trashBtn').click(); await sleep(30);
    ok($('#treeLabel').textContent === '휴지통' && $$('#tree .node').length === 1, 'A7 휴지통 목록 1건');
    $('#tree .node').click(); await sleep(200);
    ok(E().cur && E().cur.deleted_at && $('#pgTitle').readOnly && $('#bar').classList.contains('hide') && !E().editor.isEditable, 'A7 휴지통 페이지 읽기 전용');
    $('#tree [data-more]').click(); await sleep(20);
    ok($('#pop').classList.contains('show') && $('#pop [data-m="restore"]') && $('#pop [data-m="purge"]'), 'A7 휴지통 메뉴 복원/완전삭제');
    $('#pop [data-m="restore"]').click(); await sleep(300);
    ok(!srv.db.econote_pages[1].deleted_at && !$('#pgTitle').readOnly && E().editor.isEditable, 'A7 복원 → 편집 가능');
    /* 검색(빠른 이동) */
    E().quickSwitch(); await sleep(30);
    const qi = $('#qsIn'); qi.value = '타일'; qi.dispatchEvent(new w.Event('input')); await sleep(350);
    ok($$('#qsList .result[data-id]').length >= 1 && /현장 회의록/.test($('#qsList').textContent), 'A8 Ctrl+K 검색 본문 일치');
    key(w, qi, 'Enter'); await sleep(200);
    ok(E().cur.id === row.id, 'A8 Enter → 페이지 열기');
    ok(pg.errors.length === 0, 'A 전역 오류 0: ' + pg.errors.join(' | '));
  }
  /* ───── B. 이미지 · 폴링 · 저장 보호 ───── */
  {
    const srv = makeServer();
    srv.db.econote_pages.push({ id: 'pimg', parent_id: null, title: '사진', rev: 1, icon: '📷', props: {}, content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '현장' }] }, { type: 'image', attrs: { src: '', path: 'pimg/a.webp', alt: 'a' } }] }, content_text: '현장', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null, sort_order: 0 });
    const pg = openPage(srv, 'https://ecorean.net/work/notes/?p=pimg'); const { w, $, $$, E } = pg;
    await sleep(250);
    const img = $('#editor img');
    ok(img && /storage\/v1\/object\/sign\/econote-media\/pimg\/a\.webp\?token=T/.test(img.src), 'B1 딥링크 + 서명 URL: ' + (img && img.src));
    ok($('#pgIcon').textContent === '📷', 'B1 아이콘 표시');
    E().editor.commands.insertContentAt(E().editor.state.doc.content.size, '<p>추가</p>'); await sleep(1700);
    const imgNode = srv.db.econote_pages[0].content.content.find(n => n.type === 'image');
    ok(imgNode && imgNode.attrs.src === '' && imgNode.attrs.path === 'pimg/a.webp', 'B1 저장 문서엔 path 만');
    /* 이미지 선택 → 이미지 도구 → 크기·정렬 */
    let ip = -1; E().editor.state.doc.descendants((n, pos) => { if (n.type.name === 'image') ip = pos; });
    E().editor.commands.setNodeSelection(ip); E().editor.commands.focus(); await sleep(30);
    $('#imgBubble [data-w="50%"]').click(); $('#imgBubble [data-al="center"]').click(); await sleep(20);
    const im2 = E().editor.getJSON().content.find(n => n.type === 'image');
    ok(im2.attrs.width === '50%' && im2.attrs.align === 'center', 'B2 이미지 크기 50%·가운데: ' + JSON.stringify(im2.attrs));
    /* 폴링 */
    await sleep(1700);
    const n0 = srv.log.length; await E().poll(); await sleep(50);
    ok(srv.log.length - n0 === 1 && /limit=1/.test(srv.log[srv.log.length - 1]), 'B3 변화 없으면 프로브 1건');
    srv.db.econote_pages[0] = Object.assign({}, srv.db.econote_pages[0], { rev: 99, title: '남이 바꾼 제목', updated_by_name: '이사님', updated_at: new Date(Date.now() + 5000).toISOString() });
    await E().poll(); await sleep(250);
    ok($('#pgTitle').value === '남이 바꾼 제목' && E().cur.rev === 99 && E().editor.isEditable, 'B3 폴링 반영 + 편집기 재사용');
    /* 요청 중 편집 보존 */
    srv.delay = 250;
    E().editor.commands.insertContentAt(E().editor.state.doc.content.size, '<p>첫 편집</p>'); await sleep(1500);
    E().editor.commands.insertContentAt(E().editor.state.doc.content.size, '<p>요청 중 편집</p>'); await sleep(1200);
    srv.delay = 0;
    ok(/첫 편집/.test(srv.db.econote_pages[0].content_text) && /요청 중 편집/.test(srv.db.econote_pages[0].content_text) && !E().dirty, 'B4 요청 중 편집도 뒤이어 저장');
    /* 충돌 시 이동 중단 */
    srv.db.econote_pages.push({ id: 'p2', parent_id: null, title: '둘째', rev: 1, props: {}, content: { type: 'doc', content: [{ type: 'paragraph' }] }, content_text: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null, sort_order: 1 });
    srv.db.econote_pages[0] = Object.assign({}, srv.db.econote_pages[0], { rev: 500 });
    E().editor.commands.insertContentAt(E().editor.state.doc.content.size, '<p>충돌 편집</p>'); await sleep(50);
    await E().openPage('p2'); await sleep(100);
    ok(E().cur.id === 'pimg' && $('#conflict').classList.contains('show'), 'B5 충돌 시 이동 중단');
    ok(pg.errors.length === 0, 'B 전역 오류 0: ' + pg.errors.join(' | '));
  }
  /* ───── C. 트리 드래그 · 메뉴 · 이름 · 복제 · 즐겨찾기 · 최근 · 설정 · 페이지 설정 · 내보내기 · 목차 ───── */
  {
    const srv = makeServer(); const t = new Date().toISOString();
    ['A', 'B', 'C'].forEach((n, i) => srv.db.econote_pages.push({ id: 'p' + n, parent_id: null, title: '페이지 ' + n, rev: 1, props: {}, content: { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '제목 ' + n }] }, { type: 'paragraph', content: [{ type: 'text', text: '본문 ' + n }] }] }, content_text: '본문 ' + n, created_at: t, updated_at: t, deleted_at: null, sort_order: i, created_by_name: '김직원' }));
    const pg = openPage(srv, 'https://ecorean.net/work/notes/?p=pA'); const { w, $, $$, E } = pg;
    await sleep(250);
    ok($$('#tree .node').length === 3 && E().cur.id === 'pA', 'C0 3페이지 트리');
    /* DOM 드래그: C 를 A 위(가운데 = 하위)로 */
    const nC = $('#tree .node[data-id="pC"]'), nA = $('#tree .node[data-id="pA"]');
    const dt = { effectAllowed: '', dropEffect: '', setData() {}, getData() { return 'pC'; } };
    nC.dispatchEvent(dragEvent(w, 'dragstart', dt)); nA.dispatchEvent(dragEvent(w, 'dragover', dt));
    ok(nA.classList.contains('drop-inside'), 'C1 dragover → 하위 표시');
    nA.dispatchEvent(dragEvent(w, 'drop', dt)); await sleep(250);
    ok(srv.db.econote_pages.find(p => p.id === 'pC').parent_id === 'pA', 'C1 drop → 서버 parent_id=A');
    ok($('#tree li[data-id="pA"] ul .node[data-id="pC"]'), 'C1 트리에서 A 아래에 C');
    /* movePage before: B 를 A 앞으로 → sort_order 재배열 (바뀐 행만 PATCH) */
    const nPatch0 = srv.log.filter(l => l.startsWith('PATCH')).length;
    await E().movePage('pB', 'pA', 'before'); await sleep(100);
    const so = id => srv.db.econote_pages.find(p => p.id === id).sort_order;
    ok(so('pB') === 0 && so('pA') === 1, 'C2 before → B(0) A(1): ' + so('pB') + ',' + so('pA'));
    ok(srv.log.filter(l => l.startsWith('PATCH')).length - nPatch0 === 2, 'C2 바뀐 2행만 PATCH');
    await E().movePage('pA', 'pC', 'inside'); await sleep(50);
    ok(srv.db.econote_pages.find(p => p.id === 'pA').parent_id == null, 'C2 자손 아래로 이동 거부');
    /* 우클릭 메뉴 */
    $('#tree .node[data-id="pB"]').dispatchEvent(new w.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 })); await sleep(20);
    ok($('#pop').classList.contains('show') && $$('#pop [data-m]').length === 10, 'C3 우클릭 메뉴 10항목: ' + $$('#pop [data-m]').length);
    $('#pop [data-m="rename"]').click(); await sleep(30);
    const ri = $('#tree input.rename'); ok(ri && ri.value === '페이지 B', 'C3 이름 바꾸기 인라인 입력');
    ri.value = '페이지 B (개명)'; key(w, ri, 'Enter'); await sleep(150);
    ok(srv.db.econote_pages.find(p => p.id === 'pB').title === '페이지 B (개명)' && /개명/.test($('#tree').textContent), 'C3 이름 PATCH + 트리 반영');
    /* 복제 */
    await E().duplicatePage('pB'); await sleep(200);
    const dup = srv.db.econote_pages.find(p => /\(복사\)$/.test(p.title));
    ok(dup && dup.content_text === '본문 B' && E().cur.id === dup.id, 'C4 복제 → "(복사)" + 본문 동일 + 열림');
    /* 즐겨찾기 · 최근 */
    $('#favBtn').click(); await sleep(50);
    ok(E().prefs.favorites[0] === dup.id && !$('#favSec').classList.contains('hide') && $('#favBtn').textContent === '★', 'C5 즐겨찾기 섹션 + ★');
    await sleep(100);
    ok(srv.db.econote_user_prefs.length === 1 && srv.db.econote_user_prefs[0].favorites[0] === dup.id, 'C5 서버 prefs upsert');
    ok(!$('#recSec').classList.contains('hide') && /페이지 A/.test($('#recTree').textContent), 'C5 최근 섹션에 이전 페이지');
    /* 설정: 테마·글자 크기 → html 속성 + 서버 저장 */
    E().settingsDialog(); await sleep(20);
    $('#modalBox [data-set="theme"] [data-v="light"]').click(); $('#modalBox [data-set="fs"] [data-v="large"]').click(); $('#modalBox [data-sw="showToc"]').click(); await sleep(800);
    ok(w.document.documentElement.getAttribute('data-theme') === 'light' && w.document.documentElement.getAttribute('data-fs') === 'large', 'C6 테마·글자 크기 적용');
    ok(srv.db.econote_user_prefs[0].settings && srv.db.econote_user_prefs[0].settings.theme === 'light', 'C6 설정 서버 저장');
    ok($('#toc').classList.contains('show') && /제목 B/.test($('#tocList').textContent), 'C6 목차 패널에 H2');
    ok(JSON.parse(w.localStorage.getItem('econote_settings')).fs === 'large', 'C6 로컬 캐시');
    $('#modalBox #mCancel').click();
    /* 페이지 설정: 넓게 · 커버 · 잠금 */
    await E().setProps({ wide: true, cover: 'sea' }); await sleep(50);
    ok($('#pageEl').classList.contains('wide') && !$('#cover').classList.contains('hide') && srv.db.econote_pages.find(p => p.id === dup.id).props.cover === 'sea', 'C7 넓게 보기 + 커버 저장');
    await E().setProps({ locked: true }); await E().openPage(dup.id, { force: true }); await sleep(100);
    ok(!E().editor.isEditable && $('#lockBn').classList.contains('show') && $('#pgTitle').readOnly, 'C7 잠금 → 읽기 전용 + 배너');
    $('#unlockBtn').click(); await sleep(200);
    ok(E().editor.isEditable && !$('#lockBn').classList.contains('show'), 'C7 잠금 해제');
    /* 마크다운 내보내기 */
    const md = await E().exportMd(dup.id);
    ok(md && /^## 제목 B/m.test(md.md) && /본문 B/.test(md.md) && pg.downloads[0] === '페이지 B (개명) (복사).md', 'C8 마크다운 + 다운로드 파일명: ' + JSON.stringify(md && md.md) + ' ' + pg.downloads[0]);
    /* 템플릿 삽입 */
    E().editor.commands.setContent('<p></p>'); E().applyTpl('site'); await sleep(20);
    ok($$('#editor table').length === 1 && $('#editor div[data-callout][data-tone="warn"]') && /현장 일지/.test(E().editor.getText()), 'C9 현장 일지 템플릿(표·경고 콜아웃)');
    /* 키보드 트리 이동 */
    const first = $('#tree .node'); first.focus(); key(w, first, 'ArrowDown');
    ok(w.document.activeElement && w.document.activeElement.classList.contains('node') && w.document.activeElement !== first, 'C10 ↓ 로 다음 페이지 포커스');
    /* 사이드바 접기 */
    key(w, w.document.body, '\\', { ctrlKey: true });
    ok($('#shell').classList.contains('sb-off'), 'C10 Ctrl+\\ 사이드바 접기');
    ok(pg.errors.length === 0, 'C 전역 오류 0: ' + pg.errors.join(' | '));
  }
  /* ───── D. 엑셀: 첨부 → 뷰어(시트·병합·숫자) → 표로 넣기 → 표를 엑셀로 → 엑셀 붙여넣기 ───── */
  {
    const srv = makeServer(); const pg = openPage(srv); const { w, $, $$, E } = pg;
    await sleep(150); $('#newRootBtn').click(); await sleep(150);
    const ws = XLSX.utils.aoa_to_sheet([['견적 내역', '', ''], ['품목', '수량', '단가'], ['타일', 10, 12000], ['합계', '', 120000]]);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '견적'); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['b']]), '둘째');
    const buf0 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    /* SheetJS(무료)는 서식을 못 쓰므로 zip 을 풀어 styles.xml 을 갈아 끼우고 셀에 s= 를 붙인다: B3 = 노랑 바탕·빨강 굵게·가운데, C3 = 테마 accent1 tint .5 바탕, A2 = 흰 글자·검정(테마 dk1) 바탕 */
    const z = fflate.unzipSync(new Uint8Array(buf0));
    z['xl/styles.xml'] = fflate.strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><color theme="1"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFF0000"/></font><font><i/><u/><sz val="11"/><color indexed="9"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor theme="4" tint="0.5"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor theme="1"/></patternFill></fill></fills><borders count="1"><border/></borders><cellXfs count="4"><xf fontId="0" fillId="0"/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"><alignment horizontal="center"/></xf><xf fontId="0" fillId="3" applyFill="1"/><xf fontId="2" fillId="4" applyFont="1" applyFill="1"><alignment horizontal="right"/></xf></cellXfs></styleSheet>');
    let sx = fflate.strFromU8(z['xl/worksheets/sheet1.xml']); sx = sx.replace('<c r="B3"', '<c r="B3" s="1"').replace('<c r="C3"', '<c r="C3" s="2"').replace('<c r="A2"', '<c r="A2" s="3"'); z['xl/worksheets/sheet1.xml'] = fflate.strToU8(sx);
    const buf = fflate.zipSync(z).buffer;
    const U8 = w.Uint8Array || Uint8Array; const bytes = new U8(buf.byteLength); bytes.set(new Uint8Array(buf)); /* jsdom Blob 은 다른 realm 의 ArrayBuffer 를 문자열로 취급한다 */
    const file = new w.File([bytes], '견적서.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    await E().uploadFiles([file]); await sleep(100);
    const fnode = E().editor.getJSON().content.find(n => n.type === 'fileBlock');
    ok(fnode && /\.xlsx$/.test(fnode.attrs.path) && fnode.attrs.name === '견적서.xlsx' && fnode.attrs.size === buf.byteLength, 'D1 파일 카드 노드: ' + JSON.stringify(fnode && fnode.attrs));
    ok(Object.keys(srv.blobs).length === 1 && srv.blobs[fnode.attrs.path].type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'D1 버킷 업로드 + 엑셀 MIME');
    ok(srv.db.econote_files.length === 1 && srv.db.econote_files[0].name === '견적서.xlsx', 'D1 첨부 목록 행');
    const card = $('#editor .file-card');
    ok(card && card.querySelector('.fc-icon').textContent === '📊' && $$('.fc-act button', card).map(b => b.textContent).join(',') === '열기,표로 넣기,내려받기', 'D1 카드 렌더(아이콘·버튼): ' + (card && $$('.fc-act button', card).map(b => b.textContent).join(',')));
    /* 뷰어 */
    card.querySelector('[data-file-act="open"]').click(); await sleep(300);
    ok($('#modalBg').classList.contains('show') && $$('#xlTabs button').length === 2 && $('#xlTabs button.on') && $('#xlTabs button.on').textContent === '견적', 'D2 뷰어 시트 탭 2개: ' + ($('#xlSt') && $('#xlSt').textContent));
    if (!$('#xlTabs button.on') || !/4행/.test($('#xlSt').textContent)) { console.log('  D2 abort: tabs=' + $$('#xlTabs button').map(b => b.textContent).join('|') + ' grid=' + $('#xlGrid').textContent.replace(/\s+/g, ' ').slice(0, 200)); ok(false, 'D2 뷰어 내용 이상'); process.exit(1); }
    ok(/4행 × 3열 · 병합 2/.test($('#xlSt').textContent), 'D2 크기·병합 표시: ' + $('#xlSt').textContent);
    const mergedTop = $('#xlGrid td[data-r="0"][data-c="0"]');
    ok(mergedTop && mergedTop.getAttribute('colspan') === '3' && !$('#xlGrid td[data-r="0"][data-c="1"]'), 'D2 병합 셀 colspan=3, 덮인 셀 없음');
    ok($('#xlGrid td[data-r="2"][data-c="1"]').classList.contains('n') && $('#xlGrid td[data-r="2"][data-c="2"]').textContent === '12000', 'D2 숫자 우측 정렬·값');
    ok($$('#xlGrid thead th').length === 4 && $$('#xlGrid thead th')[1].textContent === 'A', 'D2 열 머리글 A,B,C');
    const b3 = $('#xlGrid td[data-r="2"][data-c="1"]').getAttribute('style') || '', c3 = $('#xlGrid td[data-r="2"][data-c="2"]').getAttribute('style') || '', a2 = $('#xlGrid td[data-r="1"][data-c="0"]').getAttribute('style') || '';
    ok(/background:#FFFF00/.test(b3) && /color:#FF0000/.test(b3) && /font-weight:700/.test(b3) && /text-align:center/.test(b3), 'D2 셀 서식 B3 노랑 바탕·빨강 굵게·가운데: ' + b3);
    const c3m = /background:#([0-9A-F]{6})/.exec(c3); const c3r = c3m ? parseInt(c3m[1].slice(0, 2), 16) : 0, c3b = c3m ? parseInt(c3m[1].slice(4, 6), 16) : 0;
    ok(c3m && c3r > 0x80 && c3r < 0xC0 && c3b > 0xC8 && c3b > c3r, 'D2 테마 accent1 + tint .5 → 연한 파랑(원색 4472C4 보다 밝고 파란 기 유지): ' + c3);
    ok(/background:#000000/.test(a2) && /color:#FFFFFF/.test(a2) && /font-style:italic/.test(a2) && /underline/.test(a2) && /text-align:right/.test(a2), 'D2 셀 서식 A2 검정 바탕·흰 글자(indexed 9)·기울임·밑줄·우측: ' + a2);
    ok(/셀 서식 3/.test($('#xlSt').textContent), 'D2 상태 문구에 셀 서식 수: ' + $('#xlSt').textContent);
    ok(E().xlTint('4472C4', 0.5).length === 6 && E().xlTint('808080', -0.5) === '404040', 'D2 tint 계산: ' + E().xlTint('808080', -0.5));
    $$('#xlTabs button')[1].click(); await sleep(30);
    ok($('#xlTabs button.on').textContent === '둘째' && $('#xlGrid td[data-r="0"][data-c="0"]').textContent === 'b', 'D2 시트 전환');
    $$('#xlTabs button')[0].click(); await sleep(30);
    /* 표로 넣기: 2행부터(머리글 품목) */
    $('#xlR0').value = '2'; $('#xlInsert').click(); await sleep(100);
    const tbl = $('#editor table');
    ok(tbl && $$('tr', tbl).length === 3 && $$('th', tbl).length === 3 && $$('th', tbl)[0].textContent === '품목', 'D3 표로 넣기 → 3행, 머리글 품목/수량/단가');
    ok($('#editor table td[colspan="2"]') && $('#editor table td[colspan="2"]').textContent === '합계', 'D3 병합 → colspan=2 합계');
    ok(!$('#modalBg').classList.contains('show'), 'D3 모달 닫힘');
    /* 표 → 엑셀 */
    let tnode = null; E().editor.state.doc.descendants(n => { if (n.type.name === 'table' && !tnode) tnode = n; });
    const t = E().tableToAoa(tnode);
    ok(t.aoa.length === 3 && t.aoa[1][1] === 10 && t.aoa[1][2] === 12000 && t.merges.length === 1 && t.merges[0].e.c === 1, 'D4 표 → aoa(숫자 변환·병합): ' + JSON.stringify(t));
    await E().tableToXlsx(tnode, '견적표'); await sleep(50);
    ok(pg.downloads.indexOf('견적표.xlsx') >= 0, 'D4 엑셀 내려받기 파일명: ' + pg.downloads.join(','));
    /* 엑셀 붙여넣기(클립보드 HTML 표) → 노트 표 */
    E().editor.chain().focus('end').insertContent('<table><tr><td>a</td><td>b</td></tr><tr><td>1</td><td>2</td></tr></table>').run(); await sleep(20);
    ok($$('#editor table').length === 2 && $$('#editor table')[1].querySelectorAll('td').length === 4, 'D5 HTML 표 붙여넣기 → 표 2×2');
    /* 자동 저장에 파일 카드가 남고, 마크다운 내보내기도 통과 */
    await sleep(1700);
    ok(srv.db.econote_pages[0].content.content.some(n => n.type === 'fileBlock'), 'D6 저장 문서에 파일 카드');
    const md = await E().exportMd(srv.db.econote_pages[0].id);
    ok(md && /견적서\.xlsx/.test(md.md) && /품목/.test(md.md), 'D6 마크다운에 파일명·표: ' + JSON.stringify(md && md.md.slice(0, 120)));
    /* 허용 안 되는 파일 */
    await E().uploadFiles([new w.File(['x'], '악성.exe', { type: 'application/octet-stream' })]); await sleep(30);
    ok(Object.keys(srv.blobs).length === 1 && /엑셀/.test($('#toast').textContent), 'D7 exe 거부: ' + $('#toast').textContent);
    ok(pg.errors.length === 0, 'D 전역 오류 0: ' + pg.errors.join(' | '));
  }
  console.log('  ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
