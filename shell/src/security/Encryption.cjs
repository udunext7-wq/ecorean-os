// ECOREAN BOC v5.6 — 개인정보 암호화 (AES-256-GCM)
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function deriveKey(masterKey, salt) {
  if (!masterKey) throw new Error('마스터 키 필수');
  return crypto.scryptSync(masterKey, salt || 'ecorean-boc-v5.6', KEY_LENGTH);
}

function encrypt(plaintext, masterKey) {
  if (plaintext == null || plaintext === '') return '';
  const key = deriveKey(masterKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return iv.toString('base64') + '.' + tag.toString('base64') + '.' + encrypted.toString('base64');
}

function decrypt(ciphertext, masterKey) {
  if (!ciphertext) return '';
  const parts = ciphertext.split('.');
  if (parts.length !== 3) throw new Error('잘못된 암호화 형식');

  const iv = Buffer.from(parts[0], 'base64');
  const tag = Buffer.from(parts[1], 'base64');
  const encrypted = Buffer.from(parts[2], 'base64');

  const key = deriveKey(masterKey);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}

function mask(value, type) {
  if (!value) return '';
  switch (type) {
    case 'phone':
      return String(value).replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3');
    case 'email':
      return String(value).replace(/^(.)(.+)(@.+)$/, '$1***$3');
    case 'name': {
      const s = String(value);
      if (s.length <= 1) return s;
      if (s.length === 2) return s[0] + '*';
      return s[0] + '*'.repeat(s.length - 2) + s.slice(-1);
    }
    case 'rrn':
      return String(value).replace(/(\d{6})-?(\d)(\d{6})/, '$1-$2******');
    default:
      return '***';
  }
}

function hash(value, salt) {
  if (!value) return '';
  return crypto.createHash('sha256').update((salt || '') + String(value)).digest('hex');
}

module.exports = {
  encrypt: encrypt,
  decrypt: decrypt,
  mask: mask,
  hash: hash,
  ALGORITHM: ALGORITHM
};
