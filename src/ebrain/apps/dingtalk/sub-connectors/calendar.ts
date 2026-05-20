import type { OperationContext } from '../../../../core/operations.ts';
import type { EnterpriseConnector, EnterpriseIngestObject, EnterpriseIngestResult } from '../../base/index.ts';
import { upsertEnterpriseObject } from '../../../sources/ingest-common.ts';
import { markIngestError, checkCircuit, resetCircuit } from '../../../sources/circuit-breaker.ts';
import type { DingtalkEnterpriseApp } from '../app.ts';
import type { DingtalkCalendarEvent } from '../types.ts';
import { fetchDingtalkRecords, isoCursor, requireDingtalkString, runDingtalkConnectorLoad } from './common.ts';

const ENDPOINT = '/v1.0/calendar/events';
const SOURCE_ID = 'dingtalk-calendar';

export interface DingtalkCalendarConnectorOptions {
  fixtureEvents?: DingtalkCalendarEvent[];
}

export class DingtalkCalendarConnector implements EnterpriseConnector {
  readonly name = SOURCE_ID;
  readonly app: DingtalkEnterpriseApp;
  private readonly fixtureEvents?: DingtalkCalendarEvent[];

  constructor(app: DingtalkEnterpriseApp, opts: DingtalkCalendarConnectorOptions = {}) {
    this.app = app;
    this.fixtureEvents = opts.fixtureEvents;
  }

  async runIncremental(ctx: OperationContext): Promise<EnterpriseIngestResult> {
    return this.ingestEvents(ctx, () => this.loadEvents({ mode: 'incremental' }));
  }

  async runBackfill(ctx: OperationContext, opts: { since?: string }): Promise<EnterpriseIngestResult> {
    return this.ingestEvents(ctx, () => this.loadEvents({ mode: 'backfill', since: opts.since }));
  }

  async handleWebhookEvent(): Promise<EnterpriseIngestResult> {
    return { objectsIngested: 0, objectsSkipped: 1, errors: 0 };
  }

  async transform(raw: unknown): Promise<EnterpriseIngestObject> {
    const event = raw as DingtalkCalendarEvent;
    const eventId = requireDingtalkString(event.eventId, 'eventId');
    const summary = requireDingtalkString(event.summary, 'summary');
    const startTime = requireDingtalkString(event.startTime, 'startTime');
    const endTime = requireDingtalkString(event.endTime, 'endTime');
    return {
      sourceId: SOURCE_ID,
      sourceType: 'dingtalk',
      externalId: eventId,
      objectType: 'calendar-event',
      title: summary,
      bodyMarkdown: [
        `# ${summary}`,
        '',
        `- start: ${startTime}`,
        `- end: ${endTime}`,
        `- organizer: ${event.organizerUserId ?? 'unknown'}`,
        `- attendees: ${(event.attendeeUserIds ?? []).join(', ') || 'none'}`,
        event.location ? `- location: ${event.location}` : '',
        '',
        event.description ?? '',
      ].filter(Boolean).join('\n'),
      modifiedAt: event.modifiedTime ?? endTime,
      url: event.url,
      participants: unique([event.organizerUserId, ...(event.attendeeUserIds ?? [])]),
      classification: 'L1',
      raw: event.raw ?? event,
      metadata: { vendor: 'dingtalk', location: event.location ?? null },
    };
  }

  private async ingestEvents(ctx: OperationContext, load: () => Promise<DingtalkCalendarEvent[]>): Promise<EnterpriseIngestResult> {
    return runDingtalkConnectorLoad({
      ctx,
      app: this.app,
      sourceId: SOURCE_ID,
      displayName: 'DingTalk Calendar',
      load,
      transform: (raw) => this.transform(raw),
      cursorForRecords: isoCursor,
      upsertEnterpriseObject,
      markIngestError,
      checkCircuit,
      resetCircuit,
    });
  }

  private async loadEvents(args: { mode: 'incremental' | 'backfill'; since?: string }): Promise<DingtalkCalendarEvent[]> {
    if (this.fixtureEvents) return this.fixtureEvents;
    return fetchDingtalkRecords<DingtalkCalendarEvent>(
      this.app,
      ENDPOINT,
      { mode: args.mode, since: args.since },
      (payload) => extractArray<DingtalkCalendarEvent>(payload, ['events', 'items']),
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
