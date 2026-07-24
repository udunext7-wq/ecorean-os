/* ECOREAN 통합 인증 게이트 v2 — 업무시스템 로그인(@supabase/ssr 쿠키 세션)과 SSO
   기존 v1 게이트는 localStorage 세션만 확인해 허브 로그인 후에도 재로그인을 요구했다.
   v2는 쿠키(청크·base64 인코딩 대응) → localStorage 순으로 세션을 읽고,
   profiles.role 이 staff/admin/master 면 통과, visitor 는 승급 신청으로, 비로그인은 /login 으로 보낸다. */
(function () {
  var REF = 'gdcfqbdgubgpzusbtftf';
  var COOKIE_KEY = 'sb-' + REF + '-auth-token';
  var ANON = 'sb_publishable_LU8lIQH-L5K8B1qwtezCUg_PkcCrAOQ';

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

  var session = parseSession(rawSession());
  window.ECOREAN_AUTH = { session: session };

  var gateStyle = document.getElementById('ecorean-gate-style');
  if (!gateStyle) return; // 게이트 없는 페이지에서는 세션 노출만

  function deny() { location.replace('/login?next=' + encodeURIComponent(location.pathname)); }

  (function run() {
    if (!session) return deny();
    var payload = jwtPayload(session.access_token);
    if (!payload || payload.exp * 1000 < Date.now() + 30000) return deny();
    var uid = (session.user && session.user.id) || payload.sub;
    if (!uid) return deny();
    fetch('https://' + REF + '.supabase.co/rest/v1/profiles?select=role&id=eq.' + uid, {
      headers: { apikey: ANON, Authorization: 'Bearer ' + session.access_token }
    }).then(function (r) { return r.json(); }).then(function (rows) {
      var role = rows && rows[0] && rows[0].role;
      if (role === 'staff' || role === 'admin' || role === 'master') {
        var g = document.getElementById('ecorean-gate-style');
        if (g) g.remove();
      } else {
        location.replace('/request-role/');
      }
    }).catch(deny);
  })();
})();
