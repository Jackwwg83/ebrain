const KEY_ENV = 'EBRAIN_SECRETS_KEY';
const AES_256_KEY_BYTES = 32;

let cachedMasterKey: Buffer | null = null;

function normalizeBase64(value: string): string {
  return value.replace(/=+$/, '');
}

function decodeMasterKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(`${KEY_ENV} is required`);
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed) || trimmed.length % 4 === 1) {
    throw new Error(`${KEY_ENV} must be base64 encoded`);
  }

  const key = Buffer.from(trimmed, 'base64');
  if (normalizeBase64(key.toString('base64')) !== normalizeBase64(trimmed)) {
    throw new Error(`${KEY_ENV} must be valid base64`);
  }
  if (key.length !== AES_256_KEY_BYTES) {
    throw new Error(`${KEY_ENV} must decode to ${AES_256_KEY_BYTES} bytes for AES-256-GCM`);
  }
  return key;
}

export function getEbrainMasterKey(): Buffer {
  if (cachedMasterKey) return cachedMasterKey;

  const raw = process.env[KEY_ENV];
  if (raw === undefined) {
    throw new Error(`${KEY_ENV} is required`);
  }

  cachedMasterKey = decodeMasterKey(raw);
  return cachedMasterKey;
}

export function _setMasterKeyForTest(key: Buffer | null): void {
  cachedMasterKey = key ? Buffer.from(key) : null;
}
