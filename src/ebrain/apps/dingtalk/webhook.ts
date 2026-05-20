import crypto from 'node:crypto';
import type { Event, IncomingRequest, WebhookHandler } from '../base/index.ts';
import type { DingtalkCredentialConfig, DingtalkWebhookPayload } from './types.ts';

export const DINGTALK_WEBHOOK_REPLAY_WINDOW_MS = 5 * 60 * 1000;

export interface DingtalkWebhookHandlerConfig extends DingtalkCredentialConfig {
  now?: () => Date;
}

type RequestWithQuery = IncomingRequest & {
  query?: Record<string, string | string[] | undefined>;
  url?: string;
};

export class DingtalkWebhookHandler implements WebhookHandler {
  private readonly signingSecret?: string;
  private readonly aesKey?: string;
  private readonly corpId?: string;
  private readonly allowPlaintextWebhook: boolean;
  private readonly now: () => Date;
  private readonly replayKeys = new Map<string, number>();

  constructor(config: DingtalkWebhookHandlerConfig) {
    this.signingSecret = config.signingSecret ?? config.token;
    this.aesKey = config.aesKey;
    this.corpId = config.corpId;
    this.allowPlaintextWebhook = config.allowPlaintextWebhook ?? false;
    this.now = config.now ?? (() => new Date());
  }

  async verify(req: IncomingRequest): Promise<boolean> {
    if (!this.signingSecret) return false;
    const rawBody = rawBodyToString(req.rawBody);
    const parsedBody = parseJsonObject(rawBody);
    if (!parsedBody) return false;

    const timestamp = readParam(req, 'timestamp');
    const nonce = readParam(req, 'nonce');
    const sign = readParam(req, 'sign') ?? readParam(req, 'signature') ?? readParam(req, 'msg_signature');
    if (!timestamp || !nonce || !sign) return false;

    const timestampMs = parseTimestampMs(timestamp);
    if (timestampMs === null) return false;
    const nowMs = this.now().getTime();
    if (Math.abs(nowMs - timestampMs) > DINGTALK_WEBHOOK_REPLAY_WINDOW_MS) return false;

    const decodedSign = decodeURIComponent(sign);
    const replayKey = `${timestamp}:${nonce}`;
    this.pruneReplayKeys(nowMs);
    if ((this.replayKeys.get(replayKey) ?? 0) > nowMs) return false;

    const encryptedBody = typeof parsedBody.encrypt === 'string' ? parsedBody.encrypt : null;
    let verified = false;
    if (encryptedBody) {
      const expected = createDingtalkEncryptedWebhookSignature({
        token: this.signingSecret,
        timestamp,
        nonce,
        encrypt: encryptedBody,
      });
      if (!safeCompare(decodedSign, expected)) return false;
      if (!this.aesKey) return false;
      try {
        // DingTalk signs the encrypted callback field; decrypt only after the official signature passes.
        decryptDingtalkCallbackPayload(encryptedBody, this.aesKey, this.corpId);
      } catch {
        return false;
      }
      verified = true;
    } else {
      if (!this.allowPlaintextWebhook) return false;
      const expected = createDingtalkWebhookSignature({
        timestamp,
        nonce,
        secret: this.signingSecret,
        bodyContent: rawBody,
      });
      const expectedHex = createDingtalkWebhookSignature({
        timestamp,
        nonce,
        secret: this.signingSecret,
        bodyContent: rawBody,
        encoding: 'hex',
      });
      verified = safeCompare(decodedSign, expected) || safeCompare(decodedSign, expectedHex);
    }
    if (verified) this.replayKeys.set(replayKey, nowMs + DINGTALK_WEBHOOK_REPLAY_WINDOW_MS);
    return verified;
  }

  private pruneReplayKeys(nowMs: number): void {
    for (const [key, expiresAt] of this.replayKeys) {
      if (expiresAt <= nowMs) this.replayKeys.delete(key);
    }
  }

  async decode(req: IncomingRequest): Promise<Event> {
    const rawBody = rawBodyToString(req.rawBody);
    const rawPayload = JSON.parse(rawBody) as DingtalkWebhookPayload & { encrypt?: string };
    if (rawPayload.encrypt && !this.aesKey) {
      throw new Error('DingTalk encrypted callback requires AESKey');
    }
    const payload = rawPayload.encrypt
      ? JSON.parse(decryptDingtalkCallbackPayload(rawPayload.encrypt, this.aesKey!, this.corpId)) as DingtalkWebhookPayload
      : rawPayload;
    const bornAtMs = parseTimestampMs(payload.EventBornTime ?? '') ?? this.now().getTime();
    const eventType = String(payload.EventType ?? 'unknown');
    const eventId = String(payload.EventId ?? `${eventType}:${payload.CorpId ?? 'corp'}:${bornAtMs}`);
    return {
      eventId,
      eventType,
      receivedAt: new Date(bornAtMs),
      payload,
    };
  }
}

export function createDingtalkWebhookSignature(args: {
  timestamp: string;
  nonce: string;
  secret: string;
  bodyContent?: string | Uint8Array;
  encoding?: 'base64' | 'hex';
}): string {
  const encoding = args.encoding ?? 'base64';
  const bodyContent = args.bodyContent === undefined ? '' : rawBodyToString(args.bodyContent);
  return crypto
    .createHmac('sha256', args.secret)
    .update(`${args.timestamp}\n${args.nonce}\n${bodyContent}`)
    .digest(encoding);
}

export function createDingtalkEncryptedWebhookSignature(args: {
  token: string;
  timestamp: string;
  nonce: string;
  encrypt: string;
}): string {
  return crypto
    .createHash('sha1')
    .update([args.token, args.timestamp, args.nonce, args.encrypt].sort().join(''))
    .digest('hex');
}

export function decryptDingtalkCallbackPayload(encryptedPayload: string, aesKey: string, expectedCorpId?: string): string {
  const key = Buffer.from(`${aesKey}=`, 'base64');
  if (key.length !== 32) throw new Error('DingTalk AESKey must decode to 32 bytes');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, key.subarray(0, 16));
  decipher.setAutoPadding(false);
  const decryptedWithPadding = Buffer.concat([
    decipher.update(Buffer.from(encryptedPayload, 'base64')),
    decipher.final(),
  ]);
  const decrypted = removeDingtalkPkcs7Padding(decryptedWithPadding);
  const messageLength = decrypted.readUInt32BE(16);
  const message = decrypted.subarray(20, 20 + messageLength).toString('utf8');
  const receiveId = decrypted.subarray(20 + messageLength).toString('utf8');
  if (expectedCorpId && receiveId && receiveId !== expectedCorpId) {
    throw new Error('DingTalk callback corpId mismatch');
  }
  return message;
}


export function encryptDingtalkCallbackPayload(message: string, aesKey: string, corpId: string): string {
  const key = Buffer.from(`${aesKey}=`, 'base64');
  if (key.length !== 32) throw new Error('DingTalk AESKey must decode to 32 bytes');
  const messageBuffer = Buffer.from(message, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(messageBuffer.length, 0);
  const plain = addDingtalkPkcs7Padding(Buffer.concat([
    crypto.randomBytes(16),
    lengthBuffer,
    messageBuffer,
    Buffer.from(corpId),
  ]));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, key.subarray(0, 16));
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(plain), cipher.final()]).toString('base64');
}

export function createDingtalkEncryptedSuccessResponse(args: {
  token: string;
  aesKey: string;
  corpId: string;
  nonce: string;
  timestamp?: string;
}): { encrypt: string; msg_signature: string; timeStamp: string; nonce: string } {
  const timeStamp = args.timestamp ?? String(Date.now());
  const encrypt = encryptDingtalkCallbackPayload('success', args.aesKey, args.corpId);
  return {
    encrypt,
    msg_signature: createDingtalkEncryptedWebhookSignature({
      token: args.token,
      timestamp: timeStamp,
      nonce: args.nonce,
      encrypt,
    }),
    timeStamp,
    nonce: args.nonce,
  };
}

function addDingtalkPkcs7Padding(buf: Buffer): Buffer {
  const blockSize = 32;
  let pad = blockSize - (buf.length % blockSize);
  if (pad === 0) pad = blockSize;
  return Buffer.concat([buf, Buffer.alloc(pad, pad)]);
}

function removeDingtalkPkcs7Padding(buf: Buffer): Buffer {
  if (buf.length === 0) throw new Error('DingTalk decrypted payload is empty');
  const pad = buf[buf.length - 1];
  if (pad < 1 || pad > 32 || pad > buf.length) {
    throw new Error('DingTalk decrypted payload has invalid PKCS7 padding');
  }
  for (let i = buf.length - pad; i < buf.length; i++) {
    if (buf[i] !== pad) throw new Error('DingTalk decrypted payload has inconsistent padding');
  }
  return buf.subarray(0, buf.length - pad);
}

function readParam(req: IncomingRequest, name: string): string | undefined {
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() === lowerName || key.toLowerCase() === `x-dingtalk-${lowerName}`) {
      return firstString(value);
    }
  }

  const withQuery = req as RequestWithQuery;
  const queryValue = withQuery.query?.[name] ?? withQuery.query?.[lowerName];
  const fromQuery = firstString(queryValue);
  if (fromQuery) return fromQuery;

  if (withQuery.url) {
    try {
      const url = new URL(withQuery.url, 'https://ebrain.local');
      return url.searchParams.get(name) ?? url.searchParams.get(lowerName) ?? undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseTimestampMs(value: string | number): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
}

function rawBodyToString(rawBody: string | Uint8Array): string {
  return typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody).toString('utf8');
}

function parseJsonObject(rawBody: string): Record<string, unknown> | null {
  try {
    const payload = JSON.parse(rawBody) as unknown;
    return payload !== null && typeof payload === 'object' && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}
