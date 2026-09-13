/* 사업장부 동기화 회귀 시험 — 2026-09-13 사고 재현
   실행: node tests/biz-sync/sync.test.cjs
   사고 1 (09-13 23:13): 캐시가 오래된 기기가 페이지를 다시 열자, 그 사이 받아둔 남의 거래 5건(4차 중도금 1.5억 포함)을 휴지통으로 보냈다
   사고 2 (09-08~13): 새로 쓴 거래가 다시 열 때마다 '지우고 새로 만들기'로 복제됐다 (같은 local_id 로 5벌까지)
   사고 3 (09-11 23:38): 스냅샷 되돌리기가 그날 저녁 입력 161건을 말없이 휴지통으로 보냈다 */
'use strict';
const { makeServer, makeStorage, openPage, KEY } = require('./harness.cjs');

let pass = 0, fail = 0;
const results = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; results.push('  ✗ ' + msg); } }
async function test(name, fn) {
  const before = fail;
  try { await fn(); } catch (e) { fail++; results.push('  ✗ 예외: ' + (e && e.stack || e)); }
  results.unshift((fail === before ? '✅ ' : '❌ ') + name);
  console.log((fail === before ? '✅ ' : '❌ ') + name);
  results.filter(r => r.startsWith('  ')).forEach(r => console.log(r));
  results.length = 0;
}

(async () => {

  await test('1. 새로 쓴 거래를 다시 열어도 복제되지 않는다 (같은 행 유지)', async () => {
    const srv = makeServer(), ls = makeStorage();
    const p1 = openPage(srv, ls); await p1.boot();
    p1.addTx({ memo: '커피', amount: 6600 });
    await p1.BIZDB.pushNow();
    const firstId = srv.live()[0].id;
    // 모바일에서 탭이 죽고 다시 열림
    const p2 = openPage(srv, ls); await p2.boot();
    const p3 = openPage(srv, ls); await p3.boot();
    ok(srv.db.biz_tx.length === 1, '서버 행 수 1 이어야 함 (실제 ' + srv.db.biz_tx.length + ')');
    ok(srv.live().length === 1 && srv.live()[0].id === firstId, '처음 만든 행이 그대로 살아 있어야 함');
    ok(p3.state.tx.length === 1, '화면 거래 1건 (실제 ' + p3.state.tx.length + ')');
  });

  await test('2. 받아두기만 하고 저장 안 한 남의 거래가, 다시 열 때 휴지통으로 가지 않는다', async () => {
    const srv = makeServer(), ls = makeStorage();
    const a = openPage(srv, ls); await a.boot();
    a.addTx({ memo: '내 거래', amount: 1000 }); await a.BIZDB.pushNow();
    // 다른 직원(휴대폰)이 1.5억 입금 기록
    srv.addTx({ type: 'in', category: '공사수입', amount: 150000000, memo: '4차 중도금', created_by: 'other' });
    await a.BIZDB.pull();            // 30초 폴링으로 받음 — 사용자는 아무것도 저장하지 않음
    ok(a.txByMemo('4차 중도금').length === 1, '폴링으로 받아와야 함');
    const b = openPage(srv, ls); await b.boot();   // 새로고침
    const row = srv.db.biz_tx.find(r => r.memo === '4차 중도금');
    ok(row.deleted_at == null, '4차 중도금이 휴지통으로 가면 안 됨');
    ok(b.txByMemo('4차 중도금').length === 1, '새로고침 후 화면에 보여야 함');
  });

  await test('3. 같은 브라우저 탭 두 개 — 오래된 탭이 저장해도 다른 탭 입력을 지우지 않는다', async () => {
    const srv = makeServer(), ls = makeStorage();
    const old = openPage(srv, ls); await old.boot();
    const cur = openPage(srv, ls); await cur.boot();
    cur.addTx({ memo: '새 탭 입력', amount: 5000 }); await cur.BIZDB.pushNow();
    await cur.BIZDB.pull();
    old.addTx({ memo: '옛 탭 입력', amount: 7000 }); await old.BIZDB.pushNow();
    ok(srv.live().some(r => r.memo === '새 탭 입력'), '새 탭 입력이 살아 있어야 함');
    ok(srv.live().some(r => r.memo === '옛 탭 입력'), '옛 탭 입력도 올라가야 함');
    await old.BIZDB.pull();
    ok(old.txByMemo('새 탭 입력').length === 1, '옛 탭도 받아와야 함');
  });

  await test('4. 수정은 같은 행을 고친다 (지우고 새로 만들지 않는다)', async () => {
    const srv = makeServer(), ls = makeStorage();
    const p = openPage(srv, ls); await p.boot();
    const t = p.addTx({ memo: '커피', amount: 6600 }); await p.BIZDB.pushNow();
    const p2 = openPage(srv, ls); await p2.boot();   // 저장 직후 탭이 죽었다 다시 열림
    p2.editTx(t.id, { amount: 4000 }); await p2.BIZDB.pushNow();
    ok(srv.db.biz_tx.length === 1, '서버 행 1개여야 함 (실제 ' + srv.db.biz_tx.length + ')');
    ok(srv.live()[0].amount === 4000, '금액이 4000 으로 고쳐져야 함');
  });

  await test('5. 삭제는 다른 기기로 전파되고, 되살아나지 않는다', async () => {
    const srv = makeServer();
    const lsA = makeStorage(), lsB = makeStorage();
    const A = openPage(srv, lsA); await A.boot();
    const t = A.addTx({ memo: '지울 것', amount: 100 }); A.addTx({ memo: '남길 것', amount: 200 });
    await A.BIZDB.pushNow();
    const B = openPage(srv, lsB); await B.boot();
    ok(B.state.tx.length === 2, 'B 가 2건 받음');
    A.deleteTx(t.id); await A.BIZDB.pushNow();
    ok(srv.trashed().length === 1 && srv.trashed()[0].memo === '지울 것', '서버 휴지통으로');
    await B.BIZDB.pull();
    ok(B.txByMemo('지울 것').length === 0, 'B 에서도 사라져야 함');
    await B.BIZDB.pushNow();
    const A2 = openPage(srv, lsA); await A2.boot();
    ok(srv.live().length === 1 && srv.live()[0].memo === '남길 것', '되살아나면 안 됨');
    ok(A2.state.tx.length === 1, 'A 새로고침 후 1건');
  });

  await test('6. 저장 직후(전송 전) 탭이 죽어도 삭제가 사라지지 않는다', async () => {
    const srv = makeServer(), ls = makeStorage();
    const p = openPage(srv, ls); await p.boot();
    const t = p.addTx({ memo: '지울 것', amount: 100 }); await p.BIZDB.pushNow();
    const p2 = openPage(srv, ls); await p2.boot();
    p2.deleteTx(t.id);               // 캐시엔 지워진 상태로 저장, 900ms 전송 전에 탭이 죽음
    const p3 = openPage(srv, ls); await p3.boot();
    ok(srv.live().length === 0, '다시 열었을 때 삭제가 서버에 반영돼야 함 (살아있음 ' + srv.live().length + ')');
    ok(p3.state.tx.length === 0, '화면에서도 없어야 함');
  });

  await test('7. 휴지통 보낸 뒤 실행취소하면 서버에서도 되살아난다', async () => {
    const srv = makeServer(), ls = makeStorage();
    const p = openPage(srv, ls); await p.boot();
    const t = p.addTx({ memo: '실수로 지움', amount: 100 }); await p.BIZDB.pushNow();
    const removed = p.state.tx.find(x => x.id === t.id);
    p.deleteTx(t.id); await p.BIZDB.pushNow();
    ok(srv.live().length === 0, '휴지통으로 감');
    p.state.tx.push(removed); p.save(); await p.BIZDB.pushNow();   // 토스트 '실행취소'
    ok(srv.live().length === 1, '실행취소가 서버에 반영돼야 함');
    await p.BIZDB.pull();
    ok(p.state.tx.length === 1, 'pull 뒤에도 남아 있어야 함');
  });

  await test('8. 오프라인에서 쓴 거래는 다시 열어도 남아 있다가 연결되면 한 번만 올라간다', async () => {
    const srv = makeServer(), ls = makeStorage();
    const p = openPage(srv, ls); await p.boot();
    srv.offline = true;
    p.addTx({ memo: '현장 지하 (전파 없음)', amount: 3000 });
    await p.BIZDB.pushNow().catch(() => {});
    const p2 = openPage(srv, ls); await p2.boot().catch(() => {});
    srv.offline = false;
    const p3 = openPage(srv, ls); await p3.boot();
    await p3.BIZDB.pushNow();
    ok(srv.live().filter(r => r.memo === '현장 지하 (전파 없음)').length === 1, '정확히 1건 올라가야 함 (실제 ' + srv.live().length + ')');
  });

  await test('9. 다른 직원의 수정은 받아오고, 내 미전송 수정은 덮이지 않는다', async () => {
    const srv = makeServer();
    const A = openPage(srv, makeStorage()); await A.boot();
    const t1 = A.addTx({ memo: '가', amount: 1 }); const t2 = A.addTx({ memo: '나', amount: 2 });
    await A.BIZDB.pushNow();
    srv.db.biz_tx.find(r => r.memo === '가').amount = 111;   // 다른 직원이 수정
    A.editTx(t2.id, { amount: 222 });                          // 나는 '나'를 수정 (아직 전송 전)
    await A.BIZDB.pull();
    ok(A.state.tx.find(x => x.memo === '가').amount === 111, '남의 수정 받아옴');
    ok(A.state.tx.find(x => x.memo === '나').amount === 222, '내 수정 유지');
    await A.BIZDB.pushNow();
    ok(srv.db.biz_tx.find(r => r.memo === '나').amount === 222, '내 수정 전송');
    ok(srv.db.biz_tx.find(r => r.memo === '가').amount === 111, '남의 수정을 덮어쓰지 않음');
  });

  await test('10. 옛 버전(v2) 캐시에서 넘어올 때 — 09-13 사고 기기 그대로 재현해도 아무것도 지우지 않는다', async () => {
    const srv = makeServer();
    // 옛 코드가 남긴 상태: 캐시엔 uid 없는 마지막 거래 + 서버에서 이미 지워진 행, base 엔 그 뒤 받은 남의 거래
    const mine = srv.addTx({ local_id: '1789051534826', memo: '계단컨트롤러', amount: 77000, created_by: 'user-kim' });
    const others = srv.addTx({ memo: '4차 중도금', type: 'in', amount: 150000000, created_by: 'other' });
    const gone = srv.addTx({ memo: '남이 지운 행', amount: 5 });
    gone.deleted_at = new Date().toISOString();
    const toRowStr = (r) => JSON.stringify({ id: r.id }); // 옛 base 해시는 내용과 달라도 된다(아래 규칙 확인용)
    const ls = makeStorage();
    ls.setItem(KEY, JSON.stringify({
      tx: [
        { id: 1789051534826, type: 'out', cat: '자재비', amount: 77000, memo: '계단컨트롤러', date: '2026-09-10', acct: '사업통장', site: '' },
        { uid: gone.id, id: Number(gone.local_id), type: 'out', cat: '자재비', amount: 5, memo: '남이 지운 행', date: '2026-09-10', acct: '사업통장', site: '' }
      ],
      accounts: [], recurring: [], goals: [], events: [], sites: [], contracts: {}, budgets: { total: 0, cats: {} }
    }));
    ls.setItem('bocbiz_syncbase_v2', JSON.stringify({ tx: { [mine.id]: toRowStr(mine), [others.id]: toRowStr(others) } }));
    const p = openPage(srv, ls); await p.boot();
    ok(srv.db.biz_tx.find(r => r.id === others.id).deleted_at == null, '4차 중도금이 휴지통으로 가면 안 됨');
    ok(srv.db.biz_tx.find(r => r.id === mine.id).deleted_at == null, '계단컨트롤러 원래 행이 살아 있어야 함');
    ok(srv.db.biz_tx.filter(r => r.local_id === '1789051534826').length === 1, '계단컨트롤러가 복제되면 안 됨 (실제 ' + srv.db.biz_tx.filter(r => r.local_id === '1789051534826').length + ')');
    ok(srv.db.biz_tx.find(r => r.id === gone.id).deleted_at != null, '남이 지운 행은 계속 휴지통');
    ok(p.state.tx.length === 2 && !p.txByMemo('남이 지운 행').length, '화면 = 계단컨트롤러 + 4차 중도금');
  });

  await test('11. 스냅샷 되돌리기는 무엇이 휴지통으로 가는지 명시한 것만 보낸다', async () => {
    const srv = makeServer(), ls = makeStorage();
    const p = openPage(srv, ls); await p.boot();
    p.addTx({ memo: '아침 입력', amount: 1 }); await p.BIZDB.pushNow();
    const snap = JSON.parse(JSON.stringify(p.state));
    p.addTx({ memo: '저녁 입력', amount: 2 }); await p.BIZDB.pushNow();
    srv.addTx({ memo: '다른 직원 저녁 입력', amount: 3, created_by: 'other' });
    await p.BIZDB.pull();
    ok(typeof p.BIZDB.planRestore === 'function', 'planRestore 제공');
    if (typeof p.BIZDB.planRestore !== 'function') return;
    const plan = p.BIZDB.planRestore(snap);
    ok(plan.trash.tx.length === 2, '휴지통 대상 2건을 미리 보여줌 (실제 ' + plan.trash.tx.length + ')');
    ok(plan.trashOthers === 1, '그중 다른 직원 입력 1건');
    ls.setItem(KEY, JSON.stringify(plan.data));
    const p2 = openPage(srv, ls); await p2.boot();
    ok(srv.live().length === 1 && srv.live()[0].memo === '아침 입력', '그 시점 상태가 됨');
    ok(srv.trashed().length === 2, '두 건은 휴지통(되살릴 수 있음)');
  });

  await test('12. 대량 휴지통 이동은 서버 가드를 통과하는 경로(RPC)로만 보낸다', async () => {
    const srv = makeServer(), ls = makeStorage();
    srv.bulkLimit = 10;
    const p = openPage(srv, ls); await p.boot();
    for (let i = 0; i < 25; i++) p.addTx({ memo: 'r' + i, amount: i + 1 });
    await p.BIZDB.pushNow();
    p.state.tx = []; p.save(); await p.BIZDB.pushNow();   // 전체 삭제
    ok(srv.live().length === 0, '전체삭제는 된다 (살아있음 ' + srv.live().length + ')');
    ok(srv.log.some(l => l.table === 'rpc/biz_trash_bulk'), 'RPC 사용');
  });

  await test('13. 오래된 캐시가 남이 만든 현장을 보관 처리하지 않는다', async () => {
    const srv = makeServer(), ls = makeStorage();
    const p = openPage(srv, ls); await p.boot();
    srv.addSite('새현장');
    await p.BIZDB.pull();                   // 받기만 함
    const p2 = openPage(srv, ls); await p2.boot();
    ok(srv.db.work_sites.find(s => s.name === '새현장').status === '진행중', '새현장이 보관되면 안 됨');
    p2.state.sites.push('내가 추가'); p2.save(); await p2.BIZDB.pushNow();
    ok(srv.db.work_sites.find(s => s.name === '새현장').status === '진행중', '현장 추가 push 가 남의 현장을 보관하면 안 됨');
    ok(srv.db.work_sites.some(s => s.name === '내가 추가'), '내 현장은 올라감');
  });

  await test('14. 부팅 직후(현장 목록 받기 전) 저장해도 거래의 현장 연결이 끊기지 않는다', async () => {
    const srv = makeServer(), ls = makeStorage();
    const p = openPage(srv, ls); await p.boot();
    p.addTx({ memo: '현장거래', site: '쌍용동1407', amount: 10 }); await p.BIZDB.pushNow();
    const sid = srv.db.biz_tx[0].site_id;
    ok(!!sid, 'site_id 연결됨');
    const p2 = openPage(srv, ls);
    p2.load();
    p2.BIZDB.configure({ getState: () => p2.state, onChange() {}, onStatus() {}, persist: () => p2.writeCache() });
    p2.editTx(p2.state.tx[0].id, { memo: '현장거래 수정' });
    await p2.BIZDB.pushNow();               // pull 전에 push
    ok(srv.db.biz_tx[0].site_id === sid, 'site_id 가 null 로 덮이면 안 됨');
  });

  await test('15. 받기 도중 저장해도 새 거래가 사라지거나 복제되지 않는다', async () => {
    const srv = makeServer(), ls = makeStorage();
    const p = openPage(srv, ls); await p.boot();
    const pulling = p.BIZDB.pull();            // 네트워크 대기 중
    p.addTx({ memo: '받는 중 입력', amount: 10 });
    const pushing = p.BIZDB.pushNow();
    await Promise.all([pulling, pushing]);
    await p.BIZDB.pull(); await p.BIZDB.pushNow();
    ok(srv.live().filter(r => r.memo === '받는 중 입력').length === 1, '서버 1건');
    ok(p.txByMemo('받는 중 입력').length === 1, '화면 1건');
    const p2 = openPage(srv, ls); await p2.boot();
    ok(srv.db.biz_tx.length === 1 && p2.state.tx.length === 1, '다시 열어도 1건');
  });

  await test('16. 변경이 없으면 다시 열어도 쓰기 요청 0건 (전 행 재전송 없음)', async () => {
    const srv = makeServer(), ls = makeStorage();
    const p = openPage(srv, ls); await p.boot();
    for (let i = 0; i < 5; i++) p.addTx({ memo: 'x' + i, site: i % 2 ? '쌍용동1407' : '', amount: i + 1, partnerId: undefined });
    await p.BIZDB.pushNow();
    srv.addTx({ memo: '남의 것', site_name: '1번필지', site_id: srv.db.work_sites[1].id });
    await p.BIZDB.pull();
    srv.clearLog();
    const p2 = openPage(srv, ls); await p2.boot();
    await p2.BIZDB.pushNow();
    const writes = srv.log.filter(l => l.method !== 'GET' && !l.table.startsWith('rpc/biz_staff'));
    ok(writes.length === 0, '쓰기 요청 0 이어야 함 (실제 ' + writes.map(w => w.method + ' ' + w.table).join(', ') + ')');
  });

  await test('17. 직원 계정 — 회사 공용 자료는 보내지 않고 본인 거래는 올라간다', async () => {
    const srv = makeServer(), ls = makeStorage();
    srv.db.profiles.push({ id: 'user-staff', role: 'staff' });
    const p = openPage(srv, ls, { userId: 'user-staff' }); await p.boot();
    p.addTx({ memo: '직원 경비', amount: 9 });
    p.state.accounts.push({ name: '직원이 만든 계좌', ico: '🏦', init: 0 }); p.save();
    await p.BIZDB.pushNow();
    ok(srv.live().some(r => r.memo === '직원 경비'), '거래는 올라감');
    ok(!srv.log.some(l => l.method !== 'GET' && l.table === 'biz_accounts'), '계좌는 안 보냄');
    srv.clearLog();
    await p.BIZDB.pushNow();
    ok(srv.log.filter(l => l.method !== 'GET').length === 0, '보낼 수 없는 계좌 때문에 매번 헛전송하지 않음');
  });

  await test('18. 새 기기 — 기본 계좌 3개가 서버 계좌와 겹쳐 늘어나지 않는다', async () => {
    const srv = makeServer();
    const A = openPage(srv, makeStorage()); await A.boot();
    A.state.accounts = [{ name: '사업통장', ico: '🏦', init: 0 }, { name: '현금', ico: '💵', init: 0 }, { name: '사업카드', ico: '💳', init: 0 }];
    A.save(); await A.BIZDB.pushNow();
    ok(srv.db.biz_accounts.length === 3, 'A 가 3개 올림');
    const lsB = makeStorage();
    lsB.setItem(KEY, JSON.stringify({ tx: [], accounts: [{ name: '사업통장', ico: '🏦', init: 0 }, { name: '현금', ico: '💵', init: 0 }, { name: '사업카드', ico: '💳', init: 0 }], recurring: [], goals: [], events: [], sites: [], contracts: {}, budgets: { total: 0, cats: {} } }));
    const B = openPage(srv, lsB); await B.boot();
    ok(srv.db.biz_accounts.length === 3, '서버 계좌 3개 유지 (실제 ' + srv.db.biz_accounts.length + ')');
    ok(B.state.accounts.length === 3, 'B 화면 3개');
  });

  await test('19. 09-11 재현 — uid 없는 행이 든 스냅샷을 되돌려도 같은 거래가 두 벌 되지 않는다', async () => {
    const srv = makeServer(), ls = makeStorage();
    const p = openPage(srv, ls); await p.boot();
    const t = p.addTx({ memo: '정제훈 입금', type: 'in', amount: 40000000 });
    const snap = JSON.parse(JSON.stringify(p.state));     // 저장 순간 스냅샷 — 아직 uid 없음(옛 코드)
    snap.tx.forEach(x => { delete x.uid; delete x._h; });
    await p.BIZDB.pushNow();
    for (let i = 0; i < 12; i++) p.addTx({ memo: '저녁 입력 ' + i, amount: 1000 + i });
    await p.BIZDB.pushNow();
    const plan = p.BIZDB.planRestore(snap);
    ok(plan.trash.tx.length === 12, '휴지통 대상 = 저녁 입력 12건 (실제 ' + plan.trash.tx.length + ')');
    ls.setItem(KEY, JSON.stringify(plan.data));
    const p2 = openPage(srv, ls); await p2.boot();
    ok(srv.db.biz_tx.filter(r => r.memo === '정제훈 입금').length === 1, '정제훈 입금 1행 (실제 ' + srv.db.biz_tx.filter(r => r.memo === '정제훈 입금').length + ')');
    ok(srv.live().length === 1 && srv.trashed().length === 12, '살아있음 1 · 휴지통 12');
  });

  await test('20. v2 캐시 넘겨받기 — 미전송 수정은 올리고, 낡은 캐시는 남의 최신 수정을 되돌리지 않는다', async () => {
    const srv = makeServer();
    const rowA = srv.addTx({ memo: '내가 고치던 행', amount: 100 });
    const rowB = srv.addTx({ memo: '남이 고친 행', amount: 999 });   // 서버 최신
    const ls = makeStorage();
    // 캐시: A 는 내가 200 으로 고침(미전송) / B 는 옛값 500
    const obj = (r, amount, at) => ({ uid: r.id, id: Number(r.local_id), date: r.tx_date, type: 'out', tf: 0, cat: r.category, amount, supply: 1000, vat: 0, vatm: 'none', site: '', memo: r.memo, cr: 0, synced: false, src: 'manual', att: [], at });
    const oldAt = rowB.updated_at;
    rowB.updated_at = '2026-09-13T12:00:00.000Z';                    // 캐시를 받은 뒤 다른 직원이 고침
    ls.setItem(KEY, JSON.stringify({ tx: [obj(rowA, 200, rowA.updated_at), obj(rowB, 500, oldAt)], accounts: [], recurring: [], goals: [], events: [], sites: [], contracts: {}, budgets: { total: 0, cats: {} } }));
    // 옛 base: A 는 서버값(100), B 는 캐시 이후 받아둔 최신(999)
    const p0 = openPage(srv, makeStorage()); p0.load();
    const COLS_tx_toRow = (o) => { const w = {}; return w; };
    const legacyRow = (o) => JSON.stringify({ id: o.uid, tenant_id: 'HQ', local_id: String(o.id), tx_date: o.date, type: o.type, is_transfer: false, transfer_group: null, category: o.cat, icon: null, amount: o.amount, supply_amount: o.supply, vat_amount: 0, vat_mode: 'none', evidence: null, account: null, account_to: null, site_id: null, site_name: null, partner_id: null, po_id: null, vendor: null, memo: o.memo, is_credit: false, due_date: null, settled_on: null, cost_type: null, process_code: null, invoice_date: null, recurring_id: null, notion_synced: false, source: 'manual', dedupe_key: null, attachments: [] });
    ls.setItem('bocbiz_syncbase_v2', JSON.stringify({ tx: { [rowA.id]: legacyRow(obj(rowA, 100)), [rowB.id]: legacyRow(obj(rowB, 999)) } }));
    const p = openPage(srv, ls); await p.boot();
    ok(srv.db.biz_tx.find(r => r.id === rowA.id).amount === 200, '내 미전송 수정 200 이 올라가야 함 (실제 ' + srv.db.biz_tx.find(r => r.id === rowA.id).amount + ')');
    ok(srv.db.biz_tx.find(r => r.id === rowB.id).amount === 999, '남의 수정 999 가 500 으로 되돌아가면 안 됨 (실제 ' + srv.db.biz_tx.find(r => r.id === rowB.id).amount + ')');
    ok(p.state.tx.find(t => t.uid === rowB.id).amount === 999, '화면도 999');
  });

  await test('21. 이체(두 행 한 쌍) 삭제가 두 행 모두 휴지통으로', async () => {
    const srv = makeServer(), ls = makeStorage();
    const p = openPage(srv, ls); await p.boot();
    p.state.tx.push({ id: 1, tid: 9, tf: 1, type: 'out', cat: '이체', amount: 50, date: '2026-09-13', acct: '사업통장', memo: '' },
                    { id: 2, tid: 9, tf: 1, type: 'in', cat: '이체', amount: 50, date: '2026-09-13', acct: '현금', memo: '' });
    p.save(); await p.BIZDB.pushNow();
    p.state.tx = p.state.tx.filter(x => x.tid !== 9); p.save(); await p.BIZDB.pushNow();
    ok(srv.live().length === 0 && srv.trashed().length === 2, '두 행 모두 휴지통');
  });

  console.log(`\n합계: 통과 ${pass} · 실패 ${fail}`);
  process.exit(fail ? 1 : 0);
})();
