/* 사업장부 실제 페이지(index.html) + biz-db.js 를 jsdom 으로 띄워 모바일 입력 흐름을 재현한다
   실행: node tests/biz-sync/page-e2e.cjs
   - 외부 script src 는 떼고, biz-db.js 는 beforeParse 에서 먼저 평가(실제 로딩 순서와 같게)
   - '새로고침' = 같은 localStorage 내용으로 새 JSDOM */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { makeServer } = require('./harness.cjs');

const ROOT = path.join(__dirname, '../../sites/net/public/biz');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .replace(/<style id="ecorean-gate-style">[^<]*<\/style>/, '')
  .replace(/<script src="[^"]*"><\/script>/g, '')
  .replace(/<link[^>]+fonts[^>]*>/g, '');
const DB_SRC = fs.readFileSync(path.join(ROOT, 'biz-db.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function openPage(srv, storage, opts) {
  opts = opts || {};
  const errors = [];
  const confirms = [];
  const dom = new JSDOM(HTML, {
    url: 'https://ecorean.net/biz/', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      Object.entries(storage).forEach(([k, v]) => win.localStorage.setItem(k, v));
      win.fetch = srv.fetch;
      win.ECOREAN_AUTH = { session: { access_token: 'tk', user: { id: 'user-kim' } }, fresh: () => Promise.resolve({ access_token: 'tk' }) };
      win.confirm = (m) => { confirms.push(m); return opts.confirm ? opts.confirm(m) : true; };
      win.prompt = () => null;
      win.alert = () => {};
      win.scrollTo = () => {};
      win.HTMLElement.prototype.scrollIntoView = function () {};
      win.URL.createObjectURL = () => 'blob:x'; win.URL.revokeObjectURL = () => {};
      win.addEventListener('error', e => errors.push(e.message));
      win.eval(DB_SRC);
    }
  });
  const w = dom.window;
  w.eval('window.__P={get state(){return state},get view(){return view},set view(v){view=v},get filter(){return filter}}');
  return {
    dom, w, errors, confirms,
    $: s => w.document.querySelector(s),
    dump() { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; },
    async ready() { for (let i = 0; i < 60; i++) { if (w.BIZDB.status.phase === 'ok' && w.BIZDB.isSynced()) return; await sleep(25); } throw new Error('boot timeout: ' + w.BIZDB.status.phase + ' ' + (w.BIZDB.status.error && w.BIZDB.status.error.message)); },
    async idle() { await sleep(1100); for (let i = 0; i < 40 && w.BIZDB.status.phase === 'syncing'; i++) await sleep(25); },
    /* FAB → 금액·날짜·거래처 입력 → 기록하기 (모바일 입력 흐름 그대로) */
    enter(fields) {
      const d = w.document;
      d.querySelector('#fab').click();
      d.querySelector('#amtInput').value = String(fields.amount);
      if (fields.date) d.querySelector('#dateInput').value = fields.date;
      if (fields.vendor) d.querySelector('#vendorInput').value = fields.vendor;
      if (fields.memo) d.querySelector('#memoInput').value = fields.memo;
      if (fields.site) { const p = [...d.querySelectorAll('#sitePills .pill')].find(x => x.dataset.s === fields.site); if (p) p.click(); }
      d.querySelector('#saveTx').click();
    }
  };
}

(async () => {
  const srv = makeServer();
  srv.db.biz_accounts.push({ id: '00000000-0000-4000-8000-000000000001', tenant_id: 'HQ', name: '사업통장', icon: '🏦', init_balance: 0, sort_order: 0, kind: '통장' });

  console.log('▶ A. 모바일 입력 → 새로고침 반복 → 서버 1건 유지');
  let st = {};
  let p = openPage(srv, st); await p.ready();
  ok(p.errors.length === 0, '콘솔 오류 없음: ' + p.errors.join(' | '));
  p.enter({ amount: 6600, vendor: '커피', memo: '커피3잔', date: '2026-09-06' });
  await p.idle();
  ok(srv.live().length === 1, '서버 1건 (실제 ' + srv.live().length + ')');
  for (let i = 0; i < 3; i++) { st = p.dump(); p.dom.window.close(); p = openPage(srv, st); await p.ready(); await p.idle(); }
  ok(srv.db.biz_tx.length === 1 && srv.live().length === 1, '새로고침 3번 뒤에도 서버 행 1개 (전체 ' + srv.db.biz_tx.length + ')');
  ok(p.w.__P.state.tx.length === 1, '화면 1건');

  console.log('▶ B. 지난달 날짜로 기록 → 그 달로 넘어가 보여준다');
  p.enter({ amount: 77000, vendor: '네이버주문', memo: '계단컨트롤러', date: '2026-07-12' });
  await p.idle();
  ok(p.w.__P.view.getMonth() === 6, '보기 달이 7월로 이동 (실제 ' + (p.w.__P.view.getMonth() + 1) + '월)');
  ok(!!p.$('#list .tx[data-txid]') && p.$('#list').innerHTML.includes('계단컨트롤러'), '목록에 방금 거래가 보임');

  console.log('▶ C. 안 보이는 줄 알고 똑같이 다시 입력 → 확인창, 취소하면 두 건 안 생김');
  p.confirms.length = 0;
  const before = srv.live().length;
  const p2 = p; p2.w.confirm = (m) => { p2.confirms.push(m); return false; };
  p2.enter({ amount: 77000, vendor: '네이버주문', memo: '계단컨트롤러', date: '2026-07-12' });
  await p2.idle();
  ok(p2.confirms.some(m => /이미 1건/.test(m)), '중복 확인창이 떠야 함');
  ok(srv.live().length === before, '취소 → 서버 건수 그대로 (전 ' + before + ' 후 ' + srv.live().length + ')');
  ok(!p2.$('#shAdd').classList.contains('on'), '시트 닫힘');

  console.log('▶ D. 기록하기 두 번 연속 탭 → 1건');
  p2.w.confirm = () => true;
  const d = p2.w.document;
  d.querySelector('#fab').click();
  d.querySelector('#amtInput').value = '12000';
  d.querySelector('#vendorInput').value = '짜장면';
  d.querySelector('#saveTx').click(); d.querySelector('#saveTx').click();
  await p2.idle();
  ok(srv.live().filter(r => r.vendor === '짜장면').length === 1, '짜장면 1건 (실제 ' + srv.live().filter(r => r.vendor === '짜장면').length + ')');

  console.log('▶ E. 다른 직원이 넣은 1.5억 — 받기만 하고 새로고침 → 휴지통 가지 않음');
  srv.addTx({ type: 'in', category: '공사수입', amount: 150000000, memo: '4차 중도금', tx_date: '2026-09-12', created_by: 'other' });
  await p2.w.BIZDB.pull();
  st = p2.dump(); p2.dom.window.close();
  const p3 = openPage(srv, st); await p3.ready(); await p3.idle();
  ok(srv.db.biz_tx.find(r => r.memo === '4차 중도금').deleted_at == null, '4차 중도금 살아 있음');
  ok(p3.w.__P.state.tx.some(t => t.memo === '4차 중도금'), '화면에 보임');

  console.log('▶ F. 삭제 → 실행취소 → 서버에서도 살아 있음');
  const target = p3.w.__P.state.tx.find(t => t.vendor === '짜장면');
  p3.w.deleteTx(target.id);
  await p3.idle();
  ok(srv.db.biz_tx.find(r => r.vendor === '짜장면').deleted_at != null, '휴지통');
  p3.$('#toastAct').click();
  await p3.idle();
  ok(srv.db.biz_tx.find(r => r.vendor === '짜장면').deleted_at == null, '실행취소로 살아남');
  ok(p3.errors.length === 0, '콘솔 오류 없음: ' + p3.errors.join(' | '));

  console.log('▶ H. 검토 지적 수정분 — 금액 해석·id 고유·고정항목 건너뛰기·수정 중 이체 차단·현장 입력 기본값');
  const W = p3.w;
  ok(W.eval('normAmt("15,000.00")') === 15000, 'normAmt 소수점 (실제 ' + W.eval('normAmt("15,000.00")') + ')');
  ok(W.eval('normAmt("-50,000")') === 50000 && W.eval('isNegAmt("-50,000")') === true && W.eval('isNegAmt("50,000")') === false, '음수 판별');
  ok(W.eval('todayStr()===localDay()'), 'todayStr = 한국 날짜');
  const ids = W.eval('Array.from({length:300},()=>newTxId())');
  ok(new Set(ids).size === 300, '연속 발급 id 300개 모두 고유');
  // 고정항목: 생성 → 삭제 → 다시 안 생김 → 서버 skip 기록
  W.eval(`state.recurring.push({id:4242,type:'out',cat:'이자·금융',ico:'🏦',amount:560655,memo:'무쏘 할부',day:14,acct:'사업통장',start:ym(new Date())});applyRecurring();`);
  const rtx = W.__P.state.tx.filter(t => t.rid === 4242);
  ok(rtx.length === 1, '이달 고정거래 1건 생성');
  W.deleteTx(rtx[0].id);
  W.eval('applyRecurring()');
  ok(W.__P.state.tx.filter(t => t.rid === 4242).length === 0, '지운 달은 다시 생기지 않음');
  await p3.idle(); await W.BIZDB.pushNow();
  const srec = srv.db.biz_recurring.find(r => r.local_id === '4242');
  ok(srec && Array.isArray(srec.skip_months) && srec.skip_months.length === 1, '서버에 건너뛴 달 기록 (' + JSON.stringify(srec && srec.skip_months) + ')');
  // 수정 중 이체 전환 차단
  const any = W.__P.state.tx.find(t => !t.tf);
  const nBefore = W.__P.state.tx.length;
  W.openEdit(any.id); W.document.querySelector('#tTr').click(); W.document.querySelector('#saveTx').click();
  ok(W.__P.state.tx.length === nBefore, '수정 중 이체로 저장해도 거래가 늘지 않음');
  W.closeSheet('Add'); W.resetAddSheet();
  await new Promise(r => setTimeout(r, 750));
  // 현장 화면 기록 기본 = 지출
  W.eval(`curSite='쌍용동1407'`);
  W.document.querySelector('#sdAddTx').click();
  ok(W.eval('form.type') === 'out', '현장 화면 거래 기본 유형 = 지출');
  W.closeSheet('Add'); W.resetAddSheet();
  ok(p3.errors.length === 0, '콘솔 오류 없음: ' + p3.errors.join(' | '));

  console.log('▶ G. v2 캐시(uid 없는 마지막 거래 + 그 뒤 받은 남의 거래가 base 에만)로 새 코드 첫 부팅');
  const srv2 = makeServer();
  const mine = srv2.addTx({ local_id: '1789051534826', memo: '계단컨트롤러', amount: 77000, tx_date: '2026-07-12', account: '사업통장', vendor: '네이버주문', category: '현장경비', supply_amount: 77000, vat_mode: 'none' });
  const other = srv2.addTx({ memo: '4차 중도금', type: 'in', category: '공사수입', amount: 150000000 });
  const v2cache = { tx: [{ id: 1789051534826, type: 'out', cat: '현장경비', ico: '🏗️', amount: 77000, memo: '계단컨트롤러', date: '2026-07-12', acct: '사업통장', vendor: '네이버주문', site: '', vatm: 'none', supply: 77000, vat: 0, evid: '카드', cr: 0, att: [], synced: false }],
    budgets: { total: 0, cats: {} }, recurring: [], sites: [], events: [], contracts: {}, accounts: [{ name: '사업통장', ico: '🏦', init: 0 }], goals: [] };
  const p4 = openPage(srv2, { ledger_biz_v1: JSON.stringify(v2cache), bocbiz_syncbase_v2: JSON.stringify({ tx: { [mine.id]: '{}', [other.id]: '{}' } }) });
  await p4.ready(); await p4.idle();
  ok(srv2.db.biz_tx.find(r => r.id === other.id).deleted_at == null, '4차 중도금 살아 있음');
  ok(srv2.db.biz_tx.filter(r => r.local_id === '1789051534826').length === 1, '계단컨트롤러 복제 없음 (실제 ' + srv2.db.biz_tx.filter(r => r.local_id === '1789051534826').length + ')');
  ok(srv2.db.biz_tx.find(r => r.id === mine.id).deleted_at == null, '원래 행 유지');
  ok(p4.errors.length === 0, '콘솔 오류 없음: ' + p4.errors.join(' | '));

  console.log(`\n합계: 통과 ${pass} · 실패 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
