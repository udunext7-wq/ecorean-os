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
  function hdr(extra, t) {
    var h = { apikey: ANON, Authorization: 'Bearer ' + (t || token() || ANON), 'Content-Type': 'application/json' };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }
  /* ── 2026-08-23 저장 안정화 ──
     원인: 게이트가 페이지 로드 때만 토큰을 갱신 → 에디터를 1시간 넘게 열어두면 만료된 토큰으로 저장 → 401 실패.
     조치: ① 요청 직전 만료(60초 전) 감지 시 refresh_token 으로 선갱신  ② 401 응답이면 강제 갱신 후 1회 재시도
           ③ 25초 타임아웃  ④ 네트워크 단절(TypeError)은 1.5초 후 1회 재시도  ⑤ 오류 메시지 한글화 */
  function jwtExpMs(t) {
    try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch (e) { return 0; }
  }
  function freshToken(force) {
    var A = window.ECOREAN_AUTH, s = A && A.session;
    if (!s || !s.access_token) return Promise.resolve(null);
    if (!force && jwtExpMs(s.access_token) > Date.now() + 60000) return Promise.resolve(s.access_token);
    var p = A.fresh ? A.fresh() : (A.refresh ? A.refresh(s).then(function (ns) { if (ns) A.session = ns; return ns; }) : Promise.resolve(s));
    return p.then(function (ns) { return ns && ns.access_token ? ns.access_token : null; });
  }
  function friendly(status, body) {
    if (status === 401) return '로그인이 만료되었습니다. 페이지를 새로고침한 뒤 다시 로그인해 주세요.';
    if (status === 403) return '저장 권한이 없습니다 (직원 계정으로 로그인했는지 확인).';
    if (status === 413 || status === 502 || status === 520 || status === 524) return '문서 용량이 너무 큽니다. 이미지를 줄이거나 나눠 저장해 주세요. (' + status + ')';
    return status + ' ' + (body || '').slice(0, 140);
  }
  function req(path, opts, _retried) {
    return freshToken(false).then(function (t) {
      if (!t) throw new Error('로그인 세션이 없습니다. 업무시스템 로그인 후 이용해 주세요.');
      var o = Object.assign({}, opts || {});
      o.headers = hdr(o.headers, t); // 인증 헤더가 opts.headers(Prefer 등)에 덮이지 않도록 마지막에 병합
      var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      if (ctl) { o.signal = ctl.signal; setTimeout(function () { ctl.abort(); }, 25000); }
      return fetch(API + path, o).then(function (r) {
        if (r.status === 401 && !_retried) {
          return freshToken(true).then(function (nt) {
            if (!nt) throw new Error(friendly(401, ''));
            return req(path, opts, true);
          });
        }
        if (!r.ok) return r.text().then(function (t2) { throw new Error(friendly(r.status, t2)); });
        return r.text().then(function (t2) { return t2 ? JSON.parse(t2) : null; });
      }).catch(function (err) {
        var networky = (err && (err.name === 'AbortError' || err.name === 'TypeError' || /Failed to fetch|NetworkError/i.test(err.message || '')));
        if (networky && !_retried) {
          return new Promise(function (res) { setTimeout(res, 1500); }).then(function () { return req(path, opts, true); });
        }
        if (err && err.name === 'AbortError') throw new Error('서버 응답이 없습니다 (25초 초과). 네트워크 확인 후 다시 시도해 주세요.');
        throw err;
      });
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
