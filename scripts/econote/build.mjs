import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../sites/net/public/work/notes/econote-editor.js');
await build({
  entryPoints: [path.join(here, 'entry.js')],
  bundle: true, minify: true, format: 'iife', globalName: 'EcoTiptap',
  target: ['es2019'], outfile: out, legalComments: 'none', logLevel: 'info',
  banner: { js: '/* EcoNote editor bundle — Tiptap v3 (MIT). 소스: scripts/econote/entry.js, 빌드: npm run build */' },
});
