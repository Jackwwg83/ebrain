import crypto from 'node:crypto';
import { getEbrainMasterKey } from './master-key.ts';

const ENCRYPTED_PREFIX = 'encrypted:';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const ALGORITHM = 'aes-256-gcm';

function decodePayload(ciphertext: string): Buffer {
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    throw new Error(`Ciphertext must start with ${ENCRYPTED_PREFIX}`);
  }

  const payload = ciphertext.slice(ENCRYPTED_PREFIX.length);
  if (!payload || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload) || payload.length % 4 === 1) {
    throw new Error('Ciphertext payload must be valid base64');
  }

  const buf = Buffer.from(payload, 'base64');
  if (buf.toString('base64').replace(/=+$/, '') !== payload.replace(/=+$/, '')) {
    throw new Error('Ciphertext payload must be valid base64');
  }
  if (buf.length < IV_BYTES + AUTH_TAG_BYTES) {
    throw new Error('Ciphertext payload is too short');
  }
  return buf;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getEbrainMasterKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${Buffer.concat([iv, authTag, encrypted]).toString('base64')}`;
}

export function decrypt(ciphertext: string): string {
  const buf = decodePayload(ciphertext);
  const iv = buf.subarray(0, IV_BYTES);
  const authTag = buf.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const encrypted = buf.subarray(IV_BYTES + AUTH_TAG_BYTES);

  const decipher = crypto.createDecipheriv(ALGORITHM, getEbrainMasterKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8');
}
