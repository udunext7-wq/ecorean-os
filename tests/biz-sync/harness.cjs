/* 사업장부 동기화 계층(biz-db.js) 시험대
   - 가짜 서버: biz_tx 등 테이블을 메모리에 두고 PostgREST 요청 모양대로 응답한다
   - 가짜 기기: localStorage 하나 + 페이지(state·save·persist) — index.html 의 저장 경로를 그대로 흉내
   - 같은 localStorage 를 두 페이지가 쓰면 "같은 브라우저의 탭 두 개", 페이지를 새로 만들면 "새로고침" */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = fs.readFileSync(path.join(__dirname, '../../sites/net/public/biz/biz-db.js'), 'utf8');

function makeServer() {
  const db = {
    biz_tx: [], biz_accounts: [], biz_recurring: [], biz_goals: [], biz_events: [], biz_budget: [],
    work_sites: [], partners: [], profiles: []
  };
  const log = [];
  let clock = Date.parse('2026-09-13T00:00:00Z');
  const now = () => new Date(clock += 1000).toISOString();

  function q(url) {
    const u = new URL(url);
    const table = u.pathname.replace(/^\/rest\/v1\//, '');
    const params = {};
    u.searchParams.forEach((v, k) => { params[k] = v; });
    return { table, params };
  }
  function filterRows(rows, params) {
    return rows.filter(r => Object.keys(params).every(k => {
      if (['select', 'order', 'limit'].includes(k)) return true;
      const v = params[k];
      if (v === 'is.null') return r[k] == null;
      if (v === 'not.is.null') return r[k] != null;
      if (v === 'is.true') return r[k] === true;
      if (v.startsWith('eq.')) return String(r[k]) === v.slice(3);
      if (v.startsWith('in.(')) return v.slice(4, -1).split(',').includes(String(r[k]));
      return true;
    }));
  }
  function rows0(table) { return db[table] || []; }
  function json(status, body) {
    return Promise.resolve({ ok: status < 300, status, text: () => Promise.resolve(body == null ? '' : JSON.stringify(body)) });
  }

  async function fetch(url, opts) {
    opts = opts || {};
    const method = opts.method || 'GET';
    const { table, params } = q(url);
    const body = opts.body ? JSON.parse(opts.body) : null;
    log.push({ method, table, params, body });
    if (server.offline) return Promise.reject(new TypeError('Failed to fetch'));
    /* 느린 받기: 응답 내용은 요청 시점에 정해지고 도착만 늦다 (모바일 복귀 직후 pull) */
    if (method === 'GET' && server.slowGet && table === 'biz_tx') {
      const snap = JSON.parse(JSON.stringify(filterRows(rows0(table), params)));
      await new Promise(r => setTimeout(r, server.slowGet));
      return json(200, snap);
    }

    if (table.startsWith('rpc/')) {
      const fn = table.slice(4);
      if (fn === 'biz_trash_bulk') {
        const ids = body.p_ids || [];
        let n = 0;
        db.biz_tx.forEach(r => { if (ids.includes(r.id) && r.deleted_at == null) { r.deleted_at = now(); r.updated_at = r.deleted_at; n++; } });
        return json(200, n);
      }
      return json(200, []);
    }
    if (!db[table]) db[table] = [];
    const rows = db[table];

    if (method === 'GET') {
      let out = filterRows(rows, params);
      if (params.select && params.select !== '*') {
        const cols = params.select.split(',');
        out = out.map(r => { const o = {}; cols.forEach(c => { o[c] = r[c]; }); return o; });
      }
      if (params.limit) out = out.slice(0, +params.limit);
      return json(200, JSON.parse(JSON.stringify(out)));
    }
    if (method === 'POST') {
      const list = Array.isArray(body) ? body : [body];
      const merge = /merge-duplicates/.test((opts.headers || {}).Prefer || '');
      const created = [];
      list.forEach(row => {
        const key = table === 'biz_budget' ? 'tenant_id' : 'id';
        const hit = row[key] != null && rows.find(r => r[key] === row[key]);
        if (hit && merge) {
          Object.assign(hit, row, { updated_at: now() });
        } else if (hit) {
          throw new Error('409 duplicate');
        } else {
          const r = Object.assign({ id: crypto.randomUUID(), created_at: now(), deleted_at: null }, row);
          r.updated_at = r.created_at;
          rows.push(r); created.push(r);
        }
      });
      return json(201, /representation/.test((opts.headers || {}).Prefer || '') ? created : null);
    }
    if (method === 'PATCH') {
      const hit = filterRows(rows, params);
      if (table === 'biz_tx' && body && body.deleted_at && hit.filter(r => r.deleted_at == null).length > server.bulkLimit) {
        return json(400, { message: 'BIZ_BULK_TRASH_BLOCKED' });
      }
      hit.forEach(r => Object.assign(r, body, { updated_at: now() }));
      return json(204, null);
    }
    if (method === 'DELETE') {
      const hit = filterRows(rows, params);
      db[table] = rows.filter(r => !hit.includes(r));
      return json(204, null);
    }
    return json(400, { message: 'unsupported' });
  }

  const server = {
    db, log, fetch, offline: false, bulkLimit: Infinity,
    live: () => db.biz_tx.filter(r => r.deleted_at == null),
    trashed: () => db.biz_tx.filter(r => r.deleted_at != null),
    addSite(name) { db.work_sites.push({ id: crypto.randomUUID(), name, status: '진행중', contract_amount: 0, tenant_id: 'HQ', created_at: now() }); },
    /* 다른 직원이 서버에 직접 넣은 거래 */
    addTx(fields) {
      const r = Object.assign({
        id: crypto.randomUUID(), tenant_id: 'HQ', local_id: String(Date.now() + Math.floor(Math.random() * 1e6)),
        tx_date: '2026-09-10', type: 'out', is_transfer: false, category: '자재비', amount: 1000,
        supply_amount: 1000, vat_amount: 0, vat_mode: 'none', attachments: [], source: 'manual',
        notion_synced: false, is_credit: false, created_at: now(), deleted_at: null
      }, fields);
      r.updated_at = r.created_at;
      db.biz_tx.push(r); return r;
    },
    clearLog() { log.length = 0; }
  };
  server.addSite('쌍용동1407');
  server.addSite('1번필지');
  db.profiles.push({ id: 'user-kim', email: 'kim@x', display_name: '김', role: 'executive' });
  return server;
}

function makeStorage(seed) {
  const m = new Map(Object.entries(seed || {}));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    key: i => Array.from(m.keys())[i],
    get length() { return m.size; },
    _map: m
  };
}

const KEY = 'ledger_biz_v1';

/* 페이지 한 번 열기 = biz-db.js 새로 평가 + 캐시에서 state 로드 (index.html 의 load/save 와 같은 순서) */
function openPage(server, ls, opts) {
  opts = opts || {};
  const win = {
    crypto: { randomUUID: () => crypto.randomUUID() },
    ECOREAN_AUTH: { session: { access_token: 'tk', user: { id: opts.userId || 'user-kim' } }, fresh: () => Promise.resolve({ access_token: 'tk' }) }
  };
  const doc = { hidden: false, addEventListener() {} };
  const timers = [];
  const fakeSetTimeout = (fn) => { timers.push(fn); return timers.length; };
  const fn = new Function('window', 'localStorage', 'fetch', 'document', 'AbortController', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', SRC);
  fn(win, ls, server.fetch, doc, undefined, fakeSetTimeout, () => {}, () => 0, () => {});
  const BIZDB = win.BIZDB;

  const page = {
    BIZDB, ls,
    state: null,
    load() {
      let s = null; try { s = JSON.parse(ls.getItem(KEY)); } catch (e) {}
      page.state = s || { tx: [], accounts: [], recurring: [], goals: [], events: [], sites: [], contracts: {}, budgets: { total: 0, cats: {} } };
    },
    writeCache() { ls.setItem(KEY, JSON.stringify(page.state)); },
    /* index.html save() 와 같은 순서 */
    save() {
      if (BIZDB.beforeSave) BIZDB.beforeSave();
      page.writeCache();
      BIZDB.schedulePush();
    },
    addTx(fields) {
      const t = Object.assign({ id: Date.now() + Math.floor(Math.random() * 1e6), type: 'out', cat: '자재비', amount: 1000, memo: '', date: '2026-09-13', acct: '사업통장', site: '', synced: false }, fields);
      page.state.tx.push(t); page.save(); return t;
    },
    editTx(id, fields) { const t = page.state.tx.find(x => x.id == id); Object.assign(t, fields); page.save(); return t; },
    deleteTx(id) { page.state.tx = page.state.tx.filter(x => x.id != id); page.save(); },
    async boot() {
      page.load();
      BIZDB.configure({ getState: () => page.state, onChange() {}, onStatus() {}, persist: () => page.writeCache() });
      await BIZDB.boot();
      await BIZDB.pushNow();
    },
    txByMemo(m) { return page.state.tx.filter(t => t.memo === m); }
  };
  return page;
}

module.exports = { makeServer, makeStorage, openPage, KEY };
