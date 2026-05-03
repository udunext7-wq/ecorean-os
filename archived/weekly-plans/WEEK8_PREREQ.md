# CLAUDE CODE — Week 8 사전 조사
# 실거래 1건 검증 — 조사만, 구현 금지
# 2026-04-30

---

## 명령: 아래 전부 실행하고 결과 그대로 출력. 구현 금지.

```bash
# 1. 현재 is_simulated=0 실거래 데이터 존재 여부
node -e "
const b = require('better-sqlite3');
const p = require('path');
const os = require('os');
const db = new b(p.join(os.homedir(), 'AppData/Roaming/ecorean-boc/ecorean-boc.db'));
try {
  const c = db.prepare('SELECT COUNT(*) as n FROM contracts WHERE is_simulated=0').get();
  const o = db.prepare('SELECT COUNT(*) as n FROM purchase_orders WHERE is_simulated=0').get();
  const s = db.prepare('SELECT COUNT(*) as n FROM schedules WHERE is_simulated=0').get();
  const i = db.prepare('SELECT COUNT(*) as n FROM inspections WHERE is_simulated=0').get();
  console.log('contracts(real):', c.n);
  console.log('orders(real):', o.n);
  console.log('schedules(real):', s.n);
  console.log('inspections(real):', i.n);
} catch(e) { console.log('DB 오류:', e.message); }
"

# 2. 실거래 검증 시나리오 관련 MASTER_PLAN 내용
grep -n "Critical C2\|실거래\|Week 8\|is_simulated=0" docs/MASTER_PLAN.md | head -20

# 3. EstimateVsActualEngine 존재 여부
find . -name "EstimateVsActual*" -not -path "*/node_modules/*"
cat shell/src/closed-loop/settlement/Settlement.cjs 2>nul | head -60 || echo "없음"

# 4. 현재 SLA 정의 (graph.json)
node -e "const g=require('./docs/graph.json'); g.nodes.forEach(n=>{ if(n.sla) console.log(n.id, JSON.stringify(n.sla)); })"

# 5. CalcEngineV56 실제 견적 계산 테스트 가능 여부
node -e "
try {
  const { calculateEstimate } = require('./shell/src/estimate-v6/calc/CalcEngineV56.cjs');
  console.log('CalcEngineV56 로드 OK');
} catch(e) { console.log('로드 실패:', e.message); }
"

# 6. App.js Week 8 placeholder 위치
grep -n "Week 8\|실거래\|_renderReal" modules-html/boc-v6/src/shell/App.js

# 7. 전체 커밋 현황
git log --oneline -10
```
