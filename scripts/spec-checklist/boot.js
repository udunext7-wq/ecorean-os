// 실제 부팅 재현 — jsdom 으로 페이지를 띄워 렌더까지 도는지 본다.
// window.storage 는 페이지가 스스로 폴리필하지만, 외부 브라우저 경로를 타도록 localStorage 를 살려 둔다.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = 'C:/Users/udune/ecorean-os/sites/net/public/spec';
const targets = process.argv.slice(2);
let allPass = true;

(async () => {
  for (const d of targets) {
    const html = fs.readFileSync(path.join(ROOT, d, 'index.html'), 'utf8');
    const errors = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => errors.push(e.message));
    vc.on('error', (...a) => errors.push(String(a[0])));

    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://ecorean.net/spec/' + d + '/',
      virtualConsole: vc,
    });
    const w = dom.window;
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));

    await new Promise(r => setTimeout(r, 700));

    const q = s => w.document.querySelector(s);
    const qa = s => w.document.querySelectorAll(s);
    const checks = [];
    const need = (label, cond) => { checks.push(label + (cond ? '' : ' ✗')); if (!cond) allPass = false; };

    need('탭8', qa('.tab').length === 8);
    need('페이지8', qa('.page').length === 8);
    need('체크리스트렌더', qa('#page-checklist .item').length > 60);
    need('자재렌더', qa('#page-materials tr').length > 25);
    need('서브필터', qa('[data-sub-filter], .sub-filter, .fbtn').length > 0);
    need('제목', /BOC/.test((q('title') || {}).textContent || ''));
    need('스코어', !!q('.score-label, #scoreVal, .score'));
    need('무오류', errors.length === 0);

    const items = qa('#page-checklist .item').length;
    const mats = qa('#page-materials tr').length;
    console.log(
      (checks.every(c => !c.endsWith('✗')) ? 'PASS ' : 'FAIL ') + d.padEnd(11) +
      ' item=' + String(items).padStart(3) + ' matRow=' + String(mats).padStart(3) +
      ' | ' + checks.join(' ') +
      (errors.length ? '\n       err: ' + errors.slice(0, 3).join(' // ') : '')
    );
    dom.window.close();
  }
  process.exit(allPass ? 0 : 1);
})();
