import { describe, expect, test, afterEach } from 'bun:test';
import {
  _setMasterKeyForTest,
  getEbrainMasterKey,
} from '../../../src/ebrain/secrets/master-key.ts';
import { withEnv } from '../../../test/helpers/with-env.ts';

function key(bytes: number, fill = 1): string {
  return Buffer.alloc(bytes, fill).toString('base64');
}

afterEach(() => {
  _setMasterKeyForTest(null);
});

describe('Ebrain master key loading', () => {
  test('fails fast when EBRAIN_SECRETS_KEY is unset', async () => {
    await withEnv({ EBRAIN_SECRETS_KEY: undefined }, () => {
      expect(() => getEbrainMasterKey()).toThrow(/EBRAIN_SECRETS_KEY/);
    });
  });

  test('rejects keys shorter than 32 bytes', async () => {
    await withEnv({ EBRAIN_SECRETS_KEY: key(31) }, () => {
      expect(() => getEbrainMasterKey()).toThrow(/32 bytes/);
    });
  });

  test('returns a 32 byte Buffer for a valid base64 key', async () => {
    await withEnv({ EBRAIN_SECRETS_KEY: key(32) }, () => {
      const masterKey = getEbrainMasterKey();
      expect(Buffer.isBuffer(masterKey)).toBe(true);
      expect(masterKey.length).toBe(32);
    });
  });

  test('caches the decoded Buffer instance', async () => {
    await withEnv({ EBRAIN_SECRETS_KEY: key(32) }, () => {
      const first = getEbrainMasterKey();
      const second = getEbrainMasterKey();
      expect(second).toBe(first);
    });
  });

  test('_setMasterKeyForTest(null) clears cache and rereads env', async () => {
    await withEnv({ EBRAIN_SECRETS_KEY: key(32, 1) }, async () => {
      const first = Buffer.from(getEbrainMasterKey());
      await withEnv({ EBRAIN_SECRETS_KEY: key(32, 2) }, () => {
        expect(getEbrainMasterKey()).toEqual(first);
        _setMasterKeyForTest(null);
        expect(getEbrainMasterKey()).toEqual(Buffer.alloc(32, 2));
      });
    });
  });
});
