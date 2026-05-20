export interface MentionEvent {
  channelId: string;
  senderUserId: string;
  messageText: string;
  receivedAt: Date;
}

export interface Reply {
  markdown?: string;
  cards?: unknown[];
}

export interface PushContent {
  subject: string;
  bodyMarkdown: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface BotAdapter {
  onMention(handler: (event: MentionEvent) => Promise<Reply>): void;
  sendReply(channelId: string, reply: Reply): Promise<void>;
  pushToUser(userId: string, content: PushContent): Promise<void>;
  pushToChannel(channelId: string, content: PushContent): Promise<void>;
}
