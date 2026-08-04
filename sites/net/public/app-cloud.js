/* ECOREAN 공용 클라우드 문서 저장소 (2026-08-05)
   모든 업무앱이 하나의 서버(app_documents)에 저장·공유. ecorean-gate.js 의 세션 사용.
   window.APP_CLOUD.list/save/load/remove(app, ...) — Promise 반환. 인증 실패 시 reject.
   staff RLS 로 보호되므로 로그인한 직원만 읽고 쓸 수 있다. */
(function () {
  var REF = 'gdcfqbdgubgpzusbtftf';
  var API = 'https://' + REF + '.supabase.co/rest/v1/app_documents';
  var ANON = 'sb_publishable_LU8lIQH-L5K8B1qwtezCUg_PkcCrAOQ';

  function token() {
    var s = window.ECOREAN_AUTH && window.ECOREAN_AUTH.session;
    return s && s.access_token ? s.access_token : null;
  }
  function email() {
    var s = window.ECOREAN_AUTH && window.ECOREAN_AUTH.session;
    return s && s.user && s.user.email ? s.user.email : null;
  }
  function hdr(extra) {
    var t = token();
    var h = { apikey: ANON, Authorization: 'Bearer ' + (t || ANON), 'Content-Type': 'application/json' };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }
  function req(path, opts) {
    if (!token()) return Promise.reject(new Error('NO_SESSION'));
    return fetch(API + path, Object.assign({ headers: hdr(opts && opts.headers) }, opts || {})).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(r.status + ' ' + t.slice(0, 140)); });
      return r.text().then(function (t) { return t ? JSON.parse(t) : null; });
    });
  }
  function enc(v) { return encodeURIComponent(v); }

  window.APP_CLOUD = {
    ready: function () { return !!token(); },
    email: email,
    // 목록 (제목·수정일만, data 제외 → 가벼움)
    list: function (app) {
      return req('?app=eq.' + enc(app) + '&select=doc_key,title,updated_by,updated_at&order=updated_at.desc');
    },
    // 단건 로드
    load: function (app, docKey) {
      return req('?app=eq.' + enc(app) + '&doc_key=eq.' + enc(docKey) + '&select=*&limit=1')
        .then(function (rows) { return rows && rows[0] ? rows[0] : null; });
    },
    // 저장(업서트) — app+doc_key 기준
    save: function (app, docKey, title, data) {
      var now = new Date().toISOString();
      var row = { app: app, doc_key: docKey, title: title || null, data: data, updated_by: email(), updated_at: now };
      return req('?on_conflict=app,doc_key', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify([row]),
      }).then(function (rows) { return rows && rows[0] ? rows[0] : null; });
    },
    remove: function (app, docKey) {
      return req('?app=eq.' + enc(app) + '&doc_key=eq.' + enc(docKey), { method: 'DELETE' });
    },
  };
})();
