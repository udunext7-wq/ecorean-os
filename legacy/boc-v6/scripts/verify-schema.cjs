// scripts/verify-schema.cjs
const fs = require('fs');
const path = require('path');

let allPass = true;
const schemaDir = path.join(__dirname, '..', 'packages', 'schema');
const requiredSchemas = ['minicad-v6.0.json', 'estimate-v6.0.json'];

requiredSchemas.forEach(s => {
  const p = path.join(schemaDir, s);
  if (!fs.existsSync(p)) {
    console.error('FAIL: ' + s + ' missing');
    allPass = false;
    return;
  }
  try {
    const json = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!json['$schema']) {
      console.error('FAIL: ' + s + ' has no $schema field');
      allPass = false;
    } else {
      console.log('PASS: ' + s);
    }
  } catch (e) {
    console.error('FAIL: ' + s + ' invalid JSON: ' + e.message);
    allPass = false;
  }
});

process.exit(allPass ? 0 : 1);
