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

  /* ── 컬렉션 매퍼 : 화면이 쓰는 모양 ↔ 서버 행 ── */
  var siteIdByName = {};      /* 현장명 → work_sites.id */
  var siteNameById = {};
  var partnerIdByName = {};   /* 거래처명 → partners.id (직원 포털과 같은 명부) */
  var partnerList = [];

  var COLS = {
    tx: {
      table: 'biz_tx',
      select: 'biz_tx?select=*&tenant_id=eq.' + TENANT + '&order=tx_date.desc',
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
          site: r.site_name || '', partnerId: r.partner_id || undefined, poId: r.po_id || undefined,
          vendor: r.vendor || undefined,
          memo: r.memo || '', cr: r.is_credit ? 1 : 0,
          due: r.due_date || undefined, settled: r.settled_on || undefined,
          rid: r.recurring_id ? (Number(r.recurring_id) || r.recurring_id) : undefined,
          synced: !!r.notion_synced, src: r.source, dk: r.dedupe_key || undefined,
          att: r.attachments || [], by: r.created_by || undefined, at: r.updated_at || r.created_at
        };
      }
    },
    accounts: {
      table: 'biz_accounts',
      select: 'biz_accounts?select=*&tenant_id=eq.' + TENANT + '&order=sort_order.asc',
      toRow: function (a, i) {
        return { id: a.uid, tenant_id: TENANT, name: a.name, icon: a.ico || '🏦', init_balance: n(a.init), sort_order: i };
      },
      toObj: function (r) { return { uid: r.id, name: r.name, ico: r.icon, init: n(r.init_balance) }; }
    },
    recurring: {
      table: 'biz_recurring',
      select: 'biz_recurring?select=*&tenant_id=eq.' + TENANT + '&order=day_of_month.asc',
      toRow: function (r) {
        return {
          id: r.uid, tenant_id: TENANT, local_id: s(r.id), type: r.type === 'in' ? 'in' : 'out',
          category: r.cat || '기타', icon: s(r.ico), amount: n(r.amount), memo: s(r.memo),
          day_of_month: Math.min(31, Math.max(1, n(r.day) || 1)), account: s(r.acct), start_ym: s(r.start)
        };
      },
      toObj: function (r) {
        return {
          uid: r.id, id: r.local_id ? (Number(r.local_id) || r.local_id) : numId(r.id),
          type: r.type, cat: r.category, ico: r.icon || undefined, amount: n(r.amount),
          memo: r.memo || '', day: r.day_of_month, acct: r.account || undefined, start: r.start_ym || undefined
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

  /* ── base(마지막 동기화 스냅샷) ── */
  function loadBase() {
    try { return JSON.parse(localStorage.getItem(BASE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveBase(b) { try { localStorage.setItem(BASE_KEY, JSON.stringify(b)); } catch (e) {} }
  function hashOf(row) { return JSON.stringify(row); }

  /* ── 3-way 병합 : base 를 기준으로 내 변경과 남의 변경을 합친다 ── */
  function merge(colName, localArr, serverArr, base) {
    var cfg2 = COLS[colName], b = base[colName] || (base[colName] = {});
    var localByUid = {}, out = [], seen = {};
    localArr.forEach(function (o) { if (o.uid) localByUid[o.uid] = o; });

    serverArr.forEach(function (so) {
      seen[so.uid] = 1;
      var lo = localByUid[so.uid];
      if (!lo) {
        if (b[so.uid]) return;               /* 내가 지운 행 — 다시 살리지 않는다(삭제 push 대기) */
        out.push(so);                         /* 다른 직원이 새로 넣은 행 */
        b[so.uid] = hashOf(cfg2.toRow(so, out.length - 1));
        return;
      }
      var mine = hashOf(cfg2.toRow(lo, 0));
      if (b[so.uid] !== undefined && b[so.uid] !== mine) { out.push(lo); return; }  /* 내가 수정 중 → 내 것 유지 */
      out.push(so);                                                                  /* 아니면 서버가 최신 */
      b[so.uid] = hashOf(cfg2.toRow(so, out.length - 1));
    });

    localArr.forEach(function (o) {
      if (!o.uid) { out.push(o); return; }        /* 아직 서버에 없던 신규 */
      if (seen[o.uid]) return;
      if (b[o.uid] === undefined) { out.push(o); return; }   /* uid만 붙고 아직 push 안 됨 */
      var mine = hashOf(cfg2.toRow(o, 0));
      if (b[o.uid] !== mine) { out.push(o); return; }        /* 서버에서 지워졌지만 내가 수정 중 → 살림 */
      delete b[o.uid];                                        /* 다른 직원이 삭제 → 내 쪽도 제거 */
    });
    return out;
  }

  /* ── 현장 : 직원 포털 work_sites 를 공유 마스터로 사용 ── */
  function pullSites() {
    return getAll('work_sites?select=id,name,status,contract_amount&tenant_id=eq.' + TENANT + '&order=created_at.asc').then(function (rows) {
      siteIdByName = {}; siteNameById = {};
      var names = [], contracts = {};
      (rows || []).forEach(function (r) {
        siteIdByName[r.name] = r.id; siteNameById[r.id] = r.name;
        if (r.status === '보관') return;
        names.push(r.name);
        if (r.contract_amount) contracts[r.name] = n(r.contract_amount);
      });
      return { names: names, contracts: contracts, rows: rows || [] };
    });
  }
  function pushSites(state, serverSites) {
    var have = {}, ops = [];
    (serverSites.rows || []).forEach(function (r) { have[r.name] = r; });

    (state.sites || []).forEach(function (name) {
      var r = have[name], amt = n((state.contracts || {})[name]);
      if (!r) {
        ops.push(req('work_sites', {
          method: 'POST', headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ name: name, status: '진행중', contract_amount: amt, tenant_id: TENANT })
        }).then(function (res) { if (res && res[0]) siteIdByName[name] = res[0].id; }));
      } else if (n(r.contract_amount) !== amt || r.status === '보관') {
        ops.push(req('work_sites?id=eq.' + r.id, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ contract_amount: amt, status: r.status === '보관' ? '진행중' : r.status })
        }));
      }
    });
    /* 사업장부에서 뺀 현장은 지우지 않는다 — 직원 포털·발주서가 같은 행을 참조한다. 보관 처리만. */
    (serverSites.rows || []).forEach(function (r) {
      if (r.status === '보관') return;
      if ((state.sites || []).indexOf(r.name) === -1) {
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
  function setSiteMembers(siteId, userIds) {
    return req('work_site_members?site_id=eq.' + siteId, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
      .then(function () {
        if (!userIds.length) return null;
        return req('work_site_members', {
          method: 'POST', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(userIds.map(function (u) { return { site_id: siteId, user_id: u }; }))
        });
      });
  }
  function listSiteMembers(siteId) {
    return getAll('work_site_members?select=site_id,user_id,role&site_id=eq.' + siteId).catch(function () { return []; });
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
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'rejected', reject_reason: reason || null })
    });
  }
  function deleteClaim(id) {
    return req('biz_expense_claims?id=eq.' + id, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
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
  var cfg = { getState: null, onChange: null };
  var pushTimer = null, pushing = false, pushAgain = false, pollTimer = null;

  function pull() {
    var state = cfg.getState();
    var base = loadBase();
    setStatus('syncing', '불러오는 중');
    return pullMe().then(function () {
      return Promise.all([pullOrgs(), pullMyMembership(), isManager() ? pullStaffDirectory() : null]);
    }).then(function () {
      return pullSites();
    }).then(function (sites) {
      /* 현장도 3-way 병합. 서버 목록으로 통째 교체하면 아직 못 올린 로컬 현장이 사라진다. */
      var baseS = null; try { baseS = base.sitesHash ? JSON.parse(base.sitesHash) : null; } catch (e) {}
      var prevNames = state.sites || [], prevC = state.contracts || {};
      var names = sites.names.slice(), cts = {};
      if (!baseS) {
        prevNames.forEach(function (nm) { if (names.indexOf(nm) === -1) names.push(nm); });
      } else {
        var bn = baseS.s || [];
        prevNames.forEach(function (nm) {                       /* 내가 새로 추가한 현장 */
          if (names.indexOf(nm) === -1 && bn.indexOf(nm) === -1) names.push(nm);
        });
        names = names.filter(function (nm) {                    /* 내가 뺀 현장 — 보관 push 대기 */
          return !(bn.indexOf(nm) !== -1 && prevNames.indexOf(nm) === -1);
        });
      }
      var bc = (baseS && baseS.c) || {};
      names.forEach(function (nm) {
        var sv = n(sites.contracts[nm]), lv = n(prevC[nm]), bv = n(bc[nm]);
        var v = (lv !== bv) ? lv : sv;                           /* 내가 바꾼 계약금액이 이긴다 */
        if (v) cts[nm] = v;
      });
      state.sites = names;
      state.contracts = cts;
      base.sitesHash = JSON.stringify({ s: sites.names, c: sites.contracts });  /* 기준 = 서버 상태 */
      return Promise.all([
        getAll(COLS.tx.select), getAll(COLS.accounts.select), getAll(COLS.recurring.select),
        getAll(COLS.goals.select), getAll(COLS.events.select), pullBudget(), pullPartners()
      ]);
    }).then(function (res) {
      var names = ['tx', 'accounts', 'recurring', 'goals', 'events'];
      names.forEach(function (nm, i) {
        var server = (res[i] || []).map(COLS[nm].toObj);
        state[nm] = merge(nm, state[nm] || [], server, base);
      });
      /* 계좌 기본 3개(사업통장·현금·사업카드)는 기기마다 로컬에 미리 있다.
         서버에 같은 이름이 이미 있으면 서버 것(uid 있는 쪽)만 남긴다 —
         안 그러면 기기를 하나 늘릴 때마다 계좌가 두 배로 불어난다. */
      var seenName = {}, dedup = [];
      state.accounts.forEach(function (a) {
        var k = String(a.name), prev = seenName[k];
        if (!prev) { seenName[k] = a; dedup.push(a); return; }
        if (!prev.uid && a.uid) { dedup[dedup.indexOf(prev)] = a; seenName[k] = a; }
      });
      state.accounts = dedup;
      if (res[5]) {
        var localB = state.budgets || { total: 0, cats: {} };
        var baseB = base.budget;
        var mineHash = JSON.stringify({ total: n(localB.total), cats: localB.cats || {} });
        if (baseB === undefined || baseB === mineHash) { state.budgets = res[5]; base.budget = JSON.stringify(res[5]); }
      }
      if (!state.accounts || !state.accounts.length) {
        state.accounts = [{ name: '사업통장', ico: '🏦', init: 0 }, { name: '현금', ico: '💵', init: 0 }, { name: '사업카드', ico: '💳', init: 0 }];
      }
      saveBase(base);
      setStatus('ok', '동기화됨');
      if (cfg.onChange) cfg.onChange();
      return state;
    }).catch(function (e) {
      setStatus(e && e.message === 'NOAUTH' ? 'offline' : 'error', e && e.message === 'NOAUTH' ? '로그인 필요' : '동기화 실패', e);
      throw e;
    });
  }

  function push() {
    if (pushing) { pushAgain = true; return Promise.resolve(); }
    pushing = true;
    var state = cfg.getState();
    var base = loadBase();
    setStatus('syncing', '저장 중');

    /* 현장 먼저 — 거래의 site_id 가 여기서 결정된다.
       현장 목록·계약금액이 그대로면 왕복을 건너뛴다(저장 한 번에 GET 2회가 붙던 낭비). */
    /* 계좌·고정항목·목표·예산·현장은 회사 공용 자료라 서버가 관리자에게만 쓰기를 허용한다.
       직원이 이걸 밀어 올리려다 403 을 받으면 같은 push 안의 본인 거래까지 통째로 실패한다.
       → 관리자가 아니면 아예 보내지 않는다. */
    var mgr = false;
    /* 내 역할을 모르는 채로 보내면 관리자를 직원으로 오판해 회사 자료가 안 올라간다 — 먼저 확인한다 */
    return (meProfile ? Promise.resolve() : pullMe())
      .then(function () {
        mgr = isManager();
        var siteHash = JSON.stringify({ s: state.sites || [], c: state.contracts || {} });
        var sitesUnchanged = !mgr || ((base.sitesHash === siteHash) && Object.keys(siteIdByName).length > 0);
        if (sitesUnchanged) return null;
        return pullSites().then(function (sv) { return pushSites(state, sv); })
          .then(function () { return pullSites(); })
          .then(function () { base.sitesHash = siteHash; });
      })
      .then(function () {
        var jobs = [];
        var MGR_ONLY = { accounts: 1, recurring: 1, goals: 1 };
        Object.keys(COLS).forEach(function (nm) {
          if (MGR_ONLY[nm] && !mgr) return;
          var c = COLS[nm], arr = state[nm] || [], b = base[nm] || (base[nm] = {});
          var alive = {}, ins = [];
          arr.forEach(function (o, i) {
            if (!o.uid) o.uid = uuid();
            alive[o.uid] = 1;
            var row = c.toRow(o, i), h = hashOf(row);
            if (b[o.uid] !== h) { ins.push(row); b[o.uid] = h; }
          });
          var gone = Object.keys(b).filter(function (u) { return !alive[u]; });
          gone.forEach(function (u) { delete b[u]; });
          if (ins.length) jobs.push(upsert(c.table, ins));
          if (gone.length) jobs.push(delRows(c.table, gone));
        });
        var bh = JSON.stringify({ total: n(state.budgets && state.budgets.total), cats: (state.budgets && state.budgets.cats) || {} });
        if (mgr && base.budget !== bh) { jobs.push(pushBudget(state)); base.budget = bh; }
        return Promise.all(jobs);
      })
      .then(function () {
        saveBase(base);
        setStatus('ok', '동기화됨');
        pushing = false;
        if (pushAgain) { pushAgain = false; return push(); }
      })
      .catch(function (e) {
        pushing = false;
        setStatus(e && e.message === 'NOAUTH' ? 'offline' : 'error', e && e.message === 'NOAUTH' ? '로그인 필요 · 로컬에만 저장됨' : '저장 실패 · 로컬에는 남아있음', e);
      });
  }

  window.BIZDB = {
    configure: function (o) { cfg.getState = o.getState; cfg.onChange = o.onChange; statusCb = o.onStatus || null; },
    status: status,
    boot: pull,
    pull: pull,
    pushNow: push,
    schedulePush: function (ms) {
      clearTimeout(pushTimer);
      pushTimer = setTimeout(push, ms === undefined ? 900 : ms);
    },
    startPolling: function (sec) {
      clearInterval(pollTimer);
      pollTimer = setInterval(function () {
        if (document.hidden || pushing || status.phase === 'syncing') return;
        pull().catch(function () {});
      }, (sec || 30) * 1000);
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && status.phase !== 'syncing') pull().catch(function () {});
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
    mySiteIds: function () { return myMemberSites.map(function (m) { return m.site_id; }); },
    mySiteNames: function () {
      return myMemberSites.map(function (m) { return siteNameById[m.site_id]; }).filter(Boolean);
    },
    staffDirectory: function () { return staffDir.slice(); },
    listSiteMembers: listSiteMembers,
    setSiteMembers: setSiteMembers,
    listClaims: listClaims,
    saveClaim: saveClaim,
    approveClaim: approveClaim,
    rejectClaim: rejectClaim,
    deleteClaim: deleteClaim,

    siteId: function (name) { return siteIdByName[name] || null; },
    siteName: function (id) { return siteNameById[id] || ''; },
    partners: function () { return partnerList.slice(); },
    purchaseOrders: pullPurchaseOrders,
    uploadReceipt: uploadReceipt,
    signedUrl: signedUrl,
    removeReceipt: removeReceipt,
    hasSynced: function () { var b = loadBase(); return !!(b.tx && Object.keys(b.tx).length); },
    resetBase: function () { try { localStorage.removeItem(BASE_KEY); } catch (e) {} },
    _req: req
  };
})();
