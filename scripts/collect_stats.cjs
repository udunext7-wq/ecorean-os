#!/usr/bin/env node
// 9주 통계 자동 수집
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function listCJS(dir) {
  const result = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    const items = fs.readdirSync(d);
    items.forEach(function(item) {
      const fp = path.join(d, item);
      if (fp.includes('node_modules') || fp.includes('.git') || fp.includes('backups')) return;
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) walk(fp);
      else if ((item.endsWith('.cjs') || item.endsWith('.js')) && !item.includes('.test.')) {
        result.push(fp);
      }
    });
  }
  walk(dir);
  return result;
}

function listTests(dir) {
  const result = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    const items = fs.readdirSync(d);
    items.forEach(function(item) {
      const fp = path.join(d, item);
      if (fp.includes('node_modules') || fp.includes('.git')) return;
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) walk(fp);
      else if (item.includes('.test.cjs')) result.push(fp);
    });
  }
  walk(dir);
  return result;
}

function countLines(filepath) {
  return fs.readFileSync(filepath, 'utf-8').split('\n').length;
}

const codeFiles = listCJS(path.join(ROOT, 'shell'))
  .concat(listCJS(path.join(ROOT, 'modules-html')))
  .filter(function(f) { return !f.includes('__tests__'); });

const testFiles = listTests(path.join(ROOT, 'shell'))
  .concat(listTests(path.join(ROOT, 'modules-html')));

const totalCodeLines = codeFiles.reduce(function(s, f) { return s + countLines(f); }, 0);
const totalTestLines = testFiles.reduce(function(s, f) { return s + countLines(f); }, 0);

const graph = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'graph.json'), 'utf-8'));

const stats = {
  weeks: 9,
  modules: codeFiles.length,
  testFiles: testFiles.length,
  codeLines: totalCodeLines,
  testLines: totalTestLines,
  graphNodes: graph.nodes.length,
  graphEdges: graph.edges.length,
  futureNodes: (graph.futureNodes || []).length,
  generatedAt: new Date().toISOString()
};

console.log(JSON.stringify(stats, null, 2));
fs.writeFileSync(path.join(ROOT, 'docs', 'retrospective', 'stats.json'), JSON.stringify(stats, null, 2));
