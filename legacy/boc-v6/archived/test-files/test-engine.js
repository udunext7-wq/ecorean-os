/**
 * boc-engine.js 테스트 러너
 * shared/package.json "type":"module" 환경에서 UMD 엔진을 CJS로 로딩
 */
const fs   = require('fs')
const path = require('path')

const src    = fs.readFileSync(path.join(__dirname, 'shared/engine/boc-engine.js'), 'utf8')
const mod    = { exports: {} }
const loader = new Function('module', 'exports', 'require', '__dirname', '__filename', src)
loader(mod, mod.exports, require, __dirname, __filename)
const E = mod.exports

const engines = [
  ['CalcEngine',     E.CalcEngine],
  ['OntologyEngine', E.OntologyEngine],
  ['DiagEngine',     E.DiagEngine],
  ['ScheduleEngine', E.ScheduleEngine],
  ['FinanceEngine',  E.FinanceEngine],
]

let passed = 0, failed = 0
for (const [name, eng] of engines) {
  try {
    eng.runTests()
    console.log('[PASS] ' + name)
    passed++
  } catch (e) {
    console.error('[FAIL] ' + name + ': ' + e.message)
    failed++
  }
}

const assertCount = (src.match(/assert\(/g) || []).length
console.log('\n총 assert 수: ' + assertCount)
console.log('결과: ' + passed + '/' + engines.length + ' 엔진 통과' + (failed ? ' (FAIL: ' + failed + ')' : ''))
process.exit(failed > 0 ? 1 : 0)
