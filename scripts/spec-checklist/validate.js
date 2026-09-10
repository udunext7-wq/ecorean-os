// BOC 체크리스트 산출물 검증 — 스킬 규격(JS 구문·태그 균형·탭/페이지 수) + 데이터 계층 점검
const fs = require('fs');
const path = require('path');

const ROOT = 'C:/Users/udune/ecorean-os/sites/net/public/spec';
const targets = process.argv.slice(2);

let allPass = true;

for (const d of targets) {
  const p = path.join(ROOT, d, 'index.html');
  const html = fs.readFileSync(p, 'utf8');
  const problems = [];

  // 1) 인라인 스크립트 구문
  const scripts = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
  scripts.forEach((s, i) => {
    const body = s.replace(/^<script>/, '').replace(/<\/script>$/, '');
    try { new Function(body); } catch (e) { problems.push('script[' + i + '] ' + e.message); }
  });

  // 2) 태그 균형 (자체 닫힘·void 제외)
  ['section', 'div', 'table', 'tbody', 'thead', 'nav', 'header'].forEach(t => {
    const open = (html.match(new RegExp('<' + t + '(?=[\\s>])', 'g')) || []).length;
    const close = (html.match(new RegExp('</' + t + '>', 'g')) || []).length;
    if (open !== close) problems.push(t + ' ' + open + '/' + close);
  });

  // 3) 탭 ↔ 페이지 개수
  const tabs = (html.match(/data-page="([a-z]+)"/g) || []).length;
  const pages = (html.match(/id="page-([a-z]+)"/g) || []).length;
  if (tabs !== pages) problems.push('tabs/pages ' + tabs + '/' + pages);

  // 4) 데이터 계층 — 체크리스트 항목 수·우선순위·서브시스템 정합
  const phases = (html.match(/id: 'P[0-9]',\s*name:/g) || []).length;
  const items = (html.match(/\{ id: 'P[0-9]-\d+'/g) || []).length;
  const crit = (html.match(/p: 'critical'/g) || []).length;
  const high = (html.match(/p: 'high'/g) || []).length;
  const med = (html.match(/p: 'medium'/g) || []).length;
  const mats = (html.match(/\{ id: 'M-[A-Z0-9]+'/g) || []).length;
  const cats = (html.match(/cat: '[^']+', mark:/g) || []).length;
  const co = (html.match(/\{ item: '[^']*', mat:/g) || []).length;
  const specs = (html.match(/\{ color: '#[0-9A-Fa-f]{6}'/g) || []).length;

  if (phases !== 10) problems.push('phases=' + phases);
  if (items < 80 || items > 180) problems.push('items=' + items + ' (80~180 권장)');
  if (crit + high + med !== items) problems.push('priority 합 불일치 ' + (crit + high + med) + '/' + items);
  if (mats < 30) problems.push('materials=' + mats);
  if (co < 15) problems.push('changeorder=' + co);
  if (specs < 5) problems.push('spec rows=' + specs);

  // 5) 서브시스템 키가 전부 정의돼 있는지
  const subsDef = [...html.matchAll(/^\s{2}([a-z]+):\s*\{ name: '[^']+',\s*short:/gm)].map(m => m[1]);
  const subsUsed = [...new Set([...html.matchAll(/[,{]\s*s: '([a-z]+)'/g)].map(m => m[1]))];
  const missing = subsUsed.filter(s => !subsDef.includes(s));
  if (missing.length) problems.push('미정의 subsystem: ' + missing.join(','));

  // 6) 저장소 키 격리 (같은 도메인에서 서로 안 섞여야 한다)
  const stateKey = (html.match(/'([a-z]+)-checklist-state'/) || [])[1];
  const photoNs = [...new Set([...html.matchAll(/'photo:([a-z]+):'/g)].map(m => m[1]))];
  if (!stateKey) problems.push('state key 없음');
  if (photoNs.length !== 1) problems.push('photo ns=' + JSON.stringify(photoNs));
  if (/'photo:'/.test(html)) problems.push("네임스페이스 없는 'photo:' 잔존");

  const pass = problems.length === 0;
  if (!pass) allPass = false;
  console.log(
    (pass ? 'PASS ' : 'FAIL ') + d.padEnd(11) +
    ' 단계' + phases + ' 항목' + String(items).padStart(3) +
    ' (치명' + String(crit).padStart(2) + '/高' + String(high).padStart(2) + '/中' + String(med).padStart(2) + ')' +
    ' 자재' + String(mats).padStart(3) + '(' + cats + '분류)' +
    ' 단가' + String(co).padStart(2) + ' 시방' + specs +
    ' key=' + stateKey + ' photo=' + photoNs.join(',') +
    (pass ? '' : '\n       → ' + problems.join(' | '))
  );
}

process.exit(allPass ? 0 : 1);
