import { setDefaultTimeout, describe, expect, test } from 'bun:test';

setDefaultTimeout(20_000);
import {
  DINGTALK_WEBHOOK_REPLAY_WINDOW_MS,
  DingtalkWebhookHandler,
  createDingtalkEncryptedWebhookSignature,
  createDingtalkWebhookSignature,
  encryptDingtalkCallbackPayload,
} from '../../../../src/ebrain/apps/dingtalk/index.ts';

const now = () => new Date('2026-05-20T02:00:00.000Z');
const timestamp = String(now().getTime());
const nonce = 'nonce-123';
const secret = 'webhook-secret';

function handler(): DingtalkWebhookHandler {
  return new DingtalkWebhookHandler({
    appKey: 'ding-test-key',
    encryptedAppSecret: 'encrypted:not-used',
    token: secret,
    now,
  });
}

describe('DingtalkWebhookHandler', () => {
  test('verify accepts valid timestamp nonce and sign', async () => {
    const sign = createDingtalkWebhookSignature({ timestamp, nonce, secret });
    await expect(handler().verify({
      headers: { timestamp, nonce, sign },
      rawBody: '{}',
    })).resolves.toBe(true);
  });

  test('verify rejects invalid sign', async () => {
    await expect(handler().verify({
      headers: { timestamp, nonce, sign: 'wrong-signature' },
      rawBody: '{}',
    })).resolves.toBe(false);
  });

  test('verify rejects replayed timestamp outside five-minute window', async () => {
    const oldTimestamp = String(now().getTime() - DINGTALK_WEBHOOK_REPLAY_WINDOW_MS - 1);
    const sign = createDingtalkWebhookSignature({ timestamp: oldTimestamp, nonce, secret });
    await expect(handler().verify({
      headers: { timestamp: oldTimestamp, nonce, sign },
      rawBody: '{}',
    })).resolves.toBe(false);
  });


  test('verify and decode support encrypted DingTalk callback bodies', async () => {
    const aesKey = Buffer.alloc(32, 4).toString('base64').replace(/=+$/, '');
    const encrypted = encryptDingtalkCallbackPayload(JSON.stringify({
      EventId: 'evt-encrypted-1',
      EventType: 'bpms_instance_change',
      EventBornTime: 1779242400000,
      CorpId: 'corp-test',
    }), aesKey, 'corp-test');
    const sign = createDingtalkEncryptedWebhookSignature({ token: secret, timestamp, nonce, encrypt: encrypted });
    const encryptedHandler = new DingtalkWebhookHandler({
      appKey: 'ding-test-key',
      encryptedAppSecret: 'encrypted:not-used',
      corpId: 'corp-test',
      token: secret,
      aesKey,
      now,
    });
    const req = { headers: { timestamp, nonce, msg_signature: sign }, rawBody: JSON.stringify({ encrypt: encrypted }) };

    await expect(encryptedHandler.verify(req)).resolves.toBe(true);
    await expect(encryptedHandler.decode(req)).resolves.toMatchObject({
      eventId: 'evt-encrypted-1',
      eventType: 'bpms_instance_change',
      payload: { CorpId: 'corp-test' },
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

