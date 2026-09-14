/* ECOREAN 사업장부 데이터 계층 v2 — 2026-08-30
   ────────────────────────────────────────────────────────────────
   v1 문제: 장부 전체가 localStorage JSON 블롭 1개.
     · 저장할 때마다 전 데이터를 직렬화·업로드 → 거래가 쌓일수록 느려짐
     · 두 사람이 같은 장부를 쓰면 나중에 저장한 쪽이 상대 입력을 통째로 덮어씀
     · 누가 언제 입력했는지 알 수 없음
   v2: 행 단위 동기화. localStorage 는 오프라인 캐시로만 쓴다.
     · 마지막 동기화 시점의 행 해시(base)를 기준으로 3-way 병합
       → 내가 고친 행만 올리고, 남이 고친 행만 받는다. 통째 덮어쓰기 없음
     · 현장(work_sites)·거래처(partners)는 직원 포털과 같은 마스터를 공유
     · 화면 코드는 그대로. save() 뒤에서 이 계층이 차이만 전송한다.
   ──────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var REF = 'gdcfqbdgubgpzusbtftf';
  var API = 'https://' + REF + '.supabase.co/rest/v1/';
  var ANON = 'sb_publishable_LU8lIQH-L5K8B1qwtezCUg_PkcCrAOQ';
  /* 장부(사업자)는 여러 개다 — 개인사업자와 법인은 신고도 계산서도 따로다.
     전환은 페이지를 다시 여는 방식(상태가 섞이지 않게). 캐시·기준 스냅샷도 장부별로 나눈다. */
  var TENANT = (function () { try { return localStorage.getItem('bocbiz_tenant') || 'HQ'; } catch (e) { return 'HQ'; } })();
  var SFX = (TENANT === 'HQ' ? '' : ':' + TENANT);
  var BASE_KEY = 'bocbiz_syncbase_v2' + SFX;   /* {col: {uid: hash}} — 마지막 동기화 시점 */

  /* ── 유틸 ── */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }
  function numId(u) { return parseInt(String(u).replace(/-/g, '').slice(0, 13), 16); }
  function n(v) { return Math.round(Number(v) || 0); }
  function s(v) { return (v === undefined || v === null || v === '') ? null : String(v); }

  /* ── 인증 (ecorean-gate.js 세션 재사용) ── */
  function sess() { return window.ECOREAN_AUTH && window.ECOREAN_AUTH.session; }
  function fresh(force) {
    var A = window.ECOREAN_AUTH;
    if (!A || !A.session) return Promise.resolve(null);
    if (force && A.refresh) return A.refresh(A.session).then(function (ns) { if (ns) A.session = ns; return ns || A.session; });
    return A.fresh ? A.fresh() : Promise.resolve(A.session);
  }
  function req(path, opts, _retried) {
    return fresh(false).then(function (ss) {
      var tk = (ss && ss.access_token) || (sess() && sess().access_token);
      if (!tk) throw new Error('NOAUTH');
      var o = {}, k;
      for (k in (opts || {})) o[k] = opts[k];
      o.headers = { apikey: ANON, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' };
      for (k in ((opts || {}).headers || {})) o.headers[k] = opts.headers[k];
      var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = null;
      if (ctl) { o.signal = ctl.signal; timer = setTimeout(function () { ctl.abort(); }, 25000); }
      return fetch(API + path, o).then(function (r) {
        if (timer) clearTimeout(timer);
        if (r.status === 401 && !_retried) return fresh(true).then(function () { return req(path, opts, true); });
        if (!r.ok) return r.text().then(function (b) { throw new Error(r.status + ' ' + String(b).slice(0, 200)); });
        return r.text().then(function (b) { return b ? JSON.parse(b) : null; });
      });
    });
  }
  function getAll(path) { return req(path, { method: 'GET' }); }

  /* ── 증빙 파일 (storage: biz-receipts, 비공개) ── */
  var STORAGE = 'https://' + REF + '.supabase.co/storage/v1/';
  function sreq(path, opts, _retried) {
    return fresh(false).then(function (ss) {
      var tk = (ss && ss.access_token) || (sess() && sess().access_token);
      if (!tk) throw new Error('NOAUTH');
      var o = {}, k;
      for (k in (opts || {})) o[k] = opts[k];
      o.headers = { apikey: ANON, Authorization: 'Bearer ' + tk };
      for (k in ((opts || {}).headers || {})) o.headers[k] = opts.headers[k];
      return fetch(STORAGE + path, o).then(function (r) {
        if (r.status === 401 && !_retried) return fresh(true).then(function () { return sreq(path, opts, true); });
        if (!r.ok) return r.text().then(function (b) { throw new Error(r.status + ' ' + String(b).slice(0, 200)); });
        return r.text().then(function (b) { return b ? JSON.parse(b) : null; });
      });
    });
  }
  /* 현장에서 폰으로 찍은 원본은 5~10MB — 올리기 전에 긴 변 1600px, JPEG 82% 로 줄인다 */
  function shrink(file) {
    return new Promise(function (resolve) {
      if (!/^image\//.test(file.type) || file.type === 'image/heic') return resolve(file);
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1600, w = img.width, h = img.height;
        if (w <= max && h <= max && file.size < 900000) { URL.revokeObjectURL(url); return resolve(file); }
        var sc = Math.min(1, max / Math.max(w, h));
        var cv = document.createElement('canvas');
        cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) { resolve(b || file); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }
  function uploadReceipt(file) {
    return shrink(file).then(function (blob) {
      var ext = (blob.type === 'application/pdf') ? 'pdf' : (blob.type === 'image/png' ? 'png' : 'jpg');
      var d = new Date();
      var key = d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + uuid() + '.' + ext;
      return sreq('object/biz-receipts/' + key, {
        method: 'POST', headers: { 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': 'true' }, body: blob
      }).then(function () {
        return { path: key, name: file.name || ('영수증.' + ext), size: blob.size, type: blob.type || '' };
      });
    });
  }
  function signedUrl(path, sec) {
    return sreq('object/sign/biz-receipts/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: sec || 3600 })
    }).then(function (r) { return r && r.signedURL ? (STORAGE.replace(/\/$/, '') + r.signedURL) : null; });
  }
  function removeReceipt(path) {
    return sreq('object/biz-receipts/' + path, { method: 'DELETE' }).catch(function () { return null; });
  }
  function upsert(table, rows) {
    if (!rows.length) return Promise.resolve(null);
    return req(table, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) });
  }
  function delRows(table, uids) {
    if (!uids.length) return Promise.resolve(null);
    return req(table + '?id=in.(' + uids.join(',') + ')', { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  }
  /* 지우는 대신 휴지통으로 — 되살릴 수 있어야 실수로 사라지지 않는다 */
  function trashRows(table, uids) {
    if (!uids.length) return Promise.resolve(null);
    /* 서버 가드(biz_tx_bulk_trash_guard)가 한 번에 많은 행을 휴지통으로 보내는 PATCH 를 막는다 —
       고장 난 기기가 장부를 통째로 비우지 못하게. 의도한 대량 작업(전체삭제·되돌리기)은 RPC 로. */
    if (table === 'biz_tx' && uids.length > BULK) {
      return req('rpc/biz_trash_bulk', { method: 'POST', body: JSON.stringify({ p_tenant: TENANT, p_ids: uids }) });
    }
    var me = sess(); var uid = me && me.user && me.user.id;
    return req(table + '?id=in.(' + uids.join(',') + ')', {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ deleted_at: new Date().toISOString(), deleted_by: uid || null })
    });
  }

  /* ── 컬렉션 매퍼 : 화면이 쓰는 모양 ↔ 서버 행 ── */
  var siteIdByName = {};      /* 현장명 → work_sites.id */
  var siteNameById = {};
  var sitesLoaded = false;   /* 현장이 0곳이어도 "받아왔다"를 구분해야 헛왕복이 안 생긴다 */
  var partnerIdByName = {};   /* 거래처명 → partners.id (직원 포털과 같은 명부) */
  var partnerList = [];

  var COLS = {
    tx: {
      table: 'biz_tx',
      select: 'biz_tx?select=*&tenant_id=eq.' + TENANT + '&deleted_at=is.null&order=tx_date.desc',
      softDelete: true,   /* 돈 기록은 지워도 휴지통에 남긴다 */
      toRow: function (t) {
        return {
          id: t.uid, tenant_id: TENANT, local_id: s(t.id),
          tx_date: t.date, type: t.type === 'in' ? 'in' : 'out',
          is_transfer: !!t.tf, transfer_group: s(t.tid),
          category: t.cat || '기타', icon: s(t.ico),
          amount: n(t.amount), supply_amount: n(t.supply), vat_amount: n(t.vat),
          vat_mode: (t.vatm === 'incl' || t.vatm === 'excl') ? t.vatm : 'none',
          evidence: s(t.evid), account: s(t.acct), account_to: s(t.acct2),
          site_id: t.site ? (siteIdByName[t.site] || null) : null, site_name: s(t.site),
          /* 거래처를 손으로 골랐으면 그것, 아니면 상호가 정확히 같은 협력업체에 자동으로 붙인다 */
          partner_id: s(t.partnerId) || (t.vendor ? (partnerIdByName[String(t.vendor).trim()] || null) : null),
          po_id: s(t.poId),
          vendor: s(t.vendor), memo: s(t.memo),
          is_credit: !!t.cr, due_date: s(t.due), settled_on: s(t.settled),
          cost_type: s(t.ct), process_code: s(t.pc), invoice_date: s(t.inv),
          recurring_id: s(t.rid), notion_synced: !!t.synced,
          source: t.src || 'manual', dedupe_key: s(t.dk),
          attachments: t.att || []
        };
      },
      toObj: function (r) {
        return {
          uid: r.id, id: r.local_id ? (Number(r.local_id) || r.local_id) : numId(r.id),
          date: r.tx_date, type: r.type, tf: r.is_transfer ? 1 : 0,
          tid: r.transfer_group ? (Number(r.transfer_group) || r.transfer_group) : undefined,
          cat: r.category, ico: r.icon || undefined,
          amount: n(r.amount), supply: n(r.supply_amount), vat: n(r.vat_amount), vatm: r.vat_mode,
          evid: r.evidence || undefined, acct: r.account || undefined, acct2: r.account_to || undefined,
          /* 현장 이름은 site_id 가 가리키는 현재 이름을 따른다 — 포털에서 이름을 바꾸면 옛 이름으로는 id 를 못 찾아
             다음 수정 때 site_id 가 null 로 덮였다 */
          site: (r.site_id && siteNameById[r.site_id]) || r.site_name || '', partnerId: r.partner_id || undefined, poId: r.po_id || undefined,
          vendor: r.vendor || undefined,
          memo: r.memo || '', cr: r.is_credit ? 1 : 0,
          due: r.due_date || undefined, settled: r.settled_on || undefined,
          rid: r.recurring_id ? (Number(r.recurring_id) || r.recurring_id) : undefined,
          ct: r.cost_type || undefined, pc: r.process_code || undefined, inv: r.invoice_date || undefined,
          synced: !!r.notion_synced, src: r.source, dk: r.dedupe_key || undefined,
          att: r.attachments || [], by: r.created_by || undefined, at: r.updated_at || r.created_at
        };
      }
    },
    accounts: {
      table: 'biz_accounts',
      select: 'biz_accounts?select=*&tenant_id=eq.' + TENANT + '&order=sort_order.asc',
      toRow: function (a, i) {
        return {
          id: a.uid, tenant_id: TENANT, name: a.name, icon: a.ico || '🏦',
          init_balance: n(a.init), sort_order: i,
          bank_name: s(a.bank), account_no: s(a.no), holder: s(a.holder),
          /* 종류를 안 고른 계좌를 '통장'으로 올리면 사업카드도 통장이 되어 카드 거래 증빙이 세금계산서로 잡혔다(HQ 09-11~) */
          kind: a.kind || (/카드/.test(a.name || '') ? '카드' : /현금/.test(a.name || '') ? '현금' : '통장'), last_import_on: s(a.lastImp)
        };
      },
      toObj: function (r) {
        return {
          uid: r.id, name: r.name, ico: r.icon, init: n(r.init_balance),
          bank: r.bank_name || undefined, no: r.account_no || undefined, holder: r.holder || undefined,
          kind: r.kind || '통장', lastImp: r.last_import_on || undefined
        };
      }
    },
    recurring: {
      table: 'biz_recurring',
      select: 'biz_recurring?select=*&tenant_id=eq.' + TENANT + '&order=day_of_month.asc',
      toRow: function (r) {
        return {
          id: r.uid, tenant_id: TENANT, local_id: s(r.id), type: r.type === 'in' ? 'in' : 'out',
          category: r.cat || '기타', icon: s(r.ico), amount: n(r.amount), memo: s(r.memo),
          day_of_month: Math.min(31, Math.max(1, n(r.day) || 1)), account: s(r.acct), start_ym: s(r.start),
          skip_months: (r.skip || []).slice().sort()
        };
      },
      toObj: function (r) {
        return {
          uid: r.id, id: r.local_id ? (Number(r.local_id) || r.local_id) : numId(r.id),
          type: r.type, cat: r.category, ico: r.icon || undefined, amount: n(r.amount),
          memo: r.memo || '', day: r.day_of_month, acct: r.account || undefined, start: r.start_ym || undefined,
          skip: Array.isArray(r.skip_months) ? r.skip_months.slice() : []
        };
      }
    },
    goals: {
      table: 'biz_goals',
      select: 'biz_goals?select=*&tenant_id=eq.' + TENANT + '&order=created_at.asc',
      toRow: function (g) {
        return { id: g.uid, tenant_id: TENANT, local_id: s(g.id), name: g.name, icon: g.ico || '🎯', target_amount: n(g.target), saved_amount: n(g.saved) };
      },
      toObj: function (r) {
        return { uid: r.id, id: r.local_id ? (Number(r.local_id) || r.local_id) : numId(r.id), name: r.name, ico: r.icon, target: n(r.target_amount), saved: n(r.saved_amount) };
      }
    },
    events: {
      table: 'biz_events',
      select: 'biz_events?select=*&tenant_id=eq.' + TENANT + '&order=event_date.asc',
      toRow: function (e) {
        return { id: e.uid, tenant_id: TENANT, local_id: s(e.id), event_date: e.date, event_time: s(e.time), title: e.title, site_id: e.site ? (siteIdByName[e.site] || null) : null };
      },
      toObj: function (r) {
        return { uid: r.id, id: r.local_id ? (Number(r.local_id) || r.local_id) : numId(r.id), date: r.event_date, time: r.event_time || '', title: r.title };
      }
    }
  };

  /* ── 동기화 기준 v3 (2026-09-13) ─────────────────────────────────
     v2 사고: '마지막 동기화 기준(base)'은 별도 키에 동기화할 때마다 저장했지만,
     화면 캐시(ledger_biz_v1)는 사용자가 무언가 저장할 때만 기록됐다. 둘의 시점이 어긋나면
       · 받아두기만 한 남의 거래 = "base 엔 있고 캐시엔 없음" = "내가 지웠다"로 오판 → 휴지통 (09-13 4차 중도금 1.5억 등 5건)
       · 새 거래는 캐시에 uid 없이 남음 → 다시 열 때마다 "새 행 만들고 옛 행 휴지통" (같은 거래 5벌까지 복제)
       · 같은 브라우저 탭 두 개가 base 하나를 나눠 써도 같은 오판
     v3: 동기화 표시를 행 안에 둔다 → 캐시와 한 번에 기록되므로 어긋날 수 없다.
       o._h    = 서버와 마지막으로 맞춘 내용의 해시 (없으면 아직 서버에 올린 적 없음)
       _tomb   = 내가 지운 행 uid (명시 기록). "캐시에 없다"는 이제 아무 뜻도 아니다 — 지웠다는 기록이 있어야 지운다.
       _base   = 현장 목록·예산의 마지막 서버 상태
     그리고 동기화가 state 를 바꾸면 곧바로 캐시에 기록한다(cfg.persist). */
  var SYNC_VER = 3;
  var NAMES = ['tx', 'accounts', 'recurring', 'goals', 'events'];
  var MGR_ONLY = { accounts: 1, recurring: 1, goals: 1 };
  var BULK = 10;   /* 이보다 많은 거래를 한 번에 휴지통으로 보낼 때는 서버 가드를 통과하는 RPC 로 */

  function loadBase() {   /* v2 기준 — 옛 캐시를 넘겨받을 때만 읽는다 */
    try { return JSON.parse(localStorage.getItem(BASE_KEY)) || {}; } catch (e) { return {}; }
  }
  /* 행 내용 해시. 서버 id 로 바꾸는 파생값(현장 id·순서)은 뺀다 — 현장 목록을 받기 전/후로 해시가 달라지면
     "내가 고쳤다"로 오판해 전 행을 다시 올리게 된다. */
  function syncHash(nm, o) {
    var row = COLS[nm].toRow(o, 0);
    delete row.sort_order;
    if (nm === 'tx') { delete row.site_id; row.partner_id = s(o.partnerId); }
    return JSON.stringify(row);
  }
  function legacyHash(nm, str) {
    try {
      var row = JSON.parse(str);
      delete row.sort_order;
      if (nm === 'tx') delete row.site_id;
      return JSON.stringify(row);
    } catch (e) { return '~'; }
  }
  function tombOf(state, nm) {
    var t = state._tomb || (state._tomb = {});
    return t[nm] || (t[nm] = []);
  }
  function baseOf(state) { return state._base || (state._base = {}); }
  function persist() { if (cfg.persist) { try { cfg.persist(); } catch (e) {} } }

  /* 이 페이지가 들고 있던 행(uid) — 여기서 빠진 것만 '내가 지운 것'이다. 페이지마다 따로(메모리) */
  var known = null;
  function resetKnown(state) {
    known = {};
    NAMES.forEach(function (nm) {
      var k = known[nm] = {};
      (state[nm] || []).forEach(function (o) { if (o.uid) k[o.uid] = 1; });
    });
  }
  /* save() 직전·동기화 직전에 부른다: 새 행에 uid 를 붙이고, 사라진 행을 휴지통 목록에 적는다 */
  function noteLocal(state) {
    if (!state) return;
    if (!known) { NAMES.forEach(function (nm) { (state[nm] || []).forEach(function (o) { if (!o.uid) o.uid = uuid(); }); }); resetKnown(state); return; }
    NAMES.forEach(function (nm) {
      var arr = state[nm] || [], tomb = tombOf(state, nm), now = {}, had = known[nm] || {};
      arr.forEach(function (o) {
        if (!o.uid) o.uid = uuid();
        now[o.uid] = 1;
        var ti = tomb.indexOf(o.uid);
        if (ti !== -1) tomb.splice(ti, 1);
        /* 지웠다가 되살림(실행취소) → 휴지통 전송이 이미 끝났을 수 있으니 다시 올려 서버에서도 살린다 */
        if ((ti !== -1 || !had[o.uid]) && o._h !== undefined) delete o._h;
      });
      Object.keys(known[nm] || {}).forEach(function (u) { if (!now[u] && tomb.indexOf(u) === -1) tomb.push(u); });
      known[nm] = now;
    });
  }

  /* ── 병합 : 서버 목록 + 내 미전송 변경 ──
     서버 행 · 로컬 없음        → 받는다 (내 휴지통 목록에 있을 때만 건너뜀)
     서버 행 · 로컬 변경 없음   → 서버가 최신
     서버 행 · 로컬 변경 있음   → 내 것 유지 (다음 push)
     로컬만 · 올린 적 없음      → 새 행, 유지
     로컬만 · 올린 적 있음      → 다른 곳에서 지워짐 → 따라서 뺀다 (내가 고치던 행이면 살려서 올린다) */
  function keyOf(nm, o) {
    if (nm === 'accounts') return o.name ? 'n:' + o.name : null;
    return (o.id !== undefined && o.id !== null) ? 'i:' + String(o.id) : null;
  }
  /* 기본 계좌 3개 = 표시(_seed)가 있거나, 옛 캐시에서 손대지 않은 모양(이름·잔액 0·은행정보 없음) */
  var SEED_NAMES = ['사업통장', '현금', '사업카드'];
  function isSeed(nm, o) {
    if (nm !== 'accounts') return false;
    if (o._seed) return true;
    return SEED_NAMES.indexOf(o.name) !== -1 && !n(o.init) && !o.bank && !o.no && !o.holder && !o.lastImp;
  }
  function merge(nm, localArr, serverArr, tomb) {
    var out = [], seen = {}, byUid = {}, orphanByKey = {}, onServer = {}, inTomb = {};
    serverArr.forEach(function (so) { onServer[so.uid] = 1; });
    tomb.forEach(function (u) { inTomb[u] = 1; });
    localArr.forEach(function (o) {
      if (o.uid) byUid[o.uid] = o;
      /* 올린 적 없는 줄 알았는데 서버에 같은 기록(local_id)이 있으면 같은 행으로 잇는다 — 옛 캐시·스냅샷의 uid 없는 행 */
      if (o._h === undefined && !onServer[o.uid]) { var k = keyOf(nm, o); if (k && !orphanByKey[k]) orphanByKey[k] = o; }
    });
    serverArr.forEach(function (so) {
      seen[so.uid] = 1;
      /* 내가 지운 행 — 이어붙이기보다 먼저 거른다. 안 그러면 지운 뒤 같은 이름으로 새로 만든 계좌가 지운 행에 붙어 함께 사라진다 */
      if (inTomb[so.uid]) return;
      var lo = byUid[so.uid], relinked = false;
      if (!lo) {
        var k = keyOf(nm, so);
        if (k && orphanByKey[k]) { lo = orphanByKey[k]; delete orphanByKey[k]; delete byUid[lo.uid]; lo.uid = so.uid; byUid[so.uid] = lo; relinked = true; }
      }
      so._h = syncHash(nm, so);
      if (!lo) { out.push(so); return; }
      /* 이어붙인 행은 서버 내용으로 — 새 기기의 기본 계좌(잔액 0)가 서버 계좌 설정(잔액·은행)을 덮지 않게 */
      if (relinked) { out.push(so); return; }
      var mine = syncHash(nm, lo);
      if (lo._h === undefined) { out.push(mine === so._h ? so : lo); return; }
      out.push(mine === lo._h ? so : lo);
    });
    localArr.forEach(function (o) {
      if (seen[o.uid] || inTomb[o.uid]) return;
      /* 기기에 미리 깔린 기본 계좌 — 서버에 계좌가 있는데 짝이 없으면(이름을 바꿨거나 지웠음) 버린다 */
      if (o._h === undefined && serverArr.length && isSeed(nm, o)) return;
      if (o._h === undefined) { out.push(o); return; }
      if (syncHash(nm, o) !== o._h) { delete o._h; out.push(o); return; }
    });
    return out;
  }

  /* ── v2 캐시 넘겨받기 : 옛 base 로 각 행의 '서버와 맞춘 내용'을 복원한다. 아무것도 지우지 않는다. ── */
  function migrateLegacy(state, serverByCol, trashed) {
    var old = loadBase();
    NAMES.forEach(function (nm) {
      var b = old[nm] || {}, srv = serverByCol[nm] || {};
      (state[nm] || []).forEach(function (o) {
        if (!o.uid || o._h !== undefined) return;
        var mine = syncHash(nm, o), so = srv[o.uid];
        if (b[o.uid] !== undefined) {
          var bh = legacyHash(nm, b[o.uid]);
          if (!so) { o._h = mine; return; }                       /* 서버에서 사라짐 → 따라 뺀다 */
          var sh = syncHash(nm, so);
          /* 캐시가 서버와 다를 때 — '내 미전송 수정'인지 '받아두고 캐시에 못 쓴 남의 수정'인지 가린다.
             v2 는 받은 내용을 캐시에 안 썼으므로 뒤쪽이 훨씬 흔하다. 행의 서버 수정시각(at)이 캐시와 다르면
             캐시를 받은 뒤 서버가 바뀐 것 → 서버. 같으면 서버는 그대로고 내가 고친 것 → 올린다. */
          if (mine === sh) o._h = sh;
          else if (o.at && so.at && o.at !== so.at) o._h = mine;
          else o._h = (sh === bh) ? bh : mine;
        } else if (!so && trashed[o.uid]) {
          o._h = mine;                                            /* 서버 휴지통에 있는 행 → 되살리지 않는다 */
        }
      });
    });
    state._base = {};
  }

  /* ── 현장 : 직원 포털 work_sites 를 공유 마스터로 사용 ── */
  var siteMetaByName = {};
  function pullSites() {
    return getAll('work_sites?select=id,name,status,contract_amount,client_name,address,start_date,end_date&tenant_id=eq.' + TENANT + '&order=created_at.asc').then(function (rows) {
      siteIdByName = {}; siteNameById = {}; siteMetaByName = {};
      var names = [], contracts = {};
      (rows || []).forEach(function (r) {
        siteIdByName[r.name] = r.id; siteNameById[r.id] = r.name;
        siteMetaByName[r.name] = {
          id: r.id, status: r.status || '진행중', contract: n(r.contract_amount),
          client: r.client_name || '', address: r.address || '',
          start: r.start_date || '', end: r.end_date || ''
        };
        if (r.status === '보관') return;
        names.push(r.name);
        if (r.contract_amount) contracts[r.name] = n(r.contract_amount);
      });
      sitesLoaded = true;
      return { names: names, contracts: contracts, rows: rows || [] };
    });
  }
  /* 현장 올리기 — 3-way: '내가 바꾼 것'만 보낸다(마지막으로 받은 목록 prev 기준).
     서버와 내 목록 두 쪽만 비교하면, 아직 못 받은 포털 쪽 변경(계약금액·보관·삭제)을 내 옛값으로 되돌렸다. */
  function pushSites(state, serverSites, prev) {
    var have = {}, ops = [], prevNames = (prev && prev.s) || [], prevC = (prev && prev.c) || {};
    (serverSites.rows || []).forEach(function (r) { have[r.name] = r; });
    var baseNames = prevNames;

    (state.sites || []).forEach(function (name) {
      var r = have[name], amt = n((state.contracts || {})[name]), mineNew = prevNames.indexOf(name) === -1;
      if (!r) {
        if (!mineNew) return;                     /* 받았던 현장이 서버에 없음 = 다른 곳에서 삭제 → 다시 만들지 않는다 */
        ops.push(req('work_sites', {
          method: 'POST', headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ name: name, status: '진행중', contract_amount: amt, tenant_id: TENANT })
        }).then(function (res) { if (res && res[0]) siteIdByName[name] = res[0].id; }));
        return;
      }
      var body = {};
      if (r.status === '보관' && mineNew) body.status = '진행중';                 /* 내가 다시 넣은 현장만 보관 해제 */
      if (amt !== n(prevC[name]) && amt !== n(r.contract_amount)) body.contract_amount = amt;   /* 내가 바꾼 계약금액만 */
      if (Object.keys(body).length) {
        ops.push(req('work_sites?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(body) }));
      }
    });
    /* 사업장부에서 뺀 현장은 지우지 않는다 — 직원 포털·발주서가 같은 행을 참조한다. 보관 처리만.
       '뺀 현장' = 마지막으로 받은 목록엔 있었는데 지금 목록엔 없는 것. 서버에 있는데 내 목록에 없다고
       보관하면, 방금 다른 직원이 만든 현장(아직 못 받음)까지 보관된다(2026-09-13 수정). */
    (serverSites.rows || []).forEach(function (r) {
      if (r.status === '보관') return;
      if ((baseNames || []).indexOf(r.name) !== -1 && (state.sites || []).indexOf(r.name) === -1) {
        ops.push(req('work_sites?id=eq.' + r.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: '보관' }) }));
      }
    });
    return Promise.all(ops);
  }

  /* ── 나 · 장부 · 담당 현장 ── */
  var meProfile = null, orgList = [], myMemberSites = [], staffDir = [];
  function pullMe() {
    var s = sess(), uid = s && s.user && s.user.id;
    if (!uid) return Promise.resolve(null);
    return getAll('profiles?select=id,email,display_name,role&id=eq.' + uid)
      .then(function (r) { meProfile = (r && r[0]) || null; return meProfile; })
      .catch(function () { return null; });
  }
  function isManager() {
    return !!(meProfile && ['master', 'admin', 'executive'].indexOf(meProfile.role) !== -1);
  }
  function pullOrgs() {
    return getAll('biz_orgs?select=*&active=is.true&order=sort_order.asc')
      .then(function (r) { orgList = r || []; return orgList; }).catch(function () { return orgList; });
  }
  function pullMyMembership() {
    return getAll('work_site_members?select=site_id,role')
      .then(function (r) { myMemberSites = r || []; return myMemberSites; }).catch(function () { return myMemberSites; });
  }
  function pullStaffDirectory() {
    return req('rpc/biz_staff_directory', { method: 'POST', body: '{}' })
      .then(function (r) { staffDir = r || []; return staffDir; }).catch(function () { return staffDir; });
  }
  function saveOrg(row) {
    return req('biz_orgs', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify([row]) });
  }
  /* 담당자 저장 — 예전엔 전부 지우고 다시 넣어서, 넣기가 실패하면 0명이 되고 포털에서 정한 역할(role)도 날아갔다.
     새로 고른 사람만 추가(이미 있으면 그대로), 뺀 사람만 삭제. */
  function setSiteMembers(siteId, userIds) {
    var add = userIds.length ? req('work_site_members', {
      method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(userIds.map(function (u) { return { site_id: siteId, user_id: u }; }))
    }) : Promise.resolve(null);
    return add.then(function () {
      return req('work_site_members?site_id=eq.' + siteId + (userIds.length ? '&user_id=not.in.(' + userIds.join(',') + ')' : ''),
        { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    });
  }
  /* 조회 실패를 빈 목록으로 돌려주면, 그 상태로 저장했을 때 기존 배정이 전부 지워진다 → 실패는 실패로 */
  function listSiteMembers(siteId) {
    return getAll('work_site_members?select=site_id,user_id,role&site_id=eq.' + siteId);
  }

  /* ── 경비 청구 (개인 영역) ── */
  function listClaims() {
    return getAll('biz_expense_claims?select=*&tenant_id=eq.' + TENANT + '&order=claim_date.desc&limit=300')
      .catch(function () { return []; });
  }
  function saveClaim(row) {
    row.tenant_id = TENANT;
    return req('biz_expense_claims', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify([row])
    });
  }
  function approveClaim(id, account, payDate) {
    return req('rpc/biz_approve_claim', {
      method: 'POST', body: JSON.stringify({ p_claim: id, p_account: account || null, p_pay_date: payDate || null })
    });
  }
  function rejectClaim(id, reason) {
    return req('biz_expense_claims?id=eq.' + id, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'rejected', reject_reason: reason || null })
    }).then(function (r) { return mustChange(r, '반려'); });
  }
  function deleteClaim(id) {
    return req('biz_expense_claims?id=eq.' + id, { method: 'DELETE', headers: { Prefer: 'return=representation' } })
      .then(function (r) { return mustChange(r, '청구 취소'); });
  }

  /* ── 공종(집계표) · 현장 실행예산 ──
     공종은 회사 표준(process_groups C01~C16)을 그대로 쓴다. 장부용으로 따로 만들지 않는다. */
  var processList = [];
  function pullProcesses() {
    return getAll('process_groups?select=code,name,color&order=code.asc')
      .then(function (r) { processList = r || []; return processList; })
      .catch(function () { return processList; });
  }
  function listSiteBudget(siteId) {
    return getAll('biz_site_budget?select=*&site_id=eq.' + siteId + '&order=sort_order.asc');
  }
  function saveSiteBudget(rows) {
    if (!rows.length) return Promise.resolve(null);
    rows.forEach(function (r) { r.tenant_id = TENANT; });
    return req('biz_site_budget', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows)
    });
  }
  function deleteSiteBudget(siteId, codes) {
    if (!codes.length) return Promise.resolve(null);
    return req('biz_site_budget?site_id=eq.' + siteId + '&process_code=in.(' + codes.join(',') + ')',
      { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  }

  /* ── 휴지통 ── */
  function listTrash() {
    return getAll('biz_tx?select=*&tenant_id=eq.' + TENANT + '&deleted_at=not.is.null&order=deleted_at.desc&limit=200')
      .catch(function () { return []; });
  }
  /* PostgREST 는 권한(RLS) 때문에 0행이 바뀌어도 성공(204)을 준다 — 거짓 '완료' 토스트를 막으려고 바뀐 행을 받아 센다 */
  function mustChange(res, what) {
    if (!res || !res.length) throw new Error((what || '변경') + ' 권한이 없거나 이미 바뀐 항목입니다');
    return res;
  }
  function restoreTrash(id, extra) {
    var body = { deleted_at: null, deleted_by: null };
    if (extra) for (var k in extra) body[k] = extra[k];
    return req('biz_tx?id=eq.' + id + '&deleted_at=not.is.null', {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify(body)
    }).then(function (r) { return mustChange(r, '되살리기'); });
  }
  /* 휴지통에 있는 행만 — 그사이 다른 기기가 되살린 거래를 영구 삭제하지 않게 */
  function purgeTrash(id) {
    return req('biz_tx?id=eq.' + id + '&deleted_at=not.is.null', { method: 'DELETE', headers: { Prefer: 'return=representation' } })
      .then(function (r) { return mustChange(r, '완전삭제'); });
  }
  function ledgerCounts() {
    return req('rpc/biz_ledger_counts', { method: 'POST', body: '{}' }).catch(function () { return []; });
  }

  /* ── 거래처 명부 (직원 포털과 공유) ── */
  function pullPartners() {
    return getAll('partners?select=id,name,kinds,phone,biz_reg_no,status&status=eq.ACTIVE&order=name.asc')
      .then(function (rows) {
        partnerIdByName = {}; partnerList = rows || [];
        partnerList.forEach(function (p) { partnerIdByName[String(p.name).trim()] = p.id; });
        return partnerList;
      }).catch(function () { return partnerList; });
  }
  /* ── 발주서 (직원 포털) : 장부에 아직 안 잡힌 발주를 찾아내기 위해 ── */
  function pullPurchaseOrders() {
    return getAll('work_purchase_orders?select=id,site_id,po_no,vendor_name,partner_id,order_date,due_date,supply_amount,vat_amount,total_amount,status,memo&order=order_date.desc&limit=300')
      .then(function (rows) { return rows || []; }).catch(function () { return []; });
  }

  /* ── 예산 ── */
  function pullBudget() {
    return getAll('biz_budget?select=*&tenant_id=eq.' + TENANT).then(function (rows) {
      return (rows && rows[0]) ? { total: n(rows[0].total), cats: rows[0].cats || {} } : null;
    });
  }
  function pushBudget(state) {
    var row = { tenant_id: TENANT, total: n(state.budgets && state.budgets.total), cats: (state.budgets && state.budgets.cats) || {} };
    return upsert('biz_budget', [row]);
  }

  /* ── 상태 표시 ── */
  var status = { phase: 'idle', text: '', at: null, error: null };
  var statusCb = null;
  function setStatus(phase, text, err) {
    status.phase = phase; status.text = text || ''; status.error = err || null;
    if (phase === 'ok') status.at = new Date();
    if (statusCb) { try { statusCb(status); } catch (e) {} }
  }

  /* ── 공개 API ── */
  var cfg = { getState: null, onChange: null, persist: null };
  var pushTimer = null, pushing = false, pushAgain = false, pollTimer = null;
  var synced = false;   /* 이번에 연 페이지가 서버에서 한 번이라도 받아왔는가 */

  /* 받기와 보내기는 한 번에 하나씩, 순서대로.
     받기 요청이 나간 뒤(서버 목록 확정) 저장·전송이 끝나고, 그 다음에 받기 응답이 병합되면
     방금 올린 새 거래를 "서버에 없음 = 남이 지움"으로, 결제완료를 옛값으로 되돌렸다(모바일 앱 전환 직후). */
  var syncLock = Promise.resolve();
  function exclusive(fn) {
    var run = syncLock.then(fn, fn);
    syncLock = run.then(function () {}, function () {});
    return run;
  }
  function pull() { return exclusive(pullNow); }
  function push() { return exclusive(pushNow); }

  function pullNow() {
    var state = cfg.getState();
    noteLocal(state);
    var migrating = state._sync !== SYNC_VER;
    setStatus('syncing', '불러오는 중');
    /* 2026-08-30 첫 로딩 개선:
       이전에는 나 → (장부·담당현장·직원명부) → 현장 → (거래·계좌·…) 4단계를 차례로 기다렸다.
       실제로는 서로 필요 없는 요청들이라 한 번에 띄운다. 병합은 전부 도착한 뒤에 하므로
       현장·거래처 이름표(siteIdByName/partnerIdByName)는 그때 이미 채워져 있다.
       staffDirectory 는 서버가 관리자만 내용을 주므로 조건 없이 불러도 안전하다. */
    return Promise.all([
      pullMe(), pullOrgs(), pullMyMembership(), pullStaffDirectory(),
      pullSites(), pullPartners(), pullProcesses(),
      getAll(COLS.tx.select), getAll(COLS.accounts.select), getAll(COLS.recurring.select),
      getAll(COLS.goals.select), getAll(COLS.events.select), pullBudget(),
      /* v2 캐시를 넘겨받을 때만: 서버 휴지통에 있는 행 — 낡은 캐시가 되살리지 않게 */
      migrating ? getAll('biz_tx?select=id&tenant_id=eq.' + TENANT + '&deleted_at=not.is.null') : Promise.resolve([])
    ]).then(function (all) {
      var sites = all[4];
      var res = [all[7], all[8], all[9], all[10], all[11], all[12], all[13]];
      if (migrating) state._base = {};
      var base = baseOf(state);

      /* ── 2026-08-30 중복 현장 사고 방지 ──
         첫 동기화 때 장부의 현장 이름을 그대로 새로 만드는 바람에,
         공백 하나 차이('쌍용동1407' vs '쌍용동 1407')로 이사님이 만든 현장과 갈라졌다.
         발주서는 저쪽에, 거래는 이쪽에 붙어 서로의 자료가 안 보였다.
         → 서버에 사실상 같은 이름이 있으면 새로 만들지 말고 그 이름으로 맞춘다. */
      var norm = function (s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); };
      var byNorm = {};
      sites.names.forEach(function (nm) { byNorm[norm(nm)] = nm; });
      var alias = {}, aliased = false;
      (state.sites || []).forEach(function (nm) {
        var hit = byNorm[norm(nm)];
        if (hit && hit !== nm) { alias[nm] = hit; aliased = true; }
      });
      if (aliased) {
        state.sites = (state.sites || []).map(function (nm) { return alias[nm] || nm; });
        var cts2 = {};
        Object.keys(state.contracts || {}).forEach(function (k) { cts2[alias[k] || k] = state.contracts[k]; });
        state.contracts = cts2;
        (state.tx || []).forEach(function (t) { if (t.site && alias[t.site]) t.site = alias[t.site]; });
        (state.events || []).forEach(function (e) { if (e.site && alias[e.site]) e.site = alias[e.site]; });
      }

      /* 현장도 3-way 병합. 서버 목록으로 통째 교체하면 아직 못 올린 로컬 현장이 사라진다. */
      var baseS = null; try { baseS = base.sitesHash ? JSON.parse(base.sitesHash) : null; } catch (e) {}
      /* v2 캐시 넘겨받기: 캐시의 현장 목록·계약금액은 낡았을 수 있다 — 서버(보관 포함)를 기준으로 삼아
         남이 보관한 현장을 되살리거나 계약금액을 옛값으로 되돌리지 않는다. 캐시에만 있는 현장은 새로 추가한 것으로 둔다. */
      if (migrating) baseS = { s: (sites.rows || []).map(function (r) { return r.name; }), c: sites.contracts, m: 1 };
      var prevNames = state.sites || [], prevC = state.contracts || {};
      var names = sites.names.slice(), cts = {};
      if (!baseS) {
        prevNames.forEach(function (nm) { if (names.indexOf(nm) === -1) names.push(nm); });
      } else {
        var bn = baseS.s || [];
        prevNames.forEach(function (nm) {                       /* 내가 새로 추가한 현장 */
          if (names.indexOf(nm) === -1 && bn.indexOf(nm) === -1) names.push(nm);
        });
        if (!baseS.m) names = names.filter(function (nm) {      /* 내가 뺀 현장 — 보관 push 대기 */
          return !(bn.indexOf(nm) !== -1 && prevNames.indexOf(nm) === -1);
        });
      }
      var bc = (baseS && baseS.c) || {};
      names.forEach(function (nm) {
        var sv = n(sites.contracts[nm]), lv = n(prevC[nm]), bv = n(bc[nm]);
        var v = (!baseS || !baseS.m) && lv !== bv ? lv : sv;     /* 내가 바꾼 계약금액이 이긴다(넘겨받기 때는 서버) */
        if (v) cts[nm] = v;
      });
      state.sites = names;
      state.contracts = cts;
      base.sitesHash = JSON.stringify({ s: sites.names, c: sites.contracts });  /* 기준 = 서버 상태 */
      return res;
    }).then(function (res) {
      var base = baseOf(state);
      var serverByCol = {};
      var server = NAMES.map(function (nm, i) {
        var list = (res[i] || []).map(COLS[nm].toObj), by = serverByCol[nm] = {};
        list.forEach(function (o) { by[o.uid] = o; });
        return list;
      });
      if (migrating) {
        var trashed = {};
        (res[6] || []).forEach(function (r) { trashed[r.id] = 1; });
        migrateLegacy(state, serverByCol, trashed);
        base = baseOf(state);
      }
      NAMES.forEach(function (nm, i) {
        state[nm] = merge(nm, state[nm] || [], server[i], tombOf(state, nm));
      });
      /* 계좌 기본 3개(사업통장·현금·사업카드)는 기기마다 로컬에 미리 있다.
         서버에 같은 이름이 이미 있으면 서버 것(uid 있는 쪽)만 남긴다 —
         안 그러면 기기를 하나 늘릴 때마다 계좌가 두 배로 불어난다. */
      var seenName = {}, dedup = [];
      state.accounts.forEach(function (a) {
        var k = String(a.name), prev = seenName[k];
        if (!prev) { seenName[k] = a; dedup.push(a); return; }
        if (prev._h === undefined && a._h !== undefined) { dedup[dedup.indexOf(prev)] = a; seenName[k] = a; }
      });
      state.accounts = dedup;
      /* 서버에 예산 행이 없으면 "예산 0" 이 서버의 상태다 — 그렇게 기준을 잡아야
         빈 예산을 매번 다시 올리지 않는다. */
      var srvBudget = res[5] || { total: 0, cats: {} };
      var localB = state.budgets || { total: 0, cats: {} };
      var mineHash = JSON.stringify({ total: n(localB.total), cats: localB.cats || {} });
      if (base.budget === undefined || base.budget === mineHash) {
        state.budgets = srvBudget;
        base.budget = JSON.stringify({ total: n(srvBudget.total), cats: srvBudget.cats || {} });
      }
      if (!state.accounts || !state.accounts.length) {
        state.accounts = [{ name: '사업통장', ico: '🏦', init: 0, _seed: 1 }, { name: '현금', ico: '💵', init: 0, _seed: 1 }, { name: '사업카드', ico: '💳', init: 0, _seed: 1 }];
      }
      state._sync = SYNC_VER;
      noteLocal(state);        /* 기본 계좌 등 새 행에 uid */
      resetKnown(state);       /* 병합으로 빠진 행(남이 지운 것)은 내 삭제가 아니다 */
      persist();               /* 받은 내용을 캐시에 바로 — 안 그러면 다음에 열 때 낡은 캐시로 시작한다 */
      synced = true;
      setStatus('ok', '동기화됨');
      /* 화면 그리기 오류가 '동기화 실패'로 보이면 직원은 저장이 안 된 줄 알고 다시 입력한다 — 받기 성공과 분리 */
      if (cfg.onChange) { try { cfg.onChange(); } catch (e) { if (window.console) console.error('[biz] 화면 갱신 오류', e); } }
      return state;
    }).catch(function (e) {
      setStatus(e && e.message === 'NOAUTH' ? 'offline' : 'error', e && e.message === 'NOAUTH' ? '로그인 필요' : '동기화 실패', e);
      throw e;
    });
  }

  function budgetHash(state) {
    return JSON.stringify({ total: n(state.budgets && state.budgets.total), cats: (state.budgets && state.budgets.cats) || {} });
  }
  function sitesHashOf(state) {
    return JSON.stringify({ s: state.sites || [], c: state.contracts || {} });
  }

  /* 올릴 게 실제로 있는지 네트워크 없이 먼저 본다 — 부팅 직후 push 는 대개 보낼 게 없다 */
  function hasPending(state) {
    var mgr = isManager(), base = baseOf(state);
    for (var c = 0; c < NAMES.length; c++) {
      var nm = NAMES[c];
      if (MGR_ONLY[nm] && !mgr) continue;
      if (tombOf(state, nm).length) return true;
      var arr = state[nm] || [];
      for (var i = 0; i < arr.length; i++) {
        if (!arr[i].uid || arr[i]._h !== syncHash(nm, arr[i])) return true;
      }
    }
    if (mgr) {
      if (base.budget !== budgetHash(state)) return true;
      if (base.sitesHash !== sitesHashOf(state)) return true;
    }
    return false;
  }

  function pushNow() {
    var state = cfg.getState();
    if (!state) return Promise.resolve();
    noteLocal(state);
    if (meProfile && sitesLoaded && !hasPending(state)) return Promise.resolve();
    pushing = true;
    setStatus('syncing', '저장 중');
    var base = baseOf(state);

    /* 계좌·고정항목·목표·예산·현장은 회사 공용 자료라 서버가 관리자에게만 쓰기를 허용한다.
       직원이 이걸 밀어 올리려다 403 을 받으면 같은 push 안의 본인 거래까지 통째로 실패한다.
       → 관리자가 아니면 아예 보내지 않는다. */
    var mgr = false;
    /* 내 역할을 모르는 채로 보내면 관리자를 직원으로 오판해 회사 자료가 안 올라간다 — 먼저 확인한다.
       현장·거래처 이름표도 먼저 — 모르고 보내면 거래의 site_id 가 null 로 덮인다. */
    return Promise.all([
      meProfile ? null : pullMe(),
      sitesLoaded ? null : pullSites(),
      partnerList.length ? null : pullPartners()
    ])
      .then(function () {
        mgr = isManager();
        /* 현장 먼저 — 거래의 site_id 가 여기서 결정된다. 목록·계약금액이 그대로면 왕복을 건너뛴다. */
        var siteHash = sitesHashOf(state);
        if (!mgr || base.sitesHash === siteHash) return null;
        var prev = null; try { prev = base.sitesHash ? JSON.parse(base.sitesHash) : null; } catch (e) {}
        return pullSites().then(function (sv) { return pushSites(state, sv, prev); })
          .then(function () { return pullSites(); })
          .then(function () { base.sitesHash = siteHash; });
      })
      .then(function () {
        var jobs = [];
        NAMES.forEach(function (nm) {
          if (MGR_ONLY[nm] && !mgr) return;
          var c = COLS[nm], arr = state[nm] || [], ins = [], sent = [];
          arr.forEach(function (o, i) {
            var h = syncHash(nm, o);
            if (o._h === h) return;
            var row = c.toRow(o, i);
            /* 올리는 행은 살아 있는 행이다 — 실행취소·되돌리기·'남이 지웠지만 내가 고친 행'을 서버에서도 살린다 */
            if (c.softDelete) { row.deleted_at = null; row.deleted_by = null; }
            ins.push(row); sent.push([o, h]);
          });
          var gone = tombOf(state, nm).slice();
          if (ins.length) jobs.push(upsert(c.table, ins).then(function () {
            sent.forEach(function (p) { p[0]._h = p[1]; delete p[0]._seed; });
          }));
          if (gone.length) jobs.push((c.softDelete ? trashRows(c.table, gone) : delRows(c.table, gone)).then(function () {
            var t = tombOf(state, nm);
            gone.forEach(function (u) { var k = t.indexOf(u); if (k !== -1) t.splice(k, 1); });
          }));
        });
        var bh = budgetHash(state);
        if (mgr && base.budget !== bh) jobs.push(pushBudget(state).then(function () { base.budget = bh; }));
        /* 하나가 실패해도 성공한 쪽의 기록은 남긴다 — 다 끝난 뒤에 판정 */
        return Promise.all(jobs.map(function (j) { return j.then(function () { return null; }, function (e) { return e || new Error('push'); }); }))
          .then(function (errs) {
            var err = errs.filter(Boolean)[0];
            if (err) throw err;
          });
      })
      .then(function () {
        persist();
        setStatus('ok', '동기화됨');
        pushing = false;
        
      })
      .catch(function (e) {
        persist();
        pushing = false;
        pushAgain = false;
        setStatus(e && e.message === 'NOAUTH' ? 'offline' : 'error', e && e.message === 'NOAUTH' ? '로그인 필요 · 이 기기에만 저장됨' : '서버 저장 실패 · 이 기기에는 남아 있음', e);
      });
  }

  /* 스냅샷·백업 되돌리기 계획 — 무엇이 휴지통으로 가는지 먼저 계산해 확인창에 보여준다.
     v2 는 '지금 장부 − 스냅샷'을 말없이 전부 휴지통으로 보냈다(09-11: 그날 저녁 입력 161건). */
  function planRestore(snap) {
    var state = cfg.getState();
    noteLocal(state);
    /* 다른 장부(개인↔법인)의 백업을 넣으면 같은 uid 로 올라가 원래 장부의 거래가 이 장부로 옮겨진다 */
    if (snap && snap._tenant && snap._tenant !== TENANT) {
      throw new Error('다른 장부(' + snap._tenant + ')의 백업입니다 — 그 장부로 전환한 뒤 복원하세요');
    }
    var data = JSON.parse(JSON.stringify(snap || {}));
    var me = sess(), myId = me && me.user && me.user.id;
    var trash = {}, trashTx = [], others = 0, sum = 0;
    NAMES.forEach(function (nm) {
      var byKey = {};
      (state[nm] || []).forEach(function (o) { var k = keyOf(nm, o); if (k && o.uid) byKey[k] = o.uid; });
      var keep = {};
      (data[nm] || []).forEach(function (o) {
        delete o._h;                                   /* 그 기기·그 시점의 동기화 표시는 버린다 → 되돌린 내용으로 다시 올림 */
        if (!o.uid) { var k = keyOf(nm, o); if (k && byKey[k]) o.uid = byKey[k]; }
        if (o.uid) keep[o.uid] = 1;
      });
      /* 휴지통이 있는 거래만 되돌리기 대상 — 계좌·고정항목·목표·일정은 서버에서 영구 삭제되므로 건드리지 않는다 */
      if (!COLS[nm].softDelete) { trash[nm] = []; return; }
      trash[nm] = (state[nm] || []).filter(function (o) { return o.uid && !keep[o.uid]; }).map(function (o) {
        if (nm === 'tx') { trashTx.push(o); sum += n(o.amount); if (o.by && o.by !== myId) others++; }
        return o.uid;
      });
    });
    var tomb = {};
    NAMES.forEach(function (nm) {
      var t = tombOf(state, nm).slice();
      trash[nm].forEach(function (u) { if (t.indexOf(u) === -1) t.push(u); });
      tomb[nm] = t;
    });
    data._tomb = tomb;
    data._base = JSON.parse(JSON.stringify(baseOf(state)));
    data._sync = SYNC_VER;
    delete data._snapAt; delete data._tenant;
    return { data: data, trash: trash, trashTx: trashTx, trashSum: sum, trashOthers: others };
  }

  window.BIZDB = {
    configure: function (o) { cfg.getState = o.getState; cfg.onChange = o.onChange; cfg.persist = o.persist || null; statusCb = o.onStatus || null; },
    status: status,
    boot: pull,
    pull: pull,
    pushNow: push,
    /* 화면의 save() 가 캐시에 쓰기 직전에 부른다 — 새 행 uid·지운 행 기록이 캐시와 함께 저장되게 */
    beforeSave: function () { if (cfg.getState) noteLocal(cfg.getState()); },
    planRestore: planRestore,
    isSynced: function () { return synced; },
    schedulePush: function (ms) {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(push, ms === undefined ? 900 : ms);
    },
    /* 예전에는 30초마다 12개 테이블을 통째로 다시 받았다. 이제는 눈금(가장 최근 수정 시각)만
       확인하고, 바뀌었을 때만 실제로 받는다. 삭제는 눈금을 올리지 않으므로 5번에 한 번은 전량. */
    startPolling: function (sec) {
      clearInterval(pollTimer);
      var lastMark = null, ticks = 0;
      function mark() {
        return Promise.all([
          getAll('biz_tx?select=updated_at&tenant_id=eq.' + TENANT + '&order=updated_at.desc&limit=1'),
          getAll('biz_expense_claims?select=updated_at&tenant_id=eq.' + TENANT + '&order=updated_at.desc&limit=1')
        ]).then(function (r) {
          return ((r[0] && r[0][0] && r[0][0].updated_at) || '') + '|' + ((r[1] && r[1][0] && r[1][0].updated_at) || '');
        });
      }
      function tick() {
        if (document.hidden || pushing || status.phase === 'syncing') return;
        ticks++;
        if (ticks % 5 === 0) { pull().catch(function () {}); return; }
        mark().then(function (m) {
          if (lastMark === null) { lastMark = m; return; }
          if (m !== lastMark) { lastMark = m; pull().catch(function () {}); }
        }).catch(function () {});
      }
      pollTimer = setInterval(tick, (sec || 30) * 1000);
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && status.phase !== 'syncing') { lastMark = null; pull().catch(function () {}); }
      });
    },
    /* 공용 / 프로젝트 / 개인 3계층 */
    tenant: function () { return TENANT; },
    setTenant: function (id) {
      try { localStorage.setItem('bocbiz_tenant', id); } catch (e) {}
      location.reload();
    },
    orgs: function () { return orgList.slice(); },
    org: function () {
      for (var i = 0; i < orgList.length; i++) if (orgList[i].id === TENANT) return orgList[i];
      return { id: TENANT, name: '사업장부', biz_type: '개인', fiscal_month: 12, vat_type: '일반', is_construction: true };
    },
    saveOrg: saveOrg,
    me: function () { return meProfile; },
    isManager: isManager,
    roleKnown: function () { return !!meProfile; },
    mySiteIds: function () { return myMemberSites.map(function (m) { return m.site_id; }); },
    mySiteNames: function () {
      return myMemberSites.map(function (m) { return siteNameById[m.site_id]; }).filter(Boolean);
    },
    staffDirectory: function () { return staffDir.slice(); },
    listSiteMembers: listSiteMembers,
    setSiteMembers: setSiteMembers,
    processes: function () { return processList.slice(); },
    listSiteBudget: listSiteBudget,
    saveSiteBudget: saveSiteBudget,
    deleteSiteBudget: deleteSiteBudget,
    listTrash: listTrash,
    restoreTrash: restoreTrash,
    purgeTrash: purgeTrash,
    ledgerCounts: ledgerCounts,
    listClaims: listClaims,
    saveClaim: saveClaim,
    approveClaim: approveClaim,
    rejectClaim: rejectClaim,
    deleteClaim: deleteClaim,

    siteId: function (name) { return siteIdByName[name] || null; },
    siteName: function (id) { return siteNameById[id] || ''; },
    siteMeta: function (name) { return siteMetaByName[name] || null; },
    allSiteNames: function () { return Object.keys(siteMetaByName); },
    /* 현장 상태(진행중·완료·보관)는 직원 포털과 공유하는 값이라 여기서 바로 서버에 쓴다 */
    /* 현장 삭제 — 거래·발주가 하나도 안 붙은 현장만. 붙어 있으면 화면에서 '보관'으로 유도한다.
       (직원 포털·발주서가 같은 행을 참조하므로 기록이 있는 현장은 지우지 않는다) */
    deleteSite: function (name) {
      var m = siteMetaByName[name];
      if (!m) return Promise.resolve(false);
      return req('work_sites?id=eq.' + m.id, { method: 'DELETE', headers: { Prefer: 'return=representation' } })
        .then(function (r) {
          mustChange(r, '현장 삭제');
          delete siteMetaByName[name]; delete siteIdByName[name]; delete siteNameById[m.id];
          return true;
        });
    },
    setSiteStatus: function (name, status) {
      var m = siteMetaByName[name];
      if (!m) return Promise.reject(new Error('현장을 찾을 수 없습니다'));
      return req('work_sites?id=eq.' + m.id, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status: status })
      }).then(function (r) { mustChange(r, '현장 상태 변경'); m.status = status; });
    },
    partners: function () { return partnerList.slice(); },
    purchaseOrders: pullPurchaseOrders,
    uploadReceipt: uploadReceipt,
    signedUrl: signedUrl,
    removeReceipt: removeReceipt,
    hasSynced: function () {
      var st = cfg.getState && cfg.getState();
      /* v3 표시가 있으면 이 기기는 이미 서버 장부를 쓰고 있다(되돌리기 직후엔 _h 가 비어 있어도) */
      if (st && st._sync === SYNC_VER) return true;
      var b = loadBase(); return !!(b.tx && Object.keys(b.tx).length);
    },
    _req: req
  };
})();
