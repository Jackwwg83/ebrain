import type { IngestionSourceContext } from '../../../../core/ingestion/types.ts';
import { BaseEnterpriseIngestionSource, type EnterpriseIngestObject } from '../../base/index.ts';
import type { DingtalkEnterpriseApp } from '../app.ts';
import type { DingtalkCalendarEvent } from '../types.ts';
import {
  cursorSince,
  cursorStateFor,
  extractArray,
  fetchDingtalkRecords,
  requireDingtalkString,
  sourceFetchMode,
  type DingtalkSourceOptions,
} from './common.ts';

const ENDPOINT = '/v1.0/calendar/events';
const SOURCE_KIND = 'dingtalk-calendar';

export interface DingtalkCalendarSourceOptions extends DingtalkSourceOptions {
  fixtureEvents?: DingtalkCalendarEvent[];
}

export class DingtalkCalendarSource extends BaseEnterpriseIngestionSource {
  private readonly dingtalkApp: DingtalkEnterpriseApp;
  private readonly fixtureEvents?: DingtalkCalendarEvent[];
  private readonly initialSince?: string;

  constructor(app: DingtalkEnterpriseApp, opts: DingtalkCalendarSourceOptions = {}) {
    super({
      id: `${SOURCE_KIND}:${app.appId}`,
      kind: SOURCE_KIND,
      app,
      pollIntervalMs: opts.pollIntervalMs,
      mode: opts.mode,
    });
    this.dingtalkApp = app;
    this.fixtureEvents = opts.fixtureEvents;
    this.initialSince = opts.since;
  }

  protected async pollOnce(
    _ctx: IngestionSourceContext,
    cursorState: Record<string, unknown>,
  ): Promise<{ objects: EnterpriseIngestObject[]; cursorState: Record<string, unknown> }> {
    const events = await this.loadEvents(cursorState);
    return {
      objects: events.map((event) => this.calendarEventToObject(event)),
      cursorState: cursorStateFor(events),
    };
  }

  private async loadEvents(cursorState: Record<string, unknown>): Promise<DingtalkCalendarEvent[]> {
    if (this.fixtureEvents) return this.fixtureEvents;
    return fetchDingtalkRecords<DingtalkCalendarEvent>(
      this.dingtalkApp,
      ENDPOINT,
      {
        mode: sourceFetchMode(this.mode),
        since: cursorSince(cursorState, this.initialSince),
      },
      (payload) => extractArray<DingtalkCalendarEvent>(payload, ['events', 'items']),
    );
  }

  private calendarEventToObject(event: DingtalkCalendarEvent): EnterpriseIngestObject {
    const eventId = requireDingtalkString(event.eventId, 'eventId');
    const summary = requireDingtalkString(event.summary, 'summary');
    const startTime = requireDingtalkString(event.startTime, 'startTime');
    const endTime = requireDingtalkString(event.endTime, 'endTime');
    const participants = uniqueStrings([
      event.organizerUserId,
      ...(event.attendeeUserIds ?? []),
    ]);

    return this.makeEnterpriseObject({
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
      modifiedAt: event.modifiedTime ?? startTime,
      url: event.url,
      participants,
      classification: 'L1',
      raw: event.raw ?? event,
      rawRef: `dingtalk://calendar/${eventId}`,
      metadata: {
        dingtalk_object: 'calendar-event',
        organizer_user_id: event.organizerUserId ?? null,
        attendee_user_ids: event.attendeeUserIds ?? [],
        start_time: startTime,
        end_time: endTime,
        location: event.location ?? null,
      },
    });
  }
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
