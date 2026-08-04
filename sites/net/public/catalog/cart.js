/* 스펙북 장바구니 — 도감 공용 (ecorean-gate.js 의 세션 사용, staff RLS)
   각 도감 카드의 [+ 담기] → window.SB_ADD(item) 호출 → 현재 스펙북에 저장 */
(function () {
  var REF = 'gdcfqbdgubgpzusbtftf';
  var API = 'https://' + REF + '.supabase.co/rest/v1';
  var ANON = 'sb_publishable_LU8lIQH-L5K8B1qwtezCUg_PkcCrAOQ';
  var CUR_KEY = 'ecorean_specbook_current';

  function token() {
    var s = window.ECOREAN_AUTH && window.ECOREAN_AUTH.session;
    return s && s.access_token ? s.access_token : null;
  }
  function hdr() {
    var t = token();
    return { apikey: ANON, Authorization: 'Bearer ' + (t || ANON), 'Content-Type': 'application/json' };
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function authFail() {
    alert('로그인 세션이 만료되었습니다. 업무 허브(/hub)를 한 번 새로고침한 뒤 다시 시도해 주세요.');
  }

  /* ── UI 골격 ── */
  var fab = document.createElement('button');
  fab.id = 'sbFab';
  fab.innerHTML = '📘 <span id="sbCount">0</span>';
  fab.title = '스펙북 장바구니';
  var drawer = document.createElement('div');
  drawer.id = 'sbDrawer';
  drawer.innerHTML =
    '<div class="sb-head"><b>스펙북 장바구니</b><button id="sbClose">✕</button></div>' +
    '<div class="sb-book"><select id="sbBookSel"></select><button id="sbNewBook">+ 새 스펙북</button></div>' +
    '<div id="sbItems" class="sb-items"></div>' +
    '<div class="sb-foot">' +
    '<a id="sbPublish" href="/catalog/specbook/" target="_blank">📄 스펙북 발행 →</a>' +
    '</div>';
  document.body.appendChild(fab);
  document.body.appendChild(drawer);

  var state = { books: [], bookId: localStorage.getItem(CUR_KEY) || '', items: [] };

  function api(path, opts) {
    return fetch(API + path, Object.assign({ headers: hdr() }, opts || {})).then(function (r) {
      if (r.status === 401) { authFail(); throw new Error('401'); }
      if (!r.ok) return r.text().then(function (t) { throw new Error(r.status + ' ' + t.slice(0, 120)); });
      return r.status === 204 ? null : r.json();
    });
  }

  function loadBooks() {
    return api('/spec_books?select=id,name,site_addr&order=updated_at.desc').then(function (rows) {
      state.books = rows || [];
      if (!state.books.some(function (b) { return b.id === state.bookId; })) state.bookId = state.books[0] ? state.books[0].id : '';
      renderBookSel();
      return loadItems();
    });
  }
  function loadItems() {
    if (!state.bookId) { state.items = []; renderItems(); return Promise.resolve(); }
    return api('/spec_book_items?book_id=eq.' + state.bookId + '&select=*&order=sort,created_at').then(function (rows) {
      state.items = rows || []; renderItems();
    });
  }
  function renderBookSel() {
    var sel = document.getElementById('sbBookSel');
    sel.innerHTML = state.books.length
      ? state.books.map(function (b) { return '<option value="' + b.id + '"' + (b.id === state.bookId ? ' selected' : '') + '>' + esc(b.name) + '</option>'; }).join('')
      : '<option value="">스펙북 없음 — 새로 만드세요</option>';
    var pub = document.getElementById('sbPublish');
    pub.href = '/catalog/specbook/' + (state.bookId ? '?book=' + state.bookId : '');
  }
  function renderItems() {
    document.getElementById('sbCount').textContent = state.items.length;
    var el = document.getElementById('sbItems');
    if (!state.items.length) { el.innerHTML = '<div class="sb-empty">담긴 자재가 없습니다.<br>도감 카드의 [+ 담기]를 눌러보세요.</div>'; return; }
    el.innerHTML = state.items.map(function (it) {
      return '<div class="sb-item" data-id="' + it.id + '">' +
        (it.img_url ? '<img src="' + esc(it.img_url) + '" loading="lazy">' : '<div class="sb-noimg">—</div>') +
        '<div class="sb-info"><div class="sb-nm">' + esc(it.name) + '</div>' +
        '<div class="sb-sub">' + esc([it.brand, it.category].filter(Boolean).join(' · ')) + '</div>' +
        '<div class="sb-edit">' +
        '<input class="sb-loc" list="sbLocList" placeholder="적용 위치" value="' + esc(it.location || '') + '">' +
        '<input class="sb-qty" inputmode="decimal" placeholder="수량" value="' + (it.qty != null ? it.qty : '') + '">' +
        '</div></div>' +
        '<button class="sb-del" title="빼기">✕</button></div>';
    }).join('') +
      '<datalist id="sbLocList"><option>전체</option><option>거실</option><option>주방</option><option>욕실</option><option>욕실2</option><option>침실</option><option>현관</option><option>복도</option><option>발코니</option><option>외부</option><option>홀</option></datalist>';
  }

  /* ── 이벤트 ── */
  fab.onclick = function () { drawer.classList.toggle('open'); if (drawer.classList.contains('open')) loadBooks().catch(function(){}); };
  drawer.addEventListener('click', function (e) {
    if (e.target.id === 'sbClose') drawer.classList.remove('open');
    var del = e.target.closest('.sb-del');
    if (del) {
      var id = del.parentElement.dataset.id;
      api('/spec_book_items?id=eq.' + id, { method: 'DELETE' }).then(loadItems).catch(function(){});
    }
  });
  drawer.addEventListener('change', function (e) {
    if (e.target.id === 'sbBookSel') {
      state.bookId = e.target.value; localStorage.setItem(CUR_KEY, state.bookId);
      renderBookSel(); loadItems().catch(function(){});
      return;
    }
    var row = e.target.closest('.sb-item');
    if (!row) return;
    var patch = {};
    if (e.target.classList.contains('sb-loc')) patch.location = e.target.value.trim() || null;
    if (e.target.classList.contains('sb-qty')) { var v = parseFloat(e.target.value); patch.qty = isFinite(v) ? v : null; }
    api('/spec_book_items?id=eq.' + row.dataset.id, { method: 'PATCH', body: JSON.stringify(patch) }).catch(function(){});
  });
  document.getElementById('sbNewBook').onclick = function () {
    var name = prompt('새 스펙북 이름 (프로젝트명):');
    if (!name || !name.trim()) return;
    var email = (window.ECOREAN_AUTH && window.ECOREAN_AUTH.session && window.ECOREAN_AUTH.session.user && window.ECOREAN_AUTH.session.user.email) || null;
    api('/spec_books', { method: 'POST', headers: Object.assign(hdr(), { Prefer: 'return=representation' }), body: JSON.stringify({ name: name.trim(), created_by: email }) })
      .then(function (rows) {
        state.bookId = rows[0].id; localStorage.setItem(CUR_KEY, state.bookId);
        return loadBooks();
      }).catch(function(){});
  };

  /* ── 담기 (도감 카드에서 호출) ── */
  window.SB_ADD = function (item) {
    var go = function () {
      var row = {
        book_id: state.bookId,
        source: item.source, source_key: item.source_key || null,
        name: item.name, brand: item.brand || null, category: item.category || null,
        spec: item.spec || null, img_url: item.img_url || null,
        price: (item.price != null && isFinite(item.price)) ? Math.round(item.price) : null,
        supplier: item.supplier || null,
      };
      api('/spec_book_items', { method: 'POST', body: JSON.stringify(row) }).then(function () {
        loadItems().catch(function(){});
        fab.classList.add('pop'); setTimeout(function () { fab.classList.remove('pop'); }, 350);
      }).catch(function(){});
    };
    if (!state.bookId) {
      loadBooks().then(function () {
        if (!state.bookId) { drawer.classList.add('open'); document.getElementById('sbNewBook').click(); if (state.bookId) go(); }
        else go();
      }).catch(function(){});
    } else go();
  };

  loadBooks().catch(function(){});
})();
