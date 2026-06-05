import type {
  IngestionEvent,
  IngestionSourceContext,
} from '../../../../core/ingestion/types.ts';
import { BaseEnterpriseIngestionSource } from '../../base/index.ts';
import type { DingtalkEnterpriseApp } from '../app.ts';
import type { DingtalkMeetingItem } from '../types.ts';
import {
  cursorSince,
  cursorStateFor,
  extractArray,
  fetchDingtalkRecords,
  requireDingtalkString,
  sourceFetchMode,
  type DingtalkSourceOptions,
} from './common.ts';

const ENDPOINT = '/v1.0/meeting/meetings';
const SOURCE_KIND = 'dingtalk-meeting';

export interface DingtalkMeetingSourceOptions extends DingtalkSourceOptions {
  fixtureMeetings?: DingtalkMeetingItem[];
}

export class DingtalkMeetingSource extends BaseEnterpriseIngestionSource {
  private readonly dingtalkApp: DingtalkEnterpriseApp;
  private readonly fixtureMeetings?: DingtalkMeetingItem[];
  private readonly initialSince?: string;

  constructor(app: DingtalkEnterpriseApp, opts: DingtalkMeetingSourceOptions = {}) {
    super({
      id: `${SOURCE_KIND}:${app.appId}`,
      kind: SOURCE_KIND,
      app,
      pollIntervalMs: opts.pollIntervalMs,
      mode: opts.mode,
    });
    this.dingtalkApp = app;
    this.fixtureMeetings = opts.fixtureMeetings;
    this.initialSince = opts.since;
  }

  protected async pollOnce(
    _ctx: IngestionSourceContext,
    cursorState: Record<string, unknown>,
  ): Promise<{ events: IngestionEvent[]; cursorState: Record<string, unknown> }> {
    const meetings = await this.loadMeetings(cursorState);
    return {
      events: meetings.map((meeting) => this.meetingToEvent(meeting)),
      cursorState: cursorStateFor(meetings),
    };
  }

  private async loadMeetings(cursorState: Record<string, unknown>): Promise<DingtalkMeetingItem[]> {
    if (this.fixtureMeetings) return this.fixtureMeetings;
    return fetchDingtalkRecords<DingtalkMeetingItem>(
      this.dingtalkApp,
      ENDPOINT,
      {
        mode: sourceFetchMode(this.mode),
        since: cursorSince(cursorState, this.initialSince),
      },
      (payload) => extractArray<DingtalkMeetingItem>(payload, ['meetings', 'items']),
    );
  }

  private meetingToEvent(meeting: DingtalkMeetingItem): IngestionEvent {
    const hasTranscript = Boolean(meeting.transcriptMarkdown);
    const meetingId = requireDingtalkString(meeting.meetingId, 'meetingId');
    const title = requireDingtalkString(meeting.title, 'title');
    const startTime = requireDingtalkString(meeting.startTime, 'startTime');

    return this.makeEvent({
      source_uri: `dingtalk://meeting/${meetingId}`,
      content_type: 'text/markdown',
      content: [
        `# ${title}`,
        '',
        `- start: ${startTime}`,
        meeting.endTime ? `- end: ${meeting.endTime}` : '',
        `- host: ${meeting.hostUserId ?? 'unknown'}`,
        `- participants: ${(meeting.participantUserIds ?? []).join(', ') || 'none'}`,
        meeting.recordingUrl ? `- recording: ${meeting.recordingUrl}` : '- recording: not_available',
        hasTranscript ? '\n## Transcript\n' : `\n## Transcript\nSkipped: ${meeting.transcriptUnavailableReason ?? 'DingTalk API did not return a transcript.'}`,
        meeting.transcriptMarkdown ?? '',
      ].filter(Boolean).join('\n'),
      trusted: false,
    });
  }
}
