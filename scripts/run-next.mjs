// next 실행 래퍼 — exFAT readlink 교정 패치(NODE_OPTIONS --require)를 주입한 뒤
// next CLI를 그대로 실행한다. 사용: node scripts/run-next.mjs build|dev|start [args]
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixPath = path.join(here, 'fix-exfat-readlink.cjs');

// next 해석은 실행 위치(사이트 폴더) 기준 — 로컬은 루트 node_modules 로 폴백,
// Vercel 은 사이트 폴더의 node_modules 를 사용
const require = createRequire(path.join(process.cwd(), 'package.json'));
const nextBin = require.resolve('next/dist/bin/next');

const nodeOptions = [process.env.NODE_OPTIONS, `--require ${fixPath}`]
  .filter(Boolean)
  .join(' ');

const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});
child.on('exit', (code) => process.exit(code ?? 1));
