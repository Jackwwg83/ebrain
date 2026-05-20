import { describe, expect, test } from 'bun:test';
import type { BotAdapter, Reply } from '../../../src/ebrain/apps/base/index.ts';
import {
  formatReplyToDingtalk,
  formatReplyToFeishu,
  formatReplyToWecom,
} from '../../../src/ebrain/bot/reply-formatter.ts';

function makeAdapter(calls: Array<{ channelId: string; reply: Reply }>): BotAdapter {
  return {
    onMention() {},
    async sendReply(channelId, reply) { calls.push({ channelId, reply }); },
    async pushToUser() {},
    async pushToChannel() {},
  };
}

describe('reply formatters', () => {
  test('Feishu formatter output can be sent through BotAdapter.sendReply', async () => {
    const calls: Array<{ channelId: string; reply: Reply }> = [];
    await makeAdapter(calls).sendReply('chan-feishu', formatReplyToFeishu('**hello**'));

    expect(calls[0].reply.markdown).toBe('**hello**');
    expect(calls[0].reply.cards).toBeDefined();
  });

  test('DingTalk formatter output can be sent through BotAdapter.sendReply', async () => {
    const calls: Array<{ channelId: string; reply: Reply }> = [];
    await makeAdapter(calls).sendReply('chan-dingtalk', formatReplyToDingtalk('## hello'));

    expect(calls[0].reply.markdown).toBe('## hello');
  });

  test('WeCom formatter output can be sent through BotAdapter.sendReply', async () => {
    const calls: Array<{ channelId: string; reply: Reply }> = [];
    await makeAdapter(calls).sendReply('chan-wecom', formatReplyToWecom('hello wecom'));

    expect(calls[0].reply.markdown).toBe('hello wecom');
  });
});
