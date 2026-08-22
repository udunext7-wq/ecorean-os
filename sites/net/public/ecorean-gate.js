/* ECOREAN 통합 인증 게이트 v3 — "로그인은 한 번만"
   v2 문제: 액세스 토큰(수명 1h) 만료 시 refresh_token 갱신 없이 무조건 /login 으로 보내
            업무앱 재진입마다 재로그인 발생. /work/ 의 토큰 회전도 쿠키에 반영되지 않아
            허브 세션이 서서히 무효화됐다.
   v3: ① 만료/임박 시 refresh_token 으로 자동 갱신 후 통과
       ② 갱신된 세션을 쿠키(@supabase/ssr 호환 base64-청크 포맷)와 localStorage 에 되써서
          모든 앱·로그인 페이지가 같은 세션을 공유
       ③ REST 401 시 1회 강제 갱신 후 재시도 — 그래도 실패할 때만 /login
       ④ window.ECOREAN_AUTH.{session,write,clear,refresh} 노출 — /work/ 가 토큰 회전을 쿠키에 동기화 */
(function () {
  var REF = 'gdcfqbdgubgpzusbtftf';
  var COOKIE_KEY = 'sb-' + REF + '-auth-token';
  var ANON = 'sb_publishable_LU8lIQH-L5K8B1qwtezCUg_PkcCrAOQ';
  var CHUNK = 3180; // @supabase/ssr 청크 크기

  function readCookie(name) {
    var rows = document.cookie ? document.cookie.split('; ') : [];
    for (var i = 0; i < rows.length; i++) {
      var eq = rows[i].indexOf('=');
      if (rows[i].slice(0, eq) === name) return decodeURIComponent(rows[i].slice(eq + 1));
    }
    return null;
  }

  function rawSession() {
    var v = readCookie(COOKIE_KEY);
    if (!v) {
      var parts = [], i = 0, c;
      while ((c = readCookie(COOKIE_KEY + '.' + i))) { parts.push(c); i++; }
      v = parts.length ? parts.join('') : null;
    }
    if (!v) { try { v = localStorage.getItem(COOKIE_KEY); } catch (e) {} }
    return v;
  }

  function parseSession(v) {
    if (!v) return null;
    try {
      if (v.indexOf('base64-') === 0) {
        var b = v.slice(7).replace(/-/g, '+').replace(/_/g, '/');
        while (b.length % 4) b += '=';
        v = atob(b);
      }
      var s = JSON.parse(v);
      return s && s.access_token ? s : null;
    } catch (e) { return null; }
  }

  function jwtPayload(token) {
    try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
    catch (e) { return null; }
  }

  /* ── 세션 쓰기: @supabase/ssr 호환 (base64- 접두 + 3180자 청크) ── */
  function cookieAttrs() {
    return '; path=/; max-age=34560000; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
  }
  function delCookie(name) { document.cookie = name + '=; path=/; max-age=0'; }
  function writeSession(sess) {
    try {
      if (!sess || !sess.access_token) return;
      var json = JSON.stringify(sess);
      var b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      var val = 'base64-' + b64;
      var i;
      if (val.length <= CHUNK) {
        document.cookie = COOKIE_KEY + '=' + encodeURIComponent(val) + cookieAttrs();
        for (i = 0; i < 12; i++) { if (readCookie(COOKIE_KEY + '.' + i) !== null) delCookie(COOKIE_KEY + '.' + i); }
      } else {
        delCookie(COOKIE_KEY);
        var n = 0;
        for (i = 0; i < val.length; i += CHUNK) {
          document.cookie = COOKIE_KEY + '.' + n + '=' + encodeURIComponent(val.slice(i, i + CHUNK)) + cookieAttrs();
          n++;
        }
        for (i = n; i < 12; i++) { if (readCookie(COOKIE_KEY + '.' + i) !== null) delCookie(COOKIE_KEY + '.' + i); }
      }
      try { localStorage.setItem(COOKIE_KEY, json); } catch (e) {}
      window.ECOREAN_AUTH.session = sess;
    } catch (e) {}
  }
  function clearSession() {
    delCookie(COOKIE_KEY);
    for (var i = 0; i < 12; i++) delCookie(COOKIE_KEY + '.' + i);
    try { localStorage.removeItem(COOKIE_KEY); } catch (e) {}
    window.ECOREAN_AUTH.session = null;
  }

  /* ── 만료 시 refresh_token 으로 갱신 ── */
  function refreshSession(sess) {
    if (!sess || !sess.refresh_token) return Promise.resolve(null);
    return fetch('https://' + REF + '.supabase.co/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: sess.refresh_token })
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (ns) {
      if (!ns || !ns.access_token) return null;
      if (!ns.expires_at && ns.expires_in) ns.expires_at = Math.floor(Date.now() / 1000) + ns.expires_in;
      if (!ns.user && sess.user) ns.user = sess.user;
      writeSession(ns);
      if (window.ECOREAN_AUTH) window.ECOREAN_AUTH.session = ns; /* 2026-08-23: 페이지를 오래 열어둔 앱(app-cloud)이 새 토큰을 쓰도록 메모리 세션도 교체 */
      return ns;
    }).catch(function () { return null; });
  }

  function ensureFresh(sess) {
    if (!sess) return Promise.resolve(null);
    var payload = jwtPayload(sess.access_token);
    var okUntil = payload && payload.exp ? payload.exp * 1000 : 0;
    if (okUntil > Date.now() + 60000) return Promise.resolve(sess); /* 1분 이상 남음 — 그대로 사용 */
    return refreshSession(sess); /* 만료/임박/파싱불가 → 갱신 시도 */
  }

  var session = parseSession(rawSession());
  window.ECOREAN_AUTH = { session: session, write: writeSession, clear: clearSession, refresh: refreshSession,
    /* 2026-08-23: 필요 시 갱신해서 유효 세션 반환 — app-cloud 가 저장 직전에 호출 */
    fresh: function () { return ensureFresh(window.ECOREAN_AUTH.session).then(function (s) { if (s) window.ECOREAN_AUTH.session = s; return s; }); } };

  var gateStyle = document.getElementById('ecorean-gate-style');
  if (!gateStyle) return; // 게이트 없는 페이지(/work/ 등)에서는 세션 유틸 노출만

  function deny() { location.replace('/login?next=' + encodeURIComponent(location.pathname)); }
  function pass() {
    var g = document.getElementById('ecorean-gate-style');
    if (g) g.remove();
  }
  function fetchRole(sess) {
    var uid = (sess.user && sess.user.id) || (jwtPayload(sess.access_token) || {}).sub;
    if (!uid) return Promise.resolve({ status: 0, role: null });
    return fetch('https://' + REF + '.supabase.co/rest/v1/profiles?select=role&id=eq.' + uid, {
      headers: { apikey: ANON, Authorization: 'Bearer ' + sess.access_token }
    }).then(function (r) {
      if (!r.ok) return { status: r.status, role: null };
      return r.json().then(function (rows) { return { status: 200, role: rows && rows[0] && rows[0].role }; });
    }).catch(function () { return { status: 0, role: null }; });
  }
  function finish(res) {
    if (res.role === 'staff' || res.role === 'executive' || res.role === 'admin' || res.role === 'master') pass();
    else if (res.role) location.replace('/request-role/');
    else deny();
  }

  ensureFresh(session).then(function (s) {
    if (!s) return deny();
    fetchRole(s).then(function (res) {
      if (res.status === 401) {
        /* 서버가 거부한 토큰 — 1회 강제 갱신 후 재시도 */
        refreshSession(s).then(function (ns) {
          if (!ns) return deny();
          fetchRole(ns).then(finish);
        });
        return;
      }
      finish(res);
    });
  });
})();
