// LH 건축구조도면공개 58건 일괄 다운로드 — 진짜 파일 경로는 boardDownload.es?bid=0057&list_no=&seq=1
// (attachApiPreview 는 Synap 이미지 뷰어라 원본이 아니다). 크기 상한 있음, 받은 건 건너뜀.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
const UA = { 'User-Agent': 'Mozilla/5.0 ecorean-plans/1.0 (+https://ecorean.net)' };
const MAX_MB = +(process.argv[2] || 150);
const DIR = 'assets/plan-pdf/lh'; mkdirSync(DIR, { recursive: true });
const list = JSON.parse(readFileSync('scripts/lh-structural-list.json', 'utf8'));
let ok = 0, skip = 0, fail = 0;
for (const it of list.sort((a, b) => a.mb - b.mb)) {
  const out = `${DIR}/lh-${it.list_no}.pdf`;
  if (existsSync(out)) { skip++; continue; }
  if (it.mb > MAX_MB) { skip++; continue; }
  const u = `https://www.lh.or.kr/boardDownload.es?bid=0057&list_no=${it.list_no}&seq=1`;
  try {
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(1200000) });
    const ct = r.headers.get('content-type') || '';
    if (!r.ok || /html/.test(ct)) { fail++; console.log('  ✗', it.list_no, r.status, ct.slice(0, 20)); continue; }
    const name = decodeURIComponent(r.headers.get('content-disposition') || '').replace(/^.*filename="?/, '').replace(/"?$/, '');
    const b = Buffer.from(await r.arrayBuffer());
    writeFileSync(out, b); it.saved = out; it.name = name; ok++;
    console.log('  ✓', (b.length / 1048576).toFixed(1) + 'MB', name.slice(0, 50));
  } catch (e) { fail++; console.log('  ✗', it.list_no, e.message.slice(0, 50)); }
  await new Promise(s => setTimeout(s, 1500));
}
writeFileSync('scripts/lh-structural-list.json', JSON.stringify(list, null, 1));
console.log(`✅ 받음 ${ok} · 건너뜀 ${skip} · 실패 ${fail}`);
