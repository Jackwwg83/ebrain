import type { OperationContext } from '../../../../core/operations.ts';
import type { EnterpriseConnector, EnterpriseIngestObject, EnterpriseIngestResult } from '../../base/index.ts';
import { upsertEnterpriseObject } from '../../../sources/ingest-common.ts';
import { markIngestError, checkCircuit, resetCircuit } from '../../../sources/circuit-breaker.ts';
import type { DingtalkEnterpriseApp } from '../app.ts';
import type { DingtalkMeetingItem } from '../types.ts';
import { fetchDingtalkRecords, isoCursor, requireDingtalkString, runDingtalkConnectorLoad } from './common.ts';

const ENDPOINT = '/v1.0/meeting/meetings';
const SOURCE_ID = 'dingtalk-meeting';

export interface DingtalkMeetingConnectorOptions {
  fixtureMeetings?: DingtalkMeetingItem[];
}

export class DingtalkMeetingConnector implements EnterpriseConnector {
  readonly name = SOURCE_ID;
  readonly app: DingtalkEnterpriseApp;
  private readonly fixtureMeetings?: DingtalkMeetingItem[];

  constructor(app: DingtalkEnterpriseApp, opts: DingtalkMeetingConnectorOptions = {}) {
    this.app = app;
    this.fixtureMeetings = opts.fixtureMeetings;
  }

  async runIncremental(ctx: OperationContext): Promise<EnterpriseIngestResult> {
    return this.ingestMeetings(ctx, () => this.loadMeetings({ mode: 'incremental' }));
  }

  async runBackfill(ctx: OperationContext, opts: { since?: string }): Promise<EnterpriseIngestResult> {
    return this.ingestMeetings(ctx, () => this.loadMeetings({ mode: 'backfill', since: opts.since }));
  }

  async handleWebhookEvent(): Promise<EnterpriseIngestResult> {
    return { objectsIngested: 0, objectsSkipped: 1, errors: 0 };
  }

  async transform(raw: unknown): Promise<EnterpriseIngestObject> {
    const meeting = raw as DingtalkMeetingItem;
    const hasTranscript = Boolean(meeting.transcriptMarkdown);
    const meetingId = requireDingtalkString(meeting.meetingId, 'meetingId');
    const title = requireDingtalkString(meeting.title, 'title');
    const startTime = requireDingtalkString(meeting.startTime, 'startTime');
    return {
      sourceId: SOURCE_ID,
      sourceType: 'dingtalk',
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
      participants: unique([meeting.hostUserId, ...(meeting.participantUserIds ?? [])]),
      classification: 'L1',
      raw: meeting.raw ?? meeting,
      metadata: {
        vendor: 'dingtalk',
        recording_url: meeting.recordingUrl ?? null,
        transcript_available: hasTranscript,
        transcript_unavailable_reason: meeting.transcriptUnavailableReason ?? null,
      },
    };
  }

  private async ingestMeetings(ctx: OperationContext, load: () => Promise<DingtalkMeetingItem[]>): Promise<EnterpriseIngestResult> {
    return runDingtalkConnectorLoad({
      ctx,
      app: this.app,
      sourceId: SOURCE_ID,
      displayName: 'DingTalk Meeting',
      load,
      transform: (raw) => this.transform(raw),
      cursorForRecords: isoCursor,
      upsertEnterpriseObject,
      markIngestError,
      checkCircuit,
      resetCircuit,
    });
  }

  private async loadMeetings(args: { mode: 'incremental' | 'backfill'; since?: string }): Promise<DingtalkMeetingItem[]> {
    if (this.fixtureMeetings) return this.fixtureMeetings;
    return fetchDingtalkRecords<DingtalkMeetingItem>(
      this.app,
      ENDPOINT,
      { mode: args.mode, since: args.since },
      (payload) => extractArray<DingtalkMeetingItem>(payload, ['meetings', 'items']),
    );
  }
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function extractArray<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== 'object') {
    throw new Error(`DingTalk payload must be an object or array with one of: ${keys.join(', ')}`);
  }
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as T[];
    const result = record.result;
    if (result && typeof result === 'object' && Array.isArray((result as Record<string, unknown>)[key])) {
      return (result as Record<string, unknown>)[key] as T[];
    }
  }
  throw new Error(`DingTalk payload missing expected array field: ${keys.join(', ')}`);
}
