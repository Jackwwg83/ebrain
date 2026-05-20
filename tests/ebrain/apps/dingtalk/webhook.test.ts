import { setDefaultTimeout, describe, expect, test } from 'bun:test';

setDefaultTimeout(20_000);
import {
  DINGTALK_WEBHOOK_REPLAY_WINDOW_MS,
  DingtalkWebhookHandler,
  createDingtalkWebhookSignature,
  encryptDingtalkCallbackPayload,
} from '../../../../src/ebrain/apps/dingtalk/index.ts';

const now = () => new Date('2026-05-20T02:00:00.000Z');
const timestamp = String(now().getTime());
const nonce = 'nonce-123';
const secret = 'webhook-secret';
const corpId = 'corp-test';
const aesKey = Buffer.alloc(32, 4).toString('base64').replace(/=+$/, '');

function handler(): DingtalkWebhookHandler {
  return new DingtalkWebhookHandler({
    appKey: 'ding-test-key',
    encryptedAppSecret: 'encrypted:not-used',
    token: secret,
    now,
  });
}

function plaintextHandler(): DingtalkWebhookHandler {
  return new DingtalkWebhookHandler({
    appKey: 'ding-test-key',
    encryptedAppSecret: 'encrypted:not-used',
    token: secret,
    allowPlaintextWebhook: true,
    now,
  });
}

function encryptedHandler(): DingtalkWebhookHandler {
  return new DingtalkWebhookHandler({
    appKey: 'ding-test-key',
    encryptedAppSecret: 'encrypted:not-used',
    corpId,
    token: secret,
    aesKey,
    now,
  });
}

function buildEncryptedWebhookRequest(args?: {
  payload?: Record<string, unknown>;
  timestamp?: string;
  nonce?: string;
  signBodyContent?: string;
}) {
  const payload = args?.payload ?? {
    EventId: 'evt-encrypted-1',
    EventType: 'bpms_instance_change',
    EventBornTime: 1779242400000,
    CorpId: corpId,
  };
  const bodyContent = JSON.stringify(payload);
  const encrypted = encryptDingtalkCallbackPayload(bodyContent, aesKey, corpId);
  const requestTimestamp = args?.timestamp ?? timestamp;
  const requestNonce = args?.nonce ?? nonce;
  const sign = createDingtalkWebhookSignature({
    timestamp: requestTimestamp,
    nonce: requestNonce,
    secret,
    bodyContent: args?.signBodyContent ?? bodyContent,
    encoding: 'hex',
  });
  return {
    bodyContent,
    req: {
      headers: { timestamp: requestTimestamp, nonce: requestNonce, msg_signature: sign },
      rawBody: JSON.stringify({ encrypt: encrypted }),
    },
  };
}

describe('DingtalkWebhookHandler', () => {
  test('verify accepts encrypted body-bound HMAC', async () => {
    const { req } = buildEncryptedWebhookRequest();
    await expect(encryptedHandler().verify(req)).resolves.toBe(true);
  });

  test('verify rejects invalid sign', async () => {
    const { req } = buildEncryptedWebhookRequest();
    await expect(encryptedHandler().verify({
      ...req,
      headers: { ...req.headers, msg_signature: 'wrong-signature' },
    })).resolves.toBe(false);
  });

  test('verify rejects replayed timestamp outside five-minute window', async () => {
    const oldTimestamp = String(now().getTime() - DINGTALK_WEBHOOK_REPLAY_WINDOW_MS - 1);
    const { req } = buildEncryptedWebhookRequest({ timestamp: oldTimestamp });
    await expect(encryptedHandler().verify(req)).resolves.toBe(false);
  });

  test('rejects same-nonce replay within window', async () => {
    const webhookHandler = encryptedHandler();
    const { req } = buildEncryptedWebhookRequest();

    await expect(webhookHandler.verify(req)).resolves.toBe(true);
    await expect(webhookHandler.verify(req)).resolves.toBe(false);
  });

  test('verify rejects plaintext payloads by default', async () => {
    const rawBody = JSON.stringify({ EventType: 'chat_update_title' });
    const sign = createDingtalkWebhookSignature({ timestamp, nonce, secret, bodyContent: rawBody, encoding: 'hex' });

    await expect(handler().verify({
      headers: { timestamp, nonce, sign },
      rawBody,
    })).resolves.toBe(false);
  });

  test('verify rejects tampered plaintext body even when plaintext fallback is enabled', async () => {
    const originalBody = JSON.stringify({ EventType: 'chat_update_title', ChatId: 'chat-1' });
    const tamperedBody = JSON.stringify({ EventType: 'chat_update_title', ChatId: 'chat-tampered' });
    const sign = createDingtalkWebhookSignature({
      timestamp,
      nonce,
      secret,
      bodyContent: originalBody,
      encoding: 'hex',
    });

    await expect(plaintextHandler().verify({
      headers: { timestamp, nonce, sign },
      rawBody: tamperedBody,
    })).resolves.toBe(false);
  });

  test('verify rejects encrypted body when decrypted plaintext is tampered', async () => {
    const originalPayload = {
      EventId: 'evt-encrypted-1',
      EventType: 'bpms_instance_change',
      EventBornTime: 1779242400000,
      CorpId: corpId,
    };
    const tamperedPayload = { ...originalPayload, EventType: 'tampered_event' };
    const originalBodyContent = JSON.stringify(originalPayload);
    const { req } = buildEncryptedWebhookRequest({
      payload: tamperedPayload,
      signBodyContent: originalBodyContent,
    });

    await expect(encryptedHandler().verify(req)).resolves.toBe(false);
  });

  test('verify and decode support encrypted DingTalk callback bodies', async () => {
    const { req } = buildEncryptedWebhookRequest();

    await expect(encryptedHandler().verify(req)).resolves.toBe(true);
    await expect(encryptedHandler().decode(req)).resolves.toMatchObject({
      eventId: 'evt-encrypted-1',
      eventType: 'bpms_instance_change',
      payload: { CorpId: corpId },
    });
  });

  test('decode maps DingTalk event JSON into base Event', async () => {
    const rawBody = JSON.stringify({
      EventId: 'evt-dt-1',
      EventType: 'chat_update_title',
      EventBornTime: 1779242400000,
      CorpId: 'corp-test',
      ChatId: 'chat-1',
    });

    await expect(handler().decode({ headers: {}, rawBody })).resolves.toMatchObject({
      eventId: 'evt-dt-1',
      eventType: 'chat_update_title',
      payload: { CorpId: 'corp-test', ChatId: 'chat-1' },
    });
  });
});
