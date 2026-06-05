import type { IngestionSourceContext } from '../../../../core/ingestion/types.ts';
import { BaseEnterpriseIngestionSource, type EnterpriseIngestObject } from '../../base/index.ts';
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
  ): Promise<{ objects: EnterpriseIngestObject[]; cursorState: Record<string, unknown> }> {
    const meetings = await this.loadMeetings(cursorState);
    return {
      objects: meetings.map((meeting) => this.meetingToObject(meeting)),
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

  private meetingToObject(meeting: DingtalkMeetingItem): EnterpriseIngestObject {
    const hasTranscript = Boolean(meeting.transcriptMarkdown);
    const meetingId = requireDingtalkString(meeting.meetingId, 'meetingId');
    const title = requireDingtalkString(meeting.title, 'title');
    const startTime = requireDingtalkString(meeting.startTime, 'startTime');
    const participants = uniqueStrings([
      meeting.hostUserId,
      ...(meeting.participantUserIds ?? []),
    ]);

    return this.makeEnterpriseObject({
      externalId: meetingId,
      objectType: hasTranscript ? 'meeting-transcript' : 'meeting',
      title,
      bodyMarkdown: [
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
      modifiedAt: meeting.modifiedTime ?? meeting.endTime ?? startTime,
      url: meeting.url ?? meeting.recordingUrl,
      participants,
      classification: 'L1',
      raw: meeting.raw ?? meeting,
      rawRef: `dingtalk://meeting/${meetingId}`,
      metadata: {
        dingtalk_object: hasTranscript ? 'meeting-transcript' : 'meeting',
        host_user_id: meeting.hostUserId ?? null,
        participant_user_ids: meeting.participantUserIds ?? [],
        start_time: startTime,
        end_time: meeting.endTime ?? null,
        recording_url: meeting.recordingUrl ?? null,
        transcript_available: hasTranscript,
      },
    });
  }
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
