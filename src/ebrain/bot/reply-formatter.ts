import type { Reply } from '../apps/base/index.ts';

export interface FeishuCard extends Reply {
  markdown: string;
  cards: Array<{
    type: 'feishu-card';
    title: string;
    elements: Array<{ tag: 'markdown'; content: string }>;
  }>;
}

export interface DingtalkMarkdown extends Reply {
  markdown: string;
  title: string;
  msgtype: 'markdown';
}

export interface WecomMarkdown extends Reply {
  markdown: string;
  msgtype: 'markdown';
}

const DEFAULT_TITLE = 'Ebrain';

function normalizeMarkdown(markdown: string): string {
  return markdown.trim().length > 0 ? markdown.trim() : '_No content_';
}

export function formatReplyToFeishu(markdown: string): FeishuCard {
  const body = normalizeMarkdown(markdown);
  return {
    markdown: body,
    cards: [{
      type: 'feishu-card',
      title: DEFAULT_TITLE,
      elements: [{ tag: 'markdown', content: body }],
    }],
  };
}

export function formatReplyToDingtalk(markdown: string): DingtalkMarkdown {
  return {
    markdown: normalizeMarkdown(markdown),
    title: DEFAULT_TITLE,
    msgtype: 'markdown',
  };
}

export function formatReplyToWecom(markdown: string): WecomMarkdown {
  return {
    markdown: normalizeMarkdown(markdown),
    msgtype: 'markdown',
  };
}
