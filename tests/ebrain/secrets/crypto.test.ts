import { describe, expect, test, afterEach } from 'bun:test';
import { decrypt, encrypt } from '../../../src/ebrain/secrets/crypto.ts';
import { _setMasterKeyForTest } from '../../../src/ebrain/secrets/master-key.ts';
import { withEnv } from '../../../test/helpers/with-env.ts';

const PREFIX = 'encrypted:';

function key(fill: number): string {
  return Buffer.alloc(32, fill).toString('base64');
}

async function withSecretsKey<T>(fill: number, fn: () => T | Promise<T>): Promise<T> {
  _setMasterKeyForTest(null);
  return withEnv({ EBRAIN_SECRETS_KEY: key(fill) }, async () => {
    try {
      return await fn();
    } finally {
      _setMasterKeyForTest(null);
    }
  });
}

function tamper(ciphertext: string): string {
  const payload = Buffer.from(ciphertext.slice(PREFIX.length), 'base64');
  payload[payload.length - 1] = payload[payload.length - 1] ^ 0xff;
  return `${PREFIX}${payload.toString('base64')}`;
}

afterEach(() => {
  _setMasterKeyForTest(null);
});

describe('Ebrain AES-256-GCM crypto helpers', () => {
  test('round-trips encrypted text', async () => {
    await withSecretsKey(1, () => {
      const ciphertext = encrypt('client secret');
      expect(decrypt(ciphertext)).toBe('client secret');
    });
  });

  test('uses a different IV for the same plaintext', async () => {
    await withSecretsKey(1, () => {
      const first = encrypt('same plaintext');
      const second = encrypt('same plaintext');
      expect(first).not.toBe(second);
      expect(decrypt(first)).toBe('same plaintext');
      expect(decrypt(second)).toBe('same plaintext');
    });
  });

  test('rejects tampered ciphertext', async () => {
    await withSecretsKey(1, () => {
      const ciphertext = encrypt('tamper target');
      expect(() => decrypt(tamper(ciphertext))).toThrow();
    });
  });

  test('rejects ciphertext encrypted with a different key', async () => {
    await withSecretsKey(1, () => {
      const ciphertext = encrypt('wrong key target');
      _setMasterKeyForTest(Buffer.alloc(32, 2));
      expect(() => decrypt(ciphertext)).toThrow();
    });
  });

  test('round-trips empty, UTF-8, and long plaintext', async () => {
    await withSecretsKey(1, () => {
      for (const plaintext of [
        '',
        'finance signal: 收入增长 12%',
        'long-secret-'.repeat(2048),
      ]) {
        expect(decrypt(encrypt(plaintext))).toBe(plaintext);
      }
    });
  });

  test('emits the encrypted prefix', async () => {
    await withSecretsKey(1, () => {
      expect(encrypt('prefixed')).toStartWith(PREFIX);
    });
  });

  test('rejects strings without the encrypted prefix', () => {
    expect(() => decrypt('plain text')).toThrow();
  });
});
