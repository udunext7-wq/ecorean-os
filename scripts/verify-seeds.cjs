// scripts/verify-seeds.cjs
const fs = require('fs');
const path = require('path');

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'seeds', 'manifest.json'), 'utf8'));

let totalActual = 0;
let allPass = true;

manifest.files.forEach(f => {
  const filePath = path.join(__dirname, '..', 'seeds', f.name);
  if (!fs.existsSync(filePath)) {
    console.error('FAIL: missing ' + f.name);
    allPass = false;
    return;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const actual = Array.isArray(data) ? data.length : Object.keys(data).length;
  totalActual += actual;
  if (actual !== f.count) {
    console.error('FAIL: ' + f.name + ' expected ' + f.count + ' got ' + actual);
    allPass = false;
  } else {
    console.log('PASS: ' + f.name + ' = ' + actual);
  }
});

if (totalActual !== manifest.totalEntries) {
  console.error('FAIL: total ' + totalActual + ' / expected ' + manifest.totalEntries);
  allPass = false;
}

console.log('TOTAL: ' + totalActual + '/' + manifest.totalEntries);
process.exit(allPass ? 0 : 1);
