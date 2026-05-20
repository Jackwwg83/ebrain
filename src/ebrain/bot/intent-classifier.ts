export type BotIntent = 'question' | 'command' | 'casual';

const COMMAND_PREFIX_RE = /^(?:\/|!|#)\S+/;
const COMMAND_WORD_RE = /^(?:list|show)\b/i;

export function classifyIntent(messageText: string): BotIntent {
  const text = messageText.trim();
  if (!text) return 'casual';
  if (text.includes('@') || text.endsWith('?') || text.endsWith('？') || COMMAND_PREFIX_RE.test(text)) {
    return 'question';
  }
  if (COMMAND_WORD_RE.test(text)) return 'command';
  return 'casual';
}
