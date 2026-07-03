const { encrypt, decrypt, mask, hash } = require('../Encryption.cjs');

function assert(cond, msg) {
  if (!cond) { console.error('[FAIL]', msg); process.exit(1); }
}

const TEST_KEY = 'test-master-key-for-week7';

// Test 1: 암호화 → 복호화 라운드트립
(function() {
  const original = '홍길동';
  const enc = encrypt(original, TEST_KEY);
  assert(enc !== original, '암호화 결과 다름');
  assert(enc.includes('.'), '구분자 포함');
  const dec = decrypt(enc, TEST_KEY);
  assert(dec === original, '복호화 일치');
})();

// Test 2: 한국어 + 특수문자
(function() {
  const original = '서울특별시 강남구 역삼동 123-45 (주소)';
  const enc = encrypt(original, TEST_KEY);
  const dec = decrypt(enc, TEST_KEY);
  assert(dec === original, '한국어 라운드트립');
})();

// Test 3: 빈 값
(function() {
  assert(encrypt('', TEST_KEY) === '', '빈 문자열');
  assert(encrypt(null, TEST_KEY) === '', 'null');
  assert(decrypt('', TEST_KEY) === '', '빈 ciphertext');
})();

// Test 4: 잘못된 키 → 복호화 실패
(function() {
  const enc = encrypt('비밀데이터', TEST_KEY);
  let threw = false;
  try { decrypt(enc, 'wrong-key'); } catch(e) { threw = true; }
  assert(threw, '잘못된 키 throw');
})();

// Test 5: 매번 다른 IV (같은 평문이라도 암호문 다름)
(function() {
  const enc1 = encrypt('동일평문', TEST_KEY);
  const enc2 = encrypt('동일평문', TEST_KEY);
  assert(enc1 !== enc2, '매번 다른 암호문');
})();

// Test 6: 마스킹 — 전화번호
(function() {
  assert(mask('010-1234-5678', 'phone') === '010-****-5678', '전화 마스크');
  assert(mask('01012345678', 'phone') === '010-****-5678', '하이픈 없는 전화');
})();

// Test 7: 마스킹 — 이메일
(function() {
  assert(mask('user@example.com', 'email') === 'u***@example.com', '이메일 마스크');
})();

// Test 8: 마스킹 — 이름
(function() {
  assert(mask('홍길동', 'name') === '홍*동', '3자 이름');
  assert(mask('김철수영', 'name') === '김**영', '4자 이름');
  assert(mask('김철', 'name') === '김*', '2자 이름');
})();

// Test 9: 해시 (단방향, 검색용)
(function() {
  const h1 = hash('010-1234-5678');
  const h2 = hash('010-1234-5678');
  assert(h1 === h2, '같은 입력 같은 해시');
  assert(h1 !== '010-1234-5678', '평문 노출 X');
  assert(h1.length === 64, 'SHA-256 hex 64자');
})();

console.log('[PASS] Encryption (9/9)');
