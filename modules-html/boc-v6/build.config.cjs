// ECOREAN BOC v6.0 — esbuild 번들링 설정 (Week 7: ESM + splitting + 11 entry)
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const config = {
  entryPoints: {
    'shell':  path.join(__dirname, 'src/shell/main.js'),
    'wizard': path.join(__dirname, 'src/wizard/entry.js'),
    'cad':    path.join(__dirname, 'src/cad/entry.js'),
    'kpi':      path.join(__dirname, 'src/kpi-dashboard/entry.js'),
    'admin':    path.join(__dirname, 'src/admin/entry.js'),
    'contract':    path.join(__dirname, 'src/contract/entry.js'),
    'orders':       path.join(__dirname, 'src/orders/OrdersPage.js'),
    'schedules':    path.join(__dirname, 'src/schedules/SchedulesPage.js'),
    'inspections':  path.join(__dirname, 'src/inspections/InspectionsPage.js'),
    'topology':     path.join(__dirname, 'src/topology/TopologyPage.js'),
    'ai-executive': path.join(__dirname, 'src/ai-executive/AIExecutivePage.js')
  },
  bundle:    true,
  platform:  'browser',
  format:    'esm',
  splitting: true,
  outdir:    path.join(__dirname, 'build'),
  chunkNames: 'chunks/[name]-[hash]',
  sourcemap: 'inline',
  target:    ['es2020'],
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
    '@cost-items':    path.join(ROOT, 'shell/src/cost-items'),
    '@estimate-v6':   path.join(ROOT, 'modules-html/estimate-v6/src'),
    '@kpi-v6':        path.join(ROOT, 'modules-html/kpi-v6/src'),
    '@cad':           path.join(ROOT, 'modules-html/cad/src')
  },

  external: ['better-sqlite3', 'crypto', 'fs', 'path', 'electron'],

  define: {
    'process.env.NODE_ENV': '"development"',
    '__BOC_VERSION__': '"6.0.0-alpha.2"'
  },

  logLevel: 'info'
};

module.exports = { config: config, ROOT: ROOT };
