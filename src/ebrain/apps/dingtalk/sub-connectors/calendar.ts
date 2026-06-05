import type {
  IngestionEvent,
  IngestionSourceContext,
} from '../../../../core/ingestion/types.ts';
import { BaseEnterpriseIngestionSource } from '../../base/index.ts';
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
  ): Promise<{ events: IngestionEvent[]; cursorState: Record<string, unknown> }> {
    const events = await this.loadEvents(cursorState);
    return {
      events: events.map((event) => this.calendarEventToEvent(event)),
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

  private calendarEventToEvent(event: DingtalkCalendarEvent): IngestionEvent {
    const eventId = requireDingtalkString(event.eventId, 'eventId');
    const summary = requireDingtalkString(event.summary, 'summary');
    const startTime = requireDingtalkString(event.startTime, 'startTime');
    const endTime = requireDingtalkString(event.endTime, 'endTime');

    return this.makeEvent({
      source_uri: `dingtalk://calendar/${eventId}`,
      content_type: 'text/markdown',
      content: [
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
      trusted: false,
    });
  }
}
