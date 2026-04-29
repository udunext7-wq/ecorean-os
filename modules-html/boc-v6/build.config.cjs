// ECOREAN BOC v6.0 — esbuild 번들링 설정
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const config = {
  entryPoints: [path.join(__dirname, 'src/shell/main.js')],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  globalName: 'BOC',
  outfile: path.join(__dirname, 'build', 'boc-v6.bundle.js'),
  sourcemap: 'inline',
  target: ['es2020'],
  resolveExtensions: ['.js', '.cjs', '.mjs'],
  alias: {
    '@core-bus':      path.join(ROOT, 'shell/src/core-bus'),
    '@gates':         path.join(ROOT, 'shell/src/gates'),
    '@meta':          path.join(ROOT, 'shell/src/meta'),
    '@korea':         path.join(ROOT, 'shell/src/korea'),
    '@security':      path.join(ROOT, 'shell/src/security'),
    '@closed-loop':   path.join(ROOT, 'shell/src/closed-loop'),
    '@ml':            path.join(ROOT, 'shell/src/ml'),
    '@feature-flags': path.join(ROOT, 'shell/src/feature-flags'),
    '@estimate-v6':   path.join(ROOT, 'modules-html/estimate-v6/src'),
    '@kpi-v6':        path.join(ROOT, 'modules-html/kpi-v6/src'),
    '@cad':           path.join(ROOT, 'modules-html/cad/src')
  },
  external: [
    'better-sqlite3',
    'crypto',
    'fs',
    'path'
  ],
  define: {
    'process.env.NODE_ENV': '"development"',
    '__BOC_VERSION__': '"6.0.0-alpha.1"'
  },
  logLevel: 'info'
};

module.exports = { config: config, ROOT: ROOT };
