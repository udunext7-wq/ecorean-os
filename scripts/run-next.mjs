// next 실행 래퍼 — exFAT readlink 교정 패치(NODE_OPTIONS --require)를 주입한 뒤
// next CLI를 그대로 실행한다. 사용: node scripts/run-next.mjs build|dev|start [args]
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixPath = path.join(here, 'fix-exfat-readlink.cjs');

const require = createRequire(path.join(here, '..', 'package.json'));
const nextBin = require.resolve('next/dist/bin/next');

const nodeOptions = [process.env.NODE_OPTIONS, `--require ${fixPath}`]
  .filter(Boolean)
  .join(' ');

const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
});
child.on('exit', (code) => process.exit(code ?? 1));
